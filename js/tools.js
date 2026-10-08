/* GoFit Planner — pointer tools, snapping, pan/zoom, hover info, item actions */
(function () {
'use strict';
const GP = window.GP, U = GP.U, G = GP.G, $ = U.$;
const ui = GP.ui, DEG = U.DEG;
const tools = GP.tools = {};
const act = GP.act = {};
const MAT_SNAP = .26; // blocks are 500 mm, so anything closer than half a block to a wall gets pushed flush

/* ---------------- wall lines for the magnet (room walls + partition faces) ---------------- */
function wallLines() {
  const L = GP.L(), P = L.room.pts, out = [];
  for (let i = 0; i < P.length; i++) { const e = G.edge(P, i); if (e.L > .2) out.push({ a: e.a, b: e.b, L: e.L, dx: e.dx, dz: e.dz, nx: e.nx, nz: e.nz, room: i }); }
  for (const p of L.partitions) { const t = p.thick || .1; for (let i = 0; i < p.pts.length - 1; i++) { const a = p.pts[i], b = p.pts[i + 1], s = G.segInfo(a, b); if (s.L < .2) continue; const nl = [-s.dz, s.dx]; for (const sg of [1, -1]) { const oa = [a[0] + nl[0] * t / 2 * sg, a[1] + nl[1] * t / 2 * sg], ob = [b[0] + nl[0] * t / 2 * sg, b[1] + nl[1] * t / 2 * sg]; out.push({ a: oa, b: ob, L: s.L, dx: s.dx, dz: s.dz, nx: nl[0] * sg, nz: nl[1] * sg, part: p.id }); } } }
  return out;
}
tools.wallLines = wallLines;
function wallSnap(x, z, rot, w, d, o) {
  o = o || {}; const lines = wallLines(); let best = null; const ph = -rot * DEG;
  for (let i = 0; i < lines.length; i++) {
    const W = lines[i]; const rx = x - W.a[0], rz = z - W.a[1]; const t = rx * W.dx + rz * W.dz, s = rx * W.nx + rz * W.nz;
    const phw = Math.atan2(W.nx, W.nz); let k = o.relK != null ? o.relK : Math.round(U.angNorm(ph - phw) / (Math.PI / 2)); k = ((k % 4) + 4) % 4;
    const half = k % 2 ? w / 2 : d / 2, along = k % 2 ? d / 2 : w / 2; let score;
    if (o.force) { const tc = U.clamp(t, 0, W.L); score = Math.hypot(rx - W.dx * tc, rz - W.dz * tc) + (s < -.05 ? 100 : 0); }
    else { if (t < -along * .5 || t > W.L + along * .5) continue; const gap = s - half; if (gap > .4 || gap < -half - .15) continue; score = Math.abs(gap); }
    if (!best || score < best.score) best = { i, W, t, k, half, along, phw, score };
  }
  if (!best) return null;
  const { W, k, half, along, phw } = best; let t = U.snap(best.t, .05);
  t = W.L > 2 * along + .04 ? U.clamp(t, along + .02, W.L - along - .02) : W.L / 2;
  let px = W.a[0] + W.dx * t + W.nx * (half + .02), pz = W.a[1] + W.dz * t + W.nz * (half + .02);
  const nrot = U.normRot(-(phw + k * Math.PI / 2) / DEG);
  const C = G.rectPts(px, pz, nrot, -w / 2, w / 2, -d / 2, d / 2);
  for (let j = 0; j < lines.length; j++) {
    if (j === best.i) continue; const V = lines[j]; let minS = Infinity;
    for (const c of C) { const cx = c[0] - V.a[0], cz = c[1] - V.a[1]; const tj = cx * V.dx + cz * V.dz; if (tj < -.05 || tj > V.L + .05) continue; const sj = cx * V.nx + cz * V.nz; if (sj < minS) minS = sj; }
    if (minS === Infinity || minS > .3 || minS < -1.2) continue; const dd = W.dx * V.nx + W.dz * V.nz; if (Math.abs(dd) < .3) continue;
    const dl = (.02 - minS) / dd; px += W.dx * dl; pz += W.dz * dl; break;
  }
  return { x: U.r3(px), z: U.r3(pz), rot: nrot, k };
}
tools.wallSnap = wallSnap;
function detectRelK(it) {
  const { w, d } = GP.dims(it);
  for (const W of wallLines()) { const phw = Math.atan2(W.nx, W.nz); const diff = U.angNorm(-it.rot * DEG - phw); const k = Math.round(diff / (Math.PI / 2)); if (Math.abs(diff - k * Math.PI / 2) > .02) continue; const kk = ((k % 4) + 4) % 4; const half = kk % 2 ? w / 2 : d / 2; const rx = it.x - W.a[0], rz = it.z - W.a[1]; const s = rx * W.nx + rz * W.nz, t = rx * W.dx + rz * W.dz; if (Math.abs(s - half) < .08 && t > -.1 && t < W.L + .1) return kk; }
  return null;
}
function placeSnap(x, z, rot, w, d, alt, relK, mount) {
  if (alt) return { x: U.r3(x), z: U.r3(z), rot };
  if (ui.magnet || mount === 'wall') { const m = wallSnap(x, z, rot, w, d, { relK, force: mount === 'wall' }); if (m) return m; }
  return { x: U.r3(U.snap(x, .05)), z: U.r3(U.snap(z, .05)), rot };
}
tools.placeSnap = placeSnap;

/* ---------------- point snapping for drawing ---------------- */
function snapPoint(x, z, o) {
  o = o || {}; if (o.alt) return [U.r3(x), U.r3(z)];
  const S = GP.S, L = GP.L(), tol = S.mpp() * 12;
  let best = null, bd = tol;
  const cand = []; L.room.pts.forEach(p => cand.push(p)); L.partitions.forEach(p => p.pts.forEach(q => cand.push(q))); (o.extra || []).forEach(q => cand.push(q));
  L.mats.forEach(m => m.pts.forEach(q => cand.push(q)));
  for (const c of cand) { const dd = Math.hypot(c[0] - x, c[1] - z); if (dd < bd) { bd = dd; best = c.slice(); } }
  if (best) return best;
  if (o.prev && o.shift) { const dx = x - o.prev[0], dz = z - o.prev[1], ang = Math.atan2(dz, dx), l = Math.hypot(dx, dz), a2 = Math.round(ang / (Math.PI / 4)) * Math.PI / 4; return [U.r3(o.prev[0] + Math.cos(a2) * U.snap(l, .05)), U.r3(o.prev[1] + Math.sin(a2) * U.snap(l, .05))]; }
  const P = L.room.pts; for (let i = 0; i < P.length; i++) { const c = G.closest(x, z, P[i], P[(i + 1) % P.length]); if (c.d < tol) { return [U.r3(c.x), U.r3(c.z)]; } }
  let sx = U.snap(x, .05), sz = U.snap(z, .05);
  if (o.prev) { if (Math.abs(sx - o.prev[0]) < tol) sx = o.prev[0]; if (Math.abs(sz - o.prev[1]) < tol) sz = o.prev[1]; }
  return [U.r3(sx), U.r3(sz)];
}
tools.snapPoint = snapPoint;
/* clip subject polygon by a convex clip polygon */
function clipPoly(subject, clip) {
  let out = subject.slice(); const cs = G.area(clip) > 0 ? 1 : -1;
  for (let i = 0; i < clip.length && out.length; i++) {
    const A = clip[i], B = clip[(i + 1) % clip.length]; const inside = p => cs * G.crs(A, B, p) >= -1e-9; const inp = out; out = [];
    for (let j = 0; j < inp.length; j++) { const P = inp[j], Q = inp[(j + 1) % inp.length]; const pi = inside(P), qi = inside(Q); if (pi) out.push(P); if (pi !== qi) { const d1 = G.crs(A, B, P), d2 = G.crs(A, B, Q), t = d1 / (d1 - d2); out.push([P[0] + (Q[0] - P[0]) * t, P[1] + (Q[1] - P[1]) * t]); } }
  }
  const clean = []; out.forEach(p => { const q = [U.r3(p[0]), U.r3(p[1])]; const l = clean[clean.length - 1]; if (!l || Math.hypot(l[0] - q[0], l[1] - q[1]) > .005) clean.push(q); });
  if (clean.length > 2 && Math.hypot(clean[0][0] - clean[clean.length - 1][0], clean[0][1] - clean[clean.length - 1][1]) < .005) clean.pop();
  // drop collinear points
  const res = []; for (let i = 0; i < clean.length; i++) { const a = clean[(i - 1 + clean.length) % clean.length], b = clean[i], c = clean[(i + 1) % clean.length]; if (Math.abs(G.crs(a, b, c)) > 1e-6) res.push(b); }
  return res.length >= 3 ? res : clean;
}
tools.clipPoly = clipPoly;
function clipToRoom(poly) { const room = GP.L().room.pts; const r = clipPoly(room, poly); return r.length >= 3 ? r : poly; }
function isConvex(P) { let s = 0; for (let i = 0; i < P.length; i++) { const c = G.crs(P[i], P[(i + 1) % P.length], P[(i + 2) % P.length]); if (Math.abs(c) < 1e-9) continue; if (!s) s = Math.sign(c); else if (Math.sign(c) !== s) return false; } return true; }

/* ---------------- rubber mats flush to walls ---------------- */
function obstacleEdges(exceptMat) {
  const L = GP.L(), room = [], hard = []; const P = L.room.pts;
  for (let i = 0; i < P.length; i++) room.push([P[i], P[(i + 1) % P.length]]);
  for (const p of L.partitions) { const t = p.thick || .1; const A = G.offset(p.pts, t / 2, false), B = G.offset(p.pts, -t / 2, false); for (let i = 0; i < p.pts.length - 1; i++) { hard.push([A[i], A[i + 1]]); hard.push([B[i], B[i + 1]]); hard.push([A[i], B[i]]); hard.push([A[i + 1], B[i + 1]]); } }
  for (const m of L.mats) { if (m === exceptMat) continue; for (let i = 0; i < m.pts.length; i++) hard.push([m.pts[i], m.pts[(i + 1) % m.pts.length]]); }
  return { room, hard };
}
/* rectangle [x0,z0,x1,z1]: push every side that is within MAT_SNAP of a wall / partition / other mat until it touches it */
function snapRect(x0, z0, x1, z1, exceptMat) {
  const ob = obstacleEdges(exceptMat); const r = { x0, z0, x1, z1 };
  const sides = [['x0', -1, 0], ['x1', 1, 0], ['z0', 0, -1], ['z1', 0, 1]];
  for (const [k, dx, dz] of sides) {
    const along = dx ? [r.z0, r.z1] : [r.x0, r.x1]; const n = 7; let dR = Infinity, dH = Infinity;
    for (let i = 0; i < n; i++) {
      const u = along[0] + (along[1] - along[0]) * (i === 0 ? .01 : i === n - 1 ? .99 : i / (n - 1));
      const px = dx ? r[k] : u, pz = dx ? u : r[k];
      const px0 = px - dx * .005, pz0 = pz - dz * .005;
      dR = Math.min(dR, G.rayHit(px0, pz0, dx, dz, ob.room, 5) - .005); dH = Math.min(dH, G.rayHit(px0, pz0, dx, dz, ob.hard, 5) - .005);
    }
    if (dH <= MAT_SNAP && dH <= dR + .001) r[k] += (dx || dz) * Math.max(0, dH);
    else if (dR <= MAT_SNAP) r[k] += (dx || dz) * (MAT_SNAP + .04); // overshoot, the room clip trims it back onto the wall (works for slanted walls too)
  }
  return clipToRoom([[r.x0, r.z0], [r.x1, r.z0], [r.x1, r.z1], [r.x0, r.z1]].map(p => [U.r3(p[0]), U.r3(p[1])]));
}
/* free polygon: move vertices that are near a wall line onto it (corners onto the corner) */
function snapPolyVerts(pts, exceptMat) {
  const L = GP.L(), P = L.room.pts;
  return pts.map(p => {
    let best = null; const near = [];
    for (let i = 0; i < P.length; i++) { const c = G.closest(p[0], p[1], P[i], P[(i + 1) % P.length]); if (c.d <= MAT_SNAP) near.push({ i, c }); }
    for (const v of P) if (Math.hypot(v[0] - p[0], v[1] - p[1]) <= MAT_SNAP * 1.5) best = v.slice();
    if (!best && near.length) { near.sort((a, b) => a.c.d - b.c.d); best = [near[0].c.x, near[0].c.z]; }
    return best ? [U.r3(best[0]), U.r3(best[1])] : p;
  });
}
function isAxisRect(pts) { if (pts.length !== 4) return false; const b = G.bounds(pts); return pts.every(p => (Math.abs(p[0] - b.minX) < 1e-4 || Math.abs(p[0] - b.maxX) < 1e-4) && (Math.abs(p[1] - b.minZ) < 1e-4 || Math.abs(p[1] - b.maxZ) < 1e-4)); }
tools.snapMat = (m) => { if (isAxisRect(m.pts)) { const b = G.bounds(m.pts); m.pts = snapRect(b.minX, b.minZ, b.maxX, b.maxZ, m); } else m.pts = snapPolyVerts(m.pts, m); };

/* ---------------- plan-space hit tests for non-item objects ---------------- */
function hitObject(x, z, cx, cy) {
  const L = GP.L(), S = GP.S, tol = S.mpp() * 8, st = ui.step;
  // notes & room labels (drawn on the canvas in screen space)
  const r = S.canvas.getBoundingClientRect(), sx = cx - r.left, sy = cy - r.top;
  if (S.layers.notes) for (const n of L.notes.slice().reverse()) { const [px, py] = S.toScreen(n.x, 0, n.z); if (Math.hypot(sx - px, sy - py) < 10 || (sx > px + 4 && sx < px + 200 && sy > py - 30 && sy < py - 2)) return { k: 'note', id: n.id }; }
  for (const rm of L.rooms) { const [px, py] = S.toScreen(rm.x, 0, rm.z); if (Math.abs(sx - px) < 48 && Math.abs(sy - py) < 18) return { k: 'room', id: rm.id }; }
  if (S.layers.dims) for (const d of L.dims) if (G.closest(x, z, d.a, d.b).d < tol) return { k: 'dim', id: d.id };
  if (st === 'space') {
    for (const o of L.openings) { const hs = GP.hostSeg(o); if (!hs) continue; const c = G.closest(x, z, hs.a, hs.b); const sp = GP.openingSpan(o, hs); if (c.t >= sp.s0 - .05 && c.t <= sp.s1 + .05 && c.d < hs.thick / 2 + Math.abs(hs.mid) + tol + .15) return { k: 'opening', id: o.id }; }
    for (const p of L.partitions) for (let i = 0; i < p.pts.length - 1; i++) if (G.closest(x, z, p.pts[i], p.pts[i + 1]).d < (p.thick || .1) / 2 + tol) return { k: 'part', id: p.id };
    const P = L.room.pts; for (let i = 0; i < P.length; i++) { const e = G.edge(P, i); const c = G.closest(x, z, e.a, e.b); if (c.t > .05 && c.t < e.L - .05) { const s = (x - e.a[0]) * e.nx + (z - e.a[1]) * e.nz; if (s < tol && s > -GP.WALL_T - tol) return { k: 'wall', id: i }; } }
  }
  if (st === 'floor') {
    if (S.layers.zones) for (const zn of L.zones.slice().reverse()) { const c = G.labelPoint(zn.pts); const [px, py] = S.toScreen(c[0], 0, c[1]); if (Math.abs(sx - px) < 50 && Math.abs(sy - py) < 18) return { k: 'zone', id: zn.id }; }
    const m = S.matAt(x, z); if (m) return { k: 'mat', id: m.id };
    if (S.layers.zones) for (const zn of L.zones.slice().reverse()) if (G.pip(x, z, zn.pts)) return { k: 'zone', id: zn.id };
  }
  return null;
}

/* ---------------- state ---------------- */
let drag = null, press = null, draw = null, lastHover = 0, hover = null;
const pointers = new Map(); let pinch = null;
tools.cancel = () => {
  if (ui.placing) { ui.placing = null; GP.S.clearGhost(); GP.emit('placing'); }
  if (tools.selVs) tools.selVs.clear();
  draw = null; drag = null; press = null; hover = null; tools.preview = null; if (GP.S.canvas) GP.S.canvas.style.cursor = ''; $('#ovMarquee').hidden = true; GP.emit('overlay'); ui.setHint(); GP.S.invalidate();
};
tools.getDraw = () => draw; tools.getHover = () => hover;
tools.openingWidth = k => ({ door: .9, door2: 1.6, glass2: 1.8, slide: 1.0, opening: 1.0, window: 1.2 }[k] || .9);
const canvas = () => GP.S.canvas;

/* ---------------- placing (catalog / sets / paste) ---------------- */
tools.startPlacing = (list, o) => {
  tools.cancel(); if (ui.step !== 'place') ui.setStep('place'); if (ui.tool !== 'select') ui.setTool('select'); ui.clearSel();
  ui.placing = { list: list.map(q => Object.assign({ rel: [0, 0, 0] }, q)), rot: 0, relK: 0, x: null, z: null, keep: !!(o && o.keep), label: o && o.label };
  GP.S.setGhost(ui.placing.list.map(q => q.it)); canvas().style.cursor = 'crosshair'; ui.setHint(); GP.emit('placing');
};
function ghostUpdate(cx, cy, alt) { if (ui.placing && GP.S.ghost) ghostAt(GP.S.floorAt(cx, cy), alt); }
function ghostAt(fp, alt) {
  const pl = ui.placing, S = GP.S; if (!pl || !S.ghost) return;
  const single = pl.list.length === 1; let ax = fp.x, az = fp.z, rot = pl.rot;
  if (single) { const it = pl.list[0].it; const d = GP.dims(it); const r = placeSnap(fp.x, fp.z, pl.rot, d.w, d.d, alt, pl.relK, GP.mountOf(it)); ax = r.x; az = r.z; rot = r.rot; }
  else if (!alt) { ax = U.snap(ax, .05); az = U.snap(az, .05); }
  pl.x = ax; pl.z = az;
  pl.placed = pl.list.map((q, i) => { const [rx, rz, rr] = q.rel; const [wx, wz] = G.l2w(ax, az, single ? 0 : pl.rot, rx, rz); return Object.assign({}, q.it, { x: wx, z: wz, rot: single ? rot : U.normRot(rr + pl.rot), uid: '_g' + i }); });
  S.ghost.items = pl.placed; S.ghost.bad = pl.placed.map(ghostBad); S.ghost.visible = true; S.invalidate();
}
function ghostBad(t) { const C = GP.footprint(t); if (!G.rectInside(C, GP.L().room.pts)) return true; const d = GP.getDef(t.type) || {}; if (d.flat || d.wall || GP.mountOf(t) !== 'floor') return false; for (const it of GP.L().items) { const e = GP.getDef(it.type) || {}; if (e.flat || e.wall || GP.mountOf(it) !== 'floor') continue; if (G.overlap(C, GP.footprint(it))) return true; } return false; }
function placeGhost(keep) {
  const pl = ui.placing; if (!pl || !pl.placed || !GP.S.ghost || !GP.S.ghost.visible) return;
  const L = GP.L(), added = [];
  pl.placed.forEach(p => { const it = Object.assign({}, p, { uid: U.uid() }); L.items.push(it); added.push(it); });
  GP.changed('items');
  if (!keep && !pl.keep) { tools.cancel(); ui.select(added.map(it => ({ k: 'item', id: it.uid }))); }
  GP.panels && GP.panels.pushRecent(added[0].type);
}
tools.rotateGhost = (delta) => { const pl = ui.placing; if (!pl) return; pl.rot = U.normRot(pl.rot + delta); if (Math.abs(delta) % 90 === 0) pl.relK = ((pl.relK - Math.round(delta / 90)) % 4 + 4) % 4; if (GP.V3 && GP.V3.on) GP.V3.ghostRefresh(); else if (tools.lastMove) ghostUpdate(tools.lastMove[0], tools.lastMove[1], false); };
tools.ghostAt = ghostAt; tools.placeGhost = placeGhost;

/* ---------------- hover: highlight + price tooltip ---------------- */
tools.hoverAt = (e) => {
  const S = GP.S; const fp = S.floorAt(e.clientX, e.clientY); let h = null, html = '';
  const uid = S.itemAt(fp.x, fp.z);
  if (uid) { const it = GP.findItem(uid); if (it) { h = { k: 'item', id: uid }; html = GP.info.item(it); } }
  if (!h) { const m = S.matAt(fp.x, fp.z); if (m && (GP.viewOnly || ui.step === 'floor' || true)) { h = { k: 'mat', id: m.id }; html = GP.info.mat(m); } }
  if (!h && !GP.viewOnly && ui.step === 'space') { const o = hitObject(fp.x, fp.z, e.clientX, e.clientY); if (o && (o.k === 'opening' || o.k === 'part')) { h = o; if (o.k === 'opening') html = GP.info.opening(GP.findBy('opening', o.id)); } }
  const prev = S.hover; S.hover = h; if (!prev !== !h || (prev && h && (prev.k !== h.k || prev.id !== h.id))) S.invalidate();
  if (html && !press && !drag) GP.tip.show(e.clientX, e.clientY, html); else GP.tip.hide();
  canvas().style.cursor = h && h.k === 'item' ? (GP.viewOnly ? 'pointer' : 'grab') : h ? 'pointer' : '';
};
tools.clearHover = () => { if (GP.S.hover) { GP.S.hover = null; GP.S.invalidate(); } GP.tip.hide(); };

/* ---------------- canvas pointer handlers ---------------- */
tools.attach = (cv) => {
  cv.addEventListener('wheel', e => { e.preventDefault(); const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY; GP.S.zoomAt(e.clientX, e.clientY, Math.pow(1.0016, -dy)); if (ui.placing && tools.lastMove) ghostUpdate(tools.lastMove[0], tools.lastMove[1], e.altKey); }, { passive: false });
  cv.addEventListener('pointerdown', onDown);
  cv.addEventListener('pointermove', onMove);
  cv.addEventListener('pointerup', onUp);
  cv.addEventListener('pointercancel', onUp);
  cv.addEventListener('dblclick', onDbl);
  cv.addEventListener('pointerleave', () => { if (GP.S.ghost && !press) { GP.S.ghost.visible = false; GP.S.invalidate(); } if (!press && !drag) tools.clearHover(); });
  cv.addEventListener('contextmenu', e => e.preventDefault());
};
/* Space held: a left drag moves the view (box select is the plain drag now) */
let spaceDown = false;
window.addEventListener('keydown', e => { if (e.code !== 'Space' || e.repeat) return; const tg = (e.target.tagName || '').toLowerCase(); if (tg === 'input' || tg === 'textarea' || tg === 'select' || tg === 'button') return; if (!GP.S.canvas || (GP.V3 && GP.V3.on)) return; spaceDown = true; GP.S.canvas.style.cursor = 'grab'; e.preventDefault(); });
window.addEventListener('keyup', e => { if (e.code === 'Space') { spaceDown = false; if (GP.S.canvas && !press) GP.S.canvas.style.cursor = ''; } });
window.addEventListener('blur', () => { spaceDown = false; });
const boxSelect = e => e.pointerType !== 'touch';
function startPinch() { const [a, b] = [...pointers.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 }; press = null; drag = null; draw = draw && draw.rect ? null : draw; $('#ovMarquee').hidden = true; }
function onDown(e) {
  const S = GP.S; pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 2) { startPinch(); return; }
  if (drag) return;
  try { canvas().setPointerCapture(e.pointerId); } catch (_) { }
  if (e.button === 1 || e.button === 2 || (spaceDown && e.button === 0)) { press = { pan: true, x: e.clientX, y: e.clientY, moved: true }; canvas().style.cursor = 'grabbing'; return; }
  if (e.button !== 0) return;
  if (GP.viewOnly) { press = { x: e.clientX, y: e.clientY, view: true }; return; }
  if (ui.placing) { press = { placing: true }; ghostUpdate(e.clientX, e.clientY, e.altKey); return; }
  const fp = S.floorAt(e.clientX, e.clientY);
  const t = ui.tool;
  if (t !== 'select') { if (toolDown(t, e, fp)) return; }
  if (t !== 'select') { press = { x: e.clientX, y: e.clientY }; return; }
  const uid = ui.step !== 'floor' ? S.itemAt(fp.x, fp.z) : null;
  const add = e.shiftKey || ui.multi;
  if (uid) {
    const key = 'item:' + uid; const cur = ui.selSet();
    if (add) { ui.select([{ k: 'item', id: uid }], true); if (!ui.selSet().has(key)) return; }
    else if (!cur.has(key)) ui.select([{ k: 'item', id: uid }]);
    const its = ui.selItems(); const it = GP.findItem(uid);
    drag = { kind: 'items', anchor: uid, sx: e.clientX, sy: e.clientY, moved: false, fx: fp.x, fz: fp.z, start: its.map(q => ({ uid: q.uid, x: q.x, z: q.z })), relK: its.length === 1 ? detectRelK(it) : null, ox: it.x - fp.x, oz: it.z - fp.z };
    GP.tip.hide(); canvas().style.cursor = 'grabbing'; return;
  }
  const obj = hitObject(fp.x, fp.z, e.clientX, e.clientY);
  if (obj) {
    if (!(ui.sel.length === 1 && ui.sel[0].k === obj.k && ui.sel[0].id === obj.id)) ui.select([obj]);
    if (obj.k !== 'wall') { const o = GP.findBy(obj.k, obj.id); drag = { kind: obj.k, obj: o, sx: e.clientX, sy: e.clientY, moved: false, fx: fp.x, fz: fp.z, snap: JSON.stringify(o) }; }
    return;
  }
  if (e.shiftKey || (boxSelect(e) && ui.step !== 'floor')) { press = { marquee: true, add: e.shiftKey, x: e.clientX, y: e.clientY }; return; }
  press = { pan: true, x: e.clientX, y: e.clientY, moved: false };
}
function onMove(e) {
  const S = GP.S; tools.lastMove = [e.clientX, e.clientY];
  if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pinch && pointers.size === 2) { const [a, b] = [...pointers.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y), cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2; S.panBy(cx - pinch.cx, cy - pinch.cy); if (pinch.d > 10) S.zoomAt(cx, cy, d / pinch.d); pinch = { d, cx, cy }; return; }
  if (ui.placing) { ghostUpdate(e.clientX, e.clientY, e.altKey); return; }
  if (press && press.pan) { const dx = e.clientX - press.x, dy = e.clientY - press.y; if (!press.moved && Math.hypot(dx, dy) < 4) return; press.moved = true; S.panBy(dx, dy); press.x = e.clientX; press.y = e.clientY; canvas().style.cursor = 'grabbing'; GP.tip.hide(); return; }
  if (press && press.view) { const dx = e.clientX - press.x, dy = e.clientY - press.y; if (!press.moved && Math.hypot(dx, dy) < 5) return; press.moved = true; S.panBy(dx, dy); press.x = e.clientX; press.y = e.clientY; GP.tip.hide(); return; }
  if (press && press.marquee) { const m = $('#ovMarquee'); const r = S.canvas.getBoundingClientRect(); const x0 = Math.min(press.x, e.clientX) - r.left, y0 = Math.min(press.y, e.clientY) - r.top; m.hidden = false; m.style.left = x0 + 'px'; m.style.top = y0 + 'px'; m.style.width = Math.abs(e.clientX - press.x) + 'px'; m.style.height = Math.abs(e.clientY - press.y) + 'px'; return; }
  if (draw) { toolMove(e); return; }
  if (drag) { dragMove(e); return; }
  if (ui.tool !== 'select' && !GP.viewOnly) { toolHover(e); return; }
  if (e.pointerType === 'mouse' && !press && e.buttons === 0) { const now = performance.now(); if (now - lastHover > 40) { lastHover = now; tools.hoverAt(e); } }
}
function onUp(e) {
  const S = GP.S; const wasPinch = !!pinch; pointers.delete(e.pointerId); if (pinch) { if (pointers.size < 2) pinch = null; press = null; return; }
  if (wasPinch) return;
  if (press && press.pan) { const moved = press.moved; press = null; canvas().style.cursor = ''; if (!moved && e.type !== 'pointercancel' && !ui.multi) ui.clearSel(); return; }
  if (press && press.view) { const moved = press.moved; press = null; if (!moved && e.type !== 'pointercancel') viewerTap(e); return; }
  if (press && press.placing) { press = null; if (e.type !== 'pointercancel') placeGhost(e.shiftKey); return; }
  if (press && press.marquee) {
    $('#ovMarquee').hidden = true; const r = S.canvas.getBoundingClientRect(); const x0 = Math.min(press.x, e.clientX) - r.left, x1 = Math.max(press.x, e.clientX) - r.left, y0 = Math.min(press.y, e.clientY) - r.top, y1 = Math.max(press.y, e.clientY) - r.top;
    const add = press.add, tiny = x1 - x0 < 4 && y1 - y0 < 4;      // a click (no box): clears the selection unless Shift is held
    if (press.verts) { const tg = tools.polyTarget(); press = null; if (tg) { if (!add) tools.selVs.clear(); if (!tiny) tg.pts.forEach((p, k) => { const [sx, sy] = S.toScreen(p[0], 0, p[1]); if (sx >= x0 && sx <= x1 && sy >= y0 && sy <= y1) tools.selVs.add(k); }); tools.selV = tools.selVs.size ? [...tools.selVs][tools.selVs.size - 1] : -1; GP.emit('overlay'); S.invalidate(); } return; }
    const hits = tiny ? [] : GP.L().items.filter(it => { const [sx, sy] = S.toScreen(it.x, 0, it.z); return sx >= x0 && sx <= x1 && sy >= y0 && sy <= y1; }).map(it => ({ k: 'item', id: it.uid }));
    press = null; if (hits.length) ui.select(hits, add); else if (!add && !ui.multi) ui.clearSel(); return;
  }
  if (draw) { toolUp(e); return; }
  if (drag) {
    const d = drag; drag = null; canvas().style.cursor = '';
    if (d.moved) { if (d.kind === 'mat') tools.snapMat(d.obj); GP.changed(d.kind === 'items' ? 'items' : d.kind); ui.renderInspector(); }
    return;
  }
  press = null;
}
/* viewer: tap shows info; tap on equipment with a 3D model opens it */
function viewerTap(e) {
  const S = GP.S, fp = S.floorAt(e.clientX, e.clientY); const uid = S.itemAt(fp.x, fp.z, 6);
  if (uid) { const it = GP.findItem(uid); S.hover = { k: 'item', id: uid }; S.invalidate(); if (GP.R3.hasModel(it.type) || GP.media.photos(it.type).length) { GP.tip.hide(); GP.M3.open(it); } else GP.tip.show(e.clientX, e.clientY, GP.info.item(it)); return; }
  const m = S.matAt(fp.x, fp.z); if (m) { S.hover = { k: 'mat', id: m.id }; S.invalidate(); GP.tip.show(e.clientX, e.clientY, GP.info.mat(m)); return; }
  tools.clearHover();
}
function onDbl(e) {
  if (draw && (draw.tool === 'part' || draw.tool === 'matPoly')) { finishDraw(); return; }
  if (GP.viewOnly || ui.placing || ui.tool !== 'select') return;
  const fp = GP.S.floorAt(e.clientX, e.clientY); const uid = GP.S.itemAt(fp.x, fp.z); if (uid) { const it = GP.findItem(uid); GP.M3.open(it); }
}
/* move the dragged selection to floor point fp: one item snaps (walls, 5 cm grid), several move together on the grid */
function moveItems(d, fp, alt) {
  const anchor = GP.findItem(d.anchor); if (!anchor) return;
  if (d.start.length === 1) { const dm = GP.dims(anchor); const r = placeSnap(fp.x + d.ox, fp.z + d.oz, anchor.rot, dm.w, dm.d, alt, d.relK, GP.mountOf(anchor)); anchor.x = r.x; anchor.z = r.z; anchor.rot = r.rot; }
  else { let dx = fp.x - d.fx, dz = fp.z - d.fz; if (!alt) { const a0 = d.start.find(s => s.uid === d.anchor); dx = U.snap(a0.x + dx, .05) - a0.x; dz = U.snap(a0.z + dz, .05) - a0.z; } d.start.forEach(s => { const it = GP.findItem(s.uid); if (it) { it.x = U.r3(s.x + dx); it.z = U.r3(s.z + dz); } }); }
  GP.checks.quick(); ui.updateDistances(); GP.S.invalidate(); GP.emit('overlay'); GP.emit('dragging');
}
tools.moveItems = moveItems; tools.relK = it => detectRelK(it);
function dragMove(e) {
  const S = GP.S; const d = drag;
  if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 4) return;
  d.moved = true; const fp = S.floorAt(e.clientX, e.clientY);
  if (d.kind === 'items') { moveItems(d, fp, e.altKey); return; }
  let dx = fp.x - d.fx, dz = fp.z - d.fz; if (!e.altKey) { dx = U.snap(dx, .05); dz = U.snap(dz, .05); }
  const orig = JSON.parse(d.snap), o = d.obj;
  if (d.kind === 'opening') { const hs = GP.hostSeg(o); if (!hs) return; const c = G.closest(fp.x, fp.z, hs.a, hs.b); o.t = U.r3(U.clamp(e.altKey ? c.t : U.snap(c.t, .05), o.w / 2, hs.L - o.w / 2)); S.invalidate(); GP.emit('overlay'); return; }
  if (o.pts) { o.pts = orig.pts.map(p => [U.r3(p[0] + dx), U.r3(p[1] + dz)]); }
  else if (o.a) { o.a = [U.r3(orig.a[0] + dx), U.r3(orig.a[1] + dz)]; o.b = [U.r3(orig.b[0] + dx), U.r3(orig.b[1] + dz)]; }
  else if (o.x != null) { o.x = U.r3(orig.x + dx); o.z = U.r3(orig.z + dz); }
  S.dataChanged(); GP.emit('overlay');
}

