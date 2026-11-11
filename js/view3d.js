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
  cam = new THREE.PerspectiveCamera(40, 1, .1, 400);      // (a nearer far / farther near: more depth precision, no flicker on far walls)
  sc.add(V3.hemi = new THREE.HemisphereLight(0xffffff, 0x8d9399, .42));      // with the environment map on top, more than this washes white walls and floors out
  const dl = V3.dir = new THREE.DirectionalLight(0xffffff, .9); dl.castShadow = true; dl.shadow.mapSize.set(2048, 2048); dl.shadow.bias = -.0004; dl.shadow.normalBias = .025; sc.add(dl, dl.target);
  const pm = new THREE.PMREMGenerator(R); const env = new THREE.Scene(); const eg = new THREE.BoxGeometry(1, 1, 1);
  env.add(new THREE.Mesh(new THREE.BoxGeometry(12, 6, 12), new THREE.MeshBasicMaterial({ color: '#7d8388', side: THREE.BackSide })));
  [[0, 2.9, 0, 7, .1, 7, 3.2], [5.9, 1.6, 0, .1, 2, 5, 1.8], [-5.9, 1.6, 0, .1, 2, 5, 1.4], [0, 1.6, 5.9, 5, 2, .1, 1.2]].forEach(([x, y, z, w, h, d, i]) => { const m = new THREE.Mesh(eg, new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffffff').multiplyScalar(i) })); m.position.set(x, y, z); m.scale.set(w, h, d); env.add(m); });
  sc.environment = pm.fromScene(env, .04).texture; pm.dispose();
  groups = {}; ['room', 'mats', 'items'].forEach(k => { groups[k] = new THREE.Group(); sc.add(groups[k]); });
  applyQuality();
  ctl = new THREE.OrbitControls(cam, cv); ctl.enableDamping = true; ctl.dampingFactor = .12; ctl.maxPolarAngle = 1.5; ctl.minDistance = 1; ctl.maxDistance = 250; ctl.screenSpacePanning = false;
  ctl.addEventListener('change', () => { dirty = true; GP.tip.hide(); });
  const T = V3.tex = {};
  T.concrete = canvasTex(256, (x, s) => { const Rn = rng(11); x.fillStyle = '#b9bbb8'; x.fillRect(0, 0, s, s); for (let i = 0; i < 700; i++) { const v = Rn() < .5 ? 255 : 40; x.fillStyle = `rgba(${v},${v},${v},.04)`; x.beginPath(); x.arc(Rn() * s, Rn() * s, 3 + Rn() * 16, 0, 7); x.fill(); } }, 1 / 3);
  new ResizeObserver(() => V3.resize()).observe($('#stage'));
  cv.addEventListener('pointerdown', lookDown, true); cv.addEventListener('pointermove', lookMove, true); cv.addEventListener('pointerup', lookUp, true); cv.addEventListener('pointerdown', grab, true); cv.addEventListener('pointermove', onMove); cv.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY }; }); cv.addEventListener('pointerup', onUp); cv.addEventListener('pointercancel', e => { if (mv) endDrag(e); }); cv.addEventListener('dblclick', e => { const uid = pick(e), it = uid && GP.findItem(uid); if (it) GP.M3.open(it); }); cv.addEventListener('pointerleave', () => { setHover(null); GP.tip.hide(); });
  /* Shift: finer, like Blender — turning, sliding and zooming at a fifth of the speed while it is held. (OrbitControls would turn
     Shift + left drag into sliding: the press goes on to it without Shift, so it still turns, only slower.) */
  const fine = on => { ctl.rotateSpeed = on ? .2 : 1; ctl.panSpeed = on ? .2 : 1; ctl.zoomSpeed = on ? .25 : 1; };
  cv.addEventListener('pointerdown', e => {
    if (e._plain) return; fine(e.shiftKey); if (!e.shiftKey || e.button !== 0 || V3.walking || mv || GP.ui.placing) return;
    e.stopImmediatePropagation(); const c = new PointerEvent('pointerdown', { clientX: e.clientX, clientY: e.clientY, screenX: e.screenX, screenY: e.screenY, button: 0, buttons: e.buttons, pointerId: e.pointerId, pointerType: e.pointerType, isPrimary: e.isPrimary, ctrlKey: false, altKey: e.altKey, metaKey: false, shiftKey: false, bubbles: true, cancelable: true });
    c._plain = true; cv.dispatchEvent(c);
  }, true);
  window.addEventListener('pointermove', e => { if (e.buttons) fine(e.shiftKey); }, true);
  cv.addEventListener('wheel', e => fine(e.shiftKey), true);
  window.addEventListener('keyup', e => { if (e.key === 'Shift') fine(false); });
  GP.on('changed', (P) => {
    if (!V3.on) { built = false; return; }
    if (GP.live.on || GP.live.el) { const q = V3._q || (V3._q = new Set()); (P || ['all']).forEach(k => q.add(k)); if (!V3._qr) V3._qr = requestAnimationFrame(() => { const s = V3._q; V3._q = null; V3._qr = 0; V3.rebuild(s); }); return; }      // a value being dragged or typed: at most once a frame
    V3.rebuild(P);
  });      // changed while 3D was closed: the next open rebuilds everything
  GP.on('project', () => { built = false; }); GP.on('restore', () => { built = false; if (V3.on) V3.rebuild(); });
  GP.on('selection', () => { if (V3.on) markSel(); });
  GP.on('placing', () => { ghostBuild(); if (R) R.domElement.style.cursor = GP.ui.placing ? 'crosshair' : ''; });
  return true;
};
V3.resize = () => {
  if (!R) return; const r = $('#stage').getBoundingClientRect(); R.setSize(Math.max(1, r.width), Math.max(1, r.height), false); cam.aspect = Math.max(1, r.width) / Math.max(1, r.height); cam.updateProjectionMatrix(); dirty = true;
  if (V3.on && !V3.sized && r.width > 50 && r.height > 50) { V3.sized = true; if (!V3.walking) V3.view('persp'); }   // first real size (opened hidden): frame the room again
};
V3.invalidate = () => { dirty = true; };
V3.camera = () => cam; V3.scene = () => sc;      // (tests)
function loop() { raf = requestAnimationFrame(loop); if (V3.walking) walkStep(); else { if (keys.size) flyStep(); if (ctl.update()) dirty = true; } if (!dirty) return; dirty = false; wallFade(); lightsFor(cam.position); skyAt(cam.position); lightMode(cam.position); R.render(sc, cam); }

/* ---------------- show / hide ---------------- */
V3.show = (on) => {
  if (on && GP.roomEmpty && GP.roomEmpty()) { GP.toast('아직 공간이 없어요. 공간을 먼저 만들면 3D로 볼 수 있어요', { bad: true }); return; }
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
  b.innerHTML = `<button class="tg${V3.cut ? ' on' : ''}" data-v3="cut"><i></i>벽 낮추기</button><span class="v3sep"></span><button class="btn xs" data-v3="persp">비스듬히</button><button class="btn xs" data-v3="top">위에서</button><button class="btn xs" data-v3="front">정면</button><button class="btn xs${V3.walking ? ' primary' : ''}" data-v3="walk">${V3.walking ? '걷기 끝' : '걸어보기'}</button>${GP.viewOnly ? '' : `<button class="btn xs" data-v3="shot">${GP.IC.image} 이미지 저장</button>`}<button class="btn xs" data-v3="pt" title="블렌더 Cycles처럼 빛을 실제로 계산한 사진 같은 그림 (시간이 걸려요 · 처음엔 인터넷 필요)">✨ 실사 렌더</button><button class="btn xs" data-v3="q" id="v3qBtn" title="3D 화질">화질 · ${Q3N[Q3()][0]} ▾</button><span class="v3load" id="v3load"></span>`;
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-v3]'); if (!b) return; const a = b.dataset.v3;
  if (a === 'pt') { V3.ptOpen(); return; }
  if (a === 'q') { GP.popover(b, `<div class="ph">3D 화질</div>${Object.entries(Q3N).map(([k, [n, d]]) => `<button class="mi${Q3() === k ? ' def' : ''}" data-act="${k}"><div><b>${n}${Q3() === k ? ' ✓' : ''}</b><small>${d}</small></div></button>`).join('')}<p class="note" style="margin:4px 10px 6px">이 기기에만 저장돼요. 화면이 끊기면 한 단계 낮춰 주세요.</p>`, act => { V3.setQuality(act); return false; }); return; }
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
V3.look = (pos, target) => { if (!R) return; cam.position.set(...pos); ctl.target.set(...target); ctl.update(); dirty = true; };      // (tests, tours)
V3.view = (k) => { if (!R) return; const p = V3.presets()[k] || V3.presets().persp; cam.position.set(...p.pos); ctl.target.set(...p.target); ctl.update(); dirty = true; };
V3.zoomBy = (f) => { if (!R) return; const off = cam.position.clone().sub(ctl.target); off.setLength(U.clamp(off.length() / f, ctl.minDistance, ctl.maxDistance)); cam.position.copy(ctl.target).add(off); ctl.update(); dirty = true; };

