'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useSidebar } from '@/contexts/SidebarContext'
import {
  LayoutDashboard, Image as ImageIcon, Grid2x2, CreditCard, FileText,
  User, Bell, Settings, LogOut, HelpCircle, Zap,
  Shield, Coins, Scissors, Lock, ChevronLeft, ChevronRight,
  PanelLeftClose, PanelLeftOpen, PenTool
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/photos', label: 'My Photos', icon: ImageIcon, lockable: true },
  { href: '/create-sheet', label: 'Create Sheet', icon: Grid2x2, lockable: true },
  { href: '/pvc-card', label: 'PVC Card', icon: CreditCard, lockable: true },
  { href: '/pdf-converter', label: 'PDF Converter', icon: FileText, lockable: true },
  { href: '/pdf-editor', label: 'PDF Editor', icon: PenTool, lockable: true },
  { href: '/crop', label: 'PDF Crop', icon: Scissors, lockable: true },
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
  const { isCollapsed, toggleSidebar } = useSidebar()

  const isAdmin = user?.email === 'admin@urlm.app' || user?.user_metadata?.role === 'admin'
  const isPro = plan === 'pro' || plan === 'business'

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? 'U'
  const displayName = user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? 'User'

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
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Brand Header */}
      <div className="sidebar-brand">
        <div 
          className="brand-icon" 
          onClick={() => router.push('/dashboard')}
          style={{ cursor: 'pointer', overflow: 'hidden', padding: 0 }}
          title="URLM Creator"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/rayhbear.jpg" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>

        {!isCollapsed && (
          <div className="brand-name-wrap" style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div className="brand-name">URLM Creator</div>
              {isPro && (
                <span style={{
                  background: 'linear-gradient(135deg, #10b981, #84cc16)',
                  color: '#0d2219',
                  fontSize: '9px',
                  fontWeight: 800,
                  padding: '2px 6px',
                  borderRadius: '10px',
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase'
                }}>{plan.toUpperCase()}</span>
              )}
            </div>
            <div className="brand-sub">{isPro ? 'Pro Studio' : 'Professional Edition'}</div>
          </div>
        )}

        {/* Collapse / Expand Toggle Button */}
        <button
          className="sidebar-toggle-btn"
          id="sidebar-collapse-toggle-btn"
          onClick={toggleSidebar}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Navigation items */}
      <nav className="sidebar-nav">
        {!isCollapsed && <div className="nav-label">Main Menu</div>}
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
              title={isLocked ? 'Storage limit reached. Please upgrade.' : item.label}
            >
              {isLocked ? <Lock size={18} color="#ec4899" /> : <Icon size={18} />}
              {!isCollapsed && (
                <span className="nav-item-text" style={{ flex: 1 }}>{item.label}</span>
              )}
              {!isCollapsed && isLocked && (
                <span style={{ fontSize: 9, fontWeight: 700, color: '#ec4899', background: 'rgba(236,72,153,0.15)', padding: '2px 6px', borderRadius: 4 }}>
                  LOCKED
                </span>
              )}
            </button>
          )
        })}

        {!isCollapsed && <div className="nav-label" style={{ marginTop: 14 }}>Account</div>}
        {bottomItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <button
              key={item.href}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => handleNav(item.href)}
              id={`nav-${item.label.toLowerCase()}`}
              title={item.label}
            >
              <Icon size={18} />
              {!isCollapsed && (
                <>
                  <span className="nav-item-text" style={{ flex: 1 }}>{item.label}</span>
                  {item.label === 'Notifications' && (
                    <span style={{
                      background: '#84cc16',
                      color: '#0d2219',
                      fontSize: '10px',
                      fontWeight: 800,
                      padding: '1px 6px',
                      borderRadius: '10px'
                    }}>3</span>
                  )}
                </>
              )}
            </button>
          )
        })}

        {isAdmin && (
          <>
            {!isCollapsed && <div className="nav-label" style={{ marginTop: 14 }}>Admin</div>}
            <button
              className={`nav-item ${pathname === '/admin' ? 'active' : ''}`}
              onClick={() => handleNav('/admin')}
              id="nav-admin-panel"
              style={{ color: pathname === '/admin' ? '#ef4444' : undefined }}
              title="Admin Panel"
            >
              <Shield size={18} color={pathname === '/admin' ? '#ef4444' : undefined} />
              {!isCollapsed && <span className="nav-item-text">Admin Panel</span>}
            </button>
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        {!isCollapsed && (
          <div className="sidebar-storage-box" style={{ padding: '0 8px 14px', borderBottom: '1px solid var(--sidebar-border)', marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', marginBottom: 6 }}>
              <span>Storage</span>
              <span>{storageUsage.percent.toFixed(1)}%</span>
            </div>
            <div className="progress-bar" style={{ height: 5, margin: '6px 0', background: 'rgba(255,255,255,0.1)' }}>
              <div
                className="progress-fill"
                style={{
                  width: `${storageUsage.used > 0 ? Math.max(2, storageUsage.percent) : 0}%`,
                  background: 'linear-gradient(90deg, #10b981, #84cc16)'
                }}
              />
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', display: 'flex', justifyContent: 'space-between' }}>
              <span>
                {storageUsage.used > 0 && storageUsage.used < 1073741824 
                  ? `${(storageUsage.used / 1048576).toFixed(1)} MB` 
                  : `${(storageUsage.used / 1073741824).toFixed(2)} GB`}
              </span>
              <span>{(storageUsage.limit / 1073741824).toFixed(1)} GB</span>
            </div>
          </div>
        )}

        {!isPro && !isCollapsed && (
          <button
            className="upgrade-btn"
            id="upgrade-btn"
            onClick={() => router.push('/upgrade')}
          >
            <Zap size={14} />
            <span>Upgrade to Pro</span>
          </button>
        )}

        {!isCollapsed && (
          <button className="nav-item" id="nav-support" onClick={() => router.push('/settings')}>
            <HelpCircle size={18} />
            <span className="nav-item-text">Support</span>
          </button>
        )}

        {!isCollapsed && (
          <button className="nav-item" id="nav-logout" onClick={handleSignOut} style={{ color: '#f87171' }}>
            <LogOut size={18} />
            <span className="nav-item-text">Logout</span>
          </button>
        )}

        {/* User avatar pill at bottom (Always visible, matching reference image) */}
        <div
          className="sidebar-user-avatar"
          onClick={() => router.push('/profile')}
          title={`Profile: ${displayName}`}
        >
          <div className="sidebar-user-img">
            {initials}
          </div>
          {!isCollapsed && (
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {displayName}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                {isPro ? 'Pro Plan' : 'Free Member'}
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
