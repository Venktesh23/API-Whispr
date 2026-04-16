'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShieldCheck,
  FileSearch,
  Loader2,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Info,
  ChevronDown,
  ChevronRight,
  Zap,
  Download,
  RotateCcw,
  Bot,
  Activity,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SEVERITY_CONFIG = {
  critical: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', icon: XCircle, label: 'Critical' },
  high:     { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30', icon: AlertTriangle, label: 'High' },
  medium:   { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', icon: AlertTriangle, label: 'Medium' },
  low:      { color: 'text-[#aaa]', bg: 'bg-white/5', border: 'border-[#2a2a2a]', icon: Info, label: 'Low' },
  info:     { color: 'text-[#888]', bg: 'bg-white/5', border: 'border-[#2a2a2a]', icon: Info, label: 'Info' },
}

const STATUS_CONFIG = {
  good:     { color: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/30' },
  warning:  { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' },
  critical: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' },
}

const TOOL_LABELS = {
  audit_security:       { label: 'Security',       icon: '🔐' },
  audit_documentation:  { label: 'Documentation',  icon: '📝' },
  audit_design:         { label: 'API Design',      icon: '🏗️' },
  audit_schemas:        { label: 'Schemas',         icon: '📋' },
  audit_completeness:   { label: 'Completeness',    icon: '✅' },
  audit_error_handling: { label: 'Error Handling',  icon: '⚠️' },
  generate_report:      { label: 'Generating Report', icon: '📊' },
}

const CATEGORY_LABELS = {
  security:       'Security',
  documentation:  'Documentation',
  design:         'API Design',
  schemas:        'Schemas',
  completeness:   'Completeness',
  error_handling: 'Error Handling',
}

function getGradeColor(grade) {
  if (grade === 'A') return 'text-green-400'
  if (grade === 'B') return 'text-green-300'
  if (grade === 'C') return 'text-yellow-400'
  if (grade === 'D') return 'text-orange-400'
  return 'text-red-400'
}

function getScoreBarColor(score) {
  if (score >= 80) return 'bg-green-400'
  if (score >= 60) return 'bg-yellow-500'
  return 'bg-red-500'
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function AgentStep({ step, index }) {
  if (step.type === 'thinking' || step.type === 'start') {
    return (
      <motion.div
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center gap-3 text-sm text-[#888]"
      >
        <Bot className="h-4 w-4 flex-shrink-0" />
        <span>{step.message}</span>
      </motion.div>
    )
  }

  if (step.type === 'tool_call') {
    const toolInfo = TOOL_LABELS[step.tool] ?? { label: step.tool, icon: '🔧' }
    return (
      <motion.div
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center gap-3 text-sm"
      >
        <span className="text-base">{toolInfo.icon}</span>
        <span className="text-[#ccc]">{step.message}</span>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          className="ml-auto"
        >
          <Loader2 className="h-3.5 w-3.5 text-[#666]" />
        </motion.div>
      </motion.div>
    )
  }

  if (step.type === 'tool_result') {
    const toolInfo = TOOL_LABELS[step.tool] ?? { label: step.tool, icon: '🔧' }
    return (
      <motion.div
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center gap-3 text-sm"
      >
        <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
        <span className="text-[#aaa]">
          {toolInfo.label} — <span className="text-[#666]">{step.summary}</span>
        </span>
      </motion.div>
    )
  }

  return null
}

function ScoreGauge({ score, size = 'lg' }) {
  const radius = size === 'lg' ? 44 : 28
  const stroke = size === 'lg' ? 7 : 5
  const circumference = 2 * Math.PI * radius
  const filled = ((100 - score) / 100) * circumference
  const color = score >= 80 ? '#4ade80' : score >= 60 ? '#F59E0B' : '#EF4444'
  const svgSize = (radius + stroke) * 2 + 4

  return (
    <svg width={svgSize} height={svgSize} className="rotate-[-90deg]">
      <circle
        cx={svgSize / 2}
        cy={svgSize / 2}
        r={radius}
        fill="none"
        stroke="#2a2a2a"
        strokeWidth={stroke}
      />
      <motion.circle
        cx={svgSize / 2}
        cy={svgSize / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: filled }}
        transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
      />
    </svg>
  )
}

function FindingCard({ finding }) {
  const [expanded, setExpanded] = useState(finding.severity === 'critical')
  const cfg = SEVERITY_CONFIG[finding.severity] ?? SEVERITY_CONFIG.info
  const Icon = cfg.icon

  return (
    <div className={`rounded-lg border ${cfg.border} overflow-hidden`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-full p-4 text-left ${cfg.bg} flex items-start gap-3 hover:brightness-110 transition-all`}
      >
        <Icon className={`h-4 w-4 ${cfg.color} flex-shrink-0 mt-0.5`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-white text-sm">{finding.title}</span>
            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
              {cfg.label}
            </span>
            <span className="text-xs text-[#666] ml-auto">{finding.id}</span>
          </div>
          {!expanded && finding.affected?.length > 0 && (
            <p className="text-xs text-[#666] mt-1 truncate">
              {finding.affected.slice(0, 3).join(' · ')}
              {finding.affected.length > 3 ? ` +${finding.affected.length - 3} more` : ''}
            </p>
          )}
        </div>
        <motion.div animate={{ rotate: expanded ? 90 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronRight className="h-4 w-4 text-[#666] flex-shrink-0" />
        </motion.div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="border-t border-[#2a2a2a] bg-[#0f0f0f] overflow-hidden"
          >
            <div className="p-4 space-y-3">
              {finding.description && (
                <p className="text-sm text-[#ccc] leading-relaxed">{finding.description}</p>
              )}

              {finding.affected?.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-[#888] uppercase tracking-wide mb-1">Affected</p>
                  <div className="flex flex-wrap gap-1.5">
                    {finding.affected.map((ep, i) => (
                      <code key={i} className="px-2 py-0.5 bg-white/5 border border-[#333] text-[#aaa] rounded text-xs font-mono">
                        {ep}
                      </code>
                    ))}
                  </div>
                </div>
              )}

              {finding.recommendation && (
                <div>
                  <p className="text-xs font-medium text-[#888] uppercase tracking-wide mb-1">Recommendation</p>
                  <p className="text-sm text-[#ccc] leading-relaxed">{finding.recommendation}</p>
                </div>
              )}

              {finding.example && (
                <div>
                  <p className="text-xs font-medium text-[#888] uppercase tracking-wide mb-1">Example Fix</p>
                  <pre className="text-xs text-[#e8e8e8] bg-[#0a0a0a] border border-[#2a2a2a] rounded p-3 overflow-x-auto font-mono leading-relaxed">
                    {finding.example}
                  </pre>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function SpecAuditAgent({ currentSpec, parsedEndpoints }) {
  const [phase, setPhase] = useState('idle') // idle | running | done | error
  const [steps, setSteps] = useState([])
  const [report, setReport] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [activeCategory, setActiveCategory] = useState(null)
  const stepsEndRef = useRef(null)

  const scrollSteps = () =>
    stepsEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })

  const runAudit = async () => {
    if (!currentSpec) return

    setPhase('running')
    setSteps([])
    setReport(null)
    setErrorMsg('')

    const specContent =
      currentSpec.parsed_spec
        ? JSON.stringify(currentSpec.parsed_spec)
        : currentSpec.raw_text ?? ''

    try {
      const response = await fetch('/api/agent/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          specContent,
          endpoints: parsedEndpoints ?? [],
        }),
      })

      if (!response.ok) {
        throw new Error(`Agent returned ${response.status}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue
          try {
            const event = JSON.parse(line.slice(6))

            if (event.type === 'report') {
              setReport(event.data)
              setPhase('done')
              continue
            }

            if (event.type === 'done') continue

            if (event.type === 'error') {
              setErrorMsg(event.message)
              setPhase('error')
              return
            }

            setSteps((prev) => [...prev, event])
            setTimeout(scrollSteps, 50)
          } catch {
            // skip malformed lines
          }
        }
      }
    } catch (err) {
      setErrorMsg(err.message ?? 'Audit failed')
      setPhase('error')
    }
  }

  const reset = () => {
    setPhase('idle')
    setSteps([])
    setReport(null)
    setErrorMsg('')
    setActiveCategory(null)
  }

  const exportReport = () => {
    if (!report) return
    const json = JSON.stringify(report, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit-report-${currentSpec?.filename ?? 'spec'}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Count findings by severity
  const severityCounts = report
    ? (report.findings ?? []).reduce((acc, f) => {
        acc[f.severity] = (acc[f.severity] ?? 0) + 1
        return acc
      }, {})
    : {}

  const filteredFindings = report
    ? activeCategory
      ? report.findings.filter((f) => f.category === activeCategory)
      : report.findings
    : []

  // Sort findings: critical → high → medium → low → info
  const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3, info: 4 }
  const sortedFindings = [...filteredFindings].sort(
    (a, b) => (SEVERITY_ORDER[a.severity] ?? 5) - (SEVERITY_ORDER[b.severity] ?? 5)
  )

  // -------------------------------------------------------------------------
  // IDLE state
  // -------------------------------------------------------------------------

  if (phase === 'idle') {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center gap-6">
        <div className="w-20 h-20 rounded-full bg-white/5 border border-[#2a2a2a] flex items-center justify-center">
          <ShieldCheck className="h-9 w-9 text-[#888]" />
        </div>
        <div>
          <h3 className="text-xl font-semibold text-white mb-2">AI Spec Audit Agent</h3>
          <p className="text-[#888] text-sm max-w-md">
            An autonomous agent will analyze your specification across 6 dimensions — security,
            documentation, design, schemas, completeness, and error handling — then produce a
            detailed audit report with prioritized findings.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 justify-center text-xs text-[#666]">
          {Object.values(TOOL_LABELS).slice(0, 6).map((t) => (
            <span key={t.label} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-[#2a2a2a] rounded-full">
              <span>{t.icon}</span>
              {t.label}
            </span>
          ))}
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={runAudit}
          disabled={!currentSpec}
          className="px-8 py-3 bg-white text-[#0d0d0d] rounded-lg font-semibold hover:bg-white/90 disabled:opacity-40 transition-all flex items-center gap-2"
        >
          <Bot className="h-5 w-5" />
          Run Audit Agent
        </motion.button>
      </div>
    )
  }

  // -------------------------------------------------------------------------
  // RUNNING state
  // -------------------------------------------------------------------------

  if (phase === 'running') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 pb-4 border-b border-[#2a2a2a]">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            <Loader2 className="h-5 w-5 text-[#888]" />
          </motion.div>
          <span className="text-white font-medium">Audit agent running…</span>
        </div>

        <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
          {steps.map((step, i) => (
            <AgentStep key={i} step={step} index={i} />
          ))}
          <div ref={stepsEndRef} />
        </div>
      </div>
    )
  }

  // -------------------------------------------------------------------------
  // ERROR state
  // -------------------------------------------------------------------------

  if (phase === 'error') {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
        <AlertTriangle className="h-12 w-12 text-red-400" />
        <div>
          <h3 className="text-lg font-semibold text-white mb-1">Audit Failed</h3>
          <p className="text-[#888] text-sm">{errorMsg}</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={reset}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-[#444] text-[#ccc] rounded-lg text-sm font-medium hover:bg-white/10 transition-all"
        >
          <RotateCcw className="h-4 w-4" />
          Try Again
        </motion.button>
      </div>
    )
  }

  // -------------------------------------------------------------------------
  // DONE — full report
  // -------------------------------------------------------------------------

  if (phase === 'done' && report) {
    const categories = report.categories ?? {}
    const categoryKeys = Object.keys(CATEGORY_LABELS)

    return (
      <div className="space-y-6">
        {/* Header row */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-5">
            <div className="relative flex items-center justify-center">
              <ScoreGauge score={report.overall_score} size="lg" />
              <div className="absolute text-center">
                <span className="text-2xl font-bold text-white leading-none">{report.overall_score}</span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-xl font-bold text-white">Audit Complete</h3>
                {report.categories && (() => {
                  const grades = Object.values(categories).map(c => c?.grade ?? 'F')
                  const overallGrade = report.overall_score >= 90 ? 'A' : report.overall_score >= 80 ? 'B' : report.overall_score >= 70 ? 'C' : report.overall_score >= 60 ? 'D' : 'F'
                  return (
                    <span className={`text-2xl font-black ${getGradeColor(overallGrade)}`}>
                      {overallGrade}
                    </span>
                  )
                })()}
              </div>
              <p className="text-[#888] text-sm max-w-md leading-relaxed">{report.executive_summary}</p>
            </div>
          </div>

          <div className="flex gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={exportReport}
              className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-[#444] text-[#ccc] rounded-lg text-sm font-medium hover:bg-white/10 transition-all"
            >
              <Download className="h-4 w-4" />
              Export JSON
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={reset}
              className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-[#444] text-[#ccc] rounded-lg text-sm font-medium hover:bg-white/10 transition-all"
            >
              <RotateCcw className="h-4 w-4" />
              Re-run
            </motion.button>
          </div>
        </div>

        {/* Severity summary bar */}
        {Object.keys(severityCounts).length > 0 && (
          <div className="flex flex-wrap gap-3">
            {['critical', 'high', 'medium', 'low', 'info'].map((sev) =>
              severityCounts[sev] ? (
                <div
                  key={sev}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${SEVERITY_CONFIG[sev].bg} ${SEVERITY_CONFIG[sev].color} border ${SEVERITY_CONFIG[sev].border}`}
                >
                  {severityCounts[sev]} {SEVERITY_CONFIG[sev].label}
                </div>
              ) : null
            )}
          </div>
        )}

        {/* Category scores */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {categoryKeys.map((key) => {
            const cat = categories[key]
            if (!cat) return null
            const statusCfg = STATUS_CONFIG[cat.status] ?? STATUS_CONFIG.warning

            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-lg border ${statusCfg.border} ${statusCfg.bg} cursor-pointer hover:brightness-110 transition-all`}
                onClick={() => setActiveCategory(activeCategory === key ? null : key)}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-white">{CATEGORY_LABELS[key]}</span>
                  <span className={`text-lg font-black ${getGradeColor(cat.grade)}`}>{cat.grade}</span>
                </div>
                <div className="h-1.5 bg-[#0a0a0a] rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${cat.score}%` }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className={`h-full rounded-full ${getScoreBarColor(cat.score)}`}
                  />
                </div>
                <p className={`text-xs mt-1 ${statusCfg.color}`}>{cat.score}/100</p>
              </motion.div>
            )
          })}
        </div>

        {/* Quick wins */}
        {report.quick_wins?.length > 0 && (
          <div className="p-4 bg-white/3 border border-[#2a2a2a] rounded-lg">
            <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-400" />
              Quick Wins
            </h4>
            <div className="space-y-2">
              {report.quick_wins.map((win, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <span className="w-5 h-5 rounded-full bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 text-xs flex items-center justify-center flex-shrink-0 font-bold">
                    {i + 1}
                  </span>
                  <span className="text-[#ccc] flex-1">{win.title}</span>
                  <span className="text-xs text-[#666] px-2 py-0.5 bg-white/5 rounded capitalize">
                    {win.effort} effort
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Strengths */}
        {report.strengths?.length > 0 && (
          <div className="p-4 bg-green-500/5 border border-green-500/20 rounded-lg">
            <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-400" />
              Strengths
            </h4>
            <ul className="space-y-1">
              {report.strengths.map((s, i) => (
                <li key={i} className="text-sm text-[#ccc] flex items-start gap-2">
                  <span className="text-green-400 mt-0.5">•</span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Findings */}
        {sortedFindings.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                <FileSearch className="h-4 w-4 text-[#888]" />
                Findings
                {activeCategory && (
                  <span className="text-xs text-[#666] font-normal">
                    — {CATEGORY_LABELS[activeCategory]}
                    <button
                      onClick={() => setActiveCategory(null)}
                      className="ml-2 text-[#888] hover:text-white underline"
                    >
                      clear filter
                    </button>
                  </span>
                )}
              </h4>
              <span className="text-xs text-[#666]">{sortedFindings.length} finding{sortedFindings.length !== 1 ? 's' : ''}</span>
            </div>

            <div className="space-y-2">
              {sortedFindings.map((finding, i) => (
                <motion.div
                  key={finding.id ?? i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <FindingCard finding={finding} />
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {sortedFindings.length === 0 && activeCategory && (
          <div className="text-center py-8 text-[#666] text-sm">
            No findings in this category.{' '}
            <button onClick={() => setActiveCategory(null)} className="text-[#888] underline">
              Show all
            </button>
          </div>
        )}
      </div>
    )
  }

  return null
}
