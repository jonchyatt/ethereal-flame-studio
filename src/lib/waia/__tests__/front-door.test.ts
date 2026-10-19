import { frontDoorRewrite } from '../front-door';

describe('frontDoorRewrite', () => {
  it('serves the front door at / and the store at /store on apex, www and other hosts', () => {
    for (const host of ['whatamiappreciatingnow.com', 'www.whatamiappreciatingnow.com', 'WWW.whatamiappreciatingnow.com:443', 'localhost:3000']) {
      expect(frontDoorRewrite(host, '/')).toEqual({ page: '/waia-front-door.html', noindex: false });
      expect(frontDoorRewrite(host, '/store')?.page).toBe('/waia-store.html');
    }
  });

  it('keeps the old preview path working, marked noindex', () => {
    expect(frontDoorRewrite('www.whatamiappreciatingnow.com', '/preview/front-door')).toEqual({
      page: '/waia-front-door.html',
      noindex: true,
    });
  });

  it('leaves the studio, other paths and the jarvis subdomain alone', () => {
    expect(frontDoorRewrite('www.whatamiappreciatingnow.com', '/studio')).toBeNull();
    expect(frontDoorRewrite('whatamiappreciatingnow.com', '/pipeline')).toBeNull();
    expect(frontDoorRewrite('jarvis.whatamiappreciatingnow.com', '/')).toBeNull();
    expect(frontDoorRewrite('jarvis.whatamiappreciatingnow.com', '/store')).toBeNull();
  });
});
