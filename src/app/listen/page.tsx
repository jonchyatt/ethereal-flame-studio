import { Listening } from '@/components/site/Listening';
import { pageMetadata } from '@/lib/site/metadata';
import { ScrollPage } from '@/components/site/scrollcraft/ScrollPage';
export const metadata = pageMetadata(
  'Listen',
  '/listen',
  'Three original appreciation moments, starting with Put one hand on your chest.',
);
export default async function ListenPage({
  searchParams,
}: {
  searchParams: Promise<{ clip?: string }>;
}) {
  const { clip } = await searchParams;
  return (
    <ScrollPage name="listen">
      <Listening initialId={clip} />
    </ScrollPage>
  );
}
