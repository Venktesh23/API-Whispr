"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Bot, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  ArrowRight
} from 'lucide-react'
import Head from 'next/head'
import { useSupabase } from '../../hooks/useSupabase'

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [alert, setAlert] = useState({ type: '', message: '' })
  
  const router = useRouter()
  const { user, loading, signUp, signIn } = useSupabase()

  // Redirect if already authenticated
  useEffect(() => {
    if (!loading && user) {
      router.push('/upload')
    }
  }, [user, loading, router])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // Clear field error when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validateForm = () => {
    const errors = {}
    
    if (!formData.email) {
      errors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Please enter a valid email address'
    }
    
    if (!formData.password) {
      errors.password = 'Password is required'
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters'
    }
    
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    setIsLoading(true)
    setAlert({ type: '', message: '' })

    try {
      // First try to sign in
      const { data: signInData, error: signInError } = await signIn(formData.email, formData.password)
      
      if (signInError) {
        // If sign in fails, check if it's because user doesn't exist
        if (signInError.message === 'Invalid login credentials') {
          // Try to sign up the user
          const { data: signUpData, error: signUpError } = await signUp(formData.email, formData.password)
          
          if (signUpError) {
            throw signUpError
          }
          
          setAlert({
            type: 'success',
            message: 'Account created! Please check your email to verify your account.'
          })
        } else {
          throw signInError
        }
      } else {
        // Sign in successful
        setAlert({
          type: 'success',
          message: 'Welcome back! Redirecting...'
        })
        
        setTimeout(() => {
          router.push('/upload')
        }, 1500)
      }
    } catch (error) {
      setAlert({
        type: 'error',
        message: error.message || 'Authentication failed. Please try again.'
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Show loading spinner while checking auth state
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-gray-400 animate-spin" />
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>API Whispr – Login</title>
        <link rel="icon" href="/favicon.ico" />
        <meta name="description" content="AI-powered API documentation assistant." />
      </Head>

      <div className="min-h-screen bg-black text-white font-['Inter',sans-serif] relative">
        {/* Simple Background */}
        <div className="absolute inset-0 z-0">
          {/* Subtle grid pattern */}
          <div 
            className="absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage: `
                linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)
              `,
              backgroundSize: '100px 100px'
            }}
          />
        </div>

        {/* Main Content */}
        <div className="relative z-10 min-h-screen">
          <div className="container mx-auto px-6 py-8 h-screen">
            <div className="grid lg:grid-cols-2 gap-12 h-full items-center">
              
              {/* Left Panel - Branding */}
              <div className="space-y-8 lg:pr-8">
                {/* Logo */}
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-3 rounded-2xl border border-gray-700/50">
                      <Bot className="h-8 w-8 text-gray-300" />
                    </div>
                  </div>
                  <h1 className="text-6xl lg:text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-gray-200 to-gray-400">
                    API Whispr
                  </h1>
                </div>

                {/* Main Headline */}
                <div className="space-y-6">
                  <h2 className="text-5xl lg:text-6xl font-bold leading-tight text-transparent bg-clip-text bg-gradient-to-r from-gray-100 to-gray-300">
                    From Schema to Clarity — Instantly
                  </h2>
                  
                  <p className="text-xl text-gray-400 leading-relaxed max-w-lg font-light">
                    Transform complex OpenAPI specifications into clear, actionable documentation using advanced AI technology.
                  </p>
                </div>
              </div>

              {/* Right Panel - Login Form */}
              <div className="flex justify-center lg:justify-start lg:pl-8">
                <div className="w-full max-w-md">
                  <div className="bg-gradient-to-br from-zinc-900/95 to-black/95 backdrop-blur-xl border border-zinc-700/30 rounded-2xl p-8 shadow-2xl hover:shadow-black/50 transition-all duration-300 hover:border-zinc-600/40">
                    
                    {/* Form Header */}
                    <div className="text-center mb-8">
                      <h3 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-300 mb-3 tracking-tight">Welcome Back</h3>
                      <p className="text-gray-400 text-base font-medium">Enter your credentials to access API Whispr</p>
                    </div>

                    {/* Alert Messages */}
                    {alert.message && (
                      <div
                        className={`mb-6 p-4 rounded-xl border flex items-center gap-3 ${
                          alert.type === 'error' 
                            ? 'bg-red-500/10 border-red-500/30 text-red-400' 
                            : 'bg-green-500/10 border-green-500/30 text-green-400'
                        }`}
                      >
                        {alert.type === 'error' ? (
                          <AlertCircle className="h-5 w-5 flex-shrink-0" />
                        ) : (
                          <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
                        )}
                        <span className="text-sm">{alert.message}</span>
                      </div>
                    )}

                    {/* Login Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                      {/* Email Field */}
                      <div>
                        <label htmlFor="email" className="block text-base font-semibold text-gray-200 mb-3">
                          Email Address
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-zinc-400" />
                          <input
                            id="email"
                            name="email"
                            type="email"
                            inputMode="email"
                            autoComplete="email"
                            required
                            value={formData.email}
                            onChange={handleInputChange}
                            className={`w-full pl-11 pr-4 py-4 bg-zinc-900/80 border rounded-xl focus:outline-none transition-all duration-300 text-white placeholder-zinc-400 font-medium ${
                              fieldErrors.email 
                                ? 'border-red-500/50 shadow-lg shadow-red-500/20' 
                                : 'border-zinc-700/50 hover:border-zinc-600/70 focus:border-zinc-600/80 focus:shadow-lg focus:shadow-white/10'
                            }`}
                            placeholder="you@company.com"
                          />
                        </div>
                        {fieldErrors.email && (
                          <p className="text-sm text-red-400 mt-2">{fieldErrors.email}</p>
                        )}
                      </div>

                      {/* Password Field */}
                      <div>
                        <label htmlFor="password" className="block text-base font-semibold text-gray-200 mb-3">
                          Password
                        </label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-zinc-400" />
                          <input
                            id="password"
                            name="password"
                            type={showPassword ? 'text' : 'password'}
                            autoComplete="current-password"
                            required
                            value={formData.password}
                            onChange={handleInputChange}
                            className={`w-full pl-11 pr-12 py-4 bg-zinc-900/80 border rounded-xl focus:outline-none transition-all duration-300 text-white placeholder-zinc-400 font-medium ${
                              fieldErrors.password 
                                ? 'border-red-500/50 shadow-lg shadow-red-500/20' 
                                : 'border-zinc-700/50 hover:border-zinc-600/70 focus:border-zinc-600/80 focus:shadow-lg focus:shadow-white/10'
                            }`}
                            placeholder="Enter your password"
                          />
                          <button
                            type="button"
                            title={showPassword ? "Hide password" : "Show password"}
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-zinc-400 hover:text-zinc-200 transition-colors"
                          >
                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </button>
                        </div>
                        {fieldErrors.password && (
                          <p className="text-sm text-red-400 mt-2">{fieldErrors.password}</p>
                        )}
                      </div>

                      {/* Sign In Button */}
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="relative w-full bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 shadow-lg group overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-2xl hover:shadow-white/20 transform hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:shadow-xl focus:shadow-white/25"
                      >
                        <span className="relative z-10 flex items-center justify-center gap-3 text-lg">
                          {isLoading ? (
                            <>
                              <Loader2 className="h-5 w-5 animate-spin" />
                              Authenticating...
                            </>
                          ) : (
                            <>
                              Sign In to API Whispr
                              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
                            </>
                          )}
                        </span>
                        <div className="absolute inset-0 group-hover:bg-[#00FF9C]/5 transition-all duration-300" />
                      </button>
                    </form>

                    {/* Footer Links */}
                    <div className="mt-8 text-center space-y-3">
                      <p className="text-sm text-gray-500 font-medium">
                        New user? Account will be created automatically
                      </p>
                      <div className="flex justify-center">
                        <a href="#" className="text-gray-400 hover:text-white transition-colors hover:underline text-sm font-medium focus:outline-none focus:text-white focus:shadow-sm focus:shadow-white/20 rounded px-1 py-0.5">
                          Forgot password?
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
} 