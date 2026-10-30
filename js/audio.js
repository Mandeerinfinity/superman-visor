// Synthesized WebAudio sound design — no audio files.
let ctx = null, master = null, noiseBuf = null, comp = null;
const st = { vol: 0.7, muted: false };
export const sfx = { st };

export function unlock() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4;
    master = ctx.createGain(); master.gain.value = st.muted ? 0 : st.vol;
    master.connect(comp); comp.connect(ctx.destination);
    const len = ctx.sampleRate * 2;
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') ctx.resume();
}
export function getCtx() { return ctx; }
export function setVolume(v, muted) {
  st.vol = v; st.muted = muted;
  if (master) master.gain.setTargetAtTime(muted ? 0 : v, ctx.currentTime, 0.03);
}
const ok = () => ctx && ctx.state === 'running';

function env(g, t, a, peak, d, end = 0.0001) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(end, t + a + d);
}
function tone(type, f0, f1, dur, peak = 0.3, delay = 0, dest = master) {
  const t = ctx.currentTime + delay, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  env(g, t, Math.min(0.02, dur * 0.2), peak, dur);
  o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.05);
  return o;
}
function noise(dur, ftype, f0, f1, q, peak, delay = 0, attack = 0.01) {
  const t = ctx.currentTime + delay, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = noiseBuf; s.loop = true;
  f.type = ftype; f.Q.value = q; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
  env(g, t, attack, peak, dur);
  s.connect(f); f.connect(g); g.connect(master);
  s.start(t, Math.random()); s.stop(t + dur + attack + 0.05);
  return { s, g, f };
}

sfx.click = () => { if (!ok()) return; tone('triangle', 1800, 1200, 0.05, 0.12); tone('sine', 3600, 3600, 0.03, 0.04); };
sfx.tab = () => { if (!ok()) return; tone('sine', 660, 990, 0.09, 0.14); tone('triangle', 1320, 1320, 0.12, 0.05, 0.04); };
sfx.mode = (i = 0) => {
  if (!ok()) return;
  const base = [440, 220, 330, 523, 698, 392, 587][i] || 440;
  tone('sawtooth', base * 0.5, base * 2, 0.28, 0.08);
  tone('sine', base, base * 1.5, 0.3, 0.15, 0.03);
  noise(0.25, 'bandpass', 800, 5000, 3, 0.05);
};
sfx.whoosh = (dur = 1.6, delay = 0) => { if (!ok()) return; noise(dur, 'bandpass', 200, 3200, 1.4, 0.45, delay, dur * 0.55); noise(dur * 0.8, 'lowpass', 120, 600, 0.7, 0.3, delay, dur * 0.4); };
sfx.chime = (delay = 0) => {
  if (!ok()) return;
  [523.25, 783.99, 1046.5, 1567.98, 2093].forEach((f, i) => {
    tone('sine', f, f, 2.4 - i * 0.25, 0.16 / (1 + i * 0.3), delay + i * 0.07);
    tone('triangle', f * 2.01, f * 2.01, 1.2, 0.025, delay + i * 0.07);
  });
};
sfx.shard = () => { if (!ok()) return; tone('sine', 2400 + Math.random() * 2400, 1800, 0.12, 0.035); };
sfx.powerUp = () => { if (!ok()) return; tone('sawtooth', 110, 880, 0.6, 0.08); tone('sine', 220, 1760, 0.65, 0.12); noise(0.6, 'highpass', 400, 6000, 0.8, 0.06); };
sfx.scan = () => { if (!ok()) return; tone('sine', 1200, 300, 0.4, 0.07); tone('square', 2400, 2400, 0.03, 0.03, 0.0); };
sfx.ping = () => { if (!ok()) return; tone('sine', 1975, 1975, 0.5, 0.06); };
sfx.shutter = () => { if (!ok()) return; noise(0.07, 'highpass', 3000, 3000, 0.7, 0.4); noise(0.08, 'bandpass', 1500, 1500, 2, 0.3, 0.09); tone('sine', 1500, 3000, 0.25, 0.08, 0.12); };
sfx.error = () => { if (!ok()) return; tone('square', 220, 160, 0.25, 0.06); };
sfx.glyph = (i) => { if (!ok()) return; const f = 300 * Math.pow(2, (i % 24) / 12); tone('sine', f, f * 1.01, 0.22, 0.09); tone('triangle', f * 3, f * 3, 0.08, 0.02); };
sfx.boost = () => { if (!ok()) return; noise(1.2, 'bandpass', 150, 2500, 1, 0.4, 0, 0.3); tone('sawtooth', 60, 240, 1.0, 0.07); };

// Heat-vision beam: sustained hum + crackling sizzle. Returns stop().
sfx.beam = () => {
  if (!ok()) return () => {};
  const t = ctx.currentTime, out = ctx.createGain(); out.gain.setValueAtTime(0.0001, t); out.gain.exponentialRampToValueAtTime(0.5, t + 0.05); out.connect(master);
  const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), lp = ctx.createBiquadFilter(), og = ctx.createGain();
  o1.type = 'sawtooth'; o1.frequency.value = 92; o2.type = 'square'; o2.frequency.value = 93.7;
  lp.type = 'lowpass'; lp.frequency.value = 900; og.gain.value = 0.18;
  o1.connect(lp); o2.connect(lp); lp.connect(og); og.connect(out);
  const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 13; lg.gain.value = 300; lfo.connect(lg); lg.connect(lp.frequency);
  const n = ctx.createBufferSource(); n.buffer = noiseBuf; n.loop = true;
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 4200; bp.Q.value = 0.9;
  const ng = ctx.createGain(); ng.gain.value = 0.0;
  // crackle: random gain spikes
  const now = ctx.currentTime;
  for (let i = 0; i < 160; i++) { const tt = now + i * 0.025 + Math.random() * 0.02; ng.gain.setValueAtTime(Math.random() < 0.45 ? 0.5 + Math.random() * 0.6 : 0.08, tt); }
  n.connect(bp); bp.connect(ng); ng.connect(out);
  [o1, o2, lfo, n].forEach(s => s.start(t));
  let stopped = false;
  return () => {
    if (stopped) return; stopped = true;
    const e = ctx.currentTime; out.gain.cancelScheduledValues(e); out.gain.setValueAtTime(out.gain.value || 0.3, e); out.gain.exponentialRampToValueAtTime(0.0001, e + 0.25);
    ng.gain.cancelScheduledValues(e);
    [o1, o2, lfo, n].forEach(s => s.stop(e + 0.3));
    noise(0.5, 'highpass', 2500, 800, 0.7, 0.12); // hiss tail
  };
};
