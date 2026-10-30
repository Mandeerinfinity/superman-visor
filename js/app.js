import { sfx, unlock, setVolume } from './audio.js';
import { createBoot } from './boot.js';
import { createVision } from './vision.js';
import { createHUD, MODE_TAGS } from './hud.js';
import { createHearing } from './hearing.js';
import { createFlight } from './flight.js';
import { renderText, renderKey, glyphSVG } from './glyphs.js';
import { drawShield } from './shield.js';

const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const THEMES = {
  classic: { a: '#1e6bff', b: '#e3232c', c: '#ffcc33', tint: [0.12, 0.42, 1] },
  crystal: { a: '#7fe9ff', b: '#2f8fd0', c: '#ffffff', tint: [0.5, 0.9, 1] },
  solar: { a: '#ffb21e', b: '#ff5a1f', c: '#fff3b0', tint: [1, 0.6, 0.15] },
  kryptonite: { a: '#3dff8a', b: '#0fa060', c: '#d6ffe6', tint: [0.2, 1, 0.5] }
};
const SKEY = 'nickVisorSettings', LKEY = 'nickVisorLog';
const S = Object.assign({ quality: 'auto', vol: 0.7, muted: false, haptics: true, theme: 'classic', bootSkip: false }, JSON.parse(localStorage.getItem(SKEY) || '{}'));
const save = () => localStorage.setItem(SKEY, JSON.stringify(S));
const buzz = ms => { if (S.haptics && navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) try { navigator.vibrate(ms); } catch (e) {} };
let toastT; function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2200); }

// ---------- state ----------
const st = {
  tab: 'vision', mode: 0, energy: 100, heading: 0, alt: 312, speed: 0, gps: 'SIM', compassLive: false, geoLive: false,
  firing: false, target: [0, 0], fps: 0, frames: 0, scale: 1, refresh: 60, capture: false, threat: 'CLEAR', tilt: null, lastFlyDrag: 0
};
let vision = null, hud, hearing, flight, holo = null, holoLoading = false, stopBeam = null;
const stage = $('#stage');

// ---------- theme / settings ----------
function applyTheme() {
  const th = THEMES[S.theme] || THEMES.classic, r = document.documentElement.style;
  r.setProperty('--a', th.a); r.setProperty('--b', th.b); r.setProperty('--c', th.c);
  if (vision) vision.tint = th.tint;
  $$('#themes button').forEach(b => b.classList.toggle('on', b.dataset.theme === S.theme));
}
function applySettings() {
  setVolume(S.vol, S.muted); $('#vol').value = S.vol; $('#mute').classList.toggle('on', S.muted); $('#mute').textContent = S.muted ? 'MUTED' : 'MUTE';
  $('#haptics').checked = S.haptics; $('#bootSkip').checked = S.bootSkip;
  $$('#qualSeg button').forEach(b => b.classList.toggle('on', b.dataset.q === S.quality));
  st.scale = S.quality === 'saver' ? 0.5 : 1; applyTheme(); resizeAll();
}

// ---------- boot ----------
const bootEl = $('#boot');
const boot = createBoot(bootEl, $('#bootCv'), () => { sfx.powerUp(); });
function firstGesture() { unlock(); setVolume(S.vol, S.muted); }
document.addEventListener('pointerdown', firstGesture, { capture: true });
$('#bootGo').addEventListener('click', () => { firstGesture(); boot.begin(); buzz(20); });
$('#bootSkipBtn').addEventListener('click', () => { firstGesture(); boot.finish(); });
if (S.bootSkip) { bootEl.style.display = 'none'; boot.finish(); }

// ---------- vision ----------
try { vision = createVision($('#fx')); } catch (e) { console.warn('WebGL failed', e); toast('WebGL unavailable'); }
hud = createHUD($('#hud'));
hearing = createHearing($('#ears'));
flight = createFlight($('#sky'));

