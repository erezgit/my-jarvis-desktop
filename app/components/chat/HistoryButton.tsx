import { ClockIcon } from "@heroicons/react/24/outline";

interface HistoryButtonProps {
  onClick: () => void;
}

export function HistoryButton({ onClick }: HistoryButtonProps) {
  return (
    <button
      onClick={onClick}
      className="p-3 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors duration-200"
      aria-label="View conversation history"
    >
      <ClockIcon className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
    </button>
  );
}
