// Synthesized WebAudio sound design v2 — no audio files. Reverb send, ambient hum, spatial whoosh, recorder tap.
let ctx = null, master = null, noiseBuf = null, comp = null, dry = null, wet = null, verb = null, recDest = null, amb = null;
const st = { vol: 0.7, muted: false, reverb: true, ambient: true };
export const sfx = { st };

function impulse(sec = 2.6, decay = 2.8) {
  const len = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay); }
  return b;
}
export function unlock() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
    master = ctx.createGain(); master.gain.value = st.muted ? 0 : st.vol;
    dry = ctx.createGain(); wet = ctx.createGain(); wet.gain.value = st.reverb ? 0.32 : 0;
    verb = ctx.createConvolver();
    const len = ctx.sampleRate * 2; noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    verb.buffer = impulse();
    dry.connect(master); dry.connect(verb); verb.connect(wet); wet.connect(master);
    master.connect(comp); comp.connect(ctx.destination);
    try { recDest = ctx.createMediaStreamDestination(); comp.connect(recDest); } catch (e) { recDest = null; }
  }
  if (ctx.state === 'suspended') ctx.resume();
  if (st.ambient && st._ambWant) ambientOn();
}
export function getCtx() { return ctx; }
export function getRecStream() { return recDest ? recDest.stream : null; }
export function setVolume(v, muted) { st.vol = v; st.muted = muted; if (master) master.gain.setTargetAtTime(muted ? 0 : v, ctx.currentTime, 0.03); }
export function setReverb(on) { st.reverb = on; if (wet) wet.gain.setTargetAtTime(on ? 0.32 : 0, ctx.currentTime, 0.1); }
const ok = () => ctx && ctx.state === 'running';
const out = () => dry;

function env(g, t, a, peak, d, end = 0.0001) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(end, t + a + d); }
function tone(type, f0, f1, dur, peak = 0.3, delay = 0, dest = out(), pan = 0) {
  const t = ctx.currentTime + delay, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  env(g, t, Math.min(0.02, dur * 0.2), peak, dur); o.connect(g);
  if (pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = pan; g.connect(p); p.connect(dest); } else g.connect(dest);
  o.start(t); o.stop(t + dur + 0.05); return o;
}
function noise(dur, ftype, f0, f1, q, peak, delay = 0, attack = 0.01, panFrom = null, panTo = 0) {
  const t = ctx.currentTime + delay, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = noiseBuf; s.loop = true; f.type = ftype; f.Q.value = q; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
  env(g, t, attack, peak, dur); s.connect(f); f.connect(g);
  if (panFrom != null && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.setValueAtTime(panFrom, t); p.pan.linearRampToValueAtTime(panTo, t + attack + dur); g.connect(p); p.connect(out()); } else g.connect(out());
  s.start(t, Math.random()); s.stop(t + dur + attack + 0.05); return { s, g, f };
}

