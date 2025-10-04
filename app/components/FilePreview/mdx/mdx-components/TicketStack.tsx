import React, { useState } from 'react';

// Simple theme detection using CSS media query
function useSimpleTheme() {
  const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  return { isDarkMode };
}

interface TicketTask {
  name: string;
  done: boolean;
}

interface Ticket {
  id: string;
  title: string;
  status: 'active' | 'planned' | 'completed';
  confidence: number;
  productRequirements: string;
  architecture: string;
  implementation: TicketTask[];
  nextAction: string;
}

interface TicketStackProps {
  tickets: Ticket[];
}

interface TicketCardProps {
  ticket: Ticket;
}

const TicketCard: React.FC<TicketCardProps> = ({ ticket }) => {
  const { isDarkMode } = useSimpleTheme();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    product: false,
    architecture: false,
    implementation: true, // Implementation starts expanded
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const completed = ticket.implementation.filter(t => t.done).length;
  const total = ticket.implementation.length;
  const percentage = total > 0 ? (completed / total) * 100 : 0;

  // Status colors
  const statusColors = {
    active: '#10B981', // green-500
    planned: '#3B82F6', // blue-500
    completed: '#6B7280', // gray-500
  };

  const statusColor = statusColors[ticket.status];

  return (
    <div
      className="mb-6 rounded-lg border-l-4 overflow-hidden"
      style={{
        borderLeftColor: statusColor,
        backgroundColor: isDarkMode ? '#18181B' : '#FFFFFF', // zinc-900 : white
        borderColor: isDarkMode ? '#3F3F46' : '#E5E7EB', // zinc-700 : gray-200
        borderWidth: '1px',
        borderLeftWidth: '4px',
      }}
    >
      {/* Card Header */}
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3
                className="text-xl font-semibold"
                style={{ color: isDarkMode ? '#FFFFFF' : '#111827' }} // white : gray-900
              >
                {ticket.title}
              </h3>
              <span
                className="px-2 py-1 rounded text-xs font-medium uppercase"
                style={{
                  backgroundColor: `${statusColor}20`,
                  color: statusColor,
                }}
              >
                {ticket.status}
              </span>
            </div>
            <div
              className="text-sm"
              style={{ color: isDarkMode ? '#9CA3AF' : '#6B7280' }} // gray-400 : gray-600
            >
              Ticket #{ticket.id}
            </div>
          </div>
          <div className="text-right">
            <div
              className="text-sm mb-1"
              style={{ color: isDarkMode ? '#9CA3AF' : '#6B7280' }} // gray-400 : gray-600
            >
              Confidence
            </div>
            <div
              className="text-2xl font-bold"
              style={{ color: isDarkMode ? '#FFFFFF' : '#111827' }} // white : gray-900
            >
              {ticket.confidence}/10
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between mb-2">
            <span
              className="text-sm font-medium"
              style={{ color: isDarkMode ? '#FFFFFF' : '#111827' }} // white : gray-900
            >
              Implementation Progress
            </span>
            <span
              className="text-sm"
              style={{ color: isDarkMode ? '#9CA3AF' : '#6B7280' }} // gray-400 : gray-600
            >
              {completed}/{total} ({Math.round(percentage)}%)
            </span>
          </div>
          <div
            className="w-full rounded-full h-2"
            style={{ backgroundColor: isDarkMode ? '#3F3F46' : '#E5E7EB' }} // zinc-700 : gray-200
          >
            <div
              className="h-2 rounded-full transition-all duration-300"
              style={{
                width: `${percentage}%`,
                backgroundColor: statusColor,
              }}
            />
          </div>
        </div>

        {/* Next Action */}
        <div
          className="p-3 rounded-lg mb-4"
          style={{
            backgroundColor: isDarkMode ? '#27272A' : '#F9FAFB', // zinc-800 : gray-50
          }}
        >
          <div
            className="text-xs font-semibold mb-1 uppercase"
            style={{ color: isDarkMode ? '#9CA3AF' : '#6B7280' }} // gray-400 : gray-600
          >
            Next Action
          </div>
          <div
            className="text-sm"
            style={{ color: isDarkMode ? '#FFFFFF' : '#111827' }} // white : gray-900
          >
            {ticket.nextAction}
          </div>
        </div>

        {/* Collapsible Sections */}
        <div className="space-y-3">
          {/* Product Requirements */}
          <div>
            <button
              onClick={() => toggleSection('product')}
              className="w-full flex items-center justify-between p-3 rounded-lg transition-colors"
              style={{
                backgroundColor: isDarkMode ? '#27272A' : '#F9FAFB', // zinc-800 : gray-50
              }}
            >
              <span
                className="font-medium text-sm"
                style={{ color: isDarkMode ? '#FFFFFF' : '#111827' }} // white : gray-900
              >
                Product Requirements
              </span>
              <span
                className="text-lg"
                style={{ color: isDarkMode ? '#9CA3AF' : '#6B7280' }} // gray-400 : gray-600
              >
                {expandedSections.product ? '−' : '+'}
              </span>
            </button>
            {expandedSections.product && (
              <div
                className="mt-2 p-3 rounded-lg text-sm whitespace-pre-wrap"
                style={{
                  backgroundColor: isDarkMode ? '#18181B' : '#FFFFFF', // zinc-900 : white
                  color: isDarkMode ? '#D4D4D8' : '#374151', // zinc-300 : gray-700
                  borderLeft: `3px solid ${statusColor}`,
                }}
              >
                {ticket.productRequirements}
              </div>
            )}
          </div>

          {/* Architecture */}
          <div>
            <button
              onClick={() => toggleSection('architecture')}
              className="w-full flex items-center justify-between p-3 rounded-lg transition-colors"
              style={{
                backgroundColor: isDarkMode ? '#27272A' : '#F9FAFB', // zinc-800 : gray-50
              }}
            >
              <span
                className="font-medium text-sm"
                style={{ color: isDarkMode ? '#FFFFFF' : '#111827' }} // white : gray-900
              >
                Architecture
              </span>
              <span
                className="text-lg"
                style={{ color: isDarkMode ? '#9CA3AF' : '#6B7280' }} // gray-400 : gray-600
              >
                {expandedSections.architecture ? '−' : '+'}
              </span>
            </button>
            {expandedSections.architecture && (
              <div
                className="mt-2 p-3 rounded-lg text-sm whitespace-pre-wrap"
                style={{
                  backgroundColor: isDarkMode ? '#18181B' : '#FFFFFF', // zinc-900 : white
                  color: isDarkMode ? '#D4D4D8' : '#374151', // zinc-300 : gray-700
                  borderLeft: `3px solid ${statusColor}`,
                }}
              >
                {ticket.architecture}
              </div>
            )}
          </div>

          {/* Implementation Tasks */}
          <div>
            <button
              onClick={() => toggleSection('implementation')}
              className="w-full flex items-center justify-between p-3 rounded-lg transition-colors"
              style={{
                backgroundColor: isDarkMode ? '#27272A' : '#F9FAFB', // zinc-800 : gray-50
              }}
            >
              <span
                className="font-medium text-sm"
                style={{ color: isDarkMode ? '#FFFFFF' : '#111827' }} // white : gray-900
              >
                Implementation Plan ({completed}/{total})
              </span>
              <span
                className="text-lg"
                style={{ color: isDarkMode ? '#9CA3AF' : '#6B7280' }} // gray-400 : gray-600
              >
                {expandedSections.implementation ? '−' : '+'}
              </span>
            </button>
            {expandedSections.implementation && (
              <div className="mt-2 space-y-2">
                {ticket.implementation.map((task, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-2 rounded"
                    style={{
                      backgroundColor: isDarkMode ? '#18181B' : '#F9FAFB', // zinc-900 : gray-50
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={task.done}
                      disabled
                      className="rounded"
                      style={{
                        accentColor: statusColor,
                      }}
                      readOnly
                    />
                    <span
                      className={`text-sm ${task.done ? 'line-through' : ''}`}
                      style={{
                        color: task.done
                          ? '#6B7280' // gray-500 for both modes when done
                          : isDarkMode ? '#FFFFFF' : '#111827' // white : gray-900 when active
                      }}
                    >
                      {task.name}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const TicketStack: React.FC<TicketStackProps> = ({ tickets }) => {
  return (
    <div className="space-y-6">
      {tickets.map((ticket) => (
        <TicketCard key={ticket.id} ticket={ticket} />
      ))}
    </div>
  );
};
