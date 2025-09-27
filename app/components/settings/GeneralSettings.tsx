import {
  SunIcon,
  MoonIcon,
  CommandLineIcon,
  UserIcon,
  CogIcon,
} from "@heroicons/react/24/outline";
import { useSettings } from "../../hooks/useSettings";

export function GeneralSettings() {
  const { settings, theme, enterBehavior, toggleTheme, toggleEnterBehavior, updateSettings } =
    useSettings();

  return (
    <div className="space-y-6">
      {/* Live region for screen reader announcements */}
      <div aria-live="polite" className="sr-only" id="settings-announcements">
        {theme === "light" ? "Light mode enabled" : "Dark mode enabled"}.{" "}
        {enterBehavior === "send"
          ? "Enter key sends messages"
          : "Enter key creates newlines"}
        .
      </div>

      <div>
        <h3 className="text-lg font-medium text-slate-800 dark:text-slate-100 mb-4">
          General Settings
        </h3>

        {/* Theme Setting */}
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
              Theme
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className="flex items-center gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-200 text-left flex-1"
                role="switch"
                aria-checked={theme === "dark"}
                aria-label={`Theme toggle. Currently set to ${theme} mode. Click to switch to ${theme === "light" ? "dark" : "light"} mode.`}
              >
                {theme === "light" ? (
                  <SunIcon className="w-5 h-5 text-yellow-500" />
                ) : (
                  <MoonIcon className="w-5 h-5 text-blue-400" />
                )}
                <div>
                  <div className="text-sm font-medium text-slate-800 dark:text-slate-100">
                    {theme === "light" ? "Light Mode" : "Dark Mode"}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Click to switch to {theme === "light" ? "dark" : "light"}{" "}
                    mode
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Enter Behavior Setting */}
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
              Enter Key Behavior
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleEnterBehavior}
                className="flex items-center gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-200 text-left flex-1"
                role="switch"
                aria-checked={enterBehavior === "send"}
                aria-label={`Enter key behavior toggle. Currently set to ${enterBehavior === "send" ? "send message" : "newline"}. Click to switch behavior.`}
              >
                <CommandLineIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                <div>
                  <div className="text-sm font-medium text-slate-800 dark:text-slate-100">
                    {enterBehavior === "send"
                      ? "Enter to Send"
                      : "Enter for Newline"}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {enterBehavior === "send"
                      ? "Enter sends message, Shift+Enter for newline"
                      : "Enter adds newline, Shift+Enter sends message"}
                  </div>
                </div>
              </button>
            </div>
            <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Controls how the Enter key behaves when typing messages in the
              chat input.
            </div>
          </div>

          {/* Interface Mode Settings */}
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
              Interface Mode
            </label>
            <div className="space-y-2">
              {/* Jarvis Mode Radio Button */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateSettings({
                    messageDisplay: {
                      mode: "jarvis"
                    }
                  })}
                  className="flex items-center gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-200 text-left flex-1"
                  role="radio"
                  aria-checked={settings.messageDisplay.mode === "jarvis"}
                  aria-label="Jarvis Mode - Clean conversational AI experience"
                >
                  <UserIcon className="w-5 h-5 text-blue-500" />
                  <div>
                    <div className="text-sm font-medium text-slate-800 dark:text-slate-100">
                      Jarvis Mode
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Clean conversational AI experience with thinking steps
                    </div>
                  </div>
                  <div className="ml-auto">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      settings.messageDisplay.mode === "jarvis"
                        ? 'bg-blue-500 border-blue-500'
                        : 'border-slate-300 dark:border-slate-600'
                    }`}>
                      {settings.messageDisplay.mode === "jarvis" && (
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      )}
                    </div>
                  </div>
                </button>
              </div>

              {/* Developer Mode Radio Button */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateSettings({
                    messageDisplay: {
                      mode: "developer"
                    }
                  })}
                  className="flex items-center gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-200 text-left flex-1"
                  role="radio"
                  aria-checked={settings.messageDisplay.mode === "developer"}
                  aria-label="Developer Mode - Show all technical details for debugging"
                >
                  <CogIcon className="w-5 h-5 text-orange-500" />
                  <div>
                    <div className="text-sm font-medium text-slate-800 dark:text-slate-100">
                      Developer Mode
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Show all technical details for debugging and development
                    </div>
                  </div>
                  <div className="ml-auto">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      settings.messageDisplay.mode === "developer"
                        ? 'bg-orange-500 border-orange-500'
                        : 'border-slate-300 dark:border-slate-600'
                    }`}>
                      {settings.messageDisplay.mode === "developer" && (
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      )}
                    </div>
                  </div>
                </button>
              </div>
            </div>
            <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Choose your interface experience. Jarvis Mode provides a clean, consumer-focused view while Developer Mode shows all technical details.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
