'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  Play, MoreHorizontal, ArrowUpRight, Sparkles, Check, ChevronRight,
  Shield, Zap, Layers, BarChart3, Star, Clock, FileText, CheckCircle2,
  Users, Globe, Lock, ArrowRight, Move, RotateCcw
} from 'lucide-react'
import LogoLoop, { LogoItem } from '@/components/LogoLoop'

const partnerLogos: LogoItem[] = [
  {
    node: (
      <span style={{ letterSpacing: '2px', fontWeight: 900, fontSize: 22, color: '#94a3b8' }}>
        RCK
      </span>
    ),
    title: 'RCK'
  },
  {
    node: (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 20, color: '#94a3b8' }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <path d="M4 4h4v16H4zm6 0h4v12h-4zm6 0h4v8h-4z" />
        </svg>
        <span>miro</span>
      </span>
    ),
    title: 'Miro'
  },
  {
    node: (
      <span style={{ fontWeight: 800, fontSize: 22, color: '#94a3b8' }}>
        stripe
      </span>
    ),
    title: 'Stripe'
  },
  {
    node: (
      <span style={{ fontWeight: 600, fontSize: 22, color: '#94a3b8' }}>
        Google
      </span>
    ),
    title: 'Google'
  },
  {
    node: (
      <span style={{ fontWeight: 800, fontSize: 22, color: '#94a3b8' }}>
        Adobe
      </span>
    ),
    title: 'Adobe'
  },
  {
    node: (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 20, color: '#94a3b8' }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="10" />
          <path d="M8 11.5c3-1 6-1 8 .5M8.5 14c2.5-.8 5-.8 6.8.4M9 16.5c2-.5 4-.5 5.5.3" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        </svg>
        <span>Spotify</span>
      </span>
    ),
    title: 'Spotify'
  },
  {
    node: (
      <span style={{ display: 'inline-flex', alignItems: 'center', opacity: 0.8, color: '#94a3b8' }}>
        <svg width="26" height="22" viewBox="0 0 32 24" fill="currentColor">
          <path d="M16 12L8 4v16l8-8zm0 0l8-8v16l-8-8zM8 4l8 8-8 8V4zm16 0l-8 8 8 8V4z" />
        </svg>
      </span>
    ),
    title: 'HSBC'
  }
]

