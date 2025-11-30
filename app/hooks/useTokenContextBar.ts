import { useMemo } from 'react';
import type { AllMessage, TokenUsageMessage } from '../types';

export function useTokenContextBar(messages: AllMessage[]) {
  // Find the latest token usage message (similar to voice message pattern)
  const latestTokenData = useMemo(() => {
    const tokenMessages = messages.filter((m): m is TokenUsageMessage => m.type === 'token_usage');
    return tokenMessages.length > 0 ? tokenMessages[tokenMessages.length - 1].usage : null;
  }, [messages]);

  return {
    tokenUsage: latestTokenData
  };
}