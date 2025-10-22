import type { AppSettings, Theme, EnterBehavior, MessageDisplaySettings } from "../types/settings";
import { CURRENT_SETTINGS_VERSION, DEFAULT_SETTINGS } from "../types/settings";
import { isElectronMode } from '@/app/config/deployment';

export const STORAGE_KEYS = {
  // Unified settings key
  SETTINGS: "claude-code-webui-settings",
  // Legacy keys for migration
  THEME: "claude-code-webui-theme",
  ENTER_BEHAVIOR: "claude-code-webui-enter-behavior",
  PERMISSION_MODE: "claude-code-webui-permission-mode",
} as const;

// Type-safe storage utilities
export function getStorageItem<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

export function setStorageItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Silently fail if localStorage is not available
  }
}

export function removeStorageItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Silently fail if localStorage is not available
  }
}

// Settings-specific utilities
export function getSettings(): AppSettings {
  // Try to load unified settings first
  const unifiedSettings = getStorageItem<AppSettings | null>(
    STORAGE_KEYS.SETTINGS,
    null,
  );

  if (unifiedSettings && unifiedSettings.version === CURRENT_SETTINGS_VERSION) {
    return unifiedSettings;
  }

  // If we have unified settings but outdated version, migrate
  if (unifiedSettings && unifiedSettings.version < CURRENT_SETTINGS_VERSION) {
    return migrateSettings(unifiedSettings);
  }

  // If no unified settings, migrate from legacy format
  return migrateLegacySettings();
}

export function setSettings(settings: AppSettings): void {
  setStorageItem(STORAGE_KEYS.SETTINGS, settings);
}

function migrateSettings(oldSettings: Partial<AppSettings>): AppSettings {
  // Migrate from version 1 to version 2 (add messageDisplay)
  if (oldSettings.version === 1) {
    const migratedSettings: AppSettings = {
      theme: oldSettings.theme || DEFAULT_SETTINGS.theme,
      enterBehavior: oldSettings.enterBehavior || DEFAULT_SETTINGS.enterBehavior,
      messageDisplay: DEFAULT_SETTINGS.messageDisplay, // Add new field
      version: CURRENT_SETTINGS_VERSION,
    };

    // Save migrated settings
    setSettings(migratedSettings);
    return migratedSettings;
  }

  // Migrate from version 2 to version 3 (convert boolean flags to single mode)
  if (oldSettings.version === 2) {
    // Cast to access old boolean properties
    const oldMessageDisplay = oldSettings.messageDisplay as any;

    // Determine mode based on old boolean flags
    let mode: "jarvis" | "developer" = "jarvis"; // Default to jarvis

    if (oldMessageDisplay) {
      // If developerMode was true, use developer mode
      if (oldMessageDisplay.developerMode === true) {
        mode = "developer";
      }
      // If jarvisMode was explicitly true, use jarvis mode
      else if (oldMessageDisplay.jarvisMode === true) {
        mode = "jarvis";
      }
    }

    const migratedSettings: AppSettings = {
      theme: oldSettings.theme || DEFAULT_SETTINGS.theme,
      enterBehavior: oldSettings.enterBehavior || DEFAULT_SETTINGS.enterBehavior,
      messageDisplay: { mode },
      workingDirectory: oldSettings.workingDirectory || DEFAULT_SETTINGS.workingDirectory,
      version: CURRENT_SETTINGS_VERSION,
    };

    // Save migrated settings
    setSettings(migratedSettings);
    return migratedSettings;
  }

  // Migrate from version 3 to version 4 (add workingDirectory)
  if (oldSettings.version === 3) {
    const migratedSettings: AppSettings = {
      theme: oldSettings.theme || DEFAULT_SETTINGS.theme,
      enterBehavior: oldSettings.enterBehavior || DEFAULT_SETTINGS.enterBehavior,
      messageDisplay: oldSettings.messageDisplay || DEFAULT_SETTINGS.messageDisplay,
      workingDirectory: oldSettings.workingDirectory || DEFAULT_SETTINGS.workingDirectory,
      fileTreeDirectory: DEFAULT_SETTINGS.fileTreeDirectory, // Add new field
      version: CURRENT_SETTINGS_VERSION,
    };

    // Save migrated settings
    setSettings(migratedSettings);
    return migratedSettings;
  }

  // Migrate from version 4 to version 5 (separate fileTreeDirectory)
  if (oldSettings.version === 4) {
    const migratedSettings: AppSettings = {
      theme: oldSettings.theme || DEFAULT_SETTINGS.theme,
      enterBehavior: oldSettings.enterBehavior || DEFAULT_SETTINGS.enterBehavior,
      messageDisplay: oldSettings.messageDisplay || DEFAULT_SETTINGS.messageDisplay,
      workingDirectory: '/workspace', // Claude Code always uses /workspace
      fileTreeDirectory: oldSettings.workingDirectory || DEFAULT_SETTINGS.fileTreeDirectory, // Preserve user's directory choice for file tree
      version: CURRENT_SETTINGS_VERSION,
    };

    // Save migrated settings
    setSettings(migratedSettings);
    return migratedSettings;
  }

  // For any other version, fall back to defaults
  const migratedSettings = { ...DEFAULT_SETTINGS };
  setSettings(migratedSettings);
  return migratedSettings;
}

function migrateLegacySettings(): AppSettings {
  // Get system theme preference
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const systemDefaultTheme: Theme = prefersDark ? "dark" : "light";

  // Load legacy settings
  const legacyTheme = getStorageItem<Theme>(
    STORAGE_KEYS.THEME,
    systemDefaultTheme,
  );
  const legacyEnterBehavior = getStorageItem<EnterBehavior>(
    STORAGE_KEYS.ENTER_BEHAVIOR,
    "send",
  );

  // Get default workspace path dynamically
  let defaultWorkspace = DEFAULT_SETTINGS.workingDirectory;

  // For Electron apps, ensure we use the user's home directory
  if (isElectronMode()) {
    try {
      const os = require('os');
      const path = require('path');
      defaultWorkspace = path.join(os.homedir(), 'Documents', 'MyJarvis');
    } catch (error) {
      console.error('Failed to get home directory:', error);
    }
  }

  // Create migrated settings with new messageDisplay field
  const migratedSettings: AppSettings = {
    theme: legacyTheme,
    enterBehavior: legacyEnterBehavior,
    messageDisplay: DEFAULT_SETTINGS.messageDisplay, // Add new field
    workingDirectory: DEFAULT_SETTINGS.workingDirectory, // Claude Code always uses /workspace
    fileTreeDirectory: defaultWorkspace, // File tree can use user's preference
    version: CURRENT_SETTINGS_VERSION,
  };

  // Save migrated settings
  setSettings(migratedSettings);

  // Clean up legacy storage keys
  removeStorageItem(STORAGE_KEYS.THEME);
  removeStorageItem(STORAGE_KEYS.ENTER_BEHAVIOR);

  return migratedSettings;
}
