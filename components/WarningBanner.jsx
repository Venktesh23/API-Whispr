'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, X, Sparkles, Loader2, Wrench, CheckCircle, Copy, ChevronRight } from 'lucide-react'
import { useState, useEffect } from 'react'

export default function WarningBanner({ warnings, currentSpec }) {
  const [isVisible, setIsVisible] = useState(true)
  const [suggestions, setSuggestions] = useState([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [fixingWarnings, setFixingWarnings] = useState({})
  const [showFixModal, setShowFixModal] = useState(false)
  const [currentFix, setCurrentFix] = useState(null)
  const [appliedFixes, setAppliedFixes] = useState(new Set())
  const [isExpanded, setIsExpanded] = useState(false)
  const [isFixing, setIsFixing] = useState(false)
  const [fixedWarnings, setFixedWarnings] = useState(new Set())

  useEffect(() => {
    if (warnings.length > 0 && currentSpec) {
      generateImprovementSuggestions()
    }
  }, [warnings, currentSpec])

  const generateImprovementSuggestions = async () => {
    setLoadingSuggestions(true)
    
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: `Based on these OpenAPI specification quality issues: ${warnings.join(', ')}, provide 3 specific, actionable improvement suggestions with examples. Focus on practical fixes that would improve documentation quality.`,
          specContent: JSON.stringify(currentSpec.parsed_spec || currentSpec.raw_text),
          specType: currentSpec.filetype
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const suggestionText = data.answer || ''
        const suggestionLines = suggestionText.split('\n').filter(line => 
          line.trim() && (line.includes('•') || line.includes('-') || line.includes('1.') || line.includes('2.') || line.includes('3.'))
        ).slice(0, 3)
        
        setSuggestions(suggestionLines.length > 0 ? suggestionLines : [
          "Add descriptive summaries to all endpoints for better documentation",
          "Organize endpoints with meaningful tags for logical grouping", 
          "Define server URLs to specify your API's base endpoint"
        ])
      }
    } catch (error) {
      console.error('Error generating suggestions:', error)
      setSuggestions([
        "Add descriptive summaries to all endpoints for better documentation",
        "Organize endpoints with meaningful tags for logical grouping", 
        "Define server URLs to specify your API's base endpoint"
      ])
    } finally {
      setLoadingSuggestions(false)
    }
  }

  const handleFixWarning = async (warningIndex) => {
    setIsFixing(true)
    
    try {
      const response = await fetch('/api/generate-spec-fix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          warning: warnings[warningIndex],
          specContent: JSON.stringify(currentSpec.parsed_spec || currentSpec.raw_text),
          specType: currentSpec.filetype || 'unknown'
        })
      })

      if (response.ok) {
        const data = await response.json()
        setFixedWarnings(prev => new Set(prev).add(warningIndex))
        
        // Here you would typically apply the fix to the spec
        console.log('Generated fix:', data.fix)
      }
    } catch (error) {
      console.error('Error generating fix:', error)
    } finally {
      setIsFixing(false)
    }
  }

  const applyFix = async () => {
    if (!currentFix) return
    
    try {
      // Apply the fix to Supabase
      const response = await fetch('/api/apply-spec-fix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          specId: currentSpec.id,
          patch: currentFix.patch,
          warning: currentFix.warning
        }),
      })

      if (response.ok) {
        setAppliedFixes(prev => new Set(prev).add(currentFix.warningIndex))
        setShowFixModal(false)
        setCurrentFix(null)
        
        // Refresh the page to show updated spec
        window.location.reload()
      } else {
        throw new Error('Failed to apply fix')
      }
    } catch (error) {
      console.error('Error applying fix:', error)
      alert('Failed to apply fix. Please try again.')
    }
  }

  const copyPatch = () => {
    if (currentFix?.patch) {
      navigator.clipboard.writeText(currentFix.patch)
    }
  }

  if (!isVisible || warnings.length === 0) {
    return null
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="bg-[#1e1e1e] border border-yellow-400/50 rounded-2xl p-6 shadow-2xl shadow-yellow-400/10"
      >
        <div className="flex items-start gap-4">
          <AlertTriangle className="h-6 w-6 text-yellow-400 flex-shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="font-semibold text-yellow-200 mb-3 flex items-center gap-2">
              Specification Quality Issues Detected
              <span className="px-2 py-1 bg-yellow-500/20 text-yellow-300 border border-yellow-400/30 rounded-full text-xs font-medium">
                {warnings.length} issues
              </span>
            </h3>
            
            {/* Current Issues with Fix Buttons */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-yellow-200 mb-3">Issues Found:</h4>
              <ul className="space-y-3 text-sm">
                {warnings.map((warning, index) => (
                  <li key={index} className="flex items-center justify-between p-3 bg-[#2a2a2a]/50 rounded-lg border border-yellow-400/30">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full flex-shrink-0"></span>
                      <span className="text-yellow-100">{warning}</span>
                      {fixedWarnings.has(index) && (
                        <CheckCircle className="h-4 w-4 text-green-400 ml-2" />
                      )}
                    </div>
                    
                    {!fixedWarnings.has(index) && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleFixWarning(index)}
                        disabled={isFixing}
                        className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 border border-gray-500/30 text-white rounded-lg transition-all duration-200 text-xs font-medium disabled:opacity-50"
                      >
                        {isFixing ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Fixing...
                          </>
                        ) : (
                          <>
                            <Wrench className="h-3 w-3" />
                            Fix with AI
                          </>
                        )}
                      </motion.button>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* AI-Powered Suggestions */}
            <div className="border-t border-yellow-400/20 pt-4">
              <h4 className="text-sm font-medium text-yellow-200 mb-2 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-yellow-400" />
                AI-Powered Improvement Suggestions:
              </h4>
              
              {loadingSuggestions ? (
                <div className="flex items-center gap-2 text-sm text-yellow-200/80">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading...
                </div>
              ) : (
                <ul className="space-y-2 text-sm">
                  {suggestions.map((suggestion, index) => (
                    <motion.li 
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-start gap-2 text-yellow-100"
                    >
                      <span className="w-1.5 h-1.5 bg-green-400 rounded-full flex-shrink-0 mt-2"></span>
                      <span className="leading-relaxed">{suggestion.replace(/^[•\-\d\.]\s*/, '')}</span>
                    </motion.li>
                  ))}
                </ul>
              )}
            </div>
            
            <p className="text-xs text-yellow-200/80 mt-3">
              Use AI Fix buttons to automatically generate and apply OpenAPI spec improvements.
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsVisible(false)}
            className="p-1 hover:bg-yellow-400/20 rounded-lg transition-colors flex-shrink-0"
          >
            <X className="h-4 w-4 text-yellow-400" />
          </motion.button>
        </div>
      </motion.div>

      {/* AI Fix Modal */}
      <AnimatePresence>
        {showFixModal && currentFix && (
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
              className="bg-[#111] border border-gray-700/50 rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Wrench className="h-6 w-6 text-cyan-400" />
                  AI-Generated Fix
                </h3>
                <button
                  onClick={() => setShowFixModal(false)}
                  className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-400" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-yellow-500/10 border border-yellow-400/30 rounded-lg">
                  <h4 className="font-medium text-yellow-200 mb-2">Issue:</h4>
                  <p className="text-yellow-100 text-sm">{currentFix.warning}</p>
                </div>

                {currentFix.explanation && (
                  <div className="p-4 bg-blue-500/10 border border-blue-400/30 rounded-lg">
                    <h4 className="font-medium text-blue-200 mb-2">AI Explanation:</h4>
                    <p className="text-blue-100 text-sm">{currentFix.explanation}</p>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-gray-200">Suggested Patch:</h4>
                    <button
                      onClick={copyPatch}
                      className="flex items-center gap-2 px-3 py-1 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg transition-colors text-sm"
                    >
                      <Copy className="h-4 w-4" />
                      Copy
                    </button>
                  </div>
                  
                  <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700/30">
                    <pre className="text-green-400 text-sm overflow-x-auto">
                      {currentFix.patch}
                    </pre>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-4">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={applyFix}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white rounded-xl transition-all duration-200 font-semibold shadow-lg hover:shadow-xl"
                  >
                    ✅ Apply Fix to Specification
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowFixModal(false)}
                    className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-all duration-200"
                  >
                    Cancel
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
} 