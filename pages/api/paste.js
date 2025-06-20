import yaml from 'js-yaml'
import SwaggerParser from 'swagger-parser'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { content, contentType, userId, filename } = req.body

    if (!content || !contentType || !userId) {
      return res.status(400).json({ error: 'Content, contentType, and userId are required' })
    }

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

    // Save to Supabase
    const { data, error } = await supabase
      .from('api_specs')
      .insert({
        user_id: userId,
        filename: filename || `Pasted_Content_${Date.now()}.${contentType}`,
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

    res.status(200).json({ 
      spec: data,
      info: parsedSpec?.info || null
    })

  } catch (error) {
    console.error('Paste processing error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
} 