'use client'

import { useState, useEffect } from 'react'
import { Coins, Wallet, Zap, CheckCircle, AlertCircle, ExternalLink, Copy, RefreshCw, Loader2, Lock } from 'lucide-react'
import { supabase } from '@/lib/supabase'

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
    '11155111': { name: 'Sepolia (Testnet)', explorer: 'https://sepolia.etherscan.io' },
    '1': { name: 'Ethereum', explorer: 'https://etherscan.io' },
    '137': { name: 'Polygon', explorer: 'https://polygonscan.com' },
    '56': { name: 'BSC', explorer: 'https://bscscan.com' },
}

export default function TokenCreateTab() {
    const [walletAddress, setWalletAddress] = useState<string | null>(null)
    const [walletBalance, setWalletBalance] = useState<string>('0')
    const [isConnected, setIsConnected] = useState(false)
    const [deploying, setDeploying] = useState(false)
    const [tokens, setTokens] = useState<TokenRecord[]>([])
    const [copied, setCopied] = useState<string | null>(null)
    const [toast, setToast] = useState('')

    const [form, setForm] = useState({
        name: '',
        symbol: '',
        supply: '1000000',
        network: '11155111',
        mintable: true,
        burnable: true,
        expirationDate: '',
        status: 'active',
    })

    const showToast = (msg: string) => {
        setToast(msg)
        setTimeout(() => setToast(''), 3000)
    }

    const copyToClipboard = async (text: string, id: string) => {
        try {
            await navigator.clipboard.writeText(text)
            setCopied(id)
            setTimeout(() => setCopied(null), 2000)
        } catch (err) {
            console.error('Failed to copy:', err)
        }
    }

    // Load tokens from localStorage
    const loadTokens = () => {
        try {
            const saved = localStorage.getItem('deployedTokens')
            if (saved) {
                const tokens = JSON.parse(saved)
                setTokens(tokens)
            }
        } catch (err) {
            console.warn('Could not load tokens:', err)
        }
    }

    // Toggle token status
    const toggleTokenStatus = (id: string) => {
        const saved = localStorage.getItem('deployedTokens')
        if (saved) {
            const tokens: TokenRecord[] = JSON.parse(saved)
            const updated = tokens.map(t => 
                t.id === id ? { ...t, status: (t.status === 'active' ? 'inactive' : 'active') as 'active' | 'inactive' } : t
            )
            localStorage.setItem('deployedTokens', JSON.stringify(updated))
            setTokens(updated)
            showToast('Token status updated')
        }
    }

    // Delete token
    const deleteToken = (id: string) => {
        if (confirm('Are you sure you want to delete this token?')) {
            const saved = localStorage.getItem('deployedTokens')
            if (saved) {
                const tokens: TokenRecord[] = JSON.parse(saved)
                const updated = tokens.filter(t => t.id !== id)
                localStorage.setItem('deployedTokens', JSON.stringify(updated))
                setTokens(updated)
                showToast('Token deleted')
            }
        }
    }

    useEffect(() => {
        loadTokens()
    }, [])

    // Connect wallet (simulated - no MetaMask required)
    const connectWallet = async () => {
        // Simulate wallet connection without MetaMask
        try {
            // Generate a fake but realistic-looking wallet address
            const fakeAddress = '0x' + Array.from({ length: 40 }, () =>
                Math.floor(Math.random() * 16).toString(16)
            ).join('')

            const fakeBalance = (Math.random() * 10).toFixed(4)

            setWalletAddress(fakeAddress)
            setWalletBalance(fakeBalance)
            setIsConnected(true)
            showToast('Wallet connected successfully! (Demo Mode)')
        } catch (error) {
            console.error('Failed to connect wallet:', error)
            showToast('Failed to connect wallet')
        }
    }

    // Disconnect wallet
    const disconnectWallet = () => {
        setWalletAddress(null)
        setWalletBalance('0')
        setIsConnected(false)
        showToast('Wallet disconnected')
    }

    // Deploy token
    const deployToken = async () => {
        if (!form.name || form.name.length < 3) {
            showToast('Token name must be at least 3 characters')
            return
        }
        if (!form.symbol || form.symbol.length > 5) {
            showToast('Token symbol must be 1-5 characters')
            return
        }
        if (!isConnected || !walletAddress) {
            showToast('Please connect your wallet first')
            return
        }

        setDeploying(true)

        try {
            // Simulate deployment
            await new Promise(resolve => setTimeout(resolve, 3000))

            // Generate fake contract address and tx hash for demo
            const contractAddress = '0x' + Array.from({ length: 40 }, () =>
                Math.floor(Math.random() * 16).toString(16)
            ).join('')

            const txHash = '0x' + Array.from({ length: 64 }, () =>
                Math.floor(Math.random() * 16).toString(16)
            ).join('')

            // Save to localStorage
            const newToken = {
                id: Date.now().toString(),
                name: form.name,
                symbol: form.symbol,
                supply: form.supply,
                network: form.network,
                contract_address: contractAddress,
                tx_hash: txHash,
                status: form.status as 'active' | 'inactive',
                expiry_date: form.expirationDate || null,
                created_at: new Date().toISOString()
            }
            const saved = localStorage.getItem('deployedTokens')
            const tokens = saved ? JSON.parse(saved) : []
            tokens.unshift(newToken)
            localStorage.setItem('deployedTokens', JSON.stringify(tokens.slice(0, 20)))

            // Reload tokens
            await loadTokens()

            // Reset form
            setForm({
                ...form,
                name: '',
                symbol: '',
            })

            showToast(`Token ${form.name} deployed successfully!`)
        } catch (err) {
            console.error('Deployment failed:', err)
            showToast('Deployment failed. Please try again.')
        } finally {
            setDeploying(false)
        }
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Toast */}
            {toast && (
                <div style={{
                    position: 'fixed', top: 20, right: 20, zIndex: 1000,
                    background: toast.includes('success') || toast.includes('deployed') ? 'rgba(52,211,153,0.95)' : 'rgba(239,68,68,0.95)',
                    color: 'white', padding: '12px 20px', borderRadius: 8,
                    fontSize: 14, fontWeight: 600, boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                }}>
                    {toast}
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {/* Token Form */}
                <div className="card">
                    <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Coins size={18} color="var(--accent-purple)" /> Create Token
                    </h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div className="form-group">
                            <label className="form-label">Token Name *</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="MyToken"
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                maxLength={50}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            <div className="form-group">
                                <label className="form-label">Symbol *</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="MTK"
                                    value={form.symbol}
                                    onChange={(e) => setForm({ ...form, symbol: e.target.value.toUpperCase() })}
                                    maxLength={5}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Total Supply</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    placeholder="1000000"
                                    value={form.supply}
                                    onChange={(e) => setForm({ ...form, supply: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Network</label>
                            <select
                                className="form-input"
                                value={form.network}
                                onChange={(e) => setForm({ ...form, network: e.target.value })}
                            >
                                {Object.entries(NETWORKS).map(([id, net]) => (
                                    <option key={id} value={id}>{net.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Token Expiration (Optional)</label>
                            <input
                                type="date"
                                className="form-input"
                                value={form.expirationDate}
                                onChange={(e) => setForm({ ...form, expirationDate: e.target.value })}
                                min={new Date().toISOString().split('T')[0]}
                            />
                            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                                Token will expire on this date (if set)
                            </p>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Status</label>
                            <select
                                className="form-input"
                                value={form.status}
                                onChange={(e) => setForm({ ...form, status: e.target.value })}
                            >
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                                Inactive tokens won't work for users
                            </p>
                        </div>

                        <div style={{ display: 'flex', gap: 12 }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--bg-primary)', borderRadius: 8, cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={form.mintable}
                                    onChange={(e) => setForm({ ...form, mintable: e.target.checked })}
                                />
                                <span style={{ fontSize: 13 }}>Mintable</span>
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--bg-primary)', borderRadius: 8, cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={form.burnable}
                                    onChange={(e) => setForm({ ...form, burnable: e.target.checked })}
                                />
                                <span style={{ fontSize: 13 }}>Burnable</span>
                            </label>
                        </div>

                        <button
                            className="btn btn-primary"
                            style={{ width: '100%', padding: '12px' }}
                            onClick={deployToken}
                            disabled={!isConnected || deploying}
                        >
                            {deploying ? (
                                <><Loader2 size={16} className="animate-spin" /> Deploying...</>
                            ) : isConnected ? (
                                <><Zap size={16} /> Deploy Token</>
                            ) : (
                                <><Wallet size={16} /> Connect Wallet First</>
                            )}
                        </button>
                        {!isConnected && (
                            <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', marginTop: 8 }}>
                                ⚠️ Connect your wallet above to deploy tokens
                            </p>
                        )}
                    </div>
                </div>

                {/* Wallet Connection */}
                <div className="card">
                    <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Wallet size={18} color="var(--accent-blue)" /> Wallet Connection
                    </h3>

                    {isConnected && walletAddress ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div style={{
                                padding: 16, background: 'rgba(52,211,153,0.1)', borderRadius: 12,
                                border: '1px solid rgba(52,211,153,0.3)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                    <CheckCircle size={16} color="#34d399" />
                                    <span style={{ fontWeight: 700, color: '#34d399' }}>Connected</span>
                                </div>
                                <div style={{ fontSize: 13, marginBottom: 4 }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Address:</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <code style={{ fontSize: 12, color: 'var(--text-primary)', flex: 1, wordBreak: 'break-all' }}>
                                        {walletAddress}
                                    </code>
                                    <button
                                        className="btn btn-sm btn-secondary"
                                        onClick={() => copyToClipboard(walletAddress, 'wallet')}
                                        title="Copy address"
                                    >
                                        <Copy size={14} />
                                    </button>
                                    {copied === 'wallet' && <span style={{ fontSize: 11, color: '#34d399' }}>Copied!</span>}
                                </div>
                                <div style={{ fontSize: 14, marginTop: 12, fontWeight: 700 }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Balance:</span> {walletBalance} ETH
                                </div>
                            </div>
                            <button
                                className="btn btn-secondary"
                                style={{ width: '100%' }}
                                onClick={disconnectWallet}
                            >
                                Disconnect
                            </button>
                        </div>
                    ) : (
                        <div style={{
                            padding: 32, background: 'var(--bg-primary)', borderRadius: 12,
                            textAlign: 'center', border: '2px dashed var(--border)'
                        }}>
                            <div style={{
                                width: 64, height: 64, borderRadius: '50%',
                                background: 'rgba(124,92,246,0.1)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 16px'
                            }}>
                                <Wallet size={32} color="var(--accent-purple)" />
                            </div>
                            <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Connect Wallet</h4>
                            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                                Connect your wallet to deploy tokens
                            </p>
                            <button className="btn btn-primary" onClick={connectWallet}>
                                <Wallet size={16} /> Connect Wallet
                            </button>
                        </div>
                    )}

                    <div style={{ marginTop: 16, padding: 12, background: 'rgba(52,211,153,0.1)', borderRadius: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                            <CheckCircle size={14} color="#34d399" />
                            <span>Demo Mode - No MetaMask required</span>
                        </div>
                    </div>
                </div>
            </div>

                {/* Recent Deployments */}
            <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Coins size={18} color="var(--accent-purple)" /> Deployed Tokens ({tokens.length})
                    </h3>
                    <button className="btn btn-sm btn-secondary" onClick={loadTokens}>
                        <RefreshCw size={14} /> Refresh
                    </button>
                </div>

                {tokens.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                        <Coins size={48} strokeWidth={1} style={{ marginBottom: 12, opacity: 0.5 }} />
                        <p style={{ fontSize: 14 }}>No tokens deployed yet</p>
                        <p style={{ fontSize: 12, marginTop: 4 }}>Your deployed tokens will appear here</p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Token</th>
                                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Network</th>
                                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Status</th>
                                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Expiry</th>
                                    <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tokens.map((token) => (
                                    <tr key={token.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '12px 8px' }}>
                                            <div style={{ fontWeight: 700 }}>{token.name}</div>
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{token.symbol}</div>
                                        </td>
                                        <td style={{ padding: '12px 8px', fontSize: 13 }}>
                                            {NETWORKS[token.network]?.name || token.network}
                                        </td>
                                        <td style={{ padding: '12px 8px' }}>
                                            <span style={{
                                                background: token.status === 'active' ? 'rgba(52,211,153,0.2)' : 'rgba(239,68,68,0.2)',
                                                color: token.status === 'active' ? '#34d399' : '#ef4444',
                                                padding: '2px 8px',
                                                borderRadius: 4,
                                                fontSize: 11,
                                                fontWeight: 600
                                            }}>
                                                {token.status === 'active' ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px 8px', fontSize: 12, color: 'var(--text-muted)' }}>
                                            {token.expiry_date ? new Date(token.expiry_date).toLocaleDateString() : 'No expiry'}
                                        </td>
                                        <td style={{ padding: '12px 8px' }}>
                                            <div style={{ display: 'flex', gap: 4 }}>
                                                <button
                                                    className="btn btn-sm"
                                                    onClick={() => toggleTokenStatus(token.id)}
                                                    title={token.status === 'active' ? 'Disable token' : 'Enable token'}
                                                    style={{
                                                        color: token.status === 'active' ? '#f59e0b' : '#34d399'
                                                    }}
                                                >
                                                    {token.status === 'active' ? 'Disable' : 'Enable'}
                                                </button>
                                                <button
                                                    className="btn btn-sm"
                                                    onClick={() => deleteToken(token.id)}
                                                    title="Delete token"
                                                    style={{ color: '#ef4444' }}
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}
