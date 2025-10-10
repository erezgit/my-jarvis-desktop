import { Context } from "hono";
import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { logger } from "../utils/logger.ts";
import { readTextFile } from "../utils/fs.ts";

interface FileItem {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modified: string;
  extension: string;
}

/**
 * List directory contents and return file metadata
 */
async function listDirectoryContents(dirPath: string): Promise<FileItem[]> {
  try {
    const entries = await readdir(dirPath, { withFileTypes: true });
    const files: FileItem[] = [];

    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name);
      const stats = await stat(fullPath);

      // Get file extension
      const extension = entry.isDirectory()
        ? ''
        : entry.name.includes('.')
          ? entry.name.substring(entry.name.lastIndexOf('.'))
          : '';

      files.push({
        name: entry.name,
        path: fullPath,
        isDirectory: entry.isDirectory(),
        size: stats.size,
        modified: stats.mtime.toISOString(),
        extension,
      });
    }

    // Sort: directories first, then files alphabetically
    return files.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });
  } catch (error) {
    logger.api.error("Error listing directory contents: {error}", { error });
    throw error;
  }
}

/**
 * Handle GET /api/files?path=<path>
 * Returns list of files and directories at the specified path
 */
export async function handleFilesRequest(c: Context) {
  try {
    const requestedPath = c.req.query('path');
    const workspaceDir = process.env.WORKSPACE_DIR || '/workspace';

    // Use requested path or default to workspace directory
    const targetPath = requestedPath || workspaceDir;

    logger.api.info("Listing directory: {path}", { path: targetPath });

    // Read directory contents
    const files = await listDirectoryContents(targetPath);

    return c.json({
      success: true,
      path: targetPath,
      files,
    });
  } catch (error) {
    logger.api.error("Error reading directory: {error}", { error });
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to read directory",
      },
      500
    );
  }
}

/**
 * Handle GET /api/files/read?path=<path>
 * Returns file content and metadata
 */
export async function handleReadFileRequest(c: Context) {
  try {
    const filePath = c.req.query('path');

    if (!filePath) {
      return c.json({
        success: false,
        error: "Path parameter is required"
      }, 400);
    }

    logger.api.info("Reading file: {path}", { path: filePath });

    // Read file content
    const content = await readTextFile(filePath);
    const stats = await stat(filePath);

    // Get file extension
    const extension = filePath.includes('.')
      ? filePath.substring(filePath.lastIndexOf('.'))
      : '';

    return c.json({
      success: true,
      content,
      path: filePath,
      name: filePath.substring(filePath.lastIndexOf('/') + 1),
      size: stats.size,
      modified: stats.mtime.toISOString(),
      extension,
    });
  } catch (error) {
    logger.api.error("Error reading file: {error}", { error });
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to read file",
      },
      500
    );
  }
}
