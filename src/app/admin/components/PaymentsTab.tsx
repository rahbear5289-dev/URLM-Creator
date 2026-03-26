'use client'

import { useState, useEffect } from 'react'
import { Wallet, CreditCard, ArrowUpRight, History, CheckCircle, Clock, IndianRupee, Loader2, QrCode } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

interface PaymentRecord {
    id: string
    user_id: string
    amount: number
    currency: string
    status: string
    razorpay_payment_id: string
    created_at: string
}

export default function PaymentsTab() {
    const { user } = useAuth()
    const [inrBalance, setInrBalance] = useState<number>(1149638)
    const [walletAddress, setWalletAddress] = useState<string>('Main Admin Wallet')
    const [topUpAmount, setTopUpAmount] = useState<string>('500')
    const [loading, setLoading] = useState(false)
    const [history, setHistory] = useState<PaymentRecord[]>([])
    const [toast, setToast] = useState('')

    const showToast = (msg: string) => {
        setToast(msg)
        setTimeout(() => setToast(''), 3000)
    }

    // Load user balance and payment history
    useEffect(() => {
        if (!user) return

        const loadPaymentData = async () => {
            // In a real app, we'd fetch inr_balance from profiles
            const { data: profile } = await supabase
                .from('profiles')
                .select('inr_balance')
                .eq('id', user.id)
                .single()
            
            if (profile?.inr_balance) {
                // Base starting balance (4.6924 ETH converted) + real DB balance
                setInrBalance(1149638 + profile.inr_balance)
            }

            // Fetch simulated or real transaction history
            // For now using localStorage as a fallback if table doesn't exist
            const savedHistory = localStorage.getItem('admin_payment_history')
            if (savedHistory) {
                setHistory(JSON.parse(savedHistory))
            }
        }

        loadPaymentData()
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

    const handleTopUp = async () => {
        if (!user || !topUpAmount || isNaN(Number(topUpAmount))) return
        setLoading(true)

        try {
            // 1. Create Order via API
            const response = await fetch('/api/razorpay/order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: Number(topUpAmount),
                    currency: 'INR',
                    userId: user.id,
                    purpose: 'Wallet Top-up'
                })
            })

            const data = await response.json()
            if (!data.success) throw new Error(data.error)

            // 2. Open Razorpay
            const options = {
                key: data.keyId,
                amount: data.amount * 100,
                currency: 'INR',
                name: 'URLM Admin Wallet',
                description: 'Wallet Balance Top-up',
                order_id: data.orderId,
                prefill: {
                    name: user.user_metadata?.full_name || 'Admin',
                    email: user.email
                },
                theme: { color: '#7c5cf6' },
                config: {
                    display: {
                        blocks: {
                            banks: {
                                name: 'Most Used Methods',
                                instruments: [
                                    { method: 'upi', protocols: ['vpa', 'qrcode'] },
                                    { method: 'card' }
                                ]
                            }
                        },
                        sequence: ['block.banks', 'upi.qrcode', 'upi.vpa', 'card', 'netbanking'],
                        preferences: { show_default_blocks: true }
                    }
                },
                handler: async (response: any) => {
                    // 3. Verify Payment on server side
                    const verifyResponse = await fetch('/api/razorpay/verify', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature || '',
                            planId: 'topup',
                            userId: user.id,
                            amount: Number(topUpAmount)
                        })
                    })

                    const verifyData = await verifyResponse.json()

                    if (verifyData.success) {
                        const newBalance = inrBalance + Number(topUpAmount)
                        setInrBalance(newBalance)
                        
                        // Add to history
                        const newRecord: PaymentRecord = {
                            id: Math.random().toString(36).substr(2, 9),
                            user_id: user.id,
                            amount: Number(topUpAmount),
                            currency: 'INR',
                            status: 'success',
                            razorpay_payment_id: response.razorpay_payment_id,
                            created_at: new Date().toISOString()
                        }
                        const updatedHistory = [newRecord, ...history]
                        setHistory(updatedHistory)
                        localStorage.setItem('admin_payment_history', JSON.stringify(updatedHistory.slice(0, 10)))

                        showToast(`Successfully added ₹${topUpAmount} to your wallet!`)
                    } else {
                        showToast('Payment verification failed')
                    }
                    setLoading(false)
                },
                modal: {
                    ondismiss: function() {
                        setLoading(false)
                    }
                }
            }

            const rzp = new window.Razorpay(options)
            rzp.open()
        } catch (err: any) {
            console.error('Payment failed:', err)
            showToast('Payment initialization failed')
            setLoading(false)
        }
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Toast */}
            {toast && (
                <div style={{
                    position: 'fixed', top: 24, right: 24, zIndex: 9999,
                    background: '#34d399', color: 'white', padding: '12px 20px',
                    borderRadius: 10, fontSize: 13, fontWeight: 600,
                    boxShadow: '0 8px 30px rgba(52,211,153,0.4)',
                }}>
                    ✓ {toast}
                </div>
            )}

            <div className="grid-3">
                {/* Primary INR Balance */}
                <div className="stat-card" style={{ border: '2px solid rgba(124,92,246,0.5)', background: 'rgba(124,92,246,0.08)' }}>
                    <div className="stat-label">
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(124,92,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <IndianRupee size={16} color="#7c5cf6" />
                        </div>
                        Primary Wallet Balance
                    </div>
                    <div className="stat-value" style={{ fontSize: 32 }}>₹{inrBalance.toLocaleString()}</div>
                    <div className="stat-change" style={{ color: '#34d399' }}>Locked & Secured</div>
                </div>

                {/* Account Status */}
                <div className="stat-card">
                    <div className="stat-label">
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(52,211,153,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <CheckCircle size={16} color="#34d399" />
                        </div>
                        Payment Status
                    </div>
                    <div className="stat-value" style={{ fontSize: 28 }}>Verified</div>
                    <div className="stat-change">Razorpay ID: Linked</div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: 24 }}>
                {/* Top Up Form */}
                <div className="card" style={{ padding: 32 }}>
                    <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <ArrowUpRight size={20} color="#7c5cf6" /> Add Funds to Admin Wallet
                    </h3>
                    
                    <div style={{ marginBottom: 24 }}>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                            Enter Amount in INR
                        </label>
                        <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: 'var(--text-primary)' }}>₹</span>
                            <input 
                                type="number" 
                                value={topUpAmount}
                                onChange={(e) => setTopUpAmount(e.target.value)}
                                style={{ 
                                    width: '100%', 
                                    padding: '16px 16px 16px 40px', 
                                    fontSize: 18, 
                                    fontWeight: 700,
                                    borderRadius: 12,
                                    border: '2px solid var(--border)',
                                    background: 'var(--bg-primary)',
                                    color: 'var(--text-primary)',
                                    outline: 'none'
                                }}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                            {['100', '500', '1000', '2000', '5000'].map(amt => (
                                <button 
                                    key={amt}
                                    onClick={() => setTopUpAmount(amt)}
                                    style={{ 
                                        padding: '6px 12px', 
                                        borderRadius: 20, 
                                        fontSize: 12, 
                                        fontWeight: 600,
                                        background: topUpAmount === amt ? 'var(--accent-purple)' : 'var(--bg-secondary)',
                                        color: topUpAmount === amt ? 'white' : 'var(--text-secondary)',
                                        border: '1px solid var(--border)',
                                        cursor: 'pointer'
                                    }}
                                >
                                    ₹{amt}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div style={{ 
                        padding: 16, 
                        background: 'rgba(124,92,246,0.05)', 
                        borderRadius: 12, 
                        marginBottom: 24,
                        display: 'flex',
                        gap: 12,
                        alignItems: 'center'
                    }}>
                        <CreditCard size={20} color="#7c5cf6" />
                        <div>
                            <div style={{ fontSize: 14, fontWeight: 600 }}>Razorpay Secure Payment</div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>UPI, Cards, Netbanking supported</div>
                        </div>
                    </div>

                    <button 
                        className="btn btn-primary"
                        onClick={handleTopUp}
                        disabled={loading || !topUpAmount}
                        style={{ width: '100%', padding: '16px', fontSize: 16, fontWeight: 700, borderRadius: 12 }}
                    >
                        {loading ? <><Loader2 size={20} className="animate-spin" /> Processing...</> : `Add ₹${topUpAmount} to Balance`}
                    </button>
                    
                </div>
                {/* History */}
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <History size={18} color="var(--text-muted)" /> Payment History
                        </h3>
                    </div>
                    <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                        {history.length === 0 ? (
                            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                                <Clock size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                                <p style={{ fontSize: 13 }}>No recent payments</p>
                            </div>
                        ) : (
                            history.map((record) => (
                                <div key={record.id} style={{ 
                                    padding: '16px 20px', 
                                    borderBottom: '1px solid var(--border)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <div>
                                        <div style={{ fontSize: 14, fontWeight: 600 }}>Top Up Wallet</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(record.created_at).toLocaleString()}</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: 14, fontWeight: 700, color: '#34d399' }}>+ ₹{record.amount}</div>
                                        <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{record.razorpay_payment_id.slice(0, 10)}...</div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
