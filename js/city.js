// Demo Metropolis v2 — layered parallax skyline rendered in canvas2D at 480px wide, uploaded as the vision source.
// Original art: art-deco towers, ringed-globe tower, weather, birds, aircraft, blimp, train, rain, lightning, incidents.
const rnd = (a, b) => a + Math.random() * (b - a);
export function createCity() {
  const cv = document.createElement('canvas'), ctx = cv.getContext('2d', { alpha: false });
  let W = 0, H = 0, LW = 0, layers = [], stars = [], lights = [], winFlick = [], clouds = [], globes = [], krypW = [];
  const weather = { code: 1, isDay: 1, rain: 0, cloud: 0.3, wind: 10, storm: 0, temp: 18 };
  const city = { cv, weather, pan: 0, auto: true, incidents: [], tracked: [], kryp: [], time: 0, lightning: 0 };
  function building(c, x, w, h, base, d, li) {
    const top = base - h, g = c.createLinearGradient(0, top, 0, base); g.addColorStop(0, d.top); g.addColorStop(1, d.col);
    c.fillStyle = g; c.fillRect(x, top, w, h);
    const style = Math.random();
    c.fillStyle = d.top;
    if (style < 0.3) { c.fillRect(x + w * 0.12, top - h * 0.07, w * 0.76, h * 0.07); c.fillRect(x + w * 0.26, top - h * 0.13, w * 0.48, h * 0.06); c.fillRect(x + w * 0.4, top - h * 0.18, w * 0.2, h * 0.05); }
    else if (style < 0.5) { c.beginPath(); c.moveTo(x, top); c.lineTo(x + w / 2, top - w * 0.6); c.lineTo(x + w, top); c.fill(); }
    else if (style < 0.62) { c.fillRect(x + w * 0.65, top - 8, w * 0.22, 8); c.fillRect(x + w * 0.62, top - 10, w * 0.28, 2); } // water tank
    if (Math.random() < 0.4) { const ax = x + w * 0.5, ah = h * (0.15 + Math.random() * 0.2), at = top - (style < 0.3 ? h * 0.18 : style < 0.5 ? w * 0.6 : 0);
      c.fillRect(ax - 0.6, at - ah, 1.4, ah); lights.push({ x: ax, y: at - ah, ph: Math.random() * 6, li }); }
    // rim light from sunset (right edge) + cool left edge
    c.fillStyle = d.rim; c.fillRect(x + w - Math.max(1, w * 0.05), top, Math.max(1, w * 0.05), h);
    c.fillStyle = 'rgba(120,160,255,.08)'; c.fillRect(x, top, Math.max(1, w * 0.04), h);
    if (!d.d) return;
    const ww = Math.max(1.4, w / 12), wh = Math.max(1.6, ww * 1.2), rowLit = [];
    for (let yy = top + 4, r = 0; yy < base - 3; yy += wh * 1.85, r++) {
      const floorLit = Math.random() < 0.08;
      for (let xx = x + 3; xx < x + w - 3 - ww; xx += ww * 1.75) {
        if (floorLit || Math.random() < d.d) { const warm = Math.random() < 0.8; c.fillStyle = warm ? d.win : '#bfe2ff'; c.globalAlpha = floorLit ? 0.85 : rnd(0.35, 1); c.fillRect(xx, yy, ww, wh); }
        else if (li === 2 && Math.random() < 0.02) winFlick.push({ x: xx, y: yy, w: ww, h: wh, ph: Math.random() * 6.28, sp: rnd(0.1, 0.5) });
      }
    }
    c.globalAlpha = 1;
  }
  function globeTower(c, x, base, H, d) {
    const w = 0.13 * W, h = 0.5 * H, top = base - h;
    const g = c.createLinearGradient(x, 0, x + w, 0); g.addColorStop(0, '#1a2550'); g.addColorStop(0.7, '#0e1638'); g.addColorStop(1, '#3a2a40');
    c.fillStyle = g; c.fillRect(x, top, w, h); c.fillRect(x + w * 0.1, top - h * 0.06, w * 0.8, h * 0.06); c.fillRect(x + w * 0.22, top - h * 0.11, w * 0.56, h * 0.05);
    c.fillStyle = '#ffd98a'; for (let yy = top + 6; yy < base - 4; yy += 6) for (let xx = x + 4; xx < x + w - 6; xx += 5) if (Math.random() < 0.45) { c.globalAlpha = rnd(0.4, 1); c.fillRect(xx, yy, 2.2, 2.6); }
    c.globalAlpha = 1; c.fillStyle = 'rgba(255,170,90,.25)'; c.fillRect(x + w - 2, top, 2, h);
    c.fillStyle = '#0e1638'; c.fillRect(x + w * 0.44, top - h * 0.11 - w * 0.25, w * 0.12, w * 0.25);
    globes.push({ x: x + w / 2, y: top - h * 0.11 - w * 0.25 - w * 0.36, r: w * 0.36 });
  }
  function build() {
    layers = []; lights = []; winFlick = []; globes = [];
    LW = W * 3;
    const defs = [
      { h: [0.12, 0.3], w: [0.05, 0.12], col: '#3a3f86', top: '#4a4f9a', rim: 'rgba(255,170,140,.15)', win: '#8a8fd8', d: 0, base: 0.72, sp: 0.25 },
      { h: [0.18, 0.42], w: [0.06, 0.12], col: '#16224a', top: '#26336a', rim: 'rgba(255,150,110,.22)', win: '#6f8fd8', d: 0.14, base: 0.77, sp: 0.45 },
      { h: [0.22, 0.55], w: [0.09, 0.16], col: '#0b1433', top: '#1a2552', rim: 'rgba(255,150,90,.3)', win: '#ffd27a', d: 0.2, base: 0.85, sp: 1 },
      { h: [0.28, 0.7], w: [0.15, 0.26], col: '#050a1c', top: '#0c1530', rim: 'rgba(255,130,70,.35)', win: '#ffc457', d: 0.24, base: 0.93, sp: 1.8 }
    ];
    defs.forEach((d, li) => {
      const lc = document.createElement('canvas'); lc.width = LW; lc.height = H; const c = lc.getContext('2d');
      if (li === 0) { c.globalAlpha = 0.55; }
      let x = -6;
      while (x < LW - 20) { const w = rnd(...d.w) * W;
        if (li === 2 && (Math.abs(x - W * 0.5) < W * 0.08 || Math.abs(x - W * 1.9) < W * 0.08)) { globeTower(c, x, d.base * H, H, d); x += 0.13 * W + 4; continue; }
        building(c, x, w, rnd(...d.h) * H, d.base * H, d, li); x += w + rnd(-0.01, 0.02) * W; }
      c.globalAlpha = 1; c.fillStyle = d.col; c.fillRect(0, d.base * H, LW, H);
      layers.push({ cv: lc, sp: d.sp, base: d.base });
    });
    stars = Array.from({ length: 160 }, () => ({ x: Math.random() * W, y: Math.random() * H * 0.55, a: Math.random(), s: Math.random() < 0.1 ? 1.6 : 1 }));
    clouds = Array.from({ length: 7 }, (_, i) => { const c = document.createElement('canvas'); c.width = 220; c.height = 70; const x = c.getContext('2d');
      for (let k = 0; k < 9; k++) { const cx = rnd(40, 180), cy = rnd(28, 46), r = rnd(14, 30), g = x.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, 'rgba(255,220,230,.5)'); g.addColorStop(1, 'rgba(255,200,220,0)'); x.fillStyle = g; x.fillRect(0, 0, 220, 70); }
      return { c, x: Math.random() * W * 1.5, y: rnd(0.08, 0.42) * H, sp: rnd(2, 6), s: rnd(0.8, 1.6) }; });
    krypW = [{ x: W * 0.95, y: 0.6 }, { x: W * 2.3, y: 0.66 }];
  }
  const cars = Array.from({ length: 18 }, (_, i) => ({ x: Math.random(), lane: i % 2, sp: rnd(0.05, 0.12) }));
  const planes = Array.from({ length: 2 }, (_, i) => ({ x: Math.random(), y: rnd(0.1, 0.22), sp: rnd(0.012, 0.022), dir: i ? -1 : 1 }));
  const flyers = Array.from({ length: 5 }, () => ({ x: Math.random(), y: rnd(0.3, 0.5), sp: rnd(0.02, 0.05), dir: Math.random() < 0.5 ? 1 : -1 }));
  const birds = Array.from({ length: 9 }, (_, i) => ({ dx: (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 7, dy: Math.ceil(i / 2) * 5, ph: Math.random() * 6 }));
  let flock = { x: -0.2, y: 0.34 }, rain = [], bolt = null;
  const wrap = (x) => ((x % LW) + LW) % LW;
  const toScreen = (wx, sp) => { let x = wrap(wx - city.scroll * sp); if (x > LW - W * 0.5) x -= LW; return x; };
  city.toScreen = toScreen;

  city.resize = (cw, ch) => { const w = 480, h = Math.round(480 * ch / cw) || 900; if (w === W && h === H) return; W = cv.width = w; H = cv.height = h; build(); };
  Object.defineProperty(city, 'W', { get: () => W }); Object.defineProperty(city, 'H', { get: () => H }); Object.defineProperty(city, 'LW', { get: () => LW });
  city.scroll = 0;
  city.draw = (t) => {
    const T = t / 1000, dt = Math.min(0.1, T - (city.time || T)) || 0.016; city.time = T;
    if (city.auto) city.scroll += dt * 3; const wx = weather, night = !wx.isDay, ov = Math.min(1, wx.cloud * 0.9 + wx.rain * 0.6);
    const tr = []; city.tracked = tr;
    // sky
    let g = ctx.createLinearGradient(0, 0, 0, H);
    if (night) { g.addColorStop(0, '#01030f'); g.addColorStop(0.5, '#0a1640'); g.addColorStop(0.78, '#28306a'); g.addColorStop(0.9, '#4a3a70'); }
    else { g.addColorStop(0, '#040a24'); g.addColorStop(0.42, '#1a2a6c'); g.addColorStop(0.66, '#b03a5b'); g.addColorStop(0.8, '#ff9a4a'); }
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (ov > 0.05) { ctx.fillStyle = `rgba(40,44,70,${ov * 0.55})`; ctx.fillRect(0, 0, W, H); }
    for (const s of stars) { const a = (0.25 + 0.55 * Math.abs(Math.sin(T * 0.8 + s.a * 9))) * (1 - ov) * (night ? 1 : 0.7); if (a < 0.05) continue; ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.fillRect(s.x, s.y, s.s, s.s); }
    if (night) { const mx = W * 0.78, my = H * 0.14; g = ctx.createRadialGradient(mx, my, 4, mx, my, 70); g.addColorStop(0, 'rgba(220,235,255,.45)'); g.addColorStop(1, 'rgba(150,180,255,0)'); ctx.fillStyle = g; ctx.fillRect(mx - 70, my - 70, 140, 140);
      ctx.fillStyle = '#eef4ff'; ctx.beginPath(); ctx.arc(mx, my, 13, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(160,175,210,.5)'; ctx.beginPath(); ctx.arc(mx - 4, my - 3, 3, 0, 7); ctx.arc(mx + 5, my + 4, 2, 0, 7); ctx.fill(); }
    else { g = ctx.createRadialGradient(W * 0.7, H * 0.7, 2, W * 0.7, H * 0.7, W * 0.4); g.addColorStop(0, 'rgba(255,240,200,1)'); g.addColorStop(0.12, 'rgba(255,190,90,.9)'); g.addColorStop(1, 'rgba(255,120,60,0)'); ctx.fillStyle = g; ctx.fillRect(0, H * 0.28, W, H * 0.72); }
    // clouds
    ctx.globalAlpha = 0.35 + ov * 0.5;
    for (const c of clouds) { c.x -= c.sp * dt * (1 + wx.wind / 20); if (c.x < -240 * c.s) c.x = W + rnd(0, 100); ctx.drawImage(c.c, c.x, c.y, 220 * c.s, 70 * c.s); }
    ctx.globalAlpha = 1;
    // lightning
    if (wx.storm && Math.random() < 0.004) { city.lightning = 1; bolt = []; let x = rnd(0.2, 0.8) * W, y = 0; while (y < H * 0.7) { bolt.push([x, y]); x += rnd(-18, 18); y += rnd(14, 34); } }
    if (city.lightning > 0) { ctx.fillStyle = `rgba(200,210,255,${city.lightning * 0.35})`; ctx.fillRect(0, 0, W, H);
      if (bolt && city.lightning > 0.5) { ctx.strokeStyle = '#f4f6ff'; ctx.lineWidth = 2; ctx.beginPath(); bolt.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); }
      city.lightning = Math.max(0, city.lightning - dt * 3); }
    // searchlights
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) { const bx = W * (0.2 + i * 0.3), a = -Math.PI / 2 + Math.sin(T * 0.5 + i * 2) * 0.5;
      ctx.save(); ctx.translate(bx, H * 0.84); ctx.rotate(a); const sg = ctx.createLinearGradient(0, 0, H, 0); sg.addColorStop(0, 'rgba(200,230,255,.3)'); sg.addColorStop(1, 'rgba(200,230,255,0)');
      ctx.fillStyle = sg; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(H, -H * 0.06); ctx.lineTo(H, H * 0.06); ctx.fill(); ctx.restore(); }
    ctx.restore();
    // planes (high), blimp
    for (const p of planes) { p.x += p.sp * p.dir * dt; if (p.x > 1.2) p.x = -0.2; if (p.x < -0.2) p.x = 1.2; const x = p.x * W, y = p.y * H;
      ctx.strokeStyle = 'rgba(230,235,255,.18)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - p.dir * 90, y + 2); ctx.stroke();
      ctx.fillStyle = '#c8d0e8'; ctx.fillRect(x - 5, y - 1, 10, 2); ctx.fillRect(x - 1, y - 3, 3, 6);
      if (Math.sin(T * 6 + p.y * 40) > 0.6) { ctx.fillStyle = '#fff'; ctx.fillRect(x - 1, y - 1, 2, 2); }
      ctx.fillStyle = p.dir > 0 ? '#30ff60' : '#ff3030'; ctx.fillRect(x + 4 * p.dir, y, 1.5, 1.5); tr.push({ x, y, kind: 'AIRCRAFT', threat: 4 }); }
    { const bx = ((T * 6) % (W + 200)) - 100, by = H * 0.27; ctx.fillStyle = '#5a6488'; ctx.beginPath(); ctx.ellipse(bx, by, 34, 11, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#7a86ac'; ctx.beginPath(); ctx.ellipse(bx, by - 3, 30, 5, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#323a58'; ctx.fillRect(bx - 6, by + 9, 12, 4);
      ctx.fillStyle = '#081028'; ctx.fillRect(bx - 20, by - 4, 40, 8); for (let i = 0; i < 9; i++) if (((i + Math.floor(T * 5)) % 4)) { ctx.fillStyle = i % 3 ? '#4cd8ff' : '#ffcc33'; ctx.fillRect(bx - 18 + i * 4.2, by - 2, 2.6, 4); }
      tr.push({ x: bx, y: by, kind: 'AIRSHIP', threat: 2 }); }
    // birds
    flock.x += dt * 0.03; if (flock.x > 1.3) { flock.x = -0.3; flock.y = rnd(0.25, 0.45); }
    ctx.strokeStyle = '#0a0e22'; ctx.lineWidth = 1.2;
    for (const b of birds) { const x = flock.x * W + b.dx, y = flock.y * H + b.dy + Math.sin(T * 2 + b.ph) * 2, f = Math.sin(T * 9 + b.ph) * 2.5;
      ctx.beginPath(); ctx.moveTo(x - 4, y - f); ctx.lineTo(x, y); ctx.lineTo(x + 4, y - f); ctx.stroke(); }
    tr.push({ x: flock.x * W, y: flock.y * H + 10, kind: 'AVIAN FLOCK', threat: 0 });
    // skyline layers
    layers.forEach((L, li) => {
      const off = wrap(city.scroll * L.sp); ctx.drawImage(L.cv, -off, 0); if (off > LW - W) ctx.drawImage(L.cv, LW - off, 0);
      if (li === 1) for (const f of flyers) { f.x += f.sp * f.dir * dt; if (f.x > 1.1) f.x = -0.1; if (f.x < -0.1) f.x = 1.1;
        ctx.fillStyle = '#fff'; ctx.fillRect(f.x * W, f.y * H, 3, 1.5); ctx.fillStyle = Math.sin(T * 8) > 0 ? '#ff3030' : '#30ff60'; ctx.fillRect(f.x * W - 2 * f.dir, f.y * H, 1.5, 1.5); }
      if (li === 2) {
        for (const w of winFlick) { const x = toScreen(w.x, L.sp); if (x < -5 || x > W + 5) continue; if (Math.sin(T * w.sp + w.ph) > 0.2) { ctx.fillStyle = '#ffe2a0'; ctx.fillRect(x, w.y, w.w, w.h); } }
        for (const gb of globes) { const x = toScreen(gb.x, L.sp); if (x < -40 || x > W + 40) continue; drawGlobe(x, gb.y, gb.r, T); tr.push({ x, y: gb.y, kind: 'PLANET TOWER', threat: 0 }); }
        city.kryp = krypW.map(k => { const x = toScreen(k.x, L.sp), y = k.y * H; if (x > -10 && x < W + 10) drawKryp(x, y, T); return { x, y }; });
        for (const inc of city.incidents) { const x = toScreen(inc.wx, L.sp), y = inc.wy * H; inc.sx = x; inc.sy = y; if (x < -60 || x > W + 60) continue; drawIncident(inc, x, y, T, dt); tr.push({ x, y, kind: inc.label, threat: 8, inc }); }
      }
    });
    for (const l of lights) { if (Math.sin(T * 3 + l.ph) > 0.3) { const x = toScreen(l.x, layers[l.li].sp); if (x < -3 || x > W + 3) continue; ctx.fillStyle = '#ff2a2a'; ctx.fillRect(x - 1, l.y - 1, 2.5, 2.5); ctx.fillStyle = 'rgba(255,40,40,.25)'; ctx.fillRect(x - 3, l.y - 3, 6.5, 6.5); } }
    // elevated train
    const tp = (T % 14) / 14; if (tp < 0.5) { const tx = -160 + tp * 2 * (W + 320), ty = H * 0.905; ctx.fillStyle = '#1a2240'; ctx.fillRect(tx, ty, 150, 9);
      ctx.fillStyle = '#bfe8ff'; for (let i = 0; i < 18; i++) ctx.fillRect(tx + 4 + i * 8, ty + 2, 5, 3); ctx.fillStyle = '#fff6c0'; ctx.fillRect(tx + 148, ty + 3, 3, 3); }
    ctx.fillStyle = '#0a0f22'; ctx.fillRect(0, H * 0.917, W, 3);
    // street
    ctx.fillStyle = '#04060e'; ctx.fillRect(0, H * 0.93, W, H * 0.07);
    for (const c of cars) { c.x = (c.x + c.sp * dt * (c.lane ? 1 : -1) + 1) % 1; const y = H * (0.945 + c.lane * 0.022);
      ctx.fillStyle = c.lane ? '#fff8d0' : '#ff3a2a'; ctx.fillRect(c.x * W, y, 4, 2); ctx.fillRect(c.x * W + 7, y, 4, 2);
      ctx.fillStyle = c.lane ? 'rgba(255,248,208,.12)' : 'rgba(255,58,42,.12)'; ctx.fillRect(c.x * W - 2, y + 4, 15, 6); }
    // hero streak
    const ph = (T % 7) / 7; if (ph < 0.35) { const k = ph / 0.35, hx = -40 + k * (W + 80), hy = H * (0.38 - k * 0.2);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; const sg = ctx.createLinearGradient(hx - 70, hy + 24, hx, hy); sg.addColorStop(0, 'rgba(255,40,40,0)'); sg.addColorStop(1, 'rgba(255,60,60,.9)');
      ctx.strokeStyle = sg; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(hx - 70, hy + 24); ctx.lineTo(hx, hy); ctx.stroke(); ctx.fillStyle = '#9fd0ff'; ctx.beginPath(); ctx.arc(hx, hy, 2.5, 0, 7); ctx.fill(); ctx.restore();
      tr.push({ x: hx, y: hy, kind: 'UNKNOWN FLYER', threat: 1 }); }
    // rain
    if (wx.rain > 0.02) { const n = Math.floor(60 + wx.rain * 200); while (rain.length < n) rain.push({ x: Math.random() * W, y: Math.random() * H, v: rnd(500, 800) }); rain.length = n;
      ctx.strokeStyle = 'rgba(190,210,255,.35)'; ctx.lineWidth = 1; ctx.beginPath(); const sl = 0.12 + wx.wind / 200;
      for (const r of rain) { r.y += r.v * dt; r.x -= r.v * dt * sl; if (r.y > H) { r.y = -10; r.x = Math.random() * W * 1.2; } ctx.moveTo(r.x, r.y); ctx.lineTo(r.x + 10 * sl, r.y - 10); } ctx.stroke(); }
  };
  function drawGlobe(x, y, r, T) {
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, 1, x, y, r * 1.05); g.addColorStop(0, '#fff6c8'); g.addColorStop(0.45, '#e0a930'); g.addColorStop(1, '#5b3804');
    ctx.fillStyle = 'rgba(255,200,90,.18)'; ctx.beginPath(); ctx.arc(x, y, r * 1.8, 0, 7); ctx.fill();
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(110,60,0,.75)'; ctx.lineWidth = 0.8;
    for (let k = 0; k < 4; k++) { const a = ((T * 0.6 + k * Math.PI / 4) % Math.PI); const rx = Math.abs(Math.cos(a)) * r; ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.5, rx), r, 0, 0, 7); ctx.stroke(); }
    for (const k of [-0.5, 0, 0.5]) { ctx.beginPath(); ctx.ellipse(x, y + k * r, r * Math.sqrt(1 - k * k), r * 0.12, 0, 0, 7); ctx.stroke(); }
    ctx.strokeStyle = '#ffe9a8'; ctx.lineWidth = Math.max(1, r * 0.13); ctx.beginPath(); ctx.ellipse(x, y, r * 1.55, r * 0.38, -0.28, 0.1, Math.PI - 0.1); ctx.stroke();
  }
  function drawKryp(x, y, T) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(x, y, 0, x, y, 12); g.addColorStop(0, `rgba(80,255,120,${0.5 + 0.2 * Math.sin(T * 5)})`); g.addColorStop(1, 'rgba(0,255,80,0)');
    ctx.fillStyle = g; ctx.fillRect(x - 12, y - 12, 24, 24); ctx.fillStyle = '#5dff8a';
    for (const [dx, h] of [[-2, 6], [1, 9], [3.5, 5]]) { ctx.beginPath(); ctx.moveTo(x + dx - 1.4, y); ctx.lineTo(x + dx, y - h); ctx.lineTo(x + dx + 1.4, y); ctx.fill(); }
    ctx.restore();
  }
  function drawIncident(inc, x, y, T, dt) {
    const s = inc.hp; // 1 -> 0 as resolved
    if (inc.type === 'fire') {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 6; i++) { const fx = x + (i - 2.5) * 5, fh = (18 + 10 * Math.sin(T * 9 + i * 2)) * s, g = ctx.createLinearGradient(0, y - fh, 0, y);
        g.addColorStop(0, 'rgba(255,220,80,0)'); g.addColorStop(0.4, 'rgba(255,150,30,.9)'); g.addColorStop(1, 'rgba(255,60,10,.9)'); ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(fx - 4, y); ctx.quadraticCurveTo(fx - 3 + Math.sin(T * 7 + i) * 3, y - fh * 0.6, fx + Math.sin(T * 5 + i) * 2, y - fh); ctx.quadraticCurveTo(fx + 4, y - fh * 0.5, fx + 4, y); ctx.fill(); }
      ctx.restore();
      ctx.fillStyle = `rgba(60,60,70,${0.35 * s})`; for (let i = 0; i < 4; i++) { const py = y - 26 - ((T * 18 + i * 12) % 50); ctx.beginPath(); ctx.arc(x + Math.sin(T + i) * 6, py, 6 + i * 2, 0, 7); ctx.fill(); }
    } else if (inc.type === 'smoke') {
      for (let i = 0; i < 7; i++) { const py = y - ((T * 14 + i * 9) % 64); ctx.fillStyle = `rgba(150,150,160,${0.5 * s * (1 - (y - py) / 70)})`; ctx.beginPath(); ctx.arc(x + Math.sin(T * 0.8 + i) * 8 + (y - py) * 0.3, py, 7 + (y - py) * 0.18, 0, 7); ctx.fill(); }
      ctx.fillStyle = '#ffe680'; ctx.fillRect(x - 3, y - 2, 6, 3);
    } else if (inc.type === 'debris') {
      const sw = Math.sin(T * 2.2) * 0.35 * s; ctx.strokeStyle = '#8890a8'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y - 40); ctx.lineTo(x + Math.sin(sw) * 30, y - 40 + Math.cos(sw) * 30); ctx.stroke();
      ctx.save(); ctx.translate(x + Math.sin(sw) * 30, y - 40 + Math.cos(sw) * 30); ctx.rotate(sw); ctx.fillStyle = '#c06030'; ctx.fillRect(-16, -2, 32, 5); ctx.fillStyle = '#ffb060'; for (let i = -14; i < 16; i += 6) ctx.fillRect(i, -1, 2, 3); ctx.restore();
      ctx.fillStyle = '#ff4040'; if (Math.sin(T * 8) > 0) ctx.fillRect(x - 2, y - 44, 4, 4);
    } else {
      const bob = Math.sin(T * 3) * 3; ctx.fillStyle = '#2a2f40'; ctx.beginPath(); ctx.ellipse(x, y + bob, 12, 6, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#ff2030'; ctx.beginPath(); ctx.arc(x, y + bob, 2.5 + Math.sin(T * 10), 0, 7); ctx.fill();
      ctx.strokeStyle = '#555c78'; ctx.beginPath(); ctx.moveTo(x - 16, y - 6 + bob); ctx.lineTo(x + 16, y - 6 + bob); ctx.stroke();
      if (Math.sin(T * 2) > 0.7) { ctx.strokeStyle = 'rgba(255,40,40,.8)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, y + bob); ctx.lineTo(x + Math.sin(T) * 60, y + 80); ctx.stroke(); }
    }
  }
  return city;
}
