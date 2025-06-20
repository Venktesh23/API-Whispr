'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Play, 
  Loader2, 
  Copy, 
  CheckCircle, 
  AlertTriangle,
  Key,
  Globe,
  Code,
  ChevronDown,
  ChevronRight,
  Zap
} from 'lucide-react'

export default function EndpointPlayground({ endpoint, currentSpec, onTokenCapture }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [requestUrl, setRequestUrl] = useState('')
  const [requestMethod, setRequestMethod] = useState(endpoint.method)
  const [requestHeaders, setRequestHeaders] = useState({
    'Content-Type': 'application/json'
  })
  const [requestBody, setRequestBody] = useState('')
  const [pathParams, setPathParams] = useState({})
  const [queryParams, setQueryParams] = useState({})
  const [response, setResponse] = useState(null)
  const [error, setError] = useState('')
  const [savedToken, setSavedToken] = useState('')

  useEffect(() => {
    // Initialize request URL
    const baseUrl = currentSpec?.parsed_spec?.servers?.[0]?.url || 'https://api.example.com'
    let url = baseUrl + endpoint.path
    
    // Replace path parameters with placeholders
    const pathParamMatches = endpoint.path.match(/\{([^}]+)\}/g)
    if (pathParamMatches) {
      const params = {}
      pathParamMatches.forEach(match => {
        const paramName = match.slice(1, -1)
        params[paramName] = `{${paramName}}`
      })
      setPathParams(params)
    }
    
    setRequestUrl(url)
  }, [endpoint, currentSpec])

  useEffect(() => {
    // Check for saved token from previous auth requests
    const token = sessionStorage.getItem('api_playground_token')
    if (token) {
      setSavedToken(token)
      setRequestHeaders(prev => ({
        ...prev,
        'Authorization': `Bearer ${token}`
      }))
    }
  }, [])

  const updateRequestUrl = () => {
    const baseUrl = currentSpec?.parsed_spec?.servers?.[0]?.url || 'https://api.example.com'
    let url = baseUrl + endpoint.path
    
    // Replace path parameters
    Object.entries(pathParams).forEach(([key, value]) => {
      if (value && value !== `{${key}}`) {
        url = url.replace(`{${key}}`, value)
      }
    })
    
    // Add query parameters
    const queryString = Object.entries(queryParams)
      .filter(([key, value]) => value)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&')
    
    if (queryString) {
      url += '?' + queryString
    }
    
    setRequestUrl(url)
  }

  const handlePathParamChange = (paramName, value) => {
    setPathParams(prev => ({
      ...prev,
      [paramName]: value
    }))
    updateRequestUrl()
  }

  const handleQueryParamChange = (paramName, value) => {
    setQueryParams(prev => ({
      ...prev,
      [paramName]: value
    }))
    updateRequestUrl()
  }

  const handleHeaderChange = (key, value) => {
    setRequestHeaders(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const sendRequest = async () => {
    setIsLoading(true)
    setError('')
    setResponse(null)

    try {
      const requestOptions = {
        method: requestMethod,
        headers: requestHeaders,
        mode: 'cors'
      }

      if (['POST', 'PUT', 'PATCH'].includes(requestMethod) && requestBody) {
        requestOptions.body = requestBody
      }

      console.log('🚀 Sending request:', { url: requestUrl, options: requestOptions })

      // Note: This will likely fail due to CORS for most real APIs
      // In a real implementation, you'd proxy through your backend
      const res = await fetch(requestUrl, requestOptions)
      
      const responseData = await res.text()
      let parsedData
      try {
        parsedData = JSON.parse(responseData)
      } catch (e) {
        parsedData = responseData
      }

      const responseObj = {
        status: res.status,
        statusText: res.statusText,
        headers: Object.fromEntries(res.headers.entries()),
        data: parsedData
      }

      setResponse(responseObj)

      // Check for auth tokens in response for simulation
      if (endpoint.path.includes('login') || endpoint.path.includes('auth')) {
        let token = null
        
        // Look for token in response body
        if (typeof parsedData === 'object') {
          token = parsedData.token || parsedData.access_token || parsedData.accessToken || parsedData.jwt
        }
        
        // Look for token in headers
        if (!token) {
          const authHeader = responseObj.headers['authorization'] || responseObj.headers['Authorization']
          if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7)
          }
        }

        if (token) {
          sessionStorage.setItem('api_playground_token', token)
          setSavedToken(token)
          if (onTokenCapture) {
            onTokenCapture(token)
          }
        }
      }

    } catch (err) {
      console.error('Request failed:', err)
      setError(err.message || 'Request failed. This might be due to CORS restrictions or network issues.')
    } finally {
      setIsLoading(false)
    }
  }

  const copyResponse = () => {
    if (response) {
      navigator.clipboard.writeText(JSON.stringify(response, null, 2))
    }
  }

  const generateCurlCommand = () => {
    let curl = `curl -X ${requestMethod} "${requestUrl}"`
    
    Object.entries(requestHeaders).forEach(([key, value]) => {
      curl += ` \\\n  -H "${key}: ${value}"`
    })
    
    if (['POST', 'PUT', 'PATCH'].includes(requestMethod) && requestBody) {
      curl += ` \\\n  -d '${requestBody}'`
    }
    
    return curl
  }

  // Extract parameters from endpoint definition
  const pathParameters = endpoint.parameters?.filter(p => p.in === 'path') || []
  const queryParameters = endpoint.parameters?.filter(p => p.in === 'query') || []
  const headerParameters = endpoint.parameters?.filter(p => p.in === 'header') || []

  return (
    <div className="border border-gray-700/30 rounded-xl overflow-hidden bg-gray-800/20">
      <motion.button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 text-left hover:bg-gray-700/20 transition-colors flex items-center justify-between"
        whileHover={{ backgroundColor: 'rgba(55, 65, 81, 0.2)' }}
      >
        <div className="flex items-center gap-3">
          <Play className="h-5 w-5 text-green-400" />
          <span className="font-medium text-gray-200">Interactive Playground</span>
          {savedToken && (
            <span className="px-2 py-1 bg-green-500/20 text-green-300 rounded text-xs flex items-center gap-1">
              <Key className="h-3 w-3" />
              Token Ready
            </span>
          )}
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 90 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronRight className="h-5 w-5 text-gray-400" />
        </motion.div>
      </motion.button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="border-t border-gray-700/30"
          >
            <div className="p-6 space-y-6">
              {/* Request URL */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-200 flex items-center gap-2">
                  <Globe className="h-4 w-4 text-gray-400" />
                  Request URL
                </h4>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded font-medium text-sm ${
                    endpoint.method === 'GET' ? 'bg-green-500/20 text-green-300' :
                    endpoint.method === 'POST' ? 'bg-gray-700/20 text-gray-300' :
                    endpoint.method === 'PUT' ? 'bg-orange-500/20 text-orange-300' :
                    endpoint.method === 'DELETE' ? 'bg-red-500/20 text-red-300' :
                    'bg-gray-500/20 text-gray-300'
                  }`}>
                    {requestMethod}
                  </span>
                  <input
                    type="text"
                    value={requestUrl}
                    onChange={(e) => setRequestUrl(e.target.value)}
                    className="flex-1 px-3 py-2 bg-gray-900/50 border border-gray-600/30 rounded-lg text-gray-100 text-sm focus:border-gray-500/50 focus:outline-none"
                  />
                </div>
              </div>

              {/* Path Parameters */}
              {pathParameters.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-200">Path Parameters</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {pathParameters.map((param, index) => (
                      <div key={index} className="space-y-1">
                        <label className="text-sm text-gray-300 flex items-center gap-2">
                          {param.name}
                          {param.required && <span className="text-red-400">*</span>}
                        </label>
                        <input
                          type="text"
                          placeholder={param.description || `Enter ${param.name}`}
                          value={pathParams[param.name] || ''}
                          onChange={(e) => handlePathParamChange(param.name, e.target.value)}
                          className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600/30 rounded-lg text-gray-100 text-sm focus:border-gray-500/50 focus:outline-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Query Parameters */}
              {queryParameters.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-200">Query Parameters</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {queryParameters.map((param, index) => (
                      <div key={index} className="space-y-1">
                        <label className="text-sm text-gray-300 flex items-center gap-2">
                          {param.name}
                          {param.required && <span className="text-red-400">*</span>}
                        </label>
                        <input
                          type="text"
                          placeholder={param.description || `Enter ${param.name}`}
                          value={queryParams[param.name] || ''}
                          onChange={(e) => handleQueryParamChange(param.name, e.target.value)}
                          className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600/30 rounded-lg text-gray-100 text-sm focus:border-gray-500/50 focus:outline-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Headers */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-200">Headers</h4>
                <div className="space-y-2">
                  {Object.entries(requestHeaders).map(([key, value], index) => (
                    <div key={index} className="grid grid-cols-5 gap-3">
                      <input
                        type="text"
                        value={key}
                        onChange={(e) => {
                          const newHeaders = { ...requestHeaders }
                          delete newHeaders[key]
                          newHeaders[e.target.value] = value
                          setRequestHeaders(newHeaders)
                        }}
                        className="col-span-2 px-3 py-2 bg-gray-900/50 border border-gray-600/30 rounded-lg text-gray-100 text-sm focus:border-gray-500/50 focus:outline-none"
                        placeholder="Header name"
                      />
                      <input
                        type="text"
                        value={value}
                        onChange={(e) => handleHeaderChange(key, e.target.value)}
                        className="col-span-3 px-3 py-2 bg-gray-900/50 border border-gray-600/30 rounded-lg text-gray-100 text-sm focus:border-gray-500/50 focus:outline-none"
                        placeholder="Header value"
                      />
                    </div>
                  ))}
                  <button
                    onClick={() => setRequestHeaders(prev => ({ ...prev, '': '' }))}
                    className="text-sm text-gray-400 hover:text-gray-300 transition-colors"
                  >
                    + Add Header
                  </button>
                </div>
              </div>

              {/* Request Body */}
              {['POST', 'PUT', 'PATCH'].includes(requestMethod) && (
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-200">Request Body (JSON)</h4>
                  <textarea
                    value={requestBody}
                    onChange={(e) => setRequestBody(e.target.value)}
                    placeholder='{"example": "data"}'
                    className="w-full h-32 px-3 py-2 bg-gray-900/50 border border-gray-600/30 rounded-lg text-gray-100 text-sm font-mono focus:border-gray-500/50 focus:outline-none resize-none"
                  />
                </div>
              )}

              {/* Send Button */}
              <div className="flex items-center gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={sendRequest}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-all duration-200 font-semibold shadow-lg hover:shadow-xl"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Play className="h-5 w-5" />
                      Send Request
                    </>
                  )}
                </motion.button>
                
                <button
                  onClick={() => navigator.clipboard.writeText(generateCurlCommand())}
                  className="flex items-center gap-2 px-4 py-3 bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 rounded-xl transition-colors"
                >
                  <Code className="h-4 w-4" />
                  Copy cURL
                </button>
              </div>

              {/* Error Display */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-red-500/10 border border-red-400/30 rounded-lg flex items-start gap-3"
                >
                  <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-medium text-red-200 mb-1">Request Failed</h5>
                    <p className="text-red-300 text-sm">{error}</p>
                    <p className="text-red-200/80 text-xs mt-2">
                      Note: Most external APIs block requests due to CORS. Try using a proxy or the cURL command instead.
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Response Display */}
              {response && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-gray-200 flex items-center gap-2">
                      <Zap className="h-4 w-4 text-yellow-400" />
                      Response
                    </h4>
                    <button
                      onClick={copyResponse}
                      className="flex items-center gap-2 px-3 py-1 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg transition-colors text-sm"
                    >
                      <Copy className="h-4 w-4" />
                      Copy
                    </button>
                  </div>
                  
                  <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-600/30">
                    <div className="flex items-center gap-4 mb-3 pb-3 border-b border-gray-700/30">
                      <span className={`px-2 py-1 rounded text-sm font-medium ${
                        response.status < 300 ? 'bg-green-500/20 text-green-300' :
                        response.status < 400 ? 'bg-yellow-500/20 text-yellow-300' :
                        'bg-red-500/20 text-red-300'
                      }`}>
                        {response.status} {response.statusText}
                      </span>
                    </div>
                    
                    <pre className="text-gray-300 text-sm overflow-x-auto">
                      {JSON.stringify(response.data, null, 2)}
                    </pre>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
} 