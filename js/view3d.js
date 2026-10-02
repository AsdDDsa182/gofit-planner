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
  cv.addEventListener('pointerdown', lookDown, true); cv.addEventListener('pointermove', lookMove, true); cv.addEventListener('pointerup', lookUp, true); cv.addEventListener('pointerdown', grab, true); cv.addEventListener('pointermove', onMove); cv.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY }; }); cv.addEventListener('pointerup', onUp); cv.addEventListener('pointercancel', e => { if (mv) endDrag(e); }); cv.addEventListener('dblclick', e => { const uid = pick(e), it = uid && GP.findItem(uid); if (it) GP.M3.open(it); }); cv.addEventListener('pointerleave', () => { setHover(null); GP.tip.hide(); });
  GP.on('changed', () => { if (V3.on) V3.rebuild(); });
  GP.on('selection', () => { if (V3.on) markSel(); });
  GP.on('placing', () => { ghostBuild(); if (R) R.domElement.style.cursor = GP.ui.placing ? 'crosshair' : ''; });
  return true;
};
V3.resize = () => {
  if (!R) return; const r = $('#stage').getBoundingClientRect(); R.setSize(Math.max(1, r.width), Math.max(1, r.height), false); cam.aspect = Math.max(1, r.width) / Math.max(1, r.height); cam.updateProjectionMatrix(); dirty = true;
  if (V3.on && !V3.sized && r.width > 50 && r.height > 50) { V3.sized = true; if (!V3.walking) V3.view('persp'); }   // first real size (opened hidden): frame the room again
};
V3.invalidate = () => { dirty = true; };
V3.camera = () => cam;
function loop() { raf = requestAnimationFrame(loop); if (V3.walking) walkStep(); else if (ctl.update()) dirty = true; if (!dirty) return; dirty = false; wallFade(); R.render(sc, cam); }

/* ---------------- show / hide ---------------- */
V3.show = (on) => {
  if (on && !V3.init()) { GP.toast('이 기기에서는 3D를 켤 수 없어요 (그래픽 가속이 꺼져 있어요)', { bad: true }); return false; }
  V3.on = on; $('#app').classList.toggle('v3', on); $('#c3').hidden = !on; GP.tip.hide();
  document.querySelectorAll('#viewSeg button').forEach(b => b.classList.toggle('on', b.dataset.v === (on ? '3d' : '2d')));
  if (on) { V3.resize(); V3.rebuild(); if (!V3.fitted) { V3.view('persp'); V3.fitted = true; } cancelAnimationFrame(raf); loop(); renderBar(); overlayMaybe(); }
  else { if (V3.walking) V3.walk(false); overlay(false); cancelAnimationFrame(raf); GP.S.invalidate(); GP.emit('overlay'); }
  ghostBuild(); GP.ui.setHint();
  return true;
};
function renderBar() {
  const b = $('#v3bar'); if (!b) return;
  b.innerHTML = `<button class="tg${V3.cut ? ' on' : ''}" data-v3="cut"><i></i>벽 낮추기</button><span class="v3sep"></span><button class="btn xs" data-v3="persp">비스듬히</button><button class="btn xs" data-v3="top">위에서</button><button class="btn xs" data-v3="front">정면</button><button class="btn xs${V3.walking ? ' primary' : ''}" data-v3="walk">${V3.walking ? '걷기 끝' : '걸어보기'}</button>${GP.viewOnly ? '' : `<button class="btn xs" data-v3="shot">${GP.IC.image} 이미지 저장</button>`}<span class="v3load" id="v3load"></span>`;
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-v3]'); if (!b) return; const a = b.dataset.v3;
  if (a === 'cut') { V3.cut = !V3.cut; V3.rebuild(); renderBar(); }
  else if (a === 'walk') V3.walk(!V3.walking);
  else if (a === 'shot') GP.exp.image3dDialog();
  else { if (V3.walking) V3.walk(false); V3.view(a); }
});
$('#viewSeg') && $('#viewSeg').addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (!b) return; V3.show(b.dataset.v === '3d'); });

