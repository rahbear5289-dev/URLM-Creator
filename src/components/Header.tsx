'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { Search, Bell, Settings, ChevronDown, Sun, Moon, PlusCircle, Wallet, Sparkles } from 'lucide-react'

export default function Header() {
  const { user, plan } = useAuth()
  const { theme, resolvedTheme, setTheme } = useTheme()
  const router = useRouter()
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? 'U'
  const displayName = user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? 'User'
  const isPro = plan === 'pro' || plan === 'business'

  const toggleTheme = () => {
    const nextTheme = resolvedTheme === 'dark' ? 'light' : 'dark'
    setTheme(nextTheme)
  }

  return (
    <header className="header">
      {/* Sales Admin dropdown title */}
      <div style={{ position: 'relative' }}>
        <button 
          className="header-dropdown-btn" 
          onClick={() => setDropdownOpen(!dropdownOpen)}
          id="header-admin-dropdown"
        >
          <span>Sales Admin</span>
          <ChevronDown size={15} style={{ opacity: 0.7 }} />
        </button>

        {dropdownOpen && (
          <div 
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              marginTop: 6,
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: '6px 0',
              minWidth: 170,
              boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
              zIndex: 100,
            }}
          >
            <div 
              style={{ padding: '8px 14px', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer' }}
              onClick={() => { router.push('/dashboard'); setDropdownOpen(false) }}
            >
              📊 Sales Admin
            </div>
            <div 
              style={{ padding: '8px 14px', fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer' }}
              onClick={() => { router.push('/photos'); setDropdownOpen(false) }}
            >
              🖼️ Photo Studio
            </div>
            <div 
              style={{ padding: '8px 14px', fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer' }}
              onClick={() => { router.push('/create-sheet'); setDropdownOpen(false) }}
            >
              📑 Sheet Generator
            </div>
          </div>
        )}
      </div>

      {/* Pill Search bar */}
      <div className="header-search">
        <Search size={16} />
        <input 
          id="header-search-input"
          type="text" 
          placeholder="Search here..."
        />
      </div>

      <div className="header-spacer" />

      {/* Right Header Actions */}
      <div className="header-actions">
        {/* Light / Dark Mode Switcher */}
        <button 
          className="theme-toggle-btn"
          id="theme-toggle-btn"
          onClick={toggleTheme}
          title={`Switch to ${resolvedTheme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          <div className="theme-toggle-icon">
            {resolvedTheme === 'dark' ? <Moon size={14} /> : <Sun size={14} />}
          </div>
          <span style={{ textTransform: 'capitalize' }}>
            {resolvedTheme === 'dark' ? 'Dark' : 'Light'}
          </span>
        </button>

        {/* Wallet / Token action */}
        <button 
          className="icon-btn" 
          id="header-wallet-btn"
          onClick={() => router.push('/token/create')}
          title="Tokens & Credits"
        >
          <Wallet size={16} />
        </button>

        {/* Add new product / New creation */}
        <button 
          className="header-add-btn" 
          id="header-add-product-btn"
          onClick={() => router.push('/photos')}
          title="Add new product or upload photo"
        >
          <span>Add new product</span>
          <PlusCircle size={16} />
        </button>

        {/* Notifications */}
        <button 
          className="icon-btn" 
          id="header-notifications-btn"
          onClick={() => router.push('/notifications')}
          title="Notifications"
        >
          <Bell size={16} />
          <span className="badge" style={{ background: '#84cc16', color: '#0d2219', fontWeight: 800 }}>3</span>
        </button>

        {/* Settings */}
        <button 
          className="icon-btn" 
          id="header-settings-btn"
          onClick={() => router.push('/settings')}
          title="Settings"
        >
          <Settings size={16} />
        </button>

        {/* User Pill */}
        <button 
          className="user-pill" 
          id="header-user-pill"
          onClick={() => router.push('/profile')}
        >
          <div className="user-avatar" style={{ background: 'linear-gradient(135deg, #10b981, #84cc16)', color: '#0d2219' }}>
            {initials}
          </div>
          <div style={{ textAlign: 'left' }}>
            <div className="user-name" style={{ fontSize: 13, lineHeight: 1.2 }}>{displayName}</div>
            <div className="user-role" style={{ color: '#84cc16', fontWeight: 600 }}>{isPro ? 'Pro Member' : 'Free Member'}</div>
          </div>
          <ChevronDown size={14} color="var(--text-muted)" />
        </button>
      </div>
    </header>
  )
}
