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
    <div className="bg-component border border-border p-4 rounded-lg shadow-md">
      <h4 className="text-sm text-muted-foreground mb-1">
        {title}
      </h4>
      <div className="text-2xl font-bold text-card-foreground">
        {value}{unit}
      </div>
      <div className={`text-sm mt-1 ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
        {isPositive ? '↑' : '↓'} {Math.abs(change)}%
      </div>
    </div>
  );
};