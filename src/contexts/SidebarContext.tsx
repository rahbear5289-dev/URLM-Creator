'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

interface SidebarContextType {
  isCollapsed: boolean
  toggleSidebar: () => void
  setIsCollapsed: (collapsed: boolean) => void
}

const SidebarContext = createContext<SidebarContextType>({
  isCollapsed: false,
  toggleSidebar: () => {},
  setIsCollapsed: () => {},
})

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsedState] = useState<boolean>(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('urlm_sidebar_collapsed')
      if (saved !== null) {
        setIsCollapsedState(saved === 'true')
      }
    } catch {
      // ignore
    }
    setMounted(true)
  }, [])

  const toggleSidebar = () => {
    setIsCollapsedState((prev) => {
      const next = !prev
      try {
        localStorage.setItem('urlm_sidebar_collapsed', String(next))
      } catch {
        // ignore
      }
      return next
    })
  }

  const setIsCollapsed = (collapsed: boolean) => {
    setIsCollapsedState(collapsed)
    try {
      localStorage.setItem('urlm_sidebar_collapsed', String(collapsed))
    } catch {
      // ignore
    }
  }

  return (
    <SidebarContext.Provider value={{ isCollapsed, toggleSidebar, setIsCollapsed }}>
      {children}
    </SidebarContext.Provider>
  )
}

export const useSidebar = () => useContext(SidebarContext)
