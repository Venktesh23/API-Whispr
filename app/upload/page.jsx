'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Upload, 
  FileText, 
  File, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  ArrowRight,
  X,
  ChevronDown,
  FileCode,
  FileSpreadsheet,
  Clipboard
} from 'lucide-react'
import { useSupabase } from '../../hooks/useSupabase'
import { useChatContext } from '../../hooks/useChatContext'
import AuthGuard from '../../components/AuthGuard'

const FILE_TYPES = [
  {
    id: 'openapi',
    label: 'OpenAPI Specification',
    description: 'JSON or YAML API specifications',
    icon: FileCode,
    accept: '.json,.yaml,.yml',
    formats: ['JSON', 'YAML'],
    color: 'text-gray-300'
  },
  {
    id: 'docx',
    label: 'Word Document',
    description: 'API documentation in DOCX format',
    icon: FileText,
    accept: '.docx',
    formats: ['DOCX'],
    color: 'text-gray-300'
  },
  {
    id: 'pdf',
    label: 'PDF Document',
    description: 'API documentation in PDF format',
    icon: FileSpreadsheet,
    accept: '.pdf',
    formats: ['PDF'],
    color: 'text-gray-300'
  }
]

const PASTE_TYPES = [
  {
    id: 'json',
    label: 'JSON Content',
    description: 'OpenAPI spec or any JSON data',
    icon: FileCode,
    placeholder: 'Paste your JSON content here...\n\nExample:\n{\n  "openapi": "3.0.0",\n  "info": {\n    "title": "My API",\n    "version": "1.0.0"\n  }\n}',
    color: 'text-gray-300'
  },
  {
    id: 'yaml',
    label: 'YAML Content',
    description: 'OpenAPI spec or any YAML data',
    icon: FileCode,
    placeholder: 'Paste your YAML content here...\n\nExample:\nopenapi: 3.0.0\ninfo:\n  title: My API\n  version: 1.0.0',
    color: 'text-gray-300'
  },
  {
    id: 'text',
    label: 'Raw Text',
    description: 'API documentation or any text content',
    icon: FileText,
    placeholder: 'Paste your API documentation here...\n\nThis can be any text content describing your API, documentation, or specifications.',
    color: 'text-gray-300'
  }
]

