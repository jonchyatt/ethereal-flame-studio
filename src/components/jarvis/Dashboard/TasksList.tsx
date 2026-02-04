'use client';

import { useState } from 'react';
import { PriorityIndicator } from '../PriorityIndicator';
import { useDashboardStore } from '@/lib/jarvis/stores/dashboardStore';
import { fetchJarvisAPI } from '@/lib/jarvis/api/fetchWithAuth';
import type { TaskSummary } from '@/lib/jarvis/executive/types';

interface TasksListProps {
  tasks: TaskSummary[];
  overdue: TaskSummary[];
  loading: boolean;
  expanded: boolean;
}

export function TasksList({ tasks, overdue, loading, expanded }: TasksListProps) {
  const [updatingTasks, setUpdatingTasks] = useState<Set<string>>(new Set());
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);
  const triggerRefresh = useDashboardStore((s) => s.triggerRefresh);

  const handleToggleComplete = async (task: TaskSummary) => {
    if (updatingTasks.has(task.id)) return;

    // Optimistically update UI
    setUpdatingTasks((prev) => new Set(prev).add(task.id));
    const isCompleting = !completedTasks.has(task.id);

    if (isCompleting) {
      setCompletedTasks((prev) => new Set(prev).add(task.id));
    } else {
      setCompletedTasks((prev) => {
        const next = new Set(prev);
        next.delete(task.id);
        return next;
      });
    }

    try {
      const response = await fetchJarvisAPI('/api/jarvis/task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: task.id,
          status: isCompleting ? 'completed' : 'pending',
        }),
      });

      if (!response.ok) {
        // Revert on error
        if (isCompleting) {
          setCompletedTasks((prev) => {
            const next = new Set(prev);
            next.delete(task.id);
            return next;
          });
        } else {
          setCompletedTasks((prev) => new Set(prev).add(task.id));
        }
        console.error('[TasksList] Failed to update task');
      } else {
        // Trigger dashboard refresh after successful update
        setTimeout(() => triggerRefresh(), 500);
      }
    } catch (error) {
      console.error('[TasksList] Error updating task:', error);
      // Revert on error
      if (isCompleting) {
        setCompletedTasks((prev) => {
          const next = new Set(prev);
          next.delete(task.id);
          return next;
        });
      } else {
        setCompletedTasks((prev) => new Set(prev).add(task.id));
      }
    } finally {
      setUpdatingTasks((prev) => {
        const next = new Set(prev);
        next.delete(task.id);
        return next;
      });
    }
  };

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

  // Filter out completed tasks from display (they'll be removed on refresh)
  const visibleTasks = allTasks.filter((t) => !completedTasks.has(t.id));
  const displayLimit = expanded ? 10 : (showAll ? visibleTasks.length : 5);
  const displayTasks = visibleTasks.slice(0, displayLimit);
  const hasMore = visibleTasks.length > displayLimit;

  // Check if a task is in the overdue array
  const isOverdue = (task: TaskSummary) =>
    overdue.some((t) => t.id === task.id);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-white/60 text-xs uppercase tracking-wide">Tasks</h3>
        <div className="flex items-center gap-2">
          {completedTasks.size > 0 && (
            <span className="text-green-400 text-xs">{completedTasks.size} done</span>
          )}
          {overdue.length > 0 && (
            <span className="text-red-400 text-xs">{overdue.length} overdue</span>
          )}
        </div>
      </div>

      <ul className="space-y-1">
        {displayTasks.map((task) => {
          const taskIsOverdue = isOverdue(task);
          const isUpdating = updatingTasks.has(task.id);
          const isCompleted = completedTasks.has(task.id);

          return (
            <li
              key={task.id}
              className={`flex items-center gap-2 text-sm py-1.5 px-2 -mx-2 rounded-lg transition-all cursor-pointer select-none
                ${isUpdating ? 'opacity-50' : 'hover:bg-white/5 active:bg-white/10'}
                ${isCompleted ? 'opacity-40' : ''}
              `}
              onClick={() => handleToggleComplete(task)}
            >
              {/* Checkbox */}
              <div
                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors
                  ${isCompleted
                    ? 'bg-green-500 border-green-500'
                    : taskIsOverdue
                      ? 'border-red-400/60'
                      : 'border-white/30'
                  }
                `}
              >
                {isCompleted && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {isUpdating && !isCompleted && (
                  <div className="w-3 h-3 border-2 border-white/50 border-t-transparent rounded-full animate-spin" />
                )}
              </div>

              {/* Priority indicator */}
              {taskIsOverdue && !isCompleted && <PriorityIndicator type="overdue" />}
              {task.priority === 'high' && !taskIsOverdue && !isCompleted && (
                <PriorityIndicator type="urgent" />
              )}

              {/* Task title */}
              <span
                className={`flex-1 ${
                  isCompleted
                    ? 'line-through text-white/40'
                    : taskIsOverdue
                      ? 'text-red-300'
                      : 'text-white/80'
                }`}
              >
                {task.title}
              </span>
            </li>
          );
        })}
      </ul>

      {/* Show more/less toggle */}
      {(hasMore || showAll) && !expanded && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="text-cyan-400/80 text-xs hover:text-cyan-300 transition-colors"
        >
          {showAll ? 'Show less' : `Show all ${visibleTasks.length} tasks`}
        </button>
      )}

      {expanded && visibleTasks.length > 10 && (
        <p className="text-white/40 text-xs">
          +{visibleTasks.length - 10} more tasks
        </p>
      )}
    </div>
  );
}
