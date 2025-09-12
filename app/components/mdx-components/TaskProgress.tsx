import React from 'react';

interface Task {
  name: string;
  done: boolean;
}

interface TaskProgressProps {
  tasks: Task[];
}

export const TaskProgress: React.FC<TaskProgressProps> = ({ tasks }) => {
  const completed = tasks.filter(t => t.done).length;
  const percentage = tasks.length > 0 ? (completed / tasks.length) * 100 : 0;
  
  return (
    <div className="my-6">
      <div className="flex justify-between mb-2">
        <span className="text-sm font-medium text-foreground">
          Task Completion
        </span>
        <span className="text-sm text-muted-foreground">
          {completed}/{tasks.length}
        </span>
      </div>
      <div className="w-full bg-muted rounded-full h-2">
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
              className="rounded border-border bg-background"
              readOnly
            />
            <span className={`${task.done ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
              {task.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};