sfx.click = () => { if (!ok()) return; tone('triangle', 1800, 1200, 0.05, 0.12); tone('sine', 3600, 3600, 0.03, 0.04); };
sfx.tab = () => { if (!ok()) return; tone('sine', 660, 990, 0.09, 0.14); tone('triangle', 1320, 1320, 0.12, 0.05, 0.04); };
sfx.mode = (i = 0) => {
  if (!ok()) return; const base = [440, 220, 330, 523, 698, 392, 587, 262, 784, 311, 466, 349, 196][i] || 440;
  tone('sawtooth', base * 0.5, base * 2, 0.28, 0.07); tone('sine', base, base * 1.5, 0.3, 0.14, 0.03); tone('sine', base * 2, base * 3, 0.2, 0.04, 0.08);
  noise(0.25, 'bandpass', 800, 5000, 3, 0.05);
};
sfx.glitch = () => { if (!ok()) return; for (let i = 0; i < 5; i++) tone('square', 200 + Math.random() * 1800, 100 + Math.random() * 900, 0.03, 0.03, i * 0.03); };
sfx.whoosh = (dur = 1.6, delay = 0, dir = 1) => { if (!ok()) return; noise(dur, 'bandpass', 200, 3200, 1.4, 0.45, delay, dur * 0.55, -dir, dir); noise(dur * 0.8, 'lowpass', 120, 600, 0.7, 0.3, delay, dur * 0.4, -dir * 0.6, dir * 0.6); };
sfx.chime = (delay = 0) => { if (!ok()) return; [523.25, 783.99, 1046.5, 1567.98, 2093].forEach((f, i) => { tone('sine', f, f, 2.4 - i * 0.25, 0.16 / (1 + i * 0.3), delay + i * 0.07, out(), (i - 2) * 0.3); tone('triangle', f * 2.01, f * 2.01, 1.2, 0.025, delay + i * 0.07); }); };
sfx.shard = () => { if (!ok()) return; tone('sine', 2400 + Math.random() * 2400, 1800, 0.12, 0.035, 0, out(), Math.random() * 2 - 1); };
sfx.powerUp = () => { if (!ok()) return; tone('sawtooth', 110, 880, 0.6, 0.07); tone('sine', 220, 1760, 0.65, 0.11); tone('triangle', 55, 220, 0.8, 0.12); noise(0.6, 'highpass', 400, 6000, 0.8, 0.06); [1318, 1760, 2637].forEach((f, i) => tone('sine', f, f, 0.6, 0.04, 0.5 + i * 0.06, out(), (i - 1) * 0.6)); };
sfx.scan = () => { if (!ok()) return; tone('sine', 1200, 300, 0.4, 0.07); tone('square', 2400, 2400, 0.03, 0.03); };
sfx.ping = () => { if (!ok()) return; tone('sine', 1975, 1975, 0.5, 0.06, 0, out(), 0.5 - Math.random()); };
sfx.lock = () => { if (!ok()) return; tone('square', 1500, 1500, 0.04, 0.04); tone('square', 2000, 2000, 0.04, 0.04, 0.07); };
sfx.shutter = () => { if (!ok()) return; noise(0.07, 'highpass', 3000, 3000, 0.7, 0.4); noise(0.08, 'bandpass', 1500, 1500, 2, 0.3, 0.09); tone('sine', 1500, 3000, 0.25, 0.08, 0.12); };
sfx.recStart = () => { if (!ok()) return; tone('sine', 880, 880, 0.12, 0.12); tone('sine', 1320, 1320, 0.2, 0.12, 0.12); };
sfx.recStop = () => { if (!ok()) return; tone('sine', 1320, 1320, 0.12, 0.12); tone('sine', 660, 660, 0.25, 0.12, 0.12); };
sfx.error = () => { if (!ok()) return; tone('square', 220, 160, 0.25, 0.06); };
sfx.glyph = (i) => { if (!ok()) return; const f = 300 * Math.pow(2, (i % 24) / 12); tone('sine', f, f * 1.01, 0.22, 0.09); tone('triangle', f * 3, f * 3, 0.08, 0.02); };
sfx.boost = () => { if (!ok()) return; noise(1.2, 'bandpass', 150, 2500, 1, 0.4, 0, 0.3, -1, 1); tone('sawtooth', 60, 240, 1.0, 0.07); };
sfx.achieve = () => { if (!ok()) return; [523, 659, 784, 1047, 1319].forEach((f, i) => { tone('triangle', f, f, 0.5, 0.1, i * 0.08); tone('sine', f * 2, f * 2, 0.4, 0.03, i * 0.08 + 0.02); }); };
sfx.geiger = (k = 1) => { if (!ok()) return; noise(0.008, 'highpass', 3000, 3000, 0.5, 0.25 * k); tone('square', 4200, 2000, 0.01, 0.05 * k); };
// powers
sfx.freeze = () => { if (!ok()) return; noise(1.4, 'highpass', 6000, 2500, 0.6, 0.22, 0, 0.15); noise(1.2, 'bandpass', 900, 300, 1, 0.18, 0, 0.3);
  for (let i = 0; i < 26; i++) tone('sine', 3000 + Math.random() * 5000, 2000 + Math.random() * 3000, 0.04, 0.03 + Math.random() * 0.04, 0.2 + Math.random() * 1.3, out(), Math.random() * 2 - 1); };