/* ---------------- camera ---------------- */
V3.presets = () => {
  const b = G.bounds(GP.L().room.pts), size = Math.max(b.sx, b.sz, 4), a = cam && isFinite(cam.aspect) && cam.aspect > .2 ? cam.aspect : 1.6;   // a hidden page has no size yet
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
  if (!GP.P || !wallMeshes.length) return;
  if (V3.walking || solid) { for (const w of wallMeshes) if (w.mat.opacity !== 1) { w.mat.opacity = 1; w.mat.depthWrite = true; } return; } const b = G.bounds(GP.L().room.pts); let vx = cam.position.x - b.cx, vz = cam.position.z - b.cz; const l = Math.hypot(vx, vz) || 1; vx /= l; vz /= l;
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
function onMove(e) {
  last3d = e; if (mv) { dragTo(e); return; }
  if (GP.ui.placing && !GP.viewOnly) { if (!e.buttons) ghostMove(e); return; }
  if (e.buttons) return; const now = performance.now(); if (now - lastPick < 50) return; lastPick = now; const uid = pick(e); setHover(uid); const it = uid && GP.findItem(uid); if (it) GP.tip.show(e.clientX, e.clientY, GP.info.item(it)); else GP.tip.hide(); }
function onUp(e) {
  if (mv && endDrag(e)) { down = null; return; }
  if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) { down = null; return; } down = null;
  if (GP.ui.placing && !GP.viewOnly) { ghostMove(e); GP.tools.placeGhost(e.shiftKey); return; }
  const uid = pick(e), it = uid && GP.findItem(uid);
  if (GP.viewOnly) { if (it && (GP.R3.hasModel(it.type) || GP.media.photos(it.type).length)) GP.M3.open(it); else if (it) GP.tip.show(e.clientX, e.clientY, GP.info.item(it)); return; }
  if (it) GP.ui.select([{ k: 'item', id: uid }], e.shiftKey); else GP.ui.clearSel();
}