function setMode(m) {
  st.mode = m; if (vision) { vision.mode = m; vision.center = [0.5, 0.5]; }
  $$('#modes button').forEach(b => b.classList.toggle('on', +b.dataset.mode === m));
  $('#modeName').textContent = MODE_TAGS[m];
  const z = $('#zoom'), zw = $('#zoomWrap');
  if (m === 3) { z.min = 1; z.max = 20; setZoom(4); } else if (m === 4) { z.min = 2; z.max = 10; setZoom(4); } else setZoom(1);
  zw.classList.toggle('hidden', !(m === 3 || m === 4));
  $('#btnFire').classList.toggle('hidden', m !== 1);
  if (m !== 1) endFire();
  st.target = [hud.W / 2, Math.max(232, Math.min(hud.H * 0.42, hud.H - 440))];
  sfx.mode(m); buzz(10);
}
function setZoom(z) {
  z = Math.max(+$('#zoom').min, Math.min(+$('#zoom').max, z));
  if (vision) vision.zoom = z; $('#zoom').value = z; $('#zoomRead').textContent = z.toFixed(1) + '×';
  $('#rangeRead').textContent = st.mode === 4 ? `${(120 / z).toFixed(0)} µm FOV` : `RNG ${rangeTxt(z)}`;
}
const rangeTxt = z => { const km = 0.05 * Math.pow(z, 1.6); return km < 1 ? `${(km * 1000).toFixed(0)} m` : `${km.toFixed(2)} km`; };
$$('#modes button').forEach(b => b.addEventListener('click', () => setMode(+b.dataset.mode)));
$('#zoom').addEventListener('input', e => setZoom(+e.target.value));

// touch: target / pinch / pan
const ptrs = new Map(); let pinch0 = 0, zoom0 = 1;
const fx = $('#fx');
fx.addEventListener('pointerdown', e => {
  ptrs.set(e.pointerId, [e.clientX, e.clientY]);
  if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a[0] - b[0], a[1] - b[1]); zoom0 = vision ? vision.zoom : 1; }
  else if (st.mode === 1) { st.target = [e.clientX, e.clientY]; sfx.click(); }
  else if (st.mode !== 3 && st.mode !== 4) { sfx.scan(); }
});
fx.addEventListener('pointermove', e => {
  if (!ptrs.has(e.pointerId)) return; const prev = ptrs.get(e.pointerId); ptrs.set(e.pointerId, [e.clientX, e.clientY]);
  if (ptrs.size === 2 && (st.mode === 3 || st.mode === 4) && pinch0) { const [a, b] = [...ptrs.values()]; setZoom(zoom0 * Math.hypot(a[0] - b[0], a[1] - b[1]) / pinch0); }
  else if (ptrs.size === 1 && st.mode === 1) st.target = [e.clientX, e.clientY];
  else if (ptrs.size === 1 && vision && vision.zoom > 1) { // pan zoomed view
    const z = vision.zoom; vision.center[0] = Math.max(0.5 / z, Math.min(1 - 0.5 / z, vision.center[0] - (e.clientX - prev[0]) / fx.clientWidth / z));
    vision.center[1] = Math.max(0.5 / z, Math.min(1 - 0.5 / z, vision.center[1] + (e.clientY - prev[1]) / fx.clientHeight / z));
  }
});
const ptrUp = e => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch0 = 0; };
fx.addEventListener('pointerup', ptrUp); fx.addEventListener('pointercancel', ptrUp);
fx.addEventListener('gesturestart', e => e.preventDefault()); // iOS: stop page zoom

