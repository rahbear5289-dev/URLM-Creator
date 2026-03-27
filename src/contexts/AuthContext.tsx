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
  featureAccessMode: 'lock' | 'open'
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  plan: 'free',
  isPro: false,
  isStorageFull: false,
  storageUsage: { used: 0, limit: 5368709120, percent: 0, credit: 0 },
  refreshPlan: async () => { },
  signOut: async () => { },
  featureAccessMode: 'open'
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [plan, setPlan] = useState<Plan>('free')
  const [isPro, setIsPro] = useState(false)
  const [isStorageFull, setIsStorageFull] = useState(false)
  const [storageUsage, setStorageUsage] = useState({ used: 0, limit: 5368709120, percent: 0, credit: 0 })
  const [featureAccessMode, setFeatureAccessMode] = useState<'lock' | 'open'>('open')

  const fetchPlan = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('plan, storage_used, storage_limit, storage_credit, feature_access_mode')
        .eq('id', userId)
        .single()

      if (error) throw error

      if (data) {
        const rawUsed = data.storage_used || 0
        const credit = data.storage_credit || 0
        const limit = data.storage_limit || 5368709120 // Default 5GB

        // Used is Raw Usage (incremented by tools), Limit is base limit (5GB)
        const used = rawUsed
        const percent = Math.min(100, limit > 0 ? parseFloat(((used / limit) * 100).toFixed(2)) : 0)
        const isFull = used >= limit
        
        setIsStorageFull(isFull)
        setStorageUsage({ used, limit, percent, credit })
        
        // Access logic: Lock if admin set mode to LOCK OR if storage is full
        const dbMode = (data.feature_access_mode as 'lock' | 'open') || 'open'
        const finalMode = (dbMode === 'lock' || isFull) ? 'lock' : 'open'
        
        setFeatureAccessMode(finalMode)
        const derivedPlan = (data.plan as Plan) || 'free'
        const isProUser = derivedPlan === 'pro' || derivedPlan === 'business'
        
        setPlan(derivedPlan)
        setIsPro(isProUser)

        // Save to localStorage for fallback
        localStorage.setItem('userPlan', JSON.stringify({
          isPro: isProUser,
          plan: derivedPlan,
          isStorageFull: isFull,
          storageUsage: { used, limit, percent, credit },
          featureAccessMode: finalMode
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
        setFeatureAccessMode(planData.featureAccessMode || 'open')
      }
    }
  }

  useEffect(() => {
    let profileSub: any = null

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) await fetchPlan(session.user.id)
      setLoading(false)
    }
    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      
      if (session?.user) {
        fetchPlan(session.user.id)
        if (profileSub) {
          supabase.removeChannel(profileSub)
          profileSub = null
        }
        
        profileSub = supabase
          .channel('profile-sync')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'photos', filter: `user_id=eq.${session.user.id}` }, () => fetchPlan(session.user.id))
          .on('postgres_changes', { event: '*', schema: 'public', table: 'sheets', filter: `user_id=eq.${session.user.id}` }, () => fetchPlan(session.user.id))
          .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_logs', filter: `user_id=eq.${session.user.id}` }, () => fetchPlan(session.user.id))
          .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${session.user.id}` }, () => fetchPlan(session.user.id))
          .subscribe()
      } else {
        setPlan('free')
        setIsPro(false)
        setIsStorageFull(false)
        setStorageUsage({ used: 0, limit: 5368709120, percent: 0, credit: 0 })
        if (profileSub) {
          supabase.removeChannel(profileSub)
          profileSub = null
        }
      }
    })

    return () => {
      subscription.unsubscribe()
      if (profileSub) supabase.removeChannel(profileSub)
    }
  }, [])

  const refreshPlan = async () => {
    if (user) await fetchPlan(user.id)
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ 
      user, session, loading, plan, isPro, isStorageFull, 
      storageUsage, refreshPlan, signOut, 
      featureAccessMode 
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
