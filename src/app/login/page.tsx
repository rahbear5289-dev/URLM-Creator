'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { 
  Umbrella, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  Home, 
  ShieldAlert, 
  ChevronDown, 
  ChevronRight,
  TrendingDown,
  Sparkles,
  Activity,
  Layers,
  FileText,
  Search,
  Check
} from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Check existing session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace('/dashboard')
      }
    })
  }, [router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
    } else {
      router.push('/dashboard')
    }
    setLoading(false)
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } }
    })
    if (error) {
      setError(error.message)
    } else {
      setSuccess('Account created! Please check your email to verify.')
    }
    setLoading(false)
  }

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) {
      setError(error.message)
    } else {
      setSuccess('Password reset link sent to your email!')
    }
    setLoading(false)
  }

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` }
    })
  }

  return (
    <div className="sentinel-auth-bg">
      <div className="sentinel-container">
        
        {/* ================= LEFT COLUMN ================= */}
        <div className="sentinel-left">
          {/* Subtle decorative geometric wireframe backdrop */}
          <div className="sentinel-wireframe-pattern" />

          {/* Top Brand */}
          <div style={{ position: 'relative', zIndex: 3, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20, fontWeight: 800, color: '#111827', letterSpacing: '-0.4px' }}>
              Sentinel
            </span>
          </div>

          {/* Centered Form Content */}
          <div className="sentinel-form-box">
            
            {/* Green Umbrella Badge */}
            <div className="sentinel-icon-badge">
              <Umbrella size={26} color="#ffffff" strokeWidth={2.4} />
            </div>

            {/* Title & Subtitle */}
            <h1 style={{
              fontSize: 24,
              fontWeight: 700,
              color: '#111827',
              textAlign: 'center',
              letterSpacing: '-0.3px',
              marginBottom: 6
            }}>
              {mode === 'login' && 'Sign in to your account'}
              {mode === 'signup' && 'Create your account'}
              {mode === 'forgot' && 'Reset your password'}
            </h1>

            <p style={{
              fontSize: 13.5,
              color: '#6b7280',
              textAlign: 'center',
              marginBottom: 28,
              lineHeight: 1.4
            }}>
              {mode === 'login' && 'Enter your email or connect your account to sign in.'}
              {mode === 'signup' && 'Enter your details to create a new Sentinel account.'}
              {mode === 'forgot' && 'Enter your registered email to receive reset instructions.'}
            </p>

            {/* Error & Success Alerts */}
            {error && (
              <div style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 12,
                padding: '10px 14px',
                color: '#dc2626',
                fontSize: 13,
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: 12,
                padding: '10px 14px',
                color: '#16a34a',
                fontSize: 13,
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                <CheckCircle2 size={16} />
                <span>{success}</span>
              </div>
            )}

            {/* Form */}
            {mode === 'login' && (
              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 6 }}>
                    Email
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    className="sentinel-pill-input"
                    placeholder="jayson_marhiela@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 6 }}>
                    Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      className="sentinel-pill-input"
                      placeholder="••••••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      style={{ paddingRight: 48 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: 18,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#9ca3af',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>

                {/* Remember me & Forgot Password */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2, marginBottom: 4 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#374151', fontWeight: 500 }}>
                    <div
                      onClick={() => setRememberMe(!rememberMe)}
                      style={{
                        width: 17,
                        height: 17,
                        borderRadius: 4,
                        background: rememberMe ? '#18191c' : '#ffffff',
                        border: rememberMe ? '1px solid #18191c' : '1.5px solid #d1d5db',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {rememberMe && <Check size={12} color="#ffffff" strokeWidth={3} />}
                    </div>
                    <span>Remember me</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => setMode('forgot')}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#111827',
                      cursor: 'pointer'
                    }}
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Submit button */}
                <button
                  id="login-submit"
                  type="submit"
                  className="sentinel-submit-btn"
                  disabled={loading}
                  style={{ opacity: loading ? 0.75 : 1 }}
                >
                  <span>{loading ? 'Signing in...' : 'Sign in'}</span>
                  {!loading && <ArrowRight size={16} strokeWidth={2.4} />}
                </button>

                {/* Divider */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '8px 0' }}>
                  <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
                  <span style={{ fontSize: 12, color: '#9ca3af', fontWeight: 400 }}>or continue with</span>
                  <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
                </div>

                {/* Social Login Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <button
                    type="button"
                    onClick={handleGoogle}
                    className="sentinel-social-btn"
                  >
                    <span>Sign in with Google</span>
                    {/* Official Google G Logo */}
                    <svg width="18" height="18" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.27 21.36 7.34 24 12 24z"/>
                      <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.98 0 12s.46 3.84 1.26 5.42l4.02-3.15z"/>
                      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.27 2.64 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                    </svg>
                  </button>

                  <button
                    type="button"
                    onClick={() => alert('Facebook sign in can be configured in your Supabase Auth providers.')}
                    className="sentinel-social-btn"
                  >
                    <span>Sign in with Facebook</span>
                    {/* Official Facebook (f) Logo */}
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </button>
                </div>
              </form>
            )}

            {/* Signup Form */}
            {mode === 'signup' && (
              <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 6 }}>
                    Full Name
                  </label>
                  <input
                    id="signup-name"
                    type="text"
                    className="sentinel-pill-input"
                    placeholder="Alex Rivera"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 6 }}>
                    Email
                  </label>
                  <input
                    id="signup-email"
                    type="email"
                    className="sentinel-pill-input"
                    placeholder="jayson_marhiela@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 6 }}>
                    Password
                  </label>
                  <input
                    id="signup-password"
                    type="password"
                    className="sentinel-pill-input"
                    placeholder="Min 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                </div>

                <button
                  id="signup-submit"
                  type="submit"
                  className="sentinel-submit-btn"
                  disabled={loading}
                  style={{ marginTop: 8 }}
                >
                  <span>{loading ? 'Creating account...' : 'Create Account'}</span>
                  {!loading && <ArrowRight size={16} strokeWidth={2.4} />}
                </button>
              </form>
            )}

            {/* Forgot Form */}
            {mode === 'forgot' && (
              <form onSubmit={handleForgot} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 6 }}>
                    Email
                  </label>
                  <input
                    id="forgot-email"
                    type="email"
                    className="sentinel-pill-input"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <button
                  id="forgot-submit"
                  type="submit"
                  className="sentinel-submit-btn"
                  disabled={loading}
                  style={{ marginTop: 8 }}
                >
                  <span>{loading ? 'Sending link...' : 'Send Reset Link'}</span>
                  {!loading && <ArrowRight size={16} strokeWidth={2.4} />}
                </button>

                <button
                  type="button"
                  onClick={() => setMode('login')}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: 13,
                    color: '#6b7280',
                    cursor: 'pointer',
                    marginTop: 6
                  }}
                >
                  ← Back to Sign in
                </button>
              </form>
            )}

          </div>

          {/* Bottom Footer Area */}
          <div style={{
            position: 'relative',
            zIndex: 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: 24,
            fontSize: 13
          }}>
            <span style={{ color: '#6b7280' }}>
              {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
            </span>

            <button
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
              style={{
                background: 'none',
                border: 'none',
                color: '#111827',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              <span>{mode === 'login' ? 'Sign up' : 'Sign in'}</span>
              <ChevronRight size={14} strokeWidth={2.4} />
            </button>
          </div>

          {/* Admin link */}
          <div style={{ textAlign: 'center', marginTop: 8 }}>
            <button
              onClick={() => router.push('/login/admin')}
              style={{
                background: 'none',
                border: 'none',
                color: '#9ca3af',
                fontSize: 11.5,
                cursor: 'pointer',
                textDecoration: 'none'
              }}
            >
              Admin Portal
            </button>
          </div>

        </div>

        {/* ================= RIGHT COLUMN ================= */}
        <div className="sentinel-right">
          <div className="sentinel-right-glow" />

          {/* Top text content */}
          <div style={{ position: 'relative', zIndex: 2, maxWidth: 520 }}>
            <h2 style={{
              fontSize: 32,
              fontWeight: 700,
              color: '#ffffff',
              letterSpacing: '-0.5px',
              lineHeight: 1.25,
              marginBottom: 12
            }}>
              Stay one step ahead of threats
            </h2>

            <p style={{
              fontSize: 14.5,
              color: 'rgba(255, 255, 255, 0.88)',
              lineHeight: 1.5,
              marginBottom: 24,
              maxWidth: 440
            }}>
              Monitor risks, investigate incidents and protect your infrastructure from a single security workspace.
            </p>

            {/* Pagination Indicators */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 22, height: 6, borderRadius: 9999, background: '#ffffff' }} />
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255, 255, 255, 0.45)' }} />
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255, 255, 255, 0.45)' }} />
            </div>
          </div>

          {/* 3D Isometric Dashboard Showcase */}
          <div className="sentinel-3d-stage">
            <div className="sentinel-3d-card">
              
              {/* Dashboard Topbar */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: 14,
                borderBottom: '1px solid #f1f5f9'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 24,
                    height: 24,
                    borderRadius: 7,
                    background: '#22c55e',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Umbrella size={14} color="#ffffff" strokeWidth={2.4} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Sentinel</span>
                  <span style={{ fontSize: 11, color: '#94a3b8', margin: '0 4px' }}>&lt;</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#64748b' }}>
                  <span>Security center</span>
                  <span>&gt;</span>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>Overview</span>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', marginLeft: 4 }} />
                </div>
              </div>

              {/* Dashboard Body with mini-sidebar & widgets */}
              <div style={{ display: 'flex', gap: 14, paddingTop: 14 }}>
                
                {/* Mini Sidebar */}
                <div style={{ width: 130, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 8px',
                    borderRadius: 8,
                    fontSize: 11,
                    color: '#64748b'
                  }}>
                    <Home size={13} />
                    <span>Home</span>
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 8px',
                    borderRadius: 8,
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#0f172a'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <ShieldAlert size={13} color="#22c55e" />
                      <span>Security center</span>
                    </div>
                    <ChevronDown size={11} />
                  </div>

                  {/* Subnav items */}
                  <div style={{ paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <div style={{
                      padding: '5px 10px',
                      background: '#f1f5f9',
                      borderRadius: 6,
                      fontSize: 10.5,
                      fontWeight: 600,
                      color: '#0f172a'
                    }}>
                      Overview
                    </div>
                    <div style={{ padding: '5px 10px', fontSize: 10.5, color: '#64748b' }}>Threats</div>
                    <div style={{ padding: '5px 10px', fontSize: 10.5, color: '#64748b' }}>Incidents</div>
                    <div style={{ padding: '5px 10px', fontSize: 10.5, color: '#64748b' }}>Vulnerabilities</div>
                  </div>

                  <div style={{ padding: '5px 8px', fontSize: 10.5, color: '#64748b' }}>Assets</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', fontSize: 10.5, color: '#64748b' }}>
                    <Activity size={12} />
                    <span>Monitoring</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', fontSize: 10.5, color: '#64748b' }}>
                    <Search size={12} />
                    <span>Investigations</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', fontSize: 10.5, color: '#64748b' }}>
                    <FileText size={12} />
                    <span>Reports</span>
                    <span style={{ fontSize: 9, background: '#111827', color: '#fff', padding: '1px 5px', borderRadius: 99, marginLeft: 'auto' }}>New</span>
                  </div>
                  <div style={{ padding: '5px 8px', fontSize: 10.5, color: '#64748b' }}>Compliance</div>
                </div>

                {/* Dashboard Main Content Area */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  
                  {/* Top Stats Cards Row */}
                  <div style={{ display: 'flex', gap: 10 }}>
                    {/* Active Threats Card */}
                    <div style={{
                      flex: 1.2,
                      background: '#f8fafc',
                      borderRadius: 12,
                      padding: '12px 14px',
                      border: '1px solid #f1f5f9'
                    }}>
                      <div style={{ fontSize: 11.5, fontWeight: 700, color: '#0f172a' }}>Active threats</div>
                      <div style={{ fontSize: 9.5, color: '#94a3b8', marginTop: 2, lineHeight: 1.3 }}>
                        Detected malicious activities across the network over the last 24 hours.
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 10 }}>
                        <span style={{ fontSize: 22, fontWeight: 800, color: '#0f172a' }}>142</span>
                        <span style={{ fontSize: 10, color: '#ef4444', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 2 }}>
                          <TrendingDown size={11} />
                          12.4%
                        </span>
                        {/* Mini Sparkline SVG */}
                        <svg width="45" height="16" style={{ marginLeft: 'auto' }} viewBox="0 0 45 16">
                          <path d="M 0 4 Q 10 14 20 8 T 40 14" fill="none" stroke="#fca5a5" strokeWidth="1.8" />
                        </svg>
                      </div>
                    </div>

                    {/* Open Incidents Card */}
                    <div style={{
                      flex: 0.8,
                      background: '#f8fafc',
                      borderRadius: 12,
                      padding: '12px 14px',
                      border: '1px solid #f1f5f9'
                    }}>
                      <div style={{ fontSize: 11.5, fontWeight: 700, color: '#0f172a' }}>Open</div>
                      <div style={{ fontSize: 9.5, color: '#94a3b8', marginTop: 2 }}>Security events investigation</div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 10 }}>
                        <span style={{ fontSize: 22, fontWeight: 800, color: '#0f172a' }}>18</span>
                        <span style={{ fontSize: 10, color: '#22c55e', fontWeight: 600 }}>↗ 3</span>
                      </div>
                    </div>
                  </div>

                  {/* Security operations trends Chart Card */}
                  <div style={{
                    background: '#f8fafc',
                    borderRadius: 12,
                    padding: '12px 14px',
                    border: '1px solid #f1f5f9',
                    position: 'relative'
                  }}>
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
                      Security operations trends
                    </div>

                    {/* Chart Tooltip Overlay */}
                    <div style={{
                      position: 'absolute',
                      right: 28,
                      top: 14,
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: 8,
                      padding: '6px 10px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                      fontSize: 9,
                      color: '#64748b',
                      zIndex: 5
                    }}>
                      <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: 2 }}>September 2, 2026</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#3b82f6' }} />
                        <span>Alerts generated: <b style={{ color: '#0f172a' }}>158</b> <span style={{ color: '#ef4444' }}>↙ 2.5%</span></span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#8b5cf6' }} />
                        <span>Incidents investigated: <b style={{ color: '#0f172a' }}>138</b> <span style={{ color: '#ef4444' }}>↙ 4.8%</span></span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#f59e0b' }} />
                        <span>Threats resolved: <b style={{ color: '#0f172a' }}>124</b> <span style={{ color: '#22c55e' }}>↗ 3.1%</span></span>
                      </div>
                    </div>

                    {/* SVG Chart */}
                    <div style={{ width: '100%', height: 80, marginTop: 4 }}>
                      <svg width="100%" height="80" viewBox="0 0 320 80" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="purpleGlow" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.2" />
                            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>
                        {/* Grid lines */}
                        <line x1="0" y1="20" x2="320" y2="20" stroke="#e2e8f0" strokeDasharray="3 3" strokeWidth="0.8" />
                        <line x1="0" y1="45" x2="320" y2="45" stroke="#e2e8f0" strokeDasharray="3 3" strokeWidth="0.8" />
                        <line x1="0" y1="70" x2="320" y2="70" stroke="#e2e8f0" strokeDasharray="3 3" strokeWidth="0.8" />

                        {/* Curve 1 (Purple) */}
                        <path
                          d="M 10 65 Q 45 15 90 40 T 170 50 T 250 25 T 310 55"
                          fill="none"
                          stroke="#8b5cf6"
                          strokeWidth="2"
                        />
                        {/* Curve 2 (Blue) */}
                        <path
                          d="M 10 50 Q 50 60 90 25 T 180 35 T 260 65 T 310 30"
                          fill="none"
                          stroke="#3b82f6"
                          strokeWidth="2"
                        />
                        {/* Curve 3 (Yellow/Orange) */}
                        <path
                          d="M 10 70 Q 60 45 110 55 T 200 40 T 280 50 T 310 65"
                          fill="none"
                          stroke="#f59e0b"
                          strokeWidth="1.5"
                        />
                      </svg>
                    </div>

                    {/* Timeline labels */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 8,
                      color: '#94a3b8',
                      marginTop: 2
                    }}>
                      <span>5 AM</span>
                      <span>6 AM</span>
                      <span>7 AM</span>
                      <span>8 AM</span>
                      <span>9 AM</span>
                      <span>10 AM</span>
                      <span>11 AM</span>
                      <span>12 PM</span>
                      <span>1 PM</span>
                      <span>2 PM</span>
                      <span>3 PM</span>
                      <span>4 PM</span>
                    </div>
                  </div>

                  {/* Top Security Insights Section */}
                  <div style={{
                    background: '#ffffff',
                    borderRadius: 12,
                    padding: '12px 14px',
                    border: '1px solid #f1f5f9'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: '#0f172a' }}>Top security insights</span>
                      <span style={{ fontSize: 10, color: '#22c55e', fontWeight: 600, cursor: 'pointer' }}>View all &gt;</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {/* Insight 1 */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <ShieldAlert size={14} color="#64748b" />
                          <div>
                            <div style={{ fontSize: 10.5, fontWeight: 600, color: '#0f172a' }}>Review critical threats</div>
                            <div style={{ fontSize: 9, color: '#94a3b8' }}>High-severity threats detected.</div>
                          </div>
                        </div>
                        <ArrowRight size={12} color="#94a3b8" />
                      </div>

                      {/* Insight 2 */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Layers size={14} color="#64748b" />
                          <div>
                            <div style={{ fontSize: 10.5, fontWeight: 600, color: '#0f172a' }}>Analyze vulnerable assets</div>
                            <div style={{ fontSize: 9, color: '#94a3b8' }}>Assets with elevated risk levels.</div>
                          </div>
                        </div>
                        <ArrowRight size={12} color="#94a3b8" />
                      </div>
                    </div>
                  </div>

                  {/* Floating AI Assistant pill widget */}
                  <div style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 10,
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.04)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Sparkles size={13} color="#22c55e" />
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#0f172a' }}>AI Assistant</span>
                      <span style={{ fontSize: 9.5, color: '#94a3b8' }}>How can I help you today?</span>
                    </div>
                    <div style={{ fontSize: 9.5, color: '#64748b', background: '#f1f5f9', padding: '3px 8px', borderRadius: 6 }}>
                      Ask any question...
                    </div>
                  </div>

                </div>
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
