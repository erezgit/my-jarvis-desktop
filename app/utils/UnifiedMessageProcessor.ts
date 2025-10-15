import type {
  AllMessage,
  ChatMessage,
  ThinkingMessage,
  SDKMessage,
  TimestampedSDKMessage,
} from "../types";
import {
  convertSystemMessage,
  convertResultMessage,
  createToolMessage,
  createToolResultMessage,
  createThinkingMessage,
  createTodoMessageFromInput,
  createVoiceMessageFromInput,
} from "./messageConversion";
import { isThinkingContentItem } from "./messageTypes";
import { extractToolInfo, generateToolPatterns } from "./toolUtils";
import { generateThinkingMessage } from "./thinkingMessageGenerator";

/**
 * Tool cache interface for tracking tool_use information
 */
interface ToolCache {
  name: string;
  input: Record<string, unknown>;
}

/**
 * Processing context interface for streaming use case
 */
export interface ProcessingContext {
  // Core message handling
  addMessage: (message: AllMessage) => void;
  updateLastMessage?: (content: string) => void;

  // Current assistant message state (for streaming)
  currentAssistantMessage?: ChatMessage | null;
  setCurrentAssistantMessage?: (message: ChatMessage | null) => void;

  // Session handling
  onSessionId?: (sessionId: string) => void;
  hasReceivedInit?: boolean;
  setHasReceivedInit?: (received: boolean) => void;

  // Init message handling
  shouldShowInitMessage?: () => boolean;
  onInitMessageShown?: () => void;

  // Permission/Error handling
  onPermissionError?: (
    toolName: string,
    patterns: string[],
    toolUseId: string,
  ) => void;
  onAbortRequest?: () => void;

  // Token usage tracking
  onTokenUpdate?: (newTokens: number) => void;
}

/**
 * Processing options for different use cases
 */
export interface ProcessingOptions {
  /** Whether this is streaming mode (vs batch history processing) */
  isStreaming?: boolean;
  /** Override timestamp for batch processing */
  timestamp?: number;
}

/**
 * Helper function to detect tool use errors that should be displayed as regular results
 */
function isToolUseError(content: string): boolean {
  return content.includes("tool_use_error");
}

/**
 * Unified Message Processor
 *
 * This class provides consistent message processing logic for both
 * streaming and history loading scenarios, ensuring identical output
 * regardless of the data source.
 */
export class UnifiedMessageProcessor {
  private toolUseCache = new Map<string, ToolCache>();

  /**
   * Clear the tool use cache
   */
  public clearCache(): void {
    this.toolUseCache.clear();
  }

  /**
   * Store tool_use information for later correlation with tool_result
   */
  private cacheToolUse(
    id: string,
    name: string,
    input: Record<string, unknown>,
  ): void {
    this.toolUseCache.set(id, { name, input });
  }

  /**
   * Retrieve cached tool_use information
   */
  private getCachedToolInfo(id: string): ToolCache | undefined {
    return this.toolUseCache.get(id);
  }

  /**
   * Handle permission errors during streaming
   */
  private handlePermissionError(
    contentItem: { tool_use_id?: string; content: string },
    context: ProcessingContext,
  ): void {
    // Immediately abort the current request
    if (context.onAbortRequest) {
      context.onAbortRequest();
    }

    // Get cached tool_use information
    const toolUseId = contentItem.tool_use_id || "";
    const cachedToolInfo = this.getCachedToolInfo(toolUseId);

    // Extract tool information for permission handling
    const { toolName, commands } = extractToolInfo(
      cachedToolInfo?.name,
      cachedToolInfo?.input,
    );

    // Compute patterns based on tool type
    const patterns = generateToolPatterns(toolName, commands);

    // Notify parent component about permission error
    if (context.onPermissionError) {
      context.onPermissionError(toolName, patterns, toolUseId);
    }
  }