// heat beam
function startFire() {
  if (st.mode !== 1 || st.firing) return;
  if (st.energy < 3) { sfx.error(); toast('SOLAR ENERGY DEPLETED'); return; }
  st.firing = true; stopBeam = sfx.beam(); $('#btnFire').classList.add('firing'); buzz([30, 20, 30, 20, 30]);
}
function endFire() {
  if (!st.firing) return; st.firing = false; stopBeam && stopBeam(); stopBeam = null; $('#btnFire').classList.remove('firing');
  stage.style.transform = ''; if (vision) vision.beam[2] = 0;
}
const fb = $('#btnFire');
fb.addEventListener('pointerdown', e => { e.preventDefault(); fb.setPointerCapture(e.pointerId); startFire(); });
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => fb.addEventListener(ev, endFire));

// camera
async function startCam(facing) {
  if (!vision) return;
  try {
    if (!window.isSecureContext) throw new Error('Camera needs HTTPS');
    await vision.startCamera(facing); $('#camPrompt').classList.add('hidden'); $('#srcChip').textContent = vision.facing === 'user' ? 'FRONT CAM' : 'REAR CAM'; $('#srcChip').classList.add('live');
    sfx.powerUp(); toast('OPTIC ARRAY ONLINE');
  } catch (e) {
    console.warn('camera fallback:', e && e.message); sfx.error();
    toast(e && e.name === 'NotAllowedError' ? 'CAMERA DENIED · DEMO MODE' : 'NO CAMERA · DEMO MODE');
    $('#camPrompt').classList.add('hidden'); $('#srcChip').textContent = 'DEMO';
  }
}
$('#camStart').addEventListener('click', () => startCam('environment'));
$('#btnFlip').addEventListener('click', async () => { sfx.click(); if (!vision?.live) return startCam('environment'); try { await vision.flip(); $('#srcChip').textContent = vision.facing === 'user' ? 'FRONT CAM' : 'REAR CAM'; } catch (e) { toast('CAMERA SWITCH FAILED'); startCam('environment'); } });
$('#btnShot').addEventListener('click', () => { st.capture = true; });

// photo capture: compose filtered GL frame + HUD + SUPER-VISION frame
function compose() {
  const g = $('#fx'), h = $('#hud'), w = g.width, hh = g.height;
  const out = document.createElement('canvas'); out.width = w; out.height = hh; const c = out.getContext('2d');
  c.drawImage(g, 0, 0, w, hh); c.drawImage(h, 0, 0, w, hh);
  const th = THEMES[S.theme], k = w / 430, pad = 14 * k;
  c.lineWidth = 6 * k; c.strokeStyle = th.b; c.strokeRect(pad, pad, w - pad * 2, hh - pad * 2);
  c.lineWidth = 2 * k; c.strokeStyle = th.c; c.strokeRect(pad + 7 * k, pad + 7 * k, w - pad * 2 - 14 * k, hh - pad * 2 - 14 * k);
  const bh = 64 * k, grd = c.createLinearGradient(0, hh - bh - pad, 0, hh - pad); grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(1, 'rgba(0,6,24,.9)');
  c.fillStyle = grd; c.fillRect(pad, hh - bh - pad - 20 * k, w - pad * 2, bh + 20 * k);
  drawShield(c, pad + 44 * k, hh - pad - 34 * k, 20 * k, { glow: 0.6 });
  c.fillStyle = '#fff'; c.font = `400 ${24 * k}px Oswald`; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText('SUPER-VISION', pad + 74 * k, hh - pad - 42 * k);
  c.fillStyle = th.c; c.font = `700 ${12 * k}px Rajdhani`; c.fillText(`${MODE_TAGS[st.mode]} · ${new Date().toLocaleString()} · AGENT NICK`, pad + 74 * k, hh - pad - 20 * k);
  return out;
}
function doCapture() {
  const out = compose();
  $('#flash').classList.add('on'); requestAnimationFrame(() => requestAnimationFrame(() => $('#flash').classList.remove('on')));
  sfx.shutter(); buzz(25);
  out.toBlob(b => { if (!b) return; const url = URL.createObjectURL(b); const old = $('#photoImg').src; if (old.startsWith('blob:')) URL.revokeObjectURL(old);
    $('#photoImg').src = url; $('#photoSave').href = url; $('#photoSave').download = `super-vision-${Date.now()}.png`; $('#photo').classList.remove('hidden'); window.__lastPhotoBytes = b.size; }, 'image/png');
}
$('#photoClose').addEventListener('click', () => { sfx.click(); $('#photo').classList.add('hidden'); });

