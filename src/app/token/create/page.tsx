'use client'

import { useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { Coins, Search, Copy, CheckCircle, AlertCircle, Shield } from 'lucide-react'

interface TokenRecord {
    id: string
    name: string
    symbol: string
    supply: string
    network: string
    contract_address: string
    tx_hash: string
    status: 'active' | 'inactive'
    expiry_date: string | null
    created_at: string
}

const NETWORKS: Record<string, { name: string; explorer: string }> = {
    '11155111': { name: 'Sepolia', explorer: 'https://sepolia.etherscan.io' },
    '1': { name: 'Ethereum', explorer: 'https://etherscan.io' },
    '137': { name: 'Polygon', explorer: 'https://polygonscan.com' },
    '56': { name: 'BSC', explorer: 'https://bscscan.com' },
}

export default function TokenEnterPage() {
    const [allTokens, setAllTokens] = useState<TokenRecord[]>([])
    const [selectedToken, setSelectedToken] = useState<TokenRecord | null>(null)
    const [tokenInput, setTokenInput] = useState('')
    const [message, setMessage] = useState({ type: '', text: '' })

    const loadTokens = () => {
        try {
            const saved = localStorage.getItem('deployedTokens')
            if (saved) {
                setAllTokens(JSON.parse(saved))
            }
        } catch (err) {
            console.warn('Could not load tokens:', err)
        }
    }

    // Load tokens on mount
    if (allTokens.length === 0) {
        loadTokens()
    }

    const validateToken = (tokenId: string): { valid: boolean; error?: string } => {
        const token = allTokens.find(t => t.id === tokenId)
        if (!token) return { valid: false, error: 'Token not found' }
        if (token.status === 'inactive') return { valid: false, error: 'Token is disabled' }
        if (token.expiry_date && new Date(token.expiry_date) < new Date()) return { valid: false, error: 'Token expired' }
        return { valid: true }
    }

    const useToken = () => {
        if (!tokenInput) {
            setMessage({ type: 'error', text: 'Please enter a token ID' })
            return
        }
        const token = allTokens.find(t => t.id === tokenInput || t.name.toLowerCase().includes(tokenInput.toLowerCase()) || t.symbol.toLowerCase().includes(tokenInput.toLowerCase()))
        if (!token) {
            setMessage({ type: 'error', text: 'Token not found. Contact admin.' })
            return
        }
        const validation = validateToken(token.id)
        if (!validation.valid) {
            setMessage({ type: 'error', text: validation.error || 'Invalid token' })
            return
        }
        setSelectedToken(token)
        setMessage({ type: 'success', text: 'Token "' + token.name + '" is valid!' })
    }

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text)
        setMessage({ type: 'success', text: 'Copied!' })
        setTimeout(() => setMessage({ type: '', text: '' }), 2000)
    }

    return (
        <DashboardLayout>
            <div style={{ maxWidth: 900, margin: '0 auto' }}>
                <div className="page-header" style={{ marginBottom: 32 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                        <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, #7c5cf6, #ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Coins size={24} color="white" />
                        </div>
                        <div>
                            <h1 className="page-title" style={{ marginBottom: 4 }}>Token Enter</h1>
                            <p className="page-subtitle">Enter your token ID</p>
                        </div>
                    </div>
                </div>

                {message.text && (
                    <div style={{ padding: '12px 16px', background: message.type === 'success' ? 'rgba(52,211,153,0.1)' : 'rgba(239,68,68,0.1)', border: '1px solid ' + (message.type === 'success' ? '#34d399' : '#ef4444'), borderRadius: 8, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8, color: message.type === 'success' ? '#34d399' : '#ef4444', fontWeight: 600 }}>
                        {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                        {message.text}
                    </div>
                )}

                <div className="card" style={{ marginBottom: 24 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
                        <Search size={18} style={{ marginRight: 8, display: 'inline' }} />
                        Enter Token ID
                    </h3>
                    <div style={{ display: 'flex', gap: 12 }}>
                        <input type="text" className="form-input" placeholder="Enter your Token ID..." value={tokenInput} onChange={(e) => setTokenInput(e.target.value)} style={{ flex: 1 }} />
                        <button className="btn btn-primary" onClick={useToken}>
                            <CheckCircle size={16} />
                            Validate
                        </button>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>Enter the token ID provided to you</p>
                </div>

                {selectedToken ? (
                    <div className="card" style={{ marginBottom: 24, background: 'rgba(52,211,153,0.1)', border: '1px solid #34d399' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                            <CheckCircle size={24} color="#34d399" />
                            <div>
                                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#34d399', margin: 0 }}>Token Valid!</h3>
                                <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>You can use this token</p>
                            </div>
                        </div>
                        <div style={{ background: 'var(--bg-primary)', borderRadius: 8, padding: 16 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                <span style={{ fontWeight: 700, fontSize: 18 }}>{selectedToken.name}</span>
                                <span style={{ background: '#34d399', color: 'white', padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 700 }}>{selectedToken.symbol}</span>
                            </div>
                            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>ID: {selectedToken.id}</p>
                            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>Network: {NETWORKS[selectedToken.network]?.name || selectedToken.network}</p>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button className="btn btn-sm btn-secondary" onClick={() => copyToClipboard(selectedToken.id)}>
                                    <Copy size={12} /> Copy ID
                                </button>
                            </div>
                        </div>
                    </div>
                ) : null}

                <div style={{ marginTop: 24, padding: 16, background: 'rgba(124,92,246,0.1)', borderRadius: 8, border: '1px solid rgba(124,92,246,0.3)' }}>
                    <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
                        <Shield size={14} style={{ marginRight: 6, display: 'inline' }} />
                        How it works:
                    </h4>
                    <ul style={{ fontSize: 13, color: 'var(--text-secondary)', paddingLeft: 20, margin: 0 }}>
                        <li>Enter the Token ID provided to you</li>
                        <li>Click Validate to check if token is valid</li>
                        <li>Valid tokens give you access to features</li>
                    </ul>
                </div>
            </div>
        </DashboardLayout>
    )
}
