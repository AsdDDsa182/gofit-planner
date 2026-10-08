/* GoFit Planner — calculations & automatic checks */
(function () {
'use strict';
const GP = window.GP, U = GP.U, G = GP.G;
const calc = GP.calc = {};

/* ---------- rubber mats: blocks & trims ---------- */
calc.matArea = m => Math.abs(G.area(m.pts));
calc.matBlocks = m => Math.ceil(calc.matArea(m) / U.PY * (GP.lib.defaults.blocksPerPyeong || 13) - 1e-9);
function coverSegs(m) {
  const L = GP.L(), out = []; const P = L.room.pts;
  for (let i = 0; i < P.length; i++) out.push([P[i], P[(i + 1) % P.length]]);
  for (const p of L.partitions) { if (p.pts.length < 2) continue; const t = p.thick || .1; const A = G.offset(p.pts, t / 2, false), B = G.offset(p.pts, -t / 2, false); for (let i = 0; i < p.pts.length - 1; i++) { out.push([A[i], A[i + 1]]); out.push([B[i], B[i + 1]]); } }
  for (const o of L.mats) { if (o === m || (o.thick || 25) < (m.thick || 25)) continue; for (let i = 0; i < o.pts.length; i++) out.push([o.pts[i], o.pts[(i + 1) % o.pts.length]]); }
  return out;
}
calc.matTrims = (m) => {
  const P = m.pts, n = P.length, res = { segs: [], chains: [], straight: 0, outC: 0, inC: 0, len: 0 };
  if (n < 3) return res;
  const covers = coverSegs(m), tol = .05;
  const exposed = []; // per edge: list of [s0, s1]
  for (let i = 0; i < n; i++) {
    const e = G.edge(P, i); const iv = [];
    for (const [c0, c1] of covers) {
      const d0 = Math.abs((c0[0] - e.a[0]) * e.nx + (c0[1] - e.a[1]) * e.nz), d1 = Math.abs((c1[0] - e.a[0]) * e.nx + (c1[1] - e.a[1]) * e.nz);
      if (d0 > tol || d1 > tol) continue;
      let t0 = (c0[0] - e.a[0]) * e.dx + (c0[1] - e.a[1]) * e.dz, t1 = (c1[0] - e.a[0]) * e.dx + (c1[1] - e.a[1]) * e.dz; if (t0 > t1) [t0, t1] = [t1, t0];
      t0 = Math.max(0, t0); t1 = Math.min(e.L, t1); if (t1 - t0 > .01) iv.push([t0, t1]);
    }
    iv.sort((a, b) => a[0] - b[0]); const merged = []; for (const q of iv) { if (merged.length && q[0] <= merged[merged.length - 1][1] + .02) merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], q[1]); else merged.push(q.slice()); }
    const ex = []; let cur = 0; for (const q of merged) { if (q[0] > cur + .03) ex.push([cur, q[0]]); cur = Math.max(cur, q[1]); } if (e.L > cur + .03) ex.push([cur, e.L]);
    exposed.push({ e, ex });
  }
  const cornerAt = new Array(n).fill(null); // at vertex i (end of edge i-1, start of edge i)
  for (let i = 0; i < n; i++) {
    const prev = exposed[(i - 1 + n) % n], next = exposed[i];
    const pe = prev.ex.length && prev.ex[prev.ex.length - 1][1] >= prev.e.L - .03, ns = next.ex.length && next.ex[0][0] <= .03;
    if (pe && ns) { const A = G.interior(P, i); if (Math.abs(A - 90) < 4) cornerAt[i] = 'out'; else if (Math.abs(A - 270) < 4) cornerAt[i] = 'in'; else if (Math.abs(A - 180) > 2) cornerAt[i] = 'cut'; else cornerAt[i] = 'flat'; }
  }
  const segs = [];
  for (let i = 0; i < n; i++) {
    const { e, ex } = exposed[i];
    ex.forEach(([s0, s1], k) => {
      let len = s1 - s0; res.len += len;
      if (k === 0 && s0 <= .03 && (cornerAt[i] === 'out' || cornerAt[i] === 'in')) len -= .3;
      if (k === ex.length - 1 && s1 >= e.L - .03 && (cornerAt[(i + 1) % n] === 'out' || cornerAt[(i + 1) % n] === 'in')) len -= .3;
      if (len > .01) res.straight += Math.ceil(len / 2.4 - 1e-6);
      const sg = { i, a: [e.a[0] + e.dx * s0, e.a[1] + e.dz * s0], b: [e.a[0] + e.dx * s1, e.a[1] + e.dz * s1], nx: -e.nx, nz: -e.nz, len: s1 - s0, sv: s0 <= .03, ev: s1 >= e.L - .03 };
      res.segs.push(sg); segs.push(sg);
    });
  }
  cornerAt.forEach(c => { if (c === 'out') res.outC++; if (c === 'in') res.inC++; });
  // continuous chains (for drawing the trim as one mitred band)
  const K = segs.length, link = k => { const a = segs[k], b = segs[(k + 1) % K]; return K > 1 && a.ev && b.sv && b.i === (a.i + 1) % n || (K === 1 && a.ev && a.sv && n === 1); };
  if (K) {
    const allLinked = segs.every((_, k) => link(k));
    if (allLinked) { res.chains.push({ pts: segs.map(q => q.a), normals: segs.map(q => [q.nx, q.nz]), closed: true }); }
    else {
      let start = 0; while (link((start - 1 + K) % K)) start = (start + 1) % K;
      let ch = null;
      for (let c = 0; c < K; c++) { const k = (start + c) % K, q = segs[k]; if (!ch) { ch = { pts: [q.a], normals: [], closed: false }; res.chains.push(ch); } ch.pts.push(q.b); ch.normals.push([q.nx, q.nz]); if (!link(k)) ch = null; }
    }
  }
  return res;
};
calc.matSummary = () => {
  const L = GP.L(); const blocks = {}, trims = {};
  for (const m of L.mats) {
    const k = `${m.block}|${m.thick}`; const b = blocks[k] || (blocks[k] = { block: m.block, thick: m.thick, area: 0, count: 0 }); b.area += calc.matArea(m); b.count += calc.matBlocks(m);
    if (m.trim && m.trim !== 'none') { const t = calc.matTrims(m); const tk = `${m.trim}|${m.thick}`; const q = trims[tk] || (trims[tk] = { trim: m.trim, thick: m.thick, straight: 0, outC: 0, inC: 0, len: 0 }); q.straight += t.straight; q.outC += t.outC; q.inC += t.inC; q.len += t.len; }
  }
  return { blocks: Object.values(blocks), trims: Object.values(trims) };
};

