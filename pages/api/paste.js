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

  res.setHeader('Content-Type', 'application/json')
  
  let body
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {})
  } catch (parseBodyError) {
    return res.status(400).json({ error: 'Invalid request body' })
  }

  try {
    const { content, contentType, userId, filename } = body

    if (!content || !contentType || !userId) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    let filetype, rawText, parsedSpec

    try {
      rawText = content.trim()
      
      if (contentType === 'json') {
        const jsonData = JSON.parse(rawText)
        try {
          const validatedSpec = await SwaggerParser.validate(jsonData)
          parsedSpec = validatedSpec
        } catch {
          parsedSpec = jsonData
        }
        filetype = 'json'
      } else if (contentType === 'yaml') {
        const yamlData = yaml.load(rawText)
        try {
          const validatedSpec = await SwaggerParser.validate(yamlData)
          parsedSpec = validatedSpec
        } catch {
          parsedSpec = yamlData
        }
        filetype = 'yaml'
      } else if (contentType === 'text') {
        filetype = 'text'
        parsedSpec = null
      } else {
        return res.status(400).json({ error: 'Unsupported content type' })
      }
    } catch (parseError) {
      console.error('Parse error:', parseError.message)
      return res.status(400).json({ error: 'Invalid content format' })
    }

    const { data, error } = await supabase
      .from('api_specs')
      .insert({
        user_id: userId,
        filename: filename || `Pasted_${Date.now()}.${contentType}`,
        filetype,
        raw_text: rawText,
        parsed_spec: parsedSpec
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error.message)
      return res.status(500).json({ error: 'Failed to save specification' })
    }

    return res.json({ 
      spec: data,
      info: parsedSpec?.info || null
    })

  } catch (error) {
    console.error('Paste error:', error.message)
    return res.status(500).json({ error: 'Internal server error' })
  }
} 