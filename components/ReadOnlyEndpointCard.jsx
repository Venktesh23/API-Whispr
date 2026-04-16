'use client'

import { motion } from 'framer-motion'
import { 
  Code2, 
  FileText,
  Lock,
  Shield,
  Tag
} from 'lucide-react'

export default function ReadOnlyEndpointCard({ endpoint, index }) {
  const getMethodColor = (method) => {
    switch (method) {
      case 'GET': return 'text-white bg-white/10'
      case 'POST': return 'text-[#ccc] bg-[#2a2a2a]'
      case 'PUT': return 'text-yellow-400 bg-yellow-500/10'
      case 'PATCH': return 'text-yellow-400 bg-yellow-500/10'
      case 'DELETE': return 'text-red-400 bg-red-500/10'
      case 'HEAD': return 'text-[#888] bg-[#2a2a2a]'
      case 'OPTIONS': return 'text-[#888] bg-[#2a2a2a]'
      default: return 'text-[#888] bg-[#2a2a2a]'
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="p-5 bg-gradient-to-br from-[#1a1a1a] to-[#151515] border border-[#2a2a2a] rounded-lg hover:border-[#444] transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 flex-1">
          <span className={`px-3 py-1 rounded font-mono font-bold text-sm ${getMethodColor(endpoint.method)}`}>
            {endpoint.method}
          </span>
          <code className="text-[#e8e8e8] font-mono text-sm break-all">
            {endpoint.path}
          </code>
        </div>
      </div>

      {endpoint.summary && (
        <p className="text-gray-300 text-sm mb-3">
          {endpoint.summary}
        </p>
      )}

      {endpoint.tags && endpoint.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {endpoint.tags.map((tag, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1 px-2 py-1 bg-white/5 border border-[#444] text-[#aaa] rounded text-xs font-medium"
            >
              <Tag className="h-3 w-3" />
              {tag}
            </span>
          ))}
        </div>
      )}

      <p className="text-gray-500 text-xs mt-3">
        Read-only view • No authentication required
      </p>
    </motion.div>
  )
}
