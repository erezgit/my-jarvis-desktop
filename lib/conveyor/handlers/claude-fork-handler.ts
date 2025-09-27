import { ChildProcess, fork } from 'child_process';
import { ipcMain, app } from 'electron';
import * as path from 'path';
import { logger } from '../../utils/logger';

export class ClaudeForkHandler {
  private serverProcess: ChildProcess | null = null;
  private serverPort = 8081;
  private claudeCliPath: string | null = null;

  constructor() {
    this.setupIPCHandlers();
  }

  setClaudeCliPath(cliPath: string) {
    this.claudeCliPath = cliPath;
  }

  async startBackendServer(): Promise<{ success: boolean; port?: number; error?: string }> {
    if (this.serverProcess) {
      return { success: true, port: this.serverPort };
    }

    try {
      // Path to our backend server (Node.js) - use correct packaged path
      const serverPath = app.isPackaged
        ? path.join(process.resourcesPath, 'claude-webui-server', 'server.js')
        : path.join(process.cwd(), 'lib', 'claude-webui-server', 'server.js');

      logger.ipc.info('Starting Claude fork server at: {path}', { path: serverPath });

      // Use child_process.fork() like Actual Budget example
      this.serverProcess = fork(serverPath, ['--port', this.serverPort.toString()], {
        env: {
          ...process.env, // Inherit Claude authentication from environment
          PORT: this.serverPort.toString(),
          CLAUDE_CLI_PATH: this.claudeCliPath || 'claude'
        },
        silent: true // Capture stdout/stderr
      });

      return this.setupProcessHandlers();
    } catch (error) {
      logger.ipc.error('Failed to start fork server: {error}', { error });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private setupProcessHandlers(): Promise<{ success: boolean; port?: number; error?: string }> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        logger.ipc.error('❌ Fork server startup timeout (10s)');
        reject(new Error('Server startup timeout'));
      }, 10000);

      // Set up event handlers
      this.serverProcess?.on('spawn', () => {
        logger.ipc.info('Fork server spawned successfully');
        logger.ipc.info('Process PID: {pid}', { pid: this.serverProcess?.pid });
      });

      // Capture stdout and stderr from fork process
      this.serverProcess?.stdout?.on('data', (data) => {
        const output = data.toString().trim();
        logger.ipc.info('📡 Fork stdout: {data}', { data: output });

        // Look for server ready message
        if (output.includes(`Server ready on http://127.0.0.1:${this.serverPort}`)) {
          clearTimeout(timeoutId);
          logger.ipc.info('✅ Fork server ready on port {port}', { port: this.serverPort });
          resolve({ success: true, port: this.serverPort });
        }
      });

      this.serverProcess?.stderr?.on('data', (data) => {
        logger.ipc.error('📡 Fork stderr: {data}', { data: data.toString() });
      });

      this.serverProcess?.on('error', (error) => {
        clearTimeout(timeoutId);
        logger.ipc.error('Fork server error: {error}', { error });
        this.serverProcess = null;
        reject(error);
      });

      this.serverProcess?.on('exit', (code, signal) => {
        logger.ipc.info('Fork server exited with code {code}, signal {signal}', { code, signal });
        this.serverProcess = null;
      });

      // Listen for process messages (if server sends any)
      this.serverProcess?.on('message', (msg) => {
        logger.ipc.info('📡 Fork message received: {msg}', { msg });
      });
    });
  }

  private setupIPCHandlers() {
    ipcMain.handle('claude-backend-start', async () => {
      const result = await this.startBackendServer();
      if (result.success) {
        return {
          success: true,
          serverUrl: `http://127.0.0.1:${result.port}`,
          port: result.port
        };
      }
      return result;
    });

    ipcMain.handle('claude-backend-stop', async () => {
      if (this.serverProcess) {
        this.serverProcess.kill('SIGTERM');
        this.serverProcess = null;
        logger.ipc.info('Fork server stopped');
      }
      return { success: true };
    });

    ipcMain.handle('claude-backend-status', async () => {
      const isRunning = this.serverProcess !== null && !this.serverProcess.killed;
      return {
        running: isRunning,
        healthy: isRunning,
        ...(isRunning ? {
          port: this.serverPort,
          host: '127.0.0.1',
          serverUrl: `http://127.0.0.1:${this.serverPort}`
        } : {})
      };
    });
  }

  async cleanup(): Promise<void> {
    if (this.serverProcess) {
      this.serverProcess.kill('SIGTERM');
      this.serverProcess = null;
      logger.ipc.info('Claude fork handler cleanup completed');
    }
  }
}

// Export singleton instance
export const claudeForkHandler = new ClaudeForkHandler();