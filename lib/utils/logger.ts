// Simple console logger for clean app
export const logger = {
  main: {
    info: (message: string, data?: any) => console.log('[MAIN]', message, data || ''),
    warn: (message: string, data?: any) => console.warn('[MAIN]', message, data || ''),
    error: (message: string, data?: any) => console.error('[MAIN]', message, data || ''),
    debug: (message: string, data?: any) => console.log('[MAIN DEBUG]', message, data || ''),
  },
  claude: {
    info: (message: string, data?: any) => console.log('[CLAUDE]', message, data || ''),
    warn: (message: string, data?: any) => console.warn('[CLAUDE]', message, data || ''),
    error: (message: string, data?: any) => console.error('[CLAUDE]', message, data || ''),
    debug: (message: string, data?: any) => console.log('[CLAUDE DEBUG]', message, data || ''),
  },
  ipc: {
    info: (message: string, data?: any) => console.log('[IPC]', message, data || ''),
    warn: (message: string, data?: any) => console.warn('[IPC]', message, data || ''),
    error: (message: string, data?: any) => console.error('[IPC]', message, data || ''),
    debug: (message: string, data?: any) => console.log('[IPC DEBUG]', message, data || ''),
  }
}

export async function setupLogger(debug: boolean = false) {
  // Simple setup for now
  return Promise.resolve()
}