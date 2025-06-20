'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  MessageCircle,
  Send,
  Bot,
  User,
  Minimize2,
  Trash2,
  Loader2,
  X,
  Sparkles
} from 'lucide-react'
import { useChatContext } from '../hooks/useChatContext'

export default function FloatingChat() {
  const [currentMessage, setCurrentMessage] = useState('')
  const [isChatLoading, setIsChatLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef(null)
  
  const {
    currentSpec,
    chatMessages,
    setChatMessages,
    chatOpen,
    setChatOpen,
    clearChat
  } = useChatContext()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [chatMessages])

  const sendChatMessage = async () => {
    if (!currentMessage.trim() || isChatLoading) return
    
    const userMessage = currentMessage
    setCurrentMessage('')
    setChatMessages(prev => [...prev, { 
      role: 'user', 
      content: userMessage, 
      timestamp: new Date().toISOString() 
    }])
    setIsChatLoading(true)
    setIsTyping(true)
    
    try {
      // Simulate typing delay
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: userMessage,
          spec: currentSpec?.parsed_spec || currentSpec?.raw_text || null,
          specType: currentSpec?.filetype || 'general'
        }),
      })
      
      if (!response.ok) throw new Error('Failed to get response')
      
      const data = await response.json()
      
      setIsTyping(false)
      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: data.answer, 
        timestamp: new Date().toISOString() 
      }])
      
    } catch (error) {
      setIsTyping(false)
      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.', 
        timestamp: new Date().toISOString() 
      }])
    } finally {
      setIsChatLoading(false)
    }
  }

  const formatMessage = (content) => {
    return content.split('\n').map((line, i) => (
      <p key={i} className="mb-2 last:mb-0">
        {line}
      </p>
    ))
  }

  // Always show chat - it can work with or without a spec

  return (
    <>
      {/* Floating Chat Button with Enhanced Animation */}
      {!chatOpen && (
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          className="fixed bottom-6 right-6 z-50"
        >
          <motion.button
            onClick={() => setChatOpen(true)}
            className="relative w-16 h-16 bg-gradient-to-br from-gray-600 via-gray-700 to-gray-800 rounded-full shadow-2xl flex items-center justify-center group"
            whileHover={{ 
              scale: 1.1, 
              y: -8,
              boxShadow: "0 20px 40px rgba(0,0,0,0.4)"
            }}
            whileTap={{ scale: 0.9 }}
            style={{
              boxShadow: "0 10px 30px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.1)"
            }}
          >
            {/* Animated background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-gray-500/20 via-gray-600/20 to-gray-700/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            {/* Sparkle effects */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <Sparkles className="absolute top-2 right-2 h-3 w-3 text-gray-300 animate-pulse" />
              <Sparkles className="absolute bottom-3 left-3 h-2 w-2 text-gray-400 animate-pulse delay-300" />
            </div>
            
            <MessageCircle className="h-7 w-7 text-white relative z-10 group-hover:scale-110 transition-transform duration-200" />
            
            {/* Pulse ring animation */}
            <div className="absolute inset-0 rounded-full border-2 border-gray-400/30 animate-ping" />
            
            {/* Notification badge */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-r from-gray-500 to-gray-600 rounded-full flex items-center justify-center border-2 border-gray-800 shadow-lg"
            >
              <Bot className="h-3 w-3 text-white" />
            </motion.div>
          </motion.button>
        </motion.div>
      )}

      {/* Enhanced Floating Chat Window */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.8, rotateX: -15 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
            exit={{ opacity: 0, y: 100, scale: 0.8, rotateX: 15 }}
            transition={{ 
              type: "spring", 
              damping: 25, 
              stiffness: 200,
              duration: 0.4
            }}
            className="fixed bottom-6 right-6 w-96 h-[600px] z-50 flex flex-col"
            style={{
              perspective: "1000px"
            }}
          >
            <div className="bg-gradient-to-br from-gray-900/95 via-gray-800/95 to-gray-900/95 backdrop-blur-xl border border-gray-600/30 rounded-2xl shadow-2xl flex flex-col h-full overflow-hidden"
                 style={{
                   boxShadow: "0 25px 50px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05), inset 0 1px 0 rgba(255,255,255,0.1)"
                 }}>
              
              {/* Enhanced Chat Header */}
              <motion.div 
                className="flex items-center justify-between p-4 border-b border-gray-600/30 bg-gradient-to-r from-gray-800/40 via-gray-700/40 to-gray-800/40 relative overflow-hidden"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                {/* Animated background pattern */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute inset-0 bg-gradient-to-r from-gray-600/20 via-transparent to-gray-600/20 transform -skew-x-12" />
                </div>
                
                <div className="flex items-center gap-3 relative z-10">
                  <motion.div
                    className="w-10 h-10 bg-gradient-to-br from-gray-600 via-gray-700 to-gray-800 rounded-full flex items-center justify-center border border-gray-500/30 shadow-lg relative overflow-hidden"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                  >
                    <Bot className="h-5 w-5 text-white relative z-10" />
                    <div className="absolute inset-0 bg-gradient-to-br from-gray-500/20 to-transparent rounded-full" />
                  </motion.div>
                  <div>
                    <h3 className="font-semibold text-gray-200">API Whispr Assistant</h3>
                    <motion.p 
                      className="text-xs text-gray-400 truncate max-w-[200px]" 
                      title={currentSpec?.filename || 'General Assistant'}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                    >
                      {currentSpec?.filename || 'Ready to help with APIs & development'}
                    </motion.p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 relative z-10">
                  {chatMessages.length > 1 && (
                    <motion.button
                      onClick={clearChat}
                      className="p-2 text-gray-400 hover:text-gray-200 transition-colors rounded-lg hover:bg-gray-700/30 relative group"
                      title="Clear chat"
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <Trash2 className="h-4 w-4" />
                      <div className="absolute inset-0 bg-red-500/10 opacity-0 group-hover:opacity-100 rounded-lg transition-opacity duration-200" />
                    </motion.button>
                  )}
                  <motion.button
                    onClick={() => setChatOpen(false)}
                    className="p-2 text-gray-400 hover:text-gray-200 transition-colors rounded-lg hover:bg-gray-700/30 relative group"
                    title="Minimize chat"
                    whileHover={{ scale: 1.1, rotate: -5 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <X className="h-4 w-4" />
                    <div className="absolute inset-0 bg-gray-500/10 opacity-0 group-hover:opacity-100 rounded-lg transition-opacity duration-200" />
                  </motion.button>
                </div>
              </motion.div>

              {/* API Info Banner with Animation */}
              {currentSpec?.parsed_spec?.info && (
                <motion.div 
                  className="p-3 bg-gradient-to-r from-gray-800/20 via-gray-700/20 to-gray-800/20 border-b border-gray-600/20 relative overflow-hidden"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-gray-600/5 via-transparent to-gray-600/5" />
                  <p className="text-sm font-medium text-gray-200 relative z-10">
                    {currentSpec.parsed_spec.info.title}
                  </p>
                  {currentSpec.parsed_spec.info.version && (
                    <p className="text-xs text-gray-400 relative z-10">
                      Version {currentSpec.parsed_spec.info.version}
                    </p>
                  )}
                </motion.div>
              )}

              {/* Enhanced Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
                <AnimatePresence>
                  {chatMessages.map((message, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ 
                        delay: index * 0.1,
                        type: "spring",
                        damping: 20,
                        stiffness: 200
                      }}
                      className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex gap-3 max-w-[85%] ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        <motion.div 
                          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-lg ${
                            message.role === 'user' 
                              ? 'bg-gradient-to-br from-gray-600 to-gray-700 border border-gray-500/30' 
                              : 'bg-gradient-to-br from-gray-700 to-gray-800 border border-gray-600/30'
                          }`}
                          whileHover={{ scale: 1.1 }}
                        >
                          {message.role === 'user' ? (
                            <User className="h-4 w-4 text-white" />
                          ) : (
                            <Bot className="h-4 w-4 text-white" />
                          )}
                        </motion.div>
                        <motion.div 
                          className={`p-3 rounded-xl text-sm leading-relaxed shadow-lg relative overflow-hidden ${
                            message.role === 'user'
                              ? 'bg-gradient-to-br from-gray-700/40 to-gray-600/40 text-gray-100 border border-gray-500/20'
                              : 'bg-gradient-to-br from-gray-800/60 to-gray-900/60 text-gray-200 border border-gray-600/20'
                          }`}
                          whileHover={{ scale: 1.02, y: -2 }}
                          style={{
                            boxShadow: "0 4px 15px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1)"
                          }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
                          <div className="prose prose-sm prose-invert max-w-none relative z-10">
                            {formatMessage(message.content)}
                          </div>
                        </motion.div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                
                {/* Enhanced Typing Indicator */}
                {isTyping && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="flex gap-3"
                  >
                    <div className="flex gap-3 max-w-[85%]">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 border border-gray-600/30 flex items-center justify-center shadow-lg">
                        <Bot className="h-4 w-4 text-white" />
                      </div>
                      <div className="p-3 rounded-xl bg-gradient-to-br from-gray-800/60 to-gray-900/60 border border-gray-600/20 shadow-lg">
                        <div className="flex items-center gap-2 text-gray-400 text-sm">
                          <div className="flex gap-1">
                            <motion.div
                              className="w-2 h-2 bg-gray-400 rounded-full"
                              animate={{ scale: [1, 1.2, 1] }}
                              transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                            />
                            <motion.div
                              className="w-2 h-2 bg-gray-400 rounded-full"
                              animate={{ scale: [1, 1.2, 1] }}
                              transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                            />
                            <motion.div
                              className="w-2 h-2 bg-gray-400 rounded-full"
                              animate={{ scale: [1, 1.2, 1] }}
                              transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                            />
                          </div>
                          <span>Loading...</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Enhanced Chat Input */}
              <motion.div 
                className="p-4 border-t border-gray-600/30 bg-gradient-to-r from-gray-900/50 via-gray-800/50 to-gray-900/50 relative overflow-hidden"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-gray-600/5 via-transparent to-gray-600/5" />
                <div className="flex gap-3 relative z-10">
                  <motion.input
                    type="text"
                    value={currentMessage}
                    onChange={(e) => setCurrentMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                    placeholder={currentSpec ? "Ask about your API..." : "Ask me anything about APIs or development..."}
                    disabled={isChatLoading}
                    className="flex-1 px-4 py-3 bg-gray-800/50 border border-gray-600/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-400/30 focus:border-gray-500 text-white placeholder-gray-500 text-sm disabled:opacity-50 transition-all shadow-inner"
                    whileFocus={{ scale: 1.02 }}
                  />
                  <motion.button
                    onClick={sendChatMessage}
                    disabled={!currentMessage.trim() || isChatLoading}
                    className="px-4 py-3 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 text-white rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[50px] shadow-lg relative overflow-hidden group"
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    style={{
                      boxShadow: "0 4px 15px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1)"
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-gray-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                    {isChatLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin relative z-10" />
                    ) : (
                      <Send className="h-4 w-4 relative z-10" />
                    )}
                  </motion.button>
                </div>
                <motion.p 
                  className="text-xs text-gray-500 mt-2 text-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  Press Enter to send • AI responses may take a few seconds
                </motion.p>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
} 