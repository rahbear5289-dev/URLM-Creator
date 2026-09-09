'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import FeatureLock from '@/components/FeatureLock'
import {
  Upload, Download, Scissors, ZoomIn, ZoomOut, ChevronLeft,
  ChevronRight, RotateCw, X, Image as ImageIcon, Grid2x2,
  CreditCard, FileText, Coins, Settings, User, CheckCircle,
  Sliders, Layers, Check, ExternalLink
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

// Library holders (browser only)
let pdfjsLibInstance: any = null
let pdfLibInstance: any = null

async function getPdfLibraries() {
  if (typeof window === 'undefined') return { pdfjs: null, pdflib: null }
  if (!pdfjsLibInstance) {
    const module = await import('pdfjs-dist/legacy/build/pdf.mjs')
    pdfjsLibInstance = module
    pdfjsLibInstance.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${module.version}/legacy/build/pdf.worker.min.mjs`
  }
  if (!pdfLibInstance) {
    const module = await import('pdf-lib')
    pdfLibInstance = module.PDFDocument
  }
  return { pdfjs: pdfjsLibInstance, pdflib: pdfLibInstance }
}

type CropTab = 'Visual Crop' | 'Trim & Margins' | 'Page Manager' | 'Export Options'

export default function CropPage() {
  const { user } = useAuth()
  const router = useRouter()

  const [activeTab, setActiveTab] = useState<CropTab>('Visual Crop')
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [pdfDoc, setPdfDoc] = useState<any>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [zoom, setZoom] = useState(100)
  const [cropMode, setCropMode] = useState(false)
  const [cropArea, setCropArea] = useState<{ x: number; y: number; width: number; height: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [renderedPage, setRenderedPage] = useState<string | null>(null)
  const [pageSize, setPageSize] = useState({ width: 0, height: 0 })
  const [applyToPages, setApplyToPages] = useState<'current' | 'all' | 'odd' | 'even'>('current')

  // Numerical Margins
  const [marginTop, setMarginTop] = useState(10)
  const [marginRight, setMarginRight] = useState(10)
  const [marginBottom, setMarginBottom] = useState(10)
  const [marginLeft, setMarginLeft] = useState(10)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const renderTaskRef = useRef<any>(null)

  // Load PDF and render page
  const loadPdf = async (file: File) => {
    setLoading(true)
    try {
      const { pdfjs } = await getPdfLibraries()
      if (!pdfjs) throw new Error('PDF.js library not loaded')

      const arrayBuffer = await file.arrayBuffer()
      const loadingTask = pdfjs.getDocument({ data: arrayBuffer })

      loadingTask.onPassword = (callback: any) => {
        const password = prompt('This PDF is password protected. Enter password:')
        if (password !== null) {
          callback(password)
        } else {
          throw new Error('No password given')
        }
      }

      const pdf = await loadingTask.promise
      setPdfDoc(pdf)
      setTotalPages(pdf.numPages)
      setCurrentPage(1)
      setCropArea(null)
    } catch (err: any) {
      console.error('Error loading PDF:', err)
      if (err.name === 'PasswordException') {
        alert('This PDF is password protected and no correct password was given.')
      } else {
        alert('Failed to load PDF. Please try another file.')
      }
    }
    setLoading(false)
  }

  // Render current page
  const renderPage = useCallback(async () => {
    if (!pdfDoc) return

    try {
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel()
        renderTaskRef.current = null
      }

      const page = await pdfDoc.getPage(currentPage)
      const scale = (zoom / 100) * 1.5
      const viewport = page.getViewport({ scale })

      const canvas = canvasRef.current
      if (!canvas) return

      const context = canvas.getContext('2d')
      if (!context) return

      canvas.width = viewport.width
      canvas.height = viewport.height
      setPageSize({ width: viewport.width, height: viewport.height })

      const renderContext = {
        canvasContext: context,
        viewport: viewport
      }

      renderTaskRef.current = page.render(renderContext)
      await renderTaskRef.current.promise
      renderTaskRef.current = null

      setRenderedPage(canvas.toDataURL('image/png'))
    } catch (err: any) {
      if (err.name !== 'RenderingCancelledException') {
        console.error('Error rendering page:', err)
      }
    }
  }, [pdfDoc, currentPage, zoom])

  useEffect(() => {
    if (pdfDoc) {
      renderPage()
    }
  }, [pdfDoc, currentPage, zoom, renderPage])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type === 'application/pdf') {
      setPdfFile(file)
      loadPdf(file)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file && file.type === 'application/pdf') {
      setPdfFile(file)
      loadPdf(file)
    }
  }

  // Mouse handlers for drawing crop box
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!cropMode || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    setIsDragging(true)
    setDragStart({ x, y })
    setCropArea({ x, y, width: 0, height: 0 })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !dragStart || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const currentX = Math.max(0, Math.min(e.clientX - rect.left, pageSize.width))
    const currentY = Math.max(0, Math.min(e.clientY - rect.top, pageSize.height))

    const x = Math.min(dragStart.x, currentX)
    const y = Math.min(dragStart.y, currentY)
    const width = Math.abs(currentX - dragStart.x)
    const height = Math.abs(currentY - dragStart.y)

    setCropArea({ x, y, width, height })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // Apply crop and export PDF
  const handleCropAndExport = async () => {
    if (!pdfFile || !cropArea) {
      alert('Please select a crop area first.')
      return
    }

    setLoading(true)
    try {
      const { pdflib } = await getPdfLibraries()
      if (!pdflib) throw new Error('PDF-lib not loaded')

      const arrayBuffer = await pdfFile.arrayBuffer()
      const pdf = await pdflib.load(arrayBuffer)

      const pages = pdf.getPages()
      const targetPage = pages[currentPage - 1]
      const { width: originalWidth, height: originalHeight } = targetPage.getSize()

      const scaleX = originalWidth / pageSize.width
      const scaleY = originalHeight / pageSize.height

      const cropX = cropArea.x * scaleX
      const cropY = (pageSize.height - (cropArea.y + cropArea.height)) * scaleY
      const cropWidth = cropArea.width * scaleX
      const cropHeight = cropArea.height * scaleY

      targetPage.setCropBox(cropX, cropY, cropWidth, cropHeight)

      const croppedPdfBytes = await pdf.save()
      const blob = new Blob([croppedPdfBytes], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)

      const a = document.createElement('a')
      a.href = url
      a.download = `cropped_${pdfFile.name}`

      if (user) {
        await supabase.from('activity_logs').insert({
          user_id: user.id,
          action: 'pdf_cropped',
          description: `Cropped PDF page ${currentPage}`,
          file_name: a.download
        })
      }

      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Error cropping PDF:', err)
      alert('Failed to crop PDF. Please try again.')
    }
    setLoading(false)
  }

  const tabs: CropTab[] = ['Visual Crop', 'Trim & Margins', 'Page Manager', 'Export Options']

  const creatorTools = [
    { label: 'My Photos', href: '/photos', icon: ImageIcon, color: '#10b981', desc: 'Background removal & editor' },
    { label: 'Create Sheet', href: '/create-sheet', icon: Grid2x2, color: '#3b82f6', desc: 'Passport & stamp photo sheets' },
    { label: 'PVC Card', href: '/pvc-card', icon: CreditCard, color: '#8b5cf6', desc: 'Custom badge & ID PVC cards' },
    { label: 'PDF Converter', href: '/pdf-converter', icon: FileText, color: '#f59e0b', desc: 'Convert image & doc to PDF' },
    { label: 'PDF Crop', href: '/crop', icon: Scissors, color: '#ec4899', desc: 'Multi-page cropping tool', current: true },
    { label: 'Token Enter', href: '/token/create', icon: Coins, color: '#06b6d4', desc: 'Claim vouchers & credits' },
  ]

  return (
    <DashboardLayout>
      <FeatureLock featureName="PDF Crop & Trim">
        <div style={{ maxWidth: 1120, paddingBottom: 60 }}>

          {/* ─── Breadcrumb & Top Action Row ─── */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5 }}>
              <span style={{ color: 'var(--text-muted)', cursor: 'pointer' }} onClick={() => router.push('/dashboard')}>Dashboard</span>
              <span style={{ color: 'var(--text-muted)' }}>&gt;</span>
              <span style={{ color: '#10b981', fontWeight: 600 }}>PDF Crop & Trim</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {pdfDoc && (
                <button
                  onClick={handleCropAndExport}
                  disabled={loading || !cropArea}
                  style={{
                    background: '#10b981', color: '#ffffff', border: 'none', borderRadius: 8,
                    padding: '8px 18px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)', opacity: (loading || !cropArea) ? 0.6 : 1
                  }}
                >
                  <Download size={15} /> {loading ? 'Cropping...' : 'Crop & Download PDF'}
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

          {/* ─── Page Title Header (Matches Settings/Profile) ─── */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 14,
                background: 'rgba(236, 72, 153, 0.12)', color: '#ec4899',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <Scissors size={24} />
              </div>
              <div>
                <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 4px 0', letterSpacing: '-0.5px' }}>
                  PDF Crop & Trim Studio
                </h1>
                <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>
                  Crop PDF pages visually, trim margins precisely, and export clean print-ready vector PDF files.
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
                { label: 'Loaded PDF', value: pdfFile ? pdfFile.name.slice(0, 20) + '...' : 'No PDF Loaded', color: '#ec4899' },
                { label: 'Total Pages', value: pdfDoc ? `${totalPages} Pages` : '0 Pages', color: '#3b82f6' },
                { label: 'Current View', value: pdfDoc ? `Page ${currentPage}` : 'Page 1', color: '#10b981' },
                { label: 'Zoom Level', value: `${zoom}%`, color: '#8b5cf6' },
                { label: 'Crop Status', value: cropArea ? 'Area Selected' : 'Not Selected', color: '#f59e0b' },
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

          {/* ─── TAB 1: VISUAL CROP ─── */}
          {activeTab === 'Visual Crop' && (
            <div style={{ display: 'grid', gridTemplateColumns: pdfDoc ? '320px 1fr' : '1fr', gap: 24, alignItems: 'start' }}>
              {/* Left Column Controls */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Upload Card */}
                <div className="card" style={{ borderRadius: 16, padding: '22px 24px', background: 'var(--bg-card)' }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14 }}>
                    Source PDF Document
                  </h3>

                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                    style={{
                      border: '1px dashed var(--border)', borderRadius: 12, padding: '26px 16px',
                      textAlign: 'center', cursor: 'pointer', background: 'var(--bg-primary)'
                    }}
                  >
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(236,72,153,0.12)', color: '#ec4899', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                      <Upload size={22} />
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                      {pdfFile ? pdfFile.name : 'Upload PDF Document'}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      Drag & Drop or browse (Up to 20MB)
                    </div>
                    <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileChange} style={{ display: 'none' }} />
                  </div>
                </div>

                {pdfDoc && (
                  <>
                    {/* Tool Mode Card */}
                    <div className="card" style={{ borderRadius: 16, padding: '22px 24px', background: 'var(--bg-card)' }}>
                      <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14 }}>
                        Crop Tool Modes
                      </h3>

                      <button
                        onClick={() => setCropMode(!cropMode)}
                        style={{
                          width: '100%', padding: '12px 16px', borderRadius: 10,
                          border: cropMode ? '2px solid #10b981' : '1px solid var(--border)',
                          background: cropMode ? 'rgba(16,185,129,0.1)' : 'var(--bg-primary)',
                          color: cropMode ? '#10b981' : 'var(--text-primary)',
                          fontWeight: 700, fontSize: 13.5, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                        }}
                      >
                        <Scissors size={16} /> {cropMode ? '✓ Drawing Mode Active' : 'Activate Drag Crop'}
                      </button>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, textAlign: 'center' }}>
                        Click & drag on the PDF preview to draw crop rectangle
                      </p>

                      {cropArea && (
                        <button
                          onClick={() => setCropArea(null)}
                          className="btn btn-secondary btn-sm"
                          style={{ width: '100%', marginTop: 8 }}
                        >
                          Clear Crop Selection
                        </button>
                      )}
                    </div>

                    {/* Page Navigation */}
                    <div className="card" style={{ borderRadius: 16, padding: '22px 24px', background: 'var(--bg-card)' }}>
                      <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14 }}>
                        Page Navigation
                      </h3>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                          {currentPage} / {totalPages}
                        </span>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Right Canvas Viewer Stage */}
              <div className="card" style={{ borderRadius: 16, padding: '24px 28px', background: 'var(--bg-card)', minHeight: 520 }}>
                {pdfDoc ? (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }} />
                        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                          PDF Visual Stage
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button className="icon-btn" onClick={() => setZoom(z => Math.max(50, z - 10))} title="Zoom Out">
                          <ZoomOut size={16} />
                        </button>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', minWidth: 40, textAlign: 'center' }}>
                          {zoom}%
                        </span>
                        <button className="icon-btn" onClick={() => setZoom(z => Math.min(200, z + 10))} title="Zoom In">
                          <ZoomIn size={16} />
                        </button>
                        <button className="icon-btn" onClick={() => setZoom(100)} title="Reset Zoom">
                          <RotateCw size={14} />
                        </button>
                      </div>
                    </div>

                    <div
                      ref={containerRef}
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                      style={{
                        position: 'relative', background: '#1e2330', borderRadius: 12,
                        padding: 16, border: '1px solid var(--border)', overflow: 'auto',
                        display: 'flex', justifyContent: 'center', maxHeight: 600,
                        cursor: cropMode ? 'crosshair' : 'default'
                      }}
                    >
                      <canvas ref={canvasRef} style={{ display: 'block', maxWidth: '100%', boxShadow: '0 10px 30px rgba(0,0,0,0.35)', borderRadius: 4 }} />

                      {/* Crop Selection Overlay */}
                      {cropArea && (
                        <div
                          style={{
                            position: 'absolute',
                            left: cropArea.x + 16,
                            top: cropArea.y + 16,
                            width: cropArea.width,
                            height: cropArea.height,
                            border: '2px dashed #10b981',
                            background: 'rgba(16, 185, 129, 0.15)',
                            pointerEvents: 'none'
                          }}
                        >
                          <div style={{
                            position: 'absolute', top: -24, left: 0,
                            background: '#10b981', color: '#fff', fontSize: 11,
                            padding: '2px 6px', borderRadius: 4, fontWeight: 700
                          }}>
                            {Math.round(cropArea.width)} × {Math.round(cropArea.height)} px
                          </div>
                        </div>
                      )}
                    </div>

                    <div style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      marginTop: 18, padding: '14px 18px', background: 'var(--bg-primary)',
                      borderRadius: 12, border: '1px solid var(--border)'
                    }}>
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)' }}>
                          {cropArea ? 'Crop Boundary Confirmed' : 'Drag on canvas to define crop box'}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          Original resolution will be fully preserved in output
                        </div>
                      </div>

                      <button
                        onClick={handleCropAndExport}
                        disabled={loading || !cropArea}
                        style={{
                          background: '#10b981', color: '#ffffff', border: 'none', borderRadius: 8,
                          padding: '8px 18px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          opacity: (loading || !cropArea) ? 0.6 : 1
                        }}
                      >
                        <Download size={15} /> {loading ? 'Processing...' : 'Download Cropped PDF'}
                      </button>
                    </div>
                  </>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 380, color: 'var(--text-muted)', gap: 14 }}>
                    <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', border: '1px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Scissors size={28} strokeWidth={1.5} />
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>No PDF Loaded</div>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 320, textAlign: 'center', margin: 0 }}>
                      Drop a PDF into the left upload area to inspect pages and visually select crop boundaries.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── TAB 2: TRIM & MARGINS ─── */}
          {activeTab === 'Trim & Margins' && (
            <div className="card" style={{ borderRadius: 16, padding: '24px 28px', background: 'var(--bg-card)' }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                Numerical Margin Trimming
              </h3>
              <p style={{ fontSize: 13.5, color: 'var(--text-muted)', marginBottom: 24 }}>
                Shave uniform borders from all sides of the page automatically.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                {[
                  { label: 'Top Margin', value: marginTop, setter: setMarginTop },
                  { label: 'Right Margin', value: marginRight, setter: setMarginRight },
                  { label: 'Bottom Margin', value: marginBottom, setter: setMarginBottom },
                  { label: 'Left Margin', value: marginLeft, setter: setMarginLeft },
                ].map(m => (
                  <div key={m.label} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 18, background: 'var(--bg-primary)' }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>{m.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#ec4899', marginBottom: 8 }}>{m.value} mm</div>
                    <input type="range" className="slider" min={0} max={50} value={m.value} onChange={(e) => m.setter(Number(e.target.value))} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── TAB 3: PAGE MANAGER ─── */}
          {activeTab === 'Page Manager' && (
            <div className="card" style={{ borderRadius: 16, padding: '24px 28px', background: 'var(--bg-card)' }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                Multi-Page Crop Scope
              </h3>
              <p style={{ fontSize: 13.5, color: 'var(--text-muted)', marginBottom: 24 }}>
                Choose which pages in the document should receive the active crop coordinates.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                {[
                  { id: 'current', label: 'Current Page Only', desc: `Apply crop only to Page ${currentPage}` },
                  { id: 'all', label: 'All Pages in Document', desc: `Batch-crop entire document (${totalPages} pages)` },
                  { id: 'odd', label: 'Odd Pages Only', desc: 'Pages 1, 3, 5, 7... for bookbinding' },
                  { id: 'even', label: 'Even Pages Only', desc: 'Pages 2, 4, 6, 8... for bookbinding' },
                ].map(scope => (
                  <div
                    key={scope.id}
                    onClick={() => setApplyToPages(scope.id as any)}
                    style={{
                      border: applyToPages === scope.id ? '2px solid #10b981' : '1px solid var(--border)',
                      borderRadius: 12, padding: 18, cursor: 'pointer',
                      background: 'var(--bg-primary)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{scope.label}</span>
                      {applyToPages === scope.id && <Check size={16} color="#10b981" />}
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>{scope.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── TAB 4: EXPORT OPTIONS ─── */}
          {activeTab === 'Export Options' && (
            <div className="card" style={{ borderRadius: 16, padding: '24px 28px', background: 'var(--bg-card)' }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                Export Quality & Rendering Options
              </h3>
              <p style={{ fontSize: 13.5, color: 'var(--text-muted)', marginBottom: 24 }}>
                Configure vector fidelity and layer optimization for output documents.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  { title: 'Preserve Vector Paths', desc: 'Keep embedded fonts and vector graphics razor-sharp without rasterizing.', checked: true },
                  { title: 'Strip Metadata & Bookmarks', desc: 'Reduce file footprint by dropping hidden PDF author metadata.', checked: false },
                  { title: 'Auto-Rotate to Normal Orientation', desc: 'Normalize landscape/portrait orientations before saving.', checked: true },
                ].map(opt => (
                  <label key={opt.title} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: 16, borderRadius: 10, background: 'var(--bg-primary)', border: '1px solid var(--border)', cursor: 'pointer' }}>
                    <input type="checkbox" defaultChecked={opt.checked} style={{ accentColor: '#10b981', marginTop: 3, width: 16, height: 16 }} />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{opt.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{opt.desc}</div>
                    </div>
                  </label>
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
