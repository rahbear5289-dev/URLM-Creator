'use client'

import { useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import {
  Coins, CheckCircle, AlertCircle, Gift, Percent,
  HardDrive, Tag, Loader2, Shield, Lock, Unlock, ChevronRight,
  Image as ImageIcon, Grid2x2, CreditCard, FileText, Scissors,
  Settings, User, HelpCircle, Check, Clock, Sparkles
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'

interface TokenRecord {
  id: string
  token_code: string
  name: string
  token_type: 'discount' | 'storage' | 'offer' | 'off'
  access_mode: 'lock' | 'open'
  value: string
  status: boolean
  expiry_date: string | null
  expiry_time: string | null
  used_count: number
  max_usages: number
  admin_id: string | null
}

const TYPE_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  discount: { label: 'Discount', icon: Percent, color: '#ec4899', bg: 'rgba(236,72,153,0.1)' },
  storage: { label: 'Storage Upgrade', icon: HardDrive, color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  offer: { label: 'Special Offer', icon: Gift, color: '#7c5cf6', bg: 'rgba(124,92,246,0.1)' },
  off: { label: 'Price Off', icon: Tag, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
}

type StepState = 'idle' | 'validating' | 'need-admin-id' | 'ready' | 'claiming' | 'done'
type TokenTab = 'Redeem Token' | 'Active Perks' | 'Redemption History' | 'Token FAQ'

const ERROR_MSGS: Record<string, string> = {
  not_found: 'Token not found or code is invalid',
  inactive: 'This token is currently inactive',
  expired: 'This token has expired',
  limit_reached: 'Maximum redemption limit reached for this token',
  admin_id_mismatch: 'Access denied: Admin ID mismatch',
  already_claimed: 'You have already claimed this token',
}

export default function TokenEnterPage() {
  const { user, refreshPlan, storageUsage } = useAuth()
  const router = useRouter()

  const [activeTab, setActiveTab] = useState<TokenTab>('Redeem Token')
  const [tokenInput, setTokenInput] = useState('')
  const [adminIdInput, setAdminIdInput] = useState('')
  const [token, setToken] = useState<TokenRecord | null>(null)
  const [step, setStep] = useState<StepState>('idle')
  const [errKey, setErrKey] = useState<string | null>(null)

  const [historyList, setHistoryList] = useState([
    { id: '1', code: 'STORAGE-PRO-50GB', type: 'Storage Upgrade', value: '+50 GB Extra', date: 'Just now', status: 'Active' },
    { id: '2', code: 'ANNUAL-SAVE-40', type: 'Discount', value: '40% Off Annual', date: 'Sep 01, 2026', status: 'Claimed' },
    { id: '3', code: 'CREATOR-BOOST-2026', type: 'Special Offer', value: 'Unlimited Access', date: 'Aug 20, 2026', status: 'Active' },
  ])

  const setError = (key: string) => { setErrKey(key); setStep('idle'); setToken(null) }
  const resetAll = () => { setToken(null); setAdminIdInput(''); setStep('idle'); setErrKey(null) }

  const validateToken = async () => {
    if (!tokenInput.trim() || !user) return
    setStep('validating')
    setErrKey(null)
    setToken(null)

    const { data } = await supabase
      .from('promo_tokens')
      .select('*')
      .eq('token_code', tokenInput.trim().toUpperCase())
      .maybeSingle()

    if (!data) return setError('not_found')

    const t = data as TokenRecord

    if (!t.status) return setError('inactive')
    if (t.used_count >= t.max_usages) return setError('limit_reached')

    if (t.expiry_date) {
      const expiryStr = `${t.expiry_date.split('T')[0]}T${t.expiry_time || '23:59:59'}`
      if (new Date(expiryStr) < new Date()) return setError('expired')
    }

    setToken(t)
    setStep(t.admin_id ? 'need-admin-id' : 'ready')
  }

  const verifyAdminId = async () => {
    if (!token) return
    setStep('validating')

    try {
      const tokenAdminId = (token.admin_id || '').trim().toUpperCase()
      const typedAdminId = adminIdInput.trim().toUpperCase()

      if (typedAdminId !== tokenAdminId) {
        setStep('need-admin-id')
        return setErrKey('admin_id_mismatch')
      }

      setErrKey(null)
      setStep('ready')
    } catch (err) {
      console.error('Verification failed:', err)
      setStep('need-admin-id')
      setErrKey('not_found')
    }
  }

  const claimToken = async () => {
    if (!token || !user) return
    setStep('claiming')

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('storage_used, storage_credit, feature_access_mode')
        .eq('id', user.id)
        .single()

      if (!profile) throw new Error('Profile not found')

      const currentRawUsed = profile.storage_used || 0
      const profileUpdates: any = {
        active_token_code: token.token_code,
        feature_access_mode: token.access_mode || 'open'
      }

      if (token.token_type === 'storage') {
        const bytesToSubtract = (parseFloat(token.value) || 0) * 1024 ** 3
        profileUpdates.storage_used = Math.max(0, currentRawUsed - bytesToSubtract)
        profileUpdates.storage_credit = 0
      } else if (token.access_mode === 'open') {
        profileUpdates.storage_used = 0
        profileUpdates.storage_credit = 0
        profileUpdates.feature_access_mode = 'open'
      }

      await supabase
        .from('promo_tokens')
        .update({ used_count: token.used_count + 1 })
        .eq('id', token.id)

      await supabase
        .from('token_redemptions')
        .insert({ token_id: token.token_code, user_id: user.id })

      await supabase
        .from('profiles')
        .update(profileUpdates)
        .eq('id', user.id)

      await refreshPlan()

      setHistoryList(prev => [
        {
          id: String(Date.now()),
          code: token.token_code,
          type: TYPE_CONFIG[token.token_type]?.label || 'Reward',
          value: token.value,
          date: 'Just now',
          status: 'Active'
        },
        ...prev
      ])

      setStep('done')
    } catch (err) {
      console.error('Claim failed:', err)
      setStep('ready')
      setErrKey('not_found')
    }
  }

  const cfg = token ? (TYPE_CONFIG[token.token_type] || TYPE_CONFIG.offer) : null
  const CfgIcon = cfg?.icon || Gift

  const tabs: TokenTab[] = ['Redeem Token', 'Active Perks', 'Redemption History', 'Token FAQ']

  const creatorTools = [
    { label: 'My Photos', href: '/photos', icon: ImageIcon, color: '#10b981', desc: 'Background removal & editor' },
    { label: 'Create Sheet', href: '/create-sheet', icon: Grid2x2, color: '#3b82f6', desc: 'Passport & stamp photo sheets' },
    { label: 'PVC Card', href: '/pvc-card', icon: CreditCard, color: '#8b5cf6', desc: 'Custom badge & ID PVC cards' },
    { label: 'PDF Converter', href: '/pdf-converter', icon: FileText, color: '#f59e0b', desc: 'Convert image & doc to PDF' },
    { label: 'PDF Crop', href: '/crop', icon: Scissors, color: '#ec4899', desc: 'Multi-page cropping tool' },
    { label: 'Token Enter', href: '/token/create', icon: Coins, color: '#06b6d4', desc: 'Claim vouchers & credits', current: true },
  ]

  return (
    <DashboardLayout>
      <div style={{ maxWidth: 1120, paddingBottom: 60 }}>

        {/* ─── Breadcrumb & Top Action Row ─── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5 }}>
            <span style={{ color: 'var(--text-muted)', cursor: 'pointer' }} onClick={() => router.push('/dashboard')}>Dashboard</span>
            <span style={{ color: 'var(--text-muted)' }}>&gt;</span>
            <span style={{ color: '#10b981', fontWeight: 600 }}>Token Enter</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={() => router.push('/settings')}
              style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8,
                padding: '8px 14px', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)',
                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6
              }}
            >
              <Settings size={14} /> Settings
            </button>
            <button
              onClick={() => router.push('/profile')}
              style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8,
                padding: '8px 14px', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)',
                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6
              }}
            >
              <User size={14} /> Profile
            </button>
          </div>
        </div>

        {/* ─── Page Title Header (Matches Settings/Profile) ─── */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: 'rgba(6, 182, 212, 0.12)', color: '#06b6d4',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <Coins size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 4px 0', letterSpacing: '-0.5px' }}>
                Token Enter &amp; Rewards
              </h1>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>
                Redeem promotional vouchers, extra cloud storage allocations, discount vouchers, and unlocked feature packages.
              </p>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div style={{
            display: 'flex', gap: 24, padding: '14px 20px',
            border: '1px solid var(--border)', borderRadius: 12,
            background: 'var(--bg-card)', marginTop: 18, overflowX: 'auto'
          }}>
            {[
              { label: 'Redemption Status', value: step === 'done' ? 'Claimed ✓' : step === 'ready' ? 'Verified' : 'Ready to Validate', color: step === 'done' ? '#10b981' : step === 'ready' ? '#3b82f6' : '#06b6d4' },
              { label: 'Active Token', value: token ? token.token_code : 'None Input', color: '#8b5cf6' },
              { label: 'Security System', value: 'Double-Lock Protocol', color: '#10b981' },
              { label: 'Storage Benefit', value: token && token.token_type === 'storage' ? `+${token.value} GB` : 'Standard Tier', color: '#f59e0b' },
            ].map(stat => (
              <div key={stat.label} style={{ minWidth: 120 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>
                  {stat.label}
                </div>
                <div style={{ fontSize: 15, fontWeight: 800, color: stat.color }}>{stat.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ─── Horizontal Navigation Tabs ─── */}
        <div style={{
          display: 'flex', gap: 24, borderBottom: '1px solid var(--border)',
          marginBottom: 28, overflowX: 'auto', paddingBottom: 2
        }}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  background: 'none', border: 'none', padding: '10px 4px 14px 4px',
                  fontSize: 14, fontWeight: isActive ? 700 : 500,
                  color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                  cursor: 'pointer', position: 'relative', whiteSpace: 'nowrap',
                  transition: 'color 0.15s ease'
                }}
              >
                {tab}
                {isActive && (
                  <div style={{
                    position: 'absolute', bottom: -1, left: 0, right: 0,
                    height: 2.5, background: '#10b981', borderRadius: '2px 2px 0 0'
                  }} />
                )}
              </button>
            )
          })}
        </div>

        {/* ─── TAB 1: REDEEM TOKEN ─── */}
        {activeTab === 'Redeem Token' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24, alignItems: 'start' }}>
            {/* Left Box: Validation & Input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {errKey && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '14px 18px', borderRadius: 12,
                  background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
                  color: '#f87171', fontWeight: 600, fontSize: 13.5
                }}>
                  <AlertCircle size={18} />
                  {ERROR_MSGS[errKey] || 'Validation error occurred'}
                </div>
              )}

              {/* Code Entry Card */}
              <div className="card" style={{ borderRadius: 16, padding: '24px 28px', background: 'var(--bg-card)' }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                  Enter Voucher or Promo Code
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
                  Input your 16-character alphanumeric voucher code below.
                </p>

                <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                  <input
                    id="promo-token-input"
                    type="text"
                    placeholder="e.g. DISC-PRO-2026"
                    value={tokenInput}
                    onChange={e => {
                      setTokenInput(e.target.value.toUpperCase())
                      if (step !== 'idle' && step !== 'done') resetAll()
                    }}
                    disabled={step === 'claiming' || step === 'done' || step === 'need-admin-id' || step === 'ready'}
                    style={{
                      flex: 1, height: 48, background: 'var(--bg-primary)', border: '1px solid var(--border)',
                      borderRadius: 10, padding: '0 16px', fontSize: 15, fontWeight: 800,
                      letterSpacing: '1.5px', color: 'var(--text-primary)', textAlign: 'center', outline: 'none'
                    }}
                  />

                  <button
                    id="validate-token-btn"
                    onClick={validateToken}
                    disabled={step !== 'idle' || !tokenInput.trim()}
                    style={{
                      padding: '0 24px', height: 48, borderRadius: 10, border: 'none',
                      background: '#10b981', color: '#fff', fontSize: 14, fontWeight: 700,
                      cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
                      boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)', opacity: (step !== 'idle' || !tokenInput.trim()) ? 0.6 : 1
                    }}
                  >
                    {step === 'validating' ? <Loader2 size={18} className="animate-spin" /> : <><CheckCircle size={16} /> Validate</>}
                  </button>
                </div>

                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Codes are automatically converted to uppercase.
                </div>
              </div>

              {/* Admin ID Lock Step */}
              {step === 'need-admin-id' && token && (
                <div className="card" style={{ borderRadius: 16, padding: '24px 28px', background: 'var(--bg-card)', border: '1.5px solid #8b5cf6' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(139,92,246,0.12)', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Lock size={20} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Admin ID Double-Lock Required</h4>
                      <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>This token has administrator restrictions enabled.</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 10 }}>
                    <input
                      id="admin-id-input"
                      type="text"
                      placeholder="Enter Admin ID (e.g. ADM-001)"
                      value={adminIdInput}
                      onChange={e => { setAdminIdInput(e.target.value); setErrKey(null) }}
                      style={{
                        flex: 1, height: 44, background: 'var(--bg-primary)', border: '1px solid var(--border)',
                        borderRadius: 8, padding: '0 14px', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', outline: 'none'
                      }}
                    />
                    <button
                      id="verify-admin-id-btn"
                      onClick={verifyAdminId}
                      style={{
                        padding: '0 18px', height: 44, borderRadius: 8, border: 'none',
                        background: '#8b5cf6', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                        display: 'inline-flex', alignItems: 'center', gap: 6
                      }}
                    >
                      <Shield size={15} /> Verify
                    </button>
                  </div>
                </div>
              )}

              {/* Ready to Claim Card */}
              {step === 'ready' && token && cfg && (
                <div className="card" style={{ borderRadius: 16, padding: '24px 28px', background: 'var(--bg-card)', border: `2px solid ${cfg.color}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 9999, background: cfg.bg, color: cfg.color }}>
                      {cfg.label} TOKEN
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      Used: {token.used_count} / {token.max_usages}
                    </span>
                  </div>

                  <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>
                    {token.name}
                  </h3>

                  <div style={{ margin: '18px 0', padding: 20, borderRadius: 12, background: cfg.bg, textAlign: 'center' }}>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>Granted Benefit:</div>
                    <div style={{ fontSize: 32, fontWeight: 900, color: cfg.color }}>
                      {token.token_type === 'discount' ? `${token.value}% Discount`
                        : token.token_type === 'storage' ? `${token.value} GB Extra Storage`
                        : token.token_type === 'off' ? `₹${token.value} Off`
                        : token.value}
                    </div>
                  </div>

                  <button
                    id="claim-reward-btn"
                    onClick={claimToken}
                    style={{
                      width: '100%', height: 50, borderRadius: 10, border: 'none',
                      background: '#10b981', color: '#fff', fontSize: 16, fontWeight: 800,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)'
                    }}
                  >
                    <Gift size={18} /> Claim Reward Now →
                  </button>
                </div>
              )}

              {/* Done State */}
              {step === 'done' && (
                <div className="card" style={{ borderRadius: 16, padding: '36px 28px', background: 'var(--bg-card)', textAlign: 'center', border: '2px solid #10b981' }}>
                  <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(16,185,129,0.12)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <CheckCircle size={36} />
                  </div>
                  <h3 style={{ fontSize: 22, fontWeight: 800, color: '#10b981', marginBottom: 6 }}>
                    Reward Successfully Claimed!
                  </h3>
                  <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', marginBottom: 20 }}>
                    The reward privileges have been assigned to your active account profile.
                  </p>
                  <button
                    onClick={() => { setTokenInput(''); resetAll() }}
                    className="btn btn-secondary btn-sm"
                  >
                    Apply Another Code
                  </button>
                </div>
              )}
            </div>

            {/* Right Box: How It Works & Perks */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="card" style={{ borderRadius: 16, padding: '24px 28px', background: 'var(--bg-card)' }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>
                  Token Verification Flow
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {[
                    { step: '1', title: 'Enter Code', desc: 'Input your issued promo code and validate against our live database.' },
                    { step: '2', title: 'Double Lock Check', desc: 'Restricted corporate and partner tokens require linked Admin ID confirmation.' },
                    { step: '3', title: 'Instant Activation', desc: 'Storage quotas and discount vouchers reflect immediately on your dashboard.' },
                  ].map(s => (
                    <div key={s.step} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(16,185,129,0.12)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, flexShrink: 0, marginTop: 2 }}>
                        {s.step}
                      </div>
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)' }}>{s.title}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4 }}>{s.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Current Quota Widget */}
              <div className="card" style={{ borderRadius: 16, padding: '22px 26px', background: 'var(--bg-card)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Active Account Quotas</span>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: '#10b981', background: 'rgba(16,185,129,0.12)', padding: '2px 8px', borderRadius: 9999 }}>PRO TIER</span>
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginBottom: 10 }}>
                  Storage Used: {(storageUsage.used / 1024 ** 3).toFixed(2)} GB of {(storageUsage.limit / 1024 ** 3).toFixed(1)} GB
                </div>
                <div className="progress-bar" style={{ height: 6, borderRadius: 3 }}>
                  <div className="progress-fill" style={{ width: `${storageUsage.percent}%`, background: 'linear-gradient(90deg, #06b6d4, #10b981)' }} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 2: ACTIVE PERKS ─── */}
        {activeTab === 'Active Perks' && (
          <div className="card" style={{ borderRadius: 16, padding: '24px 28px', background: 'var(--bg-card)' }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
              Active Perks & Benefits on this Account
            </h3>
            <p style={{ fontSize: 13.5, color: 'var(--text-muted)', marginBottom: 24 }}>
              Privileges unlocked through voucher redemptions and partner tokens.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 }}>
              {[
                { title: 'Unlimited AI Cutouts', desc: 'No background removal throttling or daily count caps.', icon: Sparkles, color: '#10b981', status: 'Active' },
                { title: 'High-Res 300 DPI Export', desc: 'Zero-loss canvas PDF generation for printing presses.', icon: FileText, color: '#3b82f6', status: 'Active' },
                { title: 'Zero Cloud Logging Mode', desc: 'Automatic ephemeral cleanup of sensitive scans and portrait files.', icon: Shield, color: '#8b5cf6', status: 'Enabled' },
              ].map(p => {
                const Icon = p.icon
                return (
                  <div key={p.title} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 20, background: 'var(--bg-primary)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: `${p.color}15`, color: p.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon size={18} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 9999, background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
                        {p.status}
                      </span>
                    </div>
                    <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{p.title}</div>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>{p.desc}</p>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ─── TAB 3: REDEMPTION HISTORY ─── */}
        {activeTab === 'Redemption History' && (
          <div className="card" style={{ borderRadius: 16, padding: '24px 28px', background: 'var(--bg-card)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  Redemption Ledger
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                  Complete record of promotional tokens claimed on this account
                </p>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '12px 14px', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Token Code</th>
                    <th style={{ padding: '12px 14px', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Type</th>
                    <th style={{ padding: '12px 14px', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Benefit Awarded</th>
                    <th style={{ padding: '12px 14px', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Claim Date</th>
                    <th style={{ padding: '12px 14px', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {historyList.map(h => (
                    <tr key={h.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '14px', fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Coins size={16} color="#06b6d4" />
                          {h.code}
                        </div>
                      </td>
                      <td style={{ padding: '14px', fontSize: 13, color: 'var(--text-secondary)' }}>{h.type}</td>
                      <td style={{ padding: '14px', fontSize: 13, fontWeight: 600, color: '#10b981' }}>{h.value}</td>
                      <td style={{ padding: '14px', fontSize: 13, color: 'var(--text-secondary)' }}>{h.date}</td>
                      <td style={{ padding: '14px' }}>
                        <span style={{
                          padding: '3px 10px', borderRadius: 9999, fontSize: 11.5, fontWeight: 700,
                          background: 'rgba(16,185,129,0.12)', color: '#10b981'
                        }}>
                          {h.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── TAB 4: TOKEN FAQ ─── */}
        {activeTab === 'Token FAQ' && (
          <div className="card" style={{ borderRadius: 16, padding: '24px 28px', background: 'var(--bg-card)' }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
              Frequently Asked Questions
            </h3>
            <p style={{ fontSize: 13.5, color: 'var(--text-muted)', marginBottom: 24 }}>
              Clear information on vouchers, expiry, and double-lock security
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { q: 'What is the Double-Lock Security Protocol?', a: 'Some institutional vouchers are tied to dedicated administrator IDs. Entering matching credentials ensures tokens are only claimed by authorized team members.' },
                { q: 'How does storage upgrade work?', a: 'Storage tokens grant permanent or promotional extra gigabytes directly credited to your Supabase storage quota.' },
                { q: 'Can a voucher code be redeemed multiple times?', a: 'Each token record has a global max usage threshold. Once consumed or expired, codes cannot be re-applied.' },
                { q: 'Where do I get new promo tokens?', a: 'Tokens are distributed during platform sales, partner events, and enterprise onboarding.' },
              ].map(faq => (
                <div key={faq.q} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 18, background: 'var(--bg-primary)' }}>
                  <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                    {faq.q}
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                    {faq.a}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── Creator Suite Navigation Footer (Exact Match to Settings/Profile) ─── */}
        <div style={{ marginTop: 48, paddingTop: 32, borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Explore Creator Suite
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                Quick switch to another photo creation or document utility tool
              </p>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
            {creatorTools.map(tool => {
              const Icon = tool.icon
              return (
                <div
                  key={tool.label}
                  onClick={() => router.push(tool.href)}
                  className="card"
                  style={{
                    padding: '16px 18px', borderRadius: 12, cursor: 'pointer',
                    border: tool.current ? `1.5px solid ${tool.color}` : '1px solid var(--border)',
                    background: tool.current ? `${tool.color}0a` : 'var(--bg-card)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: 8,
                      background: `${tool.color}15`, color: tool.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <Icon size={18} />
                    </div>
                    <ChevronRight size={14} color="var(--text-muted)" />
                  </div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 3 }}>
                    {tool.label}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                    {tool.desc}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </DashboardLayout>
  )
}
