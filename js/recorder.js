// Records the composited vision canvas + HUD (and visor audio) via MediaRecorder. MP4 on Safari, WebM elsewhere.
export function pickMime() {
  if (typeof MediaRecorder === 'undefined') return null;
  for (const m of ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']) if (MediaRecorder.isTypeSupported?.(m)) return m;
  return '';
}
export function createRecorder(getAudio) {
  const cv = document.createElement('canvas'), c = cv.getContext('2d'); let rec = null, chunks = [], t0 = 0, mime = null;
  const r = {
    get active() { return !!rec; }, get elapsed() { return rec ? (performance.now() - t0) / 1000 : 0 }, cv,
    supported() { return pickMime() !== null && !!cv.captureStream; },
    start(w, h) {
      mime = pickMime(); if (mime === null || !cv.captureStream) throw new Error('Recording unsupported');
      const k = Math.min(1, 1280 / Math.max(w, h)); cv.width = Math.round(w * k / 2) * 2; cv.height = Math.round(h * k / 2) * 2;
      c.fillStyle = '#000'; c.fillRect(0, 0, cv.width, cv.height);
      const vs = cv.captureStream(30), a = getAudio && getAudio(); if (a) a.getAudioTracks().forEach(t => vs.addTrack(t));
      chunks = []; rec = new MediaRecorder(vs, mime ? { mimeType: mime, videoBitsPerSecond: 6e6 } : { videoBitsPerSecond: 6e6 });
      rec.ondataavailable = e => e.data.size && chunks.push(e.data); rec.start(500); t0 = performance.now();
    },
    frame(layers, label) {
      if (!rec) return; const W = cv.width, H = cv.height; for (const l of layers) if (l.width) c.drawImage(l, 0, 0, W, H);
      const s = W / 430; c.fillStyle = 'rgba(255,40,40,.9)'; c.beginPath(); c.arc(22 * s, 30 * s, 6 * s, 0, 7); c.fill();
      c.font = `700 ${13 * s}px Rajdhani, sans-serif`; c.fillStyle = '#fff'; c.textBaseline = 'middle'; c.fillText(`REC ${r.elapsed.toFixed(1)}s · ${label}`, 34 * s, 31 * s);
    },
    stop() { return new Promise(res => { if (!rec) return res(null); const R = rec; rec = null; R.onstop = () => res(new Blob(chunks, { type: (R.mimeType || mime || 'video/webm').split(';')[0] })); try { R.stop(); } catch (e) { res(null); } R.stream.getTracks().forEach(t => t.kind === 'video' && t.stop()); }); }
  };
  return r;
}
