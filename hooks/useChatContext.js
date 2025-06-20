'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { useSupabase } from './useSupabase'

const ChatContext = createContext()

export function ChatProvider({ children }) {
  const [currentSpec, setCurrentSpec] = useState(null)
  const [chatMessages, setChatMessages] = useState([{
    role: 'assistant',
    content: `Hi! I'm your API assistant. I can help you with API development questions, code examples, and technical guidance. If you upload an API specification, I can provide specific help with that API too!`,
    timestamp: new Date().toISOString()
  }])
  const [chatOpen, setChatOpen] = useState(false)
  const { user, supabase } = useSupabase()

  // Load the most recent spec on mount
  useEffect(() => {
    if (user && !currentSpec) {
      loadLatestSpec()
    }
  }, [user])

  const loadLatestSpec = async () => {
    if (!user) return

    const { data, error } = await supabase
      .from('api_specs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!error && data) {
      setCurrentSpec(data)
      setChatMessages([{
        role: 'assistant',
        content: `Hi! I'm ready to help you with "${data.filename}". Ask me anything about your API!`,
        timestamp: new Date().toISOString()
      }])
    }
  }

  const setActiveSpec = (spec) => {
    setCurrentSpec(spec)
    setChatMessages([{
      role: 'assistant',
      content: `Great! I've loaded "${spec.filename}". What would you like to know about this API?`,
      timestamp: new Date().toISOString()
    }])
  }

  const clearChat = () => {
    setChatMessages([])
    if (currentSpec) {
      setChatMessages([{
        role: 'assistant',
        content: `I'm ready to help you with "${currentSpec.filename}". What would you like to know?`,
        timestamp: new Date().toISOString()
      }])
    }
  }

  return (
    <ChatContext.Provider value={{
      currentSpec,
      setCurrentSpec: setActiveSpec,
      chatMessages,
      setChatMessages,
      chatOpen,
      setChatOpen,
      clearChat,
      loadLatestSpec
    }}>
      {children}
    </ChatContext.Provider>
  )
}

export function useChatContext() {
  const context = useContext(ChatContext)
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider')
  }
  return context
} 