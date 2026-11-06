import { RING_GLYPHS, NOW_TURN_DEG } from './ring';

/** #80's hinge, as selectable HTML around the unchanged canonical photograph. */
export function Hinge({ alt = 'Jonathan’s original carved wood panel' }: { alt?: string }) {
  return (
    <div className="sc-hinge" style={{ '--hinge-turn': `${NOW_TURN_DEG}deg` } as React.CSSProperties}>
      <img className="story-mark" src="/brand/carving/04.png" alt={alt} width="1024" height="1024" />
      <div className="sc-hinge-words" aria-hidden="true">
        {RING_GLYPHS.map(({ ch, deg }, i) => (
          <span key={i} style={{ '--glyph-angle': `${deg}deg` } as React.CSSProperties}>{ch}</span>
        ))}
      </div>
    </div>
  );
}
