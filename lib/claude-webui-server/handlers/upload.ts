import type { Context } from "hono";
import type { ConfigContext } from "../middleware/config.ts";
import { logger } from "../utils/logger.ts";
import { writeFile, ensureDir } from "../utils/fs.ts";
import { join } from "node:path";
import { spawn } from "node:child_process";

export async function handleUploadRequest(c: Context<ConfigContext>) {
  try {
    const body = await c.req.parseBody();
    const file = body['file'];

    if (!file || !(file instanceof File)) {
      return c.json({ error: 'No file provided' }, 400);
    }

    // Save files to my-jarvis/docs directory (fixed path)
    const workspaceRoot = process.cwd();
    const uploadsDir = join(workspaceRoot, 'my-jarvis', 'docs');

    // Ensure uploads directory exists
    await ensureDir(uploadsDir);

    // Save file
    const filePath = join(uploadsDir, file.name);
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await writeFile(filePath, buffer);

    logger.app.info(`File uploaded: ${file.name} to ${filePath}`);

    // Process PDF files for knowledge base
    if (file.name.toLowerCase().endsWith('.pdf')) {
      logger.app.info(`Processing PDF for knowledge base: ${file.name}`);

      // Get workspace path for knowledge base storage
      const workspacePath = join(workspaceRoot, 'my-jarvis');

      // Spawn Python script to process document
      const scriptPath = join(workspaceRoot, 'tools', 'scripts', 'process_document.py');
      const fileName = file.name.replace('.pdf', '');

      const pythonProcess = spawn('python3', [
        scriptPath,
        filePath,
        workspacePath,
        fileName
      ]);

      // Capture output
      let output = '';
      let errorOutput = '';

      pythonProcess.stdout.on('data', (data) => {
        const text = data.toString();
        output += text;
        logger.app.info(`PDF processing: ${text.trim()}`);
      });

      pythonProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      // Wait for processing to complete
      await new Promise((resolve, reject) => {
        pythonProcess.on('close', (code) => {
          if (code === 0) {
            logger.app.info(`PDF processing completed successfully for ${file.name}`);
            resolve(true);
          } else {
            logger.app.error(`PDF processing failed with code ${code}: ${errorOutput}`);
            reject(new Error(`Processing failed: ${errorOutput}`));
          }
        });
      });
    }

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
