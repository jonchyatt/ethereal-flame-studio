import { HYPNOSIS_PROGRAM_ID } from '@/lib/hypnosis/catalog';
import PreviewIndex, { metadata } from '../../[id]/preview/page';

export { metadata };

// The static advanced-hypnosis-sessions route shadows /programs/[id]/preview (its [sessionId]
// would catch "preview"), so this renders the same A-D list for this program.
export default function HypnosisPreviewIndex() {
  return PreviewIndex({ params: Promise.resolve({ id: HYPNOSIS_PROGRAM_ID }) });
}