// ---------- sensors ----------
async function enableSensors() {
  sfx.click();
  try { if (typeof DeviceOrientationEvent !== 'undefined' && DeviceOrientationEvent.requestPermission) { const r = await DeviceOrientationEvent.requestPermission(); if (r !== 'granted') throw new Error('denied'); } addEventListener('deviceorientation', onOrient); }
  catch (e) { toast('MOTION ACCESS DENIED'); }
  if (navigator.geolocation) navigator.geolocation.watchPosition(p => {
    st.geoLive = true; st.gps = `${p.coords.latitude.toFixed(3)},${p.coords.longitude.toFixed(3)}`;
    if (p.coords.speed != null && !isNaN(p.coords.speed)) st.speedLive = p.coords.speed * 3.6;
    if (p.coords.altitude != null) st.altLive = p.coords.altitude; updateSensorRead();
  }, () => { toast('GPS UNAVAILABLE · SIMULATING'); }, { enableHighAccuracy: true, maximumAge: 2000 });
  toast('SENSORS ENGAGED');
}
function onOrient(e) {
  let hd = e.webkitCompassHeading; if (hd == null && e.alpha != null) hd = 360 - e.alpha;
  if (hd != null) { st.headingLive = hd; st.compassLive = true; }
  if (e.gamma != null) st.tilt = [e.gamma, e.beta];
  updateSensorRead();
}
let lastSR = 0; function updateSensorRead() { const n = performance.now(); if (n - lastSR < 1000) return; lastSR = n; $('#sensorRead').textContent = `Compass: ${st.compassLive ? 'live' : 'simulated'} · Speed: ${st.speedLive != null ? 'GPS' : 'simulated'} · Tilt: ${st.tilt ? 'live' : 'drag'}`; }
$('#btnSensors').addEventListener('click', enableSensors); $('#setSensors').addEventListener('click', enableSensors);

