import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'
import { retrieveRelevantChunks } from '../../lib/embeddings'
import { formatCurlSnippet, formatPythonSnippet, formatJavaScriptSnippet } from '../../utils/formatSnippets'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

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

  const { question, spec, specType, specId, userId } = req.body

  if (!question) {
    return res.status(400).json({ error: 'Question is required' })
  }

  try {
    let systemPrompt = SYSTEM_PROMPT
    let userPrompt = ''
    let usingRAG = false

    // Determine context building strategy
    if (specId && userId) {
      // TRY RAG retrieval first
      console.log('🔍 Attempting RAG retrieval for specId:', specId)
      
      try {
        const relevantChunks = await retrieveRelevantChunks(
          supabase,
          question,
          specId,
          8 // topK = 8
        )

        if (relevantChunks && relevantChunks.length > 0) {
          // Successfully retrieved chunks via RAG
          console.log(`✅ RAG successful: Retrieved ${relevantChunks.length} relevant chunks`)
          
          const chunksContext = relevantChunks
            .map((chunk, idx) => `[Chunk ${idx + 1}]\n${chunk}`)
            .join('\n---\n')

          userPrompt = `Here are the most relevant parts of the API specification for your question:

${chunksContext}

---

Question: ${question}

Please answer the question based on the provided specification chunks. If the answer requires information not in the chunks, mention that.`

          usingRAG = true
        } else {
          // No chunks found - fall back to raw spec
          console.warn('⚠️ RAG retrieval found no chunks, falling back to raw spec')
          userPrompt = buildRawSpecContext(spec, question)
        }
      } catch (ragError) {
        // RAG retrieval failed - fall back to raw spec
        console.error('⚠️ RAG retrieval failed:', ragError.message)
        console.log('   Falling back to raw spec content')
        userPrompt = buildRawSpecContext(spec, question)
      }
    } else if (!spec || !specType || specType === 'general') {
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
${spec.substring(0, 4000)}${spec.length > 4000 ? '...\n[Note: Spec truncated for context window]' : ''}

Question: ${question}`
    } else {
      // OpenAPI spec context
      userPrompt = `OpenAPI Specification:
${typeof spec === 'string' ? spec.substring(0, 4000) : JSON.stringify(spec, null, 2).substring(0, 4000)}${(typeof spec === 'string' ? spec.length : JSON.stringify(spec).length) > 4000 ? '...\n[Note: Spec truncated for context window]' : ''}

Question: ${question}

Please analyze the specification and provide a helpful answer with relevant details and examples.`
    }

    // Set headers for streaming response
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('Access-Control-Allow-Origin', '*')

    // Send RAG indicator if applicable
    if (usingRAG) {
      res.write(`data: ${JSON.stringify({ ragEnabled: true, chunkCount: 8 })}\n\n`)
    }

    const stream = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      max_tokens: 1200,
      temperature: 0.3,
      stream: true,
    })

    // Send chunks as they arrive from OpenAI
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || ''
      if (content) {
        res.write(`data: ${JSON.stringify({ text: content })}\n\n`)
      }
    }

    // Send completion signal
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`)
    res.end()
  } catch (error) {
    console.error('OpenAI API error:', error)
    res.write(`data: ${JSON.stringify({ error: 'Failed to process request' })}\n\n`)
    res.end()
  }
}

/**
 * Build context from raw spec content as fallback
 * Limits to ~4000 chars to avoid token overflow
 */
function buildRawSpecContext(spec, question) {
  const maxChars = 4000
  const specContent =
    typeof spec === 'string' ? spec : JSON.stringify(spec, null, 2)
  const truncated = specContent.length > maxChars
  const specTruncated = specContent.substring(0, maxChars)

  return `API Specification:
${specTruncated}${truncated ? '\n\n[Note: Large spec - truncated for context. For better results, use the chat interface which has Smart Search enabled.]' : ''}

Question: ${question}`
} 