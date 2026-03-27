'use client'

import { useAuth } from '@/contexts/AuthContext'
import { Lock, Zap, ShieldAlert, ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import React from 'react'

interface FeatureLockProps {
    children: React.ReactNode
    featureName: string
}

export default function FeatureLock({ children, featureName }: FeatureLockProps) {
    const { featureAccessMode, isStorageFull } = useAuth()
    const router = useRouter()

    if (featureAccessMode === 'lock') {
        return (
            <div style={{
                minHeight: '60vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px 20px'
            }}>
                <div style={{
                    maxWidth: 480,
                    width: '100%',
                    background: 'rgba(15, 15, 25, 0.7)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    borderRadius: 24,
                    padding: 40,
                    textAlign: 'center',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.4), 0 0 100px rgba(239, 68, 68, 0.05)',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    {/* Background Glow */}
                    <div style={{
                        position: 'absolute',
                        top: -50,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: 200,
                        height: 200,
                        background: isStorageFull 
                            ? 'radial-gradient(circle, rgba(245, 158, 11, 0.15) 0%, transparent 70%)'
                            : 'radial-gradient(circle, rgba(239, 68, 68, 0.15) 0%, transparent 70%)',
                        zIndex: 0
                    }} />

                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <div style={{
                            width: 80,
                            height: 80,
                            borderRadius: '50%',
                            background: isStorageFull ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 24px',
                            border: isStorageFull ? '1px solid rgba(245, 158, 11, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)'
                        }}>
                            <Lock size={36} color={isStorageFull ? '#f59e0b' : '#ef4444'} />
                        </div>

                        <h2 style={{
                            fontSize: 24,
                            fontWeight: 900,
                            color: 'white',
                            marginBottom: 12,
                            letterSpacing: '-0.5px'
                        }}>
                            {isStorageFull ? 'Storage Full' : `${featureName} Locked`}
                        </h2>

                        <p style={{
                            fontSize: 15,
                            color: 'rgba(255,255,255,0.6)',
                            lineHeight: 1.6,
                            marginBottom: 32
                        }}>
                            {isStorageFull 
                                ? "Storage Full. Please use a token to continue."
                                : `This feature has been restricted on your account via a Token Control system. Please enter an OPEN Token to restore access.`
                            }
                        </p>

                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 12
                        }}>
                            <button
                                onClick={() => router.push('/token/create')}
                                style={{
                                    height: 54,
                                    background: isStorageFull 
                                        ? 'linear-gradient(135deg, #f59e0b, #f97316)'
                                        : 'linear-gradient(135deg, #ef4444, #f97316)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: 14,
                                    fontSize: 16,
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 10,
                                    boxShadow: isStorageFull 
                                        ? '0 8px 20px rgba(245, 158, 11, 0.3)'
                                        : '0 8px 20px rgba(239, 68, 68, 0.3)',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                            >
                                <Zap size={18} /> Enter Token Code
                            </button>

                            <button
                                onClick={() => router.push('/dashboard')}
                                style={{
                                    height: 50,
                                    background: 'transparent',
                                    color: 'rgba(255,255,255,0.5)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: 14,
                                    fontSize: 14,
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                                Back to Dashboard
                            </button>
                        </div>

                        <div style={{
                            marginTop: 32,
                            padding: '12px 16px',
                            background: 'rgba(255,255,255,0.03)',
                            borderRadius: 12,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            textAlign: 'left'
                        }}>
                            <ShieldAlert size={16} color="rgba(255,255,255,0.4)" />
                            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                                {isStorageFull ? 'Storage limit exceeded (5.0 GB maximum).' : 'Security enforced by platform administration.'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return <>{children}</>
}
