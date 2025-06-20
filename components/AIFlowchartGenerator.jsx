'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Zap, 
  Copy, 
  CheckCircle, 
  Loader2, 
  ChevronDown,
  Sparkles,
  Download,
  Eye,
  Workflow,
  FileCode
} from 'lucide-react'

// Predefined flow types with descriptions and icons
const FLOW_TYPES = [
  {
    id: 'user_auth',
    label: 'User Auth Flow',
    description: 'Login → Token → Profile',
    icon: '🔐',
    diagramType: 'sequence',
    color: 'from-blue-500 to-cyan-500'
  },
  {
    id: 'crud_flow',
    label: 'CRUD Flow',
    description: 'Create → Read → Update → Delete',
    icon: '📝',
    diagramType: 'sequence',
    color: 'from-green-500 to-emerald-500'
  },
  {
    id: 'checkout_flow',
    label: 'Order Checkout Flow',
    description: 'Cart → Payment → Confirmation',
    icon: '🛒',
    diagramType: 'sequence',
    color: 'from-purple-500 to-pink-500'
  },
  {
    id: 'oauth_flow',
    label: 'OAuth 2.0 Flow',
    description: 'Client → Auth Server → Token',
    icon: '🔑',
    diagramType: 'sequence',
    color: 'from-orange-500 to-red-500'
  },
  {
    id: 'microservice_chain',
    label: 'Microservice Call Chain',
    description: 'API Gateway → Service A → DB',
    icon: '⚡',
    diagramType: 'sequence',
    color: 'from-indigo-500 to-purple-500'
  },
  {
    id: 'entity_relationship',
    label: 'Entity Relationship',
    description: 'Models & Database Schemas',
    icon: '🗃️',
    diagramType: 'erDiagram',
    color: 'from-teal-500 to-cyan-500'
  }
]

// Mermaid Chart Component (same as before but with better error handling)
function MermaidChart({ chart }) {
  const chartRef = useRef(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const renderChart = async () => {
      if (!chart || !chartRef.current) return

      setIsLoading(true)
      setError(null)

      try {
        const mermaid = (await import('mermaid')).default
        
        mermaid.initialize({
          startOnLoad: false,
          theme: 'dark',
          themeVariables: {
            primaryColor: '#374151',
            primaryTextColor: '#f9fafb',
            primaryBorderColor: '#6b7280',
            lineColor: '#9ca3af',
            sectionBkgColor: '#1f2937',
            altSectionBkgColor: '#111827',
            gridColor: '#4b5563',
            secondaryColor: '#4b5563',
            tertiaryColor: '#6b7280'
          }
        })

        chartRef.current.innerHTML = ''
        const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        const { svg } = await mermaid.render(id, chart)
        chartRef.current.innerHTML = svg

      } catch (err) {
        console.error('Mermaid rendering error:', err)
        setError('Failed to render diagram')
        chartRef.current.innerHTML = `
          <div class="text-red-400 text-center p-8">
            <p>Failed to render diagram</p>
            <p class="text-sm text-red-300 mt-2">The generated code may have syntax issues</p>
          </div>
        `
      } finally {
        setIsLoading(false)
      }
    }

    renderChart()
  }, [chart])

  return (
    <div className="relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50 rounded-lg z-10">
          <Loader2 className="h-8 w-8 text-cyan-400 animate-spin" />
        </div>
      )}
      <div 
        ref={chartRef} 
        className="mermaid-container min-h-[200px] flex items-center justify-center"
      />
    </div>
  )
}

