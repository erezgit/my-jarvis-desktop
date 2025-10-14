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

  // Log for debugging
  if (typeof window !== 'undefined' && import.meta.env.DEV) {
    console.log(`[Terminal] Rendering ${isElectron ? 'Electron' : 'Web'} terminal`)
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
      wsUrl={props.wsUrl}
    />
  )
}

export default Terminal
