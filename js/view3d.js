/* GoFit Planner — 3D view of the whole space: walls, doors, partitions, rubber floor & trims, equipment (generic 3D models / registered files) */
(function () {
'use strict';
const GP = window.GP, U = GP.U, G = GP.G, $ = U.$;
const V3 = GP.V3 = { on: false, cut: false };
const DEG = U.DEG, WALL_T = .2;
let R = null, sc, cam, ctl, groups, dirty = true, raf = 0, matCache = {};

/* ---------------- setup ---------------- */
function canvasTex(size, draw, rep) { const c = document.createElement('canvas'); c.width = c.height = size; draw(c.getContext('2d'), size); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.encoding = THREE.sRGBEncoding; t.anisotropy = 8; if (rep) t.repeat.set(rep, rep); return t; }
function rng(seed) { return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }
V3.init = () => {
  if (R) return true; if (!GP.R3.init()) return false;
  const cv = $('#c3'); R = new THREE.WebGLRenderer({ canvas: cv, antialias: true, preserveDrawingBuffer: true });
  R.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); R.outputEncoding = THREE.sRGBEncoding; R.toneMapping = THREE.ACESFilmicToneMapping; R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap;
  sc = new THREE.Scene(); sc.background = new THREE.Color('#E6E9E6');
  cam = new THREE.PerspectiveCamera(40, 1, .05, 600);
  sc.add(new THREE.HemisphereLight(0xffffff, 0x8d9399, .55));
  const dl = V3.dir = new THREE.DirectionalLight(0xffffff, 1.1); dl.castShadow = true; dl.shadow.mapSize.set(2048, 2048); dl.shadow.bias = -.0004; dl.shadow.normalBias = .025; sc.add(dl, dl.target);
  const pm = new THREE.PMREMGenerator(R); const env = new THREE.Scene(); const eg = new THREE.BoxGeometry(1, 1, 1);
  env.add(new THREE.Mesh(new THREE.BoxGeometry(12, 6, 12), new THREE.MeshBasicMaterial({ color: '#7d8388', side: THREE.BackSide })));
  [[0, 2.9, 0, 7, .1, 7, 3.2], [5.9, 1.6, 0, .1, 2, 5, 1.8], [-5.9, 1.6, 0, .1, 2, 5, 1.4], [0, 1.6, 5.9, 5, 2, .1, 1.2]].forEach(([x, y, z, w, h, d, i]) => { const m = new THREE.Mesh(eg, new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffffff').multiplyScalar(i) })); m.position.set(x, y, z); m.scale.set(w, h, d); env.add(m); });
  sc.environment = pm.fromScene(env, .04).texture; pm.dispose();
  groups = {}; ['room', 'mats', 'items'].forEach(k => { groups[k] = new THREE.Group(); sc.add(groups[k]); });
  ctl = new THREE.OrbitControls(cam, cv); ctl.enableDamping = true; ctl.dampingFactor = .12; ctl.maxPolarAngle = 1.5; ctl.minDistance = 1; ctl.maxDistance = 250; ctl.screenSpacePanning = false;
  ctl.addEventListener('change', () => { dirty = true; GP.tip.hide(); });
  const T = V3.tex = {};
  T.concrete = canvasTex(256, (x, s) => { const Rn = rng(11); x.fillStyle = '#b9bbb8'; x.fillRect(0, 0, s, s); for (let i = 0; i < 700; i++) { const v = Rn() < .5 ? 255 : 40; x.fillStyle = `rgba(${v},${v},${v},.04)`; x.beginPath(); x.arc(Rn() * s, Rn() * s, 3 + Rn() * 16, 0, 7); x.fill(); } }, 1 / 3);
  new ResizeObserver(() => V3.resize()).observe($('#stage'));
  cv.addEventListener('pointermove', onMove); cv.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY }; }); cv.addEventListener('pointerup', onUp); cv.addEventListener('dblclick', e => { const uid = pick(e), it = uid && GP.findItem(uid); if (it) GP.M3.open(it); }); cv.addEventListener('pointerleave', () => { setHover(null); GP.tip.hide(); });
  GP.on('changed', () => { if (V3.on) V3.rebuild(); });
  GP.on('selection', () => { if (V3.on) markSel(); });
  return true;
};
V3.resize = () => { if (!R) return; const r = $('#stage').getBoundingClientRect(); R.setSize(Math.max(1, r.width), Math.max(1, r.height), false); cam.aspect = r.width / Math.max(1, r.height); cam.updateProjectionMatrix(); dirty = true; };
V3.invalidate = () => { dirty = true; };
V3.camera = () => cam;
function loop() { raf = requestAnimationFrame(loop); if (ctl.update()) dirty = true; if (!dirty) return; dirty = false; wallFade(); R.render(sc, cam); }

/* ---------------- show / hide ---------------- */
V3.show = (on) => {
  if (on && !V3.init()) { GP.toast('이 기기에서는 3D를 켤 수 없어요 (그래픽 가속이 꺼져 있어요)', { bad: true }); return false; }
  V3.on = on; $('#app').classList.toggle('v3', on); $('#c3').hidden = !on; GP.tip.hide();
  document.querySelectorAll('#viewSeg button').forEach(b => b.classList.toggle('on', b.dataset.v === (on ? '3d' : '2d')));
  if (on) { V3.resize(); V3.rebuild(); if (!V3.fitted) { V3.view('persp'); V3.fitted = true; } cancelAnimationFrame(raf); loop(); renderBar(); overlayMaybe(); }
  else { overlay(false); cancelAnimationFrame(raf); GP.S.invalidate(); GP.emit('overlay'); }
  return true;
};
function renderBar() {
  const b = $('#v3bar'); if (!b) return;
  b.innerHTML = `<button class="tg${V3.cut ? ' on' : ''}" data-v3="cut"><i></i>벽 낮추기</button><span class="v3sep"></span><button class="btn xs" data-v3="persp">비스듬히</button><button class="btn xs" data-v3="top">위에서</button><button class="btn xs" data-v3="front">정면</button>${GP.viewOnly ? '' : `<button class="btn xs" data-v3="shot">${GP.IC.image} 이미지 저장</button>`}<span class="v3load" id="v3load"></span>`;
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-v3]'); if (!b) return; const a = b.dataset.v3;
  if (a === 'cut') { V3.cut = !V3.cut; V3.rebuild(); renderBar(); }
  else if (a === 'shot') GP.exp.image3dDialog();
  else V3.view(a);
});
$('#viewSeg') && $('#viewSeg').addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (!b) return; V3.show(b.dataset.v === '3d'); });

