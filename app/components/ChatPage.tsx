import { useEffect, useCallback, useState } from "react";
import { ChevronLeftIcon } from "@heroicons/react/24/outline";
import type {
  ChatRequest,
  ChatMessage,
  ProjectInfo,
  PermissionMode,
} from "../types";
import { isPDFExportMessage } from "../types";
import { useClaudeStreaming } from "../hooks/useClaudeStreaming";
import { useChatStateContext } from "../contexts/ChatStateContext";
import { usePermissions } from "../hooks/chat/usePermissions";
import { usePermissionMode } from "../hooks/chat/usePermissionMode";
import { useAbortController } from "../hooks/chat/useAbortController";
import { useAutoHistoryLoader } from "../hooks/useHistoryLoader";
import { ChatInput } from "./chat/ChatInput";
import { ChatMessages } from "./chat/ChatMessages";
import { HistoryView } from "./HistoryView";
import { getChatUrl, getProjectsUrl } from "../config/api";
import { KEYBOARD_SHORTCUTS } from "../utils/constants";
import { normalizeWindowsPath } from "../utils/pathUtils";
import type { StreamingContext } from "../hooks/streaming/useMessageProcessor";
import { TokenContextBar } from "./TokenContextBar";
import { useTokenUsage } from "../hooks/useTokenUsage";
import { useSettings } from "../hooks/useSettings";
import { voicePlayedTracker } from "../lib/voice-played-tracker";
import { exportPresentationToPDF } from "../utils/presentation-pdf-exporter";

interface ChatPageProps {
  currentView: 'chat' | 'history';
  onViewChange: (view: 'chat' | 'history') => void;
  onFileUploadReady?: (handler: (file: File) => void) => void;
}

