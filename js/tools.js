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
  const { W, k, half, along, phw } = best; let t = U.snap(best.t, o.g || .05);
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
function placeSnap(x, z, rot, w, d, alt, relK, mount, g) {
  if (alt) return { x: U.r3(x), z: U.r3(z), rot };
  if (ui.magnet || mount === 'wall') { const m = wallSnap(x, z, rot, w, d, { relK, force: mount === 'wall', g }); if (m) return m; }
  return { x: U.r3(U.snap(x, g || .05)), z: U.r3(U.snap(z, g || .05)), rot };
}
tools.placeSnap = placeSnap;

/* ---------------- how finely a drag moves ----------------
   5 cm steps; 1 cm while Ctrl (or Shift, where Shift means nothing else) is held, or by itself once zoomed in close
   (5 cm = 20 px or more); Alt: free. fine / free also switch off sticking to nearby points and walls. */
function gridOf(e, noShift) {
  if (e && e.altKey) return { g: .001, free: true, fine: true, label: '자유롭게' };
  if (e && (e.ctrlKey || e.metaKey || (!noShift && e.shiftKey))) return { g: .01, fine: true, label: '1cm 미세' };
  if (.05 / GP.S.mpp() >= 20) return { g: .01, zoom: true, label: '1cm (확대해서)' };
  return { g: .05, label: '5cm 단위' };
}
tools.gridOf = gridOf;
const gridHint = (q, noShift) => ` · <b>${q.label}</b>${q.fine ? '' : ` · <kbd>Ctrl</kbd>${noShift ? '' : '/<kbd>Shift</kbd>'} 1cm 미세`}${q.free ? '' : ' · <kbd>Alt</kbd> 자유'}`;
tools.gridHint = gridHint;

/* ---------------- point snapping for drawing ----------------
   o.e: the pointer event (Alt free, Ctrl 1 cm, zoom); o.skipPts: points not to stick to (the point being dragged and its
   neighbours); o.skipWalls: room walls not to stick to (the walls that end at that point) */
function snapPoint(x, z, o) {
  o = o || {}; if (o.e) { const q = gridOf(o.e, true); o.alt = q.free; o.fine = q.fine; o.g = q.g; }
  if (o.alt) return [U.r3(x), U.r3(z)];
  const S = GP.S, L = GP.L(), tol = S.mpp() * 12, g = o.g || .05;
  if (!o.fine) {
    let best = null, bd = tol;
    const cand = []; if (!o.noRoom) { L.room.pts.forEach(p => cand.push(p)); L.partitions.forEach(p => p.pts.forEach(q => cand.push(q))); L.mats.forEach(m => m.pts.forEach(q => cand.push(q))); } (o.extra || []).forEach(q => cand.push(q));
    for (const c of cand) { if (o.skipPts && o.skipPts.has(c)) continue; const dd = Math.hypot(c[0] - x, c[1] - z); if (dd < bd) { bd = dd; best = c.slice(); } }
    if (best) return best;
  }
  if (o.prev && o.shift) { const dx = x - o.prev[0], dz = z - o.prev[1], ang = Math.atan2(dz, dx), l = Math.hypot(dx, dz), a2 = Math.round(ang / (Math.PI / 4)) * Math.PI / 4; return [U.r3(o.prev[0] + Math.cos(a2) * U.snap(l, g)), U.r3(o.prev[1] + Math.sin(a2) * U.snap(l, g))]; }
  if (!o.fine && !o.noRoom) { const P = L.room.pts; for (let i = 0; i < P.length; i++) { if (o.skipWalls && o.skipWalls.has(i)) continue; const c = G.closest(x, z, P[i], P[(i + 1) % P.length]); if (c.d < tol) { return [U.r3(c.x), U.r3(c.z)]; } } }
  let sx = U.snap(x, g), sz = U.snap(z, g);
  if (o.prev && !o.fine) { if (Math.abs(sx - o.prev[0]) < tol) sx = o.prev[0]; if (Math.abs(sz - o.prev[1]) < tol) sz = o.prev[1]; }
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
tools.isAxisRect = isAxisRect;
tools.clipMat = (m) => { if (isConvex(m.pts)) m.pts = clipToRoom(m.pts); };      // a mat never reaches past the walls

/* ---------------- mat / zone size: one side moves straight out or in, the sides next to it keep their direction ---------------- */
const lineX = (A, e, B, f) => { const den = e[0] * f[1] - e[1] * f[0]; if (Math.abs(den) < 1e-9) return null; const t = ((B[0] - A[0]) * f[1] - (B[1] - A[1]) * f[0]) / den; return [A[0] + e[0] * t, A[1] + e[1] * t]; };
const okPoly = (Q, P) => { const a = G.area(Q); return Q.every(p => isFinite(p[0]) && isFinite(p[1])) && Math.sign(a) === Math.sign(G.area(P)) && Math.abs(a) > .04 && !G.selfX(Q); };
function offsetSide(P, i, d) {      // side i (P[i] → P[i+1]) moved outward by d metres; null when the shape would fold over
  const n = P.length, j = (i + 1) % n, E = G.edge(P, i), ox = -E.nx * d, oz = -E.nz * d, dir = [E.dx, E.dz];
  const a = [P[i][0] + ox, P[i][1] + oz], b = [P[j][0] + ox, P[j][1] + oz], pv = P[(i - 1 + n) % n], nx = P[(i + 2) % n];
  const na = lineX(a, dir, pv, [P[i][0] - pv[0], P[i][1] - pv[1]]) || a, nb = lineX(a, dir, nx, [P[j][0] - nx[0], P[j][1] - nx[1]]) || b;
  const Q = P.map(p => p.slice()); Q[i] = [U.r3(na[0]), U.r3(na[1])]; Q[j] = [U.r3(nb[0]), U.r3(nb[1])];
  return okPoly(Q, P) ? Q : null;
}
/* the resize cursor for a side whose outward normal is (nx, nz) on screen (plan x → right, z → down) */
tools.resizeCursor = (nx, nz) => { let a = Math.atan2(nz, nx) / DEG; a = ((a % 180) + 180) % 180; return a < 22.5 || a >= 157.5 ? 'ew-resize' : a < 67.5 ? 'nwse-resize' : a < 112.5 ? 'ns-resize' : 'nesw-resize'; };
const sizable = t => !!t && (t.kind === 'mat' || t.kind === 'zone');
/* the side of the selected mat / zone under the pointer (not its ends: the corner handles are there) */
function sideAt(cx, cy) {
  if (ui.tool !== 'select' || GP.viewOnly || ui.placing) return null; const t = tools.polyTarget(); if (!sizable(t)) return null;
  const S = GP.S, fp = S.floorAt(cx, cy), P = t.pts, n = P.length, tol = S.mpp() * 7; let best = null;
  for (let i = 0; i < n; i++) { const c = G.closest(fp.x, fp.z, P[i], P[(i + 1) % n]); if (c.d < tol && Math.min(c.t, c.L - c.t) > Math.min(S.mpp() * 10, c.L * .2) && (!best || c.d < best.d)) best = { i, d: c.d }; }
  if (!best) return null; const E = G.edge(P, best.i); return { t, i: best.i, cur: tools.resizeCursor(-E.nx, -E.nz), fp };
}
function startSide(t, i, fp) { const E = G.edge(t.pts, i); hd = { type: 'e', target: t, i, start: t.pts.map(p => p.slice()), fx: fp.x, fz: fp.z, nx: -E.nx, nz: -E.nz, moved: false }; tools.selVs.clear(); tools.selV = -1; canvas().style.cursor = tools.resizeCursor(-E.nx, -E.nz); }
const setPts = (t, Q) => { t.obj.pts = Q; t.pts = Q; };
const sizeHint = (t, extra) => { const P = t.pts, b = G.bounds(P); ui.setHint(`${isAxisRect(P) ? `크기 <b>${b.sx.toFixed(2)} × ${b.sz.toFixed(2)} m</b>` : `면적 <b>${Math.abs(G.area(P)).toFixed(1)}㎡</b>`}${t.kind === 'mat' ? ` · 약 ${GP.calc.matBlocks(t.obj)}장` : ''}${extra || ''}`); };
/* how far a point is from the room walls and partitions */
function wallDist(x, z) { const L = GP.L(), P = L.room.pts; let d = Infinity; for (let i = 0; i < P.length; i++) d = Math.min(d, G.closest(x, z, P[i], P[(i + 1) % P.length]).d); for (const p of L.partitions) for (let i = 0; i < p.pts.length - 1; i++) d = Math.min(d, G.closest(x, z, p.pts[i], p.pts[i + 1]).d - (p.thick || .1) / 2); return d; }
/* type a side's length: the far end moves, unless the side there is against a wall (and the near one is not) or moving it would go through a wall */
tools.setSideLength = (t, i, L1) => {
  const P = t.pts, n = P.length, E = G.edge(P, i), dL = L1 - E.L; if (Math.abs(dL) < .0005) return true;
  const flush = j => { const F = G.edge(P, j); return wallDist((F.a[0] + F.b[0]) / 2, (F.a[1] + F.b[1]) / 2) < .05; };
  const nxt = (i + 1) % n, prv = (i - 1 + n) % n, order = flush(nxt) && !flush(prv) ? [prv, nxt] : [nxt, prv];
  const tryEnd = j => { const F = G.edge(P, j), s = Math.abs(E.dx * F.dz - E.dz * F.dx) || 1; for (const sg of [1, -1]) { const Q = offsetSide(P, j, sg * dL * s); if (Q && Math.abs(G.edge(Q, i).L - L1) < .01) return Q; } return null; };
  const room = GP.L().room.pts, fits = Q => G.rectInside(Q, room, .005), tries = order.map(tryEnd).filter(Boolean);
  const Q = tries.find(fits) || tries[0]; if (Q) { setPts(t, Q); return true; }
  GP.toast('이 길이로는 모양을 만들 수 없어요', { bad: true }); return false;
};
/* 가로 / 세로 of a rectangular mat or zone */
tools.setRectSize = (obj, kind, axis, v) => {
  const P = obj.pts; if (!isAxisRect(P) || !(v >= .1)) return; const i = P.findIndex((p, k) => { const E = G.edge(P, k); return axis === 'x' ? Math.abs(E.dx) > .99 : Math.abs(E.dz) > .99; });
  const t = { kind, obj, pts: P }; if (i < 0 || !tools.setSideLength(t, i, v)) return;
  if (kind === 'mat' && isConvex(obj.pts)) obj.pts = clipToRoom(obj.pts);
  GP.changed(kind === 'mat' ? 'mats' : 'zones');
};

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
  if (GP.pen) GP.pen.cancel();
  draw = null; drag = null; press = null; hover = null; tools.preview = null; if (GP.S.canvas) GP.S.canvas.style.cursor = ''; $('#ovMarquee').hidden = true; GP.emit('overlay'); ui.setHint(); GP.S.invalidate();
};
tools.getDraw = () => draw; tools.getHover = () => hover;
tools.openingWidth = k => ({ door: .9, door2: 1.6, glass2: 1.8, auto: 1.8, slide: 1.0, opening: 1.0, window: 1.2 }[k] || .9);
const canvas = () => GP.S.canvas;