/* ---------------- editing in 3D: drag selected equipment along the floor, place from the catalog ---------------- */
const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
let mv = null, last3d = null, ghost = null;
function floorAt(e) {
  const rc = new THREE.Raycaster(), r = R.domElement.getBoundingClientRect(); rc.setFromCamera(new THREE.Vector2((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1), cam);
  const p = new THREE.Vector3(); return rc.ray.intersectPlane(floorPlane, p) ? { x: p.x, z: p.z } : null;
}
/* pressing an already selected item drags it (the first press selects; dragging anywhere else turns the view) */
function grab(e) {
  if (V3.walking || GP.viewOnly || e.button !== 0 || GP.ui.placing || !e.isPrimary) return;
  const uid = pick(e); if (!uid || !GP.ui.selSet().has('item:' + uid)) return;
  const fp = floorAt(e), it = GP.findItem(uid); if (!fp || !it) return;
  const its = GP.ui.selItems();
  mv = { anchor: uid, sx: e.clientX, sy: e.clientY, moved: false, fx: fp.x, fz: fp.z, start: its.map(q => ({ uid: q.uid, x: q.x, z: q.z })), relK: its.length === 1 ? GP.tools.relK(it) : null, ox: it.x - fp.x, oz: it.z - fp.z, id: e.pointerId };
  ctl.enabled = false; R.domElement.style.cursor = 'grabbing'; try { R.domElement.setPointerCapture(e.pointerId); } catch (_) { }
}
function dragTo(e) {
  const d = mv; if (e.pointerId !== d.id) return;
  if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 4) return;
  const fp = floorAt(e); if (!fp) return; d.moved = true; GP.tip.hide();
  GP.tools.moveItems(d, fp, e.altKey);
  for (const s of d.start) { const it = GP.findItem(s.uid), r = roots.get(s.uid); if (it && r) { r.position.x = it.x; r.position.z = it.z; r.rotation.y = -it.rot * DEG; } }
  markSel(); dirty = true;
}
/* returns true when the press was a drag (the click handling is skipped) */
function endDrag(e) {
  const d = mv; mv = null; ctl.enabled = true; R.domElement.style.cursor = hov ? 'pointer' : '';
  if (!d.moved) return false;
  GP.changed('items'); GP.ui.renderInspector(); return true;
}
/* placing ghost: the procedural model, see-through, over a blue (fits) / red (overlaps, outside the room) footprint */
function ghostBuild() {
  if (!R) return; if (ghost) { sc.remove(ghost.g); ghost.g.traverse(n => { if (n.userData.own) { n.geometry.dispose(); [].concat(n.material).forEach(m => m.dispose()); } }); ghost = null; }
  const pl = GP.ui.placing; if (!pl || !V3.on) { dirty = true; return; }
  const g = new THREE.Group(), parts = pl.list.map(q => {
    const r = new THREE.Group(), m = GP.R3.procModel(q.it);
    m.traverse(n => { if (n.isMesh) { n.material = Array.isArray(n.material) ? n.material.map(x => see(x.clone())) : see(n.material.clone()); n.castShadow = false; n.userData.own = true; n.geometry = n.geometry.clone(); } });
    const dm = GP.dims(q.it), fp = new THREE.Mesh(new THREE.PlaneGeometry(dm.w, dm.d), new THREE.MeshBasicMaterial({ color: '#2450E0', transparent: true, opacity: .3, depthWrite: false }));
    fp.rotation.x = -Math.PI / 2; fp.position.y = .03; fp.userData.own = true; r.add(m, fp); r.userData.fp = fp; r.visible = false; g.add(r); return r;
  });
  sc.add(g); ghost = { g, parts }; dirty = true;
  if (last3d) ghostMove(last3d);
}
function see(m) { m.transparent = true; m.opacity = .55; m.depthWrite = false; return m; }
function ghostMove(e) {
  const pl = GP.ui.placing; if (!pl || !ghost) return; const fp = floorAt(e); if (!fp) return;
  GP.tools.ghostAt(fp, e.altKey); const bad = (GP.S.ghost && GP.S.ghost.bad) || [];
  (pl.placed || []).forEach((p, i) => { const r = ghost.parts[i]; if (!r) return; r.visible = true; r.position.set(p.x, GP.itemY(p), p.z); r.rotation.y = -p.rot * DEG; r.userData.fp.material.color.set(bad[i] ? '#e5484d' : '#2450E0'); });
  dirty = true;
}
V3.ghostRefresh = () => { if (last3d) ghostMove(last3d); };

