import type { Context } from "hono";
import type { ConfigContext } from "../middleware/config.ts";
import { logger } from "../utils/logger.ts";
import { writeFile, ensureDir } from "../utils/fs.ts";
import { join } from "node:path";

export async function handleUploadRequest(c: Context<ConfigContext>) {
  try {
    const body = await c.req.parseBody();
    const file = body['file'];

    if (!file || !(file instanceof File)) {
      return c.json({ error: 'No file provided' }, 400);
    }

    // Get workspace directory (use cwd as workspace root)
    const workspaceRoot = process.cwd();
    const uploadsDir = join(workspaceRoot, 'workspace', 'uploads');

    // Ensure uploads directory exists
    await ensureDir(uploadsDir);

    // Save file
    const filePath = join(uploadsDir, file.name);
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await writeFile(filePath, buffer);

    logger.app.info(`File uploaded: ${file.name} to ${filePath}`);

    return c.json({
      success: true,
      filename: file.name,
      path: filePath,
      size: file.size,
    });
  } catch (error) {
    logger.app.error("Upload error: {error}", { error });
    return c.json({
      error: error instanceof Error ? error.message : 'Upload failed'
    }, 500);
  }
}