// ---------- tabs ----------
function setTab(t) {
  if (t === st.tab) return; const prev = st.tab; st.tab = t;
  $$('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === t));
  $$('.panel').forEach(p => p.classList.toggle('on', p.id === 'panel-' + t));
  $('#visionUI').classList.toggle('hidden', t !== 'vision'); $('#energy').classList.toggle('hidden', t !== 'vision');
  stage.style.visibility = t === 'vision' ? '' : 'hidden';
  if (prev === 'vision') endFire();
  if (prev === 'hearing') { hearing.stop(); $('#earStart').textContent = '◉ LISTEN'; $('#earStatus').textContent = 'Microphone offline · tap to listen'; }
  $('#modeName').textContent = t === 'vision' ? MODE_TAGS[st.mode] : { fortress: 'FORTRESS', hearing: 'SUPER HEARING', flight: 'FLIGHT', glyphs: 'TRANSLATOR', log: 'MISSION LOG', settings: 'SETTINGS' }[t];
  if (t === 'fortress' && !holo && !holoLoading) loadHolo();
  sfx.tab(); buzz(8);
}
$$('#tabs button').forEach(b => b.addEventListener('click', () => setTab(b.dataset.tab)));
async function loadHolo() {
  holoLoading = true;
  try { const { createHolo } = await import('./holo.js'); holo = await createHolo($('#holo')); $('#holoLoading').classList.add('hidden'); sfx.chime(); }
  catch (e) { console.warn('holo failed', e); $('#holoLoading').textContent = 'Hologram unavailable on this device'; }
}
$('#holoPulse').addEventListener('click', () => { holo?.pulse(); sfx.powerUp(); buzz(30); });
$('#holoAuto').addEventListener('click', e => { if (!holo) return; holo.setAuto(!holo.auto); e.currentTarget.classList.toggle('on', holo.auto); sfx.click(); });

// hearing
$('#earStart').addEventListener('click', async () => {
  if (hearing.live) { hearing.stop(); $('#earStart').textContent = '◉ LISTEN'; $('#earStatus').textContent = 'Microphone offline · simulated field'; sfx.click(); return; }
  try { await hearing.start(); $('#earStart').textContent = '■ STOP'; $('#earStatus').textContent = 'Super hearing active · listening'; sfx.powerUp(); }
  catch (e) { sfx.error(); toast('MIC UNAVAILABLE · SIMULATING'); $('#earStatus').textContent = 'Mic unavailable — simulated acoustic field'; }
});

// flight
let flyPtr = null; const sky = $('#sky');
sky.addEventListener('pointerdown', e => { flyPtr = [e.clientX, e.clientY]; sky.setPointerCapture(e.pointerId); });
sky.addEventListener('pointermove', e => { if (!flyPtr) return; flight.drag(e.clientX - flyPtr[0], e.clientY - flyPtr[1]); flyPtr = [e.clientX, e.clientY]; st.lastFlyDrag = performance.now(); });
sky.addEventListener('pointerup', () => flyPtr = null);
$('#flyBoost').addEventListener('click', () => { flight.boost(); sfx.boost(); buzz([20, 30, 60]); });

// translator
const gIn = $('#glyphIn'), gOut = $('#glyphOut');
const rerender = () => renderText(gIn.value, gOut, THEMES[S.theme].a === '#1e6bff' ? '#9fe8ff' : THEMES[S.theme].c);
gIn.addEventListener('input', () => { rerender(); const ch = gIn.value.slice(-1); if (ch) sfx.glyph(ch.charCodeAt(0)); });
renderKey($('#glyphKey')); rerender();
$('#glyphSpeak').addEventListener('click', () => {
  const spans = [...gOut.querySelectorAll('.g')];
  spans.forEach((s, i) => setTimeout(() => { s.style.transition = 'transform .15s, filter .15s'; s.style.transform = 'translateY(-6px) scale(1.15)'; s.style.filter = 'brightness(1.8)'; sfx.glyph(gIn.value.charCodeAt(i) || 0);
    setTimeout(() => { s.style.transform = ''; s.style.filter = ''; }, 180); }, i * 110));
});
$('#glyphCopy').addEventListener('click', async () => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg">${[...gIn.value].map((c, i) => `<g transform="translate(${i * 40},0)">${glyphSVG(c)}</g>`).join('')}</svg>`;
  try { await navigator.clipboard.writeText(svg); toast('GLYPHS COPIED'); } catch (e) { toast('COPY NOT PERMITTED'); }
  sfx.click();
});

// mission log
const logs = () => JSON.parse(localStorage.getItem(LKEY) || '[]');
function drawLog() {
  const L = logs(); $('#logCount').textContent = `${L.length} entr${L.length === 1 ? 'y' : 'ies'}`;
  const ul = $('#logList'); ul.innerHTML = '';
  L.slice().reverse().forEach(e => { const li = document.createElement('li'); const d = document.createElement('div'); const tm = document.createElement('time'); tm.textContent = new Date(e.t).toLocaleString(); d.append(tm, document.createTextNode(e.text));
    const del = document.createElement('button'); del.className = 'del'; del.setAttribute('aria-label', 'Delete entry'); del.textContent = '✕';
    del.onclick = () => { localStorage.setItem(LKEY, JSON.stringify(logs().filter(x => x.t !== e.t))); sfx.click(); drawLog(); }; li.append(d, del); ul.append(li); });
}
$('#logAdd').addEventListener('click', () => { const v = $('#logIn').value.trim(); if (!v) return sfx.error(); const L = logs(); L.push({ t: Date.now(), text: v }); localStorage.setItem(LKEY, JSON.stringify(L)); $('#logIn').value = ''; sfx.ping(); drawLog(); });
if (!localStorage.getItem(LKEY)) localStorage.setItem(LKEY, JSON.stringify([{ t: Date.now() - 86400000, text: 'Visor calibrated at the Fortress. Crystal matrix stable.' }]));
drawLog();

