import React from 'react';

// Simple theme detection using CSS media query
function useSimpleTheme() {
  const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  return { isDarkMode };
}

interface AgentStatusProps {
  status: 'active' | 'idle' | 'processing';
  tasks: number;
}

export const AgentStatus: React.FC<AgentStatusProps> = ({ status, tasks }) => {
  const { isDarkMode } = useSimpleTheme();

  const statusColors = {
    active: 'bg-green-500',
    idle: 'bg-yellow-500',
    processing: 'bg-blue-500'
  };

  return (
    <div
      className="p-4 rounded-lg mb-6"
      style={{
        backgroundColor: isDarkMode ? '#27272A' : '#F3F4F6', // zinc-800 : gray-100
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3
          className="text-lg font-semibold"
          style={{ color: isDarkMode ? '#FFFFFF' : '#111827' }} // white : gray-900
        >
          Agent Status
        </h3>
        <span className={`inline-block px-3 py-1 rounded-full text-white text-sm ${statusColors[status]}`}>
          {status.toUpperCase()}
        </span>
      </div>
      <div
        className="text-sm"
        style={{ color: isDarkMode ? '#9CA3AF' : '#6B7280' }} // gray-400 : gray-600
      >
        Active Tasks: {tasks}
      </div>
    </div>
  );
};