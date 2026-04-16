/**
 * Redis caching utility for embeddings
 * Caches embedding vectors to reduce API calls to OpenAI
 * 
 * IMPORTANT: This is a local in-memory fallback implementation
 * In production, must be replaced with actual Redis connection
 */

// Local in-memory cache (fallback)
const embeddingCache = new Map()
const CACHE_TTL_MS = 86400000 // 24 hours

/**
 * Get cached embedding
 * @param {string} key - Cache key (usually hash of input text)
 * @returns {Object|null} - Cached embedding or null
 */
export function getCachedEmbedding(key) {
  if (!embeddingCache.has(key)) {
    return null
  }

  const cached = embeddingCache.get(key)
  
  // Check if expired
  if (Date.now() - cached.createdAt > CACHE_TTL_MS) {
    embeddingCache.delete(key)
    return null
  }

  return cached.embedding
}

/**
 * Cache an embedding
 * @param {string} key - Cache key
 * @param {Array} embedding - The embedding vector
 */
export function cacheEmbedding(key, embedding) {
  embeddingCache.set(key, {
    embedding,
    createdAt: Date.now(),
  })
}

/**
 * Delete cached embedding
 */
export function deleteEmbedding(key) {
  embeddingCache.delete(key)
}

/**
 * Clear all embeddings (careful with this!)
 */
export function clearEmbeddingCache() {
  embeddingCache.clear()
}

/**
 * Get cache statistics
 */
export function getEmbeddingCacheStats() {
  const now = Date.now()
  let expiredCount = 0
  let activeCount = 0

  for (const [key, cached] of embeddingCache.entries()) {
    if (now - cached.createdAt > CACHE_TTL_MS) {
      expiredCount++
    } else {
      activeCount++
    }
  }

  return {
    totalCached: embeddingCache.size,
    activeCached: activeCount,
    expiredCached: expiredCount,
    cacheSize: new Map([...embeddingCache.entries()].map(([k, v]) => 
      [k, JSON.stringify(v).length]
    )).values().reduce((a, b) => a + b, 0),
  }
}

/**
 * Generate cache key from text
 * Uses simple hash for consistent keys
 */
export function generateCacheKey(text) {
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return `embedding:${Math.abs(hash).toString(36)}`
}

/**
 * Cached embedding retrieval wrapper
 * Automatically handles caching
 */
export async function getCachedOrGenerateEmbedding(text, generatorFn) {
  const key = generateCacheKey(text)
  
  // Check cache first
  const cached = getCachedEmbedding(key)
  if (cached) {
    console.log(`📦 Cache hit for embedding: ${key}`)
    return cached
  }

  // Generate if not cached
  console.log(`🔗 Cache miss, generating embedding for: ${key}`)
  const embedding = await generatorFn(text)
  
  // Cache the result
  cacheEmbedding(key, embedding)
  
  return embedding
}

/**
 * Batch cache check for multiple texts
 * Returns cache hits and misses
 */
export function checkBatchEmbeddingCache(texts) {
  const hits = []
  const misses = []

  texts.forEach(text => {
    const key = generateCacheKey(text)
    if (getCachedEmbedding(key)) {
      hits.push(key)
    } else {
      misses.push(key)
    }
  })

  return {
    hits,
    misses,
    hitRate: texts.length > 0 ? ((hits.length / texts.length) * 100).toFixed(2) : 0,
  }
}

/**
 * Initialize Redis connection (for production)
 * This is a placeholder - implement with actual Redis client
 */
export async function initializeRedisCache() {
  // TODO: Implement actual Redis connection
  // const redis = require('redis').createClient({
  //   host: process.env.REDIS_HOST,
  //   port: process.env.REDIS_PORT,
  //   password: process.env.REDIS_PASSWORD,
  // })
  // await redis.connect()
  // return redis

  console.warn('⚠️ Using in-memory embedding cache. For production, connect to Redis!')
  return null
}
