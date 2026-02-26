'use client';

import { ContentContainer } from '@/components/jarvis/layout';
import { Card } from '@/components/jarvis/primitives';

export default function PersonalPage() {
  return (
    <ContentContainer>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-white/90">Personal</h1>
          <p className="text-sm text-white/60 mt-1">Life management dashboard</p>
        </div>

        <Card variant="glass" padding="md">
          <p className="text-sm text-white/70 leading-relaxed">
            Tasks, habits, bills, calendar, and more coming in the next wave.
          </p>
        </Card>
      </div>
    </ContentContainer>
  );
}
