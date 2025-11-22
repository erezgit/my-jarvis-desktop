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
  const [showDebug, setShowDebug] = useState(false); // Start hidden, toggle with button
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

      // Don't auto-show debug panel anymore - use button instead

      // Intercept console.log to capture comprehensive logs
      const originalLog = console.log;
      console.log = (...args) => {
        originalLog(...args);
        // Filter for relevant logs - expanded scope for mobile analysis
        const logStr = args.map(arg =>
          typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
        ).join(' ');

        if (logStr.includes('MCP_VOICE_DEBUG') ||
            logStr.includes('CACHE_TRACK') ||
            logStr.includes('PROCESS_TOOL_RESULT') ||
            logStr.includes('CHAT_STATE_DEBUG') ||
            logStr.includes('addMessage') ||
            logStr.includes('Voice message') ||
            logStr.includes('VOICE_DATA') ||
            logStr.includes('Messages updated') ||
            logStr.includes('tool_result') ||
            logStr.includes('setState') ||
            logStr.includes('render')) {
          const timestamp = new Date().toISOString().substring(11, 23); // HH:MM:SS.mmm
          setConsoleLogs(prev => [...prev.slice(-99), `${timestamp}: ${logStr}`]); // Keep last 100 logs
        }
      };

      // Cleanup
      return () => {
        console.log = originalLog;
      };
    }
  }, []);

  // VOICE TRACKING WITH UI FILTERING ANALYSIS
  useEffect(() => {
    setLocalRenderCount(c => c + 1);

    // Track voice messages with detailed UI analysis
    const voiceMessages = messages.filter(m => isVoiceMessage(m));
    console.log('[VOICE_COMPONENT_DEBUG] Voice count:', voiceMessages.length, 'Total:', messages.length);

    // CRITICAL: UI FILTER COMPARISON ANALYSIS
    const directTypeFilter = messages.filter(m => m.type === 'voice');
    console.log('[UI_COMPONENT_DEBUG] 🔍 UI Filter Analysis:', {
      totalMessages: messages.length,
      voiceByTypeGuard: voiceMessages.length,
      voiceByDirectType: directTypeFilter.length,
      filtersMatch: voiceMessages.length === directTypeFilter.length
    });

    // If there's a discrepancy, investigate immediately
    if (voiceMessages.length !== directTypeFilter.length) {
      console.log('[UI_COMPONENT_DEBUG] ❌ CRITICAL: Filter mismatch detected!');
      console.log('[UI_COMPONENT_DEBUG] Type guard result:', voiceMessages.map(vm => ({ type: vm.type, timestamp: vm.timestamp })));
      console.log('[UI_COMPONENT_DEBUG] Direct type result:', directTypeFilter.map(vm => ({ type: vm.type, timestamp: vm.timestamp })));
    }

    // Only log when voice messages are added to avoid render loops
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && isVoiceMessage(lastMessage) && !(lastMessage as any)._renderLogged) {
      console.log('[VOICE_DEBUG] ChatMessages render: Voice message added', {
        timestamp: lastMessage.timestamp,
        totalMessages: messages.length,
        uiFilterCount: directTypeFilter.length
      });
      (lastMessage as any)._renderLogged = true;
    }
  }, [messages.length, messages]);

  // Auto-scroll when messages change, with smart behavior detection
  useEffect(() => {
    const prevLength = prevMessagesLengthRef.current;
    const currentLength = messages.length;
    const messagesAdded = currentLength - prevLength;

    // Bulk load detection: more than 3 messages added at once = history load
    // Use instant scroll for history, smooth for streaming messages
    if (messagesAdded > 3) {
      setScrollBehavior('instant');
    } else if (messagesAdded > 0) {
      setScrollBehavior('smooth');
    }

    // Update ref for next comparison
    prevMessagesLengthRef.current = currentLength;

    // Trigger scroll
    handleNewMessage();
  }, [messages, handleNewMessage, setScrollBehavior]);

  const renderMessage = (message: AllMessage, index: number) => {
    // Use timestamp as key for stable rendering, fallback to index if needed
    const key = `${message.timestamp}-${index}`;

    // CRITICAL: Debug message rendering decisions
    if (message.type === 'voice') {
      console.log('[RENDER_DEBUG] Voice message render decision:', {
        messageType: message.type,
        index,
        key,
        mode: settings.messageDisplay.mode,
        isVoiceMessage: isVoiceMessage(message),
        messageKeys: Object.keys(message)
      });
    }

    // Switch based on interface mode
    if (settings.messageDisplay.mode === "jarvis") {
      // Jarvis mode: strict filtering - only show user messages, voice messages, and thinking messages
      if (isChatMessage(message) && message.role === "user") {
        return <ChatMessageComponent key={key} message={message} />;
      }
      if (isVoiceMessage(message)) {
        console.log('[RENDER_DEBUG] ✅ Rendering voice message in Jarvis mode:', { timestamp: message.timestamp, key });
        return <VoiceMessageComponentWrapper key={key} message={message} />;
      }
      if (isThinkingMessage(message)) {
        return <ThinkingMessageComponent key={key} message={message} />;
      }
      if (isFileOperationMessage(message)) {
        return <FileOperationMessageComponent key={key} message={message} />;
      }
      // Hide all technical messages including assistant chat responses
      if (message.type === 'voice') {
        console.log('[RENDER_DEBUG] ❌ Voice message NOT rendered in Jarvis mode - type guard failed!');
      }
      return null;
    } else if (settings.messageDisplay.mode === "developer") {
      // Developer mode: show everything for debugging
      return renderMessageComponent(message, key);
    }

    // Fallback: show everything (safety)
    return renderMessageComponent(message, key);
  };

  // Helper function for component rendering
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
      console.log('[RENDER_DEBUG] ✅ Rendering voice message in developer mode:', { timestamp: message.timestamp, key });
      return <VoiceMessageComponentWrapper key={key} message={message} />;
    } else if (isFileOperationMessage(message)) {
      return <FileOperationMessageComponent key={key} message={message} />;
    } else if (isChatMessage(message)) {
      return <ChatMessageComponent key={key} message={message} />;
    }
    console.log('[DEBUG] Unknown message type:', message.type);
    return null;
  };

  // Determine if we should show greeting
  // Only show when we're NOT checking for history, NOT loading history, AND have no messages
  const shouldShowGreeting = !isCheckingForHistory && !isLoadingHistory && messages.length === 0;

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-scroll bg-neutral-50 dark:bg-neutral-900 relative"
    >
      {/* Debug Toggle Button - Always visible in bottom left */}
      <button
        onClick={() => setShowDebug(!showDebug)}
        className="fixed bottom-4 left-4 z-50 bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg shadow-lg flex items-center gap-2 text-sm font-medium"
      >
        {showDebug ? '🔽 Hide Debug' : '🔍 Show Debug'}
      </button>

      {/* Debug Overlay - Full Height for Mobile Analysis */}
      {showDebug && (
        <div className="fixed top-0 left-0 right-0 bottom-0 z-50 bg-black bg-opacity-95 text-white p-4 overflow-y-auto">
          <div className="max-w-full">
            {/* Header with Close Button */}
            <div className="flex justify-between items-center mb-4 sticky top-0 bg-black bg-opacity-90 pb-2 border-b border-gray-600">
              <div className="font-bold text-yellow-400 text-lg">🔍 MOBILE DEBUG PANEL - FULL ANALYSIS</div>
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
                <div>Memory: <span className="text-orange-400">{typeof window !== 'undefined' && (window as any).performance?.memory ? `${Math.round((window as any).performance.memory.usedJSHeapSize / 1024 / 1024)}MB` : 'N/A'}</span></div>
              </div>
            </div>

            {/* Message Breakdown */}
            <div className="mb-4 p-3 bg-gray-800 rounded">
              <div className="font-bold text-green-400 mb-2">💬 Message Breakdown</div>
              <div className="text-xs space-y-1">
                {['chat', 'tool', 'tool_result', 'voice', 'system', 'thinking'].map(type => {
                  const count = messages.filter(m => m.type === type).length;

                  // CRITICAL UI FILTERING DEBUG - Focus on voice messages
                  if (type === 'voice') {
                    console.log('[UI_FILTER_DEBUG] ========================================');
                    console.log('[UI_FILTER_DEBUG] 🎯 VOICE MESSAGE UI FILTERING ANALYSIS');
                    console.log('[UI_FILTER_DEBUG] Total messages in array:', messages.length);
                    console.log('[UI_FILTER_DEBUG] Messages array preview:', messages.map(m => ({ type: m.type, timestamp: m.timestamp })));
                    console.log('[UI_FILTER_DEBUG] Voice filter result count:', count);

                    // Deep analysis of each message
                    const voiceMessages = messages.filter(m => m.type === type);
                    console.log('[UI_FILTER_DEBUG] Voice messages found by UI filter:', voiceMessages.length);
                    console.log('[UI_FILTER_DEBUG] Voice messages details:', voiceMessages.map(vm => ({
                      type: vm.type,
                      timestamp: vm.timestamp,
                      hasContent: !!(vm as any).content,
                      hasAudioUrl: !!(vm as any).audioUrl,
                      keys: Object.keys(vm)
                    })));

                    // Check if isVoiceMessage type guard works
                    const voiceByTypeGuard = messages.filter(m => isVoiceMessage(m));
                    console.log('[UI_FILTER_DEBUG] Voice messages by isVoiceMessage type guard:', voiceByTypeGuard.length);

                    // Compare direct type check vs type guard
                    console.log('[UI_FILTER_DEBUG] Direct type check count:', count);
                    console.log('[UI_FILTER_DEBUG] Type guard check count:', voiceByTypeGuard.length);
                    console.log('[UI_FILTER_DEBUG] Counts match:', count === voiceByTypeGuard.length);

                    // If counts don't match, find the discrepancy
                    if (count !== voiceByTypeGuard.length) {
                      console.log('[UI_FILTER_DEBUG] ❌ DISCREPANCY DETECTED! Investigating...');
                      messages.forEach((msg, idx) => {
                        const directCheck = msg.type === 'voice';
                        const typeGuardCheck = isVoiceMessage(msg);
                        if (directCheck !== typeGuardCheck) {
                          console.log('[UI_FILTER_DEBUG] Message[' + idx + '] discrepancy:', {
                            directCheck,
                            typeGuardCheck,
                            messageType: msg.type,
                            message: msg
                          });
                        }
                      });
                    }

                    console.log('[UI_FILTER_DEBUG] ========================================');
                  }

                  return (
                    <div key={type} className="flex justify-between">
                      <span className="capitalize">{type}:</span>
                      <span className={count > 0 ? 'text-green-400' : 'text-gray-500'}>{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Console Logs - Much Larger */}
            <div className="mb-4 p-3 bg-gray-800 rounded">
              <div className="flex justify-between items-center mb-2">
                <div className="font-bold text-green-400">📝 Console Logs ({consoleLogs.length}/100)</div>
                <button
                  onClick={() => setConsoleLogs([])}
                  className="bg-yellow-500 hover:bg-yellow-600 text-black px-2 py-1 rounded text-xs font-bold"
                >
                  Clear
                </button>
              </div>
              <div className="space-y-1 text-[9px] max-h-96 overflow-y-auto border border-gray-600 p-2 bg-black rounded">
                {consoleLogs.length > 0 ? (
                  consoleLogs.map((log, i) => (
                    <div key={i} className="border-b border-gray-700 pb-1 break-all">
                      <span className="text-gray-500">[{i}]</span> {log}
                    </div>
                  ))
                ) : (
                  <div className="text-gray-400">No logs captured yet... Send a voice message to see logs.</div>
                )}
              </div>
            </div>

            {/* Performance Monitoring */}
            <div className="mb-4 p-3 bg-gray-800 rounded">
              <div className="font-bold text-orange-400 mb-2">⚡ Performance Monitor</div>
              <div className="text-xs space-y-1">
                <div>Timestamp: <span className="text-cyan-400">{new Date().toISOString()}</span></div>
                <div>User Agent: <span className="text-purple-400">{typeof window !== 'undefined' ? navigator.userAgent.substring(0, 50) + '...' : 'N/A'}</span></div>
                <div>Connection: <span className="text-yellow-400">{typeof window !== 'undefined' && (navigator as any).connection ? (navigator as any).connection.effectiveType : 'N/A'}</span></div>
                <div>Online: <span className={typeof window !== 'undefined' && navigator.onLine ? 'text-green-400' : 'text-red-400'}>{typeof window !== 'undefined' ? (navigator.onLine ? 'YES' : 'NO') : 'N/A'}</span></div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <button
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.location.reload();
                  }
                }}
                className="bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded font-bold"
              >
                🔄 Refresh
              </button>
              <button
                onClick={() => {
                  if (chatContext?.forceUpdate) {
                    chatContext.forceUpdate();
                  }
                }}
                className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded font-bold"
              >
                ⚡ Force Update
              </button>
              <button
                onClick={() => {
                  if (typeof window !== 'undefined' && navigator.clipboard) {
                    // Compile comprehensive debug report
                    const debugReport = `
=== MOBILE DEBUG REPORT ===
Timestamp: ${new Date().toISOString()}

=== SYSTEM INFO ===
Messages: ${messages.length}
Loading: ${isLoading ? 'YES' : 'NO'}
Voice Messages: ${messages.filter(m => isVoiceMessage(m)).length}
Component Renders: ${localRenderCount}
Mobile: ${isMobile ? 'YES' : 'NO'}
Touch: ${isTouch ? 'YES' : 'NO'}
Screen Width: ${windowWidth}px
Memory Usage: ${typeof window !== 'undefined' && (window as any).performance?.memory ? Math.round((window as any).performance.memory.usedJSHeapSize / 1024 / 1024) + 'MB' : 'N/A'}

=== MESSAGE BREAKDOWN ===
${['chat', 'tool', 'tool_result', 'voice', 'system', 'thinking'].map(type => {
  const count = messages.filter(m => m.type === type).length;
  return `${type.charAt(0).toUpperCase() + type.slice(1)}: ${count}`;
}).join('\n')}

=== PERFORMANCE INFO ===
User Agent: ${navigator.userAgent}
Connection: ${(navigator as any).connection ? (navigator as any).connection.effectiveType : 'N/A'}
Online: ${navigator.onLine ? 'YES' : 'NO'}
Memory Details: ${(window as any).performance?.memory ? JSON.stringify((window as any).performance.memory, null, 2) : 'N/A'}

=== CONSOLE LOGS (${consoleLogs.length}/100) ===
${consoleLogs.length > 0 ? consoleLogs.join('\n') : 'No logs captured yet'}

=== END REPORT ===
`;

                    navigator.clipboard.writeText(debugReport).then(() => {
                      alert('Debug report copied to clipboard!');
                    }).catch(err => {
                      console.error('Failed to copy debug report:', err);
                      alert('Failed to copy debug report. Check console for details.');
                    });
                  } else {
                    alert('Clipboard API not available');
                  }
                }}
                className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-2 rounded font-bold"
              >
                📋 Copy All
              </button>
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
            {/* NO SPACER DIV - messages start at top, flex-1 on parent handles scrolling */}
            {messages.map(renderMessage)}
            {isLoading && <LoadingComponent />}
            <div ref={endRef} className="shrink-0 min-h-[24px]" />
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
