'use client'

import { useState, useEffect, useRef } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import {
  Printer, Download, RotateCw, ZoomIn, ZoomOut, ChevronRight,
  Grid2x2, Image as ImageIcon, CreditCard, FileText, Scissors,
  Coins, Settings, User, CheckCircle, Upload, Trash2, Eye,
  Sliders, Check, SlidersHorizontal, RefreshCw
} from 'lucide-react'
import { jsPDF } from 'jspdf'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import FeatureLock from '@/components/FeatureLock'
import { useRouter } from 'next/navigation'

const PHOTO_WIDTH_MM = 30
const PHOTO_HEIGHT_MM = 40
const A4_WIDTH_MM = 210
const A4_HEIGHT_MM = 297
const MARGIN_X_MM = 10
const MARGIN_Y_MM = 5
const GUTTER_X_MM = 2
const GUTTER_Y_MM = 1.15
const PHOTOS_PER_ROW = 6

type SheetTab = 'Sheet Generator' | 'Layout & Margins' | 'Export Settings' | 'Recent Sheets'

export default function CreateSheetPage() {
  const { user } = useAuth()
  const router = useRouter()

  const [activeTab, setActiveTab] = useState<SheetTab>('Sheet Generator')
  const [photoCount, setPhotoCount] = useState(42)
  const [errorMsg, setErrorMsg] = useState('')
  const [layout, setLayout] = useState<'standard' | 'staggered'>('standard')
  const [borderThickness, setBorderThickness] = useState(1)
  const [bgColor, setBgColor] = useState('#ffffff')
  const [customColor, setCustomColor] = useState('#ffffff')
  const [photoList, setPhotoList] = useState<string[]>([])
  const [generating, setGenerating] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(100)
  const [includeCropMarks, setIncludeCropMarks] = useState(true)
  const [includeLabels, setIncludeLabels] = useState(false)
  const [paperFormat, setPaperFormat] = useState<'A4' | 'Letter' | '4x6'>('A4')
  const [marginX, setMarginX] = useState(MARGIN_X_MM)
  const [marginY, setMarginY] = useState(MARGIN_Y_MM)
  const [gutterX, setGutterX] = useState(GUTTER_X_MM)
  const [gutterY, setGutterY] = useState(GUTTER_Y_MM)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const PRESET_COLORS = [
    { label: 'Transparent', value: 'transparent' },
    { label: 'Passport White', value: '#ffffff' },
    { label: 'Light Blue', value: '#c9daf8' },
    { label: 'Sky Blue', value: '#56acf2' },
    { label: 'Passport Red', value: '#e03030' },
    { label: 'Navy Blue', value: '#1e3a5f' },
    { label: 'Soft Gray', value: '#f0f0f0' },
    { label: 'Cream', value: '#fffde7' },
  ]

  const [recentSheets, setRecentSheets] = useState([
    { id: '1', name: 'Passport_Sheet_42photos.pdf', pages: 1, count: 42, date: 'Just now', format: 'A4 (300 DPI)', status: 'Generated' },
    { id: '2', name: 'Stamp_Sheet_84photos.pdf', pages: 2, count: 84, date: 'Yesterday', format: 'A4 (300 DPI)', status: 'Printed' },
    { id: '3', name: 'Visa_Sheet_Rahul_30photos.pdf', pages: 1, count: 30, date: 'Sep 06, 2026', format: 'A4 (300 DPI)', status: 'Generated' },
  ])

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

    ctx.clearRect(0, 0, canvasWidth, canvasHeight)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)

    const photoW = mmToPx(PHOTO_WIDTH_MM)
    const photoH = mmToPx(PHOTO_HEIGHT_MM)
    const mX = mmToPx(marginX)
    const mY = mmToPx(marginY)
    const gX = mmToPx(gutterX)
    const gY = mmToPx(gutterY)

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
        const x = mX + col * (photoW + gX)
        const y = mY + row * (photoH + gY)

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
          ctx.fillStyle = '#9ca3af'
          ctx.font = '10px sans-serif'
          ctx.textAlign = 'center'
          ctx.fillText(`Photo ${startIndex + localCount + 1}`, x + photoW / 2, y + photoH / 2 + 3)
        }

        if (borderThickness > 0) {
          ctx.strokeStyle = '#cccccc'
          ctx.lineWidth = borderThickness
          ctx.strokeRect(x, y, photoW, photoH)
        }

        if (includeCropMarks) {
          ctx.strokeStyle = '#9ca3af'
          ctx.lineWidth = 0.5
          // Corner ticks
          ctx.beginPath()
          ctx.moveTo(x - 2, y); ctx.lineTo(x, y)
          ctx.moveTo(x, y - 2); ctx.lineTo(x, y)
          ctx.moveTo(x + photoW + 2, y); ctx.lineTo(x + photoW, y)
          ctx.moveTo(x + photoW, y - 2); ctx.lineTo(x + photoW, y)
          ctx.stroke()
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
  }, [photoCount, currentPage, layout, borderThickness, bgColor, photoList, marginX, marginY, gutterX, gutterY, includeCropMarks])

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
    const mX = mmToPx(marginX)
    const mY = mmToPx(marginY)
    const gX = mmToPx(gutterX)
    const gY = mmToPx(gutterY)

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
        const x = mX + col * (photoW + gX)
        const y = mY + row * (photoH + gY)

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

    setRecentSheets(prev => [
      { id: String(Date.now()), name: fileName, pages: totalPages, count: photoCount, date: 'Just now', format: 'A4 (300 DPI)', status: 'Generated' },
      ...prev
    ])

    if (user) {
      try {
        await supabase.from('sheets').insert({ user_id: user.id, photo_count: photoCount, bg_color: bgColor, file_name: fileName })
        await supabase.from('activity_logs').insert({ user_id: user.id, action: 'sheet_generated', description: `Downloaded PDF (${totalPages} pages)`, file_name: fileName })
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

  const tabs: SheetTab[] = ['Sheet Generator', 'Layout & Margins', 'Export Settings', 'Recent Sheets']

  const creatorTools = [
    { label: 'My Photos', href: '/photos', icon: ImageIcon, color: '#10b981', desc: 'Background removal & editor' },
    { label: 'Create Sheet', href: '/create-sheet', icon: Grid2x2, color: '#3b82f6', desc: 'Passport & stamp photo sheets', current: true },
    { label: 'PVC Card', href: '/pvc-card', icon: CreditCard, color: '#8b5cf6', desc: 'Custom badge & ID PVC cards' },
    { label: 'PDF Converter', href: '/pdf-converter', icon: FileText, color: '#f59e0b', desc: 'Convert image & doc to PDF' },
    { label: 'PDF Crop', href: '/crop', icon: Scissors, color: '#ec4899', desc: 'Multi-page cropping tool' },
    { label: 'Token Enter', href: '/token/create', icon: Coins, color: '#06b6d4', desc: 'Claim vouchers & credits' },
  ]

  return (
    <DashboardLayout>
      <FeatureLock featureName="Create Sheet">
        <div style={{ maxWidth: 1120, paddingBottom: 60 }}>

          {/* ─── Breadcrumb & Top Action Row ─── */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5 }}>
              <span style={{ color: 'var(--text-muted)', cursor: 'pointer' }} onClick={() => router.push('/dashboard')}>Dashboard</span>
              <span style={{ color: 'var(--text-muted)' }}>&gt;</span>
              <span style={{ color: '#10b981', fontWeight: 600 }}>Create Sheet</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                onClick={handleDownloadPDF}
                disabled={generating}
                style={{
                  background: '#10b981', color: '#ffffff', border: 'none', borderRadius: 8,
                  padding: '8px 18px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)', opacity: generating ? 0.7 : 1
                }}
              >
                <Download size={15} /> {generating ? 'Exporting PDF...' : 'Download PDF'}
              </button>

              <button
                onClick={handlePrint}
                style={{
                  background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)',
                  borderRadius: 8, padding: '8px 14px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 6
                }}
              >
                <Printer size={15} /> Print
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
                background: 'rgba(59, 130, 246, 0.12)', color: '#3b82f6',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <Grid2x2 size={24} />
              </div>
              <div>
                <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 4px 0', letterSpacing: '-0.5px' }}>
                  Create Sheet Studio
                </h1>
                <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>
                  Produce high-resolution 42-photo A4 sheets with automated crop marks, standard borders, and instant PDF/JPG export.
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
                { label: 'Photos / Sheet', value: '42 Photos', color: '#3b82f6' },
                { label: 'Grid Formation', value: '6 × 7 Matrix', color: '#10b981' },
                { label: 'Standard Dimensions', value: '3.5 × 4.5 cm', color: '#8b5cf6' },
                { label: 'Sheet Canvas', value: `${paperFormat} 300 DPI`, color: '#f59e0b' },
                { label: 'Total Pages', value: `${totalPages} Page${totalPages > 1 ? 's' : ''}`, color: '#ec4899' },
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

          {/* ─── TAB 1: SHEET GENERATOR ─── */}
          {activeTab === 'Sheet Generator' && (
            <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 24, alignItems: 'start' }}>
              {/* Left Control Panel */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Configuration Card */}
                <div className="card" style={{ borderRadius: 16, padding: '22px 24px', background: 'var(--bg-card)' }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>
                    Sheet Parameters
                  </h3>

                  {/* Photo Count Input */}
                  <div style={{ marginBottom: 18 }}>
                    <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                      Total Photo Count
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-primary)', borderRadius: 8, border: '1px solid var(--border)', overflow: 'hidden' }}>
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
                        style={{ border: 'none', background: 'transparent', flex: 1, padding: '10px 14px', fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', outline: 'none' }}
                      />
                      <span style={{ padding: '0 14px', color: 'var(--text-muted)', fontSize: 13, fontWeight: 600 }}>Photos</span>
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4 }}>
                      42 photos per A4 page • Currently {totalPages} page{totalPages > 1 ? 's' : ''}
                    </div>
                  </div>

                  {/* Border Thickness */}
                  <div style={{ marginBottom: 18 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)', margin: 0 }}>
                        Cut Border Stroke
                      </label>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)' }}>{borderThickness} px</span>
                    </div>
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

                  {/* Background Color Swatches */}
                  <div>
                    <label style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>
                      Background Fill (All Slots)
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8, marginBottom: 12 }}>
                      {PRESET_COLORS.map((c) => (
                        <button
                          key={c.value}
                          title={c.label}
                          onClick={() => { setBgColor(c.value); if (c.value !== 'transparent') setCustomColor(c.value) }}
                          style={{
                            width: '100%', aspectRatio: '1', borderRadius: '50%',
                            background: c.value === 'transparent' ? 'repeating-conic-gradient(#ccc 0% 25%, white 0% 50%) 0 0 / 8px 8px' : c.value,
                            border: bgColor === c.value ? '3px solid #10b981' : '1px solid var(--border)',
                            cursor: 'pointer', transition: 'transform 0.15s ease',
                            transform: bgColor === c.value ? 'scale(1.15)' : 'scale(1)'
                          }}
                        />
                      ))}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <input
                        type="color"
                        value={customColor}
                        onChange={(e) => { setCustomColor(e.target.value); setBgColor(e.target.value) }}
                        style={{ width: 34, height: 34, borderRadius: 6, border: '1px solid var(--border)', cursor: 'pointer', padding: 2, background: 'var(--bg-card)' }}
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
                          borderRadius: 8, padding: '6px 12px', color: 'var(--text-primary)',
                          fontSize: 12.5, fontFamily: 'monospace', outline: 'none'
                        }}
                        placeholder="#ffffff"
                      />
                    </div>
                  </div>
                </div>

                {/* Upload Photos to Grid */}
                <div className="card" style={{ borderRadius: 16, padding: '22px 24px', background: 'var(--bg-card)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                      Source Portrait Photos
                    </h3>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#3b82f6' }}>
                      {photoList.length} Uploaded
                    </span>
                  </div>

                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: '1px dashed var(--border)', borderRadius: 10, padding: 16,
                      textAlign: 'center', cursor: 'pointer', background: 'var(--bg-primary)',
                      marginBottom: 14
                    }}
                  >
                    <Upload size={20} color="#10b981" style={{ margin: '0 auto 6px' }} />
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Click to upload photos</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Auto-cycles across all 42 grid cells</div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleAddPhotos}
                      style={{ display: 'none' }}
                    />
                  </div>

                  {photoList.length > 0 && (
                    <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                      {photoList.map((src, idx) => (
                        <div key={idx} style={{ position: 'relative', width: 44, height: 56, flexShrink: 0, borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border)' }}>
                          <img src={src} alt={`Source ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <button
                            onClick={(e) => { e.stopPropagation(); removePhoto(idx) }}
                            style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.65)', border: 'none', borderRadius: '50%', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer', padding: 0 }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Canvas Sheet Stage */}
              <div className="card" style={{ borderRadius: 16, padding: '24px 26px', background: 'var(--bg-card)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }} />
                    <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                      Interactive A4 Sheet Canvas
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={includeCropMarks}
                        onChange={(e) => setIncludeCropMarks(e.target.checked)}
                        style={{ accentColor: '#10b981' }}
                      />
                      Crop Marks
                    </label>
                    <button
                      onClick={handleDownloadImage}
                      style={{
                        background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 6,
                        padding: '5px 10px', fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer'
                      }}
                    >
                      Export JPG
                    </button>
                  </div>
                </div>

                {/* Canvas Container */}
                <div style={{
                  background: '#1e2330', borderRadius: 12, padding: 18, border: '1px solid var(--border)',
                  display: 'flex', justifyContent: 'center', overflow: 'hidden'
                }}>
                  <canvas
                    ref={canvasRef}
                    style={{
                      maxWidth: '100%', height: 'auto',
                      maxHeight: 560, border: '1px solid #ffffff22',
                      borderRadius: 4, display: 'block', background: 'white',
                      boxShadow: '0 8px 30px rgba(0,0,0,0.35)'
                    }}
                  />
                </div>

                {/* Pagination Controls */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  marginTop: 16, padding: '12px 18px', background: 'var(--bg-primary)',
                  borderRadius: 10, border: '1px solid var(--border)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      style={{ padding: '4px 12px', fontSize: 12.5 }}
                    >
                      ← Previous
                    </button>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      style={{ padding: '4px 12px', fontSize: 12.5 }}
                    >
                      Next →
                    </button>
                  </div>

                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      onClick={handleDownloadPDF}
                      style={{
                        background: '#10b981', color: '#fff', border: 'none', borderRadius: 8,
                        padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                        display: 'inline-flex', alignItems: 'center', gap: 6
                      }}
                    >
                      <Download size={14} /> Download PDF
                    </button>
                    <button
                      onClick={handlePrint}
                      style={{
                        background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)',
                        borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                        display: 'inline-flex', alignItems: 'center', gap: 6
                      }}
                    >
                      <Printer size={14} /> Print
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─── TAB 2: LAYOUT & MARGINS ─── */}
          {activeTab === 'Layout & Margins' && (
            <div className="card" style={{ borderRadius: 16, padding: '24px 28px', background: 'var(--bg-card)' }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                Precision Spacing & Page Margins
              </h3>
              <p style={{ fontSize: 13.5, color: 'var(--text-muted)', marginBottom: 24 }}>
                Calibrate page boundaries for specialized photo papers and borderless printers.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 20, background: 'var(--bg-primary)' }}>
                  <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>
                    Margin Boundaries (mm)
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)' }}>Horizontal Margin (Left/Right)</span>
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: '#3b82f6' }}>{marginX} mm</span>
                      </div>
                      <input type="range" className="slider" min={2} max={25} value={marginX} onChange={(e) => setMarginX(Number(e.target.value))} />
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)' }}>Vertical Margin (Top/Bottom)</span>
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: '#3b82f6' }}>{marginY} mm</span>
                      </div>
                      <input type="range" className="slider" min={2} max={25} value={marginY} onChange={(e) => setMarginY(Number(e.target.value))} />
                    </div>
                  </div>
                </div>

                <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 20, background: 'var(--bg-primary)' }}>
                  <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>
                    Gutter Gap Between Photos (mm)
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)' }}>Column Gutter (X Gap)</span>
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: '#10b981' }}>{gutterX} mm</span>
                      </div>
                      <input type="range" className="slider" min={0} max={10} step={0.5} value={gutterX} onChange={(e) => setGutterX(Number(e.target.value))} />
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)' }}>Row Gutter (Y Gap)</span>
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: '#10b981' }}>{gutterY} mm</span>
                      </div>
                      <input type="range" className="slider" min={0} max={10} step={0.5} value={gutterY} onChange={(e) => setGutterY(Number(e.target.value))} />
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  onClick={() => { setMarginX(MARGIN_X_MM); setMarginY(MARGIN_Y_MM); setGutterX(GUTTER_X_MM); setGutterY(GUTTER_Y_MM) }}
                  className="btn btn-secondary btn-sm"
                >
                  Reset Defaults
                </button>
                <button
                  onClick={() => setActiveTab('Sheet Generator')}
                  style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                >
                  Apply & Preview
                </button>
              </div>
            </div>
          )}

          {/* ─── TAB 3: EXPORT SETTINGS ─── */}
          {activeTab === 'Export Settings' && (
            <div className="card" style={{ borderRadius: 16, padding: '24px 28px', background: 'var(--bg-card)' }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                Print Quality & Paper Profiles
              </h3>
              <p style={{ fontSize: 13.5, color: 'var(--text-muted)', marginBottom: 24 }}>
                Configure rendering resolution, printer paper types, and output compression.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 }}>
                {[
                  { name: 'A4 International Standard', size: '210 × 297 mm', desc: 'Standard office & studio inkjet/laser printer sheet', id: 'A4' },
                  { name: 'US Letter Paper', size: '215.9 × 279.4 mm (8.5 × 11 in)', desc: 'North American standard copy paper format', id: 'Letter' },
                  { name: '4 × 6 Inch Photo Paper', size: '101.6 × 152.4 mm (4 × 6 in)', desc: 'Glossy compact kiosk & dye-sublimation printer paper', id: '4x6' },
                ].map(paper => (
                  <div
                    key={paper.id}
                    onClick={() => setPaperFormat(paper.id as any)}
                    style={{
                      border: paperFormat === paper.id ? '2px solid #10b981' : '1px solid var(--border)',
                      borderRadius: 12, padding: 18, cursor: 'pointer',
                      background: 'var(--bg-primary)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text-primary)' }}>{paper.name}</span>
                      {paperFormat === paper.id && <Check size={16} color="#10b981" />}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#3b82f6', marginBottom: 6 }}>{paper.size}</div>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>{paper.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── TAB 4: RECENT SHEETS ─── */}
          {activeTab === 'Recent Sheets' && (
            <div className="card" style={{ borderRadius: 16, padding: '24px 28px', background: 'var(--bg-card)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                  <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                    Recent Sheet History
                  </h3>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                    Sheets generated and exported during your active session
                  </p>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <th style={{ padding: '12px 14px', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>File Name</th>
                      <th style={{ padding: '12px 14px', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Photos</th>
                      <th style={{ padding: '12px 14px', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Format</th>
                      <th style={{ padding: '12px 14px', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Timestamp</th>
                      <th style={{ padding: '12px 14px', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Status</th>
                      <th style={{ padding: '12px 14px', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentSheets.map(s => (
                      <tr key={s.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '14px', fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <FileText size={16} color="#3b82f6" />
                            {s.name}
                          </div>
                        </td>
                        <td style={{ padding: '14px', fontSize: 13, color: 'var(--text-secondary)' }}>{s.count} Photos ({s.pages} page)</td>
                        <td style={{ padding: '14px', fontSize: 13, color: 'var(--text-secondary)' }}>{s.format}</td>
                        <td style={{ padding: '14px', fontSize: 13, color: 'var(--text-secondary)' }}>{s.date}</td>
                        <td style={{ padding: '14px' }}>
                          <span style={{
                            padding: '3px 10px', borderRadius: 9999, fontSize: 11.5, fontWeight: 700,
                            background: 'rgba(16,185,129,0.12)', color: '#10b981'
                          }}>
                            {s.status}
                          </span>
                        </td>
                        <td style={{ padding: '14px', textAlign: 'right' }}>
                          <button
                            onClick={handleDownloadPDF}
                            style={{ background: 'none', border: 'none', color: '#10b981', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginRight: 12 }}
                          >
                            Re-download
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
