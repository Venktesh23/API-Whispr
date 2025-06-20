'use client'

import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

export default function SafeCodeDisplay({ 
  code, 
  language = 'text', 
  customStyle = {}, 
  ...props 
}) {
  // Safely convert any input to string
  const safeCode = (() => {
    if (typeof code === 'string') return code
    if (code === null || code === undefined) return '// No code available'
    if (typeof code === 'object') {
      try {
        return JSON.stringify(code, null, 2)
      } catch (e) {
        return '// Invalid object structure'
      }
    }
    return String(code)
  })()

  // Ensure we have valid code to display
  if (!safeCode || safeCode.trim().length === 0) {
    return (
      <div className="bg-gray-900/50 rounded-lg p-4 text-gray-400 text-sm text-center">
        No code example available
      </div>
    )
  }

  const defaultStyle = {
    margin: 0,
    background: 'rgba(0,0,0,0.3)',
    fontSize: '14px',
    ...customStyle
  }

  return (
    <SyntaxHighlighter
      language={language === 'curl' ? 'bash' : language}
      style={oneDark}
      customStyle={defaultStyle}
      {...props}
    >
      {safeCode}
    </SyntaxHighlighter>
  )
} 