'use client'

import { useState } from 'react'
import { Upload, FileText, File } from 'lucide-react'
import { motion } from 'framer-motion'

export default function UploadButton({ onFileUpload }) {
  const [isDragOver, setIsDragOver] = useState(false)

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFile(files[0])
    }
  }

  const handleFileInput = (e) => {
    const file = e.target.files[0]
    if (file) {
      handleFile(file)
    }
  }

  const handleFile = (file) => {
    const allowedTypes = ['.yaml', '.yml', '.json', '.pdf']
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase()
    
    if (!allowedTypes.includes(fileExtension)) {
      alert('Please upload a .yaml, .yml, .json, or .pdf file')
      return
    }

    onFileUpload(file)
  }

  const getFileIcon = (filename) => {
    if (filename.endsWith('.pdf')) {
      return <FileText className="w-8 h-8 text-red-400" />
    }
    return <File className="w-8 h-8 text-neon-cyan" />
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300
        ${isDragOver 
          ? 'border-neon-green bg-neon-green/5' 
          : 'border-gray-600 hover:border-gray-500'
        }
      `}
    >
      <motion.div
        animate={{ scale: isDragOver ? 1.05 : 1 }}
        className="space-y-4"
      >
        <div className="w-16 h-16 mx-auto bg-gray-800 rounded-full flex items-center justify-center">
          <Upload className="w-8 h-8 text-gray-400" />
        </div>
        
        <div>
          <h3 className="text-xl font-semibold text-white mb-2">
            {isDragOver ? 'Drop your file here' : 'Upload API Specification'}
          </h3>
          <p className="text-gray-400 mb-4">
            Drag and drop your file or click to browse
          </p>
          <p className="text-sm text-gray-500">
            Supports: .yaml, .yml, .json, .pdf (max 10MB)
          </p>
        </div>

        <div className="space-y-2">
          <input
            type="file"
            accept=".yaml,.yml,.json,.pdf"
            onChange={handleFileInput}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className="inline-block bg-neon-green text-black px-6 py-2 rounded-lg font-semibold cursor-pointer hover:bg-neon-green/90 transition-colors"
          >
            Choose File
          </label>
        </div>

        <div className="flex justify-center space-x-6 pt-4">
          <div className="flex items-center space-x-2 text-gray-500">
            <File className="w-4 h-4" />
            <span className="text-xs">OpenAPI</span>
          </div>
          <div className="flex items-center space-x-2 text-gray-500">
            <FileText className="w-4 h-4" />
            <span className="text-xs">PDF Docs</span>
          </div>
        </div>
      </motion.div>
    </div>
  )
} 