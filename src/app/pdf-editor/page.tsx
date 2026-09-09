'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import FeatureLock from '@/components/FeatureLock'
import {
  Upload, Download, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, X,
  PenTool, Type, Bold, Italic, RefreshCw, MousePointerClick, Eraser,
  CheckCircle, Sparkles, Undo2, FileDown, Palette
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

// ─── Library holders (browser only) ───
let pdfjsLib: any = null

async function getPdfJs() {
    if (typeof window === 'undefined') return null
    if (!pdfjsLib) {
        const module = await import('pdfjs-dist/legacy/build/pdf.mjs')
        pdfjsLib = module
        // Prefer the local worker shipped in /public; fall back to the CDN copy on failure.
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
    }
    return pdfjsLib
}

async function getPdfLib() {
    return import('pdf-lib')
}

// ─── Fonts ───
// Text is mapped to the 14 standard PDF fonts so exports stay clean and portable.
type FontFamily = 'sans' | 'serif' | 'mono'
type FontKey = 'helvetica' | 'helveticaBold' | 'helveticaOblique' | 'times' | 'timesBold' | 'timesItalic' | 'courier' | 'courierBold'

const FONT_STYLES: Record<FontKey, { family: FontFamily; bold: boolean; italic: boolean; css: string }> = {
    helvetica:        { family: 'sans',  bold: false, italic: false, css: 'Arial, Helvetica, sans-serif' },
    helveticaBold:    { family: 'sans',  bold: true,  italic: false, css: 'Arial, Helvetica, sans-serif' },
    helveticaOblique: { family: 'sans',  bold: false, italic: true,  css: 'Arial, Helvetica, sans-serif' },
    times:            { family: 'serif', bold: false, italic: false, css: '"Times New Roman", Times, serif' },
    timesBold:        { family: 'serif', bold: true,  italic: false, css: '"Times New Roman", Times, serif' },
    timesItalic:      { family: 'serif', bold: false, italic: true,  css: '"Times New Roman", Times, serif' },
    courier:          { family: 'mono',  bold: false, italic: false, css: '"Courier New", Courier, monospace' },
    courierBold:      { family: 'mono',  bold: true,  italic: false, css: '"Courier New", Courier, monospace' },
}

function fontKeyFor(family: FontFamily, bold: boolean, italic: boolean): FontKey {
    if (family === 'sans') return bold ? 'helveticaBold' : italic ? 'helveticaOblique' : 'helvetica'
    if (family === 'serif') return bold ? 'timesBold' : italic ? 'timesItalic' : 'times'
    return bold ? 'courierBold' : 'courier'
}

// Standard PDF font name understood by pdf-lib's embedFont
function stdFontName(key: FontKey): string {
    const s = FONT_STYLES[key]
    if (s.family === 'sans') return s.bold ? 'Helvetica-Bold' : s.italic ? 'Helvetica-Oblique' : 'Helvetica'
    if (s.family === 'serif') return s.bold ? 'Times-Bold' : s.italic ? 'Times-Italic' : 'Times-Roman'
    return s.bold ? 'Courier-Bold' : s.italic ? 'Courier-Oblique' : 'Courier'
}

// ─── Text line model (all geometry in PDF user-space points, origin bottom-left) ───
interface TextLine {
    id: string
    pageIndex: number      // 0-based
    x: number              // left edge
    yBaseline: number      // text baseline
    width: number          // current visual width (original glyph run)
    originalWidth: number
    fontSize: number
    originalFontSize: number
    fontKey: FontKey
    originalFontKey: FontKey
    text: string
    originalText: string
    color: string
    coverColor: string     // sampled background behind the original glyphs
}

const isLineEdited = (l: TextLine) =>
    l.text !== l.originalText || l.fontSize !== l.originalFontSize || l.fontKey !== l.originalFontKey || l.color.toLowerCase() !== '#000000'

function hexToRgb(hex: string): { r: number; g: number; b: number } {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
    if (!m) return { r: 0, g: 0, b: 0 }
    const n = parseInt(m[1], 16)
    return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 }
}

// Keep text inside the WinAnsi range supported by standard PDF fonts
function sanitizeForStandardFont(text: string): string {
    return text
        .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
        .replace(/[\u201C\u201D\u201E]/g, '"')
        .replace(/[\u2013\u2014\u2015]/g, '-')
        .replace(/\u2026/g, '...')
        .replace(/\u00A0/g, ' ')
        .replace(/[^\x00-\xFF]/g, '?')
}

const RENDER_SCALE = 2 // device pixels per CSS pixel for crisp rendering

