'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

type Theme = 'dark' | 'light' | 'system'

interface ThemeContextType {
  theme: Theme
  resolvedTheme: 'dark' | 'light'
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system')
  const [resolvedTheme, setResolvedTheme] = useState<'dark' | 'light'>('dark')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Check local storage or default to system
    try {
      const storedTheme = localStorage.getItem('urlm-theme') as Theme | null
      if (storedTheme) {
        setThemeState(storedTheme)
      }
    } catch (e) {
      console.error(e)
    }
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    const getSystemTheme = () => {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }

    const currentResolvedTheme = theme === 'system' ? getSystemTheme() : theme
    setResolvedTheme(currentResolvedTheme)

    const root = window.document.documentElement
    
    // Remove existing theme classes
    root.classList.remove('light', 'dark')
    root.classList.add(currentResolvedTheme)

    // Store the preference
    try {
      localStorage.setItem('urlm-theme', theme)
    } catch (e) {
      console.error(e)
    }

    // Listener for system theme changes if theme is system
    let mediaQuery: MediaQueryList | null = null
    const handler = (e: MediaQueryListEvent) => {
      if (theme === 'system') {
        const newTheme = e.matches ? 'dark' : 'light'
        setResolvedTheme(newTheme)
        root.classList.remove('light', 'dark')
        root.classList.add(newTheme)
      }
    }

    if (theme === 'system') {
      mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      mediaQuery.addEventListener('change', handler)
    }

    return () => {
      if (mediaQuery) {
        mediaQuery.removeEventListener('change', handler)
      }
    }
  }, [theme, mounted])

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {!mounted ? <div style={{ visibility: 'hidden' }}>{children}</div> : children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
