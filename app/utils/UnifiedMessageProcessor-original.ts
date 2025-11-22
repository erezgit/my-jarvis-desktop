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

    // Get cached tool_use information to determine tool name (for non-voice tools)
    const toolUseId = contentItem.tool_use_id || "";
    const cachedToolInfo = this.getCachedToolInfo(toolUseId);
    const toolName = cachedToolInfo?.name || "Tool";


    // 🔊 VOICE DETECTION LOGGING - Check every tool result for voice
    if (toolName && toolName.includes('voice')) {
      console.log('[VOICE_DETECTION] 🎵 VOICE TOOL NAME DETECTED:', toolName);
      console.log('[VOICE_DETECTION] 📝 Voice content preview:', typeof content === 'string' ? content.substring(0, 500) : JSON.stringify(content).substring(0, 500));
    }

    // 🔊 VOICE MCP DETECTION - Check for exact MCP voice tool
    if (toolName === "mcp__jarvis-tools__voice_generate") {
      console.log('[VOICE_DETECTION] 🎯 EXACT MCP VOICE TOOL MATCH!');
    } else {
      console.log('[VOICE_DETECTION] ❌ Not voice tool, name was:', toolName);
    }

    // 🔊 VOICE CONTENT DETECTION - Check content for voice patterns
    if (content && typeof content === 'string') {
      const hasVoiceData = content.includes('VOICE_DATA:');
      const hasAudioUrl = content.includes('audioUrl');
      const hasVoiceSuccess = content.includes('Voice message generated');
      console.log('[VOICE_DETECTION] 📊 Content analysis:', {
        hasVoiceData,
        hasAudioUrl,
        hasVoiceSuccess,
        contentType: typeof content,
        contentLength: content.length
      });
    }

    // Don't show tool_result for TodoWrite since we already show TodoMessage from tool_use
    if (toolName === "TodoWrite") {
      return;
    }

    // Check if this is the MCP voice generation tool
    if (toolName === "mcp__jarvis-tools__voice_generate") {
      const memoryUsage = typeof window !== 'undefined' && (window as any).performance?.memory
        ? `${Math.round((window as any).performance.memory.usedJSHeapSize / 1024 / 1024)}MB`
        : 'N/A';
      console.log('[MCP_VOICE_DEBUG] ✅ Voice generation tool detected!');
      console.log('[MCP_VOICE_DEBUG] Memory usage:', memoryUsage);
      console.log('[MCP_VOICE_DEBUG] Processing timestamp:', new Date().toISOString());
      console.log('[MCP_VOICE_DEBUG] Full content length:', content.length);
      console.log('[MCP_VOICE_DEBUG] Full content preview:', typeof content === 'string' ? content.substring(0, 300) : JSON.stringify(content).substring(0, 300));
      console.log('[MCP_VOICE_DEBUG] Full content:', content);

      // Extract the text content from various possible formats
      let textContent = content;

      console.log('[MCP_VOICE_DEBUG] 🔍 STARTING TEXT EXTRACTION PROCESS');
      console.log('[MCP_VOICE_DEBUG] Initial content type:', typeof content);
      console.log('[MCP_VOICE_DEBUG] Initial content sample:', typeof content === 'string' ? content.substring(0, 200) : JSON.stringify(content).substring(0, 200));

      // Handle content that might be JSON string containing array
      if (typeof content === 'string' && (content.startsWith('[') || content.includes('{"type":"text"'))) {
        console.log('[MCP_VOICE_DEBUG] 📝 JSON string detected, attempting to parse');
        console.log('[MCP_VOICE_DEBUG] String starts with [:', content.startsWith('['));
        console.log('[MCP_VOICE_DEBUG] String includes {"type":"text":', content.includes('{"type":"text"'));
        try {
          const parsedContent = JSON.parse(content);
          console.log('[MCP_VOICE_DEBUG] ✅ Parsed JSON successfully:', parsedContent);
          console.log('[MCP_VOICE_DEBUG] Parsed content type:', typeof parsedContent);
          console.log('[MCP_VOICE_DEBUG] Is array:', Array.isArray(parsedContent));
          if (Array.isArray(parsedContent)) {
            console.log('[MCP_VOICE_DEBUG] Array length:', parsedContent.length);
            console.log('[MCP_VOICE_DEBUG] First item:', parsedContent[0]);
          }
          if (Array.isArray(parsedContent) && parsedContent[0]?.type === 'text' && parsedContent[0]?.text) {
            console.log('[MCP_VOICE_DEBUG] ✅ Extracting text from parsed JSON array');
            textContent = parsedContent[0].text;
            console.log('[MCP_VOICE_DEBUG] Extracted text length:', textContent.length);
            console.log('[MCP_VOICE_DEBUG] Extracted text preview:', textContent ? textContent.substring(0, 100) : 'N/A');
          }
        } catch (e) {
          console.log('[MCP_VOICE_DEBUG] ❌ Failed to parse as JSON:', e.message);
          console.log('[MCP_VOICE_DEBUG] Raw content that failed:', typeof content === 'string' ? content.substring(0, 500) : JSON.stringify(content).substring(0, 500));
        }
      }
      // Handle direct array format
      else if (Array.isArray(content) && content.length > 0) {
        console.log('[MCP_VOICE_DEBUG] 📋 Direct array detected, length:', content.length);
        console.log('[MCP_VOICE_DEBUG] First item:', content[0]);
        console.log('[MCP_VOICE_DEBUG] First item type:', content[0]?.type);
        console.log('[MCP_VOICE_DEBUG] Has text:', !!content[0]?.text);
        if (content[0]?.type === 'text' && content[0]?.text) {
          console.log('[MCP_VOICE_DEBUG] ✅ Extracting text from direct array format');
          textContent = content[0].text;
          console.log('[MCP_VOICE_DEBUG] Extracted text length:', textContent.length);
        }
      }
      // Handle toolUseResult fallback
      else if (toolUseResult) {
        console.log('[MCP_VOICE_DEBUG] 🔄 Using toolUseResult fallback');
        console.log('[MCP_VOICE_DEBUG] toolUseResult type:', typeof toolUseResult);
        console.log('[MCP_VOICE_DEBUG] toolUseResult:', toolUseResult);
        if (Array.isArray(toolUseResult) && toolUseResult[0]?.text) {
          textContent = toolUseResult[0].text;
          console.log('[MCP_VOICE_DEBUG] ✅ Used array toolUseResult');
        } else if (typeof toolUseResult === 'object' && toolUseResult.text) {
          textContent = toolUseResult.text;
          console.log('[MCP_VOICE_DEBUG] ✅ Used object toolUseResult');
        }
      } else {
        console.log('[MCP_VOICE_DEBUG] 🤷 Using content as-is, no special handling');
      }

      console.log('[MCP_VOICE_DEBUG] Text content to parse:', typeof textContent, textContent);

      // Extract VOICE_DATA JSON from the response - improved regex for nested objects
      console.log('[MCP_VOICE_DEBUG] 🎯 SEARCHING FOR VOICE_DATA PATTERN');
      console.log('[MCP_VOICE_DEBUG] Text content to search in (length):', textContent.length);
      console.log('[MCP_VOICE_DEBUG] Looking for "VOICE_DATA:" in text');
      console.log('[MCP_VOICE_DEBUG] Text includes "VOICE_DATA:":', textContent.includes('VOICE_DATA:'));
      console.log('[MCP_VOICE_DEBUG] Text content full text for pattern matching:', textContent);

      const voiceDataMatch = textContent.match(/VOICE_DATA:(\{.*?\}(?=\n|$))/s);
      console.log('[MCP_VOICE_DEBUG] Regex match result:', voiceDataMatch);

      if (!voiceDataMatch) {
        console.log('[MCP_VOICE_DEBUG] ❌ VOICE_DATA pattern not found!');
        console.log('[MCP_VOICE_DEBUG] Trying simpler regex patterns...');

        // Try alternative patterns
        const alternativePatterns = [
          /VOICE_DATA:(\{[^}]+\})/,
          /VOICE_DATA:\s*(\{.*?\})/,
          /VOICE_DATA:({.*})/,
        ];

        for (let i = 0; i < alternativePatterns.length; i++) {
          const altMatch = textContent.match(alternativePatterns[i]);
          console.log(`[MCP_VOICE_DEBUG] Alternative pattern ${i} match:`, altMatch);
          if (altMatch) {
            console.log('[MCP_VOICE_DEBUG] ✅ Found with alternative pattern!');
            break;
          }
        }

        console.log('[MCP_VOICE_DEBUG] ❌ No VOICE_DATA pattern found with any method');
        console.log('[MCP_VOICE_DEBUG] Full text content for manual inspection:', textContent);
        return;
      }

      console.log('[MCP_VOICE_DEBUG] ✅ VOICE_DATA pattern found!');
      console.log('[MCP_VOICE_DEBUG] Full match:', voiceDataMatch[0]);
      console.log('[MCP_VOICE_DEBUG] Extracted VOICE_DATA string:', voiceDataMatch[1]);

      let voiceData = null;
      try {
        console.log('[MCP_VOICE_DEBUG] 🔄 Attempting to parse VOICE_DATA JSON...');
        voiceData = JSON.parse(voiceDataMatch[1]);
        console.log('[MCP_VOICE_DEBUG] ✅ Successfully parsed VOICE_DATA:', voiceData);
        console.log('[MCP_VOICE_DEBUG] VOICE_DATA type:', typeof voiceData);
        console.log('[MCP_VOICE_DEBUG] VOICE_DATA keys:', Object.keys(voiceData || {}));
      } catch (e) {
        console.log('[MCP_VOICE_DEBUG] ❌ Failed to parse VOICE_DATA JSON:', e);
        console.log('[MCP_VOICE_DEBUG] JSON that failed to parse:', voiceDataMatch[1]);
        console.log('[MCP_VOICE_DEBUG] Error message:', (e as Error).message);
        return;
      }

      // Validate required fields
      console.log('[MCP_VOICE_DEBUG] 🔍 VALIDATING VOICE_DATA FIELDS');
      console.log('[MCP_VOICE_DEBUG] audioUrl exists:', !!voiceData.audioUrl);
      console.log('[MCP_VOICE_DEBUG] audioUrl value:', voiceData.audioUrl);
      console.log('[MCP_VOICE_DEBUG] transcript exists:', !!voiceData.transcript);
      console.log('[MCP_VOICE_DEBUG] transcript value:', voiceData.transcript);

      if (!voiceData.audioUrl) {
        console.log('[MCP_VOICE_DEBUG] ❌ CRITICAL: No audioUrl in VOICE_DATA!');
        console.log('[MCP_VOICE_DEBUG] Available fields in voiceData:', Object.keys(voiceData));
        return;
      }

      if (!voiceData.transcript) {
        console.log('[MCP_VOICE_DEBUG] ❌ CRITICAL: No transcript in VOICE_DATA!');
        console.log('[MCP_VOICE_DEBUG] Available fields in voiceData:', Object.keys(voiceData));
        return;
      }

      console.log('[MCP_VOICE_DEBUG] ✅ VALIDATION PASSED - Have both audioUrl and transcript');

      // Create VoiceMessage from VOICE_DATA
      console.log('[MCP_VOICE_DEBUG] 🏗️ CREATING VOICE MESSAGE OBJECT');
      console.log('[MCP_VOICE_DEBUG] Using transcript:', voiceData.transcript);
      console.log('[MCP_VOICE_DEBUG] Using audioUrl:', voiceData.audioUrl);
      console.log('[MCP_VOICE_DEBUG] Using voiceType:', voiceData.voiceType || 'nova');
      console.log('[MCP_VOICE_DEBUG] Using timestamp:', voiceData.timestamp || options.timestamp || Date.now());
      console.log('[MCP_VOICE_DEBUG] AutoPlay setting:', options.isStreaming !== false);

      const voiceMessage = {
        type: "voice" as const,
        content: voiceData.transcript,
        audioUrl: voiceData.audioUrl,
        voice: voiceData.voiceType || 'nova',
        timestamp: voiceData.timestamp || options.timestamp || Date.now(),
        autoPlay: options.isStreaming !== false
      };

      console.log('[MCP_VOICE_DEBUG] ✅ VOICE MESSAGE OBJECT CREATED');
      console.log('[MCP_VOICE_DEBUG] CRITICAL TIMESTAMP TRACKING:', voiceMessage.timestamp);
      console.log('[MCP_VOICE_DEBUG] Final voice message object:', JSON.stringify(voiceMessage, null, 2));
      console.log('[MCP_VOICE_DEBUG] Object type check:', voiceMessage.type === 'voice');
      console.log('[MCP_VOICE_DEBUG] Content length:', voiceMessage.content.length);
      console.log('[MCP_VOICE_DEBUG] AudioUrl valid:', voiceMessage.audioUrl.startsWith('http') || voiceMessage.audioUrl.startsWith('/'));

      // ADD COMPREHENSIVE RENDERING PIPELINE LOGS - FOCUS ON MOBILE ISSUES
      console.log('[VOICE_RENDER_DEBUG] ========================================');
      console.log('[VOICE_RENDER_DEBUG] 🎯 STARTING VOICE MESSAGE RENDERING PIPELINE');
      console.log('[VOICE_RENDER_DEBUG] Browser info:', {
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent.substring(0, 100) : 'N/A',
        isMobile: typeof window !== 'undefined' ? window.innerWidth <= 768 : false,
        viewportWidth: typeof window !== 'undefined' ? window.innerWidth : 'N/A',
        devicePixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio : 'N/A'
      });
      console.log('[VOICE_RENDER_DEBUG] Rendering environment:', {
        isStreaming: options.isStreaming,
        hasWindow: typeof window !== 'undefined',
        hasDocument: typeof document !== 'undefined',
        readyState: typeof document !== 'undefined' ? document.readyState : 'N/A'
      });
      console.log('[VOICE_RENDER_DEBUG] Voice message size analysis:', {
        contentLength: voiceMessage.content.length,
        audioUrlLength: voiceMessage.audioUrl.length,
        totalMessageSize: JSON.stringify(voiceMessage).length,
        isLargeMessage: JSON.stringify(voiceMessage).length > 1000
      });
      console.log('[VOICE_RENDER_DEBUG] ========================================');

      console.log('[MCP_VOICE_DEBUG] 🔄 CALLING addMessage - BEFORE');
      console.log('[MCP_VOICE_DEBUG] Context available:', !!context);
      console.log('[MCP_VOICE_DEBUG] addMessage function available:', typeof context.addMessage);
      console.log('[MCP_VOICE_DEBUG] addMessage function available:', typeof context.addMessage === 'function');

      // ADD DEEP CONTEXT ANALYSIS
      console.log('[VOICE_RENDER_DEBUG] 🔍 DEEP CONTEXT ANALYSIS:');
      console.log('[VOICE_RENDER_DEBUG] Context object type:', typeof context);
      console.log('[VOICE_RENDER_DEBUG] Context object keys:', Object.keys(context));
      console.log('[VOICE_RENDER_DEBUG] Context prototype:', Object.getPrototypeOf(context));
      console.log('[VOICE_RENDER_DEBUG] Context instanceof check available:', !!context.addMessage);

      // Track timing and memory before/after addMessage call
      const beforeMemory = typeof window !== 'undefined' && (window as any).performance?.memory
        ? (window as any).performance.memory.usedJSHeapSize
        : 0;
      const beforeTime = performance.now();

      console.log('[VOICE_RENDER_DEBUG] ⏰ PRE-ADDMESSAGE TIMING:', {
        timestamp: new Date().toISOString(),
        performanceNow: beforeTime,
        dateNow: Date.now(),
        messageTimestamp: voiceMessage.timestamp
      });

      // CRITICAL STEP: Call addMessage with comprehensive error handling
      try {
        console.log('[VOICE_RENDER_DEBUG] 🚀 EXECUTING context.addMessage...');
        context.addMessage(voiceMessage);
        console.log('[VOICE_RENDER_DEBUG] ✅ context.addMessage COMPLETED WITHOUT ERRORS');
      } catch (error) {
        console.log('[VOICE_RENDER_DEBUG] ❌ CRITICAL ERROR in context.addMessage:', error);
        console.log('[VOICE_RENDER_DEBUG] Error type:', typeof error);
        console.log('[VOICE_RENDER_DEBUG] Error message:', error instanceof Error ? error.message : String(error));
        console.log('[VOICE_RENDER_DEBUG] Error stack:', error instanceof Error ? error.stack : 'No stack');
        throw error; // Re-throw to see in console
      }

      const afterTime = performance.now();
      const afterMemory = typeof window !== 'undefined' && (window as any).performance?.memory
        ? (window as any).performance.memory.usedJSHeapSize
        : 0;
      const memoryDelta = afterMemory - beforeMemory;

      console.log('[MCP_VOICE_DEBUG] 🔄 Calling addMessage - AFTER');
      console.log('[MCP_VOICE_DEBUG] ⏱️ addMessage timing:', (afterTime - beforeTime).toFixed(2) + 'ms');
      console.log('[MCP_VOICE_DEBUG] 💾 Memory delta:', memoryDelta > 0 ? `+${Math.round(memoryDelta/1024)}KB` : `${Math.round(memoryDelta/1024)}KB`);

      console.log('[VOICE_RENDER_DEBUG] ⏰ POST-ADDMESSAGE TIMING:', {
        timestamp: new Date().toISOString(),
        performanceNow: afterTime,
        executionTime: (afterTime - beforeTime).toFixed(2) + 'ms',
        memoryImpact: memoryDelta
      });

      // ADD FINAL VALIDATION CHECK
      console.log('[VOICE_RENDER_DEBUG] 🔍 FINAL VALIDATION CHECK - MOBILE CRITICAL');
      console.log('[VOICE_RENDER_DEBUG] Message should now be in React state pipeline');
      console.log('[VOICE_RENDER_DEBUG] Next step: Watch for [VOICE_DEBUG] addMessage: Voice message received in useChatState');
      console.log('[VOICE_RENDER_DEBUG] If missing on mobile but present on desktop = MOBILE RENDERING BUG CONFIRMED');
      console.log('[VOICE_RENDER_DEBUG] ========================================');

      console.log('[MCP_VOICE_DEBUG] ✅ Voice message processing complete');
      return; // Skip creating ToolResultMessage for voice tool
    }

    // ✅ Legacy voice_message content type handling REMOVED
    // All voice generation now uses voiceData field approach (lines 209-267)

    // Special handling for Write/Edit tool results - file operations
    // Use cached tool input instead of pattern matching (100% reliable)

    let filePath: string | null = null;
    let operation: "created" | "modified" | "deleted" | null = null;

    // Check if this is a Write, Edit, or Bash (delete) tool by examining the cached input
    if (cachedToolInfo && cachedToolInfo.input) {
      const input = cachedToolInfo.input;

      // Check tool name FIRST to distinguish Write from Edit from Delete
      if (toolName === "Write" && input.file_path && typeof input.file_path === 'string') {
        filePath = input.file_path;
        operation = "created";
      }
      else if (toolName === "Edit" && input.file_path && typeof input.file_path === 'string') {
        filePath = input.file_path;
        operation = "modified";
      }
      else if (toolName === "Bash" && input.command && typeof input.command === 'string') {
        // Check if Bash command is a delete operation (rm, unlink, etc.)
        const command = input.command as string;
        const deleteMatch = command.match(/(?:rm|unlink)\s+(?:-[rf]+\s+)?["']?([^\s"']+)["']?/);
        if (deleteMatch) {
          filePath = deleteMatch[1];
          operation = "deleted";
        }
      }
    }

    // Additional detection: Check for embedded FILE_OPERATION JSON in MCP tool responses
    // This provides a fallback if cache-based detection fails
    if (!filePath && content) {
      const fileOpMatch = content.match(/FILE_OPERATION:(\{[^}]+\})/);
      if (fileOpMatch) {
        try {
          const fileOpData = JSON.parse(fileOpMatch[1]);

          if (fileOpData.path && fileOpData.operation) {
            filePath = fileOpData.path;
            // Map operation types: file_created -> created, file_modified -> modified
            if (fileOpData.operation === 'file_created') {
              operation = "created";
            } else if (fileOpData.operation === 'file_modified') {
              operation = "modified";
            }
          }
        } catch (e) {
          // Silently handle parsing errors
        }
      }
    }

    // If we detected a file operation, create FileOperationMessage
    if (filePath && operation) {
      const fileName = filePath.split('/').pop() || filePath;

      // Create FileOperationMessage
      const fileOpMessage = {
        type: "file_operation" as const,
        operation,
        path: filePath,
        fileName,
        isDirectory: false,
        timestamp: options.timestamp || Date.now(),
      };

      context.addMessage(fileOpMessage);
      // Note: We still create ToolResultMessage too (unlike voice which returns early)
    }


    // Special handling for other Bash tool results
    if (toolName === "Bash") {
      const cachedInput = this.getCachedToolInfo(toolUseId)?.input;
      const command = cachedInput?.command as string;

      // Note: jarvis_voice.sh detection removed - now handled by structured MCP tool responses

      // Special handling for PDF export trigger
      if (command?.includes('jarvis_pdf_export.sh')) {
        // Parse PDF export parameters from content
        if (content.includes('PDF_EXPORT_TRIGGER')) {
          const filePathMatch = content.match(/FILE_PATH:(.+)/);
          const filenameMatch = content.match(/FILENAME:(.+)/);

          if (filePathMatch) {
            const filePath = filePathMatch[1].trim();
            const filename = filenameMatch ? filenameMatch[1].trim() : 'presentation.pdf';

            // Create PDFExportMessage instead of ToolResultMessage
            const pdfExportMessage = {
              type: "pdf_export" as const,
              filePath,
              filename,
              timestamp: options.timestamp || Date.now(),
            };

            context.addMessage(pdfExportMessage);
            return; // Skip creating ToolResultMessage
          }
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

    // Fetch cumulative session tokens from backend by parsing JSONL file
    // This replaces the old approach of extracting per-turn tokens from modelUsage
    if (context.onTokenUpdate && message.session_id) {
      // Call backend endpoint to get cumulative session total
      fetch(`/api/session-tokens/${message.session_id}`)
        .then((response) => {
          if (!response.ok) {
            return null;
          }
          return response.json();
        })
        .then((data) => {
          if (data && data.totalTokens !== undefined) {
            context.onTokenUpdate?.(data.totalTokens);
          }
        })
        .catch((error) => {
          console.error('Error fetching session tokens:', error);
        });
    }

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
      for (let i = 0; i < messageContent.length; i++) {
        const contentItem = messageContent[i];

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