/* ---------------- tool-specific handlers ---------------- */
function toolDown(t, e, fp) {
  const S = GP.S, L = GP.L();
  if (t === 'vertex') {
    const P = L.room.pts, n = P.length, tol = S.mpp() * 9; let best = -1, bd = Infinity;
    for (let i = 0; i < n; i++) { const c = G.closest(fp.x, fp.z, P[i], P[(i + 1) % n]); if (c.d < bd) { bd = c.d; best = i; } }
    const target = tools.polyTarget();
    if (best >= 0 && bd < tol) {
      const a = best, b = (best + 1) % n, Sv = tools.selVs;
      if (e.shiftKey) { if (Sv.has(a) && Sv.has(b)) { Sv.delete(a); Sv.delete(b); tools.selV = Sv.size ? [...Sv][Sv.size - 1] : -1; GP.emit('overlay'); S.invalidate(); return true; } Sv.add(a); Sv.add(b); }
      else if (!(Sv.has(a) && Sv.has(b))) { Sv.clear(); Sv.add(a); Sv.add(b); }
      tools.selV = b; const ed = G.edge(P, a);
      startMulti(target, a, fp, Sv.size === 2 ? { nx: ed.nx, nz: ed.nz } : null); try { canvas().setPointerCapture(e.pointerId); } catch (_) { }
      GP.emit('overlay'); S.invalidate(); return true;
    }
    if (e.shiftKey || boxSelect(e)) { press = { marquee: true, verts: true, add: e.shiftKey, x: e.clientX, y: e.clientY }; return true; }
    if (tools.selVs.size) { selOnly(-1); GP.emit('overlay'); S.invalidate(); }
    press = { pan: true, x: e.clientX, y: e.clientY, moved: true }; return true;
  }
  if (t === 'part') {
    const p = snapPoint(fp.x, fp.z, { alt: e.altKey, prev: draw && draw.pts[draw.pts.length - 1], shift: e.shiftKey });
    if (!draw) { draw = { tool: 'part', pts: [p], cur: p, num: '' }; if (ui.sel.length) ui.clearSel(); }   // the inspector closes so the drawing bar has room
    else { const last = draw.pts[draw.pts.length - 1]; if (G.len(last, p) > .05) draw.pts.push(p); else if (draw.pts.length >= 2) finishDraw(); }
    GP.emit('overlay'); return true;
  }
  if (t === 'matPoly') {
    const p = snapPoint(fp.x, fp.z, { alt: e.altKey, prev: draw && draw.pts[draw.pts.length - 1], shift: e.shiftKey });
    if (!draw) draw = { tool: t, pts: [p], cur: p };
    else { if (draw.pts.length >= 3 && G.len(draw.pts[0], p) < S.mpp() * 14) { finishDraw(); return true; } const last = draw.pts[draw.pts.length - 1]; if (G.len(last, p) > .05) draw.pts.push(p); }
    GP.emit('overlay'); return true;
  }
  if (t === 'matRect' || t === 'zoneRect') { const p = snapPoint(fp.x, fp.z, { alt: e.altKey }); draw = { tool: t, a: p, b: p, rect: true }; GP.emit('overlay'); return true; }
  if (t === 'measure') { const p = snapPoint(fp.x, fp.z, { alt: e.altKey, prev: draw && draw.a, shift: e.shiftKey }); if (!draw) { draw = { tool: 'measure', a: p, b: p }; } else { const d = { id: U.uid('d'), a: draw.a, b: p }; if (G.len(d.a, d.b) > .02) { L.dims.push(d); draw = null; GP.changed('annot'); ui.select([{ k: 'dim', id: d.id }]); GP.toast(`길이 ${G.len(d.a, d.b).toFixed(2)} m`); } } GP.emit('overlay'); return true; }
  if (t === 'note') { const n = { id: U.uid('n'), x: U.r3(fp.x), z: U.r3(fp.z), text: '', _new: true }; L.notes.push(n); GP.changed('annot'); ui.setTool('select'); ui.select([{ k: 'note', id: n.id }]); return true; }
  if (t === 'roomlabel') { if (!G.pip(fp.x, fp.z, L.room.pts)) { GP.toast('방 안쪽을 눌러 주세요', { bad: true }); return true; } const r = { id: U.uid('r'), x: U.r3(fp.x), z: U.r3(fp.z), name: '공간 이름', _new: true }; L.rooms.push(r); GP.changed('annot'); ui.setTool('select'); ui.select([{ k: 'room', id: r.id }]); return true; }
  if (t === 'opening') { const h = openingHover(fp); if (!h) { GP.toast('벽이나 가벽 가까이를 눌러 주세요', { bad: true }); return true; } const k = ui.openingKind; const w = tools.openingWidth(k); const o = { id: U.uid('o'), host: h.host, seg: h.seg, t: U.r3(U.clamp(U.snap(h.t, .05), w / 2, h.L - w / 2)), w, h: k === 'window' ? 1.2 : 2.1, sill: .9, kind: k }; L.openings.push(o); tools.preview = null; GP.changed('openings'); ui.setTool('select'); ui.select([{ k: 'opening', id: o.id }]); return true; }
  if (t === 'fillwall') { const h = wallHover(fp); if (!h) { GP.toast('벽 가까이를 눌러 주세요', { bad: true }); return true; } GP.panels.fillWallDialog(h); return true; }
  return false;
}
function toolMove(e) {
  const S = GP.S, fp = S.floorAt(e.clientX, e.clientY);
  if (draw.rect) { draw.b = snapPoint(fp.x, fp.z, { alt: e.altKey }); }
  else if (draw.tool === 'measure') draw.b = snapPoint(fp.x, fp.z, { alt: e.altKey, prev: draw.a, shift: e.shiftKey });
  else draw.cur = snapPoint(fp.x, fp.z, { alt: e.altKey, prev: draw.pts[draw.pts.length - 1], shift: e.shiftKey });
  GP.emit('overlay'); S.invalidate();
}
function toolHover(e) {
  const S = GP.S, fp = S.floorAt(e.clientX, e.clientY);
  if (draw) { toolMove(e); return; }
  if (ui.tool === 'opening') { tools.preview = openingHover(fp); GP.emit('overlay'); }
  else if (ui.tool === 'fillwall') { hover = wallHover(fp); GP.emit('overlay'); }
  else if (['part', 'matPoly', 'measure'].includes(ui.tool)) { hover = { snap: snapPoint(fp.x, fp.z, { alt: e.altKey }) }; GP.emit('overlay'); }
}
function toolUp() {
  if (!draw || !draw.rect) return; const L = GP.L();
  const a = draw.a, b = draw.b, t = draw.tool; draw = null;
  if (Math.abs(a[0] - b[0]) < .1 || Math.abs(a[1] - b[1]) < .1) { GP.emit('overlay'); return; }
  const x0 = Math.min(a[0], b[0]), x1 = Math.max(a[0], b[0]), z0 = Math.min(a[1], b[1]), z1 = Math.max(a[1], b[1]);
  if (t === 'matRect') addMat(snapRect(x0, z0, x1, z1, null));
  else if (t === 'zoneRect') { const z = { id: U.uid('z'), pts: clipToRoom([[x0, z0], [x1, z0], [x1, z1], [x0, z1]]), name: '존 ' + (L.zones.length + 1), color: ['#2f6bd8', '#e0622b', '#13906f', '#7a5bd0', '#c0507f'][L.zones.length % 5] }; L.zones.push(z); GP.changed('zones'); ui.select([{ k: 'zone', id: z.id }]); }
  GP.emit('overlay');
}
function addMat(poly) { const L = GP.L(), pb = GP.panels.matBrush(); const m = { id: U.uid('m'), pts: poly, block: pb.block, thick: 25, trim: pb.trim }; L.mats.push(m); GP.changed('mats'); ui.select([{ k: 'mat', id: m.id }]); GP.toast(`${GP.BLOCKS[m.block].name} · ${GP.calc.matBlocks(m)}장`); return m; }
tools.addMat = addMat;
function finishDraw() {
  const L = GP.L(); if (!draw) return;
  if (draw.tool === 'part') { if (draw.pts.length >= 2) { const kind = tools.partKind || 'wall', p = { id: U.uid('pt'), pts: draw.pts, thick: kind === 'glass' ? .06 : .1, kind }; L.partitions.push(p); draw = null; GP.changed('parts'); if (GP.wiz && GP.wiz.on) ui.setTool('select'); ui.select([{ k: 'part', id: p.id }]); GP.toast('가벽을 만들었어요. 오른쪽에서 종류·두께를 바꿀 수 있어요'); } else draw = null; }
  else if (draw.tool === 'matPoly') { if (draw.pts.length >= 3) { const poly = snapPolyVerts(draw.pts); draw = null; addMat(isConvex(poly) ? clipToRoom(poly) : poly); } else draw = null; }
  GP.emit('overlay');
}
/* drawing a partition / a mat outline: a bar stays on screen the whole time with what to do next and
   buttons for it (finishing needs no double click) */
