import { useEffect } from "react";
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

interface ChatMessagesProps {
  messages: AllMessage[];
  isLoading: boolean;
  onSendMessage?: (message: string) => void;
}

export function ChatMessages({ messages, isLoading, onSendMessage }: ChatMessagesProps) {
  const { settings } = useSettings();
  const { containerRef, endRef, handleNewMessage } = useScrollToBottom();

  // Auto-scroll when messages change, respecting user's scroll position
  useEffect(() => {
    handleNewMessage();
  }, [messages, handleNewMessage]);

  const renderMessage = (message: AllMessage, index: number) => {
    // Use timestamp as key for stable rendering, fallback to index if needed
    const key = `${message.timestamp}-${index}`;

    // Switch based on interface mode
    if (settings.messageDisplay.mode === "jarvis") {
      // Jarvis mode: strict filtering - only show user messages, voice messages, and thinking messages
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
      // Hide all technical messages including assistant chat responses
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
      return <VoiceMessageComponentWrapper key={key} message={message} />;
    } else if (isFileOperationMessage(message)) {
      return <FileOperationMessageComponent key={key} message={message} />;
    } else if (isChatMessage(message)) {
      return <ChatMessageComponent key={key} message={message} />;
    }
    return null;
  };

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-scroll bg-neutral-50 dark:bg-neutral-900"
    >
      <div className="flex flex-col py-1 sm:py-4">
        {messages.length === 0 ? (
          <Greeting onSendMessage={onSendMessage} />
        ) : (
          <>
            {/* NO SPACER DIV - messages start at top, flex-1 on parent handles scrolling */}
            {messages.map(renderMessage)}
            {isLoading && <LoadingComponent />}
            <div ref={endRef} className="shrink-0 min-h-[24px]" />
          </>
        )}
      </div>
    </div>
  );
}
