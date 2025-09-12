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
    <div className="bg-component p-4 rounded-lg mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-card-foreground">
          Agent Status
        </h3>
        <span className={`inline-block px-3 py-1 rounded-full text-white text-sm ${statusColors[status]}`}>
          {status.toUpperCase()}
        </span>
      </div>
      <div className="text-sm text-muted-foreground">
        Active Tasks: {tasks}
      </div>
    </div>
  );
};