'use client';

import { ContentContainer } from '@/components/jarvis/layout';
import { Card } from '@/components/jarvis/primitives';

export default function HomePage() {
  return (
    <ContentContainer>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-white/90">Priority Home</h1>
          <p className="text-sm text-white/60 mt-1">Your command center</p>
        </div>

        <Card variant="glass" padding="md">
          <p className="text-sm text-white/70 leading-relaxed">
            Priority stack, domain health grid, and widgets will appear here.
          </p>
        </Card>

        <Card variant="default" padding="md" statusStripe="info">
          <p className="text-xs uppercase tracking-wide text-white/60 font-medium mb-2">
            Build Wave 1
          </p>
          <p className="text-sm text-white/70 leading-relaxed">
            Shell foundation is live. Home screen content, widget system, and personal domain views coming next.
          </p>
        </Card>
      </div>
    </ContentContainer>
  );
}
