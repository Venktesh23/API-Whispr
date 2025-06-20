"use client"

import { usePathname } from 'next/navigation'
import FloatingChat from './FloatingChat'
import FloatingIcons from './FloatingIcons'

export default function ConditionalFloatingComponents() {
  const pathname = usePathname()
  
  // Don't show floating components on login page
  if (pathname === '/login') {
    return null
  }
  
  return (
    <>
      <FloatingIcons />
      <FloatingChat />
    </>
  )
} 