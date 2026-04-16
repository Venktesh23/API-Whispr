import { callGemini } from '../../lib/gemini'

const CHANGELOG_SYSTEM_PROMPT = `You are an expert API documentation writer and changelog curator. Your task is to generate a professional, well-structured CHANGELOG.md file from API specification comparison data.

Generate changelogs in the style of Stripe, AWS, or Semantic Versioning specs:
- Use clear sections: Breaking Changes, New Features, Improvements, Deprecations, Bug Fixes, etc.
- Be specific and technical but also user-friendly
- Include version numbers and dates
- Use bullet points for clarity
- Highlight impact for API consumers
- For breaking changes, include migration guidance
- Keep entries concise but informative

Return ONLY the markdown content of the CHANGELOG, starting with "# Changelog" and formatted ready to save as CHANGELOG.md`

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const {
      originalFilename = 'Previous API',
      newFilename = 'Current API',
      newEndpoints = [],
      removedEndpoints = [],
      modifiedEndpoints = [],
      version = '1.0.0',
      date = new Date().toISOString().split('T')[0],
    } = req.body

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY not configured' })
    }

    const changesSummary = `
API Comparison Report:
Version: ${version}
Date: ${date}

NEW ENDPOINTS (${newEndpoints.length}):
${newEndpoints.map((ep) => `- ${ep.method} ${ep.path}: ${ep.summary || 'No description'}`).join('\n')}

REMOVED ENDPOINTS (${removedEndpoints.length}):
${removedEndpoints.map((ep) => `- ${ep.method} ${ep.path}: ${ep.summary || 'No description'}`).join('\n')}

MODIFIED ENDPOINTS (${modifiedEndpoints.length}):
${modifiedEndpoints.map((ep) => `- ${ep.method} ${ep.path}: ${ep.changes || 'Parameter or response changes'}`).join('\n')}
    `.trim()

    const userPrompt = `Generate a professional changelog for version ${version} (${date}) based on this API comparison:\n\n${changesSummary}\n\nFormat the changelog in markdown with appropriate sections. Include migration guidance for breaking changes.`

    const changelog = await callGemini(CHANGELOG_SYSTEM_PROMPT, userPrompt, {
      temperature: 0.7,
      maxOutputTokens: 2000,
    })

    res.status(200).json({
      success: true,
      changelog,
      version,
      date,
      changeStats: {
        newEndpoints: newEndpoints.length,
        removedEndpoints: removedEndpoints.length,
        modifiedEndpoints: modifiedEndpoints.length,
      },
    })
  } catch (error) {
    console.error('Changelog generation error:', error)
    res.status(500).json({ error: error.message || 'Failed to generate changelog' })
  }
}
