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
  isStorageFull: boolean
  storageUsage: { used: number; limit: number; percent: number; credit: number }
  refreshPlan: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  plan: 'free',
  isPro: false,
  isStorageFull: false,
  storageUsage: { used: 0, limit: 2147483648, percent: 0, credit: 0 },
  refreshPlan: async () => { },
  signOut: async () => { },
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [plan, setPlan] = useState<Plan>('free')
  const [isPro, setIsPro] = useState(false)
  const [isStorageFull, setIsStorageFull] = useState(false)
  const [storageUsage, setStorageUsage] = useState({ used: 0, limit: 2147483648, percent: 0, credit: 0 })

  const fetchPlan = async (userId: string) => {
    try {
      // Try to get plan and storage credit from profiles table
      const { data, error } = await supabase
        .from('profiles')
        .select('plan_id, is_pro, storage_used, storage_limit, storage_credit')
        .eq('id', userId)
        .single()

      if (error) throw error

      if (data) {
        setIsPro(data.plan_id === 'pro' || data.is_pro === true)
        setPlan((data.plan_id as Plan) || 'free')
        
        const rawUsed = data.storage_used || 0
        const credit = data.storage_credit || 0
        const limit = data.storage_limit || 2147483648
        
        // Final Used = Raw Usage minus Credit (for tokens), floor at 0
        const used = Math.max(0, rawUsed - credit)
        const percent = Math.min(100, Math.round((used / limit) * 100))
        const isFull = percent >= 100
        
        setIsStorageFull(isFull)
        setStorageUsage({ used, limit, percent, credit })

        // Save to localStorage for fallback
        localStorage.setItem('userPlan', JSON.stringify({
          isPro: data.plan_id === 'pro' || data.is_pro === true,
          plan: data.plan_id || 'free',
          isStorageFull: isFull,
          storageUsage: { used, limit, percent, credit }
        }))
      }
    } catch (error) {
      console.warn('Error fetching plan context:', error)
      const savedPlan = localStorage.getItem('userPlan')
      if (savedPlan) {
        const planData = JSON.parse(savedPlan)
        setIsPro(planData.isPro || false)
        setPlan(planData.plan || 'free')
        setIsStorageFull(planData.isStorageFull || false)
        setStorageUsage(planData.storageUsage)
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
        setIsStorageFull(false)
        setStorageUsage({ used: 0, limit: 2147483648, percent: 0, credit: 0 })
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
    <AuthContext.Provider value={{ user, session, loading, plan, isPro, isStorageFull, storageUsage, refreshPlan, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
