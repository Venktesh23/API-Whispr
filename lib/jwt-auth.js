import { createClient } from '@supabase/supabase-js'

/**
 * Verify JWT token and extract user information
 * Provides explicit JWT verification for API routes
 * @param {string} authHeader - Authorization header value
 * @returns {Object} - { user, error }
 */
export async function verifyJWT(authHeader) {
  if (!authHeader) {
    return { user: null, error: 'Missing authorization header' }
  }

  // Extract token from "Bearer <token>"
  const parts = authHeader.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return { user: null, error: 'Invalid authorization header format' }
  }

  const token = parts[1]

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Verify the token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      return { user: null, error: 'Invalid or expired token' }
    }

    return { user, error: null }
  } catch (err) {
    console.error('JWT verification error:', err)
    return { user: null, error: 'Token verification failed' }
  }
}

/**
 * Middleware function to verify JWT in API routes
 * Usage: const { user, error, status } = await requireAuth(req)
 */
export async function requireAuth(req) {
  const authHeader = req.headers.authorization

  if (!authHeader) {
    return {
      user: null,
      error: 'Unauthorized',
      status: 401,
    }
  }

  const { user, error } = await verifyJWT(authHeader)

  if (error || !user) {
    return {
      user: null,
      error: 'Unauthorized',
      status: 401,
    }
  }

  return {
    user,
    error: null,
    status: 200,
  }
}
