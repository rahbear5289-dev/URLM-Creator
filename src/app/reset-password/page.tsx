'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setError('Invalid or expired reset link. Please request a new one.')
      }
    })
  }, [])

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)
    setError('')

    const { error } = await supabase.auth.updateUser({
      password: password
    })

    if (error) {
      setError(error.message)
    } else {
      setSuccess(true)
      setTimeout(() => {
        router.push('/login')
      }, 3000)
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
          <Lock size={28} color="white" />
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
          Set New Password
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>
          Enter your new secure password below
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
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ 
              width: 50, height: 50, background: 'rgba(52,211,153,0.15)', 
              borderRadius: '50%', display: 'flex', alignItems: 'center', 
              justifyContent: 'center', margin: '0 auto 16px' 
            }}>
              <CheckCircle size={24} color="#34d399" />
            </div>
            <h3 style={{ color: 'var(--text-primary)', marginBottom: 8 }}>Password Updated!</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
              Your password has been changed successfully. Redirecting to login...
            </p>
          </div>
        ) : (
          <form onSubmit={handleReset}>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <div className="input-with-icon" style={{ position: 'relative' }}>
                <Lock size={16} />
                <input
                  id="new-password"
                  className="form-input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
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

            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <div className="input-with-icon">
                <Lock size={16} />
                <input
                  id="confirm-password"
                  className="form-input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button 
              id="reset-submit" 
              className="btn btn-primary" 
              type="submit" 
              disabled={loading} 
              style={{ width: '100%', marginTop: 8 }}
            >
              {loading ? 'Updating...' : 'Update Password'}
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
