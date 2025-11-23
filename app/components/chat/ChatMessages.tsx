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