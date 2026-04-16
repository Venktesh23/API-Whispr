'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Download, Copy, CheckCircle } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

export default function ChangelogModal({ changelog, isOpen, onClose, version, date, changeStats }) {
  const [copied, setCopied] = useState(false)

  const downloadChangelog = () => {
    if (!changelog) return

    const element = document.createElement('a')
    const file = new Blob([changelog], { type: 'text/markdown' })
    element.href = URL.createObjectURL(file)
    element.download = `CHANGELOG-${version || 'v1.0.0'}.md`
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  const copyToClipboard = () => {
    if (!changelog) return
    navigator.clipboard.writeText(changelog)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-gradient-to-br from-[#1a1a1a] to-[#151515] border border-[#2a2a2a] rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-[#2a2a2a] flex items-center justify-between bg-[#0d0d0d]/50">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  📝 Generated Changelog
                  {version && (
                    <span className="text-sm px-3 py-1 bg-white/5 border border-[#444] text-[#aaa] rounded-full">
                      {version}
                    </span>
                  )}
                </h2>
                {date && (
                  <p className="text-sm text-[#999] mt-2">Generated: {new Date(date).toLocaleDateString()}</p>
                )}
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="p-2 hover:bg-[#2a2a2a] rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-[#999]" />
              </motion.button>
            </div>

            {/* Stats */}
            {changeStats && (
              <div className="px-6 py-4 bg-[#0d0d0d]/30 border-b border-[#2a2a2a] flex gap-6">
                <div className="flex items-center gap-2">
                  <span className="text-green-400 font-semibold">{changeStats.newEndpoints}</span>
                  <span className="text-[#666]">New Endpoints</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-red-400 font-semibold">{changeStats.removedEndpoints}</span>
                  <span className="text-[#666]">Removed Endpoints</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-yellow-500 font-semibold">{changeStats.modifiedEndpoints}</span>
                  <span className="text-[#666]">Modified Endpoints</span>
                </div>
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div className="prose prose-invert max-w-none text-sm">
                <ReactMarkdown
                  components={{
                    h1: ({ children }) => <h1 className="text-3xl font-bold text-white mb-6 mt-0">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-2xl font-bold text-white mt-6 mb-3">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-lg font-semibold text-white mt-4 mb-2">{children}</h3>,
                    p: ({ children }) => <p className="text-[#ccc] mb-3 leading-relaxed">{children}</p>,
                    ul: ({ children }) => <ul className="list-disc list-inside text-[#ccc] mb-4 space-y-2">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal list-inside text-[#ccc] mb-4 space-y-2">{children}</ol>,
                    li: ({ children }) => <li className="text-[#ccc]">{children}</li>,
                    code: ({ children }) => (
                      <code className="bg-[#0a0a0a] text-[#e8e8e8] px-2 py-1 rounded font-mono text-xs">
                        {children}
                      </code>
                    ),
                    pre: ({ children }) => (
                      <pre className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-4 overflow-x-auto mb-4">
                        {children}
                      </pre>
                    ),
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-4 border-[#444] pl-4 text-[#999] italic my-4">
                        {children}
                      </blockquote>
                    ),
                    strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
                    em: ({ children }) => <em className="text-[#bbb] italic">{children}</em>,
                  }}
                >
                  {changelog}
                </ReactMarkdown>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-[#2a2a2a] bg-[#0d0d0d]/50 flex gap-3 justify-end">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={copyToClipboard}
                className="px-4 py-2 bg-[#2a2a2a] hover:bg-[#333] rounded-lg text-white font-medium transition-colors flex items-center gap-2"
              >
                {copied ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy to Clipboard
                  </>
                )}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={downloadChangelog}
                className="px-4 py-2 bg-white hover:bg-white/90 text-[#0d0d0d] rounded-lg font-semibold transition-colors flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download as Markdown
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onClose}
                className="px-4 py-2 bg-[#2a2a2a] hover:bg-[#333] rounded-lg text-white font-medium transition-colors"
              >
                Close
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
