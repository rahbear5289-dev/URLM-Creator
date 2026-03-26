'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { 
  Mail, MapPin, CalendarDays, Globe, 
  ExternalLink, BadgeCheck, Loader2, ArrowLeft,
  Lock, Link as LinkIcon
} from 'lucide-react'

export default function PublicProfilePage() {
  const { id: identifier } = useParams()
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (identifier) {
      fetchPublicProfile()
    }
  }, [identifier])

  const fetchPublicProfile = async () => {
    try {
      setLoading(true)
      // Query by ID or Username
      const { data, error: pgError } = await supabase
        .from('profiles')
        .select('*')
        .or(`id.eq.${identifier},username.eq.${identifier}`)
        .single()

      if (pgError) throw pgError
      
      if (!data.is_public) {
        setError('private')
      } else {
        setProfile(data)
      }
    } catch (err) {
      console.error('Error fetching public profile:', err)
      setError('not_found')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <Loader2 className="animate-spin" size={32} color="var(--accent-purple)" />
      </div>
    )
  }

  if (error === 'private') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', padding: 20, textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <Lock size={32} color="#ef4444" />
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>This Profile is Private</h1>
        <p style={{ color: 'var(--text-secondary)', maxWidth: 400, marginBottom: 24 }}>
          The user has chosen to keep their profile hidden. You can only view public profiles on URLM.
        </p>
        <button onClick={() => router.push('/')} className="btn btn-primary" style={{ padding: '10px 24px', borderRadius: 12 }}>
          Back to Home
        </button>
      </div>
    )
  }

  if (error === 'not_found' || !profile) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', padding: 20, textAlign: 'center' }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>User Not Found</h1>
        <p style={{ color: 'var(--text-secondary)', maxWidth: 400, marginBottom: 24 }}>
          We couldn't find the user you're looking for. They may have changed their username or deleted their account.
        </p>
        <button onClick={() => router.push('/')} className="btn btn-secondary" style={{ padding: '10px 24px', borderRadius: 12 }}>
          Back to Home
        </button>
      </div>
    )
  }

  const {
    full_name, avatar_url, username, bio, location, website, social_links, verified_badge, created_at, show_email, email
  } = profile

  const initials = (full_name || username || 'U').slice(0, 2).toUpperCase()
  const memberSince = new Date(created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingBottom: 80 }}>
      {/* Header / Nav */}
      <nav style={{ padding: '20px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', background: 'var(--bg-card)', marginBottom: 40 }}>
        <button onClick={() => router.back()} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
          <ArrowLeft size={18} /> Back
        </button>
        <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--text-primary)' }}>URLM Profile</div>
        <div style={{ width: 60 }}></div>
      </nav>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 20px' }}>
        <div className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: 32, border: '1px solid var(--border)' }}>
          {/* Banner */}
          <div style={{ height: 180, background: 'linear-gradient(135deg, #7c5cf6, #4f8ef7)' }} />
          
          <div style={{ padding: '0 40px 40px', marginTop: -60 }}>
            <div style={{
              width: 120, height: 120, borderRadius: '50%',
              background: 'var(--bg-card)', border: '6px solid var(--bg-card)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden', marginBottom: 20
            }}>
              {avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatar_url} alt={full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: 40, fontWeight: 800, color: 'var(--accent-purple)' }}>{initials}</span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1 style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                {full_name || 'Anonymous User'}
              </h1>
              {verified_badge && <BadgeCheck size={28} color="#34d399" fill="#34d39922" />}
            </div>
            
            <p style={{ fontSize: 16, color: 'var(--accent-purple-light)', fontWeight: 600, marginTop: 4 }}>
              @{username || 'user'}
            </p>

            <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.6, marginTop: 16, maxWidth: 600 }}>
              {bio || "This user is keeping it mysterious. No bio available yet."}
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, marginTop: 24 }}>
              {location && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: 'var(--text-muted)' }}>
                  <MapPin size={16} /> {location}
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: 'var(--text-muted)' }}>
                <CalendarDays size={16} /> Joined {memberSince}
              </div>
              {website && (
                <a href={website.startsWith('http') ? website : `https://${website}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: 'var(--accent-purple-light)', textDecoration: 'none', fontWeight: 600 }}>
                  <Globe size={16} /> Website <ExternalLink size={12} />
                </a>
              )}
              {show_email && email && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: 'var(--text-muted)' }}>
                  <Mail size={16} /> {email}
                </div>
              )}
            </div>

            {/* Public Socials */}
            {social_links && Object.values(social_links).some(v => v) && (
              <div style={{ marginTop: 40, paddingTop: 32, borderTop: '1px solid var(--border)' }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20 }}>Social Presence</h3>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {Object.entries(social_links).map(([key, value]) => {
                    if (!value) return null
                    return (
                      <a 
                        key={key} 
                        href={String(value).startsWith('http') ? String(value) : `https://${key}.com/${value}`} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        style={{ 
                          display: 'flex', alignItems: 'center', gap: 10, padding: '12px 20px', 
                          background: 'var(--bg-primary)', borderRadius: 16, border: '1px solid var(--border)',
                          color: 'var(--text-primary)', textDecoration: 'none', transition: 'all 0.2s' 
                        }}
                      >
                        <LinkIcon size={18} color="var(--accent-purple)" />
                        <span style={{ fontSize: 14, fontWeight: 700, textTransform: 'capitalize' }}>{key}</span>
                      </a>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Public Documents / Sheets Section */}
            <div style={{ marginTop: 40, paddingTop: 32, borderTop: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20 }}>Public Documents</h3>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 24 }}>
                Explore document sheets and projects shared by {full_name || username}.
              </p>
              <div style={{ padding: '60px 20px', background: 'var(--bg-primary)', borderRadius: 24, border: '2px dashed var(--border)', textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>📂</div>
                <p style={{ fontSize: 15, color: 'var(--text-secondary)', margin: 0 }}>
                  Searching for public sheets from {full_name || username}...
                </p>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>
                  No public sheets shared yet.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
