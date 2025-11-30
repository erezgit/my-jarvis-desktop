/**
 * Deployment configuration for web-only mode
 *
 * This application now runs exclusively in web browser mode.
 * All Electron legacy code has been removed for simplicity.
 *
 * Usage:
 * ```typescript
 * import { isWebMode } from '@/app/config/deployment'
 *
 * if (isWebMode()) {
 *   // Use web-specific features (HTTP APIs, browser APIs, etc.)
 * }
 * ```
 */

export type DeploymentMode = 'web'

/**
 * The current deployment mode - always web
 */
export const DEPLOYMENT_MODE: DeploymentMode = 'web'

/**
 * Check if running in Electron desktop mode
 * @returns false - Electron mode has been removed
 * @deprecated Electron support has been removed
 */
export const isElectronMode = (): boolean => false

/**
 * Check if running in web browser mode
 * @returns true - always runs as web application
 */
export const isWebMode = (): boolean => true

// Development mode debugging
if (import.meta.env.DEV) {
  console.log(`[Deployment] Running in web-only mode (Electron legacy removed)`)
}