  /**
   * Process tool_result content item
   */
  private processToolResult(
    contentItem: {
      tool_use_id?: string;
      content: string;
      is_error?: boolean;
    },
    context: ProcessingContext,
    options: ProcessingOptions,
    toolUseResult?: unknown,
  ): void {
    const content =
      typeof contentItem.content === "string"
        ? contentItem.content
        : JSON.stringify(contentItem.content);

    // Check for permission errors - but skip tool use errors which should be displayed as regular results
    if (
      options.isStreaming &&
      contentItem.is_error &&
      !isToolUseError(content)
    ) {
      this.handlePermissionError(contentItem, context);
      return;
    }

    // Get cached tool_use information to determine tool name
    const toolUseId = contentItem.tool_use_id || "";
    const cachedToolInfo = this.getCachedToolInfo(toolUseId);
    const toolName = cachedToolInfo?.name || "Tool";

    console.log('[PROCESS_TOOL_RESULT] Called with toolName:', toolName, 'content:', content.substring(0, 100));

    // Don't show tool_result for TodoWrite since we already show TodoMessage from tool_use
    if (toolName === "TodoWrite") {
      return;
    }

    // Special handling for Write/Edit tool results - file operations
    if (toolName === "Write" || toolName === "Edit") {
      console.log('[FILE_OP_DEBUG] Write/Edit tool result, content:', content);

      // Try multiple patterns to extract file path
      // Pattern 1: Write tool format - "File created successfully at: /path/to/file"
      let pathMatch = content.match(/at: (.+)$/);

      // Pattern 2: Edit tool format - "The file /path/to/file has been updated"
      if (!pathMatch) {
        pathMatch = content.match(/The file (.+) has been updated/);
      }

      console.log('[FILE_OP_DEBUG] Path match:', pathMatch);

      if (pathMatch) {
        const filePath = pathMatch[1].trim();
        const fileName = filePath.split('/').pop() || filePath;
        const operation = toolName === "Write" ? "created" : "modified";

        // Create FileOperationMessage
        const fileOpMessage = {
          type: "file_operation" as const,
          operation: operation as "created" | "modified",
          path: filePath,
          fileName,
          isDirectory: false,
          timestamp: options.timestamp || Date.now(),
        };

        console.log('[FILE_OP_DEBUG] Creating FileOperationMessage:', fileOpMessage);
        context.addMessage(fileOpMessage);
        // Note: We still create ToolResultMessage too (unlike voice which returns early)
      }
    }

    // Special handling for Bash tool results that are voice scripts
    if (toolName === "Bash") {
      const cachedInput = this.getCachedToolInfo(toolUseId)?.input;
      const command = cachedInput?.command as string;

      if (command?.includes('jarvis_voice.sh')) {
        // Parse audio file path from content
        const audioPathMatch = content.match(/Audio generated successfully at: (.+\.mp3)/);
        if (audioPathMatch) {
          const audioPath = audioPathMatch[1];
          const messageMatch = command.match(/--voice echo "([^"]+)"/);
          const message = messageMatch ? messageMatch[1] : "Voice message";

          // Generate audioUrl based on deployment mode
          let audioUrl: string;
          const deploymentMode = import.meta.env.VITE_DEPLOYMENT_MODE;

          if (deploymentMode === 'electron') {
            // Electron mode: Use file:// protocol for local filesystem access
            audioUrl = `file://${audioPath}`;
          } else if (deploymentMode === 'web') {
            // Web mode: Use HTTP API endpoint to serve voice files
            // Extract filename from path (e.g., /workspace/tools/voice/file.mp3 -> file.mp3)
            const filename = audioPath.split('/').pop() || '';
            audioUrl = `/api/voice/${filename}`;
          } else {
            // Fallback to file:// for unknown modes
            audioUrl = `file://${audioPath}`;
          }

          // Create VoiceMessage instead of ToolResultMessage
          // Only auto-play during streaming (first creation), never during history load
          const voiceMessage = {
            type: "voice" as const,
            content: message,
            audioUrl,
            timestamp: options.timestamp || Date.now(),
            autoPlay: options.isStreaming || false
          };

          context.addMessage(voiceMessage);
          return; // Skip creating ToolResultMessage
        }
      }
    }

