'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import FeatureLock from '@/components/FeatureLock'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import {
  Upload, X, CheckCircle, RefreshCw, HardDrive, Palette, Download,
  ChevronRight, Image as ImageIcon, Grid2x2, CreditCard, FileText,
  Scissors, Coins, Settings, User, Sparkles, Check, Trash2, Eye,
  Sliders, Layers, ExternalLink, HelpCircle, Shirt, Clipboard, Zap,
  Shield, Maximize2, PenTool
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import BeforeAfterSlider from '@/components/BeforeAfterSlider'
import { GARMENTS, GARMENT_COLORS, getGarmentDataUrl, loadImage, GarmentType } from '@/lib/garments'

// Preset colors: transparent (none), white, popular passport BG colors, and extras
const PRESET_COLORS = [
  { label: 'Transparent', value: 'transparent', style: { background: 'repeating-conic-gradient(#ccc 0% 25%, white 0% 50%) 0 0 / 16px 16px' } },
  { label: 'White (Standard)', value: '#ffffff' },
  { label: 'Off-White', value: '#f9fafb' },
  { label: 'Light Gray', value: '#f0f0f0' },
  { label: 'Embassy Blue', value: '#c9daf8' },
  { label: 'Sky Blue', value: '#56acf2' },
  { label: 'Passport Red', value: '#e03030' },
  { label: 'Soft Crimson', value: '#f4a7a7' },
  { label: 'Deep Blue', value: '#1a56db' },
  { label: 'Navy Blue', value: '#1e3a5f' },
  { label: 'Emerald Green', value: '#34d399' },
  { label: 'Light Yellow', value: '#fde68a' },
  { label: 'Warm Cream', value: '#fffde7' },
  { label: 'Soft Pink', value: '#fce7f3' },
  { label: 'Pastel Purple', value: '#ddd6fe' },
  { label: 'Amber Orange', value: '#fed7aa' },
  { label: 'Teal Mint', value: '#99f6e4' },
  { label: 'Studio Black', value: '#000000' },
]

type PhotosTab = 'Studio Editor' | 'Background Colors' | 'Photo Library' | 'Preset Dimensions'

