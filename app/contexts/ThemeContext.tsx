import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { themes, Theme, ThemeMode } from '../lib/themes'

interface ThemeContextType {
  theme: Theme
  themeMode: ThemeMode
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Initialize from localStorage or default to dark
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('theme')
    return (saved as ThemeMode) || 'dark'
  })

  const theme = themes[themeMode]

  const toggleTheme = () => {
    const newMode = themeMode === 'dark' ? 'light' : 'dark'
    setThemeMode(newMode)
    localStorage.setItem('theme', newMode)
  }

  // Apply theme to document root for Tailwind CSS variables
  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(themeMode)
    
    // Set CSS variables for dynamic theming
    const themeColors = themes[themeMode]
    root.style.setProperty('--color-background', themeColors.background)
    root.style.setProperty('--color-side-panel', themeColors.sidePanel)
    root.style.setProperty('--color-center-panel', themeColors.centerPanel)
    root.style.setProperty('--color-text-primary', themeColors.textPrimary)
    root.style.setProperty('--color-text-secondary', themeColors.textSecondary)
    root.style.setProperty('--color-border', themeColors.border)
    root.style.setProperty('--color-accent', themeColors.accent)
  }, [themeMode])

  return (
    <ThemeContext.Provider value={{ theme, themeMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}