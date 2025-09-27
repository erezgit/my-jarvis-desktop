import { ChatPage } from "./components/ChatPage";
import { SettingsProvider } from "./contexts/SettingsContext";

function App() {
  return (
    <SettingsProvider>
      {/* Direct to ChatPage - no project selection for Electron app */}
      <ChatPage />
    </SettingsProvider>
  );
}

export default App;