/* ---------- partitions length ---------- */
calc.partLength = () => { const out = {}; for (const p of GP.L().partitions) { let l = 0; for (let i = 0; i < p.pts.length - 1; i++) l += G.len(p.pts[i], p.pts[i + 1]); out[p.kind || 'wall'] = (out[p.kind || 'wall'] || 0) + l; } return out; };

/* ---------- raster helpers ---------- */
function makeGrid(cellHint, pad) {
  const L = GP.L(), P = L.room.pts, b = G.bounds(P); const area = b.sx * b.sz; const cell = Math.max(cellHint || .05, Math.sqrt(area / 160000));
  const m = Math.max(1, Math.ceil((pad || 0) / cell)), W = Math.ceil(b.sx / cell) + 2 * m, H = Math.ceil(b.sz / cell) + 2 * m, x0 = b.minX - m * cell, z0 = b.minZ - m * cell;
  const inside = new Uint8Array(W * H);
  for (let j = 0; j < H; j++) { const z = z0 + (j + .5) * cell; const xs = []; for (let i = 0, k = P.length - 1; i < P.length; k = i++) { const zi = P[i][1], zk = P[k][1]; if ((zi > z) !== (zk > z)) xs.push(P[i][0] + (z - zi) * (P[k][0] - P[i][0]) / (zk - zi)); } xs.sort((a, c) => a - c); for (let q = 0; q + 1 < xs.length; q += 2) { const a = Math.max(0, Math.ceil((xs[q] - x0) / cell - .5)), c = Math.min(W - 1, Math.floor((xs[q + 1] - x0) / cell - .5)); for (let i = a; i <= c; i++) inside[j * W + i] = 1; } }
  return { W, H, x0, z0, cell, inside };
}
function stampSeg(gr, arr, a, b, r, val) { const L = G.len(a, b), steps = Math.max(1, Math.ceil(L / (gr.cell / 2))); const rr = Math.ceil(r / gr.cell); for (let s = 0; s <= steps; s++) { const x = a[0] + (b[0] - a[0]) * s / steps, z = a[1] + (b[1] - a[1]) * s / steps; const ci = Math.floor((x - gr.x0) / gr.cell), cj = Math.floor((z - gr.z0) / gr.cell); for (let dj = -rr; dj <= rr; dj++) for (let di = -rr; di <= rr; di++) { const i = ci + di, j = cj + dj; if (i < 0 || j < 0 || i >= gr.W || j >= gr.H) continue; const cx = gr.x0 + (i + .5) * gr.cell, cz = gr.z0 + (j + .5) * gr.cell; if (G.closest(cx, cz, a, b).d <= r + gr.cell * .5) arr[j * gr.W + i] = val; } } }
function stampPoly(gr, arr, poly, val) { const b = G.bounds(poly); const i0 = Math.max(0, Math.floor((b.minX - gr.x0) / gr.cell)), i1 = Math.min(gr.W - 1, Math.ceil((b.maxX - gr.x0) / gr.cell)), j0 = Math.max(0, Math.floor((b.minZ - gr.z0) / gr.cell)), j1 = Math.min(gr.H - 1, Math.ceil((b.maxZ - gr.z0) / gr.cell)); for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const x = gr.x0 + (i + .5) * gr.cell, z = gr.z0 + (j + .5) * gr.cell; if (G.pip(x, z, poly)) arr[j * gr.W + i] = val; } }
/* two-pass chamfer distance (meters) to cells where src == 0 */
function distField(gr, free) {
  const { W, H, cell } = gr, INF = 1e9, d = new Float32Array(W * H), a = cell, b = cell * Math.SQRT2;
  for (let k = 0; k < W * H; k++) d[k] = free[k] ? INF : 0;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const k = j * W + i; if (!d[k]) continue; let v = d[k]; if (i > 0) v = Math.min(v, d[k - 1] + a); if (j > 0) { v = Math.min(v, d[k - W] + a); if (i > 0) v = Math.min(v, d[k - W - 1] + b); if (i < W - 1) v = Math.min(v, d[k - W + 1] + b); } d[k] = v; }
  for (let j = H - 1; j >= 0; j--) for (let i = W - 1; i >= 0; i--) { const k = j * W + i; if (!d[k]) continue; let v = d[k]; if (i < W - 1) v = Math.min(v, d[k + 1] + a); if (j < H - 1) { v = Math.min(v, d[k + W] + a); if (i < W - 1) v = Math.min(v, d[k + W + 1] + b); if (i > 0) v = Math.min(v, d[k + W - 1] + b); } d[k] = v; }
  return d;
}