// settings
$$('#qualSeg button').forEach(b => b.addEventListener('click', () => { S.quality = b.dataset.q; save(); applySettings(); sfx.click(); }));
$('#vol').addEventListener('input', e => { S.vol = +e.target.value; save(); setVolume(S.vol, S.muted); });
$('#vol').addEventListener('change', () => sfx.click());
$('#mute').addEventListener('click', () => { S.muted = !S.muted; save(); applySettings(); sfx.click(); });
$('#haptics').addEventListener('change', e => { S.haptics = e.target.checked; save(); buzz(20); });
$('#bootSkip').addEventListener('change', e => { S.bootSkip = e.target.checked; save(); });
$$('#themes button').forEach(b => b.addEventListener('click', () => { S.theme = b.dataset.theme; save(); applyTheme(); rerender(); sfx.mode(2); }));
$('#replayBoot').addEventListener('click', () => location.reload());

// ---------- clock / battery ----------
function tick() { const d = new Date(); $('#clock').textContent = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).replace(/\s?[AP]M/i, ''); $('#date').textContent = d.toLocaleDateString([], { weekday: 'short', day: 'numeric' }).toUpperCase(); }
tick(); setInterval(tick, 1000);
if (navigator.getBattery) navigator.getBattery().then(b => { const u = () => $('#batt').textContent = `PWR ${Math.round(b.level * 100)}%${b.charging ? '⚡' : ''}`; u(); b.addEventListener('levelchange', u); b.addEventListener('chargingchange', u); }).catch(() => {});
else $('#batt').textContent = 'PWR OK';

// ---------- resize ----------
function resizeAll() { if (vision) vision.resize(st.scale); hud.resize(); }
addEventListener('resize', resizeAll); addEventListener('orientationchange', () => setTimeout(resizeAll, 200));

