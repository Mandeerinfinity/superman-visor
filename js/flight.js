// Flight mode: pseudo-3D cloud field + parallax horizon driven by tilt (or drag).
const FIELD = ['#2f6b3a', '#3d7a2e', '#7a8a3a', '#5a7f4a', '#8a7a4a', '#2a5a48', '#4a8a5a', '#6e6a3a'];
export function createFlight(cv) {
  const ctx = cv.getContext('2d');
  let W = 0, H = 0, dpr = 1, bank = 0, pitch = 0, tBank = 0, tPitch = 0, speed = 1, boost = 0, alt = 3200, dist = 0;
  const sprites = [], clouds = [];
  function makeSprite(seed) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 128; const x = c.getContext('2d');
    for (let i = 0; i < 26; i++) {
      const px = 40 + Math.random() * 176, py = 70 + (Math.random() - 0.5) * 40 - Math.sin((px - 40) / 176 * Math.PI) * 22, r = 18 + Math.random() * 30;
      const g = x.createRadialGradient(px, py - r * 0.3, r * 0.1, px, py, r); g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(0.6, 'rgba(235,242,255,.6)'); g.addColorStop(1, 'rgba(200,215,240,0)');
      x.fillStyle = g; x.beginPath(); x.arc(px, py, r, 0, 7); x.fill();
    }
    // shaded underside
    const sg = x.createLinearGradient(0, 60, 0, 128); sg.addColorStop(0, 'rgba(120,140,190,0)'); sg.addColorStop(1, 'rgba(120,140,190,.35)');
    x.globalCompositeOperation = 'source-atop'; x.fillStyle = sg; x.fillRect(0, 0, 256, 128);
    return c;
  }
  for (let i = 0; i < 5; i++) sprites.push(makeSprite(i));
  for (let i = 0; i < 22; i++) clouds.push(newCloud(Math.random() * 30 + 1));
  function newCloud(z) { return { x: (Math.random() < 0.5 ? -1 : 1) * (6 + Math.random() * 40), y: (Math.random() - 0.4) * 16, z, s: sprites[Math.floor(Math.random() * sprites.length)], k: 0.45 + Math.random() * 0.8 }; }
  const f = {
    setTilt(gamma, beta) { tBank = Math.max(-45, Math.min(45, gamma || 0)) * Math.PI / 180 * 0.8; tPitch = Math.max(-30, Math.min(30, (beta || 45) - 45)) / 30; },
    drag(dx, dy) { tBank = Math.max(-0.7, Math.min(0.7, tBank + dx * 0.004)); tPitch = Math.max(-1, Math.min(1, tPitch + dy * 0.006)); },
    boost() { boost = 1; },
    resize() { dpr = Math.min(2, devicePixelRatio || 1); W = cv.clientWidth; H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr; },
    frame(t, dt, autoSway) {
      if (cv.clientWidth !== W || cv.clientHeight !== H) f.resize();
      const T = t / 1000;
      if (autoSway) { tBank = Math.sin(T * 0.4) * 0.35; tPitch = Math.sin(T * 0.27) * 0.4; }
      bank += (tBank - bank) * Math.min(1, dt * 4); pitch += (tPitch - pitch) * Math.min(1, dt * 3);
      boost = Math.max(0, boost - dt * 0.35); speed = 1 + boost * 4;
      alt += pitch * dt * 120 * speed; alt = Math.max(300, Math.min(12000, alt)); dist += speed * dt;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(-bank);
      const hy = pitch * H * 0.3, D = Math.hypot(W, H);
      // sky
      let g = ctx.createLinearGradient(0, -D / 2 + hy, 0, hy);
      g.addColorStop(0, '#0b3a8f'); g.addColorStop(0.6, '#3f8ce8'); g.addColorStop(1, '#bfe2ff');
      ctx.fillStyle = g; ctx.fillRect(-D, -D, D * 2, D + hy);
      // sun
      const sx = W * 0.25, sy = hy - H * 0.28;
      g = ctx.createRadialGradient(sx, sy, 4, sx, sy, 180); g.addColorStop(0, 'rgba(255,255,240,1)'); g.addColorStop(0.12, 'rgba(255,240,180,.9)'); g.addColorStop(1, 'rgba(255,220,150,0)');
      ctx.fillStyle = g; ctx.fillRect(sx - 180, sy - 180, 360, 360);
      // ground: earth far below, haze
      g = ctx.createLinearGradient(0, hy, 0, hy + D / 2); g.addColorStop(0, '#a8c8e8'); g.addColorStop(0.08, '#4d7a8a'); g.addColorStop(0.5, '#1f4a3c'); g.addColorStop(1, '#0d2a22');
      ctx.fillStyle = g; ctx.fillRect(-D, hy, D * 2, D);
      // patchwork farmland in perspective
      for (let r = 0; r < 16; r++) {
        const zr = (r + (dist * 2) % 1) / 16, za = Math.pow(zr, 2.2), zb = Math.pow((r + 1 + (dist * 2) % 1) / 16, 2.2);
        const ya = hy + za * D * 0.5, yb = hy + zb * D * 0.5, row = r - Math.floor(dist * 2);
        for (let c = -10; c <= 10; c++) {
          const hsh = Math.abs(Math.sin(row * 12.9898 + c * 78.233) * 43758.5453) % 1;
          ctx.fillStyle = FIELD[Math.floor(hsh * FIELD.length)]; ctx.globalAlpha = 0.25 + 0.6 * zr;
          const xa0 = c * 8 + (c * 220 - c * 8) * za, xa1 = (c + 1) * 8 + ((c + 1) * 220 - (c + 1) * 8) * za, xb0 = c * 8 + (c * 220 - c * 8) * zb, xb1 = (c + 1) * 8 + ((c + 1) * 220 - (c + 1) * 8) * zb;
          ctx.beginPath(); ctx.moveTo(xa0, ya); ctx.lineTo(xa1, ya); ctx.lineTo(xb1, yb); ctx.lineTo(xb0, yb); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      g = ctx.createLinearGradient(0, hy - 30, 0, hy + D * 0.12); g.addColorStop(0, 'rgba(190,225,255,0)'); g.addColorStop(0.25, 'rgba(190,225,255,.75)'); g.addColorStop(1, 'rgba(190,225,255,0)');
      ctx.fillStyle = g; ctx.fillRect(-D, hy - 30, D * 2, D * 0.12 + 30);
      // ground grid lines rushing (sense of speed)
      ctx.strokeStyle = 'rgba(200,240,255,.12)'; ctx.lineWidth = 1;
      for (let i = 0; i < 14; i++) { const z = ((i - (dist * 2) % 1) / 14); const y = hy + Math.pow(z, 2.2) * D * 0.5 + 2; ctx.beginPath(); ctx.moveTo(-D, y); ctx.lineTo(D, y); ctx.stroke(); }
      for (let i = -12; i <= 12; i++) { ctx.beginPath(); ctx.moveTo(i * 8, hy); ctx.lineTo(i * 220, hy + D * 0.5); ctx.stroke(); }
      // clouds (sorted far -> near)
      clouds.sort((a, b) => b.z - a.z);
      const fov = H * 0.9;
      for (const c of clouds) {
        c.z -= dt * 3 * speed; if (c.z < 0.4) Object.assign(c, newCloud(30 + Math.random() * 4));
        const p = fov / c.z, x = c.x * p * 0.25, y = hy + (c.y - pitch * 2) * p * 0.25, w = 256 * c.k * p / 40, h = w / 2;
        if (Math.abs(x) > D || w < 6 || w > W * 1.8) continue;
        ctx.globalAlpha = Math.min(1, (34 - c.z) / 8) * Math.min(1, Math.max(0, (c.z - 1) / 4));
        ctx.drawImage(c.s, x - w / 2, y - h / 2, w, h);
      }
      ctx.globalAlpha = 1;
      ctx.restore();
      // speed lines
      if (speed > 1.2) { ctx.strokeStyle = `rgba(255,255,255,${0.15 * (speed - 1)})`; ctx.lineWidth = 1.5;
        for (let i = 0; i < 26; i++) { const a = i * 2.4 + T, r0 = 80 + ((T * 900 + i * 97) % 400), r1 = r0 + 60 * speed; ctx.beginPath(); ctx.moveTo(W / 2 + Math.cos(a) * r0, H / 2 + Math.sin(a) * r0); ctx.lineTo(W / 2 + Math.cos(a) * r1, H / 2 + Math.sin(a) * r1); ctx.stroke(); } }
      // HUD: horizon ladder
      ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(-bank); ctx.strokeStyle = 'rgba(255,220,120,.85)'; ctx.fillStyle = 'rgba(255,220,120,.85)'; ctx.lineWidth = 1.5; ctx.font = '700 11px Rajdhani'; ctx.textAlign = 'left';
      for (let k = -3; k <= 3; k++) { const y = hy + k * 60; const w = k ? 50 : 120; ctx.beginPath(); ctx.moveTo(-w, y); ctx.lineTo(-24, y); ctx.moveTo(24, y); ctx.lineTo(w, y); ctx.stroke(); if (k) ctx.fillText(String(-k * 10), w + 6, y + 4); }
      ctx.restore();
      ctx.save(); ctx.translate(W / 2, H / 2); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-40, 0); ctx.lineTo(-14, 0); ctx.lineTo(0, 10); ctx.lineTo(14, 0); ctx.lineTo(40, 0); ctx.stroke();
      // bank arc
      ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, 150, -Math.PI * 0.8, -Math.PI * 0.2); ctx.stroke();
      ctx.rotate(-bank); ctx.fillStyle = '#ff4040'; ctx.beginPath(); ctx.moveTo(0, -150); ctx.lineTo(-7, -138); ctx.lineTo(7, -138); ctx.fill(); ctx.restore();
      return { mach: (0.8 + speed * 1.7 + Math.sin(T) * 0.05), alt };
    }
  };
  return f;
}
