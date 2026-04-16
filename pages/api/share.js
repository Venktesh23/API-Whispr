import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { analysisData, specId, currentSpec, expiresIn } = req.body
    const authHeader = req.headers.authorization

    if (!authHeader) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    if (!analysisData || !specId) {
      return res.status(400).json({ error: 'Missing required fields: analysisData and specId' })
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_SERVICE_KEY)) {
      return res.status(500).json({ error: 'Supabase configuration missing' })
    }

    // Verify token and get user
    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser(token)

    if (userError || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }

    // Calculate expiry date (default: 30 days)
    const expiryDays = expiresIn || 30
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + expiryDays)

    // Insert into shared_analyses table
    const { data: sharedAnalysis, error: insertError } = await supabase
      .from('shared_analyses')
      .insert([
        {
          user_id: user.id,
          spec_id: specId,
          analysis_data: analysisData,
          current_spec: currentSpec,
          expires_at: expiresAt.toISOString(),
          created_at: new Date().toISOString(),
        },
      ])
      .select('id')

    if (insertError) {
      console.error('Database insert error:', insertError)
      return res.status(500).json({ error: 'Failed to save shared analysis' })
    }

    if (!sharedAnalysis || sharedAnalysis.length === 0) {
      return res.status(500).json({ error: 'Failed to create share link' })
    }

    const shareId = sharedAnalysis[0].id
    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000'}/share/${shareId}`

    console.log(`✅ Share link created: ${shareUrl}`)

    res.status(200).json({
      success: true,
      shareId,
      shareUrl,
      expiresAt: expiresAt.toISOString(),
    })
  } catch (error) {
    console.error('💥 Share endpoint error:', error)
    return res.status(500).json({
      error: 'Failed to create share link'
    })
  }
}
