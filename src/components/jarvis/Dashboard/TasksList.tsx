'use client';

import { PriorityIndicator } from '../PriorityIndicator';
import type { TaskSummary } from '@/lib/jarvis/executive/types';

interface TasksListProps {
  tasks: TaskSummary[];
  overdue: TaskSummary[];
  loading: boolean;
  expanded: boolean;
}

export function TasksList({ tasks, overdue, loading, expanded }: TasksListProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        <h3 className="text-white/60 text-xs uppercase tracking-wide">Tasks</h3>
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-white/10 rounded" />
          <div className="h-4 bg-white/10 rounded w-3/4" />
        </div>
      </div>
    );
  }

  const allTasks = [...overdue, ...tasks];

  if (allTasks.length === 0) {
    return (
      <div className="space-y-2">
        <h3 className="text-white/60 text-xs uppercase tracking-wide">Tasks</h3>
        <p className="text-white/40 text-sm">No tasks for today</p>
      </div>
    );
  }

  const displayTasks = expanded ? allTasks : allTasks.slice(0, 3);

  // Check if a task is in the overdue array
  const isOverdue = (task: TaskSummary) =>
    overdue.some((t) => t.id === task.id);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-white/60 text-xs uppercase tracking-wide">Tasks</h3>
        {overdue.length > 0 && (
          <span className="text-red-400 text-xs">{overdue.length} overdue</span>
        )}
      </div>

      <ul className="space-y-1">
        {displayTasks.map((task) => {
          const taskIsOverdue = isOverdue(task);
          return (
            <li
              key={task.id}
              className="flex items-center gap-2 text-white/80 text-sm"
            >
              {taskIsOverdue && <PriorityIndicator type="overdue" />}
              {task.priority === 'high' && !taskIsOverdue && (
                <PriorityIndicator type="urgent" />
              )}
              <span className={taskIsOverdue ? 'text-red-300' : ''}>
                {task.title}
              </span>
            </li>
          );
        })}
      </ul>

      {!expanded && allTasks.length > 3 && (
        <p className="text-white/40 text-xs">
          +{allTasks.length - 3} more
        </p>
      )}
    </div>
  );
}
