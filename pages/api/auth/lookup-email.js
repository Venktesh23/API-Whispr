import { createClient } from '@supabase/supabase-js'

/**
 * Returns whether an email is already registered in Supabase Auth.
 * Used after a failed password sign-in to show "wrong password" vs "email not registered".
 * Requires SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_KEY) on the server.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { email } = req.body || {}
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email is required' })
  }

  const trimmed = email.trim()
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(trimmed)) {
    return res.status(400).json({ error: 'Invalid email format' })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
  if (!url || !serviceKey) {
    return res.status(503).json({ error: 'Email lookup is not configured' })
  }

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const normalized = trimmed.toLowerCase()

  try {
    let page = 1
    const perPage = 1000
    const maxPages = 100

    while (page <= maxPages) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage })
      if (error) {
        console.error('lookup-email listUsers:', error)
        return res.status(500).json({ error: 'Lookup failed' })
      }

      const registered = data.users.some(
        (u) => (u.email || '').toLowerCase() === normalized
      )
      if (registered) {
        return res.status(200).json({ registered: true })
      }

      if (data.nextPage == null) {
        break
      }
      page = data.nextPage
    }

    return res.status(200).json({ registered: false })
  } catch (err) {
    console.error('lookup-email:', err)
    return res.status(500).json({ error: 'Lookup failed' })
  }
}