export default function AIFlowchartGenerator({ currentSpec }) {
  const [selectedType, setSelectedType] = useState('user_auth')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedDiagram, setGeneratedDiagram] = useState(null)
  const [copiedItem, setCopiedItem] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Close dropdown on escape key
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setShowDropdown(false)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  // Debug: Log flow types to verify they're all there
  useEffect(() => {
    console.log('🔄 Available flow types:', FLOW_TYPES.map(f => f.label))
  }, [])

  const generateFlowchart = async () => {
    setIsGenerating(true)
    setGeneratedDiagram(null)

    try {
      const selectedFlowType = FLOW_TYPES.find(type => type.id === selectedType)
      
      const response = await fetch('/api/generate-diagram', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          specContent: JSON.stringify(currentSpec?.parsed_spec || currentSpec?.raw_text || '{}'),
          flowType: selectedType,
          diagramType: selectedFlowType?.diagramType || 'sequence',
          specType: currentSpec?.content_type || 'OpenAPI'
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to generate diagram: ${response.status}`)
      }

      const data = await response.json()
      
      // Transform API response to match component expectations
      setGeneratedDiagram({
        mermaid: data.mermaidCode,
        svg: null, // SVG generation happens client-side
        title: selectedFlowType?.label || 'API Flow',
        pattern: data.pattern,
        warning: data.warning
      })
    } catch (error) {
      console.error('Error generating flowchart:', error)
      
      // Check if it's an API key issue
      if (error.message.includes('500')) {
        console.warn('API key may not be configured, using fallback diagram')
      }
      
      // Fallback diagram
      setGeneratedDiagram({
        mermaid: generateFallbackDiagram(),
        svg: null,
        title: FLOW_TYPES.find(type => type.id === selectedType)?.label || 'API Flow',
        warning: 'Using fallback diagram - API generation may not be available'
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const generateFallbackDiagram = () => {
    const selectedFlowType = FLOW_TYPES.find(type => type.id === selectedType)
    
    switch (selectedType) {
      case 'user_auth':
        return `graph TD
    A[Start] --> B[User Opens App]
    B --> C[Login Page]
    C --> D{Has Account?}
    D -->|Yes| E[Enter Credentials]
    D -->|No| F[Register New Account]
    E --> G[Validate Credentials]
    F --> H[Create Account]
    G --> I{Valid?}
    I -->|Yes| J[Generate Token]
    I -->|No| K[Show Error]
    H --> L[Send Verification]
    J --> M[Access Dashboard]
    K --> C
    L --> N[Verify Email]
    N --> M
    M --> O[End]`

      case 'crud_flow':
        return `graph TD
    A[Client Request] --> B[API Gateway]
    B --> C[Authentication]
    C --> D{Valid Token?}
    D -->|No| E[Return 401]
    D -->|Yes| F[Route Request]
    F --> G[Validate Input]
    G --> H{Valid Data?}
    H -->|No| I[Return 400]
    H -->|Yes| J[Process Request]
    J --> K[Database Query]
    K --> L[Transform Data]
    L --> M[Return Response]
    E --> N[End]
    I --> N
    M --> N`

      case 'checkout_flow':
        return `sequenceDiagram
    participant Client
    participant Cart as Cart API
    participant Payment as Payment Service
    participant Order as Order Service
    participant Email as Email Service
    
    Client->>Cart: POST /cart/items
    Cart-->>Client: Item Added
    
    Client->>Cart: GET /cart
    Cart-->>Client: Cart Contents
    
    Client->>Payment: POST /payment/process
    Payment->>Payment: Validate Card
    Payment-->>Client: Payment Success
    
    Client->>Order: POST /orders
    Order->>Order: Create Order
    Order-->>Client: Order Confirmation
    
    Order->>Email: Send Confirmation
    Email-->>Order: Email Sent`

      case 'oauth_flow':
        return `graph TD
    A[Error Detected] --> B[Log Error]
    B --> C[Determine Error Type]
    C --> D{Critical Error?}
    D -->|Yes| E[Alert Admin]
    D -->|No| F[Standard Handling]
    E --> G[Emergency Response]
    F --> H[User Notification]
    G --> I[System Recovery]
    H --> J[Retry Option]
    I --> K[End]
    J --> L{Retry?}
    L -->|Yes| M[Retry Process]
    L -->|No| K
    M --> N[Success Check]
    N --> O{Success?}
    O -->|Yes| K
    O -->|No| H`

      case 'microservice_chain':
        return `graph TD
    A[Start] --> B[Process]
    B --> C[End]`

      case 'entity_relationship':
        return `graph TD
    A[Start] --> B[Process]
    B --> C[End]`

      default:
        return `graph TD
    A[Start] --> B[Process]
    B --> C[End]`
    }
  }

  const copyToClipboard = (text, identifier) => {
    navigator.clipboard.writeText(text)
    setCopiedItem(identifier)
    setTimeout(() => setCopiedItem(''), 2000)
  }

  const downloadSVG = () => {
    if (generatedDiagram?.svg) {
      const blob = new Blob([generatedDiagram.svg], { type: 'image/svg+xml' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${selectedType}-flowchart.svg`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  }

  return (
    <div className="space-y-6">
      {/* Flowchart Type Selector */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-white">
          Select Flowchart Type
        </label>
        
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="w-full p-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-left flex items-center justify-between hover:bg-[#1f1f1f] transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">
                                                 {FLOW_TYPES.find(type => type.id === selectedType)?.icon}
              </span>
              <div>
                <div className="text-[#e0e0e0] font-medium">
                                                       {FLOW_TYPES.find(type => type.id === selectedType)?.label}
                </div>
                <div className="text-sm text-[#999]">
                                                         {FLOW_TYPES.find(type => type.id === selectedType)?.description}
                </div>
              </div>
            </div>
            <motion.div
              animate={{ rotate: showDropdown ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="h-5 w-5 text-[#666]" />
            </motion.div>
          </button>

          <AnimatePresence>
            {showDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg shadow-lg max-h-80 overflow-y-auto z-[999999]"
                style={{ zIndex: 999999 }}
              >
                {FLOW_TYPES.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => {
                      setSelectedType(type.id)
                      setShowDropdown(false)
                    }}
                    className="w-full p-3 text-left hover:bg-[#1f1f1f] transition-colors flex items-center gap-3 border-b border-[#2a2a2a] last:border-b-0"
                  >
                    <span className="text-lg">{type.icon}</span>
                    <div>
                      <div className="text-[#e0e0e0] font-medium">{type.label}</div>
                      <div className="text-sm text-[#999]">{type.description}</div>
                    </div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Generate Button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={generateFlowchart}
        disabled={isGenerating}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#00FF9C]/10 border border-[#00FF9C] text-[#00FF9C] rounded-lg transition-all duration-300 font-medium hover:bg-[#00FF9C]/20 shadow-[0_0_10px_#00FF9C] disabled:opacity-50"
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading...
          </>
        ) : (
          <>
            <Zap className="h-5 w-5" />
                                     Generate {FLOW_TYPES.find(type => type.id === selectedType)?.label}
          </>
        )}
      </motion.button>

      {/* Generated Diagram Display */}
      {generatedDiagram && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-white flex items-center gap-2">
              <Workflow className="h-5 w-5 text-[#00FF9C]" />
              {generatedDiagram.title}
              {generatedDiagram.warning && (
                <span className="px-2 py-1 bg-yellow-500/10 border border-yellow-500 text-yellow-400 rounded text-xs">
                  Fallback
                </span>
              )}
            </h3>
            
            <div className="flex gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => copyToClipboard(generatedDiagram.mermaid, 'mermaid')}
                className="flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 text-white rounded-lg transition-all duration-300 text-sm font-medium"
              >
                {copiedItem === 'mermaid' ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy Code
                  </>
                )}
              </motion.button>

              {generatedDiagram.svg && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={downloadSVG}
                  className="flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 text-white rounded-lg transition-all duration-300 text-sm font-medium"
                >
                  <Download className="h-4 w-4" />
                  Download SVG
                </motion.button>
              )}
            </div>
          </div>

          {/* Mermaid Diagram Preview */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6 overflow-auto">
            <div className="bg-white p-4 rounded-lg min-h-[300px]">
              <MermaidChart chart={generatedDiagram.mermaid} />
            </div>
          </div>

          {/* Code Display */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-white flex items-center gap-2">
              <FileCode className="h-4 w-4 text-[#00FF9C]" />
              Mermaid Code
            </h4>
            <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg p-4 overflow-x-auto">
              <pre className="text-sm text-[#00FF9C] font-mono">
                {generatedDiagram.mermaid}
              </pre>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
} 