/* ---------------- geometry helpers ---------------- */
const V2 = (p) => new THREE.Vector2(p[0], -p[1]);
function prismGeo(quad, y0, y1) { const g = new THREE.ExtrudeGeometry(new THREE.Shape(quad.map(V2)), { depth: Math.max(.001, y1 - y0), bevelEnabled: false }); g.rotateX(-Math.PI / 2); g.translate(0, y0, 0); return g; }
/* geometry made for this build is freed; so are its one-off materials (those not kept in matCache / marked keep: shared ones stay) */
function clear(g) { const shared = new Set(Object.values(matCache)); for (const ch of [...g.children]) { g.remove(ch); ch.traverse(o => { if (!o.userData.own) return; if (o.geometry) o.geometry.dispose(); const m = o.material; if (m && !shared.has(m) && !m.userData.keep) m.dispose(); }); } }
function mat(key, f) { return matCache[key] || (matCache[key] = f()); }
/* finish images (GP.TEX): loaded once, repeated per metre (the floor's and the wall planes' UVs are in metres) */
const texCache = {}; let texLoading = 0;
function finishTex(id, adj) {
  const ak = GP.texAdjKey(adj), key = id + (ak && /[^0,]/.test(ak) ? '|' + ak : ''); if (texCache[key]) return texCache[key]; const d = GP.texDef(id); texLoading++; let t;
  if (key === id) t = new THREE.TextureLoader().load(GP.texUrl(id), () => { texLoading--; dirty = true; }, undefined, () => { texLoading--; });
  else {      // adjusted: drawn through a canvas filter (level · contrast · saturation), warmth as a coloured overlay
    const c = document.createElement('canvas'); t = new THREE.Texture(); const im = new Image(); im.crossOrigin = 'anonymous';      // (the picture goes in once it is drawn: a texture first sent at another size keeps that size)
    im.onload = () => { c.width = im.naturalWidth; c.height = im.naturalHeight; const x = c.getContext('2d'); x.filter = GP.texFilter(adj); x.drawImage(im, 0, 0); x.filter = 'none'; const w = (adj && adj.w) || 0; if (w) { x.globalCompositeOperation = 'overlay'; x.fillStyle = w > 0 ? `rgba(255,170,90,${Math.abs(w) / 60 * .45})` : `rgba(90,150,255,${Math.abs(w) / 60 * .45})`; x.fillRect(0, 0, c.width, c.height); x.globalCompositeOperation = 'source-over'; } t.image = c; t.needsUpdate = true; texLoading--; dirty = true; };
    im.onerror = () => { texLoading--; }; im.src = GP.texUrl(id);
  }
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.encoding = THREE.sRGBEncoding; t.anisotropy = 8; t.repeat.set(1 / d.size, 1 / d.size); return (texCache[key] = t);
}
/* a plain colour with the same adjustments (paint, the default concrete) */
function adjHex(hex, a) {
  if (!a) return hex; const c = new THREE.Color(hex), h = {}; c.getHSL(h); h.l = U.clamp(h.l * (1 + (a.b || 0) / 100), 0, 1); h.s = U.clamp(h.s * (1 + (a.s || 0) / 100), 0, 1); c.setHSL(h.h, h.s, h.l);
  const w = (a.w || 0) / 60; if (w) c.lerp(new THREE.Color(w > 0 ? '#ffb070' : '#7aa8ff'), Math.abs(w) * .25); return '#' + c.getHexString();
}
const finishOf = id => { const d = GP.texDef(id); return d && d.size ? d : null; };
/* the finished floor is matt (Lambert): under the strong overhead light a standard material's highlight lays a grey haze over the whole
   floor and dark woods turned pink-grey; slightly darker than white so the floor reads at the picture's own colour */
const std = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: .8 }, o || {}));
/* line (CAD) style: white faces + black feature edges */
let LINE = false;
const CADM = () => mat('cadm', () => new THREE.MeshLambertMaterial({ color: '#ffffff', polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }));
const CADL = () => mat('cadl', () => new THREE.LineBasicMaterial({ color: '#1b1f23' }));
function edgesOf(geo) { return geo.userData.edges30 || (geo.userData.edges30 = new THREE.EdgesGeometry(geo, 30)); }
/* (wall finishes sit 4 mm in front of the wall: far away the depth buffer cannot tell them apart and the white wall flickered
   through in specks; polygonOffset draws the finish in front) */
/* the world around: a sky dome that moves with the camera (so it stays at infinity) showing a gradient or a 360° photo, the light
   that goes with it, and the ground outside the building — a big disc fading out at its rim, under the room's floor */
let skyMesh = null; const skyTex = {}, groundTex = {};
function skyTexOf(d) {
  if (skyTex[d.id]) return skyTex[d.id]; let t;
  if (d.pano) t = new THREE.TextureLoader().load(GP.R3.base() + 'assets/env/sky_' + d.pano + '.jpg', () => { dirty = true; });
  else { const c = document.createElement('canvas'); c.width = 4; c.height = 512; const x = c.getContext('2d'), gr = x.createLinearGradient(0, 0, 0, 512); d.g.forEach(([o, col]) => gr.addColorStop(o, col)); x.fillStyle = gr; x.fillRect(0, 0, 4, 512); t = new THREE.CanvasTexture(c); }
  t.encoding = THREE.sRGBEncoding; return (skyTex[d.id] = t);
}
function applyEnv() {
  const E = GP.envOf(GP.P.settings), d = E.sky, on = !LINE && d.id !== 'studio';
  if (on && !skyMesh) { const geo = new THREE.SphereGeometry(300, 64, 32); geo.scale(-1, 1, 1); skyMesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ toneMapped: false, depthWrite: false, fog: false })); skyMesh.renderOrder = -10; skyMesh.frustumCulled = false; skyMesh.raycast = () => { }; sc.add(skyMesh); }
  if (skyMesh) { skyMesh.visible = on; if (on) { const t = skyTexOf(d); if (skyMesh.material.map !== t) { skyMesh.material.map = t; skyMesh.material.needsUpdate = true; } skyMesh.rotation.y = -E.rot * DEG; } }
  sc.background.set(LINE ? '#F7F8F7' : '#E6E9E6');
  const l = (!LINE && d.light) || {}; V3.hemi.color.set(l.sky || '#ffffff'); V3.hemi.groundColor.set(l.gnd || '#8d9399'); V3.hemi.intensity = l.hi ?? .42; V3.dir.color.set(l.sun || '#ffffff'); V3.dir.intensity = l.si ?? .9;
  for (const gd of GP.ENV_GROUND) { const m = matCache['ground:' + gd.id]; if (m) m.color.setScalar(l.gm ?? 1); }
  { const Lt = GP.lightOf(GP.P.settings); if (matCache['lt:e']) matCache['lt:e'].color.set(glowHex(Lt)).multiplyScalar(.3 + .7 * Math.min(1, Lt.lum)); const hm = matCache['lt:halo']; if (hm) { hm.color.set(Lt.glow); hm.opacity = .5 * Math.min(1, Lt.lum); } }      // turned down: the fixtures look dimmer too
  lmKey = '';      // a dark sky, a dark ground
  dirty = true;
}
const skyAt = pos => { if (skyMesh) skyMesh.position.copy(pos); };
/* 3D quality, per device (GP.lib.q3d), like a render engine choice: fast = no shadows, one pixel per pixel (slow PCs); normal = as
   it was; high = 1.5× pixels, a 4096 shadow map and twelve point lights standing in for the ceiling lights (light pools on the
   floor, in their colour) when seen from inside. The number of lights only changes with the quality (no recompiling otherwise). */
const Q3 = () => (GP.lib && GP.lib.q3d) || 'normal';
const Q3N = { fast: ['빠름', '그림자 없이 가볍게 · 느린 PC · 노트북'], normal: ['기본', '그림자 · 반사 · 대부분의 PC'], high: ['고품질', '더 선명한 화면 · 고운 그림자 · 안에서 보면 조명이 바닥을 비춰요 · 그래픽 성능이 좋은 PC'] };
let ptl = [];
function applyQuality() {
  if (!R) return; const q = Q3(), dpr = window.devicePixelRatio || 1;
  R.setPixelRatio(q === 'fast' ? 1 : q === 'high' ? Math.min(3, dpr * 1.5) : Math.min(dpr, 2));
  const ms = q === 'high' ? 4096 : 2048, sh = V3.dir.shadow; if (sh.mapSize.x !== ms) { sh.mapSize.set(ms, ms); if (sh.map) { sh.map.dispose(); sh.map = null; } }
  V3.dir.castShadow = !LINE && q !== 'fast';
  if (q === 'high' && !ptl.length) for (let k = 0; k < 12; k++) { const p = new THREE.PointLight(0xffffff, 0, 6, 2); sc.add(p); ptl.push(p); }
  else if (q !== 'high' && ptl.length) { ptl.forEach(p => sc.remove(p)); ptl = []; }
  lmKey = ''; if (V3.on) V3.resize(); dirty = true;
}
V3.quality = Q3;
V3.setQuality = q => { if (!GP.lib) return; GP.lib.q3d = q; GP.saveLib(); applyQuality(); renderBar(); GP.toast({ fast: '화질: 빠름 — 그림자 없이 가볍게', normal: '화질: 기본', high: '화질: 고품질 — 선명하게, 안에서는 조명이 바닥을 비춰요 (그래픽 성능이 좋은 PC용)' }[q], { ms: 3500 }); };
const pickSpots = (sp, n) => {      // n of them spread over the room: the one nearest the middle, then each time the one farthest from those picked
  if (sp.length <= n) return sp; let cx = 0, cz = 0; sp.forEach(s => { cx += s.p[0]; cz += s.p[1]; }); cx /= sp.length; cz /= sp.length;
  const dd = (a, b) => Math.hypot(a.p[0] - b.p[0], a.p[1] - b.p[1]), first = sp.reduce((a, s) => Math.hypot(s.p[0] - cx, s.p[1] - cz) < Math.hypot(a.p[0] - cx, a.p[1] - cz) ? s : a), out = [first], d = sp.map(s => dd(s, first));
  while (out.length < n) { let bi = 0; for (let i = 1; i < sp.length; i++) if (d[i] > d[bi]) bi = i; out.push(sp[bi]); for (let i = 0; i < sp.length; i++) d[i] = Math.min(d[i], dd(sp[i], sp[bi])); }
  return out;
};
/* inside (under the ceiling, walking): the room is lit by its own lights — none or turned down: dark, only daylight through the
   glass (the ceiling then casts the sun's shadow). From above or outside it stays bright so the layout reads. */
