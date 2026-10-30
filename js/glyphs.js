// Original "Kryptonian" crystal script: each character becomes a unique arrangement of strokes
// on a 7-node hexagonal crystal lattice. Deterministic and invented for this gadget.
const N = [[20, 4], [6, 14], [34, 14], [20, 24], [6, 34], [34, 34], [20, 44]]; // top, ul, ur, c, ll, lr, bottom
const E = [[0, 1], [0, 2], [1, 3], [2, 3], [0, 3], [3, 6], [1, 4], [2, 5], [4, 6], [5, 6], [3, 4], [3, 5], [1, 2], [4, 5], [0, 6]];
function rng(seed) { return () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296; }
const MAP = {};
(function build() {
  const used = new Set(), chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  for (let i = 0; i < chars.length; i++) {
    const r = rng(7919 * (i + 3)); let key, set;
    do { set = new Set(); const n = 3 + Math.floor(r() * 2); while (set.size < n) set.add(Math.floor(r() * E.length)); key = [...set].sort((a, b) => a - b).join(','); } while (used.has(key));
    used.add(key);
    const isDigit = i >= 26, vowel = 'AEIOU'.includes(chars[i]);
    MAP[chars[i]] = { edges: [...set], dot: vowel ? 3 : -1, ring: isDigit, bar: i % 3 === 0 };
  }
})();
export function glyphSVG(ch, size = 40, color = '#9fe8ff', glowCol = '#3aa8ff') {
  const g = MAP[ch.toUpperCase()];
  const w = size, h = size * 1.2;
  if (!g) {
    if (ch === ' ') return `<svg width="${w * 0.4}" height="${h}" viewBox="0 0 16 48"></svg>`;
    return `<svg width="${w * 0.5}" height="${h}" viewBox="0 0 20 48"><path d="M10 18 L14 24 L10 30 L6 24Z" fill="${color}" opacity=".8"/></svg>`;
  }
  let p = g.edges.map(e => { const [a, b] = E[e]; return `M${N[a][0]} ${N[a][1]}L${N[b][0]} ${N[b][1]}`; }).join('');
  let extra = '';
  if (g.ring) extra += `<circle cx="20" cy="24" r="17" fill="none" stroke="${color}" stroke-width="1.2" opacity=".55"/>`;
  if (g.bar) extra += `<path d="M10 46L30 46" stroke="${color}" stroke-width="1.6" opacity=".7"/>`;
  if (g.dot >= 0) extra += `<path d="M20 20L23 24L20 28L17 24Z" fill="#ffd76a"/>`;
  return `<svg width="${w}" height="${h}" viewBox="0 0 40 48" style="filter:drop-shadow(0 0 3px ${glowCol})"><path d="${p}" stroke="${color}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>${extra}</svg>`;
}
export function renderText(text, el, color) {
  el.innerHTML = [...text.slice(0, 120)].map((c, i) => `<span class="g" data-i="${i}" title="${c.replace(/[<>&"]/g, '')}">${glyphSVG(c, 36, color)}</span>`).join('');
}
export function renderKey(el) {
  el.innerHTML = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('').map(c => `<div>${glyphSVG(c, 30)}<span>${c}</span></div>`).join('');
}
