import { ResponsiveLayout } from "./components/Layout/ResponsiveLayout";
import { SettingsProvider } from "./contexts/SettingsContext";
import { ChatStateProvider } from "./contexts/ChatStateProvider";
import { TokenUsageProvider } from "./contexts/TokenUsageContext";
import { TerminalOverlay } from "./components/TerminalOverlay";

function App() {
  return (
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
  );
}

export default App;