export default function PDFEditorPage() {
    const { user } = useAuth()
    const [pdfFile, setPdfFile] = useState<File | null>(null)
    const [pdfDoc, setPdfDoc] = useState<any>(null)
    const [currentPage, setCurrentPage] = useState(1)
    const [totalPages, setTotalPages] = useState(0)
    const [zoom, setZoom] = useState(100)
    const [loading, setLoading] = useState(false)
    const [rendering, setRendering] = useState(false)
    const [exporting, setExporting] = useState(false)
    const [exportMsg, setExportMsg] = useState('')
    const [error, setError] = useState('')

    // lines per page number (1-based)
    const [allLines, setAllLines] = useState<Record<number, TextLine[]>>({})
    const allLinesRef = useRef<Record<number, TextLine[]>>({})
    const setLinesForPage = (page: number, lines: TextLine[]) => {
        allLinesRef.current = { ...allLinesRef.current, [page]: lines }
        setAllLines(allLinesRef.current)
    }

    const [stage, setStage] = useState<{ cssW: number; cssH: number; pageW: number; pageH: number } | null>(null)
    const [selectedId, setSelectedId] = useState<string | null>(null)

    const canvasRef = useRef<HTMLCanvasElement>(null)
    const overlayRef = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const renderTaskRef = useRef<any>(null)
    const measureCtxRef = useRef<CanvasRenderingContext2D | null>(null)

    const currentLines = allLines[currentPage] || []
    const selectedLine = currentLines.find(l => l.id === selectedId) || null
    const editedCount = Object.values(allLines).flat().filter(isLineEdited).length
    const hasChanges = editedCount > 0

    // ─── Text extraction: group raw glyph runs into visual lines ───
    const extractLines = useCallback(async (pageNum: number, doc: any): Promise<TextLine[]> => {
        const page = await doc.getPage(pageNum)
        const textContent = await page.getTextContent()
        const styles = textContent.styles || {}

        interface RawItem { str: string; x: number; y: number; endX: number; fontSize: number; fontKey: FontKey }
        const raw: RawItem[] = []

        for (const item of textContent.items as any[]) {
            if (!item.str || !item.str.trim()) continue
            const tx = item.transform
            const fontSize = Math.hypot(tx[2], tx[3]) || Math.abs(tx[3]) || 10
            const fam: string = styles[item.fontName]?.fontFamily || 'sans-serif'
            const fontKey: FontKey = fam.includes('mono') ? 'courier' : (fam.includes('serif') && !fam.includes('sans')) ? 'times' : 'helvetica'
            raw.push({ str: item.str, x: tx[4], y: tx[5], endX: tx[4] + (item.width || 0), fontSize, fontKey })
        }

        // reading order: top to bottom, left to right
        raw.sort((a, b) => (Math.abs(a.y - b.y) > 2 ? b.y - a.y : a.x - b.x))

        const lines: TextLine[] = []
        let bucket: RawItem[] = []

        const flushBucket = () => {
            if (!bucket.length) return
            const first = bucket[0]
            const x = Math.min(...bucket.map(i => i.x))
            const endX = Math.max(...bucket.map(i => i.endX))
            const fontSize = Math.max(...bucket.map(i => i.fontSize))
            const fontKey = bucket.reduce((acc, i) => (i.fontSize > acc.fontSize ? i : acc), bucket[0]).fontKey

            let text = ''
            bucket.forEach((item, idx) => {
                if (idx > 0) {
                    const prev = bucket[idx - 1]
                    if (item.x - prev.endX > item.fontSize * 0.18 && !text.endsWith(' ')) text += ' '
                }
                text += item.str
            })
            text = text.replace(/\s+/g, ' ').trim()

            lines.push({
                id: `p${pageNum}-l${lines.length}`,
                pageIndex: pageNum - 1,
                x,
                yBaseline: first.y,
                width: Math.max(endX - x, 1),
                originalWidth: Math.max(endX - x, 1),
                fontSize,
                originalFontSize: fontSize,
                fontKey,
                originalFontKey: fontKey,
                text,
                originalText: text,
                color: '#000000',
                coverColor: '#ffffff',
            })
            bucket = []
        }

        for (const item of raw) {
            if (!bucket.length) { bucket = [item]; continue }
            const prev = bucket[bucket.length - 1]
            if (Math.abs(item.y - prev.y) <= Math.max(2, prev.fontSize * 0.35)) {
                bucket.push(item)
            } else {
                flushBucket()
                bucket = [item]
            }
        }
        flushBucket()

        return lines
    }, [])

    // Sample the pixel color just outside the glyph run so export can cover
    // the original text with a matching background patch.
    const sampleCoverColor = (ctx: CanvasRenderingContext2D, line: { x: number; yBaseline: number; width: number; fontSize: number }, pageH: number, scale: number): string => {
        try {
            const midY = Math.round((pageH - (line.yBaseline - line.fontSize * 0.35)) * scale)
            const candidates = [
                [Math.round(line.x * scale) - 4, midY],
                [Math.round((line.x + line.width) * scale) + 4, midY],
                [Math.round((line.x + line.width / 2) * scale), Math.round((pageH - (line.yBaseline + line.fontSize * 0.45)) * scale)],
            ]
            let r = 0, g = 0, b = 0, n = 0
            for (const [cx, cy] of candidates) {
                if (cx < 0 || cy < 0 || cx >= ctx.canvas.width || cy >= ctx.canvas.height) continue
                const d = ctx.getImageData(cx, cy, 1, 1).data
                r += d[0]; g += d[1]; b += d[2]; n++
            }
            if (!n) return '#ffffff'
            const hex = (v: number) => Math.round(v / n).toString(16).padStart(2, '0')
            return `#${hex(r)}${hex(g)}${hex(b)}`
        } catch {
            return '#ffffff'
        }
    }

    // ─── Load PDF ───
    const loadDocument = useCallback(async (file: File) => {
        setLoading(true)
        setError('')
        setExportMsg('')
        try {
            const pdfjs = await getPdfJs()
            if (!pdfjs) throw new Error('PDF engine unavailable')

            const openDoc = async () => {
                const arrayBuffer = await file.arrayBuffer()
                const task = pdfjs.getDocument({ data: arrayBuffer.slice(0) })
                task.onPassword = (callback: any) => {
                    const password = prompt('This PDF is password protected. Enter password:')
                    if (password !== null) callback(password)
                    else throw new Error('No password given')
                }
                return task.promise
            }

            let doc: any
            try {
                doc = await openDoc()
            } catch (err: any) {
                if (err?.name === 'PasswordException') throw err
                // local worker may be missing/mismatched — retry with the CDN worker
                pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version || '5.5.207'}/legacy/build/pdf.worker.min.mjs`
                doc = await openDoc()
            }

            setPdfDoc(doc)
            setTotalPages(doc.numPages)
            setCurrentPage(1)
            allLinesRef.current = {}
            setAllLines({})
            setSelectedId(null)
        } catch (err: any) {
            console.error('Failed to load PDF:', err)
            if (err?.name === 'PasswordException') {
                setError('This PDF is password protected and no correct password was given.')
            } else {
                setError('Failed to load PDF. Please try another file.')
            }
            setPdfDoc(null)
        }
        setLoading(false)
    }, [])

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file && (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'))) {
            setPdfFile(file)
            loadDocument(file)
        } else if (file) {
            setError('Please choose a PDF file.')
        }
        e.target.value = ''
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        const file = e.dataTransfer.files?.[0]
        if (file && (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'))) {
            setPdfFile(file)
            loadDocument(file)
        }
    }

    // ─── Render current page + extract text layers ───
    const renderPage = useCallback(async () => {
        if (!pdfDoc) return
        setRendering(true)
        setSelectedId(null)
        try {
            const page = await pdfDoc.getPage(currentPage)
            const cssScale = zoom / 100
            const cssViewport = page.getViewport({ scale: cssScale })
            const deviceViewport = page.getViewport({ scale: cssScale * RENDER_SCALE })

            const canvas = canvasRef.current
            if (!canvas) return

            if (renderTaskRef.current) {
                try { renderTaskRef.current.cancel() } catch { /* noop */ }
                renderTaskRef.current = null
            }

            canvas.width = Math.floor(deviceViewport.width)
            canvas.height = Math.floor(deviceViewport.height)
            canvas.style.width = `${Math.floor(cssViewport.width)}px`
            canvas.style.height = `${Math.floor(cssViewport.height)}px`

            const ctx = canvas.getContext('2d')
            if (!ctx) return
            ctx.fillStyle = '#ffffff'
            ctx.fillRect(0, 0, canvas.width, canvas.height)

            const task = page.render({ canvasContext: ctx, viewport: deviceViewport, canvas })
            renderTaskRef.current = task
            try {
                await task.promise
            } catch (err: any) {
                if (err?.name === 'RenderingCancelledException') return
                throw err
            } finally {
                if (renderTaskRef.current === task) renderTaskRef.current = null
            }

            setStage({
                cssW: Math.floor(cssViewport.width),
                cssH: Math.floor(cssViewport.height),
                pageW: cssViewport.width / cssScale,
                pageH: cssViewport.height / cssScale,
            })

            if (!allLinesRef.current[currentPage]) {
                const lines = await extractLines(currentPage, pdfDoc)
                const s = canvas.width / (cssViewport.width / cssScale)
                for (const l of lines) {
                    l.coverColor = sampleCoverColor(ctx, l, cssViewport.height / cssScale, s)
                }
                setLinesForPage(currentPage, lines)
            }
        } catch (err) {
            console.error('Error rendering page:', err)
        }
        setRendering(false)
    }, [pdfDoc, currentPage, zoom, extractLines])

    useEffect(() => {
        if (pdfDoc) renderPage()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pdfDoc, currentPage, zoom])

    // ─── Line mutation helpers ───
    const updateLine = (id: string, patch: Partial<TextLine>) => {
        const lines = allLinesRef.current[currentPage] || []
        setLinesForPage(currentPage, lines.map(l => (l.id === id ? { ...l, ...patch } : l)))
    }

    const undoPage = (page: number) => {
        const lines = allLinesRef.current[page] || []
        setLinesForPage(page, lines.map(l => ({
            ...l,
            text: l.originalText,
            fontSize: l.originalFontSize,
            fontKey: l.originalFontKey,
            color: '#000000',
        })))
        if (selectedId?.startsWith(`p${page}-`)) setSelectedId(null)
    }

    const clearSelection = () => setSelectedId(null)

    // ─── Font toolbar actions ───
    const measureTextWidth = (text: string, key: FontKey, cssFontSize: number): number => {
        if (!measureCtxRef.current) measureCtxRef.current = document.createElement('canvas').getContext('2d')
        const ctx = measureCtxRef.current
        if (!ctx) return 0
        const s = FONT_STYLES[key]
        ctx.font = `${s.italic ? 'italic ' : ''}${s.bold ? '700 ' : '400 '}${cssFontSize}px ${s.css}`
        return ctx.measureText(text || ' ').width
    }

    const applyFontFamily = (family: FontFamily) => {
        if (!selectedLine) return
        const s = FONT_STYLES[selectedLine.fontKey]
        updateLine(selectedLine.id, { fontKey: fontKeyFor(family, s.bold, s.italic) })
    }

    const toggleStyle = (field: 'bold' | 'italic') => {
        if (!selectedLine) return
        const s = FONT_STYLES[selectedLine.fontKey]
        if (field === 'bold') updateLine(selectedLine.id, { fontKey: fontKeyFor(s.family, !s.bold, s.italic) })
        else updateLine(selectedLine.id, { fontKey: fontKeyFor(s.family, s.bold, !s.italic) })
    }

    const stepFontSize = (delta: number) => {
        if (!selectedLine) return
        const next = Math.max(4, Math.min(96, Math.round((selectedLine.fontSize + delta) * 10) / 10))
        updateLine(selectedLine.id, { fontSize: next })
    }

    // ─── Export: compile edits back into a clean PDF ───
    const handleDownload = async () => {
        if (!pdfFile || !hasChanges || exporting) return
        setExporting(true)
        setError('')
        setExportMsg('')
        try {
            const pdfLib = await getPdfLib()
            const doc = await pdfLib.PDFDocument.load(await pdfFile.arrayBuffer())
            const pages = doc.getPages()

            let applied = 0
            for (const [pageKey, lines] of Object.entries(allLinesRef.current)) {
                const page = pages[Number(pageKey) - 1]
                if (!page) continue
                const { width: pw, height: ph } = page.getSize()

                for (const line of lines) {
                    if (!isLineEdited(line)) continue
                    applied++

                    // Cover the original glyph run with a patch matching the sampled background
                    const pad = line.originalFontSize * 0.12
                    const cover = hexToRgb(line.coverColor)
                    page.drawRectangle({
                        x: Math.max(0, line.x - pad),
                        y: Math.max(0, line.yBaseline - line.originalFontSize * 0.95 - pad),
                        width: Math.min(line.originalWidth + pad * 2, pw),
                        height: Math.min(line.originalFontSize * 1.2 + pad * 2, ph),
                        color: pdfLib.rgb(cover.r, cover.g, cover.b),
                    })

                    // Draw the replacement text on the exact original baseline
                    const newText = sanitizeForStandardFont(line.text)
                    if (newText.trim()) {
                        const font = await doc.embedFont(stdFontName(line.fontKey) as any)
                        const tint = hexToRgb(line.color)
                        page.drawText(newText, {
                            x: line.x,
                            y: line.yBaseline,
                            size: line.fontSize,
                            font,
                            color: pdfLib.rgb(tint.r, tint.g, tint.b),
                        })
                    }
                }
            }

            const pdfBytes = await doc.save()
            const blob = new Blob([pdfBytes.buffer.slice(0, pdfBytes.byteLength) as ArrayBuffer], { type: 'application/pdf' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `edited_${pdfFile.name.replace(/\.pdf$/i, '')}.pdf`
            a.click()
            URL.revokeObjectURL(url)

            if (user) {
                await supabase.from('activity_logs').insert({
                    user_id: user.id,
                    action: 'pdf_canvas_edited',
                    description: `Applied ${applied} in-line text edit(s) to ${pdfFile.name}`,
                    file_name: pdfFile.name
                })
                const { data: profile } = await supabase.from('profiles').select('storage_used').eq('id', user.id).single()
                if (profile) {
                    await supabase.from('profiles').update({
                        storage_used: (profile.storage_used || 0) + blob.size
                    }).eq('id', user.id)
                }
            }

            setExportMsg(`Compiled successfully — ${applied} edit${applied === 1 ? '' : 's'} applied.`)
        } catch (err) {
            console.error('Export failed:', err)
            setError('Failed to compile the edited PDF. Some characters or fonts may be unsupported.')
        }
        setExporting(false)
    }

    const editedPages = Object.entries(allLines)
        .map(([page, lines]) => ({ page: Number(page), count: lines.filter(isLineEdited).length }))
        .filter(p => p.count > 0)
        .sort((a, b) => a.page - b.page)

    const cssScale = zoom / 100

    // Geometry helpers (CSS pixels on the overlay)
    const lineBox = (l: TextLine) => {
        const fontSizeCss = l.fontSize * cssScale
        const boxH = fontSizeCss * 1.12
        return {
            left: l.x * cssScale,
            top: (stage!.pageH - l.yBaseline) * cssScale - fontSizeCss * 0.88,
            height: boxH,
            width: Math.max(l.width * cssScale, 24),
            fontSizeCss,
        }
    }

    return (
        <DashboardLayout>
            <FeatureLock featureName="PDF Editor">
                <div style={{ maxWidth: 1400, margin: '0 auto', paddingBottom: 60 }}>
                    {/* ─── Header ─── */}
                    <div style={{ marginBottom: 24 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
                            <div style={{
                                width: 48, height: 48, borderRadius: 14,
                                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <PenTool size={24} color="white" />
                            </div>
                            <div>
                                <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 4px 0', letterSpacing: '-0.5px' }}>
                                    PDF Canvas Editor
                                </h1>
                                <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>
                                    WYSIWYG in-line editing — click any text on the page, type your changes in place, and download a clean updated PDF.
                                </p>
                            </div>
                            {hasChanges && (
                                <button
                                    onClick={handleDownload}
                                    disabled={exporting}
                                    style={{
                                        marginLeft: 'auto', background: exporting ? 'rgba(16,185,129,0.5)' : '#10b981', color: '#fff',
                                        border: 'none', borderRadius: 10, padding: '11px 20px', fontSize: 13.5, fontWeight: 700,
                                        cursor: exporting ? 'wait' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8,
                                        boxShadow: '0 2px 10px rgba(16,185,129,0.3)'
                                    }}
                                >
                                    {exporting ? <RefreshCw size={15} className="animate-spin" /> : <FileDown size={15} />}
                                    {exporting ? 'Compiling…' : `Download Edited PDF (${editedCount})`}
                                </button>
                            )}
                        </div>
                    </div>

                    {error && (
                        <div className="alert alert-error" style={{ marginBottom: 16 }}>
                            <X size={16} /> {error}
                        </div>
                    )}
                    {exportMsg && (
                        <div className="alert alert-success" style={{ marginBottom: 16 }}>
                            <CheckCircle size={16} /> {exportMsg}
                        </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: pdfDoc ? '1fr 320px' : '1fr', gap: 20, alignItems: 'start' }}>
                        {/* ─── Canvas Workspace ─── */}
                        <div>
                            {!pdfDoc && !loading && (
                                <div className="card" style={{ borderRadius: 16, padding: '22px 24px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                        <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>1. Upload PDF</h3>
                                        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 9999, color: '#3b82f6', background: 'rgba(59,130,246,0.12)' }}>
                                            In-Line Engine
                                        </span>
                                    </div>
                                    <div
                                        className="upload-zone"
                                        onDragOver={(e) => e.preventDefault()}
                                        onDrop={handleDrop}
                                        onClick={() => fileInputRef.current?.click()}
                                        style={{ padding: '56px 16px', borderRadius: 12, cursor: 'pointer' }}
                                    >
                                        <div className="upload-icon" style={{ width: 48, height: 48, margin: '0 auto 14px' }}>
                                            <Upload size={24} />
                                        </div>
                                        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                                            Drag & Drop your PDF
                                        </div>
                                        <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginBottom: 16 }}>
                                            Text layers, positions and font metadata are extracted automatically
                                        </div>
                                        <button className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}>
                                            Browse Device
                                        </button>
                                        <input ref={fileInputRef} type="file" accept=".pdf,application/pdf" onChange={handleFileChange} style={{ display: 'none' }} />
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 18 }}>
                                        {[
                                            { icon: <MousePointerClick size={18} />, title: 'Click to Edit', desc: 'Select any text on the canvas and type directly in place.' },
                                            { icon: <Type size={18} />, title: 'Style Controls', desc: 'Change family, size, weight and color to match the document.' },
                                            { icon: <FileDown size={18} />, title: 'Clean Export', desc: 'Edits are compiled back into a standard downloadable PDF.' },
                                        ].map(f => (
                                            <div key={f.title} style={{ padding: 14, background: 'var(--bg-primary)', borderRadius: 10, border: '1px solid var(--border)' }}>
                                                <div style={{ color: '#3b82f6', marginBottom: 8 }}>{f.icon}</div>
                                                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{f.title}</div>
                                                <div style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>{f.desc}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {loading && (
                                <div className="card" style={{ minHeight: 480, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 16 }}>
                                    <div style={{ textAlign: 'center' }}>
                                        <div className="animate-spin" style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTopColor: '#3b82f6', borderRadius: '50%', margin: '0 auto 16px' }} />
                                        <p style={{ fontSize: 14, fontWeight: 600 }}>Parsing document & text layers…</p>
                                    </div>
                                </div>
                            )}

                            {pdfDoc && !loading && (
                                <div className="card" style={{ borderRadius: 16, padding: '18px 20px' }}>
                                    {/* Toolbar */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <button className="btn btn-sm btn-secondary" onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage <= 1}>
                                                <ChevronLeft size={14} />
                                            </button>
                                            <span style={{ fontSize: 13, fontWeight: 700, minWidth: 96, textAlign: 'center' }}>
                                                Page {currentPage} / {totalPages}
                                            </span>
                                            <button className="btn btn-sm btn-secondary" onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage >= totalPages}>
                                                <ChevronRight size={14} />
                                            </button>
                                        </div>

                                        {rendering ? (
                                            <div style={{
                                                display: 'inline-flex', alignItems: 'center', gap: 6,
                                                fontSize: 12, fontWeight: 700, color: '#3b82f6',
                                                background: 'rgba(59,130,246,0.1)', padding: '5px 12px', borderRadius: 9999
                                            }}>
                                                <RefreshCw size={13} className="animate-spin" />
                                                Rendering page…
                                            </div>
                                        ) : (
                                            <div style={{
                                                display: 'inline-flex', alignItems: 'center', gap: 6,
                                                fontSize: 12, fontWeight: 700, color: '#3b82f6',
                                                background: 'rgba(59,130,246,0.1)', padding: '5px 12px', borderRadius: 9999
                                            }}>
                                                <MousePointerClick size={13} />
                                                Click any text on the page to edit it in place
                                            </div>
                                        )}

                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <button className="btn btn-sm btn-secondary" onClick={() => setZoom(Math.max(50, zoom - 10))} disabled={zoom <= 50}>
                                                <ZoomOut size={14} />
                                            </button>
                                            <span style={{ fontSize: 12.5, fontWeight: 700, minWidth: 42, textAlign: 'center' }}>{zoom}%</span>
                                            <button className="btn btn-sm btn-secondary" onClick={() => setZoom(Math.min(150, zoom + 10))} disabled={zoom >= 150}>
                                                <ZoomIn size={14} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Canvas + overlay stage */}
                                    <div style={{
                                        background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 12,
                                        padding: 20, overflow: 'auto', display: 'flex', justifyContent: 'center'
                                    }}>
                                        {stage && (
                                            <div style={{ position: 'relative', flexShrink: 0 }}>
                                                <canvas ref={canvasRef} style={{ display: 'block', borderRadius: 4, boxShadow: '0 4px 18px rgba(0,0,0,0.18)', background: '#fff' }} />

                                                {/* Editable text layer */}
                                                <div
                                                    ref={overlayRef}
                                                    onClick={(e) => { if (e.target === overlayRef.current) clearSelection() }}
                                                    style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}
                                                >
                                                    {currentLines.map((line) => {
                                                        if (line.id === selectedId) return null
                                                        const box = lineBox(line)
                                                        const edited = isLineEdited(line)
                                                        return (
                                                            <div
                                                                key={line.id}
                                                                onClick={() => setSelectedId(line.id)}
                                                                title={line.originalText}
                                                                style={{
                                                                    position: 'absolute',
                                                                    left: box.left,
                                                                    top: box.top,
                                                                    width: box.width,
                                                                    height: box.height,
                                                                    cursor: 'text',
                                                                    borderRadius: 2,
                                                                    border: edited ? '1px solid rgba(16,185,129,0.7)' : '1px solid transparent',
                                                                    background: edited ? 'rgba(16,185,129,0.08)' : 'transparent',
                                                                }}
                                                                onMouseEnter={(e) => { if (!edited) { e.currentTarget.style.border = '1px dashed rgba(59,130,246,0.55)'; e.currentTarget.style.background = 'rgba(59,130,246,0.05)' } }}
                                                                onMouseLeave={(e) => { if (!edited) { e.currentTarget.style.border = '1px solid transparent'; e.currentTarget.style.background = 'transparent' } }}
                                                            />
                                                        )
                                                    })}

                                                    {/* Selected line: in-place editor + floating style toolbar */}
                                                    {selectedLine && (() => {
                                                        const box = lineBox(selectedLine)
                                                        const s = FONT_STYLES[selectedLine.fontKey]
                                                        const autoWidth = Math.max(box.width, measureTextWidth(selectedLine.text, selectedLine.fontKey, box.fontSizeCss) + 12)
                                                        const toolbarTop = Math.max(-46, box.top - 46)
                                                        return (
                                                            <>
                                                                <input
                                                                    autoFocus
                                                                    value={selectedLine.text}
                                                                    onChange={(e) => updateLine(selectedLine.id, { text: e.target.value })}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); clearSelection() }
                                                                    }}
                                                                    style={{
                                                                        position: 'absolute',
                                                                        left: box.left,
                                                                        top: box.top,
                                                                        width: autoWidth,
                                                                        height: box.height,
                                                                        lineHeight: `${box.height}px`,
                                                                        padding: 0,
                                                                        margin: 0,
                                                                        border: '1.5px solid #3b82f6',
                                                                        borderRadius: 3,
                                                                        outline: 'none',
                                                                        background: 'rgba(255,255,255,0.92)',
                                                                        color: selectedLine.color,
                                                                        fontFamily: s.css,
                                                                        fontWeight: s.bold ? 700 : 400,
                                                                        fontStyle: s.italic ? 'italic' : 'normal',
                                                                        fontSize: box.fontSizeCss,
                                                                        boxShadow: '0 0 0 3px rgba(59,130,246,0.2)',
                                                                        caretColor: selectedLine.color,
                                                                    }}
                                                                />
                                                                {/* Floating font toolbar */}
                                                                <div
                                                                    style={{
                                                                        position: 'absolute',
                                                                        left: Math.max(0, Math.min(box.left, stage.cssW - 330)),
                                                                        top: toolbarTop,
                                                                        display: 'flex', alignItems: 'center', gap: 4,
                                                                        background: '#111827', borderRadius: 8, padding: '6px 8px',
                                                                        boxShadow: '0 6px 20px rgba(0,0,0,0.35)', zIndex: 20,
                                                                        flexWrap: 'nowrap'
                                                                    }}
                                                                >
                                                                    <select
                                                                        value={s.family}
                                                                        onChange={(e) => applyFontFamily(e.target.value as FontFamily)}
                                                                        style={{
                                                                            background: '#1f2937', color: '#fff', border: '1px solid #374151',
                                                                            borderRadius: 5, fontSize: 11.5, padding: '3px 6px', outline: 'none', cursor: 'pointer'
                                                                        }}
                                                                    >
                                                                        <option value="sans">Sans — Helvetica</option>
                                                                        <option value="serif">Serif — Times</option>
                                                                        <option value="mono">Mono — Courier</option>
                                                                    </select>

                                                                    <button onClick={() => stepFontSize(-1)} title="Decrease size" style={tbBtn}>
                                                                        <span style={{ fontSize: 11, fontWeight: 800 }}>A−</span>
                                                                    </button>
                                                                    <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', minWidth: 28, textAlign: 'center' }}>
                                                                        {Math.round(selectedLine.fontSize)}
                                                                    </span>
                                                                    <button onClick={() => stepFontSize(1)} title="Increase size" style={tbBtn}>
                                                                        <span style={{ fontSize: 13, fontWeight: 800 }}>A+</span>
                                                                    </button>

                                                                    <button
                                                                        onClick={() => toggleStyle('bold')}
                                                                        title="Bold"
                                                                        style={{ ...tbBtn, background: s.bold ? '#3b82f6' : 'transparent', color: s.bold ? '#fff' : '#d1d5db' }}
                                                                    >
                                                                        <Bold size={13} />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => toggleStyle('italic')}
                                                                        title="Italic"
                                                                        style={{ ...tbBtn, background: s.italic ? '#3b82f6' : 'transparent', color: s.italic ? '#fff' : '#d1d5db' }}
                                                                    >
                                                                        <Italic size={13} />
                                                                    </button>

                                                                    <label title="Text color" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer', padding: '0 2px' }}>
                                                                        <Palette size={13} color="#d1d5db" />
                                                                        <input
                                                                            type="color"
                                                                            value={selectedLine.color}
                                                                            onChange={(e) => updateLine(selectedLine.id, { color: e.target.value })}
                                                                            style={{ width: 20, height: 20, padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}
                                                                        />
                                                                    </label>

                                                                    <button onClick={() => updateLine(selectedLine.id, { text: '' })} title="Clear text" style={tbBtn}>
                                                                        <Eraser size={13} />
                                                                    </button>
                                                                    <button onClick={() => undoPage(currentPage)} title="Undo all edits on this page" style={tbBtn}>
                                                                        <Undo2 size={13} />
                                                                    </button>
                                                                    <button onClick={clearSelection} title="Done" style={tbBtn}>
                                                                        <CheckCircle size={13} />
                                                                    </button>
                                                                </div>
                                                            </>
                                                        )
                                                    })()}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <p style={{ fontSize: 11.5, color: 'var(--text-muted)', margin: '12px 2px 0' }}>
                                        Edited lines keep their exact position on the document — unselected text, images and backgrounds are never touched.
                                        Press <strong>Enter</strong> or click away to commit an edit.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* ─── Right Panel ─── */}
                        {pdfDoc && !loading && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                {/* Selection status / styling */}
                                <div className="card" style={{ borderRadius: 14, padding: '18px 20px' }}>
                                    <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 12 }}>
                                        Text Styling
                                    </h3>
                                    {selectedLine ? (
                                        <div>
                                            <div style={{
                                                fontSize: 12.5, color: 'var(--text-secondary)', background: 'var(--bg-primary)',
                                                border: '1px solid var(--border)', borderRadius: 8, padding: 10,
                                                maxHeight: 64, overflow: 'hidden', marginBottom: 12, lineHeight: 1.5, fontStyle: 'italic'
                                            }}>
                                                {selectedLine.text || '(empty — original text will be removed)'}
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
                                                <div style={{ color: 'var(--text-muted)' }}>Family: <strong style={{ color: 'var(--text-primary)' }}>{FONT_STYLES[selectedLine.fontKey].family}</strong></div>
                                                <div style={{ color: 'var(--text-muted)' }}>Size: <strong style={{ color: 'var(--text-primary)' }}>{selectedLine.fontSize.toFixed(1)} pt</strong></div>
                                            </div>
                                            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '10px 0 0' }}>
                                                Use the floating toolbar on the canvas to restyle this line.
                                            </p>
                                        </div>
                                    ) : (
                                        <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
                                            Click a text segment on the page canvas to select it. A bounding box with font controls will appear right above it.
                                        </p>
                                    )}
                                </div>

                                {/* Edits summary */}
                                <div className="card" style={{ borderRadius: 14, padding: '18px 20px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                        <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', margin: 0 }}>
                                            Edits Summary
                                        </h3>
                                        <span style={{
                                            fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 9999,
                                            background: hasChanges ? 'rgba(16,185,129,0.12)' : 'var(--bg-primary)',
                                            color: hasChanges ? '#10b981' : 'var(--text-muted)'
                                        }}>
                                            {editedCount} change{editedCount === 1 ? '' : 's'}
                                        </span>
                                    </div>

                                    {editedPages.length === 0 ? (
                                        <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', margin: 0 }}>
                                            No edits yet. Your changes will be listed here per page.
                                        </p>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                            {editedPages.map(p => (
                                                <div key={p.page} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg-primary)', borderRadius: 8, border: '1px solid var(--border)' }}>
                                                    <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)' }}>
                                                        Page {p.page} · {p.count} edit{p.count === 1 ? '' : 's'}
                                                    </span>
                                                    <button
                                                        onClick={() => undoPage(p.page)}
                                                        style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                                    >
                                                        <Undo2 size={12} /> Reset
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Export */}
                                <div className="card" style={{ borderRadius: 14, padding: '18px 20px' }}>
                                    <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 12 }}>
                                        <Sparkles size={12} style={{ marginRight: 4 }} /> Seamless Export
                                    </h3>
                                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 12px', lineHeight: 1.6 }}>
                                        The document is recompiled with your in-line changes — original layout, images and untouched text are preserved byte-for-byte.
                                    </p>
                                    <button
                                        className="btn btn-primary"
                                        onClick={handleDownload}
                                        disabled={!hasChanges || exporting}
                                        style={{ width: '100%', padding: '12px', borderRadius: 10, justifyContent: 'center' }}
                                    >
                                        {exporting ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
                                        {exporting ? 'Compiling…' : 'Download Edited PDF'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </FeatureLock>
        </DashboardLayout>
    )
}

// floating toolbar button base style
const tbBtn: React.CSSProperties = {
    width: 26, height: 26, borderRadius: 5, border: 'none', cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    background: 'transparent', color: '#d1d5db', padding: 0
}
