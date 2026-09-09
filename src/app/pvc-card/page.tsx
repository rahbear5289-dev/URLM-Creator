'use client'

import { useState, useRef } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import FeatureLock from '@/components/FeatureLock'
import {
  Upload, Printer, Download, RotateCw, ChevronRight, CreditCard,
  Image as ImageIcon, Grid2x2, FileText, Scissors, Coins, Settings,
  User, CheckCircle, Sliders, Shield, Eye, Trash2, Check, ExternalLink
} from 'lucide-react'
import { jsPDF } from 'jspdf'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type PvcTab = 'Card Designer' | 'Dimensions & Marks' | 'Print Setup' | 'Recent Cards'

export default function PVCCardPage() {
  const { user } = useAuth()
  const router = useRouter()

  const [activeTab, setActiveTab] = useState<PvcTab>('Card Designer')
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [width, setWidth] = useState(85.6)
  const [height, setHeight] = useState(53.98)
  const [cornerRadius, setCornerRadius] = useState(3.18)
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape')
  const [includeCropMarks, setIncludeCropMarks] = useState(true)
  const [cardType, setCardType] = useState<'id' | 'badge' | 'membership' | 'blank'>('id')
  const [generating, setGenerating] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const [recentCards, setRecentCards] = useState([
    { id: '1', name: 'Corporate_Staff_ID_Rahul.pdf', size: '85.6 × 54 mm', orientation: 'Landscape', date: 'Just now', density: '8 cards/page', status: 'Ready' },
    { id: '2', name: 'Visitor_Access_Badge.pdf', size: '54 × 85.6 mm', orientation: 'Portrait', date: 'Yesterday', density: '10 cards/page', status: 'Printed' },
    { id: '3', name: 'Gym_Membership_Card.pdf', size: '85.6 × 54 mm', orientation: 'Landscape', date: 'Sep 04, 2026', density: '8 cards/page', status: 'Ready' },
  ])

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setUploadedImage(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handleGeneratePDF = async () => {
    setGenerating(true)
    const pdf = new jsPDF({
      orientation: orientation,
      unit: 'mm',
      format: 'a4'
    })

    const cardsPerRow = orientation === 'landscape' ? 3 : 2
    const cardsPerCol = orientation === 'landscape' ? 4 : 5
    const marginX = 10
    const marginY = 10
    const gutterX = 5
    const gutterY = 5

    // Scaled rendering dimensions for standard A4 fit
    const renderW = orientation === 'landscape' ? 55 : 45
    const renderH = orientation === 'landscape' ? 35 : 65

    for (let row = 0; row < cardsPerCol; row++) {
      for (let col = 0; col < cardsPerRow; col++) {
        const x = marginX + col * (renderW + gutterX)
        const y = marginY + row * (renderH + gutterY)

        if (uploadedImage) {
          pdf.addImage(uploadedImage, 'JPEG', x, y, renderW, renderH)
        } else {
          pdf.setFillColor(240, 243, 246)
          pdf.roundedRect(x, y, renderW, renderH, 2, 2, 'F')
          pdf.setTextColor(150, 150, 150)
          pdf.setFontSize(8)
          pdf.text(`PVC Card ${row * cardsPerRow + col + 1}`, x + 4, y + 8)
        }

        if (includeCropMarks) {
          pdf.setDrawColor(160, 160, 160)
          pdf.setLineWidth(0.2)
          pdf.line(x - 2, y, x, y)
          pdf.line(x, y - 2, x, y)
          pdf.line(x + renderW + 2, y, x + renderW, y)
          pdf.line(x + renderW, y - 2, x + renderW, y)
          pdf.line(x - 2, y + renderH, x, y + renderH)
          pdf.line(x, y + renderH + 2, x, y + renderH)
          pdf.line(x + renderW + 2, y + renderH, x + renderW, y + renderH)
          pdf.line(x + renderW, y + renderH + 2, x + renderW, y + renderH)
        }
      }
    }

    const fileName = `PVC_Cards_${Date.now()}.pdf`
    pdf.save(fileName)

    setRecentCards(prev => [
      {
        id: String(Date.now()),
        name: fileName,
        size: `${width} × ${height} mm`,
        orientation: orientation === 'landscape' ? 'Landscape' : 'Portrait',
        date: 'Just now',
        density: '8 cards/page',
        status: 'Ready'
      },
      ...prev
    ])

    if (user) {
      try {
        await supabase.from('activity_logs').insert({
          user_id: user.id,
          action: 'pvc_generated',
          description: 'Generated PVC layout PDF',
          file_name: fileName
        })
      } catch (err) { console.error(err) }
    }

    setGenerating(false)
  }

  const tabs: PvcTab[] = ['Card Designer', 'Dimensions & Marks', 'Print Setup', 'Recent Cards']

  const creatorTools = [
    { label: 'My Photos', href: '/photos', icon: ImageIcon, color: '#10b981', desc: 'Background removal & editor' },
    { label: 'Create Sheet', href: '/create-sheet', icon: Grid2x2, color: '#3b82f6', desc: 'Passport & stamp photo sheets' },
    { label: 'PVC Card', href: '/pvc-card', icon: CreditCard, color: '#8b5cf6', desc: 'Custom badge & ID PVC cards', current: true },
    { label: 'PDF Converter', href: '/pdf-converter', icon: FileText, color: '#f59e0b', desc: 'Convert image & doc to PDF' },
    { label: 'PDF Crop', href: '/crop', icon: Scissors, color: '#ec4899', desc: 'Multi-page cropping tool' },
    { label: 'Token Enter', href: '/token/create', icon: Coins, color: '#06b6d4', desc: 'Claim vouchers & credits' },
  ]

  return (
    <DashboardLayout>
      <FeatureLock featureName="PVC Card">
        <div style={{ maxWidth: 1120, paddingBottom: 60 }}>

          {/* ─── Breadcrumb & Top Action Row ─── */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5 }}>
              <span style={{ color: 'var(--text-muted)', cursor: 'pointer' }} onClick={() => router.push('/dashboard')}>Dashboard</span>
              <span style={{ color: 'var(--text-muted)' }}>&gt;</span>
              <span style={{ color: '#10b981', fontWeight: 600 }}>PVC Card Builder</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                onClick={handleGeneratePDF}
                disabled={generating}
                style={{
                  background: '#10b981', color: '#ffffff', border: 'none', borderRadius: 8,
                  padding: '8px 18px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)', opacity: generating ? 0.7 : 1
                }}
              >
                <Download size={15} /> {generating ? 'Generating Sheet...' : 'Export PVC Layout PDF'}
              </button>

              <button
                onClick={() => router.push('/settings')}
                style={{
                  background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8,
                  padding: '8px 14px', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)',
                  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6
                }}
              >
                <Settings size={14} /> Settings
              </button>
            </div>
          </div>

          {/* ─── Page Title Header (Matches Settings/Profile) ─── */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 14,
                background: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <CreditCard size={24} />
              </div>
              <div>
                <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 4px 0', letterSpacing: '-0.5px' }}>
                  PVC Card Builder
                </h1>
                <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>
                  Design and assemble print-ready CR-80 PVC identity cards, smart badges, and membership cards with bleed boundaries.
                </p>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div style={{
              display: 'flex', gap: 24, padding: '14px 20px',
              border: '1px solid var(--border)', borderRadius: 12,
              background: 'var(--bg-card)', marginTop: 18, overflowX: 'auto'
            }}>
              {[
                { label: 'Standard Profile', value: 'ISO/IEC 7810 CR-80', color: '#8b5cf6' },
                { label: 'Card Dimensions', value: `${width} × ${height} mm`, color: '#3b82f6' },
                { label: 'Sheet Density', value: '8 Cards / A4 Sheet', color: '#10b981' },
                { label: 'Corner Radius', value: `${cornerRadius} mm (Standard)`, color: '#f59e0b' },
                { label: 'Print DPI', value: '300 DPI Thermal/Inkjet', color: '#ec4899' },
              ].map(stat => (
                <div key={stat.label} style={{ minWidth: 120 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>
                    {stat.label}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: stat.color }}>{stat.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ─── Horizontal Navigation Tabs ─── */}
          <div style={{
            display: 'flex', gap: 24, borderBottom: '1px solid var(--border)',
            marginBottom: 28, overflowX: 'auto', paddingBottom: 2
          }}>
            {tabs.map((tab) => {
              const isActive = activeTab === tab
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    background: 'none', border: 'none', padding: '10px 4px 14px 4px',
                    fontSize: 14, fontWeight: isActive ? 700 : 500,
                    color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                    cursor: 'pointer', position: 'relative', whiteSpace: 'nowrap',
                    transition: 'color 0.15s ease'
                  }}
                >
                  {tab}
                  {isActive && (
                    <div style={{
                      position: 'absolute', bottom: -1, left: 0, right: 0,
                      height: 2.5, background: '#10b981', borderRadius: '2px 2px 0 0'
                    }} />
                  )}
                </button>
              )
            })}
          </div>

          {/* ─── TAB 1: CARD DESIGNER ─── */}
          {activeTab === 'Card Designer' && (
            <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 24, alignItems: 'start' }}>
              {/* Left Controls */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Upload Card Artwork */}
                <div className="card" style={{ borderRadius: 16, padding: '22px 24px', background: 'var(--bg-card)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                      Card Artwork Asset
                    </h3>
                    <span style={{ fontSize: 11.5, fontWeight: 700, padding: '3px 8px', borderRadius: 9999, background: 'rgba(139,92,246,0.12)', color: '#8b5cf6' }}>
                      CR-80
                    </span>
                  </div>

                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: '1px dashed var(--border)', borderRadius: 12, padding: '26px 16px',
                      textAlign: 'center', cursor: 'pointer', background: 'var(--bg-primary)'
                    }}
                  >
                    <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(139,92,246,0.12)', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                      <Upload size={20} />
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                      {uploadedImage ? 'Replace card artwork' : 'Upload front artwork'}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      PNG, JPG or PDF (Up to 20MB)
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleFile}
                      style={{ display: 'none' }}
                    />
                  </div>
                </div>

                {/* Orientation & Format */}
                <div className="card" style={{ borderRadius: 16, padding: '22px 24px', background: 'var(--bg-card)' }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14 }}>
                    Orientation & Style
                  </h3>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
                    {(['landscape', 'portrait'] as const).map(o => (
                      <button
                        key={o}
                        onClick={() => setOrientation(o)}
                        style={{
                          padding: '12px 14px', borderRadius: 10,
                          border: orientation === o ? '2px solid #8b5cf6' : '1px solid var(--border)',
                          background: orientation === o ? 'rgba(139,92,246,0.08)' : 'var(--bg-primary)',
                          color: orientation === o ? 'var(--text-primary)' : 'var(--text-secondary)',
                          cursor: 'pointer', fontSize: 13, fontWeight: 700, textTransform: 'capitalize'
                        }}
                      >
                        {o === 'landscape' ? '💳 Landscape' : '🪪 Portrait'}
                      </button>
                    ))}
                  </div>

                  <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>
                    Card Template Mode
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                    {[
                      { label: 'Staff ID', id: 'id' },
                      { label: 'Visitor Badge', id: 'badge' },
                      { label: 'Membership', id: 'membership' },
                      { label: 'Blank Print', id: 'blank' },
                    ].map(type => (
                      <button
                        key={type.id}
                        onClick={() => setCardType(type.id as any)}
                        style={{
                          padding: '8px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                          border: cardType === type.id ? '1.5px solid #10b981' : '1px solid var(--border)',
                          background: cardType === type.id ? 'rgba(16,185,129,0.08)' : 'var(--bg-primary)',
                          color: cardType === type.id ? '#10b981' : 'var(--text-secondary)',
                          cursor: 'pointer'
                        }}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Stage: Realistic 3D Card Preview */}
              <div className="card" style={{ borderRadius: 16, padding: '24px 28px', background: 'var(--bg-card)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#8b5cf6', boxShadow: '0 0 6px #8b5cf6' }} />
                    <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                      Interactive Card Mockup
                    </span>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#10b981', padding: '3px 10px', borderRadius: 9999, background: 'rgba(16,185,129,0.12)' }}>
                    Standard CR-80
                  </span>
                </div>

                {/* Card Canvas Mockup */}
                <div style={{
                  display: 'flex', justifyContent: 'center', alignItems: 'center',
                  minHeight: 380, background: '#171b26', borderRadius: 14,
                  border: '1px solid var(--border)', padding: 32
                }}>
                  <div style={{
                    width: orientation === 'landscape' ? 360 : 230,
                    height: orientation === 'landscape' ? 226 : 354,
                    borderRadius: cornerRadius * 3,
                    background: uploadedImage ? '#ffffff' : 'linear-gradient(135deg, #1e293b, #0f172a)',
                    border: '1px solid rgba(255,255,255,0.18)',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.45)',
                    position: 'relative', overflow: 'hidden',
                    display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
                  }}>
                    {uploadedImage ? (
                      <img src={uploadedImage} alt="Card art" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <>
                        <div style={{ padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '1px', color: '#94a3b8', textTransform: 'uppercase' }}>
                              ORGANIZATION PASS
                            </div>
                            <div style={{ fontSize: 17, fontWeight: 800, color: '#ffffff', marginTop: 2 }}>
                              Alex Morgan
                            </div>
                            <div style={{ fontSize: 11.5, color: '#60a5fa', fontWeight: 600 }}>
                              Senior Product Designer
                            </div>
                          </div>
                          <div style={{ width: 34, height: 26, borderRadius: 5, background: 'linear-gradient(135deg, #f59e0b, #d97706)', border: '1px solid rgba(255,255,255,0.2)' }} />
                        </div>

                        <div style={{ padding: 20, background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Shield size={16} color="#10b981" />
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#10b981' }}>ACCESS VERIFIED</span>
                          </div>
                          <span style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace' }}>ID: 829-4109-PVC</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Bottom Action Strip */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  marginTop: 20, padding: '14px 18px', background: 'var(--bg-primary)',
                  borderRadius: 12, border: '1px solid var(--border)'
                }}>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)' }}>
                      Ready to Print on A4 Cardstock
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      Output will lay out 8 cards per page with 300 DPI vector lines
                    </div>
                  </div>

                  <button
                    onClick={handleGeneratePDF}
                    style={{
                      background: '#10b981', color: '#ffffff', border: 'none', borderRadius: 8,
                      padding: '8px 18px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)'
                    }}
                  >
                    <Download size={15} /> Export PDF Sheet
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ─── TAB 2: DIMENSIONS & MARKS ─── */}
          {activeTab === 'Dimensions & Marks' && (
            <div className="card" style={{ borderRadius: 16, padding: '24px 28px', background: 'var(--bg-card)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                  <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                    Card Geometry & Physical Calibration
                  </h3>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                    Standard CR-80 physical dimensions or custom badge specifications
                  </p>
                </div>
                <button
                  onClick={() => { setWidth(85.6); setHeight(53.98); setCornerRadius(3.18) }}
                  className="btn btn-secondary btn-sm"
                >
                  Reset CR-80 Standard
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
                <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 18, background: 'var(--bg-primary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Width (mm)</label>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#8b5cf6' }}>{width} mm</span>
                  </div>
                  <input type="range" className="slider" min={40} max={120} step={0.1} value={width} onChange={(e) => setWidth(parseFloat(e.target.value))} />
                </div>

                <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 18, background: 'var(--bg-primary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Height (mm)</label>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#8b5cf6' }}>{height} mm</span>
                  </div>
                  <input type="range" className="slider" min={20} max={90} step={0.1} value={height} onChange={(e) => setHeight(parseFloat(e.target.value))} />
                </div>

                <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 18, background: 'var(--bg-primary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Corner Radius (mm)</label>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#10b981' }}>{cornerRadius} mm</span>
                  </div>
                  <input type="range" className="slider" min={0} max={10} step={0.1} value={cornerRadius} onChange={(e) => setCornerRadius(parseFloat(e.target.value))} />
                </div>
              </div>
            </div>
          )}

          {/* ─── TAB 3: PRINT SETUP ─── */}
          {activeTab === 'Print Setup' && (
            <div className="card" style={{ borderRadius: 16, padding: '24px 28px', background: 'var(--bg-card)' }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                Thermal Printer & Sheet Layout Preferences
              </h3>
              <p style={{ fontSize: 13.5, color: 'var(--text-muted)', marginBottom: 24 }}>
                Set up card tray alignment and multi-card sheet density.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 20, background: 'var(--bg-primary)' }}>
                  <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>A4 PVC Card Layout</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13, color: 'var(--text-secondary)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Cards per Page:</span>
                      <strong style={{ color: 'var(--text-primary)' }}>8 to 10 Cards</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Gutter Gap:</span>
                      <strong style={{ color: 'var(--text-primary)' }}>5.0 mm</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Bleed Margin:</span>
                      <strong style={{ color: 'var(--text-primary)' }}>3.0 mm</strong>
                    </div>
                  </div>
                </div>

                <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 20, background: 'var(--bg-primary)' }}>
                  <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Print Options</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-primary)', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={includeCropMarks}
                        onChange={(e) => setIncludeCropMarks(e.target.checked)}
                        style={{ accentColor: '#10b981', width: 16, height: 16 }}
                      />
                      Include cutting corner crop-marks
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─── TAB 4: RECENT CARDS ─── */}
          {activeTab === 'Recent Cards' && (
            <div className="card" style={{ borderRadius: 16, padding: '24px 28px', background: 'var(--bg-card)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                  <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                    PVC Card Generation History
                  </h3>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                    Print runs and layout sheets generated on this device
                  </p>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <th style={{ padding: '12px 14px', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>File Name</th>
                      <th style={{ padding: '12px 14px', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Dimensions</th>
                      <th style={{ padding: '12px 14px', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Orientation</th>
                      <th style={{ padding: '12px 14px', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Density</th>
                      <th style={{ padding: '12px 14px', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Status</th>
                      <th style={{ padding: '12px 14px', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentCards.map(c => (
                      <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '14px', fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <CreditCard size={16} color="#8b5cf6" />
                            {c.name}
                          </div>
                        </td>
                        <td style={{ padding: '14px', fontSize: 13, color: 'var(--text-secondary)' }}>{c.size}</td>
                        <td style={{ padding: '14px', fontSize: 13, color: 'var(--text-secondary)' }}>{c.orientation}</td>
                        <td style={{ padding: '14px', fontSize: 13, color: 'var(--text-secondary)' }}>{c.density}</td>
                        <td style={{ padding: '14px' }}>
                          <span style={{
                            padding: '3px 10px', borderRadius: 9999, fontSize: 11.5, fontWeight: 700,
                            background: 'rgba(16,185,129,0.12)', color: '#10b981'
                          }}>
                            {c.status}
                          </span>
                        </td>
                        <td style={{ padding: '14px', textAlign: 'right' }}>
                          <button
                            onClick={handleGeneratePDF}
                            style={{ background: 'none', border: 'none', color: '#10b981', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                          >
                            Re-export
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ─── Creator Suite Navigation Footer (Exact Match to Settings/Profile) ─── */}
          <div style={{ marginTop: 48, paddingTop: 32, borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  Explore Creator Suite
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                  Quick switch to another photo creation or document utility tool
                </p>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
              {creatorTools.map(tool => {
                const Icon = tool.icon
                return (
                  <div
                    key={tool.label}
                    onClick={() => router.push(tool.href)}
                    className="card"
                    style={{
                      padding: '16px 18px', borderRadius: 12, cursor: 'pointer',
                      border: tool.current ? `1.5px solid ${tool.color}` : '1px solid var(--border)',
                      background: tool.current ? `${tool.color}0a` : 'var(--bg-card)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: 8,
                        background: `${tool.color}15`, color: tool.color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        <Icon size={18} />
                      </div>
                      <ChevronRight size={14} color="var(--text-muted)" />
                    </div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 3 }}>
                      {tool.label}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                      {tool.desc}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

        </div>
      </FeatureLock>
    </DashboardLayout>
  )
}
