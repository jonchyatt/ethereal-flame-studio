export const metadata = {
  title: 'Listen · What Am I Appreciating Now',
  description: 'A gentle ten-minute guided practice, voiced by Jonathan Hyatt.',
};

const AUDIO = '/samples/gentle-reset-listen.m4a';

export default function ListenPage() {
  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: '48px 16px', color: '#f3ead7' }}>
      <h1 style={{ fontSize: 28, marginBottom: 12 }}>A Gentle Reset: Making Peace with Food</h1>
      <p style={{ fontSize: 18, marginBottom: 24 }}>
        A ten-minute guided practice in Jonathan&rsquo;s voice. Sit down, press play, close your eyes.
      </p>
      <audio controls autoPlay={false} preload="metadata" src={AUDIO} style={{ width: '100%' }} aria-label="A Gentle Reset, guided audio" />
      <p style={{ fontSize: 14, opacity: 0.7, marginTop: 24 }}>
        Not medical advice or therapy. Voice: Jonathan Hyatt&rsquo;s own, rendered from his recordings with a voice clone.
        Words: Reset Biology, &ldquo;Reset Your Relationship with Food&rdquo;.
      </p>
      <p style={{ marginTop: 24 }}><a href="/" style={{ color: '#cf9d4f' }}>Back to home</a> · <a href="/programs/advanced-hypnosis-sessions" style={{ color: '#cf9d4f' }}>The video version</a></p>
    </main>
  );
}
