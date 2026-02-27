'use client';

import { AlertCircle } from 'lucide-react';
import { ContentContainer } from '@/components/jarvis/layout';
import { Skeleton, EmptyState } from '@/components/jarvis/primitives';
import {
  PriorityStack,
  DomainHealthGrid,
  QuickActionsBar,
  WidgetZone,
  BriefingCard,
} from '@/components/jarvis/home';
import { AcademyProgress } from '@/components/jarvis/academy/AcademyProgress';
import { useHomeStore } from '@/lib/jarvis/stores/homeStore';
import { refetchJarvisData } from '@/lib/jarvis/hooks/useJarvisFetch';

function HomeLoading() {
  return (
    <div className="space-y-6 pb-8">
      <div>
        <Skeleton variant="text" width="160px" />
        <Skeleton variant="text" width="120px" className="mt-2" />
      </div>
      <section>
        <Skeleton variant="text" width="80px" height="12px" className="mb-3" />
        <div className="space-y-2">
          <Skeleton variant="list-item" />
          <Skeleton variant="list-item" />
          <Skeleton variant="list-item" />
        </div>
      </section>
      <section>
        <Skeleton variant="text" width="80px" height="12px" className="mb-3" />
        <Skeleton variant="card" />
      </section>
      <section>
        <Skeleton variant="text" width="100px" height="12px" className="mb-3" />
        <div className="flex gap-2">
          <Skeleton variant="list-item" width="120px" />
          <Skeleton variant="list-item" width="120px" />
          <Skeleton variant="list-item" width="120px" />
        </div>
      </section>
    </div>
  );
}

export default function HomePage() {
  const isLoading = useHomeStore((s) => s.isLoading);
  const fetchError = useHomeStore((s) => s.fetchError);

  if (isLoading) {
    return (
      <ContentContainer>
        <HomeLoading />
      </ContentContainer>
    );
  }

  if (fetchError) {
    return (
      <ContentContainer>
        <EmptyState
          icon={<AlertCircle className="w-12 h-12" />}
          title="Couldn't load your data"
          description={fetchError}
          actionLabel="Try again"
          onAction={() => refetchJarvisData()}
        />
      </ContentContainer>
    );
  }

  return (
    <ContentContainer>
      <div className="space-y-6 pb-8">
        {/* Heading */}
        <div>
          <h1 className="text-xl font-semibold text-white/90">Priority Home</h1>
          <p className="text-sm text-white/50 mt-1">Your command center</p>
        </div>

        {/* Priority Stack */}
        <section>
          <h2 className="text-xs uppercase tracking-wide text-white/40 mb-3">Priorities</h2>
          <PriorityStack />
        </section>

        {/* Domain Health Grid */}
        <section>
          <h2 className="text-xs uppercase tracking-wide text-white/40 mb-3">Domains</h2>
          <DomainHealthGrid />
        </section>

        {/* Quick Actions */}
        <section>
          <h2 className="text-xs uppercase tracking-wide text-white/40 mb-3">Quick Actions</h2>
          <QuickActionsBar />
        </section>

        {/* Academy */}
        <section>
          <h2 className="text-xs uppercase tracking-wide text-white/40 mb-3">Academy</h2>
          <AcademyProgress />
        </section>

        {/* Pinned Widgets */}
        <section>
          <h2 className="text-xs uppercase tracking-wide text-white/40 mb-3">Widgets</h2>
          <WidgetZone />
        </section>

        {/* Briefing */}
        <section>
          <h2 className="text-xs uppercase tracking-wide text-white/40 mb-3">Briefing</h2>
          <BriefingCard />
        </section>
      </div>
    </ContentContainer>
  );
}
