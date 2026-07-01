'use client'

import { useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import {
  Mail, Phone, MapPin, Calendar,
  Globe, Link as LinkIcon,
  ExternalLink, Edit3, Settings, LogOut,
  CalendarDays, Share2, BadgeCheck, Loader2, Check
} from 'lucide-react'

export default function ProfilePage() {
  const router = useRouter()
  const { user, signOut } = useAuth()
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (user) {
      fetchProfile()
    } else {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const fetchProfile = async () => {
    if (!user?.id) {
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      if (error) throw error
      setProfile(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : JSON.stringify(err)
      console.error('Error fetching profile:', message, err)
    } finally {
      setLoading(false)
    }
  }

  const handleShare = () => {
    const url = typeof window !== 'undefined' ? `${window.location.origin}/profile/${username || user?.id}` : ''
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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

  const profileData = profile as {
    full_name?: string
    avatar_url?: string
    username?: string
    bio?: string
    email?: string
    phone_number?: string
    location?: string
    dob?: string
    website?: string
    social_links?: Record<string, string>
    verified_badge?: boolean
    created_at?: string
  } | null

  const {
    full_name = '',
    avatar_url = '',
    username = '',
    bio = '',
    email = '',
    phone_number = '',
    location = '',
    dob = '',
    website = '',
    social_links = {},
    verified_badge = false,
    created_at = ''
  } = profileData || {}

  const initials = ((full_name as string) || (email as string) || '').slice(0, 2).toUpperCase()
  const memberSince = created_at ? new Date(created_at as string).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'March 2024'

  return (
    <DashboardLayout>
      <div style={{ maxWidth: 900, margin: '0 auto', paddingBottom: 60 }}>

        {/* Profile Header Card */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 24, borderRadius: 24 }}>
          {/* Banner */}
          <div style={{ height: 160, background: 'linear-gradient(90deg, #7c5cf6, #4f8ef7)', position: 'relative' }}>
            <button 
              id="share-profile-btn" 
              onClick={handleShare}
              style={{ position: 'absolute', top: 20, right: 20, background: copied ? 'rgba(52, 211, 153, 0.4)' : 'rgba(255,255,255,0.2)', border: 'none', color: 'white', padding: '8px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, backdropFilter: 'blur(10px)', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              {copied ? <Check size={14} /> : <Share2 size={14} />} 
              {copied ? 'Copied!' : 'Share Profile'}
            </button>
          </div>

          <div style={{ padding: '0 40px 40px', marginTop: -50, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 20 }}>
              <div style={{
                width: 120, height: 120, borderRadius: '50%',
                background: 'var(--bg-card)', border: '6px solid var(--bg-card)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden'
              }}>
                {avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatar_url as string} alt={full_name as string} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: 40, fontWeight: 800, color: 'var(--accent-purple)' }}>{initials}</span>
                )}
              </div>

              <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
                <button
                  id="go-edit-profile"
                  onClick={() => router.push('/edit-profile')}
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px', borderRadius: 12, background: 'var(--accent-purple)', borderColor: 'var(--accent-purple)' }}
                >
                  <Edit3 size={16} /> Edit Profile
                </button>
                <button
                  id="go-settings"
                  onClick={() => router.push('/settings')}
                  className="btn btn-secondary"
                  style={{ width: 44, height: 44, padding: 0, borderRadius: 12, border: '1px solid var(--border)' }}
                >
                  <Settings size={20} />
                </button>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  {full_name || 'Anonymous User'}
                </h1>
                {verified_badge && <BadgeCheck size={24} color="#34d399" fill="#34d39922" />}
              </div>
              <p style={{ fontSize: 15, color: 'var(--accent-purple-light)', fontWeight: 600, marginTop: 4 }}>
                @{username || 'user' + user?.id?.slice(0, 4)}
              </p>

              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: 600, marginTop: 12 }}>
                {bio || "No bio yet. Tell the world who you are!"}
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 20 }}>
                {location && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)' }}>
                    <MapPin size={14} /> {location}
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)' }}>
                  <CalendarDays size={14} /> Member since {memberSince}
                </div>
                {website && (
                  <a href={website.startsWith('http') ? website : `https://${website}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--accent-purple-light)', textDecoration: 'none', fontWeight: 600 }}>
                    <Globe size={14} /> Website <ExternalLink size={10} />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }}>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Contact Details */}
            <div className="card">
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20 }}>Contact Information</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(124, 92, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Mail size={18} color="var(--accent-purple)" />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>Primary Email</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{email}</div>
                  </div>
                </div>
                {phone_number && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(52, 211, 153, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Phone size={18} color="#34d399" />
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>Phone Number</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{phone_number}</div>
                    </div>
                  </div>
                )}
                {dob && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Calendar size={18} color="#ef4444" />
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>Date of Birth</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{new Date(dob).toLocaleDateString()}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Account Management Summary */}
            <div className="card" style={{ background: 'rgba(239, 68, 68, 0.03)', borderColor: 'rgba(239, 68, 68, 0.1)' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#ef4444', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                Danger Zone
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.5 }}>
                Want to take a break or leave the platform? Deleting your account will erase all your passport photo history.
              </p>
              <button onClick={signOut} className="btn btn-secondary btn-sm" style={{ width: '100%', color: '#ef4444', borderColor: '#ef444422' }}>
                <LogOut size={14} /> Log Out from Account
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Social Presence */}
            <div className="card">
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20 }}>Social Presence</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {Object.entries(social_links || {}).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '16px 0' }}>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>No social links connected.</p>
                    <button 
                      onClick={() => router.push('/edit-profile')}
                      className="btn btn-secondary btn-sm"
                      style={{ borderRadius: 8, fontSize: 11 }}
                    >
                      Connect Socials
                    </button>
                  </div>
                ) : (
                  Object.entries(social_links || {}).map(([key, value]) => {
                    if (!value) return null
                    const icons: Record<string, ReactNode> = { instagram: <LinkIcon size={18} />, linkedin: <LinkIcon size={18} />, twitter: <LinkIcon size={18} /> }
                    return (
                      <a key={key} href={value.startsWith('http') ? value : `https://${key}.com/${value}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: 'var(--bg-primary)', borderRadius: 12, color: 'var(--text-primary)', textDecoration: 'none', transition: 'all 0.2s' }} className="social-link-item">
                        {icons[key]}
                        <span style={{ fontSize: 14, fontWeight: 600, textTransform: 'capitalize' }}>{key}</span>
                        <ExternalLink size={12} style={{ marginLeft: 'auto', opacity: 0.5 }} />
                      </a>
                    )
                  })
                )}
              </div>
            </div>

            {/* Profile Visibility */}
            <div className="card">
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Profile Privacy</h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>Control who sees your activity.</p>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderTop: '1px solid var(--border)' }}>
                <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>Public Profile</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: profile?.is_public ? '#34d399' : 'var(--text-muted)' }}>{profile?.is_public ? 'ENABLED' : 'DISABLED'}</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderTop: '1px solid var(--border)' }}>
                <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>Show Email</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: profile?.show_email ? '#34d399' : 'var(--text-muted)' }}>{profile?.show_email ? 'ENABLED' : 'DISABLED'}</div>
              </div>
              <button onClick={() => router.push('/settings')} className="btn btn-secondary btn-sm" style={{ width: '100%', marginTop: 8 }}>
                Modify Privacy Settings
              </button>
            </div>
          </div>

        </div>
      </div>
    </DashboardLayout>
  )
}
