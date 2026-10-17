import puppeteer from 'puppeteer';
import { promises as fs } from 'fs';
import type { PatronRenderList } from './renderList';

export const PATRON_CARD_SIZE = { width: 1920, height: 1080 } as const;

function esc(text: string): string {
  return text.replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string
  ));
}

/** Flat 16:9 closing card for non-360 renders, built from the same moderated list. */
export function buildPatronCardHtml(list: PatronRenderList): string {
  const items = list.patrons
    .map((p) => `<li class="${p.tier}"><span class="n">${esc(p.displayName)}</span>${
      p.message ? `<span class="m">${esc(p.message)}</span>` : ''
    }</li>`)
    .join('\n');
  return `<!doctype html><html><head><meta charset="utf-8"><style>
html,body{margin:0;width:${PATRON_CARD_SIZE.width}px;height:${PATRON_CARD_SIZE.height}px;background:radial-gradient(ellipse at center,#14102a 0%,#05040d 80%);font-family:Georgia,serif;color:#e8e4f5;overflow:hidden}
h1{text-align:center;font-weight:normal;letter-spacing:.2em;font-size:40px;margin:70px 0 10px;color:#cfc6ee}
p.sub{text-align:center;margin:0 0 40px;font-size:22px;color:#8f86b5}
ul{list-style:none;margin:0 auto;padding:0;width:1500px;column-count:3;column-gap:60px;text-align:center}
li{break-inside:avoid;margin:0 0 22px;font-size:30px}
.m{display:block;font-size:19px;color:#9f97c4;margin-top:4px}
li.sparkly .n{color:#ffe9a8;text-shadow:0 0 6px #fff7d0,3px -2px 8px #ffd36b,-3px 2px 8px #ffb3e6}
li.glowing .n{color:#fff;text-shadow:0 0 10px #8fd8ff,0 0 24px #4aa8ff,0 0 48px #4aa8ff}
li.ethereal .n{font-size:38px;letter-spacing:.08em;background:linear-gradient(90deg,#b9a6ff,#9be7ff,#ffd6f5);-webkit-background-clip:text;color:transparent;filter:drop-shadow(0 0 14px #c9b8ff)}
</style></head><body><h1>WITH GRATITUDE</h1><p class="sub">to everyone who keeps the light on</p><ul>
${items}
</ul></body></html>`;
}

export async function renderPatronCardPng(list: PatronRenderList, outPath: string): Promise<void> {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ ...PATRON_CARD_SIZE });
    await page.setContent(buildPatronCardHtml(list), { waitUntil: 'load' });
    const png = await page.screenshot({ type: 'png' });
    await fs.writeFile(outPath, png);
  } finally {
    await browser.close();
  }
}
