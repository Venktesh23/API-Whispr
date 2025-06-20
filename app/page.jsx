'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useSupabase } from '../hooks/useSupabase'

export default function HomePage() {
  const router = useRouter()
  const { user, loading } = useSupabase()

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.push('/upload')
      } else {
        router.push('/login')
      }
    }
  }, [user, loading, router])

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <Loader2 className="h-8 w-8 text-gray-400 animate-spin" />
    </div>
  )
} 