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
  toggleTheme: () => void;
  toggleEnterBehavior: () => void;
  updateSettings: (updates: Partial<AppSettings>) => void;
}

// Default settings
export const DEFAULT_SETTINGS: AppSettings = {
  theme: "light",
  enterBehavior: "send",
  messageDisplay: {
    mode: "jarvis"  // Default to consumer experience
  },
  version: 3,  // Increment for migration
};

// Current settings version for migration
export const CURRENT_SETTINGS_VERSION = 3;
