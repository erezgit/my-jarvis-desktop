"use strict";
const electron = require("electron");
const utils = require("@electron-toolkit/utils");
const path = require("path");
const child_process = require("child_process");
const util = require("util");
const fs = require("fs");
const os = require("os");
function _interopNamespaceDefault(e) {
  const n = Object.create(null, { [Symbol.toStringTag]: { value: "Module" } });
  if (e) {
    for (const k in e) {
      if (k !== "default") {
        const d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: () => e[k]
        });
      }
    }
  }
  n.default = e;
  return Object.freeze(n);
}
const path__namespace = /* @__PURE__ */ _interopNamespaceDefault(path);
const fs__namespace = /* @__PURE__ */ _interopNamespaceDefault(fs);
const os__namespace = /* @__PURE__ */ _interopNamespaceDefault(os);
function createAppWindow() {
  const mainWindow = new electron.BrowserWindow({
    width: 1400,
    height: 900,
    show: false,
    backgroundColor: "#1c1c1c",
    frame: false,
    titleBarStyle: "hiddenInset",
    title: "My Jarvis Clean",
    maximizable: true,
    resizable: true,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.js"),
      sandbox: false
    }
  });
  mainWindow.on("ready-to-show", () => {
    mainWindow.show();
  });
  mainWindow.webContents.setWindowOpenHandler((details) => {
    electron.shell.openExternal(details.url);
    return { action: "deny" };
  });
  mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
}
const logger = {
  main: {
    info: (message, data) => console.log("[MAIN]", message, data || ""),
    warn: (message, data) => console.warn("[MAIN]", message, data || ""),
    error: (message, data) => console.error("[MAIN]", message, data || ""),
    debug: (message, data) => console.log("[MAIN DEBUG]", message, data || "")
  },
  claude: {
    info: (message, data) => console.log("[CLAUDE]", message, data || ""),
    warn: (message, data) => console.warn("[CLAUDE]", message, data || ""),
    error: (message, data) => console.error("[CLAUDE]", message, data || ""),
    debug: (message, data) => console.log("[CLAUDE DEBUG]", message, data || "")
  },
  ipc: {
    info: (message, data) => console.log("[IPC]", message, data || ""),
    warn: (message, data) => console.warn("[IPC]", message, data || ""),
    error: (message, data) => console.error("[IPC]", message, data || ""),
    debug: (message, data) => console.log("[IPC DEBUG]", message, data || "")
  }
};
async function setupLogger(debug = false) {
  return Promise.resolve();
}
class ClaudeForkHandler {
  serverProcess = null;
  serverPort = 8081;
  claudeCliPath = null;
  constructor() {
    this.setupIPCHandlers();
  }
  setClaudeCliPath(cliPath) {
    this.claudeCliPath = cliPath;
  }
  async startBackendServer() {
    if (this.serverProcess) {
      return { success: true, port: this.serverPort };
    }
    try {
      const serverPath = electron.app.isPackaged ? path__namespace.join(process.resourcesPath, "claude-webui-server", "server.js") : path__namespace.join(process.cwd(), "lib", "claude-webui-server", "server.js");
      logger.ipc.info("Starting Claude fork server at: {path}", { path: serverPath });
      this.serverProcess = child_process.fork(serverPath, ["--port", this.serverPort.toString()], {
        env: {
          ...process.env,
          // Inherit Claude authentication from environment
          PORT: this.serverPort.toString(),
          CLAUDE_CLI_PATH: this.claudeCliPath || "claude"
        },
        silent: true
        // Capture stdout/stderr
      });
      return this.setupProcessHandlers();
    } catch (error) {
      logger.ipc.error("Failed to start fork server: {error}", { error });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  setupProcessHandlers() {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        logger.ipc.error("❌ Fork server startup timeout (10s)");
        reject(new Error("Server startup timeout"));
      }, 1e4);
      this.serverProcess?.on("spawn", () => {
        logger.ipc.info("Fork server spawned successfully");
        logger.ipc.info("Process PID: {pid}", { pid: this.serverProcess?.pid });
      });
      this.serverProcess?.stdout?.on("data", (data) => {
        const output = data.toString().trim();
        logger.ipc.info("📡 Fork stdout: {data}", { data: output });
        if (output.includes(`Server ready on http://127.0.0.1:${this.serverPort}`)) {
          clearTimeout(timeoutId);
          logger.ipc.info("✅ Fork server ready on port {port}", { port: this.serverPort });
          resolve({ success: true, port: this.serverPort });
        }
      });
      this.serverProcess?.stderr?.on("data", (data) => {
        logger.ipc.error("📡 Fork stderr: {data}", { data: data.toString() });
      });
      this.serverProcess?.on("error", (error) => {
        clearTimeout(timeoutId);
        logger.ipc.error("Fork server error: {error}", { error });
        this.serverProcess = null;
        reject(error);
      });
      this.serverProcess?.on("exit", (code, signal) => {
        logger.ipc.info("Fork server exited with code {code}, signal {signal}", { code, signal });
        this.serverProcess = null;
      });
      this.serverProcess?.on("message", (msg) => {
        logger.ipc.info("📡 Fork message received: {msg}", { msg });
      });
    });
  }
  setupIPCHandlers() {
    electron.ipcMain.handle("claude-backend-start", async () => {
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
    electron.ipcMain.handle("claude-backend-stop", async () => {
      if (this.serverProcess) {
        this.serverProcess.kill("SIGTERM");
        this.serverProcess = null;
        logger.ipc.info("Fork server stopped");
      }
      return { success: true };
    });
    electron.ipcMain.handle("claude-backend-status", async () => {
      const isRunning = this.serverProcess !== null && !this.serverProcess.killed;
      return {
        running: isRunning,
        healthy: isRunning,
        ...isRunning ? {
          port: this.serverPort,
          host: "127.0.0.1",
          serverUrl: `http://127.0.0.1:${this.serverPort}`
        } : {}
      };
    });
  }
  async cleanup() {
    if (this.serverProcess) {
      this.serverProcess.kill("SIGTERM");
      this.serverProcess = null;
      logger.ipc.info("Claude fork handler cleanup completed");
    }
  }
}
const claudeForkHandler = new ClaudeForkHandler();
const execAsync = util.promisify(child_process.exec);
const fsPromises = fs__namespace.promises;
class ClaudeCliDetector {
  cachedPath = null;
  /**
   * Main detection method - tries multiple strategies
   */
  async detectClaudePath() {
    if (this.cachedPath) {
      return this.cachedPath;
    }
    if (!process.env.HOME || process.env.HOME !== os__namespace.homedir()) {
      logger.claude.info(`Fixing HOME directory: ${process.env.HOME} -> ${os__namespace.homedir()}`);
      process.env.HOME = os__namespace.homedir();
    }
    logger.claude.debug("Detecting Claude CLI path");
    logger.claude.debug("Process CWD: {cwd}", { cwd: process.cwd() });
    logger.claude.debug("Process Resources Path: {resourcesPath}", { resourcesPath: process.resourcesPath || "Not in production" });
    logger.claude.debug("HOME Directory: {home}", { home: process.env.HOME });
    const localPath = await this.findLocalInstallation();
    if (localPath) {
      logger.claude.info("Found local Claude: {path}", { path: localPath });
      this.cachedPath = localPath;
      return localPath;
    }
    const globalPath = await this.findInPath();
    if (globalPath) {
      logger.claude.info("Found Claude in PATH: {path}", { path: globalPath });
      this.cachedPath = globalPath;
      return globalPath;
    }
    const tracedPath = await this.traceScriptPath();
    if (tracedPath) {
      logger.claude.info("Traced Claude script: {path}", { path: tracedPath });
      this.cachedPath = tracedPath;
      return tracedPath;
    }
    logger.claude.error("Claude CLI not found");
    return null;
  }
  /**
   * Find Claude in system PATH
   */
  async findInPath() {
    try {
      const { stdout } = await execAsync("which claude");
      const claudePath = stdout.trim();
      if (claudePath && await this.validateClaude(claudePath)) {
        const realPath = await this.resolveSymlink(claudePath);
        return realPath || claudePath;
      }
    } catch {
    }
    return null;
  }
  /**
   * Check common local installation paths
   */
  async findLocalInstallation() {
    const possiblePaths = [];
    if (process.resourcesPath) {
      possiblePaths.push(
        path__namespace.join(process.resourcesPath, "app.asar.unpacked", "node_modules", "@anthropic-ai", "claude-code", "cli.js"),
        path__namespace.join(process.resourcesPath, "app.asar.unpacked", "node_modules", ".bin", "claude")
      );
    }
    possiblePaths.push(
      // Local node_modules in current project
      path__namespace.join(process.cwd(), "node_modules", ".bin", "claude"),
      path__namespace.join(process.cwd(), "node_modules", "@anthropic-ai", "claude-code", "cli.js"),
      // Parent directories (monorepo setup)
      path__namespace.join(process.cwd(), "..", "node_modules", ".bin", "claude"),
      path__namespace.join(process.cwd(), "..", "node_modules", "@anthropic-ai", "claude-code", "cli.js"),
      // Global npm/yarn paths
      path__namespace.join(os__namespace.homedir(), ".npm", "bin", "claude"),
      path__namespace.join(os__namespace.homedir(), ".yarn", "bin", "claude"),
      path__namespace.join(os__namespace.homedir(), ".pnpm", "bin", "claude"),
      // macOS specific paths
      "/usr/local/bin/claude",
      "/opt/homebrew/bin/claude",
      path__namespace.join(os__namespace.homedir(), ".bun", "bin", "claude")
    );
    for (const possiblePath of possiblePaths) {
      try {
        const stats = await fsPromises.stat(possiblePath);
        if (stats.isFile() || stats.isSymbolicLink()) {
          if (await this.validateClaude(possiblePath)) {
            const realPath = await this.resolveSymlink(possiblePath);
            return realPath || possiblePath;
          }
        }
      } catch {
      }
    }
    return null;
  }
  /**
   * Advanced detection: trace the actual script being executed
   * This mimics the example project's approach with temporary node wrapper
   */
  async traceScriptPath() {
    try {
      const tempDir = await fsPromises.mkdtemp(path__namespace.join(os__namespace.tmpdir(), "claude-detect-"));
      const traceFile = path__namespace.join(tempDir, "trace.log");
      const wrapperScript = process.platform === "win32" ? await this.createWindowsWrapper(tempDir, traceFile) : await this.createUnixWrapper(tempDir, traceFile);
      const env = { ...process.env };
      env.PATH = `${tempDir}${path__namespace.delimiter}${process.env.PATH}`;
      try {
        await execAsync("claude --version", { env });
        const traceContent = await fsPromises.readFile(traceFile, "utf-8");
        const scriptPath = traceContent.trim().split("\n")[0];
        await fsPromises.rm(tempDir, { recursive: true, force: true });
        if (scriptPath && await this.validateClaude(scriptPath)) {
          return scriptPath;
        }
      } catch (error) {
        await fsPromises.rm(tempDir, { recursive: true, force: true });
      }
    } catch (error) {
      logger.claude.error("Trace detection failed: {error}", { error });
    }
    return null;
  }
  /**
   * Create Unix wrapper script for tracing
   */
  async createUnixWrapper(tempDir, traceFile) {
    const wrapperPath = path__namespace.join(tempDir, "node");
    const nodeExecutable = await this.findNodeExecutable();
    const wrapperContent = `#!/bin/bash
echo "$1" >> "${traceFile}"
exec "${nodeExecutable}" "$@"
`;
    await fsPromises.writeFile(wrapperPath, wrapperContent);
    await fsPromises.chmod(wrapperPath, 493);
    return wrapperPath;
  }
  /**
   * Create Windows wrapper script for tracing
   */
  async createWindowsWrapper(tempDir, traceFile) {
    const wrapperPath = path__namespace.join(tempDir, "node.bat");
    const nodeExecutable = await this.findNodeExecutable();
    const wrapperContent = `@echo off
echo %~1 >> "${traceFile}"
"${nodeExecutable}" %*
`;
    await fsPromises.writeFile(wrapperPath, wrapperContent);
    return wrapperPath;
  }
  /**
   * Find the actual node executable
   */
  async findNodeExecutable() {
    try {
      const { stdout } = await execAsync("which node");
      return stdout.trim();
    } catch {
      return process.execPath;
    }
  }
  /**
   * Resolve symlinks to get the actual file
   */
  async resolveSymlink(filePath) {
    try {
      const stats = await fsPromises.lstat(filePath);
      if (stats.isSymbolicLink()) {
        const target = await fsPromises.readlink(filePath);
        if (!path__namespace.isAbsolute(target)) {
          return path__namespace.join(path__namespace.dirname(filePath), target);
        }
        return target;
      }
      return filePath;
    } catch {
      return null;
    }
  }
  /**
   * Validate that a path is actually the Claude CLI
   */
  async validateClaude(claudePath) {
    try {
      const stats = await fsPromises.stat(claudePath);
      if (!stats.isFile()) {
        return false;
      }
      if (claudePath.includes("@anthropic-ai/claude-code") || claudePath.includes("claude-code/cli.js") || claudePath.endsWith("/claude") || claudePath.endsWith("\\claude")) {
        logger.claude.debug("Validated Claude CLI by path pattern: {path}", { path: claudePath });
        return true;
      }
      try {
        const { stdout } = await execAsync(`"${claudePath}" --version`);
        return stdout.toLowerCase().includes("claude");
      } catch (versionError) {
        logger.claude.warn("Claude --version failed (might be auth issue), but file exists: {path}", { path: claudePath });
        return claudePath.includes("claude");
      }
    } catch (error) {
      logger.claude.error("Failed to validate Claude: {error}", { path: claudePath, error });
      return false;
    }
  }
  /**
   * Clear the cached path (useful for testing or retrying)
   */
  clearCache() {
    this.cachedPath = null;
  }
}
const claudeCliDetector = new ClaudeCliDetector();
electron.app.whenReady().then(async () => {
  await setupLogger(true);
  logger.main.info("My Jarvis Clean starting up");
  try {
    const detectedPath = await claudeCliDetector.detectClaudePath();
    if (detectedPath) {
      claudeForkHandler.setClaudeCliPath(detectedPath);
      logger.main.info("Claude CLI detected and configured: {path}", { path: detectedPath });
    } else {
      logger.main.warn("Claude CLI not found - chat functionality may be limited");
    }
  } catch (error) {
    logger.main.error("Error detecting Claude CLI: {error}", { error });
  }
  logger.main.info("Starting Claude fork server...");
  try {
    const serverResult = await claudeForkHandler.startBackendServer();
    if (serverResult.success) {
      logger.main.info("Claude fork server ready: {serverUrl}", {
        serverUrl: `http://127.0.0.1:${serverResult.port}`
      });
    } else {
      logger.main.error("Failed to start Claude fork server: {error}", { error: serverResult.error });
    }
  } catch (error) {
    logger.main.error("Error starting Claude fork server: {error}", { error });
  }
  utils.electronApp.setAppUserModelId("com.electron");
  await createAppWindow();
  electron.app.on("browser-window-created", (_, window) => {
    utils.optimizer.watchWindowShortcuts(window);
  });
  electron.app.on("activate", async function() {
    if (electron.BrowserWindow.getAllWindows().length === 0) {
      await createAppWindow();
    }
  });
});
electron.app.on("window-all-closed", async () => {
  await claudeForkHandler.cleanup();
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
electron.app.on("before-quit", async () => {
  await claudeForkHandler.cleanup();
});
