'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/DashboardLayout'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useCountUp } from '@/lib/useCountUp'
import {
  Tag, Coins, Receipt, DollarSign, Calendar, MoreHorizontal,
  Info, Check, ChevronRight, HardDrive, RefreshCw,
  Camera, FileText, Grid2x2, Image as ImageIcon, Lock, Scissors,
  CreditCard, Sparkles, Upload, ArrowUpRight, ExternalLink,
  Activity, TrendingUp, Radio, PenTool
} from 'lucide-react'

type PeriodType = 'Daily' | 'Weekly' | 'Monthly'

interface ChartDataPoint {
  x: number
  limeY: number
  orangeY: number
  label: string
  subLabel: string
  val1: string
  val2: string
  delta: string
}

const analyticsData: Record<PeriodType, {
  limeAreaPath: string
  limeLinePath: string
  orangeLinePath: string
  xLabels: string[]
  points: ChartDataPoint[]
  peakIndex: number
}> = {
  Monthly: {
    limeAreaPath: "M 50 185 C 100 170, 160 185, 230 145 C 270 120, 290 85, 330 115 C 380 150, 420 50, 470 55 C 520 60, 560 135, 600 120 C 640 105, 670 140, 700 130 L 700 220 L 50 220 Z",
    limeLinePath: "M 50 185 C 100 170, 160 185, 230 145 C 270 120, 290 85, 330 115 C 380 150, 420 50, 470 55 C 520 60, 560 135, 600 120 C 640 105, 670 140, 700 130",
    orangeLinePath: "M 50 145 C 90 145, 140 180, 190 160 C 240 140, 260 70, 310 85 C 360 100, 400 180, 460 180 C 520 180, 570 110, 620 155 C 660 190, 680 170, 700 165",
    xLabels: ['1', '5', '10', '15', '20', '25', '30'],
    peakIndex: 3,
    points: [
      { x: 50, limeY: 185, orangeY: 145, label: 'May 1', subLabel: 'Start of Month', val1: '142,500,000', val2: '165,200,000', delta: '-8.2%' },
      { x: 140, limeY: 175, orangeY: 170, label: 'May 5', subLabel: 'First Week', val1: '158,210,000', val2: '152,400,000', delta: '+3.8%' },
      { x: 220, limeY: 148, orangeY: 152, label: 'May 10', subLabel: 'Mid-Spring Peak', val1: '185,900,000', val2: '162,100,000', delta: '+14.6%' },
      { x: 300, limeY: 110, orangeY: 90, label: 'May 15', subLabel: 'This Month', val1: '220,342,123', val2: '178,920,000', delta: '+23.1%' },
      { x: 420, limeY: 75, orangeY: 175, label: 'May 20', subLabel: 'Quarterly Campaign', val1: '246,800,000', val2: '148,300,000', delta: '+39.4%' },
      { x: 540, limeY: 125, orangeY: 130, label: 'May 25', subLabel: 'Late Sprint', val1: '198,400,000', val2: '172,600,000', delta: '+14.9%' },
      { x: 680, limeY: 130, orangeY: 165, label: 'May 30', subLabel: 'Month Close', val1: '192,100,000', val2: '160,500,000', delta: '+19.6%' }
    ]
  },
  Weekly: {
    limeAreaPath: "M 50 160 C 120 180, 180 130, 240 120 C 300 110, 360 140, 420 85 C 480 50, 540 90, 600 70 C 640 60, 670 80, 700 75 L 700 220 L 50 220 Z",
    limeLinePath: "M 50 160 C 120 180, 180 130, 240 120 C 300 110, 360 140, 420 85 C 480 50, 540 90, 600 70 C 640 60, 670 80, 700 75",
    orangeLinePath: "M 50 120 C 110 130, 170 160, 230 150 C 310 140, 370 170, 430 140 C 490 120, 550 150, 610 120 C 650 100, 680 110, 700 105",
    xLabels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    peakIndex: 4,
    points: [
      { x: 50, limeY: 160, orangeY: 120, label: 'Mon', subLabel: 'Week Opening', val1: '32,100,000', val2: '38,400,000', delta: '-16.4%' },
      { x: 158, limeY: 155, orangeY: 145, label: 'Tue', subLabel: 'Regular Flow', val1: '36,400,000', val2: '34,200,000', delta: '+6.4%' },
      { x: 266, limeY: 118, orangeY: 146, label: 'Wed', subLabel: 'Mid-Week Uptick', val1: '42,800,000', val2: '35,600,000', delta: '+20.2%' },
      { x: 375, limeY: 125, orangeY: 155, label: 'Thu', subLabel: 'Corporate Orders', val1: '40,200,000', val2: '33,900,000', delta: '+18.5%' },
      { x: 483, limeY: 60, orangeY: 125, label: 'Fri', subLabel: 'Peak Friday', val1: '58,400,000', val2: '39,100,000', delta: '+49.3%' },
      { x: 591, limeY: 72, orangeY: 122, label: 'Sat', subLabel: 'Weekend Volume', val1: '54,200,000', val2: '38,000,000', delta: '+42.6%' },
      { x: 700, limeY: 75, orangeY: 105, label: 'Sun', subLabel: 'Week Wrap', val1: '52,800,000', val2: '41,500,000', delta: '+27.2%' }
    ]
  },
  Daily: {
    limeAreaPath: "M 50 190 C 110 195, 170 170, 230 150 C 290 130, 350 70, 410 65 C 470 60, 530 110, 590 100 C 640 90, 680 120, 700 115 L 700 220 L 50 220 Z",
    limeLinePath: "M 50 190 C 110 195, 170 170, 230 150 C 290 130, 350 70, 410 65 C 470 60, 530 110, 590 100 C 640 90, 680 120, 700 115",
    orangeLinePath: "M 50 160 C 110 170, 170 185, 230 180 C 290 175, 350 130, 410 120 C 470 110, 530 150, 590 145 C 640 140, 680 160, 700 155",
    xLabels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '23:59'],
    peakIndex: 4,
    points: [
      { x: 50, limeY: 190, orangeY: 160, label: '00:00', subLabel: 'Overnight', val1: '1,200,000', val2: '1,800,000', delta: '-33.3%' },
      { x: 158, limeY: 182, orangeY: 178, label: '04:00', subLabel: 'Early Quiet', val1: '1,500,000', val2: '1,600,000', delta: '-6.2%' },
      { x: 266, limeY: 140, orangeY: 176, label: '08:00', subLabel: 'Morning Rush', val1: '5,400,000', val2: '3,800,000', delta: '+42.1%' },
      { x: 375, limeY: 80, orangeY: 125, label: '12:00', subLabel: 'Lunch Spike', val1: '8,900,000', val2: '5,900,000', delta: '+50.8%' },
      { x: 483, limeY: 65, orangeY: 115, label: '16:00', subLabel: 'Afternoon Peak', val1: '9,840,000', val2: '6,200,000', delta: '+58.7%' },
      { x: 591, limeY: 100, orangeY: 145, label: '20:00', subLabel: 'Evening Traffic', val1: '7,200,000', val2: '5,100,000', delta: '+41.1%' },
      { x: 700, limeY: 115, orangeY: 155, label: '23:59', subLabel: 'Daily Close', val1: '6,400,000', val2: '4,900,000', delta: '+30.6%' }
    ]
  }
}

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

