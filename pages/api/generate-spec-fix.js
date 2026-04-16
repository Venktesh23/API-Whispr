import { callGemini } from '../../lib/gemini'

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

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY not configured' })
    }

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

    const userPrompt = `${specificPrompt}

OpenAPI Specification (${specType}):
${specContent.substring(0, 6000)}

Filename: ${filename}
Issue: ${warning}`

    const result = await callGemini(SPEC_FIX_SYSTEM_PROMPT, userPrompt, {
      temperature: 0.3,
      maxOutputTokens: 1500,
    })

    let parsedResult
    try {
      const cleaned = result.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim()
      parsedResult = JSON.parse(cleaned)
    } catch {
      parsedResult = {
        patch: `# Auto-generated fix for: ${warning}\n# Please review and modify as needed\n\n# Example fix:\ninfo:\n  title: "${filename}"\n  description: "API specification for ${filename}"\n  version: "1.0.0"`,
        explanation: `This is a basic fix for the issue: ${warning}. Please review the patch and modify it according to your specific requirements.`,
        affectedPaths: [],
      }
    }

    res.status(200).json(parsedResult)
  } catch (error) {
    console.error('💥 Spec fix generation error:', error)
    return res.status(500).json({ error: 'Failed to generate spec fix' })
  }
}
