import { createClient } from '@supabase/supabase-js'
import {
  validators,
  validateRequest,
  errorResponse,
  successResponse,
  logError,
} from '../../lib/api-utils'

/**
 * Chat handler with proper RLS support
 * Ensures user can only access their own specs and chat history
 */
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function chatHandlerWithRLS(req, res) {
  if (req.method === 'GET') {
    // GET /api/chat?action=loadSpecs&userId=...
    const { action, userId, specId } = req.query

    // Always validate userId
    const validationErrors = validateRequest(
      { userId },
      { userId: validators.userId }
    )

    if (validationErrors) {
      return errorResponse(res, 'Invalid user ID', 400, validationErrors)
    }

    try {
      if (action === 'loadSpecs') {
        // Load all specs for user - respects RLS
        const { data, error } = await supabase
          .from('api_specs')
          .select('id, filename, filetype, created_at, parsed_spec')
          .eq('user_id', userId)
          .eq('is_archived', false)
          .order('created_at', { ascending: false })
          .limit(100) // Prevent loading too many

        if (error) {
          console.error('RLS error loading specs:', error)
          throw new Error('Failed to load your API specifications')
        }

        // Ensure response contains published data only
        const publicData = (data || []).map((spec) => ({
          id: spec.id,
          filename: spec.filename,
          filetype: spec.filetype,
          created_at: spec.created_at,
          // Don't include full parsed_spec to reduce payload
          info: spec.parsed_spec?.info,
        }))

        return successResponse(res, { specs: publicData })
      } else if (action === 'loadSpec') {
        // Load single spec - validate ownership
        if (!specId) {
          return errorResponse(res, 'Spec ID is required', 400)
        }

        const validSpecError = validators.specId(specId)
        if (validSpecError) {
          return errorResponse(res, validSpecError, 400)
        }

        // Query ensures user can only access their own spec
        const { data, error } = await supabase
          .from('api_specs')
          .select('*')
          .eq('id', specId)
          .eq('user_id', userId)
          .single()

        if (error) {
          if (error.code === 'PGRST116') {
            return errorResponse(res, 'Specification not found', 404)
          }
          console.error('RLS error loading spec:', error)
          throw new Error('Failed to load specification')
        }

        return successResponse(res, { spec: data })
      } else if (action === 'loadChatHistory') {
        // Load chat history for spec - validate spec ownership AND history ownership
        if (!specId) {
          return errorResponse(res, 'Spec ID is required', 400)
        }

        const validSpecError = validators.specId(specId)
        if (validSpecError) {
          return errorResponse(res, validSpecError, 400)
        }

        // First verify user owns the spec
        const { data: specData, error: specError } = await supabase
          .from('api_specs')
          .select('id')
          .eq('id', specId)
          .eq('user_id', userId)
          .single()

        if (specError || !specData) {
          return errorResponse(res, 'Specification not found or not accessible', 404)
        }

        // Load chat history - RLS will enforce user_id match
        const { data, error } = await supabase
          .from('chat_history')
          .select('id, question, answer, created_at')
          .eq('spec_id', specId)
          .eq('user_id', userId)
          .order('created_at', { ascending: true })
          .limit(100)

        if (error) {
          console.error('RLS error loading chat history:', error)
          throw new Error('Failed to load chat history')
        }

        // Format messages
        const formattedMessages = (data || []).flatMap((chat) => [
          {
            role: 'user',
            content: chat.question,
            timestamp: chat.created_at,
            id: `${chat.id}-q`,
          },
          {
            role: 'assistant',
            content: chat.answer,
            timestamp: chat.created_at,
            id: `${chat.id}-a`,
          },
        ])

        return successResponse(res, { messages: formattedMessages })
      } else {
        return errorResponse(res, 'Unknown action', 400)
      }
    } catch (error) {
      await logError({
        errorType: 'CHAT_QUERY_ERROR',
        message: error.message,
        code: 500,
        endpoint: '/api/chat',
        userId,
        details: { action, error: error.toString() },
      })

      return errorResponse(res, error.message || 'Failed to load chat data', 500)
    }
  } else if (req.method === 'POST') {
    // POST /api/chat - Save chat message with RLS validation
    const { userId, specId, question, answer } = req.body

    const validationErrors = validateRequest(
      { userId, specId, question },
      {
        userId: validators.userId,
        specId: validators.specId,
        question: validators.question,
      }
    )

    if (validationErrors) {
      return errorResponse(res, 'Validation failed', 400, validationErrors)
    }

    try {
      // Verify user owns the spec before allowing chat save
      const { data: specData, error: specError } = await supabase
        .from('api_specs')
        .select('id')
        .eq('id', specId)
        .eq('user_id', userId)
        .single()

      if (specError || !specData) {
        return errorResponse(
          res,
          'Cannot save chat for this specification',
          403
        )
      }

      // Insert chat history - RLS will enforce user_id
      const { data, error } = await supabase
        .from('chat_history')
        .insert([
          {
            user_id: userId,
            spec_id: specId,
            question,
            answer,
          },
        ])
        .select()
        .single()

      if (error) {
        console.error('RLS error saving chat:', error)
        throw new Error('Failed to save chat message')
      }

      return successResponse(res, { message: data })
    } catch (error) {
      await logError({
        errorType: 'CHAT_SAVE_ERROR',
        message: error.message,
        code: 500,
        endpoint: '/api/chat',
        userId,
        details: { error: error.toString() },
      })

      return errorResponse(
        res,
        error.message || 'Failed to save chat message',
        500
      )
    }
  } else if (req.method === 'DELETE') {
    // DELETE /api/chat - Clear chat history with RLS validation
    const { userId, specId } = req.body

    const validationErrors = validateRequest(
      { userId, specId },
      {
        userId: validators.userId,
        specId: validators.specId,
      }
    )

    if (validationErrors) {
      return errorResponse(res, 'Validation failed', 400, validationErrors)
    }

    try {
      // Verify user owns the spec
      const { data: specData, error: specError } = await supabase
        .from('api_specs')
        .select('id')
        .eq('id', specId)
        .eq('user_id', userId)
        .single()

      if (specError || !specData) {
        return errorResponse(res, 'Specification not found', 404)
      }

      // Delete chat history - RLS will enforce user_id
      const { error } = await supabase
        .from('chat_history')
        .delete()
        .eq('spec_id', specId)
        .eq('user_id', userId)

      if (error) {
        console.error('RLS error deleting chat:', error)
        throw new Error('Failed to clear chat history')
      }

      return successResponse(res, {
        message: 'Chat history cleared successfully',
      })
    } catch (error) {
      await logError({
        errorType: 'CHAT_DELETE_ERROR',
        message: error.message,
        code: 500,
        endpoint: '/api/chat',
        userId,
        details: { error: error.toString() },
      })

      return errorResponse(res, 'Failed to clear chat history', 500)
    }
  } else {
    return errorResponse(res, 'Method not allowed', 405)
  }
}

export default chatHandlerWithRLS
