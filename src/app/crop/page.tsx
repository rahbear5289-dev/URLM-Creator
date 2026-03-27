'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import FeatureLock from '@/components/FeatureLock'
import { Upload, Download, Scissors, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, RotateCw, X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

// Library holders (browser only)
let pdfjsLibInstance: any = null
let pdfLibInstance: any = null

async function getPdfLibraries() {
    if (typeof window === 'undefined') return { pdfjs: null, pdflib: null }
    if (!pdfjsLibInstance) {
        // Switch to legacy build which is more stable in Turbopack/Next.js environments
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

export default function CropPage() {
    const { user } = useAuth()
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
            
            // Handle password prompt if needed
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
            
            // Re-render will be triggered by pdfDoc state update
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
            // Cancel previous render task if any
            if (renderTaskRef.current) {
                renderTaskRef.current.cancel()
                renderTaskRef.current = null
            }

            const page = await pdfDoc.getPage(currentPage)
            const scale = zoom / 100
            const viewport = page.getViewport({ scale })

            const canvas = canvasRef.current
            if (!canvas) return

            canvas.width = viewport.width
            canvas.height = viewport.height
            setPageSize({ width: viewport.width, height: viewport.height })

            const ctx = canvas.getContext('2d')
            if (!ctx) return

            const renderTask = page.render({
                canvasContext: ctx,
                viewport,
                canvas: canvas
            })

            renderTaskRef.current = renderTask

            try {
                await renderTask.promise
                setRenderedPage('rendered')
            } catch (err: any) {
                if (err.name !== 'RenderingCancelledException') {
                    console.error('Error rendering page:', err)
                }
            } finally {
                if (renderTaskRef.current === renderTask) {
                    renderTaskRef.current = null
                }
            }
        } catch (err) {
            console.error('Error getting page for render:', err)
        }
    }, [pdfDoc, currentPage, zoom])

    useEffect(() => {
        if (pdfDoc) {
            renderPage()
        }
    }, [pdfDoc, renderPage])

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file && file.type === 'application/pdf') {
            setPdfFile(file)
            await loadPdf(file)
        }
    }

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault()
        const file = e.dataTransfer.files[0]
        if (file && file.type === 'application/pdf') {
            setPdfFile(file)
            await loadPdf(file)
        }
    }

    const getCanvasCoords = (e: React.MouseEvent): { x: number; y: number } => {
        const canvas = canvasRef.current
        if (!canvas) return { x: 0, y: 0 }

        const rect = canvas.getBoundingClientRect()
        const scaleX = canvas.width / rect.width
        const scaleY = canvas.height / rect.height

        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        }
    }

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!cropMode || !canvasRef.current) return
        const coords = getCanvasCoords(e)
        setIsDragging(true)
        setDragStart(coords)
        setCropArea({ x: coords.x, y: coords.y, width: 0, height: 0 })
    }

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !dragStart || !canvasRef.current) return
        const coords = getCanvasCoords(e)

        setCropArea({
            x: Math.min(dragStart.x, coords.x),
            y: Math.min(dragStart.y, coords.y),
            width: Math.abs(coords.x - dragStart.x),
            height: Math.abs(coords.y - dragStart.y)
        })
    }

    const handleMouseUp = () => {
        setIsDragging(false)
        setDragStart(null)
    }

    const resetCrop = () => {
        setCropArea(null)
    }

    const downloadCroppedPdf = async () => {
        if (!pdfFile || !cropArea || cropArea.width === 0 || cropArea.height === 0) {
            alert('Please select a crop area first.')
            return
        }

        setLoading(true)
        try {
            const { pdflib } = await getPdfLibraries()
            if (!pdflib) throw new Error('pdf-lib not loaded')

            const arrayBuffer = await pdfFile.arrayBuffer()
            const doc = await pdflib.load(arrayBuffer)
            const pages = doc.getPages()
            const page = pages[currentPage - 1]

            const { width, height } = page.getSize()
            const scaleX = width / pageSize.width
            const scaleY = height / pageSize.height

            // Calculate crop box in PDF coordinates (bottom-left origin)
            const cropX = cropArea.x * scaleX
            const cropY = height - (cropArea.y + cropArea.height) * scaleY
            const cropW = cropArea.width * scaleX
            const cropH = cropArea.height * scaleY

            // Set the crop box
            page.setMediaBox(cropX, cropY, cropW, cropH)

            // Save and download
            const pdfBytes = await doc.save()
            const blob = new Blob([pdfBytes.buffer], { type: 'application/pdf' })
            const url = URL.createObjectURL(blob)

            const a = document.createElement('a')
            a.href = url
            a.download = `cropped_page_${currentPage}.pdf`
            
            // Log activity
            if (user) {
              await supabase.from('activity_logs').insert({
                user_id: user.id,
                action: 'pdf_cropped',
                description: `Cropped PDF page ${currentPage}`,
                file_name: pdfFile.name
              })

              // Update storage usage (add 3MB simulation)
              const { data: profile } = await supabase.from('profiles').select('storage_used').eq('id', user.id).single()
              if (profile) {
                await supabase.from('profiles').update({
                  storage_used: (profile.storage_used || 0) + (3 * 1024 * 1024)
                }).eq('id', user.id)
              }
            }

            a.click()

            URL.revokeObjectURL(url)
        } catch (err) {
            console.error('Error cropping PDF:', err)
            alert('Failed to crop PDF. Please try again.')
        }
        setLoading(false)
    }

  return (
    <DashboardLayout>
      <FeatureLock featureName="PDF Crop">
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
                <div className="page-header" style={{ marginBottom: 32 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                        <div style={{
                            width: 48, height: 48, borderRadius: 12,
                            background: 'linear-gradient(135deg, #7c5cf6, #ec4899)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <Scissors size={24} color="white" />
                        </div>
                        <div>
                            <h1 className="page-title" style={{ marginBottom: 4 }}>PDF Crop Tool</h1>
                            <p className="page-subtitle">Upload PDF, select area, crop, and download</p>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: pdfDoc ? '280px 1fr' : '1fr', gap: 20, alignItems: 'start' }}>

                    {/* Left Panel */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {/* Upload */}
                        <div className="card">
                            <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 16 }}>
                                1. Upload PDF
                            </h3>
                            <div
                                className="upload-zone"
                                onClick={() => fileInputRef.current?.click()}
                                onDrop={handleDrop}
                                onDragOver={(e) => e.preventDefault()}
                                style={{ padding: 20 }}
                            >
                                <div className="upload-icon" style={{ width: 40, height: 40, marginBottom: 10 }}>
                                    <Upload size={18} />
                                </div>
                                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                                    {pdfFile ? pdfFile.name : 'Drop PDF here'}
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                                    PDF up to 20MB
                                </div>
                            </div>
                            <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileChange} style={{ display: 'none' }} />
                        </div>

                        {/* Page Navigation */}
                        {pdfDoc && (
                            <div className="card">
                                <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 16 }}>
                                    2. Page Navigation
                                </h3>

                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 12 }}>
                                    <button
                                        className="btn btn-sm btn-secondary"
                                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                        disabled={currentPage <= 1}
                                    >
                                        <ChevronLeft size={14} />
                                    </button>
                                    <span style={{ fontSize: 13, minWidth: 80, textAlign: 'center' }}>
                                        Page {currentPage} of {totalPages}
                                    </span>
                                    <button
                                        className="btn btn-sm btn-secondary"
                                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                        disabled={currentPage >= totalPages}
                                    >
                                        <ChevronRight size={14} />
                                    </button>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <ZoomOut size={14} />
                                    <input
                                        type="range"
                                        min="50"
                                        max="200"
                                        value={zoom}
                                        onChange={(e) => setZoom(parseInt(e.target.value))}
                                        style={{ flex: 1 }}
                                    />
                                    <ZoomIn size={14} />
                                    <span style={{ fontSize: 11, minWidth: 35 }}>{zoom}%</span>
                                </div>
                            </div>
                        )}

                        {/* Crop Controls */}
                        {pdfDoc && (
                            <div className="card">
                                <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 16 }}>
                                    3. Crop Tool
                                </h3>

                                <button
                                    className={`btn ${cropMode ? 'btn-primary' : 'btn-secondary'}`}
                                    onClick={() => setCropMode(!cropMode)}
                                    style={{ width: '100%', marginBottom: 12 }}
                                >
                                    <Scissors size={14} />
                                    {cropMode ? 'Exit Crop Mode' : 'Start Cropping'}
                                </button>

                                {cropArea && cropArea.width > 10 && cropArea.height > 10 && (
                                    <div style={{
                                        padding: 12,
                                        background: 'var(--bg-primary)',
                                        borderRadius: 8,
                                        marginBottom: 12
                                    }}>
                                        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Crop Area:</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'grid', gap: 4 }}>
                                            <div>Width: {Math.round(cropArea.width)}px</div>
                                            <div>Height: {Math.round(cropArea.height)}px</div>
                                            <div>X: {Math.round(cropArea.x)}</div>
                                            <div>Y: {Math.round(cropArea.y)}</div>
                                        </div>
                                    </div>
                                )}

                                <button
                                    className="btn btn-secondary"
                                    onClick={resetCrop}
                                    style={{ width: '100%', marginBottom: 8 }}
                                    disabled={!cropArea}
                                >
                                    <RotateCw size={14} />
                                    Reset Crop
                                </button>

                                <button
                                    className="btn btn-primary"
                                    onClick={downloadCroppedPdf}
                                    disabled={!cropArea || cropArea.width < 10 || cropArea.height < 10 || loading}
                                    style={{ width: '100%' }}
                                >
                                    {loading ? (
                                        <RotateCw size={14} className="animate-spin" />
                                    ) : (
                                        <Download size={14} />
                                    )}
                                    Download Cropped PDF
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Preview Panel */}
                    <div>
                        {loading && !renderedPage && (
                            <div className="card" style={{ minHeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <div style={{ textAlign: 'center' }}>
                                    <div className="animate-spin" style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTopColor: 'var(--accent-purple)', borderRadius: '50%', margin: '0 auto 16px' }} />
                                    <p>Loading PDF...</p>
                                </div>
                            </div>
                        )}

                        {pdfDoc && (
                            <div className="card" style={{ minHeight: 600 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <div style={{
                                            width: 8, height: 8, borderRadius: '50%',
                                            background: cropMode ? '#f59e0b' : '#34d399'
                                        }} />
                                        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                                            {cropMode ? 'Crop Mode - Drag to Select Area' : 'PDF Preview'}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                        Page {currentPage} of {totalPages}
                                    </div>
                                </div>

                                {loading && (
                                    <div style={{ 
                                        position: 'absolute', inset: 0, zIndex: 10, 
                                        background: 'rgba(255,255,255,0.7)', 
                                        display: 'flex', alignItems: 'center', justifyContent: 'center' 
                                    }}>
                                        <div className="animate-spin" style={{ 
                                            width: 40, height: 40, border: '3px solid var(--border)', 
                                            borderTopColor: 'var(--accent-purple)', borderRadius: '50%' 
                                        }} />
                                    </div>
                                )}

                                <div
                                    ref={containerRef}
                                    style={{
                                        position: 'relative',
                                        background: '#525659',
                                        borderRadius: 8,
                                        overflow: 'auto',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        minHeight: 500,
                                        padding: 20
                                    }}
                                    onMouseDown={handleMouseDown}
                                    onMouseMove={handleMouseMove}
                                    onMouseUp={handleMouseUp}
                                    onMouseLeave={handleMouseUp}
                                >
                                    <div style={{ position: 'relative', boxShadow: '0 4px 20px rgba(0,0,0,0.4)', visibility: renderedPage ? 'visible' : 'hidden' }}>
                                        <canvas ref={canvasRef} style={{ display: 'block' }} />

                                        {/* Crop Area Overlay */}
                                        {cropMode && cropArea && cropArea.width > 0 && cropArea.height > 0 && (
                                            <>
                                                {/* Dark overlay outside crop area */}
                                                <div style={{
                                                    position: 'absolute',
                                                    top: 0,
                                                    left: 0,
                                                    right: 0,
                                                    height: cropArea.y,
                                                    background: 'rgba(0,0,0,0.5)',
                                                    pointerEvents: 'none'
                                                }} />
                                                <div style={{
                                                    position: 'absolute',
                                                    top: cropArea.y,
                                                    left: 0,
                                                    width: cropArea.x,
                                                    height: cropArea.height,
                                                    background: 'rgba(0,0,0,0.5)',
                                                    pointerEvents: 'none'
                                                }} />
                                                <div style={{
                                                    position: 'absolute',
                                                    top: cropArea.y,
                                                    right: 0,
                                                    width: pageSize.width - cropArea.x - cropArea.width,
                                                    height: cropArea.height,
                                                    background: 'rgba(0,0,0,0.5)',
                                                    pointerEvents: 'none'
                                                }} />
                                                <div style={{
                                                    position: 'absolute',
                                                    bottom: 0,
                                                    left: 0,
                                                    right: 0,
                                                    height: pageSize.height - cropArea.y - cropArea.height,
                                                    background: 'rgba(0,0,0,0.5)',
                                                    pointerEvents: 'none'
                                                }} />

                                                {/* Crop border */}
                                                <div style={{
                                                    position: 'absolute',
                                                    left: cropArea.x,
                                                    top: cropArea.y,
                                                    width: cropArea.width,
                                                    height: cropArea.height,
                                                    border: '2px solid #7c5cf6',
                                                    background: 'transparent',
                                                    pointerEvents: 'none'
                                                }} />

                                                {/* Crop dimensions label */}
                                                <div style={{
                                                    position: 'absolute',
                                                    top: cropArea.y - 28,
                                                    left: cropArea.x,
                                                    background: '#7c5cf6',
                                                    color: 'white',
                                                    padding: '4px 8px',
                                                    borderRadius: 4,
                                                    fontSize: 11,
                                                    fontWeight: 600,
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    {Math.round(cropArea.width)} × {Math.round(cropArea.height)} px
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {cropMode && (
                                    <div style={{ marginTop: 16, padding: 12, background: 'rgba(245,158,11,0.1)', borderRadius: 8, border: '1px solid rgba(245,158,11,0.3)' }}>
                                        <p style={{ fontSize: 13, color: '#f59e0b', margin: 0 }}>
                                            <strong>Instructions:</strong> Click and drag on the PDF to select the area you want to crop.
                                            Make sure to select the entire area you need.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {!pdfDoc && !loading && (
                            <div className="card" style={{ minHeight: 500, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                <Scissors size={64} strokeWidth={1} style={{ marginBottom: 16, opacity: 0.5 }} />
                                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Upload PDF to Start</h3>
                                <p style={{ fontSize: 14, color: 'var(--text-secondary)', textAlign: 'center', maxWidth: 400 }}>
                                    Drag and drop your PDF file or click the upload button to get started
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Features */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 24 }}>
                    <div className="card">
                        <div style={{ fontSize: 24, marginBottom: 12 }}>📤</div>
                        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Upload PDF</h4>
                        <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
                            Drag & drop or browse to upload your PDF file
                        </p>
                    </div>
                    <div className="card">
                        <div style={{ fontSize: 24, marginBottom: 12 }}>✂️</div>
                        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Select Area</h4>
                        <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
                            Click and drag to select the area you want to crop
                        </p>
                    </div>
                    <div className="card">
                        <div style={{ fontSize: 24, marginBottom: 12 }}>💾</div>
                        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Download</h4>
                        <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
                            Get your cropped PDF instantly
                        </p>
                    </div>
                </div>
            </div>
      </FeatureLock>
    </DashboardLayout>
  )
}