const dbar = document.createElement('div'); dbar.className = 'drawbar'; dbar.hidden = true;
dbar.innerHTML = `<div class="db-t"><b class="db-title"></b><span class="db-info"></span></div><div class="db-b"><button class="btn sm primary" data-db="done">완료 <kbd>Enter</kbd></button><button class="btn sm" data-db="undo">마지막 점 지우기</button><button class="btn sm ghost" data-db="cancel">취소 <kbd>Esc</kbd></button></div>`;
$('#stage').appendChild(dbar);
function drawBar() {
  const t = ui.tool, on = !GP.viewOnly && (t === 'part' || t === 'matPoly') && !(GP.V3 && GP.V3.on); dbar.hidden = !on; if (!on) return;
  const d = draw && draw.tool === t ? draw : null, n = d ? d.pts.length : 0, part = t === 'part', need = part ? 2 : 3;
  let len = 0; if (d) for (let i = 1; i < n; i++) len += G.len(d.pts[i - 1], d.pts[i]);
  dbar.querySelector('.db-title').textContent = part ? (d ? `가벽 그리는 중 · 점 ${n}개 · 길이 ${len.toFixed(2)}m` : '가벽 그리기') : (d ? `구역 그리는 중 · 점 ${n}개` : '고무블럭 구역 그리기');
  dbar.querySelector('.db-info').innerHTML = !d ? (part ? '시작할 곳을 <b>클릭</b>하세요. 계속 클릭하면 꺾여요.' : '모서리를 차례로 <b>클릭</b>하세요.')
    : d.num ? `길이 <b>${d.num} m</b> 입력 중 · <kbd>Enter</kbd>로 확정`
    : n < need ? (part ? '다음 점을 <b>클릭</b>하세요. 숫자를 치고 Enter를 누르면 그 길이로 그려져요.' : '다음 모서리를 <b>클릭</b>하세요.')
    : (part ? '끝내려면 마지막 점에서 <b>더블클릭</b>하거나 <b>완료</b>를 누르세요.' : '첫 점을 누르거나 <b>더블클릭</b>, 또는 <b>완료</b>를 누르면 완성돼요.');
  dbar.querySelector('[data-db="done"]').hidden = n < need; dbar.querySelector('[data-db="undo"]').hidden = !d;
}
tools.drawBar = drawBar;
dbar.addEventListener('click', e => {
  const b = e.target.closest('[data-db]'); if (!b) return; const a = b.dataset.db;
  if (a === 'done') finishDraw();
  else if (a === 'undo') { if (draw) { if (draw.pts.length > 1) draw.pts.pop(); else draw = null; } GP.emit('overlay'); }
  else if (a === 'cancel') { if (draw) { draw = null; GP.emit('overlay'); } else ui.setTool('select'); }
  drawBar();
});
GP.on('overlay', drawBar); GP.on('tool', drawBar); GP.on('step', drawBar);
function openingHover(fp) {
  const L = GP.L(), tol = .45; let best = null;
  const P = L.room.pts; for (let i = 0; i < P.length; i++) { const e = G.edge(P, i); const c = G.closest(fp.x, fp.z, e.a, e.b); const s = (fp.x - e.a[0]) * e.nx + (fp.z - e.a[1]) * e.nz; const d = Math.abs(s + GP.WALL_T / 2); if (d < tol && (!best || d < best.d)) best = { host: 'room', seg: i, t: c.t, L: e.L, d }; }
  for (const p of L.partitions) for (let i = 0; i < p.pts.length - 1; i++) { const c = G.closest(fp.x, fp.z, p.pts[i], p.pts[i + 1]); if (c.d < tol && (!best || c.d < best.d)) best = { host: p.id, seg: i, t: c.t, L: c.L, d: c.d }; }
  return best;
}
function wallHover(fp) { let best = null; for (const W of wallLines()) { const c = G.closest(fp.x, fp.z, W.a, W.b); const s = (fp.x - W.a[0]) * W.nx + (fp.z - W.a[1]) * W.nz; if (s < -.1 || c.d > .9) continue; if (!best || c.d < best.d) best = Object.assign({ d: c.d }, W); } return best; }
tools.key = (e) => {
  const k = e.key;
  if (draw && draw.tool === 'part') {
    if (/^[0-9.]$/.test(k)) { draw.num = (draw.num || '') + k; ui.setHint(`길이 입력: <b>${draw.num}</b> m · <kbd>Enter</kbd>로 확정`); return true; }
    if (k === 'Backspace') { if (draw.num) draw.num = draw.num.slice(0, -1); else if (draw.pts.length > 1) draw.pts.pop(); else draw = null; GP.emit('overlay'); e.preventDefault(); return true; }
    if (k === 'Enter') { if (draw.num) { const l = parseFloat(draw.num); const last = draw.pts[draw.pts.length - 1], cur = draw.cur || last; const ang = Math.atan2(cur[1] - last[1], cur[0] - last[0]) || 0; if (l > 0) draw.pts.push([U.r3(last[0] + Math.cos(ang) * l), U.r3(last[1] + Math.sin(ang) * l)]); draw.num = ''; ui.setHint(); GP.emit('overlay'); } else finishDraw(); return true; }
  }
  if (draw && draw.tool === 'matPoly') { if (k === 'Enter') { finishDraw(); return true; } if (k === 'Backspace') { if (draw.pts.length > 1) draw.pts.pop(); else draw = null; GP.emit('overlay'); e.preventDefault(); return true; } }
  if (k === 'Escape' && (draw || ui.placing)) { tools.cancel(); if (ui.tool !== 'select' && !draw) ui.setTool('select'); return true; }
  if (k === 'Escape' && tools.selVs.size > 1) { selOnly(-1); GP.emit('overlay'); GP.S.invalidate(); return true; }
  const nv = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[k], tg = nv && tools.polyTarget();
  if (nv && tg && tools.selVs.size && (ui.tool === 'vertex' || tools.selVs.size > 1)) { const st = e.shiftKey ? .5 : .05; tools.selVs.forEach(q => { const p = tg.pts[q]; if (p) tg.pts[q] = [U.r3(p[0] + nv[0] * st), U.r3(p[1] + nv[1] * st)]; }); e.preventDefault(); GP.changed(tg.kind === 'room' ? 'room' : tg.kind); return true; }
  if (ui.placing && (k === 'r' || k === 'R')) { tools.rotateGhost(e.shiftKey ? -90 : 90); return true; }
  if (ui.placing && (k === 'q' || k === 'e')) { tools.rotateGhost(k === 'e' ? 15 : -15); return true; }
  return false;
};

