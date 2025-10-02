import { ResponsiveLayout } from "./components/Layout/ResponsiveLayout";
import { SettingsProvider } from "./contexts/SettingsContext";
import { ChatStateProvider } from "./contexts/ChatStateProvider";
import { TokenUsageProvider } from "./contexts/TokenUsageContext";

function App() {
  return (
    <SettingsProvider>
      <ChatStateProvider>
        <TokenUsageProvider>
          {/* Three-panel responsive layout with chat, file tree, and preview */}
          <ResponsiveLayout />
        </TokenUsageProvider>
      </ChatStateProvider>
    </SettingsProvider>
  );
}

export default App;
