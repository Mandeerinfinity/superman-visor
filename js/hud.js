// 2D HUD overlay drawn once per frame on its own canvas.
const DIRS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
const MODE_TAGS = ['NORMAL HUD', 'HEAT VISION', 'X-RAY', 'TELESCOPIC', 'MICROSCOPIC', 'KRYPTONIAN NIGHT', 'SOLAR AURA'];
export { MODE_TAGS };

export function createHUD(cv) {
  const ctx = cv.getContext('2d');
  let W = 0, H = 0, dpr = 1;
  const blips = [], sparks = [], scorch = [];
  let lastSweep = 0;
  const h = {
    sparks, scorch,
    resize() { dpr = Math.min(2, devicePixelRatio || 1); W = cv.clientWidth; H = cv.clientHeight; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); },
    get W() { return W; }, get H() { return H; },
    draw(s) {
      const T = s.t / 1000, A = s.colA, C = s.colC, B = s.colB;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      ctx.lineCap = 'round'; ctx.textBaseline = 'middle';
      const top = 112, bot = H - 400, cx = W / 2, cy = Math.max(top + 120, Math.min(H * 0.42, bot - 40));
      // corner brackets
      ctx.strokeStyle = A; ctx.lineWidth = 2; ctx.globalAlpha = 0.8;
      const m = 14, L = 26, y0 = 58, y1 = H - 250;
      [[m, y0, 1, 1], [W - m, y0, -1, 1], [m, y1, 1, -1], [W - m, y1, -1, -1]].forEach(([x, y, sx, sy]) => { ctx.beginPath(); ctx.moveTo(x, y + L * sy); ctx.lineTo(x, y); ctx.lineTo(x + L * sx, y); ctx.stroke(); });
      ctx.globalAlpha = 1;
      compass(s.heading, cx, 82, Math.min(W * 0.62, 420), A, C);
      tape(36, top + 30, bot, s.alt, 'ALT', 'm', 1, A, C, 50);
      tape(W - 62, top + 160, bot, s.speed, 'SPD', 'km/h', -1, A, C, 10);
      radar(66, H - 322, 50, T, s, A, B, C);
      dataBlock(W - 18, H - 360, s, C);
      // mode-specific centre graphics
      if (s.mode === 1) heatReticle(s, T, C);
      else if (s.mode === 2) skeleton(cx, cy, T, A);
      else if (s.mode === 3) scope(cx, cy, T, s, C);
      else if (s.mode === 4) microGrid(cx, cy, T, C);
      else reticle(cx, cy, T, s.mode === 6 ? '#ffd76a' : s.mode === 5 ? '#6dffc6' : A, C, s.mode);
      beams(s, T);
      particles();
    }
  };
  function txt(t, x, y, size, col, align = 'center', font = 'Rajdhani') { ctx.font = `700 ${size}px ${font}`; ctx.fillStyle = col; ctx.textAlign = align; ctx.fillText(t, x, y); }
  function compass(hd, cx, y, w, A, C) {
    ctx.save(); ctx.beginPath(); ctx.rect(cx - w / 2, y - 22, w, 44); ctx.clip();
    const pxPerDeg = w / 90;
    ctx.strokeStyle = A; ctx.lineWidth = 1.5;
    for (let d = Math.floor(hd - 50); d <= hd + 50; d++) {
      if (d % 5) continue; const x = cx + (d - hd) * pxPerDeg, nd = ((d % 360) + 360) % 360;
      const big = nd % 45 === 0; ctx.globalAlpha = 1 - Math.abs(x - cx) / (w / 2) * 0.85;
      ctx.beginPath(); ctx.moveTo(x, y + 12); ctx.lineTo(x, y + (big ? -2 : nd % 15 === 0 ? 4 : 8)); ctx.stroke();
      if (big) txt(DIRS[nd / 45], x, y - 11, 13, nd === 0 ? '#ff5050' : '#dff3ff');
      else if (nd % 15 === 0) txt(String(nd), x, y - 9, 10, 'rgba(200,230,255,.7)');
    }
    ctx.restore(); ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(2,8,24,.75)'; ctx.strokeStyle = C; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(cx - 26, y + 16); ctx.lineTo(cx + 26, y + 16); ctx.lineTo(cx + 26, y + 34); ctx.lineTo(cx + 5, y + 34); ctx.lineTo(cx, y + 39); ctx.lineTo(cx - 5, y + 34); ctx.lineTo(cx - 26, y + 34); ctx.closePath(); ctx.fill(); ctx.stroke();
    txt(String(Math.round(((hd % 360) + 360) % 360)).padStart(3, '0') + '°', cx, y + 25.5, 13, C);
  }
  function tape(x, y0, y1, val, lbl, unit, side, A, C, step) {
    if (y1 - y0 < 80) return;
    const mid = (y0 + y1) / 2, span = (y1 - y0), per = span / 8;
    ctx.save(); ctx.beginPath(); ctx.rect(x - 40, y0, 80, span); ctx.clip();
    ctx.strokeStyle = A; ctx.lineWidth = 1.5;
    const base = Math.floor(val / step) * step;
    for (let k = -6; k <= 6; k++) {
      const v = base + k * step, yy = mid - (v - val) / step * per; ctx.globalAlpha = 1 - Math.abs(yy - mid) / (span / 2) * 0.8;
      ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + 10 * side, yy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, yy + per / 2); ctx.lineTo(x + 5 * side, yy + per / 2); ctx.stroke();
      txt(String(v), x + 14 * side, yy, 11, 'rgba(210,235,255,.85)', side > 0 ? 'left' : 'right');
    }
    ctx.restore(); ctx.globalAlpha = 1;
    ctx.strokeStyle = A; ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y1); ctx.stroke(); ctx.globalAlpha = 1;
    // value box
    const bx = x + (side > 0 ? 6 : -60);
    ctx.fillStyle = 'rgba(2,8,24,.8)'; ctx.strokeStyle = C; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.rect(bx, mid - 12, 54, 24); ctx.fill(); ctx.stroke();
    txt(String(Math.round(val)), bx + 27, mid, 15, '#fff');
    txt(lbl, x, y0 - 18, 11, C); txt(unit, x, y1 + 12, 10, 'rgba(200,230,255,.6)');
  }
  function radar(x, y, r, T, s, A, B, C) {
    ctx.save();
    ctx.fillStyle = 'rgba(2,14,34,.55)'; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    ctx.strokeStyle = A; ctx.lineWidth = 1; ctx.globalAlpha = 0.6;
    for (const k of [0.33, 0.66, 1]) { ctx.beginPath(); ctx.arc(x, y, r * k, 0, 7); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(x - r, y); ctx.lineTo(x + r, y); ctx.moveTo(x, y - r); ctx.lineTo(x, y + r); ctx.stroke();
    ctx.globalAlpha = 1;
    const ang = (T * 2.2) % (Math.PI * 2);
    // sweep wedge (cheap: several fading lines)
    for (let i = 0; i < 14; i++) { const a = ang - i * 0.05; ctx.strokeStyle = `rgba(90,255,180,${0.5 * (1 - i / 14)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); ctx.stroke(); }
    if (ang < lastSweep) { if (blips.length < 6 && Math.random() < 0.7) blips.push({ a: Math.random() * 6.28, d: 0.25 + Math.random() * 0.7, life: 1, hostile: Math.random() < 0.3 }); s.onSweep && s.onSweep(); }
    lastSweep = ang;
    for (let i = blips.length - 1; i >= 0; i--) {
      const b = blips[i]; b.life -= 0.003; if (b.life <= 0) { blips.splice(i, 1); continue; }
      let da = ((ang - b.a) % 6.283 + 6.283) % 6.283; const bright = Math.max(0.15, 1 - da / 3) * b.life;
      ctx.fillStyle = b.hostile ? `rgba(255,60,60,${bright})` : `rgba(120,255,200,${bright})`;
      ctx.beginPath(); ctx.arc(x + Math.cos(b.a) * b.d * r, y + Math.sin(b.a) * b.d * r, b.hostile ? 3.5 : 2.5, 0, 7); ctx.fill();
    }
    const hostile = blips.filter(b => b.hostile).length, lvl = hostile >= 2 ? 'HIGH' : hostile ? 'GUARDED' : 'CLEAR';
    s.threat = lvl;
    txt('THREAT SCAN', x + r + 10, y - 14, 11, C, 'left');
    txt(lvl, x + r + 10, y + 2, 16, lvl === 'HIGH' ? '#ff4d4d' : lvl === 'GUARDED' ? '#ffb340' : '#6dffb4', 'left');
    txt(`${blips.length} CONTACTS`, x + r + 10, y + 17, 10, 'rgba(200,230,255,.65)', 'left');
    ctx.restore();
  }
  function dataBlock(x, y, s, C) {
    const lines = [`SRC ${s.live ? 'OPTIC LIVE' : 'SIM METROPOLIS'}`, `ZOOM ${s.zoom.toFixed(1)}×`, `${s.fps} FPS · Q ${s.q}`, `GPS ${s.gps}`];
    lines.forEach((l, i) => txt(l, x, y + i * 14, 11, i === 0 ? C : 'rgba(200,230,255,.7)', 'right'));
  }
  function reticle(cx, cy, T, col, C, mode) {
    ctx.save(); ctx.translate(cx, cy); ctx.strokeStyle = col; ctx.lineWidth = 2;
    ctx.rotate(T * 0.4);
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(0, 0, 64, i * Math.PI / 2 + 0.2, i * Math.PI / 2 + 1.2); ctx.stroke(); }
    ctx.rotate(-T * 1.1); ctx.globalAlpha = 0.6; ctx.lineWidth = 1;
    for (let i = 0; i < 36; i++) { ctx.rotate(Math.PI / 18); ctx.beginPath(); ctx.moveTo(84, 0); ctx.lineTo(i % 3 ? 88 : 94, 0); ctx.stroke(); }
    ctx.restore(); ctx.save(); ctx.translate(cx, cy);
    ctx.strokeStyle = C; ctx.lineWidth = 1.5;
    // crystal diamond centre
    const k = 10 + 2 * Math.sin(T * 4);
    ctx.beginPath(); ctx.moveTo(-k, -k * 0.5); ctx.lineTo(-k * 0.6, -k); ctx.lineTo(k * 0.6, -k); ctx.lineTo(k, -k * 0.5); ctx.lineTo(0, k); ctx.closePath(); ctx.stroke();
    ctx.beginPath(); [[-40, 0, -20, 0], [40, 0, 20, 0], [0, -40, 0, -22], [0, 40, 0, 22]].forEach(([a, b, c, d]) => { ctx.moveTo(a, b); ctx.lineTo(c, d); }); ctx.stroke();
    if (mode === 6) { ctx.strokeStyle = 'rgba(255,215,106,.5)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(0, 0, 110 + 6 * Math.sin(T * 3), 0, 7); ctx.stroke(); txt('SOLAR ABSORPTION ×3', 0, 132, 12, '#ffd76a'); }
    if (mode === 5) txt('PHOTON AMPLIFICATION 40 000×', 0, 112, 12, '#6dffc6');
    ctx.restore();
  }
  function heatReticle(s, T, C) {
    const [tx, ty] = s.target; ctx.save(); ctx.translate(tx, ty);
    const pulse = 1 + 0.08 * Math.sin(T * 10);
    ctx.strokeStyle = '#ff3b2f'; ctx.lineWidth = 2;
    ctx.save(); ctx.rotate(-T); for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(0, 0, 40 * pulse, i * 2.094, i * 2.094 + 1.4); ctx.stroke(); } ctx.restore();
    ctx.beginPath(); [[-58, 0, -24, 0], [58, 0, 24, 0], [0, -58, 0, -24], [0, 58, 0, 24]].forEach(([a, b, c, d]) => { ctx.moveTo(a, b); ctx.lineTo(c, d); }); ctx.stroke();
    ctx.strokeStyle = '#ffd27a'; ctx.lineWidth = 1.5;
    const bs = 22; [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy]) => { ctx.beginPath(); ctx.moveTo(sx * bs, sy * (bs - 8)); ctx.lineTo(sx * bs, sy * bs); ctx.lineTo(sx * (bs - 8), sy * bs); ctx.stroke(); });
    ctx.fillStyle = '#ff3b2f'; ctx.beginPath(); ctx.arc(0, 0, 3, 0, 7); ctx.fill();
    txt(s.firing ? 'FIRING' : 'TARGET LOCK', 0, -72, 13, s.firing ? '#fff' : '#ff6a4a');
    txt(`${(5200 + Math.sin(T) * 80).toFixed(0)} K`, 50, 52, 11, '#ffd27a', 'left');
    ctx.restore();
    txt('TAP TO TARGET · HOLD FIRE', W / 2, H - 268, 12, 'rgba(255,200,170,.85)');
  }
  function skeleton(cx, cy, T, A) {
    ctx.save(); ctx.translate(cx, cy + 10); const s = Math.min(1.3, (H - 520) / 300 + 0.6);
    ctx.scale(s, s);
    ctx.strokeStyle = 'rgba(170,230,255,.85)'; ctx.lineWidth = 2; ctx.shadowColor = '#5cc8ff'; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.ellipse(0, -118, 17, 21, 0, 0, 7); ctx.stroke(); // skull
    ctx.beginPath(); ctx.arc(-6, -120, 4, 0, 7); ctx.arc(6, -120, 4, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-9, -103); ctx.lineTo(-7, -96); ctx.lineTo(7, -96); ctx.lineTo(9, -103); ctx.stroke(); // jaw
    ctx.beginPath(); for (let i = 0; i < 14; i++) { const y = -90 + i * 8; ctx.moveTo(-3, y); ctx.lineTo(3, y); } ctx.stroke(); // spine
    ctx.beginPath(); ctx.moveTo(-34, -82); ctx.lineTo(34, -82); ctx.stroke(); // clavicle
    for (let i = 0; i < 6; i++) { const y = -74 + i * 9, w = 30 - Math.abs(i - 2) * 3; ctx.beginPath(); ctx.ellipse(0, y, w, 5, 0, Math.PI * 0.05, Math.PI * 0.95); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(-26, 22); ctx.quadraticCurveTo(0, 6, 26, 22); ctx.quadraticCurveTo(18, 40, 0, 36); ctx.quadraticCurveTo(-18, 40, -26, 22); ctx.stroke(); // pelvis
    ctx.beginPath();
    const bone = (x0, y0, x1, y1) => { ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.moveTo(x1 + 3, y1); ctx.arc(x1, y1, 3, 0, 7); };
    const sw = Math.sin(T * 1.5) * 4;
    bone(-34, -82, -42, -30 + sw); bone(-42, -30 + sw, -46, 18); bone(34, -82, 42, -30 - sw); bone(42, -30 - sw, 46, 18);
    bone(-14, 34, -18, 96); bone(-18, 96, -20, 156); bone(14, 34, 18, 96); bone(18, 96, 20, 156);
    ctx.stroke();
    ctx.shadowBlur = 0;
    const sy = -140 + ((T * 90) % 310);
    const g = ctx.createLinearGradient(0, sy - 14, 0, sy + 14); g.addColorStop(0, 'rgba(90,200,255,0)'); g.addColorStop(0.5, 'rgba(140,230,255,.55)'); g.addColorStop(1, 'rgba(90,200,255,0)');
    ctx.fillStyle = g; ctx.fillRect(-80, sy - 14, 160, 28);
    ctx.restore();
    txt('DENSITY SCAN · LEAD SHIELDING: NONE', W / 2, H - 268, 12, 'rgba(170,230,255,.9)');
  }
  function scope(cx, cy, T, s, C) {
    const r = Math.min(W, H) * 0.36; ctx.save(); ctx.translate(cx, cy);
    ctx.strokeStyle = C; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.stroke();
    ctx.globalAlpha = 0.7; ctx.beginPath(); ctx.moveTo(-r, 0); ctx.lineTo(-12, 0); ctx.moveTo(r, 0); ctx.lineTo(12, 0); ctx.moveTo(0, -r); ctx.lineTo(0, -12); ctx.moveTo(0, r); ctx.lineTo(0, 12); ctx.stroke();
    for (let i = -5; i <= 5; i++) if (i) { ctx.beginPath(); ctx.arc(i * r / 6, 0, 2, 0, 7); ctx.arc(0, i * r / 6, 2, 0, 7); ctx.fillStyle = C; ctx.fill(); }
    ctx.globalAlpha = 1;
    ctx.rotate(T * 0.2); ctx.strokeStyle = 'rgba(255,255,255,.5)'; for (let i = 0; i < 60; i++) { ctx.rotate(Math.PI / 30); ctx.beginPath(); ctx.moveTo(r + 4, 0); ctx.lineTo(r + (i % 5 ? 9 : 16), 0); ctx.stroke(); }
    ctx.restore();
    txt(`MAG ${s.zoom.toFixed(1)}×`, cx - r + 6, cy - r - 14, 14, C, 'left');
    txt(`RANGE ${s.range}`, cx + r - 6, cy - r - 14, 14, C, 'right');
    txt('PINCH OR SLIDE TO ZOOM', cx, cy + r + 18, 11, 'rgba(220,240,255,.75)');
  }
  function microGrid(cx, cy, T, C) {
    const sz = Math.min(W, H) * 0.56; ctx.save(); ctx.translate(cx, cy);
    ctx.strokeStyle = 'rgba(120,255,230,.35)'; ctx.lineWidth = 1;
    for (let i = -4; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(i * sz / 8, -sz / 2); ctx.lineTo(i * sz / 8, sz / 2); ctx.moveTo(-sz / 2, i * sz / 8); ctx.lineTo(sz / 2, i * sz / 8); ctx.stroke(); }
    ctx.strokeStyle = C; ctx.lineWidth = 2; ctx.strokeRect(-sz / 2, -sz / 2, sz, sz);
    const px = Math.sin(T * 0.9) * sz * 0.3, py = Math.cos(T * 0.7) * sz * 0.3;
    ctx.strokeStyle = '#6dffe0'; ctx.strokeRect(px - 22, py - 22, 44, 44);
    ctx.beginPath(); ctx.moveTo(px + 22, py - 22); ctx.lineTo(sz / 2 + 4, -sz / 2 - 18); ctx.stroke();
    ctx.restore();
    txt(`SAMPLE ${(Math.abs(Math.sin(T * 0.3)) * 999).toFixed(0).padStart(3, '0')} · 0.${(Math.floor(T * 7) % 90 + 10)} µm`, cx + sz / 2, cy - sz / 2 - 26, 12, '#6dffe0', 'right');
    txt('MOLECULAR DETAIL SCAN', cx, cy + sz / 2 + 16, 12, C);
  }
  function beams(s, T) {
    if (!s.firing) return;
    const [tx, ty] = s.target;
    const eyes = [[W / 2 - 46, -10], [W / 2 + 46, -10]];
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const [ex, ey] of eyes) {
      const jx = (Math.random() - 0.5) * 3, layers = [[34, 'rgba(255,0,0,.18)'], [18, 'rgba(255,40,10,.35)'], [8, 'rgba(255,140,40,.8)'], [3, 'rgba(255,255,230,1)']];
      for (const [w, c] of layers) { ctx.strokeStyle = c; ctx.lineWidth = w * (0.85 + Math.random() * 0.3); ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(tx + jx, ty); ctx.stroke(); }
    }
    const g = ctx.createRadialGradient(tx, ty, 0, tx, ty, 70); g.addColorStop(0, 'rgba(255,255,220,1)'); g.addColorStop(0.2, 'rgba(255,160,40,.9)'); g.addColorStop(1, 'rgba(255,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(tx, ty, 70, 0, 7); ctx.fill();
    ctx.restore();
    for (let i = 0; i < 4; i++) { const a = Math.random() * 6.28, v = 2 + Math.random() * 6; sparks.push({ x: tx, y: ty, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2, life: 1 }); }
    if (Math.random() < 0.3) scorch.push({ x: tx + (Math.random() - 0.5) * 16, y: ty + (Math.random() - 0.5) * 16, r: 6 + Math.random() * 10, life: 1 });
  }
  function particles() {
    if (sparks.length > 220) sparks.splice(0, sparks.length - 220);
    for (let i = scorch.length - 1; i >= 0; i--) { const sc = scorch[i]; sc.life -= 0.004; if (sc.life <= 0) { scorch.splice(i, 1); continue; }
      ctx.fillStyle = `rgba(255,${80 + 100 * sc.life},20,${0.5 * sc.life})`; ctx.beginPath(); ctx.arc(sc.x, sc.y, sc.r, 0, 7); ctx.fill(); }
    if (!sparks.length) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = sparks.length - 1; i >= 0; i--) { const p = sparks[i]; p.x += p.vx; p.y += p.vy; p.vy += 0.25; p.life -= 0.03; if (p.life <= 0) { sparks.splice(i, 1); continue; }
      ctx.strokeStyle = `rgba(255,${150 + 100 * p.life},60,${p.life})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 1.5, p.y - p.vy * 1.5); ctx.stroke(); }
    ctx.restore();
  }
  return h;
}
