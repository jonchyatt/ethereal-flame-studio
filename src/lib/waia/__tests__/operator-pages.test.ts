import { operatorPageDecision } from '../operator-pages';

const WWW = 'www.whatamiappreciatingnow.com';
const basic = (pw: string) => `Basic ${Buffer.from(`jon:${pw}`).toString('base64')}`;
const PAGES = ['/operator/custom-orders', '/approval-queue', '/creator', '/creator/library', '/pipeline', '/local-agents', '/store/intake', '/store/prices/preview', '/programs/belief-lock-in/preview', '/programs/belief-lock-in/preview/d', '/programs/advanced-hypnosis-sessions/preview', '/jarvis', '/jarvis/app',
  // case, percent-encoding and doubled-slash variants the live site also serves (Programs Bot, PR #73 review)
  '/PROGRAMS/belief-lock-in/preview/d', '/programs/belief-lock-in/Preview/d', '/Programs/advanced-hypnosis-sessions/preview', '/programs/belief-lock-in/%70review/d', '/store/prices/%70review', '/%6Fperator/custom-orders', '//operator/custom-orders', '/STUDIO'];

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
    for (const p of ['/', '/store', '/programs', '/listen', '/creators', '/store/custom-order', '/legal/terms', '/programs/belief-lock-in', '/programs/previewer']) {
      expect(operatorPageDecision(WWW, p, null, undefined, false)).toBe('allow');
    }
    expect(operatorPageDecision('jarvis.whatamiappreciatingnow.com', '/jarvis/app', null, undefined, false)).toBe('allow');
  });

  it('hides the Studio and render tools from the public site but not from localhost', () => {
    for (const p of ['/studio', '/create', '/batch', '/playlist-batches']) {
      expect(operatorPageDecision(WWW, p, null, undefined, false)).toBe('not-found');
      expect(operatorPageDecision(WWW, p, basic('k3y'), 'k3y', false)).toBe('allow');
      expect(operatorPageDecision('localhost:3000', p, null, undefined, false)).toBe('allow');
    }
  });

  it('keeps local dev open when no key is set', () => {
    expect(operatorPageDecision('localhost:3000', '/pipeline', null, undefined, true)).toBe('allow');
  });
});
