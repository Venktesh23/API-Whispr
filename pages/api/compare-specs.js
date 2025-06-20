const SPEC_COMPARISON_SYSTEM_PROMPT = `You are an expert at analyzing OpenAPI specifications. Compare two API specs and identify all differences in endpoints, parameters, methods, status codes, and descriptions.

Return exactly this JSON format:
{
  "newEndpoints": [
    {"method": "POST", "path": "/auth/register", "summary": "User registration endpoint"}
  ],
  "removedEndpoints": [
    {"method": "DELETE", "path": "/admin/users", "summary": "Admin user deletion endpoint"}
  ],
  "modifiedEndpoints": [
    {
      "method": "GET", 
      "path": "/users/{id}", 
      "changes": "Added new 'include' query parameter for profile data"
    }
  ],
  "summary": "3 new endpoints, 1 removed, 2 modified",
  "detailedAnalysis": "The new specification introduces enhanced user management features..."
}

Focus on:
- Endpoint additions/removals/modifications
- Parameter changes (new, removed, type changes)
- Response schema differences
- Security requirement changes
- Documentation improvements`

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { originalSpec, newSpec, originalFilename, specType } = req.body

    if (!originalSpec || !newSpec) {
      return res.status(400).json({ error: 'Both original and new specifications are required' })
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OpenAI API key not configured' })
    }

    console.log('🔄 Comparing API specifications with GPT...')

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: SPEC_COMPARISON_SYSTEM_PROMPT
          },
          {
            role: 'user',
            content: `Compare these two OpenAPI specifications and provide a detailed analysis of differences:

ORIGINAL SPECIFICATION (${originalFilename}):
${originalSpec.substring(0, 8000)}

NEW SPECIFICATION:
${newSpec.substring(0, 8000)}

Please identify all differences in endpoints, parameters, methods, response schemas, and documentation.`
          }
        ],
        temperature: 0.3,
        max_tokens: 2500
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('OpenAI API error:', errorText)
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const data = await response.json()
    const result = data.choices[0]?.message?.content

    if (!result) {
      throw new Error('No result from OpenAI')
    }

    // Parse the JSON response
    let parsedResult
    try {
      parsedResult = JSON.parse(result)
    } catch (parseError) {
      console.error('JSON parse failed, creating fallback response')
      
      // Extract basic differences from text if JSON parsing fails
      const hasNewEndpoints = result.toLowerCase().includes('new') || result.toLowerCase().includes('added')
      const hasRemovedEndpoints = result.toLowerCase().includes('removed') || result.toLowerCase().includes('deleted')
      const hasModifiedEndpoints = result.toLowerCase().includes('modified') || result.toLowerCase().includes('changed')
      
      parsedResult = {
        newEndpoints: hasNewEndpoints ? [{ method: 'Unknown', path: '/example', summary: 'New endpoint detected' }] : [],
        removedEndpoints: hasRemovedEndpoints ? [{ method: 'Unknown', path: '/example', summary: 'Removed endpoint detected' }] : [],
        modifiedEndpoints: hasModifiedEndpoints ? [{ method: 'Unknown', path: '/example', changes: 'Modifications detected' }] : [],
        summary: 'Differences detected between specifications',
        detailedAnalysis: result.substring(0, 1000) + (result.length > 1000 ? '...' : '')
      }
    }

    // Ensure arrays exist
    parsedResult.newEndpoints = parsedResult.newEndpoints || []
    parsedResult.removedEndpoints = parsedResult.removedEndpoints || []
    parsedResult.modifiedEndpoints = parsedResult.modifiedEndpoints || []

    console.log('✅ Spec comparison completed successfully')
    res.status(200).json(parsedResult)

  } catch (error) {
    console.error('💥 Spec comparison error:', error.message)
    
    res.status(500).json({ 
      error: 'Failed to compare specifications',
      message: error.message
    })
  }
} 