/* ---------------- walk mode: eye height 1.6 m inside the room; keys / drag to look, a joystick on touch screens ---------------- */
const EYE = 1.6, SPEED = 1.4, keys = new Set(); let wk = null, walkHud = null, joy = null, lastT = 0, solid = false;
function walkStart() {
  const L = GP.L(), P = L.room.pts, b = G.bounds(P), door = L.openings.find(o => o.host === 'room' && o.kind !== 'window');
  let x = b.cx, z = b.cz, yaw = 0;
  if (door) { const hs = GP.hostSeg(door), sp = GP.openingSpan(door, hs); x = hs.a[0] + hs.dx * sp.c + hs.nx * 1.0; z = hs.a[1] + hs.dz * sp.c + hs.nz * 1.0; yaw = Math.atan2(-hs.nx, -hs.nz); }
  if (!free(x, z)) { x = b.cx; z = b.cz; for (let r = .5; r < 6 && !free(x, z); r += .5) for (let a = 0; a < 6.28; a += .5) if (free(b.cx + Math.cos(a) * r, b.cz + Math.sin(a) * r)) { x = b.cx + Math.cos(a) * r; z = b.cz + Math.sin(a) * r; break; } }
  return { x, z, yaw, pitch: -.05 };
}
/* a point a person can stand on: inside the room, 25 cm from walls, out of every machine's footprint */
function free(x, z) {
  const L = GP.L(), P = L.room.pts; if (!G.pip(x, z, P)) return false;
  for (let i = 0; i < P.length; i++) if (G.closest(x, z, P[i], P[(i + 1) % P.length]).d < .25) return false;
  for (const p of L.partitions) for (let i = 0; i < p.pts.length - 1; i++) if (G.closest(x, z, p.pts[i], p.pts[i + 1]).d < .2 + (p.thick || .1) / 2 && !L.openings.some(o => o.host === p.id && o.seg === i && o.kind !== 'window' && Math.abs(G.closest(x, z, p.pts[i], p.pts[i + 1]).t - o.t) < o.w / 2)) return false;
  for (const it of L.items) { const d = GP.getDef(it.type) || {}; if (d.flat || d.wall || GP.mountOf(it) !== 'floor') continue; const C = GP.footprint(it); if (G.pip(x, z, C)) return false; for (let i = 0; i < C.length; i++) if (G.closest(x, z, C[i], C[(i + 1) % C.length]).d < .18) return false; }
  return true;
}
function walkStep() {
  const t = performance.now(), dt = Math.min(.05, (t - (lastT || t)) / 1000); lastT = t;
  let f = 0, s = 0; if (keys.has('w') || keys.has('arrowup')) f++; if (keys.has('s') || keys.has('arrowdown')) f--; if (keys.has('a')) s--; if (keys.has('d')) s++;
  if (keys.has('arrowleft')) { wk.yaw += 1.8 * dt; dirty = true; } if (keys.has('arrowright')) { wk.yaw -= 1.8 * dt; dirty = true; }
  if (joy && joy.on) { f += -joy.y; s += joy.x; }
  const len = Math.hypot(f, s); if (len > 0) {
    const sp = SPEED * (keys.has('shift') ? 1.8 : 1) * dt / Math.max(1, len), fx = -Math.sin(wk.yaw), fz = -Math.cos(wk.yaw), rx = Math.cos(wk.yaw), rz = -Math.sin(wk.yaw);
    const dx = (fx * f + rx * s) * sp, dz = (fz * f + rz * s) * sp;
    if (free(wk.x + dx, wk.z + dz)) { wk.x += dx; wk.z += dz; } else if (free(wk.x + dx, wk.z)) wk.x += dx; else if (free(wk.x, wk.z + dz)) wk.z += dz;   // slide along walls and machines
    dirty = true;
  }
  if (dirty) { cam.position.set(wk.x, EYE, wk.z); cam.rotation.set(wk.pitch, wk.yaw, 0, 'YXZ'); }
}
V3.walk = (on) => {
  if (!R) return; V3.walking = !!on; keys.clear();
  if (on) {
    wk = walkStart(); ctl.enabled = false; V3.keepCam = { pos: cam.position.clone(), target: ctl.target.clone(), fov: cam.fov }; cam.fov = 70; cam.updateProjectionMatrix();
    cam.position.set(wk.x, EYE, wk.z); cam.rotation.set(wk.pitch, wk.yaw, 0, 'YXZ'); GP.ui.clearSel && !GP.viewOnly && GP.ui.clearSel();
    const touch = matchMedia('(pointer:coarse)').matches;
    walkHud = document.createElement('div'); walkHud.className = 'walk-hud';
    walkHud.innerHTML = `<span>${touch ? '왼쪽 아래 동그라미를 밀어서 걷고, 화면을 끌어서 둘러봐요' : '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> 또는 방향키로 걷기 · 화면을 끌어서 둘러보기 · <kbd>Shift</kbd> 빨리 · <kbd>Esc</kbd> 끝'}</span>`
      + (touch ? '<div class="walk-joy" id="walkJoy"><i></i></div>' : '');
    $('#stage').appendChild(walkHud); bindJoy();
  } else {
    if (walkHud) { walkHud.remove(); walkHud = null; } joy = null; ctl.enabled = true;
    if (V3.keepCam) { cam.fov = V3.keepCam.fov; cam.updateProjectionMatrix(); cam.position.copy(V3.keepCam.pos); ctl.target.copy(V3.keepCam.target); cam.lookAt(ctl.target); ctl.update(); }
  }
  lastT = 0; dirty = true; renderBar(); GP.ui.setHint();
};
function bindJoy() {
  const el = $('#walkJoy'); if (!el) return; const knob = el.querySelector('i'); joy = { on: false, x: 0, y: 0 };
  const mv = e => { const r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, R0 = r.width / 2; let dx = (e.clientX - cx) / R0, dy = (e.clientY - cy) / R0; const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; } joy.x = dx; joy.y = dy; knob.style.transform = `translate(${dx * R0 * .6}px,${dy * R0 * .6}px)`; };
  el.addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); joy.on = true; try { el.setPointerCapture(e.pointerId); } catch (_) { } mv(e); });
  el.addEventListener('pointermove', e => { if (joy.on) { e.stopPropagation(); mv(e); } });
  const end = e => { joy.on = false; joy.x = joy.y = 0; knob.style.transform = ''; e.stopPropagation(); };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
}
/* eye-level views for the proposal ("공간 둘러보기"): from the entrance, from the far end back towards it, and towards the biggest
   group of machines. Each camera stands on free floor (moved towards the middle until it does). */
