'use client'

import { User, Bot, Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { motion } from 'framer-motion'
import EndpointCard from './EndpointCard'

export default function MessageBubble({ message }) {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  if (message.type === 'user') {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex justify-end"
      >
        <div className="flex items-start space-x-3 max-w-3xl">
          <div className="bg-neon-green text-black rounded-lg p-4 shadow-lg">
            <p className="font-medium">{message.content}</p>
            <p className="text-xs opacity-70 mt-2">{formatTime(message.timestamp)}</p>
          </div>
          <div className="w-8 h-8 bg-neon-green rounded-full flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 text-black" />
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex justify-start"
    >
      <div className="flex items-start space-x-3 max-w-5xl w-full">
        <div className="w-8 h-8 bg-gradient-to-r from-neon-cyan to-neon-purple rounded-full flex items-center justify-center flex-shrink-0">
          <Bot className="w-4 h-4 text-white" />
        </div>
        <div className="bg-dark-secondary rounded-lg p-6 shadow-lg flex-1">
          <EndpointCard endpoint={message.content} />
          <p className="text-xs text-gray-500 mt-4">{formatTime(message.timestamp)}</p>
        </div>
      </div>
    </motion.div>
  )
} 