/* ---------- region area (공간 이름) ---------- */
calc.regionArea = (x, z) => {
  const gr = makeGrid(.05), L = GP.L(); const block = new Uint8Array(gr.W * gr.H);
  for (let k = 0; k < block.length; k++) block[k] = gr.inside[k] ? 0 : 1;
  for (const p of L.partitions) for (let i = 0; i < p.pts.length - 1; i++) stampSeg(gr, block, p.pts[i], p.pts[i + 1], Math.max((p.thick || .1) / 2, gr.cell * .6), 1);
  const si = Math.floor((x - gr.x0) / gr.cell), sj = Math.floor((z - gr.z0) / gr.cell); if (si < 0 || sj < 0 || si >= gr.W || sj >= gr.H || block[sj * gr.W + si]) return 0;
  const seen = new Uint8Array(gr.W * gr.H), st = [sj * gr.W + si]; seen[st[0]] = 1; let cnt = 0;
  while (st.length) { const k = st.pop(); cnt++; const i = k % gr.W, j = (k / gr.W) | 0; const nb = [i > 0 ? k - 1 : -1, i < gr.W - 1 ? k + 1 : -1, j > 0 ? k - gr.W : -1, j < gr.H - 1 ? k + gr.W : -1]; for (const q of nb) if (q >= 0 && !seen[q] && !block[q]) { seen[q] = 1; st.push(q); } }
  return cnt * gr.cell * gr.cell;
};

/* ---------- occupancy ---------- */
calc.occupancy = () => {
  const L = GP.L(), P = L.room.pts, b = G.bounds(P), step = Math.max(.1, Math.sqrt(b.sx * b.sz / 40000)); let inRoom = 0, foot = 0, used = 0;
  const R = L.items.filter(it => GP.mountOf(it) === 'floor' && !(GP.getDef(it.type) || {}).wall).map(it => { const def = GP.getDef(it.type) || {}, d = GP.dims(it), f = -it.rot * U.DEG; return { x: it.x, z: it.z, c: Math.cos(f), s: Math.sin(f), w2: d.w / 2, d2: d.d / 2, cl: def.cl || { f: 0, b: 0, l: 0, r: 0 }, flat: !!def.flat }; });
  for (let z = b.minZ + step / 2; z < b.maxZ; z += step) for (let x = b.minX + step / 2; x < b.maxX; x += step) {
    if (!G.pip(x, z, P)) continue; inRoom++; let inF = false, inU = false;
    for (const r of R) { const dx = x - r.x, dz = z - r.z, lx = dx * r.c - dz * r.s, lz = dx * r.s + dz * r.c; if (lx >= -r.w2 && lx <= r.w2 && lz >= -r.d2 && lz <= r.d2) { inU = true; if (!r.flat) inF = true; } else if (lx >= -r.w2 - r.cl.l && lx <= r.w2 + r.cl.r && lz >= -r.d2 - r.cl.b && lz <= r.d2 + r.cl.f) inU = true; if (inF && inU) break; }
    if (inF) foot++; if (inU) used++;
  }
  const c = step * step; return { room: inRoom * c, foot: foot * c, used: used * c };
};

