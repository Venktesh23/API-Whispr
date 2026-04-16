'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Copy,
  CheckCircle,
  Code2,
  Loader2,
  Download,
} from 'lucide-react'
import SafeCodeDisplay from './SafeCodeDisplay'

export default function TestCaseModal({ endpoint, onClose, isOpen }) {
  const [testCases, setTestCases] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('jest')
  const [copiedTab, setCopiedTab] = useState('')

  const generateTests = async () => {
    if (loading || testCases) return

    setLoading(true)
    setError('')

    try {
      const storedSpec = sessionStorage.getItem('currentSpec')
      if (!storedSpec) {
        setError('Specification not found. Please reload the page.')
        setLoading(false)
        return
      }

      const spec = JSON.parse(storedSpec)

      const response = await fetch('/api/generate-tests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint,
          spec,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate test cases')
      }

      const data = await response.json()
      setTestCases(data)
    } catch (err) {
      console.error('Test generation error:', err)
      setError(err.message || 'Failed to generate test cases')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (code) => {
    navigator.clipboard.writeText(code)
    setCopiedTab(activeTab)
    setTimeout(() => setCopiedTab(''), 2000)
  }

  const downloadTestFile = (code, format) => {
    const extension =
      format === 'jest' ? '.test.js' : format === 'pytest' ? '.py' : '.json'
    const filename = `${endpoint.method.toLowerCase()}-${endpoint.path
      .replace(/[^a-z0-9]/gi, '-')
      .toLowerCase()}${extension}`

    const element = document.createElement('a')
    element.setAttribute(
      'href',
      `data:text/plain;charset=utf-8,${encodeURIComponent(code)}`
    )
    element.setAttribute('download', filename)
    element.style.display = 'none'
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-[#2a2a2a]">
            <div className="flex items-center gap-3">
              <Code2 className="h-6 w-6 text-[#888]" />
              <div>
                <h2 className="text-xl font-bold text-white">Generate Tests</h2>
                <p className="text-gray-400 text-sm">
                  {endpoint.method} {endpoint.path}
                </p>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={onClose}
              className="p-2 hover:bg-[#2a2a2a] rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-400" />
            </motion.button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {!testCases ? (
              <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                {loading ? (
                  <>
                    <Loader2 className="h-12 w-12 animate-spin text-[#888]" />
                    <p className="text-gray-300">
                      Generating test cases with AI...
                    </p>
                  </>
                ) : error ? (
                  <>
                    <p className="text-red-400 text-center">{error}</p>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={generateTests}
                      className="px-6 py-2 bg-white text-[#0d0d0d] rounded-lg font-medium hover:bg-white/90 transition-colors"
                    >
                      Try Again
                    </motion.button>
                  </>
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={generateTests}
                    className="px-8 py-3 bg-white text-[#0d0d0d] rounded-lg font-semibold hover:bg-white/90 transition-colors"
                  >
                    Generate Test Cases
                  </motion.button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Tabs */}
                <div className="flex gap-2 border-b border-[#2a2a2a] pb-4">
                  {['jest', 'pytest', 'postman'].map((tab) => (
                    <motion.button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                        activeTab === tab
                          ? 'bg-white text-[#0d0d0d]'
                          : 'bg-[#1a1a1a] text-[#999] border border-[#2a2a2a] hover:border-[#555]'
                      }`}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </motion.button>
                  ))}
                </div>

                {/* Code Display */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">
                      {activeTab === 'jest'
                        ? 'Jest Test (JavaScript/TypeScript)'
                        : activeTab === 'pytest'
                        ? 'Pytest (Python)'
                        : 'Postman Collection'}
                    </span>
                    <div className="flex gap-2">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() =>
                          downloadTestFile(
                            typeof testCases[activeTab] === 'string'
                              ? testCases[activeTab]
                              : JSON.stringify(testCases[activeTab], null, 2),
                            activeTab
                          )
                        }
                        className="flex items-center gap-2 px-3 py-1 bg-[#1a1a1a] border border-[#2a2a2a] text-gray-300 rounded-lg text-sm hover:bg-[#222] transition-all"
                      >
                        <Download className="h-4 w-4" />
                        Download
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() =>
                          copyToClipboard(
                            typeof testCases[activeTab] === 'string'
                              ? testCases[activeTab]
                              : JSON.stringify(testCases[activeTab], null, 2)
                          )
                        }
                        className="flex items-center gap-2 px-3 py-1 bg-white/5 border border-[#444] text-[#ccc] rounded-lg text-sm hover:bg-white/10 transition-all"
                      >
                        {copiedTab === activeTab ? (
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
                  </div>

                  <div className="rounded-lg overflow-hidden border border-[#2a2a2a]">
                    <SafeCodeDisplay
                      code={
                        typeof testCases[activeTab] === 'string'
                          ? testCases[activeTab]
                          : JSON.stringify(testCases[activeTab], null, 2)
                      }
                      language={
                        activeTab === 'jest'
                          ? 'javascript'
                          : activeTab === 'pytest'
                          ? 'python'
                          : 'json'
                      }
                      customStyle={{
                        margin: 0,
                        background: '#0a0a0a',
                        fontSize: '13px',
                        maxHeight: '500px',
                      }}
                    />
                  </div>
                </div>

                {/* Info Box */}
                <div className="p-4 bg-white/5 border border-[#2a2a2a] rounded-lg">
                  <p className="text-xs text-gray-400 leading-relaxed">
                    These are AI-generated test cases. Review and customize them
                    based on your specific requirements. Update base URLs,
                    authentication, and test scenarios as needed.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-[#2a2a2a] p-4 flex justify-end gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onClose}
              className="px-4 py-2 bg-[#1a1a1a] border border-[#2a2a2a] text-gray-300 rounded-lg font-medium hover:bg-[#222] transition-colors"
            >
              Close
            </motion.button>
            {testCases && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setTestCases(null)
                  setActiveTab('jest')
                }}
                className="px-4 py-2 bg-white text-[#0d0d0d] rounded-lg font-medium hover:bg-white/90 transition-colors"
              >
                Generate New
              </motion.button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
