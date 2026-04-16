import { callGemini } from '../../lib/gemini'

const ENDPOINT_TAG_SYSTEM_PROMPT = `You are an API organization expert. Generate appropriate, meaningful tags for OpenAPI endpoints based on their path, method, and description.

Guidelines for good tags:
- Use title case (e.g., "User Management", "Authentication")
- Keep them concise but descriptive
- Group related functionality (e.g., "Users", "Orders", "Payments")
- Avoid generic tags like "API" or "Endpoint"
- Consider the HTTP method and business domain

Return exactly this JSON format:
{
  "tag": "Authentication",
  "confidence": "high",
  "reasoning": "This endpoint handles user login functionality based on the path '/auth/login' and POST method"
}

Confidence levels:
- "high": Very clear from path/description what the tag should be
- "medium": Reasonable guess based on available information
- "low": Best effort with limited information`

const generateFallbackTag = (endpoint) => {
  const path = endpoint.path.toLowerCase()
  const patterns = [
    { regex: /auth|login|token|signin|signup|register/, tag: 'Authentication', confidence: 'high' },
    { regex: /user|profile|account/, tag: 'Users', confidence: 'high' },
    { regex: /order|purchase|buy|cart/, tag: 'Orders', confidence: 'high' },
    { regex: /payment|billing|invoice|charge/, tag: 'Payments', confidence: 'high' },
    { regex: /product|item|catalog|inventory/, tag: 'Products', confidence: 'high' },
    { regex: /admin|manage|setting|config/, tag: 'Administration', confidence: 'medium' },
    { regex: /search|query|find/, tag: 'Search', confidence: 'medium' },
    { regex: /notification|message|alert/, tag: 'Notifications', confidence: 'medium' },
    { regex: /report|analytics|stats/, tag: 'Reports', confidence: 'medium' },
    { regex: /upload|download|file|document/, tag: 'File Management', confidence: 'medium' },
    { regex: /webhook|callback|event/, tag: 'Webhooks', confidence: 'medium' },
  ]

  for (const pattern of patterns) {
    if (
      pattern.regex.test(path) ||
      pattern.regex.test(endpoint.summary || '') ||
      pattern.regex.test(endpoint.description || '')
    ) {
      return { tag: pattern.tag, confidence: pattern.confidence, reasoning: 'Generated based on path pattern' }
    }
  }

  const pathParts = path.split('/').filter((p) => p && !p.includes('{'))
  if (pathParts.length > 0) {
    const mainPart = pathParts[1] || pathParts[0]
    return {
      tag: mainPart.charAt(0).toUpperCase() + mainPart.slice(1),
      confidence: 'low',
      reasoning: 'Generated from main path component',
    }
  }

  return { tag: 'General', confidence: 'low', reasoning: 'Default tag' }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { endpoint, specContent, specType } = req.body

    if (!endpoint || !endpoint.path || !endpoint.method) {
      return res.status(400).json({ error: 'Endpoint with path and method is required' })
    }

    if (!process.env.GEMINI_API_KEY) {
      const result = generateFallbackTag(endpoint)
      return res.status(200).json(result)
    }

    try {
      const userPrompt = `Generate an appropriate tag for this OpenAPI endpoint:

Path: ${endpoint.path}
Method: ${endpoint.method}
Summary: ${endpoint.summary || 'Not provided'}
Description: ${endpoint.description || 'Not provided'}
Operation ID: ${endpoint.operationId || 'Not provided'}

Context from specification type: ${specType}`

      const result = await callGemini(ENDPOINT_TAG_SYSTEM_PROMPT, userPrompt, {
        temperature: 0.2,
        maxOutputTokens: 200,
      })

      const cleaned = result.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim()
      const parsedResult = JSON.parse(cleaned)
      return res.status(200).json(parsedResult)
    } catch {
      const result = generateFallbackTag(endpoint)
      return res.status(200).json(result)
    }
  } catch (error) {
    console.error('💥 Tag generation error:', error)
    return res.status(500).json({ error: 'Failed to generate endpoint tag' })
  }
}
