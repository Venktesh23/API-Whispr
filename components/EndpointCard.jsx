'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ChevronDown, 
  ChevronRight, 
  Lock, 
  Tag, 
  Hash,
  FileText,
  Code2,
  Copy,
  CheckCircle,
  Play,
  AlertCircle,
  Info
} from 'lucide-react'
import SafeCodeDisplay from './SafeCodeDisplay'
import EndpointPlayground from './EndpointPlayground'
import AutoTagEndpoints from './AutoTagEndpoints'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

const methodColors = {
  GET: 'bg-[#00FF9C]/10 text-[#00FF9C] border-[#00FF9C] shadow-[0_0_6px_#00FF9C]',
  POST: 'bg-gray-700/20 text-gray-300 border-gray-600',
  PUT: 'bg-orange-500/10 text-orange-400 border-orange-500',
  PATCH: 'bg-purple-500/10 text-purple-400 border-purple-500',
  DELETE: 'bg-red-500/10 text-red-400 border-red-500'
}

export default function EndpointCard({ endpoint, currentSpec, index = 0 }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [copiedCode, setCopiedCode] = useState('')

  const getMethodColor = (method) => {
    const colors = {
      'GET': 'bg-[#00FF9C]/10 text-[#00FF9C] border-[#00FF9C] shadow-[0_0_6px_#00FF9C]',
      'POST': 'bg-gray-700/20 text-gray-300 border-gray-600',
      'PUT': 'bg-orange-500/10 text-orange-400 border-orange-500',
      'DELETE': 'bg-red-500/10 text-red-400 border-red-500',
      'PATCH': 'bg-purple-500/10 text-purple-400 border-purple-500'
    }
    return colors[method] || 'bg-[#2a2a2a] text-[#999] border-[#2a2a2a]'
  }

  const copyToClipboard = (text, identifier) => {
    navigator.clipboard.writeText(text)
    setCopiedCode(identifier)
    setTimeout(() => setCopiedCode(''), 2000)
  }

  const hasAuth = endpoint.security && endpoint.security.length > 0
  const methodColorClass = methodColors[endpoint.method] || 'bg-[#2a2a2a] text-[#999] border-[#2a2a2a]'

  // Generate quick cURL example
  const generateCurlCommand = () => {
    const baseUrl = currentSpec?.parsed_spec?.servers?.[0]?.url || 'https://api.example.com'
    let curlCommand = `curl -X ${endpoint.method} "${baseUrl}${endpoint.path}"`
    
    if (hasAuth) {
      curlCommand += ` \\\n  -H "Authorization: Bearer YOUR_TOKEN"`
    }
    
    curlCommand += ` \\\n  -H "Content-Type: application/json"`
    
    if (endpoint.method === 'POST' || endpoint.method === 'PUT' || endpoint.method === 'PATCH') {
      curlCommand += ` \\\n  -d '{"key": "value"}'`
    }
    
    return curlCommand
  }

  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg hover:bg-[#1f1f1f] transition-all duration-300 shadow-lg">
      <div 
        className="p-6 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <span className={`px-3 py-1 rounded-lg text-xs font-semibold border ${getMethodColor(endpoint.method)}`}>
              {endpoint.method}
            </span>
            
            <div className="flex-1 min-w-0">
              <code className="text-[#00FF9C] font-mono text-sm break-all">
                {endpoint.path}
              </code>
              {endpoint.summary && (
                <p className="text-[#e0e0e0] text-sm mt-1 truncate">
                  {endpoint.summary}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {endpoint.tags && endpoint.tags.length > 0 && (
              <div className="flex gap-1">
                {endpoint.tags.slice(0, 2).map((tag, i) => (
                  <span 
                    key={i}
                    className="px-2 py-1 bg-[#00FF9C]/10 border border-[#00FF9C] text-[#00FF9C] text-xs rounded-full shadow-[0_0_4px_#00FF9C]"
                  >
                    {tag}
                  </span>
                ))}
                {endpoint.tags.length > 2 && (
                  <span className="px-2 py-1 bg-[#2a2a2a] text-[#999] text-xs rounded-full">
                    +{endpoint.tags.length - 2}
                  </span>
                )}
              </div>
            )}
            
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="h-5 w-5 text-[#666]" />
            </motion.div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="border-t border-[#2a2a2a] overflow-hidden"
          >
            <div className="p-6 space-y-6">
              {/* Description */}
              {endpoint.description && (
                <div>
                  <h4 className="text-sm font-medium text-white mb-2">Description</h4>
                  <p className="text-[#e0e0e0] text-sm leading-relaxed">
                    {endpoint.description}
                  </p>
                </div>
              )}

              {/* Parameters */}
              {endpoint.parameters && endpoint.parameters.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-white mb-3">Parameters</h4>
                  <div className="space-y-2">
                    {endpoint.parameters.map((param, paramIndex) => (
                      <div 
                        key={paramIndex}
                        className="flex items-start justify-between p-3 bg-[#151515] border border-[#2a2a2a] rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <code className="text-[#00FF9C] font-mono text-sm">
                              {param.name}
                            </code>
                            {param.required && (
                              <span className="text-red-400 text-xs font-medium">required</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-[#999]">
                            <span className="px-2 py-1 bg-[#2a2a2a] rounded">
                              {param.in}
                            </span>
                            <span className="px-2 py-1 bg-[#2a2a2a] rounded">
                              {param.schema?.type || param.type || 'string'}
                            </span>
                          </div>
                          {param.description && (
                            <p className="text-[#e0e0e0] text-sm mt-2">
                              {param.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Request Body */}
              {endpoint.requestBody && (
                <div>
                  <h4 className="text-sm font-medium text-white mb-3">Request Body</h4>
                  <div className="p-3 bg-[#151515] border border-[#2a2a2a] rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[#00FF9C] text-sm font-medium">JSON</span>
                      {endpoint.requestBody.required && (
                        <span className="text-red-400 text-xs font-medium">required</span>
                      )}
                    </div>
                    {endpoint.requestBody.description && (
                      <p className="text-[#e0e0e0] text-sm">
                        {endpoint.requestBody.description}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Responses */}
              {endpoint.responses && Object.keys(endpoint.responses).length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-white mb-3">Responses</h4>
                  <div className="space-y-2">
                    {Object.entries(endpoint.responses).map(([statusCode, response]) => (
                      <div 
                        key={statusCode}
                        className="flex items-start justify-between p-3 bg-[#151515] border border-[#2a2a2a] rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-1 text-xs font-semibold rounded ${
                            statusCode.startsWith('2') ? 'bg-[#00FF9C]/10 text-[#00FF9C] border border-[#00FF9C]' :
                            statusCode.startsWith('4') ? 'bg-orange-500/10 text-orange-400 border border-orange-500' :
                            statusCode.startsWith('5') ? 'bg-red-500/10 text-red-400 border border-red-500' :
                            'bg-[#2a2a2a] text-[#999] border border-[#2a2a2a]'
                          }`}>
                            {statusCode}
                          </span>
                          <span className="text-[#e0e0e0] text-sm">
                            {response.description || 'No description'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-[#2a2a2a]">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => copyToClipboard(generateCurlCommand(), `curl-${index}`)}
                  className="flex items-center gap-2 px-4 py-2 bg-[#00FF9C]/10 border border-[#00FF9C] text-[#00FF9C] rounded-lg transition-all duration-300 text-sm font-medium hover:bg-[#00FF9C]/20 shadow-[0_0_6px_#00FF9C]"
                >
                  {copiedCode === `curl-${index}` ? (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy cURL
                    </>
                  )}
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 text-white rounded-lg transition-all duration-300 text-sm font-medium"
                >
                  <Play className="h-4 w-4" />
                  Test Endpoint
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Auto-Tag Endpoints */}
      <AutoTagEndpoints 
        endpoint={endpoint} 
        currentSpec={currentSpec}
        onTagApplied={(endpoint, tag) => {
          console.log(`Tag "${tag}" applied to ${endpoint.method} ${endpoint.path}`)
          // This could trigger a re-fetch or local state update
        }}
      />

      {/* Interactive Playground */}
      <EndpointPlayground 
        endpoint={endpoint} 
        currentSpec={currentSpec}
        onTokenCapture={(token) => {
          console.log('Token captured:', token)
          // This will be handled by the playground component
        }}
      />
    </div>
  )
} 