/* ---------------- placing (catalog / sets / paste) ---------------- */
tools.startPlacing = (list, o) => {
  tools.cancel(); if (ui.step !== 'place' && !(GP.wiz && GP.wiz.on) && !(o && o.stay)) ui.setStep('place'); if (ui.tool !== 'select') ui.setTool('select'); ui.clearSel();
  ui.placing = { list: list.map(q => Object.assign({ rel: [0, 0, 0] }, q)), rot: 0, relK: 0, x: null, z: null, keep: !!(o && o.keep), label: o && o.label };
  if (ui.renderTools) ui.renderTools();
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
  const gmap = {}; pl.placed.forEach(p => { const it = Object.assign({}, p, { uid: U.uid() }); if (it.grp) it.grp = gmap[it.grp] || (gmap[it.grp] = U.uid('g')); L.items.push(it); added.push(it); });
  GP.changed('items');
  if (!keep && !pl.keep) { tools.cancel(); ui.select(added.map(it => ({ k: 'item', id: it.uid }))); }
  GP.panels && GP.panels.pushRecent(added[0].type);
}
tools.rotateGhost = (delta) => { const pl = ui.placing; if (!pl) return; pl.rot = U.normRot(pl.rot + delta); if (Math.abs(delta) % 90 === 0) pl.relK = ((pl.relK - Math.round(delta / 90)) % 4 + 4) % 4; if (GP.V3 && GP.V3.on) GP.V3.ghostRefresh(); else if (tools.lastMove) ghostUpdate(tools.lastMove[0], tools.lastMove[1], false); };
tools.ghostAt = ghostAt; tools.placeGhost = placeGhost;

