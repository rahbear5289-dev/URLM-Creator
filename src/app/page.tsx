'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace('/dashboard')
      } else {
        router.replace('/login')
      }
    })
  }, [router])

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'var(--bg-primary)'
    }}>
      <div className="animate-spin" style={{ 
        width: 32, 
        height: 32, 
        border: '3px solid var(--border)', 
        borderTopColor: 'var(--accent-purple)',
        borderRadius: '50%'
      }} />
    </div>
  )
}
