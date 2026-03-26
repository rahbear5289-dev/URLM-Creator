'use client'

import { useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import {
    Coins, CheckCircle, AlertCircle, Gift, Percent,
    HardDrive, Tag, Loader2, Shield, Lock, ChevronRight
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

interface TokenRecord {
    id: string
    token_code: string
    name: string
    token_type: 'discount' | 'storage' | 'offer' | 'off'
    value: string
    status: boolean
    expiry_date: string | null
    expiry_time: string | null
    used_count: number
    max_usages: number
    admin_id: string | null
}

const TYPE_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string }> = {
    discount: { label: 'Discount',         icon: Percent,   color: '#ec4899', bg: 'rgba(236,72,153,0.1)' },
    storage:  { label: 'Storage Upgrade',  icon: HardDrive, color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
    offer:    { label: 'Special Offer',    icon: Gift,      color: '#7c5cf6', bg: 'rgba(124,92,246,0.1)' },
    off:      { label: 'Price Off',        icon: Tag,       color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
}

type StepState = 'idle' | 'validating' | 'need-admin-id' | 'ready' | 'claiming' | 'done'

const ERROR_MSGS: Record<string, string> = {
    not_found:        'Token not found',
    inactive:         'Token is inactive',
    expired:          'Token expired',
    limit_reached:    'Max usage reached',
    admin_id_mismatch: 'Access denied (Admin ID mismatch)',
    already_claimed:  'You have already claimed this token',
}

export default function TokenEnterPage() {
    const { user, storageUsage, refreshPlan } = useAuth()

    const [tokenInput,   setTokenInput]   = useState('')
    const [adminIdInput, setAdminIdInput] = useState('')
    const [token,        setToken]        = useState<TokenRecord | null>(null)
    const [step,         setStep]         = useState<StepState>('idle')
    const [errKey,       setErrKey]       = useState<string | null>(null)

    /* ─── helpers ─────────────────────────────────────────── */
    const setError = (key: string) => { setErrKey(key); setStep('idle'); setToken(null) }
    const resetAll = () => { setToken(null); setAdminIdInput(''); setStep('idle'); setErrKey(null) }

    /* ─── STEP1: validate token code ────────────────────── */
    const validateToken = async () => {
        if (!tokenInput.trim() || !user) return
        setStep('validating')
        setErrKey(null)
        setToken(null)

        const { data } = await supabase
            .from('promo_tokens')
            .select('*')
            .eq('token_code', tokenInput.trim().toUpperCase())
            .maybeSingle()

        if (!data) return setError('not_found')

        const t = data as TokenRecord

        if (!t.status)                                        return setError('inactive')
        if (t.used_count >= t.max_usages)                     return setError('limit_reached')

        // Date + time expiry check
        if (t.expiry_date) {
            const expiryStr = `${t.expiry_date.split('T')[0]}T${t.expiry_time || '23:59:59'}`
            if (new Date(expiryStr) < new Date())             return setError('expired')
        }

        // Total usage check (max_usages vs used_count) done above.
        // Single-redemption-per-user check removed as per user request.

        setToken(t)
        setStep(t.admin_id ? 'need-admin-id' : 'ready')
    }

    /* ─── STEP2: verify admin id ────────────────────────── */
    const verifyAdminId = async () => {
        if (!token) return

        setStep('validating') // Show loader state
        
        try {
            const tokenAdminId   = (token.admin_id   || '').trim().toUpperCase()
            const typedAdminId   = adminIdInput.trim().toUpperCase()

            console.log("Manual Admin ID Check:", { 
                token: tokenAdminId, 
                typed: typedAdminId 
            })

            // Secondary check: User must confirm by typing it (Security 'Double Lock')
            if (typedAdminId !== tokenAdminId) {
                console.warn("Input Admin ID mismatch")
                setStep('need-admin-id')
                return setErrKey('admin_id_mismatch')
            }

            setErrKey(null)
            setStep('ready')
        } catch (err) {
            console.error("Verification failed:", err)
            setStep('need-admin-id')
            setErrKey('not_found')
        }
    }

    /* ─── STEP3: claim token ────────────────────────────── */
    const claimToken = async () => {
        if (!token || !user) return
        setStep('claiming')

        try {
            // Increment used_count
            await supabase
                .from('promo_tokens')
                .update({ used_count: token.used_count + 1 })
                .eq('id', token.id)

            // Record redemption
            await supabase
                .from('token_redemptions')
                .insert({ token_id: token.token_code, user_id: user.id })

            // Apply reward
            if (token.token_type === 'storage') {
                const bytes = (parseInt(token.value) || 0) * 1024 ** 3
                const curr  = storageUsage?.credit || 0
                await supabase
                    .from('profiles')
                    .update({ storage_credit: curr + bytes })
                    .eq('id', user.id)
                await refreshPlan()
            }

            setStep('done')
        } catch {
            setStep('ready')
            setErrKey('not_found') // fallback error
        }
    }

    /* ─── type config safe ───────────────────────────────── */
    const cfg = token ? (TYPE_CONFIG[token.token_type] || TYPE_CONFIG.offer) : null
    const CfgIcon = cfg?.icon || Gift

    return (
        <DashboardLayout>
            <div style={{ maxWidth: 720, margin: '0 auto' }}>

                {/* ── Header ── */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 40 }}>
                    <div style={{
                        width: 64, height: 64, borderRadius: 18,
                        background: 'linear-gradient(135deg, #7c5cf6, #ec4899)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 10px 28px rgba(124,92,246,0.3)',
                        flexShrink: 0
                    }}>
                        <Coins size={32} color="white" />
                    </div>
                    <div>
                        <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0 }}>Apply Promo Token</h1>
                        <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                            Enter your token code to unlock rewards and storage upgrades
                        </p>
                    </div>
                </div>

                {/* ── Error Banner ── */}
                {errKey && (
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '14px 20px', borderRadius: 12, marginBottom: 22,
                        background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
                        color: '#f87171', fontWeight: 700, fontSize: 14,
                        animation: 'shake 0.3s ease'
                    }}>
                        <AlertCircle size={20} />
                        {ERROR_MSGS[errKey] || 'Something went wrong'}
                    </div>
                )}

                {/* ── CARD 1: Token Input ── */}
                <div className="card" style={{ marginBottom: 20, padding: 28 }}>
                    <label style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 12, display: 'block' }}>
                        Promo Code
                    </label>
                    <div style={{ display: 'flex', gap: 12 }}>
                        <input
                            id="promo-token-input"
                            type="text"
                            className="form-input"
                            placeholder="Enter Token Code  (e.g. DISC-ABCD-1234)"
                            value={tokenInput}
                            onChange={e => {
                                setTokenInput(e.target.value.toUpperCase())
                                if (step !== 'idle' && step !== 'done') resetAll()
                            }}
                            style={{ flex: 1, height: 52, fontSize: 17, fontWeight: 900, letterSpacing: '2px', textAlign: 'center' }}
                            disabled={step === 'claiming' || step === 'done' || step === 'need-admin-id' || step === 'ready'}
                        />
                        <button
                            id="validate-token-btn"
                            className="btn btn-primary"
                            style={{ width: 140, height: 52, fontSize: 15, fontWeight: 800, borderRadius: 12 }}
                            onClick={validateToken}
                            disabled={step !== 'idle' || !tokenInput.trim()}
                        >
                            {step === 'validating'
                                ? <Loader2 size={20} className="animate-spin" />
                                : <><CheckCircle size={18} /> Validate</>
                            }
                        </button>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>Codes are not case-sensitive</p>
                </div>

                {/* ── CARD 2: Admin ID Verification ── */}
                {step === 'need-admin-id' && token && (
                    <div className="card" style={{
                        marginBottom: 20, padding: 28,
                        border: '2px solid rgba(124,92,246,0.4)',
                        background: 'rgba(124,92,246,0.04)',
                        animation: 'slideDown 0.3s ease'
                    }}>
                        <div style={{ display: 'flex', gap: 16, marginBottom: 22 }}>
                            <div style={{
                                width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                                background: 'rgba(124,92,246,0.15)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <Lock size={24} color="#7c5cf6" />
                            </div>
                            <div>
                                <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>Admin ID Required</h3>
                                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '5px 0 0' }}>
                                    This token is restricted. Only users with the linked Admin ID can claim it.
                                </p>
                            </div>
                        </div>

                        {errKey === 'admin_id_mismatch' && (
                            <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: '#f87171', fontSize: 13, fontWeight: 700, marginBottom: 14, display: 'flex', gap: 8, alignItems: 'center' }}>
                                <AlertCircle size={16} /> Access denied (Admin ID mismatch)
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: 12 }}>
                            <input
                                id="admin-id-input"
                                type="text"
                                className="form-input"
                                placeholder="Enter your Admin ID  (e.g. ADM-001)"
                                value={adminIdInput}
                                onChange={e => { setAdminIdInput(e.target.value); setErrKey(null) }}
                                style={{ flex: 1, fontWeight: 700, letterSpacing: '1px' }}
                            />
                            <button
                                id="verify-admin-id-btn"
                                className="btn btn-primary"
                                style={{ fontWeight: 700 }}
                                onClick={verifyAdminId}
                            >
                                <Shield size={16} /> Verify Access
                            </button>
                        </div>
                        <button className="btn btn-secondary btn-sm" style={{ marginTop: 14 }} onClick={resetAll}>
                            <ChevronRight size={13} style={{ transform: 'rotate(180deg)' }} /> Start Over
                        </button>
                    </div>
                )}

                {/* ── CARD 3: Token Preview + Claim ── */}
                {step === 'ready' && token && cfg && (
                    <div className="card" style={{
                        padding: 0, overflow: 'hidden',
                        border: `2px solid ${cfg.color}`,
                        animation: 'bounceIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                    }}>
                        {/* Token Type badge strip */}
                        <div style={{ background: cfg.color, padding: '10px 28px', display: 'flex', alignItems: 'center', gap: 10 }}>
                            <CfgIcon size={18} color="white" />
                            <span style={{ fontSize: 13, fontWeight: 800, color: 'white', textTransform: 'uppercase', letterSpacing: 1 }}>
                                {cfg.label} Token
                            </span>
                            {token.admin_id && (
                                <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(0,0,0,0.2)', padding: '3px 10px', borderRadius: 20, fontSize: 11, color: 'white', fontWeight: 700 }}>
                                    <Shield size={11} /> Admin ID Verified ✓
                                </span>
                            )}
                        </div>

                        <div style={{ padding: 28 }}>
                            <h2 style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-primary)', margin: '0 0 6px' }}>{token.name}</h2>
                            <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>
                                Code: <strong>{token.token_code}</strong> &nbsp;·&nbsp; {token.used_count}/{token.max_usages} used
                            </p>

                            {/* Reward Highlight */}
                            <div style={{
                                margin: '20px 0',
                                padding: 24, borderRadius: 16,
                                background: cfg.bg,
                                border: `1px solid ${cfg.color}30`,
                                textAlign: 'center'
                            }}>
                                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>Reward:</div>
                                <div style={{ fontSize: 38, fontWeight: 900, color: cfg.color }}>
                                    {token.token_type === 'discount' ? `${token.value}% Discount`
                                     : token.token_type === 'storage' ? `${token.value} GB Extra Storage`
                                     : token.token_type === 'off'     ? `₹${token.value} Off`
                                     : token.value}
                                </div>
                            </div>

                            <button
                                id="claim-reward-btn"
                                className="btn btn-primary"
                                style={{ width: '100%', height: 58, fontSize: 18, fontWeight: 800, borderRadius: 14 }}
                                onClick={claimToken}
                            >
                                <Gift size={22} /> Claim Reward Now →
                            </button>
                        </div>
                    </div>
                )}

                {/* ── DONE STATE ── */}
                {step === 'done' && (
                    <div className="card" style={{
                        textAlign: 'center', padding: '48px 28px',
                        border: '2px solid #10b981',
                        background: 'rgba(16,185,129,0.03)',
                        animation: 'bounceIn 0.4s ease'
                    }}>
                        <div style={{ width: 88, height: 88, borderRadius: '50%', background: 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                            <CheckCircle size={50} color="#10b981" />
                        </div>
                        <h2 style={{ fontSize: 26, fontWeight: 900, color: '#10b981', margin: '0 0 8px' }}>Token Claimed!</h2>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: 28 }}>
                            Your reward has been applied to your account. Enjoy!
                        </p>
                        <button className="btn btn-secondary" onClick={() => { setTokenInput(''); resetAll() }}>
                            Apply Another Token
                        </button>
                    </div>
                )}

                {/* ── Info footer ── */}
                {step === 'idle' && !errKey && (
                    <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        {[
                            { icon: CheckCircle, color: '#10b981', title: 'Step 1 — Enter Code',   desc: 'Type your promo token code and click Validate.' },
                            { icon: Shield,      color: '#7c5cf6', title: 'Step 2 — Admin ID',     desc: 'If restricted, verify your linked Admin ID.' },
                            { icon: Gift,        color: '#ec4899', title: 'Step 3 — Claim',        desc: 'Review the reward and click Claim Reward.' },
                            { icon: Coins,       color: '#f59e0b', title: 'Note',                  desc: 'Tokens are valid until expiry or max usage limit reached.' },
                        ].map(s => {
                            const Icon = s.icon
                            return (
                                <div key={s.title} style={{ display: 'flex', gap: 12, padding: '16px', background: 'var(--bg-primary)', borderRadius: 12, border: '1px solid var(--border)' }}>
                                    <div style={{ width: 36, height: 36, borderRadius: 10, background: `${s.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <Icon size={18} color={s.color} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 3 }}>{s.title}</div>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>{s.desc}</div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            <style jsx>{`
                @keyframes shake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-6px); } 75% { transform: translateX(6px); } }
                @keyframes slideDown { from { opacity:0; transform:translateY(-10px); } to { opacity:1; transform:translateY(0); } }
                @keyframes bounceIn { 0% { transform:scale(0.9); opacity:0; } 70% { transform:scale(1.02); } 100% { transform:scale(1); opacity:1; } }
            `}</style>
        </DashboardLayout>
    )
}
