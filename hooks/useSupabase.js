'use client'

import { createClient } from '@supabase/supabase-js'
import { useState, useEffect } from 'react'

let supabase = null

// Initialize Supabase only on the client side with environment variables
const initSupabase = () => {
  if (typeof window !== 'undefined' && !supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (url && key) {
      supabase = createClient(url, key)
    }
  }
  return supabase
}

export function useSupabase() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const client = initSupabase()
    if (!client) {
      console.error('Supabase not initialized - missing environment variables')
      setLoading(false)
      return
    }

    // Get initial session
    client.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = client.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription?.unsubscribe()
  }, [])

  const signUp = async (email, password) => {
    const client = initSupabase()
    if (!client) throw new Error('Supabase not initialized')
    
    const { data, error } = await client.auth.signUp({
      email,
      password
    })
    return { data, error }
  }

  const signIn = async (email, password) => {
    const client = initSupabase()
    if (!client) throw new Error('Supabase not initialized')
    
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password
    })
    return { data, error }
  }

  const signOut = async () => {
    const client = initSupabase()
    if (!client) throw new Error('Supabase not initialized')
    
    const { error } = await client.auth.signOut()
    return { error }
  }

  return {
    user,
    loading,
    supabase: initSupabase(),
    signIn,
    signUp,
    signOut,
  }
} 