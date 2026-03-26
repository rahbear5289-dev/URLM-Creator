'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Mail, Lock, Shield, Eye, EyeOff, AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Agar user pehle se logged in hai to foran dashboard bhej do
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
      setSuccess('Account created! Please check your email to verify your account.')
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
    <div className="auth-page">
      <div className="auth-bg" />

      <div style={{ textAlign: 'center', marginBottom: 32, position: 'relative', zIndex: 1 }}>
        <div style={{
          width: 80, height: 80,
          borderRadius: 20,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
          overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px'
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/rayhbear.jpg" alt="URLM Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
          URIM Passport
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>
          Professional Creator Edition
        </p>
      </div>

      <div className="auth-card">
        {error && (
          <div className="alert alert-error">
            <AlertCircle size={16} />
            {error}
          </div>
        )}
        {success && (
          <div className="alert alert-success">
            {success}
          </div>
        )}

        {mode === 'login' && (
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div className="input-with-icon">
                <Mail size={16} />
                <input
                  id="login-email"
                  className="form-input"
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label className="form-label" style={{ margin: 0 }}>Password</label>
                <button type="button" onClick={() => router.push('/forgot-password')} style={{ fontSize: 12, color: 'var(--accent-purple-light)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  Forgot password?
                </button>
              </div>
              <div className="input-with-icon" style={{ position: 'relative' }}>
                <Lock size={16} />
                <input
                  id="login-password"
                  className="form-input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button id="login-submit" className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', marginTop: 8 }}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>


          </form>
        )}

        {mode === 'signup' && (
          <form onSubmit={handleSignup}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input id="signup-name" className="form-input" type="text" placeholder="Alex Rivera" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div className="input-with-icon">
                <Mail size={16} />
                <input id="signup-email" className="form-input" type="email" placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="input-with-icon">
                <Lock size={16} />
                <input id="signup-password" className="form-input" type="password" placeholder="Min 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
              </div>
            </div>
            <button id="signup-submit" className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', marginTop: 8 }}>
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
        )}

        {mode === 'forgot' && (
          <form onSubmit={handleForgot}>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20 }}>
              Enter your email and we&apos;ll send you a password reset link.
            </p>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div className="input-with-icon">
                <Mail size={16} />
                <input id="forgot-email" className="form-input" type="email" placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
            </div>
            <button id="forgot-submit" className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', marginTop: 8 }}>
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
            <button type="button" onClick={() => setMode('login')} style={{ width: '100%', marginTop: 10, background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13 }}>
              ← Back to Sign In
            </button>
          </form>
        )}
      </div>

      <p style={{ marginTop: 24, fontSize: 14, color: 'var(--text-secondary)', position: 'relative', zIndex: 1 }}>
        {mode === 'login' ? (
          <>Don&apos;t have an account?{' '}
            <button onClick={() => setMode('signup')} style={{ background: 'none', border: 'none', color: 'var(--accent-purple-light)', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
              Create an account
            </button>
          </>
        ) : (
          <>Already have an account?{' '}
            <button onClick={() => setMode('login')} style={{ background: 'none', border: 'none', color: 'var(--accent-purple-light)', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
              Sign in
            </button>
          </>
        )}
      </p>

      <div style={{ marginTop: 12, textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <button onClick={() => router.push('/login/admin')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13, textDecoration: 'underline' }}>
          Admin Login
        </button>
      </div>

      <div style={{
        position: 'fixed', bottom: 24, left: 24, right: 24,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        color: 'var(--text-muted)', fontSize: 11
      }}>
        <div style={{ display: 'flex', gap: 20 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>🔒 AES-256 ENCRYPTION</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>⚡ ULTRA FAST RENDERING</span>
        </div>
        <div style={{ display: 'flex', gap: 20 }}>
          <a href="#" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Privacy Policy</a>
          <a href="#" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Terms of Service</a>
          <a href="#" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Help Center</a>
        </div>
      </div>
    </div>
  )
}
