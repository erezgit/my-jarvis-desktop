import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { AllMessage } from "../../types";
import {
  isChatMessage,
  isSystemMessage,
  isToolMessage,
  isToolResultMessage,
  isPlanMessage,
  isThinkingMessage,
  isTodoMessage,
  isVoiceMessage,
  isFileOperationMessage,
} from "../../types";
import {
  ChatMessageComponent,
  SystemMessageComponent,
  ToolMessageComponent,
  ToolResultMessageComponent,
  PlanMessageComponent,
  ThinkingMessageComponent,
  TodoMessageComponent,
  VoiceMessageComponentWrapper,
  FileOperationMessageComponent,
  LoadingComponent,
} from "../MessageComponents";
import { useSettings } from "../../hooks/useSettings";
import { Greeting } from "../Greeting";
import { useScrollToBottom } from "../../hooks/useScrollToBottom";
import { useChatStateContext } from "../../contexts/ChatStateContext";

interface ChatMessagesProps {
  messages: AllMessage[];
  isLoading: boolean;
  isLoadingHistory?: boolean;
  isCheckingForHistory?: boolean;
  onSendMessage?: (message: string) => void;
}

export function ChatMessages({ messages, isLoading, isLoadingHistory, isCheckingForHistory, onSendMessage }: ChatMessagesProps) {
  const { settings } = useSettings();
  const { containerRef, endRef, handleNewMessage, setScrollBehavior } = useScrollToBottom();
  const prevMessagesLengthRef = useRef(0);

  // Get debug info from context
  const chatContext = useChatStateContext();
  const [localRenderCount, setLocalRenderCount] = useState(0);
  const [showDebug, setShowDebug] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isTouch, setIsTouch] = useState(false);
  const [windowWidth, setWindowWidth] = useState(0);
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);

  // Initialize browser-specific values after mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const touch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const width = window.innerWidth;

      setIsMobile(mobile);
      setIsTouch(touch);
      setWindowWidth(width);

      // Intercept console.log to capture ALL debug logs
      const originalLog = console.log;
      const originalWarn = console.warn;
      const originalError = console.error;

      console.log = (...args) => {
        originalLog(...args);
        const logStr = args.map(arg =>
          typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
        ).join(' ');

        // Capture ALL debug logs, not just voice-specific ones
        if (logStr.includes('DEBUG') || logStr.includes('MCP') || logStr.includes('VOICE') ||
            logStr.includes('addMessage') || logStr.includes('setState') || logStr.includes('render')) {
          const timestamp = new Date().toISOString().substring(11, 23);
          setConsoleLogs(prev => [...prev.slice(-199), `[LOG] ${timestamp}: ${logStr}`]);
        }
      };

      console.warn = (...args) => {
        originalWarn(...args);
        const logStr = args.map(arg =>
          typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
        ).join(' ');
        const timestamp = new Date().toISOString().substring(11, 23);
        setConsoleLogs(prev => [...prev.slice(-199), `[WARN] ${timestamp}: ${logStr}`]);
      };

      console.error = (...args) => {
        originalError(...args);
        const logStr = args.map(arg =>
          typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
        ).join(' ');
        const timestamp = new Date().toISOString().substring(11, 23);
        setConsoleLogs(prev => [...prev.slice(-199), `[ERROR] ${timestamp}: ${logStr}`]);
      };

      return () => {
        console.log = originalLog;
        console.warn = originalWarn;
        console.error = originalError;
      };
    }
  }, []);

  // MINIMAL VOICE TRACKING - NO RENDER LOOPS
  useEffect(() => {
    setLocalRenderCount(c => c + 1);

    // Only log when voice messages are added to avoid render loops
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && isVoiceMessage(lastMessage) && !(lastMessage as any)._renderLogged) {
      console.log('[VOICE_DEBUG] ChatMessages render: Voice message added', {
        timestamp: lastMessage.timestamp,
        totalMessages: messages.length
      });
      (lastMessage as any)._renderLogged = true;
    }
  }, [messages.length, messages]);

  // Auto-scroll when messages change
  useEffect(() => {
    const prevLength = prevMessagesLengthRef.current;
    const currentLength = messages.length;
    const messagesAdded = currentLength - prevLength;

    if (messagesAdded > 3) {
      setScrollBehavior('instant');
    } else if (messagesAdded > 0) {
      setScrollBehavior('smooth');
    }

    prevMessagesLengthRef.current = currentLength;
    handleNewMessage();
  }, [messages, handleNewMessage, setScrollBehavior]);

  const renderMessage = (message: AllMessage, index: number) => {
    const key = `${message.timestamp}-${index}`;

    if (settings.messageDisplay.mode === "jarvis") {
      if (isChatMessage(message) && message.role === "user") {
        return <ChatMessageComponent key={key} message={message} />;
      }
      if (isVoiceMessage(message)) {
        return <VoiceMessageComponentWrapper key={key} message={message} />;
      }
      if (isThinkingMessage(message)) {
        return <ThinkingMessageComponent key={key} message={message} />;
      }
      if (isFileOperationMessage(message)) {
        return <FileOperationMessageComponent key={key} message={message} />;
      }
      return null;
    } else if (settings.messageDisplay.mode === "developer") {
      return renderMessageComponent(message, key);
    }

    return renderMessageComponent(message, key);
  };

  const renderMessageComponent = (message: AllMessage, key: string) => {
    if (isSystemMessage(message)) {
      return <SystemMessageComponent key={key} message={message} />;
    } else if (isToolMessage(message)) {
      return <ToolMessageComponent key={key} message={message} />;
    } else if (isToolResultMessage(message)) {
      return <ToolResultMessageComponent key={key} message={message} />;
    } else if (isPlanMessage(message)) {
      return <PlanMessageComponent key={key} message={message} />;
    } else if (isThinkingMessage(message)) {
      return <ThinkingMessageComponent key={key} message={message} />;
    } else if (isTodoMessage(message)) {
      return <TodoMessageComponent key={key} message={message} />;
    } else if (isVoiceMessage(message)) {
      return <VoiceMessageComponentWrapper key={key} message={message} />;
    } else if (isFileOperationMessage(message)) {
      return <FileOperationMessageComponent key={key} message={message} />;
    } else if (isChatMessage(message)) {
      return <ChatMessageComponent key={key} message={message} />;
    }
    console.log('[DEBUG] Unknown message type:', message.type);
    return null;
  };

  const shouldShowGreeting = !isCheckingForHistory && !isLoadingHistory && messages.length === 0;

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-scroll bg-neutral-50 dark:bg-neutral-900 relative"
    >
      {/* Debug Toggle Button */}
      <button
        onClick={() => setShowDebug(!showDebug)}
        className="fixed bottom-4 left-4 z-50 bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg shadow-lg flex items-center gap-2 text-sm font-medium"
      >
        {showDebug ? '🔽 Hide Debug' : '🔍 Show Debug'}
      </button>

      {/* Debug Overlay - SIMPLIFIED */}
      {showDebug && (
        <div className="fixed top-0 left-0 right-0 bottom-0 z-50 bg-black bg-opacity-95 text-white p-4 overflow-y-auto">
          <div className="max-w-full">
            <div className="flex justify-between items-center mb-4 sticky top-0 bg-black bg-opacity-90 pb-2 border-b border-gray-600">
              <div className="font-bold text-yellow-400 text-lg">🔍 MOBILE DEBUG PANEL</div>
              <button
                onClick={() => setShowDebug(false)}
                className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
              >
                ✕ Close
              </button>
            </div>

            {/* System Info */}
            <div className="mb-4 p-3 bg-gray-800 rounded">
              <div className="font-bold text-blue-400 mb-2">📱 System Info</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>Messages: <span className="text-green-400">{messages.length}</span></div>
                <div>Loading: <span className={isLoading ? 'text-red-400' : 'text-green-400'}>{isLoading ? 'YES' : 'NO'}</span></div>
                <div>Voice (guard): <span className="text-purple-400">{messages.filter(m => isVoiceMessage(m)).length}</span></div>
                <div>Voice (direct): <span className="text-cyan-400">{messages.filter(m => m.type === 'voice').length}</span></div>
                <div>Renders: <span className="text-yellow-400">{localRenderCount}</span></div>
                <div>Mobile: <span className={isMobile ? 'text-red-400' : 'text-green-400'}>{isMobile ? 'YES' : 'NO'}</span></div>
                <div>Touch: <span className={isTouch ? 'text-red-400' : 'text-green-400'}>{isTouch ? 'YES' : 'NO'}</span></div>
                <div>Width: <span className="text-cyan-400">{windowWidth}px</span></div>
              </div>
            </div>

            {/* Message Breakdown - NO LOGS */}
            <div className="mb-4 p-3 bg-gray-800 rounded">
              <div className="font-bold text-green-400 mb-2">💬 Message Breakdown</div>
              <div className="text-xs space-y-1">
                {['chat', 'tool', 'tool_result', 'voice', 'system', 'thinking'].map(type => {
                  const count = messages.filter(m => m.type === type).length;
                  return (
                    <div key={type} className="flex justify-between">
                      <span className="capitalize">{type}:</span>
                      <span className={count > 0 ? 'text-green-400' : 'text-gray-500'}>{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Console Logs */}
            <div className="mb-4 p-3 bg-gray-800 rounded">
              <div className="flex justify-between items-center mb-2">
                <div className="font-bold text-green-400">📝 All Debug Logs ({consoleLogs.length}/200)</div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const logText = consoleLogs.join('\n');
                      navigator.clipboard.writeText(logText).then(() => {
                        alert('Logs copied to clipboard!');
                      }).catch(() => {
                        // Fallback for mobile
                        const textArea = document.createElement('textarea');
                        textArea.value = logText;
                        document.body.appendChild(textArea);
                        textArea.select();
                        document.execCommand('copy');
                        document.body.removeChild(textArea);
                        alert('Logs copied to clipboard!');
                      });
                    }}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs font-bold"
                  >
                    📋 Copy
                  </button>
                  <button
                    onClick={() => setConsoleLogs([])}
                    className="bg-yellow-500 hover:bg-yellow-600 text-black px-2 py-1 rounded text-xs font-bold"
                  >
                    Clear
                  </button>
                </div>
              </div>
              <div className="space-y-1 text-[9px] max-h-96 overflow-y-auto border border-gray-600 p-2 bg-black rounded">
                {consoleLogs.length > 0 ? (
                  consoleLogs.map((log, i) => (
                    <div key={i} className="border-b border-gray-700 pb-1 break-all">
                      <span className="text-gray-500">[{i}]</span> {log}
                    </div>
                  ))
                ) : (
                  <div className="text-gray-400">No debug logs captured yet...</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col py-1 sm:py-4">
        {shouldShowGreeting ? (
          <Greeting onSendMessage={onSendMessage} />
        ) : messages.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {messages.map(renderMessage)}
            {isLoading && <LoadingComponent />}
            <div ref={endRef} className="shrink-0 min-h-[24px]" />
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}