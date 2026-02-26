'use client';

import Link from 'next/link';
import { ContentContainer } from '@/components/jarvis/layout';
import { HealthView } from '@/components/jarvis/personal/HealthView';

export default function HealthPage() {
  return (
    <ContentContainer>
      <Link href="/jarvis/app/personal" className="text-sm text-violet-400 hover:text-violet-300 mb-4 inline-block">
        &larr; Personal
      </Link>
      <HealthView />
    </ContentContainer>
  );
}