V3.eyeViews = () => {
  const L = GP.L(), P = L.room.pts, b = G.bounds(P), C = [b.cx, b.cz], out = [];
  // nothing tall within 2.8 m in front of the lens (an info desk or a column right before the camera fills the picture)
  const tall = L.items.filter(it => { const d = GP.getDef(it.type) || {}; return !d.flat && !d.wall && GP.mountOf(it) === 'floor' && GP.dims(it).h > .9; }).map(it => GP.footprint(it));
  const clear = (x, z, tg) => {     // straight ahead up to 2.8 m, and 20 degrees to each side up to 2.2 m
    const dl = Math.hypot(tg[0] - x, tg[1] - z) || 1, a0 = Math.atan2(tg[1] - z, tg[0] - x);
    for (const [da, reach] of [[0, 2.8], [-.3, 2.2], [.3, 2.2], [-.6, 1.8], [.6, 1.8]]) { const ux = Math.cos(a0 + da), uz = Math.sin(a0 + da); for (let d = .4; d <= Math.min(reach, dl); d += .3) { const qx = x + ux * d, qz = z + uz * d; if (tall.some(F => G.pip(qx, qz, F))) return false; } }
    return true;
  };
  const stand = (x, z, tg) => { let first = null; for (let k = 0; k <= 24; k++) { const t = k / 24, px = x + (C[0] - x) * t, pz = z + (C[1] - z) * t; if (!free(px, pz)) continue; if (!first) first = [px, pz]; if (!tg || clear(px, pz, tg)) return [px, pz]; } return first; };
  const view = (p, tg, label, ty) => { if (!p) return; out.push({ pos: [p[0], EYE, p[1]], target: [tg[0], ty || 1.1, tg[1]], fov: 62, label }); };
  const door = L.openings.find(o => o.host === 'room' && o.kind !== 'window'); let D = null;
  if (door) { const hs = GP.hostSeg(door), sp = GP.openingSpan(door, hs); D = [hs.a[0] + hs.dx * sp.c, hs.a[1] + hs.dz * sp.c]; view(stand(D[0] + hs.nx * .9, D[1] + hs.nz * .9, C), C, '입구에서 본 모습'); }
  // the far end: the corner farthest from the entrance (or from the middle), 1 m inside
  const ref = D || C; let far = P[0]; for (const q of P) if (Math.hypot(q[0] - ref[0], q[1] - ref[1]) > Math.hypot(far[0] - ref[0], far[1] - ref[1])) far = q;
  const fl = Math.hypot(C[0] - far[0], C[1] - far[1]) || 1; view(stand(far[0] + (C[0] - far[0]) / fl * 1.2, far[1] + (C[1] - far[1]) / fl * 1.2, D || C), D || C, '안쪽에서 바라본 모습');
  // the biggest group of machines by category
  const cats = {}; for (const it of L.items) { const d = GP.getDef(it.type) || {}; if (!GP.EQUIP_CATS || !GP.EQUIP_CATS.has(d.cat) || d.flat) continue; (cats[d.cat] = cats[d.cat] || []).push(it); }
  const best = Object.entries(cats).sort((u, v) => v[1].length - u[1].length)[0];
  if (best && best[1].length >= 2) {
    const g = best[1], gx = g.reduce((s, it) => s + it.x, 0) / g.length, gz = g.reduce((s, it) => s + it.z, 0) / g.length, dl = Math.hypot(C[0] - gx, C[1] - gz) || 1;
    const nm = (GP.lib.catNames && GP.lib.catNames[best[0]]) || (GP.CATS.find(c => c.id === best[0]) || {}).name || '';
    // a spot on a ring around the group, as close as possible to the side facing the middle of the room
    const a0 = Math.atan2(C[1] - gz, C[0] - gx); let pick = null;
    for (const r of [3.5, 4.5, 2.8]) { for (let k = 0; k < 12 && !pick; k++) { const a = a0 + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * Math.PI / 6, px = gx + Math.cos(a) * r, pz = gz + Math.sin(a) * r; if (free(px, pz) && clear(px, pz, [gx, gz])) pick = [px, pz]; } if (pick) break; }
    view(pick || stand(gx + (C[0] - gx) / dl * 3.5, gz + (C[1] - gz) / dl * 3.5, [gx, gz]), [gx, gz], `${nm} 쪽`, .9);
  }
  return out;
};
V3._walkTest = { step: () => { lastT = performance.now() - 40; walkStep(); }, state: () => wk, free };   // lets a test drive the walk without animation frames (hidden page)
/* looking around: drag on the 3D view */
let look = null;
function lookDown(e) { if (!V3.walking || e.target.closest('.walk-joy')) return; look = { x: e.clientX, y: e.clientY, id: e.pointerId }; try { R.domElement.setPointerCapture(e.pointerId); } catch (_) { } e.stopImmediatePropagation(); }
function lookMove(e) { if (!V3.walking || !look || e.pointerId !== look.id) return; wk.yaw += (e.clientX - look.x) * .005; wk.pitch = U.clamp(wk.pitch + (e.clientY - look.y) * .004, -1.1, 1.1); look.x = e.clientX; look.y = e.clientY; dirty = true; e.stopImmediatePropagation(); }
function lookUp(e) { if (look && e.pointerId === look.id) { look = null; if (V3.walking) e.stopImmediatePropagation(); } }
window.addEventListener('keydown', e => {
  if (!V3.walking) return; const tag = (e.target.tagName || '').toLowerCase(); if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
  const k = e.key.toLowerCase(); if (k === 'escape') { V3.walk(false); e.preventDefault(); e.stopImmediatePropagation(); return; }
  if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift'].includes(k)) { keys.add(k); e.preventDefault(); e.stopImmediatePropagation(); }
}, true);
window.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
window.addEventListener('blur', () => keys.clear());

