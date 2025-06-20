'use client'

import { useState, useEffect } from 'react'
import { FileText, MessageCircle, Trash2, Download, Clock, File, Calendar, MessageSquare, User, Upload, LogOut } from 'lucide-react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { AuthGuard } from '@/components/AuthGuard'
import { Loader2 } from 'lucide-react'
import { useSupabase } from '../../hooks/useSupabase'

export default function ProfilePage() {
  const [specs, setSpecs] = useState([])
  const [chatHistory, setChatHistory] = useState([])
  const router = useRouter()

  useEffect(() => {
    // TODO: Load user's specs and chat history from Supabase
    // Mock data for now
    setSpecs([
      {
        id: 1,
        filename: 'petstore.yaml',
        uploadedAt: new Date('2024-01-15'),
        type: 'openapi',
        size: '15.0 KB',
        endpoints: 8
      },
      {
        id: 2,
        filename: 'user-api.json',
        uploadedAt: new Date('2024-01-10'),
        type: 'openapi',
        size: '23.5 KB',
        endpoints: 12
      }
    ])

    setChatHistory([
      {
        id: 1,
        specId: 1,
        question: 'How do I create a new pet?',
        createdAt: new Date('2024-01-15T10:30:00'),
        specName: 'petstore.yaml'
      },
      {
        id: 2,
        specId: 1,
        question: 'What authentication is required?',
        createdAt: new Date('2024-01-15T10:35:00'),
        specName: 'petstore.yaml'
      }
    ])
  }, [])

  const deleteSpec = (specId) => {
    setSpecs(prev => prev.filter(spec => spec.id !== specId))
    setChatHistory(prev => prev.filter(chat => chat.specId !== specId))
  }

  const deleteChatSession = (chatId) => {
    setChatHistory(prev => prev.filter(chat => chat.id !== chatId))
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-dark-tertiary p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-neon-green to-neon-cyan bg-clip-text text-transparent">
              Your Profile
            </h1>
            <p className="text-gray-400">Manage your uploaded specifications and chat history</p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Specifications */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <h2 className="text-2xl font-bold text-gray-200 mb-6">Your API Specifications</h2>
              
              {specs.length === 0 ? (
                <div className="text-center py-12">
                  <File className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-300 mb-2">
                    No specifications uploaded yet
                  </h3>
                  <p className="text-gray-400 mb-6">
                    Upload your first API specification to get started
                  </p>
                  <button
                    onClick={() => router.push('/upload')}
                    className="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200"
                  >
                    Upload Specification
                  </button>
                </div>
              ) : (
                <div className="grid gap-6">
                  {specs.map((spec) => (
                    <motion.div
                      key={spec.id}
                      className="p-6 bg-gradient-to-br from-gray-900/40 to-gray-800/40 backdrop-blur-xl border border-gray-600/30 rounded-2xl hover:border-gray-500/50 transition-all duration-200 group"
                      whileHover={{ y: -2 }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="w-12 h-12 bg-gradient-to-br from-gray-700 to-gray-800 rounded-xl flex items-center justify-center">
                            {spec.filetype === 'pdf' ? (
                              <FileText className="h-6 w-6 text-gray-300" />
                            ) : (
                              <File className="h-6 w-6 text-gray-300" />
                            )}
                          </div>
                          
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-200 mb-1">
                              {spec.filename}
                            </h3>
                            <div className="flex items-center gap-4 text-sm text-gray-400">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {formatDate(spec.created_at)}
                              </span>
                              <span className="flex items-center gap-1">
                                <MessageSquare className="h-4 w-4" />
                                {chatCounts[spec.id] || 0} chats
                              </span>
                              <span className="px-2 py-1 bg-gray-700/50 rounded text-xs uppercase">
                                {spec.filetype}
                              </span>
                            </div>
                            
                            {spec.parsed_spec?.info && (
                              <div className="mt-2">
                                <p className="text-sm text-gray-300">
                                  {spec.parsed_spec.info.title}
                                </p>
                                {spec.parsed_spec.info.version && (
                                  <p className="text-xs text-gray-400">
                                    Version {spec.parsed_spec.info.version}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => router.push(`/chat?spec=${spec.id}`)}
                            className="px-4 py-2 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 text-white text-sm rounded-lg transition-all duration-200"
                          >
                            Open Chat
                          </button>
                          <button
                            onClick={() => deleteSpec(spec.id)}
                            className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                            title="Delete specification"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Chat History */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
                <MessageCircle className="w-5 h-5 mr-2 text-neon-cyan" />
                Recent Questions ({chatHistory.length})
              </h2>
              
              <div className="space-y-4">
                {chatHistory.map(chat => (
                  <div key={chat.id} className="bg-dark-card rounded-lg p-4 border border-gray-800">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">{chat.question}</p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                          <div className="flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {chat.createdAt.toLocaleString()}
                          </div>
                          <div className="flex items-center">
                            <FileText className="w-3 h-3 mr-1" />
                            {chat.specName}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => deleteChatSession(chat.id)}
                        className="text-gray-400 hover:text-red-400 transition-colors ml-4"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                
                {chatHistory.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No chat history yet</p>
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