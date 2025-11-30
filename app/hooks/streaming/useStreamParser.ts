import { useCallback } from "react";
import type {
  StreamResponse,
  SDKMessage,
  SystemMessage,
  AbortMessage,
} from "../../types";
import {
  isSystemMessage,
  isAssistantMessage,
  isResultMessage,
  isUserMessage,
} from "../../utils/messageTypes";
import type { StreamingContext } from "./useMessageProcessor";
import type { ProcessingContext } from "../../utils/UnifiedMessageProcessor";
import { useMessageProcessor } from "../../contexts/MessageProcessorContext";

export function useStreamParser() {
  // Use the singleton processor instance from context
  // This ensures cache continuity across component remounts
  const processor = useMessageProcessor();

  // Convert StreamingContext to ProcessingContext
  const adaptContext = useCallback(
    (context: StreamingContext): ProcessingContext => {
      return {
        // Core message handling
        addMessage: context.addMessage,
        updateLastMessage: context.updateLastMessage,

        // Current assistant message state
        currentAssistantMessage: context.currentAssistantMessage,
        setCurrentAssistantMessage: context.setCurrentAssistantMessage,

        // Session handling
        onSessionId: context.onSessionId,
        hasReceivedInit: context.hasReceivedInit,
        setHasReceivedInit: context.setHasReceivedInit,

        // Init message handling
        shouldShowInitMessage: context.shouldShowInitMessage,
        onInitMessageShown: context.onInitMessageShown,

        // Permission/Error handling
        onPermissionError: context.onPermissionError,
        onAbortRequest: context.onAbortRequest,

        // Token usage tracking
        onTokenUpdate: context.onTokenUpdate,
      };
    },
    [],
  );

  const processClaudeData = useCallback(
    (claudeData: SDKMessage, context: StreamingContext) => {
      const processingContext = adaptContext(context);

      // Validate message types before processing
      switch (claudeData.type) {
        case "system":
          if (!isSystemMessage(claudeData)) {
            console.warn("Invalid system message:", claudeData);
            return;
          }
          break;
        case "assistant":
          if (!isAssistantMessage(claudeData)) {
            console.warn("Invalid assistant message:", claudeData);
            return;
          }
          break;
        case "result":
          if (!isResultMessage(claudeData)) {
            console.warn("Invalid result message:", claudeData);
            return;
          }
          break;
        case "user":
          if (!isUserMessage(claudeData)) {
            console.warn("Invalid user message:", claudeData);
            return;
          }
          break;
        default:
          console.log("Unknown Claude message type:", claudeData);
          return;
      }

      // Process the message using the unified processor
      console.log('[DEBUG] useStreamParser calling processor.processMessage for:', claudeData.type);
      processor.processMessage(claudeData, processingContext, {
        isStreaming: true,
      });
    },
    [processor, adaptContext],
  );

  const processStreamLine = useCallback(
    (line: string, context: StreamingContext) => {
      try {
        const data: StreamResponse = JSON.parse(line);

        console.log('[STREAM_PARSER] Received stream data type:', data.type);

        if (data.type === "claude_json" && data.data) {
          // data.data is already an SDKMessage object, no need to parse
          const claudeData = data.data as SDKMessage;
          console.log('[STREAM_PARSER] Processing claude_json, message type:', claudeData.type);
          processClaudeData(claudeData, context);
        } else if (data.type === "ping") {
          // Mobile keep-alive ping - ignore silently
          console.log('[STREAM_PARSER] Received mobile keep-alive ping');
        } else if (data.type === "error") {
          const errorMessage: SystemMessage = {
            type: "error",
            subtype: "stream_error",
            message: data.error || "Unknown error",
            timestamp: Date.now(),
          };
          context.addMessage(errorMessage);
        } else if (data.type === "aborted") {
          const abortedMessage: AbortMessage = {
            type: "system",
            subtype: "abort",
            message: "Operation was aborted by user",
            timestamp: Date.now(),
          };
          context.addMessage(abortedMessage);
          context.setCurrentAssistantMessage(null);
        } else if (data.type === "token_update") {
          // Handle token usage updates from backend
          if (data.usage) {
            const currentContextSize =
              (data.usage.cache_read_tokens || 0) +
              (data.usage.cache_creation_tokens || 0) +
              data.usage.input_tokens +
              data.usage.output_tokens;

            // Update token usage context (assuming it exists)
            context.setTokenUsage?.({
              inputTokens: data.usage.input_tokens,
              outputTokens: data.usage.output_tokens,
              cacheCreationTokens: data.usage.cache_creation_tokens,
              cacheReadTokens: data.usage.cache_read_tokens,
              currentContextSize: currentContextSize,
              percentage: (currentContextSize / 200000) * 100
            });

            console.log('[TOKEN_UPDATE] Current context size:', currentContextSize);
          }
        }
      } catch (parseError) {
        console.error("Failed to parse stream line:", parseError);
      }
    },
    [processClaudeData],
  );

  return {
    processStreamLine,
  };
}
