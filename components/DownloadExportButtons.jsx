'use client'

import { motion } from 'framer-motion'
import { Download, Share, Copy, CheckCircle } from 'lucide-react'
import { useState } from 'react'

export default function DownloadExportButtons({ currentSpec }) {
  const [copied, setCopied] = useState(false)

  const handleDownloadPDF = async () => {
    try {
      // Dynamic import to avoid SSR issues
      const html2pdf = (await import('html2pdf.js')).default
      
      const element = document.querySelector('.analysis-content') || document.body
      const opt = {
        margin: 1,
        filename: `${currentSpec?.filename || 'api-analysis'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
      }
      
      html2pdf().set(opt).from(element).save()
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('PDF generation failed. Please try again.')
    }
  }

  const handleCopyLink = () => {
    const currentUrl = window.location.href
    navigator.clipboard.writeText(currentUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleDownloadPDF}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 text-white font-medium rounded-lg transition-all duration-300"
      >
        <Download className="h-4 w-4" />
        Download PDF
      </motion.button>
      
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleCopyLink}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 text-white font-medium rounded-lg transition-all duration-300"
      >
        {copied ? (
          <>
            <CheckCircle className="h-4 w-4 text-green-400" />
            Copied!
          </>
        ) : (
          <>
            <Copy className="h-4 w-4" />
            Copy Link
          </>
        )}
      </motion.button>
    </>
  )
} 