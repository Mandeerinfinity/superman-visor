// Offline cache for the visor (cache-first, versioned).
const V = 'visor-v2';
const CORE = ['./', 'index.html', 'css/style.css', 'js/app.js', 'js/audio.js', 'js/boot.js', 'js/shield.js', 'js/vision.js', 'js/hud.js', 'js/hearing.js', 'js/flight.js', 'js/glyphs.js', 'js/holo.js', 'js/city.js', 'js/powers.js', 'js/track.js', 'js/recorder.js', 'js/gallery.js', 'js/xp.js', 'js/guide.js', 'js/weather.js', 'js/game.js',
  'vendor/three.module.min.js', 'fonts/rajdhani-bold.woff2', 'fonts/rajdhani-medium.woff2', 'fonts/oswald.woff2', 'fonts/cinzel.woff2', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-180.png', 'icons/icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(r => r || fetch(e.request).then(res => { const cp = res.clone(); caches.open(V).then(c => c.put(e.request, cp)); return res; })));
});
