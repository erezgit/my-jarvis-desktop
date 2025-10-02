import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface TokenUsageData {
  tokens_used: number;
  max_tokens: number;
  percentage: number;
}

interface TokenUsageContextType {
  tokenData: TokenUsageData;
  updateTokenUsage: (newTokens: number) => void;
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

  const resetTokenUsage = useCallback(() => {
    setTokenData({ tokens_used: 0, max_tokens: 200000, percentage: 0 });
  }, []);

  return (
    <TokenUsageContext.Provider value={{ tokenData, updateTokenUsage, resetTokenUsage }}>
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
