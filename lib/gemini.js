const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models'

/**
 * Call Gemini with function calling support (single turn).
 * Returns either a text response or a function call the model wants to make.
 *
 * @param {object} params
 * @param {string} params.systemPrompt
 * @param {Array}  params.contents       - Full conversation history (role/parts tuples)
 * @param {Array}  params.tools          - Array of function declaration objects
 * @param {number} [params.temperature]
 * @param {number} [params.maxOutputTokens]
 * @returns {Promise<{text: string|null, functionCall: {name, args}|null, modelContent: object}>}
 */
export async function callGeminiWithTools({ systemPrompt, contents, tools, temperature = 0.2, maxOutputTokens = 4000 } = {}) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured')

  const body = {
    contents,
    tools: [{ functionDeclarations: tools }],
    toolConfig: { functionCallingConfig: { mode: 'AUTO' } },
    generationConfig: { temperature, maxOutputTokens },
  }
  if (systemPrompt) body.systemInstruction = { parts: [{ text: systemPrompt }] }

  const res = await fetch(`${GEMINI_URL}/gemini-2.0-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Gemini tool-use error: ${res.status} — ${errText}`)
  }

  const data = await res.json()
  const candidate = data.candidates?.[0]
  if (!candidate) throw new Error('No response from Gemini')

  const parts = candidate.content?.parts ?? []
  const textPart = parts.find((p) => p.text)
  const fnCallPart = parts.find((p) => p.functionCall)

  return {
    text: textPart?.text ?? null,
    functionCall: fnCallPart?.functionCall ?? null,
    modelContent: candidate.content, // include in history on next turn
  }
}

/**
 * Call Gemini for a single chat completion.
 * @returns {Promise<string>} The model's text response
 */
export async function callGemini(systemPrompt, userPrompt, { temperature = 0.3, maxOutputTokens = 2000 } = {}) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured')

  const body = {
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    generationConfig: { temperature, maxOutputTokens },
  }
  if (systemPrompt) body.systemInstruction = { parts: [{ text: systemPrompt }] }

  const res = await fetch(`${GEMINI_URL}/gemini-2.0-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Gemini API error: ${res.status} - ${errText}`)
  }

  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('No response from Gemini')
  return text
}

/**
 * Generate an embedding for a single text string.
 * @returns {Promise<number[]>} 768-dimensional embedding vector
 */
export async function embedText(text) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured')

  const res = await fetch(`${GEMINI_URL}/text-embedding-004:embedContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'models/text-embedding-004',
      content: { parts: [{ text }] },
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Gemini embedding error: ${res.status} - ${errText}`)
  }

  const data = await res.json()
  return data.embedding.values
}

/**
 * Generate embeddings for multiple texts in a single batch request.
 * @returns {Promise<number[][]>} Array of 768-dimensional embedding vectors
 */
export async function batchEmbedTexts(texts) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured')

  const res = await fetch(`${GEMINI_URL}/text-embedding-004:batchEmbedContents?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requests: texts.map((text) => ({
        model: 'models/text-embedding-004',
        content: { parts: [{ text }] },
      })),
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Gemini batch embedding error: ${res.status} - ${errText}`)
  }

  const data = await res.json()
  return data.embeddings.map((e) => e.values)
}
