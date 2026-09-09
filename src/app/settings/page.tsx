'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { supabase } from '@/lib/supabase'
import {
  CreditCard, Plus, MoreVertical, Check, ExternalLink,
  Shield, User, Lock, Users, Zap, Mail, Bell, Moon, Sun,
  CheckCircle2, ArrowRight, Eye, Trash2, Smartphone, Globe,
  Briefcase, Camera, Image as ImageIcon, Grid2x2, FileText,
  Scissors, Coins, ChevronRight, Download, Send, CheckCircle,
  AlertCircle, HelpCircle
} from 'lucide-react'

type SettingsTab = 'My details' | 'Profile' | 'Password' | 'Team' | 'Billings' | 'Plan' | 'Email' | 'Notifications'

export default function SettingsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { theme, setTheme } = useTheme() as { theme: string; setTheme: (t: any) => void }

  const [activeTab, setActiveTab] = useState<SettingsTab>('Billings')
  const [saving, setSaving] = useState(false)
  const [saveToast, setSaveToast] = useState('')

  const showToast = (msg: string) => {
    setSaveToast(msg)
    setTimeout(() => setSaveToast(''), 3500)
  }

  // ─────────────────────────────────────────────────────────────
  // 1. Billings State (Exact Match to Image 2)
  // ─────────────────────────────────────────────────────────────
  const [cardName, setCardName] = useState('Mayad Ahmed')
  const [cardExpiry, setCardExpiry] = useState('02 / 2028')
  const [cardNumber, setCardNumber] = useState('8269 9620 9292 2538')
  const [cardCvv, setCardCvv] = useState('884')
  const [contactEmailChoice, setContactEmailChoice] = useState<'existing' | 'custom'>('existing')
  const [customEmail, setCustomEmail] = useState('')

  const [billingRows, setBillingRows] = useState([
    {
      id: '1',
      selected: false,
      invoice: 'Account Sale',
      date: 'Apr 14, 2004',
      amount: '$3,050',
      status: 'Pending',
      statusColor: '#10b981',
      statusBg: 'rgba(16, 185, 129, 0.12)',
      tracking: 'LM580405575CN',
      address: '313 Main Road, Sunderland'
    },
    {
      id: '2',
      selected: false,
      invoice: 'Account Sale',
      date: 'Jun 24, 2008',
      amount: '$1,050',
      status: 'Cancelled',
      statusColor: '#ea580c',
      statusBg: 'rgba(234, 88, 12, 0.12)',
      tracking: 'AZ938540353US',
      address: '96 Grange Road, Peterborough'
    },
    {
      id: '3',
      selected: true,
      invoice: 'Netflix Subscription',
      date: 'Feb 28, 2004',
      amount: '$800',
      status: 'Refund',
      statusColor: '#06b6d4',
      statusBg: 'rgba(6, 182, 212, 0.12)',
      tracking: '3S331605504US',
      address: '2 New Street, Harrogate'
    }
  ])

  const toggleRowSelect = (id: string) => {
    setBillingRows(rows => rows.map(r => r.id === id ? { ...r, selected: !r.selected } : r))
  }

  // ─────────────────────────────────────────────────────────────
  // 2. My Details State
  // ─────────────────────────────────────────────────────────────
  const [firstName, setFirstName] = useState('Sara')
  const [lastName, setLastName] = useState('Smith')
  const [contactEmail, setContactEmail] = useState(user?.email || 'sara.smith@company.com')
  const [phoneNumber, setPhoneNumber] = useState('+31 20 192 4826')
  const [country, setCountry] = useState('Netherlands')
  const [timezone, setTimezone] = useState('UTC+01:00 (Amsterdam, Berlin)')
  const [bio, setBio] = useState('Senior UI Designer specializing in automated photo sheets and digital credential workflows.')
  const [avatarUrl, setAvatarUrl] = useState('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80')

  // ─────────────────────────────────────────────────────────────
  // 3. Profile Tab State
  // ─────────────────────────────────────────────────────────────
  const [username, setUsername] = useState('sarasmith')
  const [jobRole, setJobRole] = useState('UI Designer')
  const [portfolioUrl, setPortfolioUrl] = useState('https://sarasmith.design')
  const [twitterHandle, setTwitterHandle] = useState('@sarasmith_ui')
  const [linkedinHandle, setLinkedinHandle] = useState('linkedin.com/in/sarasmith-design')
  const [publicProfile, setPublicProfile] = useState(true)

  // ─────────────────────────────────────────────────────────────
  // 4. Password & Security State
  // ─────────────────────────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true)

  // ─────────────────────────────────────────────────────────────
  // 5. Team State
  // ─────────────────────────────────────────────────────────────
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'Admin' | 'Designer' | 'Viewer'>('Designer')
  const [teamMembers, setTeamMembers] = useState([
    { id: '1', name: 'Sara Smith', email: 'sara.smith@company.com', role: 'Owner', status: 'Active', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80' },
    { id: '2', name: 'Mayad Ahmed', email: 'mayadahmed@ofspace.co', role: 'Admin', status: 'Active', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80' },
    { id: '3', name: 'Alex van Dijk', email: 'alex.dijk@company.com', role: 'Designer', status: 'Active', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80' },
    { id: '4', name: 'Priya Sharma', email: 'priya.s@company.com', role: 'Viewer', status: 'Invited', avatar: '' }
  ])

  // ─────────────────────────────────────────────────────────────
  // 6. Plan State
  // ─────────────────────────────────────────────────────────────
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual')

  // ─────────────────────────────────────────────────────────────
  // 7. Email Preferences State
  // ─────────────────────────────────────────────────────────────
  const [emailDigest, setEmailDigest] = useState<'instant' | 'daily' | 'weekly'>('daily')
  const [marketingEmails, setMarketingEmails] = useState(false)
  const [securityAlerts, setSecurityAlerts] = useState(true)
  const [statementReceipts, setStatementReceipts] = useState(true)

  // ─────────────────────────────────────────────────────────────
  // 8. Notifications State
  // ─────────────────────────────────────────────────────────────
  const [pushNotifications, setPushNotifications] = useState(true)
  const [inAppSounds, setInAppSounds] = useState(true)
  const [sheetReadyAlert, setSheetReadyAlert] = useState(true)
  const [lowTokenAlert, setLowTokenAlert] = useState(true)

  useEffect(() => {
    if (user?.email) {
      setContactEmail(user.email)
    }
  }, [user])

  const tabs: SettingsTab[] = [
    'My details',
    'Profile',
    'Password',
    'Team',
    'Billings',
    'Plan',
    'Email',
    'Notifications'
  ]

  // Creator Quick Jump Items
  const creatorTools = [
    { label: 'My Photos', href: '/photos', icon: ImageIcon, color: '#10b981', desc: 'Background removal & enhancements' },
    { label: 'Create Sheet', href: '/create-sheet', icon: Grid2x2, color: '#3b82f6', desc: 'Passport & stamp photo sheets' },
    { label: 'PVC Card', href: '/pvc-card', icon: CreditCard, color: '#8b5cf6', desc: 'Custom badge & ID PVC cards' },
    { label: 'PDF Converter', href: '/pdf-converter', icon: FileText, color: '#f59e0b', desc: 'Convert image & doc to PDF' },
    { label: 'PDF Crop', href: '/crop', icon: Scissors, color: '#ec4899', desc: 'Multi-page cropping tool' },
    { label: 'Token Enter', href: '/token/create', icon: Coins, color: '#06b6d4', desc: 'Claim vouchers & credits' },
  ]

  const handleInviteMember = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail) return
    setTeamMembers(prev => [
      ...prev,
      {
        id: String(Date.now()),
        name: inviteEmail.split('@')[0],
        email: inviteEmail,
        role: inviteRole,
        status: 'Invited',
        avatar: ''
      }
    ])
    setInviteEmail('')
    showToast(`Invite sent successfully to ${inviteEmail}!`)
  }

  return (
    <DashboardLayout>
      <div style={{ maxWidth: 1120, paddingBottom: 60 }}>

        {/* Toast Alert */}
        {saveToast && (
          <div style={{
            position: 'fixed', top: 24, right: 24, zIndex: 9999,
            background: '#10b981', color: '#ffffff', padding: '12px 20px',
            borderRadius: 10, fontWeight: 600, fontSize: 13.5,
            boxShadow: '0 8px 24px rgba(16, 185, 129, 0.35)',
            display: 'flex', alignItems: 'center', gap: 8,
            animation: 'fadeIn 0.2s ease'
          }}>
            <CheckCircle size={18} />
            {saveToast}
          </div>
        )}

        {/* Page Header (Matches Reference Image 2) */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px 0', letterSpacing: '-0.5px' }}>
            Settings
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>
            Manage your account settings and preferences.
          </p>
        </div>

        {/* Horizontal Navigation Tabs (Exact Match to Reference Image 2) */}
        <div style={{
          display: 'flex',
          gap: 24,
          borderBottom: '1px solid var(--border)',
          marginBottom: 32,
          overflowX: 'auto',
          paddingBottom: 2
        }}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '10px 4px 14px 4px',
                  fontSize: 14,
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  position: 'relative',
                  whiteSpace: 'nowrap',
                  transition: 'color 0.15s ease'
                }}
              >
                {tab}
                {isActive && (
                  <span style={{
                    position: 'absolute',
                    bottom: -1,
                    left: 0,
                    right: 0,
                    height: 2.5,
                    background: 'var(--text-primary)',
                    borderRadius: 2
                  }} />
                )}
              </button>
            )
          })}
        </div>

        {/* ══════════════════════════════════════════════════════════
            TAB 1: MY DETAILS
        ══════════════════════════════════════════════════════════ */}
        {activeTab === 'My details' && (
          <div className="card" style={{ padding: '32px', borderRadius: 16 }}>
            <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 24, marginBottom: 28 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px 0' }}>Personal Details</h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>Update your basic personal information and contact settings.</p>
            </div>

            {/* Profile Avatar Upload */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 32 }}>
              <div style={{
                width: 74, height: 74, borderRadius: '50%', overflow: 'hidden',
                border: '3px solid rgba(16,185,129,0.3)', flexShrink: 0
              }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div>
                <div style={{ display: 'flex', gap: 10, marginBottom: 6 }}>
                  <label style={{
                    background: 'var(--bg-primary)', border: '1px solid var(--border)',
                    padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                    color: 'var(--text-primary)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6
                  }}>
                    <Camera size={14} /> Change Photo
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        const url = URL.createObjectURL(file)
                        setAvatarUrl(url)
                        showToast('Photo uploaded!')
                      }
                    }} />
                  </label>
                  <button
                    onClick={() => { setAvatarUrl('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'); showToast('Photo reset'); }}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 12.5, cursor: 'pointer', padding: '6px 10px' }}
                  >
                    Reset
                  </button>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>JPG, GIF or PNG. Max size 2MB.</div>
              </div>
            </div>

            {/* Form Fields */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 24 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>First Name</label>
                <input type="text" className="input" value={firstName} onChange={e => setFirstName(e.target.value)} style={{ borderRadius: 8 }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>Last Name</label>
                <input type="text" className="input" value={lastName} onChange={e => setLastName(e.target.value)} style={{ borderRadius: 8 }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>Email Address</label>
                <input type="email" className="input" value={contactEmail} onChange={e => setContactEmail(e.target.value)} style={{ borderRadius: 8 }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>Phone Number</label>
                <input type="text" className="input" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} style={{ borderRadius: 8 }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>Country</label>
                <input type="text" className="input" value={country} onChange={e => setCountry(e.target.value)} style={{ borderRadius: 8 }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>Timezone</label>
                <input type="text" className="input" value={timezone} onChange={e => setTimezone(e.target.value)} style={{ borderRadius: 8 }} />
              </div>
            </div>

            <div style={{ marginBottom: 28 }}>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>Bio / Description</label>
              <textarea
                className="input"
                rows={3}
                value={bio}
                onChange={e => setBio(e.target.value)}
                style={{ borderRadius: 8, width: '100%', resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button
                type="button"
                onClick={() => showToast('Changes saved successfully!')}
                style={{
                  background: '#10b981', color: '#fff', border: 'none', borderRadius: 8,
                  padding: '9px 24px', fontSize: 13.5, fontWeight: 700, cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)'
                }}
              >
                Save Changes
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            TAB 2: PROFILE
        ══════════════════════════════════════════════════════════ */}
        {activeTab === 'Profile' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 340px', gap: 24, alignItems: 'start' }}>
            <div className="card" style={{ padding: '32px', borderRadius: 16 }}>
              <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 20, marginBottom: 24 }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>Public Creator Profile</h3>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>This is how you appear to team members and public sheet viewers.</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginBottom: 28 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>Username</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 13 }}>@</span>
                    <input type="text" className="input" value={username} onChange={e => setUsername(e.target.value)} style={{ paddingLeft: 28, borderRadius: 8 }} />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>Professional Title / Role</label>
                  <input type="text" className="input" value={jobRole} onChange={e => setJobRole(e.target.value)} style={{ borderRadius: 8 }} />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>Portfolio or Studio URL</label>
                  <input type="url" className="input" value={portfolioUrl} onChange={e => setPortfolioUrl(e.target.value)} style={{ borderRadius: 8 }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>Twitter / X</label>
                    <input type="text" className="input" value={twitterHandle} onChange={e => setTwitterHandle(e.target.value)} style={{ borderRadius: 8 }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>LinkedIn</label>
                    <input type="text" className="input" value={linkedinHandle} onChange={e => setLinkedinHandle(e.target.value)} style={{ borderRadius: 8 }} />
                  </div>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginTop: 6 }}>
                  <input type="checkbox" checked={publicProfile} onChange={e => setPublicProfile(e.target.checked)} style={{ width: 16, height: 16, accentColor: '#10b981' }} />
                  <span style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text-primary)' }}>Make my profile visible in the public directory</span>
                </label>
              </div>

              <button
                type="button"
                onClick={() => showToast('Profile settings updated!')}
                style={{
                  background: '#10b981', color: '#fff', border: 'none', borderRadius: 8,
                  padding: '9px 24px', fontSize: 13.5, fontWeight: 700, cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)'
                }}
              >
                Save Profile
              </button>
            </div>

            {/* Live Profile Card Preview */}
            <div className="card" style={{ padding: '24px', borderRadius: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: 0.5, marginBottom: 16 }}>
                Live Preview
              </div>
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{
                  width: 76, height: 76, borderRadius: '50%', overflow: 'hidden', margin: '0 auto 12px',
                  border: '3px solid rgba(16,185,129,0.3)'
                }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={avatarUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 2 }}>
                  {firstName} {lastName}
                </div>
                <div style={{ fontSize: 12.5, color: '#10b981', fontWeight: 600, marginBottom: 6 }}>
                  @{username} · {jobRole}
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4, margin: '0 0 16px 0' }}>
                  {bio}
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
                  <button
                    onClick={() => router.push('/profile')}
                    style={{
                      background: 'var(--bg-primary)', border: '1px solid var(--border)',
                      borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600,
                      color: 'var(--text-primary)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6
                    }}
                  >
                    View Full Profile <ExternalLink size={12} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            TAB 3: PASSWORD & SECURITY
        ══════════════════════════════════════════════════════════ */}
        {activeTab === 'Password' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 540px) 1fr', gap: 24, alignItems: 'start' }}>
            <div className="card" style={{ padding: '32px', borderRadius: 16 }}>
              <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 20, marginBottom: 24 }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>Change Password</h3>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>Ensure your account is using a long, random password to stay secure.</p>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault()
                if (newPassword !== confirmPassword) {
                  showToast('Passwords do not match!')
                  return
                }
                setCurrentPassword('')
                setNewPassword('')
                setConfirmPassword('')
                showToast('Password successfully updated!')
              }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>Current Password</label>
                  <input type="password" className="input" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required style={{ borderRadius: 8 }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>New Password</label>
                  <input type="password" className="input" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={8} style={{ borderRadius: 8 }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>Confirm New Password</label>
                  <input type="password" className="input" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required minLength={8} style={{ borderRadius: 8 }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                  <button type="submit" style={{
                    background: '#10b981', color: '#fff', border: 'none', borderRadius: 8,
                    padding: '9px 24px', fontSize: 13.5, fontWeight: 700, cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)'
                  }}>
                    Update Password
                  </button>
                </div>
              </form>
            </div>

            {/* 2FA & Active Sessions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="card" style={{ padding: '24px', borderRadius: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Two-Factor Authentication</div>
                    <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>Add an extra layer of security with authenticator apps.</div>
                  </div>
                  <span style={{
                    fontSize: 11.5, fontWeight: 700, padding: '3px 10px', borderRadius: 9999,
                    background: twoFactorEnabled ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                    color: twoFactorEnabled ? '#10b981' : '#ef4444'
                  }}>
                    {twoFactorEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <button
                  onClick={() => { setTwoFactorEnabled(!twoFactorEnabled); showToast(twoFactorEnabled ? '2FA disabled' : '2FA activated!') }}
                  style={{
                    background: 'var(--bg-primary)', border: '1px solid var(--border)',
                    borderRadius: 8, padding: '8px 16px', fontSize: 12.5, fontWeight: 600,
                    color: 'var(--text-primary)', cursor: 'pointer'
                  }}
                >
                  {twoFactorEnabled ? 'Disable 2FA' : 'Configure 2FA'}
                </button>
              </div>

              <div className="card" style={{ padding: '24px', borderRadius: 16 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Active Sessions</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[
                    { device: 'Windows PC — Chrome', loc: 'Amsterdam, Netherlands', current: true },
                    { device: 'MacBook Pro — Safari', loc: 'Berlin, Germany', current: false },
                    { device: 'iPhone 15 Pro — App', loc: 'Amsterdam, Netherlands', current: false },
                  ].map((s, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: idx < 2 ? '1px solid var(--border)' : 'none', paddingBottom: idx < 2 ? 10 : 0 }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{s.device}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{s.loc}</div>
                      </div>
                      {s.current ? (
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#10b981' }}>Current</span>
                      ) : (
                        <button onClick={() => showToast('Session revoked')} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                          Revoke
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            TAB 4: TEAM
        ══════════════════════════════════════════════════════════ */}
        {activeTab === 'Team' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Invite New Member */}
            <div className="card" style={{ padding: '24px 28px', borderRadius: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px 0' }}>Invite Team Members</h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 16px 0' }}>
                Collaborate with designers and managers on shared photo sheet templates and documents.
              </p>
              <form onSubmit={handleInviteMember} style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <input
                  type="email"
                  className="input"
                  placeholder="colleague@company.com"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  style={{ flex: 1, minWidth: 260, borderRadius: 8 }}
                  required
                />
                <select
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value as any)}
                  className="input"
                  style={{ width: 140, borderRadius: 8 }}
                >
                  <option value="Admin">Admin</option>
                  <option value="Designer">Designer</option>
                  <option value="Viewer">Viewer</option>
                </select>
                <button
                  type="submit"
                  style={{
                    background: '#10b981', color: '#fff', border: 'none', borderRadius: 8,
                    padding: '9px 20px', fontSize: 13.5, fontWeight: 700, cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)'
                  }}
                >
                  <Send size={14} /> Send Invite
                </button>
              </form>
            </div>

            {/* Team Directory Table */}
            <div className="card" style={{ borderRadius: 16, overflow: 'hidden', padding: 0 }}>
              <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)' }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  Team Members ({teamMembers.length})
                </h3>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-primary)', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '12px 20px', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Member</th>
                    <th style={{ padding: '12px 20px', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Role</th>
                    <th style={{ padding: '12px 20px', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Status</th>
                    <th style={{ padding: '12px 20px', width: 60 }} />
                  </tr>
                </thead>
                <tbody>
                  {teamMembers.map((m) => (
                    <tr key={m.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: '50%', background: 'rgba(16,185,129,0.15)',
                            color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 700, fontSize: 13, overflow: 'hidden'
                          }}>
                            {m.avatar ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={m.avatar} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              m.name[0]?.toUpperCase()
                            )}
                          </div>
                          <div>
                            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>{m.name}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{m.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px 20px', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                        {m.role}
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', padding: '3px 10px',
                          borderRadius: 9999, fontSize: 11.5, fontWeight: 700,
                          background: m.status === 'Active' ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
                          color: m.status === 'Active' ? '#10b981' : '#f59e0b'
                        }}>
                          {m.status}
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        {m.role !== 'Owner' && (
                          <button
                            onClick={() => {
                              setTeamMembers(prev => prev.filter(item => item.id !== m.id))
                              showToast(`Removed ${m.name}`)
                            }}
                            className="icon-btn" style={{ width: 28, height: 28, color: '#ef4444' }} title="Remove member"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            TAB 5: BILLINGS (EXACT 1:1 REPLICATION OF IMAGE 2)
        ══════════════════════════════════════════════════════════ */}
        {activeTab === 'Billings' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>

            {/* Section 1: Payment Method */}
            <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 36 }}>
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>
                  Payment Method
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
                  Update your billing details and address.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 280px) 1fr', gap: 32, alignItems: 'start' }}>
                {/* Left Card Details Column */}
                <div>
                  <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>
                    Card Details
                  </h4>
                  <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: '0 0 16px 0', lineHeight: 1.4 }}>
                    Update your billing details and address.
                  </p>
                  <button
                    type="button"
                    onClick={() => showToast('Add card modal triggered')}
                    style={{
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      padding: '8px 14px',
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    <Plus size={14} /> Add another card
                  </button>
                </div>

                {/* Right Form Inputs */}
                <form onSubmit={(e) => { e.preventDefault(); setSaving(true); setTimeout(() => { setSaving(false); showToast('Card details updated successfully!') }, 600) }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                        Name on your Card
                      </label>
                      <input
                        type="text"
                        className="input"
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value)}
                        placeholder="Name on card"
                        style={{ borderRadius: 8, fontSize: 13.5 }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                        Expiry
                      </label>
                      <input
                        type="text"
                        className="input"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        placeholder="02 / 2028"
                        style={{ borderRadius: 8, fontSize: 13.5 }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                        Card Number
                      </label>
                      <div style={{ position: 'relative' }}>
                        {/* Mastercard overlapping red & orange circles icon */}
                        <div style={{
                          position: 'absolute',
                          left: 12,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          display: 'flex',
                          alignItems: 'center'
                        }}>
                          <span style={{ width: 14, height: 14, borderRadius: '50%', background: '#eb001b', display: 'inline-block' }} />
                          <span style={{ width: 14, height: 14, borderRadius: '50%', background: '#f79e1b', display: 'inline-block', marginLeft: -6, opacity: 0.85 }} />
                        </div>
                        <input
                          type="text"
                          className="input"
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value)}
                          placeholder="8269 9620 9292 2538"
                          style={{ borderRadius: 8, fontSize: 13.5, paddingLeft: 38 }}
                        />
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                        CVV
                      </label>
                      <input
                        type="password"
                        className="input"
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value)}
                        placeholder="••••"
                        maxLength={4}
                        style={{ borderRadius: 8, fontSize: 13.5 }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
                    <button
                      type="submit"
                      disabled={saving}
                      style={{
                        background: '#10b981',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: 8,
                        padding: '8px 20px',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)'
                      }}
                    >
                      {saving ? 'Saving...' : 'Update Card'}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Section 2: Contact email */}
            <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 36 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 280px) 1fr', gap: 32, alignItems: 'start' }}>
                <div>
                  <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>
                    Contact email
                  </h4>
                  <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: 0 }}>
                    Where should invoices be sent?
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="contactEmail"
                      checked={contactEmailChoice === 'existing'}
                      onChange={() => setContactEmailChoice('existing')}
                      style={{ marginTop: 3, accentColor: '#10b981' }}
                    />
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>
                        Send to the existing email
                      </div>
                      <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                        mayadahmed@ofspace.co
                      </div>
                    </div>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="contactEmail"
                      checked={contactEmailChoice === 'custom'}
                      onChange={() => setContactEmailChoice('custom')}
                      style={{ accentColor: '#10b981' }}
                    />
                    <span style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text-primary)' }}>
                      Add another email address
                    </span>
                  </label>

                  {contactEmailChoice === 'custom' && (
                    <input
                      type="email"
                      className="input"
                      value={customEmail}
                      onChange={(e) => setCustomEmail(e.target.value)}
                      placeholder="billing@company.com"
                      style={{ borderRadius: 8, fontSize: 13.5, maxWidth: 360, marginLeft: 24 }}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Section 3: Billing History (Table Matching Image 2) */}
            <div>
              <div style={{ marginBottom: 16 }}>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>
                  Billing History
                </h4>
                <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: 0 }}>
                  See the transaction you made
                </p>
              </div>

              <div style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                overflow: 'hidden'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-primary)' }}>
                      <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', width: 40 }}>
                        <input
                          type="checkbox"
                          checked={billingRows.every(r => r.selected)}
                          onChange={(e) => {
                            const checked = e.target.checked
                            setBillingRows(rows => rows.map(r => ({ ...r, selected: checked })))
                          }}
                        />
                      </th>
                      <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>
                        Invoice ⇅
                      </th>
                      <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>
                        Date ⇅
                      </th>
                      <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>
                        Amount ⇅
                      </th>
                      <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>
                        Status ⇅
                      </th>
                      <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>
                        Tracking & Address ⇅
                      </th>
                      <th style={{ width: 40 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {billingRows.map((row) => (
                      <tr key={row.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '14px 16px' }}>
                          <input
                            type="checkbox"
                            checked={row.selected}
                            onChange={() => toggleRowSelect(row.id)}
                          />
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>
                          {row.invoice}
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text-muted)' }}>
                          {row.date}
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                          {row.amount}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '3px 10px',
                            borderRadius: 9999,
                            fontSize: 11.5,
                            fontWeight: 700,
                            color: row.statusColor,
                            background: row.statusBg
                          }}>
                            {row.status}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ fontSize: 12.5, fontWeight: 600, color: '#3b82f6', marginBottom: 2, cursor: 'pointer' }}>
                            {row.tracking}
                          </div>
                          <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                            {row.address}
                          </div>
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                          <button className="icon-btn" style={{ width: 28, height: 28 }}>
                            <MoreVertical size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            TAB 6: PLAN & SUBSCRIPTION
        ══════════════════════════════════════════════════════════ */}
        {activeTab === 'Plan' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            {/* Active Plan Banner */}
            <div className="card" style={{ padding: 28, borderRadius: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Professional Creator Plan</h3>
                    <span style={{ fontSize: 11.5, fontWeight: 700, background: '#10b981', color: '#fff', padding: '3px 10px', borderRadius: 9999 }}>Active</span>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
                    Full suite access: AI photo background removal, custom photo sheets, PVC card builder, and high-DPI export.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => showToast('Redirecting to invoice manager...')} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer' }}>
                    Billing Details
                  </button>
                  <button onClick={() => showToast('Plan upgrade activated!')} style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                    Upgrade to Enterprise
                  </button>
                </div>
              </div>

              {/* Usage Quotas */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>
                    <span style={{ color: 'var(--text-muted)' }}>AI Removals</span>
                    <span style={{ color: 'var(--text-primary)' }}>340 / 500 used</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--bg-primary)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ width: '68%', height: '100%', background: '#10b981', borderRadius: 99 }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Sheets Generated</span>
                    <span style={{ color: 'var(--text-primary)' }}>1,280 / Unlimited</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--bg-primary)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ width: '100%', height: '100%', background: '#3b82f6', borderRadius: 99 }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Storage Quota</span>
                    <span style={{ color: 'var(--text-primary)' }}>2.4 GB / 10 GB</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--bg-primary)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ width: '24%', height: '100%', background: '#8b5cf6', borderRadius: 99 }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Plans Comparison */}
            <div style={{ textAlign: 'center', marginTop: 10 }}>
              <div style={{ display: 'inline-flex', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 4, marginBottom: 24 }}>
                <button
                  onClick={() => setBillingCycle('monthly')}
                  style={{
                    border: 'none', background: billingCycle === 'monthly' ? 'var(--bg-primary)' : 'transparent',
                    color: billingCycle === 'monthly' ? 'var(--text-primary)' : 'var(--text-muted)',
                    padding: '6px 16px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer'
                  }}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingCycle('annual')}
                  style={{
                    border: 'none', background: billingCycle === 'annual' ? 'var(--bg-primary)' : 'transparent',
                    color: billingCycle === 'annual' ? 'var(--text-primary)' : 'var(--text-muted)',
                    padding: '6px 16px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer'
                  }}
                >
                  Annual <span style={{ fontSize: 10, color: '#10b981', fontWeight: 800, marginLeft: 4 }}>SAVE 20%</span>
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20, textAlign: 'left' }}>
                {[
                  { title: 'Starter Free', price: '$0', desc: 'Basic single-photo passport crops', features: ['10 sheet downloads / mo', 'Standard 300 DPI export', 'Watermarked PVC preview'] },
                  { title: 'Pro Creator', price: billingCycle === 'annual' ? '$15' : '$19', popular: true, desc: 'For studio photographers & designers', features: ['Unlimited sheet downloads', 'Unlimited AI background removal', 'PVC Badge & Card Studio', 'High-speed batch processing'] },
                  { title: 'Business Team', price: billingCycle === 'annual' ? '$39' : '$49', desc: 'For print shops & studios', features: ['Up to 5 Team seats', 'Custom Studio Branding', 'Priority API Access', 'Dedicated Account Manager'] },
                ].map((tier) => (
                  <div key={tier.title} className="card" style={{
                    padding: 24, borderRadius: 16, border: tier.popular ? '2px solid #10b981' : '1px solid var(--border)',
                    position: 'relative'
                  }}>
                    {tier.popular && (
                      <span style={{ position: 'absolute', top: -11, right: 20, background: '#10b981', color: '#fff', fontSize: 10, fontWeight: 800, padding: '2px 10px', borderRadius: 999 }}>
                        CURRENT PLAN
                      </span>
                    )}
                    <h4 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>{tier.title}</h4>
                    <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: '0 0 16px 0' }}>{tier.desc}</p>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 20 }}>
                      <span style={{ fontSize: 32, fontWeight: 900, color: 'var(--text-primary)' }}>{tier.price}</span>
                      <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>/ month</span>
                    </div>
                    <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {tier.features.map(f => (
                        <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-primary)' }}>
                          <Check size={14} color="#10b981" /> {f}
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={() => showToast(`Selected ${tier.title}`)}
                      style={{
                        width: '100%', padding: '9px 0', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                        background: tier.popular ? '#10b981' : 'var(--bg-primary)',
                        color: tier.popular ? '#fff' : 'var(--text-primary)',
                        border: tier.popular ? 'none' : '1px solid var(--border)'
                      }}
                    >
                      {tier.popular ? 'Active Plan' : 'Select Plan'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            TAB 7: EMAIL PREFERENCES
        ══════════════════════════════════════════════════════════ */}
        {activeTab === 'Email' && (
          <div className="card" style={{ padding: 32, borderRadius: 16, maxWidth: 680 }}>
            <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 20, marginBottom: 24 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>Email Settings & Digests</h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>Configure email addresses and communication frequencies.</p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: 'var(--bg-primary)', borderRadius: 12, border: '1px solid var(--border)', marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{contactEmail}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Primary account and billing notification email</div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', gap: 4 }}>
                <CheckCircle2 size={14} /> Verified
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 28 }}>
              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Monthly Statement Receipts</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Send PDF invoices automatically on renewal</div>
                </div>
                <input type="checkbox" checked={statementReceipts} onChange={e => setStatementReceipts(e.target.checked)} style={{ width: 18, height: 18, accentColor: '#10b981' }} />
              </label>

              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Security & Sign-in Alerts</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Receive an alert when account is accessed from a new browser or IP</div>
                </div>
                <input type="checkbox" checked={securityAlerts} onChange={e => setSecurityAlerts(e.target.checked)} style={{ width: 18, height: 18, accentColor: '#10b981' }} />
              </label>

              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Product & Feature Updates</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Receive periodic announcements regarding new paper templates and tools</div>
                </div>
                <input type="checkbox" checked={marketingEmails} onChange={e => setMarketingEmails(e.target.checked)} style={{ width: 18, height: 18, accentColor: '#10b981' }} />
              </label>
            </div>

            <div style={{ marginBottom: 28 }}>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>Digest Frequency</label>
              <div style={{ display: 'flex', gap: 12 }}>
                {(['instant', 'daily', 'weekly'] as const).map(freq => (
                  <button
                    key={freq}
                    type="button"
                    onClick={() => setEmailDigest(freq)}
                    style={{
                      padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      border: '1px solid var(--border)',
                      background: emailDigest === freq ? '#10b981' : 'var(--bg-primary)',
                      color: emailDigest === freq ? '#fff' : 'var(--text-primary)',
                      textTransform: 'capitalize'
                    }}
                  >
                    {freq}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => showToast('Email preferences saved!')}
              style={{
                background: '#10b981', color: '#fff', border: 'none', borderRadius: 8,
                padding: '9px 24px', fontSize: 13.5, fontWeight: 700, cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)'
              }}
            >
              Save Email Preferences
            </button>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            TAB 8: NOTIFICATIONS
        ══════════════════════════════════════════════════════════ */}
        {activeTab === 'Notifications' && (
          <div className="card" style={{ padding: 32, borderRadius: 16, maxWidth: 680 }}>
            <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 20, marginBottom: 24 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>Notification Preferences</h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>Control real-time browser alerts and system audio cues.</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginBottom: 28 }}>
              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Sheet Generation Completed</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Notify when your passport sheet PDF is finished rendering</div>
                </div>
                <input type="checkbox" checked={sheetReadyAlert} onChange={e => setSheetReadyAlert(e.target.checked)} style={{ width: 18, height: 18, accentColor: '#10b981' }} />
              </label>

              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Low Token Quota Alert</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Get warned when AI Background removals drop below 20 credits</div>
                </div>
                <input type="checkbox" checked={lowTokenAlert} onChange={e => setLowTokenAlert(e.target.checked)} style={{ width: 18, height: 18, accentColor: '#10b981' }} />
              </label>

              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Push Notifications</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Receive native desktop banner notifications</div>
                </div>
                <input type="checkbox" checked={pushNotifications} onChange={e => setPushNotifications(e.target.checked)} style={{ width: 18, height: 18, accentColor: '#10b981' }} />
              </label>

              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>In-App Audio Chimes</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Play subtle audio chime when operations succeed</div>
                </div>
                <input type="checkbox" checked={inAppSounds} onChange={e => setInAppSounds(e.target.checked)} style={{ width: 18, height: 18, accentColor: '#10b981' }} />
              </label>
            </div>

            <button
              onClick={() => showToast('Notification settings saved!')}
              style={{
                background: '#10b981', color: '#fff', border: 'none', borderRadius: 8,
                padding: '9px 24px', fontSize: 13.5, fontWeight: 700, cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)'
              }}
            >
              Save Preferences
            </button>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            CREATOR TOOLS QUICK ACCESS SUITE
        ══════════════════════════════════════════════════════════ */}
        <div style={{ marginTop: 44, paddingTop: 32, borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 2px 0' }}>
                Quick Access Creator Suite
              </h3>
              <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: 0 }}>
                Jump directly into any URLM photo processing and print workflow.
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14 }}>
            {creatorTools.map((tool) => {
              const Icon = tool.icon
              return (
                <div
                  key={tool.label}
                  onClick={() => router.push(tool.href)}
                  className="card"
                  style={{
                    padding: '16px 18px',
                    borderRadius: 14,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: `${tool.color}18`, color: tool.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <Icon size={18} />
                    </div>
                    <ChevronRight size={14} color="var(--text-muted)" />
                  </div>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 3 }}>
                      {tool.label}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.3 }}>
                      {tool.desc}
                    </div>
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
