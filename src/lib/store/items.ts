/**
 * One item model for everything the store shows: affiliate links, Wix store items and merchandise.
 * Every item renders through StoreItemCard, so the layout is identical. Outbound links only:
 * nothing here takes money, stores anything or sends anything.
 */
export type ItemKind = 'affiliate' | 'wix' | 'merch';

/**
 * 'merch' is reserved for when a design passes the merch design standard and print intake
 * (that thread owns it). Nothing renders merchandise today, and the intake page does not offer it.
 */

export interface StoreItem {
  id: string;
  kind: ItemKind;
  name: string;
  /** Who sells it, as a visitor reads it. */
  source: string;
  /** What the seller itself says, one or two sentences. May be empty; never invented. */
  blurb: string;
  url: string;
  /** true if the link earns a commission */
  commission: boolean;
  /** Optional picture, https or site-relative. Never required. */
  image?: string;
  listedBy: 'jonathan';
  listedOn: string;
  provenance: string;
  /** true for a dietary supplement: the card shows the FDA line under the description. */
  supplement?: boolean;
  /** The affiliate program that issued the link, as named in the card's commission line. Defaults to source. */
  program?: string;
  /** A safety warning the seller prints (e.g. pregnancy), shown on the card as given. */
  warning?: string;
  /** Only 'live' items appear on the public shelf. Missing means 'draft'. */
  status?: ItemStatus;
}

export type ItemStatus = 'draft' | 'live';

export const itemStatus = (item: Pick<StoreItem, 'status'>): ItemStatus => item.status ?? 'draft';

export const KIND_LABEL: Record<ItemKind, string> = {
  affiliate: 'Affiliate link',
  wix: 'Our store',
  merch: 'Merchandise',
};

export const DISCLOSURE =
  'Some links on this shelf are affiliate links. If you buy through one, What Am I Appreciating Now may earn a commission at no extra cost to you. The studio lists an item only when it considers it suitable, and a commission never changes what we say about it. Nothing here is medical advice, and none of it is meant to diagnose, treat or cure anything; talk to a qualified professional about your health.';

/** Shown next to the link on every commission card. */
export function affiliateLine(item: Pick<StoreItem, 'source' | 'program'>): string {
  return `Affiliate link: What Am I Appreciating Now may earn a commission from ${item.program?.trim() || item.source} if you buy through this link, at no extra cost to you.`;
}

/** Shown under the description on every supplement card. */
export const FDA_LINE =
  'These statements have not been evaluated by the Food and Drug Administration. This product is not intended to diagnose, treat, cure, or prevent any disease.';

const PLACEHOLDER = /placeholder|your[-_ ]?(id|tag)|\{[^}]*\}|<[^>]*>|example\.com|\.test\b|localhost/i;

/** Returns null if the item may render, else the reason it may not. */
export function checkItem(item: Partial<StoreItem> | null | undefined): string | null {
  if (!item || typeof item !== 'object') return 'not an object';
  for (const k of ['id', 'name', 'source', 'url', 'listedOn', 'provenance'] as const) {
    const v = item[k];
    if (typeof v !== 'string' || !v.trim()) return `missing ${k}`;
  }
  if (typeof item.blurb !== 'string') return 'blurb must be text (it may be empty)';
  if (!item.kind || !(item.kind in KIND_LABEL)) return 'kind must be affiliate, wix or merch';
  if (item.listedBy !== 'jonathan') return "not on Jonathan's list";
  if (typeof item.commission !== 'boolean') return 'commission must be true or false';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(item.listedOn as string)) return 'listedOn must be YYYY-MM-DD';
  if (!/^https:\/\/[^\s/]+\.[^\s/]+/.test(item.url as string)) return 'url must be https';
  if (PLACEHOLDER.test(item.url as string)) return 'url is a placeholder';
  if (item.status !== undefined && item.status !== 'draft' && item.status !== 'live') return 'status must be draft or live';
  if (item.image && !/^(https:\/\/|\/)[^\s]+$/.test(item.image)) return 'image must be https or site-relative';
  return null;
}

