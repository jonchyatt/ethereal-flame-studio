'use client';

import { ContentContainer } from '@/components/jarvis/layout';
import { Card } from '@/components/jarvis/primitives';

export default function SettingsPage() {
  return (
    <ContentContainer>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-white/90">Settings</h1>
          <p className="text-sm text-white/60 mt-1">Configure your experience</p>
        </div>

        <Card variant="glass" padding="md">
          <p className="text-sm text-white/70 leading-relaxed">
            Feature toggles, notification preferences, and account settings.
          </p>
        </Card>
      </div>
    </ContentContainer>
  );
}
