import { callGemini } from '../../lib/gemini'

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

    // Build conversation context from history
    const historyContext =
      history.length > 0
        ? `\n\nConversation so far:\n${history.map((m) => `${m.role}: ${m.content}`).join('\n')}\n\nNow respond to:`
        : ''

    const userPrompt = `${historyContext}\n${message}`

    const result = await callGemini(BUILD_SPEC_SYSTEM_PROMPT, userPrompt, {
      temperature: 0.7,
      maxOutputTokens: 2000,
    })

    let parsedResponse
    try {
      const cleaned = result.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim()
      parsedResponse = JSON.parse(cleaned)
    } catch {
      const jsonMatch = result.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0])
      } else {
        parsedResponse = { message: result, specYaml: '', status: 'building' }
      }
    }

    res.status(200).json({
      success: true,
      message: parsedResponse.message || 'Specification updated',
      specYaml: parsedResponse.specYaml || '',
      status: parsedResponse.status || 'building',
    })
  } catch (error) {
    console.error('Spec builder error:', error)
    res.status(500).json({ error: error.message || 'Failed to process spec builder request' })
  }
}
