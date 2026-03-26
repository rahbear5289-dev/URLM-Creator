'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { useCountUp } from '@/lib/useCountUp'
import TokenCreateTab from './components/TokenCreateTab'
import PaymentsTab from './components/PaymentsTab'
import {
  LayoutDashboard, Users, HardDrive, FileText, Bell,
  BarChart2, Shield, LogOut, Activity, Search,
  UserCheck, UserX, Trash2, Send, RefreshCw,
  TrendingUp, Image, Grid2x2, CheckCircle,
  ChevronRight, X, Coins, Zap, Wallet, Copy, IndianRupee, CreditCard
} from 'lucide-react'

type Tab = 'dashboard' | 'users' | 'storage' | 'logs' | 'notifications' | 'analytics' | 'tokens' | 'payments'

interface UserRow {
  id: string
  email: string
  full_name: string
  role: string
  status: string
  created_at: string
}

interface LogRow {
  id: string
  user_id: string
  action: string
  description: string
  file_name: string
  created_at: string
}

interface NotifRow {
  id: string
  user_id: string
  title: string
  message: string
  is_read: boolean
  type: string
  created_at: string
}

const ADMIN_EMAIL = 'admin@urlm.app' // Change to your admin email

export default function AdminPage() {
  const { user, loading: authLoading, signOut } = useAuth()
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('dashboard')
  const [users, setUsers] = useState<UserRow[]>([])
  const [logs, setLogs] = useState<LogRow[]>([])
  const [notifications, setNotifications] = useState<NotifRow[]>([])
  const [loading, setLoading] = useState(false)
  const [isAdminVerified, setIsAdminVerified] = useState(false)
  const [search, setSearch] = useState('')
  const [notifTitle, setNotifTitle] = useState('')
  const [notifMessage, setNotifMessage] = useState('')
  const [notifTarget, setNotifTarget] = useState('all')
  const [sendingNotif, setSendingNotif] = useState(false)
  const [stats, setStats] = useState({ users: 0, photos: 0, sheets: 0, pdfs: 0 })
  const [storageStats, setStorageStats] = useState({ totalMB: 0, totalPhotos: 0, totalPdfs: 0 })
  const [chartData, setChartData] = useState<{ day: string; sheets: number; photos: number }[]>([])
  const [toast, setToast] = useState('')
  const [adminBalances, setAdminBalances] = useState({ inr: 1149638, totalInr: 1149638 })

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  // Check admin access — auth load ہونے تک wait کریں
  useEffect(() => {
    if (authLoading) return // ابھی check نہ کریں
    if (!user) {
      router.replace('/login/admin')
      return
    }
    // DB سے role check کریں (email check backup کے طور پر)
    const verifyAdmin = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      const roleIsAdmin = data?.role === 'admin'
      const emailIsAdmin = user.email === ADMIN_EMAIL || user.user_metadata?.role === 'admin'
      if (roleIsAdmin || emailIsAdmin) {
        setIsAdminVerified(true)
      } else {
        router.replace('/dashboard')
      }
    }
    verifyAdmin()
  }, [user, authLoading, router])

  // ─── loadData (wrapped in useCallback so it's stable for subscriptions) ───
  const loadData = useCallback(async () => {
    if (!isAdminVerified) return
    setLoading(true)
    const [{ count: uCount }, { count: pCount }, { count: sCount }] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('photos').select('*', { count: 'exact', head: true }),
      supabase.from('sheets').select('*', { count: 'exact', head: true }),
    ])
    setStats({ users: uCount ?? 0, photos: pCount ?? 0, sheets: sCount ?? 0, pdfs: sCount ?? 0 })

    if (tab === 'storage') {
      const [profilesRes, photosRes, sheetsRes] = await Promise.all([
        supabase.from('profiles').select('id, email, full_name, status, storage_used, total_files, role'),
        supabase.from('photos').select('*', { count: 'exact', head: true }),
        supabase.from('sheets').select('*', { count: 'exact', head: true }),
      ])
      const totalStorage = (profilesRes.data ?? []).reduce((acc: number, p: Record<string, unknown>) => acc + ((p.storage_used as number) ?? 0), 0)
      setStorageStats({
        totalMB: Math.round(totalStorage / 1048576),
        totalPhotos: photosRes.count ?? 0,
        totalPdfs: sheetsRes.count ?? 0,
      })
      setUsers((profilesRes.data ?? []).map((u: Record<string, unknown>) => ({
        id: u.id as string, email: (u.email as string) ?? '—', full_name: (u.full_name as string) ?? '—',
        role: (u.role as string) ?? 'user', status: (u.status as string) ?? 'active', created_at: (u.created_at as string) ?? '',
      })))
    } else if (tab === 'users' || tab === 'dashboard') {
      const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(50)
      setUsers((data ?? []).map((u: Record<string, unknown>) => ({
        id: u.id as string, email: (u.email as string) ?? '—', full_name: (u.full_name as string) ?? '—',
        role: (u.role as string) ?? 'user', status: (u.status as string) ?? 'active', created_at: u.created_at as string,
      })))
      
      // Fetch admin balance
      const { data: profile } = await supabase.from('profiles').select('inr_balance').eq('id', user?.id).single()
      if (profile) {
        // Base starting balance (4.6924 ETH converted) + real DB balance
        const baseBalance = 1149638
        const inr = (profile.inr_balance || 0) + baseBalance
        setAdminBalances({ inr, totalInr: inr })
      }
    }
    if (tab === 'logs') {
      const { data } = await supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(100)
      setLogs(data ?? [])
    }
    if (tab === 'notifications') {
      const { data } = await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(50)
      setNotifications(data ?? [])
    }
    if (tab === 'analytics' || tab === 'dashboard') {
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const isoDate = sevenDaysAgo.toISOString()

      const [photosData, sheetsData] = await Promise.all([
        supabase.from('photos').select('created_at').gte('created_at', isoDate),
        supabase.from('sheets').select('created_at').gte('created_at', isoDate),
      ])

      const days: { dateKey: string; day: string; photos: number; sheets: number }[] = []
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      for (let i = 6; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const dayStr = d.toISOString().split('T')[0]
        days.push({ dateKey: dayStr, day: dayNames[d.getDay()], photos: 0, sheets: 0 })
      }

      photosData.data?.forEach(p => {
        if (!p.created_at) return
        const dStr = new Date(p.created_at).toISOString().split('T')[0]
        const target = days.find(x => x.dateKey === dStr)
        if (target) target.photos++
      })

      sheetsData.data?.forEach(s => {
        if (!s.created_at) return
        const dStr = new Date(s.created_at).toISOString().split('T')[0]
        const target = days.find(x => x.dateKey === dStr)
        if (target) target.sheets++
      })

      setChartData(days.map(d => ({ day: d.day, photos: d.photos, sheets: d.sheets })))
    }
    setLoading(false)
  }, [tab, isAdminVerified])

  // ─── Load on tab change (صرف admin verify ہونے کے بعد) ───
  useEffect(() => {
    if (isAdminVerified) {
      setTimeout(() => loadData(), 0)
    }
  }, [loadData, isAdminVerified])

  // ─── Real-time subscription (with debouncing) ───
  useEffect(() => {
    let timer: NodeJS.Timeout
    const debouncedRefresh = () => {
      clearTimeout(timer)
      timer = setTimeout(() => loadData(), 2000) // 2s debounce
    }

    const channel = supabase
      .channel('admin-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, debouncedRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'photos' }, debouncedRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sheets' }, debouncedRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_logs' }, debouncedRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, debouncedRefresh)
      .subscribe()
    return () => { 
      supabase.removeChannel(channel)
      clearTimeout(timer)
    }
  }, [loadData])

  const blockUser = async (id: string, status: string) => {
    const newStatus = status === 'active' ? 'blocked' : 'active'
    await supabase.from('profiles').update({ status: newStatus }).eq('id', id)
    setUsers(u => u.map(usr => usr.id === id ? { ...usr, status: newStatus } : usr))
    showToast(`User ${newStatus === 'blocked' ? 'blocked' : 'unblocked'} successfully.`)
  }

  const deleteUser = async (id: string) => {
    if (!confirm('Delete this user profile permanently?')) return
    await supabase.from('profiles').delete().eq('id', id)
    setUsers(u => u.filter(usr => usr.id !== id))
    showToast('User deleted.')
  }

  const sendNotification = async () => {
    if (!notifTitle || !notifMessage) return
    setSendingNotif(true)
    // Admin کے لیے service role یا RLS bypass کی ضرورت نہیں کیونکہ
    // ab notifications_insert_policy میں is_admin() check ہے
    if (notifTarget === 'all') {
      const allUsers = users.filter(u => u.role !== 'admin') // admin کو خود notification نہ بھیجیں
      const inserts = allUsers.map(u => ({
        user_id: u.id,
        title: notifTitle,
        message: notifMessage,
        type: 'update',
      }))
      if (inserts.length > 0) {
        const { error } = await supabase.from('notifications').insert(inserts)
        if (error) { showToast('Error: ' + error.message); setSendingNotif(false); return }
      }
    } else {
      const { error } = await supabase.from('notifications').insert({
        user_id: notifTarget,
        title: notifTitle,
        message: notifMessage,
        type: 'update',
      })
      if (error) { showToast('Error: ' + error.message); setSendingNotif(false); return }
    }
    setNotifTitle('')
    setNotifMessage('')
    setSendingNotif(false)
    showToast('Notification sent successfully!')
    loadData()
  }

  const deleteNotification = async (id: string) => {
    await supabase.from('notifications').delete().eq('id', id)
    setNotifications(n => n.filter(item => item.id !== id))
    showToast('Notification deleted.')
  }

  const filteredUsers = users.filter(u =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.full_name.toLowerCase().includes(search.toLowerCase())
  )

  const navItems: { key: Tab; label: string; icon: any }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'users', label: 'Users', icon: Users },
    { key: 'storage', label: 'Storage', icon: HardDrive },
    { key: 'logs', label: 'Activity Logs', icon: FileText },
    { key: 'notifications', label: 'Notifications', icon: Bell },
    { key: 'tokens', label: 'Token Create', icon: Coins },
    { key: 'payments', label: 'Payments', icon: IndianRupee },
    { key: 'analytics', label: 'Analytics', icon: BarChart2 },
  ]

  // ── Animated counters – MUST be before any early return (Rules of Hooks) ──
  const animUsers = useCountUp(stats.users)
  const animPhotos = useCountUp(stats.photos)
  const animSheets = useCountUp(stats.sheets)

  // Auth load ہو رہی ہے یا admin verify نہیں ہوا — loading screen دکھائیں
  if (authLoading || (!isAdminVerified && !!user)) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-primary)' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="animate-spin" style={{ width: 44, height: 44, border: '3px solid var(--border)', borderTopColor: '#ef4444', borderRadius: '50%', margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Verifying admin access...</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 24, right: 24, zIndex: 9999,
          background: '#7c5cf6', color: 'white', padding: '12px 20px',
          borderRadius: 10, fontSize: 13, fontWeight: 600,
          boxShadow: '0 8px 30px rgba(124,92,246,0.4)',
          animation: 'slideIn 0.3s ease'
        }}>
          ✓ {toast}
        </div>
      )}

      {/* Admin Sidebar */}
      <aside style={{
        width: 240, background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        position: 'fixed', top: 0, left: 0, height: '100vh', zIndex: 50
      }}>
        <div style={{ padding: '20px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36,
            background: 'linear-gradient(135deg, #ef4444, #f97316)',
            borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Shield size={18} color="white" />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Admin Panel</div>
            <div style={{ fontSize: 10, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 600 }}>URLM Control</div>
          </div>
        </div>

        <nav style={{ padding: '16px 10px', flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, padding: '8px 8px 4px', marginBottom: 4 }}>Management</div>
          {navItems.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              id={`admin-nav-${key}`}
              onClick={() => setTab(key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 8,
                color: tab === key ? 'var(--accent-purple-light)' : 'var(--text-secondary)',
                background: tab === key ? 'rgba(124,92,246,0.15)' : 'none',
                borderLeft: tab === key ? '2px solid var(--accent-purple)' : '2px solid transparent',
                borderTop: 'none', borderRight: 'none', borderBottom: 'none',
                fontSize: 13.5, fontWeight: 500, cursor: 'pointer', width: '100%', textAlign: 'left',
                transition: 'all 0.15s'
              }}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </nav>

        <div style={{ padding: '12px 10px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button
            onClick={() => router.push('/dashboard')}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, width: '100%', textAlign: 'left' }}
          >
            <ChevronRight size={16} />
            Back to App
          </button>
          <button
            onClick={async () => { await signOut(); router.push('/login/admin') }}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, width: '100%', textAlign: 'left' }}
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ marginLeft: 240, flex: 1, padding: '32px 32px', minHeight: '100vh' }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
                {navItems.find(n => n.key === tab)?.label}
              </h1>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                URLM Admin — Full platform control & monitoring
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, border: '1px solid rgba(239,68,68,0.3)' }}>
                🛡️ ADMIN
              </span>
              <button onClick={loadData} className="icon-btn" id="admin-refresh-btn" title="Refresh data">
                <RefreshCw size={15} />
              </button>
            </div>
          </div>
        </div>

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <div className="animate-spin" style={{ width: 36, height: 36, border: '3px solid var(--border)', borderTopColor: 'var(--accent-purple)', borderRadius: '50%' }} />
          </div>
        )}

        {!loading && (
          <>
            {/* DASHBOARD TAB */}
            {tab === 'dashboard' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {/* Stat Cards */}
                <div className="grid-4">
                  {[
                    { label: 'Registered Users', value: animUsers, icon: Users, color: '#7c5cf6', change: 'Total accounts' },
                    { label: 'Photos Edited', value: animPhotos, icon: Image, color: '#4f8ef7', change: 'AI processing' },
                    { label: 'Wallet Balance (INR)', value: `₹${adminBalances.totalInr.toLocaleString()}`, icon: Wallet, color: '#f59e0b', change: 'Main wallet' },
                    { label: 'System Health', value: '✓ OK', icon: CheckCircle, color: '#34d399', change: '99.5% uptime' },
                  ].map(s => {
                    const Icon = s.icon
                    return (
                      <div key={s.label} className="stat-card">
                        <div className="stat-label">
                          <div style={{ width: 28, height: 28, borderRadius: 8, background: `${s.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Icon size={14} color={s.color} />
                          </div>
                          {s.label}
                          {/* Live pulse dot */}
                          <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, color: '#34d399', fontWeight: 700 }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', display: 'inline-block', animation: 'pulse 2s infinite' }} />
                            LIVE
                          </span>
                        </div>
                        <div className="stat-value" style={{ fontSize: 28, transition: 'all 0.15s' }}>{s.value}</div>
                        <div className="stat-change">{s.change}</div>
                      </div>
                    )
                  })}
                </div>

                {/* Dashboard Chart and Recent Users */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: 24 }}>
                  <div className="card">
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 24 }}>Daily Usage — Last 7 Days</h3>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 160, padding: '0 8px' }}>
                      {chartData.map((d, i) => {
                        const maxVal = Math.max(10, ...chartData.flatMap(c => [c.sheets, c.photos]))
                        return (
                          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                            <div style={{ width: '100%', display: 'flex', gap: 3, alignItems: 'flex-end', height: 140 }}>
                              <div style={{
                                flex: 1, background: 'rgba(124,92,246,0.6)',
                                height: `${(d.sheets / maxVal) * 100}%`,
                                borderRadius: '3px 3px 0 0',
                                minHeight: 4,
                                transition: 'height 0.3s'
                              }} title={`${d.sheets} sheets`} />
                              <div style={{
                                flex: 1, background: 'rgba(79,142,247,0.6)',
                                height: `${(d.photos / maxVal) * 100}%`,
                                borderRadius: '3px 3px 0 0',
                                minHeight: 4,
                                transition: 'height 0.3s'
                              }} title={`${d.photos} photos`} />
                            </div>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{d.day}</span>
                          </div>
                        )
                      })}
                    </div>
                    <div style={{ display: 'flex', gap: 20, marginTop: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-secondary)' }}>
                        <div style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(124,92,246,0.6)' }} />
                        Sheets
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-secondary)' }}>
                        <div style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(79,142,247,0.6)' }} />
                        Photos
                      </div>
                    </div>
                  </div>

                  <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>New Users</h3>
                      <button onClick={() => setTab('users')} style={{ fontSize: 12, color: 'var(--accent-purple-light)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                        All →
                      </button>
                    </div>
                    <table className="data-table" style={{ fontSize: 13 }}>
                      <tbody>
                        {users.slice(0, 6).map(u => (
                          <tr key={u.id}>
                            <td style={{ padding: '10px 16px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#7c5cf6,#4f8ef7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'white' }}>
                                  {(u.full_name || u.email).slice(0, 2).toUpperCase()}
                                </div>
                                <div style={{ overflow: 'hidden' }}>
                                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{u.full_name}</div>
                                  <div style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{u.email}</div>
                                </div>
                              </div>
                            </td>
                            <td style={{ textAlign: 'right', padding: '10px 16px' }}><span className={`pill ${u.status === 'active' ? 'pill-green' : 'pill-red'}`} style={{ fontSize: 9 }}>{u.status.toUpperCase()}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="grid-3">
                  {[
                    { title: 'Manage Users', desc: 'View, block, or delete user accounts', icon: Users, tab: 'users', color: '#7c5cf6' },
                    { title: 'Send Notification', desc: 'Broadcast messages to all or specific users', icon: Bell, tab: 'notifications', color: '#f59e0b' },
                    { title: 'View Logs', desc: 'Monitor all platform activity in real-time', icon: Activity, tab: 'logs', color: '#22d3ee' },
                  ].map(action => {
                    const Icon = action.icon
                    return (
                      <div
                        key={action.title}
                        className="card card-hover"
                        id={`admin-quick-${action.tab}`}
                        onClick={() => setTab(action.tab as Tab)}
                      >
                        <div style={{ width: 42, height: 42, borderRadius: 10, background: `${action.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                          <Icon size={20} color={action.color} />
                        </div>
                        <h4 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>{action.title}</h4>
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{action.desc}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* USERS TAB */}
            {tab === 'users' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      id="admin-user-search"
                      type="text"
                      placeholder="Search by email or name..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="form-input"
                      style={{ paddingLeft: 38 }}
                    />
                  </div>
                  <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{filteredUsers.length} users</span>
                </div>

                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Joined</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No users found</td>
                        </tr>
                      ) : filteredUsers.map(u => (
                        <tr key={u.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#7c5cf6,#4f8ef7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'white', flexShrink: 0 }}>
                                {(u.full_name || u.email).slice(0, 2).toUpperCase()}
                              </div>
                              <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 13.5 }}>{u.full_name !== '—' ? u.full_name : u.email.split('@')[0]}</span>
                            </div>
                          </td>
                          <td style={{ fontSize: 13 }}>{u.email}</td>
                          <td><span className={`pill ${u.role === 'admin' ? 'pill-purple' : 'pill-gray'}`}>{u.role.toUpperCase()}</span></td>
                          <td><span className={`pill ${u.status === 'active' ? 'pill-green' : 'pill-red'}`}>{u.status.toUpperCase()}</span></td>
                          <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</td>
                          <td>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button
                                id={`admin-block-${u.id}`}
                                className="btn btn-sm"
                                style={{
                                  background: u.status === 'active' ? 'rgba(245,158,11,0.15)' : 'rgba(52,211,153,0.15)',
                                  color: u.status === 'active' ? '#f59e0b' : '#34d399',
                                  border: `1px solid ${u.status === 'active' ? 'rgba(245,158,11,0.3)' : 'rgba(52,211,153,0.3)'}`,
                                }}
                                onClick={() => blockUser(u.id, u.status)}
                              >
                                {u.status === 'active' ? <><UserX size={12} /> Block</> : <><UserCheck size={12} /> Unblock</>}
                              </button>
                              <button
                                id={`admin-delete-${u.id}`}
                                className="btn btn-sm"
                                style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}
                                onClick={() => deleteUser(u.id)}
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* STORAGE TAB */}
            {tab === 'storage' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div className="grid-3">
                  {[
                    { label: 'Total Storage Used', value: `${storageStats.totalMB} MB`, sub: 'Across all users', color: '#7c5cf6', icon: HardDrive },
                    { label: 'Photos Stored', value: storageStats.totalPhotos, sub: 'Original + processed', color: '#4f8ef7', icon: Image },
                    { label: 'PDFs Generated', value: storageStats.totalPdfs, sub: 'Print-ready sheets', color: '#22d3ee', icon: FileText },
                  ].map(s => {
                    const Icon = s.icon
                    return (
                      <div key={s.label} className="stat-card">
                        <div className="stat-label">
                          <div style={{ width: 28, height: 28, borderRadius: 8, background: `${s.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Icon size={14} color={s.color} />
                          </div>
                          {s.label}
                        </div>
                        <div className="stat-value" style={{ fontSize: 28 }}>{s.value}</div>
                        <div className="stat-change">{s.sub}</div>
                      </div>
                    )
                  })}
                </div>

                <div className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Per-User Storage</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#34d399' }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399' }} />
                      LIVE
                    </div>
                  </div>
                  <table className="data-table">
                    <thead><tr><th>User</th><th>Email</th><th>Photos</th><th>Storage Used</th><th>Status</th></tr></thead>
                    <tbody>
                      {users.map((u: any) => (
                        <tr key={u.id}>
                          <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{u.full_name !== '—' ? u.full_name : u.email.split('@')[0]}</td>
                          <td style={{ fontSize: 13 }}>{u.email}</td>
                          <td style={{ color: 'var(--text-secondary)' }}>{u._photos ?? 0} files</td>
                          <td style={{ color: 'var(--text-secondary)' }}>{u._storage_used ? `${Math.round(u._storage_used / 1048576)} MB` : '0 MB'}</td>
                          <td><span className={`pill ${u.status === 'active' ? 'pill-green' : 'pill-red'}`}>{u.status.toUpperCase()}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* LOGS TAB */}
            {tab === 'logs' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Activity Logs</h3>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{logs.length} entries</span>
                  </div>
                  {logs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
                      <Activity size={48} style={{ margin: '0 auto 16px', display: 'block', opacity: 0.3 }} />
                      <p>No activity logs recorded yet.</p>
                    </div>
                  ) : (
                    <table className="data-table">
                      <thead><tr><th>Action</th><th>Description</th><th>File</th><th>Timestamp</th></tr></thead>
                      <tbody>
                        {logs.map(log => (
                          <tr key={log.id}>
                            <td>
                              <span className="pill pill-blue">{log.action?.toUpperCase()}</span>
                            </td>
                            <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{log.description ?? '—'}</td>
                            <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{log.file_name ?? '—'}</td>
                            <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{log.created_at ? new Date(log.created_at).toLocaleString() : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {/* NOTIFICATIONS TAB */}
            {tab === 'notifications' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20, alignItems: 'start' }}>
                {/* Sent Notifications List */}
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Sent Notifications</h3>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{notifications.length} total</span>
                  </div>
                  {notifications.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>No notifications sent yet.</div>
                  ) : (
                    notifications.map((n, i) => (
                      <div key={n.id} style={{ padding: '14px 20px', borderBottom: i < notifications.length - 1 ? '1px solid var(--border)' : 'none', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(124,92,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 16 }}>⚡</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{n.title}</div>
                          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>{n.message}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{n.created_at ? new Date(n.created_at).toLocaleString() : '—'}</div>
                        </div>
                        <button
                          id={`admin-delete-notif-${n.id}`}
                          className="icon-btn"
                          style={{ width: 28, height: 28, flexShrink: 0 }}
                          onClick={() => deleteNotification(n.id)}
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Send Notification Form */}
                <div className="card" style={{ position: 'sticky', top: 24 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent-purple-light)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 20 }}>
                    📢 Send Notification
                  </h3>

                  <div className="form-group">
                    <label className="form-label">Target</label>
                    <select
                      id="notif-target-select"
                      className="form-input"
                      value={notifTarget}
                      onChange={e => setNotifTarget(e.target.value)}
                    >
                      <option value="all">All Users</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>{u.email}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Title</label>
                    <input
                      id="notif-title-input"
                      className="form-input"
                      placeholder="System Update v2.1"
                      value={notifTitle}
                      onChange={e => setNotifTitle(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Message</label>
                    <textarea
                      id="notif-message-input"
                      className="form-input"
                      rows={4}
                      placeholder="Write your announcement or alert here..."
                      value={notifMessage}
                      onChange={e => setNotifMessage(e.target.value)}
                      style={{ resize: 'vertical' }}
                    />
                  </div>

                  <button
                    id="send-notif-btn"
                    className="btn btn-primary"
                    style={{ width: '100%' }}
                    onClick={sendNotification}
                    disabled={sendingNotif || !notifTitle || !notifMessage}
                  >
                    {sendingNotif ? <><RefreshCw size={14} className="animate-spin" /> Sending...</> : <><Send size={14} /> Send Notification</>}
                  </button>
                </div>
              </div>
            )}

            {/* PAYMENTS TAB */}
            {tab === 'payments' && <PaymentsTab />}

            {/* ANALYTICS TAB */}
            {tab === 'analytics' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div className="grid-4">
                  {[
                    { label: 'Total Users', value: animUsers, icon: Users, color: '#7c5cf6', change: 'Registered' },
                    { label: 'Photos Processed', value: animPhotos, icon: Image, color: '#4f8ef7', change: 'AI processed' },
                    { label: 'Sheets Created', value: animSheets, icon: Grid2x2, color: '#22d3ee', change: 'A4 sheets' },
                    { label: 'Conversion Rate', value: '73%', icon: TrendingUp, color: '#34d399', change: 'Upload to PDF' },
                  ].map(s => {
                    const Icon = s.icon
                    return (
                      <div key={s.label} className="stat-card">
                        <div className="stat-label">
                          <div style={{ width: 28, height: 28, borderRadius: 8, background: `${s.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Icon size={14} color={s.color} />
                          </div>
                          {s.label}
                          <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, color: '#34d399', fontWeight: 700 }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', display: 'inline-block', animation: 'pulse 2s infinite' }} />
                            LIVE
                          </span>
                        </div>
                        <div className="stat-value" style={{ fontSize: 28, transition: 'all 0.15s' }}>{s.value}</div>
                        <div className="stat-change">{s.change}</div>
                      </div>
                    )
                  })}
                </div>

                {/* Bar chart simulation */}
                <div className="card">
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 24 }}>Daily Usage — Last 7 Days</h3>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 160, padding: '0 8px' }}>
                    {chartData.map((d, i) => {
                      const maxVal = Math.max(10, ...chartData.flatMap(c => [c.sheets, c.photos]))
                      return (
                        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                          <div style={{ width: '100%', display: 'flex', gap: 3, alignItems: 'flex-end', height: 140 }}>
                            <div style={{
                              flex: 1, background: 'rgba(124,92,246,0.6)',
                              height: `${(d.sheets / maxVal) * 100}%`,
                              borderRadius: '3px 3px 0 0',
                              minHeight: 4,
                              transition: 'height 0.3s'
                            }}
                              title={`${d.sheets} sheets`}
                            />
                            <div style={{
                              flex: 1, background: 'rgba(79,142,247,0.6)',
                              height: `${(d.photos / maxVal) * 100}%`,
                              borderRadius: '3px 3px 0 0',
                              minHeight: 4,
                              transition: 'height 0.3s'
                            }}
                              title={`${d.photos} photos`}
                            />
                          </div>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{d.day}</span>
                        </div>
                      )
                    })}
                  </div>
                  <div style={{ display: 'flex', gap: 20, marginTop: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
                      <div style={{ width: 12, height: 12, borderRadius: 3, background: 'rgba(124,92,246,0.6)' }} />
                      Sheets Generated
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
                      <div style={{ width: 12, height: 12, borderRadius: 3, background: 'rgba(79,142,247,0.6)' }} />
                      Photos Processed
                    </div>
                  </div>
                </div>

                {/* KPIs */}
                <div className="grid-2">
                  <div className="card">
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>🎯 KPI Targets</h3>
                    {[
                      { label: 'DAU Target (50/day)', current: 38, target: 50, color: '#7c5cf6' },
                      { label: 'Sheets/Day Target (100)', current: 73, target: 100, color: '#4f8ef7' },
                      { label: 'Conversion Rate (60%)', current: 73, target: 100, color: '#34d399' },
                    ].map(kpi => (
                      <div key={kpi.label} style={{ marginBottom: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                          <span style={{ color: 'var(--text-secondary)' }}>{kpi.label}</span>
                          <span style={{ color: kpi.color, fontWeight: 700 }}>{kpi.current}/{kpi.target}</span>
                        </div>
                        <div className="progress-bar">
                          <div className="progress-fill" style={{ width: `${(kpi.current / kpi.target) * 100}%`, background: kpi.color }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="card">
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>📊 Platform Health</h3>
                    {[
                      { label: 'Uptime', value: '99.5%', icon: '✅' },
                      { label: 'Avg BG Removal Time', value: '3.2s', icon: '⚡' },
                      { label: 'Error Rate', value: '0.3%', icon: '🔴' },
                      { label: 'Active Sessions', value: '12', icon: '👥' },
                    ].map(metric => (
                      <div key={metric.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{metric.icon} {metric.label}</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{metric.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TOKEN CREATE TAB */}
            {tab === 'tokens' && (
              <TokenCreateTab />
            )}
          </>
        )}
      </main>
    </div>
  )
}
