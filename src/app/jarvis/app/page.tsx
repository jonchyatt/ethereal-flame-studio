'use client';

import { ContentContainer } from '@/components/jarvis/layout';
import {
  PriorityStack,
  DomainHealthGrid,
  QuickActionsBar,
  WidgetZone,
  BriefingCard,
} from '@/components/jarvis/home';

export default function HomePage() {
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
