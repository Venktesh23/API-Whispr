import { createClient } from '@supabase/supabase-js'

// Initialize Supabase admin client for logging
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
)

// =====================================================
// INPUT VALIDATION SCHEMAS
// =====================================================

export const validators = {
  question: (q) => {
    if (!q || typeof q !== 'string') return 'Question must be a string'
    if (q.trim().length === 0) return 'Question cannot be empty'
    if (q.length > 2000) return 'Question exceeds 2000 character limit'
    // Check for injection attempts
    if (/<script|javascript:|onerror|onclick/gi.test(q)) {
      return 'Question contains invalid characters'
    }
    return null
  },

  specContent: (content) => {
    if (!content || typeof content !== 'string') return 'Content must be a string'
    if (content.length === 0) return 'Content cannot be empty'
    if (content.length > 10 * 1024 * 1024) return 'Content exceeds 10MB limit'
    return null
  },

  userId: (id) => {
    if (!id || typeof id !== 'string') return 'User ID is required'
    // UUID v4 pattern
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4?[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      return 'Invalid user ID format'
    }
    return null
  },

  specId: (id) => {
    if (!id || typeof id !== 'string') return 'Spec ID is required'
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{3}-[0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
      ? null
      : 'Invalid spec ID format'
  },

  filename: (name) => {
    if (!name || typeof name !== 'string') return 'Filename is required'
    if (name.length > 255) return 'Filename too long'
    if (/<|>|:|"|\/|\\|\?|\*|`/g.test(name)) return 'Filename contains invalid characters'
    return null
  },

  contentType: (type) => {
    const valid = ['json', 'yaml', 'pdf', 'docx', 'text']
    if (!valid.includes(type)) return `Content type must be one of: ${valid.join(', ')}`
    return null
  },
}

// Validate multiple fields at once
export function validateRequest(data, schema) {
  const errors = {}

  for (const [field, validator] of Object.entries(schema)) {
    if (validator) {
      const error = validator(data[field])
      if (error) errors[field] = error
    }
  }

  return Object.keys(errors).length > 0 ? errors : null
}

// =====================================================
// ERROR LOGGING TO SUPABASE
// =====================================================

export async function logError(context) {
  const {
    errorType = 'UNKNOWN',
    message,
    code = 500,
    endpoint,
    userId,
    details = {},
    severity = 'error', // 'error', 'warning', 'info'
  } = context

  try {
    const logEntry = {
      error_type: errorType,
      message: message || 'No message provided',
      http_status: code,
      endpoint,
      user_id: userId,
      severity,
      details: JSON.stringify(details),
      created_at: new Date().toISOString(),
    }

    // Store in Supabase error_logs table
    const { error } = await supabase
      .from('error_logs')
      .insert([logEntry])
      .select()

    if (error) {
      console.error('Failed to log error to Supabase:', error)
    }

    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error(`[${severity.toUpperCase()}] ${errorType}:`, {
        message,
        endpoint,
        details,
      })
    }
  } catch (err) {
    console.error('Error logging failed:', err)
  }
}

// =====================================================
// RATE LIMITING (In-Memory)
// =====================================================

const rateLimitStore = new Map()

export function checkRateLimit(userId, endpoint, limit = 60, windowMs = 60000) {
  const key = `${userId}:${endpoint}`
  const now = Date.now()

  if (!rateLimitStore.has(key)) {
    rateLimitStore.set(key, { count: 0, resetAt: now + windowMs })
  }

  const record = rateLimitStore.get(key)

  if (now > record.resetAt) {
    record.count = 0
    record.resetAt = now + windowMs
  }

  record.count++

  if (record.count > limit) {
    return {
      allowed: false,
      retryAfter: Math.ceil((record.resetAt - now) / 1000),
    }
  }

  return {
    allowed: true,
    remaining: limit - record.count,
  }
}

// =====================================================
// COST TRACKING FOR AI API CALLS
// =====================================================

export async function trackApiUsage(context) {
  const {
    userId,
    model = 'gemini-2.0-flash',
    endpoint,
    inputTokens = 0,
    outputTokens = 0,
  } = context

  try {
    const estimatedCost = calculateEstimatedCost(model, inputTokens, outputTokens)

    await supabase.from('api_usage_logs').insert([
      {
        user_id: userId,
        model,
        endpoint,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        estimated_cost: estimatedCost,
        created_at: new Date().toISOString(),
      },
    ])

    return estimatedCost
  } catch (err) {
    console.warn('Failed to track API usage:', err)
    return 0
  }
}

function calculateEstimatedCost(model, inputTokens, outputTokens) {
  // Gemini pricing (as of 2024)
  const pricing = {
    'gemini-2.0-flash': {
      input: 0.000075 / 1000, // $0.075 per million input tokens
      output: 0.0003 / 1000, // $0.3 per million output tokens
    },
    'gemini-1.5-pro': {
      input: 0.0015 / 1000,
      output: 0.006 / 1000,
    },
  }

  const rates = pricing[model] || pricing['gemini-2.0-flash']
  return (inputTokens * rates.input) + (outputTokens * rates.output)
}

// =====================================================
// SIMPLE CACHE
// =====================================================

const memoryCache = new Map()

export function setCache(key, value, ttlMs = 3600000) {
  const expiry = Date.now() + ttlMs
  memoryCache.set(key, { value, expiry })
}

export function getCache(key) {
  const cached = memoryCache.get(key)
  if (!cached) return null

  if (Date.now() > cached.expiry) {
    memoryCache.delete(key)
    return null
  }

  return cached.value
}

export function clearCache(key) {
  memoryCache.delete(key)
}

// =====================================================
// STANDARDIZED API RESPONSES
// =====================================================

export function successResponse(res, data, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    data,
    timestamp: new Date().toISOString(),
  })
}

