import { WaiaFooter } from '@/components/WaiaFooter';
import { ListenPlayer } from '@/components/ListenPlayer';
import { EmailSignup } from '@/components/EmailSignup';
import { NAV_LINK_STYLE } from '@/app/legal/LegalLinks';

export const metadata = {
  title: 'Listen · What Am I Appreciating Now',
  description: 'A gentle ten-minute guided practice, voiced by Jonathan Hyatt.',
  alternates: { canonical: 'https://www.whatamiappreciatingnow.com/listen' },
};

const AUDIO = '/samples/gentle-reset-listen.m4a';

export default function ListenPage() {
  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: '48px 16px', color: '#f3ead7' }}>
      <h1 style={{ fontSize: 28, marginBottom: 12 }}>A Gentle Reset: Making Peace with Food</h1>
      <p style={{ fontSize: 18, marginBottom: 24 }}>
        A ten-minute guided practice, voiced by Jonathan Hyatt. Sit down, press play, close your eyes.
      </p>
      <ListenPlayer src={AUDIO} />
      <h2 style={{ fontSize: 22, margin: '32px 0 8px' }}>Get more sessions by email</h2>
      <p style={{ fontSize: 16, margin: '0 0 8px' }}>Type your email address below and press Tell me when. We will email you when the next session is ready.</p>
      <EmailSignup />
      <p style={{ fontSize: 14, opacity: 0.7, marginTop: 24 }}>
        Not medical advice or therapy. Do not listen while driving, operating machinery, or anywhere you need to stay alert. Voice: Jonathan Hyatt, generated from his own recordings with an AI voice clone.
        Words: Reset Biology, &ldquo;Reset Your Relationship with Food&rdquo;.
      </p>
      <p style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 24 }}><a href="/" style={{ ...NAV_LINK_STYLE, boxSizing: 'border-box', color: '#cf9d4f' }}>Back to home</a><a href="/programs/advanced-hypnosis-sessions" style={{ ...NAV_LINK_STYLE, boxSizing: 'border-box', color: '#cf9d4f' }}>The video version</a><a href="/programs" style={{ ...NAV_LINK_STYLE, boxSizing: 'border-box', color: '#cf9d4f' }}>Programs</a><a href="/store" style={{ ...NAV_LINK_STYLE, boxSizing: 'border-box', color: '#cf9d4f' }}>Store</a></p>
      <WaiaFooter />
    </main>
  );
}
