/**
 * Simple in-memory rate limiting
 * In production with Redis, this would be replaced with a Redis-backed solution
 * For now, this uses in-memory storage with cleanup
 */

const rateLimitStore = new Map()

// Cleanup interval (remove old entries every 10 minutes)
setInterval(() => {
  const now = Date.now()
  for (const [key, data] of rateLimitStore.entries()) {
    if (now - data.firstRequest > 3600000) { // 1 hour window
      rateLimitStore.delete(key)
    }
  }
}, 600000) // 10 minutes

/**
 * Rate limit check
 * @param {string} identifier - Unique identifier (e.g., user ID or IP)
 * @param {number} maxRequests - Max requests allowed in window
 * @param {number} windowMs - Time window in milliseconds (default 60000 = 1 minute)
 * @returns {Object} - { allowed: boolean, remaining: number, resetAfter: number }
 */
export function checkRateLimit(identifier, maxRequests, windowMs = 60000) {
  const now = Date.now()
  const key = `ratelimit:${identifier}`

  if (!rateLimitStore.has(key)) {
    rateLimitStore.set(key, {
      count: 1,
      firstRequest: now,
      resetAt: now + windowMs,
    })
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetAfter: windowMs,
    }
  }

  const data = rateLimitStore.get(key)

  // Reset if window has passed
  if (now > data.resetAt) {
    rateLimitStore.set(key, {
      count: 1,
      firstRequest: now,
      resetAt: now + windowMs,
    })
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetAfter: windowMs,
    }
  }

  // Check if limit exceeded
  if (data.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAfter: data.resetAt - now,
    }
  }

  // Increment count
  data.count++
  return {
    allowed: true,
    remaining: maxRequests - data.count,
    resetAfter: data.resetAt - now,
  }
}

/**
 * Rate limiting middleware for API routes
 * Usage in API route:
 * const rateLimitResult = rateLimitMiddleware(userId, 'ask-endpoint')
 * if (!rateLimitResult.allowed) {
 *   return res.status(429).json({ error: 'Too many requests' })
 * }
 */
export function rateLimitMiddleware(identifier, endpoint) {
  // Define limits per endpoint
  const limits = {
    'ask-endpoint': { max: 30, window: 3600000 }, // 30 requests per hour
    'upload-endpoint': { max: 10, window: 3600000 }, // 10 uploads per hour
    'generate-tests': { max: 20, window: 3600000 }, // 20 test generations per hour
    'compare-specs': { max: 20, window: 3600000 }, // 20 comparisons per hour
    'calculate-score': { max: 50, window: 3600000 }, // 50 health scores per hour
    'default': { max: 100, window: 60000 }, // 100 requests per minute
  }

  const limit = limits[endpoint] || limits['default']
  return checkRateLimit(identifier, limit.max, limit.window)
}

/**
 * Get rate limit status for monitoring
 */
export function getRateLimitStats() {
  return {
    activeKeys: rateLimitStore.size,
    entries: Array.from(rateLimitStore.entries()).map(([key, data]) => ({
      key,
      count: data.count,
      resetAt: new Date(data.resetAt).toISOString(),
    })),
  }
}