/* ---------------- camera ---------------- */
V3.presets = () => {
  const b = G.bounds(GP.L().room.pts), size = Math.max(b.sx, b.sz, 4), a = cam ? cam.aspect : 1.6;
  const half = Math.max(Math.hypot(b.sx, b.sz), 4) / 2, vf = 40 * DEG / 2, hf = Math.atan(Math.tan(vf) * a), dist = half / Math.tan(Math.min(vf, hf)) * .88;
  const off = (x, y, z) => { const v = new THREE.Vector3(x, y, z).normalize().multiplyScalar(dist); return [b.cx + v.x, v.y, b.cz + v.z]; };
  return { persp: { pos: off(-.42, .8, .9), target: [b.cx, 0, b.cz] }, persp2: { pos: off(.55, .7, -.8), target: [b.cx, .3, b.cz] }, top: { pos: [b.cx, size * 1.35 / Math.max(.8, Math.min(a, 1.6)) + 2, b.cz + .01], target: [b.cx, 0, b.cz] }, front: { pos: off(0, .35, 1), target: [b.cx, .6, b.cz] } };
};
V3.view = (k) => { if (!R) return; const p = V3.presets()[k] || V3.presets().persp; cam.position.set(...p.pos); ctl.target.set(...p.target); ctl.update(); dirty = true; };
V3.zoomBy = (f) => { if (!R) return; const off = cam.position.clone().sub(ctl.target); off.setLength(U.clamp(off.length() / f, ctl.minDistance, ctl.maxDistance)); cam.position.copy(ctl.target).add(off); ctl.update(); dirty = true; };

