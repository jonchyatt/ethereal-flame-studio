import { EmailSignup } from '@/components/EmailSignup';

/**
 * Pre-launch state for something that is not yet for sale. Visitors can join the
 * one shared email list instead of being sent to a mail client.
 */
export function ComingSoon({ question = 'What would you want the first session to help with?' }: {
  id: string;
  item: string;
  question?: string;
}) {
  return (
    <div style={{ margin: '16px 0' }}>
      <EmailSignup question={question} />
    </div>
  );
}
