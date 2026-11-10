/* GoFit Planner — offline cache. Bump CACHE when app files change. 3D models are cached separately on first view. */
const CACHE = 'gofit-planner-v3.6.0';
const MODELS = 'gofit-models-v2';   // v1 held the DRAX files (about 130 MB): dropped on activate
const FILES = [
  './', 'index.html', 'manifest.webmanifest', 'css/app.css',
  'js/core.js', 'js/catalog.js', 'js/media.js', 'vendor/three.min.js', 'vendor/OrbitControls.js', 'js/m3-parts.js', 'js/m3-models-a.js', 'js/m3-models-b.js', 'js/render3d.js', 'js/symbols.js', 'js/plan.js', 'js/checks.js', 'js/ui.js', 'js/overlay.js', 'js/tools.js', 'js/panels.js', 'js/export.js', 'js/viewer3d.js', 'js/view3d.js', 'js/backup.js', 'js/wizard.js', 'js/app.js',
  'assets/plan/manifest.json', 'models/basic/index.json',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png',
].concat(  /* wall & floor finishes (GP.TEX) and their swatches */
  ['floor_oak', 'floor_walnut', 'floor_concrete', 'floor_epoxy', 'floor_porcelain', 'floor_marble', 'floor_carpet', 'floor_terrazzo', 'wall_concrete', 'wall_brick_red', 'wall_brick_white', 'wall_wood_slat', 'wall_subway_tile', 'wall_slate', 'wall_plaster_dark'].flatMap(t => ['assets/tex/' + t + '.jpg', 'assets/tex/thumb/' + t + '.jpg']));
/* plan top views + catalog pictures are listed in the manifest; cache them all so the plan looks right offline */
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(async c => { await c.addAll(FILES); try { const m = await (await fetch('assets/plan/manifest.json')).json(); await c.addAll(Object.keys(m).flatMap(t => ['assets/plan/' + t + '.png', 'assets/plan-line/' + t + '.png', 'assets/thumb/' + t + '.png'])); } catch (err) { }
  try { const b = await (await fetch('models/basic/index.json')).json(); await c.addAll(Object.values(b).map(p => 'models/basic/' + p)); } catch (err) { } }).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== MODELS).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request; const url = new URL(req.url); if (req.method !== 'GET' || url.origin !== location.origin || url.searchParams.has('ver')) return;      // ?ver: the app's version check, straight to the site
  /* 3D libraries: cache first (big, never change). The generic models (models/basic) are app files: precached at install, network first below. */
  if (/\/(models|vendor)\//.test(url.pathname) && !/\/models\/basic\//.test(url.pathname)) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => { if (res.ok) { const copy = res.clone(); caches.open(MODELS).then(c => c.put(req, copy)); } return res; })));
    return;
  }
  /* app files: network first, always asking the site whether the file changed (a plain reload may otherwise reuse the browser's
     10-minute copy of a script), cache fallback (offline) */
  e.respondWith((req.mode === 'navigate' ? fetch(req) : fetch(new Request(req, { cache: 'no-cache' }))).then(res => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return res; }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('index.html'))));
});
