'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut, plan, isStorageFull, storageUsage, featureAccessMode } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  const isLocked = featureAccessMode === 'lock'
  const restrictedPaths = ['/photos', '/create-sheet', '/pvc-card', '/pdf-converter', '/crop', '/ai-edit']

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login')
      return
    }

    // Redirect if locked and user tries to access restricted tools
    if (!loading && isLocked && restrictedPaths.some(path => pathname.startsWith(path))) {
      router.replace('/token/create')
    }
  }, [user, loading, isStorageFull, pathname, router, isLocked])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <div className="animate-spin" style={{ width: 32, height: 32, border: '3px solid var(--border)', borderTopColor: 'var(--accent-purple)', borderRadius: '50%' }} />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Header />
        <main className="page-content animate-in">
          {children}
        </main>
      </div>
    </div>
  )
}
