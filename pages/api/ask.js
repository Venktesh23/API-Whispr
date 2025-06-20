import OpenAI from 'openai'
import { formatCurlSnippet, formatPythonSnippet, formatJavaScriptSnippet } from '../../utils/formatSnippets'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const SYSTEM_PROMPT = `You are an API assistant helping developers understand and test APIs based on OpenAPI specifications.

You will be given:
- A developer question
- A chunk of an OpenAPI spec or raw API documentation

Your job:
1. Match the best endpoint for the question
2. Return the result in this exact JSON structure:

{
  "endpoint": "[METHOD] /path",
  "description": "[One sentence explanation]",
  "parameters": [
    {
      "name": "parameter_name",
      "type": "string|number|boolean|object",
      "required": true|false,
      "location": "path|query|body|header"
    }
  ],
  "auth": true|false,
  "baseUrl": "https://api.example.com"
}

If no match is found, return:
{
  "error": "Sorry, I couldn't find an exact match for your request based on the API specification."
}

Be precise and only return valid JSON.`

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { question, spec, specType } = req.body

  if (!question) {
    return res.status(400).json({ error: 'Question is required' })
  }

  try {
    let systemPrompt = ''
    let userPrompt = ''

    if (!spec || !specType || specType === 'general') {
      // General conversation without API spec
      systemPrompt = `You are a helpful AI assistant specializing in APIs, software development, and technical questions. You can help with:
- General API development questions
- Programming concepts and best practices
- Technical troubleshooting
- Code examples and explanations
- Web development guidance

Provide clear, practical answers and code examples when relevant. Be concise but thorough.`

      userPrompt = question
    } else if (specType === 'pdf') {
      systemPrompt = `You are an expert API documentation assistant. You help developers understand API documentation by answering questions clearly and providing practical examples.

The user has uploaded PDF documentation. Based on the extracted text, answer their questions about the API. Provide:
1. Clear, direct answers
2. Relevant code examples when applicable (cURL, JavaScript, Python)
3. Parameter details and requirements
4. Authentication information if mentioned
5. Endpoint URLs and methods
6. Error handling information

Be concise but thorough. Format code blocks properly. If information is not available in the documentation, say so clearly.`

      userPrompt = `API Documentation:
${spec}

Question: ${question}`
    } else {
      systemPrompt = `You are an expert OpenAPI/Swagger specification assistant. You help developers understand APIs by analyzing OpenAPI specs and answering questions clearly.

When answering questions about the API specification, provide:
1. Relevant endpoint information (method, path, description)
2. Required and optional parameters with types and descriptions
3. Request/response examples with proper JSON formatting
4. Authentication requirements (API keys, OAuth, etc.)
5. Error responses and status codes
6. Working code snippets (cURL, JavaScript, Python when relevant)

Be practical and developer-focused. Always reference the actual spec data provided. Format code blocks properly for readability.`

      userPrompt = `OpenAPI Specification:
${JSON.stringify(spec, null, 2)}

Question: ${question}

Please analyze the specification and provide a helpful answer with relevant details and examples.`
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: userPrompt
        }
      ],
      max_tokens: 1200,
      temperature: 0.3,
    })

    const answer = completion.choices[0].message.content

    res.status(200).json({ answer })
  } catch (error) {
    console.error('OpenAI API error:', error)
    res.status(500).json({ error: 'Failed to process request' })
  }
} 