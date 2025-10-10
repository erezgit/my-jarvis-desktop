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
function getDefaultWorkspace(): string {
  // In Electron, we have access to Node.js APIs
  if (typeof window !== 'undefined' && (window as any).electron) {
    // Use Electron's API to get user home directory
    const os = require('os');
    const path = require('path');
    return path.join(os.homedir(), 'Documents', 'MyJarvis');
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
