'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, Loader2, Send, ChevronDown, ChevronRight, Sparkles } from 'lucide-react'

export default function RelatedQuestions({ currentSpec }) {
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedQuestion, setSelectedQuestion] = useState(null)
  const [answer, setAnswer] = useState('')
  const [answerLoading, setAnswerLoading] = useState(false)
  const [expandedQuestions, setExpandedQuestions] = useState(new Set())

  useEffect(() => {
    if (currentSpec) {
      generateQuestions()
    }
  }, [currentSpec])

  const generateQuestions = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          specContent: JSON.stringify(currentSpec.parsed_spec || currentSpec.raw_text),
          specType: currentSpec.filetype || 'unknown'
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to generate questions: ${response.status}`)
      }

      const data = await response.json()
      setQuestions(data.questions || [])
    } catch (err) {
      console.error('Error generating questions:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleQuestionClick = async (question) => {
    if (selectedQuestion === question && answer) {
      // Toggle collapse/expand
      setExpandedQuestions(prev => {
        const newSet = new Set(prev)
        if (newSet.has(question)) {
          newSet.delete(question)
        } else {
          newSet.add(question)
        }
        return newSet
      })
      return
    }

    setSelectedQuestion(question)
    setAnswer('')
    setAnswerLoading(true)

    try {
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question,
          specContent: JSON.stringify(currentSpec.parsed_spec || currentSpec.raw_text),
          specType: currentSpec.filetype || 'unknown'
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to get answer: ${response.status}`)
      }

      const data = await response.json()
      setAnswer(data.answer || 'No answer available')
      setExpandedQuestions(prev => new Set(prev).add(question))
    } catch (err) {
      console.error('Error getting answer:', err)
      setAnswer(`Error: ${err.message}`)
    } finally {
      setAnswerLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-[#00FF9C]/30 border-t-[#00FF9C] rounded-full"
        />
                  <span className="ml-3 text-[#999]">Loading...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-lg">
        <p className="text-red-400 text-sm">
          Failed to generate questions: {error}
        </p>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={generateQuestions}
          className="mt-3 px-4 py-2 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 text-white rounded-lg transition-all duration-300 text-sm font-medium"
        >
          Retry
        </motion.button>
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="text-center py-8 text-[#999]">
        <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No questions generated. Try uploading a different specification.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-[#999] text-sm mb-6">
        Click any question below to get AI-powered insights about your API specification.
      </p>
      
      {questions.map((question, index) => (
        <div key={index} className="border border-[#2a2a2a] rounded-lg overflow-hidden">
          <motion.button
            whileHover={{ backgroundColor: '#1f1f1f' }}
            onClick={() => handleQuestionClick(question)}
            className="w-full p-4 text-left bg-[#1a1a1a] hover:bg-[#1f1f1f] transition-colors flex items-center justify-between group"
          >
            <div className="flex items-center gap-3 flex-1">
              <Sparkles className="h-4 w-4 text-[#00FF9C] flex-shrink-0" />
              <span className="text-[#e0e0e0] text-sm group-hover:text-white transition-colors">
                {question}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              {answerLoading && selectedQuestion === question && (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="w-4 h-4 border-2 border-[#00FF9C]/30 border-t-[#00FF9C] rounded-full"
                />
              )}
              
              <motion.div
                animate={{ 
                  rotate: expandedQuestions.has(question) ? 90 : 0 
                }}
                transition={{ duration: 0.2 }}
              >
                <ChevronRight className="h-4 w-4 text-[#666]" />
              </motion.div>
            </div>
          </motion.button>

          <AnimatePresence>
            {expandedQuestions.has(question) && answer && selectedQuestion === question && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="border-t border-[#2a2a2a] bg-[#151515]"
              >
                <div className="p-4">
                  <div className="prose prose-invert prose-sm max-w-none">
                    <p className="text-[#e0e0e0] leading-relaxed whitespace-pre-line">
                      {answer}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}

      <div className="mt-6 pt-4 border-t border-[#2a2a2a]">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={generateQuestions}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-[#00FF9C]/10 border border-[#00FF9C] text-[#00FF9C] rounded-lg transition-all duration-300 text-sm font-medium hover:bg-[#00FF9C]/20 shadow-[0_0_6px_#00FF9C] disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Generate New Questions
            </>
          )}
        </motion.button>
      </div>
    </div>
  )
} 