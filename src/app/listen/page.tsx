import { redirect } from 'next/navigation';

// The old /listen page played the Reset Biology food-hypnosis sample, which is not
// this brand's front door (Conductor and Astra review, 2026-11-04). Old links land
// on the home page's own practices instead.
export default function ListenPage() {
  redirect('/#practices');
}
