/**
 * Runtime-agnostic Hono application
 *
 * This module creates the Hono application with all routes and middleware,
 * but doesn't include runtime-specific code like CLI parsing or server startup.
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Runtime } from "./runtime/types.ts";
import {
  type ConfigContext,
  createConfigMiddleware,
} from "./middleware/config.ts";
import { authMiddleware, requireAuth } from "./middleware/auth.ts";
import { handleProjectsRequest } from "./handlers/projects.ts";
import { handleHistoriesRequest } from "./handlers/histories.ts";
import { handleConversationRequest } from "./handlers/conversations.ts";
import { handleChatRequest } from "./handlers/chat.ts";
import { handleAbortRequest } from "./handlers/abort.ts";
import { handleFilesRequest, handleReadFileRequest } from "./handlers/files.ts";
import { handleVoiceRequest } from "./handlers/voice.ts";
import { handleUploadRequest } from "./handlers/upload.ts";
import { handleSavePDFRequest } from "./handlers/save-pdf.ts";
import { handleStreamFileRequest } from "./handlers/stream-file.ts";
import { getSessionTokens } from "./handlers/session-tokens.ts";
import { logger } from "./utils/logger.ts";
import { readBinaryFile } from "./utils/fs.ts";

export interface AppConfig {
  debugMode: boolean;
  staticPath: string;
  cliPath: string; // Actual CLI script path detected by validateClaudeCli
}

export function createApp(
  runtime: Runtime,
  config: AppConfig,
): Hono<ConfigContext> {
  const app = new Hono<ConfigContext>();

  // Store AbortControllers for each request (shared with chat handler)
  const requestAbortControllers = new Map<string, AbortController>();

  // CORS middleware
  app.use(
    "*",
    cors({
      origin: "*",
      allowMethods: ["GET", "POST", "OPTIONS"],
      allowHeaders: ["Content-Type"],
    }),
  );

  // Configuration middleware - makes app settings available to all handlers
  app.use(
    "*",
    createConfigMiddleware({
      debugMode: config.debugMode,
      runtime,
      cliPath: config.cliPath,
    }),
  );

  // Authentication middleware - validates JWT tokens and manages sessions
  app.use("*", authMiddleware);

  // Health check endpoints
  // Fly.io health check endpoint (simpler path)
  app.get("/health", (c) => {
    return c.json({
      status: "ok",
      timestamp: Date.now(),
      uptime: process.uptime()
    });
  });

  // API health check endpoint (for frontend)
  app.get("/api/health", (c) => {
    return c.json({
      status: "ok",
      timestamp: Date.now(),
      uptime: process.uptime()
    });
  });

  app.get("/api/projects", requireAuth, (c) => handleProjectsRequest(c));

  app.get("/api/projects/:encodedProjectName/histories", requireAuth, (c) =>
    handleHistoriesRequest(c),
  );

  app.get("/api/projects/:encodedProjectName/histories/:sessionId", requireAuth, (c) =>
    handleConversationRequest(c),
  );

  app.post("/api/abort/:requestId", requireAuth, (c) =>
    handleAbortRequest(c, requestAbortControllers),
  );

  app.post("/api/chat", requireAuth, (c) => handleChatRequest(c, requestAbortControllers));

  // Session tokens route - get cumulative token usage for a session
  app.get("/api/session-tokens/:sessionId", requireAuth, (c) => getSessionTokens(c));

  // Document upload route
  app.post("/api/upload-document", requireAuth, (c) => handleUploadRequest(c));

  // PDF save route
  app.post("/api/save-pdf", requireAuth, (c) => handleSavePDFRequest(c));

  // File system API routes (for web mode)
  app.get("/api/files", requireAuth, (c) => handleFilesRequest(c));
  app.get("/api/files/read", requireAuth, (c) => handleReadFileRequest(c));

  // File streaming route (streams files without loading into memory)
  app.get("/api/stream-file", requireAuth, (c) => handleStreamFileRequest(c));

  // Voice file API route (for web mode)
  app.get("/api/voice/:filename", requireAuth, (c) => handleVoiceRequest(c));

  app.post("/api/voice-generate", requireAuth, async (c) => {
    try {
      const { message } = await c.req.json();

      if (!message) {
        return c.json({ success: false, error: "Message is required" }, 400);
      }

      // Execute voice script
      const voiceScript = '/Users/erezfern/Workspace/jarvis/spaces/my-jarvis-desktop/tickets/017-claude-code-sdk-chat-integration/example-projects/claude-code-webui/tools/jarvis_voice.sh';
      const result = await runtime.runCommand(voiceScript, ['--voice', 'echo', message]);

      // Parse audio file path from output
      const audioPathMatch = result.stdout.match(/Audio generated successfully at: (.+\.mp3)/);
      const audioPath = audioPathMatch ? audioPathMatch[1] : null;

      return c.json({
        success: true,
        message,
        audioPath,
        output: result.stdout
      });
    } catch (error) {
      logger.app.error("Voice generation error: {error}", { error });
      return c.json({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }, 500);
    }
  });

  // Static file serving with SPA fallback
  // Serve static assets (CSS, JS, images, etc.)
  const serveStatic = runtime.createStaticFileMiddleware({
    root: config.staticPath,
  });
  app.use("/assets/*", serveStatic);

  // Serve PDF.js worker with correct MIME type
  app.get("/pdf.worker.min.mjs", async (c) => {
    try {
      const workerPath = `${config.staticPath}/pdf.worker.min.mjs`;
      const workerFile = await readBinaryFile(workerPath);
      return c.body(workerFile, 200, {
        "Content-Type": "application/javascript",
        "Cache-Control": "public, max-age=31536000",
      });
    } catch (error) {
      logger.app.error("Error serving PDF worker: {error}", { error });
      return c.text("Not found", 404);
    }
  });

  // SPA fallback - serve index.html for all unmatched routes (except API routes)
  app.get("*", async (c) => {
    const path = c.req.path;

    // Skip API routes
    if (path.startsWith("/api/")) {
      return c.text("Not found", 404);
    }

    try {
      const indexPath = `${config.staticPath}/index.html`;
      const indexFile = await readBinaryFile(indexPath);
      return c.html(new TextDecoder().decode(indexFile));
    } catch (error) {
      logger.app.error("Error serving index.html: {error}", { error });
      return c.text("Internal server error", 500);
    }
  });

  return app;
}
