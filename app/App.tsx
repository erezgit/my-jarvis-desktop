import { ResponsiveLayout } from "./components/Layout/ResponsiveLayout";
import { SettingsProvider } from "./contexts/SettingsContext";
import { ChatStateProvider } from "./contexts/ChatStateProvider";

function App() {
  return (
    <SettingsProvider>
      <ChatStateProvider>
        {/* Three-panel responsive layout with chat, file tree, and preview */}
        <ResponsiveLayout />
      </ChatStateProvider>
    </SettingsProvider>
  );
}

export default App;
