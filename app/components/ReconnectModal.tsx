import React from 'react';

interface ReconnectModalProps {
  title: string;
  message: string;
  buttonText: string;
  onConfirm: () => void;
}

export function ReconnectModal({ title, message, buttonText, onConfirm }: ReconnectModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm mx-4 shadow-xl">
        <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
          {title}
        </h3>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          {message}
        </p>
        <button
          onClick={onConfirm}
          className="w-full text-white font-medium shadow-sm relative overflow-hidden
                     bg-gradient-to-tr from-cyan-400 to-blue-500
                     hover:from-cyan-500 hover:to-blue-600
                     py-2 px-4 rounded-md transition-all duration-200"
        >
          {buttonText}
        </button>
      </div>
    </div>
  );
}