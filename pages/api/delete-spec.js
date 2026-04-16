import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json')

  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { specId, userId } = req.body

  if (!specId || !userId) {
    return res.status(400).json({ error: 'Spec ID and User ID required' })
  }

  try {
    const { error } = await supabase
      .from('api_specs')
      .delete()
      .eq('id', specId)
      .eq('user_id', userId)

    if (error) {
      console.error('Supabase delete error:', error.message)
      return res.status(500).json({ error: 'Failed to delete specification' })
    }

    return res.json({ success: true })
  } catch (error) {
    console.error('Delete API error:', error.message)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