/* ---------- distances from a selected item ---------- */
calc.obstacleSegs = (exclude) => {
  const L = GP.L(), segs = []; const P = L.room.pts; for (let i = 0; i < P.length; i++) segs.push([P[i], P[(i + 1) % P.length]]);
  for (const p of L.partitions) { const t = p.thick || .1; const A = G.offset(p.pts, t / 2, false), B = G.offset(p.pts, -t / 2, false); for (let i = 0; i < p.pts.length - 1; i++) { segs.push([A[i], A[i + 1]]); segs.push([B[i], B[i + 1]]); } }
  for (const it of L.items) { if (exclude && exclude.has(it.uid)) continue; const def = GP.getDef(it.type); if (!def || def.flat || GP.mountOf(it) !== 'floor') continue; const F = GP.footprint(it); for (let i = 0; i < 4; i++) segs.push([F[i], F[(i + 1) % 4]]); }
  return segs;
};
calc.distances = (it) => {
  const segs = calc.obstacleSegs(new Set([it.uid])), d = GP.dims(it), out = [];
  [[0, d.d / 2, 0, 1], [0, -d.d / 2, 0, -1], [d.w / 2, 0, 1, 0], [-d.w / 2, 0, -1, 0]].forEach(([lx, lz, ux, uz]) => {
    const a = G.l2w(it.x, it.z, it.rot, lx, lz), e = G.l2w(it.x, it.z, it.rot, lx + ux, lz + uz); const dx = e[0] - a[0], dz = e[1] - a[1];
    const t = G.rayHit(a[0], a[1], dx, dz, segs, 8); if (t >= 8) return; out.push({ a, b: [a[0] + dx * t, a[1] + dz * t], d: t, warn: t < .3 });
  });
  return out;
};

