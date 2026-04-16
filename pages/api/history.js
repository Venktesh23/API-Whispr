import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
)

export default async function handler(req, res) {
  const { method } = req

  // Note: In a production app, you should verify the user's identity via JWT token
  // from the Authorization header. For now, we rely on RLS policies at the database level.
  // TODO: Implement proper JWT verification for user authentication

  try {
    if (method === 'GET') {
      const { userId, specId } = req.query

      if (!userId) {
        return res.status(400).json({ error: 'userId is required' })
      }
      
      let query = supabase
        .from('chat_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (specId) {
        query = query.eq('spec_id', specId)
      }

      const { data, error } = await query

      if (error) {
        console.error('History GET error:', error)
        return res.status(500).json({ error: 'Failed to fetch history' })
      }

      return res.status(200).json(data || [])
    } else if (method === 'POST') {
      const { userId, specId, question, response } = req.body

      if (!userId) {
        return res.status(400).json({ error: 'userId is required' })
      }

      if (!question) {
        return res.status(400).json({ error: 'question is required' })
      }

      if (!response) {
        return res.status(400).json({ error: 'response is required' })
      }

      const { data, error } = await supabase
        .from('chat_history')
        .insert({
          user_id: userId,
          spec_id: specId,
          question,
          response
        })
        .select()

      if (error) {
        console.error('History POST error:', error)
        return res.status(500).json({ error: 'Failed to save history' })
      }

      return res.status(201).json(data[0])
    } else if (method === 'DELETE') {
      const { chatId, userId } = req.body

      if (!chatId) {
        return res.status(400).json({ error: 'chatId is required' })
      }

      if (!userId) {
        return res.status(400).json({ error: 'userId is required' })
      }

      const { error } = await supabase
        .from('chat_history')
        .delete()
        .eq('id', chatId)
        .eq('user_id', userId)

      if (error) {
        console.error('History DELETE error:', error)
        return res.status(500).json({ error: 'Failed to delete history' })
      }

      return res.status(200).json({ success: true })
    } else {
      return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('History API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
} 