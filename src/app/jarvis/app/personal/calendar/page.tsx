'use client';

import Link from 'next/link';
import { ContentContainer } from '@/components/jarvis/layout';
import { CalendarView } from '@/components/jarvis/personal/CalendarView';

export default function CalendarPage() {
  return (
    <ContentContainer>
      <Link href="/jarvis/app/personal" className="text-sm text-violet-400 hover:text-violet-300 mb-4 inline-block">
        &larr; Personal
      </Link>
      <CalendarView />
    </ContentContainer>
  );
}
