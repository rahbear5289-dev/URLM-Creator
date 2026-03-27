'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import {
  LayoutDashboard, Image, Grid2x2, CreditCard, FileText,
  User, Bell, Settings, LogOut, HelpCircle, Zap,
  Shield, Coins, Scissors, Sparkles, Lock
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/photos', label: 'My Photos', icon: Image, lockable: true },
  { href: '/create-sheet', label: 'Create Sheet', icon: Grid2x2, lockable: true },
  { href: '/pvc-card', label: 'PVC Card', icon: CreditCard, lockable: true },
  { href: '/pdf-converter', label: 'PDF Converter', icon: FileText, lockable: true },
  { href: '/crop', label: 'PDF Crop', icon: Scissors, lockable: true },
  { href: '/ai-edit', label: 'AI PDF Edit', icon: Sparkles, lockable: true },
  { href: '/token/create', label: 'Token Enter', icon: Coins },
  { href: '/profile', label: 'Profile', icon: User },
]

const bottomItems = [
  { href: '/notifications', label: 'Notifications', icon: Bell },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, signOut, plan, isStorageFull, storageUsage, featureAccessMode } = useAuth()

  const isAdmin = user?.email === 'admin@urlm.app' || user?.user_metadata?.role === 'admin'
  const isPro = plan === 'pro' || plan === 'business'

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? 'U'

  const handleNav = (href: string, locked?: boolean) => {
    if (locked) {
      router.push('/token/create')
      return
    }
    router.push(href)
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-icon" style={{ overflow: 'hidden', padding: 0, background: 'transparent' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/rayhbear.jpg" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div className="brand-name">URLM Creator</div>
            {isPro && (
              <span style={{
                background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-blue))',
                color: 'white',
                fontSize: '9px',
                fontWeight: 800,
                padding: '2px 7px',
                borderRadius: '10px',
                letterSpacing: '0.5px',
                textTransform: 'uppercase'
              }}>{plan.toUpperCase()}</span>
            )}
          </div>
          <div className="brand-sub">{isPro ? 'Pro Edition' : 'Professional Edition'}</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-label">Main Menu</div>
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          const isLocked = featureAccessMode === 'lock' && item.lockable

          return (
            <button
              key={item.href}
              className={`nav-item ${isActive ? 'active' : ''} ${isLocked ? 'locked' : ''}`}
              onClick={() => handleNav(item.href, isLocked)}
              id={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              style={isLocked ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
              title={isLocked ? 'Storage limit reached. Please upgrade.' : ''}
            >
              {isLocked ? <Lock size={16} color="var(--accent-pink)" /> : <Icon size={16} />}
              <span style={{ flex: 1 }}>{item.label}</span>
              {isLocked && <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--accent-pink)', background: 'rgba(236,72,153,0.1)', padding: '2px 6px', borderRadius: 4 }}>LOCKED</span>}
            </button>
          )
        })}

        <div className="nav-label" style={{ marginTop: 16 }}>Account</div>
        {bottomItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <button
              key={item.href}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => handleNav(item.href)}
              id={`nav-${item.label.toLowerCase()}`}
            >
              <Icon size={16} />
              {item.label}
              {item.label === 'Notifications' && (
                <span style={{
                  marginLeft: 'auto',
                  background: 'var(--accent-purple)',
                  color: 'white',
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: '10px'
                }}>3</span>
              )}
            </button>
          )
        })}

        {isAdmin && (
          <>
            <div className="nav-label" style={{ marginTop: 16 }}>Admin</div>
            <button
              className={`nav-item ${pathname === '/admin' ? 'active' : ''}`}
              onClick={() => handleNav('/admin')}
              id="nav-admin-panel"
              style={{ color: pathname === '/admin' ? '#ef4444' : 'var(--text-secondary)' }}
            >
              <Shield size={16} color={pathname === '/admin' ? '#ef4444' : undefined} />
              Admin Panel
            </button>
          </>
        )}
      </nav>

      <div className="sidebar-footer">
        <div style={{ padding: '0 12px 16px', borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
            <span>Account Storage</span>
            <span>{storageUsage.percent.toFixed(2)}%</span>
          </div>
          <div className="progress-bar" style={{ height: 6, margin: '8px 0' }}>
            <div className="progress-fill" style={{ width: `${storageUsage.used > 0 ? Math.max(1.5, storageUsage.percent) : 0}%` }} />
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
            <span>
              {storageUsage.used > 0 && storageUsage.used < 1073741824 
                ? `${(storageUsage.used / 1048576).toFixed(1)} MB` 
                : `${(storageUsage.used / 1073741824).toFixed(2)} GB`}
            </span>
            <span>{(storageUsage.limit / 1073741824).toFixed(1)} GB</span>
          </div>
        </div>

        {!isPro && (
          <button
            className="upgrade-btn"
            id="upgrade-btn"
            onClick={() => router.push('/upgrade')}
          >
            <Zap size={14} />
            Upgrade to Pro
          </button>
        )}
        <button className="nav-item" id="nav-support" onClick={() => { }}>
          <HelpCircle size={16} />
          Support
        </button>
        <button className="nav-item" id="nav-logout" onClick={handleSignOut} style={{ color: '#ef4444' }}>
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </aside>
  )
}
