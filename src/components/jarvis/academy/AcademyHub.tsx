'use client';

import { useMemo, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, GraduationCap, Play } from 'lucide-react';
import { ContentContainer } from '@/components/jarvis/layout';
import { Card } from '@/components/jarvis/primitives/Card';
import { Button } from '@/components/jarvis/primitives/Button';
import { LessonCard } from './LessonCard';
import { CurriculumTopicCard } from './CurriculumTopicCard';
import {
  getAllLessons,
  getSuggestedLesson,
  getLessonCount,
  TUTORIAL_TIERS,
} from '@/lib/jarvis/curriculum/tutorialLessons';
import { useTutorialStore, selectTotalCompleted } from '@/lib/jarvis/stores/tutorialStore';
import { useTutorialEngineContext } from '@/components/jarvis/layout/JarvisShell';
import {
  useAcademyStore,
  selectTotalAcademyCompleted,
  getTotalAcademyTopics,
  getNextSuggested,
  type TopicProgress,
} from '@/lib/jarvis/stores/academyStore';
import { getAllProjects } from '@/lib/jarvis/academy/projects';
import { useChatStore } from '@/lib/jarvis/stores/chatStore';

// ── Progress Ring ─────────────────────────────────────────────────────────

function ProgressRing({
  completed,
  total,
  size = 40,
  stroke = 3,
}: {
  completed: number;
  total: number;
  size?: number;
  stroke?: number;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = total > 0 ? completed / total : 0;
  const offset = circumference * (1 - progress);

  return (
    <svg width={size} height={size} className="shrink-0 -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgb(39 39 42)"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={completed === total && total > 0 ? 'rgb(52 211 153)' : 'rgb(8 145 178)'}
        strokeWidth={stroke}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-700 ease-out"
      />
    </svg>
  );
}

// ── Academy Hub ───────────────────────────────────────────────────────────

export function AcademyHub() {
  const router = useRouter();

  // Tutorial state
  const tutorialProgress = useTutorialStore((s) => s.progress);
  const currentLesson = useTutorialStore((s) => s.currentLesson);
  const tutorialEngine = useTutorialEngineContext();
  const allLessons = useMemo(() => getAllLessons(), []);
  const { total: tutorialTotal } = useMemo(() => getLessonCount(), []);
  const suggestedLesson = useMemo(() => getSuggestedLesson(tutorialProgress), [tutorialProgress]);
  const tutorialCompleted = useTutorialStore(selectTotalCompleted);

  // Curriculum state
  const academyProgress = useAcademyStore((s) => s.progress);
  const isLoaded = useAcademyStore((s) => s.isLoaded);
  const loadProgress = useAcademyStore((s) => s.loadProgress);
  const markExplored = useAcademyStore((s) => s.markExplored);
  const academyCompleted = useAcademyStore(selectTotalAcademyCompleted);
  const academyTotal = useMemo(() => getTotalAcademyTopics(), []);

  const openWithMessage = useChatStore((s) => s.openWithMessage);

  // Load curriculum progress on every mount — server-side tool calls (academy_update_progress)
  // update the DB without the client knowing, so we must refetch when returning to this page.
  // isLoaded is only used for skeleton display, not as a fetch guard.
  useEffect(() => { loadProgress(); }, [loadProgress]);

  // Combined totals
  const totalCompleted = tutorialCompleted + academyCompleted;
  const totalItems = tutorialTotal + academyTotal;

  // Tab state
  const projects = useMemo(() => getAllProjects().filter(p => p.curriculum && p.curriculum.length > 0), []);
  const storeActiveProject = useAcademyStore((s) => s.activeProject);
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (storeActiveProject && projects.some(p => p.id === storeActiveProject)) {
      return storeActiveProject;
    }
    return 'tutorials';
  });

  // Group lessons by tier
  const lessonsByTier = useMemo(() => {
    const grouped: Record<number, typeof allLessons> = {};
    for (const lesson of allLessons) {
      if (!grouped[lesson.tier]) grouped[lesson.tier] = [];
      grouped[lesson.tier].push(lesson);
    }
    return grouped;
  }, [allLessons]);

  // Continue Learning — find the most relevant topic across all projects
  const continueLearning = useMemo(() => {
    // First pass: in-progress topics take priority across ALL projects
    for (const project of projects) {
      if (!project.curriculum) continue;
      const explored = project.curriculum.find(t =>
        academyProgress[`${project.id}:${t.id}`]?.status === 'explored'
      );
      if (explored) {
        return { topic: explored, project, isInProgress: true };
      }
    }
    // Second pass: next eligible topic (no in-progress topics exist)
    for (const project of projects) {
      if (!project.curriculum) continue;
      const next = getNextSuggested(project.id, project.curriculum, academyProgress);
      if (next) {
        return { topic: next, project, isInProgress: false };
      }
    }
    return null;
  }, [projects, academyProgress]);

  // Up-next chain (2 topics after current)
  const upNextChain = useMemo(() => {
    if (!continueLearning) return [];
    const { project, topic } = continueLearning;
    if (!project.curriculum) return [];

    const completedIds = new Set(
      Object.values(academyProgress)
        .filter(p => p.projectId === project.id && p.status === 'completed')
        .map(p => p.topicId)
    );
    // Add current topic as "completed" to find what comes after
    completedIds.add(topic.id);

    const eligible = project.curriculum.filter(t =>
      !completedIds.has(t.id) &&
      t.prerequisites.every(p => completedIds.has(p))
    ).sort((a, b) => a.difficulty - b.difficulty);

    return eligible.slice(0, 2);
  }, [continueLearning, academyProgress]);

  const handleStartLesson = useCallback(
    (lessonId: string) => {
      if (!tutorialEngine) return;
      const isResume = currentLesson === lessonId;
      if (tutorialEngine.isActive) tutorialEngine.exitTutorial();
      tutorialEngine.startLesson(lessonId);
      if (!isResume) router.push('/jarvis/app');
    },
    [tutorialEngine, currentLesson, router],
  );

  const handleLearnTopic = useCallback(
    (projectId: string, projectName: string, topicId: string, topicName: string) => {
      markExplored(projectId, topicId);
      openWithMessage(`Teach me about ${topicName} in ${projectName}`);
    },
    [markExplored, openWithMessage],
  );

  return (
    <ContentContainer>
      <style>{`
        @keyframes hubFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes topicFadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="space-y-6 pb-8">
        {/* Header */}
        <div
          style={{ animation: 'hubFadeIn 400ms ease both' }}
          className="flex items-start gap-4"
        >
          <button
            onClick={() => router.push('/jarvis/app')}
            className="mt-1 p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Back to home"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5">
              <GraduationCap className="w-6 h-6 text-cyan-400 shrink-0" />
              <h1 className="text-xl font-semibold text-white/90">Jarvis Academy</h1>
            </div>
            <p className="text-sm text-white/50 mt-1">
              {totalCompleted} of {totalItems} learned
            </p>
          </div>

          <ProgressRing completed={totalCompleted} total={totalItems} />
        </div>

        {/* Continue Learning */}
        {continueLearning && (
          <section style={{ animation: 'hubFadeIn 400ms ease both', animationDelay: '100ms' }}>
            <h2 className="text-xs uppercase tracking-wide text-white/40 mb-2">
              Continue Learning
            </h2>
            <Card variant="glass-interactive" padding="md" className="ring-1 ring-cyan-500/30">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs text-white/30">
                      {'\u2605'.repeat(continueLearning.topic.difficulty)}
                      {'\u2606'.repeat(5 - continueLearning.topic.difficulty)}
                    </span>
                    <span className="text-sm font-medium text-white/90">
                      {continueLearning.topic.name}
                    </span>
                  </div>
                  <p className="text-xs text-white/40">
                    {continueLearning.project.name}
                    {continueLearning.isInProgress ? ' \u00b7 In progress' : ''}
                  </p>
                  <p className="text-xs text-white/50 mt-1 line-clamp-2">
                    {continueLearning.topic.description}
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Play className="w-3 h-3" />}
                  onClick={() => handleLearnTopic(
                    continueLearning.project.id,
                    continueLearning.project.name,
                    continueLearning.topic.id,
                    continueLearning.topic.name,
                  )}
                >
                  {continueLearning.isInProgress ? 'Continue' : 'Start'}
                </Button>
              </div>
              {upNextChain.length > 0 && (
                <p className="text-xs text-white/30 mt-2">
                  Up next: {upNextChain.map(t => t.name).join(' \u2192 ')}
                </p>
              )}
            </Card>
          </section>
        )}

        {/* Tab Bar */}
        <div
          className="flex gap-2 overflow-x-auto pb-1 scrollbar-none"
          style={{ animation: 'hubFadeIn 400ms ease both', animationDelay: '150ms' }}
        >
          <button
            onClick={() => setActiveTab('tutorials')}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              activeTab === 'tutorials'
                ? 'bg-cyan-500/20 text-cyan-400'
                : 'bg-white/5 text-white/40 hover:text-white/60'
            }`}
          >
            Tutorials
          </button>
          {projects.map(p => (
            <button
              key={p.id}
              onClick={() => setActiveTab(p.id)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                activeTab === p.id
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : 'bg-white/5 text-white/40 hover:text-white/60'
              }`}
            >
              {p.name.split(' \u2014 ')[0]}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'tutorials' ? (
          // Tutorials tab — existing tier-based layout
          <>
            {Object.entries(lessonsByTier).map(([tierKey, lessons]) => {
              const tier = Number(tierKey);
              const tierMeta = TUTORIAL_TIERS[tier];
              if (!tierMeta) return null;

              return (
                <section
                  key={tier}
                  style={{
                    animation: 'hubFadeIn 400ms ease both',
                    animationDelay: `${200 + tier * 100}ms`,
                  }}
                >
                  <h2 className="text-xs uppercase tracking-wide text-white/40 mb-1">
                    {tierMeta.name}
                  </h2>
                  <p className="text-xs text-white/30 mb-3">{tierMeta.description}</p>

                  <div className="space-y-3">
                    {lessons.map((lesson, idx) => (
                      <LessonCard
                        key={lesson.id}
                        lesson={lesson}
                        completionRecord={tutorialProgress[lesson.id] ?? null}
                        isInProgress={currentLesson === lesson.id}
                        isSuggested={suggestedLesson?.id === lesson.id}
                        onStart={handleStartLesson}
                        index={idx}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </>
        ) : (
          // Project curriculum tab
          <ProjectCurriculumTab
            projectId={activeTab}
            projects={projects}
            academyProgress={academyProgress}
            isLoaded={isLoaded}
            onLearn={handleLearnTopic}
          />
        )}

        {/* All complete celebration */}
        {totalCompleted === totalItems && totalItems > 0 && (
          <div
            className="text-center py-6"
            style={{
              animation: 'hubFadeIn 400ms ease both',
              animationDelay: '400ms',
            }}
          >
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/20 mb-3">
              <GraduationCap className="w-6 h-6 text-emerald-400" />
            </div>
            <p className="text-sm font-medium text-emerald-400">
              All lessons complete!
            </p>
            <p className="text-xs text-white/40 mt-1">
              You&apos;ve mastered everything. More topics coming soon.
            </p>
          </div>
        )}
      </div>
    </ContentContainer>
  );
}

// ── Project Curriculum Tab ────────────────────────────────────────────────

function ProjectCurriculumTab({
  projectId,
  projects,
  academyProgress,
  isLoaded,
  onLearn,
}: {
  projectId: string;
  projects: ReturnType<typeof getAllProjects>;
  academyProgress: Record<string, TopicProgress>;
  isLoaded: boolean;
  onLearn: (projectId: string, projectName: string, topicId: string, topicName: string) => void;
}) {
  const project = projects.find(p => p.id === projectId);
  if (!project?.curriculum) return null;

  const completedTopicIds = new Set(
    Object.values(academyProgress)
      .filter(p => p.projectId === projectId && p.status === 'completed')
      .map(p => p.topicId)
  );

  const nextSuggested = getNextSuggested(projectId, project.curriculum, academyProgress);

  // Build topic name lookup for prerequisite display
  const topicNames = new Map<string, string>();
  for (const t of project.curriculum) topicNames.set(t.id, t.name);

  // Group topics by category
  const byCategory = new Map<string, typeof project.curriculum>();
  for (const topic of project.curriculum) {
    if (!byCategory.has(topic.category)) byCategory.set(topic.category, []);
    byCategory.get(topic.category)!.push(topic);
  }

  if (!isLoaded) {
    // Skeleton placeholders
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 rounded-xl bg-white/5 animate-pulse" />
        ))}
      </div>
    );
  }

  let globalIndex = 0;

  return (
    <>
      {Array.from(byCategory.entries()).map(([category, topics], catIdx) => (
        <section
          key={category}
          style={{
            animation: 'hubFadeIn 400ms ease both',
            animationDelay: `${200 + catIdx * 100}ms`,
          }}
        >
          <h2 className="text-xs uppercase tracking-wide text-white/40 mb-1">
            {category} ({topics.length})
          </h2>

          <div className="space-y-3 mt-3">
            {topics.map((topic) => {
              const key = `${projectId}:${topic.id}`;
              const progress = academyProgress[key] || null;
              const isLocked = !topic.prerequisites.every(p => completedTopicIds.has(p));
              const isNext = nextSuggested?.id === topic.id;
              const idx = globalIndex++;

              return (
                <CurriculumTopicCard
                  key={topic.id}
                  topic={topic}
                  progress={progress}
                  isLocked={isLocked}
                  isNextSuggested={isNext}
                  topicNames={topicNames}
                  onLearn={(topicId, topicName) => onLearn(projectId, project.name, topicId, topicName)}
                  index={idx}
                />
              );
            })}
          </div>
        </section>
      ))}
    </>
  );
}
