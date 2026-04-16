import { callGeminiWithTools } from '../../../lib/gemini'

// ---------------------------------------------------------------------------
// Tool declarations — Gemini reads these to decide what to call next
// ---------------------------------------------------------------------------

const AUDIT_TOOL_DECLARATIONS = [
  {
    name: 'audit_security',
    description:
      'Analyze the authentication and security configuration of the API spec. ' +
      'Checks security schemes, global security requirements, and per-endpoint auth coverage.',
    parameters: { type: 'OBJECT', properties: {} },
  },
  {
    name: 'audit_documentation',
    description:
      'Evaluate documentation quality across all endpoints. ' +
      'Checks for summaries, descriptions, operationIds, examples, and parameter docs.',
    parameters: { type: 'OBJECT', properties: {} },
  },
  {
    name: 'audit_design',
    description:
      'Audit API design and naming conventions. ' +
      'Checks RESTful patterns, path naming, HTTP method appropriateness, and structural consistency.',
    parameters: { type: 'OBJECT', properties: {} },
  },
  {
    name: 'audit_schemas',
    description:
      'Analyze request/response schema quality. ' +
      'Checks for missing schemas, generic types, missing examples, and undefined response bodies.',
    parameters: { type: 'OBJECT', properties: {} },
  },
  {
    name: 'audit_completeness',
    description:
      'Check OpenAPI metadata completeness. ' +
      'Checks info object, servers, contact, license, version, and other required fields.',
    parameters: { type: 'OBJECT', properties: {} },
  },
  {
    name: 'audit_error_handling',
    description:
      'Evaluate error response coverage. ' +
      'Checks which endpoints are missing 4xx/5xx response definitions.',
    parameters: { type: 'OBJECT', properties: {} },
  },
  {
    name: 'generate_report',
    description:
      'Produce the final structured audit report after gathering findings from the other tools. ' +
      'Call this once you have run the relevant audit tools and are ready to synthesize results.',
    parameters: {
      type: 'OBJECT',
      properties: {
        overall_score: {
          type: 'NUMBER',
          description: 'Overall API quality score 0–100.',
        },
        executive_summary: {
          type: 'STRING',
          description: 'Two-to-three sentence summary of the audit.',
        },
        categories: {
          type: 'OBJECT',
          description:
            'Object with keys: security, documentation, design, schemas, completeness, error_handling. ' +
            'Each value: { score: 0-100, grade: "A"|"B"|"C"|"D"|"F", status: "good"|"warning"|"critical" }',
        },
        findings: {
          type: 'ARRAY',
          description:
            'Array of finding objects. Each: { id, category, severity ("critical"|"high"|"medium"|"low"|"info"), ' +
            'title, description, affected (string[]), recommendation, example (optional YAML/JSON snippet) }',
        },
        quick_wins: {
          type: 'ARRAY',
          description:
            'Top 3 lowest-effort improvements. Each: { title, effort ("low"|"medium"|"high"), impact ("low"|"medium"|"high") }',
        },
        strengths: {
          type: 'ARRAY',
          description: 'Array of strings — what the API already does well.',
        },
      },
      required: ['overall_score', 'executive_summary', 'categories', 'findings'],
    },
  },
]

// ---------------------------------------------------------------------------
// Deterministic tool executors — no AI, pure spec analysis
// ---------------------------------------------------------------------------

