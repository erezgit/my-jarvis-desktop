import React from 'react';

// Simple theme detection using CSS media query
function useSimpleTheme() {
  const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  return { isDarkMode };
}

interface OnboardingTask {
  name: string;
  done: boolean;
  description?: string;
  priority?: 'high' | 'medium' | 'low';
}

interface OnboardingTicketV1Props {
  title: string;
  description: string;
  confidence?: number;
  tasks: OnboardingTask[];
  currentStep?: number;
}

export const OnboardingTicketV1: React.FC<OnboardingTicketV1Props> = ({
  title,
  description,
  confidence = 8,
  tasks,
  currentStep,
}) => {
  const { isDarkMode } = useSimpleTheme();

  const completed = tasks.filter(t => t.done).length;
  const total = tasks.length;
  const percentage = total > 0 ? (completed / total) * 100 : 0;

  // Color progression: Red → Orange → Blue → Green
  const getProgressColor = (pct: number) => {
    if (pct === 0) return '#EF4444'; // red-500
    if (pct < 33) return '#F59E0B'; // amber-500
    if (pct < 66) return '#3B82F6'; // blue-500
    return '#10B981'; // green-500
  };

  const getTaskStateColor = (task: OnboardingTask, index: number) => {
    if (task.done) return '#10B981'; // green-500 - completed
    if (currentStep !== undefined && index === currentStep) return '#3B82F6'; // blue-500 - in progress
    return '#EF4444'; // red-500 - not started
  };

  const progressColor = getProgressColor(percentage);

  return (
    <div
      className="rounded-xl overflow-hidden shadow-lg"
      style={{
        backgroundColor: isDarkMode ? '#18181B' : '#FFFFFF',
        border: `2px solid ${isDarkMode ? '#3F3F46' : '#E5E7EB'}`,
      }}
    >
      {/* Header with gradient background */}
      <div
        className="p-8 relative overflow-hidden"
        style={{
          background: isDarkMode
            ? `linear-gradient(135deg, ${progressColor}20 0%, ${progressColor}10 100%)`
            : `linear-gradient(135deg, ${progressColor}15 0%, ${progressColor}08 100%)`,
        }}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h2
              className="text-3xl font-bold mb-2"
              style={{ color: isDarkMode ? '#FFFFFF' : '#111827' }}
            >
              {title}
            </h2>
            <p
              className="text-base leading-relaxed"
              style={{ color: isDarkMode ? '#D4D4D8' : '#4B5563' }}
            >
              {description}
            </p>
          </div>

          {/* Circular progress indicator */}
          <div className="flex flex-col items-center ml-6">
            <div className="relative w-24 h-24">
              <svg className="transform -rotate-90 w-24 h-24">
                {/* Background circle */}
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke={isDarkMode ? '#3F3F46' : '#E5E7EB'}
                  strokeWidth="8"
                  fill="none"
                />
                {/* Progress circle */}
                <circle
                  cx="48"
                  cy="48"
                  r="40"
                  stroke={progressColor}
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  strokeDashoffset={`${2 * Math.PI * 40 * (1 - percentage / 100)}`}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 0.5s ease, stroke 0.3s ease' }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span
                  className="text-2xl font-bold"
                  style={{ color: progressColor }}
                >
                  {Math.round(percentage)}%
                </span>
              </div>
            </div>
            <div
              className="text-xs mt-2 font-medium"
              style={{ color: isDarkMode ? '#9CA3AF' : '#6B7280' }}
            >
              {completed}/{total} Complete
            </div>
          </div>
        </div>

        {/* Confidence badge */}
        {confidence && (
          <div className="flex items-center gap-2 mt-4">
            <span
              className="text-sm font-medium"
              style={{ color: isDarkMode ? '#9CA3AF' : '#6B7280' }}
            >
              Confidence:
            </span>
            <div className="flex items-center gap-1">
              {[...Array(10)].map((_, i) => (
                <div
                  key={i}
                  className="w-6 h-6 rounded"
                  style={{
                    backgroundColor: i < confidence ? progressColor : isDarkMode ? '#3F3F46' : '#E5E7EB',
                    transition: 'background-color 0.3s ease',
                  }}
                />
              ))}
            </div>
            <span
              className="text-sm font-bold ml-1"
              style={{ color: progressColor }}
            >
              {confidence}/10
            </span>
          </div>
        )}
      </div>

      {/* Tasks list */}
      <div className="p-8">
        <h3
          className="text-xl font-semibold mb-6"
          style={{ color: isDarkMode ? '#FFFFFF' : '#111827' }}
        >
          Your Journey
        </h3>

        <div className="space-y-4">
          {tasks.map((task, index) => {
            const taskColor = getTaskStateColor(task, index);
            const isActive = currentStep !== undefined && index === currentStep;

            return (
              <div
                key={index}
                className="relative p-5 rounded-lg transition-all duration-300"
                style={{
                  backgroundColor: isDarkMode ? '#27272A' : '#F9FAFB',
                  borderLeft: `4px solid ${taskColor}`,
                  transform: isActive ? 'scale(1.02)' : 'scale(1)',
                  boxShadow: isActive
                    ? `0 4px 12px ${taskColor}40`
                    : 'none',
                }}
              >
                <div className="flex items-start gap-4">
                  {/* Status indicator */}
                  <div
                    className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-white transition-all duration-300"
                    style={{
                      backgroundColor: taskColor,
                      boxShadow: isActive ? `0 0 20px ${taskColor}60` : 'none',
                    }}
                  >
                    {task.done ? '✓' : index + 1}
                  </div>

                  {/* Task content */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <h4
                        className={`text-lg font-semibold ${task.done ? 'line-through' : ''}`}
                        style={{
                          color: task.done
                            ? (isDarkMode ? '#71717A' : '#9CA3AF')
                            : (isDarkMode ? '#FFFFFF' : '#111827')
                        }}
                      >
                        {task.name}
                      </h4>

                      {/* Priority badge */}
                      {task.priority && !task.done && (
                        <span
                          className="px-3 py-1 rounded-full text-xs font-bold uppercase"
                          style={{
                            backgroundColor: taskColor + '20',
                            color: taskColor,
                          }}
                        >
                          {task.priority}
                        </span>
                      )}
                    </div>

                    {task.description && (
                      <p
                        className="text-sm leading-relaxed"
                        style={{
                          color: isDarkMode ? '#A1A1AA' : '#6B7280',
                        }}
                      >
                        {task.description}
                      </p>
                    )}

                    {/* Status label */}
                    <div className="mt-3">
                      <span
                        className="inline-flex items-center gap-2 text-xs font-medium"
                        style={{ color: taskColor }}
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: taskColor }}
                        />
                        {task.done ? 'Completed' : isActive ? 'In Progress' : 'Not Started'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
