import raw from '../../../scripts/merch/catalog.json';

/**
 * Public view of scripts/merch/catalog.json. Pages are generated from it, so adding a product
 * there (and its mockup) is all it takes. No prices anywhere: buying goes through Jonathan's own
 * Wix store later. Products without an approved design stay off the public pages.
 */
export interface MerchProduct {
  slug: string;
  name: string;
  kind: string;
  kindLabel: string;
  sizes: string[];
  description: string;
  image: string;
}

type RawProduct = { slug: string; kind: string; mark: string; rights: string };
const catalog = raw as unknown as {
  brandName: string;
  marks: Record<string, { means: string }>;
  rights: Record<string, string>;
  kinds: Record<string, { label: string; sizes: string[] }>;
  approvedDesigns: Record<string, { preview: string }>;
  products: RawProduct[];
};

const titleCase = (s: string) => s.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');

/**
 * A product is public only when it has an approved design (a file that passed the print-spec intake
 * and Jonathan's look, recorded in catalog.approvedDesigns) and its artwork rights are confirmed.
 * The earlier illustrative mockups were declined and are never shown.
 */
export const PUBLIC_RIGHTS = 'repo-drawn';

export function listMerch(): MerchProduct[] {
  return catalog.products
    .filter((p) => p.rights === PUBLIC_RIGHTS && catalog.approvedDesigns[p.slug])
    .map((p) => {
      const kind = catalog.kinds[p.kind];
      const style = p.mark.startsWith('psychedelic-') ? `Psychedelic ${titleCase(p.mark.slice(12))}` : titleCase(p.mark);
      return {
        slug: p.slug,
        name: `${catalog.brandName} ${kind.label}, ${style}`,
        kind: p.kind,
        kindLabel: kind.label,
        sizes: kind.sizes,
        description: catalog.marks[p.mark].means,
        image: catalog.approvedDesigns[p.slug].preview,
      };
    });
}

export function getMerch(slug: string): MerchProduct | undefined {
  return listMerch().find((p) => p.slug === slug);
}
