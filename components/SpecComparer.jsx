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
  AlertCircle,
  BookOpen,
  LayoutList,
  Columns
} from 'lucide-react'
import ChangelogModal from './ChangelogModal'

export default function SpecComparer({ currentSpec, onClose }) {
  const [secondSpec, setSecondSpec] = useState('')
  const [isComparing, setIsComparing] = useState(false)
  const [comparisonResult, setComparisonResult] = useState(null)
  const [error, setError] = useState('')
  const [showChangelogModal, setShowChangelogModal] = useState(false)
  const [generatingChangelog, setGeneratingChangelog] = useState(false)
  const [generatedChangelog, setGeneratedChangelog] = useState(null)
  const [viewMode, setViewMode] = useState('list') // 'list' or 'diff'

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

  const generateChangelog = async () => {
    if (!comparisonResult) return

    setGeneratingChangelog(true)
    try {
      const response = await fetch('/api/generate-changelog', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          originalFilename: currentSpec.filename,
          newEndpoints: comparisonResult.newEndpoints || [],
          removedEndpoints: comparisonResult.removedEndpoints || [],
          modifiedEndpoints: comparisonResult.modifiedEndpoints || [],
          version: '1.0.0',
          date: new Date().toISOString().split('T')[0],
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate changelog')
      }

      const data = await response.json()
      setGeneratedChangelog(data)
      setShowChangelogModal(true)
    } catch (err) {
      setError(err.message || 'Failed to generate changelog')
    } finally {
      setGeneratingChangelog(false)
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
            <GitCompare className="h-6 w-6 text-[#888]" />
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
                    <FileText className="h-5 w-5 text-[#888]" />
                    Original Specification
                  </h3>
                  <div className="p-4 bg-white/5 border border-[#444] rounded-lg">
                    <p className="text-[#ccc] font-medium">{currentSpec.filename}</p>
                    <p className="text-[#888] text-sm mt-1">
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
              {/* Summary with Severity Counts */}
              <div className="space-y-4">
                <div className="p-4 bg-white/5 border border-[#444] rounded-lg">
                  <h3 className="font-semibold text-[#ccc] mb-2">Comparison Summary</h3>
                  <p className="text-[#e0e0e0]">{comparisonResult.summary}</p>
                </div>

                {/* Severity Badges */}
                <div className="grid md:grid-cols-3 gap-4">
                  {typeof comparisonResult.breakingChanges !== 'undefined' && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-4 bg-red-500/10 border border-red-400/30 rounded-lg text-center"
                    >
                      <p className="text-red-400 font-semibold text-2xl">{comparisonResult.breakingChanges}</p>
                      <p className="text-red-300 text-sm mt-1">Breaking Changes</p>
                    </motion.div>
                  )}
                  
                  {typeof comparisonResult.deprecations !== 'undefined' && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.1 }}
                      className="p-4 bg-yellow-500/10 border border-yellow-400/30 rounded-lg text-center"
                    >
                      <p className="text-yellow-400 font-semibold text-2xl">{comparisonResult.deprecations}</p>
                      <p className="text-yellow-300 text-sm mt-1">Deprecations</p>
                    </motion.div>
                  )}
                  
                  {typeof comparisonResult.nonBreakingChanges !== 'undefined' && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2 }}
                      className="p-4 bg-green-500/10 border border-green-400/30 rounded-lg text-center"
                    >
                      <p className="text-green-400 font-semibold text-2xl">{comparisonResult.nonBreakingChanges}</p>
                      <p className="text-green-300 text-sm mt-1">Non-Breaking Changes</p>
                    </motion.div>
                  )}
                </div>
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                    viewMode === 'list'
                      ? 'bg-cyan-500 text-white'
                      : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                  }`}
                >
                  <LayoutList className="h-4 w-4" />
                  List View
                </button>
                <button
                  onClick={() => setViewMode('diff')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                    viewMode === 'diff'
                      ? 'bg-cyan-500 text-white'
                      : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                  }`}
                >
                  <Columns className="h-4 w-4" />
                  Diff View
                </button>
              </div>

              {/* Changes Display - List View */}
              {viewMode === 'list' && (
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
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-medium text-green-300">
                                {endpoint.method} {endpoint.path}
                              </p>
                              {endpoint.severity && (
                                <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${
                                  endpoint.severity === 'BREAKING' ? 'bg-red-500/20 text-red-300 border border-red-400/50' :
                                  endpoint.severity === 'DEPRECATION' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-400/50' :
                                  'bg-green-500/20 text-green-300 border border-green-400/50'
                                }`}>
                                  {endpoint.severity}
                                </span>
                              )}
                            </div>
                            {endpoint.summary && (
                              <p className="text-green-200/80 text-sm mt-2">{endpoint.summary}</p>
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
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-medium text-red-300">
                                {endpoint.method} {endpoint.path}
                              </p>
                              {endpoint.severity && (
                                <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${
                                  endpoint.severity === 'BREAKING' ? 'bg-red-500/20 text-red-300 border border-red-400/50' :
                                  endpoint.severity === 'DEPRECATION' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-400/50' :
                                  'bg-green-500/20 text-green-300 border border-green-400/50'
                                }`}>
                                  {endpoint.severity}
                                </span>
                              )}
                            </div>
                            {endpoint.summary && (
                              <p className="text-red-200/80 text-sm mt-2">{endpoint.summary}</p>
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
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-medium text-yellow-300">
                                {endpoint.method} {endpoint.path}
                              </p>
                              {endpoint.severity && (
                                <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${
                                  endpoint.severity === 'BREAKING' ? 'bg-red-500/20 text-red-300 border border-red-400/50' :
                                  endpoint.severity === 'DEPRECATION' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-400/50' :
                                  'bg-green-500/20 text-green-300 border border-green-400/50'
                                }`}>
                                  {endpoint.severity}
                                </span>
                              )}
                            </div>
                            {endpoint.changes && (
                              <p className="text-yellow-200/80 text-sm mt-2">{endpoint.changes}</p>
                            )}
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Changes Display - Diff View */}
              {viewMode === 'diff' && (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Removed/Modified - Left Side */}
                    <div>
                      <h4 className="text-sm font-semibold text-red-300 mb-3 sticky top-0 bg-[#111] py-2">
                        Removed/Modified
                      </h4>
                      <div className="space-y-2">
                        {/* Removed */}
                        {comparisonResult.removedEndpoints && comparisonResult.removedEndpoints.map((endpoint, idx) => (
                          <motion.div
                            key={`removed-${idx}`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="p-2 bg-red-500/10 border border-red-400/30 rounded text-xs font-mono text-red-300"
                          >
                            <span className="text-red-500">−</span> {endpoint.method} {endpoint.path}
                          </motion.div>
                        ))}
                        {/* Modified - Old Version */}
                        {comparisonResult.modifiedEndpoints && comparisonResult.modifiedEndpoints.map((endpoint, idx) => (
                          <motion.div
                            key={`modified-old-${idx}`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="p-2 bg-yellow-500/10 border border-yellow-400/30 rounded text-xs font-mono text-yellow-300"
                          >
                            <span className="text-yellow-500">~</span> {endpoint.method} {endpoint.path}
                          </motion.div>
                        ))}
                      </div>
                    </div>

                    {/* Added/Modified - Right Side */}
                    <div>
                      <h4 className="text-sm font-semibold text-green-300 mb-3 sticky top-0 bg-[#111] py-2">
                        Added/Modified
                      </h4>
                      <div className="space-y-2">
                        {/* Added */}
                        {comparisonResult.newEndpoints && comparisonResult.newEndpoints.map((endpoint, idx) => (
                          <motion.div
                            key={`added-${idx}`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="p-2 bg-green-500/10 border border-green-400/30 rounded text-xs font-mono text-green-300"
                          >
                            <span className="text-green-400">+</span> {endpoint.method} {endpoint.path}
                          </motion.div>
                        ))}
                        {/* Modified - New Version */}
                        {comparisonResult.modifiedEndpoints && comparisonResult.modifiedEndpoints.map((endpoint, idx) => (
                          <motion.div
                            key={`modified-new-${idx}`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="p-2 bg-yellow-500/10 border border-yellow-400/30 rounded text-xs font-mono text-yellow-300"
                          >
                            <span className="text-yellow-500">~</span> {endpoint.method} {endpoint.path}
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

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

              <div className="flex items-center gap-3 flex-wrap">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={generateChangelog}
                  disabled={generatingChangelog}
                  className="px-6 py-3 bg-white hover:bg-white/90 disabled:opacity-50 text-[#0d0d0d] rounded-xl transition-all duration-200 font-medium flex items-center gap-2"
                >
                  {generatingChangelog ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <BookOpen className="h-4 w-4" />
                      Generate Changelog
                    </>
                  )}
                </motion.button>

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
                  className="px-6 py-3 bg-[#2a2a2a] hover:bg-[#333] border border-[#444] text-white rounded-xl transition-all duration-200"
                >
                  Close
                </motion.button>
              </div>
            </div>
          )}
        </div>

        {/* Changelog Modal */}
        <ChangelogModal
          isOpen={showChangelogModal}
          onClose={() => setShowChangelogModal(false)}
          changelog={generatedChangelog?.changelog}
          version={generatedChangelog?.version}
          date={generatedChangelog?.date}
          changeStats={generatedChangelog?.changeStats}
        />
      </motion.div>
    </motion.div>
  )
} 