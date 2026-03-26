'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Upload, X, CheckCircle, RefreshCw, HardDrive, Palette, Download } from 'lucide-react'
import { useRouter } from 'next/navigation'

// Preset colors: transparent (none), white, popular passport BG colors, and extras
const PRESET_COLORS = [
  { label: 'Transparent', value: 'transparent', style: { background: 'repeating-conic-gradient(#ccc 0% 25%, white 0% 50%) 0 0 / 16px 16px' } },
  { label: 'White', value: '#ffffff' },
  { label: 'Light Gray', value: '#f0f0f0' },
  { label: 'Light Blue', value: '#c9daf8' },
  { label: 'Sky Blue', value: '#56acf2' },
  { label: 'Red', value: '#e03030' },
  { label: 'Light Red', value: '#f4a7a7' },
  { label: 'Blue', value: '#1a56db' },
  { label: 'Navy', value: '#1e3a5f' },
  { label: 'Green', value: '#34d399' },
  { label: 'Yellow', value: '#fde68a' },
  { label: 'Cream', value: '#fffde7' },
  { label: 'Pink', value: '#fce7f3' },
  { label: 'Purple', value: '#ddd6fe' },
  { label: 'Orange', value: '#fed7aa' },
  { label: 'Teal', value: '#99f6e4' },
  { label: 'Black', value: '#000000' },
  { label: 'Dark Gray', value: '#374151' },
]

