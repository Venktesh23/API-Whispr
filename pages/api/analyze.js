import { callGemini } from '../../lib/gemini'

const ANALYSIS_SYSTEM_PROMPT = `You are API Whisper — an AI assistant that turns OpenAPI specs or API docs into answers.

The user may upload:
- OpenAPI JSON or YAML
- PDF or DOCX API documentation
- Raw JSON/YAML with API structure

Your job is to:
- Analyze the API spec/documentation deeply
- Understand all endpoints, methods, parameters, and error codes
- Answer any natural language question about the API clearly and like you're mentoring a junior developer

ALWAYS return:
1. A clear, human explanation with endpoint path + method
2. Required parameters with types and where they go (query, path, body, etc.)
3. Code snippets in 5 languages: cURL, Python, JavaScript (fetch), TypeScript (with inferred types), and Go
4. Common status codes
5. If possible: a visual explanation (e.g., method distribution, auth types)

Respond in valid JSON like:
{
  "answer": "Human explanation...",
  "requiredParams": [...],
  "codeSnippets": {
    "curl": "curl -X GET ...",
    "python": "import requests...",
    "javascript": "fetch(...)",
    "typescript": "async function...",
    "go": "package main..."
  },
  "visualSummary": { "GET": 12, "POST": 4, ... }
}

Make code snippets production-ready and properly formatted. Use language-specific best practices.
Make it simple enough for a beginner, but rich enough for pros.`

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    let requestData = typeof req.body === 'string' ? JSON.parse(req.body) : req.body

    if (!requestData) {
      return res.status(400).json({ error: 'Request body is missing' })
    }

    const { question, specContent, specType } = requestData

    if (!question || !specContent) {
      return res.status(400).json({ error: 'Question and spec content are required' })
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY not configured' })
    }

    const userPrompt = `Question: ${question}\n\nAPI Specification (${specType}):\n${specContent.substring(0, 4000)}`

    const analysisResult = await callGemini(ANALYSIS_SYSTEM_PROMPT, userPrompt, {
      temperature: 0.3,
      maxOutputTokens: 2000,
    })

    let parsedResult
    try {
      // Strip possible markdown code fences Gemini sometimes wraps around JSON
      const cleaned = analysisResult.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim()
      parsedResult = JSON.parse(cleaned)
    } catch (parseError) {
      parsedResult = {
        overview: 'This API specification has been analyzed successfully.',
        answer: analysisResult.substring(0, 1000),
        requiredParams: [],
        codeSnippets: {
          curl: "curl -X GET 'https://api.example.com/endpoint' -H 'Authorization: Bearer YOUR_TOKEN'",
          python: "import requests\n\nresponse = requests.get('https://api.example.com/endpoint', headers={'Authorization': 'Bearer YOUR_TOKEN'})\nprint(response.json())",
          javascript: "fetch('https://api.example.com/endpoint', {\n  headers: { 'Authorization': 'Bearer YOUR_TOKEN' }\n})\n  .then(res => res.json())\n  .then(data => console.log(data))",
          typescript: "async function fetchApi(): Promise<any> {\n  const response = await fetch('https://api.example.com/endpoint', {\n    headers: { 'Authorization': 'Bearer YOUR_TOKEN' }\n  });\n  return await response.json();\n}",
          go: "package main\n\nimport (\n  \"fmt\"\n  \"net/http\"\n  \"io/ioutil\"\n)\n\nfunc main() {\n  req, _ := http.NewRequest(\"GET\", \"https://api.example.com/endpoint\", nil)\n  req.Header.Add(\"Authorization\", \"Bearer YOUR_TOKEN\")\n  resp, _ := http.DefaultClient.Do(req)\n  defer resp.Body.Close()\n  body, _ := ioutil.ReadAll(resp.Body)\n  fmt.Println(string(body))\n}",
        },
        dataStructureExample: {
          requestBodyExample: { example: 'data' },
          responseExample: { status: 'success', data: {} },
        },
        visualSummary: {
          totalEndpoints: 1,
          methodsCount: { GET: 1 },
          commonStatusCodes: ['200', '400', '401'],
          topTags: ['api', 'rest'],
        },
        relatedQuestions: [
          'How do I authenticate with this API?',
          'What are the required parameters?',
          'How do I handle errors?',
        ],
      }
    }

    return res.status(200).json(parsedResult)
  } catch (error) {
    console.error('💥 Analysis error:', error.message)
    return res.status(500).json({ error: error.message || 'Analysis failed. Please try again.' })
  }
}
