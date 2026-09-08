'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import {
  Pencil, MoreHorizontal, Check, X,
  FileText, Briefcase, Clock, Receipt, CreditCard, Folder,
  Shield, CheckCircle2, ChevronRight
} from 'lucide-react'

export default function ProfilePage() {
  const router = useRouter()
  const { user } = useAuth()
  
  const [activeTab, setActiveTab] = useState<'Personal' | 'Job' | 'Time off' | 'Invoices' | 'Billing activities' | 'Documents'>('Personal')
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)

  // Profile Form States
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

  // Emergency contact
  const [emergencyName, setEmergencyName] = useState('John Smith')
  const [emergencyRel, setEmergencyRel] = useState('Husband')
  const [emergencyNat, setEmergencyNat] = useState('Dutch')
  const [emergencyPhone, setEmergencyPhone] = useState('+31 22 419 2675')
  const [emergencyEmail, setEmergencyEmail] = useState('john.smith@company.com')

  // Account information
  const [accountName, setAccountName] = useState('John Smith')
  const [bankName, setBankName] = useState('ABN AMRO')
  const [bankNumber, setBankNumber] = useState('000 2334 454 6677')
  const [bankCountry, setBankCountry] = useState('Belgium')

  useEffect(() => {
    if (user) {
      if (user.email) setEmail(user.email)
      const metaName = user.user_metadata?.full_name
      if (metaName) setFullName(metaName)

      // Fetch from profiles table if exists
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

  return (
    <DashboardLayout>
      <div style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: 60 }}>
        
        {/* Top Breadcrumb & Action Row */}
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
              onClick={() => {
                if (isEditing) {
                  handleSave()
                } else {
                  setIsEditing(true)
                }
              }}
              style={{
                background: '#10b981',
                color: '#ffffff',
                border: 'none',
                borderRadius: 8,
                padding: '8px 18px',
                fontSize: 13.5,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)',
                transition: 'all 0.15s ease'
              }}
            >
              <Pencil size={14} />
              {isEditing ? (saving ? 'Saving...' : 'Save Profile') : 'Edit Profile'}
            </button>

            {isEditing && (
              <button
                onClick={() => setIsEditing(false)}
                style={{
                  background: 'var(--bg-card)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: '8px 14px',
                  fontSize: 13.5,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            )}

            <button
              className="icon-btn"
              style={{ width: 36, height: 36, borderRadius: 8, border: '1px solid var(--border)' }}
              title="More options"
            >
              <span style={{ fontSize: 12, fontWeight: 600, marginRight: 2 }}>More</span>
              <MoreHorizontal size={14} />
            </button>
          </div>
        </div>

        {/* Hero Profile Card */}
        <div className="card" style={{ padding: '24px 28px', marginBottom: 24, borderRadius: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            {/* Avatar */}
            <div style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              overflow: 'hidden',
              border: '3px solid rgba(16, 185, 129, 0.2)',
              flexShrink: 0,
              background: '#0d2219',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80"
                alt={fullName}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>

            {/* Profile Info */}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
                <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  {fullName}
                </h1>
                <span style={{
                  background: '#10b981',
                  color: '#ffffff',
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '2px 10px',
                  borderRadius: 9999
                }}>
                  {roleTitle}
                </span>
              </div>

              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
                {email}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                <span>Started on January 01, 2024 (2.5 years ago)</span>
                <span>•</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#10b981', fontWeight: 600 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
                  Active
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation Bar */}
        <div style={{
          display: 'flex',
          gap: 28,
          borderBottom: '1px solid var(--border)',
          marginBottom: 24,
          overflowX: 'auto'
        }}>
          {tabs.map(tab => {
            const isActive = activeTab === tab
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: '10px 4px',
                  fontSize: 14,
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? '#10b981' : 'var(--text-muted)',
                  cursor: 'pointer',
                  position: 'relative',
                  whiteSpace: 'nowrap',
                  transition: 'color 0.15s ease'
                }}
              >
                {tab}
                {isActive && (
                  <span style={{
                    position: 'absolute',
                    bottom: -1,
                    left: 0,
                    right: 0,
                    height: 2.5,
                    background: '#10b981',
                    borderRadius: 2
                  }} />
                )}
              </button>
            )
          })}
        </div>

        {/* TAB 1: Personal (matching reference image 1) */}
        {activeTab === 'Personal' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: 20, alignItems: 'start' }}>
            
            {/* Card 1: Personal information */}
            <div className="card" style={{ borderRadius: 16, padding: '22px 26px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  Personal information
                </h3>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                  title="Edit section"
                >
                  <Pencil size={15} />
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', rowGap: 20, columnGap: 24 }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Gender</div>
                  {isEditing ? (
                    <input
                      type="text"
                      className="input"
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      style={{ padding: '6px 10px', fontSize: 13 }}
                    />
                  ) : (
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{gender}</div>
                  )}
                </div>

                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Date of birth</div>
                  {isEditing ? (
                    <input
                      type="text"
                      className="input"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      style={{ padding: '6px 10px', fontSize: 13 }}
                    />
                  ) : (
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{dob}</div>
                  )}
                </div>

                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Identity document</div>
                  {isEditing ? (
                    <input
                      type="text"
                      className="input"
                      value={identityDoc}
                      onChange={(e) => setIdentityDoc(e.target.value)}
                      style={{ padding: '6px 10px', fontSize: 13 }}
                    />
                  ) : (
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{identityDoc}</div>
                  )}
                </div>

                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Nationality</div>
                  {isEditing ? (
                    <input
                      type="text"
                      className="input"
                      value={nationality}
                      onChange={(e) => setNationality(e.target.value)}
                      style={{ padding: '6px 10px', fontSize: 13 }}
                    />
                  ) : (
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{nationality}</div>
                  )}
                </div>

                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Marital status</div>
                  {isEditing ? (
                    <input
                      type="text"
                      className="input"
                      value={maritalStatus}
                      onChange={(e) => setMaritalStatus(e.target.value)}
                      style={{ padding: '6px 10px', fontSize: 13 }}
                    />
                  ) : (
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{maritalStatus}</div>
                  )}
                </div>

                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Phone number</div>
                  {isEditing ? (
                    <input
                      type="text"
                      className="input"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      style={{ padding: '6px 10px', fontSize: 13 }}
                    />
                  ) : (
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{phone}</div>
                  )}
                </div>

                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Email</div>
                  {isEditing ? (
                    <input
                      type="email"
                      className="input"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      style={{ padding: '6px 10px', fontSize: 13 }}
                    />
                  ) : (
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{email}</div>
                  )}
                </div>

                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Address</div>
                  {isEditing ? (
                    <input
                      type="text"
                      className="input"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      style={{ padding: '6px 10px', fontSize: 13 }}
                    />
                  ) : (
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4 }}>{address}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Card 2: Emergency contact */}
            <div className="card" style={{ borderRadius: 16, padding: '22px 26px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  Emergency contact
                </h3>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                  title="Edit section"
                >
                  <Pencil size={15} />
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', rowGap: 20, columnGap: 24 }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Name</div>
                  {isEditing ? (
                    <input
                      type="text"
                      className="input"
                      value={emergencyName}
                      onChange={(e) => setEmergencyName(e.target.value)}
                      style={{ padding: '6px 10px', fontSize: 13 }}
                    />
                  ) : (
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{emergencyName}</div>
                  )}
                </div>

                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Relationship</div>
                  {isEditing ? (
                    <input
                      type="text"
                      className="input"
                      value={emergencyRel}
                      onChange={(e) => setEmergencyRel(e.target.value)}
                      style={{ padding: '6px 10px', fontSize: 13 }}
                    />
                  ) : (
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{emergencyRel}</div>
                  )}
                </div>

                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Nationality</div>
                  {isEditing ? (
                    <input
                      type="text"
                      className="input"
                      value={emergencyNat}
                      onChange={(e) => setEmergencyNat(e.target.value)}
                      style={{ padding: '6px 10px', fontSize: 13 }}
                    />
                  ) : (
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{emergencyNat}</div>
                  )}
                </div>

                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Phone number</div>
                  {isEditing ? (
                    <input
                      type="text"
                      className="input"
                      value={emergencyPhone}
                      onChange={(e) => setEmergencyPhone(e.target.value)}
                      style={{ padding: '6px 10px', fontSize: 13 }}
                    />
                  ) : (
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{emergencyPhone}</div>
                  )}
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Email</div>
                  {isEditing ? (
                    <input
                      type="email"
                      className="input"
                      value={emergencyEmail}
                      onChange={(e) => setEmergencyEmail(e.target.value)}
                      style={{ padding: '6px 10px', fontSize: 13 }}
                    />
                  ) : (
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{emergencyEmail}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Card 3: Account information */}
            <div className="card" style={{ borderRadius: 16, padding: '22px 26px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  Account information
                </h3>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                  title="Edit section"
                >
                  <Pencil size={15} />
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', rowGap: 20, columnGap: 24 }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Account name</div>
                  {isEditing ? (
                    <input
                      type="text"
                      className="input"
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                      style={{ padding: '6px 10px', fontSize: 13 }}
                    />
                  ) : (
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{accountName}</div>
                  )}
                </div>

                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Bank name</div>
                  {isEditing ? (
                    <input
                      type="text"
                      className="input"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      style={{ padding: '6px 10px', fontSize: 13 }}
                    />
                  ) : (
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{bankName}</div>
                  )}
                </div>

                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Bank number</div>
                  {isEditing ? (
                    <input
                      type="text"
                      className="input"
                      value={bankNumber}
                      onChange={(e) => setBankNumber(e.target.value)}
                      style={{ padding: '6px 10px', fontSize: 13 }}
                    />
                  ) : (
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{bankNumber}</div>
                  )}
                </div>

                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Bank country</div>
                  {isEditing ? (
                    <input
                      type="text"
                      className="input"
                      value={bankCountry}
                      onChange={(e) => setBankCountry(e.target.value)}
                      style={{ padding: '6px 10px', fontSize: 13 }}
                    />
                  ) : (
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{bankCountry}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Card 4: Education information */}
            <div className="card" style={{ borderRadius: 16, padding: '22px 26px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  Education information
                </h3>
                <button
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                  title="Edit section"
                >
                  <Pencil size={15} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                      Bachelor of Design
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>2012 - 2016</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
                    Eindhoven University of Technology
                  </div>
                </div>

                <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                      Certificate in User Interface Design
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>2018 - 2019</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
                    Coursera
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                      Certificate in User Experience Design
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>2019 - 2020</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
                    Coursera
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* OTHER TABS */}
        {activeTab !== 'Personal' && (
          <div className="card" style={{ padding: 40, textAlign: 'center', borderRadius: 16 }}>
            <div style={{
              width: 54,
              height: 54,
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.12)',
              color: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              {activeTab === 'Job' && <Briefcase size={24} />}
              {activeTab === 'Time off' && <Clock size={24} />}
              {activeTab === 'Invoices' && <Receipt size={24} />}
              {activeTab === 'Billing activities' && <CreditCard size={24} />}
              {activeTab === 'Documents' && <Folder size={24} />}
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
              {activeTab} Overview
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 460, margin: '0 auto 20px' }}>
              All records, history, and verification files related to {activeTab.toLowerCase()} are synced with your enterprise account.
            </p>
            <button
              onClick={() => setActiveTab('Personal')}
              className="btn btn-secondary"
              style={{ borderRadius: 8, fontSize: 13 }}
            >
              Back to Personal
            </button>
          </div>
        )}

      </div>
    </DashboardLayout>
  )
}
