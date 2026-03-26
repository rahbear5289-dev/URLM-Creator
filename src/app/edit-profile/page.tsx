'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { 
  User, Camera, Mail, Phone, MapPin, Calendar, 
  Globe, Check, AlertCircle, Save, ArrowLeft,
  Loader2, Sparkles, Link as LinkIcon
} from 'lucide-react'

export default function EditProfilePage() {
  const router = useRouter()
  const { user } = useAuth()
  
  // States for all fields
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  
  // Field values
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [location, setLocation] = useState('')
  const [dob, setDob] = useState('')
  const [website, setWebsite] = useState('')
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>({})
  const [avatarUrl, setAvatarUrl] = useState('')
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (user) {
      fetchProfile()
    }
  }, [user])

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single()
      
      if (error) throw error
      
      if (data) {
        setProfile(data)
        setFullName(data.full_name || '')
        setUsername(data.username || '')
        setBio(data.bio || '')
        setPhoneNumber(data.phone_number || '')
        setLocation(data.location || '')
        setDob(data.dob || '')
        setWebsite(data.website || '')
        setSocialLinks(data.social_links || {})
        setAvatarUrl(data.avatar_url || '')
      }
    } catch (err) {
      console.error('Error fetching profile:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage({ type: '', text: '' })

    try {
      // 1. Check if username is unique if changed
      if (username !== profile?.username) {
        const { data: existing } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', username)
          .single()
        
        if (existing) {
          setMessage({ type: 'error', text: 'Username already taken!' })
          setSaving(false)
          return
        }
      }

      // 2. Update profiles table
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          username: username,
          bio: bio,
          phone_number: phoneNumber,
          location: location,
          dob: dob || null,
          website: website,
          social_links: socialLinks,
          updated_at: new Date().toISOString()
        })
        .eq('id', user?.id)

      if (error) throw error

      setMessage({ type: 'success', text: 'Profile updated successfully!' })
      // Redirect back to profile after short delay
      setTimeout(() => router.push('/profile'), 2000)
    } catch (err: unknown) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'An error occurred' })
    } finally {
      setSaving(false)
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true)
      const file = e.target.files?.[0]
      if (!file) return

      // Limit size to 2MB
      if (file.size > 2 * 1024 * 1024) {
        alert('Image size must be less than 2MB')
        return
      }

      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const filePath = `${user?.id}/${fileName}`

      // Upload to 'avatars' bucket
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      // Update profile with new avatar URL
      await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user?.id)

      setAvatarUrl(publicUrl)
      setMessage({ type: 'success', text: 'Avatar updated!' })
    } catch (err: unknown) {
      console.error('Upload error:', err)
      alert('Error uploading avatar')
    } finally {
      setUploading(false)
    }
  }

  const generateAIBio = () => {
    const bios = [
      "Passport photo expert & digital nomad. Making documentation easy one grid at a time.",
      "Creative soul with a passion for precise layouts and AI background removal.",
      "Efficiency enthusiast. Helping people get their print-ready sheets in seconds.",
      "Tech geek and URLM power user. Specializing in A4 PVC card designs."
    ]
    setBio(bios[Math.floor(Math.random() * bios.length)])
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
          <button 
            onClick={() => router.back()} 
            className="icon-btn" 
            style={{ width: 36, height: 36, borderRadius: 10 }}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
              Edit My Profile
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Complete your profile to unlock verified status and better suggestions.
            </p>
          </div>
        </div>

        {message.text && (
          <div className={`alert alert-${message.type}`} style={{ marginBottom: 24 }}>
            {message.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
            {message.text}
          </div>
        )}

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* 🖼️ Avatar Section */}
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 24, padding: 32 }}>
            <div style={{ position: 'relative' }}>
              <div style={{
                width: 100, height: 100, borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-blue))',
                overflow: 'hidden', border: '4px solid var(--bg-secondary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: 32, fontWeight: 800, color: 'white' }}>
                    {(fullName || user?.email || '').slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              <label 
                htmlFor="avatar-upload" 
                style={{
                  position: 'absolute', bottom: 0, right: 0,
                  width: 32, height: 32, borderRadius: '50%',
                  background: 'var(--accent-purple)', color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', border: '2px solid var(--bg-secondary)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                }}
              >
                {uploading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
              </label>
              <input 
                id="avatar-upload" 
                type="file" 
                onChange={handleAvatarUpload} 
                accept="image/*" 
                style={{ display: 'none' }} 
                disabled={uploading}
              />
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                Profile Photo
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
                Professional avatars help build trust. JPEG or PNG, max 2MB.
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <label htmlFor="avatar-upload" className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
                  Upload New
                </label>
                <button 
                  type="button" 
                  className="btn btn-sm" 
                  style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
                  onClick={() => setAvatarUrl('')}
                >
                  Remove
                </button>
              </div>
            </div>
          </div>

          {/* 👤 Basic Info */}
          <div className="card">
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              <User size={18} color="var(--accent-purple)" />
              Basic Information
            </h3>
            
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input 
                  id="full_name"
                  className="form-input" 
                  value={fullName} 
                  onChange={(e) => setFullName(e.target.value)} 
                  placeholder="e.g. Alex Rivera" 
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Username</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 14 }}>@</span>
                  <input 
                    id="username"
                    className="form-input" 
                    value={username} 
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))} 
                    style={{ paddingLeft: 28 }}
                    placeholder="unique_username"
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Email Address (Locked)</label>
                <div className="input-with-icon">
                  <Mail size={16} />
                  <input className="form-input" value={user?.email} disabled style={{ opacity: 0.6 }} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <div className="input-with-icon">
                  <Phone size={16} />
                  <input 
                    id="phone"
                    className="form-input" 
                    value={phoneNumber} 
                    onChange={(e) => setPhoneNumber(e.target.value)} 
                    placeholder="+1 234 567 890" 
                  />
                </div>
              </div>
            </div>

            <div className="form-group" style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <label className="form-label" style={{ margin: 0 }}>Bio</label>
                <button 
                  type="button" 
                  onClick={generateAIBio}
                  style={{ background: 'none', border: 'none', color: 'var(--accent-purple-light)', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}
                >
                  <Sparkles size={12} /> AI Suggestion
                </button>
              </div>
              <textarea 
                id="bio"
                className="form-input" 
                value={bio} 
                onChange={(e) => setBio(e.target.value)} 
                rows={3}
                maxLength={150}
                placeholder="Tell us a bit about yourself..."
                style={{ resize: 'none' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                {bio.length}/150 characters
              </div>
            </div>
          </div>

          {/* 🛠️ Additional Details */}
          <div className="grid-2">
            <div className="card">
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20 }}>
                🛠️ Details
              </h3>
              <div className="form-group">
                <label className="form-label">Location</label>
                <div className="input-with-icon">
                  <MapPin size={16} />
                  <input 
                    id="location"
                    className="form-input" 
                    value={location} 
                    onChange={(e) => setLocation(e.target.value)} 
                    placeholder="New York, USA" 
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Date of Birth</label>
                <div className="input-with-icon">
                  <Calendar size={16} />
                  <input 
                    id="dob"
                    type="date"
                    className="form-input" 
                    value={dob} 
                    onChange={(e) => setDob(e.target.value)} 
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Personal Website</label>
                <div className="input-with-icon">
                  <Globe size={16} />
                  <input 
                    id="website"
                    className="form-input" 
                    value={website} 
                    onChange={(e) => setWebsite(e.target.value)} 
                    placeholder="https://yourwork.com" 
                  />
                </div>
              </div>
            </div>

            <div className="card">
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20 }}>
                🔗 Social Links
              </h3>
              <div className="form-group">
                <label className="form-label">Instagram</label>
                <div className="input-with-icon">
                  <LinkIcon size={16} />
                  <input 
                    className="form-input" 
                    value={socialLinks.instagram || ''} 
                    onChange={(e) => setSocialLinks({...socialLinks, instagram: e.target.value})} 
                    placeholder="username" 
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">LinkedIn</label>
                <div className="input-with-icon">
                  <LinkIcon size={16} />
                  <input 
                    className="form-input" 
                    value={socialLinks.linkedin || ''} 
                    onChange={(e) => setSocialLinks({...socialLinks, linkedin: e.target.value})} 
                    placeholder="your-profile" 
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Twitter / X</label>
                <div className="input-with-icon">
                  <LinkIcon size={16} />
                  <input 
                    className="form-input" 
                    value={socialLinks.twitter || ''} 
                    onChange={(e) => setSocialLinks({...socialLinks, twitter: e.target.value})} 
                    placeholder="handle" 
                  />
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 12 }}>
            <button 
              type="button" 
              onClick={() => router.back()} 
              className="btn btn-secondary"
              style={{ paddingLeft: 24, paddingRight: 24 }}
            >
              Cancel
            </button>
            <button 
              id="submit-profile-btn"
              type="submit" 
              className="btn btn-primary" 
              disabled={saving}
              style={{ paddingLeft: 32, paddingRight: 32, display: 'flex', alignItems: 'center', gap: 8 }}
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save My Profile
            </button>
          </div>

        </form>
      </div>
    </DashboardLayout>
  )
}
