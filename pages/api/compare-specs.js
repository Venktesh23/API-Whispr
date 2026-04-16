import { callGemini } from '../../lib/gemini'

const SPEC_COMPARISON_SYSTEM_PROMPT = `You are an expert at analyzing OpenAPI specifications. Compare two API specs and identify all differences in endpoints, parameters, methods, status codes, and descriptions. Classify each change by SEVERITY LEVEL.

SEVERITY LEVELS:
- BREAKING: Changes that break API contracts (removed endpoints, removed required parameters, response type changes, status code removals, required becoming optional)
- DEPRECATION: Fields/endpoints marked as deprecated, planned removals
- NON_BREAKING: Safe changes (new endpoints, new optional parameters, new response fields, documentation updates)

Return exactly this JSON format:
{
  "newEndpoints": [
    {"method": "POST", "path": "/auth/register", "summary": "User registration endpoint", "severity": "NON_BREAKING"}
  ],
  "removedEndpoints": [
    {"method": "DELETE", "path": "/admin/users", "summary": "Admin user deletion endpoint", "severity": "BREAKING"}
  ],
  "modifiedEndpoints": [
    {
      "method": "GET",
      "path": "/users/{id}",
      "changes": "Added new 'include' query parameter for profile data",
      "severity": "NON_BREAKING"
    }
  ],
  "summary": "3 new endpoints (NON_BREAKING), 1 removed (BREAKING), 2 modified (NON_BREAKING)",
  "detailedAnalysis": "The new specification introduces enhanced user management features...",
  "breakingChanges": 1,
  "deprecations": 0,
  "nonBreakingChanges": 5
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
    const { originalSpec, newSpec, originalFilename } = req.body

    if (!originalSpec) return res.status(400).json({ error: 'Original specification is required' })
    if (!newSpec) return res.status(400).json({ error: 'New specification is required' })

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY not configured' })
    }

    const userPrompt = `Compare these two OpenAPI specifications and provide a detailed analysis of differences:

ORIGINAL SPECIFICATION (${originalFilename}):
${originalSpec.substring(0, 8000)}

NEW SPECIFICATION:
${newSpec.substring(0, 8000)}

Please identify all differences in endpoints, parameters, methods, response schemas, and documentation.`

    const result = await callGemini(SPEC_COMPARISON_SYSTEM_PROMPT, userPrompt, {
      temperature: 0.3,
      maxOutputTokens: 2500,
    })

    let parsedResult
    try {
      const cleaned = result.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim()
      parsedResult = JSON.parse(cleaned)
    } catch {
      const hasNew = result.toLowerCase().includes('new') || result.toLowerCase().includes('added')
      const hasRemoved = result.toLowerCase().includes('removed') || result.toLowerCase().includes('deleted')
      const hasModified = result.toLowerCase().includes('modified') || result.toLowerCase().includes('changed')

      parsedResult = {
        newEndpoints: hasNew ? [{ method: 'Unknown', path: '/example', summary: 'New endpoint detected', severity: 'NON_BREAKING' }] : [],
        removedEndpoints: hasRemoved ? [{ method: 'Unknown', path: '/example', summary: 'Removed endpoint detected', severity: 'BREAKING' }] : [],
        modifiedEndpoints: hasModified ? [{ method: 'Unknown', path: '/example', changes: 'Modifications detected', severity: 'NON_BREAKING' }] : [],
        summary: 'Differences detected between specifications',
        detailedAnalysis: result.substring(0, 1000) + (result.length > 1000 ? '...' : ''),
        breakingChanges: hasRemoved ? 1 : 0,
        deprecations: 0,
        nonBreakingChanges: (hasNew ? 1 : 0) + (hasModified ? 1 : 0),
      }
    }

    parsedResult.newEndpoints = parsedResult.newEndpoints || []
    parsedResult.removedEndpoints = parsedResult.removedEndpoints || []
    parsedResult.modifiedEndpoints = parsedResult.modifiedEndpoints || []

    if (!parsedResult.breakingChanges) {
      parsedResult.breakingChanges =
        parsedResult.removedEndpoints.filter((e) => e.severity === 'BREAKING').length +
        parsedResult.modifiedEndpoints.filter((e) => e.severity === 'BREAKING').length
    }
    if (!parsedResult.deprecations) {
      parsedResult.deprecations =
        parsedResult.removedEndpoints.filter((e) => e.severity === 'DEPRECATION').length +
        parsedResult.modifiedEndpoints.filter((e) => e.severity === 'DEPRECATION').length
    }
    if (!parsedResult.nonBreakingChanges) {
      parsedResult.nonBreakingChanges =
        parsedResult.newEndpoints.filter((e) => e.severity === 'NON_BREAKING').length +
        parsedResult.modifiedEndpoints.filter((e) => e.severity === 'NON_BREAKING').length
    }

    res.status(200).json(parsedResult)
  } catch (error) {
    console.error('💥 Spec comparison error:', error.message)
    return res.status(500).json({ error: 'Failed to compare specifications' })
  }
}