/* ---------------- hover: highlight + price tooltip ---------------- */
tools.hoverAt = (e) => {
  const S = GP.S; const fp = S.floorAt(e.clientX, e.clientY); let h = null, html = '';
  const sd = sideAt(e.clientX, e.clientY); if (sd) { tools.clearHover(); canvas().style.cursor = sd.cur; return; }
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
  const ext = GP.toolExt && GP.toolExt[t]; if (ext) { ext.down(e, fp); return; }
  if (t !== 'select') { if (toolDown(t, e, fp)) return; }
  if (t !== 'select') { press = { x: e.clientX, y: e.clientY }; return; }
  const sd = !e.shiftKey && sideAt(e.clientX, e.clientY); if (sd) { startSide(sd.t, sd.i, fp); GP.tip.hide(); return; }
  const uid = ui.step !== 'floor' ? S.itemAt(fp.x, fp.z) : null;
  const add = e.shiftKey || ui.multi;
  if (uid) {
    const key = 'item:' + uid; const cur = ui.selSet(), deep = (e.ctrlKey || e.metaKey) && !add;      // Ctrl+click: one member of a group
    if (add) { ui.select([{ k: 'item', id: uid }], true); if (!ui.selSet().has(key)) return; }
    else if (deep) ui.select([{ k: 'item', id: uid }], false, true);
    else if (!cur.has(key)) ui.select([{ k: 'item', id: uid }]);
    const its = ui.selItems(); const it = GP.findItem(uid);
    drag = { kind: 'items', anchor: uid, sx: e.clientX, sy: e.clientY, moved: false, fx: fp.x, fz: fp.z, start: its.map(q => ({ uid: q.uid, x: q.x, z: q.z })), relK: its.length === 1 ? detectRelK(it) : null, ox: it.x - fp.x, oz: it.z - fp.z, altDup: e.altKey };
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
  { const ext = !GP.viewOnly && GP.toolExt && GP.toolExt[ui.tool]; if (ext) { ext.move(e); return; } }
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
    if (press.verts) { const tg = tools.polyTarget(); press = null; if (tg) { if (!add) tools.selVs.clear(); if (!tiny) { const inner = tg.kind === 'room' && GP.CV ? GP.CV.hidden(GP.L()) : new Set(); tg.pts.forEach((p, k) => { const [sx, sy] = S.toScreen(p[0], 0, p[1]); if (!inner.has(k) && sx >= x0 && sx <= x1 && sy >= y0 && sy <= y1) tools.selVs.add(k); }); } tools.selV = tools.selVs.size ? [...tools.selVs][tools.selVs.size - 1] : -1; GP.emit('overlay'); S.invalidate(); } return; }
    const hits = tiny ? [] : GP.L().items.filter(it => { const [sx, sy] = S.toScreen(it.x, 0, it.z); return sx >= x0 && sx <= x1 && sy >= y0 && sy <= y1; }).map(it => ({ k: 'item', id: it.uid }));
    press = null; if (hits.length) ui.select(hits, add); else if (!add && !ui.multi) ui.clearSel(); return;
  }
  { const ext = GP.toolExt && GP.toolExt[ui.tool]; if (ext) { ext.up(e); return; } }
  if (draw) { toolUp(e); return; }
  if (drag) {
    const d = drag; drag = null; canvas().style.cursor = '';
    if (d.cloned) { act.lastDup = { pairs: d.pairs }; }
    ui.setHint();
    if (d.moved) { if (!d.cloned) ui.setHint(); if (d.kind === 'mat') tools.snapMat(d.obj); GP.changed(d.kind === 'items' ? 'items' : d.kind); ui.renderInspector(); }
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
  { const ext = GP.toolExt && GP.toolExt[ui.tool]; if (ext) { ext.dbl(e); return; } }
  if (draw && (draw.tool === 'part' || draw.tool === 'matPoly')) { finishDraw(); return; }
  if (!GP.viewOnly && ui.tool === 'vertex') { const fp = GP.S.floorAt(e.clientX, e.clientY), i = hoverWallSeg(fp), c = i >= 0 && GP.CV && GP.CV.of(GP.L(), i); if (c) { if (GP.CV.splitAt(GP.L(), c, [fp.x, fp.z])) { GP.changed('room'); GP.toast('곡선을 둘로 나눴어요. 새 점의 주황 손잡이를 한쪽만 길게 당기면 그쪽이 더 많이 휘어요 (Alt: 방향도 따로)', { ms: 5000 }); } } else if (i >= 0) tools.addPointOnWall(i, [fp.x, fp.z]); return; }
  if (GP.viewOnly || ui.placing || ui.tool !== 'select') return;
  const fp = GP.S.floorAt(e.clientX, e.clientY); const uid = GP.S.itemAt(fp.x, fp.z); if (uid) { const it = GP.findItem(uid); GP.M3.open(it); }
}
/* move the dragged selection to floor point fp: one item snaps (walls, 5 cm grid), several move together on the grid */
function moveItems(d, fp, alt, g) {
  const anchor = GP.findItem(d.anchor); if (!anchor) return; g = g || .05;
  if (d.start.length === 1) { const dm = GP.dims(anchor); const r = placeSnap(fp.x + d.ox, fp.z + d.oz, anchor.rot, dm.w, dm.d, alt, d.relK, GP.mountOf(anchor), g); anchor.x = r.x; anchor.z = r.z; anchor.rot = r.rot; }
  else { let dx = fp.x - d.fx, dz = fp.z - d.fz; if (!alt) { const a0 = d.start.find(s => s.uid === d.anchor); dx = U.snap(a0.x + dx, g) - a0.x; dz = U.snap(a0.z + dz, g) - a0.z; } d.start.forEach(s => { const it = GP.findItem(s.uid); if (it) { it.x = U.r3(s.x + dx); it.z = U.r3(s.z + dz); } }); }
  GP.checks.quick(); ui.updateDistances(); GP.S.invalidate(); GP.emit('overlay'); GP.emit('dragging');
}
tools.moveItems = moveItems; tools.relK = it => detectRelK(it);
function dragMove(e) {
  const S = GP.S; const d = drag;
  if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 4) return;
  d.moved = true; const fp = S.floorAt(e.clientX, e.clientY);
  if (d.kind === 'items') {
    if (e.altKey && !d.cloned) {      // Alt held (pressed before or during the drag): copy, and drag the copies; the originals go back to where they were
      const src = d.start.map(s => GP.findItem(s.uid)).filter(Boolean); d.start.forEach(s => { const it = GP.findItem(s.uid); if (it) { it.x = s.x; it.z = s.z; } });
      const out = cloneItems(src, 0, 0), map = new Map(src.map((it, k) => [it.uid, out[k].uid]));
      d.pairs = d.start.map(s => [s.uid, map.get(s.uid)]); d.start = d.start.map(s => ({ uid: map.get(s.uid), x: s.x, z: s.z })); d.anchor = map.get(d.anchor); d.cloned = true;
      ui.select(out.map(it => ({ k: 'item', id: it.uid })), false, true); GP.S.dataChanged(); ui.setHint('복제해서 옮기는 중 · 놓은 뒤 <kbd>Shift</kbd>+<kbd>D</kbd>: 같은 간격으로 하나 더');
    }
    const prec = e.shiftKey && !e.altKey, straight = e.shiftKey && e.altKey, q = prec ? { g: .01 } : gridOf(e, true); let p = fp, free = false;
    // Shift: precision like Blender — from the moment it is pressed the pointer counts a tenth; let go and it carries on from there
    if (prec) { if (!d.pr) d.pr = { s: [fp.x, fp.z], e: d.lastEff ? [d.lastEff.x, d.lastEff.z] : [fp.x, fp.z] }; p = { x: d.pr.e[0] + (fp.x - d.pr.s[0]) * .1, z: d.pr.e[1] + (fp.z - d.pr.s[1]) * .1 }; }
    else { if (d.pr) { d.adj = [d.lastEff.x - fp.x, d.lastEff.z - fp.z]; d.pr = null; } if (d.adj) p = { x: fp.x + d.adj[0], z: fp.z + d.adj[1] }; }
    d.lastEff = p;
    if (straight) { const dx = p.x - d.fx, dz = p.z - d.fz, a = Math.round(Math.atan2(dz, dx) / (Math.PI / 4)) * Math.PI / 4; let l = dx * Math.cos(a) + dz * Math.sin(a); l = U.snap(l, q.g); p = { x: d.fx + Math.cos(a) * l, z: d.fz + Math.sin(a) * l }; free = true; }      // Alt+Shift: copy on a straight line (Photoshop), the length on the grid
    moveItems(d, p, free, q.g);
    ui.setHint(`${d.cloned ? '복제해서 옮기는 중' : '옮기는 중'}${prec ? ' · <b>정밀 (10배 느리게)</b>' : straight ? ' · <b>직선으로</b>' : ''} · <kbd>Shift</kbd> 정밀 · <kbd>Alt</kbd> 복사 · <kbd>Alt</kbd>+<kbd>Shift</kbd> 직선 복사 · <kbd>Ctrl</kbd> 1cm${d.cloned ? ' · 놓은 뒤 <kbd>Shift</kbd>+<kbd>D</kbd>: 같은 간격으로 하나 더' : ''}`); return;
  }
  const q = gridOf(e); let dx = fp.x - d.fx, dz = fp.z - d.fz; if (!q.free) { dx = U.snap(dx, q.g); dz = U.snap(dz, q.g); }
  const orig = JSON.parse(d.snap), o = d.obj;
  if (d.kind === 'opening') { const hs = GP.hostSeg(o); if (!hs) return; const c = G.closest(fp.x, fp.z, hs.a, hs.b); o.t = U.r3(U.clamp(q.free ? c.t : U.snap(c.t, q.g), o.w / 2, hs.L - o.w / 2)); S.invalidate(); GP.emit('overlay'); ui.setHint(`문·창문 옮기기${gridHint(q)}`); return; }
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
    if (best >= 0 && bd < tol && GP.CV && !e.shiftKey) {
      const c = GP.CV.of(L, best); if (c) { selOnly(-1); GP.CV.bodyDown(e, c, fp); return true; }
      if (e.altKey && GP.CV.bendDown(e, best, fp)) { selOnly(-1); return true; }
    }
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
    const p = snapPoint(fp.x, fp.z, { e, alt: e.altKey, prev: draw && draw.pts[draw.pts.length - 1], shift: e.shiftKey });
    if (!draw) { draw = { tool: 'part', pts: [p], cur: p, num: '' }; if (ui.sel.length) ui.clearSel(); }   // the inspector closes so the drawing bar has room
    else { const last = draw.pts[draw.pts.length - 1]; if (G.len(last, p) > .05) draw.pts.push(p); else if (draw.pts.length >= 2) finishDraw(); }
    GP.emit('overlay'); return true;
  }
  if (t === 'matPoly') {
    const p = snapPoint(fp.x, fp.z, { e, alt: e.altKey, prev: draw && draw.pts[draw.pts.length - 1], shift: e.shiftKey });
    if (!draw) draw = { tool: t, pts: [p], cur: p };
    else { if (draw.pts.length >= 3 && G.len(draw.pts[0], p) < S.mpp() * 14) { finishDraw(); return true; } const last = draw.pts[draw.pts.length - 1]; if (G.len(last, p) > .05) draw.pts.push(p); }
    GP.emit('overlay'); return true;
  }
  if (t === 'matRect' || t === 'zoneRect') { const p = snapPoint(fp.x, fp.z, { e, alt: e.altKey }); draw = { tool: t, a: p, b: p, rect: true }; GP.emit('overlay'); return true; }
  if (t === 'measure') { const p = snapPoint(fp.x, fp.z, { e, alt: e.altKey, prev: draw && draw.a, shift: e.shiftKey }); if (!draw) { draw = { tool: 'measure', a: p, b: p }; } else { const d = { id: U.uid('d'), a: draw.a, b: p }; if (G.len(d.a, d.b) > .02) { L.dims.push(d); draw = null; GP.changed('annot'); ui.select([{ k: 'dim', id: d.id }]); GP.toast(`길이 ${G.len(d.a, d.b).toFixed(2)} m`); } } GP.emit('overlay'); return true; }
  if (t === 'note') { const n = { id: U.uid('n'), x: U.r3(fp.x), z: U.r3(fp.z), text: '', _new: true }; L.notes.push(n); GP.changed('annot'); ui.setTool('select'); ui.select([{ k: 'note', id: n.id }]); return true; }
  if (t === 'roomlabel') { if (!G.pip(fp.x, fp.z, L.room.pts)) { GP.toast('방 안쪽을 눌러 주세요', { bad: true }); return true; } const r = { id: U.uid('r'), x: U.r3(fp.x), z: U.r3(fp.z), name: '공간 이름', _new: true }; L.rooms.push(r); GP.changed('annot'); ui.setTool('select'); ui.select([{ k: 'room', id: r.id }]); return true; }
  if (t === 'opening') { const h = openingHover(fp); if (!h) { GP.toast('벽이나 가벽 가까이를 눌러 주세요', { bad: true }); return true; } if (h.host === 'room' && GP.CV && GP.CV.of(L, h.seg)) { tools.preview = null; GP.CV.glassClick(L, h); return true; } const k = ui.openingKind; const w = tools.openingWidth(k); const o = { id: U.uid('o'), host: h.host, seg: h.seg, t: U.r3(U.clamp(U.snap(h.t, .05), w / 2, h.L - w / 2)), w, h: k === 'window' ? 1.2 : 2.1, sill: .9, kind: k }; L.openings.push(o); tools.preview = null; GP.changed('openings'); ui.setTool('select'); ui.select([{ k: 'opening', id: o.id }]); return true; }
  if (t === 'fillwall') { const h = wallHover(fp); if (!h) { GP.toast('벽 가까이를 눌러 주세요', { bad: true }); return true; } GP.panels.fillWallDialog(h); return true; }
  return false;
}
function toolMove(e) {
  const S = GP.S, fp = S.floorAt(e.clientX, e.clientY);
  if (draw.rect) { draw.b = snapPoint(fp.x, fp.z, { e, alt: e.altKey }); }
  else if (draw.tool === 'measure') draw.b = snapPoint(fp.x, fp.z, { e, alt: e.altKey, prev: draw.a, shift: e.shiftKey });
  else draw.cur = snapPoint(fp.x, fp.z, { e, alt: e.altKey, prev: draw.pts[draw.pts.length - 1], shift: e.shiftKey });
  GP.emit('overlay'); S.invalidate();
}
/* wall-shape tool: the wall under the pointer shows its + (add a point) */
tools.hoverSeg = -1;
function hoverWallSeg(fp) {
  const t = tools.polyTarget(); if (!t || t.kind !== 'room') return -1; const P = t.pts, n = P.length, mpp = GP.S.mpp(), tol = mpp * 16; let best = -1, bd = tol;
  for (let i = 0; i < n; i++) { const c = G.closest(fp.x, fp.z, P[i], P[(i + 1) % n]); if (c.d < bd) { bd = c.d; best = i; } }
  if (best >= 0) { const inner = GP.CV ? GP.CV.hidden(GP.L()) : new Set(); for (let i = 0; i < n; i++) if (!inner.has(i) && Math.hypot(P[i][0] - fp.x, P[i][1] - fp.z) < mpp * 18) return -1; }      // over a corner: that is the corner, not a wall
  return best;
}
function setHoverSeg(i) {
  if (tools.hoverSeg === i) return; tools.hoverSeg = i;
  document.querySelectorAll('#ovHandles .hd.mid').forEach(el => el.classList.toggle('show', +el.dataset.i === i));
}
tools.addPointOnWall = (i, at) => {
  const t = tools.polyTarget(); if (!t) return; const pts = t.pts, n = pts.length, a = pts[i], b = pts[(i + 1) % n], old0 = pts.map(p => p.slice());
  const c = at ? G.closest(at[0], at[1], a, b) : null, p = c && c.t > .05 && c.t < c.L - .05 ? [U.r3(c.x), U.r3(c.z)] : [U.r3((a[0] + b[0]) / 2), U.r3((a[1] + b[1]) / 2)];
  pts.splice(i + 1, 0, p); tools.reindex(t, 'ins', i, old0); selOnly(i + 1); GP.changed(t.kind === 'room' ? ['room', 'openings'] : t.kind); GP.emit('overlay');
};
function toolHover(e) {
  const S = GP.S, fp = S.floorAt(e.clientX, e.clientY);
  if (draw) { toolMove(e); return; }
  if (ui.tool === 'vertex') { setHoverSeg(hoverWallSeg(fp)); return; }
  if (ui.tool === 'opening') { tools.preview = openingHover(fp); const pv = tools.preview, cg = pv && pv.host === 'room' && GP.CV && GP.CV.of(GP.L(), pv.seg) ? GP.CV.glassAt(GP.L(), pv) : null; if (cg) ui.setHint(cg.del != null ? '누르면 이 유리를 <b>벽으로</b> 되돌려요' : `누르면 여기 <b>${((cg.u1 - cg.u0) / cg.pl.L * GP.CV.len(GP.L(), cg.c)).toFixed(2)} m</b>를 통유리로 · 곡선 벽에는 문 · 창문 대신 통유리를 넣어요`); else if (tools._cgHint) ui.setHint(); tools._cgHint = !!cg; GP.emit('overlay'); }
  else if (ui.tool === 'fillwall') { hover = wallHover(fp); GP.emit('overlay'); }
  else if (['part', 'matPoly', 'measure'].includes(ui.tool)) { hover = { snap: snapPoint(fp.x, fp.z, { e, alt: e.altKey }) }; GP.emit('overlay'); }
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
  const P = L.room.pts, h = GP.WALL_T / 2; for (let i = 0; i < P.length; i++) { const e = G.edge(P, i); if (e.L < 1e-4) continue; const c = G.closest(fp.x, fp.z, [e.a[0] - e.nx * h, e.a[1] - e.nz * h], [e.b[0] - e.nx * h, e.b[1] - e.nz * h]), d = c.d; if (d < tol && (!best || d < best.d - 1e-6)) best = { host: 'room', seg: i, t: c.t, L: e.L, d }; }
  for (const p of L.partitions) for (let i = 0; i < p.pts.length - 1; i++) { const c = G.closest(fp.x, fp.z, p.pts[i], p.pts[i + 1]); if (c.d < tol && (!best || c.d < best.d)) best = { host: p.id, seg: i, t: c.t, L: c.L, d: c.d }; }
  return best;
}
function wallHover(fp) { let best = null; for (const W of wallLines()) { const c = G.closest(fp.x, fp.z, W.a, W.b); const s = (fp.x - W.a[0]) * W.nx + (fp.z - W.a[1]) * W.nz; if (s < -.1 || c.d > .9) continue; if (!best || c.d < best.d) best = Object.assign({ d: c.d }, W); } return best; }
tools.key = (e) => {
  const k = e.key;
  if (GP.pen && GP.pen.key(e)) return true;
  if (draw && draw.tool === 'part') {
    if (/^[0-9.]$/.test(k)) { draw.num = (draw.num || '') + k; ui.setHint(`길이 입력: <b>${draw.num}</b> m · <kbd>Enter</kbd>로 확정`); return true; }
    if (k === 'Backspace') { if (draw.num) draw.num = draw.num.slice(0, -1); else if (draw.pts.length > 1) draw.pts.pop(); else draw = null; GP.emit('overlay'); e.preventDefault(); return true; }
    if (k === 'Enter') { if (draw.num) { const l = parseFloat(draw.num); const last = draw.pts[draw.pts.length - 1], cur = draw.cur || last; const ang = Math.atan2(cur[1] - last[1], cur[0] - last[0]) || 0; if (l > 0) draw.pts.push([U.r3(last[0] + Math.cos(ang) * l), U.r3(last[1] + Math.sin(ang) * l)]); draw.num = ''; ui.setHint(); GP.emit('overlay'); } else finishDraw(); return true; }
  }
  if (draw && draw.tool === 'matPoly') { if (k === 'Enter') { finishDraw(); return true; } if (k === 'Backspace') { if (draw.pts.length > 1) draw.pts.pop(); else draw = null; GP.emit('overlay'); e.preventDefault(); return true; } }
  if (k === 'Escape' && (draw || ui.placing)) { tools.cancel(); if (ui.tool !== 'select' && !draw) ui.setTool('select'); return true; }
  if (k === 'Escape' && tools.selVs.size > 1) { selOnly(-1); GP.emit('overlay'); GP.S.invalidate(); return true; }
  const nv = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[k], tg = nv && tools.polyTarget();
  if (nv && tg && tools.selVs.size && (ui.tool === 'vertex' || tools.selVs.size > 1)) { const st = e.shiftKey ? .1 : .01; tools.selVs.forEach(q => { const p = tg.pts[q]; if (p) tg.pts[q] = [U.r3(p[0] + nv[0] * st), U.r3(p[1] + nv[1] * st)]; }); e.preventDefault(); GP.changed(tg.kind === 'room' ? 'room' : tg.kind); return true; }
  if (ui.placing && (k === 'r' || k === 'R')) { tools.rotateGhost(e.shiftKey ? -90 : 90); return true; }
  const kq = (k || '').toLowerCase(); if (ui.placing && (kq === 'q' || kq === 'e')) { const st = e.shiftKey ? 1 : 15; tools.rotateGhost(kq === 'e' ? st : -st); return true; }
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
  hd.rcs = target.kind === 'room' && GP.CV ? GP.CV.list(GP.L()).filter(c => c.ref.rc && (idx.includes(c.s) || idx.includes(c.e))).map(c => ({ c, p0: c.ref.rc.p.slice() })) : [];
}
const ptrAng = (it, fp) => -Math.atan2(fp.x - it.x, fp.z - it.z) / DEG;      // the item rotation that would put its front towards the pointer
const fineKey = e => e.shiftKey || e.ctrlKey || e.metaKey;
/* how far the pointer has turned round (cx, cz) since the press: added up move by move, at a quarter speed while Shift / Ctrl is held */
function turnBy(h, c, fp, e) { const a = ptrAng(c, fp); let d = a - h.last; d = ((d % 360) + 540) % 360 - 180; h.last = a; h.acc += fineKey(e) ? d * .25 : d; return h.acc; }
const rotSnap = (a, e) => e.altKey ? Math.round(a * 10) / 10 : U.snap(a, fineKey(e) ? 1 : 15);
const rotHint = (txt, e) => ui.setHint(`${txt} · ${fineKey(e) ? '<b>미세 1°</b>' : '15° 단위'} · <kbd>Shift</kbd>/<kbd>Ctrl</kbd> 미세 · <kbd>Alt</kbd> 자유`);
tools.handleDown = (e, el) => {
  e.preventDefault(); e.stopPropagation(); const h = el.dataset.h;
  if (h === 'cp' && GP.CV) { GP.CV.cpDown(e, el); return; }
  if ((h === 'rr' || h === 'rcv') && GP.CV) { GP.CV.rcDown(e, el); return; }
  if ((h === 'xf' || h === 'xfr') && GP.XF) { GP.XF.handleDown(e, el); return; }
  if ((h === 'arcp' || h === 'arca' || h === 'arcr') && GP.ARC) { GP.ARC.pivotDown(e, el); return; }
  if ((h === 'cge' || h === 'cgm') && GP.CV) { GP.CV.glassDown(e, el); return; }
  const target = tools.polyTarget();
  if (h === 'v' && target) {
    const i = +el.dataset.i, S = tools.selVs;
    if (e.shiftKey) { if (S.has(i)) { S.delete(i); tools.selV = S.size ? [...S][S.size - 1] : -1; GP.emit('overlay'); GP.S.invalidate(); return; } S.add(i); }
    else if (!S.has(i)) selOnly(i);
    tools.selV = i; cap(el, e);
    const fp = GP.S.floorAt(e.clientX, e.clientY);
    if (S.size > 1) startMulti(target, i, fp, null, true);
    else if (sizable(target) && !e.altKey) hd = { type: 'c', target, i, start: target.pts.map(p => p.slice()), fx: fp.x, fz: fp.z, moved: false };
    else hd = { type: 'v', target, i, moved: false };
    GP.emit('overlay'); GP.S.invalidate(); return;
  }
  if (h === 'e' && target && !e.altKey) { startSide(target, +el.dataset.i, GP.S.floorAt(e.clientX, e.clientY)); cap(el, e); return; }
  if ((h === 'm' || h === 'e') && target) { const i = +el.dataset.i, pts = target.pts, n = pts.length, a = pts[i], b = pts[(i + 1) % n]; const old0 = pts.map(p => p.slice()); pts.splice(i + 1, 0, [U.r3((a[0] + b[0]) / 2), U.r3((a[1] + b[1]) / 2)]); tools.reindex(target, 'ins', i, old0); selOnly(i + 1); GP.S.dataChanged(); hd = { type: 'v', target, i: i + 1, moved: true }; GP.emit('overlay'); return; }
  const it = ui.selItems()[0];
  if (h === 'rs' && it) { const [cx, cz] = [+el.dataset.cx, +el.dataset.cz]; const d = GP.dims(it); const opp = G.l2w(it.x, it.z, it.rot, -cx * d.w / 2, -cz * d.d / 2); { const line = GP.S.style === 'line'; GP.R3.freeze = { uid: it.uid, line, tv: GP.R3.topView(it, null, line) }; } hd = { type: 'rs', it, cx, cz, opp }; cap(el, e); return; }
  if (h === 'grot') {
    const its = ui.selItems(); if (its.length < 2) return; const pts = []; its.forEach(q => pts.push(...GP.footprint(q))); const b = G.bounds(pts), fp = GP.S.floorAt(e.clientX, e.clientY), c = { x: b.cx, z: b.cz };
    hd = { type: 'grot', cx: b.cx, cz: b.cz, R: Math.max(.2, Math.hypot(fp.x - b.cx, fp.z - b.cz)), a0: ptrAng(c, fp), last: ptrAng(c, fp), acc: 0, d: 0, start: its.map(q => ({ it: q, x: q.x, z: q.z, rot: q.rot })), moved: false }; cap(el, e); return;
  }
  if (h === 'rot' && it) { const fp = GP.S.floorAt(e.clientX, e.clientY); hd = { type: 'rot', it, r0: it.rot, last: ptrAng(it, fp), acc: 0 }; cap(el, e); return; }
  if (h === 'oe') { const so = ui.selObj(); if (!so || so.k !== 'opening') return; const o = so.obj, hs = GP.hostSeg(o), sp = GP.openingSpan(o, hs); if (!sp) return; hd = { type: 'oe', o, side: +el.dataset.side, fixed: +el.dataset.side > 0 ? sp.s0 : sp.s1 }; cap(el, e); return; }
};
tools.handleMove = (e) => {
  if (!hd) return; const S = GP.S, fp = S.floorAt(e.clientX, e.clientY);
  if (hd.type === 'v') {
    const P = hd.target.pts, n = P.length, q = gridOf(e), open = hd.target.open, room = hd.target.kind === 'room'; let x = fp.x, z = fp.z;
    const nb = open ? [hd.i - 1, hd.i + 1].filter(j => j >= 0 && j < n) : [(hd.i - 1 + n) % n, (hd.i + 1) % n];
    if (!q.free) {      // (the point itself, its neighbours and its own two walls are not something to stick to: that held it in place)
      const sp = snapPoint(x, z, { g: q.g, fine: q.fine, skipPts: new Set([P[hd.i], ...nb.map(j => P[j])]), skipWalls: room ? new Set([(hd.i - 1 + n) % n, hd.i]) : null }); x = sp[0]; z = sp[1];
      if (!q.fine) { const tol = S.mpp() * 6; for (const j of nb) { if (Math.abs(fp.x - P[j][0]) < tol) x = P[j][0]; if (Math.abs(fp.z - P[j][1]) < tol) z = P[j][1]; } }      // lines up with a neighbour (a straight wall) only within 6 px of it
    }
    P[hd.i] = [U.r3(x), U.r3(z)]; hd.moved = true; if (room && GP.CV) GP.CV.resample(GP.L()); S.dataChanged(); GP.emit('overlay');
    const segs = (open ? [hd.i - 1, hd.i].filter(k => k >= 0 && k < n - 1) : [(hd.i - 1 + n) % n, hd.i]).map(k => `<b>${G.len(P[k], P[(k + 1) % n]).toFixed(2)} m</b>`);
    ui.setHint(`${room ? `${GP.CV ? GP.CV.num(GP.L(), hd.i) : hd.i + 1}번 꼭짓점` : '꼭짓점'} · ${segs.length > 1 ? '양옆' : ''} 벽 ${segs.join(' · ')}${gridHint(q)}`); return;
  }
  if (hd.type === 'e') {
    const q = gridOf(e); let d = (fp.x - hd.fx) * hd.nx + (fp.z - hd.fz) * hd.nz; if (!q.free) d = U.snap(d, q.g);
    const Q = offsetSide(hd.start, hd.i, d); if (Q) { setPts(hd.target, Q); hd.moved = true; S.dataChanged(); GP.emit('overlay'); }
    sizeHint(hd.target, ` · ${d >= 0 ? '늘림' : '줄임'} ${U.cm(Math.abs(d))}cm${gridHint(q)}`); return;
  }
  if (hd.type === 'c') {
    const P0 = hd.start, n = P0.length, i = hd.i, p = (i - 1 + n) % n, E1 = G.edge(P0, p), E2 = G.edge(P0, i), dx = fp.x - hd.fx, dz = fp.z - hd.fz;
    const q = gridOf(e); let d1 = -(dx * E1.nx + dz * E1.nz), d2 = -(dx * E2.nx + dz * E2.nz); if (!q.free) { d1 = U.snap(d1, q.g); d2 = U.snap(d2, q.g); }
    const Q1 = offsetSide(P0, p, d1), Q = Q1 && offsetSide(Q1, i, d2); if (Q) { setPts(hd.target, Q); hd.moved = true; S.dataChanged(); GP.emit('overlay'); }
    sizeHint(hd.target, `${gridHint(q)} · 누를 때 <kbd>Alt</kbd>: 이 점만 옮기기`); return;
  }
  if (hd.type === 'vs') {
    const g = gridOf(e); let dx = fp.x - hd.fx, dz = fp.z - hd.fz;
    if (hd.wall) { const w = hd.wall, d = dx * w.nx + dz * w.nz; dx = w.nx * d; dz = w.nz * d; if (!g.free) { const ds = U.snap(d, g.g); dx = w.nx * ds; dz = w.nz * ds; } }
    else if (!g.free) { dx = U.snap(dx, g.g); dz = U.snap(dz, g.g); }
    hd.idx.forEach((k, q) => { hd.target.pts[k] = [U.r3(hd.start[q][0] + dx), U.r3(hd.start[q][1] + dz)]; });
    (hd.rcs || []).forEach(r => { r.c.ref.rc.p = [U.r3(r.p0[0] + dx), U.r3(r.p0[1] + dz)]; });
    hd.moved = true; if (hd.target.kind === 'room' && GP.CV) GP.CV.resample(GP.L()); S.dataChanged(); GP.emit('overlay');
    GP.ui.setHint(`${hd.wall ? '벽' : `꼭짓점 ${hd.idx.length}개`} 이동 <b>${hd.wall ? U.cm(Math.abs(dx * hd.wall.nx + dz * hd.wall.nz)) + 'cm' : `${U.cm(Math.hypot(dx, dz))}cm`}</b>${gridHint(g)}`); return;
  }
  if (hd.type === 'rs') {
    const q = gridOf(e), it = hd.it; const [lx, lz] = G.w2l(hd.opp[0], hd.opp[1], it.rot, fp.x, fp.z); let w = Math.abs(lx), d = Math.abs(lz); if (!q.free) { w = U.snap(w, q.g); d = U.snap(d, q.g); } w = Math.max(.1, w); d = Math.max(.03, d);
    const c = G.l2w(hd.opp[0], hd.opp[1], it.rot, hd.cx * w / 2, hd.cz * d / 2); it.w = U.r3(w); it.d = U.r3(d); it.x = U.r3(c[0]); it.z = U.r3(c[1]); hd.moved = true; GP.checks.quick(); S.invalidate(); GP.emit('overlay');
    ui.setHint(`크기 <b>${U.cm(w)} × ${U.cm(d)} cm</b>${gridHint(q)}`); return;
  }
  if (hd.type === 'grot') {
    let d = rotSnap(turnBy(hd, { x: hd.cx, z: hd.cz }, fp, e), e); d = ((d % 360) + 540) % 360 - 180; if (d === -180) d = 180;
    hd.d = d; for (const s of hd.start) { const [lx, lz] = G.w2l(hd.cx, hd.cz, 0, s.x, s.z), [nx, nz] = G.l2w(hd.cx, hd.cz, d, lx, lz); s.it.x = U.r3(nx); s.it.z = U.r3(nz); s.it.rot = U.normRot(s.rot + d); }
    hd.moved = true; GP.checks.quick(); S.invalidate(); GP.emit('overlay'); rotHint(`${hd.start.length}개 함께 회전 <b>${Math.round(d * 10) / 10}°</b>`, e); return;
  }
  if (hd.type === 'rot') { const it = hd.it, a = U.normRot(rotSnap(hd.r0 + turnBy(hd, it, fp, e), e)); it.rot = a; hd.moved = true; GP.checks.quick(); S.invalidate(); GP.emit('overlay'); rotHint(`방향 <b>${Math.round(a * 10) / 10}°</b>`, e); return; }
  if (hd.type === 'oe') {
    const q = gridOf(e), o = hd.o, hs = GP.hostSeg(o); if (!hs) return; const c = G.closest(fp.x, fp.z, hs.a, hs.b); let t = q.free ? c.t : U.snap(c.t, q.g);
    t = hd.side > 0 ? U.clamp(t, hd.fixed + .3, hs.L) : U.clamp(t, 0, hd.fixed - .3);
    const s0 = Math.min(t, hd.fixed), s1 = Math.max(t, hd.fixed); o.w = U.r3(s1 - s0); o.t = U.r3((s0 + s1) / 2); hd.moved = true; S.invalidate(); GP.emit('overlay');
    GP.ui.setHint(`폭 <b>${U.cm(o.w)}cm</b>${gridHint(q)}`); return;
  }
};
/* while several items are being turned: the pivot, the handle's distance from it and its current angle (the overlay draws the handle there) */
tools.groupRotState = () => hd && hd.type === 'grot' ? { cx: hd.cx, cz: hd.cz, R: hd.R, ang: hd.a0 + hd.d } : null;
tools.handleUp = () => {
  if (!hd) return; const h = hd; hd = null; if (GP.R3.freeze) { GP.R3.freeze = null; GP.S.invalidate(); }
  if (h.type === 'grot' || h.type === 'rot') { ui.setHint(); if (h.moved) GP.changed('items'); ui.renderInspector(); GP.emit('overlay'); return; }
  if (h.type === 'e' || h.type === 'c') {
    canvas().style.cursor = ''; ui.setHint();
    if (h.moved) { const t = h.target; if (t.kind === 'mat') { if (isConvex(t.obj.pts)) t.obj.pts = clipToRoom(t.obj.pts); tools.snapMat(t.obj); } GP.changed(t.kind === 'mat' ? 'mats' : 'zones'); }
    ui.renderInspector(); GP.emit('overlay'); return;
  }
  if (h.type === 'v' || h.type === 'vs' || h.type === 'rs') ui.setHint();
  if (h.moved) { if (h.type === 'v' || h.type === 'vs') { const k = h.target.kind; if (k === 'mat') tools.snapMat(h.target.obj); GP.changed(k === 'room' ? 'room' : k); } else if (h.type === 'oe') { GP.changed('openings'); ui.setHint(); } else GP.changed('items'); }
  ui.renderInspector(); GP.emit('overlay');
};
tools.polyTarget = () => {
  const L = GP.L();
  if (ui.tool === 'vertex') return L.room.empty ? null : { kind: 'room', pts: L.room.pts };
  if (ui.tool !== 'select') return null;
  const so = ui.selObj(); if (!so) return null;
  if (['mat', 'zone'].includes(so.k)) return { kind: so.k, obj: so.obj, pts: so.obj.pts };
  if (so.k === 'part') return { kind: 'part', obj: so.obj, pts: so.obj.pts, open: true };
  return null;
};
/* Walls and partition pieces are known by their index (openings.seg, wallMarks, wallTex). When a point is added or removed the
   indices move: this keeps every door, window, mirror and wall finish on the wall it was on.
   t: {kind:'room'|'part', obj, pts, open}; op 'ins' (a point was added after i, splitting piece i) | 'del' (point i removed); old: the points before. */
