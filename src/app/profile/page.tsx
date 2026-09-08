'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import {
  Pencil, MoreHorizontal, Check, X,
  FileText, Briefcase, Clock, Receipt, CreditCard, Folder,
  Shield, CheckCircle2, ChevronRight, Download, Upload, Plus,
  Image as ImageIcon, Grid2x2, Scissors, Coins, Calendar,
  DollarSign, AlertCircle, Building, User, Mail, Phone, MapPin
} from 'lucide-react'

export default function ProfilePage() {
  const router = useRouter()
  const { user } = useAuth()
  
  const [activeTab, setActiveTab] = useState<'Personal' | 'Job' | 'Time off' | 'Invoices' | 'Billing activities' | 'Documents'>('Personal')
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [showTimeOffModal, setShowTimeOffModal] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)

  // ─────────────────────────────────────────────────────────────
  // 1. Personal Tab Data (Matches Reference Image 1)
  // ─────────────────────────────────────────────────────────────
  const [fullName, setFullName] = useState('Sara Smith')
  const [roleTitle, setRoleTitle] = useState('UI Designer')
  const [email, setEmail] = useState('sara.smith@company.com')
  const [gender, setGender] = useState('Female')
  const [dob, setDob] = useState('17 May, 1990')
  const [identityDoc, setIdentityDoc] = useState('RBA3112968')
  const [nationality, setNationality] = useState('Dutch')
  const [maritalStatus, setMaritalStatus] = useState('Married')
  const [phone, setPhone] = useState('+31 20 192 4826')
  const [address, setAddress] = useState('Mainstreet 61, 1010SC, Amsterdam')

  // Emergency contact (Matches Reference Image 1)
  const [emergencyName, setEmergencyName] = useState('John Smith')
  const [emergencyRel, setEmergencyRel] = useState('Husband')
  const [emergencyNat, setEmergencyNat] = useState('Dutch')
  const [emergencyPhone, setEmergencyPhone] = useState('+31 22 419 2675')
  const [emergencyEmail, setEmergencyEmail] = useState('john.smith@company.com')

  // Account information (Matches Reference Image 1)
  const [accountName, setAccountName] = useState('John Smith')
  const [bankName, setBankName] = useState('ABN AMRO')
  const [bankNumber, setBankNumber] = useState('000 2334 454 6677')
  const [bankCountry, setBankCountry] = useState('Belgium')

  // Education information (Matches Reference Image 1)
  const [educationList] = useState([
    {
      degree: 'Bachelor of Design',
      years: '2012 - 2016',
      school: 'Eindhoven University of Technology'
    },
    {
      degree: 'Certificate in User Interface Design',
      years: '2018 - 2019',
      school: 'Coursera'
    },
    {
      degree: 'Certificate in User Experience Design',
      years: '2019 - 2020',
      school: 'Coursera'
    }
  ])

  // ─────────────────────────────────────────────────────────────
  // 2. Documents Tab Data
  // ─────────────────────────────────────────────────────────────
  const [documents, setDocuments] = useState([
    { name: 'Employment Contract.pdf', type: 'PDF', size: '1.2 MB', date: 'Jan 01, 2024', category: 'Contract', color: '#ef4444' },
    { name: 'Passport Copy.jpg', type: 'JPG', size: '856 KB', date: 'Jan 05, 2024', category: 'Identity', color: '#3b82f6' },
    { name: 'NDA Agreement.pdf', type: 'PDF', size: '432 KB', date: 'Jan 10, 2024', category: 'Legal', color: '#ef4444' },
    { name: 'Salary Statement Q1-2025.pdf', type: 'PDF', size: '214 KB', date: 'Apr 01, 2025', category: 'Finance', color: '#ef4444' },
    { name: 'Performance Review 2024.docx', type: 'DOCX', size: '98 KB', date: 'Dec 15, 2024', category: 'HR', color: '#3b82f6' },
    { name: 'Health Insurance Policy.pdf', type: 'PDF', size: '1.8 MB', date: 'Jan 01, 2024', category: 'Benefits', color: '#ef4444' },
    { name: 'Remote Work Agreement.pdf', type: 'PDF', size: '340 KB', date: 'Feb 20, 2024', category: 'Contract', color: '#ef4444' },
  ])

  // ─────────────────────────────────────────────────────────────
  // 3. Time Off Data
  // ─────────────────────────────────────────────────────────────
  const [leaveHistory, setLeaveHistory] = useState([
    { type: 'Annual Leave', from: 'Aug 10, 2025', to: 'Aug 17, 2025', days: 5, reason: 'Family vacation', status: 'Approved' },
    { type: 'Sick Leave', from: 'Jul 03, 2025', to: 'Jul 04, 2025', days: 2, reason: 'Medical appointment', status: 'Approved' },
    { type: 'Personal Days', from: 'Jun 20, 2025', to: 'Jun 20, 2025', days: 1, reason: 'Personal matter', status: 'Approved' },
    { type: 'Annual Leave', from: 'Dec 24, 2025', to: 'Jan 02, 2026', days: 7, reason: 'Holiday break', status: 'Pending' },
  ])

  // Creator Quick Jump Items
  const creatorTools = [
    { label: 'My Photos', href: '/photos', icon: ImageIcon, color: '#10b981', desc: 'Background removal & enhancements' },
    { label: 'Create Sheet', href: '/create-sheet', icon: Grid2x2, color: '#3b82f6', desc: 'Passport & stamp photo sheets' },
    { label: 'PVC Card', href: '/pvc-card', icon: CreditCard, color: '#8b5cf6', desc: 'Custom badge & ID PVC cards' },
    { label: 'PDF Converter', href: '/pdf-converter', icon: FileText, color: '#f59e0b', desc: 'Convert image & doc to PDF' },
    { label: 'PDF Crop', href: '/crop', icon: Scissors, color: '#ec4899', desc: 'Multi-page cropping tool' },
    { label: 'Token Enter', href: '/token/create', icon: Coins, color: '#06b6d4', desc: 'Claim vouchers & credits' },
  ]

  useEffect(() => {
    if (user) {
      if (user.email) setEmail(user.email)
      const metaName = user.user_metadata?.full_name
      if (metaName) setFullName(metaName)

      supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            if (data.full_name) setFullName(data.full_name)
            if (data.email) setEmail(data.email)
            if (data.phone_number) setPhone(data.phone_number)
            if (data.location) setAddress(data.location)
            if (data.dob) setDob(data.dob)
          }
        })
    }
  }, [user])

  const handleSave = async () => {
    setSaving(true)
    try {
      if (user?.id) {
        await supabase.from('profiles').upsert({
          id: user.id,
          full_name: fullName,
          email: email,
          phone_number: phone,
          location: address,
          dob: dob,
          updated_at: new Date().toISOString()
        })
      }
      setSavedSuccess(true)
      setIsEditing(false)
      setTimeout(() => setSavedSuccess(false), 3000)
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const tabs: Array<'Personal' | 'Job' | 'Time off' | 'Invoices' | 'Billing activities' | 'Documents'> = [
    'Personal', 'Job', 'Time off', 'Invoices', 'Billing activities', 'Documents'
  ]

  const StatusBadge = ({ status }: { status: string }) => {
    const colors: Record<string, { color: string; bg: string }> = {
      'Paid':       { color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
      'Pending':    { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
      'Overdue':    { color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
      'Refund':     { color: '#06b6d4', bg: 'rgba(6,182,212,0.12)' },
      'Approved':   { color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
      'Rejected':   { color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
      'Cancelled':  { color: '#ea580c', bg: 'rgba(234,88,12,0.12)' },
    }
    const style = colors[status] || { color: '#6b7280', bg: 'rgba(107,114,128,0.12)' }
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', padding: '3px 10px',
        borderRadius: 9999, fontSize: 11.5, fontWeight: 700,
        color: style.color, background: style.bg
      }}>
        {status}
      </span>
    )
  }

  const SectionCard = ({ title, onEdit, children }: { title: string; onEdit?: () => void; children: React.ReactNode }) => (
    <div className="card" style={{ borderRadius: 16, padding: '22px 26px', background: 'var(--bg-card)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{title}</h3>
        <button
          onClick={onEdit || (() => setIsEditing(!isEditing))}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: 4 }}
          title={`Edit ${title}`}
        >
          <Pencil size={15} />
        </button>
      </div>
      {children}
    </div>
  )

  const InfoRow = ({ label, value }: { label: string; value: string }) => (
    <div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4 }}>{value}</div>
    </div>
  )

  return (
    <DashboardLayout>
      <div style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: 60 }}>
        
        {/* Top Breadcrumb & Action Row (Exact Match to Image 1) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
            <span style={{ color: 'var(--text-muted)' }}>Users</span>
            <span style={{ color: 'var(--text-muted)' }}>&gt;</span>
            <span style={{ color: '#10b981', fontWeight: 600 }}>{fullName.split(' ')[0]} details</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {savedSuccess && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#10b981', fontSize: 13, fontWeight: 600 }}>
                <Check size={16} /> Saved!
              </span>
            )}
            <button
              onClick={() => { if (isEditing) { handleSave() } else { setIsEditing(true) } }}
              style={{
                background: '#10b981', color: '#ffffff', border: 'none', borderRadius: 8,
                padding: '8px 20px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 6,
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)', transition: 'all 0.15s ease'
              }}
            >
              <Pencil size={14} />
              {isEditing ? (saving ? 'Saving...' : 'Save Profile') : 'Edit Profile'}
            </button>

            {isEditing && (
              <button
                onClick={() => setIsEditing(false)}
                style={{
                  background: 'var(--bg-card)', color: 'var(--text-secondary)',
                  border: '1px solid var(--border)', borderRadius: 8,
                  padding: '8px 14px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            )}

            <button
              onClick={() => router.push('/settings')}
              className="icon-btn"
              style={{
                height: 36, padding: '0 12px', borderRadius: 8,
                border: '1px solid var(--border)', display: 'inline-flex',
                alignItems: 'center', gap: 6, cursor: 'pointer'
              }}
              title="More options & Settings"
            >
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>More</span>
              <MoreHorizontal size={14} />
            </button>
          </div>
        </div>

        {/* Hero Profile Card (Exact Match to Image 1) */}
        <div className="card" style={{ padding: '24px 28px', marginBottom: 24, borderRadius: 16, background: 'var(--bg-card)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%', overflow: 'hidden',
              border: '3px solid rgba(16, 185, 129, 0.25)', flexShrink: 0,
              background: '#0d2219', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80"
                alt={fullName}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
                <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{fullName}</h1>
                <span style={{
                  background: '#10b981', color: '#ffffff', fontSize: 11,
                  fontWeight: 700, padding: '2px 10px', borderRadius: 9999
                }}>
                  {roleTitle}
                </span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>{email}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                <span>Started on January 01, 2024 (2.5 years ago)</span>
                <span>•</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#10b981', fontWeight: 600 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
                  Active
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Horizontal Tab Navigation Bar (Matches Image 1) */}
        <div style={{ display: 'flex', gap: 28, borderBottom: '1px solid var(--border)', marginBottom: 24, overflowX: 'auto' }}>
          {tabs.map(tab => {
            const isActive = activeTab === tab
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  background: 'transparent', border: 'none', padding: '10px 4px 12px 4px',
                  fontSize: 14, fontWeight: isActive ? 700 : 500,
                  color: isActive ? '#10b981' : 'var(--text-muted)',
                  cursor: 'pointer', position: 'relative', whiteSpace: 'nowrap', transition: 'color 0.15s ease'
                }}
              >
                {tab}
                {isActive && (
                  <span style={{ position: 'absolute', bottom: -1, left: 0, right: 0, height: 2.5, background: '#10b981', borderRadius: 2 }} />
                )}
              </button>
            )
          })}
        </div>

        {/* ══════════════════════════════════════════════════════════
            TAB 1: PERSONAL (EXACT 2x2 GRID MATCHING IMAGE 1)
        ══════════════════════════════════════════════════════════ */}
        {activeTab === 'Personal' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: 20, alignItems: 'start' }}>
            
            {/* 1. Personal Information Card */}
            <SectionCard title="Personal information">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', rowGap: 20, columnGap: 24 }}>
                {([
                  ['Gender', gender, setGender, 'text'],
                  ['Date of birth', dob, setDob, 'text'],
                  ['Identity document', identityDoc, setIdentityDoc, 'text'],
                  ['Nationality', nationality, setNationality, 'text'],
                  ['Marital status', maritalStatus, setMaritalStatus, 'text'],
                  ['Phone number', phone, setPhone, 'text'],
                  ['Email', email, setEmail, 'email'],
                  ['Address', address, setAddress, 'text'],
                ] as [string, string, (v: string) => void, string][]).map(([label, val, setter, type]) => (
                  <div key={label}>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
                    {isEditing ? (
                      <input type={type} className="input" value={val} onChange={(e) => setter(e.target.value)} style={{ padding: '6px 10px', fontSize: 13, borderRadius: 8 }} />
                    ) : (
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4 }}>{val}</div>
                    )}
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* 2. Emergency Contact Card */}
            <SectionCard title="Emergency contact">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', rowGap: 20, columnGap: 24 }}>
                {([
                  ['Name', emergencyName, setEmergencyName],
                  ['Relationship', emergencyRel, setEmergencyRel],
                  ['Nationality', emergencyNat, setEmergencyNat],
                  ['Phone number', emergencyPhone, setEmergencyPhone],
                ] as [string, string, (v: string) => void][]).map(([label, val, setter]) => (
                  <div key={label}>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
                    {isEditing ? (
                      <input type="text" className="input" value={val} onChange={(e) => setter(e.target.value)} style={{ padding: '6px 10px', fontSize: 13, borderRadius: 8 }} />
                    ) : (
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{val}</div>
                    )}
                  </div>
                ))}
                <div style={{ gridColumn: 'span 2' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Email</div>
                  {isEditing ? (
                    <input type="email" className="input" value={emergencyEmail} onChange={(e) => setEmergencyEmail(e.target.value)} style={{ padding: '6px 10px', fontSize: 13, borderRadius: 8 }} />
                  ) : (
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{emergencyEmail}</div>
                  )}
                </div>
              </div>
            </SectionCard>

            {/* 3. Account Information Card */}
            <SectionCard title="Account information">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', rowGap: 20, columnGap: 24 }}>
                {([
                  ['Account name', accountName, setAccountName],
                  ['Bank name', bankName, setBankName],
                  ['Bank number', bankNumber, setBankNumber],
                  ['Bank country', bankCountry, setBankCountry],
                ] as [string, string, (v: string) => void][]).map(([label, val, setter]) => (
                  <div key={label}>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
                    {isEditing ? (
                      <input type="text" className="input" value={val} onChange={(e) => setter(e.target.value)} style={{ padding: '6px 10px', fontSize: 13, borderRadius: 8 }} />
                    ) : (
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{val}</div>
                    )}
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* 4. Education Information Card */}
            <SectionCard title="Education information">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {educationList.map((edu, i, arr) => (
                  <div key={edu.degree} style={{ borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none', paddingBottom: i < arr.length - 1 ? 14 : 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{edu.degree}</div>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>{edu.years}</span>
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{edu.school}</div>
                  </div>
                ))}
              </div>
            </SectionCard>

          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            TAB 2: JOB
        ══════════════════════════════════════════════════════════ */}
        {activeTab === 'Job' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: 20, alignItems: 'start' }}>
            <SectionCard title="Job Details">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', rowGap: 20, columnGap: 24 }}>
                <InfoRow label="Department" value="Product & Design" />
                <InfoRow label="Job Title" value="Senior UI Designer" />
                <InfoRow label="Employee ID" value="EMP-0042" />
                <InfoRow label="Employment Type" value="Full-Time" />
                <InfoRow label="Start Date" value="January 01, 2024" />
                <InfoRow label="Work Location" value="Remote / Amsterdam" />
                <InfoRow label="Contract Type" value="Permanent" />
                <InfoRow label="Notice Period" value="1 Month" />
              </div>
            </SectionCard>

            <SectionCard title="Reporting Structure">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {[
                  { name: 'Alex van Dijk', role: 'Engineering Manager', label: 'Direct Manager' },
                  { name: 'Priya Sharma', role: 'Head of Product', label: 'Department Head' },
                  { name: 'Sarah Johnson', role: 'Chief Design Officer', label: 'Skip Manager' },
                ].map((p, i, arr) => (
                  <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(16,185,129,0.12)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>
                      {p.name[0]}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{p.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.role}</div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', background: 'var(--bg-primary)', padding: '2px 8px', borderRadius: 6, border: '1px solid var(--border)' }}>
                      {p.label}
                    </span>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Compensation">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', rowGap: 20, columnGap: 24 }}>
                <InfoRow label="Base Salary" value="€ 72,000 / year" />
                <InfoRow label="Currency" value="EUR" />
                <InfoRow label="Pay Frequency" value="Monthly" />
                <InfoRow label="Last Review" value="March 15, 2025" />
                <InfoRow label="Next Review" value="March 15, 2026" />
                <InfoRow label="Bonus Eligible" value="Yes — 10% of Annual" />
              </div>
            </SectionCard>

            <SectionCard title="Skills & Expertise">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {['Figma', 'Adobe XD', 'Prototyping', 'User Research', 'Design Systems', 'Wireframing', 'Interaction Design', 'Usability Testing', 'CSS', 'HTML'].map(skill => (
                  <span key={skill} style={{ fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 9999, background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
                    {skill}
                  </span>
                ))}
              </div>
            </SectionCard>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            TAB 3: TIME OFF
        ══════════════════════════════════════════════════════════ */}
        {activeTab === 'Time off' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              {[
                { type: 'Annual Leave', used: 8, total: 25, color: '#10b981' },
                { type: 'Sick Leave', used: 2, total: 10, color: '#3b82f6' },
                { type: 'Personal Days', used: 1, total: 5, color: '#f59e0b' },
                { type: 'Remote Days', used: 44, total: 52, color: '#8b5cf6' },
              ].map(({ type, used, total, color }) => {
                const pct = Math.round((used / total) * 100)
                return (
                  <div key={type} className="card" style={{ borderRadius: 14, padding: '18px 20px' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 10 }}>{type}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                      <span style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)' }}>{total - used}</span>
                      <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>of {total} left</span>
                    </div>
                    <div style={{ height: 6, background: 'var(--bg-primary)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 99 }} />
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>{used} days used ({pct}%)</div>
                  </div>
                )
              })}
            </div>

            <div className="card" style={{ borderRadius: 16, overflow: 'hidden', padding: 0 }}>
              <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Leave History</h3>
                <button
                  onClick={() => setShowTimeOffModal(true)}
                  style={{
                    background: '#10b981', color: '#fff', border: 'none', borderRadius: 8,
                    padding: '6px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: 6
                  }}
                >
                  <Plus size={14} /> Request Leave
                </button>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-primary)', borderBottom: '1px solid var(--border)' }}>
                    {['Type', 'From', 'To', 'Days', 'Reason', 'Status'].map(h => (
                      <th key={h} style={{ padding: '11px 18px', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {leaveHistory.map((row, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '13px 18px', fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>{row.type}</td>
                      <td style={{ padding: '13px 18px', fontSize: 13, color: 'var(--text-muted)' }}>{row.from}</td>
                      <td style={{ padding: '13px 18px', fontSize: 13, color: 'var(--text-muted)' }}>{row.to}</td>
                      <td style={{ padding: '13px 18px', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{row.days}d</td>
                      <td style={{ padding: '13px 18px', fontSize: 13, color: 'var(--text-secondary)' }}>{row.reason}</td>
                      <td style={{ padding: '13px 18px' }}><StatusBadge status={row.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Request Time Off Inline Modal */}
            {showTimeOffModal && (
              <div className="card" style={{ padding: 24, borderRadius: 16, border: '2px solid #10b981' }}>
                <h4 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14 }}>New Time Off Request</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Leave Type</label>
                    <select className="input" style={{ borderRadius: 8 }}>
                      <option>Annual Leave</option>
                      <option>Sick Leave</option>
                      <option>Personal Days</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>From Date</label>
                    <input type="date" className="input" style={{ borderRadius: 8 }} defaultValue="2026-10-01" />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>To Date</label>
                    <input type="date" className="input" style={{ borderRadius: 8 }} defaultValue="2026-10-05" />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                  <button onClick={() => setShowTimeOffModal(false)} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 16px', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                  <button onClick={() => {
                    setLeaveHistory(prev => [{ type: 'Annual Leave', from: 'Oct 01, 2026', to: 'Oct 05, 2026', days: 4, reason: 'Travel', status: 'Pending' }, ...prev])
                    setShowTimeOffModal(false)
                  }} style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Submit Request</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            TAB 4: INVOICES
        ══════════════════════════════════════════════════════════ */}
        {activeTab === 'Invoices' && (
          <div className="card" style={{ borderRadius: 16, overflow: 'hidden', padding: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 22px', borderBottom: '1px solid var(--border)' }}>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 2px 0' }}>All Invoices</h3>
                <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: 0 }}>Download official billing statements and payment invoices.</p>
              </div>
              <button onClick={() => router.push('/settings')} style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                + Manage Billings
              </button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--bg-primary)', borderBottom: '1px solid var(--border)' }}>
                  {['Invoice #', 'Issued', 'Due Date', 'Amount', 'Description', 'Status', ''].map(h => (
                    <th key={h} style={{ padding: '11px 18px', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { num: 'INV-2025-001', issued: 'Jan 01, 2025', due: 'Jan 31, 2025', amount: '$3,200', desc: 'Monthly retainer – January', status: 'Paid' },
                  { num: 'INV-2025-002', issued: 'Feb 01, 2025', due: 'Feb 28, 2025', amount: '$3,200', desc: 'Monthly retainer – February', status: 'Paid' },
                  { num: 'INV-2025-003', issued: 'Mar 01, 2025', due: 'Mar 31, 2025', amount: '$3,600', desc: 'Retainer + Project bonus', status: 'Paid' },
                  { num: 'INV-2025-004', issued: 'Apr 01, 2025', due: 'Apr 30, 2025', amount: '$3,200', desc: 'Monthly retainer – April', status: 'Paid' },
                  { num: 'INV-2025-005', issued: 'May 01, 2025', due: 'May 31, 2025', amount: '$3,200', desc: 'Monthly retainer – May', status: 'Pending' },
                  { num: 'INV-2025-006', issued: 'Jun 01, 2025', due: 'Jun 30, 2025', amount: '$4,000', desc: 'Retainer + Design Sprint', status: 'Overdue' },
                ].map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '13px 18px', fontSize: 13, fontWeight: 700, color: '#3b82f6' }}>{row.num}</td>
                    <td style={{ padding: '13px 18px', fontSize: 13, color: 'var(--text-muted)' }}>{row.issued}</td>
                    <td style={{ padding: '13px 18px', fontSize: 13, color: 'var(--text-muted)' }}>{row.due}</td>
                    <td style={{ padding: '13px 18px', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{row.amount}</td>
                    <td style={{ padding: '13px 18px', fontSize: 13, color: 'var(--text-secondary)' }}>{row.desc}</td>
                    <td style={{ padding: '13px 18px' }}><StatusBadge status={row.status} /></td>
                    <td style={{ padding: '13px 18px', textAlign: 'right' }}>
                      <button className="icon-btn" style={{ width: 30, height: 30 }} title="Download Invoice">
                        <Download size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            TAB 5: BILLING ACTIVITIES
        ══════════════════════════════════════════════════════════ */}
        {activeTab === 'Billing activities' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              {[
                { label: 'Total Charged', value: '$19,200', sub: 'This year', color: '#10b981' },
                { label: 'Total Refunded', value: '$800', sub: '1 refund processed', color: '#06b6d4' },
                { label: 'Outstanding', value: '$4,000', sub: '1 overdue invoice', color: '#ef4444' },
                { label: 'Last Payment', value: 'May 31, 2025', sub: '$3,200 processed', color: '#f59e0b' },
              ].map(({ label, value, sub, color }) => (
                <div key={label} className="card" style={{ borderRadius: 14, padding: '18px 20px' }}>
                  <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600 }}>{label}</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color, marginBottom: 4 }}>{value}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{sub}</div>
                </div>
              ))}
            </div>

            <div className="card" style={{ borderRadius: 16, overflow: 'hidden', padding: 0 }}>
              <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)' }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Transaction History</h3>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-primary)', borderBottom: '1px solid var(--border)' }}>
                    {['Date', 'Transaction ID', 'Description', 'Method', 'Amount', 'Status'].map(h => (
                      <th key={h} style={{ padding: '11px 18px', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { date: 'May 31, 2025', txId: 'TXN-8829-A', desc: 'Monthly retainer payment', method: '•••• 9292', amount: '+$3,200', status: 'Paid' },
                    { date: 'Apr 30, 2025', txId: 'TXN-7743-B', desc: 'Monthly retainer payment', method: '•••• 9292', amount: '+$3,200', status: 'Paid' },
                    { date: 'Mar 31, 2025', txId: 'TXN-6612-C', desc: 'Retainer + Project bonus', method: '•••• 9292', amount: '+$3,600', status: 'Paid' },
                    { date: 'Mar 15, 2025', txId: 'TXN-6201-D', desc: 'Refund – Sprint cancellation', method: 'Bank Transfer', amount: '-$800', status: 'Refund' },
                    { date: 'Feb 28, 2025', txId: 'TXN-5588-E', desc: 'Monthly retainer payment', method: '•••• 9292', amount: '+$3,200', status: 'Paid' },
                  ].map((row, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '13px 18px', fontSize: 13, color: 'var(--text-muted)' }}>{row.date}</td>
                      <td style={{ padding: '13px 18px', fontSize: 12.5, fontWeight: 700, color: '#3b82f6' }}>{row.txId}</td>
                      <td style={{ padding: '13px 18px', fontSize: 13, color: 'var(--text-secondary)' }}>{row.desc}</td>
                      <td style={{ padding: '13px 18px', fontSize: 13, color: 'var(--text-muted)' }}>{row.method}</td>
                      <td style={{ padding: '13px 18px', fontSize: 13.5, fontWeight: 700, color: row.amount.startsWith('-') ? '#ef4444' : '#10b981' }}>{row.amount}</td>
                      <td style={{ padding: '13px 18px' }}><StatusBadge status={row.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            TAB 6: DOCUMENTS
        ══════════════════════════════════════════════════════════ */}
        {activeTab === 'Documents' && (
          <div className="card" style={{ borderRadius: 16, overflow: 'hidden', padding: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 22px', borderBottom: '1px solid var(--border)' }}>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 2px 0' }}>My Documents & Contracts</h3>
                <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: 0 }}>Secure cloud vault for your ID cards, contracts, and certifications.</p>
              </div>
              <label style={{
                background: '#10b981', color: '#fff', border: 'none', borderRadius: 8,
                padding: '7px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 6
              }}>
                <Upload size={14} /> Upload File
                <input type="file" style={{ display: 'none' }} onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) {
                    setDocuments(prev => [{
                      name: f.name,
                      type: f.name.split('.').pop()?.toUpperCase() || 'FILE',
                      size: `${(f.size / 1024).toFixed(1)} KB`,
                      date: 'Today',
                      category: 'General',
                      color: '#10b981'
                    }, ...prev])
                  }
                }} />
              </label>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {documents.map((doc, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 22px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 8, background: `${doc.color}20`, color: doc.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 10, flexShrink: 0 }}>
                    {doc.type}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{doc.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{doc.size} · Uploaded {doc.date}</div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 9999, background: 'var(--bg-primary)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                    {doc.category}
                  </span>
                  <button className="icon-btn" style={{ width: 30, height: 30 }} title="Download"><Download size={14} /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            CREATOR TOOLS QUICK ACCESS SUITE
        ══════════════════════════════════════════════════════════ */}
        <div style={{ marginTop: 40, paddingTop: 30, borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 2px 0' }}>
                Creator Studio Suite
              </h3>
              <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: 0 }}>
                Jump directly to your photo processing and document generator tools.
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14 }}>
            {creatorTools.map((tool) => {
              const Icon = tool.icon
              return (
                <div
                  key={tool.label}
                  onClick={() => router.push(tool.href)}
                  className="card"
                  style={{
                    padding: '16px 18px',
                    borderRadius: 14,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: `${tool.color}18`, color: tool.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <Icon size={18} />
                    </div>
                    <ChevronRight size={14} color="var(--text-muted)" />
                  </div>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 3 }}>
                      {tool.label}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.3 }}>
                      {tool.desc}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </DashboardLayout>
  )
}