// ---------- single rAF loop + fps governor ----------
let last = performance.now(), fAcc = 0, fN = 0, fT = 0, goodWin = 0, lastVision = 0;
const fpsLog = [];
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  fN++; fT += dt;
  if (fT >= 1) {
    st.fps = Math.round(fN / fT); fpsLog.push(st.fps); if (fpsLog.length > 30) fpsLog.shift();
    st.refresh = Math.max(st.refresh, st.fps > 100 ? 120 : 60);
    if (S.quality === 'auto') {
      if (st.fps < st.refresh * 0.75 && st.scale > 0.5) { st.scale = Math.max(0.5, +(st.scale - 0.125).toFixed(3)); resizeAll(); goodWin = 0; }
      else if (st.fps >= st.refresh * 0.93 && st.scale < 1) { if (++goodWin >= 3) { st.scale = Math.min(1, st.scale + 0.125); resizeAll(); goodWin = 0; } }
    }
    $('#govRead').textContent = `Governor: ${st.fps} fps · render scale ${(st.scale * 100).toFixed(0)}% · ${S.quality.toUpperCase()}${S.quality === 'saver' ? ' (30 fps cap)' : ''}`;
    fN = 0; fT = 0;
  }
  if (!boot.done) { boot.frame(now); if (boot.started) return; }
  if (document.hidden) return;
  const capped = S.quality === 'saver' && now - lastVision < 1000 / 31;
  const T = now / 1000;
  if (st.tab === 'vision' && vision) {
    if (capped) return; lastVision = now;
    // energy economy
    const drain = st.firing ? 22 : st.mode === 2 ? 1.2 : (st.mode === 3 || st.mode === 4) ? 0.8 : st.mode === 1 ? 0.4 : 0;
    const gain = st.mode === 6 ? 7 : 1.6;
    st.energy = Math.max(0, Math.min(100, st.energy + (gain * (st.firing ? 0 : 1) - drain) * dt));
    if (st.firing && st.energy <= 0) { endFire(); toast('SOLAR ENERGY DEPLETED'); sfx.error(); }
    // sensors (live or simulated)
    st.heading = st.compassLive ? lerpAngle(st.heading, st.headingLive, 0.15) : (st.heading + dt * 6 * Math.sin(T * 0.13)) % 360;
    st.alt = st.altLive != null ? st.altLive : 312 + Math.sin(T * 0.3) * 18 + Math.sin(T * 1.7) * 3;
    st.speed = st.speedLive != null ? st.speedLive : Math.max(0, 42 + Math.sin(T * 0.4) * 30 + Math.sin(T * 2.3) * 4);
    if (st.firing) {
      vision.beam = [st.target[0] / hud.W, 1 - st.target[1] / hud.H, 0.8 + Math.random() * 0.4];
      stage.style.transform = `translate(${(Math.random() - 0.5) * 8}px,${(Math.random() - 0.5) * 8}px)`;
    } else if (vision.beam[2] > 0) vision.beam[2] = Math.max(0, vision.beam[2] - dt * 2);
    vision.render(now); st.frames++;
    hud.draw({ t: now, mode: st.mode, heading: st.heading, alt: st.alt, speed: st.speed, colA: getVar('--a'), colB: getVar('--b'), colC: getVar('--c'), target: st.target, firing: st.firing,
      zoom: vision.zoom, range: rangeTxt(vision.zoom), live: vision.live, fps: st.fps, q: `${Math.round(st.scale * 100)}%`, gps: st.geoLive ? st.gps : 'SIM', onSweep: sweepPing });
    if (st.capture) { st.capture = false; doCapture(); }
    const e = Math.round(st.energy); $('#energyFill').style.height = e + '%'; if (e !== st._e) { st._e = e; $('#energyPct').textContent = e + '%'; $('#energy').classList.toggle('low', e < 20); }
  } else if (st.tab === 'fortress' && holo) { holo.frame(now, dt, st.scale); st.frames++; }
  else if (st.tab === 'hearing') { st.frames++; const r = hearing.frame(now, { c: getVar('--c') }); if (fN % 6 === 0) { $('#earDb').textContent = `${r.db.toFixed(0)} dB`; $('#earHz').textContent = `${Math.round(r.hz)} Hz`; } }
  else if (st.tab === 'flight') {
    if (st.tilt) flight.setTilt(st.tilt[0], st.tilt[1]);
    st.frames++; const r = flight.frame(now, dt, !st.tilt && now - st.lastFlyDrag > 3000 && !flyPtr);
    if (fN % 6 === 0) { $('#flySpd').textContent = `MACH ${r.mach.toFixed(1)}`; $('#flyAlt').textContent = `ALT ${Math.round(r.alt)} m`; }
  }
}
const varCache = {};
function getVar(n) { if (!varCache[n]) { varCache[n] = getComputedStyle(document.documentElement).getPropertyValue(n).trim() || '#fff'; } return varCache[n]; }
new MutationObserver(() => { for (const k in varCache) delete varCache[k]; }).observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
function lerpAngle(a, b, k) { const d = ((b - a + 540) % 360) - 180; return (a + d * k + 360) % 360; }
let lastPing = 0; function sweepPing() { const n = performance.now(); if (n - lastPing > 4000) { lastPing = n; sfx.ping(); } }

applySettings(); setMode(0);
requestAnimationFrame(loop);
document.addEventListener('visibilitychange', () => { if (document.hidden) endFire(); });
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(() => {});

// test / debug hook
window.VISOR = { setMode, setTab, st, startFire, endFire, setZoom, fpsLog, capture: () => { st.capture = true; }, get vision() { return vision; }, get holoReady() { return !!holo; } };