/* ---------- checks ---------- */
const checks = GP.checks = { conflicts: new Map(), list: [], aisle: null };
function vr(it) { const y = GP.itemY(it), h = GP.dims(it).h; return [y, y + h]; }
checks.quick = () => {
  const L = GP.L(), P = L.room.pts, m = new Map(); const add = (u, r) => { if (!m.has(u)) m.set(u, new Set()); m.get(u).add(r); };
  const F = L.items.map(it => ({ it, c: GP.footprint(it), d: GP.getDef(it.type) || {}, v: vr(it), mount: GP.mountOf(it) }));
  const partPolys = [];
  for (const p of L.partitions) { const t = p.thick || .1; const A = G.offset(p.pts, t / 2, false), B = G.offset(p.pts, -t / 2, false); for (let i = 0; i < p.pts.length - 1; i++) partPolys.push({ poly: [A[i], A[i + 1], B[i + 1], B[i]], h: p.kind === 'half' ? (p.height || 1.2) : (p.height || GP.P.settings.wallH) }); }
  for (const f of F) {
    if (f.mount === 'ceil' || f.d.wall) { if (!f.c.every(pt => G.pip(pt[0], pt[1], P))) add(f.it.uid, 'wall'); continue; }
    if (!G.rectInside(f.c, P)) add(f.it.uid, 'wall');
    else for (const pp of partPolys) if (G.overlap(f.c, pp.poly, .01) && f.v[0] < pp.h) { add(f.it.uid, 'part'); break; }
  }
  for (let i = 0; i < F.length; i++) for (let j = i + 1; j < F.length; j++) {
    const a = F[i], b = F[j]; if (a.d.flat || b.d.flat) continue; if ((a.d.wall || a.mount !== 'floor') && (b.d.wall || b.mount !== 'floor') && a.mount !== b.mount) continue;
    const thin = f => (f.d.wall || f.mount === 'wall') && GP.dims(f.it).d <= .07; if (thin(a) !== thin(b) && (thin(a) ? b : a).mount === 'floor') continue;
    if (a.v[1] <= b.v[0] + .01 || b.v[1] <= a.v[0] + .01) continue;
    if (G.overlap(a.c, b.c)) { add(a.it.uid, 'overlap'); add(b.it.uid, 'overlap'); }
  }
  checks.conflicts = m; return m;
};
checks.full = () => {
  const L = GP.L(), st = GP.P.settings, lib = GP.lib, list = []; const P = L.room.pts;
  const push = (sev, code, msg, uids, at) => list.push({ sev, code, msg, uids: uids || [], at });
  if (G.selfX(P)) push('err', 'room', '벽 선이 서로 교차해요. 공간 단계에서 꼭짓점을 정리해 주세요.');
  const conf = checks.quick();
  const nameOf = it => GP.itemName(it);
  const pairs = new Set();
  const F = L.items.map(it => ({ it, c: GP.footprint(it), d: GP.getDef(it.type) || {}, v: vr(it), mount: GP.mountOf(it) }));
  for (const [uid, rs] of conf) {
    const it = GP.findItem(uid); if (!it) continue;
    if (rs.has('wall')) push('err', 'wall', `${U.jo(nameOf(it), '이', '가')} 벽 밖으로 나갔어요`, [uid], [it.x, it.z]);
    if (rs.has('part')) push('err', 'part', `${U.jo(nameOf(it), '이', '가')} 가벽과 겹쳐요`, [uid], [it.x, it.z]);
    if (rs.has('overlap')) { const others = F.filter(f => f.it.uid !== uid && conf.get(f.it.uid)?.has('overlap') && G.overlap(GP.footprint(it), f.c) && !(f.v[1] <= vr(it)[0] + .01 || vr(it)[1] <= f.v[0] + .01)); others.forEach(o => { const k = [uid, o.it.uid].sort().join('|'); if (pairs.has(k)) return; pairs.add(k); push('err', 'overlap', `${nameOf(it)} · ${U.jo(nameOf(o.it), '이', '가')} 겹쳐요`, [uid, o.it.uid], [(it.x + o.it.x) / 2, (it.z + o.it.z) / 2]); }); }
  }
  // safety space intrusion
  for (const f of F) {
    if (f.mount !== 'floor' || f.d.flat) continue; const c = f.d.cl || {}; if (!(c.f + c.b + c.l + c.r)) continue; const d = GP.dims(f.it);
    const zone = G.rectPts(f.it.x, f.it.z, f.it.rot, -d.w / 2 + .02, d.w / 2 - .02, -d.d / 2 - c.b, d.d / 2 + c.f); if (!(c.f + c.b)) continue;
    for (const g of F) { if (g === f || g.d.flat || g.mount !== 'floor' || g.d.wall) continue; if (conf.get(f.it.uid)?.has('overlap') && G.overlap(f.c, g.c)) continue; if (G.overlap(zone, g.c, .05)) { push('warn', 'clear', `${nameOf(f.it)} 앞뒤 사용 공간에 ${U.jo(nameOf(g.it), '이', '가')} 들어와 있어요`, [f.it.uid, g.it.uid], [g.it.x, g.it.z]); } }
  }
  // carry-in through doors
  const doors = L.openings.filter(o => o.kind !== 'window');
  if (doors.length) {
    const dw = Math.max(...doors.map(o => o.w)), dh = Math.max(...doors.map(o => o.h ?? 2.1));
    for (const f of F) { if (f.d.flat || f.d.wall || f.d.fit === 'actual' && ['column', 'platform', 'turf', 'stretchzone'].includes(f.it.type) || f.it.type === 'column') continue; if (!GP.EQUIP_CATS.has(f.d.cat)) continue; const d = GP.dims(f.it); const s = [d.w, d.d, d.h].sort((a, b) => a - b); if (s[0] > dw - .02 || s[1] > dh - .02) push('info', 'door', `${U.jo(nameOf(f.it), '은', '는')} 출입문(${Math.round(dw * 100)}×${Math.round(dh * 100)}cm)보다 커서 분해해서 들여와야 해요`, [f.it.uid], [f.it.x, f.it.z]); }
  }
  // ceiling height: the machine itself, and the room needed above it while in use (runner on a treadmill, top step of a stepmill)
  const CH = st.wallH || 2.8, byType = new Map();
  for (const f of F) {
    if (f.mount !== 'floor' || f.d.flat || f.d.hFromWall) continue; const d = GP.dims(f.it), top = f.v[1], m3 = (GP.M3CAT && GP.M3CAT[f.it.type]) || {};   // columns etc. reach the ceiling by design
    const need = m3.uh ? m3.uh + (d.h - (f.d.h || d.h)) + (top - d.h) : 0;
    const sev = top > CH - .01 ? 'err' : need > CH + .005 ? 'warn' : ''; if (!sev) continue;
    const k = f.it.type + '|' + sev, g = byType.get(k) || { f, sev, top, need, uids: [] }; g.uids.push(f.it.uid); g.top = Math.max(g.top, top); g.need = Math.max(g.need, need); byType.set(k, g);
  }
  for (const g of byType.values()) {
    const n = g.uids.length, nm = nameOf(g.f.it) + (n > 1 ? ` ${n}대` : '');
    if (g.sev === 'err') push('err', 'ceil', `${U.jo(nm, '이', '가')} 천장보다 높아요 (기구 ${U.cm(g.top)}cm · 천장 ${U.cm(CH)}cm)`, g.uids, [g.f.it.x, g.f.it.z]);
    else push('warn', 'ceil', `${U.jo(nm, '은', '는')} 쓸 때 천장이 ${U.r2(g.need)}m 이상 필요해요 (지금 ${CH}m)`, g.uids, [g.f.it.x, g.f.it.z]);
  }
  // power: machines that need a socket reach the nearest outlet with their cord; total load and circuits
  const pow = L.items.map(it => ({ it, pw: (GP.getDef(it.type) || {}).pw || 0 })).filter(q => q.pw > 0);
  checks.power = null;
  if (pow.length) {
    const outlets = L.items.filter(it => it.type === 'outlet'), cord = lib.defaults.cordLen || 3;
    const mach = pow.filter(q => q.pw >= 300 && GP.mountOf(q.it) === 'floor');
    if (mach.length && !outlets.length) push('info', 'power', `전원이 필요한 기구가 ${mach.length}대 있어요. 시설·설비의 콘센트를 벽에 놓으면 전원선(${cord}m)이 닿는지 점검해요`, mach.map(q => q.it.uid));
    else for (const q of mach) {
      const C = GP.footprint(q.it); let best = Infinity;
      for (const o of outlets) for (let i = 0; i < C.length; i++) best = Math.min(best, G.closest(o.x, o.z, C[i], C[(i + 1) % C.length]).d);
      if (best > cord) push('warn', 'power', `${nameOf(q.it)}에서 가장 가까운 콘센트까지 ${U.r2(best)}m · 전원선(${cord}m)이 닿지 않아요`, [q.it.uid], [q.it.x, q.it.z]);
    }
    const kw = pow.reduce((s, q) => s + q.pw, 0) / 1000, ded = pow.filter(q => q.pw >= 2000).length, rest = pow.filter(q => q.pw < 2000).reduce((s, q) => s + q.pw, 0);
    checks.power = { kw, ded, circuits: ded + Math.ceil(rest / 3000) };
    if (mach.length) push('info', 'powerSum', `전기: 기구·설비 합계 약 ${U.r2(kw)}kW · 권장 회로 ${checks.power.circuits}개 (큰 기구 ${ded}대는 전용 회로). 정확한 용량은 전기 기사와 확인하세요`, []);
  }
  // emergency exit: every machine reachable from a door through a passage of the minimum width; the longest way out
  const E = checks.egress = calc.egress(lib.defaults.aisleMin || .9);
  if (E) {
    if (!E.doors) push('warn', 'exit', '출입문이 없어요. 문·창문 도구로 출입문을 넣으면 비상 동선을 점검해요');
    else {
      if (E.blocked.length) push('err', 'exit', `출입문 앞을 막고 있어요: ${E.blocked.map(nameOf).join(', ')}`, E.blocked.map(it => it.uid), [E.blocked[0].x, E.blocked[0].z]);
      if (E.open && E.cut.length) push('warn', 'exit', `${E.cut.length}대는 출입문까지 ${Math.round((lib.defaults.aisleMin || .9) * 100)}cm 이상 통로가 이어지지 않아요: ${E.cut.slice(0, 4).map(nameOf).join(', ')}${E.cut.length > 4 ? ' 등' : ''}`, E.cut.map(it => it.uid), [E.cut[0].x, E.cut[0].z]);
      if (E.far > 30) push('warn', 'exit', `가장 먼 곳에서 출입문까지 약 ${Math.round(E.far)}m예요 (30m 이내 권장)`, [], E.farAt);
    }
  }
  // narrow aisles
  const A = checks.aisle = calc.aisle(lib.defaults.aisleMin || .9);
  if (A && A.comps.length) push('warn', 'aisle', `좁은 통로 ${A.comps.length}곳 (기준 ${Math.round((lib.defaults.aisleMin || .9) * 100)}cm)`, [], [A.comps[0].x, A.comps[0].z]);
  checks.list = list; GP.emit('checks', list); return list;
};

