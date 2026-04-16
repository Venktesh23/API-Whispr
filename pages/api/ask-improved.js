import { createClient } from '@supabase/supabase-js'
import { callGemini } from '../../lib/gemini'
import { retrieveRelevantChunks } from '../../lib/embeddings'
import { streamTextResponse, truncateToTokenLimit } from '../../lib/streaming'
import {
  validators,
  validateRequest,
  errorResponse,
  logError,
  trackApiUsage,
} from '../../lib/api-utils'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
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

  const {
    question,
    spec,
    specType,
    specId,
    userId,
    streamingOptions = {},
  } = req.body

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

  try {
    let systemPrompt = SYSTEM_PROMPT
    let userPrompt = ''
    let usingRAG = false

    // If we have specId and userId, try to use RAG
    if (specId && userId) {
      try {
        const relevantChunks = await retrieveRelevantChunks(
          supabase,
          question,
          specId,
          8
        )

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

      const truncatedSpec = truncateToTokenLimit(
        typeof spec === 'string' ? spec : JSON.stringify(spec),
        2000
      )
      userPrompt = `API Documentation:\n${truncatedSpec}\n\nQuestion: ${question}`
    } else {
      userPrompt = buildRawSpecContext(spec, question)
    }

    // Send streaming metadata
    if (usingRAG) {
      res.write(
        `data: ${JSON.stringify({
          type: 'metadata',
          ragEnabled: true,
          chunkCount: 8,
        })}\n\n`
      )
    }

    // Call Gemini with streaming
    const fullText = await callGemini(systemPrompt, userPrompt, {
      temperature: 0.3,
      maxOutputTokens: 1200,
    })

    // Track API usage
    const questionTokens = Math.ceil(userPrompt.split(' ').length * 1.3)
    const responseTokens = Math.ceil(fullText.split(' ').length * 1.3)

    await trackApiUsage({
      userId: userId || 'anonymous',
      model: 'gemini-2.0-flash',
      endpoint: '/api/ask',
      inputTokens: questionTokens,
      outputTokens: responseTokens,
    })

    // Stream response with configurable options
    const options = {
      chunkType: streamingOptions.chunkType || 'semantic',
      chunkSize: streamingOptions.chunkSize || 256,
      delayMs: streamingOptions.delayMs || 15,
      ...streamingOptions,
    }

    await streamTextResponse(res, fullText, options)
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

    res.write(`data: ${JSON.stringify({ type: 'error', error: 'Failed to process request' })}\n\n`)
    res.end()
  }
}

function buildRawSpecContext(spec, question) {
  const maxChars = 3000
  const specContent = typeof spec === 'string' ? spec : JSON.stringify(spec, null, 2)
  const truncated = specContent.length > maxChars

  const specTruncated = truncateToTokenLimit(specContent, 750)

  return `API Specification:\n${specTruncated}${
    truncated
      ? '\n\n[Note: Large spec - truncated for context. For better results, use the chat interface which has semantic search enabled.]'
      : ''
  }\n\nQuestion: ${question}`
}