function execAuditSecurity(spec, endpoints) {
  const schemes = spec.components?.securitySchemes ?? {}
  const schemeNames = Object.keys(schemes)
  const globalSecurity = spec.security ?? []
  const hasGlobalSecurity = globalSecurity.length > 0

  const endpointsWithAuth = []
  const endpointsWithoutAuth = []

  endpoints.forEach((ep) => {
    const epSecurity = ep.security
    if (epSecurity === undefined) {
      // inherits global
      if (hasGlobalSecurity) endpointsWithAuth.push(`${ep.method} ${ep.path}`)
      else endpointsWithoutAuth.push(`${ep.method} ${ep.path}`)
    } else if (Array.isArray(epSecurity) && epSecurity.length === 0) {
      // explicitly no security
      endpointsWithoutAuth.push(`${ep.method} ${ep.path}`)
    } else {
      endpointsWithAuth.push(`${ep.method} ${ep.path}`)
    }
  })

  const schemeTypes = Object.entries(schemes).map(([name, def]) => ({
    name,
    type: def.type,
    scheme: def.scheme,
    in: def.in,
  }))

  return {
    totalSchemes: schemeNames.length,
    schemeTypes,
    hasGlobalSecurity,
    globalSecurityRequirements: globalSecurity,
    totalEndpoints: endpoints.length,
    endpointsWithAuth: endpointsWithAuth.length,
    endpointsWithoutAuth: endpointsWithoutAuth.length,
    unauthenticatedEndpoints: endpointsWithoutAuth.slice(0, 10),
    hasBearerAuth: schemeTypes.some((s) => s.scheme === 'bearer'),
    hasApiKey: schemeTypes.some((s) => s.type === 'apiKey'),
    hasOAuth2: schemeTypes.some((s) => s.type === 'oauth2'),
  }
}

function execAuditDocumentation(spec, endpoints) {
  const withSummary = endpoints.filter((ep) => ep.summary && ep.summary !== 'No summary provided')
  const withDescription = endpoints.filter((ep) => ep.description)
  const withOperationId = endpoints.filter((ep) => ep.operationId)
  const withTags = endpoints.filter((ep) => ep.tags && ep.tags.length > 0)

  const missingDocEndpoints = endpoints
    .filter((ep) => !ep.summary && !ep.description)
    .map((ep) => `${ep.method} ${ep.path}`)

  // Check parameters
  let undocumentedParams = 0
  endpoints.forEach((ep) => {
    ;(ep.parameters ?? []).forEach((param) => {
      if (!param.description) undocumentedParams++
    })
  })

  return {
    totalEndpoints: endpoints.length,
    withSummary: withSummary.length,
    withDescription: withDescription.length,
    withOperationId: withOperationId.length,
    withTags: withTags.length,
    undocumentedParams,
    endpointsMissingDocs: missingDocEndpoints.slice(0, 10),
    hasApiDescription: !!spec.info?.description,
    hasContactInfo: !!spec.info?.contact,
  }
}

