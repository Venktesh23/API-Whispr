'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowLeft,
  Copy,
  CheckCircle,
  Loader2,
  BarChart3,
  Code2,
  FileText,
  Globe,
  Hash,
  Activity,
  AlertTriangle,
  GitCompare,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Settings,
  Zap,
  Database,
  Play,
  Shield
} from 'lucide-react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import ChatAssistant from '../../components/ChatAssistant'
import VisualSummaryChart from '../../components/VisualSummaryChart'
import EndpointCard from '../../components/EndpointCard'
import RelatedQuestions from '../../components/RelatedQuestions'
import WarningBanner from '../../components/WarningBanner'
import DownloadExportButtons from '../../components/DownloadExportButtons'
import AIFlowchartGenerator from '../../components/AIFlowchartGenerator'
import SafeCodeDisplay from '../../components/SafeCodeDisplay'
import SpecComparer from '../../components/SpecComparer'
import ApiHealthScore from '../../components/ApiHealthScore'
import AIFeatureShowcase from '../../components/AIFeatureShowcase'


const ensureString = (value) => {
  if (typeof value === 'string') return value
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') return JSON.stringify(value, null, 2)
  return String(value)
}

const SectionCard = ({ children, className = "" }) => (
  <div className={`bg-gradient-to-br from-[#1a1a1a] to-[#151515] border border-[#2a2a2a] rounded-xl shadow-lg ${className}`}>
    {children}
  </div>
)

const CollapsibleSection = ({ title, icon: Icon, children, defaultOpen = true, badge = null }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  
  return (
    <SectionCard className="overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-6 text-left flex items-center justify-between hover:bg-[#1f1f1f] transition-colors"
      >
        <div className="flex items-center gap-4">
          <Icon className="h-6 w-6 text-[#00FF9C]" />
          <h2 className="text-xl font-semibold text-white">{title}</h2>
          {badge && (
            <span className="px-3 py-1 bg-[#00FF9C]/10 border border-[#00FF9C] text-[#00FF9C] rounded-full text-xs font-medium shadow-[0_0_8px_#00FF9C]">
              {badge}
            </span>
          )}
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 90 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronRight className="h-5 w-5 text-[#666]" />
        </motion.div>
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="border-t border-[#2a2a2a]"
          >
            <div className="p-6">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </SectionCard>
  )
}