export function renderableItems(items: readonly Partial<StoreItem>[]): StoreItem[] {
  return items.filter((i) => !checkItem(i)) as StoreItem[];
}

/** What the public shelf shows: renderable and marked live. Drafts show only in the intake preview. */
export function liveItems(items: readonly Partial<StoreItem>[]): StoreItem[] {
  return renderableItems(items).filter((i) => itemStatus(i) === 'live');
}

/** rel for the outbound link: commission links are marked sponsored. */
export function linkRel(item: Pick<StoreItem, 'commission'>): string {
  return `${item.commission ? 'sponsored ' : ''}noopener noreferrer`;
}

export function shelfHasCommission(items: readonly StoreItem[]): boolean {
  return items.some((i) => i.commission);
}

// ---- intake: turn pasted text into items -------------------------------------------------

export interface IntakeOptions {
  kind: ItemKind;
  commission: boolean;
  provenance: string;
  /** YYYY-MM-DD */
  today: string;
  /** Marks every pasted item a supplement (adds the FDA line). */
  supplement?: boolean;
  /** Affiliate program that issued these links; blank leaves it out. */
  program?: string;
}

export interface IntakeRow {
  line: number;
  raw: string;
  item: StoreItem | null;
  error: string | null;
}

const URL_RE = /https?:\/\/[^\s|<>"')\]]+/i;

export function slugify(s: string): string {
  return s.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}

export function hostLabel(url: string): string {
  try {
    const h = new URL(url).hostname.replace(/^www\./, '');
    const base = h.split('.').slice(0, -1).join('.') || h;
    return base.charAt(0).toUpperCase() + base.slice(1);
  } catch {
    return '';
  }
}

const clean = (s: string) => s.replace(/^[\s\-–—*•>\d.)]+(?=\S)/, '').replace(/[\s:,;|–—-]+$/g, '').trim();

/**
 * Accepts one item per line, in any of these shapes:
 *   Name | Merchant | https://link | Short description
 *   Name | https://link
 *   Name - https://link - Short description
 *   https://link          (name taken from the page address)
 * Blank lines are skipped. Nothing is fetched and nothing is invented: a missing name or
 * description is reported, not filled in.
 */
export function parseIntake(text: string, opts: IntakeOptions): IntakeRow[] {
  const rows: IntakeRow[] = [];
  const seen = new Set<string>();
  text.split(/\r?\n/).forEach((raw, idx) => {
    if (!raw.trim()) return;
    const m = raw.match(URL_RE);
    if (!m) {
      rows.push({ line: idx + 1, raw, item: null, error: 'no https link on this line' });
      return;
    }
    const url = m[0].replace(/[.,;]+$/, '');
    const before = raw.slice(0, m.index);
    const after = raw.slice((m.index as number) + m[0].length);
    const pre = before.split('|').map(clean).filter(Boolean);
    const post = after.split('|').map(clean).filter(Boolean);
    let name = '';
    let source = '';
    let blurb = '';
    if (before.includes('|')) {
      name = pre[0] || '';
      source = pre[1] || '';
    } else {
      name = clean(before);
    }
    blurb = post.join(' ');
    if (!source) source = hostLabel(url);
    if (!name) name = '';
    const base = slugify(name || source);
    let id = base || 'item';
    for (let n = 2; seen.has(id); n++) id = `${base}-${n}`;
    seen.add(id);
    const item: StoreItem = {
      id, kind: opts.kind, name, source, blurb, url,
      commission: opts.commission, listedBy: 'jonathan', listedOn: opts.today, provenance: opts.provenance.trim(),
      status: 'draft', supplement: !!opts.supplement,
      ...(opts.program?.trim() ? { program: opts.program.trim() } : {}),
    };
    const error = checkItem(item);
    rows.push({ line: idx + 1, raw, item: error ? null : item, error });
  });
  return rows;
}

/** The text to paste into src/lib/store/shelf-items.ts, in the same order as the paste. */
export function itemsToSource(items: readonly StoreItem[]): string {
  return items.map((i) => '  ' + JSON.stringify(i) + ',').join('\n');
}
