'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Tag, 
  Sparkles, 
  Loader2, 
  CheckCircle, 
  Plus,
  Zap,
  ArrowRight
} from 'lucide-react'

export default function AutoTagEndpoints({ endpoint, currentSpec, onTagApplied }) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [suggestedTag, setSuggestedTag] = useState(null)
  const [isApplying, setIsApplying] = useState(false)
  const [isApplied, setIsApplied] = useState(false)

  const hasNoTags = !endpoint.tags || endpoint.tags.length === 0

  const generateTagSuggestion = async () => {
    if (!hasNoTags) return

    setIsGenerating(true)
    setSuggestedTag(null)

    try {
      const response = await fetch('/api/generate-endpoint-tag', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint: {
            path: endpoint.path,
            method: endpoint.method,
            summary: endpoint.summary,
            description: endpoint.description,
            operationId: endpoint.operationId
          },
          specContent: JSON.stringify(currentSpec.parsed_spec || currentSpec.raw_text),
          specType: currentSpec.filetype
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setSuggestedTag(data)
      } else {
        throw new Error('Failed to generate tag suggestion')
      }
    } catch (error) {
      console.error('Error generating tag suggestion:', error)
      // Fallback to simple tag generation
      const fallbackTag = generateFallbackTag()
      setSuggestedTag({ tag: fallbackTag, confidence: 'medium', reasoning: 'Generated based on endpoint path' })
    } finally {
      setIsGenerating(false)
    }
  }

  const generateFallbackTag = () => {
    const path = endpoint.path.toLowerCase()
    const method = endpoint.method.toLowerCase()

    // Simple heuristics for common patterns
    if (path.includes('auth') || path.includes('login') || path.includes('token')) {
      return 'Authentication'
    }
    if (path.includes('user') || path.includes('profile')) {
      return 'Users'
    }
    if (path.includes('order') || path.includes('purchase')) {
      return 'Orders'
    }
    if (path.includes('payment') || path.includes('billing')) {
      return 'Payments'
    }
    if (path.includes('product') || path.includes('item')) {
      return 'Products'
    }
    if (path.includes('admin') || path.includes('manage')) {
      return 'Administration'
    }
    if (path.includes('search') || path.includes('query')) {
      return 'Search'
    }
    if (path.includes('notification') || path.includes('message')) {
      return 'Notifications'
    }
    if (path.includes('report') || path.includes('analytics')) {
      return 'Reports'
    }
    if (path.includes('config') || path.includes('setting')) {
      return 'Configuration'
    }

    // Fallback to path-based categorization
    const pathParts = path.split('/').filter(part => part && !part.includes('{'))
    if (pathParts.length > 0) {
      const mainPart = pathParts[1] || pathParts[0]
      return mainPart.charAt(0).toUpperCase() + mainPart.slice(1)
    }

    return 'General'
  }

  const applyTag = async () => {
    if (!suggestedTag) return

    setIsApplying(true)

    try {
      // In a real implementation, this would update the spec in Supabase
      const response = await fetch('/api/apply-endpoint-tag', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          specId: currentSpec.id,
          endpointPath: endpoint.path,
          endpointMethod: endpoint.method,
          tag: suggestedTag.tag
        }),
      })

      if (response.ok) {
        setIsApplied(true)
        if (onTagApplied) {
          onTagApplied(endpoint, suggestedTag.tag)
        }
        
        // Update the endpoint locally (simulated)
        setTimeout(() => {
          console.log(`✅ Tag "${suggestedTag.tag}" applied to ${endpoint.method} ${endpoint.path}`)
        }, 500)
      } else {
        throw new Error('Failed to apply tag')
      }
    } catch (error) {
      console.error('Error applying tag:', error)
      alert('Failed to apply tag. Please try again.')
    } finally {
      setIsApplying(false)
    }
  }

  const getConfidenceColor = (confidence) => {
    switch (confidence) {
      case 'high': return 'text-green-400'
      case 'medium': return 'text-yellow-400'
      case 'low': return 'text-orange-400'
      default: return 'text-gray-400'
    }
  }

  const getConfidenceBadge = (confidence) => {
    switch (confidence) {
      case 'high': return 'bg-green-500/20 text-green-300'
      case 'medium': return 'bg-yellow-500/20 text-yellow-300'
      case 'low': return 'bg-orange-500/20 text-orange-300'
      default: return 'bg-gray-500/20 text-gray-300'
    }
  }

  if (!hasNoTags || isApplied) {
    return null
  }

  return (
    <div className="mt-4 p-4 bg-purple-500/10 border border-purple-400/30 rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Tag className="h-4 w-4 text-purple-400" />
          <div>
            <h4 className="font-medium text-purple-200">Missing Tag</h4>
            <p className="text-purple-200/80 text-sm">This endpoint doesn't have any tags for organization</p>
          </div>
        </div>

        {!suggestedTag ? (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={generateTagSuggestion}
            disabled={isGenerating}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 border border-purple-400/30 text-purple-300 rounded-lg transition-all duration-200 font-medium disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Add Tag with AI
              </>
            )}
          </motion.button>
        ) : (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-3"
            >
              <div className="text-right">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-purple-200">"{suggestedTag.tag}"</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${getConfidenceBadge(suggestedTag.confidence)}`}>
                    {suggestedTag.confidence} confidence
                  </span>
                </div>
                {suggestedTag.reasoning && (
                  <p className="text-purple-200/70 text-xs max-w-xs">
                    {suggestedTag.reasoning}
                  </p>
                )}
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={applyTag}
                disabled={isApplying}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 disabled:opacity-50 text-white rounded-lg transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
              >
                {isApplying ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Applying...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Apply
                  </>
                )}
              </motion.button>
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {suggestedTag && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-3 pt-3 border-t border-purple-400/20"
        >
          <div className="flex items-center gap-2 text-sm text-purple-200/80">
            <Zap className="h-3 w-3" />
            <span>AI analyzed the endpoint path and description to suggest this tag</span>
          </div>
        </motion.div>
      )}
    </div>
  )
} 