/* ---------- emergency exit: passages at least minW wide from the doors (room doors are exits; doors in partitions let people through).
   Each exit gets a 1.2 m "porch" outside it, so the door frame narrows the way out exactly as much as it does in reality. ---------- */
calc.egress = (minW, list) => {        // list: items to test instead of the plan's (the automatic layout tries spots with it)
  const L = GP.L(), P = L.room.pts; if (P.length < 3) return null;
  const exits = L.openings.filter(o => o.kind !== 'window' && o.host === 'room');
  const gr = makeGrid(.1, 1.5), free = new Uint8Array(gr.inside), items = [], W = gr.W, c = gr.cell, psegs = [];   // psegs: partition pieces (door gaps left out)
  for (const it of list || L.items) { const def = GP.getDef(it.type); if (!def || def.flat || def.wall || GP.mountOf(it) !== 'floor') continue; stampPoly(gr, free, GP.footprint(it), 0); items.push(it); }
  for (const p of L.partitions) for (let i = 0; i < p.pts.length - 1; i++) {
    const a = p.pts[i], b = p.pts[i + 1], s = G.segInfo(a, b);
    const gaps = L.openings.filter(o => o.host === p.id && o.seg === i && o.kind !== 'window').map(o => GP.openingSpan(o)).filter(Boolean).sort((u, v) => u.s0 - v.s0);
    const seg = (u, v) => { if (v - u > .01) { const A = [a[0] + s.dx * u, a[1] + s.dz * u], B = [a[0] + s.dx * v, a[1] + s.dz * v]; stampSeg(gr, free, A, B, (p.thick || .1) / 2, 0); psegs.push([A, B]); } };
    let t0 = 0; for (const g of gaps) { seg(t0, g.s0); t0 = g.s1; } seg(t0, s.L);
  }
  const porch = exits.map(o => { const hs = GP.hostSeg(o); if (!hs) return null; const sp = GP.openingSpan(o, hs), at = (u, d) => [hs.a[0] + hs.dx * u + hs.nx * d, hs.a[1] + hs.dz * u + hs.nz * d]; return { o, hs, sp, at, poly: [at(sp.s0, .02), at(sp.s1, .02), at(sp.s1, -1.2), at(sp.s0, -1.2)] }; }).filter(Boolean);
  for (const q of porch) stampPoly(gr, free, q.poly, 1);
  const d1 = distField(gr, free), core = new Uint8Array(W * gr.H);
  for (let k = 0; k < core.length; k++) core[k] = free[k] && d1[k] >= minW / 2 - 1e-6 ? 1 : 0;
  const cellOf = (x, z) => { const i = Math.floor((x - gr.x0) / c), j = Math.floor((z - gr.z0) / c); return i < 0 || j < 0 || i >= W || j >= gr.H ? -1 : j * W + i; };
  const nb = [[1, 0, c], [-1, 0, c], [0, 1, c], [0, -1, c], [1, 1, c * Math.SQRT2], [1, -1, c * Math.SQRT2], [-1, 1, c * Math.SQRT2], [-1, -1, c * Math.SQRT2]];
  // shortest walking distance over 8 neighbours from the given start cells (a few thousand cells: a relaxing queue is enough)
  const flood = (seeds, limit) => {
    const dist = new Float32Array(W * gr.H).fill(Infinity), q = []; for (const k of seeds) { dist[k] = 0; q.push(k); }
    for (let h = 0; h < q.length; h++) { const k = q[h], i = k % W, j = (k / W) | 0; for (const [di, dj, w] of nb) { const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= W || jj >= gr.H) continue; const kk = jj * W + ii, nd = dist[k] + w; if (!core[kk] || nd > limit || nd >= dist[kk] - 1e-6) continue; dist[kk] = nd; q.push(kk); } }
    return dist;
  };
  // start cells: the porch outside each door; a door is blocked when its flood cannot get 0.8 m into the room
  const seedsOf = q => { const out = []; for (let u = q.sp.s0; u <= q.sp.s1 + 1e-6; u += c / 2) for (let d = -1.15; d <= -.6; d += c / 2) { const [x, z] = q.at(u, d), k = cellOf(x, z); if (k >= 0 && core[k]) out.push(k); } return [...new Set(out)]; };
  const blocked = new Set(), seeds = []; let open = 0;
  for (const q of porch) {
    const sd = seedsOf(q), dl = sd.length ? flood(sd, 3) : null; let ok = false;
    if (dl) for (let u = q.sp.s0; u <= q.sp.s1 + 1e-6 && !ok; u += c / 2) for (let d = .8; d <= 1.6; d += c / 2) { const [x, z] = q.at(u, d), k = cellOf(x, z); if (k >= 0 && dl[k] < Infinity) { ok = true; break; } }
    if (ok) { open++; seeds.push(...sd); continue; }
    const [x, z] = q.at(q.sp.c, .6); for (const it of items) { const C = GP.footprint(it); let dm = G.pip(x, z, C) ? 0 : Infinity; for (let i = 0; i < C.length; i++) dm = Math.min(dm, G.closest(x, z, C[i], C[(i + 1) % C.length]).d); if (dm < .9) blocked.add(it); }
  }
  const dist = flood(seeds, Infinity);
  // each machine needs a reached passage cell around it (within its use space, at least 0.9 m)
  const cut = [];
  if (open) for (const it of items) {
    if (blocked.has(it)) continue; const d = GP.dims(it), cl = (GP.getDef(it.type) || {}).cl || {}; let ok = false;
    const ex = Math.max(.9, cl.f || 0, cl.b || 0, cl.l || 0, cl.r || 0) + .1, R = G.rectPts(it.x, it.z, it.rot, -d.w / 2 - ex, d.w / 2 + ex, -d.d / 2 - ex, d.d / 2 + ex), b = G.bounds(R);
    // a reached cell counts only on the machine's side of every partition (the access zone may reach through a thin wall)
    for (let z = b.minZ; z <= b.maxZ && !ok; z += c) for (let x = b.minX; x <= b.maxX; x += c) { const k = cellOf(x, z); if (k >= 0 && dist[k] < Infinity && G.pip(x, z, R) && !psegs.some(([A, B]) => G.segX([it.x, it.z], [x, z], A, B))) { ok = true; break; } }
    if (!ok) cut.push(it);
  }
  // the longest way out (inside the room), and its route: walk downhill to a door
  let far = 0, farK = -1; for (let k = 0; k < dist.length; k++) if (dist[k] < Infinity && dist[k] > far && gr.inside[k]) { far = dist[k]; farK = k; }
  const route = []; let k = farK;
  while (k >= 0 && route.length < 4000) { const i = k % W, j = (k / W) | 0; route.push([gr.x0 + (i + .5) * c, gr.z0 + (j + .5) * c]); if (dist[k] === 0) break; let bk = -1, bd = dist[k]; for (const [di, dj] of nb) { const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= W || jj >= gr.H) continue; const kk = jj * W + ii; if (dist[kk] < bd - 1e-6) { bd = dist[kk]; bk = kk; } } k = bk; }
  return { doors: exits.length, open, blocked: [...blocked], cut, far: Math.max(0, far - 1), farAt: farK >= 0 ? route[0] : null, route };
};

