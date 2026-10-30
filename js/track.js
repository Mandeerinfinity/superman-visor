// Target tracking. Live camera: FaceDetector when available, else a cheap motion-blob + green-blob sampler.
// Demo: known Metropolis objects. Produces targets in source-normalized coords {u,v (top-down), w,h,label,threat}.
export function createTracker(vision) {
  const sc = document.createElement('canvas'); sc.width = 48; sc.height = 36; const sx = sc.getContext('2d', { willReadFrequently: true });
  let prevL = null, last = 0, busy = false, faces = [], fd = null; const out = { targets: [], green: null, motion: 0 };
  try { if ('FaceDetector' in window) fd = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 3 }); } catch (e) { fd = null; }
  out.update = (now) => {
    const v = vision;
    if (!v.live) { const c = v.city, W = c.W, H = c.H; out.targets = (c.tracked || []).filter(t => t.x > 0 && t.x < W && t.y > 0 && t.y < H).map(t => ({ u: t.x / W, v: t.y / H, w: (t.inc ? 70 : 40) / W, h: (t.inc ? 70 : 30) / H, label: t.kind, threat: t.threat, inc: t.inc }));
      out.green = null; return out; }
    if (now - last < 220) return out; last = now; const vid = v.video; if (!vid.videoWidth) return out;
    if (fd && !busy) { busy = true; fd.detect(vid).then(r => { faces = r.map(f => ({ u: (f.boundingBox.x + f.boundingBox.width / 2) / vid.videoWidth, v: (f.boundingBox.y + f.boundingBox.height / 2) / vid.videoHeight, w: f.boundingBox.width / vid.videoWidth, h: f.boundingBox.height / vid.videoHeight, label: 'HUMAN · FACE', threat: 1 })); }).catch(() => { fd = null; }).finally(() => busy = false); }
    sx.drawImage(vid, 0, 0, 48, 36); const d = sx.getImageData(0, 0, 48, 36).data, L = new Float32Array(48 * 36);
    let mx = 0, my = 0, mw = 0, gx = 0, gy = 0, gw = 0, minx = 48, maxx = 0, miny = 36, maxy = 0;
    for (let i = 0, k = 0; k < L.length; i += 4, k++) { const r = d[i], g = d[i + 1], b = d[i + 2]; L[k] = r * 0.3 + g * 0.59 + b * 0.11;
      const x = k % 48, y = (k / 48) | 0;
      if (prevL) { const df = Math.abs(L[k] - prevL[k]); if (df > 28) { mx += x * df; my += y * df; mw += df; minx = Math.min(minx, x); maxx = Math.max(maxx, x); miny = Math.min(miny, y); maxy = Math.max(maxy, y); } }
      const gr = g - Math.max(r, b); if (gr > 40 && g > 90) { gx += x * gr; gy += y * gr; gw += gr; } }
    prevL = L; out.motion = Math.min(1, mw / 40000);
    const t = faces.slice();
    if (mw > 1500) t.push({ u: (mx / mw + 0.5) / 48, v: (my / mw + 0.5) / 36, w: Math.max(0.12, (maxx - minx + 1) / 48 * 0.6), h: Math.max(0.12, (maxy - miny + 1) / 36 * 0.6), label: 'MOVING OBJECT', threat: 3 });
    out.green = gw > 800 ? { u: (gx / gw + 0.5) / 48, v: (gy / gw + 0.5) / 36, s: Math.min(1, gw / 6000) } : null;
    out.targets = t; return out;
  };
  return out;
}
