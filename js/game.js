// 60-second Metropolis rescue: resolve incidents with the right power.
const TYPES = { fire: ['freeze', 'STRUCTURE FIRE'], smoke: ['breath', 'TOXIC SMOG'], debris: ['punch', 'FALLING GIRDER'], drone: ['heat', 'HOSTILE DRONE'] };
export const POWER_FOR = Object.fromEntries(Object.entries(TYPES).map(([k, v]) => [k, v[0]]));
export function createGame(city, cb) {
  let id = 0, spawnT = 0;
  const g = { running: false, time: 0, score: 0, missed: 0,
    start() { g.running = true; g.time = 60; g.score = 0; g.missed = 0; city.auto = false; city.incidents = []; spawnT = 0; g.spawn('fire'); g.spawn('drone'); },
    spawn(type) { const ks = Object.keys(TYPES); type = type || ks[Math.floor(Math.random() * ks.length)]; const W = city.W;
      let wx, tries = 0; do { wx = city.scroll + (0.15 + Math.random() * 0.7) * W; tries++; } while (tries < 8 && city.incidents.some(i => Math.abs(i.wx - wx) < 70));
      city.incidents.push({ id: ++id, type, power: TYPES[type][0], label: TYPES[type][1], wx, wy: type === 'drone' ? 0.32 + Math.random() * 0.14 : 0.5 + Math.random() * 0.16, hp: 1, age: 0 }); },
    update(dt) { if (!g.running) return; g.time -= dt; spawnT += dt;
      if (spawnT > 4.5 && city.incidents.length < 4) { spawnT = 0; g.spawn(); }
      for (const i of city.incidents.slice()) { i.age += dt; if (i.age > 22) { city.incidents.splice(city.incidents.indexOf(i), 1); g.missed++; cb('miss', i); } }
      if (g.time <= 0) g.end(); },
    hit(power, px, py, amt = 0.55) { if (!g.running) return null; let best = null, bd = 1e9;
      for (const i of city.incidents) { const d = Math.hypot((i.sx ?? -999) - px, (i.sy ?? -999) - py); if (d < bd) { bd = d; best = i; } }
      if (!best || bd > 70) return null; if (best.power !== power) { cb('wrong', best); return 'wrong'; }
      best.hp -= amt; if (best.hp <= 0) { city.incidents.splice(city.incidents.indexOf(best), 1); g.score++; cb('save', best); return 'save'; } return 'hit'; },
    end() { if (!g.running) return; g.running = false; city.auto = true; city.incidents = []; cb('end', { score: g.score, missed: g.missed }); }
  };
  return g;
}
