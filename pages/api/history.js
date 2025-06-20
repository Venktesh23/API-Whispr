import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  const { method } = req

  try {
    if (method === 'GET') {
      const { userId, specId } = req.query
      
      let query = supabase
        .from('chat_history')
        .select('*')
        .order('created_at', { ascending: false })

      if (userId) {
        query = query.eq('user_id', userId)
      }
      
      if (specId) {
        query = query.eq('spec_id', specId)
      }

      const { data, error } = await query

      if (error) throw error
      res.status(200).json(data)
    } else if (method === 'POST') {
      const { userId, specId, question, response } = req.body

      const { data, error } = await supabase
        .from('chat_history')
        .insert({
          user_id: userId,
          spec_id: specId,
          question,
          response
        })
        .select()

      if (error) throw error
      res.status(201).json(data[0])
    } else if (method === 'DELETE') {
      const { chatId, userId } = req.body

      const { error } = await supabase
        .from('chat_history')
        .delete()
        .eq('id', chatId)
        .eq('user_id', userId)

      if (error) throw error
      res.status(200).json({ success: true })
    } else {
      res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('History API error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
} 