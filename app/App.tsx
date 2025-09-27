import { ResponsiveLayout } from "./components/Layout/ResponsiveLayout";
import { SettingsProvider } from "./contexts/SettingsContext";

function App() {
  return (
    <SettingsProvider>
      {/* Three-panel responsive layout with chat, file tree, and preview */}
      <ResponsiveLayout />
    </SettingsProvider>
  );
}

export default App;
