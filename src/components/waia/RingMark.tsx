import { RING_GLYPHS } from './ring';

/**
 * The name ring as SVG, set the way Jon's carved panel reads (jarvis
 * data/waia-health-shop/brand-roots-2026-11-04): one clockwise ring, baselines
 * inward, WHAT at the top, APPRECIATING upside down along the bottom, NOW
 * climbing the left side. Decorative (aria-hidden): every place it appears also
 * carries the name as real text. `className` lets a page rotate the glyph group
 * (`.ring__glyphs`) without touching the reading mark.
 */
export function RingMark({ className }: { className?: string }) {
  const c = 100, r = 78;
  return (
    <svg className={className} viewBox="0 0 200 200" aria-hidden="true" focusable="false">
      <circle cx={c} cy={c} r={r - 7} className="ring__rule" />
      <g className="ring__glyphs">
        {RING_GLYPHS.map((g, i) => (
          <text key={i} x={c} y={c - r} textAnchor="middle" transform={`rotate(${g.deg.toFixed(3)} ${c} ${c})`}>
            {g.ch}
          </text>
        ))}
      </g>
      <path className="ring__mark" d={`M${c} 8 l-4.5 -7 h9 z`} />
    </svg>
  );
}
