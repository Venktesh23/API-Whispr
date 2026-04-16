import { batchEmbedTexts, embedText } from './gemini'

/**
 * Chunks an OpenAPI specification into semantic pieces
 */
export async function chunkSpec(parsedSpec) {
  if (!parsedSpec) return []

  const chunks = []
  let chunkIndex = 0

  if (parsedSpec.info) {
    chunks.push({
      chunk_type: 'info',
      chunk_content: formatInfoBlock(parsedSpec),
      metadata: {
        title: parsedSpec.info.title,
        version: parsedSpec.info.version,
        description: parsedSpec.info.description,
      },
      chunk_index: chunkIndex++,
    })
  }

  if (parsedSpec.paths) {
    Object.entries(parsedSpec.paths).forEach(([path, pathItem]) => {
      if (!pathItem || typeof pathItem !== 'object') return

      Object.entries(pathItem).forEach(([method, operation]) => {
        if (typeof operation !== 'object' || method.toLowerCase() === 'parameters') return

        chunks.push({
          chunk_type: 'endpoint',
          chunk_content: formatEndpointBlock(path, method.toUpperCase(), operation, parsedSpec),
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

  if (parsedSpec.paths && parsedSpec.tags) {
    parsedSpec.tags.forEach((tag) => {
      const tagEndpoints = []
      Object.entries(parsedSpec.paths).forEach(([path, pathItem]) => {
        if (!pathItem || typeof pathItem !== 'object') return
        Object.entries(pathItem).forEach(([method, operation]) => {
          if (typeof operation !== 'object') return
          if (operation.tags && operation.tags.includes(tag.name)) {
            tagEndpoints.push({ method: method.toUpperCase(), path, summary: operation.summary })
          }
        })
      })

      if (tagEndpoints.length > 0) {
        chunks.push({
          chunk_type: 'tag',
          chunk_content: formatTagBlock(tag, tagEndpoints),
          metadata: { tag: tag.name, endpointCount: tagEndpoints.length, description: tag.description },
          chunk_index: chunkIndex++,
        })
      }
    })
  }

  if (parsedSpec.components && parsedSpec.components.schemas) {
    Object.entries(parsedSpec.components.schemas).forEach(([schemaName, schema]) => {
      chunks.push({
        chunk_type: 'schema',
        chunk_content: formatSchemaBlock(schemaName, schema),
        metadata: { schemaName, type: schema.type, description: schema.description },
        chunk_index: chunkIndex++,
      })
    })
  }

  console.log(`📦 Chunked spec into ${chunks.length} semantic pieces`)
  return chunks
}

/**
 * Generates embeddings for chunks using Gemini text-embedding-004 (768 dims)
 */
export async function embedChunks(chunks) {
  if (chunks.length === 0) return []

  console.log(`🔗 Generating embeddings for ${chunks.length} chunks...`)

  try {
    const embeddedChunks = []

    // Batch in groups of 20
    for (let i = 0; i < chunks.length; i += 20) {
      const batch = chunks.slice(i, i + 20)
      const texts = batch.map((c) => c.chunk_content)

      console.log(`⏳ Embedding batch ${Math.floor(i / 20) + 1}/${Math.ceil(chunks.length / 20)}...`)

      const embeddings = await batchEmbedTexts(texts)

      batch.forEach((chunk, idx) => {
        embeddedChunks.push({ ...chunk, embedding: embeddings[idx] })
      })
    }

    console.log(`✅ Successfully embedded all ${embeddedChunks.length} chunks`)
    return embeddedChunks
  } catch (error) {
    console.error('❌ Embedding failed:', error.message)
    return chunks.map((chunk) => ({ ...chunk, embedding: null }))
  }
}

/**
 * Stores embedded chunks in Supabase
 */
export async function storeChunks(supabase, specId, userId, embeddedChunks) {
  if (!embeddedChunks || embeddedChunks.length === 0) return

  try {
    console.log(`💾 Storing ${embeddedChunks.length} chunks to Supabase...`)

    const { error: deleteError } = await supabase.from('spec_chunks').delete().eq('spec_id', specId)
    if (deleteError) console.warn('⚠️ Failed to delete old chunks:', deleteError.message)

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
        console.error(`❌ Failed to insert batch ${Math.floor(i / 50) + 1}:`, insertError.message)
        return
      }
    }

    console.log(`✅ Successfully stored all ${embeddedChunks.length} chunks`)
  } catch (error) {
    console.error('❌ Chunk storage failed:', error.message)
  }
}

/**
 * Retrieves the most relevant spec chunks for a query using semantic search
 */
export async function retrieveRelevantChunks(supabase, query, specId, topK = 8) {
  try {
    console.log('🔍 Embedding query for semantic search...')
    const queryEmbedding = await embedText(query)

    const { data: matchedChunks, error } = await supabase.rpc('match_chunks', {
      query_embedding: queryEmbedding,
      match_spec_id: specId,
      match_count: topK,
    })

    if (error) {
      console.warn('⚠️ Chunk retrieval failed:', error.message)
      return []
    }

    if (!matchedChunks || matchedChunks.length === 0) return []

    console.log(`✅ Retrieved ${matchedChunks.length} relevant chunks`)
    return matchedChunks.map((chunk) => chunk.chunk_content)
  } catch (error) {
    console.error('❌ RAG retrieval failed:', error.message)
    return []
  }
}

// ============================================================================
// FORMATTING HELPERS
// ============================================================================

function formatInfoBlock(spec) {
  const info = spec.info || {}
  const servers = spec.servers || []
  return `API Overview: ${info.title || 'Untitled API'}
Version: ${info.version || 'Unknown'}
Description: ${info.description || 'No description provided'}
${servers.length > 0 ? `Base URLs:\n${servers.map((s) => `- ${s.url} (${s.description || 'Production'})`).join('\n')}` : ''}
${info.contact ? `Contact: ${info.contact.email || info.contact.name || 'N/A'}` : ''}
${info.license ? `License: ${info.license.name}` : ''}`.trim()
}

function formatEndpointBlock(path, method, operation, spec) {
  const params = operation.parameters || []
  const requestBody = operation.requestBody
  const responses = operation.responses || {}

  return `Endpoint: ${method} ${path}
${operation.summary ? `Summary: ${operation.summary}` : ''}
${operation.description ? `Description: ${operation.description}` : ''}
${operation.tags && operation.tags.length > 0 ? `Tags: ${operation.tags.join(', ')}` : ''}
Parameters:
${params.length > 0 ? params.map((p) => `- ${p.name} (${p.in}): ${p.required ? 'REQUIRED' : 'optional'} - ${p.description || 'No description'}`).join('\n') : '- None'}
Request Body:
${requestBody ? `- Content-Type: ${Object.keys(requestBody.content || {}).join(', ')}` : '- None'}
Responses:
${Object.entries(responses).slice(0, 5).map(([code, resp]) => `- ${code}: ${resp.description || 'No description'}`).join('\n')}
Authentication: ${operation.security && operation.security.length > 0 ? 'Required' : 'Not required'}`.trim()
}

function formatTagBlock(tag, endpoints) {
  return `Tag: ${tag.name}
${tag.description ? `Description: ${tag.description}` : ''}
Endpoints in this category (${endpoints.length} total):
${endpoints.slice(0, 10).map((ep) => `- ${ep.method} ${ep.path}${ep.summary ? `: ${ep.summary}` : ''}`).join('\n')}
${endpoints.length > 10 ? `... and ${endpoints.length - 10} more` : ''}`.trim()
}

function formatSchemaBlock(schemaName, schema) {
  const properties = schema.properties || {}
  const required = schema.required || []
  return `Schema: ${schemaName}
${schema.description ? `Description: ${schema.description}` : ''}
Type: ${schema.type || 'object'}
${Object.keys(properties).length > 0 ? `Fields:\n${Object.entries(properties).slice(0, 15).map(([key, prop]) => `- ${key} (${prop.type || 'any'})${required.includes(key) ? ' [REQUIRED]' : ''}: ${prop.description || ''}`).join('\n')}` : ''}`.trim()
}
