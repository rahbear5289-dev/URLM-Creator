'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/DashboardLayout'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useCountUp } from '@/lib/useCountUp'
import {
  Camera, FileText, Grid2x2, HardDrive, Image, Lock, RefreshCw, Zap, ArrowUpRight, Upload, Sparkles, Scissors, CreditCard, CheckCircle
} from 'lucide-react'

const tools = [
  { title: 'My Photos', desc: 'High-resolution single or batch upload with AI enhancement.', icon: Upload, href: '/photos', color: '#7c5cf6' },
  { title: 'Create Sheet', desc: 'Generate standardized 4×6 or A4 sheets for passport photos.', icon: Grid2x2, href: '/create-sheet', color: '#8b5cf6' },
  { title: 'PVC Card', desc: 'Format ID cards specifically for PVC plastic printers.', icon: CreditCard, href: '/pvc-card', color: '#4f8ef7' },
  { title: 'PDF Converter', desc: 'Convert any existing sheet layouts into print-ready PDFs.', icon: FileText, href: '/pdf-converter', color: '#22d3ee' },
  { title: 'PDF Crop', desc: 'Surgically crop and extract specific sections from PDF documents.', icon: Scissors, color: '#ec4899', href: '/crop' },
]

interface Stats {
  photos: number
  sheets: number
  active: number
  total_items: number
}

interface ActivityItem {
  id: string
  action: string
  description: string
  file_name: string
  created_at: string
}

