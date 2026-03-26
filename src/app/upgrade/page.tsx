'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Check, Zap, Shield, Star, Crown, Rocket, Sparkles, CreditCard, Loader2, PartyPopper, Lock, Wallet } from 'lucide-react'

interface RazorpayResponse {
  razorpay_payment_id: string
  razorpay_order_id: string
  razorpay_signature?: string
}

const pricingPlans = [
  {
    id: 'free',
    name: 'Starter',
    price: '0',
    description: 'Perfect for occasional personal use',
    features: [
      '5 AI Background removals / month',
      'Standard A4 sheet generation',
      'Basic PVC card templates',
      '72-hour file storage',
      'Community support'
    ],
    buttonText: 'Current Plan',
    buttonClass: 'btn-secondary',
    isPopular: false,
    icon: Rocket
  },
  {
    id: 'pro',
    name: 'Professional',
    price: '9',
    description: 'For photographers and small businesses',
    features: [
      'Unlimited AI Background removals',
      'All A4 sheet & PVC layouts',
      'High-res PDF & PVC exports',
      'Custom watermark removal',
      'Priority email support',
      '10GB Cloud Storage',
      'Early access to new features'
    ],
    buttonText: 'Upgrade to Pro',
    buttonClass: 'btn-primary',
    isPopular: true,
    icon: Crown,
    highlight: 'MOST POPULAR'
  },
  {
    id: 'business',
    name: 'Business',
    price: '29',
    description: 'Scale your photo studio operations',
    features: [
      'Everything in Professional',
      'Team accounts (up to 5 users)',
      'API access for integrations',
      'Bulk photo processing',
      'White-label portal',
      'Unlimited Cloud Storage',
      '24/7 Dedicated Support'
    ],
    buttonText: 'Contact Sales',
    buttonClass: 'btn-secondary',
    isPopular: false,
    icon: Sparkles
  }
]

