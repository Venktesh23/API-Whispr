'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  GitCompare, 
  X, 
  Upload, 
  Loader2, 
  ArrowRight,
  Plus,
  Minus,
  Edit,
  FileText,
  AlertCircle
} from 'lucide-react'

export default function SpecComparer({ currentSpec, onClose }) {
  const [secondSpec, setSecondSpec] = useState('')
  const [isComparing, setIsComparing] = useState(false)
  const [comparisonResult, setComparisonResult] = useState(null)
  const [error, setError] = useState('')

  const handleSpecInput = (e) => {
    setSecondSpec(e.target.value)
    setError('')
  }

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      setSecondSpec(e.target.result)
      setError('')
    }
    reader.readAsText(file)
  }

  const compareSpecs = async () => {
    if (!secondSpec.trim()) {
      setError('Please provide a second API specification to compare')
      return
    }

    setIsComparing(true)
    setError('')

    try {
      const response = await fetch('/api/compare-specs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          originalSpec: JSON.stringify(currentSpec.parsed_spec || currentSpec.raw_text),
          newSpec: secondSpec,
          originalFilename: currentSpec.filename,
          specType: currentSpec.filetype
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to compare specifications')
      }

      const data = await response.json()
      setComparisonResult(data)
    } catch (err) {
      setError(err.message || 'Failed to compare specifications')
    } finally {
      setIsComparing(false)
    }
  }

  const getChangeIcon = (type) => {
    switch (type) {
      case 'added': return <Plus className="h-4 w-4 text-green-400" />
      case 'removed': return <Minus className="h-4 w-4 text-red-400" />
      case 'modified': return <Edit className="h-4 w-4 text-yellow-400" />
      default: return <FileText className="h-4 w-4 text-gray-400" />
    }
  }

  const getChangeColor = (type) => {
    switch (type) {
      case 'added': return 'bg-green-500/10 border-green-400/30 text-green-300'
      case 'removed': return 'bg-red-500/10 border-red-400/30 text-red-300'
      case 'modified': return 'bg-yellow-500/10 border-yellow-400/30 text-yellow-300'
      default: return 'bg-gray-500/10 border-gray-400/30 text-gray-300'
    }
  }

  return (
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
        className="bg-[#111] border border-gray-700/50 rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700/50">
          <div className="flex items-center gap-3">
            <GitCompare className="h-6 w-6 text-cyan-400" />
            <h2 className="text-xl font-bold text-white">GPT-Powered Spec Comparison</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {!comparisonResult ? (
            /* Input Section */
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Original Spec */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-200 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-400" />
                    Original Specification
                  </h3>
                  <div className="p-4 bg-blue-500/10 border border-blue-400/30 rounded-lg">
                    <p className="text-blue-300 font-medium">{currentSpec.filename}</p>
                    <p className="text-blue-200/80 text-sm mt-1">
                      {currentSpec.filetype?.toUpperCase()} • Currently loaded
                    </p>
                  </div>
                </div>

                {/* New Spec Input */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-200 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-green-400" />
                    New Specification
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <label className="flex-1">
                        <input
                          type="file"
                          accept=".json,.yaml,.yml"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="flex items-center gap-2 px-4 py-2 bg-gray-700/50 hover:bg-gray-600/50 border border-gray-600/30 rounded-lg cursor-pointer transition-colors"
                        >
                          <Upload className="h-4 w-4 text-gray-300" />
                          <span className="text-gray-300 text-sm">Upload File</span>
                        </motion.div>
                      </label>
                      <span className="text-gray-500 text-sm">or</span>
                    </div>
                    
                    <textarea
                      value={secondSpec}
                      onChange={handleSpecInput}
                      placeholder="Paste your OpenAPI JSON/YAML specification here..."
                      className="w-full h-32 p-4 bg-gray-900/50 border border-gray-600/30 rounded-lg text-gray-100 placeholder-gray-400 resize-none focus:border-green-400/50 focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-red-500/10 border border-red-400/30 rounded-lg flex items-center gap-3"
                >
                  <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
                  <p className="text-red-300">{error}</p>
                </motion.div>
              )}

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={compareSpecs}
                disabled={isComparing || !secondSpec.trim()}
                className="w-full px-6 py-4 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-all duration-200 font-semibold shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
              >
                {isComparing ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    AI is analyzing differences...
                  </>
                ) : (
                  <>
                    <GitCompare className="h-5 w-5" />
                    Compare with AI
                  </>
                )}
              </motion.button>
            </div>
          ) : (
            /* Results Section */
            <div className="space-y-6">
              {/* Summary */}
              <div className="p-4 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-400/30 rounded-lg">
                <h3 className="font-semibold text-cyan-200 mb-2">Comparison Summary</h3>
                <p className="text-cyan-100">{comparisonResult.summary}</p>
              </div>

              {/* Changes Grid */}
              <div className="grid md:grid-cols-3 gap-6">
                {/* New Endpoints */}
                {comparisonResult.newEndpoints && comparisonResult.newEndpoints.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-green-300 flex items-center gap-2">
                      <Plus className="h-5 w-5" />
                      New Endpoints ({comparisonResult.newEndpoints.length})
                    </h4>
                    <div className="space-y-2">
                      {comparisonResult.newEndpoints.map((endpoint, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="p-3 bg-green-500/10 border border-green-400/30 rounded-lg"
                        >
                          <p className="font-medium text-green-300">
                            {endpoint.method} {endpoint.path}
                          </p>
                          {endpoint.summary && (
                            <p className="text-green-200/80 text-sm mt-1">{endpoint.summary}</p>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Removed Endpoints */}
                {comparisonResult.removedEndpoints && comparisonResult.removedEndpoints.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-red-300 flex items-center gap-2">
                      <Minus className="h-5 w-5" />
                      Removed Endpoints ({comparisonResult.removedEndpoints.length})
                    </h4>
                    <div className="space-y-2">
                      {comparisonResult.removedEndpoints.map((endpoint, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="p-3 bg-red-500/10 border border-red-400/30 rounded-lg"
                        >
                          <p className="font-medium text-red-300">
                            {endpoint.method} {endpoint.path}
                          </p>
                          {endpoint.summary && (
                            <p className="text-red-200/80 text-sm mt-1">{endpoint.summary}</p>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Modified Endpoints */}
                {comparisonResult.modifiedEndpoints && comparisonResult.modifiedEndpoints.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-yellow-300 flex items-center gap-2">
                      <Edit className="h-5 w-5" />
                      Modified Endpoints ({comparisonResult.modifiedEndpoints.length})
                    </h4>
                    <div className="space-y-2">
                      {comparisonResult.modifiedEndpoints.map((endpoint, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="p-3 bg-yellow-500/10 border border-yellow-400/30 rounded-lg"
                        >
                          <p className="font-medium text-yellow-300">
                            {endpoint.method} {endpoint.path}
                          </p>
                          {endpoint.changes && (
                            <p className="text-yellow-200/80 text-sm mt-1">{endpoint.changes}</p>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Detailed Analysis */}
              {comparisonResult.detailedAnalysis && (
                <div className="p-4 bg-gray-800/30 border border-gray-600/30 rounded-lg">
                  <h4 className="font-semibold text-gray-200 mb-3">Detailed Analysis</h4>
                  <div className="prose prose-invert prose-sm max-w-none">
                    <p className="text-gray-300 leading-relaxed whitespace-pre-line">
                      {comparisonResult.detailedAnalysis}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setComparisonResult(null)
                    setSecondSpec('')
                  }}
                  className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-all duration-200"
                >
                  Compare Another
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onClose}
                  className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-white rounded-xl transition-all duration-200"
                >
                  Close
                </motion.button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
} 