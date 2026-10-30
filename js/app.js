import { sfx, unlock, setVolume, setReverb, ambient, setAmbientEnabled, getRecStream } from './audio.js';
import { createBoot } from './boot.js';
import { createVision } from './vision.js';
import { createHUD, MODE_TAGS } from './hud.js';
import { createHearing } from './hearing.js';
import { createFlight } from './flight.js';
import { renderText, renderKey, glyphSVG } from './glyphs.js';
import { drawShield } from './shield.js';
import { createPowers } from './powers.js';
import { createTracker } from './track.js';
import { createRecorder } from './recorder.js';
import { gallery } from './gallery.js';
import { createXP, RANKS, ACH } from './xp.js';
import { createGuide, LINES } from './guide.js';
import { getWeather, toCity, describe, aqiLabel } from './weather.js';
import { createGame } from './game.js';

const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const THEMES = {
  classic: { a: '#1e6bff', b: '#e3232c', c: '#ffcc33', tint: [0.12, 0.42, 1] },
  crystal: { a: '#7fe9ff', b: '#2f8fd0', c: '#ffffff', tint: [0.5, 0.9, 1] },
  solar: { a: '#ffb21e', b: '#ff5a1f', c: '#fff3b0', tint: [1, 0.6, 0.15] },
  kryptonite: { a: '#3dff8a', b: '#0fa060', c: '#d6ffe6', tint: [0.2, 1, 0.5] }
};
const LAYOUTS = { full: { compass: true, tapes: true, radar: true, data: true, reticle: true }, minimal: { compass: true, tapes: false, radar: false, data: false, reticle: true },
  combat: { compass: false, tapes: true, radar: true, data: true, reticle: true }, cinema: { compass: false, tapes: false, radar: false, data: false, reticle: true, cinema: true } };
const SKEY = 'nickVisorSettings', LKEY = 'nickVisorLog';
const S = Object.assign({ quality: 'auto', vol: 0.7, muted: false, haptics: true, theme: 'classic', bootSkip: false, ambient: true, reverb: true, guide: true, layout: 'full', lay: { ...LAYOUTS.full }, best: 0 }, JSON.parse(localStorage.getItem(SKEY) || '{}'));
const save = () => localStorage.setItem(SKEY, JSON.stringify(S));
const buzz = ms => { if (S.haptics && navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) try { navigator.vibrate(ms); } catch (e) {} };
let toastT; function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2200); }

// ---------- state ----------
const st = {
  tab: 'vision', mode: 0, energy: 100, heading: 0, alt: 312, speed: 0, gps: 'SIM', compassLive: false, geoLive: false,
  firing: false, target: [0, 0], fps: 0, frames: 0, scale: 1, tier: 2, gi: 0, refresh: 60, capture: false, tilt: null, lastFlyDrag: 0,
  power: null, tracking: true, locked: null, targets: [], kryp: [], krypNear: 0, said: {}
};
const GOV = [{ s: 1, t: 2 }, { s: 0.85, t: 2 }, { s: 0.75, t: 1 }, { s: 0.6, t: 1 }, { s: 0.5, t: 0 }];
let vision = null, hud, hearing, flight, holo = null, holoLoading = false, stopBeam = null, powers = null, tracker = null, game = null;
const stage = $('#stage');
const guide = createGuide($('#subs'));
const recorder = createRecorder(getRecStream);
const xp = createXP(onXP);

// ---------- theme / settings ----------
function applyTheme() {
  const th = THEMES[S.theme] || THEMES.classic, r = document.documentElement.style;
  r.setProperty('--a', th.a); r.setProperty('--b', th.b); r.setProperty('--c', th.c);
  if (vision) vision.tint = th.tint;
  $$('#themes button').forEach(b => b.classList.toggle('on', b.dataset.theme === S.theme));
}
function applyGov() { const g = GOV[st.gi]; st.scale = S.quality === 'saver' ? 0.5 : g.s; st.tier = S.quality === 'saver' ? 0 : S.quality === 'high' ? 2 : g.t; if (vision) vision.tier = st.tier; resizeAll(); }
function applySettings() {
  setVolume(S.vol, S.muted); $('#vol').value = S.vol; $('#mute').classList.toggle('on', S.muted); $('#mute').textContent = S.muted ? 'MUTED' : 'MUTE';
  $('#haptics').checked = S.haptics; $('#bootSkip').checked = S.bootSkip; $('#ambient').checked = S.ambient; $('#reverb').checked = S.reverb; $('#guideOn').checked = S.guide;
  setAmbientEnabled(S.ambient); setReverb(S.reverb); guide.enabled = S.guide;
  $$('#qualSeg button').forEach(b => b.classList.toggle('on', b.dataset.q === S.quality));
  $$('#layoutSeg button').forEach(b => b.classList.toggle('on', b.dataset.l === S.layout));
  $$('#layoutToggles input').forEach(i => i.checked = S.lay[i.dataset.k] !== false);
  st.gi = 0; applyGov(); applyTheme();
}

// ---------- boot ----------
const bootEl = $('#boot');
const boot = createBoot(bootEl, $('#bootCv'), () => { sfx.powerUp(); setTimeout(() => { guide.say(LINES.boot); xp.event('boot'); }, 600); });
function firstGesture() { unlock(); setVolume(S.vol, S.muted); setReverb(S.reverb); }
document.addEventListener('pointerdown', firstGesture, { capture: true });
$('#bootGo').addEventListener('click', () => { firstGesture(); boot.begin(); buzz(20); });
$('#bootSkipBtn').addEventListener('click', () => { firstGesture(); boot.finish(); xp.event('boot'); });
if (S.bootSkip) { bootEl.style.display = 'none'; boot.finish(); }

