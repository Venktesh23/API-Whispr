// GPT Prompt templates for each flow type
const FLOW_TEMPLATES = {
  user_auth: {
    pattern: "User Authentication Flow: Login → Token → Profile",
    prompt: `Create a Mermaid **sequence diagram** showing this flow based on the OpenAPI spec below:

Flow Pattern: "Login → Token → Fetch Profile"

Show the complete authentication flow:
1. User submits credentials (POST /auth/login or similar)
2. API validates and returns JWT token or session
3. User fetches profile using auth token (GET /user/profile or similar)

Use realistic endpoints from the spec. Show auth headers, request/response payloads, and error cases.

Only return Mermaid code inside triple backticks.`
  },
  
  crud_flow: {
    pattern: "CRUD Operations Flow: Create → Read → Update → Delete",
    prompt: `Create a Mermaid **sequence diagram** showing this flow based on the OpenAPI spec below:

Flow Pattern: "Create → Read → Update → Delete"

Show typical CRUD operations for a main resource:
1. POST to create new resource
2. GET to read/fetch resource
3. PUT/PATCH to update resource  
4. DELETE to remove resource

Use actual endpoints from the spec (e.g., POST /users, GET /users/{id}, PUT /users/{id}, DELETE /users/{id}). Show realistic request/response data.

Only return Mermaid code inside triple backticks.`
  },
  
  checkout_flow: {
    pattern: "Order Checkout Flow: Cart → Payment → Confirmation",
    prompt: `Create a Mermaid **sequence diagram** showing this flow based on the OpenAPI spec below:

Flow Pattern: "Cart → Payment → Confirmation"

Show the e-commerce checkout process:
1. Add items to cart (POST /cart or similar)
2. Review cart contents (GET /cart)
3. Process payment (POST /payments or /checkout)
4. Confirm order (GET /orders/{id} or confirmation endpoint)

Use realistic endpoints from the spec. Show payment processing, validation steps, and success/error responses.

Only return Mermaid code inside triple backticks.`
  },
  
  oauth_flow: {
    pattern: "OAuth 2.0 Authorization Flow: Client → Auth Server → Token",
    prompt: `Create a Mermaid **sequence diagram** showing this flow based on the OpenAPI spec below:

Flow Pattern: "OAuth 2.0 Authorization Flow"

Show the complete OAuth 2.0 flow:
1. Client redirects user to authorization server
2. User grants permission
3. Auth server returns authorization code
4. Client exchanges code for access token
5. Client uses token to access protected resources

Use OAuth endpoints from the spec (/oauth/authorize, /oauth/token, etc.). Show realistic OAuth parameters and responses.

Only return Mermaid code inside triple backticks.`
  },
  
  microservice_chain: {
    pattern: "Microservice Call Chain: API Gateway → Service A → Database",
    prompt: `Create a Mermaid **sequence diagram** showing this flow based on the OpenAPI spec below:

Flow Pattern: "Microservice Architecture Call Chain"

Show how requests flow through microservices:
1. Client request to API Gateway
2. Gateway routes to appropriate service
3. Service processes and queries database
4. Response flows back through the chain

Use realistic service endpoints from the spec. Show inter-service communication, data validation, and response aggregation.

Only return Mermaid code inside triple backticks.`
  },
  
  entity_relationship: {
    pattern: "Entity Relationship Diagram: Models & Database Schemas",
    prompt: `Create a Mermaid **erDiagram** showing this based on the OpenAPI spec below:

Flow Pattern: "Database Entity Relationships"

Show the data model relationships:
1. Extract entities from API schemas/models
2. Show primary keys, foreign keys, and relationships
3. Include important fields and data types
4. Show one-to-many, many-to-many relationships

Use actual schema definitions from the spec. Focus on the main business entities and their relationships.

Only return Mermaid code inside triple backticks.`
  }
}

const FALLBACK_DIAGRAM = `sequenceDiagram
    participant Client
    participant API
    participant Database
    
    Client->>API: Request
    API->>Database: Query
    Database-->>API: Data
    API-->>Client: Response
    
    Note over Client,Database: Generic API Flow`

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { flowType, diagramType, specContent, specType } = req.body

    if (!flowType) {
      return res.status(400).json({ error: 'Flow type is required' })
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OpenAI API key not configured' })
    }

    console.log('🎨 Generating diagram:', { flowType, diagramType, specType })

    // Get the appropriate template
    const template = FLOW_TEMPLATES[flowType]
    if (!template) {
      return res.status(400).json({ error: 'Invalid flow type' })
    }

    // Build the complete prompt
    const systemPrompt = `You are an expert AI assistant that generates Mermaid.js diagrams for API documentation.

${template.prompt}

IMPORTANT RULES:
- Only return valid Mermaid code inside triple backticks (\`\`\`)
- No explanatory text before or after the code
- Use realistic endpoint names from the provided spec
- Include actual field names and data types when possible
- Make diagrams clear and developer-friendly
- Ensure proper Mermaid syntax for ${diagramType} diagrams`

    const userPrompt = `${specContent ? `Based on this API specification (${specType}):\n${specContent.substring(0, 6000)}` : 'Generate a generic diagram since no API spec was provided.'}`

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
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
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

    // Extract Mermaid code from the response
    const mermaidMatch = result.match(/```(?:mermaid)?\n?([\s\S]*?)```/)
    let mermaidCode = mermaidMatch ? mermaidMatch[1].trim() : result.trim()

    // Basic validation and fallback
    if (!mermaidCode || mermaidCode.length < 20) {
      console.warn('Generated diagram too short, using fallback')
      mermaidCode = FALLBACK_DIAGRAM
    }

    // Clean up common issues
    mermaidCode = mermaidCode
      .replace(/^```mermaid\n/, '')
      .replace(/\n```$/, '')
      .trim()

    console.log('✅ Diagram generated successfully')

    res.status(200).json({ 
      mermaidCode,
      flowType,
      diagramType,
      pattern: template.pattern
    })

  } catch (error) {
    console.error('Diagram generation error:', error)
    
    // Return fallback diagram on error
    res.status(200).json({
      mermaidCode: FALLBACK_DIAGRAM,
      flowType: req.body.flowType || 'generic',
      diagramType: req.body.diagramType || 'sequence',
      pattern: 'Generic API Flow (Fallback)',
      warning: 'Used fallback diagram due to generation error'
    })
  }
} 