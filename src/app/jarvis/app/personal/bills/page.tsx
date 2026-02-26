'use client';

import Link from 'next/link';
import { ContentContainer } from '@/components/jarvis/layout';
import { BillsList } from '@/components/jarvis/personal/BillsList';

export default function BillsPage() {
  return (
    <ContentContainer>
      <Link
        href="/jarvis/app/personal"
        className="text-sm text-violet-400 hover:text-violet-300 mb-4 inline-block"
      >
        &larr; Personal
      </Link>
      <h2 className="text-lg font-semibold text-white/90 mb-4">Bills &amp; Finance</h2>
      <BillsList />
    </ContentContainer>
  );
}
