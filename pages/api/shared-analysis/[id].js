import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { id } = req.query

    if (!id) {
      return res.status(400).json({ error: 'Share ID is required' })
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_SERVICE_KEY)) {
      return res.status(500).json({ error: 'Supabase configuration missing' })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
    )

    // Fetch shared analysis
    const { data, error } = await supabase
      .from('shared_analyses')
      .select('id, analysis_data, current_spec, expires_at, created_at')
      .eq('id', id)
      .single()

    if (error || !data) {
      console.error('Database fetch error:', error)
      return res.status(404).json({ error: 'Share not found' })
    }

    // Check if expired
    if (data.expires_at) {
      const expiryDate = new Date(data.expires_at)
      if (expiryDate < new Date()) {
        return res.status(404).json({ error: 'Share link has expired', expired: true })
      }
    }

    res.status(200).json({
      id: data.id,
      analysis_data: data.analysis_data,
      current_spec: data.current_spec,
      created_at: data.created_at,
      expires_at: data.expires_at,
    })
  } catch (error) {
    console.error('💥 Shared analysis fetch error:', error)
    return res.status(500).json({
      error: 'Failed to fetch shared analysis'
    })
  }
}
