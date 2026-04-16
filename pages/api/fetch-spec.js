import yaml from 'js-yaml'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { url } = req.body

  if (!url) {
    return res.status(400).json({ error: 'URL is required' })
  }

  try {
    // Fetch the content from the URL
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'API-Whispr/1.0'
      },
      timeout: 10000 // 10 second timeout
    })

    if (!response.ok) {
      return res.status(400).json({ 
        error: `Failed to fetch URL: ${response.status} ${response.statusText}` 
      })
    }

    const contentType = response.headers.get('content-type') || ''
    let content = await response.text()

    // Detect format and parse
    let parsed = null
    let detectedFormat = 'unknown'

    // Try JSON first
    if (contentType.includes('application/json') || url.endsWith('.json')) {
      try {
        parsed = JSON.parse(content)
        detectedFormat = 'json'
      } catch (e) {
        return res.status(400).json({ 
          error: 'Invalid JSON content at the provided URL' 
        })
      }
    }
    // Try YAML
    else if (contentType.includes('application/yaml') || contentType.includes('text/yaml') || url.endsWith('.yaml') || url.endsWith('.yml')) {
      try {
        parsed = yaml.load(content)
        detectedFormat = 'yaml'
      } catch (e) {
        return res.status(400).json({ 
          error: 'Invalid YAML content at the provided URL' 
        })
      }
    }
    // Auto-detect by trying JSON first, then YAML
    else {
      try {
        parsed = JSON.parse(content)
        detectedFormat = 'json'
      } catch (jsonErr) {
        try {
          parsed = yaml.load(content)
          detectedFormat = 'yaml'
        } catch (yamlErr) {
          return res.status(400).json({ 
            error: 'Could not parse URL content as JSON or YAML. Ensure it is a valid API specification.' 
          })
        }
      }
    }

    // Validate that it looks like an API spec
    if (!parsed || typeof parsed !== 'object') {
      return res.status(400).json({ 
        error: 'URL content does not appear to be a valid API specification' 
      })
    }

    // Check for OpenAPI indicators
    const isOpenAPI = parsed.openapi || parsed.swagger
    if (!isOpenAPI && !parsed.info) {
      return res.status(400).json({ 
        error: 'Specification does not appear to be a valid OpenAPI spec' 
      })
    }

    return res.status(200).json({
      success: true,
      content: content,
      parsed: parsed,
      format: detectedFormat,
      filename: new URL(url).pathname.split('/').pop() || 'api-spec'
    })

  } catch (error) {
    console.error('Fetch spec error:', error)
    
    let errorMessage = 'Failed to fetch spec from URL'
    if (error.code === 'ENOTFOUND') {
      errorMessage = 'Invalid URL or domain not found'
    } else if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Connection refused. The server may be down.'
    } else if (error.message === 'Fetch timeout') {
      errorMessage = 'Request timeout. The server took too long to respond.'
    }

    return res.status(400).json({ error: errorMessage })
  }
}
