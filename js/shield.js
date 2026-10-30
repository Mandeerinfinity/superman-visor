// Original faceted "crystal S" shield, defined in unit space (y down). Drawn by hand in code.
export const OUTLINE = [[-1, -0.5], [-0.66, -0.86], [0.66, -0.86], [1, -0.5], [0, 0.98]];
export const SPATH = [[0.62, -0.62], [-0.4, -0.62], [-0.64, -0.39], [-0.4, -0.16], [0.3, -0.16], [0.47, 0.03], [0.28, 0.27], [-0.32, 0.27], [-0.5, 0.1]];
export const SW = 0.17;

export function inset(poly, d) {
  // simple centroid-scaled inset (fine for this convex-ish shape)
  const c = [0, -0.22];
  return poly.map(([x, y]) => [c[0] + (x - c[0]) * (1 - d), c[1] + (y - c[1]) * (1 - d)]);
}

// Quads (4 pts) around each S segment, with mitred joins.
export function sQuads(path = SPATH, w = SW) {
  const n = path.length, h = w / 2, norms = [];
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = path[i], [x1, y1] = path[i + 1], l = Math.hypot(x1 - x0, y1 - y0);
    norms.push([-(y1 - y0) / l, (x1 - x0) / l]);
  }
  const off = [];
  for (let i = 0; i < n; i++) {
    let nx, ny, s = 1;
    if (i === 0) [nx, ny] = norms[0];
    else if (i === n - 1) [nx, ny] = norms[n - 2];
    else {
      const a = norms[i - 1], b = norms[i]; nx = a[0] + b[0]; ny = a[1] + b[1];
      const l = Math.hypot(nx, ny); nx /= l; ny /= l; s = 1 / Math.max(0.35, nx * a[0] + ny * a[1]);
    }
    off.push([path[i][0] + nx * h * s, path[i][1] + ny * h * s, path[i][0] - nx * h * s, path[i][1] - ny * h * s]);
  }
  const q = [];
  for (let i = 0; i < n - 1; i++) q.push([[off[i][0], off[i][1]], [off[i + 1][0], off[i + 1][1]], [off[i + 1][2], off[i + 1][3]], [off[i][2], off[i][3]]]);
  return q;
}

// Shards for the boot animation: triangles with a colour role.
export function shards() {
  const out = [], c = [0, -0.18];
  const rim = OUTLINE, inner = inset(OUTLINE, 0.13);
  for (let i = 0; i < 5; i++) {
    const a = rim[i], b = rim[(i + 1) % 5], ai = inner[i], bi = inner[(i + 1) % 5];
    out.push({ p: [a, b, bi], role: 'rim' }, { p: [a, bi, ai], role: 'rim' });
    // field fan subdivided
    const m = [(ai[0] + bi[0]) / 2, (ai[1] + bi[1]) / 2];
    out.push({ p: [ai, m, c], role: 'field' }, { p: [m, bi, c], role: 'field' });
  }
  for (const q of sQuads()) { out.push({ p: [q[0], q[1], q[2]], role: 's' }, { p: [q[0], q[2], q[3]], role: 's' }); }
  return out;
}

function polyPath(ctx, pts, cx, cy, s) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => i ? ctx.lineTo(cx + x * s, cy + y * s) : ctx.moveTo(cx + x * s, cy + y * s));
  ctx.closePath();
}

export function drawShield(ctx, cx, cy, s, o = {}) {
  const red = o.red || '#e3232c', gold = o.gold || '#ffcc33', glow = o.glow ?? 1;
  ctx.save();
  ctx.lineJoin = 'miter';
  if (glow) { ctx.shadowColor = o.glowColor || 'rgba(120,200,255,.9)'; ctx.shadowBlur = 30 * glow * (s / 100); }
  // rim (red crystal)
  polyPath(ctx, OUTLINE, cx, cy, s);
  let g = ctx.createLinearGradient(cx - s, cy - s, cx + s, cy + s);
  g.addColorStop(0, '#ff6b6b'); g.addColorStop(0.45, red); g.addColorStop(1, '#6a050c');
  ctx.fillStyle = g; ctx.fill();
  ctx.shadowBlur = 0;
  // field (gold)
  const inner = inset(OUTLINE, 0.13);
  polyPath(ctx, inner, cx, cy, s);
  g = ctx.createLinearGradient(cx, cy - s, cx, cy + s);
  g.addColorStop(0, '#fff3b8'); g.addColorStop(0.4, gold); g.addColorStop(1, '#b8740a');
  ctx.fillStyle = g; ctx.fill();
  // facets on field
  ctx.globalAlpha = 0.18; ctx.fillStyle = '#fff';
  const c = [0, -0.18];
  for (let i = 0; i < 5; i += 2) { const a = inner[i], b = inner[(i + 1) % 5]; ctx.beginPath(); ctx.moveTo(cx + a[0] * s, cy + a[1] * s); ctx.lineTo(cx + b[0] * s, cy + b[1] * s); ctx.lineTo(cx + c[0] * s, cy + c[1] * s); ctx.fill(); }
  ctx.globalAlpha = 1;
  // S
  g = ctx.createLinearGradient(cx - s, cy - s * 0.6, cx + s, cy + s * 0.4);
  g.addColorStop(0, '#ff5a5a'); g.addColorStop(0.5, red); g.addColorStop(1, '#7a0610');
  ctx.beginPath(); SPATH.forEach(([x, y], i) => i ? ctx.lineTo(cx + x * s, cy + y * s) : ctx.moveTo(cx + x * s, cy + y * s));
  ctx.lineWidth = SW * s; ctx.lineCap = 'butt'; ctx.strokeStyle = g; ctx.stroke();
  // inner bevel highlight along the S spine
  ctx.beginPath(); SPATH.forEach(([x, y], i) => i ? ctx.lineTo(cx + x * s, cy + (y - SW * 0.25) * s) : ctx.moveTo(cx + x * s, cy + (y - SW * 0.25) * s));
  ctx.lineWidth = Math.max(1, s * 0.025); ctx.strokeStyle = 'rgba(255,170,170,.45)'; ctx.stroke();
  // rim edge highlight
  polyPath(ctx, OUTLINE, cx, cy, s); ctx.lineWidth = Math.max(1, s * 0.02); ctx.strokeStyle = 'rgba(255,220,180,.8)'; ctx.stroke();
  polyPath(ctx, inner, cx, cy, s); ctx.lineWidth = Math.max(1, s * 0.012); ctx.strokeStyle = 'rgba(120,20,0,.6)'; ctx.stroke();
  ctx.restore();
}