/* ---------------- overlay handle interactions (vertices, resize, rotate, opening width) ---------------- */
let hd = null;
const cap = (el, e) => { try { el.setPointerCapture(e.pointerId); } catch (_) { } };
/* several vertices can be selected (Shift + click, Shift + drag a box, or a wall = its two ends) and move together */
tools.selVs = new Set();
const selOnly = (i) => { tools.selVs.clear(); if (i >= 0) tools.selVs.add(i); tools.selV = i; };
GP.on('selection', () => { if (ui.tool !== 'vertex') { tools.selVs.clear(); tools.selV = -1; } });   // another mat / zone / partition: its own vertices
/* a wall is highlighted when both of its ends are selected (wall-shape tool) */
tools.wallSel = (i) => { if (ui.tool !== 'vertex' || tools.selVs.size < 2) return false; const n = GP.L().room.pts.length; return tools.selVs.has(i) && tools.selVs.has((i + 1) % n); };
function startMulti(target, i, fp, wall, fromHandle) {
  const idx = [...tools.selVs]; hd = { type: 'vs', target, i, idx, start: idx.map(k => target.pts[k].slice()), fx: fp.x, fz: fp.z, moved: false, wall, fromHandle };
}
tools.handleDown = (e, el) => {
  e.preventDefault(); e.stopPropagation(); const h = el.dataset.h;
  const target = tools.polyTarget();
  if (h === 'v' && target) {
    const i = +el.dataset.i, S = tools.selVs;
    if (e.shiftKey) { if (S.has(i)) { S.delete(i); tools.selV = S.size ? [...S][S.size - 1] : -1; GP.emit('overlay'); GP.S.invalidate(); return; } S.add(i); }
    else if (!S.has(i)) selOnly(i);
    tools.selV = i; cap(el, e);
    if (S.size > 1) startMulti(target, i, GP.S.floorAt(e.clientX, e.clientY), null, true); else hd = { type: 'v', target, i, moved: false };
    GP.emit('overlay'); GP.S.invalidate(); return;
  }
  if (h === 'm' && target) { const i = +el.dataset.i, pts = target.pts, n = pts.length, a = pts[i], b = pts[(i + 1) % n]; pts.splice(i + 1, 0, [U.r3((a[0] + b[0]) / 2), U.r3((a[1] + b[1]) / 2)]); selOnly(i + 1); GP.S.dataChanged(); hd = { type: 'v', target, i: i + 1, moved: true }; GP.emit('overlay'); return; }
  const it = ui.selItems()[0];
  if (h === 'rs' && it) { const [cx, cz] = [+el.dataset.cx, +el.dataset.cz]; const d = GP.dims(it); const opp = G.l2w(it.x, it.z, it.rot, -cx * d.w / 2, -cz * d.d / 2); hd = { type: 'rs', it, cx, cz, opp }; cap(el, e); return; }
  if (h === 'rot' && it) { hd = { type: 'rot', it }; cap(el, e); return; }
  if (h === 'oe') { const so = ui.selObj(); if (!so || so.k !== 'opening') return; const o = so.obj, hs = GP.hostSeg(o), sp = GP.openingSpan(o, hs); hd = { type: 'oe', o, side: +el.dataset.side, fixed: +el.dataset.side > 0 ? sp.s0 : sp.s1 }; cap(el, e); return; }
};
tools.handleMove = (e) => {
  if (!hd) return; const S = GP.S, fp = S.floorAt(e.clientX, e.clientY);
  if (hd.type === 'v') {
    const P = hd.target.pts, n = P.length; let x = fp.x, z = fp.z;
    if (!e.altKey) { const nb = hd.target.open ? [hd.i - 1, hd.i + 1].filter(j => j >= 0 && j < n) : [(hd.i - 1 + n) % n, (hd.i + 1) % n]; const sp = snapPoint(x, z, { prev: nb.length ? P[nb[0]] : null }); x = sp[0]; z = sp[1]; const tol = S.mpp() * 10; for (const j of nb) { if (Math.abs(x - P[j][0]) < tol) x = P[j][0]; if (Math.abs(z - P[j][1]) < tol) z = P[j][1]; } }
    P[hd.i] = [U.r3(x), U.r3(z)]; hd.moved = true; S.dataChanged(); GP.emit('overlay'); return;
  }
  if (hd.type === 'vs') {
    let dx = fp.x - hd.fx, dz = fp.z - hd.fz;
    if (hd.wall) { const w = hd.wall, d = dx * w.nx + dz * w.nz; dx = w.nx * d; dz = w.nz * d; if (!e.altKey) { const ds = U.snap(d, .05); dx = w.nx * ds; dz = w.nz * ds; } }
    else if (!e.altKey) { dx = U.snap(dx, .05); dz = U.snap(dz, .05); }
    hd.idx.forEach((k, q) => { hd.target.pts[k] = [U.r3(hd.start[q][0] + dx), U.r3(hd.start[q][1] + dz)]; });
    hd.moved = true; S.dataChanged(); GP.emit('overlay');
    GP.ui.setHint(`${hd.wall ? '벽' : `꼭짓점 ${hd.idx.length}개`} 이동 <b>${hd.wall ? U.cm(Math.abs(dx * hd.wall.nx + dz * hd.wall.nz)) + 'cm' : `${U.cm(Math.hypot(dx, dz))}cm`}</b> · <kbd>Alt</kbd> 자유롭게`); return;
  }
  if (hd.type === 'rs') {
    const it = hd.it; const [lx, lz] = G.w2l(hd.opp[0], hd.opp[1], it.rot, fp.x, fp.z); let w = Math.abs(lx), d = Math.abs(lz); if (!e.altKey) { w = U.snap(w, .05); d = U.snap(d, .05); } w = Math.max(.1, w); d = Math.max(.03, d);
    const c = G.l2w(hd.opp[0], hd.opp[1], it.rot, hd.cx * w / 2, hd.cz * d / 2); it.w = U.r3(w); it.d = U.r3(d); it.x = U.r3(c[0]); it.z = U.r3(c[1]); hd.moved = true; GP.checks.quick(); S.invalidate(); GP.emit('overlay'); return;
  }
  if (hd.type === 'rot') { const it = hd.it; let a = Math.atan2(fp.x - it.x, fp.z - it.z) / DEG; a = U.normRot(-a + 180); if (!e.altKey) a = U.normRot(U.snap(a, 15)); it.rot = a; hd.moved = true; GP.checks.quick(); S.invalidate(); GP.emit('overlay'); return; }
  if (hd.type === 'oe') {
    const o = hd.o, hs = GP.hostSeg(o); if (!hs) return; const c = G.closest(fp.x, fp.z, hs.a, hs.b); let t = e.altKey ? c.t : U.snap(c.t, .05);
    t = hd.side > 0 ? U.clamp(t, hd.fixed + .3, hs.L) : U.clamp(t, 0, hd.fixed - .3);
    const s0 = Math.min(t, hd.fixed), s1 = Math.max(t, hd.fixed); o.w = U.r3(s1 - s0); o.t = U.r3((s0 + s1) / 2); hd.moved = true; S.invalidate(); GP.emit('overlay');
    GP.ui.setHint(`폭 <b>${U.cm(o.w)}cm</b>`); return;
  }
};
tools.handleUp = () => {
  if (!hd) return; const h = hd; hd = null;
  if (h.moved) { if (h.type === 'v' || h.type === 'vs') { const k = h.target.kind; if (k === 'mat') tools.snapMat(h.target.obj); GP.changed(k === 'room' ? 'room' : k); if (h.type === 'vs') ui.setHint(); } else if (h.type === 'oe') { GP.changed('openings'); ui.setHint(); } else GP.changed('items'); }
  ui.renderInspector(); GP.emit('overlay');
};
tools.polyTarget = () => {
  const L = GP.L();
  if (ui.tool === 'vertex') return { kind: 'room', pts: L.room.pts };
  if (ui.tool !== 'select') return null;
  const so = ui.selObj(); if (!so) return null;
  if (['mat', 'zone'].includes(so.k)) return { kind: so.k, obj: so.obj, pts: so.obj.pts };
  if (so.k === 'part') return { kind: 'part', obj: so.obj, pts: so.obj.pts, open: true };
  return null;
};
tools.deleteVertex = (i) => {
  const t = tools.polyTarget(); if (!t) return; const min = t.open ? 2 : 3;
  const del = (tools.selVs.size > 1 && tools.selVs.has(i) ? [...tools.selVs] : [i]).sort((a, b) => b - a);
  if (t.pts.length - del.length < min) { GP.toast(`꼭짓점은 최소 ${min}개가 필요해요`, { bad: true }); return; }
  del.forEach(k => t.pts.splice(k, 1)); selOnly(-1); GP.changed(t.kind === 'room' ? 'room' : t.kind);
};
tools.setAngle = (i, deg, side) => {
  const P = GP.L().room.pts, n = P.length, p = P[i], j = side === 'prev' ? (i - 1 + n) % n : (i + 1) % n, keep = P[j].slice();
  const L = G.len(p, keep), a0 = Math.atan2(keep[1] - p[1], keep[0] - p[0]), d = (deg - G.interior(P, i)) * DEG; let best = null;
  for (const s of [1, -1]) { const a = a0 + s * d; P[j] = [U.r3(p[0] + Math.cos(a) * L), U.r3(p[1] + Math.sin(a) * L)]; const err = Math.abs(G.interior(P, i) - deg); if (!best || err < best.err) best = { err, pt: P[j].slice() }; }
  P[j] = best.pt;
  if (best.err > .3 || G.selfX(P)) { P[j] = keep; GP.toast('이 각도로 바꾸면 벽이 서로 겹쳐요. 다른 쪽 벽을 돌리거나 각도를 조금 바꿔 보세요', { bad: true, ms: 4500 }); GP.emit('overlay'); return false; }
  GP.changed('room'); GP.toast(`${i + 1}번 꼭짓점을 ${Math.round(G.interior(P, i) * 10) / 10}°로 바꿨어요`); return true;
};
tools.setWallLength = (i, Lnew) => {
  const P = GP.L().room.pts, e = G.edge(P, i), delta = Lnew - e.L, pb = e.b[0] * e.dx + e.b[1] * e.dz;
  P.forEach((p, k) => { if (k !== i && (p[0] * e.dx + p[1] * e.dz) >= pb - 1e-3) { p[0] = U.r3(p[0] + e.dx * delta); p[1] = U.r3(p[1] + e.dz * delta); } });
  GP.changed('room'); GP.toast(`벽 길이를 ${Lnew.toFixed(2)} m로 바꿨어요`);
};
window.addEventListener('pointermove', e => { if (hd) tools.handleMove(e); });
window.addEventListener('pointerup', () => { if (hd) tools.handleUp(); });