// ---------- vision ----------
try { vision = createVision($('#fx')); } catch (e) { console.warn('WebGL2 unavailable', e && e.message); toast('WebGL2 unavailable'); }
hud = createHUD($('#hud'));
hearing = createHearing($('#ears'));
flight = createFlight($('#sky'));
if (vision) { powers = createPowers(vision); tracker = createTracker(vision); game = createGame(vision.city, onGame); }

// source(normalized, v top-down) <-> screen css px
function srcToScreen(u, vt) {
  const cw = $('#fx').clientWidth, ch = $('#fx').clientHeight, [sx, sy] = vision.cover || [1, 1];
  let tu = u, tv = 1 - vt; if (vision.live && vision.facing === 'user') tu = 1 - tu;
  const x = ((tu - 0.5) / sx + 0.5 - vision.center[0]) * vision.zoom + 0.5, y = ((tv - 0.5) / sy + 0.5 - vision.center[1]) * vision.zoom + 0.5;
  return [x * cw, (1 - y) * ch];
}
function screenToSrc(px, py) {
  const cw = $('#fx').clientWidth, ch = $('#fx').clientHeight, [sx, sy] = vision.cover || [1, 1];
  const x = px / cw, y = 1 - py / ch; let tu = ((x - 0.5) / vision.zoom + vision.center[0] - 0.5) * sx + 0.5, tv = ((y - 0.5) / vision.zoom + vision.center[1] - 0.5) * sy + 0.5;
  if (vision.live && vision.facing === 'user') tu = 1 - tu; return [tu, 1 - tv];
}
const screenToCity = (x, y) => { const [u, v] = screenToSrc(x, y); return [u * vision.city.W, v * vision.city.H]; };

function setMode(m) {
  const changed = m !== st.mode; st.mode = m; if (vision) { vision.mode = m; vision.center = [0.5, 0.5]; if (changed) vision.fx.glitch = 0.55; }
  $$('#modes button').forEach(b => b.classList.toggle('on', +b.dataset.mode === m));
  const on = $(`#modes button[data-mode="${m}"]`); on && on.scrollIntoView && on.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  $('#modeName').textContent = MODE_TAGS[m];
  const z = $('#zoom'), zw = $('#zoomWrap');
  if (m === 3) { z.min = 1; z.max = 20; setZoom(4); } else if (m === 4) { z.min = 2; z.max = 10; setZoom(4); } else setZoom(1);
  zw.classList.toggle('hidden', !(m === 3 || m === 4));
  $('#btnFire').classList.toggle('hidden', m !== 1);
  if (m !== 1) endFire();
  st.target = [hud.W / 2, Math.max(232, Math.min(hud.H * 0.42, hud.H - 440))];
  if (changed) { stage.classList.remove('glitch'); void stage.offsetWidth; stage.classList.add('glitch'); }
  sfx.mode(m); buzz(10); xp.event('mode:' + m);
  if (changed && LINES.mode[m] && !st.said[m]) { st.said[m] = 1; guide.say(LINES.mode[m]); }
}
function setZoom(z) {
  z = Math.max(+$('#zoom').min, Math.min(+$('#zoom').max, z));
  if (vision) vision.zoom = z; $('#zoom').value = z; $('#zoomRead').textContent = z.toFixed(1) + '×';
  $('#rangeRead').textContent = st.mode === 4 ? `${(120 / z).toFixed(0)} µm FOV` : `RNG ${rangeTxt(z)}`;
}
const rangeTxt = z => { const km = 0.05 * Math.pow(z, 1.6); return km < 1 ? `${(km * 1000).toFixed(0)} m` : `${km.toFixed(2)} km`; };
$$('#modes button').forEach(b => b.addEventListener('click', () => setMode(+b.dataset.mode)));
$('#zoom').addEventListener('input', e => setZoom(+e.target.value));

// ---------- powers ----------
const POWER_COST = { freeze: 8, breath: 6, punch: 12, speed: 10 };
function setPower(p) { st.power = st.power === p ? null : p; $$('#powers [data-power]').forEach(b => b.classList.toggle('on', b.dataset.power === st.power)); sfx.click(); if (st.power) toast(`${st.power.toUpperCase()} ARMED · TAP THE VIEW`); }
$$('#powers [data-power]').forEach(b => b.addEventListener('click', () => setPower(b.dataset.power)));
function usePower(kind, x, y) {
  if (!powers) return; if (st.energy < POWER_COST[kind]) { sfx.error(); toast('SOLAR ENERGY LOW'); return; }
  st.energy -= POWER_COST[kind]; powers.trigger(kind, x, y, hud.W, hud.H); sfx[kind === 'breath' ? 'breath' : kind](); buzz(kind === 'punch' ? [40, 30, 80] : 25);
  xp.event('power:' + kind);
  if (game?.running && !vision.live) { const [cx, cy] = screenToCity(x, y); const r = game.hit(kind, cx, cy, kind === 'punch' ? 1 : 0.6); if (r === 'hit') sfx.lock(); }
}