/* ---------------- geometry helpers ---------------- */
const V2 = (p) => new THREE.Vector2(p[0], -p[1]);
function prismGeo(quad, y0, y1) { const g = new THREE.ExtrudeGeometry(new THREE.Shape(quad.map(V2)), { depth: Math.max(.001, y1 - y0), bevelEnabled: false }); g.rotateX(-Math.PI / 2); g.translate(0, y0, 0); return g; }
function clear(g) { for (const ch of [...g.children]) { g.remove(ch); ch.traverse(o => { if (o.geometry && o.userData.own) o.geometry.dispose(); }); } }
function mat(key, f) { return matCache[key] || (matCache[key] = f()); }
const std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: .8 }, o || {}));
/* line (CAD) style: white faces + black feature edges */
let LINE = false;
const CADM = () => mat('cadm', () => new THREE.MeshLambertMaterial({ color: '#ffffff', polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }));
const CADL = () => mat('cadl', () => new THREE.LineBasicMaterial({ color: '#1b1f23' }));
function edgesOf(geo) { return geo.userData.edges30 || (geo.userData.edges30 = new THREE.EdgesGeometry(geo, 30)); }
function addEdges(mesh) { const l = new THREE.LineSegments(edgesOf(mesh.geometry), CADL()); l.raycast = () => { }; mesh.add(l); return mesh; }
function toLine(obj, keepMat) { const ms = []; obj.traverse(n => { if (n.isMesh) ms.push(n); }); ms.forEach(n => { if (!keepMat) n.material = CADM(); n.castShadow = false; addEdges(n); }); return obj; }