/* ---------------- item actions ---------------- */
act.setZ = (it, zAbs) => {
  const m = GP.mountOf(it); const h = GP.dims(it).h;
  if (m === 'ceil') it.elev = U.r3(Math.max(0, GP.P.settings.wallH - h - zAbs)); else if (m === 'wall') it.elev = U.r3(Math.max(0, zAbs)); else it.elev = U.r3(Math.max(0, zAbs - GP.surfaceAt(it.x, it.z, it)));
};
act.rotateSel = (delta) => {
  const its = ui.selItems(); if (!its.length) return;
  if (its.length > 1) return act.groupRotate(delta);
  const it = its[0]; const rk = detectRelK(it); it.rot = U.normRot(it.rot + delta);
  if (rk != null && ui.magnet && Math.abs(delta) % 90 === 0) { const d = GP.dims(it); const k = ((rk - Math.round(delta / 90)) % 4 + 4) % 4; const m = wallSnap(it.x, it.z, it.rot, d.w, d.d, { relK: k, force: true }); if (m) { it.x = m.x; it.z = m.z; it.rot = m.rot; } }
  GP.changed('items'); ui.renderInspector();
};
act.groupRotate = (delta) => { const its = ui.selItems(); let cx = 0, cz = 0; its.forEach(it => { cx += it.x; cz += it.z; }); cx /= its.length; cz /= its.length; cx = U.snap(cx, .05); cz = U.snap(cz, .05); its.forEach(it => { const [lx, lz] = G.w2l(cx, cz, 0, it.x, it.z); const [nx, nz] = G.l2w(cx, cz, delta, lx, lz); it.x = U.r3(nx); it.z = U.r3(nz); it.rot = U.normRot(it.rot + delta); }); GP.changed('items'); };
act.snapSelToWall = () => { const it = ui.selItems()[0]; if (!it) return; const d = GP.dims(it); const rk = detectRelK(it); const m = wallSnap(it.x, it.z, it.rot, d.w, d.d, { force: true, relK: rk != null ? rk : 0 }); if (m) { it.x = m.x; it.z = m.z; it.rot = m.rot; GP.changed('items'); ui.renderInspector(); } };
act.dupSel = () => {
  const its = ui.selItems(); if (!its.length) return; const L = GP.L(); const out = [];
  if (its.length === 1) { const it = its[0], d = GP.dims(it), c = (GP.getDef(it.type) || {}).cl || {}; const gap = Math.max(.1, ((c.l || 0) + (c.r || 0)) / 2); const [nx, nz] = G.l2w(it.x, it.z, it.rot, d.w + gap, 0); const n = Object.assign(U.clone(it), { uid: U.uid(), x: U.r3(nx), z: U.r3(nz) }); L.items.push(n); out.push(n); }
  else its.forEach(it => { const n = Object.assign(U.clone(it), { uid: U.uid(), x: U.r3(it.x + .5), z: U.r3(it.z + .5) }); L.items.push(n); out.push(n); });
  GP.changed('items'); ui.select(out.map(it => ({ k: 'item', id: it.uid })));
};
act.delSel = () => {
  const L = GP.L(); if (!ui.sel.length) return; let n = 0;
  for (const s of ui.sel) {
    const arr = { item: L.items, part: L.partitions, opening: L.openings, mat: L.mats, zone: L.zones, room: L.rooms, note: L.notes, dim: L.dims }[s.k]; if (!arr) continue;
    const i = arr.findIndex(o => (o.uid || o.id) === s.id); if (i >= 0) { arr.splice(i, 1); n++; }
    if (s.k === 'part') L.openings = L.openings.filter(o => o.host !== s.id);
  }
  ui.sel = []; GP.emit('selection'); GP.changed('all'); if (n) GP.toast(`${n}개 삭제했어요`, { action: '되돌리기', onAction: () => GP.H.undo() });
};
act.nudge = (dx, dz) => { const its = ui.selItems(); if (!its.length) return; its.forEach(it => { it.x = U.r3(it.x + dx); it.z = U.r3(it.z + dz); }); GP.changed('items'); ui.renderInspector(); };
act.makeRow = (n, gapCm) => {
  const it = ui.selItems()[0]; if (!it) return; const L = GP.L(), d = GP.dims(it), gap = Math.max(0, gapCm) / 100, out = [it];
  for (let i = 1; i < n; i++) { const [x, z] = G.l2w(it.x, it.z, it.rot, i * (d.w + gap), 0); const c = Object.assign(U.clone(it), { uid: U.uid(), x: U.r3(x), z: U.r3(z) }); L.items.push(c); out.push(c); }
  GP.changed('items'); ui.select(out.map(q => ({ k: 'item', id: q.uid }))); GP.toast(`${n}대를 한 줄로 놓았어요`);
};
act.align = (mode) => {
  const its = ui.selItems(); if (its.length < 2) return; const ref = its[0], rot = ref.rot;
  const loc = its.map(it => { const [lx, lz] = G.w2l(ref.x, ref.z, rot, it.x, it.z); const d = GP.dims(it); return { it, lx, lz, dd: d.d }; });
  const t = mode === 'F' ? Math.max(...loc.map(q => q.lz + q.dd / 2)) : mode === 'B' ? Math.min(...loc.map(q => q.lz - q.dd / 2)) : loc[0].lz;
  loc.forEach(q => { const nz = mode === 'F' ? t - q.dd / 2 : mode === 'B' ? t + q.dd / 2 : t; const [x, z] = G.l2w(ref.x, ref.z, rot, q.lx, nz); q.it.x = U.r3(x); q.it.z = U.r3(z); });
  GP.changed('items');
};
act.gap = (gapCm, even) => {
  const its = ui.selItems(); if (its.length < 2) return; const ref = its[0], rot = ref.rot; ui.lastGap = gapCm;
  const loc = its.map(it => { const [lx, lz] = G.w2l(ref.x, ref.z, rot, it.x, it.z); const d = GP.dims(it); const c = Math.cos((it.rot - rot) * DEG), s = Math.sin((it.rot - rot) * DEG); const wx = Math.abs(d.w * c) + Math.abs(d.d * s); return { it, lx, lz, wx }; }).sort((a, b) => a.lx - b.lx);
  let g = gapCm / 100;
  if (even) { const span = loc[loc.length - 1].lx + loc[loc.length - 1].wx / 2 - (loc[0].lx - loc[0].wx / 2); const sumW = loc.reduce((s, q) => s + q.wx, 0); g = (span - sumW) / (loc.length - 1); }
  let cur = loc[0].lx - loc[0].wx / 2;
  loc.forEach(q => { const nx = cur + q.wx / 2; const [x, z] = G.l2w(ref.x, ref.z, rot, nx, q.lz); q.it.x = U.r3(x); q.it.z = U.r3(z); cur += q.wx + g; });
  GP.changed('items'); if (even) GP.toast(`간격 ${Math.round(g * 100)}cm로 맞췄어요`);
};
act.clipboard = null;
act.copy = () => { const its = ui.selItems(); if (!its.length) return; let cx = 0, cz = 0; its.forEach(it => { cx += it.x; cz += it.z; }); cx /= its.length; cz /= its.length; const list = its.map(it => ({ it: Object.assign(U.clone(it), { uid: undefined }), rel: [it.x - cx, it.z - cz, it.rot] })); act.clipboard = list; try { localStorage.setItem('gofit:clip', JSON.stringify(list)); } catch (e) { } GP.toast(`${its.length}개 복사했어요. Ctrl+V로 붙여넣어요`); };
act.paste = () => { let list = act.clipboard; try { const s = localStorage.getItem('gofit:clip'); if (s) list = JSON.parse(s); } catch (e) { } if (!list || !list.length) return; if (list.length === 1) { list[0].rel = [0, 0, 0]; } tools.startPlacing(list.map(q => ({ it: Object.assign({}, q.it, { rot: list.length > 1 ? q.rel[2] : q.it.rot }), rel: q.rel })), { label: '붙여넣기' }); };
act.setMount = (it, m) => {
  const def = GP.getDef(it.type) || {}; it.mount = m === def.mount ? undefined : m;
  if (m === 'wall') { it.elev = def.mount === 'wall' ? def.y : 1.2; const d = GP.dims(it); const r = wallSnap(it.x, it.z, it.rot, d.w, d.d, { force: true, relK: 0 }); if (r) { it.x = r.x; it.z = r.z; it.rot = r.rot; } }
  else it.elev = 0;
  GP.changed('items'); ui.renderInspector();
};
act.key = (e, mod, k) => {
  if (mod && k === 'd') { e.preventDefault(); act.dupSel(); return; }
  if (mod && k === 'c') { act.copy(); return; }
  if (mod && k === 'v') { e.preventDefault(); act.paste(); return; }
  if (mod && k === 'a') { e.preventDefault(); ui.select(GP.L().items.map(it => ({ k: 'item', id: it.uid }))); return; }
  if (mod) return;
  if (k === 'r') { act.rotateSel(e.shiftKey ? -90 : 90); return; }
  if (k === 'q' || k === 'e') { act.rotateSel(k === 'e' ? 15 : -15); return; }
  if (k === 'w') { act.snapSelToWall(); return; }
  if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); if (tools.polyTarget() && tools.selV >= 0 && ui.tool === 'vertex') tools.deleteVertex(tools.selV); else act.delSel(); return; }
  const st = e.shiftKey ? .5 : .05; const mv = { ArrowLeft: [-st, 0], ArrowRight: [st, 0], ArrowUp: [0, -st], ArrowDown: [0, st] }[e.key];
  if (mv && ui.sel.length) { e.preventDefault(); act.nudge(mv[0], mv[1]); return; }
  const tk = { v: 'select', m: 'measure' }[k]; if (tk) ui.setTool(tk);
};
act.inspAction = async (a, b) => {
  const L = GP.L(), so = ui.selObj(), it = ui.selItems()[0];
  if (a === 'close') return ui.clearSel();
  if (a === 'model' && it) return GP.M3.open(it);
  if (a === 'rotL') return act.rotateSel(-90); if (a === 'rotR') return act.rotateSel(90);
  if (a === 'wall') return act.snapSelToWall(); if (a === 'dup' || a === 'mdup') return act.dupSel(); if (a === 'del' || a === 'mdel' || a === 'odel') return act.delSel();
  if (a === 'resetSize' && it) { delete it.w; delete it.d; delete it.h; GP.changed('items'); ui.renderInspector(); return; }
  if (a === 'mount' && it) return act.setMount(it, b.dataset.m);
  if (a === 'fav' && it) { const f = GP.lib.favorites, i = f.indexOf(it.type); if (i >= 0) f.splice(i, 1); else f.unshift(it.type); GP.saveLib(); ui.renderInspector(); GP.emit('library'); return; }
  if (a === 'row') return act.makeRow(U.clamp(+$('#iRowN').value || 2, 2, 40), +$('#iRowG').value || 0);
  if (a === 'alignF') return act.align('F'); if (a === 'alignC') return act.align('C'); if (a === 'alignB') return act.align('B');
  if (a === 'gap') return act.gap(+$('#mGap').value || 0); if (a === 'even') return act.gap(0, true);
  if (a === 'grot') return act.groupRotate(90);
  if (a === 'saveset') return GP.panels.saveSetDialog(ui.selItems());
  if (so && so.k === 'part' && a === 'pkind') { so.obj.kind = b.dataset.v; GP.changed('parts'); ui.renderInspector(); return; }
  if (so && so.k === 'opening') { if (a === 'oflip') so.obj.flip = !so.obj.flip; if (a === 'ohinge') so.obj.hinge = so.obj.hinge === 'R' ? 'L' : 'R'; GP.changed('openings'); return; }
  if (so && so.k === 'mat') { if (a === 'mtrim') { so.obj.trim = b.dataset.v; GP.changed('mats'); ui.renderInspector(); return; } if (a === 'msnap') { tools.snapMat(so.obj); GP.changed('mats'); ui.renderInspector(); GP.toast('벽에서 25cm 안쪽인 변을 벽에 붙였어요'); return; } }
  if (so && so.k === 'wall') {
    const i = so.obj;
    if (a === 'wmark') { L.wallMarks = L.wallMarks || {}; if (b.dataset.v) L.wallMarks[i] = b.dataset.v; else delete L.wallMarks[i]; GP.changed('room'); ui.renderInspector(); return; }
    if (a === 'wdoor' || a === 'wwin') { const e = G.edge(L.room.pts, i); const k = a === 'wdoor' ? 'door' : 'window'; const w = tools.openingWidth(k); const o = { id: U.uid('o'), host: 'room', seg: i, t: U.r3(e.L / 2), w, h: k === 'door' ? 2.1 : 1.2, sill: .9, kind: k }; L.openings.push(o); GP.changed('openings'); ui.select([{ k: 'opening', id: o.id }]); return; }
    if (a === 'wfill') { const lines = wallLines().filter(W => W.room === i); if (lines[0]) GP.panels.fillWallDialog(lines[0]); return; }
  }
};
act.inspChange = (el, live) => {
  const L = GP.L(), so = ui.selObj(), it = ui.selItems()[0], id = el.id, v = parseFloat(el.value);
  if (id === 'iPrice' && el.dataset.pk) { GP.quote.setPrice(el.dataset.pk, Math.max(0, v || 0)); ui.renderInspector(); ui.renderSummary(); GP.emit('library'); return; }
  if (it && (ui.sel.length === 1)) {
    if (id === 'iName') { it.name = el.value.trim() || undefined; if (!live) GP.changed('items'); else GP.S.invalidate(); return; }
    if (el.dataset.param) { it.params = Object.assign({}, it.params || {}); it.params[el.dataset.param] = el.type === 'number' ? v : el.value; if (it.type === 'desk' && el.dataset.param === 'shape') { const d = GP.dims(it); if ((el.value === 'L' || el.value === 'U') && d.d < 1.2) it.d = 1.6; if (el.value === 'round' && d.d < .9) it.d = 1.0; if (el.value === 'straight' || el.value === 'two') it.d = .7; } GP.changed('items'); ui.renderInspector(); return; }
    if (!isFinite(v)) return;
    if (id === 'iW') it.w = U.clamp(v, 5, 5000) / 100; else if (id === 'iD') it.d = U.clamp(v, 2, 5000) / 100; else if (id === 'iH') it.h = U.clamp(v, 1, 1000) / 100;
    else if (id === 'iRot') it.rot = U.normRot(v); else if (id === 'iX') it.x = U.r3(v); else if (id === 'iZ') it.z = U.r3(v);
    else if (id === 'iElev') { if (GP.mountOf(it) === 'ceil') it.elev = Math.max(0, v / 100); else act.setZ(it, v / 100); }
    else return;
    GP.changed('items'); ui.renderInspector(); return;
  }
  if (!so) return; const o = so.obj;
  if (so.k === 'part') { if (id === 'pT' && isFinite(v)) o.thick = U.clamp(v, 3, 60) / 100; GP.changed('parts'); return; }
  if (so.k === 'opening') {
    const hs = GP.hostSeg(o);
    if (id === 'oKind') o.kind = el.value;
    if (id === 'oW' && isFinite(v)) { const sp = GP.openingSpan(o, hs); o.w = U.clamp(v, 30, 800) / 100; if (hs) o.w = Math.min(o.w, hs.L - .02); o.t = U.clamp(sp.s0 + o.w / 2, o.w / 2, hs ? hs.L - o.w / 2 : 99); }
    if (id === 'oH' && isFinite(v)) o.h = U.clamp(v, 30, 600) / 100; if (id === 'oS' && isFinite(v)) o.sill = U.clamp(v, 0, 400) / 100;
    if (id === 'oL' && isFinite(v) && hs) o.t = U.r3(U.clamp(v / 100 + o.w / 2, o.w / 2, hs.L - o.w / 2));
    if (id === 'oR' && isFinite(v) && hs) o.t = U.r3(U.clamp(hs.L - v / 100 - o.w / 2, o.w / 2, hs.L - o.w / 2));
    GP.changed('openings'); ui.renderInspector(); return;
  }
  if (so.k === 'mat') { if (id === 'mB') o.block = el.value; GP.changed('mats'); ui.renderInspector(); return; }
  if (so.k === 'zone') { if (id === 'zN') o.name = el.value; if (id === 'zC') o.color = el.value; if (live) { GP.S.invalidate(); return; } GP.changed('zones'); return; }
  if (so.k === 'room') { if (id === 'rN') o.name = el.value; if (live) { GP.S.invalidate(); return; } GP.changed('annot'); return; }
  if (so.k === 'note') { if (id === 'nT') o.text = el.value; if (live) { GP.S.invalidate(); return; } GP.changed('annot'); return; }
  if (so.k === 'wall') { const i = o; if (id === 'wL' && isFinite(v) && v > .3) tools.setWallLength(i, v); ui.renderInspector(); return; }
};
})();
