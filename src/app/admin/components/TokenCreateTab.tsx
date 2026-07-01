    'use client'

    import { useState, useEffect } from 'react'
    import { useRouter } from 'next/navigation'
    import {
        Plus, Zap, Gift, Percent, HardDrive, Tag,
        Copy, RefreshCw, Loader2, Trash2, Edit2,
        X, Shield, CheckCircle, Phone, Calendar,
        Clock, ToggleLeft, ToggleRight, ChevronDown, 
        Wallet, ArrowUpCircle, AlertTriangle, Lock, Unlock, KeyRound
    } from 'lucide-react'
    import { supabase } from '@/lib/supabase'

    type TokenType = 'discount' | 'storage' | 'offer' | 'off'
    type AccessMode = 'lock' | 'open'

    interface TokenRecord {
        id: string
        token_code: string
        name: string
        token_type: TokenType
        access_mode: AccessMode
        value: string
        status: boolean
        expiry_date: string | null
        expiry_time: string | null
        created_at: string
        used_count: number
        max_usages: number
        admin_id: string | null
        contact: string | null
    }

    const ACCESS_MODE_CONFIG: Record<AccessMode, { label: string; icon: any; color: string; bg: string; border: string; desc: string }> = {
        open: { label: 'OPEN', icon: Unlock, color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.35)', desc: 'All features unlocked for user ✅' },
        lock: { label: 'LOCK', icon: Lock,   color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.35)',   desc: 'All features disabled for user ❌' },
    }

    const TYPE_CONFIG: Record<TokenType, { label: string; icon: any; color: string; bg: string; desc: string }> = {
        discount: { label: 'Discount',  icon: Percent,    color: '#ec4899', bg: 'rgba(236,72,153,0.12)',   desc: '% or flat discount on pricing' },
        storage:  { label: 'Storage',   icon: HardDrive,  color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',   desc: 'Extra cloud storage (GB)' },
        offer:    { label: 'Offer',     icon: Gift,       color: '#7c5cf6', bg: 'rgba(124,92,246,0.12)',   desc: 'Special feature unlock' },
        off:      { label: 'Off',       icon: Tag,        color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',   desc: 'Price reduction on plans' },
    }

    const emptyForm = {
        name:        '',
        token_type:  'discount' as TokenType,
        access_mode: 'open' as AccessMode,
        value:       '10',
        token_code:  '',
        admin_id:    '', // Now optional
        max_usages:  '100',
        expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Default 30 days
        expiry_time: '23:59',
        contact:     '',
        status:      true,
    }

    export default function TokenCreateTab() {
        const router                        = useRouter()
        const [form, setForm]               = useState({ ...emptyForm })
        const [tokens, setTokens]           = useState<TokenRecord[]>([])
        const [submitting, setSubmitting]   = useState(false)
        const [editTarget, setEditTarget]   = useState<TokenRecord | null>(null)
        const [copied, setCopied]           = useState<string | null>(null)
        const [toast, setToast]             = useState<{ msg: string; ok: boolean } | null>(null)
        const [balance, setBalance]         = useState<number>(0) // Primary Cash (INR)
        const [tokenBalance, setTokenBalance] = useState<number>(0) // INF Tokens
        const [user, setUser]               = useState<any>(null)

        /* ─── helpers ─────────────────────────────────────────── */
        const showToast = (msg: string, ok = true) => {
            setToast({ msg, ok })
            setTimeout(() => setToast(null), 3500)
        }

        const f = (key: keyof typeof form, val: any) =>
            setForm(prev => ({ ...prev, [key]: val }))

        const generateCode = () => {
            const prefix = form.token_type.toUpperCase().slice(0, 4)
            const rand = (n: number) => {
                const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
                return Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
            }
            f('token_code', `${prefix}-${rand(4)}-${rand(4)}`)
        }

        /* ─── data ────────────────────────────────────────────── */
        const loadTokens = async () => {
            const { data } = await supabase
                .from('promo_tokens')
                .select('*')
                .order('created_at', { ascending: false })
            if (data) setTokens(data as TokenRecord[])
        }

        const fetchProfile = async () => {
        const { data: { user: u } } = await supabase.auth.getUser()
        if (!u) return
        setUser(u)
        
        const { data: profile } = await supabase
            .from('profiles')
            .select('wallet_balance, token_balance')
            .eq('id', u.id)
            .single()
        
        if (profile) {
            setBalance(Number(profile.wallet_balance) || 0)
            setTokenBalance(Number(profile.token_balance) || 0)
        }
    }

    const rechargeWallet = async () => {
        if (!user) return
        
        // RE-FETCH FRESH BALANCE: Ensure we don't overwrite new funds
        const { data: latestProfile } = await supabase
            .from('profiles')
            .select('wallet_balance, token_balance')
            .eq('id', user.id)
            .single()
        
        const currentBal = Number(latestProfile?.wallet_balance) || 0
        const currentTokens = Number(latestProfile?.token_balance) || 0

        if (currentBal < 50) return showToast('Insufficient Primary Balance! Please add funds.', false)
        
        const spendAmount = 50 
        const tokenAdd = 50 
        
        const newInrBal = currentBal - spendAmount
        const newTokenBal = currentTokens + tokenAdd
        
        const { error } = await supabase
            .from('profiles')
            .update({ 
                wallet_balance: newInrBal,
                token_balance: newTokenBal 
            })
            .eq('id', user.id)
        
        if (!error) {
            setBalance(newInrBal)
            setTokenBalance(newTokenBal)
            showToast(`Converted ₹${spendAmount} to ${tokenAdd} INF successfully!`)
        } else {
            showToast('Recharge failed', false)
        }
    }

    useEffect(() => { 
        loadTokens()
        fetchProfile()

        // REAL-TIME SYNC: Listen for wallet balance changes
        let channel: any
        const setupRealtime = async () => {
            const { data: { user: u } } = await supabase.auth.getUser()
            if (!u) return

            channel = supabase
                .channel(`wallet-sync-${u.id}`)
                .on('postgres_changes', { 
                    event: 'UPDATE', 
                    schema: 'public', 
                    table: 'profiles',
                    filter: `id=eq.${u.id}`
                }, (payload) => {
                    const newBal = payload.new.wallet_balance
                    const newTokenBal = payload.new.token_balance
                    if (newBal !== undefined) setBalance(Number(newBal))
                    if (newTokenBal !== undefined) setTokenBalance(Number(newTokenBal))
                    console.log("Real-time balance updated:", { newBal, newTokenBal })
                })
                .subscribe()
        }
        setupRealtime()

        return () => {
            if (channel) supabase.removeChannel(channel)
        }
    }, [])

    /* ─── submit ──────────────────────────────────────────── */
    const handleSubmit = async () => {
        if (!form.name.trim()) return showToast('Token name is required', false)
        if (!form.expiry_date) return showToast('Expiry date is required', false)

        const code = form.token_code.trim() || (() => {
            const prefix = form.token_type.toUpperCase().slice(0, 4)
            const rand = (n: number) => {
                const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
                return Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
            }
            return `${prefix}-${rand(4)}-${rand(4)}`
        })()

        // WALLET CHECK: 1 INF per token
        if (!editTarget && tokenBalance < 1) {
            return showToast('Insufficient INF balance! Please recharge tokens.', false)
        }

        setSubmitting(true)
        try {
            const payload = {
                token_code:  code.toUpperCase(),
                name:        form.name.trim(),
                token_type:  form.token_type,
                access_mode: form.access_mode,
                value:       form.value,
                status:      form.status,
                expiry_date: form.expiry_date || null,
                expiry_time: form.expiry_time || null,
                max_usages:  parseInt(form.max_usages) || 100,
                admin_id:    form.admin_id.trim() || null, // Allow null
                contact:     form.contact.trim() || null,
                user_id:     (await supabase.auth.getUser()).data.user?.id,
            }

            let err
            if (editTarget) {
                ({ error: err } = await supabase.from('promo_tokens').update(payload).eq('id', editTarget.id))
            } else {
                ({ error: err } = await supabase.from('promo_tokens').insert(payload))
            }

            if (err) throw err
            
            // DEDUCT TOKEN WALLET: Only for new tokens
            if (!editTarget && user) {
                const finalTokenBal = Math.max(0, tokenBalance - 1)
                await supabase
                    .from('profiles')
                    .update({ token_balance: finalTokenBal })
                    .eq('id', user.id)
                setTokenBalance(finalTokenBal)
                console.log("Token wallet deducted 1 INF. Remaining:", finalTokenBal)
            }

            showToast(editTarget ? 'Token updated ✓' : `Token created: ${code} (-1 INF)`)
            setForm({ ...emptyForm })
            setEditTarget(null)
            loadTokens()
        } catch (e: any) {
            showToast(e.message || 'Error saving token', false)
        } finally {
            setSubmitting(false)
        }
    }

    const handleWalletClick = async () => {
        if (!user) return
        if (balance < 50) return showToast('Insufficient balance! Need ₹50 to enter Payment Page.', false)
        
        const newBal = balance - 50
        const { error } = await supabase
            .from('profiles')
            .update({ wallet_balance: newBal })
            .eq('id', user.id)
            
        if (!error) {
            setBalance(newBal)
            showToast('Redirecting to Payment... ₹50 Deducted! 💸')
            
            // Navigate to Upgrade ("Payment") Page
            setTimeout(() => {
                router.push('/upgrade')
            }, 800)
        }
    }

    const handleEdit = (t: TokenRecord) => {
        setEditTarget(t)
        setForm({
            name:        t.name,
            token_type:  t.token_type,
            access_mode: t.access_mode || 'open',
            value:       t.value,
            token_code:  t.token_code,
            admin_id:    t.admin_id || '',
            max_usages:  String(t.max_usages),
            expiry_date: t.expiry_date ? t.expiry_date.split('T')[0] : '',
            expiry_time: t.expiry_time ? t.expiry_time.slice(0, 5) : '23:59',
            contact:     t.contact || '',
            status:      t.status,
        })
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this token permanently?')) return
        const { error } = await supabase.from('promo_tokens').delete().eq('id', id)
        if (error) return showToast('Delete failed', false)
        showToast('Token deleted')
        loadTokens()
    }

    const copyCode = async (code: string) => {
        await navigator.clipboard.writeText(code)
        setCopied(code)
        setTimeout(() => setCopied(null), 2000)
    }

    /* ─── stats ───────────────────────────────────────────── */
    const active   = tokens.filter(t => t.status).length
    const restricted = tokens.filter(t => t.admin_id).length

    /* ─── render ──────────────────────────────────────────── */
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

            {/* ── Toast ── */}
            {toast && (
                <div style={{
                    position: 'fixed', top: 24, right: 24, zIndex: 9999,
                    background: toast.ok ? '#10b981' : '#ef4444',
                    color: 'white', padding: '14px 24px', borderRadius: 12,
                    fontSize: 14, fontWeight: 700,
                    boxShadow: `0 12px 30px ${toast.ok ? 'rgba(16,185,129,0.35)' : 'rgba(239,68,68,0.35)'}`,
                    display: 'flex', alignItems: 'center', gap: 10,
                    animation: 'slideIn 0.3s ease-out'
                }}>
                    <CheckCircle size={18} />
                    {toast.msg}
                </div>
            )}

            {/* ── Top Layout: Form + Sidebar ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24, alignItems: 'start' }}>

                {/* ── CREATE / EDIT FORM ── */}
                <div className="card" style={{
                    border: editTarget
                        ? '2px solid var(--accent-purple)'
                        : '1px solid var(--border)',
                }}>

                    {/* Form header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{
                                width: 40, height: 40, borderRadius: 10,
                                background: editTarget ? 'rgba(124,92,246,0.15)' : 'rgba(124,92,246,0.1)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                {editTarget ? <Edit2 size={20} color="#7c5cf6" /> : <Plus size={22} color="#7c5cf6" />}
                            </div>
                            <div>
                                <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                                    {editTarget ? 'Edit Promo Token' : 'Create New Promo Token'}
                                </h3>
                                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                                    {editTarget ? `Editing: ${editTarget.token_code}` : 'Fill all required fields to generate a token'}
                                </p>
                            </div>
                        </div>
                        {editTarget && (
                            <button className="btn btn-secondary btn-sm" onClick={() => { setEditTarget(null); setForm({ ...emptyForm }) }}>
                                <X size={14} /> Cancel
                            </button>
                        )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

                        {/* Row 1: Name + Token Type */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                            <div className="form-group">
                                <label className="form-label">Token Name <span style={{ color: '#ef4444' }}>*</span></label>
                                <input type="text" className="form-input"
                                    placeholder="e.g. Summer VIP Offer"
                                    value={form.name}
                                    onChange={e => f('name', e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Token Type <span style={{ color: '#ef4444' }}>*</span></label>
                                <select className="form-input" value={form.token_type}
                                    onChange={e => f('token_type', e.target.value as TokenType)}>
                                    {(Object.keys(TYPE_CONFIG) as TokenType[]).map(k => (
                                        <option key={k} value={k}>{TYPE_CONFIG[k].label} — {TYPE_CONFIG[k].desc}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Token Type Preview */}
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            background: TYPE_CONFIG[form.token_type].bg,
                            border: `1px solid ${TYPE_CONFIG[form.token_type].color}40`,
                            borderRadius: 10, padding: '10px 16px'
                        }}>
                            {(() => { const Icon = TYPE_CONFIG[form.token_type].icon; return <Icon size={18} color={TYPE_CONFIG[form.token_type].color} /> })()}
                            <span style={{ fontSize: 13, color: TYPE_CONFIG[form.token_type].color, fontWeight: 700 }}>
                                {TYPE_CONFIG[form.token_type].label} Token — {TYPE_CONFIG[form.token_type].desc}
                            </span>
                        </div>

                        {/* Access Mode — LOCK / OPEN */}
                        <div className="form-group">
                            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <KeyRound size={13} />
                                Access Mode <span style={{ color: '#ef4444' }}>*</span>
                                <span style={{ marginLeft: 4, fontSize: 9, background: 'rgba(239,68,68,0.15)', color: '#f87171', padding: '2px 7px', borderRadius: 4, fontWeight: 700, letterSpacing: 0.5 }}>CORE FEATURE</span>
                            </label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                {(['open', 'lock'] as AccessMode[]).map(mode => {
                                    const cfg = ACCESS_MODE_CONFIG[mode]
                                    const Icon = cfg.icon
                                    const isSelected = form.access_mode === mode
                                    return (
                                        <div
                                            key={mode}
                                            id={`access-mode-${mode}`}
                                            onClick={() => f('access_mode', mode)}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: 12,
                                                padding: '14px 16px', borderRadius: 12, cursor: 'pointer',
                                                border: `2px solid ${isSelected ? cfg.color : 'var(--border)'}`,
                                                background: isSelected ? cfg.bg : 'var(--bg-secondary)',
                                                transition: 'all 0.2s', userSelect: 'none',
                                                position: 'relative', overflow: 'hidden'
                                            }}
                                        >
                                            {isSelected && (
                                                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: `${cfg.color}08`, pointerEvents: 'none' }} />
                                            )}
                                            <div style={{
                                                width: 40, height: 40, borderRadius: 10,
                                                background: isSelected ? `${cfg.color}22` : 'var(--border)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                flexShrink: 0, transition: 'all 0.2s'
                                            }}>
                                                <Icon size={20} color={isSelected ? cfg.color : 'var(--text-muted)'} />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: 15, fontWeight: 800, color: isSelected ? cfg.color : 'var(--text-secondary)', letterSpacing: 0.5 }}>
                                                    {cfg.label}
                                                </div>
                                                <div style={{ fontSize: 11, color: isSelected ? cfg.color : 'var(--text-muted)', marginTop: 2, opacity: 0.85 }}>
                                                    {cfg.desc}
                                                </div>
                                            </div>
                                            {isSelected && (
                                                <CheckCircle size={16} color={cfg.color} style={{ flexShrink: 0 }} />
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, lineHeight: 1.5 }}>
                                🔐 When user applies this token: <strong style={{ color: form.access_mode === 'lock' ? '#f87171' : '#34d399' }}>
                                    {form.access_mode === 'lock' ? 'My Photos, Create Sheet, PVC Card, PDF Converter, PDF Crop → Disabled ❌' : 'All features → Enabled ✅'}
                                </strong>
                            </p>
                        </div>

                        {/* Row 2: Token Code + Value */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                            <div className="form-group">
                                <label className="form-label">Token ID / Code <span style={{ color: '#ef4444' }}>*</span></label>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <input type="text" className="form-input"
                                        placeholder="e.g. DISC-ABCD-1234"
                                        value={form.token_code}
                                        onChange={e => f('token_code', e.target.value.toUpperCase())}
                                        style={{ fontWeight: 800, letterSpacing: '1px', flex: 1 }}
                                    />
                                    <button className="btn btn-secondary btn-sm" onClick={generateCode} title="Auto generate unique code">
                                        <RefreshCw size={14} />
                                    </button>
                                </div>
                                <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '4px 0 0 2px' }}>Leave blank to auto-generate</p>
                            </div>
                            <div className="form-group">
                                <label className="form-label">
                                    {form.token_type === 'discount' ? 'Discount %'
                                    : form.token_type === 'storage'  ? 'Extra GB'
                                    : form.token_type === 'off'      ? 'Price Off (₹)'
                                    : 'Offer Value'}
                                </label>
                                <input type={form.token_type === 'offer' ? 'text' : 'number'} className="form-input"
                                    placeholder={form.token_type === 'offer' ? 'e.g. Free 7-day Pro trial' : '10'}
                                    value={form.value}
                                    onChange={e => f('value', e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Row 3: Admin ID (Required) + Max Usages */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                            <div className="form-group">
                                <label className="form-label">
                                    Admin ID ⚡ <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>(Optional)</span>
                                    <span style={{ marginLeft: 6, fontSize: 9, background: 'rgba(124,92,246,0.2)', color: '#a78bfa', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>RESTRICT KEY</span>
                                </label>
                                <input type="text" className="form-input"
                                    placeholder="e.g. ADM-001 or leave empty"
                                    value={form.admin_id}
                                    onChange={e => f('admin_id', e.target.value)}
                                />
                                <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '4px 0 0 2px' }}>
                                    🔐 If set, only users with this Admin ID can use this token. Leave empty for public use.
                                </p>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Max Usages <span style={{ color: '#ef4444' }}>*</span></label>
                                <input type="number" className="form-input" min={1}
                                    value={form.max_usages}
                                    onChange={e => f('max_usages', e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Row 4: Expiry Date + Expiry Time */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                            <div className="form-group">
                                <label className="form-label">
                                    <Calendar size={13} style={{ marginRight: 5, display: 'inline' }} />
                                    Expiry Date <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <input type="date" className="form-input"
                                    value={form.expiry_date}
                                    onChange={e => f('expiry_date', e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">
                                    <Clock size={13} style={{ marginRight: 5, display: 'inline' }} />
                                    Expiry Time <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <input type="time" className="form-input"
                                    value={form.expiry_time}
                                    onChange={e => f('expiry_time', e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Row 5: Contact (optional) + Status toggle */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                            <div className="form-group">
                                <label className="form-label">
                                    <Phone size={13} style={{ marginRight: 5, display: 'inline' }} />
                                    Contact <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>(optional)</span>
                                </label>
                                <input type="text" className="form-input"
                                    placeholder="e.g. +91 98765 43210 or email"
                                    value={form.contact}
                                    onChange={e => f('contact', e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Status</label>
                                <div
                                    onClick={() => f('status', !form.status)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 12,
                                        padding: '0 16px', height: 42, borderRadius: 10,
                                        border: `1.5px solid ${form.status ? '#10b981' : 'var(--border)'}`,
                                        background: form.status ? 'rgba(16,185,129,0.08)' : 'var(--bg-secondary)',
                                        cursor: 'pointer', userSelect: 'none', transition: 'all 0.2s'
                                    }}
                                >
                                    {/* pill toggle */}
                                    <div style={{
                                        width: 44, height: 22, borderRadius: 20,
                                        background: form.status ? '#10b981' : 'var(--border)',
                                        position: 'relative', transition: 'background 0.2s', flexShrink: 0
                                    }}>
                                        <div style={{
                                            width: 18, height: 18, borderRadius: '50%', background: 'white',
                                            position: 'absolute', top: 2,
                                            left: form.status ? 24 : 2,
                                            transition: 'left 0.2s',
                                            boxShadow: '0 1px 4px rgba(0,0,0,0.25)'
                                        }} />
                                    </div>
                                    <span style={{ fontSize: 14, fontWeight: 700, color: form.status ? '#10b981' : 'var(--text-muted)' }}>
                                        {form.status ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            className="btn btn-primary"
                            style={{ width: '100%', height: 52, fontSize: 16, fontWeight: 800, borderRadius: 12, marginTop: 4 }}
                            onClick={handleSubmit}
                            disabled={submitting}
                        >
                            {submitting
                                ? <><Loader2 size={18} className="animate-spin" /> Processing...</>
                                : editTarget
                                    ? <><Edit2 size={18} /> Update Token</>
                                    : <><Zap size={18} /> Create Token</>
                            }
                        </button>
                    </div>
                </div>

                {/* ── Sidebar ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

                    {/* Stats */}
                    <div className="card" style={{ background: 'var(--bg-primary)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                            <h4 style={{ fontSize: 14, fontWeight: 800, margin: 0 }}>Token Overview</h4>
                            <button className="btn btn-secondary btn-sm" style={{ padding: '2px 8px', fontSize: 10 }} onClick={() => copyCode(user?.id || '')}>
                                <Copy size={10} /> My Admin ID
                            </button>
                        </div>
                        {[
                            { label: 'Total Tokens',          value: tokens.length,     color: '#7c5cf6' },
                            { label: 'Active',                value: active,            color: '#10b981' },
                            { label: 'Inactive',              value: tokens.length - active, color: '#ef4444' },
                            { label: 'Admin ID Restricted',   value: restricted,        color: '#f59e0b' },
                        ].map(s => (
                            <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{s.label}</span>
                                <span style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.value}</span>
                            </div>
                        ))}
                    </div>

                    {/* Token Types Info */}
                    <div className="card" style={{ padding: 20 }}>
                        <h4 style={{ fontSize: 13, fontWeight: 800, marginBottom: 14, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1 }}>Token Types</h4>
                        {(Object.keys(TYPE_CONFIG) as TokenType[]).map(k => {
                            const cfg = TYPE_CONFIG[k]
                            const Icon = cfg.icon
                            return (
                                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                                    <div style={{ width: 30, height: 30, borderRadius: 8, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Icon size={15} color={cfg.color} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{cfg.label}</div>
                                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{cfg.desc}</div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* Access Mode Info Card */}
                    <div className="card" style={{ background: 'rgba(124,92,246,0.04)', border: '1px solid rgba(124,92,246,0.2)', padding: 18 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                            <KeyRound size={16} color="#7c5cf6" />
                            <span style={{ fontSize: 13, fontWeight: 800, color: '#a78bfa' }}>Access Mode Logic</span>
                        </div>
                        {(['open', 'lock'] as AccessMode[]).map(mode => {
                            const cfg = ACCESS_MODE_CONFIG[mode]
                            const Icon = cfg.icon
                            return (
                                <div key={mode} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                                    <div style={{ width: 28, height: 28, borderRadius: 7, background: cfg.bg, border: `1px solid ${cfg.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <Icon size={13} color={cfg.color} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 12, fontWeight: 800, color: cfg.color }}>{cfg.label} Mode</div>
                                        <div style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.5, marginTop: 2 }}>{cfg.desc}</div>
                                    </div>
                                </div>
                            )
                        })}
                        <p style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.6, marginTop: 12, marginBottom: 0 }}>
                            Affected features: <strong style={{ color: 'var(--text-secondary)' }}>My Photos, Create Sheet, PVC Card, PDF Converter, PDF Crop</strong>
                        </p>
                    </div>

                    {/* Admin ID Info */}
                    <div className="card" style={{ background: 'rgba(124,92,246,0.06)', border: '1px solid rgba(124,92,246,0.25)', padding: 18 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                            <Shield size={16} color="#7c5cf6" />
                            <span style={{ fontSize: 13, fontWeight: 800, color: '#a78bfa' }}>Admin ID Logic</span>
                        </div>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7, margin: 0 }}>
                            The <strong style={{ color: '#a78bfa' }}>Admin ID</strong> you set here is the access key. 
                            Only users whose profile has the same Admin ID will be able to claim this token. All others will be rejected.
                        </p>
                    </div>

                    {/* Admin Wallet UI */}
                    <div 
                        className="card" 
                        onClick={handleWalletClick}
                        style={{ 
                            background: 'linear-gradient(145deg, #1e1e2d, #161625)', 
                            border: '1px solid #7c5cf640',
                            padding: 24,
                            position: 'relative',
                            overflow: 'hidden',
                            cursor: 'pointer',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            transform: 'translateY(0)',
                        }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        <div style={{ position: 'absolute', top: -20, right: -20, opacity: 0.1 }}>
                            <Wallet size={120} color="#7c5cf6" />
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(124,92,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Shield size={16} color="#a78bfa" />
                            </div>
                            <span style={{ fontSize: 13, fontWeight: 800, color: '#fefefe', letterSpacing: 0.5 }}>PRIMARY WALLET</span>
                            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(16,185,129,0.15)', padding: '3px 8px', borderRadius: 6 }}>
                                <Lock size={10} color="#10b981" />
                                <span style={{ fontSize: 9, fontWeight: 800, color: '#10b981' }}>LOCKED & SECURED</span>
                            </div>
                        </div>

                        <div style={{ marginBottom: 20 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                <div>
                                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 700, marginBottom: 2 }}>PRIMARY WALLET BALANCE (INR)</div>
                                    <div style={{ fontSize: 16, fontWeight: 800, color: '#34d399', display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <span style={{ fontSize: 12 }}>₹</span>
                                        {balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 700, marginBottom: 2 }}>PRIMARY WALLET (INF)</div>
                                    <div style={{ fontSize: 24, fontWeight: 900, color: 'white' }}>
                                        {tokenBalance.toLocaleString()} INF
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5, marginBottom: 18 }}>
                            Automated System Cost: <strong style={{color: '#ef4444'}}>1 INF</strong> per token.
                        </div>

                        <button 
                            className="btn btn-primary" 
                            style={{ 
                                width: '100%', height: 44, fontSize: 13, fontWeight: 800, 
                                borderRadius: 10, background: '#7c5cf6',
                                border: 'none', cursor: 'pointer', display: 'flex', 
                                alignItems: 'center', justifyContent: 'center', gap: 8
                            }}
                            onClick={(e) => { e.stopPropagation(); rechargeWallet(); }}
                        >
                            <ArrowUpCircle size={16} /> Recharge Tokens (₹50 = 50 INF)
                        </button>
                        
                        {tokenBalance < 5 && (
                            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6, color: '#f59e0b', fontSize: 10, fontWeight: 700 }}>
                                <AlertTriangle size={12} /> Low INF balance! Please recharge soon.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Token Management Table ── */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '20px 28px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Token Management</h3>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>All promo tokens generated in the system</p>
                    </div>
                    <button className="btn btn-secondary btn-sm" onClick={loadTokens}>
                        <RefreshCw size={14} /> Refresh
                    </button>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th style={{ padding: '14px 28px' }}>Token Name</th>
                                <th>Type</th>
                                <th>Access Mode</th>
                                <th>Token Code</th>
                                <th>Admin ID ⚡</th>
                                <th>Usage</th>
                                <th>Expiry</th>
                                <th>Status</th>
                                <th style={{ textAlign: 'right', paddingRight: 28 }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tokens.length === 0 ? (
                                <tr>
                                    <td colSpan={9} style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
                                        <Gift size={40} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.2 }} />
                                        No tokens yet. Create one above.
                                    </td>
                                </tr>
                            ) : tokens.map(token => {
                                const cfg = TYPE_CONFIG[token.token_type] || TYPE_CONFIG.offer
                                const Icon = cfg.icon
                                const expired = token.expiry_date && new Date(`${token.expiry_date.split('T')[0]}T${token.expiry_time || '23:59'}`) < new Date()
                                const usagePercent = Math.min(100, (token.used_count / token.max_usages) * 100)
                                return (
                                    <tr key={token.id}>
                                        <td style={{ padding: '14px 28px' }}>
                                            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 14 }}>{token.name}</div>
                                            {token.contact && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{token.contact}</div>}
                                        </td>
                                        <td>
                                            <span style={{
                                                display: 'inline-flex', alignItems: 'center', gap: 5,
                                                padding: '4px 10px', borderRadius: 20,
                                                background: cfg.bg, color: cfg.color, fontSize: 12, fontWeight: 700
                                            }}>
                                                <Icon size={12} /> {cfg.label}
                                            </span>
                                        </td>
                                        {/* Access Mode Badge */}
                                        <td>
                                            {(() => {
                                                const am = (token.access_mode || 'open') as AccessMode
                                                const amCfg = ACCESS_MODE_CONFIG[am]
                                                const AmIcon = amCfg.icon
                                                return (
                                                    <span style={{
                                                        display: 'inline-flex', alignItems: 'center', gap: 5,
                                                        padding: '5px 12px', borderRadius: 20,
                                                        background: amCfg.bg,
                                                        border: `1px solid ${amCfg.border}`,
                                                        color: amCfg.color, fontSize: 12, fontWeight: 800,
                                                        letterSpacing: 0.4
                                                    }}>
                                                        <AmIcon size={12} /> {amCfg.label}
                                                    </span>
                                                )
                                            })()}
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <code style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)' }}>{token.token_code}</code>
                                                <button className="icon-btn" style={{ width: 22, height: 22 }} onClick={() => copyCode(token.token_code)}>
                                                    <Copy size={11} />
                                                </button>
                                                {copied === token.token_code && <span style={{ fontSize: 9, color: '#10b981', fontWeight: 800 }}>COPIED</span>}
                                            </div>
                                        </td>
                                        <td>
                                            {token.admin_id ? (
                                                <span style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px',
                                                    borderRadius: 20, background: 'rgba(124,92,246,0.12)',
                                                    color: '#a78bfa', fontSize: 12, fontWeight: 800, border: '1px solid rgba(124,92,246,0.3)'
                                                }}>
                                                    <Shield size={11} /> {token.admin_id}
                                                </span>
                                            ) : (
                                                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>— Public —</span>
                                            )}
                                        </td>
                                        <td>
                                            <div style={{ fontSize: 13, fontWeight: 700 }}>{token.used_count} / {token.max_usages}</div>
                                            <div style={{ width: 80, height: 4, background: 'var(--border)', borderRadius: 2, marginTop: 5 }}>
                                                <div style={{ width: `${usagePercent}%`, height: '100%', background: usagePercent >= 100 ? '#ef4444' : '#7c5cf6', borderRadius: 2, transition: 'width 0.4s' }} />
                                            </div>
                                        </td>
                                        <td>
                                            {token.expiry_date ? (
                                                <div>
                                                    <div style={{ fontSize: 12, fontWeight: 700, color: expired ? '#ef4444' : 'var(--text-primary)' }}>
                                                        {new Date(token.expiry_date).toLocaleDateString('en-IN')}
                                                    </div>
                                                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                                                        {(token.expiry_time || '23:59').slice(0, 5)}
                                                    </div>
                                                </div>
                                            ) : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>}
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: expired ? '#6b7280' : token.status ? '#10b981' : '#ef4444' }} />
                                                <span style={{ fontSize: 12, fontWeight: 700, color: expired ? '#6b7280' : token.status ? '#10b981' : '#ef4444' }}>
                                                    {expired ? 'Expired' : token.status ? 'Active' : 'Inactive'}
                                                </span>
                                            </div>
                                        </td>
                                        <td style={{ textAlign: 'right', paddingRight: 28 }}>
                                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                                <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(token)}>
                                                    <Edit2 size={13} /> Edit
                                                </button>
                                                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(token.id)}>
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
