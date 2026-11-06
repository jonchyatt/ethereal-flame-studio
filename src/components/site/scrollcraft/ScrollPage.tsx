import { ScrollExperience } from './ScrollExperience';
import './scrollcraft.css';

/** Explicit opt-in keeps each release confined to its reviewed route group. */
export function ScrollPage({ name, children, className = '' }: {
  name: string; children: React.ReactNode; className?: string;
}) {
  return (
    <main data-scroll-page={name} className={className}>
      <ScrollExperience />
      {children}
    </main>
  );
}
