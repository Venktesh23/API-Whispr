import { createClient } from '@supabase/supabase-js'
import { chunkSpec, embedChunks, storeChunks } from '../../lib/embeddings'
import { logError, trackApiUsage } from '../../lib/api-utils'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

/**
 * Background job endpoint to process embeddings for a spec
 * Called asynchronously after spec upload
 * 
 * POST /api/background-jobs/process-embeddings
 * Body: { specId, userId, parsedSpec }
 */
export default async function handler(req, res) {
  // Only accept POST from internal services
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { specId, userId, parsedSpec } = req.body

  // Validate required fields
  if (!specId || !userId || !parsedSpec) {
    return res.status(400).json({
      error: 'Missing required fields: specId, userId, parsedSpec',
    })
  }

  try {
    // Update status to "processing"
    await supabase
      .from('api_specs')
      .update({ embedding_status: 'processing' })
      .eq('id', specId)
      .eq('user_id', userId)

    // 1. Chunk the spec into semantic pieces
    const chunks = await chunkSpec(parsedSpec)

    if (chunks.length === 0) {
      await supabase
        .from('api_specs')
        .update({ embedding_status: 'completed' })
        .eq('id', specId)

      return res.status(200).json({
        success: true,
        message: 'No chunks to embed',
        chunksProcessed: 0,
      })
    }

    // 2. Generate embeddings for chunks (with cost tracking)
    const embeddedChunks = await embedChunks(chunks)

    // Track API usage
    await trackApiUsage({
      userId,
      model: 'text-embedding-004',
      endpoint: '/api/background-jobs/process-embeddings',
      inputTokens: chunks.reduce((sum, c) => sum + (c.chunk_content?.split(' ').length || 0), 0),
      outputTokens: 0,
    })

    // 3. Store chunks in Supabase with embeddings
    await storeChunks(supabase, specId, userId, embeddedChunks)

    // 4. Update spec status to "completed"
    await supabase
      .from('api_specs')
      .update({
        embedding_status: 'completed',
        chunks_count: embeddedChunks.length,
        last_embedded_at: new Date().toISOString(),
      })
      .eq('id', specId)
      .eq('user_id', userId)

    console.log(`✅ Embeddings processed for spec ${specId}: ${embeddedChunks.length} chunks`)

    return res.status(200).json({
      success: true,
      message: 'Embeddings processed successfully',
      chunksProcessed: embeddedChunks.length,
      specId,
    })
  } catch (error) {
    console.error('Error processing embeddings:', error)

    // Log error
    await logError({
      errorType: 'EMBEDDING_PROCESSING_ERROR',
      message: error.message,
      code: 500,
      endpoint: '/api/background-jobs/process-embeddings',
      userId,
      details: { specId, error: error.toString() },
      severity: 'error',
    })

    // Update spec status to "failed"
    await supabase
      .from('api_specs')
      .update({
        embedding_status: 'failed',
        embedding_error: error.message,
      })
      .eq('id', specId)
      .eq('user_id', userId)

    return res.status(500).json({
      success: false,
      error: 'Failed to process embeddings',
      details: error.message,
    })
  }
}
