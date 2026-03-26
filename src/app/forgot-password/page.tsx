'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Mail, Shield, AlertCircle, CheckCircle, ChevronLeft } from 'lucide-react'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

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
      setSuccess(true)
    }
    setLoading(false)
  }

  return (
    <div className="auth-page">
      <div className="auth-bg" />

      <div style={{ textAlign: 'center', marginBottom: 32, position: 'relative', zIndex: 1 }}>
        <div style={{
          width: 64, height: 64,
          background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-blue))',
          borderRadius: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px'
        }}>
          <Shield size={28} color="white" />
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
          Reset Password
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>
          We'll send you a link to recapture your account
        </p>
      </div>

      <div className="auth-card">
        {error && (
          <div className="alert alert-error">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {success ? (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{ 
              width: 50, height: 50, background: 'rgba(52,211,153,0.15)', 
              borderRadius: '50%', display: 'flex', alignItems: 'center', 
              justifyContent: 'center', margin: '0 auto 16px' 
            }}>
              <CheckCircle size={24} color="#34d399" />
            </div>
            <h3 style={{ color: 'var(--text-primary)', marginBottom: 8, fontSize: 18 }}>Inbox Alert!</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.6, marginBottom: 20 }}>
              If an account with <strong>{email}</strong> exists, you'll receive a password reset link shortly.
            </p>
            <button onClick={() => router.push('/login')} className="btn btn-secondary" style={{ width: '100%' }}>
              Back to Sign In
            </button>
          </div>
        ) : (
          <form onSubmit={handleForgot}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div className="input-with-icon">
                <Mail size={16} />
                <input
                  id="forgot-email"
                  className="form-input"
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <button 
              id="forgot-submit-btn" 
              className="btn btn-primary" 
              type="submit" 
              disabled={loading} 
              style={{ width: '100%', marginTop: 8 }}
            >
              {loading ? 'Sending...' : 'Send Recovery Link'}
            </button>

            <button 
              type="button" 
              onClick={() => router.push('/login')} 
              style={{ 
                width: '100%', marginTop: 16, background: 'none', border: 'none', 
                color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
              }}
            >
              <ChevronLeft size={14} /> Back to login
            </button>
          </form>
        )}
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
      </div>
    </div>
  )
}
