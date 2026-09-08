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
  CheckCircle2, ArrowRight
} from 'lucide-react'

type SettingsTab = 'My details' | 'Profile' | 'Password' | 'Team' | 'Billings' | 'Plan' | 'Email' | 'Notifications'

export default function SettingsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { theme, setTheme } = useTheme() as { theme: string; setTheme: (t: any) => void }

  const [activeTab, setActiveTab] = useState<SettingsTab>('Billings')
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')

  // Billings Form State (matching reference image 2)
  const [cardName, setCardName] = useState('Mayad Ahmed')
  const [cardExpiry, setCardExpiry] = useState('02 / 2028')
  const [cardNumber, setCardNumber] = useState('8269 9620 9292 2538')
  const [cardCvv, setCardCvv] = useState('884')
  const [contactEmailChoice, setContactEmailChoice] = useState<'existing' | 'custom'>('existing')
  const [customEmail, setCustomEmail] = useState('')

  // Password State
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // My details State
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || 'Mayad Ahmed')
  const [email, setEmail] = useState(user?.email || 'mayadahmed@ofspace.co')

  // Notification states
  const [emailAlerts, setEmailAlerts] = useState(true)
  const [billingAlerts, setBillingAlerts] = useState(true)

  // Billing History Rows (matching reference image 2)
  const [billingRows, setBillingRows] = useState([
    {
      id: '1',
      selected: false,
      invoice: 'Account Sale',
      date: 'Apr 14, 2024',
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
      date: 'Jun 24, 2024',
      amount: '$1,050',
      status: 'Cancelled',
      statusColor: '#ef4444',
      statusBg: 'rgba(239, 68, 68, 0.12)',
      tracking: 'AZ938540353US',
      address: '96 Grange Road, Peterborough'
    },
    {
      id: '3',
      selected: true,
      invoice: 'Netflix Subscription',
      date: 'Feb 28, 2024',
      amount: '$800',
      status: 'Refund',
      statusColor: '#06b6d4',
      statusBg: 'rgba(6, 182, 212, 0.12)',
      tracking: '3S331605504US',
      address: '2 New Street, Harrogate'
    }
  ])

  useEffect(() => {
    if (user?.email) {
      setEmail(user.email)
    }
  }, [user])

  const toggleRowSelect = (id: string) => {
    setBillingRows(rows => rows.map(r => r.id === id ? { ...r, selected: !r.selected } : r))
  }

  const handleSaveCard = (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setTimeout(() => {
      setSaving(false)
      setSaveMessage('Billing details updated successfully!')
      setTimeout(() => setSaveMessage(''), 3000)
    }, 600)
  }

  const tabs: SettingsTab[] = [
    'My details', 'Profile', 'Password', 'Team', 'Billings', 'Plan', 'Email', 'Notifications'
  ]

  return (
    <DashboardLayout>
      <div style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: 60 }}>
        
        {/* Header (matching reference image 2) */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px 0', letterSpacing: '-0.5px' }}>
            Settings
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>
            Manage your account settings and preferences.
          </p>
        </div>

        {/* Tab Navigation (matching reference image 2) */}
        <div style={{
          display: 'flex',
          gap: 24,
          borderBottom: '1px solid var(--border)',
          marginBottom: 32,
          overflowX: 'auto'
        }}>
          {tabs.map(tab => {
            const isActive = activeTab === tab
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: '12px 4px',
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
                    background: '#111827',
                    borderRadius: 2
                  }} />
                )}
              </button>
            )
          })}
        </div>

        {saveMessage && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 10,
            padding: '10px 16px',
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            color: '#10b981',
            fontSize: 13.5,
            fontWeight: 600
          }}>
            <Check size={16} /> {saveMessage}
          </div>
        )}

        {/* TAB: Billings (Matching reference image 2) */}
        {activeTab === 'Billings' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
            
            {/* Section 1: Payment Method */}
            <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 36 }}>
              <div style={{ marginBottom: 20 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>
                  Payment Method
                </h2>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
                  Update your billing details and address.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 280px) 1fr', gap: 32, alignItems: 'start' }}>
                {/* Left Card Details col */}
                <div>
                  <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>
                    Card Details
                  </h4>
                  <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: '0 0 16px 0', lineHeight: 1.4 }}>
                    Update your billing details and address.
                  </p>
                  <button
                    type="button"
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

                {/* Right Inputs Form */}
                <form onSubmit={handleSaveCard} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
                        placeholder="MM / YYYY"
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
                        <div style={{
                          position: 'absolute',
                          left: 12,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: -4
                        }}>
                          <span style={{ width: 14, height: 14, borderRadius: '50%', background: '#eb001b', display: 'inline-block' }} />
                          <span style={{ width: 14, height: 14, borderRadius: '50%', background: '#f79e1b', display: 'inline-block', marginLeft: -6, opacity: 0.85 }} />
                        </div>
                        <input
                          type="text"
                          className="input"
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value)}
                          placeholder="Card Number"
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
                        placeholder="•••"
                        maxLength={4}
                        style={{ borderRadius: 8, fontSize: 13.5 }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
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
                        cursor: 'pointer'
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
                        {email}
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

            {/* Section 3: Billing History */}
            <div>
              <div style={{ marginBottom: 16 }}>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>
                  Billing History
                </h4>
                <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: 0 }}>
                  See the transaction you made
                </p>
              </div>

              {/* Table (matching reference image 2) */}
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
                          <div style={{ fontSize: 12.5, fontWeight: 600, color: '#3b82f6', marginBottom: 2 }}>
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

        {/* TAB: My Details */}
        {activeTab === 'My details' && (
          <div className="card" style={{ padding: 28, borderRadius: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>Personal Profile</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 650 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>Full Name</label>
                <input type="text" className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>Email</label>
                <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>
            <button
              onClick={() => {
                setSaveMessage('Profile details saved successfully!')
                setTimeout(() => setSaveMessage(''), 3000)
              }}
              className="btn btn-primary"
              style={{ marginTop: 20, borderRadius: 8 }}
            >
              Save Changes
            </button>
          </div>
        )}

        {/* TAB: Password */}
        {activeTab === 'Password' && (
          <div className="card" style={{ padding: 28, borderRadius: 16, maxWidth: 540 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>Change Password</h3>
            <form onSubmit={(e) => {
              e.preventDefault()
              setSaveMessage('Password updated successfully!')
              setCurrentPassword('')
              setNewPassword('')
              setConfirmPassword('')
              setTimeout(() => setSaveMessage(''), 3000)
            }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>Current Password</label>
                <input type="password" className="input" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>New Password</label>
                <input type="password" className="input" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>Confirm New Password</label>
                <input type="password" className="input" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
              </div>
              <button type="submit" className="btn btn-primary" style={{ marginTop: 10, borderRadius: 8 }}>
                Update Password
              </button>
            </form>
          </div>
        )}

        {/* TAB: Plan */}
        {activeTab === 'Plan' && (
          <div className="card" style={{ padding: 28, borderRadius: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14 }}>Subscription & Tokens</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-primary)', padding: 18, borderRadius: 12, border: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>Professional Creator Plan</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Unlimited passport sheet downloads and AI enhancement</div>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, background: '#10b981', color: '#fff', padding: '4px 12px', borderRadius: 9999 }}>Active</span>
            </div>
          </div>
        )}

        {/* TAB: Notifications */}
        {activeTab === 'Notifications' && (
          <div className="card" style={{ padding: 28, borderRadius: 16, maxWidth: 600 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>Notification Preferences</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Email Notifications</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Receive updates on batch sheet generation and export readiness</div>
                </div>
                <input type="checkbox" checked={emailAlerts} onChange={e => setEmailAlerts(e.target.checked)} style={{ width: 18, height: 18, accentColor: '#10b981' }} />
              </label>
              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Invoice & Billing Alerts</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Get notified when a new invoice is issued or refund processed</div>
                </div>
                <input type="checkbox" checked={billingAlerts} onChange={e => setBillingAlerts(e.target.checked)} style={{ width: 18, height: 18, accentColor: '#10b981' }} />
              </label>
            </div>
          </div>
        )}

        {/* OTHER TABS FALLBACK */}
        {['Profile', 'Team', 'Email'].includes(activeTab) && (
          <div className="card" style={{ padding: 40, textAlign: 'center', borderRadius: 16 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
              {activeTab} Management
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 460, margin: '0 auto 20px' }}>
              Settings for {activeTab.toLowerCase()} are synchronized with your organization profile.
            </p>
            <button onClick={() => setActiveTab('Billings')} className="btn btn-secondary" style={{ borderRadius: 8, fontSize: 13 }}>
              Back to Billings
            </button>
          </div>
        )}

      </div>
    </DashboardLayout>
  )
}
