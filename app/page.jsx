'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    // Silently redirect to login page
    router.push('/login')
  }, [router])

  // Return nothing while redirecting
  return null
}
