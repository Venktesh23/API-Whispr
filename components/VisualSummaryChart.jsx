'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import { Hash, Activity, CheckCircle, Tag } from 'lucide-react'

export default function VisualSummaryChart({ data }) {
  const [chartData, setChartData] = useState(null)

  useEffect(() => {
    if (data) {
      processChartData(data)
    }
  }, [data])

  const processChartData = (summaryData) => {
    // Process methods data for bar chart
    const methodsData = summaryData.methodsCount ? 
      Object.entries(summaryData.methodsCount).map(([method, count]) => ({
        method,
        count,
        color: getMethodColor(method)
      })) : []

    // Process status codes for pie chart
    const statusCodesData = summaryData.commonStatusCodes ?
      summaryData.commonStatusCodes.map((code, index) => ({
        name: code,
        value: 1,
        color: getStatusColor(code)
      })) : []

    setChartData({
      methods: methodsData,
      statusCodes: statusCodesData
    })
  }

  const getMethodColor = (method) => {
    const colors = {
      'GET': '#ffffff',
      'POST': '#9ca3af',
      'PUT': '#F59E0B',
      'DELETE': '#EF4444',
      'PATCH': '#F59E0B'
    }
    return colors[method] || '#9ca3af'
  }

  const getStatusColor = (code) => {
    if (code.startsWith('2')) return '#4ade80'
    if (code.startsWith('4')) return '#F59E0B'
    if (code.startsWith('5')) return '#EF4444'
    return '#6B7280'
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-[#999]">No summary data available</div>
      </div>
    )
  }

  const methodsData = chartData?.methods || []
  const statusCodesData = chartData?.statusCodes || []

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Endpoints */}
        <div className="bg-gradient-to-br from-[#1a1a1a] to-[#151515] border border-[#2a2a2a] rounded-lg p-6 text-center hover:bg-[#1f1f1f] transition-colors transition-colors">
          <Hash className="h-6 w-6 text-[#888] mx-auto mb-3" />
          <div className="text-2xl font-semibold text-white mb-1">
            {data.totalEndpoints || 0}
          </div>
          <div className="text-[#999] text-sm">
            Total Endpoints
          </div>
        </div>

        {/* HTTP Methods */}
        <div className="bg-gradient-to-br from-[#1a1a1a] to-[#151515] border border-[#2a2a2a] rounded-lg p-6 text-center hover:bg-[#1f1f1f] transition-colors transition-colors">
          <Activity className="h-6 w-6 text-[#888] mx-auto mb-3" />
          <div className="text-2xl font-semibold text-white mb-1">
            {Object.keys(data.methodsCount || {}).length}
          </div>
          <div className="text-[#999] text-sm">
            HTTP Methods
          </div>
        </div>

        {/* Status Codes */}
        <div className="bg-gradient-to-br from-[#1a1a1a] to-[#151515] border border-[#2a2a2a] rounded-lg p-6 text-center hover:bg-[#1f1f1f] transition-colors transition-colors">
          <CheckCircle className="h-6 w-6 text-[#888] mx-auto mb-3" />
          <div className="text-2xl font-semibold text-white mb-1">
            {data.commonStatusCodes?.length || 0}
          </div>
          <div className="text-[#999] text-sm">
            Status Codes
          </div>
        </div>

        {/* Tags */}
        <div className="bg-gradient-to-br from-[#1a1a1a] to-[#151515] border border-[#2a2a2a] rounded-lg p-6 text-center hover:bg-[#1f1f1f] transition-colors transition-colors">
          <Tag className="h-6 w-6 text-[#888] mx-auto mb-3" />
          <div className="text-2xl font-semibold text-white mb-1">
            {data.topTags?.length || 0}
          </div>
          <div className="text-[#999] text-sm">
            API Tags
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* HTTP Methods Bar Chart */}
        {methodsData.length > 0 && (
          <div className="bg-gradient-to-br from-[#1a1a1a] to-[#151515] border border-[#2a2a2a] rounded-lg p-6">
            <h3 className="text-lg font-medium text-white mb-4">HTTP Methods Distribution</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={methodsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                <XAxis dataKey="method" stroke="#999" />
                <YAxis stroke="#999" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1a1a1a', 
                    border: '1px solid #2a2a2a',
                    borderRadius: '8px',
                    color: '#e0e0e0'
                  }} 
                />
                <Bar dataKey="count" fill="#ffffff" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Status Codes Pie Chart */}
        {statusCodesData.length > 0 && (
          <div className="bg-gradient-to-br from-[#1a1a1a] to-[#151515] border border-[#2a2a2a] rounded-lg p-6">
            <h3 className="text-lg font-medium text-white mb-4">Status Codes</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={statusCodesData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name }) => name}
                >
                  {statusCodesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1a1a1a', 
                    border: '1px solid #2a2a2a',
                    borderRadius: '8px',
                    color: '#e0e0e0'
                  }} 
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Tags */}
      {data.topTags && data.topTags.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-medium text-white mb-4">API Tags</h3>
          <div className="flex flex-wrap gap-2">
            {data.topTags.map((tag, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-white/5 border border-[#444] text-[#aaa] rounded-full text-sm font-medium hover:bg-white/10 transition-colors"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
} 