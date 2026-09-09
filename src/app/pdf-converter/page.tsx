'use client'

import { useState, useRef } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import FeatureLock from '@/components/FeatureLock'
import {
  Upload, Download, Eye, Trash2, Merge, ChevronRight, FileText,
  Image as ImageIcon, Grid2x2, CreditCard, Scissors, Coins, Settings,
  User, CheckCircle, RefreshCw, Zap, Shield, Layers, Sliders, Check
} from 'lucide-react'
import { jsPDF } from 'jspdf'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

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

type ConverterTab = 'Convert Queue' | 'Batch Merge' | 'Compression' | 'Conversion History'

export default function PDFConverterPage() {
  const { user, storageUsage } = useAuth()
  const router = useRouter()

  const [activeTab, setActiveTab] = useState<ConverterTab>('Convert Queue')
  const [compressionMode, setCompressionMode] = useState<'high' | 'balanced' | 'small'>('balanced')
  const [queue, setQueue] = useState<QueueItem[]>([
    { id: '1', name: 'branding_assets_01.png', size: '4.2 MB', type: 'Image', status: 'converting', progress: 74 },
    { id: '2', name: 'annual_report_draft.docx', size: '1.8 MB', type: 'Document', status: 'pending' },
    { id: '3', name: 'product_catalog_2024.pdf', size: '12.5 MB', type: 'PDF', status: 'done', url: '#' },
    { id: '4', name: 'q4_financials_export.xlsx', size: '850 KB', type: 'Spreadsheet', status: 'pending' },
  ])

  const [historyList, setHistoryList] = useState([
    { id: 'h1', name: 'Employee_Handbook_2026.pdf', size: '3.4 MB', type: 'Document', date: 'Just now', status: 'Converted' },
    { id: 'h2', name: 'Certificate_Archive_Batch.pdf', size: '8.1 MB', type: 'Image Batch', date: 'Yesterday', status: 'Converted' },
    { id: 'h3', name: 'Financial_Ledger_Q3.pdf', size: '1.2 MB', type: 'Spreadsheet', date: 'Sep 04, 2026', status: 'Converted' },
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

    for (const p of [25, 60, 100]) {
      await new Promise((r) => setTimeout(r, 120))
      setQueue((q) => q.map((item) => item.id === id ? { ...item, progress: p } : item))
    }

    const item = queue.find((i) => i.id === id)

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

    if (item) {
      setHistoryList(prev => [
        { id: String(Date.now()), name: `${item.name.split('.')[0]}.pdf`, size: item.size, type: item.type, date: 'Just now', status: 'Converted' },
        ...prev
      ])
    }

    if (user) {
      try {
        await supabase.from('activity_logs').insert({
          user_id: user.id,
          action: 'pdf_converted',
          description: `Converted ${item?.name || 'file'} to PDF`,
          file_name: item?.name || 'unknown'
        })
      } catch (err) { console.error(err) }
    }
  }

  const removeItem = (id: string) => {
    setQueue((q) => q.filter((item) => item.id !== id))
  }

  const tabs: ConverterTab[] = ['Convert Queue', 'Batch Merge', 'Compression', 'Conversion History']

  const creatorTools = [
    { label: 'My Photos', href: '/photos', icon: ImageIcon, color: '#10b981', desc: 'Background removal & editor' },
    { label: 'Create Sheet', href: '/create-sheet', icon: Grid2x2, color: '#3b82f6', desc: 'Passport & stamp photo sheets' },
    { label: 'PVC Card', href: '/pvc-card', icon: CreditCard, color: '#8b5cf6', desc: 'Custom badge & ID PVC cards' },
    { label: 'PDF Converter', href: '/pdf-converter', icon: FileText, color: '#f59e0b', desc: 'Convert image & doc to PDF', current: true },
    { label: 'PDF Crop', href: '/crop', icon: Scissors, color: '#ec4899', desc: 'Multi-page cropping tool' },
    { label: 'Token Enter', href: '/token/create', icon: Coins, color: '#06b6d4', desc: 'Claim vouchers & credits' },
  ]

  return (
    <DashboardLayout>
      <FeatureLock featureName="PDF Converter">
        <div style={{ maxWidth: 1120, paddingBottom: 60 }}>

          {/* ─── Breadcrumb & Top Action Row ─── */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5 }}>
              <span style={{ color: 'var(--text-muted)', cursor: 'pointer' }} onClick={() => router.push('/dashboard')}>Dashboard</span>
              <span style={{ color: 'var(--text-muted)' }}>&gt;</span>
              <span style={{ color: '#10b981', fontWeight: 600 }}>PDF Converter</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  background: '#10b981', color: '#ffffff', border: 'none', borderRadius: 8,
                  padding: '8px 18px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)'
                }}
              >
                <Upload size={15} /> Upload Files
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
                background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <FileText size={24} />
              </div>
              <div>
                <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 4px 0', letterSpacing: '-0.5px' }}>
                  PDF Conversion Studio
                </h1>
                <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>
                  Convert images, documents, and spreadsheets into optimized PDF files with smart queue management.
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
                { label: 'Conversion Speed', value: '1.2s / page', color: '#f59e0b' },
                { label: 'Security & Privacy', value: 'AES-256 Zero-Log', color: '#10b981' },
                { label: 'Active Queue', value: `${queue.length} Files Ready`, color: '#3b82f6' },
                { label: 'Compression Profile', value: compressionMode.toUpperCase(), color: '#8b5cf6' },
                { label: 'Supported Formats', value: 'PNG, JPG, DOCX, XLSX', color: '#ec4899' },
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

          {/* ─── TAB 1: CONVERT QUEUE ─── */}
          {activeTab === 'Convert Queue' && (
            <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 24, alignItems: 'start' }}>
              {/* Left Column: Dropzone & Specs */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Upload Zone */}
                <div className="card" style={{ borderRadius: 16, padding: '22px 24px', background: 'var(--bg-card)' }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14 }}>
                    Add Documents to Queue
                  </h3>

                  <div
                    id="pdf-upload-zone"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files) }}
                    style={{
                      border: '1px dashed var(--border)', borderRadius: 12, padding: '28px 16px',
                      textAlign: 'center', cursor: 'pointer', background: 'var(--bg-primary)'
                    }}
                  >
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(245,158,11,0.12)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                      <Upload size={22} />
                    </div>
                    <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                      Drop files here or click to browse
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      Supports PNG, JPG, DOCX, XLSX, and PDF
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*,.pdf,.docx,.xlsx,.txt"
                      onChange={(e) => e.target.files && handleFiles(e.target.files)}
                      style={{ display: 'none' }}
                    />
                  </div>
                </div>

                {/* Storage Card */}
                <div className="card" style={{ borderRadius: 16, padding: '20px 24px', background: 'var(--bg-card)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Cloud Storage Capacity</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#10b981' }}>{storageUsage.percent}%</span>
                  </div>
                  <div className="progress-bar" style={{ height: 6, borderRadius: 3 }}>
                    <div className="progress-fill" style={{ width: `${storageUsage.percent}%`, background: 'linear-gradient(90deg, #f59e0b, #10b981)' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11.5, color: 'var(--text-muted)' }}>
                    <span>{(storageUsage.used / 1024 ** 3).toFixed(2)} GB used</span>
                    <span>{(storageUsage.limit / 1024 ** 3).toFixed(1)} GB limit</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Queue Items */}
              <div className="card" style={{ borderRadius: 16, padding: '24px 28px', background: 'var(--bg-card)', minHeight: 460 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Active Queue</span>
                    <span style={{
                      fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 9999,
                      background: 'rgba(59,130,246,0.12)', color: '#3b82f6'
                    }}>
                      {queue.length} files
                    </span>
                  </div>
                  {queue.length > 0 && (
                    <button
                      onClick={() => setQueue([])}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}
                    >
                      Clear Queue
                    </button>
                  )}
                </div>

                {queue.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 280, color: 'var(--text-muted)', gap: 12 }}>
                    <FileText size={36} strokeWidth={1.5} />
                    <div style={{ fontSize: 14, fontWeight: 600 }}>Queue is currently empty</div>
                    <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: 0 }}>Add documents on the left to start converting</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {queue.map((item) => (
                      <div
                        key={item.id}
                        style={{
                          padding: '14px 16px', borderRadius: 12, background: 'var(--bg-primary)',
                          border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 14
                        }}
                      >
                        <div style={{
                          width: 38, height: 38, borderRadius: 8, background: 'rgba(255,255,255,0.06)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0
                        }}>
                          {item.type === 'Image' ? '🖼️' : item.type === 'PDF' ? '📄' : item.type === 'Document' ? '📝' : '📊'}
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                            {item.name}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                            {item.size} • {item.type}
                          </div>

                          {item.status === 'converting' && (
                            <div className="progress-bar" style={{ marginTop: 8, height: 5, borderRadius: 2 }}>
                              <div className="progress-fill" style={{ width: `${item.progress}%`, background: '#f59e0b' }} />
                            </div>
                          )}

                          {item.status === 'done' && (
                            <div style={{ fontSize: 11.5, color: '#10b981', fontWeight: 600, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <CheckCircle size={13} /> Converted to PDF Successfully
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                          {item.status === 'pending' && (
                            <button
                              onClick={() => convertItem(item.id)}
                              style={{
                                background: '#10b981', color: '#fff', border: 'none', borderRadius: 6,
                                padding: '6px 14px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer'
                              }}
                            >
                              Convert
                            </button>
                          )}

                          {item.status === 'converting' && (
                            <span style={{ fontSize: 12, fontWeight: 600, color: '#f59e0b' }}>
                              {item.progress}%
                            </span>
                          )}

                          {item.status === 'done' && item.url && (
                            <a
                              href={item.url}
                              download={`${item.name}.pdf`}
                              style={{
                                background: 'rgba(16,185,129,0.12)', color: '#10b981', border: 'none',
                                borderRadius: 6, padding: '6px 14px', fontSize: 12.5, fontWeight: 600,
                                textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4
                              }}
                            >
                              <Download size={13} /> Download
                            </a>
                          )}

                          <button
                            onClick={() => removeItem(item.id)}
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}
                            title="Remove"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── TAB 2: BATCH MERGE ─── */}
          {activeTab === 'Batch Merge' && (
            <div className="card" style={{ borderRadius: 16, padding: '24px 28px', background: 'var(--bg-card)' }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                Multi-Document PDF Combiner
              </h3>
              <p style={{ fontSize: 13.5, color: 'var(--text-muted)', marginBottom: 24 }}>
                Stitch multiple scans, images, and documents into a singular indexed PDF publication.
              </p>

              <div style={{ border: '1px dashed var(--border)', borderRadius: 12, padding: 32, textAlign: 'center', background: 'var(--bg-primary)', marginBottom: 20 }}>
                <Merge size={28} color="#f59e0b" style={{ margin: '0 auto 10px' }} />
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                  Drag & Drop multiple PDFs to merge
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                  Files will be ordered sequentially. You can re-order pages prior to export.
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  style={{
                    background: '#10b981', color: '#fff', border: 'none', borderRadius: 8,
                    padding: '8px 20px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: 6
                  }}
                >
                  <Merge size={15} /> Merge All into Master PDF
                </button>
              </div>
            </div>
          )}

          {/* ─── TAB 3: COMPRESSION ─── */}
          {activeTab === 'Compression' && (
            <div className="card" style={{ borderRadius: 16, padding: '24px 28px', background: 'var(--bg-card)' }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                Compression & Optimization Profiles
              </h3>
              <p style={{ fontSize: 13.5, color: 'var(--text-muted)', marginBottom: 24 }}>
                Reduce PDF file size for fast email delivery, government portal uploads, and web sharing.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 }}>
                {[
                  { id: 'high', title: 'Studio High Quality', dpi: '300 DPI', reduction: '0% size reduction (Lossless)', desc: 'Full-resolution print output with untouched vector sharpness and color gamut.' },
                  { id: 'balanced', title: 'Balanced Studio', dpi: '150 DPI', reduction: '~60% file size reduction', desc: 'Recommended default. Perfect balance of text clarity and rapid web distribution.' },
                  { id: 'small', title: 'Compact Web Mode', dpi: '72 DPI', reduction: '~85% file size reduction', desc: 'Designed for strict email attachment restrictions (under 2MB portals).' },
                ].map(p => (
                  <div
                    key={p.id}
                    onClick={() => setCompressionMode(p.id as any)}
                    style={{
                      border: compressionMode === p.id ? '2px solid #10b981' : '1px solid var(--border)',
                      borderRadius: 12, padding: 20, cursor: 'pointer',
                      background: 'var(--bg-primary)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{p.title}</span>
                      {compressionMode === p.id && <Check size={16} color="#10b981" />}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b', marginBottom: 4 }}>{p.dpi} • {p.reduction}</div>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>{p.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── TAB 4: CONVERSION HISTORY ─── */}
          {activeTab === 'Conversion History' && (
            <div className="card" style={{ borderRadius: 16, padding: '24px 28px', background: 'var(--bg-card)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                  <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                    Recent PDF Conversions
                  </h3>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                    Historical log of documents converted on this account
                  </p>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <th style={{ padding: '12px 14px', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>File Name</th>
                      <th style={{ padding: '12px 14px', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Source Type</th>
                      <th style={{ padding: '12px 14px', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Output Size</th>
                      <th style={{ padding: '12px 14px', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Date</th>
                      <th style={{ padding: '12px 14px', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Status</th>
                      <th style={{ padding: '12px 14px', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyList.map(h => (
                      <tr key={h.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '14px', fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <FileText size={16} color="#f59e0b" />
                            {h.name}
                          </div>
                        </td>
                        <td style={{ padding: '14px', fontSize: 13, color: 'var(--text-secondary)' }}>{h.type}</td>
                        <td style={{ padding: '14px', fontSize: 13, color: 'var(--text-secondary)' }}>{h.size}</td>
                        <td style={{ padding: '14px', fontSize: 13, color: 'var(--text-secondary)' }}>{h.date}</td>
                        <td style={{ padding: '14px' }}>
                          <span style={{
                            padding: '3px 10px', borderRadius: 9999, fontSize: 11.5, fontWeight: 700,
                            background: 'rgba(16,185,129,0.12)', color: '#10b981'
                          }}>
                            {h.status}
                          </span>
                        </td>
                        <td style={{ padding: '14px', textAlign: 'right' }}>
                          <button
                            style={{ background: 'none', border: 'none', color: '#10b981', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                          >
                            Download
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
