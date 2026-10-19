import { KIND_LABEL, linkRel, type StoreItem } from '@/lib/store/items';

/** The one layout every store item uses: kind, picture slot, name, source, blurb, one link, provenance. */
export const CARD = {
  card: { display: 'flex', flexDirection: 'column', border: '1px solid #333', borderRadius: 12, overflow: 'hidden', background: '#12121e', color: '#eee' },
  media: { aspectRatio: '4 / 3', background: '#1b1b2c', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#667', fontSize: 13 },
  body: { padding: 16, display: 'flex', flexDirection: 'column', gap: 8, flex: 1 },
} as const;

export function StoreItemCard({ item }: { item: StoreItem }) {
  return (
    <article style={CARD.card} data-kind={item.kind}>
      <div style={CARD.media}>
        {item.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span aria-hidden="true">{item.source}</span>
        )}
      </div>
      <div style={CARD.body}>
        <span style={{ fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase', opacity: 0.65 }}>{KIND_LABEL[item.kind]}</span>
        <h3 style={{ margin: 0, fontSize: 18 }}>{item.name}</h3>
        <div style={{ fontSize: 13, opacity: 0.7 }}>From {item.source}</div>
        {item.blurb ? <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>{item.blurb}</p> : null}
        <p style={{ margin: '4px 0 0' }}>
          <a href={item.url} rel={linkRel(item)} target="_blank" style={{ color: '#9ad' }}>
            View at {item.source}
          </a>
        </p>
        <p style={{ margin: 0, fontSize: 12, opacity: 0.55, lineHeight: 1.4 }}>
          <strong>Provenance.</strong> {item.provenance} Listed by {item.listedBy} on {item.listedOn}.
        </p>
      </div>
    </article>
  );
}

export const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 20 } as const;
