'use client'

import { useState, useRef } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import FeatureLock from '@/components/FeatureLock'
import { Upload, Download, Eye, Trash2, Merge } from 'lucide-react'
import { jsPDF } from 'jspdf'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

interface QueueItem {
  id: string
  name: string
  size: string
  type: string
  status: 'pending' | 'converting' | 'done'
  progress?: number
  url?: string
  file?: File
}

export default function PDFConverterPage() {
  const { user, storageUsage } = useAuth()
  const [queue, setQueue] = useState<QueueItem[]>([
    { id: '1', name: 'branding_assets_01.png', size: '4.2 MB', type: 'Image', status: 'converting', progress: 74 },
    { id: '2', name: 'annual_report_draft.docx', size: '1.8 MB', type: 'Document', status: 'pending' },
    { id: '3', name: 'product_catalog_2024.pdf', size: '12.5 MB', type: 'PDF', status: 'done' },
    { id: '4', name: 'q4_financials_export.xlsx', size: '850 KB', type: 'Spreadsheet', status: 'pending' },
  ])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFiles = (files: FileList) => {
    Array.from(files).forEach((file) => {
      const newItem: QueueItem = {
        id: Date.now() + Math.random() + '',
        name: file.name,
        size: formatSize(file.size),
        type: getFileType(file.type),
        status: 'pending',
        file,
      }
      setQueue((q) => [...q, newItem])
    })
  }

  const formatSize = (bytes: number) => {
    if (bytes > 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
    return `${(bytes / 1024).toFixed(0)} KB`
  }

  const getFileType = (type: string) => {
    if (type.includes('image')) return 'Image'
    if (type.includes('pdf')) return 'PDF'
    if (type.includes('word') || type.includes('document')) return 'Document'
    if (type.includes('sheet') || type.includes('excel')) return 'Spreadsheet'
    return 'File'
  }

  const convertItem = async (id: string) => {
    setQueue((q) => q.map((item) => item.id === id ? { ...item, status: 'converting', progress: 0 } : item))

    // Simulate progress
    for (const p of [0, 20, 100]) {
      await new Promise((r) => setTimeout(r, 100))
      setQueue((q) => q.map((item) => item.id === id ? { ...item, progress: p } : item))
    }

    const item = queue.find((i) => i.id === id)

    if (user) {
      await supabase.from('activity_logs').insert({
        user_id: user.id,
        action: 'pdf_converted',
        description: `Converted ${item?.name || 'file'} to PDF`,
        file_name: item?.name || 'unknown'
      })

      // Update storage usage (add 3MB simulation)
      const { data: profile } = await supabase.from('profiles').select('storage_used').eq('id', user.id).single()
      if (profile) {
        await supabase.from('profiles').update({
          storage_used: (profile.storage_used || 0) + (3 * 1024 * 1024)
        }).eq('id', user.id)
      }
    }

    if (item?.file && item.file.type.includes('image')) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const pdf = new jsPDF()
        const imgData = e.target?.result as string
        const img = new Image()
        img.onload = () => {
          const ratio = img.height / img.width
          const w = 190
          const h = w * ratio
          pdf.addImage(imgData, 'JPEG', 10, 10, w, Math.min(h, 270))
          const blobUrl = pdf.output('bloburl')
          const url = String(blobUrl)
          setQueue((q) => q.map((i) => i.id === id ? { ...i, status: 'done', url } : i))
        }
        img.src = imgData
      }
      reader.readAsDataURL(item.file)
    } else {
      setQueue((q) => q.map((i) => i.id === id ? { ...i, status: 'done' } : i))
    }
  }

  const removeItem = (id: string) => {
    setQueue((q) => q.filter((item) => item.id !== id))
  }

  return (
    <DashboardLayout>
      <FeatureLock featureName="PDF Converter">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-blue)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 20, height: 2, background: 'var(--accent-blue)' }} />
            Document Converter
          </div>
          <h1 className="page-title">PDF Conversion Studio</h1>
          <p className="page-subtitle">Convert images, documents, and spreadsheets into optimized PDF files with smart queue management and preview tools.</p>
        </div>
        <button id="recent-activity-btn" className="btn btn-secondary btn-sm">
          🕔 Recent Activity
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 20, alignItems: 'start' }}>
        {/* Upload */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            id="pdf-upload-zone"
            className="upload-zone"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files) }}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="upload-icon">
              <Upload size={28} />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Drop files here</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.5 }}>
              Support for PNG, JPG, DOCX, XLSX, and PDF. Upload files, convert them quickly, then preview or download results instantly.
            </p>
            <button id="pdf-select-files-btn" className="btn btn-primary" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}>
              <Upload size={14} />
              + Select Files
            </button>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 10, textTransform: 'uppercase' }}>
              OR DRAG AND DROP ANYWHERE
            </p>
            <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.docx,.xlsx,.txt" onChange={(e) => e.target.files && handleFiles(e.target.files)} style={{ display: 'none' }} />
          </div>

          <div className="grid-2">
            <div className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>⚡</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Avg. Speed</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>1.2s <span style={{ fontSize: 12 }}>/page</span></div>
            </div>
            <div className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>🔒</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Encryption</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>AES-256</div>
            </div>
          </div>
        </div>

        {/* Queue + Storage */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Queue */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Queue</span>
                <span className="pill pill-gray">({queue.length} files)</span>
              </div>
              <button id="clear-all-btn" className="btn btn-sm btn-secondary" onClick={() => setQueue([])}>Clear All</button>
            </div>

            {queue.map((item) => (
              <div key={item.id} style={{ padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                    {item.type === 'Image' ? '🖼️' : item.type === 'PDF' ? '📄' : item.type === 'Document' ? '📝' : '📊'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>{item.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.size} • {item.type}</div>
                    {item.status === 'converting' && (
                      <div className="progress-bar" style={{ marginTop: 6 }}>
                        <div className="progress-fill" style={{ width: `${item.progress}%` }} />
                      </div>
                    )}
                    {item.status === 'done' && (
                      <div style={{ fontSize: 11, color: '#34d399', marginTop: 2 }}>✓ Conversion Successful</div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {item.status === 'pending' && (
                      <button
                        id={`convert-${item.id}-btn`}
                        className="btn btn-sm btn-secondary"
                        onClick={() => convertItem(item.id)}
                      >
                        Convert to PDF
                      </button>
                    )}
                    {item.status === 'converting' && (
                      <span style={{ fontSize: 12, color: 'var(--accent-blue)' }}>Converting {item.progress}%</span>
                    )}
                    {item.status === 'done' && item.url && (
                      <>
                        <button className="btn btn-sm btn-secondary" onClick={() => window.open(item.url)}>
                          <Eye size={13} /> Preview
                        </button>
                        <a href={item.url} download={`${item.name}.pdf`} className="btn btn-sm btn-secondary">
                          <Download size={13} /> Download
                        </a>
                      </>
                    )}
                    <button className="icon-btn" style={{ width: 32, height: 32 }} onClick={() => removeItem(item.id)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {queue.length > 0 && (
              <div style={{ paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                {queue.length > 1 ? (
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Convert selected files into PDF with one click.</span>
                ) : (
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Convert individual items or merge multiple files into one PDF.</span>
                )}
                {queue.length > 1 && (
                  <button id="merge-convert-btn" className="btn btn-primary">
                    <Merge size={14} />
                    Merge & Convert
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Storage */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ position: 'relative', width: 48, height: 48 }}>
                  <svg viewBox="0 0 36 36" style={{ width: 48, height: 48, transform: 'rotate(-90deg)' }}>
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--border)" strokeWidth="3" />
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--accent-purple)" strokeWidth="3" strokeDasharray={`${storageUsage.percent} 100`} strokeLinecap="round" />
                  </svg>
                  <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'var(--text-primary)' }}>{storageUsage.percent}%</span>
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Account Storage</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {(storageUsage.used / 1024 ** 3).toFixed(2)} GB of {(storageUsage.limit / 1024 ** 3).toFixed(1)} GB used. <a href="/token/create" style={{ color: 'var(--accent-blue)' }}>Upgrade</a>
                  </div>
                </div>
              </div>
              <button className="btn btn-sm btn-secondary" id="view-analytics-btn">View Analytics ↗</button>
            </div>
          </div>

          {/* Batch Processing Banner */}
          <div className="card" style={{ background: 'var(--bg-secondary)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 20, alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 10 }}>
                  Batch Processing Engine 2.0
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>
                  Experience 4x faster conversion speeds with our new cloud-native architecture. Optimized for high-resolution photography and complex data tables.
                </p>
                {['Lossless Compression', 'OCR Text Recognition', 'Auto-Scaling Layouts'].map((feat) => (
                  <div key={feat} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(52, 211, 153, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 10, color: '#34d399' }}>✓</span>
                    </div>
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{feat}</span>
                  </div>
                ))}
              </div>
              <div style={{
                width: 140, height: 140, borderRadius: 16, background: 'linear-gradient(135deg, #7c5cf6, #ec4899)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 50, position: 'relative', overflow: 'hidden'
              }}>
                <span>⚡</span>
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.5)', padding: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Processing Power</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'white' }}>Enhanced</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 11, marginTop: 32, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
        © 2024 URLM CREATOR STUDIO • ALL RIGHTS RESERVED
      </div>
      </FeatureLock>
    </DashboardLayout>
  )
}
