'use client'

import { useEffect, useState } from 'react'
import {
  Upload,
  Zap,
  MessageSquare,
  Code2,
  TestTube,
  GitCompare,
  Share2
} from 'lucide-react'

const WorkflowAnimation = () => {
  const [activeStep, setActiveStep] = useState(0)

  const steps = [
    {
      icon: Upload,
      label: 'Upload spec',
      desc: 'Upload an OpenAPI spec (YAML/JSON), PDF, or DOCX'
    },
    {
      icon: Zap,
      label: 'AI analysis',
      desc: 'Instant analysis — endpoints, health score, parameters'
    },
    {
      icon: MessageSquare,
      label: 'Chat with API',
      desc: 'Ask anything about endpoints, auth, or schemas'
    },
    {
      icon: Code2,
      label: 'Generate code',
      desc: 'Ready-to-use code in Python, TypeScript, JavaScript, Go'
    },
    {
      icon: TestTube,
      label: 'Generate tests',
      desc: 'Auto-generate tests in Jest, Pytest, or Postman'
    },
    {
      icon: GitCompare,
      label: 'Compare specs',
      desc: 'Detect breaking changes, deprecations, and new endpoints'
    },
    {
      icon: Share2,
      label: 'Share & export',
      desc: 'Share read-only links or export comprehensive PDFs'
    }
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep(prev => (prev + 1) % steps.length)
    }, 2500)
    return () => clearInterval(interval)
  }, [steps.length])

  return (
    <div className="w-full space-y-6">
      {/* Steps */}
      <div className="flex justify-between gap-2 overflow-x-auto pb-2">
        {steps.map((step, idx) => {
          const Icon = step.icon
          const isActive = idx === activeStep
          const isPassed = idx < activeStep
          
          return (
            <div
              key={idx}
              className="flex flex-col items-center gap-2 flex-shrink-0 w-16"
            >
              <div
                className={`w-14 h-14 rounded-lg border flex items-center justify-center transition-all duration-300 ${
                  isActive || isPassed
                    ? 'bg-gray-700 border-gray-500'
                    : 'bg-gray-900 border-gray-700'
                }`}
              >
                <Icon
                  className={`w-6 h-6 transition-all duration-300 ${
                    isActive || isPassed ? 'stroke-gray-200' : 'stroke-gray-600'
                  }`}
                />
              </div>
              <div
                className={`text-[13px] text-center transition-all duration-300 leading-tight font-medium ${
                  isActive || isPassed ? 'text-gray-400' : 'text-gray-600'
                }`}
              >
                {step.label}
              </div>
            </div>
          )
        })}
      </div>

      {/* Progress Bar */}
      <div className="w-full h-0.5 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gray-600 transition-all duration-500"
          style={{ width: `${((activeStep + 1) / steps.length) * 100}%` }}
        />
      </div>

      {/* Description */}
      <div className="min-h-14 text-sm text-gray-400 leading-relaxed transition-all duration-300">
        <div className="flex items-start gap-2">
          <div className="text-gray-500 font-semibold mt-0.5">
            {activeStep + 1}.
          </div>
          <div>
            <div className="font-semibold text-gray-300">{steps[activeStep].label}</div>
            <div className="text-gray-500 text-sm mt-1">{steps[activeStep].desc}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WorkflowAnimation
