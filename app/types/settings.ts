export type Theme = "light" | "dark";
export type EnterBehavior = "send" | "newline";
export type InterfaceMode = "jarvis" | "developer";

export interface MessageDisplaySettings {
  mode: InterfaceMode;
}

export interface AppSettings {
  theme: Theme;
  enterBehavior: EnterBehavior;
  messageDisplay: MessageDisplaySettings;
  workingDirectory: string;
  version: number;
}

export interface LegacySettings {
  theme?: Theme;
  enterBehavior?: EnterBehavior;
}

export interface SettingsContextType {
  settings: AppSettings;
  theme: Theme;
  enterBehavior: EnterBehavior;
  workingDirectory: string;
  toggleTheme: () => void;
  toggleEnterBehavior: () => void;
  setWorkingDirectory: (path: string) => void;
  updateSettings: (updates: Partial<AppSettings>) => void;
}

// Get default workspace path dynamically based on user's home directory
// Note: This function is synchronous but may return a fallback in Electron mode
// The actual home directory will be set asynchronously when settings load
function getDefaultWorkspace(): string {
  // In Electron, use a placeholder that will be replaced by actual home dir
  if (typeof window !== 'undefined' && (window as any).electron) {
    // Return fallback - will be updated asynchronously via fileAPI.getHomeDir()
    return '~/Documents/MyJarvis';
  }

  // For web mode (Docker), default to /workspace/my-jarvis
  return import.meta.env.VITE_WORKING_DIRECTORY || '/workspace/my-jarvis';
}

// Default settings
export const DEFAULT_SETTINGS: AppSettings = {
  theme: "light",
  enterBehavior: "send",
  messageDisplay: {
    mode: "jarvis"  // Default to consumer experience
  },
  workingDirectory: getDefaultWorkspace(),
  version: 4,  // Increment for migration
};

// Current settings version for migration
export const CURRENT_SETTINGS_VERSION = 4;