/* ---------------- build ---------------- */
V3.rebuild = () => { if (!R || !GP.P) return; LINE = GP.S.style === 'line'; sc.background.set(LINE ? '#F7F8F7' : '#E6E9E6'); V3.dir.castShadow = !LINE; buildRoom(); buildMats(); buildItems(); markSel(); dirty = true; };
let wallMeshes = [];
function buildRoom() {
  const g = groups.room; clear(g); wallMeshes = [];
  const L = GP.L(), st = GP.P.settings, P = L.room.pts; if (P.length < 3) return;
  const fg = new THREE.ShapeGeometry(new THREE.Shape(P.map(V2))); fg.rotateX(-Math.PI / 2); const floor = new THREE.Mesh(fg, LINE ? CADM() : mat('floor', () => std('#ffffff', { map: V3.tex.concrete, roughness: .85 }))); floor.receiveShadow = true; floor.position.y = -.001; floor.userData.own = true; g.add(floor);
  const H = V3.cut ? Math.min(1.1, st.wallH) : st.wallH, O = G.offset(P, WALL_T, true), n = P.length, marks = L.wallMarks || {};
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n, a = P[i], b = P[j], Ls = G.len(a, b); if (Ls < 1e-3) continue;
    const e = G.edge(P, i), ops = L.openings.filter(o => o.host === 'room' && o.seg === i);
    const wm = LINE ? new THREE.MeshLambertMaterial({ color: '#ffffff', transparent: true, opacity: 1, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }) : std(st.wallColor || '#eeede8', { roughness: .92, transparent: true, opacity: 1 });
    const inner = s => [a[0] + e.dx * s, a[1] + e.dz * s], outer = s => s <= 1e-6 ? O[i] : s >= Ls - 1e-6 ? O[j] : [a[0] + e.dx * s - e.nx * WALL_T, a[1] + e.dz * s - e.nz * WALL_T];
    for (const [s0, s1, y0, y1] of pieces(Ls, H, ops)) { const me = new THREE.Mesh(prismGeo([inner(s0), inner(s1), outer(s1), outer(s0)], y0, y1), wm); me.castShadow = true; me.receiveShadow = true; me.userData.own = true; if (LINE) addEdges(me); g.add(me); }
    if (marks[i] === 'mirror') for (const [s0, s1, y0] of pieces(Ls, H, ops)) { if (y0 > 0 || s1 - s0 < .2) continue; const mh = Math.min(2.1, H - .15); if (mh < .3) continue; const w = s1 - s0 - .1, c = (s0 + s1) / 2; const pl = new THREE.Mesh(new THREE.PlaneGeometry(w, mh - .1), mat('mirror', () => std('#dfe7ee', { metalness: 1, roughness: .04 }))); pl.position.set(a[0] + e.dx * c + e.nx * .012, .1 + (mh - .1) / 2, a[1] + e.dz * c + e.nz * .012); pl.rotation.y = Math.atan2(e.nx, e.nz); pl.userData.own = true; if (LINE) toLine(pl); g.add(pl); }
    wallMeshes.push({ mat: wm, nx: -e.nx, nz: -e.nz });
  }
  const k0 = g.children.length; // everything after the walls: partitions, doors, windows
  // partitions
  for (const p of L.partitions) {
    if (!p.pts || p.pts.length < 2) continue; const t = p.thick || .1, H0 = p.kind === 'half' ? (p.height || 1.2) : (p.height || st.wallH), Hp = V3.cut ? Math.min(1.1, H0) : H0;
    const Lf = G.offset(p.pts, t / 2, false), Rt = G.offset(p.pts, -t / 2, false), glass = p.kind === 'glass';
    const pm = glass ? mat('glass', () => std('#bcd7e6', { transparent: true, opacity: .28, roughness: .05, metalness: .1, depthWrite: false, side: THREE.DoubleSide })) : std(p.color || st.wallColor || '#eeede8', { roughness: .92 });
    for (let i = 0; i < p.pts.length - 1; i++) {
      const a = p.pts[i], b = p.pts[i + 1], s = G.segInfo(a, b), ops = L.openings.filter(o => o.host === p.id && o.seg === i), nlx = -s.dz, nlz = s.dx;
      const lf = u => u <= 1e-6 ? Lf[i] : u >= s.L - 1e-6 ? Lf[i + 1] : [a[0] + s.dx * u + nlx * t / 2, a[1] + s.dz * u + nlz * t / 2];
      const rt = u => u <= 1e-6 ? Rt[i] : u >= s.L - 1e-6 ? Rt[i + 1] : [a[0] + s.dx * u - nlx * t / 2, a[1] + s.dz * u - nlz * t / 2];
      for (const [s0, s1, y0, y1] of pieces(s.L, Hp, ops)) { const q = [lf(s0), lf(s1), rt(s1), rt(s0)]; const me = new THREE.Mesh(prismGeo(q, y0, y1), pm); me.castShadow = !glass; me.receiveShadow = true; me.userData.own = true; g.add(me); if (glass) [[y0, .05], [y1 - .05, .05]].forEach(([yy, hh]) => { const f = new THREE.Mesh(prismGeo(q, yy, yy + hh), mat('alu', () => std('#c6cacf', { metalness: .8, roughness: .3 }))); f.userData.own = true; g.add(f); }); }
    }
  }
  buildOpenings(g, H);
  if (LINE) g.children.slice(k0).forEach(ch => toLine(ch));
  // light & shadow frame
  const bb = G.bounds(P), size = Math.max(bb.sx, bb.sz, 4), Rr = size * .78 + 3;
  V3.dir.position.set(bb.cx + size * .35, size * .9 + 8, bb.cz + size * .25); V3.dir.target.position.set(bb.cx, 0, bb.cz);
  const c = V3.dir.shadow.camera; c.left = -Rr; c.right = Rr; c.top = Rr; c.bottom = -Rr; c.near = .5; c.far = size * 3 + 50; c.updateProjectionMatrix();
}
/* solid wall pieces [s0, s1, y0, y1] of a wall of length Ls with openings (lintels and sills kept) */
function pieces(Ls, H, ops) {
  const out = []; const list = ops.map(o => { const w = Math.min(o.w, Ls - .02); const c = U.clamp(o.t, w / 2, Ls - w / 2); return { s0: c - w / 2, s1: c + w / 2, o }; }).sort((x, y) => x.s0 - y.s0);
  let cur = 0;
  for (const q of list) {
    if (q.s0 > cur + 1e-4) out.push([cur, q.s0, 0, H]); const s0 = Math.max(cur, q.s0), o = q.o;
    const win = o.kind === 'window', sill = win ? (o.sill ?? .9) : 0, head = Math.min(H, win ? sill + (o.h ?? 1.2) : (o.h ?? 2.1));
    if (sill > 0) out.push([s0, q.s1, 0, Math.min(sill, H)]); if (head < H - 1e-3) out.push([s0, q.s1, head, H]); cur = Math.max(cur, q.s1);
  }
  if (cur < Ls - 1e-4) out.push([cur, Ls, 0, H]); return out;
}
function buildOpenings(g, H) {
  const L = GP.L(), alu = mat('alu', () => std('#c6cacf', { metalness: .8, roughness: .3 })), glassM = mat('glass', () => std('#bcd7e6', { transparent: true, opacity: .28, roughness: .05, metalness: .1, depthWrite: false, side: THREE.DoubleSide })), doorM = mat('door', () => std('#d9d4c8', { roughness: .6 }));
  const box = (w, h, d, m, x, y, z, parent) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = true; b.userData.own = true; parent.add(b); return b; };
  for (const o of L.openings) {
    const hs = GP.hostSeg(o); if (!hs) continue; const sp = GP.openingSpan(o, hs), w = sp.w, c = sp.c;
    const og = new THREE.Group(); og.position.set(hs.a[0] + hs.dx * c + hs.nx * hs.mid, 0, hs.a[1] + hs.dz * c + hs.nz * hs.mid);
    og.rotation.y = Math.atan2(-hs.dz, hs.dx); g.add(og); // local x = along the wall, local z = (-dz, dx)
    const T = hs.thick, hinge = o.hinge === 'R' ? 1 : -1, zf = (o.flip ? -1 : 1) * ((-hs.dz * hs.nx + hs.dx * hs.nz) >= 0 ? 1 : -1);
    if (o.kind === 'window') { const sill = o.sill ?? .9, hh = Math.min(o.h ?? 1.2, H - sill); if (hh <= .05) continue; box(w - .06, hh - .06, .012, glassM, 0, sill + hh / 2, 0, og); [[sill + .02], [sill + hh - .02]].forEach(([y]) => box(w, .04, .07, alu, 0, y, 0, og)); [-w / 2 + .02, w / 2 - .02, 0].forEach(x => box(.04, hh, .07, alu, x, sill + hh / 2, 0, og)); continue; }
    if (o.kind === 'opening') continue;
    const dh = Math.min(o.h ?? 2.1, H - .05); if (dh <= .1) continue;
    box(.06, dh, T + .01, alu, -w / 2 + .03, dh / 2, 0, og); box(.06, dh, T + .01, alu, w / 2 - .03, dh / 2, 0, og); box(w, .06, T + .01, alu, 0, dh - .03, 0, og);
    const dbl = o.kind === 'door2' || o.kind === 'glass2', glass = o.kind === 'glass2';
    const leaves = dbl ? [-1, 1] : [hinge];
    leaves.forEach(sgn => {
      const lw = dbl ? w / 2 - .06 : w - .12, x = dbl ? sgn * (w / 4 - .01) : (o.kind === 'slide' ? -w * .05 : 0);
      const leaf = box(lw, dh - .08, .04, glass ? glassM : doorM, x, (dh - .08) / 2, zf * (T / 2 - .03), og); leaf.castShadow = !glass;
      const hx = dbl ? sgn * (w / 4 - lw / 2 + .08) : -hinge * (lw / 2 - .08); const hd = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, glass ? .8 : .14, 10), alu); hd.position.set(hx, 1.0, zf * (T / 2 - .03) + zf * .04); hd.userData.own = true; og.add(hd);
    });
  }
}
/* rubber mats (500×500 texture) and 25T sloped trims along exposed edges */
const blockTex = {};
function blockMat(k) {
  if (blockTex[k]) return blockTex[k];
  // real-life colours (the plan uses lighter tones so equipment stays readable)
  const LOOK = { basic: ['#3a3f3c', ['#454b47', '#2e3230', '#566059', '#262a28'], 1800], coat: ['#18181a', ['#d9dadb', '#8d9195', '#232326'], 700], arena: ['#c48a55', ['#cf9660', '#b87e4b', '#d9a26d', '#ad7442'], 1500], topblack: ['#2b2c2e', ['#333437', '#252628'], 600], stone: ['#4f5153', ['#6b6d70', '#3a3c3e', '#8b8e91', '#2e3032', '#a7aaad'], 2000] }[k] || ['#18181a', ['#d9dadb'], 700];
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'); const Rn = rng(k.length * 97 + 13); x.fillStyle = LOOK[0]; x.fillRect(0, 0, 256, 256); for (let i = 0; i < LOOK[2]; i++) { x.fillStyle = LOOK[1][(Rn() * LOOK[1].length) | 0]; x.beginPath(); x.arc(Rn() * 256, Rn() * 256, .6 + Rn() * 1.2, 0, 7); x.fill(); } x.strokeStyle = 'rgba(0,0,0,.6)'; x.lineWidth = 2; x.strokeRect(1, 1, 254, 254);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.encoding = THREE.sRGBEncoding; t.anisotropy = 8; t.repeat.set(2, 2);
  return (blockTex[k] = std('#ffffff', { map: t, roughness: k === 'topblack' ? .6 : .9 }));
}
function cadBlockMat() {
  return mat('cadBlock', () => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.fillStyle = '#ffffff'; x.fillRect(0, 0, 128, 128); x.strokeStyle = '#9aa0a6'; x.lineWidth = 2; x.strokeRect(1, 1, 126, 126); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.encoding = THREE.sRGBEncoding; t.anisotropy = 8; t.repeat.set(2, 2); return new THREE.MeshLambertMaterial({ map: t, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }); });
}
function buildMats() {
  const g = groups.mats; clear(g); const L = GP.L(), th = .025, sw = GP.TRIM_W || .06;
  for (const m of L.mats) {
    if (m.pts.length < 3) continue; const me = new THREE.Mesh(prismGeo(m.pts, 0, th), LINE ? cadBlockMat() : blockMat(m.block)); me.receiveShadow = true; me.userData.own = true; me.userData.mat = m.id; if (LINE) addEdges(me); g.add(me);
    if (!m.trim || m.trim === 'none') continue;
    const tm = m.trim === 'alu' ? mat('trimAlu', () => std('#c8ccd1', { metalness: .85, roughness: .28, side: THREE.DoubleSide })) : mat('trimRub', () => std('#1b1c1e', { roughness: .9, side: THREE.DoubleSide }));
    for (const ch of GP.calc.matTrims(m).chains) {
      const top = ch.pts, foot = GP.S.offsetChain(ch.pts, ch.normals, sw, ch.closed), pos = [], nP = top.length;
      const push = (p, y) => pos.push(p[0], y, p[1]);
      const segs = ch.closed ? nP : nP - 1;
      for (let i = 0; i < segs; i++) { const i2 = (i + 1) % nP; push(top[i], th); push(foot[i], 0); push(top[i2], th); push(top[i2], th); push(foot[i], 0); push(foot[i2], 0); }
      if (!ch.closed) [[0], [nP - 1]].forEach(([i]) => { push(top[i], th); push(foot[i], 0); push(top[i], 0); });
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.computeVertexNormals();
      const w = new THREE.Mesh(geo, LINE ? CADM() : tm); w.receiveShadow = true; w.castShadow = false; w.userData.own = true; if (LINE) addEdges(w); g.add(w);
    }
  }
}
/* equipment: procedural model first, swapped for the 3D file once it has loaded — the user's registered file, else the generic model (models/basic) */
const roots = new Map(); let loading = 0, loadTotal = 0, loadDone = 0;
function onMatAt(x, z) { for (const m of GP.L().mats) if (m.pts.length > 2 && G.pip(x, z, m.pts)) return .025; return 0; }
function buildItems() {
  const g = groups.items; clear(g); roots.clear(); const L = GP.L(); const want = {};
  for (const it of L.items) {
    const def = GP.getDef(it.type); if (!def) continue; const dm = GP.dims(it), mount = GP.mountOf(it);
    const root = new THREE.Group(); root.userData.uid = it.uid; root.userData.dm = dm;
    const y = GP.itemY(it) + (mount === 'floor' && !def.flat ? onMatAt(it.x, it.z) : 0); root.position.set(it.x, y, it.z); root.rotation.y = -it.rot * DEG;
    const proc = GP.R3.procModel(it); if (LINE) toLine(proc); root.add(proc); g.add(root); roots.set(it.uid, root);
    const src = modelSrc(it.type, def); if (src) (want[it.type + '|' + src] = want[it.type + '|' + src] || []).push({ it, root, proc, dm });
  }
  const keys = Object.keys(want); loadTotal = keys.length; loadDone = 0; loading = keys.length; setLoad();
  keys.forEach(k => { const [t, src] = k.split('|'), b = src === 'basic'; GP.R3.glb(t, null, b).then(scene => { for (const q of want[k]) { if (roots.get(q.it.uid) !== q.root) continue; q.root.remove(q.proc); const gm = GP.R3.fitGlb(t, scene, q.dm, b); if (LINE) toLine(gm); q.root.add(gm); } dirty = true; }).catch(() => { }).finally(() => { loading--; loadDone++; setLoad(); }); });
}
/* which 3D file an item shows: 'reg' (the user's registered file), 'basic' (generic model) or null (procedural only) */
function modelSrc(t, def) {
  def = def || GP.getDef(t) || {}; if (GP.media.model(t)) return 'reg';
  if (def.params) return null;
  return GP.R3.hasBasic(t) ? 'basic' : null;
}
function setLoad() {
  const el = $('#v3load'); if (el) el.textContent = loading > 0 ? `3D 모델 불러오는 중… ${loadDone}/${loadTotal}` : '';
  const ov = $('#v3ov'); if (ov && !ov.hidden) { $('#v3ovTxt').textContent = `3D 모델 불러오는 중… ${loadDone} / ${loadTotal}`; $('#v3ovBar').style.width = (loadTotal ? loadDone / loadTotal * 100 : 100) + '%'; if (loading <= 0) finishOverlay(); }
}
/* dimmed loading screen: shown only if the models take a moment, and kept until shaders are compiled so the scene appears without a hitch */
let ovT = 0;
function overlay(on) { const ov = $('#v3ov'); if (!ov) return; clearTimeout(ovT); ov.hidden = !on; if (on) setLoad(); }
V3.overlay = (on) => overlay(on);
function overlayMaybe() { clearTimeout(ovT); if (loading > 0) ovT = setTimeout(() => { if (V3.on && loading > 0) overlay(true); }, 250); }
function finishOverlay() { try { R.compile(sc, cam); } catch (e) { } dirty = true; setTimeout(() => overlay(false), 120); }
/* preload the 3D files used in this layout in the background, one by one, so opening 3D is instant */
let pfQ = [], pfRun = false;
V3.prefetch = () => {
  if (!GP.R3.ok || !GP.P) return; const q = []; for (const t of new Set(GP.L().items.map(i => i.type))) { const s = modelSrc(t); if (s) q.push([t, s === 'basic']); }
  pfQ = q; if (!pfRun) pump(q.length);
};
async function pump(total) {
  pfRun = true; const chip = $('#pfChip'); let n = 0;
  while (pfQ.length) { const [t, b] = pfQ.shift(); n++; if (chip && !b) { chip.hidden = false; chip.textContent = `3D 미리 준비 중 ${n}/${Math.max(total, n)}`; } try { await GP.R3.glb(t, null, b); } catch (e) { } await new Promise(r => (window.requestIdleCallback || setTimeout)(r, { timeout: 400 })); }
  pfRun = false; if (chip) chip.hidden = true;
}
GP.on('booted', () => GP.SYM.ready.then(() => setTimeout(V3.prefetch, 1500))); // start after the plan pictures, so the first screen stays quick
GP.on('changed', U.debounce(() => V3.prefetch(), 1500));
GP.on('project', () => setTimeout(V3.prefetch, 800));
V3.whenLoaded = (ms) => new Promise(res => { const t0 = performance.now(); const chk = () => { if (loading <= 0 || performance.now() - t0 > (ms || 25000)) res(); else setTimeout(chk, 200); }; chk(); });
function markSel() {
  const sel = GP.ui.selSet(); if (V3.selBox) { sc.remove(V3.selBox); V3.selBox = null; }
  const ids = [...sel].filter(k => k.startsWith('item:')).map(k => k.slice(5)); if (!ids.length) { dirty = true; return; }
  const grp = new THREE.Group(); for (const id of ids) { const r = roots.get(id); if (!r) continue; const dm = r.userData.dm; const bx = new THREE.Box3(new THREE.Vector3(-dm.w / 2, 0, -dm.d / 2), new THREE.Vector3(dm.w / 2, dm.h, dm.d / 2)); const h = new THREE.Box3Helper(bx, new THREE.Color('#2450E0')); h.position.copy(r.position); h.rotation.copy(r.rotation); grp.add(h); }
  V3.selBox = grp; sc.add(grp); dirty = true;
}
function wallFade() {
  if (!GP.P || !wallMeshes.length) return; const b = G.bounds(GP.L().room.pts); let vx = cam.position.x - b.cx, vz = cam.position.z - b.cz; const l = Math.hypot(vx, vz) || 1; vx /= l; vz /= l;
  const high = cam.position.y > Math.max(b.sx, b.sz) * 1.6;
  for (const w of wallMeshes) { const o = (!high && (w.nx * vx + w.nz * vz) > .2) ? .12 : 1; if (w.mat.opacity !== o) { w.mat.opacity = o; w.mat.depthWrite = o === 1; } }
}

