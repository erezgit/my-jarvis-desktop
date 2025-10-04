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
  estimatedTime?: string;
}

interface OnboardingTicketV3Props {
  title: string;
  description: string;
  tasks: OnboardingTask[];
}

export const OnboardingTicketV3: React.FC<OnboardingTicketV3Props> = ({
  title,
  description,
  tasks,
}) => {
  const { isDarkMode } = useSimpleTheme();

  const completed = tasks.filter(t => t.done).length;
  const total = tasks.length;
  const percentage = total > 0 ? (completed / total) * 100 : 0;

  // Task categories (split into completed and remaining)
  const completedTasks = tasks.filter(t => t.done);
  const remainingTasks = tasks.filter(t => !t.done);

  return (
    <div className="space-y-6">
      {/* Hero Card */}
      <div
        className="rounded-2xl p-8 shadow-xl overflow-hidden relative"
        style={{
          background: isDarkMode
            ? 'linear-gradient(135deg, #1E3A8A 0%, #1E40AF 50%, #3B82F6 100%)'
            : 'linear-gradient(135deg, #3B82F6 0%, #2563EB 50%, #1D4ED8 100%)',
        }}
      >
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="inline-block px-3 py-1 rounded-full bg-white bg-opacity-20 text-white text-xs font-bold uppercase mb-3">
                ✨ Getting Started
              </div>
              <h1 className="text-4xl font-bold text-white mb-3">
                {title}
              </h1>
              <p className="text-blue-100 text-lg leading-relaxed max-w-2xl">
                {description}
              </p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div
              className="p-4 rounded-xl backdrop-blur-sm"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
              }}
            >
              <div className="text-white text-opacity-80 text-xs font-semibold uppercase mb-1">Total Steps</div>
              <div className="text-3xl font-bold text-white">{total}</div>
            </div>
            <div
              className="p-4 rounded-xl backdrop-blur-sm"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
              }}
            >
              <div className="text-white text-opacity-80 text-xs font-semibold uppercase mb-1">Completed</div>
              <div className="text-3xl font-bold text-white">{completed}</div>
            </div>
            <div
              className="p-4 rounded-xl backdrop-blur-sm"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
              }}
            >
              <div className="text-white text-opacity-80 text-xs font-semibold uppercase mb-1">Progress</div>
              <div className="text-3xl font-bold text-white">{Math.round(percentage)}%</div>
            </div>
          </div>
        </div>

        {/* Decorative background elements */}
        <div
          className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-10"
          style={{
            background: 'radial-gradient(circle, rgba(255,255,255,0.4) 0%, transparent 70%)',
            transform: 'translate(30%, -30%)',
          }}
        />
      </div>

      {/* Remaining Tasks Section */}
      {remainingTasks.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <h2
              className="text-2xl font-bold"
              style={{ color: isDarkMode ? '#FFFFFF' : '#111827' }}
            >
              📋 Next Steps
            </h2>
            <span
              className="px-3 py-1 rounded-full text-sm font-bold"
              style={{
                backgroundColor: '#3B82F6' + '20',
                color: '#3B82F6',
              }}
            >
              {remainingTasks.length} remaining
            </span>
          </div>

          <div className="grid gap-4">
            {remainingTasks.map((task, index) => (
              <div
                key={index}
                className="rounded-xl p-6 transition-all duration-300 hover:shadow-lg"
                style={{
                  backgroundColor: isDarkMode ? '#18181B' : '#FFFFFF',
                  border: `2px solid ${isDarkMode ? '#3F3F46' : '#E5E7EB'}`,
                  borderLeftColor: '#3B82F6',
                  borderLeftWidth: '6px',
                }}
              >
                <div className="flex items-start gap-4">
                  {/* Number badge */}
                  <div
                    className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-white"
                    style={{
                      backgroundColor: '#3B82F6',
                    }}
                  >
                    {completed + index + 1}
                  </div>

                  <div className="flex-1">
                    <h3
                      className="text-xl font-semibold mb-2"
                      style={{ color: isDarkMode ? '#FFFFFF' : '#111827' }}
                    >
                      {task.name}
                    </h3>

                    {task.description && (
                      <p
                        className="text-sm leading-relaxed mb-3"
                        style={{ color: isDarkMode ? '#A1A1AA' : '#6B7280' }}
                      >
                        {task.description}
                      </p>
                    )}

                    {task.estimatedTime && (
                      <div className="flex items-center gap-2">
                        <span
                          className="text-xs px-2 py-1 rounded"
                          style={{
                            backgroundColor: isDarkMode ? '#27272A' : '#F3F4F6',
                            color: isDarkMode ? '#A1A1AA' : '#6B7280',
                          }}
                        >
                          ⏱️ {task.estimatedTime}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Action hint */}
                  <div
                    className="flex-shrink-0 px-4 py-2 rounded-lg font-medium text-sm"
                    style={{
                      backgroundColor: '#3B82F6' + '10',
                      color: '#3B82F6',
                    }}
                  >
                    Start →
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed Tasks Section */}
      {completedTasks.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <h2
              className="text-2xl font-bold"
              style={{ color: isDarkMode ? '#FFFFFF' : '#111827' }}
            >
              ✅ Completed
            </h2>
            <span
              className="px-3 py-1 rounded-full text-sm font-bold"
              style={{
                backgroundColor: '#10B981' + '20',
                color: '#10B981',
              }}
            >
              {completedTasks.length} done
            </span>
          </div>

          <div className="grid gap-3">
            {completedTasks.map((task, index) => (
              <div
                key={index}
                className="rounded-xl p-5 transition-all duration-300"
                style={{
                  backgroundColor: isDarkMode ? '#18181B' : '#F9FAFB',
                  border: `1px solid ${isDarkMode ? '#27272A' : '#E5E7EB'}`,
                  borderLeftColor: '#10B981',
                  borderLeftWidth: '4px',
                }}
              >
                <div className="flex items-center gap-4">
                  {/* Checkmark */}
                  <div
                    className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-sm"
                    style={{
                      backgroundColor: '#10B981',
                    }}
                  >
                    ✓
                  </div>

                  <div className="flex-1">
                    <h3
                      className="text-base font-semibold line-through"
                      style={{ color: isDarkMode ? '#71717A' : '#9CA3AF' }}
                    >
                      {task.name}
                    </h3>
                  </div>

                  {/* Completion badge */}
                  <div
                    className="flex-shrink-0 text-xs px-3 py-1 rounded-full font-medium"
                    style={{
                      backgroundColor: '#10B981' + '20',
                      color: '#10B981',
                    }}
                  >
                    Done
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Complete Message */}
      {completed === total && (
        <div
          className="rounded-2xl p-8 text-center shadow-xl"
          style={{
            background: isDarkMode
              ? 'linear-gradient(135deg, #065F46 0%, #059669 50%, #10B981 100%)'
              : 'linear-gradient(135deg, #10B981 0%, #059669 50%, #047857 100%)',
          }}
        >
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-3xl font-bold text-white mb-3">
            Onboarding Complete!
          </h2>
          <p className="text-green-100 text-lg mb-6 max-w-xl mx-auto">
            Fantastic work! You've completed all the setup steps. Your Jarvis Desktop is ready to supercharge your productivity.
          </p>
          <button
            className="px-6 py-3 rounded-lg font-bold text-green-600 transition-transform hover:scale-105"
            style={{
              backgroundColor: 'white',
            }}
          >
            Start Building →
          </button>
        </div>
      )}
    </div>
  );
};
