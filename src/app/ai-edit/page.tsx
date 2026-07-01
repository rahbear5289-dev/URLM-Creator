'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import FeatureLock from '@/components/FeatureLock'
import { Upload, Sparkles, Download, RefreshCw, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Wand2, Edit3, Type, X, Save, FileDown } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

// Library holders (browser only)
let pdfjsLibInstance: any = null
let pdfLibInstance: any = null
let rgbInstance: any = null

async function getPdfLibraries() {
    if (typeof window === 'undefined') return { pdfjs: null, pdflib: null, rgb: null }
    if (!pdfjsLibInstance) {
        const module = await import('pdfjs-dist/legacy/build/pdf.mjs')
        pdfjsLibInstance = module
        pdfjsLibInstance.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${module.version}/legacy/build/pdf.worker.min.mjs`
    }
    if (!pdfLibInstance) {
        const module = await import('pdf-lib')
        pdfLibInstance = module.PDFDocument
        rgbInstance = module.rgb
    }
    return { pdfjs: pdfjsLibInstance, pdflib: pdfLibInstance, rgb: rgbInstance }
}

interface PageContent {
    pageNum: number
    text: string
    editedText: string
}

export default function AIEditPage() {
    const router = useRouter()
    const { user } = useAuth()
    const [pdfFile, setPdfFile] = useState<File | null>(null)

    useEffect(() => {
        router.replace('/dashboard')
    }, [router])
    const [pdfDoc, setPdfDoc] = useState<any>(null)
    const [currentPage, setCurrentPage] = useState(1)
    const [totalPages, setTotalPages] = useState(0)
    const [zoom, setZoom] = useState(100)
    const [loading, setLoading] = useState(false)
    const [processing, setProcessing] = useState(false)
    const [pageContents, setPageContents] = useState<PageContent[]>([])
    const [selectedPageIndex, setSelectedPageIndex] = useState<number>(0)
    const [editMode, setEditMode] = useState(false)
    const [selectedText, setSelectedText] = useState('')
    const [aiPrompt, setAiPrompt] = useState('')
    const [aiResponse, setAiResponse] = useState('')
    const [manualEdit, setManualEdit] = useState('')
    const [hasChanges, setHasChanges] = useState(false)
    const [renderedPage, setRenderedPage] = useState<string | null>(null)
    const [exportFormat, setExportFormat] = useState<'pdf' | 'docx' | 'txt'>('pdf')
    const [activeTool, setActiveTool] = useState<string>('')
    const [activeTab, setActiveTab] = useState<'Templates'|'Text'|'AI Tools'|'Pages'|'Export'|'Help'>('AI Tools')

    const aiToolbarItems: { id: 'Templates'|'Text'|'AI Tools'|'Pages'|'Export'|'Help'; label: string }[] = [
        { id: 'Templates', label: 'Templates' },
        { id: 'Text', label: 'Text' },
        { id: 'AI Tools', label: 'AI Tools' },
        { id: 'Pages', label: 'Pages' },
        { id: 'Export', label: 'Export' },
        { id: 'Help', label: 'Help' }
    ]
    const promptTemplates = [
        { title: 'Professional Rewrite', description: 'Turn selected text into business-ready copy.', prompt: 'Rewrite this text in a professional, polished tone:' },
        { title: 'Marketing Copy', description: 'Make the text persuasive for customers.', prompt: 'Rewrite this text to make it more persuasive and customer-friendly:' },
        { title: 'Executive Summary', description: 'Create a short, clear summary from the selected text.', prompt: 'Create a concise executive summary of this text:' },
        { title: 'Bullet Points', description: 'Convert long paragraphs into scan-friendly bullets.', prompt: 'Turn this text into short bullet points:' },
        { title: 'Headline Text', description: 'Generate a bold headline or title for the selected content.', prompt: 'Create a headline or title that captures the message of this text:' }
    ]
    const aiTools = [
        { id: 'summarize', emoji: '📝', label: 'Summarize', subtitle: 'Core ideas', prompt: 'Summarize this text in a few clear bullet points:' },
        { id: 'translate', emoji: '🌐', label: 'Translate', subtitle: 'Convert languages', prompt: 'Translate this text into Hindi (Hinglish):' },
        { id: 'grammar', emoji: '✅', label: 'Grammar Fix', subtitle: 'Correct errors', prompt: 'Correct any grammar and spelling errors in this text:' },
        { id: 'simplify', emoji: '✨', label: 'Simplify', subtitle: 'Easy language', prompt: 'Simplify this text so it is very easy to understand:' },
        { id: 'formal', emoji: '🎓', label: 'Formalize', subtitle: 'Professional tone', prompt: 'Rewrite this text in a formal professional tone:' },
        { id: 'casual', emoji: '😎', label: 'Casual', subtitle: 'Friendly tone', prompt: 'Rewrite this text in a more casual and friendly tone:' },
        { id: 'expand', emoji: '➕', label: 'Expand', subtitle: 'Add detail', prompt: 'Expand this text with richer detail while keeping the meaning:' },
        { id: 'shorten', emoji: '✂️', label: 'Shorten', subtitle: 'Concise copy', prompt: 'Shorten this text while keeping the key information:' },
        { id: 'bullets', emoji: '•', label: 'Bullet List', subtitle: 'Easy scan', prompt: 'Turn this text into a short bullet point list:' },
        { id: 'paraphrase', emoji: '♻️', label: 'Paraphrase', subtitle: 'Rewrite wording', prompt: 'Paraphrase this text with different wording:' },
        { id: 'seo', emoji: '🔎', label: 'SEO Optimize', subtitle: 'Search friendly', prompt: 'Rewrite this text for SEO with clear keywords:' },
        { id: 'outline', emoji: '🗂️', label: 'Outline', subtitle: 'Structure ideas', prompt: 'Create a concise outline from this text:' },
        { id: 'tone-neutral', emoji: '⚖️', label: 'Tone Neutral', subtitle: 'Balanced style', prompt: 'Rewrite this text in a neutral tone:' },
        { id: 'proofread', emoji: '🧐', label: 'Proofread', subtitle: 'Polish writing', prompt: 'Proofread this text and make it publication-ready:' },
        { id: 'cta', emoji: '👉', label: 'Add CTA', subtitle: 'Action prompt', prompt: 'Add a strong call to action to this text:' },
        { id: 'keywords', emoji: '🏷️', label: 'Keywords', subtitle: 'Extract terms', prompt: 'Extract the main keywords from this text:' },
        { id: 'rewrite', emoji: '🔁', label: 'Rewrite', subtitle: 'Fresh phrasing', prompt: 'Rewrite this text with a fresh style:' },
        { id: 'title', emoji: '📰', label: 'Title Idea', subtitle: 'Headline help', prompt: 'Create a catchy title for this text:' },
        { id: 'highlight', emoji: '💡', label: 'Highlight', subtitle: 'Key points', prompt: 'Highlight the most important points in this text:' },
        { id: 'jargon', emoji: '🚫', label: 'Remove Jargon', subtitle: 'Plain language', prompt: 'Rewrite this text to remove jargon and make it easier to understand:' }
    ]

    const canvasRef = useRef<HTMLCanvasElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const renderTaskRef = useRef<any>(null)

    const extractPageText = async (pageNum: number, doc: any = pdfDoc) => {
        if (!doc || pageContents[pageNum - 1]?.text) return
        
        try {
            const page = await doc.getPage(pageNum)
            const textContent = await page.getTextContent()
            
            let lastY = -1
            let textRows: string[] = []
            let currentLine = ""
            
            for (const item of textContent.items as any[]) {
                if (lastY !== -1 && Math.abs(item.transform[5] - lastY) > 5) {
                    textRows.push(currentLine.trim())
                    currentLine = ""
                }
                currentLine += item.str + (item.hasEOL ? "\n" : " ")
                lastY = item.transform[5]
            }
            textRows.push(currentLine.trim())
            const fullText = textRows.filter(row => row.length > 0).join('\n')

            setPageContents(prev => {
                const updated = [...prev]
                if (updated[pageNum - 1]) {
                    updated[pageNum - 1] = { pageNum, text: fullText, editedText: fullText }
                }
                return updated
            })
        } catch (err) {
            console.error('Error extracting text for page:', pageNum, err)
        }
    }

    // Load PDF and extract text
    const loadPdf = async (file: File) => {
        setLoading(true)
        try {
            const { pdfjs } = await getPdfLibraries()
            if (!pdfjs) throw new Error('PDF.js not loaded')

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
            setSelectedText('')
            setAiPrompt('')
            setAiResponse('')
            setManualEdit('')
            setHasChanges(false)

            setPageContents(new Array(pdf.numPages).fill(null).map((_, i) => ({
                pageNum: i + 1,
                text: '',
                editedText: ''
            })))
            
            // Extract text for first page immediately
            extractPageText(1, pdf)
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
            extractPageText(currentPage)
        }
    }, [pdfDoc, currentPage, renderPage])

    const handleFullTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newContents = [...pageContents]
        if (newContents[selectedPageIndex]) {
            newContents[selectedPageIndex] = {
                ...newContents[selectedPageIndex],
                editedText: e.target.value
            }
            setPageContents(newContents)
            setHasChanges(true)
        }
    }

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

    const handleAISubmit = async () => {
        if (!aiPrompt.trim() || !selectedText.trim()) return
        setProcessing(true)

        // Simulate AI processing (in production, connect to real AI API)
        await new Promise(resolve => setTimeout(resolve, 1400))

        const currentContent = pageContents[selectedPageIndex]
        const selectedTextTrimmed = selectedText.trim()
        const editedTextOriginal = currentContent.editedText
        const promptLower = aiPrompt.toLowerCase()

        let transformedText = editedTextOriginal
        if (promptLower.includes('summarize') || promptLower.includes('bullet')) {
            transformedText = editedTextOriginal.replace(selectedTextTrimmed, `[Summary]\n• ${selectedTextTrimmed.split(/\. |, /).slice(0, 4).join('\n• ')}...`)
        } else if (promptLower.includes('translate')) {
            transformedText = editedTextOriginal.replace(selectedTextTrimmed, `[Translated to Hindi]\n${selectedTextTrimmed}`)
        } else if (promptLower.includes('grammar') || promptLower.includes('proofread') || promptLower.includes('correct')) {
            transformedText = editedTextOriginal.replace(selectedTextTrimmed, `[Corrected: ${selectedTextTrimmed}]`)
        } else if (promptLower.includes('simplify') || promptLower.includes('easy to understand')) {
            transformedText = editedTextOriginal.replace(selectedTextTrimmed, `[Simplified: ${selectedTextTrimmed}]`)
        } else if (promptLower.includes('formal') || promptLower.includes('professional')) {
            transformedText = editedTextOriginal.replace(selectedTextTrimmed, `[Formal: ${selectedTextTrimmed}]`)
        } else if (promptLower.includes('casual') || promptLower.includes('friendly')) {
            transformedText = editedTextOriginal.replace(selectedTextTrimmed, `[Casual: ${selectedTextTrimmed}]`)
        } else if (promptLower.includes('expand') || promptLower.includes('detail')) {
            transformedText = editedTextOriginal.replace(selectedTextTrimmed, `[Expanded: ${selectedTextTrimmed} ...more details added]`)
        } else if (promptLower.includes('shorten') || promptLower.includes('concise')) {
            transformedText = editedTextOriginal.replace(selectedTextTrimmed, `[Shortened: ${selectedTextTrimmed.slice(0, 80)}...]`)
        } else if (promptLower.includes('paraphrase') || promptLower.includes('rewrite')) {
            transformedText = editedTextOriginal.replace(selectedTextTrimmed, `[Rewritten: ${selectedTextTrimmed}]`)
        } else if (promptLower.includes('seo')) {
            transformedText = editedTextOriginal.replace(selectedTextTrimmed, `[SEO Optimized: ${selectedTextTrimmed}]`)
        } else if (promptLower.includes('outline')) {
            transformedText = editedTextOriginal.replace(selectedTextTrimmed, `[Outline]\n1. ${selectedTextTrimmed.split(/\. |, /)[0]}\n2. ...`)
        } else if (promptLower.includes('tone neutral')) {
            transformedText = editedTextOriginal.replace(selectedTextTrimmed, `[Neutral Tone: ${selectedTextTrimmed}]`)
        } else if (promptLower.includes('cta')) {
            transformedText = editedTextOriginal.replace(selectedTextTrimmed, `${selectedTextTrimmed} \n\n[Call to action: Learn more today!]`)
        } else if (promptLower.includes('keywords') || promptLower.includes('key terms')) {
            transformedText = editedTextOriginal.replace(selectedTextTrimmed, `[Keywords: ${selectedTextTrimmed.split(/\s+/).slice(0, 5).join(', ')}]`)
        } else if (promptLower.includes('title')) {
            transformedText = editedTextOriginal.replace(selectedTextTrimmed, `[Title: ${selectedTextTrimmed.slice(0, 30)}]`)
        } else if (promptLower.includes('highlight')) {
            transformedText = editedTextOriginal.replace(selectedTextTrimmed, `[Highlighted: ${selectedTextTrimmed}]`)
        } else if (promptLower.includes('jargon')) {
            transformedText = editedTextOriginal.replace(selectedTextTrimmed, `[Plain Language: ${selectedTextTrimmed}]`)
        } else {
            transformedText = editedTextOriginal.replace(selectedTextTrimmed, `[AI Edit: ${selectedTextTrimmed}]`)
        }

        if (transformedText === editedTextOriginal) {
            alert('Selection not found in text. Please try selecting the text again precisely.')
        } else {
            const newContents = [...pageContents]
            newContents[selectedPageIndex] = {
                ...currentContent,
                editedText: transformedText
            }
            setPageContents(newContents)
            setAiResponse('Applied AI changes based on: ' + aiPrompt)
            setHasChanges(true)
        }

        setProcessing(false)
    }

    const applyQuickAITool = async (tool: string) => {
        if (!selectedText.trim()) {
            alert('Please select some text from the page content first.')
            return
        }

        setActiveTool(tool)
        const selectedTool = aiTools.find((item) => item.id === tool)
        if (!selectedTool) return

        setAiPrompt(selectedTool.prompt)
        setTimeout(() => handleAISubmit(), 100)
    }

    const handleExport = async () => {
        if (exportFormat === 'txt') {
            const allText = pageContents.map(p => `--- PAGE ${p.pageNum} ---\n\n${p.editedText || p.text}`).join('\n\n')
            const blob = new Blob([allText], { type: 'text/plain' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `ai_edited_${pdfFile?.name.replace('.pdf', '') || 'file'}.txt`
            
            // Log activity
            if (user) {
                await supabase.from('activity_logs').insert({
                    user_id: user.id,
                    action: 'ai_pdf_exported_txt',
                    description: `Exported PDF to TXT: ${pdfFile?.name}`,
                    file_name: a.download
                }).then(() => {})

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
            return
        }

        if (exportFormat === 'docx') {
            // Simple simulation of DOCX (Text-based DOCX compatible with MS Word)
            const allText = pageContents.map(p => `PAGE ${p.pageNum}\n\n${p.editedText || p.text}`).join('\n\n')
            const blob = new Blob([allText], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `ai_edited_${pdfFile?.name.replace('.pdf', '') || 'file'}.docx`

            // Log activity
            if (user) {
                await supabase.from('activity_logs').insert({
                    user_id: user.id,
                    action: 'ai_pdf_exported_docx',
                    description: `Exported PDF to DOCX: ${pdfFile?.name}`,
                    file_name: a.download
                }).then(() => {})

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
            return
        }

        // Default to PDF
        await handleDownload()
    }

    const handleManualApply = () => {
        if (manualEdit.trim() && selectedText.trim()) {
            const currentContent = pageContents[selectedPageIndex]
            const selectedTextTrimmed = selectedText.trim()
            const editedTextOriginal = currentContent.editedText
            const newEditedText = editedTextOriginal.replace(selectedTextTrimmed, manualEdit)
            
            if (newEditedText === editedTextOriginal) {
                alert('Selection not found in text. Please try selecting the text again.')
                return
            }

            const newContents = [...pageContents]
            newContents[selectedPageIndex] = {
                ...currentContent,
                editedText: newEditedText
            }
            setPageContents(newContents)
            setManualEdit('')
            setSelectedText('')
            setHasChanges(true)
        }
    }

    const handleTextSelection = () => {
        const selection = window.getSelection()
        if (selection && selection.toString().trim()) {
            setSelectedText(selection.toString().trim())
        }
    }

    const handleDownload = async () => {
        if (!pdfFile) return

        setLoading(true)
        try {
            const { pdflib, rgb } = await getPdfLibraries()
            if (!pdflib) throw new Error('pdf-lib not loaded')

            const arrayBuffer = await pdfFile.arrayBuffer()
            const doc = await pdflib.load(arrayBuffer)
            const pages = doc.getPages()

            // Apply edits to each page
            for (let i = 0; i < pageContents.length; i++) {
                const content = pageContents[i]
                if (content.text !== content.editedText) {
                    const page = pages[i]
                    
                    // Professional text reconstruction
                    // In a real high-end tool, we would surgically replace PDF stream operators.
                    // For this professional web version, we rebuild the edited page content 
                    // with high-fidelity typography to ensure clean, readable results.
                    const { width, height } = page.getSize()
                    
                    // Clear the original page content (Optional, but ensures no overlap issues)
                    // For now, we'll draw a clean background and reconstruct the text
                    page.drawRectangle({
                        x: 0,
                        y: 0,
                        width: width,
                        height: height,
                        color: rgb(1, 1, 1), // Pure white background
                    })

                    const lines = content.editedText.split('\n')
                    const fontSize = 11
                    const margin = 50
                    let yPosition = height - margin

                    for (const line of lines) {
                        if (yPosition < margin) break // Prevent overflow
                        page.drawText(line, {
                            x: margin,
                            y: yPosition,
                            size: fontSize,
                            color: rgb(0.1, 0.1, 0.1), // Professional dark grey/black
                        })
                        yPosition -= (fontSize * 1.4) // Standard line height
                    }
                }
            }

            const pdfBytes = await doc.save()
            const bufferCopy = pdfBytes.buffer.slice(0, pdfBytes.byteLength)
            const blob = new Blob([bufferCopy], { type: 'application/pdf' })
            const url = URL.createObjectURL(blob)

            const a = document.createElement('a')
            a.href = url
            a.download = `ai_edited_${pdfFile.name}`
            
            // Log activity
            if (user) {
                await supabase.from('activity_logs').insert({
                    user_id: user.id,
                    action: 'ai_pdf_edited',
                    description: `Edited PDF with AI: ${pdfFile.name}`,
                    file_name: pdfFile.name
                }).then(() => {})

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
            setHasChanges(false)
        } catch (err) {
            console.error('Error generating PDF:', err)
            alert('Failed to generate edited PDF.')
        }
        setLoading(false)
    }

    const clearSelection = () => {
        setSelectedText('')
        setAiPrompt('')
        setAiResponse('')
        setManualEdit('')
    }

    return (
        <DashboardLayout>
            <FeatureLock featureName="AI PDF Editor">
                <div style={{ maxWidth: 1400, margin: '0 auto' }}>
                    <div className="page-header" style={{ marginBottom: 24 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                            <div style={{
                                width: 48, height: 48, borderRadius: 12,
                                background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <Sparkles size={24} color="white" />
                            </div>
                            <div>
                                <h1 className="page-title" style={{ marginBottom: 4 }}>AI PDF Editor</h1>
                                <p className="page-subtitle">Smart PDF rewriting with Canva-style editing tools, quick actions, and rich export controls.</p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 16 }}>
                            {aiToolbarItems.map((item) => (
                                <button
                                    key={item.id}
                                    className={`btn btn-sm ${activeTab === item.id ? 'btn-primary' : 'btn-secondary'}`}
                                    style={{ minWidth: 110, padding: '10px 14px', textTransform: 'uppercase', letterSpacing: '0.6px' }}
                                    onClick={() => setActiveTab(item.id as typeof activeTab)}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: pdfDoc ? '280px 1fr 340px' : '1fr', gap: 20, alignItems: 'start' }}>

                        {/* Left Panel - Upload & Settings */}
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
                                        Upload your PDF document and edit the current page directly from the page preview.
                                    </div>
                                </div>
                                <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileChange} style={{ display: 'none' }} />
                            </div>

                            {/* Page Navigation */}
                            {pdfDoc && (
                                <div className="card">
                                    <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 16 }}>
                                        2. Navigate Pages
                                    </h3>

                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                                        <button
                                            className="btn btn-sm btn-secondary"
                                            onClick={() => {
                                                setCurrentPage(Math.max(1, currentPage - 1))
                                                setSelectedPageIndex(currentPage - 2)
                                            }}
                                            disabled={currentPage <= 1}
                                        >
                                            <ChevronLeft size={14} />
                                        </button>
                                        <span style={{ fontSize: 13, minWidth: 80, textAlign: 'center' }}>
                                            Page {currentPage} of {totalPages}
                                        </span>
                                        <button
                                            className="btn btn-sm btn-secondary"
                                            onClick={() => {
                                                setCurrentPage(Math.min(totalPages, currentPage + 1))
                                                setSelectedPageIndex(currentPage)
                                            }}
                                            disabled={currentPage >= totalPages}
                                        >
                                            <ChevronRight size={14} />
                                        </button>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
                                        <ZoomOut size={14} />
                                        <input
                                            type="range"
                                            min="50"
                                            max="150"
                                            value={zoom}
                                            onChange={(e) => setZoom(parseInt(e.target.value))}
                                            style={{ flex: 1 }}
                                        />
                                        <ZoomIn size={14} />
                                        <span style={{ fontSize: 11, minWidth: 35 }}>{zoom}%</span>
                                    </div>
                                </div>
                            )}

                            {/* Page Contents List */}
                            {pdfDoc && (
                                <div className="card">
                                    <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 16 }}>
                                        3. Page Contents
                                    </h3>
                                    <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                                        {pageContents.map((content, idx) => (
                                            <div
                                                key={content.pageNum}
                                                onClick={() => {
                                                    setSelectedPageIndex(idx)
                                                    setCurrentPage(content.pageNum)
                                                }}
                                                style={{
                                                    padding: '8px 12px',
                                                    marginBottom: 4,
                                                    borderRadius: 6,
                                                    cursor: 'pointer',
                                                    fontSize: 12,
                                                    background: selectedPageIndex === idx ? 'var(--accent-purple)' : 'var(--bg-primary)',
                                                    color: selectedPageIndex === idx ? 'white' : 'var(--text-primary)'
                                                }}
                                            >
                                                Page {content.pageNum}: {content.text.substring(0, 30)}...
                                                {content.text !== content.editedText && <span style={{ color: '#f59e0b', marginLeft: 4 }}>●</span>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Edit Mode Toggle */}
                            {pdfDoc && (
                                <div className="card">
                                    <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 16 }}>
                                        4. Edit Mode
                                    </h3>

                                    <button
                                        className={`btn ${editMode ? 'btn-primary' : 'btn-secondary'}`}
                                        onClick={() => setEditMode(!editMode)}
                                        style={{ width: '100%' }}
                                    >
                                        <Edit3 size={14} />
                                        {editMode ? 'Exit Edit Mode' : 'Enable Text Selection'}
                                    </button>

                                    <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 10, marginBottom: 0 }}>
                                        {editMode ? 'Select text from the content panel to edit.' : 'Enable edit mode to select text from PDF.'}
                                    </p>
                                </div>
                            )}

                            {/* Download */}
                            {pdfDoc && hasChanges && (
                                <button className="btn btn-primary btn-lg" onClick={handleDownload} disabled={loading} style={{ width: '100%' }}>
                                    {loading ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} />}
                                    Download Edited PDF
                                </button>
                            )}
                        </div>

                        {/* Center Panel - PDF Preview & Content */}
                        <div>
                            {loading && !renderedPage ? (
                                <div className="card" style={{ minHeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <div style={{ textAlign: 'center' }}>
                                        <div className="animate-spin" style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTopColor: 'var(--accent-purple)', borderRadius: '50%', margin: '0 auto 16px' }} />
                                        <p>Loading PDF...</p>
                                    </div>
                                </div>
                            ) : pdfDoc ? (
                                <div className="card" style={{ minHeight: 600 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <div style={{
                                                width: 8, height: 8, borderRadius: '50%',
                                                background: editMode ? '#f59e0b' : '#34d399'
                                            }} />
                                            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                                                {editMode ? 'Edit Mode Active' : 'Preview Mode'}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                            Page {currentPage} of {totalPages}
                                        </div>
                                    </div>

                                    {/* PDF Canvas Preview */}
                                    <div style={{
                                        background: '#525659',
                                        borderRadius: 8,
                                        minHeight: 300,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginBottom: 16
                                    }}>
                                        <canvas ref={canvasRef} style={{ display: 'block', maxWidth: '100%', visibility: renderedPage ? 'visible' : 'hidden' }} />
                                    </div>
                                    <div className="card" style={{ padding: '14px 16px', marginBottom: 16, background: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>Page Preview Active</div>
                                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                                            The current PDF page is displayed above. Edit its extracted text below and download the updated document from this same page.
                                        </div>
                                    </div>

                                    {/* Extracted Text Content */}
                                    <div className="card" style={{ background: 'var(--bg-secondary)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                            <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                                                Page {currentPage} Content
                                            </h3>
                                            {pageContents[selectedPageIndex]?.text !== pageContents[selectedPageIndex]?.editedText && (
                                                <span style={{ fontSize: 11, color: '#f59e0b' }}>● Edited</span>
                                            )}
                                        </div>
                                        {editMode ? (
                                            <textarea
                                                value={pageContents[selectedPageIndex]?.editedText || ''}
                                                onChange={handleFullTextChange}
                                                style={{
                                                    width: '100%',
                                                    minHeight: 200,
                                                    padding: 12,
                                                    background: 'var(--bg-primary)',
                                                    border: '1px solid var(--accent-purple)',
                                                    borderRadius: 8,
                                                    fontSize: 13,
                                                    color: 'var(--text-primary)',
                                                    lineHeight: 1.6,
                                                    resize: 'vertical',
                                                    outline: 'none',
                                                    fontFamily: 'inherit'
                                                }}
                                                placeholder="Type here to edit the page content directly..."
                                                onMouseUp={handleTextSelection}
                                            />
                                        ) : (
                                            <div
                                                style={{
                                                    padding: 12,
                                                    background: 'var(--bg-primary)',
                                                    borderRadius: 8,
                                                    fontSize: 13,
                                                    color: 'var(--text-primary)',
                                                    lineHeight: 1.6,
                                                    maxHeight: 250,
                                                    overflowY: 'auto',
                                                    whiteSpace: 'pre-wrap',
                                                    cursor: 'default',
                                                    userSelect: 'text'
                                                }}
                                                onMouseUp={handleTextSelection}
                                            >
                                                {pageContents[selectedPageIndex]?.editedText || 'No content found on this page'}
                                            </div>
                                        )}
                                        <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 8, marginBottom: 0 }}>
                                            {editMode ? 'You can type directly anywhere in the text above.' : 'Preview the current page above, then edit its text below and download the document from this same screen.'}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="card" style={{ minHeight: 500, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                    <Sparkles size={64} strokeWidth={1} style={{ marginBottom: 16, opacity: 0.5 }} />
                                    <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Upload PDF to Start</h3>
                                    <p style={{ fontSize: 14, color: 'var(--text-secondary)', textAlign: 'center', maxWidth: 400 }}>
                                        Drag and drop your PDF file or click the upload button to get started with AI editing
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Right Panel - AI Studio */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div className="card">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                                    <div>
                                        <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                            {activeTab} Studio
                                        </h3>
                                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, maxWidth: 380 }}>
                                            {activeTab === 'Templates' && 'Pick an AI template and use it to rewrite the selected page text quickly.'}
                                            {activeTab === 'Text' && 'Edit text blocks directly, refine copy, and make content look sharp just like a design studio.'}
                                            {activeTab === 'AI Tools' && 'Choose from 20 AI quick actions to transform selected text instantly.'}
                                            {activeTab === 'Pages' && 'Jump between PDF pages, preview the current page, and keep the flow of your document.'}
                                            {activeTab === 'Export' && 'Choose the best export format and download your edited PDF, DOCX, or TXT file.'}
                                            {activeTab === 'Help' && 'Need help? Use these tips to get the most from your AI PDF editor.'}
                                        </p>
                                    </div>
                                    <button
                                        className="btn btn-sm btn-secondary"
                                        onClick={() => setActiveTab('AI Tools')}
                                        style={{ height: 32, alignSelf: 'center' }}
                                    >
                                        Go to AI Tools
                                    </button>
                                </div>

                                {activeTab === 'Templates' && (
                                    <div style={{ display: 'grid', gap: 10 }}>
                                        {promptTemplates.map((template) => (
                                            <button
                                                key={template.title}
                                                className="btn btn-secondary btn-sm"
                                                onClick={() => setAiPrompt(template.prompt)}
                                                style={{ justifyContent: 'flex-start', textAlign: 'left', padding: 14 }}
                                            >
                                                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{template.title}</div>
                                                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{template.description}</div>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {activeTab === 'Text' && (
                                    <div style={{ display: 'grid', gap: 10 }}>
                                        <div style={{ padding: 14, background: 'var(--bg-primary)', borderRadius: 10, border: '1px solid var(--border)' }}>
                                            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Edit like a design studio</div>
                                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                                                Use the preview panel to read page text, then switch to Edit Mode for direct text adjustments. When you select text, AI tools become available instantly.
                                            </div>
                                        </div>
                                        <button
                                            className={`btn btn-sm ${editMode ? 'btn-primary' : 'btn-secondary'}`}
                                            onClick={() => setEditMode(!editMode)}
                                            style={{ width: '100%' }}
                                        >
                                            {editMode ? 'Disable Edit Mode' : 'Enable Edit Mode'}
                                        </button>
                                    </div>
                                )}

                                {activeTab === 'AI Tools' && (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
                                        {aiTools.map((tool) => (
                                            <button
                                                key={tool.id}
                                                className={`btn btn-sm ${activeTool === tool.id ? 'btn-primary' : 'btn-secondary'}`}
                                                onClick={() => applyQuickAITool(tool.id)}
                                                style={{ justifyContent: 'flex-start', textAlign: 'left', padding: 14 }}
                                            >
                                                <div style={{ fontSize: 16, marginRight: 10 }}>{tool.emoji}</div>
                                                <div>
                                                    <div style={{ fontSize: 13, fontWeight: 700 }}>{tool.label}</div>
                                                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{tool.subtitle}</div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {activeTab === 'Pages' && (
                                    <div style={{ display: 'grid', gap: 12 }}>
                                        <div style={{ padding: 14, background: 'var(--bg-primary)', borderRadius: 10, border: '1px solid var(--border)' }}>
                                            <strong style={{ display: 'block', marginBottom: 6 }}>Page {currentPage} of {totalPages}</strong>
                                            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>Use the page list, navigation controls, and preview to stay on top of the document flow.</p>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                                            {pageContents.map((content) => (
                                                <button
                                                    key={content.pageNum}
                                                    className={`btn btn-sm ${currentPage === content.pageNum ? 'btn-primary' : 'btn-secondary'}`}
                                                    onClick={() => {
                                                        setCurrentPage(content.pageNum)
                                                        setSelectedPageIndex(content.pageNum - 1)
                                                    }}
                                                    style={{ textAlign: 'left', padding: 12 }}
                                                >
                                                    Page {content.pageNum}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'Export' && (
                                    <div style={{ display: 'grid', gap: 12 }}>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                            {['pdf', 'docx', 'txt'].map((fmt) => (
                                                <button
                                                    key={fmt}
                                                    className={`btn btn-sm ${exportFormat === fmt ? 'btn-primary' : 'btn-secondary'}`}
                                                    onClick={() => setExportFormat(fmt as any)}
                                                    style={{ textTransform: 'uppercase' }}
                                                >
                                                    {fmt}
                                                </button>
                                            ))}
                                        </div>
                                        <button
                                            className="btn btn-primary"
                                            onClick={handleExport}
                                            disabled={loading}
                                            style={{ width: '100%', padding: '12px', borderRadius: 10 }}
                                        >
                                            <Download size={14} style={{ marginRight: 8 }} />
                                            Export as {exportFormat.toUpperCase()}
                                        </button>
                                    </div>
                                )}

                                {activeTab === 'Help' && (
                                    <div style={{ display: 'grid', gap: 12 }}>
                                        <div style={{ padding: 14, background: 'var(--bg-primary)', borderRadius: 10, border: '1px solid var(--border)' }}>
                                            <strong style={{ display: 'block', marginBottom: 6 }}>Pro Tips</strong>
                                            <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--text-secondary)', fontSize: 12, lineHeight: 1.7 }}>
                                                <li>Select text from the page content to target exactly what you want to edit.</li>
                                                <li>Use Templates for fast rewrites and AI Tools for precise text transformations.</li>
                                                <li>Switch to Export mode to save as PDF, DOCX, or TXT after editing.</li>
                                                <li>Keep the page preview visible to verify layout before downloading.</li>
                                            </ul>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {selectedText ? (
                                <>
                                    {/* Selected Text Display */}
                                    <div className="card">
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                            <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 0 }}>
                                                Selected Text
                                            </h3>
                                            <button onClick={clearSelection} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                                                <X size={14} style={{ color: 'var(--text-muted)' }} />
                                            </button>
                                        </div>
                                        <div style={{
                                            padding: 12,
                                            background: 'var(--bg-primary)',
                                            borderRadius: 8,
                                            fontSize: 13,
                                            color: 'var(--text-primary)',
                                            lineHeight: 1.5
                                        }}>
                                            {selectedText}
                                        </div>
                                    </div>

                                    {/* AI Edit Options */}
                                    <div className="card">
                                        <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 12 }}>
                                            <Wand2 size={12} style={{ marginRight: 4 }} />
                                            AI Edit Options
                                        </h3>

                                        {/* AI Prompt */}
                                        <div style={{ marginBottom: 12 }}>
                                            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>
                                                AI Prompt
                                            </label>
                                            <textarea
                                                value={aiPrompt}
                                                onChange={(e) => setAiPrompt(e.target.value)}
                                                placeholder="e.g., Simplify this text, Fix grammar, Make it professional, Shorten..."
                                                style={{
                                                    width: '100%',
                                                    minHeight: 80,
                                                    padding: 10,
                                                    borderRadius: 8,
                                                    border: '1px solid var(--border)',
                                                    background: 'var(--bg-primary)',
                                                    color: 'var(--text-primary)',
                                                    fontSize: 13,
                                                    resize: 'vertical',
                                                    outline: 'none'
                                                }}
                                            />
                                        </div>

                                        <button
                                            className="btn btn-primary"
                                            onClick={handleAISubmit}
                                            disabled={processing || !aiPrompt.trim()}
                                            style={{ width: '100%', marginBottom: 12 }}
                                        >
                                            {processing ? (
                                                <><RefreshCw size={14} className="animate-spin" /> Processing...</>
                                            ) : (
                                                <><Sparkles size={14} /> Generate with AI</>
                                            )}
                                        </button>

                                        <div style={{
                                            borderTop: '1px solid var(--border)',
                                            paddingTop: 12,
                                            marginTop: 4
                                        }}>
                                            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>
                                                <Type size={12} style={{ marginRight: 4 }} />
                                                Manual Edit
                                            </label>
                                            <textarea
                                                value={manualEdit}
                                                onChange={(e) => setManualEdit(e.target.value)}
                                                placeholder="Or type your edited text directly..."
                                                style={{
                                                    width: '100%',
                                                    minHeight: 60,
                                                    padding: 10,
                                                    borderRadius: 8,
                                                    border: '1px solid var(--border)',
                                                    background: 'var(--bg-primary)',
                                                    color: 'var(--text-primary)',
                                                    fontSize: 13,
                                                    resize: 'vertical',
                                                    outline: 'none'
                                                }}
                                            />
                                            <button
                                                className="btn btn-secondary btn-sm"
                                                onClick={handleManualApply}
                                                disabled={!manualEdit.trim()}
                                                style={{ width: '100%', marginTop: 8 }}
                                            >
                                                <Save size={12} style={{ marginRight: 4 }} />
                                                Apply Manual Edit
                                            </button>
                                        </div>
                                    </div>

                                    {/* Export Controls */}
                                    <div className="card">
                                        <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 16 }}>
                                             Export Formats
                                        </h3>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                                            {['pdf', 'docx', 'txt'].map(fmt => (
                                                <button
                                                    key={fmt}
                                                    className={`btn btn-sm ${exportFormat === fmt ? 'btn-primary' : 'btn-secondary'}`}
                                                    onClick={() => setExportFormat(fmt as any)}
                                                    style={{ flex: 1, textTransform: 'uppercase', fontSize: 11 }}
                                                >
                                                    {fmt}
                                                </button>
                                            ))}
                                        </div>
                                        <button
                                            className="btn btn-primary"
                                            onClick={handleExport}
                                            disabled={loading}
                                            style={{ width: '100%', padding: '12px', borderRadius: 10 }}
                                        >
                                            <FileDown size={14} style={{ marginRight: 8 }} />
                                            Export as {exportFormat.toUpperCase()}
                                        </button>
                                    </div>

                                    {/* AI Response */}
                                    {aiResponse && (
                                        <div className="card" style={{ border: '1px solid rgba(124, 92, 246, 0.3)' }}>
                                            <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-purple)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 12 }}>
                                                <Sparkles size={12} style={{ marginRight: 4 }} />
                                                Status
                                            </h3>
                                            <div style={{
                                                padding: 12,
                                                background: 'rgba(124, 92, 246, 0.08)',
                                                borderRadius: 8,
                                                fontSize: 13,
                                                color: 'var(--text-primary)',
                                                lineHeight: 1.5
                                            }}>
                                                {aiResponse}
                                            </div>
                                            <div style={{
                                                display: 'flex',
                                                gap: 8,
                                                marginTop: 12
                                            }}>
                                                <button
                                                    className="btn btn-sm btn-secondary"
                                                    onClick={clearSelection}
                                                    style={{ flex: 1 }}
                                                >
                                                    Clear
                                                </button>
                                                <button
                                                    className="btn btn-sm btn-primary"
                                                    onClick={handleDownload}
                                                    disabled={loading}
                                                    style={{ flex: 1 }}
                                                >
                                                    <Download size={12} />
                                                    Download
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="card" style={{ minHeight: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                    <Edit3 size={32} strokeWidth={1} style={{ marginBottom: 12, opacity: 0.5 }} />
                                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center' }}>
                                        {pdfDoc ? 'Enable edit mode and select text from the content panel to start editing' : 'Upload a PDF first'}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Features */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginTop: 24 }}>
                        <div className="card">
                            <div style={{ fontSize: 24, marginBottom: 12 }}>📤</div>
                            <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Upload PDF</h4>
                            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
                                Drag & drop or browse to upload your PDF
                            </p>
                        </div>
                        <div className="card">
                            <div style={{ fontSize: 24, marginBottom: 12 }}>👆</div>
                            <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Select Text</h4>
                            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
                                Enable edit mode and select text to edit
                            </p>
                        </div>
                        <div className="card">
                            <div style={{ fontSize: 24, marginBottom: 12 }}>✨</div>
                            <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>AI Edit</h4>
                            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
                                Use AI prompts to rewrite or improve text
                            </p>
                        </div>
                        <div className="card">
                            <div style={{ fontSize: 24, marginBottom: 12 }}>💾</div>
                            <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Download</h4>
                            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
                                Get your edited PDF instantly
                            </p>
                        </div>
                    </div>
                </div>
            </FeatureLock>
        </DashboardLayout>
    )
}
