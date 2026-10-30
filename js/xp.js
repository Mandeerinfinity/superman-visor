// Missions, XP, ranks, achievements and seeded daily challenges — all local.
const KEY = 'nickVisorXP';
export const RANKS = [[0, 'CADET'], [100, 'RECRUIT'], [300, 'HERO'], [700, 'GUARDIAN'], [1500, 'CHAMPION OF METROPOLIS'], [3000, 'MAN OF STEEL'], [6000, 'LAST SON OF KRYPTON']];
export const ACH = [
  ['first-light', 'FIRST LIGHT', 'Power up the visor', 20], ['spectrum', 'FULL SPECTRUM', 'Use all 13 vision modes', 150], ['heat', 'HEAT SIGNATURE', 'Fire heat vision', 30],
  ['frost', 'ARCTIC BREATH', 'Use Freeze Breath', 30], ['gust', 'HURRICANE LUNGS', 'Use Super Breath', 30], ['punch', 'SONIC PUNCH', 'Throw a shockwave punch', 30], ['speed', 'FASTER THAN A BULLET', 'Use Super Speed', 30],
  ['kryp', 'GREEN DANGER', 'Find a kryptonite shard', 60], ['rescue', 'FIRST RESCUE', 'Resolve an incident', 50], ['hero', 'CITY SAVED', 'Score 8+ in one rescue run', 200],
  ['photo', 'PRESS PASS', 'Capture a photo', 20], ['rec', 'ON THE RECORD', 'Record a video', 40], ['fortress', 'SOLITUDE', 'Visit the Fortress', 20], ['glyph', 'POLYGLOT', 'Transmit Kryptonian', 25],
  ['flight', 'UP, UP', 'Boost in flight mode', 25], ['hear', 'EVERY HEARTBEAT', 'Use super hearing', 25], ['track', 'THREAT ASSESSOR', 'Lock onto a tracked target', 30], ['daily', 'DAILY DUTY', 'Complete all 3 daily challenges', 120]
];
const DAILY_POOL = [['mode:2', 'Scan with X-RAY', 20], ['mode:7', 'Patrol in INFRARED', 20], ['mode:9', 'Read the EM SPECTRUM', 20], ['mode:12', 'Sweep for KRYPTONITE', 25], ['power:freeze', 'Freeze something', 20],
  ['power:punch', 'Throw a punch', 20], ['power:breath', 'Blow away smog', 20], ['rescue', 'Resolve an incident', 40], ['shot', 'Capture a photo', 15], ['glyph', 'Transmit a message', 15], ['fortress', 'Visit the Fortress', 15], ['mode:10', 'Track MOTION', 20]];
const day = () => new Date().toISOString().slice(0, 10);
export function createXP(onEvent) {
  let s = { xp: 0, ach: {}, modes: [], daily: { d: '', done: [] }, rescues: 0 }; try { Object.assign(s, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) {}
  const save = () => localStorage.setItem(KEY, JSON.stringify(s));
  function dailies() { let seed = [...day()].reduce((a, c) => a * 31 + c.charCodeAt(0) >>> 0, 7); const pool = DAILY_POOL.slice(), out = [];
    while (out.length < 3) { seed = (seed * 1664525 + 1013904223) >>> 0; out.push(pool.splice(seed % pool.length, 1)[0]); }
    if (s.daily.d !== day()) s.daily = { d: day(), done: [] }; return out; }
  const rank = (xp = s.xp) => { let i = 0; RANKS.forEach((r, k) => { if (xp >= r[0]) i = k; }); return { i, name: RANKS[i][1], cur: RANKS[i][0], next: RANKS[i + 1]?.[0] ?? null }; };
  function add(n, why) { const r0 = rank().i; s.xp += n; save(); onEvent({ type: 'xp', n, why }); const r1 = rank(); if (r1.i > r0) onEvent({ type: 'rank', rank: r1.name }); }
  function unlock(id) { if (s.ach[id]) return; const a = ACH.find(x => x[0] === id); if (!a) return; s.ach[id] = Date.now(); save(); onEvent({ type: 'ach', a }); add(a[3], a[1]); }
  function event(key) {
    const [k, v] = key.split(':');
    if (k === 'mode') { if (!s.modes.includes(+v)) { s.modes.push(+v); save(); if (s.modes.length > 1) add(5, 'NEW SPECTRUM'); } if (s.modes.length >= 13) unlock('spectrum'); if (v === '12') {} }
    const map = { 'power:freeze': 'frost', 'power:breath': 'gust', 'power:punch': 'punch', 'power:speed': 'speed', heat: 'heat', kryp: 'kryp', rescue: 'rescue', shot: 'photo', rec: 'rec', fortress: 'fortress', glyph: 'glyph', flight: 'flight', hear: 'hear', track: 'track', boot: 'first-light' };
    if (map[key]) unlock(map[key]); if (key === 'rescue') { s.rescues++; save(); }
    const ds = dailies(); ds.forEach(([dk, label, xp]) => { if (dk === key && !s.daily.done.includes(dk)) { s.daily.done.push(dk); save(); onEvent({ type: 'daily', label }); add(xp, 'DAILY'); } });
    if (s.daily.done.length >= 3) unlock('daily');
  }
  return { get state() { return s; }, rank, add, unlock, event, dailies, reset() { s = { xp: 0, ach: {}, modes: [], daily: { d: '', done: [] }, rescues: 0 }; save(); } };
}