    // This is a regular tool result - create a ToolResultMessage
    const toolResultMessage = createToolResultMessage(
      toolName,
      content,
      options.timestamp,
      toolUseResult,
    );
    context.addMessage(toolResultMessage);
  }

  /**
   * Handle assistant text content during streaming
   */
  private handleAssistantText(
    contentItem: { text?: string },
    context: ProcessingContext,
    options: ProcessingOptions,
  ): void {
    if (!options.isStreaming) {
      // For history processing, text will be handled at the message level
      return;
    }

    let messageToUpdate = context.currentAssistantMessage;

    if (!messageToUpdate) {
      messageToUpdate = {
        type: "chat",
        role: "assistant",
        content: "",
        timestamp: options.timestamp || Date.now(),
      };
      context.setCurrentAssistantMessage?.(messageToUpdate);
      context.addMessage(messageToUpdate);
    }

    const updatedContent =
      (messageToUpdate.content || "") + (contentItem.text || "");

    // Update the current assistant message state
    const updatedMessage = {
      ...messageToUpdate,
      content: updatedContent,
    };
    context.setCurrentAssistantMessage?.(updatedMessage);
    context.updateLastMessage?.(updatedContent);
  }

  /**
   * Handle tool_use content item
   */
  private handleToolUse(
    contentItem: {
      id?: string;
      name?: string;
      input?: Record<string, unknown>;
    },
    context: ProcessingContext,
    options: ProcessingOptions,
  ): void {
    // Cache tool_use information for later permission error handling and tool_result correlation
    if (contentItem.id && contentItem.name) {
      this.cacheToolUse(
        contentItem.id,
        contentItem.name,
        contentItem.input || {},
      );
    }

    // Note: We don't create FileOperationMessage from tool_use anymore
    // because it happens BEFORE the file is created. We only create it from
    // tool_result after the file is actually written to disk.

    // Generate thinking message before tool execution (for Jarvis mode)
    if (contentItem.name) {
      const thinkingMessage = generateThinkingMessage(
        contentItem.name,
        contentItem.input || {},
        options.timestamp || Date.now()
      );

      if (thinkingMessage) {
        context.addMessage(thinkingMessage);
      }
    }

    // Special handling for ExitPlanMode - create plan message instead of tool message
    if (contentItem.name === "ExitPlanMode") {
      const planContent = (contentItem.input?.plan as string) || "";
      const planMessage = {
        type: "plan" as const,
        plan: planContent,
        toolUseId: contentItem.id || "",
        timestamp: options.timestamp || Date.now(),
      };
      context.addMessage(planMessage);
    } else if (contentItem.name === "TodoWrite") {
      // Special handling for TodoWrite - create todo message from input
      const todoMessage = createTodoMessageFromInput(
        contentItem.input || {},
        options.timestamp,
      );
      if (todoMessage) {
        context.addMessage(todoMessage);
      } else {
        // Fallback to regular tool message if todo parsing fails
        const toolMessage = createToolMessage(contentItem, options.timestamp);
        context.addMessage(toolMessage);
      }
    } else if (contentItem.name === "VoiceGenerate") {
      // Special handling for VoiceGenerate - create voice message from input
      const voiceMessage = createVoiceMessageFromInput(
        contentItem.input || {},
        options.timestamp,
      );
      if (voiceMessage) {
        context.addMessage(voiceMessage);
      } else {
        // Fallback to regular tool message if voice parsing fails
        const toolMessage = createToolMessage(contentItem, options.timestamp);
        context.addMessage(toolMessage);
      }
    } else {
      const toolMessage = createToolMessage(contentItem, options.timestamp);
      context.addMessage(toolMessage);
    }
  }

  /**
   * Process a system message
   */
  private processSystemMessage(
    message: Extract<SDKMessage | TimestampedSDKMessage, { type: "system" }>,
    context: ProcessingContext,
    options: ProcessingOptions,
  ): void {
    const timestamp = options.timestamp || Date.now();

    // Check if this is an init message and if we should show it (streaming only)
    if (options.isStreaming && message.subtype === "init") {
      // Mark that we've received init
      context.setHasReceivedInit?.(true);

      const shouldShow = context.shouldShowInitMessage?.() ?? true;
      if (shouldShow) {
        const systemMessage = convertSystemMessage(message, timestamp);
        context.addMessage(systemMessage);
        context.onInitMessageShown?.();
      }
    } else {
      // Always show non-init system messages
      const systemMessage = convertSystemMessage(message, timestamp);
      context.addMessage(systemMessage);
    }
  }

  /**
   * Process an assistant message
   */
  private processAssistantMessage(
    message: Extract<SDKMessage | TimestampedSDKMessage, { type: "assistant" }>,
    context: ProcessingContext,
    options: ProcessingOptions,
  ): AllMessage[] {
    const timestamp = options.timestamp || Date.now();
    const messages: AllMessage[] = [];

    // Update sessionId only for the first assistant message after init (streaming only)
    if (
      options.isStreaming &&
      context.hasReceivedInit &&
      message.session_id &&
      context.onSessionId
    ) {
      context.onSessionId(message.session_id);
    }

    // For batch processing, collect messages to return
    // For streaming, messages are added directly via context
    const localContext = options.isStreaming
      ? context
      : {
          ...context,
          addMessage: (msg: AllMessage) => messages.push(msg),
        };

    let assistantContent = "";
    const thinkingMessages: ThinkingMessage[] = [];

    // Check if message.content exists and is an array
    if (message.message?.content && Array.isArray(message.message.content)) {
      for (const item of message.message.content) {
        if (item.type === "text") {
          if (options.isStreaming) {
            this.handleAssistantText(item, context, options);
          } else {
            assistantContent += (item as { text: string }).text;
          }
        } else if (item.type === "tool_use") {
          this.handleToolUse(item, localContext, options);
        } else if (isThinkingContentItem(item)) {
          const thinkingMessage = createThinkingMessage(
            item.thinking,
            timestamp,
          );
          if (options.isStreaming) {
            context.addMessage(thinkingMessage);
          } else {
            thinkingMessages.push(thinkingMessage);
          }
        }
      }
    }

    // For batch processing, assemble the messages in proper order
    if (!options.isStreaming) {
      const orderedMessages: AllMessage[] = [];

      // Add thinking messages first (reasoning comes before action)
      orderedMessages.push(...thinkingMessages);

      // Add tool messages second (actions)
      orderedMessages.push(...messages);

      // Add assistant text message last if there is text content
      if (assistantContent.trim()) {
        const assistantMessage: ChatMessage = {
          type: "chat",
          role: "assistant",
          content: assistantContent.trim(),
          timestamp,
        };
        orderedMessages.push(assistantMessage);
      }

      return orderedMessages;
    }

    return messages;
  }

  /**
   * Process a result message
   */
  private processResultMessage(
    message: Extract<SDKMessage | TimestampedSDKMessage, { type: "result" }>,
    context: ProcessingContext,
    options: ProcessingOptions,
  ): void {
    const timestamp = options.timestamp || Date.now();
    const resultMessage = convertResultMessage(message, timestamp);
    context.addMessage(resultMessage);

    // Extract and set token usage from modelUsage (ABSOLUTE totals, not incremental)
    // CRITICAL: Claude Code SDK uses modelUsage field (not usage) for actual token data
    // - modelUsage contains per-model token counts with cumulative totals
    // - We sum across all models to get total conversation usage
    console.log('[TOKEN_DEBUG] ========== RESULT MESSAGE ==========');

    if (context.onTokenUpdate) {
      // Extract tokens from modelUsage field (Claude Code SDK specific)
      const modelUsage = (message as any).modelUsage;

      if (modelUsage && typeof modelUsage === 'object') {
        let totalInputTokens = 0;
        let totalOutputTokens = 0;

        // Sum tokens across all models used
        for (const modelName in modelUsage) {
          const modelData = modelUsage[modelName];
          if (modelData && typeof modelData === 'object') {
            totalInputTokens += modelData.inputTokens || 0;
            totalOutputTokens += modelData.outputTokens || 0;
          }
        }

        const totalTokens = totalInputTokens + totalOutputTokens;

        console.log('[TOKEN_DEBUG] modelUsage data:', modelUsage);
        console.log('[TOKEN_DEBUG] Total input tokens:', totalInputTokens);
        console.log('[TOKEN_DEBUG] Total output tokens:', totalOutputTokens);
        console.log('[TOKEN_DEBUG] Total tokens (ABSOLUTE):', totalTokens);
        console.log('[TOKEN_DEBUG] Calling onTokenUpdate with ABSOLUTE total');

        // Pass the absolute total
        context.onTokenUpdate(totalTokens);
      } else {
        console.log('[TOKEN_DEBUG] No modelUsage data found in result message');
      }
    }
    console.log('[TOKEN_DEBUG] =====================================');

    // Clear current assistant message (streaming only)
    if (options.isStreaming) {
      context.setCurrentAssistantMessage?.(null);
    }
  }

  /**
   * Process a user message
   */
  private processUserMessage(
    message: Extract<SDKMessage | TimestampedSDKMessage, { type: "user" }>,
    context: ProcessingContext,
    options: ProcessingOptions,
  ): AllMessage[] {
    const timestamp = options.timestamp || Date.now();
    const messages: AllMessage[] = [];

    // For batch processing, collect messages to return
    // For streaming, messages are added directly via context
    const localContext = options.isStreaming
      ? context
      : {
          ...context,
          addMessage: (msg: AllMessage) => messages.push(msg),
        };

    const messageContent = message.message.content;

    if (Array.isArray(messageContent)) {
      for (const contentItem of messageContent) {
        if (contentItem.type === "tool_result") {
          // Extract toolUseResult from message if it exists
          const toolUseResult = (message as { toolUseResult?: unknown })
            .toolUseResult;
          this.processToolResult(
            contentItem,
            localContext,
            options,
            toolUseResult,
          );
        } else if (contentItem.type === "text") {
          // Regular text content
          const userMessage: ChatMessage = {
            type: "chat",
            role: "user",
            content: (contentItem as { text: string }).text,
            timestamp,
          };
          localContext.addMessage(userMessage);
        }
      }
    } else if (typeof messageContent === "string") {
      // Simple string content
      const userMessage: ChatMessage = {
        type: "chat",
        role: "user",
        content: messageContent,
        timestamp,
      };
      localContext.addMessage(userMessage);
    }

    return messages;
  }

  /**
   * Process a single SDK message
   *
   * @param message - The SDK message to process
   * @param context - Processing context for callbacks and state management
   * @param options - Processing options (streaming vs batch, timestamp override)
   * @returns Array of messages for batch processing (empty for streaming)
   */
  public processMessage(
    message: SDKMessage | TimestampedSDKMessage,
    context: ProcessingContext,
    options: ProcessingOptions = {},
  ): AllMessage[] {
    const timestamp =
      options.timestamp ||
      ("timestamp" in message
        ? new Date(message.timestamp).getTime()
        : Date.now());

    const finalOptions = { ...options, timestamp };

    // DEBUG: Log all messages coming through
    console.log('[PROCESS_MESSAGE] Type:', message.type, 'isStreaming:', options.isStreaming, 'message:', message);

    switch (message.type) {
      case "system":
        this.processSystemMessage(message, context, finalOptions);
        return [];

      case "assistant":
        return this.processAssistantMessage(message, context, finalOptions);

      case "result":
        this.processResultMessage(message, context, finalOptions);
        return [];

      case "user":
        console.log('[PROCESS_MESSAGE] USER message content:', message.message?.content);
        return this.processUserMessage(message, context, finalOptions);

      default:
        console.warn(
          "Unknown message type:",
          (message as { type: string }).type,
        );
        return [];
    }
  }

  /**
   * Process multiple messages in batch (for history loading)
   *
   * @param messages - Array of timestamped SDK messages
   * @param context - Processing context
   * @returns Array of processed messages
   */
  public processMessagesBatch(
    messages: TimestampedSDKMessage[],
    context?: Partial<ProcessingContext>,
  ): AllMessage[] {
    const allMessages: AllMessage[] = [];

    // Create a batch context that collects messages
    const batchContext: ProcessingContext = {
      addMessage: (msg: AllMessage) => allMessages.push(msg),
      ...context,
    };

    // Clear cache before processing batch
    this.clearCache();

    for (const message of messages) {
      const processedMessages = this.processMessage(message, batchContext, {
        isStreaming: false,
        timestamp: new Date(message.timestamp).getTime(),
      });
      allMessages.push(...processedMessages);
    }

    return allMessages;
  }
}
