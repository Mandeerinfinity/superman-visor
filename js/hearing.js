import { getCtx, unlock } from './audio.js';
import { drawShield } from './shield.js';

export function createHearing(cv) {
  const ctx = cv.getContext('2d');
  let W = 0, H = 0, dpr = 1, an = null, data = null, wave = null, stream = null, simulated = true;
  const peaks = new Float32Array(96);
  const h = {
    get live() { return !simulated; },
    async start() {
      unlock(); const ac = getCtx();
      if (!navigator.mediaDevices?.getUserMedia || !ac) throw new Error('Microphone unavailable');
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      const src = ac.createMediaStreamSource(stream);
      an = ac.createAnalyser(); an.fftSize = 1024; an.smoothingTimeConstant = 0.78;
      src.connect(an); // analyser only — never routed to speakers (no feedback)
      data = new Uint8Array(an.frequencyBinCount); wave = new Uint8Array(an.fftSize); simulated = false;
    },
    stop() { if (stream) stream.getTracks().forEach(t => t.stop()); stream = null; an = null; simulated = true; },
    resize() { dpr = Math.min(2, devicePixelRatio || 1); W = cv.clientWidth; H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr; },
    frame(t, cols) {
      if (cv.clientWidth !== W || cv.clientHeight !== H) h.resize();
      const T = t / 1000, N = 96;
      let bins = new Float32Array(N), wv = new Float32Array(128), rms = 0, peakHz = 0;
      if (an) {
        an.getByteFrequencyData(data); an.getByteTimeDomainData(wave);
        let best = 0, bi = 0;
        for (let i = 0; i < N; i++) { const a = Math.floor(Math.pow(i / N, 1.8) * data.length * 0.7), b = Math.max(a + 1, Math.floor(Math.pow((i + 1) / N, 1.8) * data.length * 0.7)); let s = 0; for (let k = a; k < b; k++) s = Math.max(s, data[k]); bins[i] = s / 255; }
        for (let k = 2; k < data.length; k++) if (data[k] > best) { best = data[k]; bi = k; }
        peakHz = bi * getCtx().sampleRate / an.fftSize;
        for (let i = 0; i < 128; i++) { const v = (wave[i * 4] - 128) / 128; wv[i] = v; }
        for (let i = 0; i < wave.length; i++) { const v = (wave[i] - 128) / 128; rms += v * v; } rms = Math.sqrt(rms / wave.length);
      } else {
        for (let i = 0; i < N; i++) bins[i] = Math.max(0, 0.35 + 0.3 * Math.sin(T * 3 + i * 0.3) * Math.sin(T * 1.3 + i * 0.07) - i / N * 0.25 + 0.08 * Math.sin(i * 7 + T * 11));
        for (let i = 0; i < 128; i++) wv[i] = 0.25 * Math.sin(i * 0.3 + T * 8) * Math.sin(T * 2);
        rms = 0.08 + 0.04 * Math.sin(T * 2); peakHz = 440 + 200 * Math.sin(T);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = 'rgba(3,8,22,.35)'; ctx.fillRect(0, 0, W, H); // motion trail
      const cx = W / 2, cy = H * 0.46, R = Math.min(W, H) * 0.22;
      // background rings
      ctx.strokeStyle = 'rgba(80,160,255,.15)'; ctx.lineWidth = 1;
      for (let k = 1; k <= 4; k++) { ctx.beginPath(); ctx.arc(cx, cy, R * (0.6 + k * 0.42) + Math.sin(T * 2 + k) * 2, 0, 7); ctx.stroke(); }
      ctx.save(); ctx.translate(cx, cy); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < N; i++) {
        peaks[i] = Math.max(peaks[i] * 0.97, bins[i]);
        const v = bins[i], len = 8 + v * R * 1.25;
        for (const sgn of [1, -1]) {
          const a = -Math.PI / 2 + sgn * (i / N) * Math.PI;
          const hue = 210 - v * 210; ctx.strokeStyle = `hsla(${hue},100%,${55 + v * 20}%,.9)`; ctx.lineWidth = Math.max(2, (Math.PI * R / N) * 0.75);
          ctx.beginPath(); ctx.moveTo(Math.cos(a) * R, Math.sin(a) * R); ctx.lineTo(Math.cos(a) * (R + len), Math.sin(a) * (R + len)); ctx.stroke();
          const pr = R + 10 + peaks[i] * R * 1.25; ctx.fillStyle = 'rgba(255,220,120,.8)'; ctx.fillRect(Math.cos(a) * pr - 1, Math.sin(a) * pr - 1, 2.5, 2.5);
        }
      }
      // waveform ring
      ctx.strokeStyle = cols.c; ctx.lineWidth = 2; ctx.beginPath();
      for (let i = 0; i <= 128; i++) { const a = i / 128 * Math.PI * 2, r = R * 0.82 + wv[i % 128] * R * 0.35; const x = Math.cos(a) * r, y = Math.sin(a) * r; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke();
      ctx.restore();
      drawShield(ctx, cx, cy, R * (0.42 + rms * 0.8), { glow: 1 + rms * 4, glowColor: 'rgba(255,90,90,.9)' });
      // labels
      ctx.font = '700 12px Rajdhani'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(200,230,255,.7)';
      ctx.fillText(simulated ? 'SIMULATED AMBIENT FIELD' : 'LIVE ACOUSTIC FIELD', cx, cy + R * 2.25);
      ctx.fillText('20 Hz', cx - R * 2.0, cy); ctx.fillText('20 kHz', cx, cy + R * 2.0 + 10 - R * 0.2);
      const db = 20 * Math.log10(Math.max(1e-4, rms));
      return { db, hz: peakHz };
    }
  };
  return h;
}
