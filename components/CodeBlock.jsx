'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

export default function CodeBlock({ code, language = 'text' }) {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const getLanguageLabel = (lang) => {
    const labels = {
      'bash': 'Bash',
      'python': 'Python',
      'javascript': 'JavaScript',
      'json': 'JSON',
      'yaml': 'YAML'
    }
    return labels[lang] || lang.toUpperCase()
  }

  return (
    <div className="relative bg-black rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800">
        <span className="text-xs text-gray-400 font-mono">
          {getLanguageLabel(language)}
        </span>
        <button
          onClick={copyToClipboard}
          className="flex items-center space-x-1 text-gray-400 hover:text-white transition-colors text-xs"
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          <span>{copied ? 'Copied!' : 'Copy'}</span>
        </button>
      </div>
      
      <div className="p-4 overflow-x-auto">
        <pre className="text-sm text-gray-300 font-mono whitespace-pre-wrap">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  )
} 