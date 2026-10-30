import { shards, drawShield, OUTLINE } from './shield.js';
import { sfx } from './audio.js';

const ease = t => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
export function createBoot(el, cv, onDone) {
  const ctx = cv.getContext('2d');
  let W = 0, H = 0, dpr = 1, start = -1, done = false, flashed = false, lastShard = 0;
  const sh = shards().map((s, i) => {
    const ang = Math.random() * Math.PI * 2, dist = 1.6 + Math.random() * 1.6;
    return { ...s, dx: Math.cos(ang) * dist, dy: Math.sin(ang) * dist, rot: (Math.random() - 0.5) * 8, delay: 0.25 + (s.role === 's' ? 0.75 : s.role === 'field' ? 0.4 : 0) + Math.random() * 0.55 };
  });
  const motes = Array.from({ length: 90 }, () => ({ x: Math.random(), y: Math.random(), z: Math.random(), s: Math.random() }));
  const spires = Array.from({ length: 26 }, (_, i) => ({ x: i / 25 + (Math.random() - 0.5) * 0.03, h: 0.12 + Math.random() * 0.32 * (1 - Math.abs(i / 25 - 0.5)), w: 0.025 + Math.random() * 0.03, lean: (Math.random() - 0.5) * 0.04 }));
  const lines = ['CRYSTAL MATRIX ALIGNING', 'SOLAR CELLS: CHARGED', 'OPTIC ARRAY: CALIBRATED', 'WELCOME, NICK'];
  function resize() { dpr = Math.min(2, devicePixelRatio || 1); W = cv.clientWidth; H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr; }
  resize(); addEventListener('resize', resize);

  function begin() { if (start >= 0) return; start = performance.now(); el.classList.add('running'); sfx.whoosh(2.1); }
  function finish() { if (done) return; done = true; el.classList.add('out'); setTimeout(() => { el.style.display = 'none'; }, 700); onDone(); }
  function shardColor(role, a) {
    if (role === 'rim') return `rgba(235,40,50,${a})`;
    if (role === 'field') return `rgba(255,205,60,${a})`;
    return `rgba(220,20,35,${a})`;
  }
  function frame(now) {
    if (done) return false;
    if (cv.clientWidth !== W) resize();
    const t = start < 0 ? 0 : (now - start) / 1000, T = now / 1000;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const cx = W / 2, cy = H * 0.4, s = Math.min(W, H) * 0.3;
    // aurora
    const ag = ctx.createRadialGradient(cx, cy, 10, cx, cy, Math.max(W, H) * 0.7);
    ag.addColorStop(0, `rgba(60,140,255,${0.18 + 0.1 * Math.sin(T)})`); ag.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = ag; ctx.fillRect(0, 0, W, H);
    // motes
    for (const m of motes) {
      m.y -= 0.0008 * (0.5 + m.z) * (t > 0 ? 3 : 1); if (m.y < 0) m.y += 1;
      ctx.fillStyle = `rgba(170,230,255,${0.25 + m.z * 0.6})`;
      const r = 0.6 + m.z * 1.8; ctx.fillRect(m.x * W, m.y * H, r, r);
    }
    // fortress spires
    for (const sp of spires) {
      const bx = sp.x * W, by = H, top = H - sp.h * H * (0.6 + 0.4 * ease(t / 1.5 + 0.3));
      const g = ctx.createLinearGradient(bx, top, bx, by); g.addColorStop(0, 'rgba(210,250,255,.85)'); g.addColorStop(0.4, 'rgba(90,170,230,.35)'); g.addColorStop(1, 'rgba(10,30,70,.2)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(bx - sp.w * W, by); ctx.lineTo(bx + sp.lean * W, top); ctx.lineTo(bx + sp.w * W, by); ctx.fill();
      ctx.strokeStyle = 'rgba(220,250,255,.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(bx + sp.lean * W, top); ctx.lineTo(bx, by); ctx.stroke();
    }
    if (start < 0) {
      // idle: floating shards orbiting
      ctx.save(); ctx.translate(cx, cy); ctx.globalCompositeOperation = 'lighter';
      sh.forEach((p, i) => {
        const a = T * 0.3 + i * 0.37, r = s * (1.1 + 0.25 * Math.sin(i + T));
        ctx.save(); ctx.translate(Math.cos(a) * r, Math.sin(a) * r * 0.5); ctx.rotate(a * 2);
        ctx.beginPath(); p.p.forEach(([x, y], j) => j ? ctx.lineTo(x * s * 0.35, y * s * 0.35) : ctx.moveTo(x * s * 0.35, y * s * 0.35)); ctx.closePath();
        ctx.fillStyle = 'rgba(120,200,255,.12)'; ctx.fill(); ctx.strokeStyle = 'rgba(180,235,255,.45)'; ctx.stroke(); ctx.restore();
      });
      ctx.restore();
      return true;
    }
    const assembled = t > 2.25;
    if (!assembled) {
      ctx.save(); ctx.translate(cx, cy);
      for (const p of sh) {
        const k = ease((t - p.delay) / 1.0); if (k <= 0) continue;
        if (k > 0.98 && !p.clicked) { p.clicked = true; if (now - lastShard > 40) { sfx.shard(); lastShard = now; } }
        const inv = 1 - k;
        ctx.save(); ctx.translate(p.dx * s * inv, p.dy * s * inv); ctx.rotate(p.rot * inv);
        ctx.beginPath(); p.p.forEach(([x, y], j) => j ? ctx.lineTo(x * s, y * s) : ctx.moveTo(x * s, y * s)); ctx.closePath();
        ctx.fillStyle = shardColor(p.role, 0.35 + 0.6 * k); ctx.fill();
        ctx.strokeStyle = `rgba(220,250,255,${0.9 * inv + 0.25})`; ctx.lineWidth = 1.2; ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    } else {
      if (!flashed) { flashed = true; sfx.chime(); el.classList.add('titled'); }
      const k = t - 2.25;
      // god rays
      ctx.save(); ctx.translate(cx, cy); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 18; i++) {
        const a = i / 18 * Math.PI * 2 + T * 0.15;
        ctx.rotate(Math.PI * 2 / 18);
        const g = ctx.createLinearGradient(0, 0, s * 2.6, 0); g.addColorStop(0, `rgba(255,220,120,${0.22 * Math.min(1, k * 2)})`); g.addColorStop(1, 'rgba(255,220,120,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(s * 2.6, -s * 0.12 * (1 + 0.4 * Math.sin(a * 3))); ctx.lineTo(s * 2.6, s * 0.12); ctx.fill();
      }
      ctx.restore();
      drawShield(ctx, cx, cy, s * (1 + 0.04 * Math.exp(-k * 4)), { glow: 1.6 });
      // light sweep across shield
      const sx = cx - s * 1.4 + ((k * 1.1) % 2.2) * s * 1.4;
      ctx.save(); ctx.beginPath(); OUTLINE.forEach(([x, y], i) => i ? ctx.lineTo(cx + x * s, cy + y * s) : ctx.moveTo(cx + x * s, cy + y * s)); ctx.clip(); ctx.globalCompositeOperation = 'lighter';
      const sg = ctx.createLinearGradient(sx - 40, 0, sx + 40, 0); sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(255,255,255,.35)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = sg; ctx.fillRect(cx - s * 1.1, cy - s, s * 2.2, s * 2); ctx.restore();
      // flash
      if (k < 0.5) { ctx.fillStyle = `rgba(255,255,255,${0.8 * (1 - k / 0.5)})`; ctx.fillRect(0, 0, W, H); }
      // shockwave ring
      if (k < 1.4) { ctx.strokeStyle = `rgba(160,230,255,${1 - k / 1.4})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, s * (0.9 + k * 2.2), 0, 7); ctx.stroke(); }
      const li = Math.min(lines.length - 1, Math.floor(k / 0.55));
      const bl = document.getElementById('bootLine'); if (bl.textContent !== lines[li]) bl.textContent = lines[li];
      if (k > 2.6) finish();
    }
    return true;
  }
  return { frame, begin, finish, get started() { return start >= 0; }, get done() { return done; } };
}
