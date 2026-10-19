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

describe('about and contact', () => {
  const fs = require('fs') as typeof import('fs');
  const path = require('path') as typeof import('path');
  const root = path.resolve(__dirname, '../../../..');
  it('the front door and the store link to /about, and the page exists', () => {
    for (const f of ['public/waia-front-door.html', 'public/waia-store.html']) {
      expect(fs.readFileSync(path.join(root, f), 'utf8')).toContain('href="/about"');
    }
    expect(fs.existsSync(path.join(root, 'src/app/about/page.tsx'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'src/app/support/page.tsx'))).toBe(true);
  });
});

describe('robots.txt and sitemap', () => {
  const fs = require('fs') as typeof import('fs');
  const path = require('path') as typeof import('path');
  const root = path.resolve(__dirname, '../../../..');
  it('robots keeps operator pages out and points at the sitemap; the sitemap lists only public pages', () => {
    const robots = fs.readFileSync(path.join(root, 'public/robots.txt'), 'utf8');
    for (const p of ['/operator', '/pipeline', '/store/intake', '/store/prices/preview', '/jarvis']) expect(robots).toContain(`Disallow: ${p}`);
    expect(robots).toContain('Sitemap: https://www.whatamiappreciatingnow.com/sitemap.xml');
    const sitemap = fs.readFileSync(path.join(root, 'public/sitemap.xml'), 'utf8');
    expect(sitemap).toContain('<loc>https://www.whatamiappreciatingnow.com/</loc>');
    expect(sitemap).not.toMatch(/operator|pipeline|intake|preview|jarvis|studio/);
  });
});
