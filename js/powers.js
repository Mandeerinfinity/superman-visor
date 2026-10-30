// Super powers: Freeze Breath, Super Breath, Punch shockwave + screen crack, Super Speed. Drives shader fx + HUD particles.
const rnd = (a, b) => a + Math.random() * (b - a);
export function createPowers(v) {
  const P = [], cracks = []; let frostT = 99, shockT = 99, windT = 99, speedT = 99, shake = 0, windDir = [0, -1];
  const p = {
    get shake() { return shake; },
    trigger(kind, x, y, W, H) {
      const u = x / W, w = 1 - y / H, f = v.fx;
      if (kind === 'freeze') { f.frost = [u, w, 0, 1]; frostT = 0; for (let i = 0; i < 70; i++) { const a = Math.random() * 6.28, s = rnd(40, 260); P.push({ k: 'ice', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1, r: rnd(1.5, 4.5), rot: Math.random() * 6 }); } f.glitch = Math.max(f.glitch, 0.15); }
      else if (kind === 'breath') { windT = 0; const ox = W / 2, oy = H + 20, d = Math.hypot(x - ox, y - oy) || 1; windDir = [(x - ox) / d, (y - oy) / d];
        for (let i = 0; i < 110; i++) { const sp = rnd(500, 1100), j = rnd(-0.25, 0.25); P.push({ k: 'wind', x: ox + rnd(-60, 60), y: oy - rnd(0, 40), vx: (windDir[0] + j) * sp, vy: (windDir[1] + j * 0.5) * sp, life: rnd(0.6, 1), delay: Math.random() * 0.4 }); } }
      else if (kind === 'punch') { f.shock = [u, w, 0, 1]; shockT = 0; f.flash = 0.8; shake = 1; f.glitch = 0.6;
        const segs = []; for (let b = 0; b < 9; b++) { let a = b / 9 * 6.28 + rnd(-0.2, 0.2), cx = x, cy = y, len = rnd(60, 220); const pts = [[cx, cy]];
          for (let s = 0; s < 6; s++) { a += rnd(-0.45, 0.45); cx += Math.cos(a) * len / 6; cy += Math.sin(a) * len / 6; pts.push([cx, cy]); if (Math.random() < 0.3) segs.push([[cx, cy], [cx + Math.cos(a + 1) * 30, cy + Math.sin(a + 1) * 30]]); } segs.push(pts); }
        cracks.push({ segs, x, y, life: 1 }); if (cracks.length > 3) cracks.shift();
        for (let i = 0; i < 40; i++) { const a = Math.random() * 6.28, s = rnd(100, 500); P.push({ k: 'shard', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1, r: rnd(2, 6), rot: Math.random() * 6 }); } }
      else if (kind === 'speed') { speedT = 0; f.blur = 1; for (let i = 0; i < 60; i++) { const a = Math.random() * 6.28; P.push({ k: 'streak', a, d: rnd(30, 120), sp: rnd(600, 1400), life: 1, cx: x, cy: y }); } }
    },
    update(dt) {
      const f = v.fx; frostT += dt; shockT += dt; windT += dt; speedT += dt;
      if (frostT < 6) { f.frost[2] = Math.min(0.34, frostT * 0.9); f.frost[3] = frostT < 3.5 ? 1 : Math.max(0, 1 - (frostT - 3.5) / 2); } else f.frost[3] = 0;
      if (shockT < 1) { f.shock[2] = shockT * 1.5; f.shock[3] = Math.max(0, 1 - shockT / 0.9); } else f.shock[3] = 0;
      f.wind = windT < 1.6 ? Math.max(0, 1 - windT / 1.6) : 0;
      f.blur = speedT < 1.8 ? Math.max(0, 1 - speedT / 1.8) : Math.max(0, f.blur - dt * 2);
      f.flash = Math.max(0, f.flash - dt * 3); f.glitch = Math.max(0, f.glitch - dt * 1.6); shake = Math.max(0, shake - dt * 3);
      for (const c of cracks) c.life -= dt / 3.5; while (cracks.length && cracks[0].life <= 0) cracks.shift();
    },
    draw(ctx, W, H, dt) {
      if (!P.length && !cracks.length) return;
      for (const c of cracks) { ctx.save(); ctx.globalAlpha = Math.min(1, c.life * 1.5); ctx.lineJoin = 'round';
        for (const [w, col] of [[3.5, 'rgba(0,0,0,.45)'], [1.4, 'rgba(235,245,255,.95)']]) { ctx.lineWidth = w; ctx.strokeStyle = col; ctx.beginPath(); for (const s of c.segs) { ctx.moveTo(...s[0]); for (let i = 1; i < s.length; i++) ctx.lineTo(...s[i]); } ctx.stroke(); }
        const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, 40); g.addColorStop(0, 'rgba(255,255,255,.5)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(c.x - 40, c.y - 40, 80, 80); ctx.restore(); }
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = P.length - 1; i >= 0; i--) { const q = P[i];
        if (q.delay > 0) { q.delay -= dt; continue; }
        q.life -= dt * (q.k === 'wind' ? 1.1 : q.k === 'streak' ? 1.6 : 0.9); if (q.life <= 0 || q.x < -100 || q.x > W + 100 || q.y < -100 || q.y > H + 100) { P.splice(i, 1); continue; }
        if (q.k === 'streak') { q.d += q.sp * dt; const x0 = q.cx + Math.cos(q.a) * q.d, y0 = q.cy + Math.sin(q.a) * q.d; ctx.strokeStyle = `rgba(200,230,255,${q.life * 0.7})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 - Math.cos(q.a) * 60, y0 - Math.sin(q.a) * 60); ctx.stroke(); continue; }
        q.x += q.vx * dt; q.y += q.vy * dt; const drag = q.k === 'wind' ? 0.995 : 0.94; q.vx *= drag; q.vy *= drag;
        if (q.k === 'wind') { ctx.strokeStyle = `rgba(210,235,255,${q.life * 0.45})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x - q.vx * 0.05, q.y - q.vy * 0.05); ctx.stroke(); }
        else { q.rot += dt * 3; ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot); ctx.fillStyle = q.k === 'ice' ? `rgba(190,240,255,${q.life})` : `rgba(255,255,255,${q.life})`;
          ctx.beginPath(); ctx.moveTo(0, -q.r * 1.6); ctx.lineTo(q.r * 0.6, 0); ctx.lineTo(0, q.r * 1.6); ctx.lineTo(-q.r * 0.6, 0); ctx.fill(); ctx.restore(); }
      }
      ctx.restore(); if (P.length > 400) P.splice(0, P.length - 400);
    }
  };
  return p;
}
