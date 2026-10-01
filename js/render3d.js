/* GoFit Planner — 3D model factory (generic GLB models, registered files, procedural models) and the off-screen renderer that makes plan pictures / thumbnails */
(function () {
'use strict';
const GP = window.GP, U = GP.U;
const R3 = GP.R3 = {};
/* colours are authored in sRGB (same as the DRAX files) */
if (window.THREE && THREE.ColorManagement) THREE.ColorManagement.legacyMode = false;
R3.ok = (() => { try { return !!window.THREE && !!document.createElement('canvas').getContext('webgl'); } catch (e) { return false; } })();
let inited = false;
R3.init = () => { if (inited || !R3.ok) return R3.ok; inited = true; GP.initMaterials(); return true; };
R3.base = () => window.GP_BASE || '';

/* ---------------- procedural model (merged per material, cached by signature) ---------------- */
const procCache = new Map();
R3.sig = (it) => { const d = GP.dims(it); return `${it.type}|${U.f3(d.w)}|${U.f3(d.d)}|${U.f3(d.h)}|${JSON.stringify(it.params || null)}|${JSON.stringify((GP.lib.customTypes[it.type] || {}).parts || '')}`; };
R3.procModel = (it, defOverride) => {
  R3.init(); const def = defOverride || GP.getDef(it.type); const d = defOverride ? { w: 1, d: 1, h: 1 } : GP.dims(it); const sig = defOverride ? null : R3.sig(it);
  let parts = sig && procCache.get(sig);
  if (!parts) {
    const g = new THREE.Group(); const m3 = GP.M3CAT[it.type];
    const params = Object.assign({}, Object.fromEntries(((def && def.params) || []).map(q => [q.k, q.def])), it.params || {});
    const p = { w: d.w, d: d.d, h: d.h, params, wallH: GP.P ? GP.P.settings.wallH : 2.8 };
    try {
      if (def && def.custom) GP.buildCustom(g, def, p);
      else if (m3) { const c = GP.ctx(g, m3.fit === 'actual' ? { w: p.w, d: p.d, h: p.h } : m3, p); m3.build(c, p); }
      else { const b = new THREE.Mesh(new THREE.BoxGeometry(d.w, d.h, d.d), GP.M.body || new THREE.MeshStandardMaterial({ color: '#9aa0a6' })); b.position.y = d.h / 2; g.add(b); }
    } catch (e) { console.warn('model', it.type, e); }
    parts = GP.mergeGroup(g); if (sig) { procCache.set(sig, parts); if (procCache.size > 300) procCache.delete(procCache.keys().next().value); }
  }
  const out = new THREE.Group(); parts.forEach(q => { const me = new THREE.Mesh(q.geometry, q.material); me.castShadow = true; me.receiveShadow = true; out.add(me); });
  if (it.type === 'logo' && it.img && GP.P && GP.P.images[it.img]) { const tx = new THREE.TextureLoader().load(GP.P.images[it.img].src, () => GP.V3 && GP.V3.invalidate()); tx.encoding = THREE.sRGBEncoding; const pl = new THREE.Mesh(new THREE.PlaneGeometry(d.w - .02, d.h - .02), new THREE.MeshStandardMaterial({ map: tx, transparent: true, roughness: .6 })); pl.position.set(0, d.h / 2, d.d / 2 + .002); out.add(pl); }
  return out;
};

/* ---------------- GLB models: generic Blender-made models (models/basic) and 3D files the user registered (GP.media) ---------------- */
const glbCache = new Map(); // key -> Promise<scene>
R3.basic = {}; // type -> 'category/type.glb'
R3.loadBasic = () => fetch(R3.base() + 'models/basic/index.json').then(r => r.ok ? r.json() : {}).then(j => { R3.basic = j || {}; }).catch(() => { });
R3.hasBasic = (type) => !!R3.basic[type];
let loaderP = null;
function loadScript(src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('script ' + src)); document.head.appendChild(s); }); }
R3.loaders = () => loaderP || (loaderP = (async () => { for (const f of ['GLTFLoader', 'DRACOLoader']) if (!THREE[f]) await loadScript(R3.base() + 'vendor/' + f + '.js'); const gl = new THREE.GLTFLoader(); const dr = new THREE.DRACOLoader(); dr.setDecoderPath(R3.base() + 'vendor/draco/'); gl.setDRACOLoader(dr); R3._gl = gl; return gl; })().catch(e => { loaderP = null; throw e; }));
/* a registered 3D file (GP.media) wins over the generic model */
R3.hasModel = (type) => !!(GP.media && GP.media.model(type)) || R3.hasBasic(type);
R3.glb = (type, onProgress, basic) => {
  const reg = !basic && GP.media && GP.media.model(type), key = basic ? 'b:' + type : reg ? 'u:' + reg.id : type;
  let p = glbCache.get(key); if (p) return p;
  p = R3.loaders().then(async gl => { const url = reg ? await GP.media.src(reg) : R3.basic[type] ? R3.base() + 'models/basic/' + R3.basic[type] : null; if (!url) throw new Error('no model file'); return url; }).then(url => new Promise((res, rej) => R3._gl.load(url, g => { g.scene.traverse(n => { if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; } }); res(g.scene); }, ev => { if (onProgress && ev.total) onProgress(ev.loaded / ev.total); }, rej)));
  p.catch(() => glbCache.delete(key)); glbCache.set(key, p); return p;
};
/* clone that keeps skinned meshes bound to the cloned bones (Object3D.clone leaves them on the original skeleton,
   so they stayed at the origin while the rest of the machine moved) */
