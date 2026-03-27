'use client'

import { useState, useEffect, useRef } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { Printer, Download, RotateCw, ZoomIn, ZoomOut } from 'lucide-react'
import { jsPDF } from 'jspdf'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import FeatureLock from '@/components/FeatureLock'

const PHOTO_WIDTH_MM = 30
const PHOTO_HEIGHT_MM = 40
const A4_WIDTH_MM = 210
const A4_HEIGHT_MM = 297
const MARGIN_X_MM = 10
const MARGIN_Y_MM = 5
const GUTTER_X_MM = 2
const GUTTER_Y_MM = 1.15
const PHOTOS_PER_ROW = 6

export default function CreateSheetPage() {
  const { user } = useAuth()
  const [photoCount, setPhotoCount] = useState(42)
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

  const [currentPage, setCurrentPage] = useState(1)

  const PHOTOS_PER_PAGE = 42
  const totalPages = Math.ceil(photoCount / PHOTOS_PER_PAGE)

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

    // Paper Background
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)

    const photoW = mmToPx(PHOTO_WIDTH_MM)
    const photoH = mmToPx(PHOTO_HEIGHT_MM)
    const marginX = mmToPx(MARGIN_X_MM)
    const marginY = mmToPx(MARGIN_Y_MM)
    const gutterX = mmToPx(GUTTER_X_MM)
    const gutterY = mmToPx(GUTTER_Y_MM)

    const startIndex = (currentPage - 1) * PHOTOS_PER_PAGE
    const endIndex = Math.min(startIndex + PHOTOS_PER_PAGE, photoCount)
    const countOnThisPage = endIndex - startIndex

    const loadedImages: HTMLImageElement[] = []
    if (photoList.length > 0) {
      await Promise.all(photoList.map(src => {
        return new Promise((resolve) => {
          const img = new Image()
          img.crossOrigin = 'anonymous'
          img.onload = () => { loadedImages.push(img); resolve(true) }
          img.onerror = () => resolve(false)
          img.src = src
        })
      }))
    }

    let localCount = 0
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < PHOTOS_PER_ROW; col++) {
        if (localCount >= countOnThisPage) break
        const x = marginX + col * (photoW + gutterX)
        const y = marginY + row * (photoH + gutterY)

        if (bgColor !== 'transparent') {
          ctx.fillStyle = bgColor
          ctx.fillRect(x, y, photoW, photoH)
        }

        const currentImg = loadedImages[(startIndex + localCount) % loadedImages.length]
        if (currentImg) {
          ctx.drawImage(currentImg, x, y, photoW, photoH)
        } else {
          ctx.fillStyle = '#f3f4f6'
          ctx.fillRect(x, y, photoW, photoH)
        }

        if (borderThickness > 0) {
          ctx.strokeStyle = '#cccccc'
          ctx.lineWidth = borderThickness
          ctx.strokeRect(x, y, photoW, photoH)
        }
        localCount++
      }
    }
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
  }, [photoCount, currentPage, layout, borderThickness, bgColor, photoList])

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
  const getPageDataURL = async (pageNum: number): Promise<string> => {
    const canvas = document.createElement('canvas')
    const dpi = 300 // High-res for export
    const mmToPx = (mm: number) => (mm / 25.4) * dpi

    const canvasWidth = mmToPx(A4_WIDTH_MM)
    const canvasHeight = mmToPx(A4_HEIGHT_MM)
    canvas.width = canvasWidth
    canvas.height = canvasHeight

    const ctx = canvas.getContext('2d')
    if (!ctx) return ''

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)

    const photoW = mmToPx(PHOTO_WIDTH_MM)
    const photoH = mmToPx(PHOTO_HEIGHT_MM)
    const marginX = mmToPx(MARGIN_X_MM)
    const marginY = mmToPx(MARGIN_Y_MM)
    const gutterX = mmToPx(GUTTER_X_MM)
    const gutterY = mmToPx(GUTTER_Y_MM)

    const startIndex = (pageNum - 1) * PHOTOS_PER_PAGE
    const endIndex = Math.min(startIndex + PHOTOS_PER_PAGE, photoCount)
    const countOnThisPage = endIndex - startIndex

    const loadedImages: HTMLImageElement[] = []
    if (photoList.length > 0) {
      await Promise.all(photoList.map(src => {
        return new Promise((resolve) => {
          const img = new Image()
          img.crossOrigin = 'anonymous'
          img.onload = () => { loadedImages.push(img); resolve(true) }
          img.onerror = () => resolve(false)
          img.src = src
        })
      }))
    }

    let localCount = 0
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < PHOTOS_PER_ROW; col++) {
        if (localCount >= countOnThisPage) break
        const x = marginX + col * (photoW + gutterX)
        const y = marginY + row * (photoH + gutterY)

        if (bgColor !== 'transparent') { ctx.fillStyle = bgColor; ctx.fillRect(x, y, photoW, photoH) }
        const currentImg = loadedImages[(startIndex + localCount) % loadedImages.length]
        if (currentImg) ctx.drawImage(currentImg, x, y, photoW, photoH)
        if (borderThickness > 0) { ctx.strokeStyle = '#cccccc'; ctx.lineWidth = borderThickness * (dpi/96); ctx.strokeRect(x, y, photoW, photoH) }
        localCount++
      }
    }

    return canvas.toDataURL('image/jpeg', 0.95)
  }

  const handleDownloadPDF = async () => {
    setGenerating(true)
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    
    for (let p = 1; p <= totalPages; p++) {
      const dataUrl = await getPageDataURL(p)
      if (p > 1) pdf.addPage()
      pdf.addImage(dataUrl, 'JPEG', 0, 0, A4_WIDTH_MM, A4_HEIGHT_MM)
    }

    const fileName = `Passport_Sheet_${photoCount}photos_${Date.now()}.pdf`
    pdf.save(fileName)

    if (user) {
      try {
        await supabase.from('sheets').insert({ user_id: user.id, photo_count: photoCount, bg_color: bgColor, file_name: fileName })
        await supabase.from('activity_logs').insert({ user_id: user.id, action: 'sheet_generated', description: `Downloaded PDF (${totalPages} pages)`, file_name: fileName })
        
        // Update storage usage (add 3MB simulation)
        const { data: profile } = await supabase.from('profiles').select('storage_used').eq('id', user.id).single()
        if (profile) {
          await supabase.from('profiles').update({
            storage_used: (profile.storage_used || 0) + (3 * 1024 * 1024)
          }).eq('id', user.id)
        }
      } catch (err) { console.error(err) }
    }
    setGenerating(false)
  }

  const handleDownloadImage = async () => {
    setGenerating(true)
    const dataUrl = await getPageDataURL(currentPage)
    const link = document.createElement('a')
    link.download = `Passport_Photo_Sheet_${Date.now()}.jpg`
    link.href = dataUrl
    link.click()
    
    if (user) {
      await supabase.from('activity_logs').insert({ user_id: user.id, action: 'sheet_downloaded', description: `Downloaded Image Page ${currentPage}`, file_name: link.download })
      
      // Update storage usage (add 3MB simulation)
      const { data: profile } = await supabase.from('profiles').select('storage_used').eq('id', user.id).single()
      if (profile) {
        await supabase.from('profiles').update({
          storage_used: (profile.storage_used || 0) + (3 * 1024 * 1024)
        }).eq('id', user.id)
      }
    }
    setGenerating(false)
  }

  const handlePrint = async () => {
    const win = window.open('')
    if (!win) return
    win.document.write(`
      <html>
        <head>
          <title>Print Sheet</title>
          <style>
            @page { size: A4; margin: 0; }
            body { margin: 0; padding: 0; display: flex; flex-direction: column; align-items: center; }
            .page { width: 210mm; height: 297mm; background: white; margin: 0; page-break-after: always; display: flex; align-items: center; justify-content: center; overflow: hidden; }
            img { width: 100%; height: auto; display: block; }
          </style>
        </head>
        <body>
    `)
    
    for (let p = 1; p <= totalPages; p++) {
      const dataUrl = await getPageDataURL(p)
      win.document.write(`<div class="page"><img src="${dataUrl}" /></div>`)
    }
    
    win.document.write('<script>window.onload = () => { window.print(); window.close(); }</script></body></html>')
    win.document.close()
    
    if (user) {
      supabase.from('activity_logs').insert({ user_id: user.id, action: 'sheet_printed', description: `Printed Sheet (${totalPages} pages)`, file_name: `Print_${Date.now()}.pdf` }).then(() => {})
    }
  }


  return (
    <DashboardLayout>
      <FeatureLock featureName="Create Sheet">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <h1 className="page-title">A4 Sheet Generator</h1>
        <div style={{ display: 'flex', gap: 10, marginLeft: 'auto', alignItems: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
          <span style={{ fontSize: 13 }}>📄 Passport Size</span>
          <span>📐 3.5cm × 4.5cm</span>
          {totalPages > 1 && (
             <span style={{ background: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: 4, fontWeight: 700, color: 'var(--accent-purple-light)' }}>
               {totalPages} PAGES
             </span>
          )}
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
              <label className="form-label">Total Photo Count? (Overall Total)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg-primary)', borderRadius: 8, border: '1px solid var(--border)', overflow: 'hidden' }}>
                <input
                  id="photo-count-input"
                  type="number"
                  min={1}
                  max={500}
                  value={photoCount}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 1
                    setPhotoCount(Math.min(500, Math.max(1, val)))
                  }}
                  className="form-input"
                  style={{ border: 'none', background: 'transparent', flex: 1, fontSize: 20, fontWeight: 700 }}
                />
                <span style={{ padding: '0 16px', color: 'var(--text-secondary)', fontSize: 13 }}>Photos</span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                → Each A4 page fits exactly 42 photos (6×7 grid).
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

            <button id="download-pdf-btn" className="btn btn-secondary btn-lg" style={{ width: '100%', marginBottom: 10 }} onClick={handleDownloadPDF} disabled={generating}>
              {generating ? (
                <><RotateCw size={16} className="animate-spin" /> Generating...</>
              ) : (
                <><Download size={16} /> Download PDF</>
              )}
            </button>

            <button id="download-image-btn" className="btn btn-secondary btn-lg" style={{ width: '100%' }} onClick={handleDownloadImage} disabled={generating || photoList.length === 0}>
              <RotateCw size={16} /> DOWNLOAD IMAGE (JPG)
            </button>

            <div style={{ marginTop: 16, padding: 12, borderRadius: 8, background: 'rgba(236, 72, 153, 0.1)', border: '1px solid rgba(236, 72, 153, 0.2)' }}>
              <p style={{ fontSize: 11, color: 'var(--accent-pink)', fontWeight: 600, textAlign: 'center', marginBottom: 4 }}>
                ⚠️ IMPORTANT PRINT INSTRUCTION:
              </p>
              <p style={{ fontSize: 10, color: 'var(--text-secondary)', textAlign: 'center', lineHeight: '1.4' }}>
                Print at 100% scale (Do not fit to page) for exact 30x40mm dimensions.
              </p>
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-purple-light)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 16 }}>
              Photo Library
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
              {photoList.map((src, idx) => (
                <div key={idx} style={{ position: 'relative', aspectRatio: '3/4', borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border)' }}>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button 
                  className="btn btn-sm btn-secondary" 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  style={{ width: 32, padding: 0 }}
                >
                  ←
                </button>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', minWidth: 80, textAlign: 'center' }}>
                  Page {currentPage} of {totalPages}
                </span>
                <button 
                  className="btn btn-sm btn-secondary" 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  style={{ width: 32, padding: 0 }}
                >
                  →
                </button>
            </div>
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
      </FeatureLock>
    </DashboardLayout>
  )
}
