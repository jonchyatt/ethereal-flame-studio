'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useId, useRef, useState } from 'react';

/** `tag` marks which program or product the visitor asked to hear about; it is saved with the source page (`?notify=<tag>`). */
export function EmailSignup({ question, tag, heading }: { question?: string; tag?: string; heading?: string }) {
  const pathname = usePathname() || '/';
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'saved' | 'error'>(
    'idle',
  );
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!input.current?.validity.valid) {
      setMessage('Enter a valid email address, such as you@example.com.');
      setState('error');
      input.current?.focus();
      return;
    }
    const website = new FormData(event.currentTarget).get('website');
    setState('busy');
    setMessage('');
    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, sourcePage: tag ? `${pathname}?notify=${encodeURIComponent(tag)}` : pathname, website }),
      });
      const result = await response.json().catch(() => ({}));
      if (response.ok && result.ok) {
        setState('saved');
        setMessage(result.message || 'Thanks — you’re on the list.');
        setEmail('');
      } else {
        setState('error');
        setMessage(
          result.error ||
            'We could not save that right now. Please try again shortly.',
        );
      }
    } catch {
      setState('error');
      setMessage(
        'We could not save that right now. Your address is still here; please try again.',
      );
    }
  }
  return (
    <section className="signup" aria-labelledby={`${id}-heading`}>
      <h2 id={`${id}-heading`}>{heading || 'A new moment, when it’s ready'}</h2>
      <p>{question || 'Get a note when a new session is released.'}</p>
      <form
        onSubmit={submit}
        noValidate
        data-email-signup
        aria-busy={state === 'busy'}
      >
        <label htmlFor={id}>Email address</label>
        <div className="signup-row">
          <input
            ref={input}
            id={id}
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            aria-invalid={state === 'error'}
            aria-describedby={`${id}-message ${id}-privacy`}
          />
          <button type="submit" disabled={state === 'busy'}>
            {state === 'busy' ? 'Joining…' : 'Tell me when'}
          </button>
        </div>
        <div aria-hidden="true" className="honeypot">
          <label>
            Leave this empty
            <input name="website" tabIndex={-1} autoComplete="off" />
          </label>
        </div>
        <p className="meta" id={`${id}-privacy`}>
          New-session updates only. Unsubscribe anytime using the link in each
          update. <Link href="/legal/privacy">Privacy</Link>
        </p>
        <p
          role="status"
          aria-live="polite"
          id={`${id}-message`}
          className={`form-message ${state === 'error' ? 'error' : ''}`}
        >
          {message}
        </p>
      </form>
    </section>
  );
}
