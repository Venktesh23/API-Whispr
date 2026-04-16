import { createClient } from '@supabase/supabase-js'

const openai = new (require('openai').default)({
  apiKey: process.env.OPENAI_API_KEY,
})

/**
 * Chunks an OpenAPI specification into semantic pieces
 * @param {Object} parsedSpec - Parsed OpenAPI specification object
 * @returns {Array} Array of chunk objects with type, content, and metadata
 */
export async function chunkSpec(parsedSpec) {
  if (!parsedSpec) return []

  const chunks = []
  let chunkIndex = 0

  // 1. Info/Overview chunk
  if (parsedSpec.info) {
    const infoContent = formatInfoBlock(parsedSpec)
    chunks.push({
      chunk_type: 'info',
      chunk_content: infoContent,
      metadata: {
        title: parsedSpec.info.title,
        version: parsedSpec.info.version,
        description: parsedSpec.info.description,
      },
      chunk_index: chunkIndex++,
    })
  }

  // 2. Endpoint chunks (one per endpoint)
  if (parsedSpec.paths) {
    Object.entries(parsedSpec.paths).forEach(([path, pathItem]) => {
      if (!pathItem || typeof pathItem !== 'object') return

      Object.entries(pathItem).forEach(([method, operation]) => {
        if (
          typeof operation !== 'object' ||
          method.toLowerCase() === 'parameters'
        ) {
          return
        }

        const endpointContent = formatEndpointBlock(
          path,
          method.toUpperCase(),
          operation,
          parsedSpec
        )

        chunks.push({
          chunk_type: 'endpoint',
          chunk_content: endpointContent,
          metadata: {
            path,
            method: method.toUpperCase(),
            summary: operation.summary,
            tags: operation.tags,
            operationId: operation.operationId,
          },
          chunk_index: chunkIndex++,
        })
      })
    })
  }

  // 3. Tag-based chunks (group endpoints by tag)
  if (parsedSpec.paths && parsedSpec.tags) {
    parsedSpec.tags.forEach((tag) => {
      const tagEndpoints = []

      Object.entries(parsedSpec.paths).forEach(([path, pathItem]) => {
        if (!pathItem || typeof pathItem !== 'object') return

        Object.entries(pathItem).forEach(([method, operation]) => {
          if (typeof operation !== 'object') return
          if (operation.tags && operation.tags.includes(tag.name)) {
            tagEndpoints.push({
              method: method.toUpperCase(),
              path,
              summary: operation.summary,
            })
          }
        })
      })

      if (tagEndpoints.length > 0) {
        const tagContent = formatTagBlock(tag, tagEndpoints)
        chunks.push({
          chunk_type: 'tag',
          chunk_content: tagContent,
          metadata: {
            tag: tag.name,
            endpointCount: tagEndpoints.length,
            description: tag.description,
          },
          chunk_index: chunkIndex++,
        })
      }
    })
  }

  // 4. Schema chunks (reusable components)
  if (parsedSpec.components && parsedSpec.components.schemas) {
    Object.entries(parsedSpec.components.schemas).forEach(([schemaName, schema]) => {
      const schemaContent = formatSchemaBlock(schemaName, schema)
      chunks.push({
        chunk_type: 'schema',
        chunk_content: schemaContent,
        metadata: {
          schemaName,
          type: schema.type,
          description: schema.description,
        },
        chunk_index: chunkIndex++,
      })
    })
  }

  console.log(`📦 Chunked spec into ${chunks.length} semantic pieces`)
  return chunks
}

/**
 * Generates embeddings for chunks using OpenAI's text-embedding-3-small
 * @param {Array} chunks - Array of chunk objects
 * @returns {Array} Chunks with embedding field added
 */
export async function embedChunks(chunks) {
  if (chunks.length === 0) return []

  console.log(`🔗 Generating embeddings for ${chunks.length} chunks...`)

  try {
    const embeddedChunks = []

    // Batch requests in groups of 20 to avoid rate limits
    for (let i = 0; i < chunks.length; i += 20) {
      const batch = chunks.slice(i, i + 20)
      const texts = batch.map((chunk) => chunk.chunk_content)

      console.log(
        `⏳ Embedding batch ${Math.floor(i / 20) + 1}/${Math.ceil(chunks.length / 20)}...`
      )

      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: texts,
        encoding_format: 'float',
      })

      // Map embeddings back to chunks
      batch.forEach((chunk, idx) => {
        embeddedChunks.push({
          ...chunk,
          embedding: response.data[idx].embedding,
        })
      })
    }

    console.log(`✅ Successfully embedded all ${embeddedChunks.length} chunks`)
    return embeddedChunks
  } catch (error) {
    console.error('❌ Embedding failed:', error.message)
    // Return chunks without embeddings - the pipeline will degrade gracefully
    // The RAG retrieval will fallback to raw spec content
    return chunks.map((chunk) => ({
      ...chunk,
      embedding: null,
    }))
  }
}

/**
 * Stores embedded chunks in Supabase
 * @param {Object} supabase - Supabase client
 * @param {string} specId - Spec ID
 * @param {string} userId - User ID
 * @param {Array} embeddedChunks - Chunks with embeddings
 */