let ceilRef = null, roomH = 0, lmKey = '', lmT = 0;
const mixHex = (a, b, t) => '#' + new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString();
const lumOf = hex => { const c = new THREE.Color(hex); return .2126 * c.r + .7152 * c.g + .0722 * c.b; };      // how bright a colour looks (linear)
/* the glow of a fixture as shown: its colour lifted a little towards white (a lit LED's core), dimmer when turned down */
const glowHex = (Lt) => mixHex(Lt.glow, '#ffffff', .18);
function haloTex() { return mat('haloTex', () => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(.25, 'rgba(255,255,255,.45)'); g.addColorStop(.6, 'rgba(255,255,255,.12)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t; }); }
function lightMode(pos) {
  if (!GP.P || !V3.hemi) return; const st = GP.P.settings, Lt = GP.lightOf(st), E = GP.envOf(st), sky = (!LINE && E.sky.light) || {};
  const inside = !LINE && !V3.cut && !!ceilRef && (V3.walking || (pos.y < roomH - .05 && G.pip(pos.x, pos.z, GP.L().room.pts)));
  const F = Lt.d.id === 'none' ? 0 : Lt.lum, D = E.sky.day ?? 1, pts = inside && F > 0 && ptl.length && lightRef && lightRef.spots, A = inside ? Math.min(2.2, F * (pts ? .34 : .85) + D * .15) : 1;
  const key = [inside, A.toFixed(3), Lt.glow, E.sky.id, LINE, ptl.length, lightRef && lightRef.spots.length].join('|'), now = performance.now();
  if (key === lmKey && !(A !== 1 && now - lmT > 400)) return;      // (while dimmed, now and then again: machines loaded since get it too)
  const fresh = key !== lmKey; lmKey = key; lmT = now; V3.lightLevel = A;
  if (fresh) {
    const tint = inside && F > 0 ? mixHex(sky.sky || '#ffffff', Lt.glow, .5) : (sky.sky || '#ffffff'), comp = inside && F > 0 ? Math.min(1.8, lumOf(sky.sky || '#ffffff') / Math.max(.3, lumOf(tint))) : 1;
    V3.hemi.color.set(tint); V3.hemi.intensity = (sky.hi ?? .42) * A * comp;
    ptl.forEach(p => { p.intensity = 0; });
    if (pts) { const P = GP.L().room.pts, ch = pickSpots(lightRef.spots, ptl.length), cell = Math.sqrt(Math.abs(G.area(P)) / ch.length); ch.forEach((s, k) => { const p = ptl[k]; p.position.set(s.p[0], lightRef.H - .35, s.p[1]); p.color.set(Lt.glow); p.intensity = 1.5 * F * Math.min(3, Math.pow(1 / Math.max(.2, lumOf(Lt.glow)), .7)); p.distance = Math.max(4.2, cell * 1.35); }); }      // the light pools
    if (ceilRef) { ceilRef.castShadow = inside; const m = ceilRef.material; if (m.userData.base) m.color.copy(m.userData.base).multiplyScalar(inside ? Math.min(1, .06 + A * .94) : 1); }
  }
  sc.traverse(o => { const m = o.material; if (!m) return; for (const q of Array.isArray(m) ? m : [m]) if (q.isMeshStandardMaterial && q.envMapIntensity !== A) q.envMapIntensity = A; });
}
function buildGround(g, P) {
  const d = GP.envOf(GP.P.settings).ground; if (LINE || d.id === 'none') return;
  const bb = G.bounds(P), Rg = Math.max(70, Math.hypot(bb.sx, bb.sz) * 3), geo = new THREE.RingGeometry(.01, Rg, 96, 10), pos = geo.attributes.position, col = [];
  for (let k = 0; k < pos.count; k++) { const r = Math.hypot(pos.getX(k), pos.getY(k)) / Rg, a = r < .4 ? 1 : Math.max(0, 1 - (r - .4) / .6); col.push(1, 1, 1, a * a * (3 - 2 * a)); }      // fades out towards the rim
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 4)); geo.rotateX(-Math.PI / 2);
  const t = groundTex[d.id] || (groundTex[d.id] = (() => { const tx = new THREE.TextureLoader().load(GP.R3.base() + 'assets/env/ground_' + d.id + '.jpg', () => { dirty = true; }); tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.encoding = THREE.sRGBEncoding; tx.anisotropy = 8; return tx; })());
  t.repeat.set(2 * Rg / d.size, 2 * Rg / d.size);
  const m = new THREE.Mesh(geo, mat('ground:' + d.id, () => new THREE.MeshLambertMaterial({ map: t, vertexColors: true, transparent: true }))); m.position.set(bb.cx, -.02, bb.cz); m.renderOrder = -1; m.receiveShadow = true; m.raycast = () => { }; m.userData.own = true; g.add(m);
}
/* ceiling lights: the chosen design set out on the ceiling — rows along the room's long side for line lights, a grid for the
   rest (at least 45 cm from the walls); the body and the glow recoloured by their material names (g_lhouse / g_lemit) */
const lightScenes = {}; let lightRef = null;
const lightsFor = (pos) => { if (lightRef) lightRef.holder.visible = lightRef.top || V3.walking || pos.y < lightRef.H - .05; };      // only from under the ceiling, unless asked for
function lightScene(id) { return lightScenes[id] || (lightScenes[id] = GP.R3.loaders().then(gl => new Promise((res, rej) => gl.load(GP.R3.base() + 'models/light/' + id + '.glb', r => res(r.scene), undefined, rej))).catch(e => { delete lightScenes[id]; throw e; })); }
function lightSpots(P, d, gap) {
  const b = G.bounds(P), alongX = b.sx >= b.sz, Lw = alongX ? b.sx : b.sz, Sw = alongX ? b.sz : b.sx, o0 = alongX ? b.minX : b.minZ, s0 = alongX ? b.minZ : b.minX, out = [];
  const inside = (u, v) => { const [x, z] = alongX ? [u, v] : [v, u]; if (!G.pip(x, z, P)) return null; for (let i = 0; i < P.length; i++) if (G.closest(x, z, P[i], P[(i + 1) % P.length]).d < .45) return null; return [x, z]; };
  const rows = Math.max(1, Math.round(Sw / gap)), half = (d.line || d.len || d.w || 0) / 2;
  for (let r = 0; r < rows; r++) {
    const v = s0 + Sw * (r + .5) / rows;
    const fit = u => { const p = inside(u, v); return p && (!half || (inside(u - half, v) && inside(u + half, v))) ? p : null; };      // the whole fixture under the ceiling, not only its middle
    if (d.line) { const step = d.line + .3, n = Math.max(1, Math.floor((Lw - .9) / step)), u0 = o0 + (Lw - n * step) / 2 + step / 2; for (let k = 0; k < n; k++) { const p = fit(u0 + k * step); if (p) out.push({ p, rot: alongX ? 0 : Math.PI / 2 }); } }
    else { const cols = Math.max(1, Math.round(Lw / gap)); for (let c = 0; c < cols; c++) { const p = fit(o0 + Lw * (c + .5) / cols); if (p) out.push({ p, rot: alongX ? 0 : Math.PI / 2 }); } }
  }
  return out.slice(0, 220);
}
function buildLights(g, P, H, st) {
  const L = GP.lightOf(st); if (L.d.id === 'none') return; const spots = lightSpots(P, L.d, L.gap); if (!spots.length) return;
  const body = GP.LIGHT_BODY[L.body];
  const em = mat('lt:e', () => Object.assign(new THREE.MeshBasicMaterial({ color: L.glow, toneMapped: false }), { name: 'PT_EMIT' })); em.color.set(glowHex(L)).multiplyScalar(.3 + .7 * Math.min(1, L.lum));      // one glow, recoloured in place (a colour being dragged does not make new materials)
  const hm = mat('lt:h:' + L.body, () => std(body.c, { metalness: body.m, roughness: body.r }));
  const holder = new THREE.Group(); holder.userData.own = true; g.add(holder); lightRef = { holder, H, top: L.top, spots };
  lightScene(L.d.id).then(scene => {
    if (!holder.parent) return;      // built again since
    const proto = scene.clone(true); proto.traverse(n => { if (!n.isMesh) return; const nm = (n.material && n.material.name) || ''; if (/lemit/.test(nm)) n.material = em; else if (/lhouse/.test(nm)) n.material = hm; n.castShadow = false; n.receiveShadow = false; });
    const eb = new THREE.Box3(); proto.updateMatrixWorld(true); proto.traverse(n => { if (n.isMesh && n.material === em) eb.expandByObject(n); });
    const hc = eb.isEmpty() ? null : eb.getCenter(new THREE.Vector3()), hsz = hc ? Math.max(eb.max.x - eb.min.x, eb.max.z - eb.min.z) * 1.5 + .45 : 0, Y = new THREE.Vector3(0, 1, 0);
    if (lightRef && lightRef.holder === holder && hc) lightRef.em = { c: hc.clone(), w: eb.max.x - eb.min.x, d: eb.max.z - eb.min.z };
    const halo = hc && mat('lt:halo', () => new THREE.SpriteMaterial({ map: haloTex(), color: L.glow, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false, opacity: .5 })); if (halo) { halo.color.set(L.glow); halo.opacity = .5 * Math.min(1, L.lum); }
    for (const s of spots) {
      const o = proto.clone(true); o.position.set(s.p[0], H, s.p[1]); o.rotation.y = s.rot; holder.add(o);
      if (halo) { const sp = new THREE.Sprite(halo), c = hc.clone().applyAxisAngle(Y, s.rot); sp.position.set(s.p[0] + c.x, H + c.y - .03, s.p[1] + c.z); sp.scale.setScalar(hsz); sp.renderOrder = 2; holder.add(sp); }
    }
    dirty = true;
  }).catch(() => { });
}
/* a curved wall in one piece. Its pieces as separate boxes and finish planes shaded in bands and met in ragged seams; one strip
   with normals averaged at each point shades smoothly and has no seams. pts: [[x, z]], nrm: [[nx, nz]] the way the face looks,
   us: metres along (texture u). up: a horizontal strip (pts = one edge, nrm = the other edge's points) facing up */
function stripGeo(pts, nrm, y0, y1, us) {
  const pos = [], nor = [], uv = [], idx = [];
  pts.forEach((p, k) => { pos.push(p[0], y0, p[1], p[0], y1, p[1]); nor.push(nrm[k][0], 0, nrm[k][1], nrm[k][0], 0, nrm[k][1]); uv.push(us[k], y0, us[k], y1); });
  for (let k = 0; k < pts.length - 1; k++) {
    const a = 2 * k, b = a + 1, c = a + 2, d = a + 3, ex = pts[k + 1][0] - pts[k][0], ez = pts[k + 1][1] - pts[k][1], nx = nrm[k][0] + nrm[k + 1][0], nz = nrm[k][1] + nrm[k + 1][1];
    if (-ez * nx + ex * nz > 0) idx.push(a, c, b, b, c, d); else idx.push(a, b, c, b, d, c);      // (a, c, b) faces (−ez, 0, ex)
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); return g;
}
function capGeo(A, B, y) {      // the top of a strip between edge A and edge B at height y
  const pos = [], nor = [], idx = [];
  A.forEach((p, k) => { pos.push(p[0], y, p[1], B[k][0], y, B[k][1]); nor.push(0, 1, 0, 0, 1, 0); });
  for (let k = 0; k < A.length - 1; k++) { const a = 2 * k, b = a + 1, c = a + 2, d = a + 3, ux = A[k + 1][0] - A[k][0], uz = A[k + 1][1] - A[k][1], vx = B[k][0] - A[k][0], vz = B[k][1] - A[k][1]; if (uz * vx - ux * vz > 0) idx.push(a, c, b, b, c, d); else idx.push(a, b, c, b, d, c); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setIndex(idx); return g;
}
function addEdges(mesh) { const l = new THREE.LineSegments(edgesOf(mesh.geometry), CADL()); l.raycast = () => { }; mesh.add(l); return mesh; }
function toLine(obj, keepMat) { const ms = []; obj.traverse(n => { if (n.isMesh) ms.push(n); }); ms.forEach(n => { if (!keepMat) n.material = CADM(); n.castShadow = false; addEdges(n); }); return obj; }

/* ---------------- build ---------------- */
const NO3D = new Set(['annot', 'zones', 'zone', 'note', 'dim']), MATS = new Set(['mats', 'mat']);
V3.rebuild = (P) => {
  if (!R || !GP.P) return; const line = GP.S.style === 'line', parts = P instanceof Set ? [...P] : null, full = !parts || line !== LINE || !built || parts.some(k => !NO3D.has(k) && !MATS.has(k) && k !== 'items' && k !== 'room3d' && k !== 'env3d');
  LINE = line; sc.background.set(LINE ? '#F7F8F7' : '#E6E9E6'); V3.dir.castShadow = !LINE && Q3() !== 'fast';
  if (full) { buildRoom(); buildMats(); buildItems(); built = true; }
  else {
    if (parts.includes('room3d')) buildRoom();      // finishes, lights, glass panes: the room alone
    if (parts.some(k => MATS.has(k))) { buildMats(); buildItems(); }      // machines stand on the blocks
    else if (parts.includes('items')) buildItems();
  }
  applyEnv(); markSel(); dirty = true;
};
let built = false;
let wallMeshes = [];
function buildRoom() {
  const g = groups.room; clear(g); wallMeshes = []; lightRef = null; ceilRef = null;
  const L = GP.L(), st = GP.P.settings, P = L.room.pts; if (P.length < 3) return;
  const fg = new THREE.ShapeGeometry(new THREE.Shape(P.map(V2))); fg.rotateX(-Math.PI / 2); const fd = finishOf(st.floorBase), TA = st.texAdj || {}, fk = GP.texAdjKey(TA.floor), floor = new THREE.Mesh(fg, LINE ? CADM() : fd ? mat('floor:' + fd.id + fk, () => new THREE.MeshLambertMaterial({ color: '#d0d0d0', map: finishTex(fd.id, TA.floor) })) : mat('floor' + fk, () => std(adjHex('#dcdcdc', TA.floor), { map: V3.tex.concrete, roughness: .85 }))); floor.receiveShadow = true; floor.position.y = -.001; floor.userData.own = true; g.add(floor);
  const H = V3.cut ? Math.min(1.1, st.wallH) : st.wallH, O = G.offset(P, WALL_T, true), n = P.length, marks = L.wallMarks || {};
  if (!LINE && !V3.cut) {
    const cg = new THREE.ShapeGeometry(new THREE.Shape(P.map(V2))); cg.rotateX(-Math.PI / 2); const cd = (GP.TEX.ceil || []).find(t => t.id === st.ceilTex && t.size), ck = GP.texAdjKey(TA.ceil), ceil = new THREE.Mesh(cg, cd ? mat('ceil:' + cd.id + ck, () => new THREE.MeshBasicMaterial({ color: cd.id === 'ceil_glow' ? '#ffffff' : '#d2d4d3', map: finishTex(cd.id, TA.ceil), side: THREE.BackSide })) : mat('ceil' + ck, () => new THREE.MeshBasicMaterial({ color: adjHex('#c4c8c6', TA.ceil), side: THREE.BackSide }))); ceil.position.y = H; ceil.userData.own = true; g.add(ceil); { const cm = ceil.material; if (!cm.userData.base) cm.userData.base = cm.color.clone(); cm.shadowSide = THREE.DoubleSide; cm.name = 'PT_CEIL'; ceilRef = ceil; roomH = H; }
    buildLights(g, P, H, st);
  }
  buildGround(g, P);
  // curved walls (without doors on them): one smooth piece each
  const oneCurve = new Set();
  if (GP.CV) for (const c of GP.CV.list(L)) {
    const ws = []; for (let k = 0; k < c.n; k++) ws.push((c.s + k) % n); if (L.openings.some(o => o.host === 'room' && ws.includes(o.seg))) continue;
    ws.forEach(w => oneCurve.add(w));
    const idx = [...ws, c.e], Q = idx.map(k => P[k]), Oq = idx.map(k => O[k]), E = ws.map(w => G.edge(P, w));
    const N_ = idx.map((k, q) => { const e0 = E[Math.max(0, q - 1)], e1 = E[Math.min(E.length - 1, q)], x = e0.nx + e1.nx, z = e0.nz + e1.nz, l = Math.hypot(x, z) || 1; return [x / l, z / l]; });
    const us = [0]; for (let q = 1; q < Q.length; q++) us.push(us[q - 1] + G.len(Q[q - 1], Q[q]));
    const out = N_.map(v => [-v[0], -v[1]]), mid = N_[Math.floor(N_.length / 2)];
    const Lc = us[us.length - 1], secs = []; { let u = 0; for (const [a, b] of (GP.CV.glassR ? GP.CV.glassR(c) : []).map(r => [r[0] * Lc, r[1] * Lc])) { if (a > u + 1e-3) secs.push([u, a, false]); secs.push([a, b, true]); u = b; } if (u < Lc - 1e-3) secs.push([u, Lc, false]); }
    const at = (arr, v, norm) => { let j = 1; while (j < us.length - 1 && us[j] < v) j++; const f = U.clamp((v - us[j - 1]) / ((us[j] - us[j - 1]) || 1), 0, 1), p = [arr[j - 1][0] + (arr[j][0] - arr[j - 1][0]) * f, arr[j - 1][1] + (arr[j][1] - arr[j - 1][1]) * f]; if (norm) { const l = Math.hypot(p[0], p[1]) || 1; p[0] /= l; p[1] /= l; } return p; };
    const cut = (arr, u0, u1, norm) => { const r = [at(arr, u0, norm)]; us.forEach((v, q) => { if (v > u0 + 1e-4 && v < u1 - 1e-4) r.push(arr[q]); }); r.push(at(arr, u1, norm)); return r; }, cutU = (u0, u1) => [u0, ...us.filter(v => v > u0 + 1e-4 && v < u1 - 1e-4), u1];
    const wm = LINE ? new THREE.MeshLambertMaterial({ color: '#ffffff', transparent: true, opacity: 1, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }) : std(adjHex(st.wallColor || '#eeede8', TA.wall), { roughness: .92, transparent: true, opacity: 1 });
    const add = (geo, m, shadow) => { const me = new THREE.Mesh(geo, m); me.castShadow = !!shadow; me.receiveShadow = true; me.userData.own = true; if (LINE) addEdges(me); g.add(me); return me; };
    const wd = !LINE && finishOf((L.wallTex || {})[c.s] || st.wallTex), tm = wd && std('#ffffff', { map: finishTex(wd.id, TA.wall), roughness: wd.rough, transparent: true, opacity: 1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 });
    const bbC = { dark: '#2f3236', white: '#efefec' }[st.baseboard || 'dark'], bm = bbC && !LINE && std(bbC, { roughness: .6, transparent: true, opacity: 1 });
    let fm = null, gm = null; const glassMats = () => { if (fm) return; fm = LINE ? CADM() : std('#2f3236', { roughness: .45, metalness: .35, side: THREE.DoubleSide, transparent: true, opacity: 1 }); gm = LINE ? CADM() : glassMat(c.ref.glass).clone(); if (!LINE) { wallMeshes.push({ mat: fm, nx: -mid[0], nz: -mid[1] }); wallMeshes.push({ mat: gm, nx: -mid[0], nz: -mid[1], base: gm.opacity }); } };      // this curve's own frame and glass: they fade with the walls
    const gw = c.ref.gw ?? GP.GLASS_GW, HB = .06, HT = .06;
    let anyWall = false;
    for (const [u0, u1, isG] of secs) {
      const q = cut(Q, u0, u1), o = cut(Oq, u0, u1), nn = cut(N_, u0, u1, true), uu = cutU(u0, u1), ot = nn.map(v => [-v[0], -v[1]]);
      if (isG) {
        const M = q.map((p, k) => [p[0] - nn[k][0] * WALL_T / 2, p[1] - nn[k][1] * WALL_T / 2]);
        const GH = Math.max(HB + HT + .2, Math.min(H, c.ref.gh ?? H));
        glassMats(); add(stripGeo(M, nn, HB, GH - HT, uu), gm, false).receiveShadow = false;
        if (GH < H - .005) { anyWall = true; add(stripGeo(q, nn, GH, H, uu), wm, true); add(stripGeo(o, ot, GH, H, uu), wm, true); add(capGeo(q, o, H), wm, false); if (tm) add(stripGeo(q.map((p, k) => [p[0] + nn[k][0] * .004, p[1] + nn[k][1] * .004]), nn, GH, H, uu), tm, false); }      // above the glass: wall
        for (const [y0, y1] of [[0, HB], [GH - HT, GH]]) { add(stripGeo(q, nn, y0, y1, uu), fm, true); add(stripGeo(o, ot, y0, y1, uu), fm, true); add(capGeo(q, o, y1), fm, false); if (y0 > 0) add(capGeo(q, o, y0), fm, false); }
        const len = u1 - u0, nM = gw > 0 ? Math.max(1, Math.round(len / gw)) : 1, bx = new THREE.BoxGeometry(.05, Math.max(.1, GH - HB - HT), .07);
        for (let k = 0; k <= nM; k++) { const sv = len * k / nM; let j = 1; while (j < uu.length - 1 && uu[j] - u0 < sv) j++; const f = U.clamp((sv - (uu[j - 1] - u0)) / ((uu[j] - uu[j - 1]) || 1), 0, 1), p0 = M[j - 1], p1 = M[j], tx = p1[0] - p0[0], tz = p1[1] - p0[1]; const me = new THREE.Mesh(bx, fm); me.userData.own = k === 0; me.position.set(p0[0] + tx * f, HB + (GH - HB - HT) / 2, p0[1] + tz * f); me.rotation.y = -Math.atan2(tz, tx); me.castShadow = true; g.add(me); }
        continue;
      }
      anyWall = true;
      add(stripGeo(q, nn, 0, H, uu), wm, true); add(stripGeo(o, ot, 0, H, uu), wm, true); add(capGeo(q, o, H), wm, false);
      for (const [end, k, sg] of [[u0 > 1e-3, 0, -1], [u1 < Lc - 1e-3, q.length - 1, 1]]) { if (!end) continue; const k2 = sg < 0 ? 1 : q.length - 2, tx = (q[k][0] - q[k2][0]), tz = (q[k][1] - q[k2][1]), l = Math.hypot(tx, tz) || 1; add(stripGeo([q[k], o[k]], [[tx / l, tz / l], [tx / l, tz / l]], 0, H, [0, WALL_T]), wm, false); }      // where it meets glass: its end
      if (tm) add(stripGeo(q.map((p, k) => [p[0] + nn[k][0] * .004, p[1] + nn[k][1] * .004]), nn, 0, H, uu), tm, false);
      if (bm) { const Bq = q.map((p, k) => [p[0] + nn[k][0] * .012, p[1] + nn[k][1] * .012]); add(stripGeo(Bq, nn, 0, .08, uu), bm, false); add(capGeo(q, Bq, .08), bm, false); }
    }
    if (anyWall) { wallMeshes.push({ mat: wm, nx: -mid[0], nz: -mid[1] }); if (tm) wallMeshes.push({ mat: tm, nx: -mid[0], nz: -mid[1] }); if (bm) wallMeshes.push({ mat: bm, nx: -mid[0], nz: -mid[1] }); }
  }
  for (let i = 0; i < n; i++) {
    if (oneCurve.has(i)) continue;
    const j = (i + 1) % n, a = P[i], b = P[j], Ls = G.len(a, b); if (Ls < 1e-3) continue;
    const e = G.edge(P, i), ops = L.openings.filter(o => o.host === 'room' && o.seg === i);
    const wm = LINE ? new THREE.MeshLambertMaterial({ color: '#ffffff', transparent: true, opacity: 1, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }) : std(adjHex(st.wallColor || '#eeede8', TA.wall), { roughness: .92, transparent: true, opacity: 1 });
    const inner = s => [a[0] + e.dx * s, a[1] + e.dz * s], outer = s => s <= 1e-6 ? O[i] : s >= Ls - 1e-6 ? O[j] : [a[0] + e.dx * s - e.nx * WALL_T, a[1] + e.dz * s - e.nz * WALL_T];
    for (const [s0, s1, y0, y1] of pieces(Ls, H, ops)) { const me = new THREE.Mesh(prismGeo([inner(s0), inner(s1), outer(s1), outer(s0)], y0, y1), wm); me.castShadow = true; me.receiveShadow = true; me.userData.own = true; if (LINE) addEdges(me); g.add(me); }
    // the wall's finish: a thin plane on its room side, UVs in metres along the wall and up from the floor
    const wd = !LINE && finishOf((L.wallTex || {})[i] || st.wallTex);
    if (wd) {
      const tm = std('#ffffff', { map: finishTex(wd.id, TA.wall), roughness: wd.rough, transparent: true, opacity: 1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 });
      for (const [s0, s1, y0, y1] of pieces(Ls, H, ops)) {
        const w = s1 - s0, h = y1 - y0; if (w < .02 || h < .02) continue; const geo = new THREE.PlaneGeometry(w, h), uv = geo.attributes.uv;
        for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) ? s1 : s0, uv.getY(k) ? y1 : y0);
        const pl = new THREE.Mesh(geo, tm), c = (s0 + s1) / 2; pl.position.set(a[0] + e.dx * c + e.nx * .004, (y0 + y1) / 2, a[1] + e.dz * c + e.nz * .004); pl.rotation.y = Math.atan2(e.nx, e.nz); pl.receiveShadow = true; pl.userData.own = true; g.add(pl);
      }
      wallMeshes.push({ mat: tm, nx: -e.nx, nz: -e.nz });
    }
    if (marks[i] === 'mirror') for (const [s0, s1, y0] of pieces(Ls, H, ops)) { if (y0 > 0 || s1 - s0 < .2) continue; const mh = Math.min(2.1, H - .15); if (mh < .3) continue; const w = s1 - s0 - .1, c = (s0 + s1) / 2; const pl = new THREE.Mesh(new THREE.PlaneGeometry(w, mh - .1), mat('mirror', () => std('#dfe7ee', { metalness: 1, roughness: .04 }))); pl.position.set(a[0] + e.dx * c + e.nx * .012, .1 + (mh - .1) / 2, a[1] + e.dz * c + e.nz * .012); pl.rotation.y = Math.atan2(e.nx, e.nz); pl.userData.own = true; if (LINE) toLine(pl); g.add(pl); }
    wallMeshes.push({ mat: wm, nx: -e.nx, nz: -e.nz });
    const bbC = { dark: '#2f3236', white: '#efefec' }[st.baseboard || 'dark'];
    if (bbC && !LINE) { const bm = std(bbC, { roughness: .6, transparent: true, opacity: 1 }), pin = (s, d) => [a[0] + e.dx * s + e.nx * d, a[1] + e.dz * s + e.nz * d];
      for (const [s0, s1, y0] of pieces(Ls, H, ops)) { if (y0 > 0 || s1 - s0 < .03) continue; const me = new THREE.Mesh(prismGeo([pin(s0, 0), pin(s1, 0), pin(s1, .012), pin(s0, .012)], 0, .08), bm); me.receiveShadow = true; me.userData.own = true; g.add(me); }
      wallMeshes.push({ mat: bm, nx: -e.nx, nz: -e.nz }); }
  }
  const k0 = g.children.length; // everything after the walls: partitions, doors, windows
  // partitions
  for (const p of L.partitions) {
    if (!p.pts || p.pts.length < 2) continue; const t = p.thick || .1, H0 = p.kind === 'half' ? (p.height || 1.2) : (p.height || st.wallH), Hp = V3.cut ? Math.min(1.1, H0) : H0;
    const Lf = G.offset(p.pts, t / 2, false), Rt = G.offset(p.pts, -t / 2, false), glass = p.kind === 'glass';
    const pm = glass ? glassMat(p.glass || 'clear') : std(p.color ? finC(p.color, 'white') : (st.wallColor || '#eeede8'), { roughness: .92 }), pf = finM(p.frameC, glass ? 'silver' : 'white'), bbC = { dark: '#2f3236', white: '#efefec' }[st.baseboard || 'dark'];
    for (let i = 0; i < p.pts.length - 1; i++) {
      const a = p.pts[i], b = p.pts[i + 1], s = G.segInfo(a, b), ops = L.openings.filter(o => o.host === p.id && o.seg === i), nlx = -s.dz, nlz = s.dx;
      const lf = u => u <= 1e-6 ? Lf[i] : u >= s.L - 1e-6 ? Lf[i + 1] : [a[0] + s.dx * u + nlx * t / 2, a[1] + s.dz * u + nlz * t / 2];
      const rt = u => u <= 1e-6 ? Rt[i] : u >= s.L - 1e-6 ? Rt[i + 1] : [a[0] + s.dx * u - nlx * t / 2, a[1] + s.dz * u - nlz * t / 2];
      const off = (u, d) => [a[0] + s.dx * u + nlx * d, a[1] + s.dz * u + nlz * d], prism = (q, y0, y1, m) => { const me = new THREE.Mesh(prismGeo(q, y0, y1), m); me.castShadow = m.transparent !== true; me.receiveShadow = true; me.userData.own = true; g.add(me); return me; };
      for (const [s0, s1, y0, y1] of pieces(s.L, Hp, ops)) {
        const q = [lf(s0), lf(s1), rt(s1), rt(s0)];
        if (!glass) {
          prism(q, y0, y1, pm);
          if (y0 <= 0 && bbC && !LINE) [1, -1].forEach(sd => prism([off(s0, sd * t / 2), off(s1, sd * t / 2), off(s1, sd * (t / 2 + .012)), off(s0, sd * (t / 2 + .012))], 0, .08, mat('bb:' + bbC, () => std(bbC, { roughness: .6 }))));
          if (p.kind === 'half' && y1 >= Hp - 1e-3) prism([off(s0 - .015, t / 2 + .015), off(s1 + .015, t / 2 + .015), off(s1 + .015, -t / 2 - .015), off(s0 - .015, -t / 2 - .015)], y1, y1 + .03, finM(p.frameC, 'oak'));
          continue;
        }
        // glass: tinted pane in a coloured frame (top / bottom channels, posts at the ends and about every 1.2 m)
        const gq = [off(s0, .006), off(s1, .006), off(s1, -.006), off(s0, -.006)]; prism(gq, y0 + .05, y1 - .05, pm);
        [[y0, y0 + .05], [y1 - .05, y1]].forEach(([ya, yb]) => prism(q, ya, yb, pf));
        const pgw = p.gw ?? GP.GLASS_GW, n = pgw > 0 ? Math.max(1, Math.round((s1 - s0) / pgw)) : 1; for (let k = 0; k <= n; k++) { const u = s0 + (s1 - s0) * k / n, u0 = Math.max(s0, u - .02), u1 = Math.min(s1, u + .02); prism([off(u0, t / 2), off(u1, t / 2), off(u1, -t / 2), off(u0, -t / 2)], y0 + .05, y1 - .05, pf); }
      }
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
/* ---------------- doors & windows: frames, casings, leaves and sashes built to size; handles, hinges, closers, fittings and sensors
   are the Blender parts in models/arch/parts.glb (dev/blender/arch_parts.py). Colours: o.leafC / o.frameC / o.glass / o.hw (GP.FINISH …) ---------------- */
let archParts = null, archLoading = 0;
function loadArch() {
  if (archParts || archLoading) return; archLoading = 1;
  GP.R3.loaders().then(gl => new Promise((res, rej) => gl.load(GP.R3.base() + 'models/arch/parts.glb?v=1', res, undefined, rej)))
    .then(g => { archParts = {}; g.scene.children.forEach(n => { archParts[n.name] = n; }); archLoading = 0; if (V3.on) V3.rebuild(); })
    .catch(() => { archParts = {}; archLoading = 0; });
}
const rbCache = new Map();
/* a box with rounded edges, centred (cached by size: meshes using it are not marked own, so clear() leaves the shared geometry alone) */
function rbox(w, h, d, r) {
  const k = `${w.toFixed(4)}|${h.toFixed(4)}|${d.toFixed(4)}|${r}`; let g = rbCache.get(k); if (g) return g;
  r = Math.max(.0005, Math.min(r, w / 2 - .0005, h / 2 - .0005, d / 2 - .0005));
  const s = new THREE.Shape(), x = w / 2 - r, y = h / 2 - r; s.moveTo(-x, -y); s.lineTo(x, -y); s.lineTo(x, y); s.lineTo(-x, y); s.lineTo(-x, -y);
  g = new THREE.ExtrudeGeometry(s, { depth: Math.max(.0002, d - 2 * r), bevelEnabled: true, bevelThickness: r, bevelSize: r, bevelSegments: 2, curveSegments: 2 }); g.translate(0, 0, -(d - 2 * r) / 2);
  if (rbCache.size > 600) rbCache.clear(); rbCache.set(k, g); return g;
}
const finC = (v, def) => { const f = GP.FINISH[v || def]; return f ? f.c : (v || GP.FINISH[def].c); };
const finM = (v, def) => { const f = GP.FINISH[v || def], c = finC(v, def); if (f && f.tex && !LINE) return mat('fin:' + f.tex, () => std('#ffffff', { map: veneerTex(f.tex), roughness: .58 })); return mat('fin:' + c, () => std(c, f && f.metal ? { metalness: f.metal, roughness: .32 } : { roughness: .55 })); };
/* a wood veneer: the rounded boxes' faces carry UVs in metres, the picture covers 1.1 m × 2.2 m (grain upright) */
function veneerTex(id) {
  if (texCache[id]) return texCache[id]; texLoading++;
  const t = new THREE.TextureLoader().load(GP.texUrl(id), () => { texLoading--; dirty = true; }, undefined, () => { texLoading--; });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.encoding = THREE.sRGBEncoding; t.anisotropy = 8; t.repeat.set(1 / 1.1, 1 / 2.2); t.offset.set(.5, .5); return (texCache[id] = t);
}
const glassMat = (v) => { const g = GP.GLASS[v] || GP.GLASS.clear; return mat('gl:' + (v || 'clear'), () => Object.assign(new THREE.MeshPhysicalMaterial({ color: g.c, transparent: true, opacity: g.o, roughness: g.r || .04, metalness: 0, reflectivity: .5, depthWrite: false, side: THREE.DoubleSide }), { name: 'PT_GLASS:' + (v || 'clear') })); };      // (PT_… names: what the photoreal render recognises)
const hwMat = (v) => { const h = GP.HW[v] || GP.HW.steel; return mat('hw:' + (v || 'steel'), () => std(h.c, { metalness: h.m, roughness: h.r })); };
function buildOpenings(g, H) {
  loadArch(); const L = GP.L();
  const put = (geo, m, x, y, z, par, own) => { const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); me.castShadow = m.transparent !== true; me.receiveShadow = true; if (own) me.userData.own = true; par.add(me); return me; };
  const rb = (w, h, d, r, m, x, y, z, par) => put(rbox(w, h, d, r), m, x, y, z, par);
  /* a Blender part on a face: ry 0 = standing out towards +z, π = towards -z; sx -1 mirrors it along x */
  const part = (name, par, x, y, z, ry, sx, hw, body) => {
    const src = archParts && archParts[name]; if (!src) return null; const o = src.clone(true);
    o.traverse(n => { if (!n.isMesh) return; const nm = n.material && n.material.name; if (nm === 'hw_metal') n.material = hw; else if (nm === 'hw_body') n.material = body || hw; n.castShadow = true; });
    o.position.set(x, y, z); o.rotation.y = ry || 0; if (sx) o.scale.x = sx; par.add(o); return o;
  };
  /* casings (door / window trim) on both faces round an opening x0..x1, y0..y1 */
  const casing = (og, T, x0, x1, y0, y1, m, faces, cw) => {
    cw = cw || .07; const ct = .014;
    for (const zs of faces) { const z = zs * (T / 2 + ct / 2);
      rb(cw, y1 - y0 + (y0 > 0 ? 2 * cw : cw), ct, .004, m, x0 - cw / 2, y0 > 0 ? (y0 + y1) / 2 : (y1 + cw) / 2, z, og);
      rb(cw, y1 - y0 + (y0 > 0 ? 2 * cw : cw), ct, .004, m, x1 + cw / 2, y0 > 0 ? (y0 + y1) / 2 : (y1 + cw) / 2, z, og);
      rb(x1 - x0, cw, ct, .004, m, (x0 + x1) / 2, y1 + cw / 2, z, og); if (y0 > 0) rb(x1 - x0, cw, ct, .004, m, (x0 + x1) / 2, y0 - cw / 2, z, og); }
  };
  for (const o of L.openings) {
    const hs = GP.hostSeg(o); if (!hs) continue; const sp = GP.openingSpan(o, hs), w = sp.w, c = sp.c, D = GP.OPEN_DEF[o.kind] || {};
    const og = new THREE.Group(); og.position.set(hs.a[0] + hs.dx * c + hs.nx * hs.mid, 0, hs.a[1] + hs.dz * c + hs.nz * hs.mid);
    og.rotation.y = Math.atan2(-hs.dz, hs.dx); g.add(og); // local x = along the wall, local z = (-dz, dx)
    const T = hs.thick, hinge = o.hinge === 'R' ? 1 : -1, zin = (-hs.dz * hs.nx + hs.dx * hs.nz) >= 0 ? 1 : -1, zf = (o.flip ? -1 : 1) * zin;
    const frM = finM(o.frameC, D.frameC || 'white'), hw = hwMat(o.hw || D.hw), body = finM(o.frameC === 'black' || o.frameC === 'charcoal' ? 'black' : 'silver');
    if (o.kind === 'window') {
      const sill = o.sill ?? .9, hh = Math.min(o.h ?? 1.2, H - sill); if (hh <= .1) continue; const gl = glassMat(o.glass || D.glass), fw = .055, fd = .09;
      // outer frame in the wall, the stool (sill board) on the room side, trim round it inside
      rb(w, fw, fd, .006, frM, 0, sill + fw / 2, 0, og); rb(w, fw, fd, .006, frM, 0, sill + hh - fw / 2, 0, og); rb(fw, hh, fd, .006, frM, -w / 2 + fw / 2, sill + hh / 2, 0, og); rb(fw, hh, fd, .006, frM, w / 2 - fw / 2, sill + hh / 2, 0, og);
      if (o.wtype === 'fixed') {      // one fixed pane (shop-front glass): slim frame, a post about every 1.5 m, no sash or handle
        const n = Math.max(1, Math.round((w - 2 * fw) / 1.5)), pw = (w - 2 * fw) / n; put(new THREE.BoxGeometry(w - 2 * fw + .01, hh - 2 * fw + .01, .01), gl, 0, sill + hh / 2, 0, og, true);
        for (let k = 1; k < n; k++) rb(.04, hh - 2 * fw, fd * .7, .004, frM, -w / 2 + fw + pw * k, sill + hh / 2, 0, og);
        continue;
      }
      rb(w + .12, .025, T / 2 + .06, .006, finM('white'), 0, sill - .0125, zin * (T / 4 + .03), og);
      casing(og, T, -w / 2, w / 2, sill + .025, sill + hh, frM, [zin], .05);
      // sashes: two sliding sashes on their own tracks when wide, one sash when narrow; the lever on the room side of the inner sash
      const iw = w - 2 * fw, ih = hh - 2 * fw, two = iw > .9, n = two ? 2 : 1, sw = two ? iw / 2 + .03 : iw, sf = .05, sd = .04;
      for (let k = 0; k < n; k++) {
        const x = two ? (k ? 1 : -1) * (iw / 4 - .015) : 0, z = two ? (k ? -1 : 1) * zin * .022 : 0, y = sill + fw + ih / 2;
        rb(sw, sf, sd, .004, frM, x, sill + fw + sf / 2, z, og); rb(sw, sf, sd, .004, frM, x, sill + fw + ih - sf / 2, z, og); rb(sf, ih - 2 * sf, sd, .004, frM, x - sw / 2 + sf / 2, y, z, og); rb(sf, ih - 2 * sf, sd, .004, frM, x + sw / 2 - sf / 2, y, z, og);
        put(new THREE.BoxGeometry(sw - 2 * sf + .01, ih - 2 * sf + .01, .008), gl, x, y, z, og, true);
        if (k === 0) part('win_handle', og, two ? x + sw / 2 - sf / 2 : x + sw / 2 - sf / 2, y, z + zin * sd / 2, zin > 0 ? 0 : Math.PI, 0, hw);
      }
      continue;
    }
    const dh = Math.min(o.h ?? 2.1, H - .05); if (dh <= .1) continue;
    if (o.kind === 'opening') { casing(og, T, -w / 2, w / 2, 0, dh, frM, [1, -1]); continue; }
    if (o.kind === 'auto') {      // automatic sliding door: operator header with a sensor on each face, two glass leaves in slim stiles (shown closed)
      const hh = .16, gl = glassMat(o.glass || D.glass), jw = .05, iw = w - 2 * jw, lh = dh - hh - .012, y0 = .012, st2 = .035, dz = .03;
      rb(jw, dh, T + .012, .004, frM, -w / 2 + jw / 2, dh / 2, 0, og); rb(jw, dh, T + .012, .004, frM, w / 2 - jw / 2, dh / 2, 0, og); rb(iw, hh, T + .07, .01, frM, 0, dh - hh / 2, 0, og);
      rb(iw, .012, .05, .002, finM('silver'), 0, .006, 0, og);
      [-1, 1].forEach(s2 => { const lw = iw / 2 - .004, x = s2 * iw / 4;
        rb(st2, lh, dz, .003, frM, x - lw / 2 + st2 / 2, y0 + lh / 2, 0, og); rb(st2, lh, dz, .003, frM, x + lw / 2 - st2 / 2, y0 + lh / 2, 0, og); rb(lw - 2 * st2, st2, dz, .003, frM, x, y0 + lh - st2 / 2, 0, og); rb(lw - 2 * st2, .07, dz, .003, frM, x, y0 + .035, 0, og);
        put(new THREE.BoxGeometry(lw - 2 * st2 + .01, lh - st2 - .07 + .01, .008), gl, x, y0 + .07 + (lh - st2 - .07) / 2, 0, og, true); });
      [1, -1].forEach(fs => part('sensor', og, 0, dh - hh + .045, fs * (T + .07) / 2, fs > 0 ? 0 : Math.PI, 0, hw, body));
      continue;
    }
    const leafM = finM(o.leafC, D.leafC || 'white');
    if (o.kind === 'slide') {
      // a surface sliding door on the swing side: track above, rollers, two flush pulls; it covers the opening (closed)
      casing(og, T, -w / 2, w / 2, 0, dh, frM, [1, -1]); const lw = w + .08, lh = dh + .04, lt = .038, z = zf * (T / 2 + .014 + .03), x = 0;
      const tl = 2 * w + .12; rb(tl, .045, .035, .004, finM('silver'), -hinge * (w / 2) + 0, dh + .09, zf * (T / 2 + .03), og);
      rb(lw, lh, lt, .005, leafM, x, .012 + lh / 2, z, og);
      [-1, 1].forEach(s => { const r = put(new THREE.CylinderGeometry(.022, .022, .02, 20), finM('silver'), x + s * (lw / 2 - .12), dh + .07, z, og, true); r.rotation.x = Math.PI / 2; });
      [1, -1].forEach(fs => part('flush_pull', og, x + hinge * (lw / 2 - .07), 1.0, z + fs * lt / 2, fs > 0 ? 0 : Math.PI, 0, hw));
      continue;
    }
    const glass = o.kind === 'glass2', dbl = o.kind === 'door2' || glass, fw = glass ? .04 : .05, lt = glass ? .012 : .04;
    // frame in the wall gap (jambs, head) and casings on both faces; glass doors get an operator header instead of a head
    const head = glass ? .14 : fw;
    rb(fw, dh, T + .012, .004, frM, -w / 2 + fw / 2, dh / 2, 0, og); rb(fw, dh, T + .012, .004, frM, w / 2 - fw / 2, dh / 2, 0, og); rb(w - 2 * fw, head, glass ? T + .05 : T + .012, .006, frM, 0, dh - head / 2, 0, og);
    if (!glass) { casing(og, T, -w / 2, w / 2, 0, dh, frM, [1, -1]); [[-1], [1]].forEach(([s]) => rb(.014, dh - fw, .012, .002, frM, s * (w / 2 - fw - .007), (dh - fw) / 2, zf * (T / 2 - lt - .014), og)); }
    const iw = w - 2 * fw, lh = dh - head - (glass ? .012 : .008), leaves = dbl ? [-1, 1] : [hinge];
    leaves.forEach(sgn => {
      const lw = dbl ? iw / 2 - .003 : iw - .006, x = dbl ? sgn * (iw / 4) : 0, hx = dbl ? sgn * (iw / 2) : sgn * (iw / 2), zL = glass ? 0 : zf * (T / 2 - lt / 2 - .004), y = (glass ? .012 : .008) + lh / 2;
      const leaf = glass ? put(new THREE.BoxGeometry(lw, lh, lt), glassMat(o.glass || D.glass), x, y, zL, og, true) : rb(lw, lh, lt, .004, leafM, x, y, zL, og);
      const away = -Math.sign(hx - x) || 1, ex = x + away * (lw / 2);      // the edge away from the hinge (handle side)
      if (glass) {      // frameless glass: patch fittings top and bottom at the pivot edge
        [.012 + .03, .012 + lh - .03].forEach(py => part('patch', og, hx - Math.sign(hx - x) * .1, py, 0, 0, 0, finM(o.frameC, D.frameC || 'silver')));
        return;
      }
      [.25, lh / 2 + .05, lh - .2].forEach(py => part('hinge', og, hx, py, zL + zf * lt / 2, zf > 0 ? 0 : Math.PI, Math.sign(x - hx) * (zf > 0 ? 1 : -1), hw));
      const lx = ex - away * .065; [1, -1].forEach(fs => { const ry = fs * zf > 0 ? 0 : Math.PI, dir = -away; part('lever', og, lx, 1.0, zL + fs * zf * lt / 2, ry, dir * (ry ? -1 : 1), hw); });
      part('closer', og, hx + Math.sign(x - hx) * .3, y + lh / 2 - .05, zL + zf * lt / 2, zf > 0 ? 0 : Math.PI, Math.sign(hx - x) * (zf > 0 ? 1 : -1), body, body);
    });
    if (glass) [1, -1].forEach(fs => part('sensor', og, 0, dh - head - .005 + .025, fs * (T / 2 + .025) * 0 + fs * ((T + .05) / 2), fs > 0 ? 0 : Math.PI, 0, hw, body));
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
  const bm = std('#ffffff', { map: t, roughness: k === 'topblack' ? .6 : .9 }); bm.userData.keep = true; return (blockTex[k] = bm);
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
/* equipment with a 3D file (the user's registered one, else the generic model in models/basic): a faint box of its size until the
   file has loaded, then the model. The rough procedural model is only for what has no file (made-to-size furniture, own items)
   and for a file that cannot be loaded (offline and never fetched). */
let holdGeo = null;      // one unit box for every stand-in (scaled per item; shared, so nothing to free)
function holdBox(dm) { const h = Math.max(.05, dm.h), m = new THREE.Mesh(holdGeo || (holdGeo = new THREE.BoxGeometry(1, 1, 1)), mat('hold', () => new THREE.MeshBasicMaterial({ color: '#9aa3ab', transparent: true, opacity: .16, depthWrite: false }))); m.scale.set(dm.w, h, dm.d); m.position.y = h / 2; return m; }
const roots = new Map(); let loading = 0, loadTotal = 0, loadDone = 0;
function onMatAt(x, z) { for (const m of GP.L().mats) if (m.pts.length > 2 && G.pip(x, z, m.pts)) return .025; return 0; }
function buildItems() {
  const g = groups.items; clear(g); roots.clear(); const L = GP.L(); const want = {};
  for (const it of L.items) {
    const def = GP.getDef(it.type); if (!def) continue; const dm = GP.dims(it), mount = GP.mountOf(it);
    const root = new THREE.Group(); root.userData.uid = it.uid; root.userData.dm = dm;
    const y = GP.itemY(it) + (mount === 'floor' && !def.flat ? onMatAt(it.x, it.z) : 0); root.position.set(it.x, y, it.z); root.rotation.y = -it.rot * DEG;
    const src = modelSrc(it.type, def), proc = src ? holdBox(dm) : GP.R3.procModel(it); if (LINE && !src) toLine(proc); root.add(proc); g.add(root); roots.set(it.uid, root);
    if (src) (want[it.type + '|' + src] = want[it.type + '|' + src] || []).push({ it, root, proc, dm });
  }
  const keys = Object.keys(want); loadTotal = keys.length; loadDone = 0; loading = keys.length; setLoad();
  keys.forEach(k => { const [t, src] = k.split('|'), b = src === 'basic'; GP.R3.glb(t, null, b).then(scene => { for (const q of want[k]) { if (roots.get(q.it.uid) !== q.root) continue; q.root.remove(q.proc); const gm = GP.R3.fitGlb(t, scene, q.dm, b, q.it, LINE ? toLine : null); if (LINE) toLine(gm); else if (b) GP.R3.tint(gm, GP.eqColor(q.it)); q.root.add(gm); } dirty = true; }).catch(() => { for (const q of want[k]) { if (roots.get(q.it.uid) !== q.root) continue; q.root.remove(q.proc); const pm = GP.R3.procModel(q.it); if (LINE) toLine(pm); q.root.add(pm); } dirty = true; }).finally(() => { loading--; loadDone++; setLoad(); }); });
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
/* ---------------- photoreal render: the scene goes to pt.html (path tracing, like Blender's Cycles) ---------------- */
const loadJS = src => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('불러오지 못함: ' + src)); document.head.appendChild(s); });
V3.ptScene = async () => {
  if (!R) throw new Error('3D가 켜져 있지 않아요'); if (!THREE.GLTFExporter) await loadJS(GP.R3.base() + 'vendor/GLTFExporter.js');
  await V3.whenLoaded(8000); const st = GP.P.settings, E = GP.envOf(st), Lt = GP.lightOf(st);
  const keep = solid; solid = true; wallFade(); solid = keep;      // walls solid (not faded) in the render
  const lv = lightRef ? lightRef.holder.visible : null; if (lightRef) lightRef.holder.visible = Lt.d.id !== 'none';
  try {
    const glb = await new Promise((res, rej) => new THREE.GLTFExporter().parse([groups.room, groups.mats, groups.items], res, rej, { binary: true, onlyVisible: true, maxTextureSize: 1024 }));
    let pos = cam.position.toArray(), target = ctl.target.toArray();
    if (V3.walking) { const f = new THREE.Vector3(); cam.getWorldDirection(f); target = cam.position.clone().addScaledVector(f, 5).toArray(); }
    const d = E.sky, sky = d.pano ? { kind: 'pano', url: 'assets/env/sky_' + d.pano + '.jpg', rot: E.rot } : d.g ? { kind: 'grad', g: d.g } : { kind: 'studio' };
    const sd = V3.dir.position.clone().sub(V3.dir.target.position).normalize(), sl = d.light || {};
    const lights = (lightRef && lightRef.em && Lt.d.id !== 'none' && Lt.lum > 0) ? lightRef.spots.map(s => { const c = lightRef.em.c.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), s.rot); return { x: s.p[0] + c.x, y: lightRef.H + c.y - .012, z: s.p[1] + c.z, w: lightRef.em.w, d: lightRef.em.d, rot: s.rot }; }) : [];
    return { glb, cam: { pos, target, fov: cam.fov }, sky, sun: { dir: sd.toArray(), color: '#' + new THREE.Color(sl.sun || '#ffffff').getHexString(), intensity: sl.si ?? .9 }, lights, glow: Lt.glow, lum: Lt.d.id === 'none' ? 0 : Lt.lum };
  } finally { if (lightRef && lv !== null) lightRef.holder.visible = lv; dirty = true; }
};
V3.ptOpen = () => {
  if (document.querySelector('.pt-ov')) return; const ov = document.createElement('div'); ov.className = 'pt-ov'; ov.innerHTML = '<iframe src="pt.html" title="실사 렌더"></iframe>'; document.body.appendChild(ov);
  const close = () => { window.removeEventListener('message', on); const f = ov.firstChild; try { f.contentWindow.ptShutdown && f.contentWindow.ptShutdown(); } catch (_) { } f.src = 'about:blank'; setTimeout(() => ov.remove(), 50); dirty = true; };      // the render stopped and its graphics memory freed before the frame goes
  const on = async e => {
    if (e.origin !== location.origin || !e.data) return; const t = e.data.type;
    if (t === 'pt-close') { close(); return; }
    if (t === 'pt-ready') { try { const s = await V3.ptScene(); ov.firstChild.contentWindow.postMessage(Object.assign({ type: 'scene' }, s), location.origin, [s.glb]); } catch (err) { console.error(err); GP.toast('실사 렌더로 장면을 보내지 못했어요 · ' + (err && err.message || err), { bad: true, ms: 5000 }); close(); } }
  };
  window.addEventListener('message', on);
};
V3.whenLoaded = (ms) => new Promise(res => { const t0 = performance.now(); const chk = () => { if ((loading <= 0 && texLoading <= 0 && !archLoading && !GP.R3.pending) || performance.now() - t0 > (ms || 25000)) res(); else setTimeout(chk, 200); }; chk(); });
function markSel() {
  const sel = GP.ui.selSet(); if (V3.selBox) { sc.remove(V3.selBox); V3.selBox.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); V3.selBox = null; }
  const ids = [...sel].filter(k => k.startsWith('item:')).map(k => k.slice(5)); if (!ids.length) { dirty = true; return; }
  const grp = new THREE.Group(); for (const id of ids) { const r = roots.get(id); if (!r) continue; const dm = r.userData.dm; const bx = new THREE.Box3(new THREE.Vector3(-dm.w / 2, 0, -dm.d / 2), new THREE.Vector3(dm.w / 2, dm.h, dm.d / 2)); const h = new THREE.Box3Helper(bx, new THREE.Color('#2450E0')), at = new THREE.Group(); at.position.copy(r.position); at.rotation.copy(r.rotation); at.add(h); grp.add(at); }   // Box3Helper moves itself to its box's centre every frame: the outer group carries the item's place and turn
  V3.selBox = grp; sc.add(grp); dirty = true;
}
function wallFade() {
  if (!GP.P || !wallMeshes.length) return;
  if (V3.walking || solid) { for (const w of wallMeshes) { const o = w.base ?? 1; if (w.mat.opacity !== o) { w.mat.opacity = o; w.mat.depthWrite = o === 1; } } return; } const b = G.bounds(GP.L().room.pts); let vx = cam.position.x - b.cx, vz = cam.position.z - b.cz; const l = Math.hypot(vx, vz) || 1; vx /= l; vz /= l;
  const high = cam.position.y > Math.max(b.sx, b.sz) * 1.6;
  for (const w of wallMeshes) { const b0 = w.base ?? 1, o = (!high && (w.nx * vx + w.nz * vz) > .2) ? .12 * b0 : b0; if (w.mat.opacity !== o) { w.mat.opacity = o; w.mat.depthWrite = o === 1; } }      // (glass: from its own see-through to nearly nothing)
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
  const q = GP.tools.gridOf(e); GP.tools.moveItems(d, fp, e.altKey, q.zoom ? .05 : q.g);      // (the plan's zoom says nothing here)
  for (const s of d.start) { const it = GP.findItem(s.uid), r = roots.get(s.uid); if (it && r) { r.position.x = it.x; r.position.z = it.z; r.rotation.y = -it.rot * DEG; } }
  markSel(); dirty = true;
}
/* returns true when the press was a drag (the click handling is skipped) */
function endDrag(e) {
  const d = mv; mv = null; ctl.enabled = true; R.domElement.style.cursor = hov ? 'pointer' : '';
  if (!d.moved) return false;
  GP.changed('items'); GP.ui.renderInspector(); return true;
}
/* placing ghost: the item's own model, see-through, over a blue (fits) / red (overlaps, outside the room) footprint.
   With a 3D file that is the file's model (only the footprint until it has loaded); the rough procedural model is for what has no file. */
