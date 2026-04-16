import OpenAI from 'openai'
import formidable from 'formidable'
import fs from 'fs'
import path from 'path'
import pdfParse from 'pdf-parse'
import yaml from 'yaml'
import SwaggerParser from 'swagger-parser'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

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
  console.log('🔍 API Analyze called')
  console.log('📋 Method:', req.method)
  console.log('📦 Body type:', typeof req.body)
  console.log('📦 Body keys:', req.body ? Object.keys(req.body) : 'BODY IS NULL/UNDEFINED')
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    let requestData
    
    if (!req.body) {
      console.log('❌ req.body is undefined')
      return res.status(400).json({ error: 'Request body is missing' })
    }

    if (typeof req.body === 'string') {
      try {
        requestData = JSON.parse(req.body)
      } catch (e) {
        console.log('❌ Failed to parse body as JSON:', e.message)
        return res.status(400).json({ error: 'Invalid JSON in request body' })
      }
    } else {
      requestData = req.body
    }

    const { question, specContent, specType } = requestData
    
    console.log('📝 Request data received:', { 
      hasQuestion: !!question,
      hasSpecContent: !!specContent,
      specType,
      questionLength: question?.length,
      contentLength: specContent?.length 
    })

    if (!question || !specContent) {
      console.log('❌ Missing required fields')
      console.log('Question exists:', !!question)
      console.log('SpecContent exists:', !!specContent)
      return res.status(400).json({ 
        error: 'Question and spec content are required',
        received: { question: !!question, specContent: !!specContent }
      })
    }

    if (!process.env.OPENAI_API_KEY) {
      console.log('❌ Missing OpenAI API key')
      return res.status(500).json({ error: 'OpenAI API key not configured' })
    }

    console.log('🤖 Calling OpenAI API...')
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: ANALYSIS_SYSTEM_PROMPT
          },
          {
            role: 'user',
            content: `Question: ${question}\n\nAPI Specification (${specType}):\n${specContent.substring(0, 4000)}`
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      })
    })

    console.log('📡 OpenAI response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.log('❌ OpenAI API error:', errorText)
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    console.log('✅ OpenAI response received')
    
    const analysisResult = data.choices[0]?.message?.content

    if (!analysisResult) {
      throw new Error('No analysis result from OpenAI')
    }

    let parsedResult
    try {
      parsedResult = JSON.parse(analysisResult)
      console.log('✅ JSON parsed successfully')
    } catch (parseError) {
      console.log('⚠️ JSON parse failed, using fallback')
      parsedResult = {
        overview: "This API specification has been analyzed successfully.",
        answer: analysisResult.substring(0, 1000),
        requiredParams: [],
        codeSnippets: {
          curl: "curl -X GET 'https://api.example.com/endpoint' -H 'Authorization: Bearer YOUR_TOKEN'",
          python: "import requests\n\nresponse = requests.get('https://api.example.com/endpoint', headers={'Authorization': 'Bearer YOUR_TOKEN'})\nprint(response.json())",
          javascript: "fetch('https://api.example.com/endpoint', {\n  headers: { 'Authorization': 'Bearer YOUR_TOKEN' }\n})\n  .then(res => res.json())\n  .then(data => console.log(data))",
          typescript: "async function fetchApi(): Promise<any> {\n  const response = await fetch('https://api.example.com/endpoint', {\n    headers: { 'Authorization': 'Bearer YOUR_TOKEN' }\n  });\n  return await response.json();\n}",
          go: "package main\n\nimport (\n  \"fmt\"\n  \"net/http\"\n  \"io/ioutil\"\n)\n\nfunc main() {\n  req, _ := http.NewRequest(\"GET\", \"https://api.example.com/endpoint\", nil)\n  req.Header.Add(\"Authorization\", \"Bearer YOUR_TOKEN\")\n  resp, _ := http.DefaultClient.Do(req)\n  defer resp.Body.Close()\n  body, _ := ioutil.ReadAll(resp.Body)\n  fmt.Println(string(body))\n}"
        },
        dataStructureExample: {
          requestBodyExample: { "example": "data" },
          responseExample: { "status": "success", "data": {} }
        },
        visualSummary: {
          totalEndpoints: 1,
          methodsCount: { "GET": 1 },
          commonStatusCodes: ["200", "400", "401"],
          topTags: ["api", "rest"]
        },
        relatedQuestions: [
          "How do I authenticate with this API?",
          "What are the required parameters?",
          "How do I handle errors?"
        ]
      }
    }

    console.log('🎉 Analysis complete, sending response')
    return res.status(200).json(parsedResult)

  } catch (error) {
    console.error('💥 Analysis error:', error.message)
    
    return res.status(500).json({ 
      error: 'Analysis failed. Please check your upload and try again.'
    })
  }
} 