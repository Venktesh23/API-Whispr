'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Send, 
  Loader2, 
  File, 
  FileText, 
  MessageSquare,
  Trash2,
  Upload,
  Bot,
  User
} from 'lucide-react'
import { useSupabase } from '../../hooks/useSupabase'
import AuthGuard from '../../components/AuthGuard'

export default function ChatPage() {
  const [messages, setMessages] = useState([])
  const [currentMessage, setCurrentMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [currentSpec, setCurrentSpec] = useState(null)
  const [specs, setSpecs] = useState([])
  const messagesEndRef = useRef(null)
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const specId = searchParams.get('spec')
  const { user, supabase } = useSupabase()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (user) {
      loadUserSpecs()
      if (specId) {
        loadSpec(specId)
        loadChatHistory(specId)
      }
    }
  }, [user, specId])

  const loadUserSpecs = async () => {
    const { data, error } = await supabase
      .from('api_specs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    
    if (!error && data) {
      setSpecs(data)
    }
  }

  const loadSpec = async (id) => {
    const { data, error } = await supabase
      .from('api_specs')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()
    
    if (!error && data) {
      setCurrentSpec(data)
    }
  }

  const loadChatHistory = async (id) => {
    const { data, error } = await supabase
      .from('chat_history')
      .select('*')
      .eq('spec_id', id)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
    
    if (!error && data) {
      const formattedMessages = data.flatMap(chat => [
        { role: 'user', content: chat.question, timestamp: chat.created_at },
        { role: 'assistant', content: chat.answer, timestamp: chat.created_at }
      ])
      setMessages(formattedMessages)
    }
  }

  const sendMessage = async () => {
    if (!currentMessage.trim() || !currentSpec || isLoading) return
    
    const userMessage = currentMessage
    setCurrentMessage('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage, timestamp: new Date().toISOString() }])
    setIsLoading(true)
    
    try {
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: userMessage,
          spec: currentSpec.parsed_spec || currentSpec.raw_text,
          specType: currentSpec.filetype
        }),
      })
      
      if (!response.ok) throw new Error('Failed to get response')
      
      const data = await response.json()
      const assistantMessage = { role: 'assistant', content: data.answer, timestamp: new Date().toISOString() }
      
      setMessages(prev => [...prev, assistantMessage])
      
      // Save to database
      await supabase
        .from('chat_history')
        .insert({
          user_id: user.id,
          spec_id: currentSpec.id,
          question: userMessage,
          answer: data.answer
        })
      
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.', 
        timestamp: new Date().toISOString() 
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const clearChat = async () => {
    if (!currentSpec) return
    
    setMessages([])
    await supabase
      .from('chat_history')
      .delete()
      .eq('spec_id', currentSpec.id)
      .eq('user_id', user.id)
  }

  const formatMessage = (content) => {
    // Simple formatting - you can enhance this
    return content.split('\n').map((line, i) => (
      <p key={i} className="mb-2 last:mb-0">
        {line}
      </p>
    ))
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-black text-white flex">
        {/* Sidebar */}
        <div className="w-80 bg-gradient-to-b from-gray-900/50 to-gray-800/50 border-r border-gray-600/30 p-6">
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-200 mb-4">Current Specification</h2>
              {currentSpec ? (
                <div className="p-4 bg-gray-800/30 rounded-xl border border-gray-600/20">
                  <div className="flex items-center gap-3 mb-2">
                    {currentSpec.filetype === 'pdf' ? (
                      <FileText className="h-5 w-5 text-gray-300" />
                    ) : (
                      <File className="h-5 w-5 text-gray-300" />
                    )}
                    <span className="font-medium text-gray-200 text-sm truncate">
                      {currentSpec.filename}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 capitalize">
                    {currentSpec.filetype} • {new Date(currentSpec.created_at).toLocaleDateString()}
                  </p>
                  {currentSpec.parsed_spec?.info && (
                    <div className="mt-3 pt-3 border-t border-gray-600/20">
                      <p className="text-xs font-medium text-gray-300">
                        {currentSpec.parsed_spec.info.title}
                      </p>
                      {currentSpec.parsed_spec.info.version && (
                        <p className="text-xs text-gray-400">
                          v{currentSpec.parsed_spec.info.version}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-gray-800/20 rounded-xl border border-gray-600/20 text-center">
                  <p className="text-gray-400 text-sm">No specification selected</p>
                  <button
                    onClick={() => router.push('/upload')}
                    className="mt-2 text-gray-300 hover:text-gray-100 text-sm underline"
                  >
                    Upload a spec
                  </button>
                </div>
              )}
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-300 mb-3">Your Specifications</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {specs.map((spec) => (
                  <button
                    key={spec.id}
                    onClick={() => router.push(`/chat?spec=${spec.id}`)}
                    className={`w-full p-3 rounded-lg text-left transition-all ${
                      currentSpec?.id === spec.id
                        ? 'bg-gray-700/50 border border-gray-500/30'
                        : 'bg-gray-800/20 hover:bg-gray-700/30 border border-gray-600/20'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {spec.filetype === 'pdf' ? (
                        <FileText className="h-4 w-4 text-gray-400" />
                      ) : (
                        <File className="h-4 w-4 text-gray-400" />
                      )}
                      <span className="text-sm text-gray-200 truncate">
                        {spec.filename}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(spec.created_at).toLocaleDateString()}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-gray-600/20">
              <button
                onClick={() => router.push('/upload')}
                className="w-full p-3 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
              >
                <Upload className="h-4 w-4" />
                <span className="text-sm font-medium">Upload New Spec</span>
              </button>
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-gray-600/30 bg-gradient-to-r from-gray-900/30 to-gray-800/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-6 w-6 text-gray-300" />
                <h1 className="text-xl font-semibold text-gray-100">
                  Chat with Your API
                </h1>
              </div>
              {messages.length > 0 && (
                <button
                  onClick={clearChat}
                  className="p-2 text-gray-400 hover:text-gray-200 transition-colors"
                  title="Clear chat"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <Bot className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-300 mb-2">
                  Ready to help with your API
                </h3>
                <p className="text-gray-400 max-w-md mx-auto">
                  Ask me anything about your API specification. I can help you understand endpoints, parameters, authentication, and more.
                </p>
              </div>
            ) : (
              <AnimatePresence>
                {messages.map((message, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex gap-3 max-w-3xl ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        message.role === 'user' 
                          ? 'bg-gradient-to-br from-gray-600 to-gray-700' 
                          : 'bg-gradient-to-br from-gray-700 to-gray-800'
                      }`}>
                        {message.role === 'user' ? (
                          <User className="h-4 w-4 text-gray-200" />
                        ) : (
                          <Bot className="h-4 w-4 text-gray-200" />
                        )}
                      </div>
                      <div className={`p-4 rounded-2xl ${
                        message.role === 'user'
                          ? 'bg-gradient-to-br from-gray-700 to-gray-800 text-gray-100'
                          : 'bg-gradient-to-br from-gray-800/50 to-gray-900/50 text-gray-200'
                      }`}>
                        <div className="prose prose-sm prose-invert max-w-none">
                          {formatMessage(message.content)}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
            
            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-4"
              >
                <div className="flex gap-3 max-w-3xl">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-gray-200" />
                  </div>
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-gray-800/50 to-gray-900/50">
                    <div className="flex items-center gap-2 text-gray-400">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Thinking...</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-6 border-t border-gray-600/30 bg-gradient-to-r from-gray-900/30 to-gray-800/30">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder={currentSpec ? "Ask about your API..." : "Please select a specification first"}
                  disabled={!currentSpec || isLoading}
                  className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-400/30 focus:border-gray-500 text-white placeholder-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
              <button
                onClick={sendMessage}
                disabled={!currentMessage.trim() || !currentSpec || isLoading}
                className="px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 text-white rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  )
} 