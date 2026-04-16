const TEST_GENERATION_PROMPT = `You are an expert at generating test cases for APIs. Generate comprehensive test cases for the given endpoint in three popular formats: Jest (JavaScript), Pytest (Python), and Postman Collection JSON.

Each test should:
- Test successful scenarios with valid inputs
- Include error handling for invalid inputs
- Verify response status codes and data structures
- Use environment variables for base URL, API keys, etc.

Generate test cases that are production-ready and follow best practices.`

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { endpoint, spec, authToken } = req.body

    if (!endpoint || !spec) {
      return res.status(400).json({ error: 'Missing required fields: endpoint and spec' })
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OpenAI API key not configured' })
    }

    console.log(`🧪 Generating tests for ${endpoint.method} ${endpoint.path}...`)

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo',
        messages: [
          {
            role: 'system',
            content: TEST_GENERATION_PROMPT,
          },
          {
            role: 'user',
            content: `Generate test cases for this API endpoint:

METHOD: ${endpoint.method}
PATH: ${endpoint.path}
SUMMARY: ${endpoint.summary || 'No summary'}
DESCRIPTION: ${endpoint.description || 'No description'}

REQUEST BODY: ${endpoint.requestBody ? JSON.stringify(endpoint.requestBody, null, 2).substring(0, 1000) : 'None'}

RESPONSES: ${endpoint.responses ? JSON.stringify(endpoint.responses, null, 2).substring(0, 1000) : 'No info'}

API SPEC BASE URL: ${spec?.servers?.[0]?.url || 'http://localhost:3000'}

Generate three complete, production-ready test files:
1. Jest test file (for Node.js/JavaScript testing)
2. Pytest test file (for Python testing)  
3. Postman Collection JSON (for manual/automation testing)

Return as valid JSON with this format:
{
  "jest": "// complete jest test code...",
  "pytest": "# complete pytest code...",
  "postman": { ... complete Postman collection JSON ... }
}

Make sure all code is syntactically correct and ready to run.`,
          },
        ],
        temperature: 0.3,
        max_tokens: 3500,
      }),
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

    let testCases
    try {
      testCases = JSON.parse(result)
    } catch (parseError) {
      console.error('JSON parse failed, creating fallback tests')

      testCases = {
        jest: `describe('${endpoint.method} ${endpoint.path}', () => {
  it('should return success response', async () => {
    const response = await fetch(\`\${process.env.API_BASE_URL}${endpoint.path}\`, {
      method: '${endpoint.method}',
      headers: { 'Content-Type': 'application/json' }
    });
    expect(response.ok).toBe(true);
  });
});`,
        pytest: `import pytest
import requests

def test_${endpoint.method.lower()}_${endpoint.path.replace(/[^a-z0-9]/gi, '_').toLowerCase()}():
    response = requests.${endpoint.method.toLowerCase()}(
        f"{os.getenv('API_BASE_URL')}${endpoint.path}"
    )
    assert response.status_code in [200, 201]`,
        postman: {
          info: {
            name: `${endpoint.method} ${endpoint.path}`,
            schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
          },
          item: [
            {
              name: endpoint.summary || endpoint.path,
              request: {
                method: endpoint.method,
                url: `{{API_BASE_URL}}${endpoint.path}`,
              },
            },
          ],
        },
      }
    }

    console.log('✅ Test cases generated successfully')
    return res.status(200).json(testCases)
  } catch (error) {
    console.error('💥 Test generation error:', error)

    return res.status(500).json({
      error: 'Failed to generate test cases'
    })
  }
}
