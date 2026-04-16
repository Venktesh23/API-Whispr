import { callGemini } from '../../lib/gemini'

const REQUEST_BUILDER_PROMPT = `You are an expert API request builder. Given a user's intent in plain English and an OpenAPI specification, you must:

1. Identify the most relevant endpoint that matches the user's intent
2. Determine the correct HTTP method (GET, POST, PUT, DELETE, PATCH)
3. Extract path parameters from the endpoint
4. Extract query parameters and their types
5. Build a realistic example request body if needed
6. Suggest appropriate headers

Return ONLY a valid JSON object with this exact structure (no markdown, no extra text):
{
  "found": true,
  "method": "GET|POST|PUT|DELETE|PATCH",
  "path": "/users/{id}",
  "url": "https://api.example.com/v1/users/{id}",
  "summary": "Brief description of what this endpoint does",
  "description": "Longer explanation",
  "headers": {
    "Content-Type": "application/json",
    "Authorization": "Bearer YOUR_TOKEN"
  },
  "pathParams": {
    "id": { "type": "string", "example": "user_123", "description": "User ID" }
  },
  "queryParams": {
    "limit": { "type": "integer", "example": 10, "description": "Results limit" },
    "offset": { "type": "integer", "example": 0, "description": "Results offset" }
  },
  "requestBody": {
    "name": "John Doe",
    "email": "john@example.com"
  },
  "bodySchema": {
    "name": { "type": "string", "description": "User full name" },
    "email": { "type": "string", "description": "User email" }
  },
  "exampleCurl": "curl -X GET https://api.example.com/v1/users/user_123 -H Authorization: Bearer YOUR_TOKEN",
  "reasonForMatch": "This endpoint retrieves a user, which matches the intent to get user information"
}

If no endpoint matches the user's intent, return:
{
  "found": false,
  "message": "No matching endpoint found for that description"
}`

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { intent, spec } = req.body

    if (!intent || !spec) {
      return res.status(400).json({ error: 'Missing required fields: intent and spec' })
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY not configured' })
    }

    const userPrompt = `User intent: "${intent}"

OpenAPI Spec:
${typeof spec === 'string' ? spec : JSON.stringify(spec, null, 2)}

Analyze the spec, find the most relevant endpoint, and return the request object.`

    const result = await callGemini(REQUEST_BUILDER_PROMPT, userPrompt, {
      temperature: 0.3,
      maxOutputTokens: 2000,
    })

    let requestData
    try {
      const cleaned = result.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim()
      requestData = JSON.parse(cleaned)
    } catch {
      requestData = { found: false, message: 'Error parsing API response. Please try again.' }
    }

    return res.status(200).json(requestData)
  } catch (error) {
    console.error('💥 Request builder error:', error)
    return res.status(500).json({ error: 'Failed to build request' })
  }
}