export default function UpgradePage() {
  const { user, session, plan: currentPlan, isPro, refreshPlan } = useAuth()
  const router = useRouter()
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  const [loading, setLoading] = useState<string | null>(null)
  const [paymentSuccess, setPaymentSuccess] = useState(false)
  const [error, setError] = useState('')
  const [balance, setBalance] = useState<number>(0)

  // Load wallet balance
  useEffect(() => {
    const fetchBalance = async () => {
      if (!user) return
      const { data } = await supabase.from('profiles').select('wallet_balance').eq('id', user.id).single()
      if (data) setBalance(Number(data.wallet_balance) || 0)
    }
    fetchBalance()

    // REAL-TIME SYNC: Update balance automatically
    let channel: any
    if (user) {
      channel = supabase
        .channel(`upgrade-wallet-${user.id}`)
        .on('postgres_changes', { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'profiles',
            filter: `id=eq.${user.id}`
        }, (payload) => {
            const newBal = payload.new.wallet_balance
            if (newBal !== undefined) {
              setBalance(Number(newBal))
              console.log("Upgrade page balance updated live:", newBal)
            }
        })
        .subscribe()
    }

    return () => {
      if (channel) supabase.removeChannel(channel)
    }
  }, [user])

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    document.body.appendChild(script)
    return () => {
      const existing = document.body.querySelector('script[src*="razorpay"]')
      if (existing) existing.remove()
    }
  }, [])

  const handleUpgrade = async (planId: string) => {
    if (!user) {
      setError('Please login first')
      return
    }

    if (planId === 'free') return

    if (planId === 'business') {
      window.open('mailto:sales@urlm.studio?subject=Business Plan Inquiry', '_blank')
      return
    }

    setLoading(planId)
    setError('')

    try {
      const response = await fetch('/api/razorpay/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          billingCycle,
          userId: user.id,
          userEmail: user.email,
          userName: user.user_metadata?.full_name || user.email
        })
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create order')
      }

      if (typeof window.Razorpay === 'undefined') {
        throw new Error('Payment gateway not loaded. Please refresh and try again.')
      }

      const razorpay = new window.Razorpay({
        key: data.keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: data.amount * 100,
        currency: 'INR',
        name: 'URLM Studio',
        description: `${data.planName} - ${billingCycle === 'yearly' ? 'Yearly' : 'Monthly'}`,
        image: '/logo.png',
        order_id: data.orderId,
        prefill: {
          name: user.user_metadata?.full_name || user.email || '',
          email: user.email || ''
        },
        theme: { color: '#7c5cf6' },
        handler: async (response: RazorpayResponse) => {
          const verifyResponse = await fetch('/api/razorpay/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature || '',
              planId,
              billingCycle,
              userId: user.id
            })
          })

          const verifyData = await verifyResponse.json()

          if (verifyData.success) {
            setPaymentSuccess(true)
            await refreshPlan()
          } else {
            setError('Payment verification failed')
          }
        }
      })

      razorpay.open()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Payment failed'
      setError(message)
    } finally {
      setLoading(null)
    }
  }

  return (
    <DashboardLayout>
      <div style={{ position: 'relative' }}>
        {/* Wallet Status Header */}
        <div style={{ 
          position: 'absolute', top: -10, right: 0, 
          display: 'flex', alignItems: 'center', gap: 15,
          background: 'rgba(26, 26, 46, 0.8)',
          backdropFilter: 'blur(10px)',
          padding: '10px 20px',
          borderRadius: '14px',
          border: '1px solid rgba(124, 92, 246, 0.25)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
          zIndex: 10
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', fontWeight: 800 }}>PRIMARY WALLET BALANCE (INR)</span>
            <div style={{ fontSize: '20px', fontWeight: 900, color: 'white', display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{ fontSize: '14px', color: '#10b981' }}>₹</span>
              {balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
              <Lock size={10} color="#10b981" />
              <span style={{ fontSize: '9px', fontWeight: 800, color: '#10b981' }}>LOCKED & SECURED</span>
            </div>
          </div>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(124, 92, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Wallet size={20} color="#a78bfa" />
          </div>
        </div>

        <div className="page-header" style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 12px',
            background: 'rgba(124, 92, 246, 0.1)',
            borderRadius: '20px',
            color: 'var(--accent-purple-light)',
            fontSize: '12px',
            fontWeight: 700,
            marginBottom: 16,
            textTransform: 'uppercase',
            letterSpacing: '1px'
          }}>
            <Zap size={14} />
            Pricing Plans
          </div>
          <h1 className="page-title" style={{ fontSize: '42px', marginBottom: 12 }}>Unlock Ultimate Precision</h1>
          <p className="page-subtitle" style={{ maxWidth: '600px', margin: '0 auto', fontSize: '16px' }}>
            Choose the plan that fits your studio needs. From hobbyists to high-volume businesses, we've got you covered with AI-powered perfection.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 32 }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: billingCycle === 'monthly' ? 'var(--text-primary)' : 'var(--text-muted)' }}>Monthly</span>
            <button
              className={`toggle ${billingCycle === 'yearly' ? 'on' : ''}`}
              onClick={() => setBillingCycle(b => b === 'monthly' ? 'yearly' : 'monthly')}
              style={{ width: '50px', height: '26px' }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '14px', fontWeight: 600, color: billingCycle === 'yearly' ? 'var(--text-primary)' : 'var(--text-muted)' }}>Yearly</span>
              <span style={{ background: 'rgba(52, 211, 153, 0.15)', color: '#34d399', fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '10px' }}>SAVE 20%</span>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="card" style={{ maxWidth: 600, margin: '0 auto 20px', background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444' }}>
          <p style={{ color: '#ef4444', textAlign: 'center', padding: 12 }}>{error}</p>
        </div>
      )}

      <div className="grid-3" style={{ maxWidth: '1100px', margin: '0 auto 60px', alignItems: 'stretch' }}>
        {pricingPlans.map((plan) => {
          const PlanIcon = plan.icon
          const priceNum = billingCycle === 'yearly' ? Math.floor(parseInt(plan.price) * 0.8) : parseInt(plan.price)
          const isLoading = loading === plan.id

          return (
            <div
              key={plan.id}
              className={`card ${plan.isPopular ? 'pro-card' : ''}`}
              style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                padding: '32px',
                border: plan.isPopular ? '2px solid var(--accent-purple)' : '1px solid var(--border)',
                background: plan.isPopular ? 'var(--bg-secondary)' : 'var(--bg-card)',
                boxShadow: plan.isPopular ? '0 20px 40px rgba(0,0,0,0.3)' : 'none',
                transform: plan.isPopular ? 'scale(1.05)' : 'scale(1)',
                zIndex: plan.isPopular ? 2 : 1
              }}
            >
              {plan.isPopular && (
                <div style={{
                  position: 'absolute',
                  top: '-14px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-blue))',
                  color: 'white',
                  fontSize: '11px',
                  fontWeight: 800,
                  padding: '4px 16px',
                  borderRadius: '20px',
                  letterSpacing: '1px',
                  boxShadow: '0 4px 12px rgba(124, 92, 246, 0.3)'
                }}>
                  {plan.highlight}
                </div>
              )}

              <div style={{ marginBottom: 24 }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: plan.isPopular ? 'rgba(124, 92, 246, 0.2)' : 'rgba(255, 255, 255, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: plan.isPopular ? 'var(--accent-purple-light)' : 'var(--text-secondary)', marginBottom: 16 }}>
                  <PlanIcon size={24} />
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{plan.name}</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.4' }}>{plan.description}</p>
              </div>

              <div style={{ marginBottom: 32 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-muted)' }}>₹</span>
                  <span style={{ fontSize: '48px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-2px' }}>{priceNum}</span>
                  <span style={{ fontSize: '15px', color: 'var(--text-muted)' }}>/mo</span>
                </div>
                {billingCycle === 'yearly' && plan.price !== '0' && (
                  <p style={{ fontSize: '12px', color: '#34d399', fontWeight: 600, marginTop: 4 }}>
                    Billed annually (₹{priceNum * 12}/yr)
                  </p>
                )}
              </div>

              <div style={{ flex: 1, marginBottom: 32 }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  What's included:
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {plan.features.map((feature, i) => (
                    <li key={i} style={{ display: 'flex', gap: 10, fontSize: '14px', color: 'var(--text-secondary)', alignItems: 'flex-start' }}>
                      <Check size={16} color="#34d399" style={{ marginTop: 2, flexShrink: 0 }} />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                className={`btn ${plan.buttonClass} btn-lg`}
                style={{ width: '100%', padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                disabled={plan.id === 'free' || isLoading}
                onClick={() => handleUpgrade(plan.id)}
              >
                {isLoading ? (
                  <><Loader2 size={16} className="animate-spin" /> Processing...</>
                ) : (
                  <><CreditCard size={16} />{plan.buttonText}</>
                )}
              </button>
            </div>
          )
        })}
      </div>

      {paymentSuccess && (
        <div className="card" style={{ maxWidth: 600, margin: '0 auto 40px', background: 'rgba(52, 211, 153, 0.1)', border: '1px solid #34d399' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 20 }}>
            <Check size={32} color="#34d399" />
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#34d399' }}>Payment Successful!</h3>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                Your account has been upgraded to <strong style={{ color: 'var(--accent-purple-light)', textTransform: 'capitalize' }}>{currentPlan}</strong>.
                <br />All premium features are now unlocked.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="card" style={{ maxWidth: '800px', margin: '0 auto 40px', background: 'rgba(255, 255, 255, 0.02)', border: '1px dashed var(--border)' }}>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(79, 142, 247, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-blue)', flexShrink: 0 }}>
            <Shield size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>Secure Payment with Razorpay</h4>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: 2 }}>
              Transactions are secured with 256-bit encryption. We accept all major credit cards, debit cards, UPI, net banking, and wallets.
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        .pro-card::before {
          content: '';
          position: absolute;
          inset: -2px;
          background: linear-gradient(135deg, var(--accent-purple), var(--accent-blue), var(--accent-pink));
          border-radius: 14px;
          z-index: -1;
          opacity: 0.5;
          filter: blur(10px);
        }
      `}</style>
    </DashboardLayout>
  )
}