export default function UploadPage() {
  const [activeTab, setActiveTab] = useState('upload')
  
  // Upload mode states
  const [selectedFileType, setSelectedFileType] = useState(FILE_TYPES[0])
  const [showFileDropdown, setShowFileDropdown] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [file, setFile] = useState(null)
  
  // Paste mode states
  const [selectedPasteType, setSelectedPasteType] = useState(PASTE_TYPES[0])
  const [showPasteDropdown, setShowPasteDropdown] = useState(false)
  const [pastedContent, setPastedContent] = useState('')
  
  // Common states
  const [isProcessing, setIsProcessing] = useState(false)
  const [alert, setAlert] = useState({ type: '', message: '' })
  
  const router = useRouter()
  const { user, supabase, signOut } = useSupabase()
  const { setCurrentSpec, setChatOpen } = useChatContext()

  const handleDrag = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const validateFile = (file) => {
    const allowedExtensions = selectedFileType.accept.split(',')
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))
    
    if (!allowedExtensions.includes(fileExtension)) {
      return `Please upload a ${selectedFileType.formats.join(' or ')} file for ${selectedFileType.label}`
    }
    
    if (file.size > 10 * 1024 * 1024) {
      return 'File size must be less than 10MB'
    }
    
    return null
  }

  const validatePastedContent = (content) => {
    if (!content.trim()) {
      return 'Please paste some content'
    }
    
    if (content.length > 1024 * 1024) {
      return 'Pasted content is too large (max 1MB)'
    }
    
    if (selectedPasteType.id === 'json') {
      try {
        JSON.parse(content)
      } catch (error) {
        return 'Invalid JSON format. Please check your syntax.'
      }
    }
    
    return null
  }

  const handleFileChange = useCallback((e) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files)
    }
  }, [selectedFileType])

  const handleFiles = async (files) => {
    const file = files[0]
    if (!file) return
    
    const validationError = validateFile(file)
    if (validationError) {
      setAlert({ type: 'error', message: validationError })
      return
    }
    
    setFile(file)
    setAlert({ type: '', message: '' })
  }

  const handleDrop = useCallback(async (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleFiles(e.dataTransfer.files)
    }
  }, [selectedFileType])

  const handleFileUpload = async () => {
    if (!file || !user || isProcessing) return
    
    setIsProcessing(true)
    setAlert({ type: '', message: '' })
    
    try {
      // Step 1: Upload file via API
      const formData = new FormData()
      formData.append('file', file)
      formData.append('userId', user.id)
      formData.append('fileType', selectedFileType.id)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed')
      }

      console.log('✅ Upload API success:', result.spec.id)

      // Step 2: ✅ FETCH LATEST SPEC WITH PROPER SUPABASE CLIENT
      const { data: latestSpecs, error: fetchError } = await supabase
        .from('api_specs')
        .select('*')
        .eq('user_id', user.id) // ✅ Filter by current user
        .order('created_at', { ascending: false }) // ✅ Correct order syntax
        .limit(1)

      if (fetchError) {
        console.error("❌ Failed to fetch latest spec:", fetchError)
        throw new Error('Failed to retrieve uploaded specification')
      }

      if (!latestSpecs || latestSpecs.length === 0) {
        throw new Error('No specification found after upload')
      }

      const latestSpec = latestSpecs[0]
      console.log('✅ Fetched latest spec:', latestSpec.id)

      // Step 3: Store and navigate
      const specData = {
        id: latestSpec.id,
        filename: latestSpec.filename,
        filetype: latestSpec.filetype,
        parsed_spec: latestSpec.parsed_spec,
        raw_text: latestSpec.raw_text,
        question: 'Analyze this API specification'
      }
      
      sessionStorage.setItem('currentSpec', JSON.stringify(specData))
      sessionStorage.setItem('isAuthenticated', 'true')
      
      console.log('✅ Upload complete, navigating to analysis...')
      router.push('/analysis')

    } catch (error) {
      console.error('❌ Upload error:', error)
      setAlert({
        type: 'error',
        message: error.message || 'Failed to upload file. Please try again.'
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleContentPaste = async () => {
    if (!pastedContent || !user || isProcessing) return
    
    const validationError = validatePastedContent(pastedContent)
    if (validationError) {
      setAlert({ type: 'error', message: validationError })
      return
    }
    
    setIsProcessing(true)
    setAlert({ type: '', message: '' })
    
    try {
      // Step 1: Process paste via API
      const response = await fetch('/api/paste', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: pastedContent,
          contentType: selectedPasteType.id,
          userId: user.id,
          filename: `Pasted_${selectedPasteType.label}_${Date.now()}.${selectedPasteType.id === 'text' ? 'txt' : selectedPasteType.id}`
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Processing failed')
      }

      console.log('✅ Paste API success:', result.spec.id)

      // Step 2: ✅ FETCH LATEST SPEC WITH PROPER SUPABASE CLIENT
      const { data: latestSpecs, error: fetchError } = await supabase
        .from('api_specs')
        .select('*')
        .eq('user_id', user.id) // ✅ Filter by current user
        .order('created_at', { ascending: false }) // ✅ Correct order syntax
        .limit(1)

      if (fetchError) {
        console.error("❌ Failed to fetch latest spec:", fetchError)
        throw new Error('Failed to retrieve processed specification')
      }

      if (!latestSpecs || latestSpecs.length === 0) {
        throw new Error('No specification found after processing')
      }

      const latestSpec = latestSpecs[0]
      console.log('✅ Fetched latest spec:', latestSpec.id)

      // Step 3: Store and navigate
      const specData = {
        id: latestSpec.id,
        filename: latestSpec.filename,
        filetype: latestSpec.filetype,
        parsed_spec: latestSpec.parsed_spec,
        raw_text: latestSpec.raw_text,
        question: 'Analyze this API specification'
      }
      
      sessionStorage.setItem('currentSpec', JSON.stringify(specData))
      sessionStorage.setItem('isAuthenticated', 'true')
      
      console.log('✅ Paste processing complete, navigating to analysis...')
      router.push('/analysis')

    } catch (error) {
      console.error('❌ Paste error:', error)
      setAlert({
        type: 'error',
        message: error.message || 'Failed to process content. Please try again.'
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const getFileIcon = (filename) => {
    const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'))
    if (extension === '.pdf') return FileSpreadsheet
    if (extension === '.docx') return FileText
    return FileCode
  }

  const clearAll = () => {
    setFile(null)
    setPastedContent('')
    setAlert({ type: '', message: '' })
  }

  const tabButtonClass = (isActive) => `
    flex-1 py-3 px-6 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2
    ${isActive 
      ? 'bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 text-white shadow-md' 
      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/30'
    }
  `

  return (
    <AuthGuard>
      <style jsx global>{`
        /* Override any default blue focus styles */
        input:focus, textarea:focus, button:focus {
          outline: none !important;
          box-shadow: none !important;
        }
        
        /* Ensure no blue highlighting on file inputs */
        input[type="file"]:focus {
          outline: none !important;
          box-shadow: none !important;
        }
        
        /* Override browser defaults */
        *:focus {
          outline: none !important;
        }
      `}</style>
      <div className="min-h-screen bg-black text-white font-['Inter',sans-serif] relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 overflow-hidden z-0">
          <motion.div
            className="absolute w-72 h-72 bg-gray-500/8 blur-3xl rounded-full top-[-100px] right-[-100px] pointer-events-none"
            animate={{ y: [0, 20, 0], x: [0, -10, 0] }}
            transition={{ duration: 12, repeat: Infinity }}
          />
          <motion.div
            className="absolute w-96 h-96 bg-gray-400/8 blur-3xl rounded-full bottom-[-150px] left-[-150px] pointer-events-none"
            animate={{ y: [0, -30, 0], x: [0, 20, 0] }}
            transition={{ duration: 16, repeat: Infinity }}
          />
        </div>

        <div className="relative z-10 min-h-screen">


          <div className="container mx-auto px-6 py-12">
            {/* Header */}
            <motion.div
              className="text-center mb-12"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-gray-200 to-gray-400 mb-4">
                Add Your API Documentation
              </h1>
              <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                Upload files or paste content directly to get started with AI-powered API analysis
              </p>
            </motion.div>

            {/* Tab Selector */}
            <motion.div
              className="max-w-2xl mx-auto mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <div className="p-2 bg-gradient-to-br from-gray-800/50 to-gray-700/50 backdrop-blur-xl border border-gray-600/30 rounded-xl">
                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveTab('upload')}
                    className={tabButtonClass(activeTab === 'upload')}
                  >
                    <Upload className="h-4 w-4" />
                    Upload File
                  </button>
                  <button
                    onClick={() => setActiveTab('paste')}
                    className={tabButtonClass(activeTab === 'paste')}
                  >
                    <Clipboard className="h-4 w-4" />
                    Paste Content
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Content Area */}
            <motion.div
              className="max-w-4xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="bg-gradient-to-br from-gray-700/50 to-gray-800/50 backdrop-blur-xl border border-gray-600/30 rounded-2xl p-12 shadow-xl min-h-[600px]">
                
                {/* Alert Messages */}
                <AnimatePresence>
                  {alert.message && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className={`mb-6 p-4 rounded-xl border flex items-center gap-3 ${
                        alert.type === 'error' 
                          ? 'bg-red-500/10 border-red-500/30 text-red-400' 
                          : 'bg-green-500/10 border-green-500/30 text-green-400'
                      }`}
                    >
                      {alert.type === 'error' ? (
                        <AlertCircle className="h-5 w-5 flex-shrink-0" />
                      ) : (
                        <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
                      )}
                      <span className="text-sm">{alert.message}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {activeTab === 'upload' ? (
                  <div className="space-y-6">
                    {/* File Type Selector */}
                    <div className="relative">
                      <label className="block text-sm font-medium text-gray-300 mb-3">
                        Select File Type
                      </label>
                      <button
                        onClick={() => setShowFileDropdown(!showFileDropdown)}
                        className="w-full p-4 bg-gray-800/30 border border-gray-600/30 rounded-xl text-left flex items-center justify-between hover:border-gray-500/50 transition-all duration-200"
                      >
                        <div className="flex items-center gap-3">
                          <selectedFileType.icon className={`h-5 w-5 ${selectedFileType.color}`} />
                          <div>
                            <p className="font-medium text-gray-200">{selectedFileType.label}</p>
                            <p className="text-sm text-gray-400">{selectedFileType.description}</p>
                          </div>
                        </div>
                        <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${showFileDropdown ? 'rotate-180' : ''}`} />
                      </button>

                      <AnimatePresence>
                        {showFileDropdown && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute top-full mt-2 w-full bg-gradient-to-br from-gray-700/95 to-gray-800/95 backdrop-blur-xl border border-gray-600/30 rounded-xl shadow-xl z-20"
                          >
                            {FILE_TYPES.map((fileType) => (
                              <button
                                key={fileType.id}
                                onClick={() => {
                                  setSelectedFileType(fileType)
                                  setShowFileDropdown(false)
                                  if (file) {
                                    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))
                                    if (!fileType.accept.split(',').includes(fileExtension)) {
                                      setFile(null)
                                    }
                                  }
                                }}
                                className={`w-full p-4 text-left flex items-center gap-3 hover:bg-gray-700/30 transition-all duration-200 first:rounded-t-xl last:rounded-b-xl ${
                                  selectedFileType.id === fileType.id ? 'bg-gray-700/40' : ''
                                }`}
                              >
                                <fileType.icon className={`h-5 w-5 ${fileType.color}`} />
                                <div>
                                  <p className="font-medium text-gray-200">{fileType.label}</p>
                                  <p className="text-sm text-gray-400">{fileType.description}</p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    Supports: {fileType.formats.join(', ')}
                                  </p>
                                </div>
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {!file ? (
                      <div
                        className={`relative border-2 border-dashed rounded-xl p-16 text-center transition-all duration-300 min-h-[400px] flex items-center justify-center ${
                          dragActive 
                            ? 'border-gray-400/50 bg-gray-700/20' 
                            : 'border-gray-600/30 hover:border-gray-500/50'
                        }`}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                      >
                        <input
                          type="file"
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer focus:outline-none"
                          accept={selectedFileType.accept}
                          onChange={handleFileChange}
                          disabled={isProcessing}
                        />
                        
                        <motion.div
                          className="space-y-4"
                          whileHover={{ scale: 1.02 }}
                          transition={{ type: "spring", stiffness: 400, damping: 10 }}
                        >
                          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-gray-700/20 to-gray-800/20 rounded-full flex items-center justify-center border border-gray-600/30">
                            <Upload className="h-8 w-8 text-gray-300" />
                          </div>
                          
                          <div>
                            <h3 className="text-xl font-semibold text-gray-200 mb-2">
                              Drop your {selectedFileType.label.toLowerCase()} here
                            </h3>
                            <p className="text-gray-400 text-sm">
                              or click to browse • Supports {selectedFileType.formats.join(', ')} files up to 10MB
                            </p>
                          </div>
                          
                          <div className="flex items-center justify-center gap-4 pt-4">
                            {selectedFileType.formats.map((format) => (
                              <div key={format} className="flex items-center gap-2 text-gray-400 text-sm">
                                <selectedFileType.icon className="h-4 w-4" />
                                <span>{format}</span>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="flex items-center gap-4 p-4 bg-gray-800/30 rounded-xl border border-gray-600/20">
                          {(() => {
                            const IconComponent = getFileIcon(file.name)
                            return <IconComponent className="h-8 w-8 text-gray-300" />
                          })()}
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-200">{file.name}</h4>
                            <p className="text-sm text-gray-400">
                              {(file.size / 1024 / 1024).toFixed(2)} MB • {selectedFileType.label}
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              setFile(null)
                            }}
                            className="p-2 text-gray-400 hover:text-gray-200 transition-colors"
                          >
                            <X className="h-5 w-5" />
                          </button>
                        </div>

                        <div className="flex gap-4">
                          <button
                            type="button"
                            onClick={() => setFile(null)}
                            disabled={isProcessing}
                            className="flex-1 py-3 px-6 border border-gray-600/30 text-gray-300 rounded-xl hover:bg-gray-700/20 transition-all duration-200 disabled:opacity-50"
                          >
                            Choose Different File
                          </button>
                          <button
                            type="button"
                            onClick={handleFileUpload}
                            disabled={isProcessing}
                            className="flex-1 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                          >
                            {isProcessing ? (
                              <>
                                <Loader2 className="h-5 w-5 animate-spin" />
                                Loading...
                              </>
                            ) : (
                              <>
                                Analyze
                                <ArrowRight className="h-5 w-5" />
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Content Type Selector */}
                    <div className="relative">
                      <label className="block text-sm font-medium text-gray-300 mb-3">
                        Select Content Type
                      </label>
                      <button
                        onClick={() => setShowPasteDropdown(!showPasteDropdown)}
                        className="w-full p-4 bg-gray-800/30 border border-gray-600/30 rounded-xl text-left flex items-center justify-between hover:border-gray-500/50 transition-all duration-200"
                      >
                        <div className="flex items-center gap-3">
                          <selectedPasteType.icon className={`h-5 w-5 ${selectedPasteType.color}`} />
                          <div>
                            <p className="font-medium text-gray-200">{selectedPasteType.label}</p>
                            <p className="text-sm text-gray-400">{selectedPasteType.description}</p>
                          </div>
                        </div>
                        <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${showPasteDropdown ? 'rotate-180' : ''}`} />
                      </button>

                      <AnimatePresence>
                        {showPasteDropdown && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute top-full mt-2 w-full bg-gradient-to-br from-gray-700/95 to-gray-800/95 backdrop-blur-xl border border-gray-600/30 rounded-xl shadow-xl z-20"
                          >
                            {PASTE_TYPES.map((pasteType) => (
                              <button
                                key={pasteType.id}
                                onClick={() => {
                                  setSelectedPasteType(pasteType)
                                  setShowPasteDropdown(false)
                                }}
                                className={`w-full p-4 text-left flex items-center gap-3 hover:bg-gray-700/30 transition-all duration-200 first:rounded-t-xl last:rounded-b-xl ${
                                  selectedPasteType.id === pasteType.id ? 'bg-gray-700/40' : ''
                                }`}
                              >
                                <pasteType.icon className={`h-5 w-5 ${pasteType.color}`} />
                                <div>
                                  <p className="font-medium text-gray-200">{pasteType.label}</p>
                                  <p className="text-sm text-gray-400">{pasteType.description}</p>
                                </div>
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Paste Area */}
                    <div className="space-y-4">
                      <textarea
                        value={pastedContent}
                        onChange={(e) => setPastedContent(e.target.value)}
                        placeholder={selectedPasteType.placeholder}
                        className="w-full h-80 px-4 py-3 bg-gray-800/50 border border-gray-600/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-400/30 focus:border-gray-500/50 text-white placeholder-gray-500 text-sm resize-none font-mono"
                        disabled={isProcessing}
                      />
                      
                      <div className="flex items-center justify-between text-sm text-gray-400">
                        <span>Characters: {pastedContent.length.toLocaleString()}</span>
                      </div>

                      {pastedContent && (
                        <div className="mt-4">
                          <button
                            type="button"
                            onClick={handleContentPaste}
                            disabled={isProcessing || !pastedContent.trim()}
                            className="w-full bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                          >
                            {isProcessing ? (
                              <>
                                <Loader2 className="h-5 w-5 animate-spin" />
                                Loading...
                              </>
                            ) : (
                              <>
                                Analyze
                                <ArrowRight className="h-5 w-5" />
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>


      </div>
    </AuthGuard>
  )
} 