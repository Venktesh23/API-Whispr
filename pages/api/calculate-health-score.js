const HEALTH_SCORE_SYSTEM_PROMPT = `You are an API quality expert. Analyze the provided OpenAPI specification and calculate a comprehensive health score out of 100.

Evaluate these aspects:
1. Documentation Quality (30 points): completeness of descriptions, summaries, examples
2. API Design (25 points): RESTful design principles, consistent naming, proper HTTP methods
3. Security (20 points): security schemes, authentication methods
4. Schema Definition (15 points): request/response schemas, parameter documentation  
5. Maintainability (10 points): versioning, server definitions, contact info

Return exactly this JSON format:
{
  "score": 85,
  "breakdown": {
    "documentation": {"score": 26, "max": 30, "issues": ["Missing examples in 3 endpoints"]},
    "design": {"score": 20, "max": 25, "issues": ["Inconsistent naming in user endpoints"]},
    "security": {"score": 15, "max": 20, "issues": ["No OAuth2 configuration"]},
    "schemas": {"score": 12, "max": 15, "issues": ["Missing response schemas"]},
    "maintainability": {"score": 8, "max": 10, "issues": ["No contact information"]}
  },
  "improvements": [
    "Add comprehensive examples to all endpoints",
    "Implement OAuth2 security scheme",
    "Add contact information and license details"
  ],
  "strengths": ["Good endpoint organization", "Clear parameter definitions"]
}`

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { specContent, endpoints, filename, specType } = req.body

    if (!specContent || !endpoints) {
      return res.status(400).json({ error: 'Specification content and endpoints are required' })
    }

    console.log('📊 Calculating health score for:', filename)

    // Fallback calculation if OpenAI is not available or fails
    const calculateLocalScore = () => {
      let score = 0
      const breakdown = {}

      // Parse spec content
      let parsedSpec
      try {
        parsedSpec = typeof specContent === 'string' ? JSON.parse(specContent) : specContent
      } catch (e) {
        parsedSpec = {}
      }

      // Documentation Quality (30 points)
      const endpointsWithDocs = endpoints.filter(ep => ep.summary || ep.description).length
      const endpointsWithExamples = endpoints.filter(ep => ep.examples || (ep.responses && Object.values(ep.responses).some(r => r.examples))).length
      const docScore = Math.min(30, Math.round(
        (endpointsWithDocs / Math.max(endpoints.length, 1)) * 20 +
        (endpointsWithExamples / Math.max(endpoints.length, 1)) * 10
      ))
      breakdown.documentation = { score: docScore, max: 30 }
      score += docScore

      // API Design (25 points)
      const hasConsistentPaths = endpoints.every(ep => ep.path.startsWith('/'))
      const usesProperMethods = endpoints.every(ep => ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'].includes(ep.method))
      const hasOperationIds = endpoints.filter(ep => ep.operationId).length
      const designScore = Math.min(25, 
        (hasConsistentPaths ? 10 : 0) +
        (usesProperMethods ? 10 : 0) +
        Math.round((hasOperationIds / Math.max(endpoints.length, 1)) * 5)
      )
      breakdown.design = { score: designScore, max: 25 }
      score += designScore

      // Security (20 points)
      const hasSecurity = parsedSpec.components?.securitySchemes || parsedSpec.security
      const securityScore = hasSecurity ? 20 : 0
      breakdown.security = { score: securityScore, max: 20 }
      score += securityScore

      // Schema Definition (15 points)
      const endpointsWithResponses = endpoints.filter(ep => ep.responses && Object.keys(ep.responses).length > 0).length
      const endpointsWithParams = endpoints.filter(ep => ep.parameters && ep.parameters.length > 0).length
      const schemaScore = Math.min(15, Math.round(
        (endpointsWithResponses / Math.max(endpoints.length, 1)) * 10 +
        (endpointsWithParams / Math.max(endpoints.length, 1)) * 5
      ))
      breakdown.schemas = { score: schemaScore, max: 15 }
      score += schemaScore

      // Maintainability (10 points)
      const hasVersion = parsedSpec.info?.version
      const hasServers = parsedSpec.servers && parsedSpec.servers.length > 0
      const hasContact = parsedSpec.info?.contact
      const maintainabilityScore = 
        (hasVersion ? 4 : 0) +
        (hasServers ? 4 : 0) +
        (hasContact ? 2 : 0)
      breakdown.maintainability = { score: maintainabilityScore, max: 10 }
      score += maintainabilityScore

      // Generate improvements
      const improvements = []
      if (docScore < 25) improvements.push("Add comprehensive descriptions and examples to endpoints")
      if (designScore < 20) improvements.push("Follow RESTful design principles and consistent naming")
      if (!hasSecurity) improvements.push("Implement security schemes and authentication")
      if (schemaScore < 12) improvements.push("Define complete request/response schemas")
      if (maintainabilityScore < 8) improvements.push("Add version info, server definitions, and contact details")

      return {
        score: Math.min(score, 100),
        breakdown,
        improvements: improvements.slice(0, 5),
        strengths: score >= 80 ? ["Well-documented API", "Good structure"] : score >= 60 ? ["Decent organization"] : ["Basic functionality present"]
      }
    }

    // Try GPT analysis first, fallback to local calculation
    if (process.env.OPENAI_API_KEY) {
      try {
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
                content: HEALTH_SCORE_SYSTEM_PROMPT
              },
              {
                role: 'user',
                content: `Analyze this OpenAPI specification and calculate a health score:

Filename: ${filename}
Type: ${specType}
Endpoints Count: ${endpoints.length}

Specification:
${specContent.substring(0, 8000)}

Endpoints Summary:
${endpoints.slice(0, 10).map(ep => `${ep.method} ${ep.path} - ${ep.summary || 'No summary'}`).join('\n')}`
              }
            ],
            temperature: 0.3,
            max_tokens: 1500
          })
        })

        if (response.ok) {
          const data = await response.json()
          const result = data.choices[0]?.message?.content

          if (result) {
            try {
              const parsedResult = JSON.parse(result)
              console.log('✅ Health score calculated with GPT')
              return res.status(200).json(parsedResult)
            } catch (parseError) {
              console.log('GPT response parsing failed, using local calculation')
            }
          }
        }
      } catch (aiError) {
        console.log('GPT analysis failed, using local calculation:', aiError.message)
      }
    }

    // Fallback to local calculation
    const result = calculateLocalScore()
    console.log('✅ Health score calculated locally')
    res.status(200).json(result)

  } catch (error) {
    console.error('💥 Health score calculation error:', error.message)
    
    res.status(500).json({ 
      error: 'Failed to calculate health score',
      message: error.message
    })
  }
} 