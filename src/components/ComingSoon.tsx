import { OPERATOR } from '@/app/legal/LegalLinks';

/**
 * Pre-launch state for anything that will be sold: a disabled "Coming soon" button and one
 * calibrated question (Voss/NEPQ house voice). No email capture exists on the site yet, so the
 * reply goes by mailto. ponytail: swap the mailto for a list signup when one exists.
 */
export function ComingSoon({
  id,
  item,
  question = 'What would you want the first session to help with?',
}: {
  id: string;
  item: string;
  question?: string;
}) {
  const href = `mailto:${OPERATOR.contact}?subject=${encodeURIComponent(`Tell me first: ${item}`)}&body=${encodeURIComponent(`${question}\n\n`)}`;
  return (
    <div style={{ margin: '16px 0' }}>
      <button
        type="button"
        disabled
        aria-describedby={`${id}-note`}
        style={{ padding: '12px 24px', fontSize: 16, borderRadius: 8, background: '#2a2a3a', color: '#d8d8e0', border: '1px solid #55556a', cursor: 'not-allowed' }}
      >
        Coming soon
      </button>
      <p id={`${id}-note`} style={{ fontSize: 15, marginTop: 8 }}>
        {question} <a href={href} style={{ color: '#9cf' }}>Leave your email</a> and you hear first.
      </p>
    </div>
  );
}
