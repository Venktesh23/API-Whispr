'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  History, 
  FileText, 
  FileCode, 
  FileSpreadsheet,
  Calendar,
  Clock,
  Search,
  Filter,
  ArrowRight,
  Bot,
  Trash2,
  Eye,
  Download,
  MoreHorizontal,
  Star,
  Loader2,
  ArrowLeft
} from 'lucide-react'
import { useSupabase } from '../../hooks/useSupabase'
import { useChatContext } from '../../hooks/useChatContext'
import AuthGuard from '../../components/AuthGuard'

const FILTER_OPTIONS = [
  { id: 'all', label: 'All Files', icon: FileText },
  { id: 'openapi', label: 'OpenAPI', icon: FileCode },
  { id: 'docx', label: 'Word Docs', icon: FileText },
  { id: 'pdf', label: 'PDF Files', icon: FileSpreadsheet }
]

const SORT_OPTIONS = [
  { id: 'newest', label: 'Newest First' },
  { id: 'oldest', label: 'Oldest First' },
  { id: 'name', label: 'File Name' },
  { id: 'size', label: 'File Size' }
]

export default function HistoryPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [selectedSort, setSelectedSort] = useState('newest')
  const [isLoading, setIsLoading] = useState(true)
  const [analyses, setAnalyses] = useState([])
  const [showFilterDropdown, setShowFilterDropdown] = useState(false)
  const [showSortDropdown, setShowSortDropdown] = useState(false)
  
  const router = useRouter()
  const { user, supabase } = useSupabase()
  const { setCurrentSpec } = useChatContext()

  useEffect(() => {
    if (user) {
      fetchAnalyses()
    }
  }, [user])

  const fetchAnalyses = async () => {
    try {
      setIsLoading(true)
      
      const { data, error } = await supabase
        .from('uploaded_specs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      setAnalyses(data || [])
    } catch (error) {
      console.error('Error fetching analyses:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAnalysisClick = async (analysis) => {
    try {
      // Set the current spec in context
      setCurrentSpec({
        id: analysis.id,
        filename: analysis.filename,
        filetype: analysis.filetype,
        parsed_spec: analysis.parsed_spec,
        raw_text: analysis.raw_text,
        analysis_result: analysis.analysis_result,
        created_at: analysis.created_at
      })

      // Navigate to analysis page
      router.push('/analysis')
    } catch (error) {
      console.error('Error loading analysis:', error)
    }
  }

  const handleDeleteAnalysis = async (analysisId) => {
    try {
      const { error } = await supabase
        .from('uploaded_specs')
        .delete()
        .eq('id', analysisId)
        .eq('user_id', user.id)

      if (error) throw error

      setAnalyses(prev => prev.filter(analysis => analysis.id !== analysisId))
    } catch (error) {
      console.error('Error deleting analysis:', error)
    }
  }

  const getFileIcon = (filetype) => {
    switch (filetype) {
      case 'openapi':
        return FileCode
      case 'docx':
        return FileText
      case 'pdf':
        return FileSpreadsheet
      default:
        return FileText
    }
  }

  const getFileTypeColor = (filetype) => {
    switch (filetype) {
      case 'openapi':
        return 'text-[#00FF9C]'
      case 'docx':
        return 'text-blue-400'
      case 'pdf':
        return 'text-red-400'
      default:
        return 'text-gray-400'
    }
  }

  const formatFileSize = (bytes) => {
    if (!bytes || isNaN(bytes)) return 'Unknown'
    const mb = bytes / (1024 * 1024)
    return mb > 0.01 ? `${mb.toFixed(2)} MB` : `${(bytes / 1024).toFixed(1)} KB`
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const filteredAndSortedAnalyses = analyses
    .filter(analysis => {
      const matchesSearch = analysis.filename.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesFilter = selectedFilter === 'all' || analysis.filetype === selectedFilter
      return matchesSearch && matchesFilter
    })
    .sort((a, b) => {
      switch (selectedSort) {
        case 'newest':
          return new Date(b.created_at) - new Date(a.created_at)
        case 'oldest':
          return new Date(a.created_at) - new Date(b.created_at)
        case 'name':
          return a.filename.localeCompare(b.filename)
        case 'size':
          return (b.file_size || 0) - (a.file_size || 0)
        default:
          return 0
      }
    })

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-[#0d0d0d] via-[#121212] to-[#0d0d0d] relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0" 
               style={{
                 backgroundImage: `radial-gradient(circle at 1px 1px, #00FF9C 1px, transparent 0)`,
                 backgroundSize: '50px 50px'
               }} 
          />
        </div>

        {/* Background Elements */}
        <div className="absolute inset-0 overflow-hidden z-0">
          <motion.div
            className="absolute w-72 h-72 bg-[#00FF9C]/8 blur-3xl rounded-full top-[-100px] right-[-100px] pointer-events-none"
            animate={{ y: [0, 20, 0], x: [0, -10, 0] }}
            transition={{ duration: 12, repeat: Infinity }}
          />
          <motion.div
            className="absolute w-96 h-96 bg-gray-500/8 blur-3xl rounded-full bottom-[-150px] left-[-150px] pointer-events-none"
            animate={{ y: [0, -30, 0], x: [0, 20, 0] }}
            transition={{ duration: 16, repeat: Infinity }}
          />
        </div>

        <div className="relative z-10">
          <div className="container mx-auto px-6 py-12">
            {/* Back Button */}
            <motion.button
              onClick={() => router.push('/upload')}
              className="mb-8 flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 text-white rounded-xl transition-all duration-200 font-medium"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Upload
            </motion.button>

            {/* Header */}
            <motion.div
              className="text-center mb-8"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-gray-600 to-gray-700 rounded-xl flex items-center justify-center border border-gray-500/30 shadow-lg">
                  <History className="h-6 w-6 text-[#00FF9C]" />
                </div>
                <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-gray-200 to-gray-400">
                  Analysis History
                </h1>
              </div>
              <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                Review and access your previous API documentation analyses. Click on any analysis to view the full results.
              </p>
            </motion.div>

            {/* Search and Filter Bar */}
            <motion.div
              className="max-w-4xl mx-auto mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <div className="bg-gradient-to-br from-gray-900/40 to-gray-800/40 backdrop-blur-xl border border-gray-600/30 rounded-2xl p-6">
                <div className="flex flex-col md:flex-row gap-4">
                  {/* Search */}
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by filename..."
                      className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-600/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-400/30 focus:border-gray-500/50 text-white placeholder-gray-500 transition-all"
                    />
                  </div>

                  {/* Filter */}
                  <div className="relative">
                    <button
                      onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                      className="flex items-center gap-2 px-4 py-3 bg-gray-800/50 border border-gray-600/30 rounded-xl hover:border-gray-500/50 transition-all duration-200 text-gray-300"
                    >
                      <Filter className="h-4 w-4" />
                      <span>{FILTER_OPTIONS.find(f => f.id === selectedFilter)?.label}</span>
                    </button>

                    <AnimatePresence>
                      {showFilterDropdown && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute top-full mt-2 right-0 w-48 bg-gradient-to-br from-gray-900/95 to-gray-800/95 backdrop-blur-xl border border-gray-600/30 rounded-xl shadow-xl z-20"
                        >
                          {FILTER_OPTIONS.map((option) => (
                            <button
                              key={option.id}
                              onClick={() => {
                                setSelectedFilter(option.id)
                                setShowFilterDropdown(false)
                              }}
                              className={`w-full p-3 text-left flex items-center gap-3 hover:bg-gray-700/30 transition-all duration-200 first:rounded-t-xl last:rounded-b-xl ${
                                selectedFilter === option.id ? 'bg-gray-700/40 text-[#00FF9C]' : 'text-gray-300'
                              }`}
                            >
                              <option.icon className="h-4 w-4" />
                              <span>{option.label}</span>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Sort */}
                  <div className="relative">
                    <button
                      onClick={() => setShowSortDropdown(!showSortDropdown)}
                      className="flex items-center gap-2 px-4 py-3 bg-gray-800/50 border border-gray-600/30 rounded-xl hover:border-gray-500/50 transition-all duration-200 text-gray-300"
                    >
                      <span>{SORT_OPTIONS.find(s => s.id === selectedSort)?.label}</span>
                    </button>

                    <AnimatePresence>
                      {showSortDropdown && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute top-full mt-2 right-0 w-48 bg-gradient-to-br from-gray-900/95 to-gray-800/95 backdrop-blur-xl border border-gray-600/30 rounded-xl shadow-xl z-20"
                        >
                          {SORT_OPTIONS.map((option) => (
                            <button
                              key={option.id}
                              onClick={() => {
                                setSelectedSort(option.id)
                                setShowSortDropdown(false)
                              }}
                              className={`w-full p-3 text-left hover:bg-gray-700/30 transition-all duration-200 first:rounded-t-xl last:rounded-b-xl ${
                                selectedSort === option.id ? 'bg-gray-700/40 text-[#00FF9C]' : 'text-gray-300'
                              }`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Results */}
            <motion.div
              className="max-w-6xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              {isLoading ? (
                <div className="text-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-[#00FF9C] mx-auto mb-4" />
                  <p className="text-gray-400">Loading...</p>
                </div>
              ) : filteredAndSortedAnalyses.length === 0 ? (
                <div className="text-center py-12">
                  <History className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-300 mb-2">
                    {searchQuery || selectedFilter !== 'all' ? 'No results found' : 'No analyses yet'}
                  </h3>
                  <p className="text-gray-500 mb-6">
                    {searchQuery || selectedFilter !== 'all' 
                      ? 'Try adjusting your search or filter criteria'
                      : 'Upload your first API documentation to get started'
                    }
                  </p>
                  {(!searchQuery && selectedFilter === 'all') && (
                    <motion.button
                      onClick={() => router.push('/upload')}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 text-white rounded-xl transition-all duration-200 font-medium"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Upload Documentation
                      <ArrowRight className="h-4 w-4" />
                    </motion.button>
                  )}
                </div>
              ) : (
                <div className="grid gap-6">
                  {filteredAndSortedAnalyses.map((analysis, index) => {
                    const IconComponent = getFileIcon(analysis.filetype)
                    return (
                      <motion.div
                        key={analysis.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: index * 0.1 }}
                        className="bg-gradient-to-br from-gray-900/40 to-gray-800/40 backdrop-blur-xl border border-gray-600/30 rounded-2xl p-6 hover:border-[#00FF9C]/30 transition-all duration-300 group cursor-pointer"
                        onClick={() => handleAnalysisClick(analysis)}
                        whileHover={{ y: -2 }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 flex-1">
                            <div className={`w-12 h-12 bg-gradient-to-br from-gray-700/20 to-gray-800/20 rounded-xl flex items-center justify-center border border-gray-600/30 group-hover:border-[#00FF9C]/30 transition-all duration-300`}>
                              <IconComponent className={`h-6 w-6 ${getFileTypeColor(analysis.filetype)} group-hover:text-[#00FF9C] transition-colors duration-300`} />
                            </div>
                            
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold text-gray-200 group-hover:text-white transition-colors duration-300 mb-1">
                                {analysis.filename}
                              </h3>
                              <div className="flex items-center gap-4 text-sm text-gray-400">
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  <span>{formatDate(analysis.created_at)}</span>
                                </div>
                                {analysis.file_size && (
                                  <div className="flex items-center gap-1">
                                    <FileText className="h-4 w-4" />
                                    <span>{formatFileSize(analysis.file_size)}</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-1">
                                  <span className={`px-2 py-1 bg-gray-700/30 rounded-full text-xs ${getFileTypeColor(analysis.filetype)}`}>
                                    {analysis.filetype.toUpperCase()}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <motion.button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteAnalysis(analysis.id)
                              }}
                              className="p-2 text-gray-400 hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10"
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              title="Delete analysis"
                            >
                              <Trash2 className="h-4 w-4" />
                            </motion.button>
                            
                            <div className="flex items-center gap-2 text-[#00FF9C] font-medium">
                              <span className="text-sm">View Analysis</span>
                              <ArrowRight className="h-4 w-4" />
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </motion.div>
          </div>
        </div>

        {/* Click outside to close dropdowns */}
        {(showFilterDropdown || showSortDropdown) && (
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => {
              setShowFilterDropdown(false)
              setShowSortDropdown(false)
            }}
          />
        )}
      </div>
    </AuthGuard>
  )
} 