/* ---------------- picking (footprint boxes, cheap even with big models) ---------------- */
let down = null, hov = null, lastPick = 0;
function pick(e) {
  const rc = new THREE.Raycaster(), r = R.domElement.getBoundingClientRect(); rc.setFromCamera(new THREE.Vector2((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1), cam);
  let best = null, bd = Infinity; const inv = new THREE.Matrix4(), lr = new THREE.Ray(), hit = new THREE.Vector3();
  for (const [uid, root] of roots) { const dm = root.userData.dm; root.updateMatrixWorld(); inv.copy(root.matrixWorld).invert(); lr.copy(rc.ray).applyMatrix4(inv); const bx = new THREE.Box3(new THREE.Vector3(-dm.w / 2, 0, -dm.d / 2), new THREE.Vector3(dm.w / 2, Math.max(dm.h, .05), dm.d / 2)); if (lr.intersectBox(bx, hit)) { const d = hit.applyMatrix4(root.matrixWorld).distanceTo(rc.ray.origin); if (d < bd) { bd = d; best = uid; } } }
  return best;
}
function setHover(uid) { if (hov === uid) return; hov = uid; R.domElement.style.cursor = uid ? 'pointer' : ''; }
function onMove(e) { if (e.buttons) return; const now = performance.now(); if (now - lastPick < 50) return; lastPick = now; const uid = pick(e); setHover(uid); const it = uid && GP.findItem(uid); if (it) GP.tip.show(e.clientX, e.clientY, GP.info.item(it)); else GP.tip.hide(); }
function onUp(e) {
  if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) { down = null; return; } down = null;
  const uid = pick(e), it = uid && GP.findItem(uid);
  if (GP.viewOnly) { if (it && (GP.R3.hasModel(it.type) || GP.media.photos(it.type).length)) GP.M3.open(it); else if (it) GP.tip.show(e.clientX, e.clientY, GP.info.item(it)); return; }
  if (it) GP.ui.select([{ k: 'item', id: uid }], e.shiftKey); else GP.ui.clearSel();
}

/* ---------------- snapshots for images / PDF ---------------- */
V3.snapshot = async (w, h, preset) => {
  if (!V3.init()) return null; const wasOn = V3.on; if (!wasOn) { V3.rebuild(); }
  await V3.whenLoaded(); const c0 = cam.clone(); const selKeep = V3.selBox; if (selKeep) sc.remove(selKeep);
  const shot = new THREE.PerspectiveCamera(40, w / h, .05, 600);
  if (preset) { const p = V3.presets()[preset]; shot.position.set(...p.pos); shot.lookAt(new THREE.Vector3(...p.target)); } else { shot.position.copy(cam.position); shot.quaternion.copy(cam.quaternion); }
  const pr = R.getPixelRatio(); R.setPixelRatio(1); R.setSize(w, h, false); const keep = cam.position.clone(); cam.position.copy(shot.position); wallFade(); cam.position.copy(keep); R.render(sc, shot);
  const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(R.domElement, 0, 0);
  R.setPixelRatio(pr); V3.resize(); if (selKeep) sc.add(selKeep); dirty = true; void c0; return c;
};
})();
