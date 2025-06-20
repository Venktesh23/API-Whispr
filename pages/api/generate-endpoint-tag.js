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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { endpoint, specContent, specType } = req.body

    if (!endpoint || !endpoint.path || !endpoint.method) {
      return res.status(400).json({ error: 'Endpoint with path and method is required' })
    }

    console.log('🏷️ Generating tag for:', `${endpoint.method} ${endpoint.path}`)

    // Fallback tag generation function
    const generateFallbackTag = () => {
      const path = endpoint.path.toLowerCase()
      const method = endpoint.method.toLowerCase()

      // Common patterns
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
        { regex: /webhook|callback|event/, tag: 'Webhooks', confidence: 'medium' }
      ]

      for (const pattern of patterns) {
        if (pattern.regex.test(path) || pattern.regex.test(endpoint.summary || '') || pattern.regex.test(endpoint.description || '')) {
          return {
            tag: pattern.tag,
            confidence: pattern.confidence,
            reasoning: `Generated based on path pattern and endpoint information`
          }
        }
      }

      // Fallback to path-based categorization
      const pathParts = path.split('/').filter(part => part && !part.includes('{'))
      if (pathParts.length > 0) {
        const mainPart = pathParts[1] || pathParts[0]
        const capitalizedTag = mainPart.charAt(0).toUpperCase() + mainPart.slice(1)
        return {
          tag: capitalizedTag,
          confidence: 'low',
          reasoning: 'Generated from main path component'
        }
      }

      return {
        tag: 'General',
        confidence: 'low',
        reasoning: 'Default tag when no clear pattern is identified'
      }
    }

    // Try GPT analysis first, fallback to local generation
    if (process.env.OPENAI_API_KEY) {
      try {
        const endpointInfo = `
Path: ${endpoint.path}
Method: ${endpoint.method}
Summary: ${endpoint.summary || 'Not provided'}
Description: ${endpoint.description || 'Not provided'}
Operation ID: ${endpoint.operationId || 'Not provided'}
        `.trim()

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4-turbo-preview',
            messages: [
              {
                role: 'system',
                content: ENDPOINT_TAG_SYSTEM_PROMPT
              },
              {
                role: 'user',
                content: `Generate an appropriate tag for this OpenAPI endpoint:

${endpointInfo}

Context from specification type: ${specType}
Nearby endpoints in the same spec might include similar functionality.`
              }
            ],
            temperature: 0.2,
            max_tokens: 200
          })
        })

        if (response.ok) {
          const data = await response.json()
          const result = data.choices[0]?.message?.content

          if (result) {
            try {
              const parsedResult = JSON.parse(result)
              console.log('✅ Tag generated with GPT:', parsedResult.tag)
              return res.status(200).json(parsedResult)
            } catch (parseError) {
              console.log('GPT response parsing failed, using fallback')
            }
          }
        }
      } catch (aiError) {
        console.log('GPT analysis failed, using fallback:', aiError.message)
      }
    }

    // Fallback to local generation
    const result = generateFallbackTag()
    console.log('✅ Tag generated locally:', result.tag)
    res.status(200).json(result)

  } catch (error) {
    console.error('💥 Tag generation error:', error.message)
    
    res.status(500).json({ 
      error: 'Failed to generate endpoint tag',
      message: error.message
    })
  }
} 