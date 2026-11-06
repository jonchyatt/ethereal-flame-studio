import { ScrollPage } from './ScrollPage';
import './utility.css';

type UtilityName = 'patrons' | 'patrons-join' | 'patrons-remove' | 'programs-manage' | 'support' | 'email-preferences';

/** Compact tasks use the same action dock without adding a fabricated scroll story. */
export function UtilityPage({ name, children }: { name: UtilityName; children: React.ReactNode }) {
  return <ScrollPage name={name} className="sc-utility">{children}</ScrollPage>;
}
