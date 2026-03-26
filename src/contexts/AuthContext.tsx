'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { User, Session } from '@supabase/supabase-js'

export type Plan = 'free' | 'pro' | 'business'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  plan: Plan
  isPro: boolean
  refreshPlan: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  plan: 'free',
  isPro: false,
  refreshPlan: async () => { },
  signOut: async () => { },
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [plan, setPlan] = useState<Plan>('free')
  const [isPro, setIsPro] = useState(false)

  const fetchPlan = async (userId: string) => {
    try {
      // Try to get plan from profiles table
      const { data, error } = await supabase
        .from('profiles')
        .select('plan_id, is_pro')
        .eq('id', userId)
        .single()

      if (error) {
        // Profiles table might not have those columns - use localStorage fallback
        console.warn('Profiles table error:', error.message)
        const savedPlan = localStorage.getItem('userPlan')
        if (savedPlan) {
          const planData = JSON.parse(savedPlan)
          setIsPro(planData.isPro || false)
          setPlan(planData.plan || 'free')
        }
        return
      }

      if (data) {
        setIsPro(data.plan_id === 'pro' || data.is_pro === true)
        setPlan((data.plan_id as Plan) || 'free')
        // Save to localStorage for fallback
        localStorage.setItem('userPlan', JSON.stringify({
          isPro: data.plan_id === 'pro' || data.is_pro === true,
          plan: data.plan_id || 'free'
        }))
      }
    } catch (error) {
      console.warn('Error fetching plan:', error)
      // Use localStorage fallback
      const savedPlan = localStorage.getItem('userPlan')
      if (savedPlan) {
        const planData = JSON.parse(savedPlan)
        setIsPro(planData.isPro || false)
        setPlan(planData.plan || 'free')
      } else {
        setPlan('free')
        setIsPro(false)
      }
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) fetchPlan(session.user.id)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) fetchPlan(session.user.id)
      else {
        setPlan('free')
        setIsPro(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const refreshPlan = async () => {
    if (user) await fetchPlan(user.id)
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, plan, isPro, refreshPlan, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
