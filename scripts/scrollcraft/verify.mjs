import { chromium } from 'playwright';
import sharp from 'sharp';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import os from 'node:os';

export const groups = {
  1: ['/', '/listen', '/about', '/from-reset-biology', '/vr', '/programs', '/programs/advanced-hypnosis-sessions', '/programs/belief-lock-in'],
  2: ['/store', '/store/bundles', '/store/custom-order', '/store/custom-order/brief', '/store/shelf', '/merch', '/merch/fractal-vortex-tee', '/merch/infinity-ribbon-tee'],
  3: ['/merch/carved-wood-mug', '/merch/horizon-orb-mug', '/patrons', '/patrons/join', '/patrons/remove', '/programs/manage', '/support', '/email-preferences'],
  4: ['/legal/terms', '/legal/privacy', '/legal/refunds', '/mist', '/scenes/orb-ocean', '/scenes/rainbow-falls'],
};
const arg = (key, fallback) => process.argv.includes(key) ? process.argv[process.argv.indexOf(key) + 1] : fallback;
const base = arg('--base', 'https://www.whatamiappreciatingnow.com');
const output = path.resolve(arg('--out', 'C:/hal-jobs/scrollcraft-check'));
const routes = arg('--route') ? [arg('--route')] : groups[arg('--group', '1')];
const before = process.argv.includes('--before');
const reduced = process.argv.includes('--reduced');
const compact = process.argv.includes('--compact');
const require = createRequire(import.meta.url);
const axe = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
if (os.freemem() < 3 * 1024 ** 3) throw new Error('Under 3 GB free RAM. Wait five minutes before retrying.');
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const report = { base, when: new Date().toISOString(), before, reduced, pages: [] };

try {
  for (const width of compact ? [360] : [390, 1440]) {
    for (const route of routes) {
      const height = compact ? 640 : width === 390 ? 844 : 900;
      const slug = route === '/' ? 'home' : route.slice(1).replaceAll('/', '-');
      const prefix = `${slug}-${width}${reduced ? '-reduced' : ''}`;
      const context = await browser.newContext({ viewport: { width, height }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
      await context.addInitScript(() => {
        Element.prototype.requestPointerLock = () => Promise.reject(new Error('Disabled in verification'));
        Element.prototype.setPointerCapture = () => {};
        Element.prototype.releasePointerCapture = () => {};
        Document.prototype.exitPointerLock = () => {};
      });
      const page = await context.newPage();
      const errors = [], failed = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('response', response => { if (response.status() >= 400 && response.url().startsWith(base)) failed.push(`${response.status()} ${new URL(response.url()).pathname}`); });
      const response = await page.goto(base + route, { waitUntil: 'domcontentloaded', timeout: 90000 });
      await page.locator('main,canvas').first().waitFor({ timeout: 30000 });
      await page.evaluate(() => document.fonts.ready);
      if (!before && await page.locator('[data-scroll-page]').count()) await page.waitForFunction(() => !!document.querySelector('[data-sc-mounted]'), { timeout: 20000 });
      await page.waitForTimeout(700);
      const opening = await page.evaluate(() => {
        const h = document.querySelector('h1')?.getBoundingClientRect();
        return { h1: h ? { top: h.top, bottom: h.bottom, text: document.querySelector('h1').textContent } : null,
          words: document.querySelector('main')?.innerText || document.body.innerText,
          links: [...document.querySelectorAll('main a[href]')].map(a => ({ text: a.textContent.trim(), href: a.getAttribute('href') })),
          engineNodes: document.querySelectorAll('[data-sc-act]').length };
      });
      const samples = [];
      const shots = [];
      const positions = before ? [0] : await page.evaluate(() => {
        const max = Math.max(0, document.documentElement.scrollHeight - innerHeight);
        const acts = [...document.querySelectorAll('[data-sc-act],main > .signup')];
        const ys = [0, max];
        for (const el of acts) {
          const r = el.getBoundingClientRect();
          const start = r.top + scrollY - innerHeight * .55;
          const end = r.bottom + scrollY - innerHeight * .45;
          for (let i = 0; i < 6; i++) ys.push(Math.round(Math.max(0, Math.min(max, start + (end - start) * i / 5))));
        }
        if (!acts.length) for (let i = 0; i < 6; i++) ys.push(Math.round(max * i / 5));
        return [...new Set(ys)].sort((a,b) => a-b);
      });
      for (let i = 0; i < positions.length; i++) {
        await page.evaluate(y => scrollTo({ top: y, behavior: 'instant' }), positions[i]);
        await page.waitForTimeout(160);
        const data = await page.evaluate(() => {
          const visible = node => { const r = node.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth && !node.closest('[hidden]'); };
          return { y: scrollY, overflow: document.documentElement.scrollWidth - innerWidth,
            actionVisible: [...document.querySelectorAll('.sc-action-dock .button,main .primary,main button[type="submit"],main [data-sc-primary]')].some(visible),
            hinge: document.querySelector('.sc-hinge-words') ? getComputedStyle(document.querySelector('.sc-hinge-words')).transform : null,
            imgTransforms: [...document.querySelectorAll('[data-sc-parallax]')].map(e => getComputedStyle(e).transform) };
        });
        samples.push(data);
        const filename = `${prefix}-${i === 0 ? 'top' : i === positions.length - 1 ? 'end' : String(i).padStart(2,'0')}.jpg`;
        await page.screenshot({ path: path.join(output, filename), type: 'jpeg', quality: 76 });
        shots.push(filename);
      }
      await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
      await page.screenshot({ path: path.join(output, `${prefix}-full.jpg`), fullPage: true, type: 'jpeg', quality: 76 });
      await page.evaluate(axe);
      const accessibility = await page.evaluate(async () => {
        const result = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21aa'] } });
        return { violations: result.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => ({ target:n.target, summary:n.failureSummary })) })),
          incomplete: result.incomplete.filter(v => v.id === 'color-contrast').map(v => ({id:v.id, targets:v.nodes.map(n => n.target)})) };
      });
      const assets = await page.evaluate(() => [...document.images].filter(i => i.getBoundingClientRect().width > 0 && (!i.complete || !i.naturalWidth)).map(i => i.getAttribute('src')));
      // Contact strips preserve the full viewport composition, not arbitrary crops.
      const tw = width === 390 || width === 360 ? 195 : 360, th = Math.round(height * tw / width);
      const columns = width < 768 ? 6 : 4, rows = Math.ceil(shots.length / columns);
      const composites = [];
      for (let i = 0; i < shots.length; i++) composites.push({ input: await sharp(path.join(output, shots[i])).resize(tw, th).toBuffer(), left:(i%columns)*tw, top:Math.floor(i/columns)*th });
      await sharp({create:{width:tw*columns,height:th*rows,channels:3,background:'#302d38'}}).composite(composites).jpeg({quality:80}).toFile(path.join(output, `${prefix}-sheet.jpg`));
      const item = {route,width,height,status:response.status(),opening,samples,errors,failed,brokenImages:assets,accessibility,shots, sheet:`${prefix}-sheet.jpg`};
      report.pages.push(item);
      writeFileSync(path.join(output,'metrics.json'), JSON.stringify(report,null,2));
      console.log(JSON.stringify({route,width,status:item.status,shots:shots.length,overflow:Math.max(...samples.map(s=>s.overflow)),noAction:samples.filter(s=>!s.actionVisible).length,violations:accessibility.violations.map(v=>v.id),errors:errors.length,failed}));
      await context.close();
    }
  }
} finally { await browser.close(); }