/* ---------- narrow aisle map ---------- */
calc.aisle = (minW) => {
  const L = GP.L(); if (!L.items.length) return { comps: [], cv: null };
  const gr = makeGrid(.05); const free = new Uint8Array(gr.inside);
  const usage = new Uint8Array(gr.W * gr.H);
  for (const it of L.items) { const def = GP.getDef(it.type); if (!def || def.flat || def.wall || GP.mountOf(it) !== 'floor') continue; stampPoly(gr, free, GP.footprint(it), 0); const c = def.cl || {}, d = GP.dims(it); if (c.f + c.b + c.l + c.r) stampPoly(gr, usage, G.rectPts(it.x, it.z, it.rot, -d.w / 2 - c.l, d.w / 2 + c.r, -d.d / 2 - c.b, d.d / 2 + c.f), 1); }
  for (const p of L.partitions) for (let i = 0; i < p.pts.length - 1; i++) stampSeg(gr, free, p.pts[i], p.pts[i + 1], (p.thick || .1) / 2, 0);
  const r = minW / 2; const d1 = distField(gr, free); const core = new Uint8Array(gr.W * gr.H); for (let k = 0; k < core.length; k++) core[k] = d1[k] >= r - 1e-6 ? 0 : 1;
  const d2 = distField(gr, core); // distance to nearest core cell
  const narrow = new Uint8Array(gr.W * gr.H); for (let k = 0; k < narrow.length; k++) narrow[k] = free[k] && d2[k] > r + gr.cell * .5 ? 1 : 0;
  // components
  const seen = new Uint8Array(narrow.length), comps = [];
  for (let k0 = 0; k0 < narrow.length; k0++) {
    if (!narrow[k0] || seen[k0]) continue; const st = [k0], cells = []; seen[k0] = 1;
    while (st.length) { const k = st.pop(); cells.push(k); const i = k % gr.W, j = (k / gr.W) | 0; for (const q of [i > 0 ? k - 1 : -1, i < gr.W - 1 ? k + 1 : -1, j > 0 ? k - gr.W : -1, j < gr.H - 1 ? k + gr.W : -1]) if (q >= 0 && narrow[q] && !seen[q]) { seen[q] = 1; st.push(q); } }
    const area = cells.length * gr.cell * gr.cell; let inUse = 0; cells.forEach(k => { if (usage[k]) inUse++; });
    if (area >= .45 && inUse / cells.length < .7) { let sx = 0, sz = 0; cells.forEach(k => { sx += k % gr.W; sz += (k / gr.W) | 0; }); comps.push({ x: gr.x0 + (sx / cells.length + .5) * gr.cell, z: gr.z0 + (sz / cells.length + .5) * gr.cell, area, cells }); }
  }
  const cv = document.createElement('canvas'); cv.width = gr.W; cv.height = gr.H; const x = cv.getContext('2d'); const img = x.createImageData(gr.W, gr.H);
  comps.forEach(c => c.cells.forEach(k => { img.data[k * 4] = 214; img.data[k * 4 + 1] = 54; img.data[k * 4 + 2] = 43; img.data[k * 4 + 3] = 120; }));
  x.putImageData(img, 0, 0);
  comps.forEach(c => delete c.cells);
  return { comps, cv, x: gr.x0, z: gr.z0, w: gr.W * gr.cell, h: gr.H * gr.cell };
};
})();
