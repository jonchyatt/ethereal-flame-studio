// Shared lemniscate (infinity) geometry for the brand image workflow.
// Same curve as the infinity mark in scripts/generate-brand-marks.mjs:
// Bernoulli lemniscate x = a cos u / (1 + sin^2 u), y = a sin u cos u / (1 + sin^2 u),
// starting at the crossing (u = pi/2) so a text run closes back where it began.

export function lemniscatePoint(u, a, cx, cy) {
  const d = 1 + Math.sin(u) ** 2;
  return [cx + (a * Math.cos(u)) / d, cy + (a * Math.sin(u) * Math.cos(u)) / d];
}

export function lemniscatePoints({ a = 330, cx = 400, cy = 200, n = 240 } = {}) {
  const pts = [];
  for (let i = 0; i <= n; i++) pts.push(lemniscatePoint(Math.PI / 2 + (i / n) * 2 * Math.PI, a, cx, cy));
  return pts;
}

export function polylineLength(pts) {
  let len = 0;
  for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return len;
}

export function pathData(pts) {
  return pts.map((p, i) => `${i ? 'L' : 'M'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
}

// Where the words sit. The curve spans x in [cx-a, cx+a] and y in about
// [cy-0.354a, cy+0.354a]; each lobe's top arc peaks at x = cx +/- a*sqrt(2... ) found numerically.
export function anchors({ a = 330, cx = 400, cy = 200 } = {}) {
  let best = { y: Infinity, u: 0 };
  const lobe = [];
  for (let i = 0; i <= 4000; i++) {
    const u = (i / 4000) * 2 * Math.PI;
    const [x, y] = lemniscatePoint(u, a, cx, cy);
    if (x > cx && y < best.y) best = { y, u, x };
    lobe.push([x, y]);
  }
  const rightTop = lemniscatePoint(best.u, a, cx, cy);
  const leftTop = [2 * cx - rightTop[0], rightTop[1]]; // the curve is mirror-symmetric about x = cx
  return { left: leftTop, right: rightTop, crossing: [cx, cy] };
}

// Loop half-width that fits a canvas: limited by width, and by height so the loop
// (half-height a*sqrt(2)/4) plus the lettering above it never leaves a short canvas.
export function fitA(width, height, margin = 0.06) {
  return Math.min((width / 2) * (1 - 2 * margin), (height * (1 - 2 * margin)) / (2 * (Math.SQRT2 / 4)) / 1.6);
}
