import { ReactNode } from 'react';
import { ChatStateContext } from './ChatStateContext';
import { useChatState } from '../hooks/chat/useChatState';

interface ChatStateProviderProps {
  children: ReactNode;
}

/**
 * ChatStateProvider - Single source of truth for chat state
 *
 * This provider wraps the entire application and manages the one and only
 * useChatState instance. All components access chat state through this context,
 * enabling AI-controlled UI features without prop drilling.
 *
 * Architecture:
 * - Single useChatState instance at top level
 * - All components read from same messages array via useContext
 * - When ChatPage adds FileOperationMessage, all components see it
 * - Zero prop drilling, infinite scalability for AI features
 */
export function ChatStateProvider({ children }: ChatStateProviderProps) {
  // This is the SINGLE instance of useChatState for the entire app
  // All components will share this state through context
  const chatState = useChatState({});

  return (
    <ChatStateContext.Provider value={chatState}>
      {children}
    </ChatStateContext.Provider>
  );
}
