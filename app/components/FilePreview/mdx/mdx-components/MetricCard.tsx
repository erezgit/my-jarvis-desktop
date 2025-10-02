import React from 'react';

// Simple theme detection using CSS media query
function useSimpleTheme() {
  const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  return { isDarkMode };
}

interface MetricCardProps {
  title: string;
  value: string | number;
  change: number;
  unit?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({ title, value, change, unit = '' }) => {
  const { isDarkMode } = useSimpleTheme();
  const isPositive = change >= 0;

  return (
    <div
      className="p-4 rounded-lg shadow-md border"
      style={{
        backgroundColor: isDarkMode ? '#18181B' : '#F9FAFB', // zinc-900 : gray-50
        borderColor: isDarkMode ? '#3F3F46' : '#E5E7EB', // zinc-700 : gray-200
      }}
    >
      <h4
        className="text-sm mb-1"
        style={{ color: isDarkMode ? '#9CA3AF' : '#6B7280' }} // gray-400 : gray-600
      >
        {title}
      </h4>
      <div
        className="text-2xl font-bold"
        style={{ color: isDarkMode ? '#FFFFFF' : '#111827' }} // white : gray-900
      >
        {value}{unit}
      </div>
      <div className={`text-sm mt-1 ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
        {isPositive ? '↑' : '↓'} {Math.abs(change)}%
      </div>
    </div>
  );
};