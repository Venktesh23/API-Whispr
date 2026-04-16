import yaml from 'js-yaml'
import SwaggerParser from 'swagger-parser'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json')
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  let body
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {})
  } catch (parseBodyError) {
    console.error('Failed to parse request body:', parseBodyError.message)
    return res.status(400).json({ error: 'Invalid request body' })
  }

  try {
    const { content, contentType, userId, filename } = body

    if (!content) {
      return res.status(400).json({ error: 'Content is required' })
    }

    if (!contentType) {
      return res.status(400).json({ error: 'Content type is required' })
    }

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' })
    }

    let filetype, rawText, parsedSpec

    try {
      rawText = content.trim()
      
      if (contentType === 'json') {
        const jsonData = JSON.parse(rawText)
        
        try {
          const validatedSpec = await SwaggerParser.validate(jsonData)
          parsedSpec = validatedSpec
        } catch (validationError) {
          parsedSpec = jsonData
        }
        
        filetype = 'json'
      } else if (contentType === 'yaml') {
        const yamlData = yaml.load(rawText)
        
        try {
          const validatedSpec = await SwaggerParser.validate(yamlData)
          parsedSpec = validatedSpec
        } catch (validationError) {
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
      return res.status(400).json({ 
        error: `Failed to parse ${contentType.toUpperCase()} content.`
      })
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing Supabase env vars')
      return res.status(500).json({ error: 'Server not configured' })
    }

    let insertResult
    try {
      insertResult = await supabase
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
    } catch (supabaseError) {
      console.error('Supabase insert error:', supabaseError)
      return res.status(500).json({ error: 'Database operation failed' })
    }

    const { data, error } = insertResult

    if (error) {
      console.error('Supabase response error:', error)
      return res.status(500).json({ error: 'Failed to save specification' })
    }

    if (!data) {
      return res.status(500).json({ error: 'No data returned' })
    }

    return res.status(200).json({ 
      spec: data,
      info: parsedSpec?.info || null
    })

  } catch (error) {
    console.error('Paste API error:', error.message, error.stack)
    return res.status(500).json({ error: 'Internal error' })
  }
} 