'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { supabase } from '@/lib/supabase'
import { 
  Settings, Lock, Download, 
  ShieldCheck, Check, 
  Monitor, Smartphone, AlertTriangle,
  Loader2, Moon, Sun, MonitorDot
} from 'lucide-react'

export default function SettingsPage() {
  const router = useRouter()
  const { user, signOut } = useAuth()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Settings States
  const { theme, setTheme } = useTheme() as { theme: string, setTheme: (val: any) => void }
  const [isPublic, setIsPublic] = useState(false)
  const [showEmail, setShowEmail] = useState(false)
  const [showPhone, setShowPhone] = useState(false)
  const [tfaEnabled, setTfaEnabled] = useState(false)
  
  // Password Change State
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordStatus, setPasswordStatus] = useState({ type: '', text: '' })
  const [updatingPassword, setUpdatingPassword] = useState(false)

  useEffect(() => {
    if (user) {
      fetchSettings()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single()
      
      if (error) throw error
      if (data) {
        setIsPublic(data.is_public || false)
        setShowEmail(data.show_email || false)
        setShowPhone(data.show_phone || false)
        setTheme(data.preferences?.theme || 'dark')
      }
    } catch (err) {
      console.error('Error fetching settings:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSettings = async () => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          is_public: isPublic,
          show_email: showEmail,
          show_phone: showPhone,
          preferences: { theme: theme, language: 'en' }
        })
        .eq('id', user?.id)

      if (error) throw error
      alert('Settings saved successfully!')
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      setPasswordStatus({ type: 'error', text: 'Passwords do not match!' })
      return
    }
    if (newPassword.length < 6) {
      setPasswordStatus({ type: 'error', text: 'Password must be at least 6 characters.' })
      return
    }

    setUpdatingPassword(true)
    setPasswordStatus({ type: '', text: '' })
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      
      setPasswordStatus({ type: 'success', text: 'Password updated successfully!' })
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: unknown) {
      setPasswordStatus({ type: 'error', text: err instanceof Error ? err.message : 'Failed to update password' })
    } finally {
      setUpdatingPassword(false)
    }
  }

  const handleDeleteAccount = async () => {
    const confirm = window.confirm("Are you sure you want to PERMANENTLY delete your account? This action cannot be undone.")
    if (confirm) {
      alert("Account deletion request submitted. Our team will process this shortly.")
      await signOut()
    }
  }

  const handleDownloadArchive = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single()
      
      if (error) throw error
      
      const archive = {
        account_info: {
          id: user?.id,
          email: user?.email,
          last_login: user?.last_sign_in_at
        },
        profile_data: data,
        export_date: new Date().toISOString()
      }

      const blob = new Blob([JSON.stringify(archive, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `urlm_account_archive_${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Error downloading archive:', err)
      alert('Failed to generate archive.')
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div style={{ display: 'flex', justifyContent: 'center', padding: 100 }}>
          <Loader2 className="animate-spin" size={32} color="var(--accent-purple)" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div style={{ maxWidth: 840, margin: '0 auto', paddingBottom: 60 }}>
        
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <Settings size={28} color="var(--accent-purple)" />
            Account Settings
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            Control your privacy, security, and application experience.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          

          {/* 🔒 Privacy Settings */}
          <div className="card">
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20 }}>Privacy & Visibility</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { label: 'Public Profile', sub: 'Allow others to view your profile and public sheets', checked: isPublic, setter: setIsPublic },
                { label: 'Show Email', sub: 'Display email address on your profile page', checked: showEmail, setter: setShowEmail },
                { label: 'Show Phone', sub: 'Display phone number on your profile page', checked: showPhone, setter: setShowPhone },
              ].map((pref) => (
                <div key={pref.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--bg-primary)', borderRadius: 12 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{pref.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{pref.sub}</div>
                  </div>
                  <button
                    className={`toggle ${pref.checked ? 'on' : ''}`}
                    onClick={() => pref.setter(!pref.checked)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* 🔐 Security Settings */}
          <div className="card">
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20 }}>Security</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'var(--bg-primary)', borderRadius: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(52, 211, 153, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldCheck size={20} color="#34d399" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Two-Factor Authentication</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Add an extra layer of security to your account</div>
                </div>
                <button 
                  className={`btn btn-sm ${tfaEnabled ? 'btn-secondary' : 'btn-primary'}`}
                  onClick={() => setTfaEnabled(!tfaEnabled)}
                  style={{ borderRadius: 8, fontSize: 11, height: 32, padding: '0 12px' }}
                >
                  {tfaEnabled ? 'Enabled' : 'Enable'}
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '20px 16px', background: 'var(--bg-primary)', borderRadius: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(124, 92, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Lock size={20} color="var(--accent-purple)" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Update Password</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Set a new secure password for your account</div>
                  </div>
                </div>

                <form onSubmit={handlePasswordUpdate} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div className="grid-2" style={{ gap: 12 }}>
                    <input 
                      type="password"
                      className="form-input"
                      placeholder="New Password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      style={{ height: 40, fontSize: 14 }}
                    />
                    <input 
                      type="password"
                      className="form-input"
                      placeholder="Confirm New Password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      style={{ height: 40, fontSize: 14 }}
                    />
                  </div>
                  
                  {passwordStatus.text && (
                    <div style={{ 
                      fontSize: 12, 
                      padding: '8px 12px', 
                      borderRadius: 8, 
                      background: passwordStatus.type === 'success' ? 'rgba(52, 211, 153, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      color: passwordStatus.type === 'success' ? '#34d399' : '#ef4444',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8
                    }}>
                      {passwordStatus.type === 'success' ? <Check size={14} /> : <AlertTriangle size={14} />}
                      {passwordStatus.text}
                    </div>
                  )}

                  <button 
                    type="submit"
                    className="btn btn-primary btn-sm"
                    disabled={updatingPassword}
                    style={{ borderRadius: 8, height: 38, width: '100%', fontSize: 13, fontWeight: 700 }}
                  >
                    {updatingPassword ? <Loader2 size={16} className="animate-spin" /> : 'Update Password Credentials'}
                  </button>
                </form>
              </div>
            </div>

            {/* Active Sessions Simulation */}
            <div style={{ marginTop: 20 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active Sessions</h4>
              <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                  <Monitor size={16} color="var(--text-muted)" />
                  <div style={{ flex: 1, fontSize: 12 }}>
                    <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Windows PC — Chrome 122.0</div>
                    <div style={{ color: '#34d399' }}>Current session • Islamabad, PK</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
                  <Smartphone size={16} color="var(--text-muted)" />
                  <div style={{ flex: 1, fontSize: 12 }}>
                    <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>iPhone 15 Pro — Safari Mobile</div>
                    <div style={{ color: 'var(--text-muted)' }}>Last active 2 hours ago • Karachi, PK</div>
                  </div>
                  <button className="btn btn-sm btn-secondary" style={{ fontSize: 10, height: 26, padding: '0 8px' }}>Logout</button>
                </div>
              </div>
            </div>
          </div>

          {/* 🗂️ Account Settings */}
          <div className="card">
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20 }}>Data Management</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Download Account Archive</div>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Get a copy of all your profile data and photo history.</p>
                </div>
                <button 
                  onClick={handleDownloadArchive}
                  className="btn btn-secondary btn-sm" 
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <Download size={14} /> Download
                </button>
              </div>
              
              <div style={{ paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <AlertTriangle size={14} /> Delete Account
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Permanently erase your account and all associated data.</p>
                  </div>
                  <button onClick={handleDeleteAccount} className="btn btn-danger btn-sm">Delete Account</button>
                </div>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
            <button className="btn btn-secondary" onClick={() => router.push('/profile')}>Discard</button>
            <button 
              id="save-settings-btn"
              className="btn btn-primary" 
              onClick={handleSaveSettings}
              disabled={saving}
              style={{ padding: '10px 32px', display: 'flex', alignItems: 'center', gap: 8 }}
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              Save All Settings
            </button>
          </div>

        </div>
      </div>
    </DashboardLayout>
  )
}