tools.reindex = (t, op, i, old) => {
  if (!t || (t.kind !== 'room' && t.kind !== 'part')) return; const L = GP.L(), host = t.kind === 'room' ? 'room' : t.obj.id, n0 = old.length, open = !!t.open;
  const ops = L.openings.filter(o => o.host === host), maps = t.kind === 'room' ? [L.wallMarks || (L.wallMarks = {}), L.wallTex || (L.wallTex = {})] : [];
  const len = k => G.len(old[k], old[(k + 1) % n0]), gone = new Set();
  const remap = f => { for (const m of maps) { const nx = {}; Object.keys(m).map(Number).sort((a, b) => a - b).forEach(k => { for (const s of [].concat(f(k))) if (s != null && nx[s] == null) nx[s] = m[k]; }); for (const k in m) delete m[k]; Object.assign(m, nx); } };
  if (op === 'ins') {
    const cut = G.len(old[i], t.pts[i + 1]);
    for (const o of ops) { if (o.seg > i) o.seg++; else if (o.seg === i && o.t > cut) { o.seg = i + 1; o.t = U.r3(o.t - cut); } }
    remap(k => k < i ? k : k === i ? [i, i + 1] : k + 1);
  } else if (!open && i === 0) {      // the last wall and the first one become one (the new last wall)
    const add = len(n0 - 1); for (const o of ops) { if (o.seg === n0 - 1) o.seg = n0 - 2; else if (o.seg === 0) { o.seg = n0 - 2; o.t = U.r3(o.t + add); } else o.seg--; }
    remap(k => k === n0 - 1 || k === 0 ? n0 - 2 : k - 1);
  } else if (open && (i === 0 || i === n0 - 1)) {      // an end point of a partition: its end piece goes, with what was on it
    const dead = i === 0 ? 0 : n0 - 2; for (const o of ops) { if (o.seg === dead) gone.add(o); else if (o.seg > dead) o.seg--; }
  } else {      // pieces i-1 and i become one
    const add = len(i - 1); for (const o of ops) { if (o.seg === i) { o.seg = i - 1; o.t = U.r3(o.t + add); } else if (o.seg > i) o.seg--; }
    remap(k => k < i ? k : k === i ? i - 1 : k - 1);
  }
  if (gone.size) L.openings = L.openings.filter(o => !gone.has(o));
  if (t.kind === 'room' && GP.CV) GP.CV.reindex(L, op, i, n0);
};
/* after the room or a partition was replaced as a whole: doors / windows / finishes of walls that no longer exist go. Returns how many openings went. */
GP.pruneWalls = () => {
  const L = GP.L(), n = L.room.pts.length, before = L.openings.length;
  L.openings = L.openings.filter(o => { if (o.host === 'room') return o.seg >= 0 && o.seg < n; const p = L.partitions.find(q => q.id === o.host); return !!p && o.seg >= 0 && o.seg < p.pts.length - 1; });
  for (const m of [L.wallMarks, L.wallTex]) if (m) for (const k in m) if (!(+k < n)) delete m[k];
  return before - L.openings.length;
};
/* the walls go (to draw them again from nothing); doors and windows on them go too. ask: say what goes first */
tools.clearRoom = async (ask) => {
  const L = GP.L(), nOp = L.openings.filter(o => o.host === 'room').length;
  if (ask && !(await GP.confirm(`공간(벽)을 비우고 처음부터 다시 그릴까요?${nOp ? ` 벽에 있는 문 · 창문 ${nOp}개도 지워져요.` : ''} 기구 · 바닥은 그대로 있어요. (Ctrl+Z로 되돌릴 수 있어요)`, '비우고 새로 그리기'))) return false;
  L.room.empty = true; delete L.room.curves; L.openings = L.openings.filter(o => o.host !== 'room'); L.wallMarks = {}; L.wallTex = {}; selOnly(-1);
  GP.changed(['room', 'openings']); ui.setTool(GP.wiz && GP.wiz.on ? 'select' : 'select'); return true;
};
tools.deleteVertex = (i) => {
  const t = tools.polyTarget(); if (!t) return; const min = t.open ? 2 : 3;
  const del = (tools.selVs.size > 1 && tools.selVs.has(i) ? [...tools.selVs] : [i]).sort((a, b) => b - a);
  if (t.pts.length - del.length < min) { if (t.kind === 'room') { tools.clearRoom(true); return; } GP.toast(`꼭짓점은 최소 ${min}개가 필요해요`, { bad: true }); return; }
  del.forEach(k => { const old = t.pts.map(p => p.slice()); t.pts.splice(k, 1); tools.reindex(t, 'del', k, old); }); selOnly(-1); GP.changed(t.kind === 'room' ? ['room', 'openings'] : t.kind);
};
tools.setAngle = (i, deg, side) => {
  const P = GP.L().room.pts, n = P.length, p = P[i], j = side === 'prev' ? (i - 1 + n) % n : (i + 1) % n, keep = P[j].slice();
  const L = G.len(p, keep), a0 = Math.atan2(keep[1] - p[1], keep[0] - p[0]), d = (deg - G.interior(P, i)) * DEG; let best = null;
  for (const s of [1, -1]) { const a = a0 + s * d; P[j] = [U.r3(p[0] + Math.cos(a) * L), U.r3(p[1] + Math.sin(a) * L)]; const err = Math.abs(G.interior(P, i) - deg); if (!best || err < best.err) best = { err, pt: P[j].slice() }; }
  P[j] = best.pt;
  if (best.err > .3 || G.selfX(P)) { P[j] = keep; GP.toast('이 각도로 바꾸면 벽이 서로 겹쳐요. 다른 쪽 벽을 돌리거나 각도를 조금 바꿔 보세요', { bad: true, ms: 4500 }); GP.emit('overlay'); return false; }
  GP.changed('room'); GP.toast(`${GP.CV ? GP.CV.num(GP.L(), i) : i + 1}번 꼭짓점을 ${Math.round(G.interior(P, i) * 10) / 10}°로 바꿨어요`); return true;
};
tools.setWallLength = (i, Lnew) => {
  const P = GP.L().room.pts, e = G.edge(P, i), delta = Lnew - e.L, pb = e.b[0] * e.dx + e.b[1] * e.dz;
  P.forEach((p, k) => { if (k !== i && (p[0] * e.dx + p[1] * e.dz) >= pb - 1e-3) { p[0] = U.r3(p[0] + e.dx * delta); p[1] = U.r3(p[1] + e.dz * delta); } });
  if (GP.CV) for (const c of GP.CV.list(GP.L())) if (c.ref.rc) { const p = c.ref.rc.p; if ((p[0] * e.dx + p[1] * e.dz) >= pb - 1e-3) c.ref.rc.p = [U.r3(p[0] + e.dx * delta), U.r3(p[1] + e.dz * delta)]; }
  GP.changed('room'); GP.toast(`벽 길이를 ${Lnew.toFixed(2)} m로 바꿨어요`);
};
window.addEventListener('pointermove', e => { if (hd) tools.handleMove(e); });
window.addEventListener('pointerup', () => { if (hd) tools.handleUp(); });

