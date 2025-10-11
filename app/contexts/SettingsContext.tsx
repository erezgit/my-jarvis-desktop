import React, { useState, useEffect, useCallback, useMemo } from "react";
import type { AppSettings, SettingsContextType } from "../types/settings";
import { getSettings, setSettings } from "../utils/storage";
import { SettingsContext } from "./SettingsContextTypes";

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettingsState] = useState<AppSettings>(() =>
    getSettings(),
  );
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize settings on client side (handles migration automatically)
  useEffect(() => {
    async function initializeSettings() {
      const initialSettings = getSettings();

      // In Electron mode, resolve ~ to actual home directory
      if (typeof window !== 'undefined' && (window as any).fileAPI && initialSettings.workingDirectory.startsWith('~')) {
        try {
          const homeDir = await (window as any).fileAPI.getHomeDir();
          const resolvedPath = initialSettings.workingDirectory.replace('~', homeDir);
          initialSettings.workingDirectory = resolvedPath;
        } catch (error) {
          console.error('Failed to resolve home directory:', error);
          // Keep ~ as fallback
        }
      }

      setSettingsState(initialSettings);
      setIsInitialized(true);
    }

    initializeSettings();
  }, []);

  // Apply theme changes to document when settings change
  useEffect(() => {
    if (!isInitialized) return;

    const root = window.document.documentElement;

    if (settings.theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    // Save settings to storage
    setSettings(settings);
  }, [settings, isInitialized]);

  const updateSettings = useCallback((updates: Partial<AppSettings>) => {
    setSettingsState((prev) => ({ ...prev, ...updates }));
  }, []);

  const toggleTheme = useCallback(() => {
    updateSettings({
      theme: settings.theme === "light" ? "dark" : "light",
    });
  }, [settings.theme, updateSettings]);

  const toggleEnterBehavior = useCallback(() => {
    updateSettings({
      enterBehavior: settings.enterBehavior === "send" ? "newline" : "send",
    });
  }, [settings.enterBehavior, updateSettings]);

  const setWorkingDirectory = useCallback((path: string) => {
    updateSettings({ workingDirectory: path });
  }, [updateSettings]);

  const value = useMemo(
    (): SettingsContextType => ({
      settings,
      theme: settings.theme,
      enterBehavior: settings.enterBehavior,
      workingDirectory: settings.workingDirectory,
      toggleTheme,
      toggleEnterBehavior,
      setWorkingDirectory,
      updateSettings,
    }),
    [settings, toggleTheme, toggleEnterBehavior, setWorkingDirectory, updateSettings],
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}
