/**
 * Centralized deployment mode configuration
 *
 * This module provides a single source of truth for determining whether
 * the application is running in Electron desktop mode or web browser mode.
 *
 * The deployment mode is set at build time via the VITE_DEPLOYMENT_MODE
 * environment variable, which is injected by the build configuration:
 * - electron.vite.config.ts sets it to 'electron' for desktop builds
 * - vite.web.config.mts sets it to 'web' for browser builds
 *
 * Usage:
 * ```typescript
 * import { isElectronMode, isWebMode } from '@/app/config/deployment'
 *
 * if (isElectronMode()) {
 *   // Use Electron-specific features (IPC, file system access, etc.)
 * } else if (isWebMode()) {
 *   // Use web-specific features (HTTP APIs, browser APIs, etc.)
 * }
 * ```
 */

export type DeploymentMode = 'electron' | 'web'

/**
 * The current deployment mode, set at build time
 */
export const DEPLOYMENT_MODE = import.meta.env.VITE_DEPLOYMENT_MODE as DeploymentMode

/**
 * Check if running in Electron desktop mode
 * @returns true if running as Electron desktop app
 */
export const isElectronMode = (): boolean => DEPLOYMENT_MODE === 'electron'

/**
 * Check if running in web browser mode
 * @returns true if running as web application in browser
 */
export const isWebMode = (): boolean => DEPLOYMENT_MODE === 'web'

// Development mode debugging
if (import.meta.env.DEV) {
  console.log(`[Deployment] Running in ${DEPLOYMENT_MODE} mode`)
}
