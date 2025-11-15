import { Context } from "hono";
import { query, type PermissionMode } from "@anthropic-ai/claude-agent-sdk";
import type { ChatRequest, StreamResponse } from "../../shared/types.ts";
import { logger } from "../utils/logger.ts";

/**
 * Executes a Claude command and yields streaming responses
 * @param message - User message or command
 * @param requestId - Unique request identifier for abort functionality
 * @param requestAbortControllers - Shared map of abort controllers
 * @param cliPath - Path to actual CLI script (detected by validateClaudeCli)
 * @param sessionId - Optional session ID for conversation continuity
 * @param allowedTools - Optional array of allowed tool names
 * @param workingDirectory - Optional working directory for Claude execution
 * @param permissionMode - Optional permission mode for Claude execution
 * @returns AsyncGenerator yielding StreamResponse objects
 */
async function* executeClaudeCommand(
  message: string,
  requestId: string,
  requestAbortControllers: Map<string, AbortController>,
  cliPath: string,
  sessionId?: string,
  allowedTools?: string[],
  workingDirectory?: string,
  permissionMode?: PermissionMode,
): AsyncGenerator<StreamResponse> {
  let abortController: AbortController;

  try {
    // Process commands that start with '/'
    let processedMessage = message;
    if (message.startsWith("/")) {
      // Remove the '/' and send just the command
      processedMessage = message.substring(1);
    }

    // Create and store AbortController for this request
    abortController = new AbortController();
    requestAbortControllers.set(requestId, abortController);

    // Build SDK options with 2025 best practices
    const queryOptions = {
      abortController,
      executable: "node" as const, // Use "node" to let SDK find it in PATH (works for both Electron and Docker)
      executableArgs: [],
      pathToClaudeCodeExecutable: cliPath,
      cwd: workingDirectory, // Set working directory for Claude CLI process
      additionalDirectories: workingDirectory ? [workingDirectory] : [], // Also add to allowed directories

      // ✅ REQUIRED: Thinking parameter configuration (fixes clear_thinking_20251015)
      thinking: {
        type: "enabled" as const,
        budget_tokens: 10000 // Optimal balance of performance and speed
      },

      // ✅ BEST PRACTICE: Explicit system prompt configuration
      systemPrompt: {
        type: "preset" as const,
        preset: "claude_code" as const // Maintains Claude Code behavior
      },

      // ✅ ENHANCEMENT: Enable CLAUDE.md project context loading
      settingSources: ['project' as const],

      // ✅ MAINTAINED: Existing functionality
      ...(sessionId ? { resume: sessionId } : {}),
      ...(allowedTools ? { allowedTools } : {}),
      ...(permissionMode ? { permissionMode } : {}), // Only pass permissionMode if provided by frontend
    };

    logger.chat.debug("SDK query options: {queryOptions}", { queryOptions });

    for await (const sdkMessage of query({
      prompt: processedMessage,
      options: queryOptions,
    })) {
      // Debug logging of raw SDK messages with detailed content
      logger.chat.debug("Claude SDK Message: {sdkMessage}", { sdkMessage });

      yield {
        type: "claude_json",
        data: sdkMessage,
      };
    }

    yield { type: "done" };
  } catch (error) {
    // Check if error is due to abort
    // TODO: Re-enable when AbortError is properly exported from Claude SDK
    // if (error instanceof AbortError) {
    //   yield { type: "aborted" };
    // } else {
    {
      logger.chat.error("Claude Code execution failed: {error}", { error });
      yield {
        type: "error",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  } finally {
    // Clean up AbortController from map
    if (requestAbortControllers.has(requestId)) {
      requestAbortControllers.delete(requestId);
    }
  }
}

/**
 * Handles POST /api/chat requests with streaming responses
 * @param c - Hono context object with config variables
 * @param requestAbortControllers - Shared map of abort controllers
 * @returns Response with streaming NDJSON
 */
export async function handleChatRequest(
  c: Context,
  requestAbortControllers: Map<string, AbortController>,
) {
  const chatRequest: ChatRequest = await c.req.json();
  const { cliPath } = c.var.config;

  logger.chat.debug(
    "Received chat request {*}",
    chatRequest as unknown as Record<string, unknown>,
  );

  // Default to current working directory if not specified
  // Use WORKSPACE_DIR environment variable as fallback (points to /home/node in Docker)
  const workingDirectory = chatRequest.workingDirectory || process.env.WORKSPACE_DIR || process.cwd();

  logger.chat.debug("Working directory for Claude CLI: {workingDirectory}", { workingDirectory });

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of executeClaudeCommand(
          chatRequest.message,
          chatRequest.requestId,
          requestAbortControllers,
          cliPath, // Use detected CLI path from validateClaudeCli
          chatRequest.sessionId,
          chatRequest.allowedTools,
          workingDirectory,
          chatRequest.permissionMode,
        )) {
          const data = JSON.stringify(chunk) + "\n";
          controller.enqueue(new TextEncoder().encode(data));
        }
        controller.close();
      } catch (error) {
        const errorResponse: StreamResponse = {
          type: "error",
          error: error instanceof Error ? error.message : String(error),
        };
        controller.enqueue(
          new TextEncoder().encode(JSON.stringify(errorResponse) + "\n"),
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache",
      // CRITICAL FIX: Remove Connection: keep-alive to prevent zombie connections
      // After streaming completes, connection should close to free up connection slots
      // This prevents connection pool exhaustion (Fly.io 25 connection limit)
    },
  });
}
