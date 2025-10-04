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
  icon?: string;
}

interface OnboardingTicketV2Props {
  title: string;
  description: string;
  tasks: OnboardingTask[];
  currentStep?: number;
}

export const OnboardingTicketV2: React.FC<OnboardingTicketV2Props> = ({
  title,
  description,
  tasks,
  currentStep,
}) => {
  const { isDarkMode } = useSimpleTheme();

  const completed = tasks.filter(t => t.done).length;
  const total = tasks.length;

  // Icon mapping for different states
  const getStatusIcon = (task: OnboardingTask, index: number) => {
    if (task.done) return { emoji: '✅', color: '#10B981' }; // green-500
    if (currentStep !== undefined && index === currentStep) return { emoji: '🔵', color: '#3B82F6' }; // blue-500
    return { emoji: '⚪', color: '#71717A' }; // zinc-500
  };

  // Default icons for tasks if not provided
  const defaultIcons = ['🔑', '📁', '🎙️', '📄', '🤖', '⚡', '🎨', '🔧'];

  return (
    <div
      className="rounded-xl overflow-hidden shadow-lg"
      style={{
        backgroundColor: isDarkMode ? '#18181B' : '#FFFFFF',
        border: `2px solid ${isDarkMode ? '#3F3F46' : '#E5E7EB'}`,
      }}
    >
      {/* Header */}
      <div
        className="p-8"
        style={{
          background: isDarkMode
            ? 'linear-gradient(135deg, #1E293B 0%, #18181B 100%)'
            : 'linear-gradient(135deg, #F8FAFC 0%, #FFFFFF 100%)',
        }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div
            className="text-4xl w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #3B82F6 0%, #10B981 100%)',
            }}
          >
            🚀
          </div>
          <div className="flex-1">
            <h2
              className="text-3xl font-bold"
              style={{ color: isDarkMode ? '#FFFFFF' : '#111827' }}
            >
              {title}
            </h2>
          </div>
        </div>

        <p
          className="text-base leading-relaxed mb-6"
          style={{ color: isDarkMode ? '#D4D4D8' : '#4B5563' }}
        >
          {description}
        </p>

        {/* Progress indicator with emojis */}
        <div
          className="p-4 rounded-lg"
          style={{
            backgroundColor: isDarkMode ? '#27272A' : '#F3F4F6',
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span
              className="text-sm font-semibold"
              style={{ color: isDarkMode ? '#FFFFFF' : '#111827' }}
            >
              🎯 Your Progress
            </span>
            <span
              className="text-sm font-bold"
              style={{
                color: '#10B981',
              }}
            >
              {completed} of {total} complete
            </span>
          </div>
          <div className="flex items-center gap-1">
            {tasks.map((task, i) => {
              const { emoji, color } = getStatusIcon(task, i);
              return (
                <div
                  key={i}
                  className="text-2xl transition-transform duration-300 hover:scale-125"
                  style={{
                    filter: task.done ? 'none' : 'grayscale(0.3)',
                    opacity: task.done ? 1 : 0.6,
                  }}
                  title={task.name}
                >
                  {emoji}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Journey visualization */}
      <div className="p-8">
        <div className="relative">
          {/* Journey path line */}
          <div
            className="absolute left-8 top-0 bottom-0 w-1"
            style={{
              background: isDarkMode
                ? 'linear-gradient(to bottom, #10B981 0%, #3B82F6 50%, #71717A 100%)'
                : 'linear-gradient(to bottom, #10B981 0%, #3B82F6 50%, #D4D4D8 100%)',
            }}
          />

          <div className="space-y-6">
            {tasks.map((task, index) => {
              const { emoji, color } = getStatusIcon(task, index);
              const isActive = currentStep !== undefined && index === currentStep;
              const taskIcon = task.icon || defaultIcons[index % defaultIcons.length];

              return (
                <div key={index} className="relative pl-20">
                  {/* Journey milestone icon */}
                  <div
                    className="absolute left-0 top-1 flex items-center justify-center w-16 h-16 rounded-2xl font-bold text-white transition-all duration-300"
                    style={{
                      backgroundColor: color,
                      transform: isActive ? 'scale(1.1)' : 'scale(1)',
                      boxShadow: isActive
                        ? `0 8px 24px ${color}60, 0 0 0 4px ${isDarkMode ? '#18181B' : '#FFFFFF'}, 0 0 0 6px ${color}`
                        : `0 2px 8px ${color}40, 0 0 0 4px ${isDarkMode ? '#18181B' : '#FFFFFF'}`,
                    }}
                  >
                    <span className="text-3xl">{emoji}</span>
                  </div>

                  {/* Task content */}
                  <div
                    className="p-5 rounded-xl transition-all duration-300"
                    style={{
                      backgroundColor: isDarkMode ? '#27272A' : '#F9FAFB',
                      border: isActive
                        ? `2px solid ${color}`
                        : `1px solid ${isDarkMode ? '#3F3F46' : '#E5E7EB'}`,
                      transform: isActive ? 'translateX(4px)' : 'translateX(0)',
                    }}
                  >
                    <div className="flex items-start gap-3">
                      {/* Task icon */}
                      <div className="text-3xl flex-shrink-0" style={{ opacity: task.done ? 1 : 0.5 }}>
                        {taskIcon}
                      </div>

                      <div className="flex-1">
                        <h4
                          className={`text-lg font-semibold mb-2 ${task.done ? 'line-through' : ''}`}
                          style={{
                            color: task.done
                              ? (isDarkMode ? '#71717A' : '#9CA3AF')
                              : (isDarkMode ? '#FFFFFF' : '#111827')
                          }}
                        >
                          {task.name}
                        </h4>

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

                        {/* Status badge */}
                        <div className="mt-3 flex items-center gap-2">
                          <span
                            className="px-3 py-1 rounded-full text-xs font-bold uppercase inline-flex items-center gap-1.5"
                            style={{
                              backgroundColor: color + '20',
                              color: color,
                            }}
                          >
                            {task.done && '✓ Completed'}
                            {!task.done && isActive && '⟳ In Progress'}
                            {!task.done && !isActive && '○ Pending'}
                          </span>

                          {/* Completion checkmark animation */}
                          {task.done && (
                            <span className="text-xl animate-bounce">🎉</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Connection line hint for next task */}
                  {index < tasks.length - 1 && (
                    <div
                      className="absolute left-8 -bottom-3 w-1 h-3"
                      style={{
                        backgroundColor: tasks[index + 1].done ? '#10B981' : isDarkMode ? '#3F3F46' : '#E5E7EB',
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Journey completion message */}
        {completed === total && (
          <div
            className="mt-8 p-6 rounded-xl text-center"
            style={{
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
            }}
          >
            <div className="text-5xl mb-3">🎊</div>
            <h3 className="text-2xl font-bold text-white mb-2">Journey Complete!</h3>
            <p className="text-green-100">
              Congratulations! You've completed all onboarding steps. You're ready to build amazing things with Jarvis.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
