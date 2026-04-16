const conversation = []

const BUILD_SPEC_SYSTEM_PROMPT = `You are an expert OpenAPI specification builder assistant. Your job is to help users create, modify, and refine OpenAPI 3.0 specifications through conversation.

You will:
1. Help users define API endpoints, methods, parameters, request/response bodies
2. Generate valid OpenAPI 3.0 YAML specifications
3. Continuously update the specification as the user provides more details
4. Provide clear explanations and ask clarifying questions
5. Ensure the specification is valid and follows OpenAPI standards

Always return your response as JSON with this structure:
{
  "message": "Your conversational response to the user",
  "specYaml": "The current OpenAPI 3.0 spec in YAML format (always include this, even if unchanged)",
  "status": "building|refining|complete"
}

Start with a basic OpenAPI template if no spec exists. Build incrementally based on user feedback.`

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { message, history = [] } = req.body

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' })
    }

    console.log('🔄 Processing spec builder request...')
    console.log('Message:', message.substring(0, 100))
    console.log('History length:', history.length)

    // Build messages array from history + new message
    const messages = [
      {
        role: 'system',
        content: BUILD_SPEC_SYSTEM_PROMPT,
      },
      ...history.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
      {
        role: 'user',
        content: message,
      },
    ]

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo',
        messages,
        temperature: 0.7,
        max_tokens: 2000,
        response_format: {
          type: 'json_object',
        },
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('OpenAI API error:', errorData)
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const data = await response.json()
    let responseContent = data.choices?.[0]?.message?.content || '{}'

    // Ensure we parse valid JSON
    let parsedResponse
    try {
      parsedResponse = JSON.parse(responseContent)
    } catch (e) {
      console.error('Failed to parse response JSON:', responseContent)
      // If JSON parsing fails, try to extract JSON from the response
      const jsonMatch = responseContent.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('Invalid JSON response from OpenAI')
      }
    }

    const { message: assistantMessage, specYaml, status } = parsedResponse

    console.log('✅ Spec builder response generated')

    res.status(200).json({
      success: true,
      message: assistantMessage || 'Specification updated',
      specYaml: specYaml || '',
      status: status || 'building',
    })
  } catch (error) {
    console.error('Spec builder error:', error)
    res.status(500).json({
      error: error.message || 'Failed to process spec builder request',
    })
  }
}
