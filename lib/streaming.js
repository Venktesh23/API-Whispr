/**
 * Advanced streaming and chunking utilities for API responses
 * Implements semantic-aware chunking for better context retention
 */

/**
 * Split text into semantic chunks (sentences/paragraphs)
 * Maintains context while creating manageable chunks
 */
export function semanticChunk(text, maxChunkSize = 500) {
  if (!text || text.length === 0) return []

  const chunks = []
  let currentChunk = ''

  // Split by paragraphs first
  const paragraphs = text.split(/\n\n+/)

  for (const paragraph of paragraphs) {
    // Split paragraph into sentences
    const sentences = paragraph.split(/(?<=[.!?])\s+/)

    for (const sentence of sentences) {
      // If adding this sentence would exceed max chunk size and we have content
      if (
        currentChunk.length + sentence.length > maxChunkSize &&
        currentChunk.length > 0
      ) {
        chunks.push(currentChunk.trim())
        currentChunk = sentence
      } else {
        currentChunk += (currentChunk ? ' ' : '') + sentence
      }
    }

    // Add paragraph break back
    currentChunk += '\n\n'
  }

  // Don't forget the last chunk
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim())
  }

  return chunks
}

/**
 * Chunk text into fixed-size pieces for streaming
 * Good for consistent, predictable chunking
 */
export function fixedChunk(text, chunkSize = 256) {
  if (!text || text.length === 0) return []

  const chunks = []
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.substring(i, i + chunkSize))
  }
  return chunks
}

/**
 * Smart chunk that respects word boundaries
 * Prevents cutting words in half
 */
export function wordBoundaryChunk(text, chunkSize = 256) {
  if (!text || text.length === 0) return []

  const chunks = []
  let currentChunk = ''

  const words = text.split(/(\s+)/)

  for (const word of words) {
    if (currentChunk.length + word.length > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk)
      currentChunk = word
    } else {
      currentChunk += word
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk)
  }

  return chunks
}

/**
 * Stream response to HTTP response object with proper SSE formatting
 * @param {Object} res - Express response object
 * @param {string} text - Full text to stream
 * @param {Object} options - Streaming options
 * @param {string} options.chunkType - 'semantic', 'fixed', or 'wordBoundary'
 * @param {number} options.chunkSize - Size of each chunk
 * @param {number} options.delayMs - Delay between chunks (ms)
 * @param {Function} options.onChunk - Optional callback for each chunk
 */
export async function streamTextResponse(res, text, options = {}) {
  const {
    chunkType = 'semantic',
    chunkSize = 256,
    delayMs = 20,
    onChunk = null,
  } = options

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')

  try {
    // Choose chunking strategy
    let chunks
    switch (chunkType) {
      case 'fixed':
        chunks = fixedChunk(text, chunkSize)
        break
      case 'wordBoundary':
        chunks = wordBoundaryChunk(text, chunkSize)
        break
      case 'semantic':
      default:
        chunks = semanticChunk(text, chunkSize)
    }

    // Send metadata
    res.write(
      `data: ${JSON.stringify({
        type: 'metadata',
        chunkCount: chunks.length,
        totalLength: text.length,
        chunkType,
      })}\n\n`
    )

    // Stream each chunk
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]

      res.write(
        `data: ${JSON.stringify({
          type: 'text',
          chunk,
          index: i,
          total: chunks.length,
        })}\n\n`
      )

      if (onChunk) {
        onChunk(chunk, i, chunks.length)
      }

      // Add delay between chunks (except after last one)
      if (i < chunks.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs))
      }
    }

    // Send completion signal
    res.write(
      `data: ${JSON.stringify({
        type: 'done',
        totalChunks: chunks.length,
      })}\n\n`
    )
  } catch (error) {
    res.write(
      `data: ${JSON.stringify({
        type: 'error',
        error: error.message,
      })}\n\n`
    )
  }
}

/**
 * Stream response with token-like output (character by character with natural delays)
 * Simulates real token streaming
 */
export async function streamTypewriterResponse(res, text, charDelayMs = 20) {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')

  try {
    for (let i = 0; i < text.length; i++) {
      const char = text[i]
      res.write(
        `data: ${JSON.stringify({
          type: 'char',
          text: char,
          index: i,
          total: text.length,
        })}\n\n`
      )

      await new Promise((resolve) => setTimeout(resolve, charDelayMs))
    }

    res.write(
      `data: ${JSON.stringify({
        type: 'done',
        totalLength: text.length,
      })}\n\n`
    )
  } catch (error) {
    res.write(
      `data: ${JSON.stringify({
        type: 'error',
        error: error.message,
      })}\n\n`
    )
  }
}

/**
 * Parse SSE stream from response
 * For client-side consumption of streamed responses
 */
export async function parseStreamResponse(response, callbacks = {}) {
  const {
    onText = null,
    onChunk = null,
    onMetadata = null,
    onDone = null,
    onError = null,
  } = callbacks

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')

      // Keep incomplete line in buffer
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.substring(6))

          switch (data.type) {
            case 'metadata':
              onMetadata?.(data)
              break
            case 'text':
              onText?.(data.chunk)
              onChunk?.(data)
              break
            case 'char':
              onText?.(data.text)
              break
            case 'done':
              onDone?.(data)
              break
            case 'error':
              onError?.(data.error)
              break
          }
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

/**
 * Estimate token count (rough approximation)
 * For billing and rate limiting purposes
 */
export function estimateTokenCount(text) {
  // Average: ~4 characters per token
  return Math.ceil(text.length / 4)
}

/**
 * Truncate text to token limit while preserving complete thoughts
 */
export function truncateToTokenLimit(text, maxTokens = 4000) {
  const maxChars = maxTokens * 4
  if (text.length <= maxChars) return text

  // Try to truncate at sentence boundary
  const truncated = text.substring(0, maxChars)
  const lastPeriod = truncated.lastIndexOf('.')
  const lastNewline = truncated.lastIndexOf('\n')

  const lastBoundary = Math.max(lastPeriod, lastNewline)
  if (lastBoundary > maxChars * 0.8) {
    return truncated.substring(0, lastBoundary + 1)
  }

  return truncated + '...'
}
