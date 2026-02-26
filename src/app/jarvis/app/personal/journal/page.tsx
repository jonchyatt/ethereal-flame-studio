'use client';

import Link from 'next/link';
import { ContentContainer } from '@/components/jarvis/layout';
import { JournalView } from '@/components/jarvis/personal/JournalView';

export default function JournalPage() {
  return (
    <ContentContainer>
      <Link href="/jarvis/app/personal" className="text-sm text-violet-400 hover:text-violet-300 mb-4 inline-block">
        &larr; Personal
      </Link>
      <JournalView />
    </ContentContainer>
  );
}