/* ---------------- snapshots for images / PDF ---------------- */
V3.snapshot = async (w, h, preset) => {
  if (!V3.init()) return null; const wasOn = V3.on; if (!wasOn) { V3.rebuild(); }
  await V3.whenLoaded(); const c0 = cam.clone(); const selKeep = V3.selBox; if (selKeep) sc.remove(selKeep);
  const view = typeof preset === 'object' && preset ? preset : null, shot = new THREE.PerspectiveCamera(view && view.fov || 40, w / h, .05, 600);
  if (view) { shot.position.set(...view.pos); shot.lookAt(new THREE.Vector3(...view.target)); }
  else if (preset) { const p = V3.presets()[preset]; shot.position.set(...p.pos); shot.lookAt(new THREE.Vector3(...p.target)); } else { shot.position.copy(cam.position); shot.quaternion.copy(cam.quaternion); }
  const pr = R.getPixelRatio(); R.setPixelRatio(1); R.setSize(w, h, false); const keep = cam.position.clone(); cam.position.copy(shot.position); solid = !!view; wallFade(); solid = false; cam.position.copy(keep); R.render(sc, shot);
  const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(R.domElement, 0, 0);
  R.setPixelRatio(pr); V3.resize(); if (selKeep) sc.add(selKeep); dirty = true; void c0; return c;
};
})();
