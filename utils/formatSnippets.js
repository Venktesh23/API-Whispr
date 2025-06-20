export function formatCurlSnippet(endpoint, baseUrl = 'https://api.example.com') {
  const { method, path, parameters = [], auth } = endpoint
  
  let curl = `curl -X ${method} "${baseUrl}${path}"`
  
  // Add headers
  const headers = []
  if (auth) {
    headers.push('-H "Authorization: Bearer YOUR_TOKEN"')
  }
  headers.push('-H "Content-Type: application/json"')
  
  curl += ' \\\n  ' + headers.join(' \\\n  ')
  
  // Add body for POST/PUT/PATCH
  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    const bodyParams = parameters.filter(p => p.location === 'body' || p.in === 'body')
    if (bodyParams.length > 0) {
      const body = bodyParams.reduce((acc, param) => {
        acc[param.name] = `<${param.name}>`
        return acc
      }, {})
      curl += ` \\\n  -d '${JSON.stringify(body, null, 2)}'`
    }
  }
  
  return curl
}

export function formatPythonSnippet(endpoint, baseUrl = 'https://api.example.com') {
  const { method, path, parameters = [], auth } = endpoint
  
  let python = 'import requests\n\n'
  python += `url = "${baseUrl}${path}"\n`
  
  // Headers
  python += 'headers = {\n'
  if (auth) {
    python += '    "Authorization": "Bearer YOUR_TOKEN",\n'
  }
  python += '    "Content-Type": "application/json"\n'
  python += '}\n'
  
  // Body data
  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    const bodyParams = parameters.filter(p => p.location === 'body' || p.in === 'body')
    if (bodyParams.length > 0) {
      python += 'data = {\n'
      bodyParams.forEach(param => {
        python += `    "${param.name}": "<${param.name}>",\n`
      })
      python += '}\n\n'
      python += `response = requests.${method.toLowerCase()}(url, headers=headers, json=data)`
    } else {
      python += `\nresponse = requests.${method.toLowerCase()}(url, headers=headers)`
    }
  } else {
    python += `\nresponse = requests.${method.toLowerCase()}(url, headers=headers)`
  }
  
  return python
}

export function formatJavaScriptSnippet(endpoint, baseUrl = 'https://api.example.com') {
  const { method, path, parameters = [], auth } = endpoint
  
  let js = `fetch("${baseUrl}${path}", {\n`
  js += `  method: "${method}",\n`
  js += '  headers: {\n'
  
  if (auth) {
    js += '    "Authorization": "Bearer YOUR_TOKEN",\n'
  }
  js += '    "Content-Type": "application/json"\n'
  js += '  }'
  
  // Body for POST/PUT/PATCH
  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    const bodyParams = parameters.filter(p => p.location === 'body' || p.in === 'body')
    if (bodyParams.length > 0) {
      const body = bodyParams.reduce((acc, param) => {
        acc[param.name] = `<${param.name}>`
        return acc
      }, {})
      js += ',\n  body: JSON.stringify('
      js += JSON.stringify(body, null, 4).replace(/^/gm, '    ')
      js += '\n  )'
    }
  }
  
  js += '\n})'
  
  return js
} 