function timeAgo(dateStr: string) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000
  if (diff < 60) return `${Math.floor(diff)}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function DashboardPage() {
  const { user, isStorageFull, featureAccessMode, storageUsage } = useAuth()
  const router = useRouter()
  const isLocked = featureAccessMode === 'lock'
  const [stats, setStats] = useState<Stats>({ photos: 0, sheets: 0, active: 0, total_items: 0 })
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(new Date())

  const displayName = user?.user_metadata?.full_name?.split(' ')[0] ?? user?.email?.split('@')[0] ?? 'User'

  const handleToolClick = (href: string) => {
    if (isLocked && ['/photos', '/create-sheet', '/pvc-card', '/pdf-converter', '/crop'].includes(href)) {
      router.push('/token/create')
      return
    }
    router.push(href)
  }

  const loadData = async () => {
    if (!user) return
    setLoading(true)

    const [photosRes, sheetsRes, logsCountRes, logsRes] = await Promise.all([
      supabase.from('photos').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('sheets').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('activity_logs').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('activity_logs').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(6),
    ])

    const activeRes = await supabase.from('photos').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'processing')

    setStats({
      photos: photosRes.count ?? 0,
      sheets: sheetsRes.count ?? 0,
      active: activeRes.count ?? 0,
      total_items: (logsCountRes.count ?? 0) * 3
    })
    setActivity(logsRes.data ?? [])
    setLastRefresh(new Date())
    setLoading(false)
  }

  useEffect(() => {
    setTimeout(() => {
      loadData()
    }, 0)
    // Real-time subscription
    if (!user) return
    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'photos', filter: `user_id=eq.${user.id}` }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sheets', filter: `user_id=eq.${user.id}` }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_logs', filter: `user_id=eq.${user.id}` }, loadData)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const storagePct = storageUsage.percent.toFixed(2)
  const isStorageSmall = storageUsage.used > 0 && storageUsage.used < 1073741824
  const storageValue = isStorageSmall ? (storageUsage.used / 1048576).toFixed(1) : (storageUsage.used / 1073741824).toFixed(2)
  const storageUnit = isStorageSmall ? 'MB' : 'GB'
  const limitGB = (storageUsage.limit / 1073741824).toFixed(1)

  // Animated counters
  const animPhotos = useCountUp(stats.photos)
  const animSheets = useCountUp(stats.sheets)
  const animActive = useCountUp(stats.active)

  const statCards = [
    { label: 'Photos', value: loading ? '—' : animPhotos.toString(), change: 'Total uploaded', icon: Image, color: '#7c5cf6', live: true },
    { label: 'Sheets', value: loading ? '—' : animSheets.toString(), change: 'A4 sheets generated', icon: Grid2x2, color: '#4f8ef7', live: true },
    { label: 'Active', value: loading ? '—' : animActive.toString(), change: 'Processing now', icon: Zap, color: '#22d3ee', live: true },
    { label: 'Storage', value: `${storagePct}%`, change: `${storageValue} ${storageUnit} / ${limitGB} GB`, icon: CheckCircle, color: '#ec4899', live: false },
  ]

  const getActivityIcon = (action: string) => {
    if (action.includes('sheet')) return { icon: Grid2x2, color: '#7c5cf6' }
    if (action.includes('photo')) return { icon: Upload, color: '#4f8ef7' }
    if (action.includes('bg_removed')) return { icon: Sparkles, color: '#ec4899' }
    if (action.includes('pvc')) return { icon: CreditCard, color: '#10b981' }
    if (action.includes('pdf')) return { icon: FileText, color: '#f59e0b' }
    if (action.includes('ai')) return { icon: Sparkles, color: '#8b5cf6' }
    if (action.includes('crop')) return { icon: Scissors, color: '#ec4899' }
    return { icon: Camera, color: '#22d3ee' }
  }

  return (
    <DashboardLayout>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Welcome banner */}
          <div style={{
            background: 'linear-gradient(135deg, #141928 0%, #1a1f3a 50%, #141928 100%)',
            border: '1px solid var(--border)', borderRadius: 16, padding: '28px 32px', position: 'relative', overflow: 'hidden'
          }}>
            <div style={{ position: 'absolute', right: -20, top: -20, width: 200, height: 200, background: 'radial-gradient(circle, rgba(124, 92, 246, 0.15) 0%, transparent 70%)', borderRadius: '50%' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>
                  Welcome back, {displayName}!
                </h2>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24, maxWidth: 400 }}>
                  Your creative observatory is ready. {stats.active > 0 ? `${stats.active} photos are processing now.` : 'All systems running smoothly.'}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399' }} />
                LIVE · {loading ? 'Refreshing...' : `Updated ${timeAgo(lastRefresh.toISOString())}`}
                <button onClick={loadData} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
                  <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button 
                id="quick-start-btn" 
                className="btn btn-primary" 
                onClick={() => handleToolClick('/photos')}
                style={isLocked ? { opacity: 0.8, filter: 'grayscale(0.5)' } : {}}
              >
                {isLocked ? <Lock size={16} /> : <Camera size={16} />} 
                {isLocked ? 'LOCKED' : 'Quick Start'}
              </button>
              <button id="view-history-btn" className="btn btn-secondary" onClick={() => handleToolClick('/create-sheet')}>
                {isLocked && <Lock size={14} style={{ marginRight: 6 }} />}
                {isLocked ? 'LOCKED' : 'Create Sheet'}
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid-4">
            {statCards.map((stat) => {
              const Icon = stat.icon
              return (
                <div key={stat.label} className="stat-card">
                  <div className="stat-label">
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: `${stat.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={14} color={stat.color} />
                    </div>
                    {stat.label}
                    {stat.live && (
                      <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, color: '#34d399', fontWeight: 700 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', display: 'inline-block', animation: 'pulse 2s infinite' }} />
                        LIVE
                      </span>
                    )}
                  </div>
                  <div className="stat-value" style={{ transition: 'all 0.15s' }}>{stat.value}</div>
                  <div className="stat-change">{stat.change}</div>
                </div>
              )
            })}
          </div>

          {/* Creative Suite */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Creative Suite</h3>
            </div>
            <div className="grid-2">
              {tools.map((tool) => {
                const Icon = tool.icon
                const isToolLocked = isLocked && tool.href !== '/dashboard'
                return (
                  <div
                    key={tool.title}
                    className={`card ${isToolLocked ? '' : 'card-hover'}`}
                    id={`tool-${tool.title.toLowerCase().replace(/\s+/g, '-')}`}
                    onClick={() => handleToolClick(tool.href)}
                    style={{ position: 'relative', cursor: isToolLocked ? 'not-allowed' : 'pointer', opacity: isToolLocked ? 0.7 : 1 }}
                  >
                    <div style={{ position: 'absolute', top: 16, right: 16 }}>
                      {isToolLocked ? <Lock size={16} color="var(--accent-pink)" /> : <ArrowUpRight size={16} color="var(--text-muted)" />}
                    </div>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: isToolLocked ? 'rgba(236,72,153,0.1)' : `${tool.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                      <Icon size={20} color={isToolLocked ? 'var(--accent-pink)' : tool.color} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <h4 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{tool.title}</h4>
                      {isToolLocked && <span style={{ fontSize: 9, fontWeight: 700, color: 'white', background: 'var(--accent-pink)', padding: '1px 5px', borderRadius: 4 }}>LOCKED</span>}
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{isToolLocked ? 'Access suspended or storage limit reached. Please upgrade to continue.' : tool.desc}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Storage */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <HardDrive size={16} color="var(--accent-blue)" />
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Storage Usage</span>
              </div>
              <span className="pill pill-blue">CAPACITY</span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
              {storageValue} <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--text-secondary)' }}>{storageUnit}</span>
              <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)' }}> / {limitGB} GB</span>
            </div>
            <div className="progress-bar" style={{ margin: '12px 0' }}>
              <div className="progress-fill" style={{ width: `${storageUsage.used > 0 ? Math.max(1.5, storageUsage.percent) : 0}%` }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)' }}>
              <span>{storagePct}% Used • {stats.total_items} Items Processed</span>
              <span style={{ color: 'var(--text-muted)' }}>{limitGB} GB total</span>
            </div>
            
            <button 
              id="dashboard-upgrade-storage-btn" 
              className="btn btn-secondary btn-sm" 
              style={{ width: '100%', marginTop: 16, gap: 6, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}
              onClick={() => router.push('/upgrade')}
            >
              <Zap size={12} color="var(--accent-purple)" />
              Increase Storage Limit
            </button>
          </div>

          {/* Recent Activity (real-time) */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Recent Activity</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#34d399' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399' }} />
                LIVE
              </div>
            </div>
            {loading ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>Loading...</div>
            ) : activity.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
                No activity yet. Upload a photo to get started!
              </div>
            ) : (
              activity.map((item) => {
                const { icon: Icon, color } = getActivityIcon(item.action)
                return (
                  <div key={item.id} className="activity-item">
                    <div className="activity-icon" style={{ background: `${color}20` }}>
                      <Icon size={16} color={color} />
                    </div>
                    <div className="activity-text">
                      <div className="activity-title">{item.description || item.action}</div>
                      <div className="activity-sub">{item.file_name || '—'}</div>
                    </div>
                    <div className="activity-time">{timeAgo(item.created_at)}</div>
                  </div>
                )
              })
            )}
          </div>

          {/* Did you know */}
          <div className="card" style={{ background: 'rgba(124, 92, 246, 0.08)', borderColor: 'rgba(124, 92, 246, 0.25)' }}>
            <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent-purple-light)', marginBottom: 8 }}>💡 Did you know?</h4>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              You can use AI to automatically remove backgrounds and meet official government photo standards in one click.
            </p>
            <button id="try-bg-removal-btn" className="btn btn-sm"
              style={{ marginTop: 12, background: 'rgba(124, 92, 246, 0.2)', color: 'var(--accent-purple-light)', border: '1px solid rgba(124, 92, 246, 0.3)' }}
              onClick={() => router.push('/photos')}
            >
              Try background removal →
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