export default function PhotosPage() {
  const { user, storageUsage } = useAuth()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [activeTab, setActiveTab] = useState<PhotosTab>('Studio Editor')
  const [removeBgModule, setRemoveBgModule] = useState<null | { removeBackground: typeof import('@imgly/background-removal')['removeBackground'] }>(null)

  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [originalImage, setOriginalImage] = useState<string | null>(null)
  const [processedImage, setProcessedImage] = useState<string | null>(null) // transparent PNG blob URL
  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null)
  const [processedDataUrl, setProcessedDataUrl] = useState<string | null>(null)
  const [compositeImage, setCompositeImage] = useState<string | null>(null)
  const [bgColor, setBgColor] = useState('#ffffff')
  const [customColor, setCustomColor] = useState('#ffffff')
  const [error, setError] = useState('')
  const [fileName, setFileName] = useState('')

  // Clothing Studio (garment overlay)
  const [garment, setGarment] = useState<GarmentType | null>(null)
  const [garmentColor, setGarmentColor] = useState('#2563eb')
  const [garmentSize, setGarmentSize] = useState(78)   // % of photo width
  const [garmentY, setGarmentY] = useState(62)         // garment center, % of photo height
  const [garmentOpacity, setGarmentOpacity] = useState(100)

  // Export & Quality
  const [clarity, setClarity] = useState(true)
  const [resolution, setResolution] = useState<'original' | 'hd' | '2k' | '4k'>('hd')
  const [exporting, setExporting] = useState(false)
  const [compareMode, setCompareMode] = useState(true)

  // Library table data (matches Settings/Profile list tables)
  const [recentPhotos, setRecentPhotos] = useState([
    { id: '1', name: 'passport_headshot_rahul.png', size: '1.4 MB', dimensions: '600x800 px', date: 'Just now', bg: 'White (#ffffff)', status: 'Ready' },
    { id: '2', name: 'visa_photo_transparent.png', size: '2.1 MB', dimensions: '800x1000 px', date: 'Yesterday', bg: 'Transparent', status: 'Ready' },
    { id: '3', name: 'id_card_portrait_studio.png', size: '1.8 MB', dimensions: '640x960 px', date: 'Sep 05, 2026', bg: 'Sky Blue (#56acf2)', status: 'Ready' },
    { id: '4', name: 'pan_card_photo_cropped.png', size: '920 KB', dimensions: '500x700 px', date: 'Sep 02, 2026', bg: 'White (#ffffff)', status: 'Ready' },
  ])

  // Prefetch background-removal library on page mount
  useEffect(() => {
    let active = true
    import('@imgly/background-removal')
      .then((mod) => {
        if (active) setRemoveBgModule({ removeBackground: mod.removeBackground })
      })
      .catch((err) => {
        console.warn('Background removal preload failed:', err)
      })
    return () => { active = false }
  }, [])

  const getRemoveBackground = async () => {
    if (removeBgModule) return removeBgModule.removeBackground
    const mod = await import('@imgly/background-removal')
    setRemoveBgModule({ removeBackground: mod.removeBackground })
    return mod.removeBackground
  }

  // When a new blob arrives, convert it to base64 data URL
  useEffect(() => {
    if (!processedBlob) { setProcessedDataUrl(null); return }
    const reader = new FileReader()
    reader.onloadend = () => setProcessedDataUrl(reader.result as string)
    reader.readAsDataURL(processedBlob)
  }, [processedBlob])

  // Re-composite whenever processedDataUrl, bgColor or garment settings change
  useEffect(() => {
    if (!processedDataUrl) { setCompositeImage(null); return }

    let cancelled = false
    ;(async () => {
      const img = await loadImage(processedDataUrl)
      if (cancelled) return

      const canvas = canvasRef.current
      if (!canvas) return
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')!
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      if (bgColor !== 'transparent') {
        ctx.fillStyle = bgColor
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }

      ctx.drawImage(img, 0, 0)

      // Garment overlay (auto-centered on upper body, adjustable)
      if (garment) {
        const gImg = await loadImage(getGarmentDataUrl(garment, garmentColor))
        if (cancelled) return
        const w = img.naturalWidth * (garmentSize / 100)
        const h = w // garment SVG viewBox is square
        const x = img.naturalWidth * 0.5 - w / 2
        const y = img.naturalHeight * (garmentY / 100) - h / 2
        ctx.globalAlpha = garmentOpacity / 100
        ctx.drawImage(gImg, x, y, w, h)
        ctx.globalAlpha = 1
      }

      setCompositeImage(canvas.toDataURL('image/png'))
    })()

    return () => { cancelled = true }
  }, [processedDataUrl, bgColor, garment, garmentColor, garmentSize, garmentY, garmentOpacity])

  const processFile = async (file: File) => {
    setError('')
    setFileName(file.name)

    const objectUrl = URL.createObjectURL(file)
    setOriginalImage(objectUrl)
    setProcessedImage(null)
    setProcessedBlob(null)
    setCompositeImage(null)
    setProcessing(true)

    try {
      const removeBackground = await getRemoveBackground()
      const blob = await removeBackground(file, {
        progress: (key: string, current: number, total: number) => {
          console.log(`[bg-removal] ${key}: ${current}/${total}`)
        }
      })

      const blobUrl = URL.createObjectURL(blob)
      setProcessedImage(blobUrl)
      setProcessedBlob(blob)

      // Add to recent photos
      setRecentPhotos(prev => [
        {
          id: String(Date.now()),
          name: file.name,
          size: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
          dimensions: 'Auto HQ',
          date: 'Just now',
          bg: bgColor === 'transparent' ? 'Transparent' : bgColor,
          status: 'Ready'
        },
        ...prev
      ])

      // Auto-upload to Supabase storage if user is logged in
      if (user) {
        setUploading(true)
        const fileExt = 'png'
        const filePath = `${user.id}/${Date.now()}_nobg.${fileExt}`
        const { error: uploadError } = await supabase.storage
          .from('photos')
          .upload(filePath, blob, { contentType: 'image/png', upsert: false })

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('photos')
            .getPublicUrl(filePath)

          await supabase.from('photos').insert({
            user_id: user.id,
            original_url: objectUrl,
            processed_url: publicUrl,
            file_name: file.name,
            file_size: blob.size,
          })

          await supabase.from('activity_logs').insert({
            user_id: user.id,
            action: 'bg_removed',
            description: `Background removed from ${file.name}`,
            file_name: file.name
          })

          const { data: profileData } = await supabase
            .from('profiles')
            .select('storage_used')
            .eq('id', user.id)
            .single()

          if (profileData) {
            await supabase.from('profiles').update({
              storage_used: (profileData.storage_used || 0) + blob.size
            }).eq('id', user.id)
          }
        }
        setUploading(false)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Background removal failed. Please try again.'
      setError(msg)
    }

    setProcessing(false)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [user])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  const handleCreateSheet = () => {
    if (processedDataUrl) {
      localStorage.setItem('processedPhotoUrl', processedDataUrl)
      router.push('/create-sheet')
    }
  }

  // ─── Export pipeline: resolution tiers + AI clarity enhancement ───
  const EXPORT_TIERS: Record<'original' | 'hd' | '2k' | '4k', { label: string; target: number }> = {
    original: { label: 'Original', target: 0 },
    hd: { label: 'HD · 1280px', target: 1280 },
    '2k': { label: '2K · 2560px', target: 2560 },
    '4k': { label: '4K · 3840px', target: 3840 },
  }

  // 3x3 unsharp-mask convolution: boosts local contrast for a sharper, clearer output
  const applyClaritySharpen = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const src = ctx.getImageData(0, 0, w, h)
    const out = ctx.createImageData(w, h)
    const s = src.data
    const d = out.data
    for (let y = 0; y < h; y++) {
      const yUp = (y > 0 ? y - 1 : 0) * w
      const yDn = (y < h - 1 ? y + 1 : h - 1) * w
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4
        const iUp = (yUp + x) * 4
        const iDn = (yDn + x) * 4
        const iL = (y * w + (x > 0 ? x - 1 : 0)) * 4
        const iR = (y * w + (x < w - 1 ? x + 1 : w - 1)) * 4
        d[i + 3] = s[i + 3]
        for (let c = 0; c < 3; c++) {
          // kernel [0,-1,0;-1,5,-1;0,-1,0], blended 65% with the original for a natural look
          const v = 5 * s[i + c] - (s[iUp + c] + s[iDn + c] + s[iL + c] + s[iR + c])
          d[i + c] = Math.max(0, Math.min(255, 0.65 * v + 0.35 * s[i + c]))
        }
      }
    }
    ctx.putImageData(out, 0, 0)
  }

  const buildExportCanvas = async (): Promise<HTMLCanvasElement | null> => {
    if (!compositeImage) return null
    const img = await loadImage(compositeImage)
    const tier = EXPORT_TIERS[resolution]
    const longest = Math.max(img.naturalWidth, img.naturalHeight)
    const scale = tier.target > 0 ? tier.target / longest : 1
    const w = Math.max(1, Math.round(img.naturalWidth * scale))
    const h = Math.max(1, Math.round(img.naturalHeight * scale))

    const out = document.createElement('canvas')
    out.width = w
    out.height = h
    const ctx = out.getContext('2d')
    if (!ctx) return null
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    if (clarity) ctx.filter = 'contrast(103%) saturate(106%)'
    ctx.drawImage(img, 0, 0, w, h)
    ctx.filter = 'none'
    if (clarity) applyClaritySharpen(ctx, w, h)
    return out
  }

  const handleDownload = async () => {
    if (exporting || !compositeImage) return
    setExporting(true)
    try {
      const canvas = await buildExportCanvas()
      if (!canvas) return
      const tierLabel = EXPORT_TIERS[resolution].label.split(' ')[0].toLowerCase()
      const a = document.createElement('a')
      a.href = canvas.toDataURL('image/png')
      a.download = `urlm_${tierLabel}_${bgColor === 'transparent' ? 'transparent' : bgColor.replace('#', '')}_${fileName || 'photo'}.png`
      a.click()

      if (user) {
        await supabase.from('activity_logs').insert({
          user_id: user.id,
          action: 'photo_exported',
          description: `Exported ${fileName || 'photo'} at ${EXPORT_TIERS[resolution].label}${clarity ? ' with AI clarity' : ''}`,
          file_name: fileName || 'photo'
        })
      }
    } finally {
      setExporting(false)
    }
  }

  const tabs: PhotosTab[] = ['Studio Editor', 'Background Colors', 'Photo Library', 'Preset Dimensions']

  const creatorTools = [
    { label: 'My Photos', href: '/photos', icon: ImageIcon, color: '#10b981', desc: 'Background removal & editor', current: true },
    { label: 'Create Sheet', href: '/create-sheet', icon: Grid2x2, color: '#3b82f6', desc: 'Passport & stamp photo sheets' },
    { label: 'PVC Card', href: '/pvc-card', icon: CreditCard, color: '#8b5cf6', desc: 'Custom badge & ID PVC cards' },
    { label: 'PDF Converter', href: '/pdf-converter', icon: FileText, color: '#f59e0b', desc: 'Convert image & doc to PDF' },
    { label: 'PDF Crop', href: '/crop', icon: Scissors, color: '#ec4899', desc: 'Multi-page cropping tool' },
    { label: 'Token Enter', href: '/token/create', icon: Coins, color: '#06b6d4', desc: 'Claim vouchers & credits' },
  ]

  const passportPresets = [
    { name: 'Indian Passport', width: '35 mm', height: '45 mm', desc: 'Standard passport & police clearance photo with white background', bg: 'White' },
    { name: 'US Visa / Passport', width: '51 mm (2x2")', height: '51 mm (2x2")', desc: 'Square passport & visa submission format for US DS-160', bg: 'White / Off-white' },
    { name: 'Schengen Visa', width: '35 mm', height: '45 mm', desc: 'EU Schengen tourist and work permit compliant portrait', bg: 'Light Gray / White' },
    { name: 'PAN Card (India)', width: '25 mm', height: '35 mm', desc: 'NSDL & UTIITSL standard identity document size', bg: 'White' },
    { name: 'Stamp Size', width: '25 mm', height: '30 mm', desc: 'College admissions, bank applications, and transit cards', bg: 'Any background' },
    { name: 'OCI Card Photo', width: '51 mm', height: '51 mm', desc: 'Overseas Citizenship of India registration specifications', bg: 'Light plain color' },
  ]

  return (
    <DashboardLayout>
      <FeatureLock featureName="My Photos">
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        <div style={{ maxWidth: 1120, paddingBottom: 60 }}>

          {/* ─── Breadcrumb & Top Action Row (Matches Settings/Profile) ─── */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5 }}>
              <span style={{ color: 'var(--text-muted)', cursor: 'pointer' }} onClick={() => router.push('/dashboard')}>Dashboard</span>
              <span style={{ color: 'var(--text-muted)' }}>&gt;</span>
              <span style={{ color: '#10b981', fontWeight: 600 }}>My Photos Studio</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {compositeImage && (
                <button
                  onClick={handleDownload}
                  style={{
                    background: '#10b981', color: '#ffffff', border: 'none', borderRadius: 8,
                    padding: '8px 18px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)', transition: 'all 0.15s ease'
                  }}
                >
                  <Download size={15} /> Download {EXPORT_TIERS[resolution].label.split(' ')[0]} PNG
                </button>
              )}

              {compositeImage && (
                <button
                  onClick={handleCreateSheet}
                  style={{
                    background: 'var(--bg-card)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.3)',
                    borderRadius: 8, padding: '8px 16px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: 6
                  }}
                >
                  <Grid2x2 size={15} /> Create Sheet
                </button>
              )}

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

          {/* ─── Page Title Header (Exact Settings/Profile style) ─── */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 14,
                background: 'rgba(16, 185, 129, 0.12)', color: '#10b981',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <ImageIcon size={24} />
              </div>
              <div>
                <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 4px 0', letterSpacing: '-0.5px' }}>
                  My Photos Studio
                </h1>
                <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>
                  Upload photos, remove background using AI, apply official passport colors, and manage photo assets.
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
                { label: 'Storage Used', value: `${storageUsage.percent}%`, color: '#10b981' },
                { label: 'AI Engine', value: 'Neural On-Device', color: '#3b82f6' },
                { label: 'Active Color', value: bgColor === 'transparent' ? 'Transparent' : bgColor.toUpperCase(), color: '#8b5cf6' },
                { label: 'Export DPI', value: `${EXPORT_TIERS[resolution].label.split(' ')[0]}${clarity ? ' + AI Clarity' : ''}`, color: '#f59e0b' },
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

          {/* ─── Horizontal Navigation Tabs (Exact Settings/Profile Match) ─── */}
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

          {error && (
            <div className="alert alert-error" style={{ marginBottom: 20 }}>
              <X size={16} /> {error}
            </div>
          )}

          {/* ─── TAB 1: STUDIO EDITOR ─── */}
          {activeTab === 'Studio Editor' && (
            <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 24, alignItems: 'start' }}>
              {/* Left Column Controls */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Upload Card */}
                <div className="card" style={{ borderRadius: 16, padding: '22px 24px', background: 'var(--bg-card)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                      1. Upload Portrait
                    </h3>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 9999,
                      color: '#10b981', background: 'rgba(16,185,129,0.12)'
                    }}>
                      AI Auto-Cut
                    </span>
                  </div>

                  <div
                    id="upload-zone"
                    className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    style={{ padding: '28px 16px', borderRadius: 12 }}
                  >
                    <div className="upload-icon" style={{ width: 44, height: 44, margin: '0 auto 12px' }}>
                      <Upload size={22} />
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                      Drag & Drop photo
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginBottom: 16 }}>
                      Supports JPG, PNG, WEBP (Up to 10MB)
                    </div>
                    <button
                      id="select-files-btn"
                      className="btn btn-secondary btn-sm"
                      onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}
                    >
                      Browse Device
                    </button>
                    <input
                      id="file-input"
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleFileChange}
                      style={{ display: 'none' }}
                    />
                  </div>
                </div>

                {/* Background Quick Swatches */}
                <div className="card" style={{ borderRadius: 16, padding: '22px 24px', background: 'var(--bg-card)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Palette size={16} color="#8b5cf6" />
                      <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                        2. Backdrop Color
                      </h3>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>
                      {bgColor === 'transparent' ? 'Transparent' : bgColor}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8, marginBottom: 16 }}>
                    {PRESET_COLORS.slice(0, 12).map((c) => (
                      <button
                        key={c.value}
                        title={c.label}
                        onClick={() => { setBgColor(c.value); if (c.value !== 'transparent') setCustomColor(c.value) }}
                        style={{
                          width: '100%', aspectRatio: '1', borderRadius: 8,
                          border: bgColor === c.value ? '3px solid #10b981' : '1px solid var(--border)',
                          cursor: 'pointer',
                          ...(c.style ?? { background: c.value }),
                          transition: 'transform 0.15s, border-color 0.15s',
                          transform: bgColor === c.value ? 'scale(1.1)' : 'scale(1)',
                          boxShadow: bgColor === c.value ? '0 0 0 2px #10b981' : 'none',
                        }}
                      />
                    ))}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input
                      type="color"
                      id="custom-color-picker"
                      value={customColor}
                      onChange={(e) => { setCustomColor(e.target.value); setBgColor(e.target.value) }}
                      style={{ width: 38, height: 38, borderRadius: 8, border: '1px solid var(--border)', cursor: 'pointer', padding: 2, background: 'var(--bg-card)' }}
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
                        borderRadius: 8, padding: '7px 12px', color: 'var(--text-primary)',
                        fontSize: 13, fontFamily: 'monospace', outline: 'none'
                      }}
                      placeholder="#ffffff"
                    />
                  </div>
                </div>

                {/* Clothing Studio (garment overlay) */}
                <div className="card" style={{ borderRadius: 16, padding: '22px 24px', background: 'var(--bg-card)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Shirt size={16} color="#f59e0b" />
                      <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                        3. Clothing Studio
                      </h3>
                    </div>
                    {garment && (
                      <button
                        onClick={() => setGarment(null)}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer', padding: '3px 8px',
                          fontSize: 11.5, fontWeight: 700, color: '#ef4444', borderRadius: 6
                        }}
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  {/* Garment type picker */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
                    {GARMENTS.map(g => {
                      const selected = garment === g.type
                      return (
                        <button
                          key={g.type}
                          onClick={() => setGarment(g.type)}
                          title={`${g.label} — ${g.desc}`}
                          style={{
                            border: selected ? '2px solid #f59e0b' : '1px solid var(--border)',
                            borderRadius: 10, padding: '8px 6px', cursor: 'pointer',
                            background: selected ? 'rgba(245,158,11,0.08)' : 'var(--bg-primary)',
                            boxShadow: selected ? '0 0 0 2px rgba(245,158,11,0.25)' : 'none',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={getGarmentDataUrl(g.type, selected ? garmentColor : '#94a3b8')}
                            alt={g.label}
                            style={{ width: '100%', height: 46, objectFit: 'contain', display: 'block', marginBottom: 4 }}
                          />
                          <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {g.label}
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {g.desc}
                          </div>
                        </button>
                      )
                    })}
                  </div>

                  {/* Garment color */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 6, marginBottom: 10 }}>
                    {GARMENT_COLORS.map(c => (
                      <button
                        key={c.value}
                        title={c.label}
                        onClick={() => setGarmentColor(c.value)}
                        style={{
                          width: '100%', aspectRatio: '1', borderRadius: 6, background: c.value,
                          border: garmentColor === c.value ? '2.5px solid #f59e0b' : '1px solid var(--border)',
                          boxShadow: garmentColor === c.value ? '0 0 0 2px rgba(245,158,11,0.3)' : 'none',
                          cursor: 'pointer', transition: 'transform 0.15s',
                          transform: garmentColor === c.value ? 'scale(1.12)' : 'scale(1)'
                        }}
                      />
                    ))}
                  </div>

                  {/* Auto-fit sliders */}
                  {garment && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {[
                        { label: 'Fit Size', value: garmentSize, set: setGarmentSize, min: 40, max: 120, suffix: '%' },
                        { label: 'Body Position', value: garmentY, set: setGarmentY, min: 20, max: 95, suffix: '%' },
                        { label: 'Blend Opacity', value: garmentOpacity, set: setGarmentOpacity, min: 20, max: 100, suffix: '%' },
                      ].map(row => (
                        <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-secondary)', minWidth: 86 }}>{row.label}</span>
                          <input
                            type="range" min={row.min} max={row.max} value={row.value}
                            onChange={(e) => row.set(parseInt(e.target.value))}
                            style={{ flex: 1, accentColor: '#f59e0b' }}
                          />
                          <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 34, textAlign: 'right' }}>
                            {row.value}{row.suffix}
                          </span>
                        </div>
                      ))}
                      <p style={{ fontSize: 10.5, color: 'var(--text-muted)', margin: 0 }}>
                        Smart-fit aligns the garment to upper-body posture; fine-tune with the sliders for lighting-matched blending.
                      </p>
                    </div>
                  )}
                </div>

                {/* Export & Quality */}
                <div className="card" style={{ borderRadius: 16, padding: '22px 24px', background: 'var(--bg-card)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Zap size={16} color="#3b82f6" />
                      <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                        4. Export & Quality
                      </h3>
                    </div>
                  </div>

                  {/* AI clarity toggle */}
                  <div
                    onClick={() => setClarity(!clarity)}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '10px 12px', borderRadius: 10, marginBottom: 12, cursor: 'pointer',
                      background: clarity ? 'rgba(59,130,246,0.08)' : 'var(--bg-primary)',
                      border: clarity ? '1px solid rgba(59,130,246,0.35)' : '1px solid var(--border)'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        AI Clarity Enhance {clarity && <Sparkles size={12} color="#3b82f6" />}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Sharpening + noise reduction</div>
                    </div>
                    <div style={{
                      width: 38, height: 21, borderRadius: 9999, position: 'relative', flexShrink: 0,
                      background: clarity ? '#3b82f6' : 'var(--border)', transition: 'background 0.15s'
                    }}>
                      <div style={{
                        position: 'absolute', top: 2.5, left: clarity ? 19 : 2.5,
                        width: 16, height: 16, borderRadius: '50%', background: '#ffffff',
                        transition: 'left 0.15s', boxShadow: '0 1px 3px rgba(0,0,0,0.25)'
                      }} />
                    </div>
                  </div>

                  {/* Resolution tiers */}
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                    Export Resolution
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 14 }}>
                    {(Object.keys(EXPORT_TIERS) as Array<keyof typeof EXPORT_TIERS>).map(key => {
                      const selected = resolution === key
                      return (
                        <button
                          key={key}
                          onClick={() => setResolution(key)}
                          style={{
                            border: selected ? '2px solid #3b82f6' : '1px solid var(--border)',
                            borderRadius: 10, padding: '9px 10px', cursor: 'pointer',
                            background: selected ? 'rgba(59,130,246,0.08)' : 'var(--bg-primary)',
                            color: selected ? '#3b82f6' : 'var(--text-secondary)',
                            fontSize: 12.5, fontWeight: selected ? 800 : 600,
                            boxShadow: selected ? '0 0 0 2px rgba(59,130,246,0.2)' : 'none'
                          }}
                        >
                          {EXPORT_TIERS[key].label}
                        </button>
                      )
                    })}
                  </div>

                  <button
                    onClick={handleDownload}
                    disabled={!compositeImage || exporting}
                    style={{
                      width: '100%', background: exporting ? 'rgba(16,185,129,0.5)' : '#10b981', color: '#ffffff',
                      border: 'none', borderRadius: 10, padding: '11px 16px', fontSize: 13.5, fontWeight: 700,
                      cursor: compositeImage && !exporting ? 'pointer' : 'not-allowed',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8
                    }}
                  >
                    {exporting ? <RefreshCw size={15} className="animate-spin" /> : <Download size={15} />}
                    {exporting ? 'Rendering…' : `Download ${EXPORT_TIERS[resolution].label.split(' ')[0]} PNG`}
                  </button>
                </div>

                {/* Storage Card */}
                <div className="card" style={{ borderRadius: 16, padding: '20px 24px', background: 'var(--bg-card)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <HardDrive size={15} /> Cloud Storage
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{storageUsage.percent}% Used</span>
                  </div>
                  <div className="progress-bar" style={{ height: 6, borderRadius: 3 }}>
                    <div className="progress-fill" style={{ width: `${storageUsage.percent}%`, background: 'linear-gradient(90deg, #10b981, #3b82f6)' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11.5, color: 'var(--text-muted)' }}>
                    <span>{(storageUsage.used / 1024 ** 3).toFixed(2)} GB used</span>
                    <span>{(storageUsage.limit / 1024 ** 3).toFixed(1)} GB limit</span>
                  </div>
                </div>
              </div>

              {/* Right Column Preview */}
              <div className="card" style={{ borderRadius: 16, padding: '24px 26px', background: 'var(--bg-card)', minHeight: 540 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 9, height: 9, borderRadius: '50%',
                      background: compositeImage ? '#10b981' : 'var(--text-muted)',
                      boxShadow: compositeImage ? '0 0 8px #10b981' : 'none'
                    }} />
                    <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                      {compositeImage ? 'Composite Preview' : 'Studio Preview Stage'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {compositeImage && originalImage && (
                      <button
                        onClick={() => setCompareMode(!compareMode)}
                        title="Toggle Before/After comparison slider"
                        style={{
                          fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 9999, cursor: 'pointer',
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          border: compareMode ? '1px solid rgba(245,158,11,0.5)' : '1px solid var(--border)',
                          background: compareMode ? 'rgba(245,158,11,0.12)' : 'var(--bg-primary)',
                          color: compareMode ? '#f59e0b' : 'var(--text-secondary)'
                        }}
                      >
                        <Maximize2 size={12} /> Compare
                      </button>
                    )}
                    <span style={{
                      fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 9999,
                      background: 'rgba(59,130,246,0.12)', color: '#3b82f6'
                    }}>
                      300 DPI
                    </span>
                    {compositeImage && (
                      <span style={{
                        fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 9999,
                        background: 'rgba(16,185,129,0.12)', color: '#10b981'
                      }}>
                        Ready
                      </span>
                    )}
                  </div>
                </div>

                {processing && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 16 }}>
                    <div className="animate-spin" style={{ width: 44, height: 44, border: '4px solid var(--border)', borderTopColor: '#10b981', borderRadius: '50%' }} />
                    <p style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 14 }}>Removing background with Neural AI...</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>Preserving hair edges and clothing details</p>
                  </div>
                )}

                {uploading && !processing && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, padding: '10px 16px', background: 'rgba(16,185,129,0.08)', borderRadius: 8 }}>
                    <RefreshCw size={14} className="animate-spin" color="#10b981" />
                    <span style={{ fontSize: 13, color: '#10b981', fontWeight: 600 }}>Saving snapshot to cloud library...</span>
                  </div>
                )}

                {!processing && compositeImage && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div style={{
                      borderRadius: 12, overflow: 'hidden',
                      background: compareMode && originalImage
                        ? 'var(--bg-primary)'
                        : bgColor === 'transparent'
                          ? 'repeating-conic-gradient(#e0e0e0 0% 25%, white 0% 50%) 0 0 / 24px 24px'
                          : bgColor,
                      border: '1px solid var(--border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: 24, minHeight: 400
                    }}>
                      {compareMode && originalImage ? (
                        <BeforeAfterSlider
                          beforeSrc={originalImage}
                          afterSrc={compositeImage}
                          beforeLabel="Before · Original"
                          afterLabel="After · Edited"
                          containerStyle={{ width: '100%', height: 440, borderRadius: 8 }}
                        />
                      ) : (
                        <img
                          src={compositeImage}
                          alt="Photo preview"
                          style={{ maxWidth: '100%', maxHeight: 440, objectFit: 'contain', borderRadius: 8, filter: 'drop-shadow(0 12px 24px rgba(0,0,0,0.15))' }}
                        />
                      )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', background: 'var(--bg-primary)', borderRadius: 12, border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <CheckCircle size={18} color="#10b981" />
                        <div>
                          <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)' }}>{fileName || 'Photo ready'}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Background: {bgColor === 'transparent' ? 'Transparent PNG' : bgColor}</div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 10 }}>
                        <button
                          onClick={handleCreateSheet}
                          style={{
                            background: '#3b82f6', color: '#ffffff', border: 'none', borderRadius: 8,
                            padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                            display: 'inline-flex', alignItems: 'center', gap: 6
                          }}
                        >
                          <Grid2x2 size={14} /> Send to Sheet
                        </button>
                        <button
                          onClick={handleDownload}
                          style={{
                            background: '#10b981', color: '#ffffff', border: 'none', borderRadius: 8,
                            padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                            display: 'inline-flex', alignItems: 'center', gap: 6
                          }}
                        >
                          <Download size={14} /> Save Photo
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {!processing && !compositeImage && !originalImage && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 14, color: 'var(--text-muted)' }}>
                    <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', border: '1px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ImageIcon size={28} strokeWidth={1.5} />
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>No photo loaded yet</div>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 320, textAlign: 'center', margin: 0 }}>
                      Drop or upload a photo in the left box to begin neural background removal.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── TAB 2: BACKGROUND COLORS ─── */}
          {activeTab === 'Background Colors' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div className="card" style={{ borderRadius: 16, padding: '24px 28px', background: 'var(--bg-card)' }}>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                  Passport & Official Identification Color Presets
                </h3>
                <p style={{ fontSize: 13.5, color: 'var(--text-muted)', marginBottom: 24 }}>
                  Different embassies and government bodies enforce strict background standards. Select a certified swatch below:
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
                  {PRESET_COLORS.map(c => {
                    const isSelected = bgColor === c.value
                    return (
                      <div
                        key={c.value}
                        onClick={() => { setBgColor(c.value); if (c.value !== 'transparent') setCustomColor(c.value); setActiveTab('Studio Editor') }}
                        style={{
                          border: isSelected ? '2px solid #10b981' : '1px solid var(--border)',
                          borderRadius: 12, padding: 14, cursor: 'pointer',
                          background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', gap: 12,
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{
                          width: 38, height: 38, borderRadius: 8, border: '1px solid var(--border)',
                          ...(c.style ?? { background: c.value }), flexShrink: 0
                        }} />
                        <div style={{ overflow: 'hidden' }}>
                          <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                            {c.label}
                          </div>
                          <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                            {c.value === 'transparent' ? 'Alpha Cutout' : c.value}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ─── TAB 3: PHOTO LIBRARY & HISTORY ─── */}
          {activeTab === 'Photo Library' && (
            <div className="card" style={{ borderRadius: 16, padding: '24px 28px', background: 'var(--bg-card)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                  <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                    Saved Photos Library
                  </h3>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                    Historical snapshots saved during your current session
                  </p>
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    background: '#10b981', color: '#fff', border: 'none', borderRadius: 8,
                    padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: 6
                  }}
                >
                  <Upload size={14} /> Add New Photo
                </button>
              </div>

              {/* Table (Matches Settings/Billings structure) */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <th style={{ padding: '12px 14px', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Photo Name</th>
                      <th style={{ padding: '12px 14px', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Resolution</th>
                      <th style={{ padding: '12px 14px', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Backdrop</th>
                      <th style={{ padding: '12px 14px', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>File Size</th>
                      <th style={{ padding: '12px 14px', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Status</th>
                      <th style={{ padding: '12px 14px', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentPhotos.map(p => (
                      <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '14px', fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <ImageIcon size={16} color="#10b981" />
                            {p.name}
                          </div>
                        </td>
                        <td style={{ padding: '14px', fontSize: 13, color: 'var(--text-secondary)' }}>{p.dimensions}</td>
                        <td style={{ padding: '14px', fontSize: 13, color: 'var(--text-secondary)' }}>{p.bg}</td>
                        <td style={{ padding: '14px', fontSize: 13, color: 'var(--text-secondary)' }}>{p.size}</td>
                        <td style={{ padding: '14px' }}>
                          <span style={{
                            padding: '3px 10px', borderRadius: 9999, fontSize: 11.5, fontWeight: 700,
                            background: 'rgba(16,185,129,0.12)', color: '#10b981'
                          }}>
                            {p.status}
                          </span>
                        </td>
                        <td style={{ padding: '14px', textAlign: 'right' }}>
                          <button
                            onClick={() => router.push('/create-sheet')}
                            style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginRight: 12 }}
                          >
                            Use in Sheet
                          </button>
                          <button
                            onClick={() => setRecentPhotos(recentPhotos.filter(x => x.id !== p.id))}
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                            title="Delete"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ─── TAB 4: PRESET DIMENSIONS ─── */}
          {activeTab === 'Preset Dimensions' && (
            <div className="card" style={{ borderRadius: 16, padding: '24px 28px', background: 'var(--bg-card)' }}>
              <div style={{ marginBottom: 22 }}>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  Government & Standard Photo Specifications
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                  Verified dimensions for passport, visa, and civil ID applications
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
                {passportPresets.map(preset => (
                  <div key={preset.name} style={{
                    border: '1px solid var(--border)', borderRadius: 12, padding: 18,
                    background: 'var(--bg-primary)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{preset.name}</span>
                      <span style={{
                        fontSize: 12, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                        background: 'rgba(59,130,246,0.12)', color: '#3b82f6'
                      }}>
                        {preset.width} x {preset.height}
                      </span>
                    </div>
                    <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.5 }}>
                      {preset.desc}
                    </p>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      <strong>Background:</strong> {preset.bg}
                    </div>
                  </div>
                ))}
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
