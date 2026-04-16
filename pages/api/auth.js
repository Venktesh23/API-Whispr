import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { action, email, password } = req.body

  // Validate required fields
  if (!action) {
    return res.status(400).json({ error: 'Action is required' })
  }

  if (!email) {
    return res.status(400).json({ error: 'Email is required' })
  }

  if (!password) {
    return res.status(400).json({ error: 'Password is required' })
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' })
  }

  // Validate password length
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' })
  }

  try {
    if (action === 'signin') {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) {
        return res.status(401).json({ error: 'Invalid email or password' })
      }

      return res.status(200).json({ user: data.user })
    } else if (action === 'signup') {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })
      
      if (error) {
        return res.status(400).json({ error: 'Unable to create account. Email may already exist.' })
      }

      return res.status(200).json({ user: data.user })
    } else {
      return res.status(400).json({ error: 'Invalid action' })
    }
  } catch (error) {
    console.error('Auth error:', error)
    return res.status(500).json({ error: 'Authentication failed' })
  }
} 