R3.cloneRig = (src) => {
  const cl = src.clone(true); const a = [], b = []; src.traverse(n => a.push(n)); cl.traverse(n => b.push(n)); const map = new Map(a.map((n, i) => [n, b[i]]));
  a.forEach((n, i) => { if (!n.isSkinnedMesh || !n.skeleton) return; const c = b[i]; c.skeleton = n.skeleton.clone(); c.bindMatrix.copy(n.bindMatrix); c.skeleton.bones = n.skeleton.bones.map(x => map.get(x) || x); c.bind(c.skeleton, c.bindMatrix); });
  return cl;
};
/* bounding box of what is drawn: follows skinning (three r147 measures skinned meshes in their bind pose: seatedrow came
   out 3.7 m tall), morph targets (the long pull cable's base shape reaches 0.3 m past the machine) and measures turned parts
   by their vertices (the box around a turned part's own box is too big: the feet hung on a bone in the plate-loaded shoulder
   press came out 19 cm too wide, so the machine was shrunk 12 % to fit) */
R3.box = (obj) => {
  obj.updateMatrixWorld(true); const box = new THREE.Box3(), v = new THREE.Vector3(), t = new THREE.Vector3(), b0 = new THREE.Vector3();
  obj.traverse(n => {
    if (!n.isMesh || !n.geometry || !n.geometry.attributes.position) return;
    const g = n.geometry, mp = g.morphAttributes && g.morphAttributes.position, mi = mp && mp.length && n.morphTargetInfluences && n.morphTargetInfluences.some(w => w) ? n.morphTargetInfluences : null;
    const e = n.matrixWorld.elements, aligned = [0, 4, 8].every(c => [0, 1, 2].filter(r => Math.abs(e[c + r]) > 1e-6).length <= 1);
    if (!n.isSkinnedMesh && !mi && aligned) { if (!g.boundingBox) g.computeBoundingBox(); box.union(g.boundingBox.clone().applyMatrix4(n.matrixWorld)); return; }
    const pos = g.attributes.position, step = Math.max(1, Math.floor(pos.count / 4000));
    for (let i = 0; i < pos.count; i += step) {
      v.fromBufferAttribute(pos, i);
      if (mi) { b0.copy(v); for (let k = 0; k < mp.length; k++) { if (!mi[k]) continue; t.fromBufferAttribute(mp[k], i); if (!g.morphTargetsRelative) t.sub(b0); v.addScaledVector(t, mi[k]); } }
      if (n.isSkinnedMesh) n.boneTransform(i, v);
      box.expandByPoint(v.applyMatrix4(n.matrixWorld));
    }
  });
  return box;
};
/* place a GLB inside an item's footprint: plan orientation from the manifest, bottom on the floor, uniform scale that fits w × d */
R3.fitGlb = (type, scene, dm, basic) => {
  const holder = new THREE.Group(), inner = new THREE.Group(); const m = R3.cloneRig(scene); inner.add(m);
  const bb = R3.box(m), c = bb.getCenter(new THREE.Vector3()); m.position.set(-c.x, -bb.min.y, -c.z);
  const reg = !basic && GP.media && GP.media.model(type); const rot = reg ? (reg.rot || 0) : 0; inner.rotation.y = rot * Math.PI / 180; holder.add(inner); holder.updateMatrixWorld(true);
  const b2 = R3.box(holder), s2 = b2.getSize(new THREE.Vector3()); const k = Math.min(dm.w / Math.max(s2.x, 1e-3), dm.d / Math.max(s2.z, 1e-3)); holder.scale.setScalar(k);
  return holder;
};

