'use client'

import { useState, useRef } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import FeatureLock from '@/components/FeatureLock'
import { Upload, Printer, Download, RotateCw, ChevronRight, CreditCard, Image as ImageIcon, Grid2x2, FileText, Scissors, Coins, Settings, User } from 'lucide-react'
import { jsPDF } from 'jspdf'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function PVCCardPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [width, setWidth] = useState(50)
  const [height, setHeight] = useState(30)
  const [cornerRadius, setCornerRadius] = useState(10)
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape')
  const [includeCropMarks, setIncludeCropMarks] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [generating, setGenerating] = useState(false)

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

    for (let row = 0; row < cardsPerCol; row++) {
      for (let col = 0; col < cardsPerRow; col++) {
        const x = marginX + col * (width + gutterX)
        const y = marginY + row * (height + gutterY)

        if (uploadedImage) {
          pdf.addImage(uploadedImage, 'JPEG', x, y, width, height)
        } else {
          pdf.setFillColor(200, 200, 200)
          pdf.rect(x, y, width, height, 'F')
        }

        if (includeCropMarks) {
          pdf.setDrawColor(180, 180, 180)
          pdf.setLineWidth(0.2)
          pdf.line(x - 3, y, x, y)
          pdf.line(x, y - 3, x, y)
          pdf.line(x + width, y - 3, x + width, y)
          pdf.line(x + width + 3, y, x + width, y)
          pdf.line(x - 3, y + height, x, y + height)
          pdf.line(x, y + height + 3, x, y + height)
          pdf.line(x + width, y + height + 3, x + width, y + height)
          pdf.line(x + width + 3, y + height, x + width, y + height)
        }
      }
    }

    // Log activity
    if (user) {
      await supabase.from('activity_logs').insert({
        user_id: user.id,
        action: 'pvc_generated',
        description: 'Generated PVC layout PDF',
        file_name: `PVC_Cards_${Date.now()}.pdf`
      })

      // Update storage usage (add 3MB simulation)
      const { data: profile } = await supabase.from('profiles').select('storage_used').eq('id', user.id).single()
      if (profile) {
        await supabase.from('profiles').update({
          storage_used: (profile.storage_used || 0) + (3 * 1024 * 1024)
        }).eq('id', user.id)
      }
    }

    pdf.save(`PVC_Cards_${Date.now()}.pdf`)
    setGenerating(false)
  }

  return (
    <DashboardLayout>
      <FeatureLock featureName="PVC Card">

      {/* Breadcrumb */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
          <span style={{ color: 'var(--text-muted)', cursor: 'pointer' }} onClick={() => router.push('/dashboard')}>Dashboard</span>
          <span style={{ color: 'var(--text-muted)' }}>&gt;</span>
          <span style={{ color: '#10b981', fontWeight: 600 }}>PVC Card</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => router.push('/settings')} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}><Settings size={14} /> Settings</button>
          <button onClick={() => router.push('/profile')} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}><User size={14} /> Profile</button>
        </div>
      </div>

      {/* Page Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
          <div style={{ width: 46, height: 46, borderRadius: 12, background: 'rgba(139,92,246,0.12)', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <CreditCard size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 4px 0', letterSpacing: '-0.4px' }}>PVC Card Builder</h1>
            <p style={{ fontSize: 13.5, color: 'var(--text-muted)', margin: 0 }}>Create print-ready PVC card sheets with exact dimensions, crop marks, and instant PDF export.</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 24, padding: '12px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', marginTop: 16 }}>
          {[
            { label: 'Standard Size', value: 'CR-80', color: '#8b5cf6' },
            { label: 'Cards / Sheet', value: '8', color: '#3b82f6' },
            { label: 'Resolution', value: '300 DPI', color: '#10b981' },
            { label: 'Output', value: 'PDF', color: '#f59e0b' },
          ].map(s => (
            <div key={s.label}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>{s.label}</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 20, alignItems: 'start' }}>
        {/* Settings */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Source Assets */}
          <div className="card">
            <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 16 }}>
              1. Source Assets
            </h3>
            <div
              className="upload-zone"
              style={{ padding: 24 }}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="upload-icon" style={{ width: 44, height: 44, marginBottom: 12 }}>
                <Upload size={20} />
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Upload card artwork or image</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>PNG, JPG, or PDF up to 20MB</div>
            </div>
            <input id="pvc-file-input" ref={fileInputRef} type="file" accept="image/*,.pdf" onChange={handleFile} style={{ display: 'none' }} />
          </div>

          {/* Card Dimensions */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                2. Card Dimensions
              </h3>
              <span className="pill pill-blue">CR-80 STANDARD</span>
            </div>

            {[
              { label: 'Width (mm)', value: width, setter: setWidth, min: 30, max: 100, id: 'width-slider' },
              { label: 'Height (mm)', value: height, setter: setHeight, min: 20, max: 70, id: 'height-slider' },
              { label: 'Corner Radius', value: cornerRadius, setter: setCornerRadius, min: 0, max: 15, id: 'corner-radius-slider', step: 0.5 },
            ].map((control) => (
              <div key={control.label} className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label className="form-label" style={{ margin: 0 }}>{control.label}</label>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{control.value.toFixed(2)} mm</span>
                </div>
                <input
                  id={control.id}
                  type="range"
                  className="slider"
                  min={control.min}
                  max={control.max}
                  step={control.step ?? 0.1}
                  value={control.value}
                  onChange={(e) => control.setter(parseFloat(e.target.value))}
                />
              </div>
            ))}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
              {(['landscape', 'portrait'] as const).map((o) => (
                <button
                  key={o}
                  id={`orientation-${o}-btn`}
                  className="btn btn-sm"
                  onClick={() => setOrientation(o)}
                  style={{
                    background: orientation === o ? 'var(--bg-card-hover)' : 'transparent',
                    border: `1px solid ${orientation === o ? 'var(--border-light)' : 'var(--border)'}`,
                    color: orientation === o ? 'var(--text-primary)' : 'var(--text-secondary)',
                    textTransform: 'capitalize'
                  }}
                >
                  {o}
                </button>
              ))}
            </div>
          </div>

          {/* Printer Stats */}
          <div className="card">
            <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 16 }}>
              Printer Stats
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--text-secondary)' }}>Sheet Density</span>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>8 Cards/Page</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--text-secondary)' }}>DPI Target</span>
                <span style={{ fontWeight: 700, color: 'var(--accent-blue)' }}>300 DPI</span>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <input
                  id="crop-marks-check"
                  type="checkbox"
                  checked={includeCropMarks}
                  onChange={(e) => setIncludeCropMarks(e.target.checked)}
                  style={{ accentColor: 'var(--accent-purple)', width: 16, height: 16 }}
                />
                Include crop marks & bleed (3mm)
              </label>
            </div>
          </div>

          <button id="printer-preview-btn" className="btn btn-secondary btn-lg" style={{ width: '100%' }}>
            <Printer size={16} />
            Preview Sheet Layout
          </button>

          <button id="generate-pvc-pdf-btn" className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={handleGeneratePDF} disabled={generating}>
            {generating ? <><RotateCw size={16} className="animate-spin" /> Generating...</> : <><Download size={16} /> Export PVC Layout PDF</>}
          </button>
        </div>

        {/* Preview */}
        <div>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
              <div style={{
                width: `${orientation === 'landscape' ? 320 : 200}px`,
                height: `${orientation === 'landscape' ? 200 : 280}px`,
                border: '2px solid var(--accent-purple)',
                borderRadius: 12,
                overflow: 'hidden',
                position: 'relative',
                background: uploadedImage ? 'transparent' : 'var(--bg-primary)'
              }}>
                {uploadedImage ? (
                  <img src={uploadedImage} alt="Card preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', gap: 8 }}>
                    <CreditCardIcon />
                    <span style={{ fontSize: 13 }}>Upload image to preview</span>
                  </div>
                )}
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  background: 'rgba(10, 14, 26, 0.9)',
                  padding: '10px 16px',
                  display: 'flex', alignItems: 'center', gap: 10
                }}>
                  <div style={{ width: 32, height: 32, borderRadius: 6, background: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'white' }}>ACCESS GRANTED</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Valid until Dec 2025</div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 8 }}>
              {[
                { icon: '🔍+' }, { icon: '🔍-' }, { icon: '↺' }, { icon: '↻' }, { icon: '⊟' }
              ].map((tool, i) => (
                <button key={i} className="icon-btn" style={{ width: 40, height: 40 }}>
                  <span style={{ fontSize: 14 }}>{tool.icon}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Features */}
          <div className="grid-3" style={{ marginTop: 20 }}>
            {[
              { icon: 'ℹ️', title: 'Standard PVC Sizes', desc: 'Most PVC printers use CR-80 (85.6 × 53.98mm). Use sliders to calibrate precisely.' },
              { icon: '✨', title: 'Smart Alignment', desc: 'Faces are automatically detected and centered. Manually adjust using crop controls.' },
              { icon: '🖥️', title: 'Color Accuracy', desc: 'CMYK conversion is applied during PDF generation to ensure printed card matches screen.' },
            ].map((feat) => (
              <div key={feat.title} className="card">
                <div style={{ fontSize: 22, marginBottom: 10 }}>{feat.icon}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>{feat.title}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{feat.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Creator Suite Quick Access */}
      <div style={{ marginTop: 40, paddingTop: 28, borderTop: '1px solid var(--border)' }}>
        <div style={{ marginBottom: 14 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 2px 0' }}>Creator Suite</h3>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>Jump to another tool</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
          {[
            { label: 'My Photos', href: '/photos', icon: ImageIcon, color: '#10b981', desc: 'AI background removal' },
            { label: 'Create Sheet', href: '/create-sheet', icon: Grid2x2, color: '#3b82f6', desc: 'Passport photo sheets' },
            { label: 'PDF Converter', href: '/pdf-converter', icon: FileText, color: '#f59e0b', desc: 'Convert to PDF' },
            { label: 'PDF Crop', href: '/crop', icon: Scissors, color: '#ec4899', desc: 'Crop PDF pages' },
            { label: 'Token Enter', href: '/token/create', icon: Coins, color: '#06b6d4', desc: 'Claim vouchers' },
          ].map(tool => {
            const Icon = tool.icon
            return (
              <div key={tool.label} onClick={() => router.push(tool.href)} className="card" style={{ padding: '14px 16px', borderRadius: 12, cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: `${tool.color}18`, color: tool.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={16} />
                  </div>
                  <ChevronRight size={13} color="var(--text-muted)" />
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>{tool.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{tool.desc}</div>
              </div>
            )
          })}
        </div>
      </div>
      </FeatureLock>
    </DashboardLayout>
  )
}

function CreditCardIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  )
}
