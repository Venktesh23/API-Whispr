'use client'

import { motion } from 'framer-motion'
import { 
  Sparkles, 
  Wrench, 
  GitCompare, 
  Play, 
  Shield, 
  Tag, 
  Zap,
  CheckCircle,
  ArrowRight
} from 'lucide-react'

export default function AIFeatureShowcase({ isVisible, onClose }) {
  if (!isVisible) return null

  const features = [
    {
      icon: <Wrench className="h-6 w-6 text-cyan-400" />,
      title: "AI Fix Button for Spec Errors",
      description: "Automatically generate and apply OpenAPI patches using GPT to fix quality issues like missing tags and descriptions.",
      color: "from-cyan-500/20 to-blue-500/20",
      borderColor: "border-cyan-400/30"
    },
    {
      icon: <GitCompare className="h-6 w-6 text-purple-400" />,
      title: "GPT-Powered Spec Comparison",
      description: "Compare two API specifications with AI analysis showing detailed differences in endpoints, parameters, and schemas.",
      color: "from-purple-500/20 to-pink-500/20",
      borderColor: "border-purple-400/30"
    },
    {
      icon: <Play className="h-6 w-6 text-green-400" />,
      title: "Interactive Endpoint Playground",
      description: "Test API endpoints directly with live request/response testing, parameter forms, and cURL generation.",
      color: "from-green-500/20 to-emerald-500/20",
      borderColor: "border-green-400/30"
    },
    {
      icon: <Shield className="h-6 w-6 text-blue-400" />,
      title: "AI-Powered Health Score",
      description: "Get a comprehensive quality score (0-100) with detailed breakdown of documentation, design, and security metrics.",
      color: "from-blue-500/20 to-indigo-500/20",
      borderColor: "border-blue-400/30"
    },
    {
      icon: <Tag className="h-6 w-6 text-yellow-400" />,
      title: "Smart Endpoint Tagging",
      description: "AI analyzes endpoints to suggest meaningful tags for better organization and navigation.",
      color: "from-yellow-500/20 to-orange-500/20",
      borderColor: "border-yellow-400/30"
    },
    {
      icon: <Zap className="h-6 w-6 text-red-400" />,
      title: "Token Simulation Flow",
      description: "Capture authentication tokens from login requests and automatically inject them into subsequent API calls.",
      color: "from-red-500/20 to-pink-500/20",
      borderColor: "border-red-400/30"
    }
  ]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-[#111] border border-gray-700/50 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
      >
        <div className="p-6 border-b border-gray-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="h-8 w-8 text-yellow-400" />
              <div>
                <h2 className="text-2xl font-bold text-white">🚀 AI-Powered API Analysis</h2>
                <p className="text-gray-400">All 6 powerful AI features are now live!</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Get Started
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[70vh]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`p-6 bg-gradient-to-br ${feature.color} backdrop-blur-sm rounded-xl border ${feature.borderColor}`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    {feature.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
                      {feature.title}
                      <CheckCircle className="h-4 w-4 text-green-400" />
                    </h3>
                    <p className="text-gray-300 text-sm leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mt-8 p-6 bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border border-purple-400/30 rounded-xl"
          >
            <div className="flex items-center gap-3 mb-4">
              <Sparkles className="h-6 w-6 text-purple-400" />
              <h3 className="text-xl font-bold text-white">How to Use These Features</h3>
            </div>
            
            <div className="space-y-3 text-gray-300">
              <div className="flex items-start gap-3">
                <ArrowRight className="h-4 w-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm">Look for <strong>Fix with AI</strong> buttons in the quality issues banner</span>
              </div>
              <div className="flex items-start gap-3">
                <ArrowRight className="h-4 w-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm">Click <strong>Compare Specs</strong> in the top-right to analyze differences</span>
              </div>
              <div className="flex items-start gap-3">
                <ArrowRight className="h-4 w-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm">Expand <strong>Interactive Playground</strong> on any endpoint to test it live</span>
              </div>
              <div className="flex items-start gap-3">
                <ArrowRight className="h-4 w-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm">Check your <strong>API Health Score</strong> for quality insights</span>
              </div>
              <div className="flex items-start gap-3">
                <ArrowRight className="h-4 w-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm">Use <strong>Add Tag with AI</strong> on untagged endpoints</span>
              </div>
              <div className="flex items-start gap-3">
                <ArrowRight className="h-4 w-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm">Authentication tokens are captured automatically for API testing</span>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  )
} 