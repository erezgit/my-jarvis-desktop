/**
 * Ephemeral container management endpoints
 */

import { Context } from "hono";
import { logger } from "../utils/logger.ts";
import { getOrCreateEphemeralInstance, storeContainerSession } from "../lib/desktop/ephemeral-auth.ts";
import { sessionUtils } from "../middleware/auth.ts";

/**
 * POST /api/ephemeral/initialize
 * Initialize or get ephemeral container for current session
 */
export async function handleEphemeralInitialize(c: Context) {
  try {
    const userId = sessionUtils.getUserId(c);
    const sessionId = sessionUtils.getSessionId(c);

    if (!userId || !sessionId) {
      return c.json({ error: "Authentication required" }, 401);
    }

    logger.app.info("[Ephemeral] Initializing container for user {userId}, session {sessionId}", {
      userId,
      sessionId,
    });

    const instance = await getOrCreateEphemeralInstance(userId, sessionId);

    return c.json({
      success: true,
      machineId: instance.machineId,
      url: instance.url,
      status: instance.status
    });

  } catch (error) {
    logger.app.error("[Ephemeral] Error initializing container: {error}", { error });
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to initialize container"
    }, 500);
  }
}

/**
 * GET /api/ephemeral/status
 * Get current ephemeral container status
 */
export async function handleEphemeralStatus(c: Context) {
  try {
    const userId = sessionUtils.getUserId(c);
    const sessionId = sessionUtils.getSessionId(c);

    if (!userId || !sessionId) {
      return c.json({ error: "Authentication required" }, 401);
    }

    // For now, just return basic status - could be enhanced to check actual machine status
    return c.json({
      success: true,
      userId,
      sessionId,
      status: 'ready'
    });

  } catch (error) {
    logger.app.error("[Ephemeral] Error getting status: {error}", { error });
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to get status"
    }, 500);
  }
}