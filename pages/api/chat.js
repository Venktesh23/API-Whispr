import { createClient } from '@supabase/supabase-js'
import {
  validators,
  validateRequest,
  errorResponse,
  successResponse,
  withErrorHandler,
  logError,
} from '../../lib/api-utils'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
)

async function chatHandler(req, res) {
  if (req.method === 'GET') {
    // GET /api/chat?action=loadSpecs&userId=...
    const { action, userId, specId } = req.query

    const validationErrors = validateRequest(
      { userId },
      { userId: validators.userId }
    )
    if (validationErrors) {
      return errorResponse(res, 'Invalid user ID', 400, validationErrors)
    }

    try {
      if (action === 'loadSpecs') {
        // Load all specs for user
        const { data, error } = await supabase
          .from('api_specs')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })

        if (error) throw error

        return successResponse(res, { specs: data || [] })
      } else if (action === 'loadSpec') {
        // Load single spec
        if (!specId) {
          return errorResponse(res, 'Spec ID is required', 400)
        }

        const validSpecError = validators.specId(specId)
        if (validSpecError) {
          return errorResponse(res, validSpecError, 400)
        }

        const { data, error } = await supabase
          .from('api_specs')
          .select('*')
          .eq('id', specId)
          .eq('user_id', userId)
          .single()

        if (error) throw error

        return successResponse(res, { spec: data })
      } else if (action === 'loadChatHistory') {
        // Load chat history for spec
        if (!specId) {
          return errorResponse(res, 'Spec ID is required', 400)
        }

        const { data, error } = await supabase
          .from('chat_history')
          .select('*')
          .eq('spec_id', specId)
          .eq('user_id', userId)
          .order('created_at', { ascending: true })

        if (error) throw error

        const formattedMessages = data.flatMap((chat) => [
          {
            role: 'user',
            content: chat.question,
            timestamp: chat.created_at,
          },
          {
            role: 'assistant',
            content: chat.answer,
            timestamp: chat.created_at,
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

      return errorResponse(res, 'Failed to load chat data', 500)
    }
  } else if (req.method === 'POST') {
    // POST /api/chat - Save chat message
    const { userId, specId, question, answer } = req.body

    const validationErrors = validateRequest(
      {userId, specId, question, answer},
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

      if (error) throw error

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

      return errorResponse(res, 'Failed to save chat message', 500)
    }
  } else {
    return errorResponse(res, 'Method not allowed', 405)
  }
}

export default withErrorHandler(chatHandler)
