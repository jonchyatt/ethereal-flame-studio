'use client';
import { ScrollPage } from '@/components/site/scrollcraft/ScrollPage';
import '@/components/site/scrollcraft/commerce.css';

import { useEffect, useRef, useState } from 'react';
import { ClipPlayer, ClipCredits } from '@/components/site/MediaPlayer';
import { clips } from '@/lib/site/content';
type View = {
  id: string;
  kind: string;
  details: string;
  status: string;
  updatedAt: string;
};
const labels: Record<string, string> = {
  received: 'Received',
  in_review: 'Being read',
  quoted: 'Ready to discuss',
  accepted: 'Accepted',
  declined: 'Declined',
  closed: 'Closed',
};
export default function CustomOrder() {
  const [reference, setReference] = useState('');
  const [view, setView] = useState<View | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [hasReference, setHasReference] = useState(false);
  const results = useRef<HTMLDivElement>(null);
  const requestNumber = useRef(0);
  async function load(ref: string) {
    const request = ++requestNumber.current;
    setBusy(true);
    setMessage('');
    setView(null);
    try {
      const response = await fetch(
        `/api/custom-orders/${encodeURIComponent(ref.split('.')[0])}?t=${encodeURIComponent(ref)}`,
      );
      const data = await response.json();
      if (request !== requestNumber.current) return;
      if (response.ok && data.order) setView(data.order);
      else
        setMessage(
          response.status === 404
            ? 'No request found. Check the whole reference and try again.'
            : 'We could not check that right now. Your reference is still here; try again.',
        );
    } catch {
      if (request === requestNumber.current)
        setMessage(
          'We could not connect. Your reference is still here; try again.',
        );
    } finally {
      if (request === requestNumber.current) {
        setBusy(false);
        results.current?.focus();
      }
    }
  }
  useEffect(() => {
    const ref = new URLSearchParams(location.hash.slice(1)).get('ref');
    if (ref) {
      setReference(ref);
      setHasReference(true);
      void load(ref);
      setTimeout(
        () => document.getElementById('lookup')?.scrollIntoView(),
        100,
      );
    }
  }, []);
  return (
    <ScrollPage name="custom-order">
      {!hasReference && (
        <>
          <section className="custom-hero" data-sc-act="example" data-sc-flow>
            <div className="custom-copy">
              <p className="eyebrow">Start with an idea</p>
              <h1>A session made for you</h1>
              <p className="lead">
                A voice, a theme, a moment to return to. Tell us what you have
                in mind.
              </p>
              <div className="actions">
                <a className="button primary" href="/store/custom-order/brief">
                  Describe a session
                </a>
                <a className="button" href="#lookup">
                  Check my request
                </a>
              </div>
              <p className="meta">Sending a brief does not take payment.</p>
            </div>
            <div className="custom-example">
              <ClipPlayer clip={clips[0]} />
              <p className="meta">
                Put one hand on your chest · 0:41
                <br />
                Original appreciation style example
              </p>
            </div>
          </section>
          <section className="section" data-sc-act="process" data-sc-flow>
            <h2>From a thought to a shared brief</h2>
            <div className="three-grid">
              <article className="quiet-panel">
                <h3>Describe</h3>
                <p>
                  Share the theme, format and preferences you would like
                  considered. The form records a request.
                </p>
              </article>
              <article className="quiet-panel">
                <h3>Discuss</h3>
                <p>
                  Keep your private reference to check the response.
                  Feasibility, scope, timing and revisions need agreement before
                  work begins.
                </p>
              </article>
              <article className="quiet-panel">
                <h3>Review</h3>
                <p>
                  Any delivery plan is confirmed with you. This sample is
                  original studio work, not a completed client commission or a
                  headset-ready custom delivery.
                </p>
              </article>
            </div>
            <ClipCredits clip={clips[0]} />
          </section>
        </>
      )}
      <section
        className={hasReference ? 'quiet-panel' : 'section quiet-panel'}
        id="lookup" data-sc-act="lookup" data-sc-flow
      >
        {hasReference ? <h1>Your session request</h1> : <h2>Already have a reference?</h2>}
        <p>
          Use the complete private reference you received after sending your
          brief.
        </p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void load(reference.trim());
          }}
          aria-busy={busy}
        >
          <label htmlFor="request-reference">Your reference</label>
          <div className="signup-row">
            <input
              id="request-reference"
              required
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              autoComplete="off"
              spellCheck={false}
              style={{ border: '1px solid #8c8c9e' }}
            />
            <button type="submit" disabled={busy}>
              {busy ? 'Checking…' : 'Look up'}
            </button>
          </div>
        </form>
        <div ref={results} tabIndex={-1} aria-live="polite">
          {message && (
            <p role="status" className="notice error">
              {message}
            </p>
          )}
          {view && (
            <section className="notice success" aria-label="Your request">
              <h3>{labels[view.status] || view.status}</h3>
              <p>
                {view.kind === 'vr'
                  ? 'Custom visual session request'
                  : 'Custom audio session request'}
              </p>
              <p>{view.details}</p>
              <p className="meta">
                Reference: <code>{reference}</code>
              </p>
              <p>
                Keep this reference to return to your request. Any contact
                details you supplied remain private.
              </p>
              <p>
                <a href="/support">Contact Support about this request →</a>
              </p>
            </section>
          )}
        </div>
        <a className="text-link" href="/store/custom-order/brief">
          Start a new request →
        </a>
      </section>
      <section className="section">
        <h2>Your words stay private</h2>
        <p>
          Your brief and any optional contact details are kept privately. Avoid
          including sensitive information you do not need to share.
        </p>
        <a className="text-link" href="/legal/privacy">
          Read the privacy policy →
        </a>
        <a className="text-link" href="/support" style={{ marginLeft: 16 }}>
          Lost your reference? Get help →
        </a>
      </section>
    </ScrollPage>
  );
}