const creativeTools = [
  { title: 'My Photos', desc: 'AI enhancement & batch uploads', icon: Upload, href: '/photos', color: '#10b981' },
  { title: 'Create Sheet', desc: 'Passport sheets 4×6 & A4', icon: Grid2x2, href: '/create-sheet', color: '#84cc16' },
  { title: 'PVC Card', desc: 'Custom PVC ID card templates', icon: CreditCard, href: '/pvc-card', color: '#3b82f6' },
  { title: 'PDF Converter', desc: 'High-res print-ready PDFs', icon: FileText, href: '/pdf-converter', color: '#06b6d4' },
  { title: 'PDF Editor', desc: 'In-line text editing on canvas', icon: PenTool, href: '/pdf-editor', color: '#8b5cf6' },
  { title: 'PDF Crop', desc: 'Precision crop for certificates', icon: Scissors, href: '/crop', color: '#ec4899' },
]

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
  const [selectedMonth, setSelectedMonth] = useState('March 2025')
  const [selectedOrders, setSelectedOrders] = useState<Record<string, boolean>>({ '1': true })
  
  // Real Analytics Interactive State
  const [analyticsPeriod, setAnalyticsPeriod] = useState<PeriodType>('Monthly')
  const [chartKey, setChartKey] = useState(0)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  // Total Visitor Speedometer State
  const [visitorSource, setVisitorSource] = useState<'total' | 'website' | 'facebook' | 'instagram'>('total')
  const visitorMap = {
    total: { percent: 70, label: 'Total Visitor' },
    website: { percent: 35, label: 'Website' },
    facebook: { percent: 35, label: 'Facebook' },
    instagram: { percent: 15, label: 'Instagram' }
  }
  const animatedVisitorPercent = useCountUp(visitorMap[visitorSource].percent, 700)
  const animatedWebsiteCount = useCountUp(35, 700)
  const animatedFbCount = useCountUp(35, 700)
  const animatedInstaCount = useCountUp(15, 700)

  // Total Performance Donut State
  const [hoveredPerfIndex, setHoveredPerfIndex] = useState<number | null>(null)
  const perfSegments = [
    { id: 0, label: 'Affiliate Program', percent: 55, color: '#0d3826', dasharray: '131 239', dashoffset: '0' },
    { id: 1, label: 'Absence', percent: 35, color: '#84cc16', dasharray: '83 239', dashoffset: '-137' },
    { id: 2, label: 'Direct Buy', percent: 15, color: '#f97316', dasharray: '36 239', dashoffset: '-225' },
    { id: 3, label: 'Ambassador', percent: 9, color: '#eab308', dasharray: '21 239', dashoffset: '-265' }
  ]
  const animatedAffiliateCount = useCountUp(55, 700)
  const animatedAbsenceCount = useCountUp(35, 700)
  const animatedDirectCount = useCountUp(15, 700)
  const animatedAmbassadorCount = useCountUp(9, 700)

  const handlePeriodChange = (p: PeriodType) => {
    setAnalyticsPeriod(p)
    setHoverIndex(null)
    setChartKey(prev => prev + 1)
  }

  const displayName = user?.user_metadata?.full_name?.split(' ')[0] ?? user?.email?.split('@')[0] ?? 'User'

  const handleToolClick = (href: string) => {
    if (isLocked && ['/photos', '/create-sheet', '/pvc-card', '/pdf-converter', '/pdf-editor', '/crop'].includes(href)) {
      router.push('/token/create')
      return
    }
    router.push(href)
  }

  const loadData = async () => {
    if (!user) return
    setLoading(true)

    try {
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
    } catch (err) {
      console.error('Error loading dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
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

  // Count-up animations
  const animPhotos = useCountUp(stats.photos)
  const animSheets = useCountUp(stats.sheets)
  const animActive = useCountUp(stats.active)

  // Storage info
  const storagePct = storageUsage.percent.toFixed(1)
  const isStorageSmall = storageUsage.used > 0 && storageUsage.used < 1073741824
  const storageValue = isStorageSmall ? (storageUsage.used / 1048576).toFixed(1) : (storageUsage.used / 1073741824).toFixed(2)
  const storageUnit = isStorageSmall ? 'MB' : 'GB'
  const limitGB = (storageUsage.limit / 1073741824).toFixed(1)

  const toggleSelectOrder = (id: string) => {
    setSelectedOrders(prev => ({ ...prev, [id]: !prev[id] }))
  }

  // Sample or real items for the recent orders table
  const sampleOrders = [
    {
      id: '1',
      orderNumber: '#212884',
      productName: 'Hockey backpack',
      productSub: '1 item',
      image: '/rayhbear.jpg',
      date: 'Jan 31, 2025',
      price: '$56.00',
      status: 'On Progress',
      badgeClass: 'badge-on-progress'
    },
    {
      id: '2',
      orderNumber: '#222348',
      productName: 'Sports Shoe',
      productSub: '2 item',
      image: '/rayhbear.jpg',
      date: 'Feb 11, 2025',
      price: '$145.00',
      status: 'Pending',
      badgeClass: 'badge-pending'
    },
    {
      id: '3',
      orderNumber: '#224891',
      productName: 'Passport Sheet Standard',
      productSub: '8 Photos • A4',
      image: '/rayhbear.jpg',
      date: 'Feb 14, 2025',
      price: '$32.00',
      status: 'Completed',
      badgeClass: 'badge-completed'
    },
    {
      id: '4',
      orderNumber: '#225102',
      productName: 'PVC Badge ID Card',
      productSub: 'Double-sided',
      image: '/rayhbear.jpg',
      date: 'Feb 18, 2025',
      price: '$89.00',
      status: 'On Progress',
      badgeClass: 'badge-on-progress'
    }
  ]

  return (
    <DashboardLayout>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 330px', gap: 24, alignItems: 'start' }}>
        
        {/* Left / Main Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* Top 4 Stat Cards Row (matching reference image) */}
          <div className="grid-4">
            
            {/* Card 1: Total Sales (Dark Forest Green Hero Card) */}
            <div className="stat-card stat-card-hero">
              <div className="stat-label">
                <span>Total Sales</span>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#a3e635'
                }}>
                  <Tag size={16} />
                </div>
              </div>
              <div className="stat-value">
                {stats.photos > 0 ? `$${(564 + stats.photos * 12).toFixed(2)}` : '$564.00'}
              </div>
              <div className="stat-change">
                <span className="stat-badge-lime">
                  + 15% from last month
                </span>
              </div>
            </div>

            {/* Card 2: Profit */}
            <div className="stat-card">
              <div className="stat-label">
                <span>Profit</span>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: '#0d2219',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#84cc16'
                }}>
                  <Coins size={16} />
                </div>
              </div>
              <div className="stat-value">
                {stats.sheets > 0 ? `${Math.min(95, 45 + stats.sheets * 3)}%` : '45%'}
              </div>
              <div className="stat-change">
                <span className="stat-badge-red">
                  - 15% <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>from last month</span>
                </span>
              </div>
            </div>

            {/* Card 3: Invoice */}
            <div className="stat-card">
              <div className="stat-label">
                <span>Invoice</span>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: 'rgba(16, 185, 129, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#10b981'
                }}>
                  <Receipt size={16} />
                </div>
              </div>
              <div className="stat-value">
                {loading ? '—' : stats.active > 0 ? (1.673 + stats.active).toFixed(3) : '1.673'}
              </div>
              <div className="stat-change">
                <span className="stat-badge-green">
                  + 21% <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>from last month</span>
                </span>
              </div>
            </div>

            {/* Card 4: Revenue */}
            <div className="stat-card">
              <div className="stat-label">
                <span>Revenue</span>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: '#0d2219',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#84cc16'
                }}>
                  <DollarSign size={16} />
                </div>
              </div>
              <div className="stat-value">
                $655.70
              </div>
              <div className="stat-change">
                <span className="stat-badge-green">
                  + 11% <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>from last month</span>
                </span>
              </div>
            </div>

          </div>

          {/* Sales Analytics Area Chart Card (Real Analytics Wave & Live Interactive Scrubber) */}
          <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
            {/* Header row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  Sales Analytics
                </h3>
                {/* Real-time live pulse badge */}
                <div className="live-pulse-badge">
                  <span className="live-pulse-dot" />
                  <span>Live Stream</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                {/* Period switcher tabs */}
                <div style={{
                  display: 'flex',
                  background: 'var(--bg-primary)',
                  padding: 3,
                  borderRadius: 9999,
                  border: '1px solid var(--border)'
                }}>
                  {(['Daily', 'Weekly', 'Monthly'] as PeriodType[]).map((p) => {
                    const isActive = analyticsPeriod === p
                    return (
                      <button
                        key={p}
                        onClick={() => handlePeriodChange(p)}
                        style={{
                          background: isActive ? '#84cc16' : 'transparent',
                          color: isActive ? '#0d2219' : 'var(--text-muted)',
                          border: 'none',
                          borderRadius: 9999,
                          padding: '4px 12px',
                          fontSize: 11.5,
                          fontWeight: isActive ? 700 : 500,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {p}
                      </button>
                    )
                  })}
                </div>

                <button className="pill-btn" id="chart-month-btn">
                  <span>{selectedMonth}</span>
                  <Calendar size={13} />
                </button>

                <button className="icon-btn" style={{ width: 32, height: 32 }} title="Options">
                  <MoreHorizontal size={16} />
                </button>
              </div>
            </div>

            {/* SVG Chart Graphic matching image */}
            {(() => {
              const curDataset = analyticsData[analyticsPeriod]
              const curIndex = hoverIndex !== null ? hoverIndex : curDataset.peakIndex
              const activePt = curDataset.points[curIndex] || curDataset.points[curDataset.peakIndex]
              const tooltipPercent = (activePt.x / 700) * 100

              return (
                <div 
                  style={{ position: 'relative', width: '100%', height: 260, marginTop: 10, userSelect: 'none' }}
                  onMouseMove={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect()
                    const mouseRelX = ((e.clientX - rect.left) / rect.width) * 700
                    // Find closest point
                    let closestIdx = 0
                    let minDiff = Infinity
                    curDataset.points.forEach((pt, idx) => {
                      const diff = Math.abs(pt.x - mouseRelX)
                      if (diff < minDiff) {
                        minDiff = diff
                        closestIdx = idx
                      }
                    })
                    setHoverIndex(closestIdx)
                  }}
                  onMouseLeave={() => setHoverIndex(null)}
                >
                  {/* Floating Tooltip Card on active point */}
                  <div 
                    className="chart-tooltip-box"
                    style={{
                      position: 'absolute',
                      top: Math.max(12, activePt.limeY - 60),
                      left: `clamp(75px, ${tooltipPercent}%, calc(100% - 75px))`,
                      transform: 'translateX(-50%)',
                      zIndex: 15,
                      pointerEvents: 'none',
                      minWidth: 140,
                      backdropFilter: 'blur(8px)',
                      border: '1px solid rgba(132, 204, 22, 0.4)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{activePt.subLabel}</span>
                      <span style={{ fontSize: 9.5, fontWeight: 700, color: activePt.delta.startsWith('+') ? '#84cc16' : '#f97316' }}>
                        {activePt.delta}
                      </span>
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
                      ${activePt.val1}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>
                      <span>{activePt.label}</span>
                      <span style={{ opacity: 0.8 }}>Prev: ${activePt.val2}</span>
                    </div>
                  </div>

                  <svg 
                    key={chartKey}
                    viewBox="0 0 700 240" 
                    style={{ width: '100%', height: '100%', overflow: 'visible' }}
                    preserveAspectRatio="none"
                  >
                    <defs>
                      {/* Neon lime green gradient fill */}
                      <linearGradient id="limeGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#84cc16" stopOpacity="0.55" />
                        <stop offset="50%" stopColor="#84cc16" stopOpacity="0.22" />
                        <stop offset="100%" stopColor="#84cc16" stopOpacity="0.0" />
                      </linearGradient>

                      {/* Horizontal grid line subtle styling */}
                      <pattern id="gridLines" width="700" height="55" patternUnits="userSpaceOnUse">
                        <line x1="0" y1="0" x2="700" y2="0" stroke="var(--border)" strokeWidth="0.8" strokeDasharray="3 3" opacity="0.6" />
                      </pattern>
                    </defs>

                    {/* Y-Axis Grid Lines */}
                    <rect width="700" height="220" fill="url(#gridLines)" opacity="0.7" />

                    {/* Y-Axis Labels */}
                    <text x="-4" y="25" fill="var(--text-muted)" fontSize="11" fontWeight="600" textAnchor="start">260M</text>
                    <text x="-4" y="80" fill="var(--text-muted)" fontSize="11" fontWeight="600" textAnchor="start">220M</text>
                    <text x="-4" y="135" fill="var(--text-muted)" fontSize="11" fontWeight="600" textAnchor="start">180M</text>
                    <text x="-4" y="190" fill="var(--text-muted)" fontSize="11" fontWeight="600" textAnchor="start">140M</text>

                    {/* Lime Green Area Wave (Animated rise) */}
                    <path
                      d={curDataset.limeAreaPath}
                      fill="url(#limeGradient)"
                      className="chart-area-fill"
                    />

                    {/* Lime Green Stroke Wave (Animated Draw) */}
                    <path
                      d={curDataset.limeLinePath}
                      fill="none"
                      stroke="#84cc16"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      className="chart-wave-primary"
                    />

                    {/* Orange / Amber Secondary Wave (Animated Draw) */}
                    <path
                      d={curDataset.orangeLinePath}
                      fill="none"
                      stroke="#f97316"
                      strokeWidth="2.8"
                      strokeLinecap="round"
                      className="chart-wave-secondary"
                    />

                    {/* Interactive Vertical Crosshair Line on Active Point */}
                    <line 
                      x1={activePt.x} 
                      y1="35" 
                      x2={activePt.x} 
                      y2="220" 
                      stroke="#84cc16" 
                      strokeWidth="1.5" 
                      strokeDasharray="4 4" 
                      opacity="0.85"
                      style={{ transition: 'x1 0.15s ease-out, x2 0.15s ease-out' }}
                    />

                    {/* Interactive Glowing Dot on Lime Peak */}
                    <circle 
                      cx={activePt.x} 
                      cy={activePt.limeY} 
                      r="9" 
                      fill="#84cc16" 
                      opacity="0.35" 
                      style={{ transition: 'all 0.15s ease-out' }}
                    />
                    <circle 
                      cx={activePt.x} 
                      cy={activePt.limeY} 
                      r="5" 
                      fill="#84cc16" 
                      stroke="#ffffff" 
                      strokeWidth="2" 
                      style={{ transition: 'all 0.15s ease-out' }}
                    />

                    {/* Glowing Dot on Orange Comparison Curve */}
                    <circle 
                      cx={activePt.x} 
                      cy={activePt.orangeY} 
                      r="4.5" 
                      fill="#f97316" 
                      stroke="#ffffff" 
                      strokeWidth="1.5" 
                      style={{ transition: 'all 0.15s ease-out' }}
                    />

                    {/* X-Axis Labels */}
                    {curDataset.xLabels.map((lbl, i) => {
                      const pt = curDataset.points[i]
                      const isLblActive = i === curIndex
                      return (
                        <text
                          key={lbl}
                          x={pt ? pt.x : 50 + i * 100}
                          y="235"
                          fill={isLblActive ? '#84cc16' : 'var(--text-muted)'}
                          fontWeight={isLblActive ? '700' : '400'}
                          fontSize="11"
                          textAnchor="middle"
                          style={{ transition: 'all 0.15s' }}
                        >
                          {lbl}
                        </text>
                      )
                    })}
                  </svg>
                </div>
              )
            })()}
          </div>

          {/* Recent Order Table Card (matching reference image) */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>
                Recent Order
              </h3>
              <button 
                className="pill-btn" 
                id="view-all-orders-btn"
                onClick={() => router.push('/photos')}
              >
                View all
              </button>
            </div>

            <div className="order-table-container">
              <table className="order-table">
                <thead>
                  <tr>
                    <th style={{ width: 44 }}>
                      <input 
                        type="checkbox" 
                        style={{ accentColor: '#0d2219', width: 16, height: 16, cursor: 'pointer', borderRadius: 4 }}
                        checked={Object.values(selectedOrders).some(Boolean)}
                        onChange={() => {
                          const allChecked = Object.values(selectedOrders).every(Boolean)
                          setSelectedOrders({ '1': !allChecked, '2': !allChecked, '3': !allChecked, '4': !allChecked })
                        }}
                      />
                    </th>
                    <th>#</th>
                    <th>New Order</th>
                    <th>Product</th>
                    <th>Date</th>
                    <th>Price</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sampleOrders.map((order, idx) => {
                    const isChecked = !!selectedOrders[order.id]
                    return (
                      <tr key={order.id}>
                        <td>
                          <input 
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelectOrder(order.id)}
                            style={{ accentColor: '#0d2219', width: 16, height: 16, cursor: 'pointer' }}
                          />
                        </td>
                        <td style={{ fontWeight: 700, color: 'var(--text-muted)' }}>
                          {idx + 1}
                        </td>
                        <td style={{ fontWeight: 600 }}>
                          {order.orderNumber}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{
                              width: 38,
                              height: 38,
                              borderRadius: 8,
                              background: 'var(--bg-primary)',
                              border: '1px solid var(--border)',
                              overflow: 'hidden',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={order.image} alt={order.productName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{order.productName}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{order.productSub}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ color: 'var(--text-secondary)' }}>
                          {order.date}
                        </td>
                        <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                          {order.price}
                        </td>
                        <td>
                          <span className={`badge-pill ${order.badgeClass}`}>
                            {order.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button 
                            className="icon-btn" 
                            style={{ width: 30, height: 30, display: 'inline-flex' }}
                            onClick={() => router.push('/photos')}
                          >
                            <MoreHorizontal size={14} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Creative Suite Quick Tools Dock (Preserves all functionality) */}
          <div className="card" style={{ background: 'var(--bg-primary)', border: '1px dashed var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles size={16} color="#84cc16" />
                <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Creative Studio Quick Launch</h4>
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Instant Access</span>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              {creativeTools.map(tool => {
                const Icon = tool.icon
                const isToolLocked = isLocked
                return (
                  <button
                    key={tool.title}
                    onClick={() => handleToolClick(tool.href)}
                    className="card-hover"
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      borderRadius: 14,
                      padding: '12px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      textAlign: 'left',
                      cursor: isToolLocked ? 'not-allowed' : 'pointer',
                      opacity: isToolLocked ? 0.7 : 1
                    }}
                  >
                    <div style={{
                      width: 34,
                      height: 34,
                      borderRadius: 8,
                      background: `${tool.color}15`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: tool.color,
                      flexShrink: 0
                    }}>
                      <Icon size={16} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span>{tool.title}</span>
                        {isToolLocked && <Lock size={12} color="#ec4899" />}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {tool.desc}
                      </div>
                    </div>
                    <ChevronRight size={14} color="var(--text-muted)" />
                  </button>
                )
              })}
            </div>
          </div>

        </div>

        {/* Right Section (matching reference image) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* 1. Total Performance Card (Animated Donut Chart matching Image 2) */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                Total Performance
              </h3>
              <button className="icon-btn" style={{ width: 28, height: 28 }}>
                <MoreHorizontal size={14} />
              </button>
            </div>

            {/* Segmented Donut Chart SVG with animated slices and center stat */}
            <div style={{ display: 'flex', justifyContent: 'center', margin: '14px 0', position: 'relative' }}>
              <svg width="150" height="150" viewBox="0 0 100 100" className="donut-spin-container">
                {/* Background Ring */}
                <circle cx="50" cy="50" r="38" fill="transparent" stroke="var(--border)" strokeWidth="11" opacity="0.3" />

                {perfSegments.map((seg, idx) => {
                  const isHovered = hoveredPerfIndex === idx
                  const isAnyHovered = hoveredPerfIndex !== null
                  return (
                    <circle 
                      key={seg.id}
                      cx="50" 
                      cy="50" 
                      r="38" 
                      fill="transparent" 
                      stroke={seg.color} 
                      strokeWidth={isHovered ? 14 : 11}
                      strokeDasharray={seg.dasharray}
                      strokeDashoffset={seg.dashoffset}
                      strokeLinecap="round"
                      className="donut-slice-interactive"
                      style={{
                        opacity: isAnyHovered && !isHovered ? 0.38 : 1,
                        filter: isHovered ? `drop-shadow(0 0 8px ${seg.color})` : undefined
                      }}
                      onMouseEnter={() => setHoveredPerfIndex(idx)}
                      onMouseLeave={() => setHoveredPerfIndex(null)}
                    />
                  )
                })}
              </svg>

              {/* Center Stat inside Donut */}
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                pointerEvents: 'none'
              }}>
                {hoveredPerfIndex !== null ? (
                  <>
                    <div style={{ fontSize: 9.5, color: 'var(--text-muted)', lineHeight: 1.1 }}>
                      {perfSegments[hoveredPerfIndex].label.split(' ')[0]}
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: perfSegments[hoveredPerfIndex].color, letterSpacing: -0.5 }}>
                      {perfSegments[hoveredPerfIndex].percent}%
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 9.5, color: 'var(--text-muted)', lineHeight: 1.1 }}>Total</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: -0.5 }}>100%</div>
                  </>
                )}
              </div>
            </div>

            {/* Breakdown List with animated counts & hover sync */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
              {[
                { label: 'Affiliate Program', color: '#0d3826', count: animatedAffiliateCount, idx: 0 },
                { label: 'Absence', color: '#84cc16', count: animatedAbsenceCount, idx: 1 },
                { label: 'Direct Buy', color: '#f97316', count: animatedDirectCount, idx: 2 },
                { label: 'Ambassador', color: '#eab308', count: animatedAmbassadorCount, idx: 3 }
              ].map(item => {
                const isItemHovered = hoveredPerfIndex === item.idx
                return (
                  <div 
                    key={item.label}
                    onMouseEnter={() => setHoveredPerfIndex(item.idx)}
                    onMouseLeave={() => setHoveredPerfIndex(null)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: 13,
                      padding: '4px 8px',
                      borderRadius: 8,
                      background: isItemHovered ? 'var(--bg-card-hover)' : 'transparent',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: item.color,
                        boxShadow: isItemHovered ? `0 0 6px ${item.color}` : 'none'
                      }} />
                      <span style={{ color: isItemHovered ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: isItemHovered ? 600 : 400 }}>
                        {item.label}
                      </span>
                    </div>
                    <span style={{ fontWeight: 700, color: item.color }}>{item.count}%</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 2. Total Visitor Card (Speedometer / Semi-circle Gauge matching Image 1) */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                Total Visitor
              </h3>
              <button 
                className="icon-btn" 
                style={{ width: 28, height: 28 }}
                onClick={() => setVisitorSource('total')}
                title="Reset to 70% total"
              >
                <MoreHorizontal size={14} />
              </button>
            </div>

            {/* Semi-Circle Gauge SVG with animated needle & big percentage text */}
            <div style={{ position: 'relative', width: '100%', height: 115, display: 'flex', justifyContent: 'center', alignItems: 'flex-end', marginBottom: 10 }}>
              <svg width="190" height="100" viewBox="0 0 190 100">
                {/* Background track arc */}
                <path
                  d="M 25 88 A 70 70 0 0 1 165 88"
                  fill="none"
                  stroke="var(--border)"
                  strokeWidth="13"
                  strokeLinecap="round"
                  opacity="0.5"
                />

                {/* Dark Forest Green Progress Arc (animated dash) */}
                <path
                  d="M 25 88 A 70 70 0 0 1 165 88"
                  fill="none"
                  stroke="#0d3826"
                  strokeWidth="13"
                  strokeLinecap="round"
                  strokeDasharray="220"
                  strokeDashoffset={220 - (220 * (Math.min(70, animatedVisitorPercent) / 100))}
                  className="gauge-arc-anim"
                  style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
                />

                {/* Lime green highlight segment on the arc (around 70%) */}
                <path
                  d="M 130 52 A 70 70 0 0 1 150 40"
                  fill="none"
                  stroke="#84cc16"
                  strokeWidth="13"
                  strokeLinecap="round"
                  style={{ opacity: animatedVisitorPercent >= 60 ? 1 : 0.4, transition: 'opacity 0.3s ease' }}
                />

                {/* Animated Needle Pointer with rounded lime capsule tip */}
                {(() => {
                  // Needle angle: -90deg is 0% (left), 0deg is 50% (top), +36deg is 70%, +90deg is 100% (right)
                  const needleAngle = -90 + (animatedVisitorPercent / 100) * 180
                  return (
                    <g
                      style={{
                        transform: `rotate(${needleAngle}deg)`,
                        transformOrigin: '95px 88px',
                        transition: 'transform 0.75s cubic-bezier(0.34, 1.56, 0.64, 1)'
                      }}
                    >
                      {/* Needle Line */}
                      <line 
                        x1="95" 
                        y1="88" 
                        x2="95" 
                        y2="28" 
                        stroke="#84cc16" 
                        strokeWidth="2.8" 
                        strokeLinecap="round" 
                      />
                      {/* Rounded Lime Marker Pill on Needle Head */}
                      <rect 
                        x="90.5" 
                        y="12" 
                        width="9" 
                        height="18" 
                        rx="4.5" 
                        fill="#84cc16" 
                        style={{ filter: 'drop-shadow(0 0 4px rgba(132, 204, 22, 0.6))' }}
                      />
                      {/* Pivot Center Dots */}
                      <circle cx="95" cy="88" r="5" fill="#0d2219" />
                      <circle cx="95" cy="88" r="2.2" fill="#84cc16" />
                    </g>
                  )
                })()}
              </svg>

              {/* Big Percentage Number matching Image 1 */}
              <div style={{ position: 'absolute', bottom: 6, right: 28, textAlign: 'right' }}>
                <span style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: -1 }}>
                  {animatedVisitorPercent}%
                </span>
              </div>
            </div>

            {/* Breakdown with interactive hover/click sync */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
              {[
                { id: 'website' as const, label: 'Website', color: '#0d3826', count: animatedWebsiteCount },
                { id: 'facebook' as const, label: 'Facebook', color: '#84cc16', count: animatedFbCount },
                { id: 'instagram' as const, label: 'Instagram', color: '#f97316', count: animatedInstaCount },
              ].map(item => {
                const isSelected = visitorSource === item.id
                return (
                  <div 
                    key={item.id}
                    onClick={() => setVisitorSource(visitorSource === item.id ? 'total' : item.id)}
                    onMouseEnter={() => setVisitorSource(item.id)}
                    onMouseLeave={() => setVisitorSource('total')}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: 13,
                      padding: '4px 8px',
                      borderRadius: 8,
                      background: isSelected ? 'var(--bg-card-hover)' : 'transparent',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    title={`View ${item.label} (${item.count}%) on gauge`}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: item.color,
                        boxShadow: isSelected ? `0 0 6px ${item.color}` : 'none'
                      }} />
                      <span style={{ color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: isSelected ? 600 : 400 }}>
                        {item.label}
                      </span>
                    </div>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{item.count}%</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 3. Recent Activity Card (Real-time Supabase Data + UI matching image) */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                Recent Activity
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#84cc16' }} />
                <button className="icon-btn" style={{ width: 26, height: 26 }} onClick={loadData} title="Refresh activity">
                  <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 12 }}>
              Today
            </div>

            {/* Static sample matching reference image */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
              <div style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #10b981, #84cc16)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0d2219',
                fontWeight: 700,
                fontSize: 12,
                flexShrink: 0
              }}>
                JS
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                  Jamie Smith updated account set...
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  Just now
                </div>
              </div>
            </div>

            {/* Live Supabase Activity Feed */}
            {activity.length > 0 ? (
              activity.slice(0, 3).map((item) => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                  <div style={{
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    background: 'rgba(132, 204, 22, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#84cc16',
                    flexShrink: 0
                  }}>
                    <Sparkles size={16} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.description || item.action}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      {item.file_name ? `${item.file_name} • ` : ''}{timeAgo(item.created_at)}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '10px 0' }}>
                All systems running smoothly
              </div>
            )}
          </div>

        </div>

      </div>
    </DashboardLayout>
  )
}
