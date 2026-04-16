import yaml from 'js-yaml'
import SwaggerParser from 'swagger-parser'
import { createClient } from '@supabase/supabase-js'
import {
  validators,
  validateRequest,
  errorResponse,
  successResponse,
  withRateLimit,
  withErrorHandler,
  logError,
} from '../../lib/api-utils'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function pasteHandler(req, res) {
  if (req.method !== 'POST') {
    return errorResponse(res, 'Method not allowed', 405)
  }

  const { content, contentType, userId, filename } = req.body

  // Validate input
  const validationErrors = validateRequest(req.body, {
    content: validators.specContent,
    contentType: validators.contentType,
    userId: validators.userId,
    filename: validators.filename,
  })

  if (validationErrors) {
    return errorResponse(res, 'Validation failed', 400, validationErrors)
  }

  try {

    let filetype, rawText, parsedSpec

    try {
      rawText = content.trim()
      
      if (contentType === 'json') {
        // Parse and validate JSON
        const jsonData = JSON.parse(rawText)
        
        // Try to validate as OpenAPI spec
        try {
          const validatedSpec = await SwaggerParser.validate(jsonData)
          parsedSpec = validatedSpec
        } catch (validationError) {
          // If not a valid OpenAPI spec, store as generic JSON
          parsedSpec = jsonData
        }
        
        filetype = 'json'
      } else if (contentType === 'yaml') {
        // Parse and validate YAML
        const yamlData = yaml.load(rawText)
        
        // Try to validate as OpenAPI spec
        try {
          const validatedSpec = await SwaggerParser.validate(yamlData)
          parsedSpec = validatedSpec
        } catch (validationError) {
          // If not a valid OpenAPI spec, store as generic YAML
          parsedSpec = yamlData
        }
        
        filetype = 'yaml'
      } else if (contentType === 'text') {
        // Plain text content
        filetype = 'text'
        parsedSpec = null
      } else {
        return res.status(400).json({ error: 'Unsupported content type' })
      }
    } catch (parseError) {
      console.error('Parse error:', parseError)
      return res.status(400).json({ 
        error: `Failed to parse ${contentType.toUpperCase()} content. Please check the syntax.` 
      })
    }

    // Save to Supabase with embedding_status = 'pending'
    const { data, error } = await supabase
      .from('api_specs')
      .insert({
        user_id: userId,
        filename: filename || `Pasted_Content_${Date.now()}.${contentType}`,
        filetype,
        raw_text: rawText,
        parsed_spec: parsedSpec,
        embedding_status: 'pending',
      })
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      await logError({
        errorType: 'DATABASE_ERROR',
        message: 'Failed to save spec',
        code: 500,
        endpoint: '/api/paste',
        userId,
        details: { error: error.toString() },
      })
      return errorResponse(res, 'Failed to save specification', 500)
    }

    // Respond immediately with the saved spec
    successResponse(res, {
      spec: data,
      info: parsedSpec?.info || null,
      embeddingStatus: 'pending',
      message:
        'Spec saved successfully. RAG indexing will process in the background.',
    })

    // Trigger background embedding job (fire-and-forget)
    if (
      parsedSpec &&
      typeof parsedSpec === 'object' &&
      parsedSpec.paths &&
      process.env.ENABLE_BACKGROUND_JOBS === 'true'
    ) {
      console.log(`📑 Queuing RAG indexing for spec ${data.id}...`)

      // Call background job (non-blocking)
      fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000'}/api/background-jobs/process-embeddings`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            specId: data.id,
            userId,
            parsedSpec,
          }),
        }
      ).catch((err) => {
        console.error('Failed to queue embedding job:', err)
      })
    }
  } catch (error) {
    console.error('Paste processing error:', error)

    await logError({
      errorType: 'PASTE_PROCESSING_ERROR',
      message: error.message,
      code: 500,
      endpoint: '/api/paste',
      userId: req.body?.userId,
      details: { error: error.toString() },
    })

    return errorResponse(res, error.message || 'Internal server error', 500)
  }
}

export default withErrorHandler(
  withRateLimit(pasteHandler, 30, 60000) // 30 requests per minute
)
