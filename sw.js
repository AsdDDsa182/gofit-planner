/* GoFit Planner — offline cache.
   CACHE  (versioned) the app's code: replaced on every release.
   ASSETS (kept)      plan pictures, catalog pictures, textures and the generic 3D models: a release downloads only what it does
                      not have yet (about 20 MB stayed put instead of being fetched again each time). They are still asked for
                      from the site first, so a changed picture or model arrives when online.
   MODELS (kept)      3D libraries and files that never change under the same address: cache first. */
const CACHE = 'gofit-planner-v3.11.3', ASSETS = 'gofit-assets-v1', MODELS = 'gofit-models-v2';
const FILES = [
  './', 'index.html', 'manifest.webmanifest', 'css/app.css',
  'js/core.js', 'js/catalog.js', 'js/media.js', 'vendor/three.min.js', 'vendor/OrbitControls.js', 'js/m3-parts.js', 'js/m3-models-a.js', 'js/m3-models-b.js', 'js/render3d.js', 'js/symbols.js', 'js/plan.js', 'js/checks.js', 'js/ui.js', 'js/overlay.js', 'js/tools.js', 'js/panels.js', 'js/export.js', 'js/viewer3d.js', 'js/view3d.js', 'js/backup.js', 'js/wizard.js', 'js/app.js',
  'assets/plan/manifest.json', 'models/basic/index.json', 'models/load/index.json',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png',
];
const LIBS = ['vendor/GLTFLoader.js', 'vendor/DRACOLoader.js', 'vendor/draco/draco_decoder.wasm', 'vendor/draco/draco_wasm_wrapper.js', 'vendor/draco/draco_decoder.js', 'models/arch/parts.glb?v=1'];      // without these no 3D model opens offline
const TEX = ['floor_oak', 'floor_walnut', 'floor_concrete', 'floor_epoxy', 'floor_porcelain', 'floor_marble', 'floor_carpet', 'floor_terrazzo', 'wall_concrete', 'wall_brick_red', 'wall_brick_white', 'wall_wood_slat', 'wall_subway_tile', 'wall_slate', 'wall_plaster_dark', 'veneer_oak', 'veneer_walnut', 'veneer_ash', 'veneer_teak'].flatMap(t => ['assets/tex/' + t + '.jpg', 'assets/tex/thumb/' + t + '.jpg']);
const isAsset = p => /\/assets\/(plan|plan-line|thumb|tex)\/.+\.(png|jpg)$/.test(p) || /\/models\/basic\/.+\.glb$/.test(p);
/* every address not in `name` yet: taken over from an older cache when one has it, downloaded otherwise (six at a time) */
async function keep(name, urls) {
  const c = await caches.open(name); let i = 0;
  const one = async () => { while (i < urls.length) { const u = urls[i++]; try { if (await c.match(u)) continue; const old = await caches.match(u); if (old) await c.put(u, old.clone()); else await c.add(u); } catch (err) { } } };
  await Promise.all([one(), one(), one(), one(), one(), one()]);
}
self.addEventListener('install', e => { e.waitUntil((async () => {
  await (await caches.open(CACHE)).addAll(FILES); let pics = [], models = [];
  try { const m = await (await fetch('assets/plan/manifest.json')).json(); pics = Object.keys(m).flatMap(t => ['assets/plan/' + t + '.png', 'assets/plan-line/' + t + '.png', 'assets/thumb/' + t + '.png']); } catch (err) { }
  try { const b = await (await fetch('models/basic/index.json')).json(); models = Object.values(b).map(p => 'models/basic/' + p); } catch (err) { }
  await keep(ASSETS, TEX.concat(pics, models)); await keep(MODELS, LIBS);
  self.skipWaiting();
})()); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== ASSETS && k !== MODELS).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request; const url = new URL(req.url); if (req.method !== 'GET' || url.origin !== location.origin || url.searchParams.has('ver')) return;      // ?ver: the app's version check, straight to the site
  /* 3D libraries and other fixed files: cache first */
  if (/\/(models|vendor)\//.test(url.pathname) && !/\/models\/basic\//.test(url.pathname) && !/\.json$/.test(url.pathname)) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => { if (res.ok) { const copy = res.clone(); caches.open(MODELS).then(c => c.put(req, copy)); } return res; })));
    return;
  }
  /* everything else: network first, always asking the site whether the file changed (a plain reload may otherwise reuse the
     browser's 10-minute copy of a script), cache fallback (offline) */
  const into = isAsset(url.pathname) ? ASSETS : CACHE;
  e.respondWith((req.mode === 'navigate' ? fetch(req) : fetch(new Request(req, { cache: 'no-cache' }))).then(res => { if (res.ok) { const copy = res.clone(); caches.open(into).then(c => c.put(req, copy)); } return res; }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('index.html'))));
});
