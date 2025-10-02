import React from 'react';

// Simple theme detection using CSS media query
function useSimpleTheme() {
  const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  return { isDarkMode };
}

interface Task {
  name: string;
  done: boolean;
}

interface TaskProgressProps {
  tasks: Task[];
}

export const TaskProgress: React.FC<TaskProgressProps> = ({ tasks }) => {
  const { isDarkMode } = useSimpleTheme();
  const completed = tasks.filter(t => t.done).length;
  const percentage = tasks.length > 0 ? (completed / tasks.length) * 100 : 0;

  return (
    <div className="my-6">
      <div className="flex justify-between mb-2">
        <span
          className="text-sm font-medium"
          style={{ color: isDarkMode ? '#FFFFFF' : '#111827' }} // white : gray-900
        >
          Task Completion
        </span>
        <span
          className="text-sm"
          style={{ color: isDarkMode ? '#9CA3AF' : '#6B7280' }} // gray-400 : gray-600
        >
          {completed}/{tasks.length}
        </span>
      </div>
      <div
        className="w-full rounded-full h-2"
        style={{ backgroundColor: isDarkMode ? '#3F3F46' : '#E5E7EB' }} // zinc-700 : gray-200
      >
        <div
          className="bg-sky-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="mt-3 space-y-1">
        {tasks.map((task, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={task.done}
              disabled
              className="rounded"
              style={{
                borderColor: isDarkMode ? '#6B7280' : '#9CA3AF', // gray-500 : gray-400
                backgroundColor: isDarkMode ? '#27272A' : '#FFFFFF', // zinc-800 : white
              }}
              readOnly
            />
            <span
              className={task.done ? 'line-through' : ''}
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
    </div>
  );
};