function execAuditDesign(spec, endpoints) {
  const paths = Object.keys(spec.paths ?? {})

  // Check for kebab-case vs camelCase paths
  const camelCasePaths = paths.filter((p) => /[a-z][A-Z]/.test(p))
  const snakeCasePaths = paths.filter((p) => p.includes('_'))
  const pluralResources = paths.filter((p) =>
    p.split('/').some((seg) => !seg.startsWith('{') && seg.endsWith('s'))
  )

  // Detect non-RESTful verbs in paths
  const verbPaths = paths.filter((p) =>
    /\/(get|post|create|update|delete|list|fetch|search|find|add|remove)[/]?/i.test(p)
  )

  // HTTP method consistency
  const deleteWithBody = endpoints.filter(
    (ep) => ep.method === 'DELETE' && ep.requestBody
  )
  const getWithBody = endpoints.filter(
    (ep) => ep.method === 'GET' && ep.requestBody
  )

  // Check resource consistency — same resource should use same path segment
  const resourceMap = {}
  paths.forEach((p) => {
    const segments = p.split('/').filter(Boolean).filter((s) => !s.startsWith('{'))
    if (segments.length > 0) {
      const resource = segments[0]
      resourceMap[resource] = (resourceMap[resource] ?? 0) + 1
    }
  })

  return {
    totalPaths: paths.length,
    camelCasePaths: camelCasePaths.length,
    camelCaseExamples: camelCasePaths.slice(0, 3),
    snakeCasePaths: snakeCasePaths.length,
    snakeCaseExamples: snakeCasePaths.slice(0, 3),
    verbsInPaths: verbPaths.length,
    verbPathExamples: verbPaths.slice(0, 5),
    pluralResources: pluralResources.length,
    deleteEndpointsWithBody: deleteWithBody.map((ep) => `${ep.method} ${ep.path}`),
    getEndpointsWithBody: getWithBody.map((ep) => `${ep.method} ${ep.path}`),
    resourceCounts: resourceMap,
    hasVersioning: paths.some((p) => /\/v\d+\//.test(p)) || !!spec.info?.version,
  }
}

function execAuditSchemas(spec, endpoints) {
  const schemas = spec.components?.schemas ?? {}
  const schemaNames = Object.keys(schemas)

  const schemaIssues = []
  schemaNames.forEach((name) => {
    const schema = schemas[name]
    if (!schema.description) schemaIssues.push({ schema: name, issue: 'missing description' })
    if (schema.type === 'object' && !schema.properties && !schema.additionalProperties) {
      schemaIssues.push({ schema: name, issue: 'empty object schema' })
    }
  })

  const endpointSchemaIssues = []
  endpoints.forEach((ep) => {
    const responses = ep.responses ?? {}
    const successCodes = Object.keys(responses).filter((c) => c.startsWith('2'))

    if (ep.method !== 'DELETE' && successCodes.length > 0) {
      const mainResponse = responses[successCodes[0]]
      const hasSchema =
        mainResponse?.content?.['application/json']?.schema ||
        mainResponse?.schema
      if (!hasSchema) {
        endpointSchemaIssues.push(`${ep.method} ${ep.path} (missing response schema)`)
      }
    }

    if ((ep.method === 'POST' || ep.method === 'PUT' || ep.method === 'PATCH') && !ep.requestBody) {
      endpointSchemaIssues.push(`${ep.method} ${ep.path} (missing request body)`)
    }
  })

  return {
    totalSchemas: schemaNames.length,
    schemaIssues: schemaIssues.slice(0, 10),
    endpointSchemaIssues: endpointSchemaIssues.slice(0, 10),
    hasReusableSchemas: schemaNames.length > 0,
    schemasWithExamples: schemaNames.filter(
      (n) => schemas[n].example !== undefined || schemas[n].examples !== undefined
    ).length,
  }
}

function execAuditCompleteness(spec) {
  const info = spec.info ?? {}
  return {
    hasTitle: !!info.title,
    hasVersion: !!info.version,
    hasDescription: !!info.description,
    hasContact: !!info.contact,
    hasContactEmail: !!info.contact?.email,
    hasLicense: !!info.license,
    hasServers: (spec.servers ?? []).length > 0,
    serverCount: (spec.servers ?? []).length,
    servers: (spec.servers ?? []).map((s) => s.url),
    hasExternalDocs: !!spec.externalDocs,
    hasTags: (spec.tags ?? []).length > 0,
    openApiVersion: spec.openapi ?? spec.swagger ?? 'unknown',
  }
}

function execAuditErrorHandling(endpoints) {
  const missing4xx = []
  const missing5xx = []
  const missing404ForIdPaths = []

  endpoints.forEach((ep) => {
    const codes = Object.keys(ep.responses ?? {})
    const has4xx = codes.some((c) => c.startsWith('4'))
    const has5xx = codes.some((c) => c.startsWith('5'))
    const has404 = codes.includes('404')

    if (!has4xx) missing4xx.push(`${ep.method} ${ep.path}`)
    if (!has5xx) missing5xx.push(`${ep.method} ${ep.path}`)

    // {id} paths should have 404
    if (ep.path.includes('{') && !has404) {
      missing404ForIdPaths.push(`${ep.method} ${ep.path}`)
    }
  })

  const totalEndpoints = endpoints.length
  const wellCovered = endpoints.filter((ep) => {
    const codes = Object.keys(ep.responses ?? {})
    return (
      codes.some((c) => c.startsWith('2')) &&
      codes.some((c) => c.startsWith('4')) &&
      codes.some((c) => c.startsWith('5'))
    )
  }).length

  return {
    totalEndpoints,
    wellCoveredEndpoints: wellCovered,
    missing4xx: missing4xx.length,
    missing4xxExamples: missing4xx.slice(0, 8),
    missing5xx: missing5xx.length,
    missing5xxExamples: missing5xx.slice(0, 8),
    missing404ForIdPaths: missing404ForIdPaths.slice(0, 8),
  }
}

// ---------------------------------------------------------------------------
// Tool dispatch
// ---------------------------------------------------------------------------

function dispatchTool(toolName, spec, endpoints) {
  switch (toolName) {
    case 'audit_security':
      return execAuditSecurity(spec, endpoints)
    case 'audit_documentation':
      return execAuditDocumentation(spec, endpoints)
    case 'audit_design':
      return execAuditDesign(spec, endpoints)
    case 'audit_schemas':
      return execAuditSchemas(spec, endpoints)
    case 'audit_completeness':
      return execAuditCompleteness(spec)
    case 'audit_error_handling':
      return execAuditErrorHandling(endpoints)
    default:
      return { error: `Unknown tool: ${toolName}` }
  }
}

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

const AGENT_SYSTEM_PROMPT = `You are an expert API Spec Audit Agent. Your job is to thoroughly audit an OpenAPI specification by calling the provided tools in a logical order, then synthesize your findings into a comprehensive report.

Audit process:
1. Start by calling audit_completeness and audit_security (critical foundations)
2. Then call audit_documentation and audit_schemas (quality indicators)
3. Then call audit_design and audit_error_handling (design quality)
4. Finally, call generate_report with all findings synthesized

Scoring guidelines per category (0-100):
- Security: 0 if no auth at all; 30-50 if partial; 80+ if global auth + per-endpoint defined
- Documentation: % of endpoints with summaries × 60 + descriptions × 40
- Design: deduct for verb paths, camelCase paths, GET with body; full score for clean REST
- Schemas: % of endpoints with defined response schemas × 70 + reusable components × 30
- Completeness: each present field (title, version, servers, contact, license) adds points
- Error Handling: % of endpoints with 4xx definitions × 50 + 5xx × 30 + 404 on ID paths × 20

Grade scale: A=90+, B=80-89, C=70-79, D=60-69, F<60
Status: good=score≥75, warning=score 50-74, critical=score<50

When generating findings:
- Be specific: name the exact endpoints or fields affected
- Provide actionable recommendations with concrete YAML examples
- Distinguish critical security issues from minor style issues
- Focus on findings that provide real value to the developer`

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured' })
  }

  const { specContent, endpoints = [] } = req.body

  if (!specContent) {
    return res.status(400).json({ error: 'specContent is required' })
  }

  // Parse spec
  let spec = {}
  try {
    spec = typeof specContent === 'string' ? JSON.parse(specContent) : specContent
  } catch {
    // raw text spec — build a minimal object so tools don't crash
    spec = { raw: specContent }
  }

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('Access-Control-Allow-Origin', '*')

  const emit = (payload) => res.write(`data: ${JSON.stringify(payload)}\n\n`)

  try {
    emit({ type: 'start', message: 'Initializing audit agent…' })

    // Build a concise spec summary for the initial prompt so Gemini understands what it's auditing
    const endpointsSummary = endpoints
      .slice(0, 20)
      .map((ep) => `${ep.method} ${ep.path}${ep.summary ? ` — ${ep.summary}` : ''}`)
      .join('\n')

    const initialMessage = `Please audit the following OpenAPI specification.

API Info:
- Title: ${spec.info?.title ?? 'Unknown'}
- Version: ${spec.info?.version ?? 'Unknown'}
- Format: ${spec.openapi ? `OpenAPI ${spec.openapi}` : spec.swagger ? `Swagger ${spec.swagger}` : 'Unknown'}
- Total endpoints: ${endpoints.length}

Endpoint overview:
${endpointsSummary || '(no structured endpoints extracted)'}

Begin the audit by calling the tools in logical order, then call generate_report.`

    // Conversation history — grows with each turn
    const contents = [{ role: 'user', parts: [{ text: initialMessage }] }]

    const MAX_ITERATIONS = 12
    let iterations = 0
    let reportData = null

    emit({ type: 'thinking', message: 'Planning audit strategy…' })

    while (iterations < MAX_ITERATIONS) {
      iterations++

      const response = await callGeminiWithTools({
        systemPrompt: AGENT_SYSTEM_PROMPT,
        contents,
        tools: AUDIT_TOOL_DECLARATIONS,
        temperature: 0.2,
        maxOutputTokens: 4000,
      })

      // Add the model's response to history
      if (response.modelContent) {
        contents.push(response.modelContent)
      }

      // Model wants to call a tool
      if (response.functionCall) {
        const { name: toolName, args } = response.functionCall

        // generate_report is the terminal tool
        if (toolName === 'generate_report') {
          emit({ type: 'tool_call', tool: 'generate_report', message: 'Synthesizing findings into report…' })

          reportData = args
          // Ensure required fields have defaults
          reportData.quick_wins = reportData.quick_wins ?? []
          reportData.strengths = reportData.strengths ?? []

          // Add function response to history (though we'll break after)
          contents.push({
            role: 'user',
            parts: [
              {
                functionResponse: {
                  name: 'generate_report',
                  response: { status: 'report_accepted' },
                },
              },
            ],
          })

          break
        }

        // Regular audit tool
        const toolLabels = {
          audit_security: 'Checking authentication & security…',
          audit_documentation: 'Auditing documentation quality…',
          audit_design: 'Reviewing API design & naming conventions…',
          audit_schemas: 'Analyzing request/response schemas…',
          audit_completeness: 'Checking spec completeness & metadata…',
          audit_error_handling: 'Evaluating error response coverage…',
        }

        emit({
          type: 'tool_call',
          tool: toolName,
          message: toolLabels[toolName] ?? `Running ${toolName}…`,
        })

        // Execute the tool locally (deterministic)
        const toolResult = dispatchTool(toolName, spec, endpoints)

        emit({
          type: 'tool_result',
          tool: toolName,
          summary: buildResultSummary(toolName, toolResult),
        })

        // Feed result back into the conversation
        contents.push({
          role: 'user',
          parts: [
            {
              functionResponse: {
                name: toolName,
                response: toolResult,
              },
            },
          ],
        })

        continue
      }

      // Model gave a text response (shouldn't normally happen mid-audit, but handle gracefully)
      if (response.text) {
        emit({ type: 'thinking', message: response.text.substring(0, 120) })
        break
      }

      // Neither text nor function call — unexpected
      emit({ type: 'thinking', message: 'Agent processing…' })
    }

    if (!reportData) {
      throw new Error('Agent did not produce a report within the iteration limit')
    }

    emit({ type: 'report', data: reportData })
    emit({ type: 'done' })
    res.end()
  } catch (err) {
    console.error('Audit agent error:', err)
    emit({ type: 'error', message: err.message ?? 'Agent encountered an error' })
    res.end()
  }
}

function buildResultSummary(toolName, result) {
  switch (toolName) {
    case 'audit_security':
      return `${result.totalSchemes} security scheme(s), ${result.endpointsWithoutAuth}/${result.totalEndpoints} endpoints unprotected`
    case 'audit_documentation':
      return `${result.withSummary}/${result.totalEndpoints} endpoints documented`
    case 'audit_design':
      return `${result.totalPaths} paths — ${result.verbsInPaths} verb paths, ${result.camelCasePaths} camelCase`
    case 'audit_schemas':
      return `${result.totalSchemas} schemas, ${result.endpointSchemaIssues.length} endpoint schema issues`
    case 'audit_completeness':
      return `OpenAPI ${result.openApiVersion}, servers: ${result.serverCount}, contact: ${result.hasContact}`
    case 'audit_error_handling':
      return `${result.missing4xx} endpoints missing 4xx, ${result.missing5xx} missing 5xx`
    default:
      return 'completed'
  }
}
