// Weekly backlog refresher: rewrites the generated "what shipped" and "waiting on Jonathan" blocks.
// Reads merged PRs and approvals/*.md. Read-only against GitHub (public REST, optional GITHUB_TOKEN); no writes outside the target file.
// node scripts/backlog/refresh.mjs [--file docs/BACKLOG-STATUS.md] [--prs prs.json] [--check]
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const repoRoot = join(here, '..', '..');
export const REPO = 'jonchyatt/ethereal-flame-studio';

export const BLOCKS = {
  shipped: ['<!-- refresh:shipped:start -->', '<!-- refresh:shipped:end -->'],
  waiting: ['<!-- refresh:waiting:start -->', '<!-- refresh:waiting:end -->'],
};

const cell = (s) => String(s).replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim();
const cleanTitle = (t) => t.replace(/\s*\(#\d+\)\s*$/, '').trim();

/** Parse one approval card: "# title", then "key: value" header lines. Returns null when it is not a card. */
export function parseCard(text, file) {
  const lines = text.split(/\r?\n/);
  if (!lines[0] || !lines[0].startsWith('# ')) return null;
  const card = { file, title: lines[0].slice(2).trim() };
  for (const line of lines.slice(1, 12)) {
    const m = /^(status|red|project|one_click):\s*(.*)$/.exec(line);
    if (m) card[m[1]] = m[2].trim();
  }
  return card.status ? card : null;
}

export function loadCards(dir = join(repoRoot, 'approvals')) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith('.md')).sort()
    .map((f) => parseCard(readFileSync(join(dir, f), 'utf8'), `approvals/${f}`)).filter(Boolean);
}

export const redLabel = (r) => (!r ? '' : /^\d$/.test(r) ? `red ${r}` : r.replace(/-/g, ' '));

/** prs: [{number, title, state, draft, merged_at, files?: string[]}] */
export function renderShipped(prs) {
  const merged = prs.filter((p) => p.merged_at).sort((a, b) => a.number - b.number);
  const open = prs.filter((p) => p.state === 'open' && !p.merged_at).sort((a, b) => a.number - b.number);
  const out = ['| PR | What | Merged |', '|---|---|---|'];
  for (const p of merged) out.push(`| #${p.number} | ${cell(cleanTitle(p.title))} | ${p.merged_at.slice(0, 10)} |`);
  if (!merged.length) out.push('| none | Nothing merged yet | |');
  out.push('', 'Open:', '');
  if (open.length) for (const p of open) out.push(`- #${p.number} ${cell(cleanTitle(p.title))}${p.draft ? ' (draft)' : ' (ready)'}`);
  else out.push('- none');
  return out.join('\n');
}

/** cards on master plus cards that exist only inside open PRs (prs[].files holding approvals/ paths). */
export function renderWaiting(cards, prs = []) {
  const waiting = cards.filter((c) => c.status === 'WAITING_ON_JON');
  const known = new Set(cards.map((c) => c.file));
  const out = ['| Card | Needs | Words to type |', '|---|---|---|'];
  for (const c of waiting) {
    out.push(`| \`${c.file}\` ${cell(c.title)} | ${redLabel(c.red) || 'unmarked'} | ${cell(c.one_click || '')} |`);
  }
  if (!waiting.length) out.push('| none | Nothing waiting | |');
  const inPrs = [];
  for (const p of prs.filter((x) => x.state === 'open' && !x.merged_at)) {
    for (const f of p.files || []) {
      if (/^approvals\/[^/]+\.md$/.test(f) && !known.has(f)) inPrs.push(`- \`${f}\` in #${p.number}, not on master yet`);
    }
  }
  if (inPrs.length) out.push('', 'Inside open PRs:', '', ...inPrs);
  return out.join('\n');
}

export function replaceBlock(text, name, body) {
  const [start, end] = BLOCKS[name];
  const s = text.indexOf(start), e = text.indexOf(end);
  if (s < 0 || e < 0 || e < s) throw new Error(`markers for "${name}" missing in target file`);
  return `${text.slice(0, s + start.length)}\n${body}\n${text.slice(e)}`;
}

export function refreshText(text, prs, cards) {
  let out = replaceBlock(text, 'shipped', renderShipped(prs));
  out = replaceBlock(out, 'waiting', renderWaiting(cards, prs));
  return out;
}

async function gh(path, token) {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: { accept: 'application/vnd.github+json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
  });
  if (!res.ok) throw new Error(`GitHub ${res.status} for ${path}`);
  return res.json();
}

export async function fetchPrs(token = process.env.GITHUB_TOKEN, get = gh) {
  const prs = [];
  for (let page = 1; page <= 10; page++) {
    const batch = await get(`/repos/${REPO}/pulls?state=all&per_page=100&page=${page}`, token);
    prs.push(...batch.map((p) => ({ number: p.number, title: p.title, state: p.state, draft: !!p.draft, merged_at: p.merged_at })));
    if (batch.length < 100) break;
  }
  for (const p of prs.filter((x) => x.state === 'open')) {
    const files = await get(`/repos/${REPO}/pulls/${p.number}/files?per_page=100`, token);
    p.files = files.map((f) => f.filename);
  }
  return prs;
}

async function main(argv) {
  const arg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
  const file = join(repoRoot, arg('--file') || 'docs/BACKLOG-STATUS.md');
  const prs = arg('--prs') ? JSON.parse(readFileSync(arg('--prs'), 'utf8')) : await fetchPrs();
  const before = readFileSync(file, 'utf8');
  const after = refreshText(before, prs, loadCards());
  if (argv.includes('--check')) { console.log(after === before ? 'up to date' : 'stale'); process.exit(after === before ? 0 : 1); }
  writeFileSync(file, after);
  console.log(`refreshed ${file}: ${prs.filter((p) => p.merged_at).length} merged PRs, ${loadCards().filter((c) => c.status === 'WAITING_ON_JON').length} cards waiting`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main(process.argv.slice(2)).catch((e) => { console.error(e.message); process.exit(1); });
}
