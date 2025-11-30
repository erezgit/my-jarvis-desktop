import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface TokenUsageData {
  tokens_used: number;
  max_tokens: number;
  percentage: number;
  inputTokens?: number;
  outputTokens?: number;
  cacheCreationTokens?: number;
  cacheReadTokens?: number;
  currentContextSize?: number;
}

interface TokenUsageContextType {
  tokenData: TokenUsageData;
  updateTokenUsage: (newTokens: number) => void;
  setTokenUsage: (totalTokens: number | TokenUsageData) => void;
  resetTokenUsage: () => void;
}

const TokenUsageContext = createContext<TokenUsageContextType | undefined>(undefined);

interface TokenUsageProviderProps {
  children: ReactNode;
}

export function TokenUsageProvider({ children }: TokenUsageProviderProps) {
  const [tokenData, setTokenData] = useState<TokenUsageData>({
    tokens_used: 0,
    max_tokens: 200000, // Claude Code SDK default
    percentage: 0
  });

  const updateTokenUsage = useCallback((newTokens: number) => {
    console.log('[TOKEN_CONTEXT] updateTokenUsage called with newTokens:', newTokens);
    setTokenData(prev => {
      const tokens_used = prev.tokens_used + newTokens;
      const percentage = (tokens_used / prev.max_tokens) * 100;
      console.log('[TOKEN_CONTEXT] Updating state - prev:', prev.tokens_used, 'new total:', tokens_used, 'percentage:', percentage);
      return { ...prev, tokens_used, percentage };
    });
  }, []);

  const setTokenUsage = useCallback((totalTokens: number | TokenUsageData) => {
    if (typeof totalTokens === 'number') {
      console.log('[TOKEN_CONTEXT] setTokenUsage called with totalTokens:', totalTokens);
      setTokenData(prev => {
        const percentage = (totalTokens / prev.max_tokens) * 100;
        console.log('[TOKEN_CONTEXT] Setting state - new total:', totalTokens, 'percentage:', percentage);
        return { ...prev, tokens_used: totalTokens, percentage };
      });
    } else {
      // New detailed token data from backend
      console.log('[TOKEN_CONTEXT] setTokenUsage called with detailed data:', totalTokens);
      setTokenData(prev => {
        const tokens_used = totalTokens.currentContextSize || totalTokens.tokens_used || 0;
        const percentage = totalTokens.percentage || (tokens_used / prev.max_tokens) * 100;
        return {
          ...prev,
          ...totalTokens,
          tokens_used,
          percentage
        };
      });
    }
  }, []);

  const resetTokenUsage = useCallback(() => {
    setTokenData({ tokens_used: 0, max_tokens: 200000, percentage: 0 });
  }, []);

  return (
    <TokenUsageContext.Provider value={{ tokenData, updateTokenUsage, setTokenUsage, resetTokenUsage }}>
      {children}
    </TokenUsageContext.Provider>
  );
}

export function useTokenUsage() {
  const context = useContext(TokenUsageContext);
  if (context === undefined) {
    throw new Error('useTokenUsage must be used within a TokenUsageProvider');
  }
  return context;
}
