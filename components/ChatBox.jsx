'use client'

import { Send } from 'lucide-react'
import { motion } from 'framer-motion'

export default function ChatBox({ value, onChange, onSend, isLoading }) {
  const handleSubmit = (e) => {
    e.preventDefault()
    if (!value.trim() || isLoading) return
    onSend()
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <div className="bg-dark-card border-t border-gray-800 p-4">
      <div className="max-w-6xl mx-auto">
        <form onSubmit={handleSubmit} className="flex space-x-4">
          <div className="flex-1 relative">
            <textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything about your API... (e.g., 'How do I create a user?')"
              className="w-full bg-dark-secondary text-white rounded-lg p-4 pr-12 border border-gray-700 focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400/20 resize-none transition-all"
              rows="2"
              disabled={isLoading}
            />
            <div className="absolute bottom-2 right-2 text-xs text-gray-500">
              Enter to send, Shift+Enter for new line
            </div>
          </div>
          
          <motion.button
            whileHover={{ scale: isLoading ? 1 : 1.05 }}
            whileTap={{ scale: isLoading ? 1 : 0.95 }}
            type="submit"
            disabled={!value.trim() || isLoading}
            className={`
              px-6 py-4 rounded-lg font-semibold transition-all duration-300 flex items-center space-x-2
              ${!value.trim() || isLoading
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-gray-600 to-gray-700 text-white hover:from-gray-500 hover:to-gray-600'
              }
            `}
          >
            <Send className="w-5 h-5" />
            <span>{isLoading ? 'Loading...' : 'Send'}</span>
          </motion.button>
        </form>
      </div>
    </div>
  )
} 