export default function PhotosPage() {
  const { user } = useAuth()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [originalImage, setOriginalImage] = useState<string | null>(null)
  const [processedImage, setProcessedImage] = useState<string | null>(null) // transparent PNG blob URL from API
  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null)      // raw PNG blob
  const [processedDataUrl, setProcessedDataUrl] = useState<string | null>(null) // base64 data URL (reliable for canvas)
  const [compositeImage, setCompositeImage] = useState<string | null>(null)  // with BG color applied
  const [bgColor, setBgColor] = useState('#ffffff')
  const [customColor, setCustomColor] = useState('#ffffff')
  const [error, setError] = useState('')
  const [fileName, setFileName] = useState('')

  // When a new blob arrives, convert it to a base64 data URL (most reliable for <img> + canvas)
  useEffect(() => {
    if (!processedBlob) { setProcessedDataUrl(null); return }
    const reader = new FileReader()
    reader.onloadend = () => setProcessedDataUrl(reader.result as string)
    reader.readAsDataURL(processedBlob)
  }, [processedBlob])

  // Re-composite whenever processedDataUrl or bgColor changes
  useEffect(() => {
    if (!processedDataUrl) { setCompositeImage(null); return }

    const canvas = canvasRef.current
    if (!canvas) return

    const img = new Image()

    img.onload = () => {
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')!
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      if (bgColor !== 'transparent') {
        ctx.fillStyle = bgColor
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }
      ctx.drawImage(img, 0, 0)  // transparent PNG drawn on top of solid fill
      setCompositeImage(canvas.toDataURL('image/png'))
    }

    img.onerror = () => console.error('Canvas: failed to load processedDataUrl')
    img.src = processedDataUrl  // base64 data URL — always works in canvas
  }, [processedDataUrl, bgColor])

  const processFile = async (file: File) => {
    if (!file) return

    const validTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!validTypes.includes(file.type)) {
      setError('Please upload a JPG, PNG, or WEBP file.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be under 10MB.')
      return
    }

    setError('')
    setFileName(file.name)
    setProcessedImage(null)
    setProcessedBlob(null)
    setProcessedDataUrl(null)
    setCompositeImage(null)

    const reader = new FileReader()
    reader.onload = (e) => setOriginalImage(e.target?.result as string)
    reader.readAsDataURL(file)

    setProcessing(true)

    try {
      const formData = new FormData()
      formData.append('image_file', file)
      formData.append('size', 'auto')

      const response = await fetch('/api/remove-bg', { method: 'POST', body: formData })
      if (!response.ok) throw new Error('Background removal failed')

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      setProcessedImage(url)
      setProcessedBlob(blob)  // triggers useEffect to composite

      // Log background removal activity
      if (user) {
        await supabase.from('activity_logs').insert({
          user_id: user.id,
          action: 'bg_removed',
          description: 'AI removed background',
          file_name: file.name,
        })
      }

      // Store in Supabase
      if (user) {
        setUploading(true)
        const filePath = `${user.id}/processed_${Date.now()}.png`
        const { error: uploadError } = await supabase.storage
          .from('photos')
          .upload(filePath, blob, { contentType: 'image/png' })

        if (!uploadError) {
          await supabase.from('photos').insert({
            user_id: user.id,
            file_path: filePath,
            original_name: file.name,
            processed: true,
          })

          // Update storage usage in profiles (original + processed)
          const fileSize = file.size + blob.size
          const { data: profileData } = await supabase.from('profiles').select('storage_used').eq('id', user.id).single()
          if (profileData) {
            await supabase.from('profiles').update({
              storage_used: (profileData.storage_used || 0) + fileSize
            }).eq('id', user.id)
          }

          // Log activity
          await supabase.from('activity_logs').insert({
            user_id: user.id,
            action: 'photo_uploaded',
            description: 'Uploaded and processed photo',
            file_name: file.name,
          })
        }
        setUploading(false)
      }
    } catch {
      setError('Background removal failed. Please try again.')
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
      // Save the transparent PNG so the sheet generator can apply background color correctly
      localStorage.setItem('processedPhotoUrl', processedDataUrl)
      router.push('/create-sheet')
    }
  }

  const handleDownload = () => {
    if (!compositeImage) return
    const a = document.createElement('a')
    a.href = compositeImage
    a.download = `urlm_${bgColor === 'transparent' ? 'transparent' : bgColor.replace('#', '')}_${fileName || 'photo'}.png`
    a.click()
  }

  return (
    <DashboardLayout>
      {/* Hidden canvas for compositing */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <div className="page-header">
        <h1 className="page-title">Photo Library</h1>
        <p className="page-subtitle">Upload photos, remove backgrounds with AI, then apply any background color instantly.</p>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: 20 }}>
          <X size={16} />
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 20, alignItems: 'start' }}>

        {/* ─── LEFT PANEL ─── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Upload zone */}
          <div
            id="upload-zone"
            className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="upload-icon"><Upload size={28} /></div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Import Assets</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.6 }}>
              Drag and drop your high-res photos here or click to browse
            </p>
            <button
              id="select-files-btn"
              className="btn btn-secondary"
              style={{ width: '100%' }}
              onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}
            >
              Select Files
            </button>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 12, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              Supported: JPG, PNG, WEBP (Max 10MB)
            </p>
            <input
              id="file-input"
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
          </div>

          {/* ─── BG COLOR PICKER (shown after BG removal) ─── */}
          {processedImage && (
            <div className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Palette size={18} color="var(--accent-purple)" />
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Background Color</span>
              </div>

              {/* Preset swatches */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8, marginBottom: 14 }}>
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c.value}
                    title={c.label}
                    onClick={() => { setBgColor(c.value); if (c.value !== 'transparent') setCustomColor(c.value) }}
                    style={{
                      width: '100%',
                      aspectRatio: '1',
                      borderRadius: 8,
                      border: bgColor === c.value ? '3px solid var(--accent-purple)' : '2px solid var(--border)',
                      cursor: 'pointer',
                      ...(c.style ?? { background: c.value }),
                      transition: 'transform 0.15s, border-color 0.15s',
                      transform: bgColor === c.value ? 'scale(1.15)' : 'scale(1)',
                      boxShadow: bgColor === c.value ? '0 0 0 2px var(--accent-purple)' : 'none',
                    }}
                  />
                ))}
              </div>

              {/* Custom color input */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="color"
                  id="custom-color-picker"
                  value={customColor}
                  onChange={(e) => { setCustomColor(e.target.value); setBgColor(e.target.value) }}
                  style={{
                    width: 42, height: 42, borderRadius: 8, border: '2px solid var(--border)',
                    cursor: 'pointer', padding: 2, background: 'var(--bg-card)',
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Custom Color</div>
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
                      width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border)',
                      borderRadius: 6, padding: '5px 10px', color: 'var(--text-primary)',
                      fontSize: 13, fontFamily: 'monospace', outline: 'none',
                    }}
                    placeholder="#rrggbb"
                  />
                </div>
                <div style={{
                  width: 42, height: 42, borderRadius: 8,
                  background: bgColor === 'transparent'
                    ? 'repeating-conic-gradient(#ccc 0% 25%, white 0% 50%) 0 0 / 16px 16px'
                    : bgColor,
                  border: '2px solid var(--border)',
                  flexShrink: 0,
                }} />
              </div>
            </div>
          )}

          {/* Storage indicator */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-purple-light)', textTransform: 'uppercase', letterSpacing: '0.8px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <HardDrive size={14} />
                Library Health
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>82% Full</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: '82%', background: 'linear-gradient(90deg, var(--accent-purple), #ec4899)' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
              <span>Total Storage</span>
              <span>4.1 GB / 5.0 GB</span>
            </div>
          </div>

          {/* Actions */}
          {compositeImage && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button id="create-sheet-from-photo-btn" className="btn btn-primary btn-lg" onClick={handleCreateSheet}>
                <Upload size={16} />
                Create A4 Sheet
              </button>
              <button id="download-photo-btn" className="btn btn-secondary" onClick={handleDownload}>
                <Download size={14} />
                Download Photo
              </button>
              <button id="reprocess-btn" className="btn btn-secondary" onClick={() => fileInputRef.current?.click()}>
                <RefreshCw size={14} />
                Upload New Photo
              </button>
            </div>
          )}
        </div>

        {/* ─── RIGHT PANEL: Preview ─── */}
        <div className="card" style={{ minHeight: 500 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: compositeImage ? '#34d399' : 'var(--text-muted)',
                animation: processing ? 'pulse 1s infinite' : 'none',
              }} />
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                {compositeImage ? 'Preview' : 'AI Background Removal'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span className="pill pill-purple">PRECISION MODE</span>
              {compositeImage && (
                <span className="pill pill-green" style={{ background: `${bgColor === 'transparent' ? 'rgba(52,211,153,0.12)' : bgColor + '33'}`, color: bgColor === 'transparent' ? '#34d399' : bgColor }}>
                  {bgColor === 'transparent' ? 'TRANSPARENT' : bgColor.toUpperCase()}
                </span>
              )}
            </div>
          </div>

          {processing && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 400, gap: 16 }}>
              <div className="animate-spin" style={{ width: 48, height: 48, border: '4px solid var(--border)', borderTopColor: 'var(--accent-purple)', borderRadius: '50%' }} />
              <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Removing background with AI...</p>
            </div>
          )}

          {uploading && !processing && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, padding: '8px 14px', background: 'rgba(124,92,246,0.08)', borderRadius: 8 }}>
              <RefreshCw size={14} className="animate-spin" color="var(--accent-purple)" />
              <span style={{ fontSize: 13, color: 'var(--accent-purple-light)' }}>Saving to library...</span>
            </div>
          )}

          {/* Composite (BG applied) preview */}
          {!processing && compositeImage && (
            <div style={{ position: 'relative' }}>
              <div style={{
                borderRadius: 10, overflow: 'hidden',
                background: bgColor === 'transparent' 
                  ? 'repeating-conic-gradient(#e0e0e0 0% 25%, white 0% 50%) 0 0 / 24px 24px'
                  : bgColor,
                border: '1px solid var(--border)',
              }}>
                <img
                  src={compositeImage}
                  alt="Photo with selected background"
                  style={{ width: '100%', display: 'block', maxHeight: 500, objectFit: 'contain' }}
                />
              </div>
              <div style={{
                position: 'absolute', bottom: 16, left: 16, right: 16,
                background: 'rgba(10, 14, 26, 0.87)', backdropFilter: 'blur(8px)',
                borderRadius: 10, padding: '12px 16px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircle size={18} color="#34d399" />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Background Removed ✓</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                      Color: {bgColor === 'transparent' ? 'Transparent PNG' : bgColor.toUpperCase()}
                    </div>
                  </div>
                </div>
                <button
                  id="reprocess-photo-btn"
                  className="btn btn-sm"
                  style={{ background: 'rgba(124, 92, 246, 0.2)', color: 'var(--accent-purple-light)', border: '1px solid rgba(124, 92, 246, 0.3)' }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  Re-process
                </button>
              </div>
            </div>
          )}

          {!processing && !processedImage && !originalImage && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 400, gap: 16, color: 'var(--text-muted)' }}>
              <Upload size={48} strokeWidth={1} />
              <p style={{ fontSize: 14 }}>Upload a photo to see AI background removal in action</p>
            </div>
          )}

          {!processing && !processedImage && originalImage && (
            <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
              <img src={originalImage} alt="Original" style={{ width: '100%', display: 'block', maxHeight: 500, objectFit: 'contain' }} />
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