export default function Home() {
  const router = useRouter()
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showDemoModal, setShowDemoModal] = useState(false)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')

  // Movable / Draggable Microsoft Job Card State
  const [cardPos, setCardPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [isDraggingCard, setIsDraggingCard] = useState(false)
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; startX: number; startY: number } | null>(null)

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return // left click only
    e.currentTarget.setPointerCapture(e.pointerId)
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startX: cardPos.x,
      startY: cardPos.y
    }
    setIsDraggingCard(true)
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStartRef.current) return
    const dx = e.clientX - dragStartRef.current.mouseX
    const dy = e.clientY - dragStartRef.current.mouseY
    setCardPos({
      x: dragStartRef.current.startX + dx,
      y: dragStartRef.current.startY + dy
    })
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStartRef.current) return
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {}
    dragStartRef.current = null
    setIsDraggingCard(false)
  }

  const resetCardPos = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setCardPos({ x: 0, y: 0 })
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleGetStarted = () => {
    if (session) {
      router.push('/dashboard')
    } else {
      router.push('/login')
    }
  }

  return (
    <div className="hero-page">
      {/* Background Green Glow & Grid Mosaic */}
      <div className="hero-glow-bg" />
      <div className="hero-grid-pattern" />

      {/* Floating Pill Top Navbar */}
      <header className="hero-navbar-wrap">
        <nav className="hero-navbar">
          {/* Brand Logo & Name */}
          <a href="/" className="hero-brand">
            <div className="hero-brand-logo">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <span>Hirslams</span>
          </a>

          {/* Navigation Links */}
          <ul className="hero-nav-links">
            <li><a href="#" className="active">Home</a></li>
            <li><a href="#features">Features</a></li>
            <li><a href="#how-it-works">How It Works</a></li>
            <li><a href="#pricing">Pricing</a></li>
            <li><a href="#testimonials">Testimonials</a></li>
            <li><a href="#blog">Blog</a></li>
          </ul>

          {/* Log In or Go to Dashboard Button */}
          {session ? (
            <button 
              className="hero-login-btn"
              onClick={() => router.push('/dashboard')}
              id="hero-nav-dashboard-btn"
            >
              Dashboard →
            </button>
          ) : (
            <button 
              className="hero-login-btn"
              onClick={() => router.push('/login')}
              id="hero-nav-login-btn"
            >
              Log In
            </button>
          )}
        </nav>
      </header>

      {/* 1. Main Hero Section (Matching Reference Image) */}
      <main className="hero-content">
        
        {/* Floating Top Left Card: Maria Angelica M */}
        <div className="float-card-tl">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                overflow: 'hidden',
                background: '#f3f4f6',
                flexShrink: 0
              }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&h=120&q=80" 
                  alt="Maria Angelica M" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>Maria Angelica M</div>
                <div style={{ fontSize: 11, color: '#6b7280' }}>Product Designer</div>
              </div>
            </div>
            <MoreHorizontal size={15} color="#9ca3af" />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #f3f4f6', paddingTop: 8 }}>
            <span style={{ fontSize: 10, color: '#9ca3af', fontWeight: 500 }}>Start May 12, 2025</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 16, height: 16, borderRadius: '50%', background: '#ea4335', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 9, fontWeight: 700 }}>M</span>
              <span style={{ width: 16, height: 16, borderRadius: '50%', background: '#0a66c2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 8, fontWeight: 800 }}>in</span>
              <span style={{ width: 16, height: 16, borderRadius: '50%', background: 'linear-gradient(45deg, #f09433, #bc1888)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 8 }}>📷</span>
            </div>
          </div>
        </div>

        {/* Floating Top Right Card: Marcus Alexandro */}
        <div className="float-card-tr">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                overflow: 'hidden',
                background: '#f3f4f6',
                flexShrink: 0
              }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&h=120&q=80" 
                  alt="Marcus Alexandro" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>Marcus Alexandro</div>
                <div style={{ fontSize: 11, color: '#6b7280' }}>Product Manager</div>
              </div>
            </div>
            <MoreHorizontal size={15} color="#9ca3af" />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #f3f4f6', paddingTop: 8 }}>
            <span style={{ fontSize: 10, color: '#9ca3af', fontWeight: 500 }}>Start May 12, 2025</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 16, height: 16, borderRadius: '50%', background: '#ea4335', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 9, fontWeight: 700 }}>M</span>
              <span style={{ width: 16, height: 16, borderRadius: '50%', background: '#0a66c2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 8, fontWeight: 800 }}>in</span>
              <span style={{ width: 16, height: 16, borderRadius: '50%', background: 'linear-gradient(45deg, #f09433, #bc1888)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 8 }}>📷</span>
            </div>
          </div>
        </div>

        {/* Floating Stacked Center Job Card: Microsoft Senior Product Designer (Click & Movable) */}
        <div
          className="float-card-center-stack"
          style={{
            transform: `translate(calc(-50% + ${cardPos.x}px), ${cardPos.y}px) rotate(${Math.max(-12, Math.min(12, cardPos.x * 0.04))}deg) ${isDraggingCard ? 'scale(1.04)' : 'scale(1)'}`,
            transition: isDraggingCard ? 'none' : 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)',
            cursor: isDraggingCard ? 'grabbing' : 'grab',
            touchAction: 'none',
            userSelect: 'none',
            zIndex: isDraggingCard ? 60 : 25
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onDoubleClick={resetCardPos}
          title="Click and drag to move card around! Double-click to reset position."
        >
          {/* Movable hint / Reset pill */}
          <div style={{
            position: 'absolute',
            top: -28,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(17, 24, 39, 0.88)',
            backdropFilter: 'blur(8px)',
            color: '#bef264',
            fontSize: 10,
            fontWeight: 700,
            padding: '3px 10px',
            borderRadius: 9999,
            boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
            whiteSpace: 'nowrap',
            letterSpacing: '0.3px',
            pointerEvents: (cardPos.x !== 0 || cardPos.y !== 0) ? 'auto' : 'none'
          }}>
            <Move size={11} />
            <span>{isDraggingCard ? 'Moving...' : 'Click & Drag Me'}</span>
            {(cardPos.x !== 0 || cardPos.y !== 0) && (
              <button
                type="button"
                onClick={resetCardPos}
                style={{
                  background: 'rgba(255, 255, 255, 0.22)',
                  border: 'none',
                  color: '#ffffff',
                  borderRadius: 9999,
                  padding: '1px 7px',
                  marginLeft: 3,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3,
                  fontSize: 9.5,
                  fontWeight: 700
                }}
                title="Reset to center"
              >
                <RotateCcw size={9} />
                Reset
              </button>
            )}
          </div>

          <div className="stack-layer-1" />
          <div className="stack-layer-2" />
          
          <div
            className="float-card-center"
            style={{
              boxShadow: isDraggingCard
                ? '0 30px 60px -10px rgba(17, 56, 50, 0.55), 0 0 24px rgba(134, 239, 172, 0.4)'
                : undefined,
              borderColor: isDraggingCard ? 'rgba(190, 242, 100, 0.5)' : undefined
            }}
          >
            {/* Company Tag */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#86efac', letterSpacing: '0.4px', opacity: 0.9 }}>
                Microsoft
              </div>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
                fontSize: 9,
                fontWeight: 600,
                color: '#86efac',
                background: 'rgba(134, 239, 172, 0.15)',
                padding: '1px 6px',
                borderRadius: 4
              }}>
                <Move size={8} /> Movable
              </span>
            </div>

            {/* Title */}
            <div style={{ fontSize: 17, fontWeight: 800, color: '#ffffff', lineHeight: 1.25, marginBottom: 8 }}>
              Senior Product Designer
            </div>

            {/* Snippet */}
            <p style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.72)', lineHeight: 1.5, marginBottom: 12 }}>
              You'll own the end-to-end process — from discovery, wireframes, prototypes, and final UI & delivering
            </p>

            {/* Badges */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
              <span style={{
                background: 'rgba(132, 204, 22, 0.25)',
                color: '#bef264',
                fontSize: 9.5,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 9999
              }}>• Full-Time</span>
              <span style={{
                background: 'rgba(255, 255, 255, 0.12)',
                color: '#ffffff',
                fontSize: 9.5,
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: 9999
              }}>• Senior Level</span>
            </div>

            {/* Bottom Salary & Location Pill */}
            <div style={{
              background: '#ffffff',
              borderRadius: 12,
              padding: '8px 12px',
              color: '#111827',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#111827' }}>$8,000/Month</span>
              <span style={{ fontSize: 10, color: '#6b7280' }}>San Francisco, United States</span>
            </div>
          </div>
        </div>

        {/* Floating Bottom Left Pill: Vinco Marconzo */}
        <div className="cursor-pill-bl">
          <svg className="cursor-arrow-left" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 3l7 18 3-7 7-3L3 3z" />
          </svg>
          <div style={{ width: 28, height: 28, borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=80&h=80&q=80" 
              alt="Vinco Marconzo" 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
            />
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.2 }}>Vinco Marconzo</div>
            <div style={{ fontSize: 10, color: '#9ca3af' }}>Human Resources</div>
          </div>
        </div>

        {/* Floating Bottom Right Pill: Robert Williamson */}
        <div className="cursor-pill-br">
          <svg className="cursor-arrow-right" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 3l7 18 3-7 7-3L3 3z" />
          </svg>
          <div style={{ width: 28, height: 28, borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=80&h=80&q=80" 
              alt="Robert Williamson" 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
            />
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.2 }}>Robert Williamson</div>
            <div style={{ fontSize: 10, color: 'rgba(255, 255, 255, 0.7)' }}>Head of HRD</div>
          </div>
        </div>

        {/* Main Headline with Watermark */}
        <div className="hero-title-container">
          <div className="hero-watermark">
            Strategic Workforce{'\n'}Planning Partners
          </div>
          
          <h1 className="hero-headline">
            Find Your{'\n'}
            Strategic Workforce{'\n'}
            Planning Partners{'\n'}
            From Today
          </h1>
        </div>

        {/* Subtitle */}
        <p className="hero-subtitle">
          Empower your hiring team with data-driven tools to attract, assess, and retain top talent efficiently.
        </p>

        {/* Action Buttons Group */}
        <div className="hero-cta-group">
          <button 
            className="hero-cta-btn" 
            id="hero-get-started-btn"
            onClick={handleGetStarted}
          >
            <span>{session ? 'Go to Dashboard' : 'Get Started'}</span>
          </button>

          <button 
            className="hero-demo-btn" 
            id="hero-watch-demo-btn"
            onClick={() => setShowDemoModal(true)}
          >
            <Play size={14} fill="#ffffff" />
            <span>Watch Demo</span>
          </button>
        </div>

      </main>

      {/* Dynamic Infinite LogoLoop from React Bits */}
      <div style={{ width: '100%', borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9', padding: '32px 0', background: '#ffffff', position: 'relative', zIndex: 10, overflow: 'hidden' }}>
        <LogoLoop
          logos={partnerLogos}
          speed={65}
          direction="left"
          logoHeight={30}
          gap={60}
          hoverSpeed={0}
          scaleOnHover
          fadeOut
          fadeOutColor="#ffffff"
          ariaLabel="Partner technology brand logos"
        />
      </div>



      {/* 3. Features Section (Bento Grid) */}
      <section id="features" className="landing-section">
        <div className="section-header">
          <span className="section-badge">✨ Core Capabilities</span>
          <h2 className="section-title">Everything you need to orchestrate high-performing teams</h2>
          <p className="section-desc">
            A unified suite combining artificial intelligence, streamlined talent analytics, and automated multi-standard document pipelines.
          </p>
        </div>

        <div className="bento-grid">
          {/* Card 1: Highlight Forest Card */}
          <div className="bento-card highlight" style={{ gridColumn: 'span 2' }}>
            <div className="bento-icon" style={{ background: 'rgba(132, 204, 22, 0.2)', color: '#a3e635' }}>
              <Zap size={24} />
            </div>
            <h3 className="bento-title">Intelligent Talent Matching & Role Discovery</h3>
            <p className="bento-desc">
              Harness predictive analytics to pinpoint exact competencies, cultural alignment, and availability across global remote pipelines. Eliminate manual screening with automated role benchmarking.
            </p>
            <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#a3e635', background: 'rgba(132, 204, 22, 0.15)', padding: '4px 12px', borderRadius: 9999 }}>
                ⚡ 10x Faster Hiring Cycles
              </span>
              <span style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.7)' }}>
                Powered by neural profile scoring
              </span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bento-card">
            <div className="bento-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}>
              <BarChart3 size={24} />
            </div>
            <h3 className="bento-title">Dual-Wave Analytics</h3>
            <p className="bento-desc">
              Monitor candidate pipelines, seasonal demand provisions, and conversion rates with interactive real-time area charts.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bento-card">
            <div className="bento-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>
              <Layers size={24} />
            </div>
            <h3 className="bento-title">Automated Studio Formats</h3>
            <p className="bento-desc">
              Seamlessly generate certified identity cards, passport sheets (4×6 & A4), and high-resolution PVC plastic layouts in one click.
            </p>
          </div>

          {/* Card 4 */}
          <div className="bento-card">
            <div className="bento-icon" style={{ background: '#fdf4ff', color: '#c026d3' }}>
              <Sparkles size={24} />
            </div>
            <h3 className="bento-title">Neural Background Removal</h3>
            <p className="bento-desc">
              State-of-the-art vision models automatically isolate subjects and adjust compliant backgrounds without requiring Photoshop.
            </p>
          </div>

          {/* Card 5 */}
          <div className="bento-card">
            <div className="bento-icon" style={{ background: '#fffbeb', color: '#d97706' }}>
              <Shield size={24} />
            </div>
            <h3 className="bento-title">Enterprise Cloud Vault</h3>
            <p className="bento-desc">
              Bank-grade encrypted storage keeps your documents, contracts, and candidate portfolios safe with fine-grained access control.
            </p>
          </div>
        </div>
      </section>

      {/* 4. How It Works Section */}
      <section id="how-it-works" className="landing-section" style={{ background: '#fbfdfc', borderRadius: 32, margin: '40px auto' }}>
        <div className="section-header">
          <span className="section-badge">🚀 How It Works</span>
          <h2 className="section-title">Three steps to seamless talent & document delivery</h2>
          <p className="section-desc">
            Get started in under two minutes with zero setup friction.
          </p>
        </div>

        <div className="step-grid">
          <div className="step-card">
            <div className="step-num">01</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 8 }}>Connect & Define Criteria</h3>
            <p style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6 }}>
              Select role requirements, upload candidate assets, or import specifications with our pre-built industry templates.
            </p>
          </div>

          <div className="step-card">
            <div className="step-num">02</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 8 }}>AI Optimization & Processing</h3>
            <p style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6 }}>
              Our automated engine analyzes qualifications, applies visual compliance standards, and generates instant layouts.
            </p>
          </div>

          <div className="step-card">
            <div className="step-num">03</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 8 }}>Export, Deploy & Scale</h3>
            <p style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6 }}>
              Download print-ready PDFs, share verified digital credentials, and track pipeline metrics in your executive dashboard.
            </p>
          </div>
        </div>
      </section>

      {/* 5. Pricing Plans Section */}
      <section id="pricing" className="landing-section">
        <div className="section-header">
          <span className="section-badge">💎 Transparent Pricing</span>
          <h2 className="section-title">Flexible plans built for individuals and growing teams</h2>
          <p className="section-desc">
            Choose the plan that best fits your workflow. Cancel or upgrade anytime.
          </p>

          {/* Billing Switch */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: '#f3f4f6', padding: '4px', borderRadius: 9999, marginTop: 20 }}>
            <button
              onClick={() => setBillingCycle('monthly')}
              style={{
                background: billingCycle === 'monthly' ? '#ffffff' : 'transparent',
                color: billingCycle === 'monthly' ? '#111827' : '#6b7280',
                border: 'none',
                borderRadius: 9999,
                padding: '7px 18px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: billingCycle === 'monthly' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none'
              }}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              style={{
                background: billingCycle === 'yearly' ? '#ffffff' : 'transparent',
                color: billingCycle === 'yearly' ? '#111827' : '#6b7280',
                border: 'none',
                borderRadius: 9999,
                padding: '7px 18px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: billingCycle === 'yearly' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none'
              }}
            >
              <span>Annual Billing</span>
              <span style={{ fontSize: 10, fontWeight: 800, color: '#15803d', background: '#dcfce7', padding: '2px 6px', borderRadius: 9999 }}>Save 20%</span>
            </button>
          </div>
        </div>

        <div className="pricing-grid">
          {/* Starter Plan */}
          <div className="pricing-card">
            <h3 style={{ fontSize: 20, fontWeight: 700, color: '#111827' }}>Starter</h3>
            <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>For individuals and creators starting out.</p>
            <div className="pricing-price">$0 <span>/ month</span></div>

            <ul className="pricing-features">
              <li><CheckCircle2 size={16} color="#84cc16" /> Up to 5 photo generations/mo</li>
              <li><CheckCircle2 size={16} color="#84cc16" /> Standard passport A4 sheet</li>
              <li><CheckCircle2 size={16} color="#84cc16" /> Standard resolution download</li>
              <li><CheckCircle2 size={16} color="#84cc16" /> Community support</li>
            </ul>

            <button 
              className="hero-demo-btn" 
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={handleGetStarted}
            >
              Get Started Free
            </button>
          </div>

          {/* Pro Plan (Featured) */}
          <div className="pricing-card featured">
            <div className="pricing-badge">Most Popular</div>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: '#111827' }}>Professional</h3>
            <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>For power users and commercial photo studios.</p>
            <div className="pricing-price">{billingCycle === 'yearly' ? '$23' : '$29'} <span>/ month</span></div>

            <ul className="pricing-features">
              <li><CheckCircle2 size={16} color="#84cc16" /> Unlimited AI Background Removals</li>
              <li><CheckCircle2 size={16} color="#84cc16" /> All Standard 4×6, A4 & PVC ID Formats</li>
              <li><CheckCircle2 size={16} color="#84cc16" /> 50 GB High-Speed Encrypted Storage</li>
              <li><CheckCircle2 size={16} color="#84cc16" /> Priority Processing Queue</li>
              <li><CheckCircle2 size={16} color="#84cc16" /> Dedicated Email Support</li>
            </ul>

            <button 
              className="hero-cta-btn" 
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={handleGetStarted}
            >
              Upgrade to Pro
            </button>
          </div>

          {/* Enterprise Plan */}
          <div className="pricing-card">
            <h3 style={{ fontSize: 20, fontWeight: 700, color: '#111827' }}>Enterprise</h3>
            <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>For agencies, universities & hiring organizations.</p>
            <div className="pricing-price">{billingCycle === 'yearly' ? '$71' : '$89'} <span>/ month</span></div>

            <ul className="pricing-features">
              <li><CheckCircle2 size={16} color="#84cc16" /> Everything in Professional</li>
              <li><CheckCircle2 size={16} color="#84cc16" /> Multi-Seat Team Workspace & Roles</li>
              <li><CheckCircle2 size={16} color="#84cc16" /> API Access & Webhook Integrations</li>
              <li><CheckCircle2 size={16} color="#84cc16" /> Custom Watermark & Brand Whitelabel</li>
              <li><CheckCircle2 size={16} color="#84cc16" /> 99.9% Uptime SLA Guarantee</li>
            </ul>

            <button 
              className="hero-demo-btn" 
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={handleGetStarted}
            >
              Contact Sales
            </button>
          </div>
        </div>
      </section>

      {/* 6. Testimonials Section */}
      <section id="testimonials" className="landing-section" style={{ background: '#f8faf9', borderRadius: 32 }}>
        <div className="section-header">
          <span className="section-badge">⭐ Testimonials</span>
          <h2 className="section-title">Trusted by thousands of leading professionals</h2>
          <p className="section-desc">
            Discover how modern teams and creators accelerate their workflows with Hirslams.
          </p>
        </div>

        <div className="testimonial-grid">
          <div className="testimonial-card">
            <div>
              <div className="testimonial-stars">
                {[...Array(5)].map((_, i) => <Star key={i} size={16} fill="#eab308" />)}
              </div>
              <p className="testimonial-text">
                "Hirslams has completely transformed how our studio produces passport photos and identity documents. What used to take 30 minutes in Photoshop is now completed in 2 clicks!"
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', overflow: 'hidden' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&h=120&q=80" alt="Sarah Jenkins" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>Sarah Jenkins</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>Studio Lead @ PixelCraft</div>
              </div>
            </div>
          </div>

          <div className="testimonial-card">
            <div>
              <div className="testimonial-stars">
                {[...Array(5)].map((_, i) => <Star key={i} size={16} fill="#eab308" />)}
              </div>
              <p className="testimonial-text">
                "The real-time analytics and workforce planning dashboards give our management team crystal-clear visibility into monthly talent velocity and provisions."
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', overflow: 'hidden' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&h=120&q=80" alt="David Chen" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>David Chen</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>VP of People Operations</div>
              </div>
            </div>
          </div>

          <div className="testimonial-card">
            <div>
              <div className="testimonial-stars">
                {[...Array(5)].map((_, i) => <Star key={i} size={16} fill="#eab308" />)}
              </div>
              <p className="testimonial-text">
                "The PVC card layout generator and PDF conversion tools are flawless. The color accuracy and precision bleed margins save us hundreds of dollars in re-prints."
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', overflow: 'hidden' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=120&h=120&q=80" alt="Elena Rostova" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>Elena Rostova</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>Operations Director @ TechCorp</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Blog & Knowledge Section */}
      <section id="blog" className="landing-section">
        <div className="section-header">
          <span className="section-badge">📚 Insights & Updates</span>
          <h2 className="section-title">Latest research, trends, and platform guides</h2>
          <p className="section-desc">
            Stay ahead of the curve with articles written by our engineering and talent design specialists.
          </p>
        </div>

        <div className="bento-grid">
          <div className="bento-card" style={{ cursor: 'pointer' }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#84cc16', textTransform: 'uppercase', marginBottom: 12 }}>Talent Strategy</span>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 10 }}>How AI is Transforming Global Strategic Workforce Planning in 2025</h3>
            <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6, marginBottom: 16 }}>
              Explore how automated skill taxonomies and candidate clustering are shrinking time-to-hire by 45%.
            </p>
            <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#111827' }}>
              <span>Read Article</span>
              <ArrowRight size={14} />
            </div>
          </div>

          <div className="bento-card" style={{ cursor: 'pointer' }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#3b82f6', textTransform: 'uppercase', marginBottom: 12 }}>Productivity</span>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 10 }}>Official Passport & ID Photo Specifications Across 120 Countries</h3>
            <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6, marginBottom: 16 }}>
              A complete breakdown of background lighting, biometric dimensions, and print DPI requirements.
            </p>
            <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#111827' }}>
              <span>Read Article</span>
              <ArrowRight size={14} />
            </div>
          </div>

          <div className="bento-card" style={{ cursor: 'pointer' }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#ec4899', textTransform: 'uppercase', marginBottom: 12 }}>Design Engineering</span>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 10 }}>Building Zero-Loss Vector PDF Pipelines in Next.js 16</h3>
            <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6, marginBottom: 16 }}>
              Deep dive into client-side PDF rendering, CMYK color profiles, and automated sheet generation.
            </p>
            <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#111827' }}>
              <span>Read Article</span>
              <ArrowRight size={14} />
            </div>
          </div>
        </div>
      </section>

      {/* 8. Neon Glow Text SVG Section */}
      <section className="landing-section" style={{ paddingBottom: 20 }}>
        <div className="flex w-full justify-center items-center py-12 md:py-20 mb-12 border-b border-white/5 relative">
          <div className="absolute inset-0 pointer-events-none"></div>
          <svg width="100%" height="100%" viewBox="0 0 300 100" xmlns="http://www.w3.org/2000/svg" className="select-none">
            <defs>
              <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur"></feGaussianBlur>
                <feMerge>
                  <feMergeNode in="blur"></feMergeNode>
                  <feMergeNode in="SourceGraphic"></feMergeNode>
                </feMerge>
              </filter>
              <linearGradient id="textGradient" gradientUnits="userSpaceOnUse" cx="50%" cy="50%" r="25%"></linearGradient>
              <radialGradient id="revealMask" gradientUnits="userSpaceOnUse" r="20%" cx="57.011915673693856%" cy="39.589241213371146%">
                <stop offset="0%" stopColor="white"></stop>
                <stop offset="100%" stopColor="black"></stop>
              </radialGradient>
              <mask id="textMask">
                <rect x="0" y="0" width="100%" height="100%" fill="url(#revealMask)"></rect>
              </mask>
            </defs>
            <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" strokeWidth="0.3" className="fill-transparent stroke-neutral-200 font-[helvetica] text-7xl font-bold dark:stroke-neutral-800" style={{ opacity: 0 }}>IRIS AI</text>
            <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" strokeWidth="0.3" className="fill-transparent stroke-neutral-200 font-[helvetica] text-7xl font-bold dark:stroke-neutral-800" strokeDashoffset="0" strokeDasharray="1000">IRIS AI</text>
            <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" stroke="url(#textGradient)" strokeWidth="0.6" mask="url(#textMask)" className="fill-transparent font-[helvetica] text-7xl font-bold" filter="url(#neonGlow)">URLM CREATOR</text>
          </svg>
        </div>
      </section>

      {/* 9. Comprehensive Modern Footer */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <div style={{ color: '#84cc16' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
              </div>
              <span style={{ fontSize: 18, fontWeight: 800, color: '#111827' }}>Hirslams</span>
            </div>
            <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6, maxWidth: 300 }}>
              The next-generation strategic workforce planning and automated digital studio platform.
            </p>
          </div>

          <div className="footer-col">
            <h4>Product</h4>
            <ul>
              <li><a href="#features">AI Talent Match</a></li>
              <li><a href="#features">Passport Studio</a></li>
              <li><a href="#features">PVC Badge Engine</a></li>
              <li><a href="#features">PDF Converter</a></li>
              <li><a href="#pricing">Pricing Plans</a></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Company</h4>
            <ul>
              <li><a href="#">About Us</a></li>
              <li><a href="#">Careers</a></li>
              <li><a href="#blog">Blog & Press</a></li>
              <li><a href="#">Security & Privacy</a></li>
              <li><a href="#">Contact Us</a></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Legal & Trust</h4>
            <ul>
              <li><a href="#">Privacy Policy</a></li>
              <li><a href="#">Terms of Service</a></li>
              <li><a href="#">GDPR Compliance</a></li>
              <li><a href="#">System Status</a></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <div>© {new Date().getFullYear()} Hirslams & URLM Creator. All rights reserved.</div>
          <div style={{ display: 'flex', gap: 20 }}>
            <a href="#" style={{ color: '#9ca3af', textDecoration: 'none' }}>Privacy</a>
            <a href="#" style={{ color: '#9ca3af', textDecoration: 'none' }}>Terms</a>
            <a href="#" style={{ color: '#9ca3af', textDecoration: 'none' }}>Cookies</a>
          </div>
        </div>
      </footer>

      {/* Interactive Watch Demo Modal */}
      {showDemoModal && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: 20
          }}
          onClick={() => setShowDemoModal(false)}
        >
          <div 
            style={{
              background: '#ffffff',
              borderRadius: 20,
              maxWidth: 640,
              width: '100%',
              padding: 28,
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.3)',
              position: 'relative'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Play size={16} fill="#059669" />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: '#111827' }}>Product Overview Demo</h3>
              </div>
              <button 
                onClick={() => setShowDemoModal(false)}
                style={{ background: '#f3f4f6', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4b5563', fontWeight: 700 }}
              >
                ✕
              </button>
            </div>

            <div style={{
              width: '100%',
              height: 320,
              background: '#0d2219',
              borderRadius: 14,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#84cc16', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0d2219', boxShadow: '0 8px 24px rgba(132, 204, 22, 0.4)', cursor: 'pointer' }}>
                <Play size={24} fill="#0d2219" style={{ marginLeft: 3 }} />
              </div>
              <p style={{ marginTop: 14, fontSize: 14, color: '#a3e635', fontWeight: 600 }}>Interactive Platform Preview</p>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>Full walkthrough of tools, studio, and automated workflows</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
              <button 
                className="hero-cta-btn"
                onClick={() => { setShowDemoModal(false); handleGetStarted(); }}
              >
                <span>{session ? 'Enter Dashboard' : 'Get Started Free'}</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
