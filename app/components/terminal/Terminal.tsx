'use client'

import { ElectronTerminal } from './ElectronTerminal'
import { WebTerminal } from './WebTerminal'
import { isElectronMode } from '@/app/config/deployment'

interface TerminalProps {
  className?: string
  id?: string
  wsUrl?: string // Only used in web mode
}

/**
 * Smart Terminal component that automatically selects the correct
 * implementation based on deployment mode (Electron vs Web).
 *
 * Uses the existing platform detection system from app/config/deployment.ts
 */
export function Terminal(props: TerminalProps) {
  // Use your existing platform detection
  const isElectron = isElectronMode()

  // Generate WebSocket URL based on current location (for web mode)
  const getWebSocketUrl = (): string => {
    if (props.wsUrl) return props.wsUrl

    if (typeof window === 'undefined') return 'ws://localhost:10000/terminal'

    // Use current page URL with /terminal path
    // WebSocket shares the same port as HTTP server
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host // Includes hostname and port

    return `${protocol}//${host}/terminal`
  }

  // Log for debugging
  if (typeof window !== 'undefined' && import.meta.env.DEV) {
    console.log(`[Terminal] Rendering ${isElectron ? 'Electron' : 'Web'} terminal`)
    if (!isElectron) {
      console.log(`[Terminal] WebSocket URL: ${getWebSocketUrl()}`)
    }
  }

  // Render appropriate terminal based on platform
  return isElectron ? (
    <ElectronTerminal
      id={props.id}
      className={props.className}
    />
  ) : (
    <WebTerminal
      className={props.className}
      wsUrl={getWebSocketUrl()}
    />
  )
}

export default Terminal
