import React from 'react';

interface ConnectionStatusProps {
  connected: boolean;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ connected }) => {
  return (
    <div className="flex items-center space-x-2">
      <div
        className={`w-2 h-2 rounded-full ${
          connected ? 'bg-green-500' : 'bg-red-500'
        }`}
      />
      <span className="text-sm text-gray-600">
        {connected ? 'Connected' : 'Disconnected'}
      </span>
    </div>
  );
};