export function errorResponse(res, message, statusCode = 500, details = {}) {
  return res.status(statusCode).json({
    success: false,
    error: message,
    details,
    timestamp: new Date().toISOString(),
  })
}

// =====================================================
// MIDDLEWARE FOR ROUTE HANDLERS
// =====================================================

export function withValidation(handler, validationSchema) {
  return async (req, res) => {
    const validationErrors = validateRequest(req.body, validationSchema)

    if (validationErrors) {
      return errorResponse(res, 'Validation failed', 400, validationErrors)
    }

    return handler(req, res)
  }
}

export function withRateLimit(handler, limit = 60, windowMs = 60000) {
  return async (req, res) => {
    const userId = req.body?.userId || req.query?.userId || 'anonymous'
    const endpoint = req.url

    const rateLimitCheck = checkRateLimit(userId, endpoint, limit, windowMs)

    if (!rateLimitCheck.allowed) {
      res.setHeader('Retry-After', rateLimitCheck.retryAfter)
      return errorResponse(res, 'Rate limit exceeded', 429, {
        retryAfter: rateLimitCheck.retryAfter,
      })
    }

    res.setHeader('X-RateLimit-Remaining', rateLimitCheck.remaining)
    return handler(req, res)
  }
}

export function withErrorHandler(handler) {
  return async (req, res) => {
    try {
      return await handler(req, res)
    } catch (err) {
      const statusCode = err.statusCode || 500
      const userId = req.body?.userId || req.query?.userId

      await logError({
        errorType: 'UNHANDLED_EXCEPTION',
        message: err.message,
        code: statusCode,
        endpoint: req.url,
        userId,
        details: { stack: err.stack },
        severity: statusCode >= 500 ? 'error' : 'warning',
      })

      return errorResponse(res, err.message || 'Internal server error', statusCode)
    }
  }
}

// Compose multiple middlewares
export function withMiddleware(handler, middlewares) {
  return middlewares.reduce((fn, middleware) => middleware(fn), handler)
}
