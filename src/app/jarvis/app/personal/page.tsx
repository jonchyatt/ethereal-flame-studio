'use client';

import { ContentContainer } from '@/components/jarvis/layout';
import { PersonalDashboard } from '@/components/jarvis/personal/PersonalDashboard';

export default function PersonalPage() {
  return (
    <ContentContainer>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-white/90">Personal</h1>
          <p className="text-sm text-white/60 mt-1">Your life at a glance</p>
        </div>
        <PersonalDashboard />
      </div>
    </ContentContainer>
  );
}
