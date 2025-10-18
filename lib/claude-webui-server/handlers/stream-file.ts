import type { Context } from "hono";
import type { ConfigContext } from "../middleware/config.ts";
import { logger } from "../utils/logger.ts";
import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";

/**
 * Stream a file from the workspace without loading it into memory
 * This prevents OOM crashes when serving large PDFs or other files
 */
export async function handleStreamFileRequest(c: Context<ConfigContext>) {
  try {
    const filePath = c.req.query('path');

    if (!filePath) {
      return c.json({ error: 'File path required' }, 400);
    }

    // Security: ensure file exists
    if (!existsSync(filePath)) {
      return c.json({ error: 'File not found' }, 404);
    }

    // Get file stats for content length
    const fileStats = await stat(filePath);

    // Determine content type based on extension
    const ext = filePath.split('.').pop()?.toLowerCase();
    const contentType = getContentType(ext || '');

    logger.app.info(`Streaming file: ${filePath} (${fileStats.size} bytes)`);

    // Create read stream
    const stream = createReadStream(filePath);

    // Set headers
    c.header('Content-Type', contentType);
    c.header('Content-Length', fileStats.size.toString());
    c.header('Accept-Ranges', 'bytes');

    // Stream the file
    return c.body(stream as any);
  } catch (error) {
    logger.app.error("Stream file error: {error}", { error });
    return c.json({
      error: error instanceof Error ? error.message : 'Failed to stream file'
    }, 500);
  }
}

function getContentType(ext: string): string {
  const mimeTypes: Record<string, string> = {
    'pdf': 'application/pdf',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'txt': 'text/plain',
    'md': 'text/markdown',
    'json': 'application/json',
    'html': 'text/html',
    'css': 'text/css',
    'js': 'application/javascript',
    'ts': 'application/typescript',
  };

  return mimeTypes[ext] || 'application/octet-stream';
}
