'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Mail, Lock, Shield, Eye, EyeOff, AlertCircle, ArrowLeft } from 'lucide-react'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('admin@urlm.app')
  const [password, setPassword] = useState('Admin@786900')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      // If the admin account does not exist yet, try to create it using the known default credentials.
      if (email === 'admin@urlm.app' && password === 'Admin@786900') {
        const { error: signUpError } = await supabase.auth.signUp({ email, password })
        if (!signUpError) {
          const { error: loginError } = await supabase.auth.signInWithPassword({ email, password })
          if (!loginError) {
            router.push('/admin')
            setLoading(false)
            return
          }
          setError(loginError.message || 'Admin sign in failed after account creation.')
        } else {
          setError(signUpError.message)
        }
      } else {
        setError(error.message)
      }
    } else {
      router.push('/admin') // Admin goes to /admin
    }

    setLoading(false)
  }

  return (
    <div className="auth-page">
      <div className="auth-bg" />

      <div style={{ textAlign: 'center', marginBottom: 32, position: 'relative', zIndex: 1, animation: 'fadeIn 0.5s ease' }}>
        <div style={{
          width: 72, height: 72,
          background: 'linear-gradient(135deg, #ef4444, #f97316)',
          borderRadius: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px',
          boxShadow: '0 8px 32px rgba(239, 68, 68, 0.3)'
        }}>
          <Shield size={32} color="white" />
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.8px' }}>
          Admin Portal
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4, textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: 600 }}>
          URLM Central Command
        </p>
      </div>

      <div className="auth-card" style={{ borderTop: '4px solid #ef4444' }}>
        {error && (
          <div className="alert alert-error" style={{ fontSize: 13, animation: 'shake 0.4s ease' }}>
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="form-group">
            <label className="form-label" style={{ fontSize: 12, color: 'var(--text-muted)' }}>Admin Credentials</label>
            <div className="input-with-icon">
              <Mail size={16} />
              <input
                id="login-email"
                className="form-input"
                type="email"
                placeholder="Enter admin email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <div className="input-with-icon" style={{ position: 'relative' }}>
              <Lock size={16} />
              <input
                id="login-password"
                className="form-input"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter admin password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)} 
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button id="login-submit" className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', marginTop: 8, background: '#ef4444', borderColor: '#ef4444', height: 48, fontSize: 15, fontWeight: 700 }}>
            {loading ? 'Authenticating...' : 'Sign In to Dashboard'}
          </button>
        </form>
      </div>
      
      <button 
        onClick={() => router.push('/login')} 
        style={{ 
          marginTop: 24, background: 'none', border: 'none', 
          color: 'var(--text-secondary)', cursor: 'pointer', 
          fontWeight: 600, fontSize: 13, display: 'flex', 
          alignItems: 'center', gap: 6, position: 'relative', zIndex: 1 
        }}
      >
        <ArrowLeft size={14} /> Back to User Login
      </button>

      <div style={{
        position: 'fixed', bottom: 24, left: 24, right: 24,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        color: 'var(--text-muted)', fontSize: 11
      }}>
        <div style={{ display: 'flex', gap: 20 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>🔒 AES-256 ENCRYPTION</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>🚀 INSTANT LOGIN</span>
        </div>
      </div>
    </div>
  )
}
