'use client'

import { useState, useEffect, useRef } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { Printer, Download, RotateCw, ZoomIn, ZoomOut } from 'lucide-react'
import { jsPDF } from 'jspdf'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

const PHOTO_WIDTH_MM = 35
const PHOTO_HEIGHT_MM = 45
const A4_WIDTH_MM = 210
const A4_HEIGHT_MM = 297
const MARGIN_MM = 5
const GUTTER_MM = 3
const PHOTOS_PER_ROW = 6

export default function CreateSheetPage() {
  const { user } = useAuth()
  const [photoCount, setPhotoCount] = useState(36)
  const [errorMsg, setErrorMsg] = useState('')
  const [layout, setLayout] = useState<'standard' | 'staggered'>('standard')
  const [borderThickness, setBorderThickness] = useState(1)
  const [bgColor, setBgColor] = useState('#ffffff')
  const [customColor, setCustomColor] = useState('#ffffff')
  const [photoList, setPhotoList] = useState<string[]>([])
  const [generating, setGenerating] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const PRESET_COLORS = [
    { label: 'Transparent', value: 'transparent' },
    { label: 'White', value: '#ffffff' },
    { label: 'Light blue', value: '#c9daf8' },
    { label: 'Sky blue', value: '#56acf2' },
    { label: 'Red', value: '#e03030' },
    { label: 'Navy blue', value: '#1e3a5f' },
  ]

  const renderPreview = async () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const dpi = 96
    const mmToPx = (mm: number) => (mm / 25.4) * dpi

    const canvasWidth = mmToPx(A4_WIDTH_MM)
    const canvasHeight = mmToPx(A4_HEIGHT_MM)
    canvas.width = canvasWidth
    canvas.height = canvasHeight

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas completely first
    ctx.clearRect(0, 0, canvasWidth, canvasHeight)

    // Paper Background - Always white for printer-friendliness
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)

    const photoW = mmToPx(PHOTO_WIDTH_MM)
    const photoH = mmToPx(PHOTO_HEIGHT_MM)
    const margin = mmToPx(MARGIN_MM)
    const gutter = mmToPx(GUTTER_MM)

    // Pre-load all images for the grid
    const loadedImages: HTMLImageElement[] = []
    if (photoList.length > 0) {
      await Promise.all(photoList.map(src => {
        return new Promise((resolve) => {
          const img = new Image()
          img.crossOrigin = 'anonymous'
          img.onload = () => {
            loadedImages.push(img)
            resolve(true)
          }
          img.src = src
        })
      }))
    }

    const rows = Math.ceil(photoCount / PHOTOS_PER_ROW)

    // Calculate total grid size based on 100% scale
    const gridW = PHOTOS_PER_ROW * photoW + (PHOTOS_PER_ROW - 1) * gutter
    const gridH = rows * photoH + (rows - 1) * gutter

    // Dynamically scale down if it overflows the A4 sheet boundaries
    // We add margin * 2 to ensure we always have spacing from the paper edges
    const scaleX = (canvasWidth - margin * 2) / gridW;
    const scaleY = (canvasHeight - margin * 2) / gridH;

    // Scale factor: If the grid is too large, it shrinks. If it's small, it keeps its true 35x45mm scale (max 1)
    const scale = Math.min(1, scaleX, scaleY);

    // Actual grid dimensions after taking scale into account
    const actualGridW = gridW * scale

    // Dynamic centering based on actual scaled dimensions
    const marginX = (canvasWidth - actualGridW) / 2
    // Start from top margin instead of vertically centering
    const marginY = margin

    let count = 0

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < PHOTOS_PER_ROW && count < photoCount; col++) {
        const x = marginX + col * (photoW + gutter) * scale
        const y = marginY + row * (photoH + gutter) * scale

        const scaledPhotoW = photoW * scale
        const scaledPhotoH = photoH * scale

        // Photo background - Apply selected bgColor to the photo box
        if (bgColor !== 'transparent') {
          ctx.fillStyle = bgColor
          ctx.fillRect(x, y, scaledPhotoW, scaledPhotoH)
        }

        const currentImg = loadedImages[count % loadedImages.length]
        if (currentImg) {
          ctx.drawImage(currentImg, x, y, scaledPhotoW, scaledPhotoH)
        } else {
          // Placeholder
          ctx.fillStyle = '#e0e0e0'
          ctx.fillRect(x, y, scaledPhotoW, scaledPhotoH)
          ctx.fillStyle = '#9e9e9e'
          ctx.font = '10px Inter'
          ctx.textAlign = 'center'
          ctx.fillText('Photo', x + scaledPhotoW / 2, y + scaledPhotoH / 2)
        }

        // Border
        if (borderThickness > 0) {
          ctx.strokeStyle = '#cccccc'
          ctx.lineWidth = borderThickness
          ctx.strokeRect(x, y, scaledPhotoW, scaledPhotoH)
        }

        count++
      }
    }

    // Watermark
    ctx.fillStyle = 'rgba(150,150,150,0.3)'
    ctx.font = '10px Inter'
    ctx.textAlign = 'center'
    ctx.fillText('URLM CREATOR STUDIO', canvasWidth / 2, canvasHeight - 8)
  }

  useEffect(() => {
    const stored = localStorage.getItem('processedPhotoUrl')
    if (stored) {
      setPhotoList([stored])
    }
  }, [])

  useEffect(() => {
    renderPreview()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoCount, layout, borderThickness, bgColor, photoList])

  const handleAddPhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    Array.from(files).forEach(file => {
      const reader = new FileReader()
      reader.onload = (event) => {
        if (event.target?.result) {
          setPhotoList(prev => [...prev, event.target!.result as string])
        }
      }
      reader.readAsDataURL(file)
    })
  }

  const removePhoto = (index: number) => {
    setPhotoList(prev => prev.filter((_, i) => i !== index))
  }

  const handleDownloadPDF = async () => {
    setGenerating(true)
    const canvas = canvasRef.current
    if (!canvas) return

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const imgData = canvas.toDataURL('image/jpeg', 0.95)
    pdf.addImage(imgData, 'JPEG', 0, 0, A4_WIDTH_MM, A4_HEIGHT_MM)

    // Generate filename with photo count
    const fileName = `Passport_Sheet_${photoCount}photos_${Date.now()}.pdf`
    pdf.save(fileName)

    // Log sheet generation to database
    if (user) {
      try {
        await supabase.from('sheets').insert({
          user_id: user.id,
          photo_count: photoCount,
          bg_color: bgColor,
          file_name: fileName,
        })

        // Log activity
        await supabase.from('activity_logs').insert({
          user_id: user.id,
          action: 'sheet_generated',
          description: `Generated A4 sheet with ${photoCount} photos`,
          file_name: fileName,
        })
      } catch (err) {
        console.error('Failed to log sheet generation:', err)
      }
    }

    setGenerating(false)
  }

  const handlePrint = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dataUrl = canvas.toDataURL('image/jpeg')
    const win = window.open('')
    win?.document.write(`<html><body style="margin:0"><img src="${dataUrl}" style="width:100%" onload="window.print()"/></body></html>`)

    // Log print activity
    if (user) {
      supabase.from('activity_logs').insert({
        user_id: user.id,
        action: 'sheet_printed',
        description: `Printed A4 sheet with ${photoCount} photos`,
        file_name: `Print_${Date.now()}.pdf`,
      }).then(({ error }) => {
        if (error) console.error('Failed to log print activity:', error)
      })
    }
  }

  const rows = Math.ceil(photoCount / PHOTOS_PER_ROW)

  return (
    <DashboardLayout>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <h1 className="page-title">A4 Sheet Generator</h1>
        <div style={{ display: 'flex', gap: 10, marginLeft: 'auto', alignItems: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
          <span style={{ fontSize: 13 }}>📄 Passport Size</span>
          <span>📐 3.5cm × 4.5cm</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20, alignItems: 'start' }}>
        {/* Settings Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-purple-light)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 20 }}>
              Sheet Settings
            </h3>

            <div className="form-group">
              <label className="form-label">How many photos? (Kitni photos chahiye)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg-primary)', borderRadius: 8, border: '1px solid var(--border)', overflow: 'hidden' }}>
                <input
                  id="photo-count-input"
                  type="number"
                  min={1}
                  max={42}
                  value={photoCount}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 1
                    if (val > 42) {
                      setErrorMsg('Error: Ek A4 paper pe maximum 42 photos hi aa sakti hain.')
                      setPhotoCount(42)
                    } else {
                      setErrorMsg('')
                      setPhotoCount(Math.max(1, val))
                    }
                  }}
                  className="form-input"
                  style={{ border: 'none', background: 'transparent', flex: 1, fontSize: 20, fontWeight: 700 }}
                />
                <span style={{ padding: '0 16px', color: 'var(--text-secondary)', fontSize: 13 }}>Photos</span>
              </div>
              {errorMsg && <div style={{ color: '#ef4444', fontSize: 13, marginTop: 8, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>⚠️ {errorMsg}</div>}
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: errorMsg ? 4 : 6 }}>
                → {rows} rows × {PHOTOS_PER_ROW} photos/row on A4
              </p>
            </div>

            <div className="form-group">
              <label className="form-label">Grid Layout</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {(['standard', 'staggered'] as const).map((l) => (
                  <button
                    key={l}
                    id={`layout-${l}-btn`}
                    onClick={() => setLayout(l)}
                    className="btn btn-sm"
                    style={{
                      background: layout === l ? 'var(--accent-purple)' : 'var(--bg-primary)',
                      color: layout === l ? 'white' : 'var(--text-secondary)',
                      border: `1px solid ${layout === l ? 'var(--accent-purple)' : 'var(--border)'}`,
                      textTransform: 'capitalize'
                    }}
                  >
                    {l === 'standard' ? '⊞' : '≡'} {l[0].toUpperCase() + l.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                Border Thickness
                <span style={{ float: 'right', fontWeight: 700, color: 'var(--text-secondary)' }}>{borderThickness}px</span>
              </label>
              <input
                id="border-thickness-slider"
                type="range"
                className="slider"
                min={0}
                max={5}
                value={borderThickness}
                onChange={(e) => setBorderThickness(parseInt(e.target.value))}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Photo Background (ALL Colors)</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8, marginBottom: 12 }}>
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c.value}
                    title={c.label}
                    onClick={() => { setBgColor(c.value); if (c.value !== 'transparent') setCustomColor(c.value) }}
                    style={{
                      width: '100%', aspectRatio: '1', borderRadius: '50%',
                      background: c.value === 'transparent' ? 'repeating-conic-gradient(#ccc 0% 25%, white 0% 50%) 0 0 / 8px 8px' : c.value,
                      border: bgColor === c.value ? '3px solid var(--accent-purple)' : '1px solid var(--border)',
                      cursor: 'pointer'
                    }}
                  />
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="color"
                  value={customColor}
                  onChange={(e) => { setCustomColor(e.target.value); setBgColor(e.target.value) }}
                  style={{ width: 32, height: 32, borderRadius: 6, border: 'none', cursor: 'pointer', padding: 0 }}
                />
                <input
                  type="text"
                  value={customColor}
                  maxLength={7}
                  onChange={(e) => {
                    const v = e.target.value
                    setCustomColor(v)
                    if (/^#[0-9a-fA-F]{6}$/.test(v)) setBgColor(v)
                  }}
                  style={{
                    flex: 1, background: 'var(--bg-primary)', border: '1px solid var(--border)',
                    borderRadius: 6, padding: '4px 8px', color: 'var(--text-primary)',
                    fontSize: 12, fontFamily: 'monospace'
                  }}
                />
              </div>
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-purple-light)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 16 }}>
              Export Options
            </h3>

            <button id="print-now-btn" className="btn btn-primary btn-lg" style={{ width: '100%', marginBottom: 10 }} onClick={handlePrint}>
              <Printer size={16} />
              Print Now
            </button>

            <button id="download-pdf-btn" className="btn btn-secondary btn-lg" style={{ width: '100%' }} onClick={handleDownloadPDF} disabled={generating}>
              {generating ? (
                <><RotateCw size={16} className="animate-spin" /> Generating...</>
              ) : (
                <><Download size={16} /> Download PDF</>
              )}
            </button>

            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 12, textAlign: 'center' }}>
              High-resolution 300 DPI output guaranteed.
            </p>
          </div>

          <div className="card">
            <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-purple-light)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 16 }}>
              Photo Library
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
              {photoList.map((src, idx) => (
                <div key={idx} style={{ position: 'relative', aspectRatio: '35/45', borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border)' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="Uploaded" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button 
                    onClick={() => removePhoto(idx)}
                    style={{ position: 'absolute', top: 2, right: 2, width: 18, height: 18, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.8)', color: 'white', border: 'none', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  >
                    ×
                  </button>
                </div>
              ))}
              <label style={{ 
                aspectRatio: '35/45', borderRadius: 6, border: '2px dashed var(--border)', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                fontSize: 20, color: 'var(--text-muted)', cursor: 'pointer' 
              }}>
                +
                <input type="file" multiple accept="image/*" onChange={handleAddPhotos} style={{ display: 'none' }} />
              </label>
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
              Add different photos to cycle them in the grid.
            </p>
          </div>

          {photoList.length === 0 && (
            <div className="alert alert-info" style={{ marginTop: 12 }}>
              No photo uploaded yet. Upload a few different photos above to see the magic.
            </div>
          )}
        </div>

        {/* Preview Panel */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {[ZoomIn, ZoomOut, RotateCw].map((Icon, i) => (
                <button key={i} className="icon-btn">
                  <Icon size={16} />
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#34d399' }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>LIVE PREVIEW</span>
            </div>
          </div>

          <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 16, border: '1px solid var(--border)' }}>
            <canvas
              ref={canvasRef}
              style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 8, display: 'block', background: 'white' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, padding: '10px 16px', background: 'var(--bg-card)', borderRadius: 8, border: '1px solid var(--border)' }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Page 1 of 1</span>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <input id="crop-marks-check" type="checkbox" defaultChecked style={{ accentColor: 'var(--accent-purple)' }} />
                Crop Marks
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <input id="labels-check" type="checkbox" style={{ accentColor: 'var(--accent-purple)' }} />
                Labels
              </label>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