sfx.breath = () => { if (!ok()) return; noise(1.6, 'lowpass', 400, 2400, 0.8, 0.5, 0, 0.35, -0.8, 0.8); noise(1.4, 'bandpass', 1500, 600, 2, 0.15, 0.1, 0.4, 0.8, -0.8); };
sfx.punch = () => { if (!ok()) return; tone('sine', 120, 30, 0.6, 0.6); tone('triangle', 70, 25, 0.9, 0.4); noise(0.35, 'lowpass', 3000, 200, 0.7, 0.6, 0, 0.003);
  for (let i = 0; i < 10; i++) tone('square', 1800 + Math.random() * 3000, 600, 0.03, 0.04, 0.05 + i * 0.03 + Math.random() * 0.02); };
sfx.speed = () => { if (!ok()) return; noise(0.7, 'bandpass', 300, 4000, 2, 0.4, 0, 0.1, -1, 1); tone('sawtooth', 80, 800, 0.6, 0.06); };

// Ambient Fortress hum: detuned drones + slow shimmer through reverb.
let ambNodes = null;
export function ambient(on) { st._ambWant = on; if (on && st.ambient) ambientOn(); else ambientOff(); }
export function setAmbientEnabled(v) { st.ambient = v; if (!v) ambientOff(); else if (st._ambWant) ambientOn(); }
function ambientOn() {
  if (!ok() || ambNodes) return;
  const t = ctx.currentTime, g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.09, t + 2); g.connect(out());
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700; lp.connect(g);
  const os = [55, 82.4, 110.3, 164.8, 220.6].map((f, i) => { const o = ctx.createOscillator(); o.type = i < 2 ? 'sawtooth' : 'sine'; o.frequency.value = f; o.detune.value = (i - 2) * 4; const og = ctx.createGain(); og.gain.value = 0.22 / (i + 1); o.connect(og); og.connect(lp); o.start(); return o; });
  const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.07; lg.gain.value = 350; lfo.connect(lg); lg.connect(lp.frequency); lfo.start();
  ambNodes = { g, os: [...os, lfo] };
}
function ambientOff() { if (!ambNodes || !ctx) return; const n = ambNodes; ambNodes = null; const t = ctx.currentTime; n.g.gain.cancelScheduledValues(t); n.g.gain.setTargetAtTime(0.0001, t, 0.4); n.os.forEach(o => o.stop(t + 2)); }

// Heat-vision beam: sustained hum + crackling sizzle. Returns stop().
sfx.beam = () => {
  if (!ok()) return () => {};
  const t = ctx.currentTime, o = ctx.createGain(); o.gain.setValueAtTime(0.0001, t); o.gain.exponentialRampToValueAtTime(0.5, t + 0.05); o.connect(out());
  const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), o3 = ctx.createOscillator(), lp = ctx.createBiquadFilter(), og = ctx.createGain();
  o1.type = 'sawtooth'; o1.frequency.value = 92; o2.type = 'square'; o2.frequency.value = 93.7; o3.type = 'sine'; o3.frequency.value = 46;
  lp.type = 'lowpass'; lp.frequency.value = 900; og.gain.value = 0.18; o1.connect(lp); o2.connect(lp); o3.connect(og); lp.connect(og); og.connect(o);
  const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 13; lg.gain.value = 300; lfo.connect(lg); lg.connect(lp.frequency);
  const n = ctx.createBufferSource(); n.buffer = noiseBuf; n.loop = true; const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 4200; bp.Q.value = 0.9;
  const ng = ctx.createGain(); ng.gain.value = 0.0; const now = ctx.currentTime;
  for (let i = 0; i < 160; i++) { const tt = now + i * 0.025 + Math.random() * 0.02; ng.gain.setValueAtTime(Math.random() < 0.45 ? 0.5 + Math.random() * 0.6 : 0.08, tt); }
  n.connect(bp); bp.connect(ng); ng.connect(o); [o1, o2, o3, lfo, n].forEach(s => s.start(t));
  let stopped = false;
  return () => { if (stopped) return; stopped = true; const e = ctx.currentTime; o.gain.cancelScheduledValues(e); o.gain.setValueAtTime(o.gain.value || 0.3, e); o.gain.exponentialRampToValueAtTime(0.0001, e + 0.25);
    ng.gain.cancelScheduledValues(e); [o1, o2, o3, lfo, n].forEach(s => s.stop(e + 0.3)); noise(0.5, 'highpass', 2500, 800, 0.7, 0.12); };
};
