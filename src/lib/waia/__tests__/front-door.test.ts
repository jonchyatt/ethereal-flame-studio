import { frontDoorRewrite } from '../front-door';

describe('frontDoorRewrite', () => {
  it('always serves the front door and store on the bare apex', () => {
    expect(frontDoorRewrite('whatamiappreciatingnow.com', '/', undefined)?.page).toBe('/waia-front-door.html');
    expect(frontDoorRewrite('whatamiappreciatingnow.com', '/store', 'off')?.page).toBe('/waia-store.html');
  });

  it('leaves www on the visualizer when the flag is off or missing', () => {
    for (const flag of [undefined, '', 'off', 'true', '1']) {
      expect(frontDoorRewrite('www.whatamiappreciatingnow.com', '/', flag)).toBeNull();
      expect(frontDoorRewrite('www.whatamiappreciatingnow.com', '/store', flag)).toBeNull();
    }
  });

  it('serves the front door and store on www when the flag is on', () => {
    expect(frontDoorRewrite('www.whatamiappreciatingnow.com', '/', 'on')?.page).toBe('/waia-front-door.html');
    expect(frontDoorRewrite('www.whatamiappreciatingnow.com', '/store', ' ON ')?.page).toBe('/waia-store.html');
  });

  it('previews the front door on www with the flag off, marked noindex', () => {
    expect(frontDoorRewrite('www.whatamiappreciatingnow.com', '/preview/front-door', 'off')).toEqual({
      page: '/waia-front-door.html',
      noindex: true,
    });
  });

  it('ignores other hosts, ports and paths', () => {
    expect(frontDoorRewrite('jarvis.whatamiappreciatingnow.com', '/', 'on')).toBeNull();
    expect(frontDoorRewrite('localhost:3000', '/', 'on')).toBeNull();
    expect(frontDoorRewrite('whatamiappreciatingnow.com', '/pipeline', 'on')).toBeNull();
    expect(frontDoorRewrite('WWW.whatamiappreciatingnow.com:443', '/', 'on')?.page).toBe('/waia-front-door.html');
  });

  it('does not offer the preview path on the bare apex', () => {
    expect(frontDoorRewrite('whatamiappreciatingnow.com', '/preview/front-door', 'on')).toBeNull();
  });
});
