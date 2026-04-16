'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Copy,
  CheckCircle,
  Code2,
  Terminal,
  ArrowRight,
  AlertCircle,
} from 'lucide-react'

export default function RequestBuilderResult({ request, onClose }) {
  const [copied, setCopied] = useState('')

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(''), 2000)
  }

  if (!request.found) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 bg-yellow-500/5 border border-yellow-400/30 rounded-xl"
      >
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-yellow-300">No Matching Endpoint Found</h3>
            <p className="text-yellow-200/80 text-sm mt-1">
              {request.message || 'Could not find an endpoint matching that description.'}
            </p>
          </div>
        </div>
      </motion.div>
    )
  }

  const buildCurlCommand = () => {
    let curl = `curl -X ${request.method} "${request.url}"`

    Object.entries(request.headers || {}).forEach(([key, value]) => {
      curl += ` \\\n  -H "${key}: ${value}"`
    })

    Object.entries(request.queryParams || {}).forEach(([key, value]) => {
      const separator = curl.includes('?') ? '&' : '?'
      curl += `${separator}${key}=${encodeURIComponent(value.example)}`
    })

    if (request.requestBody && Object.keys(request.requestBody).length > 0) {
      curl += ` \\\n  -d '${JSON.stringify(request.requestBody, null, 2)}'`
    }

    return curl
  }

  const buildFetchCommand = () => {
    const options = {
      method: request.method,
      headers: request.headers || {},
    }

    if (request.requestBody && Object.keys(request.requestBody).length > 0) {
      options.body = JSON.stringify(request.requestBody)
    }

    return `fetch("${request.url}", ${JSON.stringify(options, null, 2)})\n  .then(res => res.json())\n  .then(data => console.log(data))`
  }

  const curlCommand = buildCurlCommand()
  const fetchCommand = buildFetchCommand()

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Summary */}
      <div className="p-6 bg-gradient-to-br from-[#1a1a1a] to-[#151515] border border-[#2a2a2a] rounded-xl">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-lg font-semibold text-white">
              {request.method} {request.path}
            </h3>
            <p className="text-[#aaa] font-mono text-sm mt-1">{request.url}</p>
          </div>
        </div>
        {request.summary && (
          <p className="text-gray-300 text-sm mt-3">{request.summary}</p>
        )}
        {request.reasonForMatch && (
          <p className="text-gray-400 text-xs mt-2 italic">
            ✓ {request.reasonForMatch}
          </p>
        )}
      </div>

      {/* Parameters Section */}
      {(Object.keys(request.pathParams || {}).length > 0 ||
        Object.keys(request.queryParams || {}).length > 0) && (
        <div className="space-y-4">
          {/* Path Parameters */}
          {Object.keys(request.pathParams || {}).length > 0 && (
            <div className="p-4 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg">
              <h4 className="text-sm font-semibold text-white mb-3">Path Parameters</h4>
              <div className="space-y-2">
                {Object.entries(request.pathParams).map(([key, param]) => (
                  <div key={key} className="flex items-center gap-3">
                    <code className="text-[#e8e8e8] font-mono text-sm flex-1">{key}</code>
                    <span className="text-gray-400 text-xs bg-[#1a1a1a] px-2 py-1 rounded">
                      {param.type}
                    </span>
                    <code className="text-gray-300 font-mono text-sm">{param.example}</code>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Query Parameters */}
          {Object.keys(request.queryParams || {}).length > 0 && (
            <div className="p-4 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg">
              <h4 className="text-sm font-semibold text-white mb-3">Query Parameters</h4>
              <div className="space-y-2">
                {Object.entries(request.queryParams).map(([key, param]) => (
                  <div key={key} className="flex items-center gap-3">
                    <code className="text-[#e8e8e8] font-mono text-sm flex-1">{key}</code>
                    <span className="text-gray-400 text-xs bg-[#1a1a1a] px-2 py-1 rounded">
                      {param.type}
                    </span>
                    <code className="text-gray-300 font-mono text-sm">{param.example}</code>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Request Body */}
      {request.requestBody && Object.keys(request.requestBody).length > 0 && (
        <div className="p-4 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg">
          <h4 className="text-sm font-semibold text-white mb-3">Request Body</h4>
          <pre className="text-gray-300 text-sm font-mono bg-[#0a0a0a] p-3 rounded overflow-x-auto border border-[#1a1a1a]">
            {JSON.stringify(request.requestBody, null, 2)}
          </pre>
        </div>
      )}

      {/* cURL Command */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-[#888]" />
            <h4 className="text-sm font-semibold text-white">cURL Command</h4>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => copyToClipboard(curlCommand, 'curl')}
            className="flex items-center gap-2 px-3 py-1 bg-white/5 border border-[#444] text-[#ccc] rounded-lg text-sm hover:bg-white/10 transition-all"
          >
            {copied === 'curl' ? (
              <>
                <CheckCircle className="h-4 w-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy
              </>
            )}
          </motion.button>
        </div>
        <pre className="text-gray-300 text-sm font-mono bg-[#0a0a0a] p-4 rounded border border-[#2a2a2a] overflow-x-auto">
          {curlCommand}
        </pre>
      </div>

      {/* Fetch Command */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Code2 className="h-4 w-4 text-[#888]" />
            <h4 className="text-sm font-semibold text-white">JavaScript Fetch</h4>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => copyToClipboard(fetchCommand, 'fetch')}
            className="flex items-center gap-2 px-3 py-1 bg-white/5 border border-[#444] text-[#ccc] rounded-lg text-sm hover:bg-white/10 transition-all"
          >
            {copied === 'fetch' ? (
              <>
                <CheckCircle className="h-4 w-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy
              </>
            )}
          </motion.button>
        </div>
        <pre className="text-gray-300 text-sm font-mono bg-[#0a0a0a] p-4 rounded border border-[#2a2a2a] overflow-x-auto">
          {fetchCommand}
        </pre>
      </div>

      {/* Close Button */}
      {onClose && (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onClose}
          className="w-full py-2 bg-[#1a1a1a] border border-[#2a2a2a] text-gray-300 rounded-lg hover:bg-[#222] transition-colors"
        >
          Close
        </motion.button>
      )}
    </motion.div>
  )
}
