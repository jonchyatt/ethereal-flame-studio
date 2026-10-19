// Run: npm run test:backlog
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCard, loadCards, renderShipped, renderWaiting, refreshText, replaceBlock, fetchPrs, BLOCKS, redLabel } from './refresh.mjs';

const prs = [
  { number: 3, title: 'Second thing (#3)', state: 'closed', merged_at: '2026-10-17T10:00:00Z' },
  { number: 1, title: 'First | thing', state: 'closed', merged_at: '2026-10-16T09:00:00Z' },
  { number: 2, title: 'Abandoned', state: 'closed', merged_at: null },
  { number: 9, title: 'Open one', state: 'open', draft: false, merged_at: null, files: ['approvals/2026-10-18-new.md', 'approvals/old.md', 'src/x.ts'] },
  { number: 10, title: 'Open draft', state: 'open', draft: true, merged_at: null },
];

test('parseCard reads header fields and rejects non-cards', () => {
  const c = parseCard('# Title here\nstatus: WAITING_ON_JON\nred: 3\none_click: do it\nbody', 'approvals/a.md');
  assert.deepEqual(c, { file: 'approvals/a.md', title: 'Title here', status: 'WAITING_ON_JON', red: '3', one_click: 'do it' });
  assert.equal(parseCard('no heading', 'x'), null);
  assert.equal(parseCard('# T\nbody only', 'x'), null);
});

test('real approval cards in the repo all parse', () => {
  const cards = loadCards();
  assert.ok(cards.length >= 1);
  for (const c of cards) assert.ok(c.title && c.status && c.one_click, c.file);
});

test('shipped table: merged only, sorted, escaped, with open list', () => {
  const t = renderShipped(prs);
  const rows = t.split('\n').filter((l) => l.startsWith('| #'));
  assert.equal(rows.length, 2);
  assert.ok(rows[0].startsWith('| #1 | First \\| thing | 2026-10-16'));
  assert.ok(rows[1].startsWith('| #3 | Second thing |'));
  assert.ok(!t.includes('Abandoned'));
  assert.match(t, /- #9 Open one \(ready\)/);
  assert.match(t, /- #10 Open draft \(draft\)/);
});

test('waiting table: only WAITING_ON_JON, plus cards that live only in open PRs', () => {
  const cards = [
    { file: 'approvals/old.md', title: 'Old', status: 'WAITING_ON_JON', red: '1', one_click: 'yes old' },
    { file: 'approvals/done.md', title: 'Done', status: 'RESOLVED', red: '2', one_click: 'x' },
    { file: 'approvals/s.md', title: 'Look', status: 'WAITING_ON_JON', red: 'second-look', one_click: 'ok' },
  ];
  const t = renderWaiting(cards, prs);
  assert.match(t, /approvals\/old\.md` Old \| red 1 \| yes old/);
  assert.match(t, /second look/);
  assert.ok(!t.includes('Done'));
  assert.match(t, /approvals\/2026-10-18-new\.md` in #9, not on master yet/);
  assert.ok(!/approvals\/old\.md` in #9/.test(t));
  assert.match(renderWaiting([], []), /Nothing waiting/);
});

test('refresh replaces only the marked blocks and is idempotent', () => {
  const doc = `intro\n${BLOCKS.shipped[0]}\nstale\n${BLOCKS.shipped[1]}\nmiddle prose\n${BLOCKS.waiting[0]}\nstale\n${BLOCKS.waiting[1]}\noutro`;
  const once = refreshText(doc, prs, []);
  assert.ok(once.startsWith('intro\n') && once.endsWith('\noutro'));
  assert.ok(once.includes('middle prose'));
  assert.ok(!once.includes('stale'));
  assert.equal(refreshText(once, prs, []), once);
});

test('missing markers fail loudly instead of writing', () => {
  assert.throws(() => replaceBlock('no markers', 'shipped', 'x'), /markers/);
});

test('fetchPrs paginates and reads files only for open PRs', async () => {
  const calls = [];
  const get = async (path) => {
    calls.push(path);
    if (path.includes('/files')) return [{ filename: 'approvals/z.md' }];
    if (path.endsWith('&page=1')) return Array.from({ length: 100 }, (_, i) => ({ number: i + 1, title: 't', state: i === 0 ? 'open' : 'closed', merged_at: null }));
    return [{ number: 200, title: 'last', state: 'closed', merged_at: '2026-10-17T00:00:00Z' }];
  };
  const out = await fetchPrs('tok', get);
  assert.equal(out.length, 101);
  assert.deepEqual(out[0].files, ['approvals/z.md']);
  assert.equal(calls.filter((c) => c.includes('/files')).length, 1);
});

test('redLabel', () => {
  assert.equal(redLabel('3'), 'red 3');
  assert.equal(redLabel('second-look'), 'second look');
});
