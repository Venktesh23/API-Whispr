const QUESTIONS_SYSTEM_PROMPT = `You are an API documentation expert. Generate 5 smart, specific questions about the given OpenAPI specification that would help developers understand and use the API effectively.

Focus on practical questions about:
- Authentication methods
- Main use cases and workflows  
- Required parameters and data formats
- Error handling
- Common operations

Return ONLY a JSON object with this exact format:
{
  "questions": [
    "How do I authenticate with this API?",
    "What are the required fields for creating a user?",
    "How do I handle pagination in list endpoints?",
    "What error codes should I expect and how do I handle them?",
    "How do I upload files or media to this API?"
  ]
}

Make questions specific to the provided API specification. Use actual endpoint names and parameter names from the spec when possible.`

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { specContent, specType } = req.body

    if (!specContent) {
      return res.status(400).json({ error: 'Spec content is required' })
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OpenAI API key not configured' })
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: QUESTIONS_SYSTEM_PROMPT
          },
          {
            role: 'user',
            content: `Generate smart questions for this API specification (${specType}):\n${specContent.substring(0, 4000)}`
          }
        ],
        temperature: 0.7,
        max_tokens: 800
      })
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const data = await response.json()
    const result = data.choices[0]?.message?.content

    if (!result) {
      throw new Error('No result from OpenAI')
    }

    // Parse the JSON response
    let parsedResult
    try {
      parsedResult = JSON.parse(result)
    } catch (parseError) {
      // Fallback questions if parsing fails
      parsedResult = {
        questions: [
          "How do I authenticate with this API?",
          "What are the main endpoints and their purposes?",
          "How do I handle errors and status codes?",
          "What are the required parameters for creating resources?",
          "How do I paginate through large datasets?"
        ]
      }
    }

    res.status(200).json(parsedResult)

  } catch (error) {
    console.error('Generate questions error:', error)
    res.status(500).json({ 
      error: 'Failed to generate questions',
      message: error.message 
    })
  }
} 