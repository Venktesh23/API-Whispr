import { createClient } from '@supabase/supabase-js'
import { callGemini } from '../../lib/gemini'
import { retrieveRelevantChunks } from '../../lib/embeddings'
import {
  validators,
  validateRequest,
  errorResponse,
  logError,
  trackApiUsage,
} from '../../lib/api-utils'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
)

const SYSTEM_PROMPT = `You are an expert API assistant helping developers understand and query APIs based on OpenAPI specifications or documentation.

You will be given:
- A developer question
- Relevant chunks of spec content retrieved via semantic search (RAG)

Your job:
1. Answer the question accurately based on the provided spec chunks
2. Provide practical information including:
   - Endpoint details (method, path, parameters)
   - Request/response examples
   - Authentication requirements
   - Error handling information
   - Code examples in cURL, JavaScript, and Python when relevant
3. Be concise but thorough
4. If information isn't in the provided chunks, say so clearly

Format code blocks properly for readability. Be developer-focused and practical.`

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { question, spec, specType, specId, userId } = req.body

  // Validate inputs
  const validationErrors = validateRequest(
    { question, userId },
    {
      question: validators.question,
      userId: userId ? validators.userId : () => null,
    }
  )

  if (validationErrors) {
    return errorResponse(res, 'Validation failed', 400, validationErrors)
  }

  // Set headers for streaming response
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')

  try {
    let systemPrompt = SYSTEM_PROMPT
    let userPrompt = ''
    let usingRAG = false

    if (specId && userId) {
      try {
        const relevantChunks = await retrieveRelevantChunks(supabase, question, specId, 8)

        if (relevantChunks && relevantChunks.length > 0) {
          const chunksContext = relevantChunks
            .map((chunk, idx) => `[Chunk ${idx + 1}]\n${chunk}`)
            .join('\n---\n')

          userPrompt = `Here are the most relevant parts of the API specification for your question:\n\n${chunksContext}\n\n---\n\nQuestion: ${question}\n\nPlease answer the question based on the provided specification chunks. If the answer requires information not in the chunks, mention that.`
          usingRAG = true
        } else {
          userPrompt = buildRawSpecContext(spec, question)
        }
      } catch (ragError) {
        console.error('RAG retrieval failed:', ragError.message)
        await logError({
          errorType: 'RAG_RETRIEVAL_ERROR',
          message: ragError.message,
          code: 200,
          endpoint: '/api/ask',
          userId,
          severity: 'warning',
        })
        userPrompt = buildRawSpecContext(spec, question)
      }
    } else if (!spec || !specType || specType === 'general') {
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

The user has uploaded PDF documentation. Based on the extracted text, answer their questions about the API. Provide practical guidance.`

      userPrompt = `API Documentation:\n${spec.substring(0, 4000)}${spec.length > 4000 ? '...\n[Note: Spec truncated for context window]' : ''}\n\nQuestion: ${question}`
    } else {
      userPrompt = buildRawSpecContext(spec, question)
    }

    if (usingRAG) {
      res.write(`data: ${JSON.stringify({ ragEnabled: true, chunkCount: 8 })}\n\n`)
    }

    // Call Gemini
    const fullText = await callGemini(systemPrompt, userPrompt, {
      temperature: 0.3,
      maxOutputTokens: 1200,
    })

    // Track API usage
    const questionTokens = userPrompt.split(' ').length
    const responseTokens = fullText.split(' ').length
    await trackApiUsage({
      userId: userId || 'anonymous',
      model: 'gemini-2.0-flash',
      endpoint: '/api/ask',
      inputTokens: questionTokens,
      outputTokens: responseTokens,
    })

    // Stream response with real delays (proper streaming)
    await streamResponse(res, fullText)

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`)
    res.end()
  } catch (error) {
    console.error('Ask API error:', error)

    await logError({
      errorType: 'ASK_API_ERROR',
      message: error.message,
      code: 500,
      endpoint: '/api/ask',
      userId: req.body?.userId,
      details: { error: error.toString() },
    })

    res.write(`data: ${JSON.stringify({ error: 'Failed to process request' })}\n\n`)
    res.end()
  }
}

// Stream response with proper delays (simulates token-by-token streaming)
async function streamResponse(res, text) {
  const CHUNK_SIZE = 10 // characters per chunk
  const DELAY_MS = 20 // delay between chunks in milliseconds

  for (let i = 0; i < text.length; i += CHUNK_SIZE) {
    const chunk = text.substring(i, i + CHUNK_SIZE)
    res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`)

    // Add delay to simulate real streaming
    if (i + CHUNK_SIZE < text.length) {
      await new Promise((resolve) => setTimeout(resolve, DELAY_MS))
    }
  }
}

function buildRawSpecContext(spec, question) {
  const maxChars = 4000
  const specContent = typeof spec === 'string' ? spec : JSON.stringify(spec, null, 2)
  const truncated = specContent.length > maxChars
  const specTruncated = specContent.substring(0, maxChars)

  return `API Specification:\n${specTruncated}${truncated ? '\n\n[Note: Large spec - truncated for context. For better results, use the chat interface which has Smart Search enabled.]' : ''}\n\nQuestion: ${question}`
}