// touch: target / pinch / pan / powers / lock / game pan
const ptrs = new Map(); let pinch0 = 0, zoom0 = 1, downAt = null, moved = 0;
const fx = $('#fx');
fx.addEventListener('pointerdown', e => {
  ptrs.set(e.pointerId, [e.clientX, e.clientY]); downAt = [e.clientX, e.clientY]; moved = 0;
  if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a[0] - b[0], a[1] - b[1]); zoom0 = vision ? vision.zoom : 1; }
  else if (st.mode === 1) { st.target = [e.clientX, e.clientY]; sfx.click(); }
});
fx.addEventListener('pointermove', e => {
  if (!ptrs.has(e.pointerId)) return; const prev = ptrs.get(e.pointerId); ptrs.set(e.pointerId, [e.clientX, e.clientY]); moved += Math.hypot(e.clientX - prev[0], e.clientY - prev[1]);
  if (ptrs.size === 2 && (st.mode === 3 || st.mode === 4) && pinch0) { const [a, b] = [...ptrs.values()]; setZoom(zoom0 * Math.hypot(a[0] - b[0], a[1] - b[1]) / pinch0); }
  else if (ptrs.size === 1 && st.mode === 1) st.target = [e.clientX, e.clientY];
  else if (ptrs.size === 1 && vision && vision.zoom > 1) {
    const z = vision.zoom; vision.center[0] = Math.max(0.5 / z, Math.min(1 - 0.5 / z, vision.center[0] - (e.clientX - prev[0]) / fx.clientWidth / z));
    vision.center[1] = Math.max(0.5 / z, Math.min(1 - 0.5 / z, vision.center[1] + (e.clientY - prev[1]) / fx.clientHeight / z));
  } else if (ptrs.size === 1 && vision && !vision.live && game?.running) vision.city.scroll -= (e.clientX - prev[0]) * vision.city.W / fx.clientWidth;
});
const ptrUp = e => {
  if (!ptrs.has(e.pointerId)) return; ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch0 = 0;
  if (e.type === 'pointerup' && ptrs.size === 0 && moved < 12 && downAt) tapAt(e.clientX, e.clientY);
};
function tapAt(x, y) {
  if (st.power) return usePower(st.power, x, y);
  if (st.mode === 1) return;
  const t = st.targets.find(t => Math.abs(t.x - x) < Math.max(30, t.w / 2 + 10) && Math.abs(t.y - y) < Math.max(30, t.h / 2 + 10));
  if (t && st.tracking) { st.locked = t.label; sfx.lock(); buzz(15); toast(`LOCKED · ${t.label}`); xp.event('track'); return; }
  if (st.mode !== 3 && st.mode !== 4) sfx.scan();
}
fx.addEventListener('pointerup', ptrUp); fx.addEventListener('pointercancel', ptrUp);
fx.addEventListener('gesturestart', e => e.preventDefault());
$('#btnTrack').classList.toggle('on', st.tracking);
$('#btnTrack').addEventListener('click', () => { st.tracking = !st.tracking; st.locked = null; $('#btnTrack').classList.toggle('on', st.tracking); sfx.click(); toast(st.tracking ? 'TARGET TRACKING ON' : 'TRACKING OFF'); });

// heat beam
function startFire() {
  if (st.mode !== 1 || st.firing) return;
  if (st.energy < 3) { sfx.error(); toast('SOLAR ENERGY DEPLETED'); return; }
  st.firing = true; stopBeam = sfx.beam(); $('#btnFire').classList.add('firing'); buzz([30, 20, 30, 20, 30]); xp.event('heat');
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
    if (game?.running) game.end();
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

// photo capture
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
  c.fillStyle = th.c; c.font = `700 ${12 * k}px Rajdhani`; c.fillText(`${MODE_TAGS[st.mode]} · ${new Date().toLocaleString()} · ${xp.rank().name}`, pad + 74 * k, hh - pad - 20 * k);
  return out;
}
let curMedia = null;
function showMedia(blob, type) {
  const url = URL.createObjectURL(blob); if (curMedia) URL.revokeObjectURL(curMedia); curMedia = url;
  const img = $('#photoImg'), vid = $('#photoVid'); img.classList.toggle('hidden', type !== 'photo'); vid.classList.toggle('hidden', type === 'photo');
  if (type === 'photo') { img.src = url; vid.removeAttribute('src'); } else { vid.src = url; vid.play().catch(() => {}); img.removeAttribute('src'); }
  const ext = type === 'photo' ? 'png' : (blob.type.includes('mp4') ? 'mp4' : 'webm');
  $('#photoSave').href = url; $('#photoSave').download = `super-vision-${Date.now()}.${ext}`; $('#photo').classList.remove('hidden'); $('#photo')._blob = blob; $('#photo')._ext = ext;
}
function doCapture() {
  const out = compose();
  $('#flash').classList.add('on'); requestAnimationFrame(() => requestAnimationFrame(() => $('#flash').classList.remove('on')));
  sfx.shutter(); buzz(25); xp.event('shot');
  out.toBlob(b => { if (!b) return; window.__lastPhotoBytes = b.size; showMedia(b, 'photo'); gallery.add({ type: 'photo', blob: b, mode: MODE_TAGS[st.mode] }).catch(() => {}); }, 'image/png');
}
$('#photoClose').addEventListener('click', () => { sfx.click(); $('#photo').classList.add('hidden'); $('#photoVid').pause(); });
$('#photoShare').addEventListener('click', async () => {
  const b = $('#photo')._blob; if (!b) return; const f = new File([b], `super-vision.${$('#photo')._ext}`, { type: b.type });
  try { if (navigator.canShare && navigator.canShare({ files: [f] })) await navigator.share({ files: [f], title: 'Super-Vision' }); else toast('SHARING NOT SUPPORTED · USE SAVE'); } catch (e) {}
});

