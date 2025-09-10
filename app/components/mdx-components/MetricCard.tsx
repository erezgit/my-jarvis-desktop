import React from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  change: number;
  unit?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({ title, value, change, unit = '' }) => {
  const isPositive = change >= 0;
  
  return (
    <div className="bg-zinc-900 p-4 rounded-lg shadow-md border border-zinc-700">
      <h4 className="text-sm text-gray-400 mb-1">{title}</h4>
      <div className="text-2xl font-bold text-white">
        {value}{unit}
      </div>
      <div className={`text-sm mt-1 ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
        {isPositive ? '↑' : '↓'} {Math.abs(change)}%
      </div>
    </div>
  );
};