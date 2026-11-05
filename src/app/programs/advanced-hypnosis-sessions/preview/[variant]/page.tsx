import { HYPNOSIS_PROGRAM_ID } from '@/lib/hypnosis/catalog';
import SalesPagePreview, { generateMetadata as previewMetadata } from '../../../[id]/preview/[variant]/page';

export const dynamic = 'force-dynamic';

type Params = Promise<{ variant: string }>;
const withId = async (params: Params) => ({ ...(await params), id: HYPNOSIS_PROGRAM_ID });

// Same reason as ../page.tsx: the static route shadows /programs/[id]/preview/[variant].
export function generateMetadata({ params }: { params: Params }) {
  return previewMetadata({ params: withId(params) });
}

export default function HypnosisSalesPagePreview({ params }: { params: Params }) {
  return SalesPagePreview({ params: withId(params) });
}
