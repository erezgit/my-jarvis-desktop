import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { ResponsiveLayout } from "./components/Layout/ResponsiveLayout";
import { SettingsProvider } from "./contexts/SettingsContext";
import { ChatStateProvider } from "./contexts/ChatStateProvider";
import { TokenUsageProvider } from "./contexts/TokenUsageContext";
import { MessageProcessorProvider } from "./contexts/MessageProcessorContext";
import { TerminalOverlay } from "./components/TerminalOverlay";
import { useEffect } from "react";

// Create QueryClient instance (singleton for the app)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes - data considered fresh
      gcTime: 30 * 60 * 1000, // 30 minutes - cache retention (formerly cacheTime)
      refetchOnWindowFocus: false, // Desktop app doesn't need this
      retry: 2, // Retry failed queries twice
    },
  },
})

function App() {
  // Override window.matchMedia to always return light mode
  useEffect(() => {
    const originalMatchMedia = window.matchMedia;

    window.matchMedia = function(query: string) {
      // Check if this is a color scheme query
      if (query.includes('prefers-color-scheme')) {
        if (query.includes('dark')) {
          // Always return false for dark mode queries
          return {
            matches: false,
            media: query,
            onchange: null,
            addEventListener: () => {},
            removeEventListener: () => {},
            addListener: () => {},
            removeListener: () => {},
            dispatchEvent: () => true
          } as MediaQueryList;
        } else if (query.includes('light')) {
          // Always return true for light mode queries
          return {
            matches: true,
            media: query,
            onchange: null,
            addEventListener: () => {},
            removeEventListener: () => {},
            addListener: () => {},
            removeListener: () => {},
            dispatchEvent: () => true
          } as MediaQueryList;
        }
      }

      // For non-color-scheme queries, use the original function
      return originalMatchMedia.call(window, query);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <MessageProcessorProvider>
        <SettingsProvider>
          <ChatStateProvider>
            <TokenUsageProvider>
              {/* Three-panel responsive layout with chat, file tree, and preview */}
              <ResponsiveLayout />

              {/* Terminal overlay - appears on top when toggled from settings */}
              <TerminalOverlay />
            </TokenUsageProvider>
          </ChatStateProvider>
        </SettingsProvider>
      </MessageProcessorProvider>

      {/* DevTools - only in development */}
      {import.meta.env.DEV && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}

export default App;
