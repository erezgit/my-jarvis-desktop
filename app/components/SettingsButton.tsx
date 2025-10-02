import { CogIcon } from "@heroicons/react/24/outline";

interface SettingsButtonProps {
  onClick: () => void;
}

export function SettingsButton({ onClick }: SettingsButtonProps) {
  return (
    <button
      onClick={onClick}
      className="p-3 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors duration-200"
      aria-label="Open settings"
    >
      <CogIcon className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
    </button>
  );
}
