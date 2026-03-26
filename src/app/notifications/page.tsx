'use client'

import { useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { Bell, CheckCheck, Trash2 } from 'lucide-react'

const initialNotifications = [
  { id: 1, title: 'Your sheet is ready!', body: 'Passport_Sheet_821.pdf has been generated and is ready for download.', time: '2 minutes ago', type: 'success', read: false },
  { id: 2, title: 'Batch Upload Complete', body: '12 photos have been uploaded and processed successfully.', time: '45 minutes ago', type: 'info', read: false },
  { id: 3, title: 'AI Enhancement Done', body: 'Profile_Photo_A.jpg background has been removed. Edge precision: 99.8%', time: '2 hours ago', type: 'success', read: false },
  { id: 4, title: 'System Update', body: 'URLM has been updated to v2.1. New features: Batch processing, improved AI accuracy.', time: '1 day ago', type: 'update', read: true },
  { id: 5, title: 'Storage Warning', body: 'You have used 82% of your storage. Consider upgrading your plan.', time: '2 days ago', type: 'warning', read: true },
  { id: 6, title: 'Welcome to URLM!', body: 'Your account has been created. Start by uploading your first photo.', time: '3 days ago', type: 'info', read: true },
]

const typeConfig = {
  success: { icon: '✅', color: '#34d399', bg: 'rgba(52, 211, 153, 0.12)' },
  info: { icon: '📢', color: 'var(--accent-blue)', bg: 'rgba(79, 142, 247, 0.12)' },
  update: { icon: '⚡', color: 'var(--accent-purple)', bg: 'rgba(124, 92, 246, 0.12)' },
  warning: { icon: '⚠️', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' },
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState(initialNotifications)

  const unreadCount = notifications.filter((n) => !n.read).length

  const markAllRead = () => {
    setNotifications((n) => n.map((item) => ({ ...item, read: true })))
  }

  const markRead = (id: number) => {
    setNotifications((n) => n.map((item) => item.id === id ? { ...item, read: true } : item))
  }

  const deleteNotif = (id: number) => {
    setNotifications((n) => n.filter((item) => item.id !== id))
  }

  const clearAll = () => {
    setNotifications([])
  }

  return (
    <DashboardLayout>
      <div style={{ maxWidth: 700 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              Notifications
              {unreadCount > 0 && <span className="badge" style={{ position: 'static', fontSize: 12, padding: '2px 8px', width: 'auto', height: 'auto' }}>{unreadCount}</span>}
            </h1>
            <p className="page-subtitle">Stay updated with your sheet generation and system alerts.</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {unreadCount > 0 && (
              <button id="mark-all-read-btn" className="btn btn-secondary btn-sm" onClick={markAllRead}>
                <CheckCheck size={14} />
                Mark all read
              </button>
            )}
            <button id="clear-all-notifs-btn" className="btn btn-secondary btn-sm" onClick={clearAll}>
              <Trash2 size={14} />
              Clear all
            </button>
          </div>
        </div>

        {notifications.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 60 }}>
            <Bell size={48} color="var(--text-muted)" style={{ margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>All caught up!</h3>
            <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>No notifications at the moment.</p>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {notifications.map((notif, i) => {
              const config = typeConfig[notif.type as keyof typeof typeConfig]
              return (
                <div
                  key={notif.id}
                  id={`notification-${notif.id}`}
                  style={{
                    display: 'flex', gap: 14, padding: '16px 20px',
                    borderBottom: i < notifications.length - 1 ? '1px solid var(--border)' : 'none',
                    background: !notif.read ? 'rgba(124, 92, 246, 0.04)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'background 0.15s'
                  }}
                  onClick={() => markRead(notif.id)}
                >
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: config.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18, flexShrink: 0
                  }}>
                    {config.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{notif.title}</span>
                      {!notif.read && (
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent-purple)', display: 'inline-block' }} />
                      )}
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 4 }}>{notif.body}</p>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{notif.time}</span>
                  </div>
                  <button
                    id={`delete-notif-${notif.id}-btn`}
                    className="icon-btn"
                    style={{ width: 30, height: 30, flexShrink: 0 }}
                    onClick={(e) => { e.stopPropagation(); deleteNotif(notif.id) }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
