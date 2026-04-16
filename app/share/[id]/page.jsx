'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Lock, 
  Copy, 
  CheckCircle, 
  Loader2, 
  AlertTriangle,
  Home,
  Share2,
  Calendar,
  Clock,
  ExternalLink,
  Github
} from 'lucide-react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import SafeCodeDisplay from '../../../components/SafeCodeDisplay'
import ReadOnlyEndpointCard from '../../../components/ReadOnlyEndpointCard'
import VisualSummaryChart from '../../../components/VisualSummaryChart'

const ensureString = (value) => {
  if (typeof value === 'string') return value
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') return JSON.stringify(value, null, 2)
  return String(value)
}

export default function SharePage() {
  const params = useParams()
  const router = useRouter()
  const shareId = params?.id

  const [analysisData, setAnalysisData] = useState(null)
  const [currentSpec, setCurrentSpec] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expired, setExpired] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState(false)
  const [activeLanguage, setActiveLanguage] = useState('curl')
  const [parsedEndpoints, setParsedEndpoints] = useState([])

  useEffect(() => {
    if (!shareId) {
      setError('No share ID provided')
      setLoading(false)
      return
    }

    fetchSharedAnalysis()
  }, [shareId])

  const fetchSharedAnalysis = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/shared-analysis/${shareId}`)

      if (response.status === 404) {
        setError('Share link not found or has expired')
        setExpired(true)
        setLoading(false)
        return
      }

      if (!response.ok) {
        throw new Error('Failed to load shared analysis')
      }

      const data = await response.json()

      setAnalysisData(data.analysis_data)
      setCurrentSpec(data.current_spec)

      // Parse endpoints from spec
      if (data.current_spec?.parsed_spec?.paths) {
        const endpoints = []
        Object.entries(data.current_spec.parsed_spec.paths).forEach(([path, pathItem]) => {
          if (!pathItem || typeof pathItem !== 'object') return

          Object.entries(pathItem).forEach(([method, operation]) => {
            if (typeof operation === 'object' && method.toLowerCase() !== 'parameters') {
              endpoints.push({
                method: method.toUpperCase(),
                path,
                summary: operation.summary || operation.description || 'No summary provided',
                description: operation.description || '',
                tags: operation.tags || [],
              })
            }
          })
        })
        setParsedEndpoints(endpoints)
      }
    } catch (err) {
      console.error('Error fetching shared analysis:', err)
      setError(err.message || 'Failed to load shared analysis')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    setCopiedUrl(true)
    setTimeout(() => setCopiedUrl(false), 2000)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <Loader2 className="h-12 w-12 animate-spin text-[#888] mx-auto mb-4" />
          <p className="text-gray-300">Loading shared analysis...</p>
        </motion.div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-[#1a1a1a] border border-red-400/30 rounded-xl p-8 text-center"
        >
          <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Share Link Invalid</h1>
          <p className="text-gray-300 mb-6">{error}</p>
          {expired && (
            <p className="text-sm text-gray-400 mb-6">
              This share link may have expired (links expire after 30 days by default).
            </p>
          )}
          <a
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white text-[#0d0d0d] rounded-lg font-medium hover:bg-white/90 transition-colors"
          >
            <Home className="h-4 w-4" />
            Go Home
          </a>
        </motion.div>
      </div>
    )
  }

  if (!analysisData || !currentSpec) {
    return (
      <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-8 text-center"
        >
          <AlertTriangle className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">No Analysis Data</h1>
          <p className="text-gray-300 mb-6">
            The shared analysis could not be loaded.
          </p>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white text-[#0d0d0d] rounded-lg font-medium hover:bg-white/90 transition-colors"
          >
            <Home className="h-4 w-4" />
            Go Home
          </a>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0d0d0d] via-[#0a0a0a] to-[#0d0d0d]">
      {/* Public Share Banner */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-40 bg-[#1a1a1a]/95 backdrop-blur border-b border-[#2a2a2a] py-3"
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/5 rounded-lg border border-[#444]">
                <Lock className="h-4 w-4 text-[#888]" />
              </div>
              <div>
                <h1 className="font-bold text-white text-sm sm:text-base">
                  Public Share Link
                </h1>
                <p className="text-gray-400 text-xs">
                  {currentSpec.filename} - Read-only view
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => copyToClipboard(window.location.href)}
                className="flex-1 sm:flex-auto flex items-center justify-center gap-2 px-3 py-2 bg-white/5 border border-[#444] text-[#ccc] rounded-lg text-sm font-medium hover:bg-white/10 transition-all"
              >
                {copiedUrl ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    <span>Copy Link</span>
                  </>
                )}
              </motion.button>

              <a
                href="/"
                className="flex-1 sm:flex-auto flex items-center justify-center gap-2 px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] text-gray-300 rounded-lg text-sm font-medium hover:bg-[#222] transition-all"
              >
                <Home className="h-4 w-4" />
                <span>Back Home</span>
              </a>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-2">
            API Analysis: {currentSpec.filename}
          </h2>
          <p className="text-gray-400">
            Shared analysis - {currentSpec.filetype?.toUpperCase() || 'SPEC'} Format
          </p>
        </motion.div>

        {/* Summary Charts */}
        {analysisData?.summary && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <VisualSummaryChart data={analysisData} />
          </motion.div>
        )}

        {/* Health Score */}
        {analysisData?.healthScore && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-8 p-6 bg-gradient-to-br from-[#1a1a1a] to-[#151515] border border-[#2a2a2a] rounded-xl"
          >
            <h3 className="text-lg font-semibold text-white mb-4">API Health Score</h3>
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <div className="w-full h-3 bg-[#0a0a0a] rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${analysisData.healthScore.score}%` }}
                    transition={{ duration: 1, delay: 0.5 }}
                    className={`h-full rounded-full ${
                      analysisData.healthScore.score >= 80
                        ? 'bg-green-400'
                        : analysisData.healthScore.score >= 50
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`}
                  />
                </div>
              </div>
              <span className="text-2xl font-bold text-white">
                {analysisData.healthScore.score}%
              </span>
            </div>
            <p className="text-gray-400 text-sm mt-2">{analysisData.healthScore.summary}</p>
          </motion.div>
        )}

        {/* Code Examples */}
        {analysisData?.codeSnippets && Object.keys(analysisData.codeSnippets).length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-8 p-6 bg-gradient-to-br from-[#1a1a1a] to-[#151515] border border-[#2a2a2a] rounded-xl"
          >
            <h3 className="text-lg font-semibold text-white mb-4">Code Examples</h3>

            {/* Language Tabs */}
            <div className="flex flex-wrap gap-2 mb-6 pb-4 border-b border-[#2a2a2a]">
              {['curl', 'python', 'javascript', 'typescript', 'go'].map((lang) => (
                analysisData.codeSnippets[lang] && (
                  <motion.button
                    key={lang}
                    onClick={() => setActiveLanguage(lang)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
                      activeLanguage === lang
                        ? 'bg-white text-[#0d0d0d]'
                        : 'bg-[#1a1a1a] text-[#999] border border-[#2a2a2a] hover:border-[#555]'
                    }`}
                  >
                    {lang.charAt(0).toUpperCase() + lang.slice(1)}
                  </motion.button>
                )
              ))}
            </div>

            {/* Code Display */}
            <div className="rounded-lg overflow-hidden border border-[#2a2a2a]">
              <SafeCodeDisplay
                code={analysisData.codeSnippets[activeLanguage]}
                language={activeLanguage === 'curl' ? 'bash' : activeLanguage}
                customStyle={{
                  margin: 0,
                  background: '#0a0a0a',
                  fontSize: '13px',
                }}
              />
            </div>
          </motion.div>
        )}

        {/* Endpoints */}
        {parsedEndpoints.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mb-8"
          >
            <h3 className="text-lg font-semibold text-white mb-4">API Endpoints</h3>
            <div className="grid gap-4">
              {parsedEndpoints.map((endpoint, index) => (
                <ReadOnlyEndpointCard
                  key={index}
                  endpoint={endpoint}
                  index={index}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-12 pt-8 border-t border-[#2a2a2a] text-center text-gray-400"
        >
          <p className="text-sm">
            This is a public read-only share of an API analysis from{' '}
            <span className="font-semibold text-white">API-Whispr</span>
          </p>
          <a
            href="https://github.com/Venktesh23/API-Whispr"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-4 text-[#888] hover:text-white transition-colors"
          >
            <Github className="h-4 w-4" />
            View on GitHub
          </a>
        </motion.div>
      </div>
    </div>
  )
}