export default function AnalysisPage() {
  const router = useRouter()
  
  const [analysisData, setAnalysisData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentSpec, setCurrentSpec] = useState(null)
  const [copiedCode, setCopiedCode] = useState('')
  const [parsedEndpoints, setParsedEndpoints] = useState([])
  const [specWarnings, setSpecWarnings] = useState([])
  const [showSpecComparer, setShowSpecComparer] = useState(false)
  const [showFeatureShowcase, setShowFeatureShowcase] = useState(true)

  useEffect(() => {
    console.log('🔍 Analysis page loading...')
    
    const checkAuth = () => {
      if (typeof window === 'undefined') return false
      const isAuth = sessionStorage.getItem('isAuthenticated')
      if (!isAuth) {
        router.push('/login')
        return false
      }
      return true
    }

    if (!checkAuth()) return

    const loadSpecData = () => {
      try {
        const storedSpec = sessionStorage.getItem('currentSpec')
        if (!storedSpec) {
          router.push('/upload')
          return false
        }

        const specData = JSON.parse(storedSpec)
        setCurrentSpec(specData)
        
        // Parse endpoints and check for warnings
        parseEndpointsFromSpec(specData)
        checkSpecWarnings(specData)
        
        return specData
      } catch (err) {
        router.push('/upload')
        return false
      }
    }

    const specData = loadSpecData()
    if (specData) {
      performAnalysis(specData)
    }
  }, [])

  const parseEndpointsFromSpec = (specData) => {
    try {
      const spec = specData.parsed_spec
      if (!spec || !spec.paths) {
        console.log('⚠️ No paths found in spec')
        return
      }

      const endpoints = []
      Object.entries(spec.paths).forEach(([path, pathItem]) => {
        if (!pathItem || typeof pathItem !== 'object') return
        
        Object.entries(pathItem).forEach(([method, operation]) => {
          if (typeof operation === 'object' && method.toLowerCase() !== 'parameters') {
            endpoints.push({
              method: method.toUpperCase(),
              path,
              summary: operation.summary || operation.description || 'No summary provided',
              description: operation.description || '',
              tags: operation.tags || [],
              security: operation.security || spec.security || [],
              parameters: operation.parameters || [],
              requestBody: operation.requestBody,
              responses: operation.responses || {}
            })
          }
        })
      })
      
      console.log(`✅ Parsed ${endpoints.length} endpoints`)
      setParsedEndpoints(endpoints)
    } catch (err) {
      console.error('Error parsing endpoints:', err)
      setParsedEndpoints([])
    }
  }

  const checkSpecWarnings = (specData) => {
    const warnings = []
    
    try {
      const spec = specData.parsed_spec
      if (!spec) return

      if (!spec.servers || spec.servers.length === 0) {
        warnings.push('No servers defined in the specification')
      }

      let endpointsWithoutSummary = 0
      let endpointsWithoutTags = 0

      if (spec.paths) {
        Object.entries(spec.paths).forEach(([path, pathItem]) => {
          Object.entries(pathItem).forEach(([method, operation]) => {
            if (typeof operation === 'object') {
              if (!operation.summary && !operation.description) {
                endpointsWithoutSummary++
              }
              if (!operation.tags || operation.tags.length === 0) {
                endpointsWithoutTags++
              }
            }
          })
        })
      }

      if (endpointsWithoutSummary > 0) {
        warnings.push(`${endpointsWithoutSummary} endpoint(s) missing summary or description`)
      }

      if (endpointsWithoutTags > 0) {
        warnings.push(`${endpointsWithoutTags} endpoint(s) missing tags`)
      }

      setSpecWarnings(warnings)
    } catch (err) {
      console.error('Error checking spec warnings:', err)
    }
  }

  const performAnalysis = async (specData) => {
    setLoading(true)
    setError(null)

    try {
      const requestBody = {
        question: 'Provide a comprehensive analysis of this API specification with detailed insights',
        specContent: JSON.stringify(specData.parsed_spec || specData.raw_text),
        specType: specData.filetype || 'unknown'
      }

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      
      if (!data || !data.answer) {
        throw new Error('Invalid response from analysis API')
      }

      setAnalysisData(data)
    } catch (err) {
      console.error('Analysis error:', err)
      setError(err.message || 'Failed to analyze the API specification. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text, identifier) => {
    navigator.clipboard.writeText(text)
    setCopiedCode(identifier)
    setTimeout(() => setCopiedCode(''), 2000)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0d0d0d] to-[#121212] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-4 border-[#00FF9C]/30 border-t-[#00FF9C] rounded-full mx-auto mb-6"
          />
          <h1 className="text-2xl font-semibold text-white mb-2">Analyzing Your API</h1>
          <p className="text-[#999]">AI is processing your specification...</p>
          
          {currentSpec && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-6 px-4 py-2 bg-[#1a1a1a] rounded-lg inline-block border border-[#2a2a2a]"
            >
              <p className="text-[#00FF9C] text-sm font-medium">
                📄 {currentSpec.filename}
              </p>
            </motion.div>
          )}
        </motion.div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0d0d0d] to-[#121212] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="text-red-400 text-6xl mb-6"
          >
            ⚠️
          </motion.div>
          <h1 className="text-2xl font-semibold text-white mb-4">Analysis Failed</h1>
          <p className="text-[#999] mb-6">{error}</p>
          <div className="space-y-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setError(null)
                if (currentSpec) performAnalysis(currentSpec)
              }}
              className="w-full px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 text-white rounded-lg transition-all duration-300 font-medium"
            >
              Try Again
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push('/upload')}
              className="w-full px-6 py-3 bg-[#1a1a1a] hover:bg-[#1f1f1f] border border-[#2a2a2a] text-[#e0e0e0] rounded-lg transition-all duration-300"
            >
              Upload New File
            </motion.button>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0d0d0d] to-[#121212] text-[#e0e0e0] font-['Inter',sans-serif] relative">
      {/* Subtle background grid */}
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(0, 255, 156, 0.1) 1px, transparent 0)',
        backgroundSize: '20px 20px'
      }}></div>
      <div className="relative z-10">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-[#0d0d0d]/90 backdrop-blur-xl border-b border-[#2a2a2a]">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => router.push('/upload')}
                  className="p-2 hover:bg-[#1a1a1a] rounded-lg transition-colors"
                >
                  <ArrowLeft className="h-5 w-5" />
                </motion.button>
                
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-semibold text-white">API Analysis</h1>
                  {currentSpec && (
                    <span className="px-3 py-1 bg-[#00FF9C]/10 border border-[#00FF9C] text-[#00FF9C] rounded-full text-sm font-medium shadow-[0_0_8px_#00FF9C]">
                      {currentSpec.filetype?.toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowFeatureShowcase(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 text-white font-medium rounded-lg transition-all duration-300"
                >
                  <Sparkles className="h-4 w-4" />
                  AI Features
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowSpecComparer(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 text-white font-medium rounded-lg transition-all duration-300"
                >
                  <GitCompare className="h-4 w-4" />
                  Compare
                </motion.button>
                
                <DownloadExportButtons currentSpec={currentSpec} />
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
          {/* Warning Banner */}
          {specWarnings.length > 0 && (
            <WarningBanner warnings={specWarnings} currentSpec={currentSpec} />
          )}

          {/* Zero Endpoints Banner */}
          {parsedEndpoints.length === 0 && currentSpec && (
            <SectionCard className="p-6">
              <div className="flex items-start gap-4">
                <AlertTriangle className="h-6 w-6 text-red-400 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h3 className="font-semibold text-red-200 mb-3">No Valid Endpoints Found</h3>
                  <p className="text-sm text-red-100 mb-3">
                    This API specification doesn't contain any valid REST endpoints.
                  </p>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => router.push('/upload')}
                    className="px-4 py-2 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 text-white rounded-lg transition-all duration-300 text-sm font-medium"
                  >
                    Upload Different File
                  </motion.button>
                </div>
              </div>
            </SectionCard>
          )}

          {/* API Overview */}
          <CollapsibleSection 
            title="API Overview" 
            icon={Globe}
            badge="AI Enhanced"
          >
            {currentSpec && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="text-xs text-[#999] uppercase tracking-wide font-medium">Specification</label>
                  <p className="text-white font-medium mt-1">{currentSpec.filename}</p>
                </div>
                <div>
                  <label className="text-xs text-[#999] uppercase tracking-wide font-medium">Type</label>
                  <p className="text-white font-medium mt-1">{currentSpec.filetype?.toUpperCase()}</p>
                </div>
                <div>
                  <label className="text-xs text-[#999] uppercase tracking-wide font-medium">Status</label>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-2 h-2 bg-[#00FF9C] rounded-full shadow-[0_0_6px_#00FF9C]"></div>
                    <span className="text-[#00FF9C] font-medium">Analyzed</span>
                  </div>
                </div>
              </div>
            )}
            
            {analysisData?.overview && (
              <div className="mt-6 p-4 bg-[#1f1f1f] border border-[#2a2a2a] rounded-lg">
                <p className="text-[#e0e0e0] leading-relaxed">{analysisData.overview}</p>
              </div>
            )}
          </CollapsibleSection>

          {/* API Summary */}
          {analysisData?.visualSummary && parsedEndpoints.length > 0 && (
            <CollapsibleSection 
              title="API Summary" 
              icon={BarChart3}
              badge={`${parsedEndpoints.length} endpoints`}
            >
              <VisualSummaryChart data={analysisData.visualSummary} />
            </CollapsibleSection>
          )}

          {/* AI Detailed Analysis */}
          {analysisData?.answer && (
            <CollapsibleSection 
              title="AI Detailed Analysis" 
              icon={Activity}
            >
              <div className="prose prose-invert max-w-none">
                <p className="text-[#e0e0e0] leading-relaxed whitespace-pre-line">
                  {analysisData.answer}
                </p>
              </div>
            </CollapsibleSection>
          )}

          {/* Interactive Endpoint Explorer */}
          {parsedEndpoints.length > 0 && (
            <CollapsibleSection 
              title="Interactive Endpoint Explorer" 
              icon={Hash}
              defaultOpen={false}
              badge={`${parsedEndpoints.length} endpoints`}
            >
              <div className="space-y-4">
                {parsedEndpoints.map((endpoint, index) => (
                  <EndpointCard 
                    key={`${endpoint.path}-${endpoint.method}-${index}`}
                    endpoint={endpoint}
                    currentSpec={currentSpec}
                    index={index}
                  />
                ))}
              </div>
            </CollapsibleSection>
          )}

          {/* Key Parameters */}
          {analysisData?.requiredParams && analysisData.requiredParams.length > 0 && parsedEndpoints.length > 0 && (
            <CollapsibleSection 
              title="Key Parameters" 
              icon={Database}
              badge={`${analysisData.requiredParams.length} parameters`}
            >
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#2a2a2a]">
                      <th className="text-left py-3 px-4 font-medium text-[#999] text-xs uppercase tracking-wide">Name</th>
                      <th className="text-left py-3 px-4 font-medium text-[#999] text-xs uppercase tracking-wide">Type</th>
                      <th className="text-center py-3 px-4 font-medium text-[#999] text-xs uppercase tracking-wide">Required</th>
                      <th className="text-left py-3 px-4 font-medium text-[#999] text-xs uppercase tracking-wide">Location</th>
                      <th className="text-left py-3 px-4 font-medium text-[#999] text-xs uppercase tracking-wide">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysisData.requiredParams.map((param, index) => (
                      <tr key={index} className="border-b border-[#2a2a2a]/50 hover:bg-[#1f1f1f] transition-colors">
                        <td className="py-3 px-4">
                          <code className="px-2 py-1 bg-[#00FF9C]/10 border border-[#00FF9C] text-[#00FF9C] rounded text-sm font-medium shadow-[0_0_6px_#00FF9C]">
                            {param.name}
                          </code>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 bg-[#2a2a2a] text-[#e0e0e0] rounded text-sm">
                            {param.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {param.required ? (
                            <span className="text-red-400 font-medium">Yes</span>
                          ) : (
                            <span className="text-[#666]">No</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 bg-[#2a2a2a] text-[#e0e0e0] rounded text-sm">
                            {param.location}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[#e0e0e0]">
                          {param.description}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CollapsibleSection>
          )}

          {/* Ready-to-Use Code Examples */}
          {analysisData?.codeSnippets && parsedEndpoints.length > 0 && (
            <CollapsibleSection 
              title="Ready-to-Use Code Examples" 
              icon={Code2}
            >
              <div className="grid md:grid-cols-2 gap-6">
                {analysisData.codeSnippets.curl && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium text-white">cURL</h3>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => copyToClipboard(ensureString(analysisData.codeSnippets.curl), 'curl')}
                        className="flex items-center gap-2 px-3 py-1 bg-[#00FF9C]/10 border border-[#00FF9C] text-[#00FF9C] rounded-lg transition-all duration-300 text-sm font-medium hover:bg-[#00FF9C]/20 shadow-[0_0_6px_#00FF9C]"
                      >
                        {copiedCode === 'curl' ? (
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
                    <div className="rounded-lg overflow-hidden border border-[#2a2a2a]">
                      <SafeCodeDisplay
                        code={analysisData.codeSnippets.curl}
                        language="bash"
                        customStyle={{
                          margin: 0,
                          background: '#0a0a0a',
                          fontSize: '13px'
                        }}
                      />
                    </div>
                  </div>
                )}
                
                {analysisData.codeSnippets.python && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium text-white">Python</h3>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => copyToClipboard(ensureString(analysisData.codeSnippets.python), 'python')}
                        className="flex items-center gap-2 px-3 py-1 bg-[#00FF9C]/10 border border-[#00FF9C] text-[#00FF9C] rounded-lg transition-all duration-300 text-sm font-medium hover:bg-[#00FF9C]/20 shadow-[0_0_6px_#00FF9C]"
                      >
                        {copiedCode === 'python' ? (
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
                    <div className="rounded-lg overflow-hidden border border-[#2a2a2a]">
                      <SafeCodeDisplay
                        code={analysisData.codeSnippets.python}
                        language="python"
                        customStyle={{
                          margin: 0,
                          background: '#0a0a0a',
                          fontSize: '13px'
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {analysisData?.dataStructureExample && (
                <div className="mt-8 pt-6 border-t border-[#2a2a2a]">
                  <h3 className="font-medium text-white mb-4">Data Structure Examples</h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    {analysisData.dataStructureExample.requestBodyExample && (
                      <div>
                        <h4 className="text-sm text-[#999] mb-2">Request Body</h4>
                        <div className="rounded-lg overflow-hidden border border-[#2a2a2a]">
                          <SafeCodeDisplay
                            code={analysisData.dataStructureExample.requestBodyExample}
                            language="json"
                            customStyle={{
                              margin: 0,
                              background: '#0a0a0a',
                              fontSize: '13px'
                            }}
                          />
                        </div>
                      </div>
                    )}
                    
                    {analysisData.dataStructureExample.responseExample && (
                      <div>
                        <h4 className="text-sm text-[#999] mb-2">Response Example</h4>
                        <div className="rounded-lg overflow-hidden border border-[#2a2a2a]">
                          <SafeCodeDisplay
                            code={analysisData.dataStructureExample.responseExample}
                            language="json"
                            customStyle={{
                              margin: 0,
                              background: '#0a0a0a',
                              fontSize: '13px'
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CollapsibleSection>
          )}

          {/* AI-Powered Smart Questions */}
          <CollapsibleSection 
            title="AI-Powered Smart Questions" 
            icon={Sparkles}
            badge="Interactive"
          >
            <RelatedQuestions currentSpec={currentSpec} />
          </CollapsibleSection>

          {/* API Health Score */}
          <CollapsibleSection 
            title="API Health Score" 
            icon={Shield}
          >
            <ApiHealthScore 
              currentSpec={currentSpec} 
              parsedEndpoints={parsedEndpoints}
            />
          </CollapsibleSection>

          {/* AI Flowchart Generator */}
          <CollapsibleSection 
            title="AI Flowchart Generator" 
            icon={Zap}
            badge="Generate"
          >
            <AIFlowchartGenerator currentSpec={currentSpec} />
          </CollapsibleSection>
        </div>

        {/* Floating Chat Assistant */}
        <ChatAssistant currentSpec={currentSpec} />

        {/* Modals */}
        <AnimatePresence>
          {showSpecComparer && (
            <SpecComparer 
              currentSpec={currentSpec}
              onClose={() => setShowSpecComparer(false)}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showFeatureShowcase && (
            <AIFeatureShowcase 
              isVisible={showFeatureShowcase}
              onClose={() => setShowFeatureShowcase(false)}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
} 
