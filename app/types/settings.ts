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
  workingDirectory: string; // For Claude Code execution - always /workspace
  fileTreeDirectory: string; // For file tree display - can be /workspace or /workspace/my-jarvis
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
  workingDirectory: string; // Claude Code working directory
  fileTreeDirectory: string; // File tree display directory
  isTerminalOpen: boolean;
  toggleTheme: () => void;
  toggleEnterBehavior: () => void;
  setWorkingDirectory: (path: string) => void;
  setFileTreeDirectory: (path: string) => void;
  updateSettings: (updates: Partial<AppSettings>) => void;
  toggleTerminal: () => void;
}

// Get default Claude working directory - always /workspace for consistent execution
function getDefaultClaudeWorkspace(): string {
  // Claude Code always runs in /workspace for consistent behavior
  return '/workspace';
}

// Get default file tree directory - can be customized by user
function getDefaultFileTreeDirectory(): string {
  // File tree can default to my-jarvis subdirectory for user convenience
  return import.meta.env.VITE_WORKING_DIRECTORY || '/workspace/my-jarvis';
}

// Default settings
export const DEFAULT_SETTINGS: AppSettings = {
  theme: "light",
  enterBehavior: "send",
  messageDisplay: {
    mode: "jarvis"  // Default to consumer experience
  },
  workingDirectory: getDefaultClaudeWorkspace(), // Claude Code always in /workspace
  fileTreeDirectory: getDefaultFileTreeDirectory(), // File tree can show my-jarvis
  version: 5,  // Increment for migration
};

// Current settings version for migration
export const CURRENT_SETTINGS_VERSION = 5;