/* ---------------- item actions ---------------- */
act.setZ = (it, zAbs) => {
  const m = GP.mountOf(it); const h = GP.dims(it).h;
  if (m === 'ceil') it.elev = U.r3(Math.max(0, GP.P.settings.wallH - h - zAbs)); else if (m === 'wall') it.elev = U.r3(Math.max(0, zAbs)); else it.elev = U.r3(Math.max(0, zAbs - GP.surfaceAt(it.x, it.z, it)));
};
/* wall / floor finish: kind 'floor' | 'wall'; wall = one wall's own finish ('' = the room's) */
act.setTex = (kind, id, wall) => {
  const P = GP.P, L = GP.L();
  if (kind === 'floor') P.settings.floorBase = id || 'concrete';
  else if (kind === 'ceil') P.settings.ceilTex = id || 'paint';
  else if (wall != null) { L.wallTex = L.wallTex || {}; const cv = GP.CV && GP.CV.of(L, wall), N = L.room.pts.length, ws = cv ? [...Array(cv.n).keys()].map(k => (cv.s + k) % N) : [wall]; ws.forEach(w => { if (id) L.wallTex[w] = id; else delete L.wallTex[w]; }); }      // (a curve: all its pieces)
  else P.settings.wallTex = id || 'paint';
  GP.changed(['room', 'settings']); ui.renderInspector();
  if (!(GP.V3 && GP.V3.on) && GP.texDef(id) && GP.texDef(id).size && !act._texTold) { act._texTold = true; GP.toast(kind === 'floor' ? '바닥 재질은 3D 보기에서 제대로 보여요 (도면에는 연하게)' : '벽 재질은 3D 보기에서 보여요', { ms: 3500 }); }
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
/* copies of grouped items form groups of their own */
const cloneItems = (its, dx, dz) => { const L = GP.L(), gmap = {}; return its.map(it => { const n = Object.assign(U.clone(it), { uid: U.uid(), x: U.r3(it.x + dx), z: U.r3(it.z + dz) }); if (n.grp) n.grp = gmap[n.grp] || (gmap[n.grp] = U.uid('g')); L.items.push(n); return n; }); };
act.dupSel = () => {
  const its = ui.selItems(); if (!its.length) return; let dx = .5, dz = .5;
  if (its.length === 1) { const it = its[0], d = GP.dims(it), c = (GP.getDef(it.type) || {}).cl || {}; const gap = Math.max(.1, ((c.l || 0) + (c.r || 0)) / 2); const [nx, nz] = G.l2w(it.x, it.z, it.rot, d.w + gap, 0); dx = nx - it.x; dz = nz - it.z; }
  const out = cloneItems(its, dx, dz); act.lastDup = { pairs: its.map((it, k) => [it.uid, out[k].uid]) };
  GP.changed('items'); ui.select(out.map(it => ({ k: 'item', id: it.uid })), false, true);
};
/* Shift+D: one more copy, as far on and in the same direction as the last copy is from its original right now
   (like Photoshop's duplicate-again; a copy that was moved or nudged after copying counts where it is now) */
act.canDupAgain = () => { const its = ui.selItems(), ld = act.lastDup; if (!its.length || !ld || !ld.pairs || ld.pairs.length !== its.length || !its.every(it => ld.pairs.some(p => p[1] === it.uid))) return false; const a = GP.findItem(ld.pairs[0][0]), b = GP.findItem(ld.pairs[0][1]); return !!(a && b && Math.hypot(b.x - a.x, b.z - a.z) >= .01); };
act.dupAgain = () => {
  const its = ui.selItems(), ld = act.lastDup; if (!its.length) return;
  const pairs = ld && ld.pairs && ld.pairs.length === its.length && its.every(it => ld.pairs.some(p => p[1] === it.uid)) ? ld.pairs : null;
  const src = pairs && GP.findItem(pairs[0][0]), cp = pairs && GP.findItem(pairs[0][1]), dx = cp && src ? cp.x - src.x : 0, dz = cp && src ? cp.z - src.z : 0;
  if (!pairs || !src || Math.hypot(dx, dz) < .01) { act.dupSel(); GP.toast('복제했어요. 끌어서 간격을 정하고 Shift+D를 누르면 같은 간격 · 방향으로 이어서 복제돼요', { ms: 4000 }); return; }
  const copies = pairs.map(p => GP.findItem(p[1])), out = cloneItems(copies, dx, dz); act.lastDup = { pairs: copies.map((it, k) => [it.uid, out[k].uid]) };
  GP.changed('items'); ui.select(out.map(it => ({ k: 'item', id: it.uid })), false, true);
};
/* leave the sweep of swing doors free of rubber blocks: the mats are cut (pieces keep their block and trim, the new edges get trim) */
act.clearDoorMats = (only) => {
  const L = GP.L(); let n = 0;
  for (const o of L.openings) {
    if ((only && o !== only) || !GP.calc.doorMats(o).length) continue; const K = GP.calc.doorSwing(o, .4), next = [];
    for (const m of L.mats) { if (GP.calc.overlapArea(m.pts, K) <= .01) { next.push(m); continue; } n++; GP.calc.cutPoly(m.pts, K).forEach((pts, k) => next.push(k ? Object.assign(U.clone(m), { id: U.uid('m'), pts }) : Object.assign(m, { pts }))); }
    L.mats = next;
  }
  return n;
};
act.group = () => {
  const its = ui.selItems(); if (its.length < 2) { GP.toast('기구를 두 개 이상 함께 골라 주세요', { bad: true }); return; }
  const g = U.uid('g'); its.forEach(it => { it.grp = g; }); GP.changed('items'); ui.renderInspector(); GP.emit('overlay');
  GP.toast(`${its.length}개를 그룹으로 묶었어요. 하나만 고르려면 Ctrl+클릭`, { ms: 3500 });
};
act.ungroup = () => {
  const its = ui.selItems().filter(it => it.grp); if (!its.length) return; its.forEach(it => { delete it.grp; }); GP.changed('items'); ui.renderInspector(); GP.emit('overlay'); GP.toast('그룹을 풀었어요');
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
/* the units of a selection: a group picked as a whole moves as one piece (its members keep their places to each other); a machine
   on its own (or one member picked out of its group with Ctrl+click) is its own unit. A unit is a virtual machine: the box of its
   members in the frame of its first member (x, z, rot, w, d) and where each member sits in that box. */
GP.units = (its) => {
  const L = GP.L(), sel = new Set(its.map(it => it.uid)), groups = new Map(), raw = [];
  for (const it of its) {
    const whole = it.grp && L.items.filter(q => q.grp === it.grp).every(q => sel.has(q.uid));
    if (whole) { if (!groups.has(it.grp)) { const l = []; groups.set(it.grp, l); raw.push(l); } groups.get(it.grp).push(it); } else raw.push([it]);
  }
  return raw.map(list => {
    const f = list[0], r = f.rot;
    if (list.length === 1) { const d = GP.dims(f); return { x: f.x, z: f.z, rot: r, w: d.w, d: d.d, members: [{ it: f, lx: 0, lz: 0, dr: 0 }] }; }
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const it of list) for (const p of GP.footprint(it)) { const [lx, lz] = G.w2l(f.x, f.z, r, p[0], p[1]); x0 = Math.min(x0, lx); x1 = Math.max(x1, lx); z0 = Math.min(z0, lz); z1 = Math.max(z1, lz); }
    const [x, z] = G.l2w(f.x, f.z, r, (x0 + x1) / 2, (z0 + z1) / 2);
    return { x, z, rot: r, w: x1 - x0, d: z1 - z0, group: true, members: list.map(it => { const [lx, lz] = G.w2l(x, z, r, it.x, it.z); return { it, lx, lz, dr: it.rot - r }; }) };
  });
};
/* a unit put at (x, z) turned to rot: its members follow as one piece */
GP.unitPlace = (u, x, z, rot) => { for (const m of u.members) { const [wx, wz] = G.l2w(x, z, rot, m.lx, m.lz); m.it.x = U.r3(wx); m.it.z = U.r3(wz); m.it.rot = U.normRot(rot + m.dr); } };
GP.unitFeet = (u, x, z, rot) => u.members.map(m => { const [wx, wz] = G.l2w(x, z, rot, m.lx, m.lz); return GP.footprint(Object.assign({}, m.it, { x: wx, z: wz, rot: rot + m.dr })); });
const oneUnit = () => GP.toast('그룹 하나만 골랐어요. 그룹끼리(또는 다른 기구와) 맞추려면 함께 고르세요 · 그룹 안 기구끼리는 Ctrl+클릭으로 골라요', { ms: 4500 });
/* the box of each unit in the frame of the unit the first picked machine is in */
function unitBoxes(its) {
  const us = GP.units(its), ref = us.find(u => u.members.some(m => m.it === its[0])) || us[0];
  return { us, ref, rot: ref.rot, box: us.map(u => { let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity; for (const m of u.members) for (const p of GP.footprint(m.it)) { const [lx, lz] = G.w2l(ref.x, ref.z, ref.rot, p[0], p[1]); x0 = Math.min(x0, lx); x1 = Math.max(x1, lx); z0 = Math.min(z0, lz); z1 = Math.max(z1, lz); } return { u, x0, x1, z0, z1 }; }) };
}
const shiftUnit = (u, rot, dx, dz) => { const [wx, wz] = G.l2w(0, 0, rot, dx, dz); u.members.forEach(m => { m.it.x = U.r3(m.it.x + wx); m.it.z = U.r3(m.it.z + wz); }); };
act.align = (mode) => {
  const its = ui.selItems(); if (its.length < 2) return; const { us, ref, rot, box } = unitBoxes(its); if (us.length < 2) return oneUnit();
  const rb = box.find(b => b.u === ref), t = mode === 'F' ? Math.max(...box.map(b => b.z1)) : mode === 'B' ? Math.min(...box.map(b => b.z0)) : (rb.z0 + rb.z1) / 2;
  box.forEach(b => shiftUnit(b.u, rot, 0, mode === 'F' ? t - b.z1 : mode === 'B' ? t - b.z0 : t - (b.z0 + b.z1) / 2));
  GP.changed('items');
};
act.gap = (gapCm, even) => {
  const its = ui.selItems(); if (its.length < 2) return; ui.lastGap = gapCm; const { us, rot, box } = unitBoxes(its); if (us.length < 2) return oneUnit();
  box.sort((p, q) => (p.x0 + p.x1) - (q.x0 + q.x1)); let g = gapCm / 100;
  if (even) { const span = box[box.length - 1].x1 - box[0].x0, sumW = box.reduce((s, b) => s + b.x1 - b.x0, 0); g = (span - sumW) / (box.length - 1); }
  let cur = box[0].x0; box.forEach(b => { shiftUnit(b.u, rot, cur - b.x0, 0); cur += (b.x1 - b.x0) + g; });
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
  if (mod && k === 'g') { e.preventDefault(); if (e.shiftKey) act.ungroup(); else act.group(); return; }
  if (!mod && e.shiftKey && k === 'd') { e.preventDefault(); act.dupAgain(); return; }
  if (mod && k === 'c') { act.copy(); return; }
  if (mod && k === 'v') { e.preventDefault(); act.paste(); return; }
  if (mod && k === 'a') { e.preventDefault(); ui.select(GP.L().items.map(it => ({ k: 'item', id: it.uid }))); return; }
  if (mod) return;
  if (k === 'r') { act.rotateSel(e.shiftKey ? -90 : 90); return; }
  if (!mod && (k === 'q' || k === 'e')) { const st = e.shiftKey ? 1 : 15; act.rotateSel(k === 'e' ? st : -st); return; }
  if (k === 'w') { act.snapSelToWall(); return; }
  if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); if (tools.polyTarget() && tools.selV >= 0 && ui.tool === 'vertex') tools.deleteVertex(tools.selV); else act.delSel(); return; }
  const st = e.shiftKey ? .1 : .01; const mv = { ArrowLeft: [-st, 0], ArrowRight: [st, 0], ArrowUp: [0, -st], ArrowDown: [0, st] }[e.key];
  if (mv && ui.sel.length) { e.preventDefault(); act.nudge(mv[0], mv[1]); return; }
  const tk = { v: 'select', m: 'measure', t: ui.step === 'space' ? 'xform' : null }[k]; if (tk && !(tk === 'measure' && GP.wiz && GP.wiz.on)) ui.setTool(tk);
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
  if (a === 'arcWall' && GP.ARC) return GP.ARC.followWall();
  if (a === 'arcCenter' && GP.ARC) return GP.ARC.center();
  if (a === 'arcStraight' && GP.ARC) return GP.ARC.straight();
  if (a === 'alignF') return act.align('F'); if (a === 'alignC') return act.align('C'); if (a === 'alignB') return act.align('B');
  if (a === 'gap') return act.gap(+$('#mGap').value || 0); if (a === 'even') return act.gap(0, true);
  if (a === 'grot') return act.groupRotate(90);
  if (a === 'group') return act.group(); if (a === 'ungroup') return act.ungroup(); if (a === 'dupAgain') return act.dupAgain();
  if (a === 'saveset') return GP.panels.saveSetDialog(ui.selItems());
  if (so && so.k === 'part' && a === 'pkind') { so.obj.kind = b.dataset.v; GP.changed('parts'); ui.renderInspector(); return; }
  if (a === 'fin' && so && (so.k === 'opening' || so.k === 'part')) { so.obj[b.dataset.k] = b.dataset.v; GP.changed(so.k === 'opening' ? 'openings' : 'parts'); ui.renderInspector(); return; }
  if (so && so.k === 'opening' && a === 'wtype') { const o = so.obj; if (b.dataset.v === 'fixed') { o.wtype = 'fixed'; if ((o.sill ?? .9) > .3) { o.sill = .1; o.h = U.r2(Math.max(1.2, GP.P.settings.wallH - .6)); } } else { delete o.wtype; if ((o.sill ?? .9) < .3) { o.sill = .9; o.h = 1.2; } } GP.changed('openings'); ui.renderInspector(); return; }
  if (so && so.k === 'opening' && a === 'odoormat') { if (act.clearDoorMats(so.obj)) { GP.changed('mats'); GP.toast('문 열리는 자리의 고무블럭을 비웠어요. 잘린 변에는 경사 마감재가 둘러져요'); } ui.renderInspector(); return; }
  if (so && so.k === 'mat' && a === 'mdoor') { if (act.clearDoorMats()) { GP.changed('mats'); GP.toast('문 열리는 자리의 고무블럭을 비웠어요'); } ui.renderInspector(); return; }
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
    if (id === 'iLoad') {
      it.load = el.checked || undefined; GP.changed('items'); ui.renderInspector();
      const rest = GP.L().items.filter(q => q !== it && GP.R3.canLoad(q.type) && !q.load);
      if (it.load && rest.length) GP.toast('올린 모습으로 바꿨어요', { ms: 6000, action: `올릴 수 있는 다른 기구 ${rest.length}개도 올리기`, onAction: () => { rest.forEach(q => { q.load = true; }); GP.changed('items'); } });
      return;
    }
    if (id === 'iLogoBg') { it.bgKeep = !el.checked || undefined; GP.changed('items'); ui.renderInspector(); return; }
    if (el.dataset.param) { it.params = Object.assign({}, it.params || {}); it.params[el.dataset.param] = el.type === 'number' ? v : el.value; if (it.type === 'desk' && el.dataset.param === 'shape') { const d = GP.dims(it); if ((el.value === 'L' || el.value === 'U') && d.d < 1.2) it.d = 1.6; if (el.value === 'round' && d.d < .9) it.d = 1.0; if (el.value === 'straight' || el.value === 'two') it.d = .7; } GP.changed('items'); ui.renderInspector(); return; }
    if (!isFinite(v)) return;
    if (id === 'iW') it.w = U.clamp(v, 5, 5000) / 100; else if (id === 'iD') it.d = U.clamp(v, 2, 5000) / 100; else if (id === 'iH') it.h = U.clamp(v, 1, 1000) / 100;
    else if (id === 'iRot') it.rot = U.normRot(v); else if (id === 'iX') it.x = U.r3(v); else if (id === 'iZ') it.z = U.r3(v);
    else if (id === 'iElev') { if (GP.mountOf(it) === 'ceil') it.elev = Math.max(0, v / 100); else act.setZ(it, v / 100); }
    else return;
    GP.changed('items'); ui.renderInspector(); return;
  }
  if (!so) return; const o = so.obj;
  if (el.dataset.fc && (so.k === 'opening' || so.k === 'part')) { o[el.dataset.fc] = el.value; GP.changed(so.k === 'opening' ? 'openings' : 'parts'); ui.renderInspector(); return; }
  if (so.k === 'part') { if (id === 'pGw') { o.gw = GP.gwVal(v); GP.changed('parts'); return; } if (id === 'pT' && isFinite(v)) o.thick = U.clamp(v, 3, 60) / 100; GP.changed('parts'); return; }
  if (so.k === 'opening') {
    const hs = GP.hostSeg(o);
    if (id === 'oUnder') { o.underCut = el.checked || undefined; GP.changed('openings'); ui.renderInspector(); return; }
    if (id === 'oKind') o.kind = el.value;
    if (id === 'oW' && isFinite(v)) { const sp = GP.openingSpan(o, hs); o.w = U.clamp(v, 30, 800) / 100; if (hs) o.w = Math.min(o.w, hs.L - .02); o.t = U.clamp(sp.s0 + o.w / 2, o.w / 2, hs ? hs.L - o.w / 2 : 99); }
    if (id === 'oH' && isFinite(v)) o.h = U.clamp(v, 30, 600) / 100; if (id === 'oS' && isFinite(v)) o.sill = U.clamp(v, 0, 400) / 100;
    if (id === 'oL' && isFinite(v) && hs) o.t = U.r3(U.clamp(v / 100 + o.w / 2, o.w / 2, hs.L - o.w / 2));
    if (id === 'oR' && isFinite(v) && hs) o.t = U.r3(U.clamp(hs.L - v / 100 - o.w / 2, o.w / 2, hs.L - o.w / 2));
    GP.changed('openings'); ui.renderInspector(); return;
  }
  if ((so.k === 'mat' || so.k === 'zone') && (id === 'mW' || id === 'mD')) { if (isFinite(v)) tools.setRectSize(o, so.k, id === 'mW' ? 'x' : 'z', U.clamp(v, .5, 200)); ui.renderInspector(); return; }
  if (so.k === 'mat') { if (id === 'mB') o.block = el.value; GP.changed('mats'); ui.renderInspector(); return; }
  if (so.k === 'zone') { if (id === 'zN') o.name = el.value; if (id === 'zC') o.color = el.value; if (live) { GP.S.invalidate(); return; } GP.changed('zones'); return; }
  if (so.k === 'room') { if (id === 'rN') o.name = el.value; if (live) { GP.S.invalidate(); return; } GP.changed('annot'); return; }
  if (so.k === 'note') { if (id === 'nT') o.text = el.value; if (live) { GP.S.invalidate(); return; } GP.changed('annot'); return; }
  if (so.k === 'wall') { const i = o; if (id === 'wL' && isFinite(v) && v > .3) { tools.setWallLength(i, v); ui.renderInspector(); } return; }
};
})();
