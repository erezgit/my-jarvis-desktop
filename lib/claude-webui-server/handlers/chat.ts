import { Context } from "hono";
import { query, type PermissionMode, createSdkMcpServer, tool, AgentDefinition, HookMatcher } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import type { ChatRequest, StreamResponse } from "../../shared/types.ts";
import { logger } from "../utils/logger.ts";
import { generateVoiceResponse, generateAudioUrl, sanitizeForJson } from "../utils/voiceGenerator.ts";
import { SubagentTracker } from "../utils/subagent-tracker.ts";
import path from "path";
import fs from "fs";

/**
 * Load agent definition from .claude/agents/ directory
 */
function loadAgentDefinition(agentName: string): { description: string; tools: string[]; prompt: string } | null {
  const agentPath = path.join(process.cwd(), '.claude', 'agents', `${agentName}.md`);

  if (!fs.existsSync(agentPath)) {
    logger.agent.warn('Agent definition not found: {path}', { path: agentPath });
    return null;
  }

  const content = fs.readFileSync(agentPath, 'utf-8');

  // Parse frontmatter
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!frontmatterMatch) {
    logger.agent.error('Invalid agent definition format: {agent}', { agent: agentName });
    return null;
  }

  const [, frontmatter, prompt] = frontmatterMatch;
  const lines = frontmatter.split('\n');
  let description = '';
  let tools: string[] = [];

  for (const line of lines) {
    if (line.startsWith('description:')) {
      description = line.substring(12).trim().replace(/^["']|["']$/g, '');
    } else if (line.startsWith('tools:')) {
      tools = line.substring(6).trim().split(',').map(t => t.trim());
    }
  }

  return { description, tools, prompt: prompt.trim() };
}

/**
 * Worker agent definitions for multi-agent orchestration
 * These agents are spawned via the Task tool
 */
const workerAgents: Record<string, AgentDefinition> = {};

// Load ticket-worker agent
const ticketWorkerDef = loadAgentDefinition('ticket-worker');
if (ticketWorkerDef) {
  workerAgents['ticket-worker'] = new AgentDefinition({
    description: ticketWorkerDef.description,
    tools: ticketWorkerDef.tools,
    prompt: ticketWorkerDef.prompt,
    model: 'haiku' // Use fast model for workers
  });
  logger.agent.info('Loaded worker agent: ticket-worker');
}

/**
 * Global subagent tracker instance
 */
let globalSubagentTracker: SubagentTracker | null = null;

function getOrCreateSubagentTracker(): SubagentTracker {
  if (!globalSubagentTracker) {
    const sessionDir = path.join(process.cwd(), 'agent-workspace', 'sessions', `session-${Date.now()}`);
    globalSubagentTracker = new SubagentTracker(sessionDir);
    logger.agent.info('Created global subagent tracker: {dir}', { dir: sessionDir });
  }
  return globalSubagentTracker;
}

/**
 * Create JARVIS Tools MCP Server with voice generation capability
 */
const jarvisToolsServer = createSdkMcpServer({
  name: "jarvis-tools",
  version: "1.0.0",
  tools: [
    tool(
      "voice_generate",
      "Generate voice message with text-to-speech using JARVIS voice system",
      {
        message: z.string().describe("Text to convert to speech"),
        voice: z.enum(["alloy", "echo", "fable", "onyx", "nova", "shimmer"]).default("nova").describe("Voice model to use"),
        speed: z.number().min(0.25).max(4.0).default(1.0).describe("Speech speed (0.25 to 4.0)")
      },
      async (args) => {
        // 🔍 ENHANCED DEBUG: Log MCP tool invocation
        logger.chat.info("[MCP_VOICE_TOOL] Voice generation requested: {request}", {
          message: args.message,
          voice: args.voice,
          speed: args.speed,
          timestamp: new Date().toISOString(),
          pid: process.pid,
          cwd: process.cwd(),
          env: {
            WORKSPACE_DIR: process.env.WORKSPACE_DIR,
            DEPLOYMENT_MODE: process.env.DEPLOYMENT_MODE,
            OPENAI_API_KEY_SET: !!process.env.OPENAI_API_KEY,
            NODE_ENV: process.env.NODE_ENV
          }
        });

        try {
          // ✅ FIXED: Use direct function call instead of HTTP API (follows MCP best practices)
          const voiceStartTime = Date.now();
          logger.chat.info("[MCP_VOICE_TOOL] Calling voice generation service directly: {direct_call}", {
            message: args.message,
            voice: args.voice,
            speed: args.speed,
            approach: "DIRECT_FUNCTION_CALL",
            timestamp: new Date().toISOString(),
            messageLength: args.message?.length || 0
          });

          // 🎯 VOICE TIMING: Log start of voice generation
          logger.chat.info("[VOICE_TIMING] Voice generation start: {timing}", {
            phase: 'start',
            timestamp: voiceStartTime,
            messageLength: args.message?.length || 0,
            voice: args.voice,
            speed: args.speed
          });

          // Call the shared voice generation service directly
          const result = await generateVoiceResponse({
            text: args.message,
            voice: args.voice || 'nova',
            speed: args.speed || 1.0
          });

          // 🎯 VOICE TIMING: Log end of voice generation
          const voiceEndTime = Date.now();
          const voiceDuration = voiceEndTime - voiceStartTime;
          logger.chat.info("[VOICE_TIMING] Voice generation end: {timing}", {
            phase: 'end',
            timestamp: voiceEndTime,
            duration: voiceDuration,
            messageLength: args.message?.length || 0,
            success: result.success
          });

          logger.chat.info("[MCP_VOICE_TOOL] Voice generation result: {result}", {
            success: result.success,
            audioPath: result.audioPath,
            error: result.error
          });

          if (result.success && result.audioPath) {
            // Generate the appropriate audio URL for the deployment context
            const audioUrl = generateAudioUrl(result.audioPath);

            // 🎯 STREAM TX: Log voice message transmission preparation
            const voiceDataSize = JSON.stringify({
              audioUrl: audioUrl,
              transcript: args.message,
              voiceType: args.voice || 'nova',
              speed: args.speed || 1.0,
              timestamp: Date.now()
            }).length;

            logger.chat.info("[STREAM_TX] Preparing voice message for transmission: {transmission}", {
              audioUrl,
              transcriptLength: args.message?.length || 0,
              voiceDataSize,
              timestamp: Date.now(),
              voice: args.voice || 'nova',
              speed: args.speed || 1.0
            });

            // ✅ JSON EMBEDDING: Embed voice metadata as JSON within text content
            const responseContent = {
              content: [
                {
                  type: "text",
                  text: `🔊 Voice message generated successfully!\n\n**Voice:** ${args.voice || 'nova'}\n**Speed:** ${args.speed || 1.0}x\n**Audio URL:** ${audioUrl}\n\nVOICE_DATA:${JSON.stringify({
                    audioUrl: audioUrl,
                    transcript: args.message,  // Include the original message text
                    voiceType: args.voice || 'nova',
                    speed: args.speed || 1.0,
                    timestamp: Date.now()
                  })}\n\nThe voice file has been created and is ready for playbook.`
                }
              ]
            };

            // 🎯 STREAM TX: Log successful voice message ready for stream transmission
            logger.chat.info("[STREAM_TX] Voice message ready for stream transmission: {ready}", {
              contentSize: JSON.stringify(responseContent).length,
              timestamp: Date.now(),
              success: true
            });

            return responseContent;
          } else {
            // Voice generation failed
            throw new Error(result.error || 'Voice generation failed');
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          const errorStack = error instanceof Error ? error.stack : 'No stack trace';

          // 🔍 ENHANCED DEBUG: Comprehensive error logging
          logger.chat.error("[MCP_VOICE_TOOL] Voice generation failed: {error}", {
            error: errorMsg,
            stack: errorStack,
            args: {
              message: args.message,
              voice: args.voice,
              speed: args.speed
            },
            environment: {
              baseDir: process.env.WORKSPACE_DIR || process.cwd(),
              pythonScript: `${process.env.WORKSPACE_DIR || '/home/node'}/tools/src/cli/auto_jarvis_voice.py`,
              openaiKeySet: !!process.env.OPENAI_API_KEY,
              deploymentMode: process.env.DEPLOYMENT_MODE,
              nodeVersion: process.version,
              platform: process.platform,
              arch: process.arch,
              pid: process.pid,
              cwd: process.cwd(),
              memoryUsage: process.memoryUsage()
            }
          });

          return {
            content: [{
              type: "text",
              text: `🔊 Voice generation failed: ${errorMsg}\n\nDEBUG INFO:\n- Environment: ${process.env.DEPLOYMENT_MODE || 'unknown'}\n- Working dir: ${process.cwd()}\n- OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? 'SET' : 'NOT SET'}\n- Error: ${errorMsg}`
            }],
            isError: true
          };
        }
      }
    ),
  ]
});

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

    // Build SDK options with 2025 best practices + MCP server integration
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

      // ✅ NEW: MCP server integration for custom tools
      mcpServers: {
        "jarvis-tools": jarvisToolsServer
      },

      // ✅ MULTI-AGENT: Enable Task tool for worker delegation
      agents: Object.keys(workerAgents).length > 0 ? workerAgents : undefined,

      // ✅ MULTI-AGENT: Add hooks for subagent tracking
      hooks: {
        PreToolUse: [
          new HookMatcher({
            matcher: null, // Match all tools
            hooks: [getOrCreateSubagentTracker().preToolUse]
          })
        ],
        PostToolUse: [
          new HookMatcher({
            matcher: null, // Match all tools
            hooks: [getOrCreateSubagentTracker().postToolUse]
          })
        ]
      },

      // ✅ ENHANCED: Clean architecture - MCP tools ALWAYS prioritized
      ...(sessionId ? { resume: sessionId } : {}),
      ...(allowedTools ? {
        allowedTools: [
          "Task",                                      // Enable Task tool for worker spawning
          "mcp__jarvis-tools__voice_generate",         // Voice generation tool
          // Include all other non-MCP file tools (native Claude Code tools work perfectly)
          ...allowedTools.filter(tool =>
            tool !== "mcp__jarvis-tools__voice_generate" && tool !== "Task"
          )
        ]
      } : {
        allowedTools: [
          "Task",                                      // Enable Task tool for worker spawning
          "mcp__jarvis-tools__voice_generate"          // Default: voice tool
        ]
      }),
      ...(permissionMode ? { permissionMode } : {}), // Only pass permissionMode if provided by frontend
    };

    // ✅ CRITICAL: Add MCP discovery debugging
    logger.chat.debug("SDK query options: {queryOptions}", { queryOptions });
    logger.chat.debug("[MCP_DISCOVERY] MCP servers available: {mcpServers}", {
      mcpServers: Object.keys(queryOptions.mcpServers || {}),
      allowedTools: queryOptions.allowedTools,
      jarvisToolsRegistered: !!jarvisToolsServer
    });

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

  // Detect mobile browsers for enhanced streaming
  const userAgent = c.req.header('user-agent') || '';
  const isMobile = /Mobile|Android|iPhone|iPad|iPod|BlackBerry|Windows Phone/i.test(userAgent);

  const stream = new ReadableStream({
    async start(controller) {
      let chunkCount = 0;
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
          const data = JSON.stringify(chunk) + "___DELIM___";
          controller.enqueue(new TextEncoder().encode(data));
          chunkCount++;

          // Mobile-specific: Add keep-alive ping every 5 chunks to prevent mobile timeout
          if (isMobile && chunkCount % 5 === 0) {
            const keepAlive = JSON.stringify({ type: "ping", timestamp: Date.now() }) + "___DELIM___";
            controller.enqueue(new TextEncoder().encode(keepAlive));
          }
        }
        controller.close();
      } catch (error) {
        const errorResponse: StreamResponse = {
          type: "error",
          error: error instanceof Error ? error.message : String(error),
        };
        controller.enqueue(
          new TextEncoder().encode(JSON.stringify(errorResponse) + "___DELIM___"),
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
