import React from 'react';

interface AgentStatusProps {
  status: 'active' | 'idle' | 'processing';
  tasks: number;
}

export const AgentStatus: React.FC<AgentStatusProps> = ({ status, tasks }) => {
  const statusColors = {
    active: 'bg-green-500',
    idle: 'bg-yellow-500',
    processing: 'bg-blue-500'
  };
  
  return (
    <div className="bg-zinc-800 p-4 rounded-lg mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-white">Agent Status</h3>
        <span className={`inline-block px-3 py-1 rounded-full text-white text-sm ${statusColors[status]}`}>
          {status.toUpperCase()}
        </span>
      </div>
      <div className="text-sm text-gray-400">
        Active Tasks: {tasks}
      </div>
    </div>
  );
};