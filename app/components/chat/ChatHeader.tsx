import { PlusCircleIcon } from '@heroicons/react/24/outline';
import { SettingsButton } from '../SettingsButton';

interface ChatHeaderProps {
  currentView: 'chat' | 'history';
  onChatClick: () => void;
  onHistoryClick: () => void;
  onSettingsClick: () => void;
  onNewChat?: () => void;
  hasMessages?: boolean;
  showPanelSwitchers?: boolean;  // false for desktop, true for mobile (not used in this phase)
}

export function ChatHeader({
  currentView,
  onChatClick,
  onHistoryClick,
  onSettingsClick,
  onNewChat,
  hasMessages = false,
  showPanelSwitchers = false,
}: ChatHeaderProps) {
  return (
    <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      {/* Left side - New Chat button */}
      <div className="flex-1">
        {onNewChat && hasMessages && (
          <button
            onClick={onNewChat}
            className="px-3 py-1.5 rounded-lg transition-colors duration-200 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2"
            aria-label="Start new chat"
          >
            <PlusCircleIcon className="w-5 h-5" />
            <span>New Chat</span>
          </button>
        )}
      </div>

      {/* Right side - View switchers and settings */}
      <div className="flex items-center gap-2">
        {/* Chat button */}
        <button
          onClick={onChatClick}
          className={`px-3 py-1.5 rounded-lg transition-colors duration-200 ${
            currentView === 'chat'
              ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-medium'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
          aria-label="Switch to chat view"
          aria-pressed={currentView === 'chat'}
        >
          Chat
        </button>

        {/* History button */}
        <button
          onClick={onHistoryClick}
          className={`px-3 py-1.5 rounded-lg transition-colors duration-200 ${
            currentView === 'history'
              ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-medium'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
          aria-label="Switch to history view"
          aria-pressed={currentView === 'history'}
        >
          History
        </button>

        {/* Settings button */}
        <SettingsButton onClick={onSettingsClick} />
      </div>
    </div>
  );
}
