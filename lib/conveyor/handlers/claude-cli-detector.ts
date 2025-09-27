import { exec } from 'child_process'
import { promisify } from 'util'
import * as path from 'path'
import * as fs from 'fs'
import * as os from 'os'
import { logger } from '../../utils/logger'

const execAsync = promisify(exec)
const fsPromises = fs.promises

/**
 * Detects the Claude CLI executable path dynamically
 * Based on example project's validation.ts approach
 * Handles various installation methods (npm, yarn, pnpm, global)
 */
export class ClaudeCliDetector {
  private cachedPath: string | null = null

  /**
   * Main detection method - tries multiple strategies
   */
  async detectClaudePath(): Promise<string | null> {
    // Return cached path if already detected
    if (this.cachedPath) {
      return this.cachedPath
    }

    // FIX: Ensure HOME environment variable points to actual user home directory
    // This fixes authentication context in packaged Electron apps
    if (!process.env.HOME || process.env.HOME !== os.homedir()) {
      logger.claude.info(`Fixing HOME directory: ${process.env.HOME} -> ${os.homedir()}`)
      process.env.HOME = os.homedir()
    }

    logger.claude.debug('Detecting Claude CLI path')
    logger.claude.debug('Process CWD: {cwd}', { cwd: process.cwd() })
    logger.claude.debug('Process Resources Path: {resourcesPath}', { resourcesPath: process.resourcesPath || 'Not in production' })
    logger.claude.debug('HOME Directory: {home}', { home: process.env.HOME })

    // Strategy 1: Check common local installation paths (includes production paths)
    const localPath = await this.findLocalInstallation()
    if (localPath) {
      logger.claude.info('Found local Claude: {path}', { path: localPath })
      this.cachedPath = localPath
      return localPath
    }

    // Strategy 2: Check if 'claude' is in PATH (global installation)
    const globalPath = await this.findInPath()
    if (globalPath) {
      logger.claude.info('Found Claude in PATH: {path}', { path: globalPath })
      this.cachedPath = globalPath
      return globalPath
    }

    // Strategy 3: Try to trace the actual script path (advanced detection)
    const tracedPath = await this.traceScriptPath()
    if (tracedPath) {
      logger.claude.info('Traced Claude script: {path}', { path: tracedPath })
      this.cachedPath = tracedPath
      return tracedPath
    }

    logger.claude.error('Claude CLI not found')
    return null
  }

  /**
   * Find Claude in system PATH
   */
  private async findInPath(): Promise<string | null> {
    try {
      const { stdout } = await execAsync('which claude')
      const claudePath = stdout.trim()

      if (claudePath && await this.validateClaude(claudePath)) {
        // If it's a symlink, try to resolve the actual target
        const realPath = await this.resolveSymlink(claudePath)
        return realPath || claudePath
      }
    } catch {
      // 'which' command failed, Claude not in PATH
    }
    return null
  }

  /**
   * Check common local installation paths
   */
  private async findLocalInstallation(): Promise<string | null> {
    const possiblePaths = []

    // PRODUCTION: Check Electron's resource path FIRST
    if (process.resourcesPath) {
      // In production, node_modules are in app.asar.unpacked
      possiblePaths.push(
        path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', '@anthropic-ai', 'claude-code', 'cli.js'),
        path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', '.bin', 'claude')
      )
    }

    // DEVELOPMENT: Check local project paths
    possiblePaths.push(
      // Local node_modules in current project
      path.join(process.cwd(), 'node_modules', '.bin', 'claude'),
      path.join(process.cwd(), 'node_modules', '@anthropic-ai', 'claude-code', 'cli.js'),

      // Parent directories (monorepo setup)
      path.join(process.cwd(), '..', 'node_modules', '.bin', 'claude'),
      path.join(process.cwd(), '..', 'node_modules', '@anthropic-ai', 'claude-code', 'cli.js'),

      // Global npm/yarn paths
      path.join(os.homedir(), '.npm', 'bin', 'claude'),
      path.join(os.homedir(), '.yarn', 'bin', 'claude'),
      path.join(os.homedir(), '.pnpm', 'bin', 'claude'),

      // macOS specific paths
      '/usr/local/bin/claude',
      '/opt/homebrew/bin/claude',
      path.join(os.homedir(), '.bun', 'bin', 'claude')
    )

    for (const possiblePath of possiblePaths) {
      try {
        const stats = await fsPromises.stat(possiblePath)
        if (stats.isFile() || stats.isSymbolicLink()) {
          if (await this.validateClaude(possiblePath)) {
            // Resolve symlinks to get actual script
            const realPath = await this.resolveSymlink(possiblePath)
            return realPath || possiblePath
          }
        }
      } catch {
        // Path doesn't exist, continue checking
      }
    }

    return null
  }