function ghostBuild() {
  if (!R) return; if (ghost) { sc.remove(ghost.g); ghost.g.traverse(n => { if (n.userData.own) { if (!n.userData.shared) n.geometry.dispose(); [].concat(n.material).forEach(m => m.dispose()); } }); ghost = null; }
  const pl = GP.ui.placing; if (!pl || !V3.on) { dirty = true; return; }
  const g = new THREE.Group(), parts = pl.list.map(q => {
    const r = new THREE.Group(), src = modelSrc(q.it.type), dm = GP.dims(q.it);
    /* see-through copies of the materials; a file's geometry is shared with the models on the plan (never disposed here), a procedural one is cloned */
    const faint = (m, shared) => { m.traverse(n => { if (n.isMesh) { n.material = Array.isArray(n.material) ? n.material.map(x => see(x.clone())) : see(n.material.clone()); n.castShadow = false; n.receiveShadow = false; n.userData.own = true; if (shared) n.userData.shared = true; else n.geometry = n.geometry.clone(); } }); return m; };
    if (!src) r.add(faint(GP.R3.procModel(q.it)));
    else { const b = src === 'basic'; GP.R3.glb(q.it.type, null, b).then(scene => { if (!ghost || ghost.g !== g) return; r.add(faint(GP.R3.fitGlb(q.it.type, scene, dm, b), true)); dirty = true; }).catch(() => { if (ghost && ghost.g === g) { r.add(faint(GP.R3.procModel(q.it))); dirty = true; } }); }
    const fp = new THREE.Mesh(new THREE.PlaneGeometry(dm.w, dm.d), new THREE.MeshBasicMaterial({ color: '#2450E0', transparent: true, opacity: .3, depthWrite: false }));
    fp.rotation.x = -Math.PI / 2; fp.position.y = .03; fp.userData.own = true; r.add(fp); r.userData.fp = fp; r.visible = false; g.add(r); return r;
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
  const L = GP.L(), P = L.room.pts, b = G.bounds(P), door = L.openings.find(o => o.host === 'room' && o.kind !== 'window' && GP.hostSeg(o));
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
  const door = L.openings.find(o => o.host === 'room' && o.kind !== 'window' && GP.hostSeg(o)); let D = null;
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
/* looking around: drag on the 3D view. A mouse looks where it is dragged (like a game, look.s = -1); a finger drags the scene (look.s = 1) */
let look = null;
function lookDown(e) { if (!V3.walking || e.target.closest('.walk-joy')) return; look = { x: e.clientX, y: e.clientY, id: e.pointerId, s: e.pointerType === 'touch' ? 1 : -1 }; try { R.domElement.setPointerCapture(e.pointerId); } catch (_) { } e.stopImmediatePropagation(); }
function lookMove(e) { if (!V3.walking || !look || e.pointerId !== look.id) return; wk.yaw += (e.clientX - look.x) * .005 * look.s; wk.pitch = U.clamp(wk.pitch + (e.clientY - look.y) * .004 * look.s, -1.1, 1.1); look.x = e.clientX; look.y = e.clientY; dirty = true; e.stopImmediatePropagation(); }
function lookUp(e) { if (look && e.pointerId === look.id) { look = null; if (V3.walking) e.stopImmediatePropagation(); } }
window.addEventListener('keydown', e => {
  if (!V3.walking) return; const tag = (e.target.tagName || '').toLowerCase(); if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
  const k = e.key.toLowerCase(); if (k === 'escape') { V3.walk(false); e.preventDefault(); e.stopImmediatePropagation(); return; }
  if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift'].includes(k)) { keys.add(k); e.preventDefault(); e.stopImmediatePropagation(); }
}, true);
/* the ordinary 3D view: W A S D / arrows fly the way the camera looks — up and down with it (the turning point comes along),
   Q / E down / up, Shift finer (a quarter of the speed); the mouse still turns, pans and zooms. With machines picked, the arrows nudge them and Q / E
   turn them, as before. */
const FLY = ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'q', 'e'];
let lastF = 0;
window.addEventListener('keydown', e => {
  if (!V3.on || V3.walking || !R || e.ctrlKey || e.metaKey || e.altKey) return; const tag = (e.target.tagName || '').toLowerCase(); if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) return;
  const k = e.key.toLowerCase(); if (k === 'shift') { keys.add(k); return; } if (!FLY.includes(k)) return;
  if ((k.startsWith('arrow') || k === 'q' || k === 'e') && GP.ui.sel && GP.ui.sel.length) return;      // picked machines: nudge / turn them
  keys.add(k); e.preventDefault(); e.stopImmediatePropagation();
}, true);
function flyStep() {
  let f = 0, s = 0, u = 0; if (keys.has('w') || keys.has('arrowup')) f++; if (keys.has('s') || keys.has('arrowdown')) f--; if (keys.has('a') || keys.has('arrowleft')) s--; if (keys.has('d') || keys.has('arrowright')) s++; if (keys.has('e')) u++; if (keys.has('q')) u--;
  const t = performance.now(); if (!f && !s && !u) { lastF = 0; return; } const dt = Math.min(.05, (t - (lastF || t - 16)) / 1000); lastF = t;
  const dir = new THREE.Vector3().subVectors(ctl.target, cam.position); if (dir.lengthSq() < 1e-8) dir.set(0, 0, -1); dir.normalize();      // the way the camera looks, up and down too (looking at the floor, S goes back and up)
  const right = new THREE.Vector3(-dir.z, 0, dir.x); if (right.lengthSq() < 1e-8) right.set(1, 0, 0); right.normalize(); const dist = cam.position.distanceTo(ctl.target), sp = U.clamp(dist * .6, 2.5, 30) * (keys.has('shift') ? .25 : 1) * dt;
  const mv = dir.multiplyScalar(f * sp).add(right.multiplyScalar(s * sp)); mv.y += u * sp;
  cam.position.add(mv); ctl.target.add(mv); if (cam.position.y < .25) { const d = .25 - cam.position.y; cam.position.y += d; ctl.target.y += d; }
  dirty = true; GP.tip.hide();
}
window.addEventListener('keyup', e => { keys.delete(e.key.toLowerCase()); if (!keys.size) lastF = 0; });
window.addEventListener('blur', () => keys.clear());

/* ---------------- snapshots for images / PDF ---------------- */
V3.snapshot = async (w, h, preset) => {
  if (!V3.init()) return null; const wasOn = V3.on; if (!wasOn) { V3.rebuild(); }
  await V3.whenLoaded(); const c0 = cam.clone(); const selKeep = V3.selBox; if (selKeep) sc.remove(selKeep);
  const view = typeof preset === 'object' && preset ? preset : null, shot = new THREE.PerspectiveCamera(view && view.fov || 40, w / h, .1, 400);
  if (view) { shot.position.set(...view.pos); shot.lookAt(new THREE.Vector3(...view.target)); }
  else if (preset) { const p = V3.presets()[preset]; shot.position.set(...p.pos); shot.lookAt(new THREE.Vector3(...p.target)); } else { shot.position.copy(cam.position); shot.quaternion.copy(cam.quaternion); }
  const pr = R.getPixelRatio(); R.setPixelRatio(1); R.setSize(w, h, false); const keep = cam.position.clone(); cam.position.copy(shot.position); solid = !!view; wallFade(); solid = false; cam.position.copy(keep); lightsFor(shot.position); skyAt(shot.position); lightMode(shot.position); R.render(sc, shot); lightsFor(cam.position); skyAt(cam.position); lightMode(cam.position);
  const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(R.domElement, 0, 0);
  R.setPixelRatio(pr); V3.resize(); if (selKeep) sc.add(selKeep); dirty = true; void c0; return c;
};
})();