// video recording
async function toggleRec() {
  if (recorder.active) {
    $('#btnRec').classList.remove('on'); sfx.recStop(); const blob = await recorder.stop(); window.__lastRecBytes = blob ? blob.size : 0; window.__lastRecType = blob ? blob.type : '';
    if (blob && blob.size) { gallery.add({ type: 'video', blob, mode: MODE_TAGS[st.mode] }).catch(() => {}); showMedia(blob, 'video'); xp.event('rec'); } else toast('RECORDING EMPTY');
    return;
  }
  try { recorder.start($('#fx').width, $('#fx').height); $('#btnRec').classList.add('on'); sfx.recStart(); toast('RECORDING'); buzz(20); }
  catch (e) { sfx.error(); toast('RECORDING NOT SUPPORTED'); }
}
$('#btnRec').addEventListener('click', toggleRec);

// ---------- sensors ----------
async function enableSensors() {
  sfx.click();
  try { if (typeof DeviceOrientationEvent !== 'undefined' && DeviceOrientationEvent.requestPermission) { const r = await DeviceOrientationEvent.requestPermission(); if (r !== 'granted') throw new Error('denied'); } addEventListener('deviceorientation', onOrient); }
  catch (e) { toast('MOTION ACCESS DENIED'); }
  if (navigator.geolocation) navigator.geolocation.watchPosition(p => {
    st.geoLive = true; st.gps = `${p.coords.latitude.toFixed(3)},${p.coords.longitude.toFixed(3)}`; st.coords = { lat: p.coords.latitude, lon: p.coords.longitude };
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
const TAB_TITLES = { fortress: 'FORTRESS', hearing: 'SUPER HEARING', flight: 'FLIGHT', glyphs: 'TRANSLATOR', log: 'MISSION LOG', settings: 'SETTINGS', missions: 'MISSIONS', gallery: 'GALLERY', weather: 'ATMOSPHERE' };
function setTab(t) {
  if (t === 'more') { $('#moreSheet').classList.toggle('hidden'); sfx.tab(); return; }
  $('#moreSheet').classList.add('hidden');
  if (t === st.tab) return; const prev = st.tab; st.tab = t;
  const tabKey = ['vision', 'fortress', 'hearing', 'flight', 'missions'].includes(t) ? t : 'more';
  $$('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === tabKey));
  $$('.panel').forEach(p => p.classList.toggle('on', p.id === 'panel-' + t));
  $('#visionUI').classList.toggle('hidden', t !== 'vision'); $('#energy').classList.toggle('hidden', t !== 'vision');
  stage.style.visibility = t === 'vision' ? '' : 'hidden';
  if (prev === 'vision') { endFire(); if (game?.running) game.end(); }
  if (prev === 'hearing') { hearing.stop(); $('#earStart').textContent = '◉ LISTEN'; $('#earStatus').textContent = 'Microphone offline · tap to listen'; }
  ambient(t === 'fortress');
  $('#modeName').textContent = t === 'vision' ? MODE_TAGS[st.mode] : TAB_TITLES[t];
  if (t === 'fortress') { if (!holo && !holoLoading) loadHolo(); xp.event('fortress'); guide.say(LINES.fortress); }
  if (t === 'missions') { renderMissions(); $('#xpDot').classList.remove('on'); }
  if (t === 'gallery') renderGallery();
  if (t === 'weather') renderWeather();
  sfx.tab(); buzz(8);
}
$$('#tabs button').forEach(b => b.addEventListener('click', () => setTab(b.dataset.tab)));
$('#moreSheet').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) { $('#moreSheet').classList.add('hidden'); return; }
  const g = b.dataset.go; if (g === 'layout') { setTab('settings'); setTimeout(() => $('#layoutSeg').scrollIntoView({ block: 'center' }), 50); } else setTab(g); });
async function loadHolo() {
  holoLoading = true;
  try { const { createHolo } = await import('./holo.js'); holo = await createHolo($('#holo')); $('#holoLoading').classList.add('hidden'); sfx.chime(); }
  catch (e) { console.warn('holo failed', e); $('#holoLoading').textContent = 'Hologram unavailable on this device'; }
}
$('#holoPulse').addEventListener('click', () => { holo?.pulse(); sfx.powerUp(); buzz(30); });
$('#holoAsk').addEventListener('click', () => { holo?.pulse(); sfx.chime(); guide.say(LINES.fortress); });
$('#holoAuto').addEventListener('click', e => { if (!holo) return; holo.setAuto(!holo.auto); e.currentTarget.classList.toggle('on', holo.auto); sfx.click(); });

// hearing
$('#earStart').addEventListener('click', async () => {
  if (hearing.live) { hearing.stop(); $('#earStart').textContent = '◉ LISTEN'; $('#earStatus').textContent = 'Microphone offline · simulated field'; sfx.click(); return; }
  try { await hearing.start(); $('#earStart').textContent = '■ STOP'; $('#earStatus').textContent = 'Super hearing active · listening'; sfx.powerUp(); xp.event('hear'); }
  catch (e) { sfx.error(); toast('MIC UNAVAILABLE · SIMULATING'); $('#earStatus').textContent = 'Mic unavailable — simulated acoustic field'; }
});

// flight
let flyPtr = null; const sky = $('#sky');
sky.addEventListener('pointerdown', e => { flyPtr = [e.clientX, e.clientY]; sky.setPointerCapture(e.pointerId); });
sky.addEventListener('pointermove', e => { if (!flyPtr) return; flight.drag(e.clientX - flyPtr[0], e.clientY - flyPtr[1]); flyPtr = [e.clientX, e.clientY]; st.lastFlyDrag = performance.now(); });
sky.addEventListener('pointerup', () => flyPtr = null);
$('#flyBoost').addEventListener('click', () => { flight.boost(); sfx.boost(); sfx.whoosh(1.2, 0.05, Math.random() < 0.5 ? -1 : 1); buzz([20, 30, 60]); xp.event('flight'); });

// translator
const gIn = $('#glyphIn'), gOut = $('#glyphOut');
const glyphCol = () => THEMES[S.theme].a === '#1e6bff' ? '#9fe8ff' : THEMES[S.theme].c;
const rerender = () => renderText(gIn.value, gOut, glyphCol());
gIn.addEventListener('input', () => { rerender(); const ch = gIn.value.slice(-1); if (ch) sfx.glyph(ch.charCodeAt(0)); });
renderKey($('#glyphKey')); rerender();
$('#glyphSpeak').addEventListener('click', () => {
  const spans = [...gOut.querySelectorAll('.g')]; xp.event('glyph');
  spans.forEach((s, i) => setTimeout(() => { s.style.transition = 'transform .15s, filter .15s'; s.style.transform = 'translateY(-6px) scale(1.15)'; s.style.filter = 'brightness(1.8)'; sfx.glyph(gIn.value.charCodeAt(i) || 0);
    setTimeout(() => { s.style.transform = ''; s.style.filter = ''; }, 180); }, i * 110));
});
function inscribe() {
  rerender(); xp.event('glyph'); let delay = 0;
  [...gOut.querySelectorAll('.g')].forEach((sp, i) => {
    sp.querySelectorAll('path,circle').forEach(el => {
      let len = 120; try { len = el.getTotalLength() || 120; } catch (e) {}
      const filled = el.getAttribute('fill') && el.getAttribute('fill') !== 'none';
      if (filled) { el.animate([{ opacity: 0, transform: 'scale(.2)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 250, delay: delay + 300, fill: 'backwards', easing: 'ease-out' }); return; }
      el.style.strokeDasharray = len; el.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], { duration: Math.min(900, 250 + len * 4), delay, fill: 'backwards', easing: 'cubic-bezier(.6,0,.3,1)' });
    });
    setTimeout(() => sfx.glyph(gIn.value.charCodeAt(i) || 0), delay); delay += 160;
  });
}
$('#glyphWrite').addEventListener('click', inscribe);
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
const addLog = (text) => { const L = logs(); L.push({ t: Date.now(), text }); localStorage.setItem(LKEY, JSON.stringify(L.slice(-200))); };
$('#logAdd').addEventListener('click', () => { const v = $('#logIn').value.trim(); if (!v) return sfx.error(); addLog(v); $('#logIn').value = ''; sfx.ping(); drawLog(); });
if (!localStorage.getItem(LKEY)) localStorage.setItem(LKEY, JSON.stringify([{ t: Date.now() - 86400000, text: 'Visor calibrated at the Fortress. Crystal matrix stable.' }]));
drawLog();

// ---------- XP / missions ----------
let popT;
function onXP(e) {
  if (e.type === 'xp') { const p = $('#xpPop'); p.textContent = `+${e.n} XP`; p.classList.remove('on'); void p.offsetWidth; p.classList.add('on'); if (st.tab !== 'missions') $('#xpDot').classList.add('on'); }
  if (e.type === 'ach') { sfx.achieve(); toast(`★ ${e.a[1]}`); addLog(`Achievement unlocked: ${e.a[1]} — ${e.a[2]}`); }
  if (e.type === 'daily') { toast(`DAILY ✓ ${e.label.toUpperCase()}`); }
  if (e.type === 'rank') { setTimeout(() => { sfx.powerUp(); toast(`RANK UP · ${e.rank}`); guide.say(LINES.rank(e.rank)); }, 900); }
  if (st.tab === 'missions') renderMissions();
}
function badge(i) { // original crest per rank
  const pts = 3 + i, r = 26, col = ['#8fb4d8', '#5cc8ff', '#ffcc33', '#ff9a3a', '#e3232c', '#ff4060', '#bff3ff'][i];
  const star = Array.from({ length: pts * 2 }, (_, k) => { const a = k * Math.PI / pts - Math.PI / 2, rr = k % 2 ? r * 0.5 : r; return `${32 + Math.cos(a) * rr},${32 + Math.sin(a) * rr}`; }).join(' ');
  return `<svg viewBox="0 0 64 64" width="64" height="64"><defs><radialGradient id="bg${i}"><stop offset="0" stop-color="${col}" stop-opacity=".5"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></radialGradient></defs><circle cx="32" cy="32" r="31" fill="url(#bg${i})"/><circle cx="32" cy="32" r="29" fill="none" stroke="${col}" stroke-width="1.5"/><polygon points="${star}" fill="${col}" opacity=".85"/><text x="32" y="37" text-anchor="middle" font-family="Oswald" font-size="14" fill="#031026">${i + 1}</text></svg>`;
}
function renderMissions() {
  const r = xp.rank(), s = xp.state; $('#rankBadge').innerHTML = badge(r.i); $('#rankName').textContent = r.name;
  $('#xpFill').style.width = r.next ? `${((s.xp - r.cur) / (r.next - r.cur) * 100).toFixed(1)}%` : '100%';
  $('#xpRead').textContent = r.next ? `${s.xp} XP · ${r.next - s.xp} to ${RANKS[r.i + 1][1]}` : `${s.xp} XP · MAX RANK`;
  const ds = xp.dailies(); $('#dailyList').innerHTML = ''; ds.forEach(([k, l, x]) => { const li = document.createElement('li'); li.className = s.daily.done.includes(k) ? 'done' : ''; li.innerHTML = `<span></span><b class="dim small">+${x} XP</b>`; li.firstChild.textContent = l; $('#dailyList').append(li); });
  $('#achCount').textContent = `${Object.keys(s.ach).length}/${ACH.length}`;
  $('#achGrid').innerHTML = ACH.map(([id, n, d]) => `<div class="${s.ach[id] ? 'got' : ''}"><b>${s.ach[id] ? '★' : '☆'}</b>${n}<small>${d}</small></div>`).join('');
  $('#gameBest').textContent = S.best ? `BEST: ${S.best} saved` : '';
}
$('#xpReset').addEventListener('click', () => { if (!confirm('Reset all XP and achievements?')) return; xp.reset(); renderMissions(); toast('PROGRESS RESET'); });

// ---------- rescue game ----------
function onGame(ev, d) {
  if (ev === 'save') { sfx.achieve(); xp.add(25, 'RESCUE'); xp.event('rescue'); toast(`✓ ${d.label} CONTAINED`); if (Math.random() < 0.4) guide.say(LINES.rescue, { vol: 0.6 }); }
  if (ev === 'miss') { sfx.error(); toast(`✗ ${d.label} — LOST`); }
  if (ev === 'wrong') { sfx.error(); toast(`USE ${d.power.toUpperCase()} ON ${d.label}`); }
  if (ev === 'end') { $('#btnGame').classList.remove('on'); toast(`RESCUE COMPLETE · ${d.score} SAVED`); if (d.score >= 8) xp.unlock('hero'); if (d.score > S.best) { S.best = d.score; save(); }
    addLog(`Rescue ops: ${d.score} incidents contained, ${d.missed} lost.`); drawLog(); }
}
function startGame() {
  if (!game) return; if (vision.live) { vision.stopCamera(); $('#srcChip').textContent = 'DEMO'; $('#srcChip').classList.remove('live'); }
  if (game.running) { game.end(); return; }
  setTab('vision'); $('#camPrompt').classList.add('hidden'); if (st.mode !== 0 && st.mode !== 1) setMode(0); game.start(); $('#btnGame').classList.add('on'); sfx.powerUp(); st.energy = 100;
  guide.say('Metropolis needs you. Choose the right power for each danger.'); toast('RESCUE OPS · 60s');
}
$('#btnGame').addEventListener('click', startGame); $('#gameStart').addEventListener('click', startGame);

// ---------- gallery ----------
let galURLs = [];
async function renderGallery() {
  galURLs.forEach(u => URL.revokeObjectURL(u)); galURLs = [];
  const items = await gallery.list(), grid = $('#galGrid'); grid.innerHTML = ''; $('#galEmpty').classList.toggle('hidden', items.length > 0);
  items.slice(0, 60).forEach(it => { const u = URL.createObjectURL(it.blob); galURLs.push(u); const b = document.createElement('button');
    const m = it.type === 'photo' ? Object.assign(document.createElement('img'), { src: u, alt: it.mode }) : Object.assign(document.createElement('video'), { src: u + '#t=0.1', muted: true, playsInline: true, preload: 'metadata' });
    const em = document.createElement('em'); em.textContent = `${it.type === 'video' ? '▶ ' : ''}${it.mode || ''}`; b.append(m, em);
    let hold; b.addEventListener('pointerdown', () => { hold = setTimeout(async () => { hold = null; if (confirm('Delete this capture?')) { await gallery.del(it.id); renderGallery(); } }, 650); });
    b.addEventListener('pointerup', () => { if (hold) { clearTimeout(hold); showMedia(it.blob, it.type); } }); b.addEventListener('pointerleave', () => clearTimeout(hold));
    grid.append(b); });
}

// ---------- weather ----------
let wx = null;
async function loadWeather(force) { wx = await getWeather(st.coords, force); if (vision) Object.assign(vision.city.weather, toCity(wx)); if (st.tab === 'weather') renderWeather(); }
function renderWeather() {
  if (!wx) return; $('#wxSrc').textContent = `${wx.place} · ${wx.src} · ${new Date(wx.t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  $('#wxTemp').textContent = `${Math.round(wx.temp)}°C`; $('#wxCond').textContent = describe(wx); $('#wxWind').textContent = Math.round(wx.wind);
  const [al, ac] = aqiLabel(wx.aqi); $('#wxAqi').textContent = wx.aqi ?? '--'; $('#wxAqi').style.color = ac; $('#wxPm').textContent = wx.pm25 != null ? wx.pm25.toFixed(1) : '--'; $('#wxUv').textContent = wx.uv != null ? (+wx.uv).toFixed(1) : '--';
  const c = $('#wxCv').getContext('2d'), W = 300, H = 150, cw = toCity(wx); c.clearRect(0, 0, W, H);
  const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, wx.isDay ? '#1a3a8c' : '#030820'); g.addColorStop(1, wx.isDay ? '#ff9a4a' : '#283070'); c.fillStyle = g; c.fillRect(0, 0, W, H);
  if (cw.cloud < 0.5) { c.fillStyle = wx.isDay ? '#ffd76a' : '#eef4ff'; c.shadowColor = c.fillStyle; c.shadowBlur = 20; c.beginPath(); c.arc(220, 50, 22, 0, 7); c.fill(); c.shadowBlur = 0; }
  c.fillStyle = `rgba(220,230,255,${0.3 + cw.cloud * 0.6})`; [[90, 60, 26], [120, 50, 32], [150, 62, 24], [60, 70, 18]].forEach(([x, y, r]) => { c.beginPath(); c.arc(x, y, r * (0.6 + cw.cloud), 0, 7); c.fill(); });
  if (cw.rain) { c.strokeStyle = 'rgba(160,200,255,.8)'; for (let i = 0; i < 30 * cw.rain + 6; i++) { const x = 50 + Math.random() * 130, y = 90 + Math.random() * 40; c.beginPath(); c.moveTo(x, y); c.lineTo(x - 4, y + 10); c.stroke(); } }
  if (cw.storm) { c.strokeStyle = '#fff6a0'; c.lineWidth = 3; c.beginPath(); c.moveTo(120, 80); c.lineTo(108, 105); c.lineTo(122, 105); c.lineTo(110, 135); c.stroke(); c.lineWidth = 1; }
  c.fillStyle = '#050b1e'; for (let x = 0; x < W; x += 18) { const h = 12 + ((x * 37) % 30); c.fillRect(x, H - h, 16, h); }
  c.font = '700 13px Rajdhani'; c.fillStyle = al === 'N/A' ? '#9ab' : ac; c.fillText(`AIR: ${al}`, 10, 18);
}
$('#wxRefresh').addEventListener('click', () => { sfx.scan(); loadWeather(true); });
$('#wxGeo').addEventListener('click', () => { sfx.click(); if (!navigator.geolocation) return toast('GPS UNAVAILABLE');
  navigator.geolocation.getCurrentPosition(p => { st.coords = { lat: p.coords.latitude, lon: p.coords.longitude }; loadWeather(true); }, () => toast('LOCATION DENIED · USING DEFAULT')); });

// ---------- settings ----------
$$('#qualSeg button').forEach(b => b.addEventListener('click', () => { S.quality = b.dataset.q; save(); applySettings(); sfx.click(); }));
$('#vol').addEventListener('input', e => { S.vol = +e.target.value; save(); setVolume(S.vol, S.muted); });
$('#vol').addEventListener('change', () => sfx.click());
$('#mute').addEventListener('click', () => { S.muted = !S.muted; save(); applySettings(); sfx.click(); });
$('#haptics').addEventListener('change', e => { S.haptics = e.target.checked; save(); buzz(20); });
$('#bootSkip').addEventListener('change', e => { S.bootSkip = e.target.checked; save(); });
$('#ambient').addEventListener('change', e => { S.ambient = e.target.checked; save(); setAmbientEnabled(S.ambient); });
$('#reverb').addEventListener('change', e => { S.reverb = e.target.checked; save(); setReverb(S.reverb); sfx.chime(); });
$('#guideOn').addEventListener('change', e => { S.guide = e.target.checked; save(); guide.enabled = S.guide; if (S.guide) guide.say('I am with you.'); });
function setLayout(l) { S.layout = l; S.lay = { ...LAYOUTS[l] }; save(); applySettings(); sfx.click(); }
$$('#layoutSeg button').forEach(b => b.addEventListener('click', () => setLayout(b.dataset.l)));
$$('#layoutToggles input').forEach(i => i.addEventListener('change', () => { S.lay[i.dataset.k] = i.checked; S.layout = 'custom'; save(); applySettings(); }));
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
let last = performance.now(), fN = 0, fT = 0, goodWin = 0, lastVision = 0, lastGeiger = 0;
const fpsLog = [];
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  fN++; fT += dt;
  if (fT >= 1) {
    st.fps = Math.round(fN / fT); fpsLog.push(st.fps); if (fpsLog.length > 30) fpsLog.shift();
    st.refresh = Math.max(st.refresh, st.fps > 100 ? 120 : 60);
    if (S.quality === 'auto' && !document.hidden) {
      if (st.fps < st.refresh * 0.75 && st.gi < GOV.length - 1) { st.gi++; applyGov(); goodWin = 0; }
      else if (st.fps >= st.refresh * 0.93 && st.gi > 0) { if (++goodWin >= 3) { st.gi--; applyGov(); goodWin = 0; } }
    }
    $('#govRead').textContent = `Governor: ${st.fps} fps · scale ${(st.scale * 100).toFixed(0)}% · post tier ${st.tier} · ${S.quality.toUpperCase()}${S.quality === 'saver' ? ' (30 fps cap)' : ''}`;
    fN = 0; fT = 0;
  }
  if (!boot.done) { boot.frame(now); if (boot.started) return; }
  if (document.hidden) return;
  const capped = S.quality === 'saver' && now - lastVision < 1000 / 31;
  const T = now / 1000;
  if (st.tab === 'vision' && vision) {
    if (capped) return; lastVision = now;
    const drain = st.firing ? 22 : st.mode === 2 ? 1.2 : (st.mode === 3 || st.mode === 4 || st.mode === 11) ? 0.8 : st.mode === 1 ? 0.4 : 0;
    const gain = st.mode === 6 ? 7 : 1.6;
    st.energy = Math.max(0, Math.min(100, st.energy + (gain * (st.firing ? 0 : 1) - drain) * dt));
    if (st.firing && st.energy <= 0) { endFire(); toast('SOLAR ENERGY DEPLETED'); sfx.error(); }
    st.heading = st.compassLive ? lerpAngle(st.heading, st.headingLive, 0.15) : (st.heading + dt * 6 * Math.sin(T * 0.13)) % 360;
    st.alt = st.altLive != null ? st.altLive : 312 + Math.sin(T * 0.3) * 18 + Math.sin(T * 1.7) * 3;
    st.speed = st.speedLive != null ? st.speedLive : Math.max(0, 42 + Math.sin(T * 0.4) * 30 + Math.sin(T * 2.3) * 4);
    powers.update(dt); game.update(dt);
    if (st.firing) {
      vision.beam = [st.target[0] / hud.W, 1 - st.target[1] / hud.H, 0.8 + Math.random() * 0.4];
      stage.style.transform = `translate(${(Math.random() - 0.5) * 8}px,${(Math.random() - 0.5) * 8}px)`;
      if (game.running) { const [cx, cy] = screenToCity(...st.target); game.hit('heat', cx, cy, dt * 1.1); }
    } else {
      if (vision.beam[2] > 0) vision.beam[2] = Math.max(0, vision.beam[2] - dt * 2);
      const sh = powers.shake; stage.style.transform = sh > 0.01 ? `translate(${(Math.random() - 0.5) * 18 * sh}px,${(Math.random() - 0.5) * 18 * sh}px)` : '';
    }
    vision.render(now); st.frames++;
    // tracking + kryptonite
    const tr = tracker.update(now);
    st.targets = st.tracking || game.running ? tr.targets.map(t => { const [x, y] = srcToScreen(t.u, t.v); const [x2, y2] = srcToScreen(t.u + t.w / 2, t.v + t.h / 2); return { x, y, w: Math.abs(x2 - x) * 2, h: Math.abs(y2 - y) * 2, label: t.label, threat: t.threat, locked: t.label === st.locked }; })
      .filter(t => t.x > -20 && t.x < hud.W + 20 && t.y > 60 && t.y < hud.H - 200) : [];
    if (st.mode === 12) {
      const pts = vision.live ? (tr.green ? [{ u: tr.green.u, v: tr.green.v, s: tr.green.s }] : []) : vision.city.kryp.map(k => ({ u: k.x / vision.city.W, v: k.y / vision.city.H, s: 1 }));
      st.kryp = pts.map(p => { const [x, y] = srcToScreen(p.u, p.v); return { x, y, s: p.s }; }); vision.kryp = st.kryp.map(k => ({ x: k.x / hud.W, y: 1 - k.y / hud.H, s: k.s }));
    } else { vision.kryp = []; st.kryp = []; }
    const hs = { t: now, mode: st.mode, heading: st.heading, alt: st.alt, speed: st.speed, colA: getVar('--a'), colB: getVar('--b'), colC: getVar('--c'), target: st.target, firing: st.firing,
      zoom: vision.zoom, range: rangeTxt(vision.zoom), live: vision.live, fps: st.fps, q: `${Math.round(st.scale * 100)}%·T${st.tier}`, gps: st.geoLive ? st.gps : 'SIM', onSweep: sweepPing,
      layout: S.lay, targets: st.targets, kryp: st.kryp, motion: vision.live ? tr.motion : undefined, game: game.running ? game : null };
    hud.draw(hs); powers.draw(hud.ctx, hud.W, hud.H, dt);
    if (st.mode === 12) { st.krypNear = hs.krypNear || 0; const iv = 0.9 - st.krypNear * 0.82; if (now - lastGeiger > iv * 1000 * (0.6 + Math.random() * 0.8)) { lastGeiger = now; sfx.geiger(st.krypNear); } if (st.krypNear > 0.7 && !st.said.kr) { st.said.kr = 1; xp.event('kryp'); guide.say(LINES.kryp); } }
    if (recorder.active) recorder.frame([$('#fx'), $('#hud')], MODE_TAGS[st.mode]);
    if (st.capture) { st.capture = false; doCapture(); }
    const e = Math.round(st.energy); $('#energyFill').style.height = e + '%'; if (e !== st._e) { st._e = e; $('#energyPct').textContent = e + '%'; $('#energy').classList.toggle('low', e < 20); }
  } else if (st.tab === 'fortress' && holo) { holo.frame(now, dt, st.scale); st.frames++; }
  else if (st.tab === 'hearing') { st.frames++; const r = hearing.frame(now, { c: getVar('--c') }); if (fN % 6 === 0) { $('#earDb').textContent = `${r.db.toFixed(0)} dB`; $('#earHz').textContent = `${Math.round(r.hz)} Hz`; } }
  else if (st.tab === 'flight') {
    if (st.tilt) flight.setTilt(st.tilt[0], st.tilt[1]);
    st.frames++; const r = flight.frame(now, dt, !st.tilt && now - st.lastFlyDrag > 3000 && !flyPtr);
    if (fN % 6 === 0) { $('#flySpd').textContent = `MACH ${r.mach.toFixed(1)}`; $('#flyAlt').textContent = `ALT ${Math.round(r.alt)} m`; }
  }
  if (recorder.active && st.tab !== 'vision') toggleRec();
}
const varCache = {};
function getVar(n) { if (!varCache[n]) { varCache[n] = getComputedStyle(document.documentElement).getPropertyValue(n).trim() || '#fff'; } return varCache[n]; }
new MutationObserver(() => { for (const k in varCache) delete varCache[k]; }).observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
function lerpAngle(a, b, k) { const d = ((b - a + 540) % 360) - 180; return (a + d * k + 360) % 360; }
let lastPing = 0; function sweepPing() { const n = performance.now(); if (n - lastPing > 4000) { lastPing = n; sfx.ping(); } }

applySettings(); setMode(0); st.said = {};
requestAnimationFrame(loop);
loadWeather(false); addEventListener('online', () => loadWeather(true));
document.addEventListener('visibilitychange', () => { if (document.hidden) { endFire(); ambient(false); if (recorder.active) toggleRec(); } else if (st.tab === 'fortress') ambient(true); });
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(() => {});

// test / debug hook
window.VISOR = { setMode, setTab, setPower, usePower, startFire, endFire, setZoom, setLayout, toggleRec, startGame, fpsLog, st, S, xp, gallery, renderGallery, loadWeather, inscribe,
  capture: () => { st.capture = true; }, get vision() { return vision; }, get game() { return game; }, get holoReady() { return !!holo; }, get wx() { return wx; }, get recording() { return recorder.active; } };