export async function storeChunks(supabase, specId, userId, embeddedChunks) {
  if (!embeddedChunks || embeddedChunks.length === 0) {
    console.log('⚠️ No chunks to store')
    return
  }

  try {
    console.log(
      `💾 Storing ${embeddedChunks.length} chunks to Supabase...`
    )

    // Delete existing chunks for this spec (handles re-uploads)
    const { error: deleteError } = await supabase
      .from('spec_chunks')
      .delete()
      .eq('spec_id', specId)

    if (deleteError) {
      console.warn(
        '⚠️ Failed to delete old chunks:',
        deleteError.message
      )
    }

    // Insert chunks in batches of 50
    for (let i = 0; i < embeddedChunks.length; i += 50) {
      const batch = embeddedChunks.slice(i, i + 50)

      const { error: insertError } = await supabase.from('spec_chunks').insert(
        batch.map((chunk) => ({
          spec_id: specId,
          user_id: userId,
          chunk_type: chunk.chunk_type,
          chunk_index: chunk.chunk_index,
          chunk_content: chunk.chunk_content,
          metadata: chunk.metadata,
          embedding: chunk.embedding ? JSON.stringify(chunk.embedding) : null,
        }))
      )

      if (insertError) {
        console.error(
          `❌ Failed to insert batch ${Math.floor(i / 50) + 1}:`,
          insertError.message
        )
        return
      }

      console.log(
        `✅ Stored batch ${Math.floor(i / 50) + 1}/${Math.ceil(embeddedChunks.length / 50)}`
      )
    }

    console.log(`✅ Successfully stored all ${embeddedChunks.length} chunks`)
  } catch (error) {
    console.error('❌ Chunk storage failed:', error.message)
    // Don't block the user if storage fails - they can still proceed to analysis
    // The RAG retrieval will fallback gracefully
  }
}

/**
 * Retrieves the most relevant spec chunks for a query using semantic search
 * @param {Object} supabase - Supabase client
 * @param {string} query - User's natural language query
 * @param {string} specId - Spec ID to search within
 * @param {number} topK - Number of top chunks to return (default 8)
 * @returns {Array} Array of chunk content strings
 */
export async function retrieveRelevantChunks(
  supabase,
  query,
  specId,
  topK = 8
) {
  try {
    // Generate embedding for the query
    console.log('🔍 Embedading query for semantic search...')
    const queryEmbeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
      encoding_format: 'float',
    })

    const queryEmbedding = queryEmbeddingResponse.data[0].embedding

    // Call the Supabase RPC function to find matching chunks
    const { data: matchedChunks, error } = await supabase.rpc(
      'match_chunks',
      {
        query_embedding: queryEmbedding,
        match_spec_id: specId,
        match_count: topK,
      }
    )

    if (error) {
      console.warn('⚠️ Chunk retrieval failed:', error.message)
      return []
    }

    if (!matchedChunks || matchedChunks.length === 0) {
      console.log('⚠️ No relevant chunks found for query')
      return []
    }

    console.log(`✅ Retrieved ${matchedChunks.length} relevant chunks`)
    return matchedChunks.map((chunk) => chunk.chunk_content)
  } catch (error) {
    console.error('❌ RAG retrieval failed:', error.message)
    return []
  }
}

// ============================================================================
// FORMATTING HELPER FUNCTIONS
// ============================================================================

function formatInfoBlock(spec) {
  const info = spec.info || {}
  const servers = spec.servers || []

  return `
API Overview: ${info.title || 'Untitled API'}
Version: ${info.version || 'Unknown'}

Description: ${info.description || 'No description provided'}

${
  servers.length > 0
    ? `Base URLs:\n${servers.map((s) => `- ${s.url} (${s.description || 'Production'})`).join('\n')}`
    : ''
}

${info.contact ? `Contact: ${info.contact.email || info.contact.name || 'N/A'}` : ''}
${info.license ? `License: ${info.license.name}` : ''}
`.trim()
}

function formatEndpointBlock(path, method, operation, spec) {
  const params = operation.parameters || []
  const requestBody = operation.requestBody
  const responses = operation.responses || {}

  let content = `
Endpoint: ${method} ${path}
${operation.summary ? `Summary: ${operation.summary}` : ''}
${operation.description ? `Description: ${operation.description}` : ''}

${
  operation.tags && operation.tags.length > 0
    ? `Tags: ${operation.tags.join(', ')}`
    : ''
}

Parameters:
${
  params.length > 0
    ? params
        .map(
          (p) =>
            `- ${p.name} (${p.in}): ${p.required ? 'REQUIRED' : 'optional'} - ${p.description || 'No description'}`
        )
        .join('\n')
    : '- None'
}

Request Body:
${
  requestBody
    ? `- Content-Type: ${Object.keys(requestBody.content || {}).join(', ')}`
    : '- None'
}

Responses:
${
  Object.entries(responses)
    .slice(0, 5) // Limit to top 5 responses
    .map(([code, resp]) => `- ${code}: ${resp.description || 'No description'}`)
    .join('\n')
}

Authentication: ${(operation.security && operation.security.length > 0) ? 'Required' : 'Not required'}
`.trim()

  return content
}

function formatTagBlock(tag, endpoints) {
  return `
Tag: ${tag.name}
${tag.description ? `Description: ${tag.description}` : ''}

Endpoints in this category (${endpoints.length} total):
${endpoints
  .slice(0, 10)
  .map(
    (ep) =>
      `- ${ep.method} ${ep.path}${ep.summary ? `: ${ep.summary}` : ''}`
  )
  .join('\n')}
${endpoints.length > 10 ? `... and ${endpoints.length - 10} more` : ''}
`.trim()
}

function formatSchemaBlock(schemaName, schema) {
  const properties = schema.properties || {}
  const required = schema.required || []

  return `
Schema: ${schemaName}
${schema.description ? `Description: ${schema.description}` : ''}
Type: ${schema.type || 'object'}

${
  Object.keys(properties).length > 0
    ? `Fields:\n${Object.entries(properties)
        .slice(0, 15)
        .map(
          ([key, prop]) =>
            `- ${key} (${prop.type || 'any'})${required.includes(key) ? ' [REQUIRED]' : ''}: ${prop.description || ''}`
        )
        .join('\n')}`
    : ''
}
`.trim()
}