  /**
   * Advanced detection: trace the actual script being executed
   * This mimics the example project's approach with temporary node wrapper
   */
  private async traceScriptPath(): Promise<string | null> {
    try {
      const tempDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'claude-detect-'))
      const traceFile = path.join(tempDir, 'trace.log')

      // Create a wrapper script that logs the actual script being executed
      const wrapperScript = process.platform === 'win32'
        ? await this.createWindowsWrapper(tempDir, traceFile)
        : await this.createUnixWrapper(tempDir, traceFile)

      // Execute claude with our wrapper in PATH
      const env = { ...process.env }
      env.PATH = `${tempDir}${path.delimiter}${process.env.PATH}`

      try {
        await execAsync('claude --version', { env })

        // Read the trace file to get the actual script path
        const traceContent = await fsPromises.readFile(traceFile, 'utf-8')
        const scriptPath = traceContent.trim().split('\n')[0]

        // Clean up temp files
        await fsPromises.rm(tempDir, { recursive: true, force: true })

        if (scriptPath && await this.validateClaude(scriptPath)) {
          return scriptPath
        }
      } catch (error) {
        // Clean up on error
        await fsPromises.rm(tempDir, { recursive: true, force: true })
      }
    } catch (error) {
      logger.claude.error('Trace detection failed: {error}', { error })
    }

    return null
  }

  /**
   * Create Unix wrapper script for tracing
   */
  private async createUnixWrapper(tempDir: string, traceFile: string): Promise<string> {
    const wrapperPath = path.join(tempDir, 'node')
    const nodeExecutable = await this.findNodeExecutable()

    const wrapperContent = `#!/bin/bash
echo "$1" >> "${traceFile}"
exec "${nodeExecutable}" "$@"
`

    await fsPromises.writeFile(wrapperPath, wrapperContent)
    await fsPromises.chmod(wrapperPath, 0o755)

    return wrapperPath
  }

  /**
   * Create Windows wrapper script for tracing
   */
  private async createWindowsWrapper(tempDir: string, traceFile: string): Promise<string> {
    const wrapperPath = path.join(tempDir, 'node.bat')
    const nodeExecutable = await this.findNodeExecutable()

    const wrapperContent = `@echo off
echo %~1 >> "${traceFile}"
"${nodeExecutable}" %*
`

    await fsPromises.writeFile(wrapperPath, wrapperContent)

    return wrapperPath
  }

  /**
   * Find the actual node executable
   */
  async findNodeExecutable(): Promise<string> {
    try {
      const { stdout } = await execAsync('which node')
      return stdout.trim()
    } catch {
      // Fallback to process.execPath
      return process.execPath
    }
  }

  /**
   * Resolve symlinks to get the actual file
   */
  private async resolveSymlink(filePath: string): Promise<string | null> {
    try {
      const stats = await fsPromises.lstat(filePath)
      if (stats.isSymbolicLink()) {
        const target = await fsPromises.readlink(filePath)
        // If target is relative, resolve it relative to the symlink's directory
        if (!path.isAbsolute(target)) {
          return path.join(path.dirname(filePath), target)
        }
        return target
      }
      return filePath
    } catch {
      return null
    }
  }

  /**
   * Validate that a path is actually the Claude CLI
   */
  private async validateClaude(claudePath: string): Promise<boolean> {
    try {
      // First check if the file exists and is executable
      const stats = await fsPromises.stat(claudePath)
      if (!stats.isFile()) {
        return false
      }

      // For production builds, check if it's the Claude CLI by path pattern
      // Don't run --version as it requires authentication which may fail in production context
      if (claudePath.includes('@anthropic-ai/claude-code') ||
          claudePath.includes('claude-code/cli.js') ||
          claudePath.endsWith('/claude') ||
          claudePath.endsWith('\\claude')) {
        logger.claude.debug('Validated Claude CLI by path pattern: {path}', { path: claudePath })
        return true
      }

      // For other paths, try --version but don't fail if it errors (might be auth issue)
      try {
        const { stdout } = await execAsync(`"${claudePath}" --version`)
        return stdout.toLowerCase().includes('claude')
      } catch (versionError) {
        // If the file exists and looks like Claude, accept it even if --version fails
        // This handles the case where CLI exists but auth is not set up yet
        logger.claude.warn('Claude --version failed (might be auth issue), but file exists: {path}', { path: claudePath })
        return claudePath.includes('claude')
      }
    } catch (error) {
      logger.claude.error('Failed to validate Claude: {error}', { path: claudePath, error })
      return false
    }
  }

  /**
   * Clear the cached path (useful for testing or retrying)
   */
  clearCache(): void {
    this.cachedPath = null
  }
}

// Export singleton instance
export const claudeCliDetector = new ClaudeCliDetector()