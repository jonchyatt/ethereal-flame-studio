'use client';

import { useMemo } from 'react';
import { Check } from 'lucide-react';
import { Card } from '@/components/jarvis/primitives';
import { usePersonalStore, type PersonalTask } from '@/lib/jarvis/stores/personalStore';

const TODAY = '2026-02-26';
const PRIORITY_ORDER: Record<PersonalTask['priority'], number> = { high: 0, medium: 1, low: 2 };
const PRIORITY_DOT: Record<PersonalTask['priority'], string> = {
  high: 'bg-amber-400',
  medium: 'bg-blue-400',
  low: 'bg-zinc-600',
};

function formatDate(date: string) {
  const d = new Date(date + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function sortByPriority(tasks: PersonalTask[]) {
  return [...tasks].sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
}

// ── Task Row ────────────────────────────────────────────────────────────────

function TaskRow({
  task,
  onToggle,
  isLast,
  checkboxTutorialId,
}: {
  task: PersonalTask;
  onToggle: (id: string) => void;
  isLast: boolean;
  checkboxTutorialId?: string;
}) {
  return (
    <div className={`flex items-center gap-3 py-2.5 px-1 ${!isLast ? 'border-b border-white/5' : ''}`}>
      <button
        onClick={() => onToggle(task.id)}
        className="task-check flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center"
        data-tutorial-id={checkboxTutorialId}
        style={{
          borderColor: task.completed ? 'rgb(139 92 246)' : 'rgba(255,255,255,0.2)',
          backgroundColor: task.completed ? 'rgb(139 92 246)' : 'transparent',
        }}
      >
        <Check
          size={14}
          className="text-white task-check-icon"
          style={{ transform: task.completed ? 'scale(1)' : 'scale(0)' }}
        />
      </button>

      <div className="flex-1 min-w-0">
        <p
          className="task-row-text text-sm truncate"
          style={{
            color: task.completed ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.9)',
            textDecoration: task.completed ? 'line-through' : 'none',
          }}
        >
          {task.title}
        </p>
        {task.project && <p className="text-xs text-white/30">{task.project}</p>}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={`w-2 h-2 rounded-full ${PRIORITY_DOT[task.priority]}`} />
        <span className="text-xs text-white/30">{formatDate(task.dueDate)}</span>
      </div>
    </div>
  );
}

// ── Tasks List ──────────────────────────────────────────────────────────────

export function TasksList() {
  const tasks = usePersonalStore((s) => s.tasks);
  const toggleTask = usePersonalStore((s) => s.toggleTask);

  const groups = useMemo(() => {
    const overdue = sortByPriority(tasks.filter((t) => !t.completed && t.overdue));
    const dueToday = sortByPriority(
      tasks.filter((t) => !t.completed && !t.overdue && t.dueDate === TODAY),
    );
    const upcoming = sortByPriority(
      tasks.filter((t) => !t.completed && !t.overdue && t.dueDate > TODAY),
    );
    const completed = tasks.filter((t) => t.completed);
    return { overdue, dueToday, upcoming, completed };
  }, [tasks]);

  type SectionStyle = 'overdue' | 'today' | 'upcoming' | 'completed';
  const sections = useMemo(() => {
    const result: { key: string; label: string; tasks: PersonalTask[]; style: SectionStyle }[] = [];
    if (groups.overdue.length > 0)
      result.push({ key: 'overdue', label: 'OVERDUE', tasks: groups.overdue, style: 'overdue' });
    if (groups.dueToday.length > 0)
      result.push({ key: 'today', label: 'DUE TODAY', tasks: groups.dueToday, style: 'today' });
    if (groups.upcoming.length > 0)
      result.push({ key: 'upcoming', label: 'UPCOMING', tasks: groups.upcoming, style: 'upcoming' });
    if (groups.completed.length > 0)
      result.push({
        key: 'completed',
        label: `COMPLETED \u00B7 ${groups.completed.length}`,
        tasks: groups.completed,
        style: 'completed',
      });
    return result;
  }, [groups]);

  const sectionHeader: Record<SectionStyle, string> = {
    overdue: 'text-xs uppercase tracking-wider text-red-400/70 mb-2',
    today: 'text-xs uppercase tracking-wider text-amber-400/70 mb-2 px-1',
    upcoming: 'text-xs uppercase tracking-wider text-white/30 mb-2 px-1',
    completed: 'text-xs text-white/20 mb-2 px-1',
  };

  return (
    <>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .task-section-enter { animation: fadeInUp 400ms ease-out both; }
        .task-check { transition: all 200ms cubic-bezier(0.34, 1.56, 0.64, 1); }
        .task-check-icon { transition: transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1); }
        .task-row-text { transition: all 300ms ease; }
      `}</style>

      {/* Summary Hero */}
      <Card variant="glass" padding="md" className="task-section-enter mb-4" data-tutorial-id="tasks-summary">
        <div className="flex items-center gap-3 flex-wrap">
          {groups.overdue.length > 0 && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-red-400/10 text-red-400 border border-red-400/20">
              {groups.overdue.length} overdue
            </span>
          )}
          <span className="text-xs px-2.5 py-1 rounded-full bg-amber-400/10 text-amber-400 border border-amber-400/20">
            {groups.dueToday.length} due today
          </span>
          <span className="text-xs px-2.5 py-1 rounded-full bg-white/5 text-white/50 border border-white/10">
            {groups.upcoming.length} upcoming
          </span>
        </div>
      </Card>

      {/* Sections */}
      <div className="space-y-3">
        {(() => { let firstCheckboxTagged = false; return sections.map((section, sectionIndex) => {
          const rows = section.tasks.map((task, i) => {
            let checkboxId: string | undefined;
            if (!task.completed && !firstCheckboxTagged) {
              checkboxId = 'tasks-first-checkbox';
              firstCheckboxTagged = true;
            }
            return (
            <TaskRow
              key={task.id}
              task={task}
              onToggle={toggleTask}
              isLast={i === section.tasks.length - 1}
              checkboxTutorialId={checkboxId}
            />
          ); });

          return (
            <div
              key={section.key}
              className="task-section-enter"
              style={{ animationDelay: `${(sectionIndex + 1) * 80}ms` }}
            >
              {section.style === 'overdue' ? (
                <div className="rounded-xl bg-red-400/5 border border-red-400/10 p-3">
                  <p className={sectionHeader.overdue}>{section.label}</p>
                  {rows}
                </div>
              ) : (
                <Card
                  variant="glass"
                  padding="sm"
                  className={section.style === 'completed' ? 'opacity-40' : ''}
                >
                  <p className={sectionHeader[section.style]}>{section.label}</p>
                  {rows}
                </Card>
              )}
            </div>
          );
        }); })()}
      </div>
    </>
  );
}
