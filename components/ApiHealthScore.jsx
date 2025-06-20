'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Shield, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  TrendingUp,
  Info,
  Sparkles,
  Activity
} from 'lucide-react'

export default function ApiHealthScore({ currentSpec, parsedEndpoints }) {
  const [healthData, setHealthData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (currentSpec && parsedEndpoints) {
      calculateHealthScore()
    }
  }, [currentSpec, parsedEndpoints])

  const calculateHealthScore = async () => {
    setLoading(true)
    
    try {
      const response = await fetch('/api/calculate-health-score', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          spec: currentSpec.parsed_spec,
          endpoints: parsedEndpoints
        })
      })

      if (response.ok) {
        const data = await response.json()
        setHealthData(data)
      } else {
        // Fallback calculation
        setHealthData(calculateFallbackHealth())
      }
    } catch (error) {
      console.error('Error calculating health score:', error)
      setHealthData(calculateFallbackHealth())
    } finally {
      setLoading(false)
    }
  }

  const calculateFallbackHealth = () => {
    const spec = currentSpec.parsed_spec
    const totalEndpoints = parsedEndpoints.length
    
    // Basic scoring logic
    let documentationScore = 0
    let securityScore = 0
    let consistencyScore = 0
    let completenessScore = 0

    // Documentation scoring
    const endpointsWithDocs = parsedEndpoints.filter(ep => 
      ep.summary || ep.description
    ).length
    documentationScore = totalEndpoints > 0 ? (endpointsWithDocs / totalEndpoints) * 100 : 0

    // Security scoring
    const hasGlobalSecurity = spec.security && spec.security.length > 0
    const endpointsWithAuth = parsedEndpoints.filter(ep => 
      ep.security && ep.security.length > 0
    ).length
    securityScore = hasGlobalSecurity ? 100 : (endpointsWithAuth / totalEndpoints) * 100

    // Consistency scoring (tags, response codes)
    const endpointsWithTags = parsedEndpoints.filter(ep => 
      ep.tags && ep.tags.length > 0
    ).length
    consistencyScore = totalEndpoints > 0 ? (endpointsWithTags / totalEndpoints) * 100 : 0

    // Completeness scoring
    const hasServers = spec.servers && spec.servers.length > 0
    const hasInfo = spec.info && spec.info.title && spec.info.version
    const endpointsWithResponses = parsedEndpoints.filter(ep => 
      ep.responses && Object.keys(ep.responses).length > 0
    ).length
    completenessScore = (
      (hasServers ? 25 : 0) +
      (hasInfo ? 25 : 0) +
      (totalEndpoints > 0 ? (endpointsWithResponses / totalEndpoints) * 50 : 0)
    )

    const overallScore = Math.round(
      (documentationScore + securityScore + consistencyScore + completenessScore) / 4
    )

    return {
      overallScore,
      metrics: {
        documentation: Math.round(documentationScore),
        security: Math.round(securityScore), 
        consistency: Math.round(consistencyScore),
        completeness: Math.round(completenessScore)
      },
      details: {
        totalEndpoints,
        documentsWithDocs: endpointsWithDocs,
        endpointsWithAuth,
        endpointsWithTags,
        hasGlobalSecurity,
        hasServers,
        hasInfo
      }
    }
  }

  const getScoreColor = (score) => {
    if (score >= 70) return '#00FF9C'  // Green for good scores
    if (score >= 40) return '#F59E0B'  // Yellow for medium scores
    return '#EF4444'  // Red for poor scores
  }

  const getScoreGrade = (score) => {
    if (score >= 90) return 'Excellent'
    if (score >= 80) return 'Good'
    if (score >= 70) return 'Fair'
    if (score >= 60) return 'Poor'
    return 'Critical'
  }

  const ScoreBar = ({ label, score, description }) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-white">{label}</span>
        <span className="text-sm font-semibold" style={{ color: getScoreColor(score) }}>
          {score}%
        </span>
      </div>
      <div className="h-2 bg-[#2a2a2a] rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 1, delay: 0.5 }}
          className="h-full rounded-full shadow-lg"
          style={{ 
            backgroundColor: getScoreColor(score),
            boxShadow: `0 0 10px ${getScoreColor(score)}40`
          }}
        />
      </div>
      {description && (
        <p className="text-xs text-[#999]">{description}</p>
      )}
    </div>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-[#00FF9C]/30 border-t-[#00FF9C] rounded-full"
        />
        <span className="ml-3 text-[#999]">Calculating API health...</span>
      </div>
    )
  }

  if (!healthData) {
    return (
      <div className="text-center py-8 text-[#999]">
        <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Unable to calculate health score</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Overall Score */}
      <div className="text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring" }}
          className="inline-flex items-center justify-center w-24 h-24 rounded-full border-4 mb-4"
          style={{ 
            borderColor: getScoreColor(healthData.overallScore),
            backgroundColor: `${getScoreColor(healthData.overallScore)}10`,
            boxShadow: `0 0 20px ${getScoreColor(healthData.overallScore)}30`
          }}
        >
          <span 
            className="text-2xl font-bold"
            style={{ color: getScoreColor(healthData.overallScore) }}
          >
            {healthData.overallScore}
          </span>
        </motion.div>
        
        <h3 className="text-xl font-semibold text-white mb-2">
          API Health Score
        </h3>
        <p 
          className="text-sm font-medium"
          style={{ color: getScoreColor(healthData.overallScore) }}
        >
          {getScoreGrade(healthData.overallScore)}
        </p>
      </div>

      {/* Metrics Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ScoreBar
          label="Documentation"
          score={healthData.metrics.documentation}
          description="Endpoints with descriptions and summaries"
        />
        
        <ScoreBar
          label="Security"
          score={healthData.metrics.security}
          description="Authentication and authorization coverage"
        />
        
        <ScoreBar
          label="Consistency"
          score={healthData.metrics.consistency}
          description="Naming conventions and structure"
        />
        
        <ScoreBar
          label="Completeness"
          score={healthData.metrics.completeness}
          description="Required fields and response definitions"
        />
      </div>

      {/* Quick Stats */}
      {healthData.details && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-[#2a2a2a]">
          <div className="text-center">
            <div className="text-lg font-semibold text-[#00FF9C]">
              {healthData.details.totalEndpoints}
            </div>
            <div className="text-xs text-[#999]">Total Endpoints</div>
          </div>
          
          <div className="text-center">
            <div className="text-lg font-semibold text-[#00FF9C]">
              {healthData.details.documentsWithDocs || 0}
            </div>
            <div className="text-xs text-[#999]">Documented</div>
          </div>
          
          <div className="text-center">
            <div className="text-lg font-semibold text-[#00FF9C]">
              {healthData.details.endpointsWithAuth || 0}
            </div>
            <div className="text-xs text-[#999]">Secured</div>
          </div>
          
          <div className="text-center">
            <div className="text-lg font-semibold text-[#00FF9C]">
              {healthData.details.endpointsWithTags || 0}
            </div>
            <div className="text-xs text-[#999]">Tagged</div>
          </div>
        </div>
      )}

      {/* Improvement Suggestions */}
      <div className="space-y-3 pt-4 border-t border-[#2a2a2a]">
        <h4 className="text-sm font-medium text-white">Improvement Suggestions</h4>
        <div className="space-y-2">
          {healthData.metrics.documentation < 80 && (
            <div className="flex items-start gap-2 text-sm text-[#e0e0e0]">
              <AlertTriangle className="h-4 w-4 text-orange-400 mt-0.5 flex-shrink-0" />
              <span>Add descriptions and summaries to improve documentation</span>
            </div>
          )}
          
          {healthData.metrics.security < 70 && (
            <div className="flex items-start gap-2 text-sm text-[#e0e0e0]">
              <Shield className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
              <span>Implement authentication for better security coverage</span>
            </div>
          )}
          
          {healthData.metrics.consistency < 75 && (
            <div className="flex items-start gap-2 text-sm text-[#e0e0e0]">
              <Activity className="h-4 w-4 text-yellow-400 mt-0.5 flex-shrink-0" />
              <span>Add consistent tags and naming conventions</span>
            </div>
          )}
          
          {healthData.overallScore >= 80 && (
            <div className="flex items-start gap-2 text-sm text-[#e0e0e0]">
              <CheckCircle className="h-4 w-4 text-[#00FF9C] mt-0.5 flex-shrink-0" />
              <span>Great job! Your API follows best practices</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 