export function ChatPage({ currentView, onViewChange, onFileUploadReady }: ChatPageProps) {
  console.log('[CHATPAGE] ===== ChatPage component loaded - BUILD TEST =====');

  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Token usage tracking - accumulate tokens from each result message
  const { updateTokenUsage, resetTokenUsage } = useTokenUsage();

  // Claude Code working directory - always /workspace for consistency
  const claudeWorkingDirectory = '/workspace';

  // Use currentView from props
  const isHistoryView = currentView === "history";
  const isLoadedConversation = !!sessionId && !isHistoryView;

  const { processStreamLine } = useClaudeStreaming();
  const { abortRequest, createAbortHandler } = useAbortController();

  // Permission mode state management
  const { permissionMode, setPermissionMode } = usePermissionMode();

  // Get encoded name for current working directory
  const getEncodedName = useCallback(() => {
    if (!claudeWorkingDirectory || !projects.length) {
      return null;
    }

    const project = projects.find((p) => p.path === claudeWorkingDirectory);

    // Normalize paths for comparison (handle Windows path issues)
    const normalizedWorking = normalizeWindowsPath(claudeWorkingDirectory);
    const normalizedProject = projects.find(
      (p) => normalizeWindowsPath(p.path) === normalizedWorking,
    );

    // Use normalized result if exact match fails
    const finalProject = project || normalizedProject;

    return finalProject?.encodedName || null;
  }, [claudeWorkingDirectory, projects]);

  // Load conversation history if sessionId is provided
  const {
    messages: historyMessages,
    loading: historyLoading,
    error: historyError,
    sessionId: loadedSessionId,
  } = useAutoHistoryLoader(
    getEncodedName() || undefined,
    sessionId || undefined,
  );

  // Get chat state from context (single source of truth)
  const {
    messages,
    input,
    isLoading,
    currentSessionId,
    currentRequestId,
    hasShownInitMessage,
    currentAssistantMessage,
    setMessages,
    setInput,
    setCurrentSessionId,
    setHasShownInitMessage,
    setHasReceivedInit,
    setCurrentAssistantMessage,
    addMessage,
    updateLastMessage,
    clearInput,
    generateRequestId,
    resetRequestState,
    startRequest,
  } = useChatStateContext();

  // Load history into shared state when it arrives
  useEffect(() => {
    if (historyMessages && historyMessages.length > 0) {
      setMessages(historyMessages);
    }
  }, [historyMessages, setMessages]);

  useEffect(() => {
    if (loadedSessionId) {
      setCurrentSessionId(loadedSessionId);
    }
  }, [loadedSessionId, setCurrentSessionId]);

  // Reset tokens when session ID changes (new conversation or switching conversations)
  useEffect(() => {
    console.log('[TOKEN_RESET] Session ID changed:', currentSessionId);
    resetTokenUsage();
  }, [currentSessionId, resetTokenUsage]);

  const {
    allowedTools,
    permissionRequest,
    showPermissionRequest,
    closePermissionRequest,
    allowToolTemporary,
    allowToolPermanent,
    isPermissionMode,
    planModeRequest,
    showPlanModeRequest,
    closePlanModeRequest,
    updatePermissionMode,
  } = usePermissions({
    onPermissionModeChange: setPermissionMode,
  });

  const handlePermissionError = useCallback(
    (toolName: string, patterns: string[], toolUseId: string) => {
      // Check if this is an ExitPlanMode permission error
      if (patterns.includes("ExitPlanMode")) {
        // For ExitPlanMode, show plan permission interface instead of regular permission
        showPlanModeRequest(""); // Empty plan content since it was already displayed
      } else {
        showPermissionRequest(toolName, patterns, toolUseId);
      }
    },
    [showPermissionRequest, showPlanModeRequest],
  );

  const sendMessage = useCallback(
    async (
      messageContent?: string,
      tools?: string[],
      hideUserMessage = false,
      overridePermissionMode?: PermissionMode,
    ) => {
      const content = messageContent || input.trim();
      if (!content || isLoading) return;

      const requestId = generateRequestId();

      // Only add user message to chat if not hidden
      if (!hideUserMessage) {
        const userMessage: ChatMessage = {
          type: "chat",
          role: "user",
          content: content,
          timestamp: Date.now(),
        };
        addMessage(userMessage);
      }

      if (!messageContent) clearInput();
      startRequest();

      try {
        const response = await fetch(getChatUrl(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: content,
            requestId,
            ...(currentSessionId ? { sessionId: currentSessionId } : {}),
            allowedTools: tools || allowedTools,
            workingDirectory: '/workspace', // Claude Code always runs in /workspace
            permissionMode: overridePermissionMode || permissionMode,
          } as ChatRequest),
        });

        if (!response.body) throw new Error("No response body");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        // Local state for this streaming session
        let localHasReceivedInit = false;
        let shouldAbort = false;

        const streamingContext: StreamingContext = {
          currentAssistantMessage,
          setCurrentAssistantMessage,
          addMessage,
          updateLastMessage,
          onSessionId: setCurrentSessionId,
          shouldShowInitMessage: () => !hasShownInitMessage,
          onInitMessageShown: () => setHasShownInitMessage(true),
          get hasReceivedInit() {
            return localHasReceivedInit;
          },
          setHasReceivedInit: (received: boolean) => {
            localHasReceivedInit = received;
            setHasReceivedInit(received);
          },
          onPermissionError: handlePermissionError,
          onAbortRequest: async () => {
            shouldAbort = true;
            await createAbortHandler(requestId)();
          },
          onTokenUpdate: updateTokenUsage,
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done || shouldAbort) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n").filter((line) => line.trim());

          for (const line of lines) {
            if (shouldAbort) break;
            processStreamLine(line, streamingContext);
          }

          if (shouldAbort) break;
        }
      } catch (error) {
        console.error("Failed to send message:", error);
        addMessage({
          type: "chat",
          role: "assistant",
          content: "Error: Failed to get response",
          timestamp: Date.now(),
        });
      } finally {
        resetRequestState();
      }
    },
    [
      input,
      isLoading,
      currentSessionId,
      allowedTools,
      hasShownInitMessage,
      currentAssistantMessage,
      workingDirectory: claudeWorkingDirectory,
      permissionMode,
      generateRequestId,
      clearInput,
      startRequest,
      addMessage,
      updateLastMessage,
      setCurrentSessionId,
      setHasShownInitMessage,
      setHasReceivedInit,
      setCurrentAssistantMessage,
      resetRequestState,
      processStreamLine,
      handlePermissionError,
      createAbortHandler,
    ],
  );

  const handleAbort = useCallback(() => {
    abortRequest(currentRequestId, isLoading, resetRequestState);
  }, [abortRequest, currentRequestId, isLoading, resetRequestState]);

  const handleFileUpload = useCallback(async (file: File) => {
    console.log('[FILE_UPLOAD] Starting upload:', file.name);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload-document', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      console.log('[FILE_UPLOAD] Success:', result);

      // Add a system message to the chat
      addMessage({
        type: 'chat',
        role: 'assistant',
        content: `File "${file.name}" uploaded successfully to ${result.path}. You can now ask me to process it and create a knowledge base.`,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('[FILE_UPLOAD] Error:', error);
      addMessage({
        type: 'chat',
        role: 'assistant',
        content: `Error uploading file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: Date.now(),
      });
    }
  }, [addMessage]);

  // Expose file upload handler to parent via callback
  useEffect(() => {
    if (onFileUploadReady) {
      onFileUploadReady(handleFileUpload);
    }
  }, [onFileUploadReady, handleFileUpload]);

  // Handle PDF export messages
  useEffect(() => {
    // Find the last PDF export message in the messages array
    const pdfExportMessages = messages.filter(isPDFExportMessage);
    if (pdfExportMessages.length === 0) return;

    const latestExport = pdfExportMessages[pdfExportMessages.length - 1];

    // Use a flag to prevent duplicate exports
    const exportKey = `${latestExport.filePath}-${latestExport.timestamp}`;
    const hasExported = sessionStorage.getItem(`pdf-export-${exportKey}`);

    if (!hasExported) {
      sessionStorage.setItem(`pdf-export-${exportKey}`, 'true');

      console.log('[PDF Export] Triggering export for:', latestExport.filePath);

      // Trigger PDF export
      exportPresentationToPDF({
        filePath: latestExport.filePath,
        filename: latestExport.filename,
      })
        .then((pdfPath) => {
          console.log('[PDF Export] Export completed successfully');
          // Add success message to the chat with file path
          addMessage({
            type: 'chat',
            role: 'assistant',
            content: `PDF exported successfully to: ${pdfPath}`,
            timestamp: Date.now(),
          });
        })
        .catch((error) => {
          console.error('[PDF Export] Export failed:', error);
          // Add error message to chat
          addMessage({
            type: 'chat',
            role: 'assistant',
            content: `PDF export failed: ${error.message}`,
            timestamp: Date.now(),
          });
        });
    }
  }, [messages, addMessage]);

  // Permission request handlers
  const handlePermissionAllow = useCallback(() => {
    if (!permissionRequest) return;

    // Add all patterns temporarily
    let updatedAllowedTools = allowedTools;
    permissionRequest.patterns.forEach((pattern) => {
      updatedAllowedTools = allowToolTemporary(pattern, updatedAllowedTools);
    });

    closePermissionRequest();

    if (currentSessionId) {
      sendMessage("continue", updatedAllowedTools, true);
    }
  }, [
    permissionRequest,
    currentSessionId,
    sendMessage,
    allowedTools,
    allowToolTemporary,
    closePermissionRequest,
  ]);

  const handlePermissionAllowPermanent = useCallback(() => {
    if (!permissionRequest) return;

    // Add all patterns permanently
    let updatedAllowedTools = allowedTools;
    permissionRequest.patterns.forEach((pattern) => {
      updatedAllowedTools = allowToolPermanent(pattern, updatedAllowedTools);
    });

    closePermissionRequest();

    if (currentSessionId) {
      sendMessage("continue", updatedAllowedTools, true);
    }
  }, [
    permissionRequest,
    currentSessionId,
    sendMessage,
    allowedTools,
    allowToolPermanent,
    closePermissionRequest,
  ]);

  const handlePermissionDeny = useCallback(() => {
    closePermissionRequest();
  }, [closePermissionRequest]);

  // Plan mode request handlers
  const handlePlanAcceptWithEdits = useCallback(() => {
    updatePermissionMode("acceptEdits");
    closePlanModeRequest();
    if (currentSessionId) {
      sendMessage("accept", allowedTools, true, "acceptEdits");
    }
  }, [
    updatePermissionMode,
    closePlanModeRequest,
    currentSessionId,
    sendMessage,
    allowedTools,
  ]);

  const handlePlanAcceptDefault = useCallback(() => {
    updatePermissionMode("default");
    closePlanModeRequest();
    if (currentSessionId) {
      sendMessage("accept", allowedTools, true, "default");
    }
  }, [
    updatePermissionMode,
    closePlanModeRequest,
    currentSessionId,
    sendMessage,
    allowedTools,
  ]);

  const handlePlanKeepPlanning = useCallback(() => {
    updatePermissionMode("plan");
    closePlanModeRequest();
  }, [updatePermissionMode, closePlanModeRequest]);

  // Create permission data for inline permission interface
  const permissionData = permissionRequest
    ? {
        patterns: permissionRequest.patterns,
        onAllow: handlePermissionAllow,
        onAllowPermanent: handlePermissionAllowPermanent,
        onDeny: handlePermissionDeny,
      }
    : undefined;

  // Create plan permission data for plan mode interface
  const planPermissionData = planModeRequest
    ? {
        onAcceptWithEdits: handlePlanAcceptWithEdits,
        onAcceptDefault: handlePlanAcceptDefault,
        onKeepPlanning: handlePlanKeepPlanning,
      }
    : undefined;


  // Load projects to get encodedName mapping
  // Reload when workingDirectory changes to update file tree
  useEffect(() => {
    console.log('[PROJECTS_EFFECT] Loading projects for workspace:', claudeWorkingDirectory);
    const loadProjects = async () => {
      try {
        const response = await fetch(getProjectsUrl());
        if (response.ok) {
          const data = await response.json();
          console.log('[PROJECTS_EFFECT] Loaded projects:', data.projects?.length || 0);
          setProjects(data.projects || []);
        }
      } catch (error) {
        console.error("Failed to load projects:", error);
      }
    };
    loadProjects();
  }, [claudeWorkingDirectory]);

  const handleConversationSelect = useCallback((sessionId: string) => {
    // Reset tokens when switching to a different conversation
    resetTokenUsage();
    // Clear voice message tracking to prevent cross-conversation playback
    voicePlayedTracker.clearAll();
    setSessionId(sessionId);
    onViewChange('chat'); // Exit history view and show the conversation
  }, [onViewChange, resetTokenUsage]);

  // Handle global keyboard shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === KEYBOARD_SHORTCUTS.ABORT && isLoading && currentRequestId) {
        e.preventDefault();
        handleAbort();
      }
    };

    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => document.removeEventListener("keydown", handleGlobalKeyDown);
  }, [isLoading, currentRequestId, handleAbort]);

  return (
    <div className="flex flex-col min-w-0 h-full px-4 pb-4 bg-neutral-50 dark:bg-neutral-900 transition-colors duration-300">
      {isHistoryView ? (
        <HistoryView
          encodedName={getEncodedName()}
          onBackToChat={() => onViewChange('chat')}
          onConversationSelect={handleConversationSelect}
        />
      ) : (
        <>
          {/* Zone 1: Token Bar - Fixed height */}
          <TokenContextBar />

          {/* Zone 2: Messages - Flex 1, scrollable */}
          <ChatMessages
            messages={messages}
            isLoading={isLoading}
            onSendMessage={sendMessage}
          />

          {/* Zone 3: Input - Fixed height */}
          <ChatInput
            input={input}
            isLoading={isLoading}
            currentRequestId={currentRequestId}
            onInputChange={setInput}
            onSubmit={() => sendMessage()}
            onAbort={handleAbort}
            onFileUpload={handleFileUpload}
            permissionMode={permissionMode}
            onPermissionModeChange={setPermissionMode}
            showPermissions={isPermissionMode}
            permissionData={permissionData}
            planPermissionData={planPermissionData}
          />
        </>
      )}
    </div>
  );
}
