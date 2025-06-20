const SPEC_FIX_SYSTEM_PROMPT = `You are an OpenAPI specification expert. Your job is to analyze spec quality issues and generate precise YAML patches to fix them.

For each issue, provide:
1. A valid OpenAPI 3.0-compliant YAML patch
2. A clear explanation of what the fix does
3. List of affected paths/endpoints

Return exactly this JSON format:
{
  "patch": "# YAML patch content here\\nparameter:\\n  example: value",
  "explanation": "This patch adds missing tags to endpoints for better organization...",
  "affectedPaths": ["/auth/login", "/user/profile"]
}

IMPORTANT RULES:
- Only generate valid OpenAPI 3.0 syntax
- Focus on minimal, targeted fixes
- Preserve existing functionality
- Use meaningful, descriptive values
- Follow OpenAPI best practices`

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { warning, specContent, specType, filename } = req.body

    if (!warning || !specContent) {
      return res.status(400).json({ error: 'Warning and spec content are required' })
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OpenAI API key not configured' })
    }

    console.log('🔧 Generating spec fix for:', warning)

    // Create specific prompt based on the warning type
    let specificPrompt = ''
    
    if (warning.includes('missing tags')) {
      specificPrompt = `Fix missing tags: Analyze the endpoints in this OpenAPI spec and add appropriate, meaningful tags for categorization. Use tags like "Authentication", "Users", "Orders", "Payments", etc. based on the endpoint functionality.`
    } else if (warning.includes('missing summary') || warning.includes('missing description')) {
      specificPrompt = `Fix missing summaries/descriptions: Add concise, professional summaries and descriptions to endpoints that are missing them. Make them helpful for developers.`
    } else if (warning.includes('No servers defined')) {
      specificPrompt = `Fix missing servers: Add a proper servers section with a realistic base URL. Use https://api.example.com as the base URL if no specific domain is apparent.`
    } else {
      specificPrompt = `Fix the following OpenAPI specification issue: ${warning}. Provide a targeted solution that follows OpenAPI 3.0 best practices.`
    }

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
            content: SPEC_FIX_SYSTEM_PROMPT
          },
          {
            role: 'user',
            content: `${specificPrompt}

OpenAPI Specification (${specType}):
${specContent.substring(0, 6000)}

Filename: ${filename}
Issue: ${warning}`
          }
        ],
        temperature: 0.3,
        max_tokens: 1500
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
      parsedResult = {
        patch: `# Auto-generated fix for: ${warning}\n# Please review and modify as needed\n\n# Example fix:\ninfo:\n  title: "${filename}"\n  description: "API specification for ${filename}"\n  version: "1.0.0"`,
        explanation: `This is a basic fix for the issue: ${warning}. Please review the patch and modify it according to your specific requirements.`,
        affectedPaths: []
      }
    }

    console.log('✅ Spec fix generated successfully')
    res.status(200).json(parsedResult)

  } catch (error) {
    console.error('💥 Spec fix generation error:', error.message)
    
    res.status(500).json({ 
      error: 'Failed to generate spec fix',
      message: error.message
    })
  }
} 