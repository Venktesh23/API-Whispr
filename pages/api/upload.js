import formidable from 'formidable'
import fs from 'fs'
import path from 'path'
import yaml from 'js-yaml'
import pdf from 'pdf-parse'
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

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
)

export const config = {
  api: {
    bodyParser: false,
  },
}

async function parseDocx(buffer) {
  const mammoth = await import('mammoth')
  const result = await mammoth.extractRawText({ buffer })
  return result.value
}

async function uploadHandler(req, res) {
  if (req.method !== 'POST') {
    return errorResponse(res, 'Method not allowed', 405)
  }

  try {
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024,
      keepExtensions: true,
    })

    const [fields, files] = await form.parse(req)
    const file = Array.isArray(files.file) ? files.file[0] : files.file
    const userId = Array.isArray(fields.userId) ? fields.userId[0] : fields.userId
    const fileType = Array.isArray(fields.fileType) ? fields.fileType[0] : fields.fileType

    // Validate inputs
    const validationErrors = validateRequest({ userId }, { userId: validators.userId })
    if (validationErrors) {
      return errorResponse(res, 'Invalid user ID', 400, validationErrors)
    }

    if (!file) {
      return errorResponse(res, 'File is required', 400)
    }

    if (!fileType) {
      return errorResponse(res, 'File type is required', 400)
    }

    // Read file content
    const fileContent = fs.readFileSync(file.filepath)
    const filename = file.originalFilename || 'unknown'
    const fileExtension = path.extname(filename).toLowerCase()

    let filetype, rawText, parsedSpec

    try {
      if (fileExtension === '.pdf') {
        // Parse PDF
        const pdfData = await pdf(fileContent)
        filetype = 'pdf'
        rawText = pdfData.text
        parsedSpec = null
      } else if (fileExtension === '.docx') {
        rawText = await parseDocx(fileContent)
        filetype = 'docx'
        parsedSpec = null
      } else if (fileExtension === '.json') {
        // Parse JSON with swagger-parser for better OpenAPI validation
        rawText = fileContent.toString('utf8')
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
      } else if (fileExtension === '.yaml' || fileExtension === '.yml') {
        // Parse YAML with swagger-parser for better OpenAPI validation
        rawText = fileContent.toString('utf8')
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
      } else {
        return res.status(400).json({ error: 'Unsupported file type' })
      }
    } catch (parseError) {
      console.error('Parse error:', parseError)
      return res.status(400).json({ error: 'Failed to parse file content. Please check the file format.' })
    }

    // Save to Supabase with embedding_status = 'pending'
    const { data, error } = await supabase
      .from('api_specs')
      .insert({
        user_id: userId,
        filename,
        filetype,
        raw_text: rawText,
        parsed_spec: parsedSpec,
        embedding_status: 'pending',
      })
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      if (file?.filepath) fs.unlinkSync(file.filepath)

      await logError({
        errorType: 'DATABASE_ERROR',
        message: 'Failed to save spec',
        code: 500,
        endpoint: '/api/upload',
        userId,
        details: { error: error.toString() },
      })
      return errorResponse(res, 'Failed to save specification', 500)
    }

    // Clean up temporary file
    if (file?.filepath) {
      try {
        fs.unlinkSync(file.filepath)
      } catch (unlinkErr) {
        console.warn('Failed to delete temp file:', unlinkErr.message)
      }
    }

    // Respond immediately with the saved spec
    successResponse(res, {
      spec: data,
      info: parsedSpec?.info || null,
      embeddingStatus: 'pending',
      message: 'File uploaded successfully. RAG indexing will process in the background.',
    })

    // Trigger background embedding job (fire-and-forget)
    if (
      parsedSpec &&
      typeof parsedSpec === 'object' &&
      parsedSpec.paths &&
      process.env.ENABLE_BACKGROUND_JOBS === 'true'
    ) {
      console.log(`📑 Queuing RAG indexing for spec ${data.id}...`)

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
    console.error('Upload processing error:', error)

    await logError({
      errorType: 'UPLOAD_PROCESSING_ERROR',
      message: error.message,
      code: 500,
      endpoint: '/api/upload',
      userId: req.body?.userId,
      details: { error: error.toString() },
    })

    return errorResponse(res, error.message || 'Internal server error', 500)
  }
}

export default withErrorHandler(
  withRateLimit(uploadHandler, 30, 60000) // 30 uploads per minute
)