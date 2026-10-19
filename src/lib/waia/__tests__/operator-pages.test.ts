import { operatorPageDecision } from '../operator-pages';

const WWW = 'www.whatamiappreciatingnow.com';
const basic = (pw: string) => `Basic ${Buffer.from(`jon:${pw}`).toString('base64')}`;
const PAGES = ['/operator/custom-orders', '/approval-queue', '/creator', '/creator/library', '/pipeline', '/local-agents', '/store/intake', '/store/prices/preview', '/jarvis', '/jarvis/app'];

describe('operatorPageDecision', () => {
  it('answers 404 for every operator page when no key is configured (production)', () => {
    for (const p of PAGES) expect(operatorPageDecision(WWW, p, null, undefined, false)).toBe('not-found');
    for (const p of PAGES) expect(operatorPageDecision(WWW, p, null, '  ', false)).toBe('not-found');
  });

  it('asks for the key when one is configured, and lets the right key in', () => {
    for (const p of PAGES) {
      expect(operatorPageDecision(WWW, p, null, 'k3y', false)).toBe('challenge');
      expect(operatorPageDecision(WWW, p, basic('wrong'), 'k3y', false)).toBe('challenge');
      expect(operatorPageDecision(WWW, p, 'Bearer k3y', 'k3y', false)).toBe('challenge');
      expect(operatorPageDecision(WWW, p, 'Basic !!notbase64', 'k3y', false)).toBe('challenge');
      expect(operatorPageDecision(WWW, p, basic('k3y'), 'k3y', false)).toBe('allow');
    }
  });

  it('leaves public pages, look-alike paths and the jarvis host alone', () => {
    for (const p of ['/', '/store', '/programs', '/create', '/creators', '/store/custom-order', '/studio', '/legal/terms']) {
      expect(operatorPageDecision(WWW, p, null, undefined, false)).toBe('allow');
    }
    expect(operatorPageDecision('jarvis.whatamiappreciatingnow.com', '/jarvis/app', null, undefined, false)).toBe('allow');
  });

  it('keeps local dev open when no key is set', () => {
    expect(operatorPageDecision('localhost:3000', '/pipeline', null, undefined, true)).toBe('allow');
  });
});