/* ---------------- off-screen renderer (plan pictures & thumbnails for items without a pre-rendered image) ---------------- */
let OR = null;
function offscreen() {
  if (OR) return OR; R3.init();
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); r.outputEncoding = THREE.sRGBEncoding; r.toneMapping = THREE.ACESFilmicToneMapping; r.setPixelRatio(1);
  const sc = new THREE.Scene(); sc.add(new THREE.HemisphereLight(0xffffff, 0x8a9096, .75)); const dl = new THREE.DirectionalLight(0xffffff, 1.2); dl.position.set(2, 8, 4); sc.add(dl);
  const pm = new THREE.PMREMGenerator(r); const env = new THREE.Scene(); env.add(new THREE.Mesh(new THREE.BoxGeometry(12, 6, 12), new THREE.MeshBasicMaterial({ color: '#7d8388', side: THREE.BackSide }))); const lm = new THREE.Mesh(new THREE.BoxGeometry(7, .1, 7), new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff').multiplyScalar(3) })); lm.position.y = 2.9; env.add(lm); sc.environment = pm.fromScene(env, .04).texture; pm.dispose();
  OR = { r, sc }; return OR;
}
const topCache = new Map();
/* top view of an item (procedural model) → { canvas, ext:[x0/w, x1/w, z0/d, z1/d] } */
/* line version for the CAD style: white faces, black feature edges, dark silhouette */
const WHITE = () => R3._white || (R3._white = new THREE.MeshBasicMaterial({ color: '#ffffff', polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }));
const BLACK = () => R3._black || (R3._black = new THREE.LineBasicMaterial({ color: '#1b1f23' }));
R3.lineify = (obj, keepMaterials) => {
  obj.updateMatrixWorld(true); const g = new THREE.Group();
  obj.traverse(n => { if (!n.isMesh || !n.geometry) return; const e = n.geometry.userData.edges30 || (n.geometry.userData.edges30 = new THREE.EdgesGeometry(n.geometry, 30)); const m = new THREE.Mesh(n.geometry, keepMaterials || WHITE()), l = new THREE.LineSegments(e, BLACK()); [m, l].forEach(o => { o.matrixAutoUpdate = false; o.matrix.copy(n.matrixWorld); g.add(o); }); });
  return g;
};
function outline(c) {
  const W = c.width, H = c.height, x = c.getContext('2d'), d = x.getImageData(0, 0, W, H), a = d.data, o = new Uint8ClampedArray(a); const A = (i, j) => (i < 0 || j < 0 || i >= W || j >= H) ? 0 : a[(j * W + i) * 4 + 3];
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const k = (j * W + i) * 4; if (a[k + 3] < 40) continue; if (A(i - 1, j) < 40 || A(i + 1, j) < 40 || A(i, j - 1) < 40 || A(i, j + 1) < 40) { o[k] = o[k + 1] = o[k + 2] = 27; o[k + 3] = 255; } }
  x.putImageData(new ImageData(o, W, H), 0, 0);
}
R3.topView = (it, defOverride, line) => {
  if (!R3.ok) return null; const sig = defOverride ? null : R3.sig(it) + (line ? '|L' : ''); if (sig && topCache.has(sig)) return topCache.get(sig);
  let res = null;
  try {
    const { r, sc } = offscreen(); const d = defOverride ? { w: 1, d: 1, h: 1 } : GP.dims(it); let obj = R3.procModel(it, defOverride); obj.updateMatrixWorld(true);
    const bb = new THREE.Box3().setFromObject(obj); const x0 = Math.min(bb.min.x, -d.w / 2), x1 = Math.max(bb.max.x, d.w / 2), z0 = Math.min(bb.min.z, -d.d / 2), z1 = Math.max(bb.max.z, d.d / 2);
    if (line) obj = R3.lineify(obj);
    const ppm = line ? 120 : 150; let W = Math.round((x1 - x0) * ppm), H = Math.round((z1 - z0) * ppm); const k = Math.min(1, 512 / Math.max(W, H, 1)); W = Math.max(8, Math.round(W * k)); H = Math.max(8, Math.round(H * k));
    const cam = new THREE.OrthographicCamera(x0, x1, -z0, -z1, .1, 60); cam.up.set(0, 0, -1); cam.position.set(0, 30, 0); cam.lookAt(0, 0, 0); cam.updateProjectionMatrix();
    const tm = r.toneMapping; if (line) r.toneMapping = THREE.NoToneMapping; r.setSize(W, H, false); r.setClearColor(0x000000, 0); sc.add(obj); r.render(sc, cam); sc.remove(obj); r.toneMapping = tm;
    const c = document.createElement('canvas'); c.width = W; c.height = H; c.getContext('2d').drawImage(r.domElement, 0, 0); if (line) outline(c);
    res = { canvas: c, ext: [x0 / d.w, x1 / d.w, z0 / d.d, z1 / d.d] };
  } catch (e) { console.warn('topView', it.type, e); }
  if (sig) { topCache.set(sig, res); if (topCache.size > 400) topCache.delete(topCache.keys().next().value); }
  return res;
};
const thumbCache = new Map();
R3.thumb = (type) => {
  if (!R3.ok) return ''; const key = type + '|' + JSON.stringify((GP.lib.customTypes[type] || {}).parts || ''); if (thumbCache.has(key)) return thumbCache.get(key);
  let url = '';
  try {
    const { r, sc } = offscreen(); const obj = R3.procModel({ type, x: 0, z: 0, rot: 0 }); r.setSize(220, 165, false); r.setClearColor(0x000000, 0); sc.add(obj);
    const bx = new THREE.Box3().setFromObject(obj), sph = bx.getBoundingSphere(new THREE.Sphere()); const cam = new THREE.PerspectiveCamera(28, 4 / 3, .05, 300); const dir = new THREE.Vector3(1, .8, 1.5).normalize(); cam.position.copy(sph.center).addScaledVector(dir, sph.radius / Math.sin(14 * Math.PI / 180) * 1.02); cam.lookAt(sph.center);
    r.render(sc, cam); sc.remove(obj); url = r.domElement.toDataURL('image/png');
  } catch (e) { console.warn('thumb', type, e); }
  thumbCache.set(key, url); return url;
};
R3.clear = () => { procCache.clear(); topCache.clear(); thumbCache.clear(); };
})();
