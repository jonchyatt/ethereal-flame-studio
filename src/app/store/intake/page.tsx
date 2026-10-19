import IntakeForm from './IntakeForm';

export default function IntakePage() {
  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: '48px 20px', color: '#eee', background: '#0b0b14', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Shelf intake</h1>
      <p>Paste one item per line. Each shows below exactly as visitors will see it. Nothing is sent or saved; this page only previews and prints lines for the shelf file.</p>
      <IntakeForm />
    </main>
  );
}
