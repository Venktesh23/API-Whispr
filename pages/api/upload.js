import formidable from 'formidable'
import fs from 'fs'
import path from 'path'
import yaml from 'js-yaml'
import pdf from 'pdf-parse'
import SwaggerParser from 'swagger-parser'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export const config = {
  api: {
    bodyParser: false,
  },
}

async function parseDocx(buffer) {
  // You'll need to install mammoth for DOCX parsing
  const mammoth = await import('mammoth')
  const result = await mammoth.extractRawText({ buffer })
  return result.value
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB
      keepExtensions: true,
    })

    const [fields, files] = await form.parse(req)
    const file = Array.isArray(files.file) ? files.file[0] : files.file
    const userId = Array.isArray(fields.userId) ? fields.userId[0] : fields.userId
    const fileType = Array.isArray(fields.fileType) ? fields.fileType[0] : fields.fileType

    if (!file || !userId) {
      return res.status(400).json({ error: 'File and userId are required' })
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

    // Save to Supabase
    const { data, error } = await supabase
      .from('api_specs')
      .insert({
        user_id: userId,
        filename,
        filetype,
        raw_text: rawText,
        parsed_spec: parsedSpec
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return res.status(500).json({ error: 'Failed to save to database' })
    }

    // Clean up temporary file
    fs.unlinkSync(file.filepath)

    res.status(200).json({ 
      spec: data,
      info: parsedSpec?.info || null // Include API info for display
    })

  } catch (error) {
    console.error('Upload error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
} 