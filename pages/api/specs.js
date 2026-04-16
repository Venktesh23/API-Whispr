import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json')

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { userId } = req.query

  if (!userId) {
    return res.status(400).json({ error: 'User ID required' })
  }

  try {
    const { data, error } = await supabase
      .from('api_specs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Supabase error:', error.message)
      return res.status(500).json({ error: 'Failed to fetch specifications' })
    }

    return res.json({ specs: data || [] })
  } catch (error) {
    console.error('API error:', error.message)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
