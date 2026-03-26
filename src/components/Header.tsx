'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Search, Bell, Settings, ChevronDown } from 'lucide-react'

export default function Header() {
  const { user } = useAuth()
  const router = useRouter()

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? 'U'
  const displayName = user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? 'User'

  return (
    <header className="header">
      <div className="header-search">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input 
          id="header-search-input"
          type="text" 
          placeholder="Search your library..."
        />
      </div>

      <div className="header-spacer" />

      <div className="header-actions">
        <button 
          className="icon-btn" 
          id="header-notifications-btn"
          onClick={() => router.push('/notifications')}
        >
          <Bell size={16} />
          <span className="badge">3</span>
        </button>

        <button 
          className="icon-btn" 
          id="header-settings-btn"
          onClick={() => router.push('/settings')}
        >
          <Settings size={16} />
        </button>

        <button 
          className="user-pill" 
          id="header-user-pill"
          onClick={() => router.push('/profile')}
        >
          <div className="user-avatar">{initials}</div>
          <div>
            <div className="user-name">{displayName}</div>
            <div className="user-role">Pro Member</div>
          </div>
          <ChevronDown size={14} color="var(--text-muted)" />
        </button>
      </div>
    </header>
  )
}
