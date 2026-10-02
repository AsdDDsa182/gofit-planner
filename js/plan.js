/* GoFit Planner — 2D plan renderer (Canvas 2D): walls, openings, partitions, rubber mats & trims, zones, equipment symbols, labels */
(function () {
'use strict';
const GP = window.GP, U = GP.U, G = GP.G;
const DEG = U.DEG, WALL_T = .2;
GP.WALL_T = WALL_T;

/* ---------------- item helpers ---------------- */
GP.getDef = (type) => {
  if (GP.CAT[type]) return GP.CAT[type];
  const c = GP.lib.customTypes[type];
  if (c) return { id: type, name: c.name, cat: 'custom', w: c.w, d: c.d, h: c.h, cl: { f: .3, b: 0, l: 0, r: 0 }, custom: true, sym: 'custom', parts: c.parts, mount: 'floor', y: 0, pw: 0, kw: '' };
  return null;
};
GP.typeName = (type) => GP.lib.names[type] || (GP.getDef(type) || {}).name || type;
GP.itemName = (it) => it.name || GP.typeName(it.type);
GP.dims = (it) => { const d = GP.getDef(it.type) || { w: 1, d: 1, h: 1 }; const H = d.hFromWall ? (it.h ?? GP.P.settings.wallH) : (it.h ?? d.h); return { w: it.w ?? d.w, d: it.d ?? d.d, h: H }; };
GP.mountOf = (it) => it.mount || (GP.getDef(it.type) || {}).mount || 'floor';
GP.surfaceAt = (x, z, it) => {
  const L = GP.L(); let base = 0; const def = it && GP.getDef(it.type);
  if (def && def.sitOn) for (const o of L.items) { if (o === it) continue; const od = GP.getDef(o.type); if (!od || !od.surface) continue; const dm = GP.dims(o); if (G.pip(x, z, G.rectPts(o.x, o.z, o.rot, -dm.w / 2, dm.w / 2, -dm.d / 2, dm.d / 2))) base = Math.max(base, GP.itemY(o) + dm.h); }
  return base;
};
GP.itemY = (it) => {
  const def = GP.getDef(it.type) || {}; const m = GP.mountOf(it); const { h } = GP.dims(it);
  if (m === 'ceil') return GP.P.settings.wallH - h - (it.elev || 0);
  if (m === 'wall') return it.elev ?? def.y ?? 1.2;
  return GP.surfaceAt(it.x, it.z, it) + (it.elev || 0);
};
GP.footprint = (it) => { const { w, d } = GP.dims(it); return G.rectPts(it.x, it.z, it.rot, -w / 2, w / 2, -d / 2, d / 2); };
/* host segment of an opening: {a, b, L, dx, dz, nx, nz (inward/left normal), thick, mid (offset of the wall centre line)} */
GP.hostSeg = (o) => {
  const L = GP.L();
  if (o.host === 'room') { const P = L.room.pts; if (o.seg >= P.length) return null; const e = G.edge(P, o.seg); return { a: e.a, b: e.b, L: e.L, dx: e.dx, dz: e.dz, nx: e.nx, nz: e.nz, thick: WALL_T, mid: -WALL_T / 2 }; }
  const p = L.partitions.find(q => q.id === o.host); if (!p || o.seg >= p.pts.length - 1) return null;
  const a = p.pts[o.seg], b = p.pts[o.seg + 1], s = G.segInfo(a, b); return { a, b, L: s.L, dx: s.dx, dz: s.dz, nx: -s.dz, nz: s.dx, thick: p.thick || .1, mid: 0, part: p };
};
GP.openingSpan = (o, hs) => { hs = hs || GP.hostSeg(o); if (!hs) return null; const w = Math.min(o.w, hs.L - .02), c = U.clamp(o.t, w / 2, hs.L - w / 2); return { w, c, s0: c - w / 2, s1: c + w / 2 }; };

const S = GP.S = { view: '2d', style: (() => { try { return localStorage.getItem('gofit:style') || 'color'; } catch (e) { return 'color'; } })(), layers: { items: true, labels: true, clear: true, mats: true, dims: true, notes: true, zones: true, aisle: false, egress: false, parts: true }, cam: { x: 6, z: 4, s: 40 }, W: 1, H: 1, dpr: 1 };
S.is2D = () => true;
const FONT = '"Pretendard","Malgun Gothic","Apple SD Gothic Neo","Noto Sans KR",sans-serif', MONO = 'Consolas,"SFMono-Regular",ui-monospace,monospace';
S.FONT = FONT; S.MONO = MONO;

S.init = (canvas, stage) => { S.canvas = canvas; S.stage = stage; S.ctx = canvas.getContext('2d'); S.scene = true; };
S.resize = () => {
  const r = S.stage.getBoundingClientRect(); S.W = Math.max(1, r.width); S.H = Math.max(1, r.height); S.dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  S.canvas.width = Math.round(S.W * S.dpr); S.canvas.height = Math.round(S.H * S.dpr); S.invalidate();
};
S.fit = (pad) => {
  const L = GP.L(); if (!L) return; const b = G.bounds(L.room.pts); const m = pad ?? 1.1;
  // keep the plan clear of the floating panels (tools left, summary / inspector right, hint top, layer bar bottom)
  const narrow = S.W < 700, side = id => { const el = document.getElementById(id); return el && !el.hidden ? el.offsetWidth + 16 : 0; };
  const iL = narrow ? 8 : (GP.viewOnly ? 16 : 86), iR = narrow ? 8 : Math.max(16, side('summary'), side('insp')), iT = narrow ? 50 : 56, iB = narrow ? 56 : 64;
  const aw = Math.max(80, S.W - iL - iR), ah = Math.max(80, S.H - iT - iB); S.fitW = S.W;
  S.cam.s = Math.max(4, Math.min(aw / (b.sx + m * 2), ah / (b.sz + m * 2)));
  S.cam.x = b.cx - (iL + aw / 2 - S.W / 2) / S.cam.s; S.cam.z = b.cz - (iT + ah / 2 - S.H / 2) / S.cam.s; S.invalidate(); GP.emit('overlay');
};
S.clampZoom = s => U.clamp(s, 3, 900);
S.zoomAt = (clientX, clientY, f) => {
  const r = S.canvas.getBoundingClientRect(); const sx = clientX - r.left, sy = clientY - r.top;
  const wx = S.cam.x + (sx - S.W / 2) / S.cam.s, wz = S.cam.z + (sy - S.H / 2) / S.cam.s;
  S.cam.s = S.clampZoom(S.cam.s * f); S.cam.x = wx - (sx - S.W / 2) / S.cam.s; S.cam.z = wz - (sy - S.H / 2) / S.cam.s; S.invalidate(); GP.emit('overlay');
};
S.zoomBy = (f) => { const r = S.canvas.getBoundingClientRect(); S.zoomAt(r.left + S.W / 2, r.top + S.H / 2, f); };
S.panBy = (dx, dy) => { S.cam.x -= dx / S.cam.s; S.cam.z -= dy / S.cam.s; S.invalidate(); GP.emit('overlay'); };
S.mpp = () => 1 / S.cam.s;
S.toScreen = (x, y, z) => [(x - S.cam.x) * S.cam.s + S.W / 2, (z - S.cam.z) * S.cam.s + S.H / 2, 0];
S.floorAt = (cx, cy) => { const r = S.canvas.getBoundingClientRect(); return { x: S.cam.x + (cx - r.left - S.W / 2) / S.cam.s, z: S.cam.z + (cy - r.top - S.H / 2) / S.cam.s }; };
S.focus = (p) => { S.cam.x = p[0]; S.cam.z = p[1]; S.invalidate(); GP.emit('overlay'); };

/* ---------------- compat no-ops (older call sites) ---------------- */
['buildRoom', 'buildParts', 'buildOpenings', 'buildMats', 'buildZones', 'buildAnnot', 'syncItems', 'updateItemVis', 'applyTheme', 'rebuildAll'].forEach(k => { S[k] = () => S.invalidate(); });
S.placeInst = () => S.invalidate();
S.modelCacheClear = () => { if (GP.SYM) GP.SYM.clearThumbs(); };
S.dataChanged = () => { S.roomAreaCache.clear(); S.invalidate(); };
S.roomAreaCache = new Map();

/* ---------------- ghost (placing preview) ---------------- */
S.setGhost = (items) => { S.ghost = items && items.length ? { visible: false, items: [], bad: [] } : null; S.invalidate(); };
S.clearGhost = () => { S.ghost = null; S.invalidate(); };

/* ---------------- underlay (image / DXF) ---------------- */
S.buildUnderlay = (UL) => { S.underlay = UL || null; S.invalidate(); };

/* ---------------- block patterns (one tile = one 500×500 block) ---------------- */
function rng(seed) { return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }
const BLOCK_LOOK = {
  basic: { base: '#7B827D', specks: ['#8C948F', '#6A716C', '#9AA39D', '#5F6661'], n: 900, seed: 21 },
  coat: { base: '#45474B', specks: ['#E6E7E8', '#B9BDC1', '#2E3033'], n: 420, seed: 31 },
  arena: { base: '#CD9A67', specks: ['#D8A878', '#BE8A56', '#E1B489', '#B07B47'], n: 800, seed: 41 },
  topblack: { base: '#55585C', specks: ['#5F6266', '#4B4E52'], n: 300, seed: 51 },
  stone: { base: '#85888B', specks: ['#A5A8AB', '#6C6F72', '#C3C5C7', '#56595C'], n: 1000, seed: 61 },
};
const patCache = {};
S.blockTile = (k) => {
  if (patCache[k]) return patCache[k]; const L = BLOCK_LOOK[k] || BLOCK_LOOK.coat; const s = 128, c = document.createElement('canvas'); c.width = c.height = s; const x = c.getContext('2d');
  x.fillStyle = L.base; x.fillRect(0, 0, s, s); const R = rng(L.seed); for (let i = 0; i < L.n; i++) { x.fillStyle = L.specks[(R() * L.specks.length) | 0]; x.beginPath(); x.arc(R() * s, R() * s, .6 + R() * 1.1, 0, 7); x.fill(); }
  patCache[k] = c; return c;
};
S.blockSwatch = (k) => { const c = document.createElement('canvas'); c.width = 96; c.height = 48; const x = c.getContext('2d'); const t = S.blockTile(k); x.drawImage(t, 0, 0, 48, 48); x.drawImage(t, 48, 0, 48, 48); x.strokeStyle = 'rgba(0,0,0,.35)'; x.lineWidth = 1; x.strokeRect(.5, .5, 47, 47); x.strokeRect(48.5, .5, 47, 47); return c.toDataURL(); };
S.blockColor = k => (BLOCK_LOOK[k] || BLOCK_LOOK.coat).base;

/* ---------------- wall solid pieces along a segment, cut by openings ---------------- */
function wallPieces(Ls, ops) {
  const out = []; const list = ops.map(o => { const w = Math.min(o.w, Ls - .02); const c = U.clamp(o.t, w / 2, Ls - w / 2); return { s0: c - w / 2, s1: c + w / 2 }; }).sort((x, y) => x.s0 - y.s0);
  let cur = 0; for (const q of list) { if (q.s0 > cur + 1e-4) out.push([cur, q.s0]); cur = Math.max(cur, q.s1); } if (cur < Ls - 1e-4) out.push([cur, Ls]);
  return out;
}
S.wallPieces = wallPieces;

/* ---------------- drawing ---------------- */
let dirty = true; S.invalidate = () => { dirty = true; };
S.renderNow = () => { const x = S.ctx; S.drawPlan(x, { x: S.cam.x, z: S.cam.z, s: S.cam.s, W: S.W, H: S.H, dpr: S.dpr }, { screen: true }); };
S.frame = () => { requestAnimationFrame(S.frame); if (!dirty || !GP.P) return; dirty = false; S.renderNow(); GP.emit('rendered'); };

/* main plan painter — used for the screen and for image / PDF export
   V: {x, z, s (px per m), W, H, dpr}; o: {screen, white, grid, labels, mats (labels), sel, hover, notes} */
S.drawPlan = (x, V, o) => {
  o = o || {}; const L = GP.L(), P = L.room.pts, st = GP.P.settings, dpr = V.dpr || 1, s = V.s, px = 1 / s; const LINE = S._line = (o.style || S.style) === 'line';
  const ui = GP.ui || { selSet: () => new Set(), sel: [] }; const scr = !!o.screen; const lay = o.layers || S.layers;
  const sel = scr ? ui.selSet() : new Set(); const hov = scr ? S.hover : null; const conf = scr && GP.checks ? GP.checks.conflicts : new Map();
  const W2S = () => x.setTransform(dpr * s, 0, 0, dpr * s, dpr * (V.W / 2 - V.x * s), dpr * (V.H / 2 - V.z * s));
  const SCR = () => x.setTransform(dpr, 0, 0, dpr, 0, 0);
  const toS = (wx, wz) => [(wx - V.x) * s + V.W / 2, (wz - V.z) * s + V.H / 2];
  const path = (pts, close) => { x.beginPath(); pts.forEach((p, i) => i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])); if (close !== false) x.closePath(); };
  // background & grid
  SCR(); x.globalAlpha = 1; x.setLineDash([]); x.fillStyle = o.white || LINE ? '#FFFFFF' : '#F4F5F3'; x.fillRect(0, 0, V.W, V.H);
  const x0 = V.x - V.W / 2 / s, x1 = V.x + V.W / 2 / s, z0 = V.z - V.H / 2 / s, z1 = V.z + V.H / 2 / s;
  if (o.grid !== false && s > 9) {
    x.lineWidth = 1; for (const [step, col] of [[1, o.white || LINE ? '#F0F1EF' : '#E6E8E5'], [5, o.white || LINE ? '#E5E7E4' : '#D9DDD8']]) { if (step === 1 && s < 14) continue; x.strokeStyle = col; x.beginPath(); for (let gx = Math.ceil(x0 / step) * step; gx <= x1; gx += step) { const [sx] = toS(gx, 0); x.moveTo(Math.round(sx) + .5, 0); x.lineTo(Math.round(sx) + .5, V.H); } for (let gz = Math.ceil(z0 / step) * step; gz <= z1; gz += step) { const [, sy] = toS(0, gz); x.moveTo(0, Math.round(sy) + .5); x.lineTo(V.W, Math.round(sy) + .5); } x.stroke(); }
  }
  W2S();
  // underlay
  const UL = scr && S.underlay; if (UL) { x.globalAlpha = UL.op; if (UL.kind === 'image' && UL.img) x.drawImage(UL.img, UL.x, UL.z, UL.w, UL.w * UL.aspect); else if (UL.kind === 'dxf' && UL.segs) { const k = UL.scale || 1; x.strokeStyle = '#C0392B'; x.lineWidth = px; x.beginPath(); for (const [a, b] of UL.segs) { x.moveTo(a[0] * k + UL.x, a[1] * k + UL.z); x.lineTo(b[0] * k + UL.x, b[1] * k + UL.z); } x.stroke(); } x.globalAlpha = 1; }
  // floor
  if (P.length >= 3) { path(P); x.fillStyle = '#FFFFFF'; x.fill(); }
  // zones (under mats so they read as areas)
  if (lay.zones) for (const zn of L.zones) { if (zn.pts.length < 3) continue; path(zn.pts); if (!LINE) { x.globalAlpha = .1; x.fillStyle = zn.color || '#2f6bd8'; x.fill(); x.globalAlpha = 1; } x.setLineDash([6 * px, 4 * px]); x.lineWidth = (sel.has('zone:' + zn.id) ? 2.4 : 1.3) * px; x.strokeStyle = LINE && !sel.has('zone:' + zn.id) ? '#59626B' : zn.color || '#2f6bd8'; x.stroke(); x.setLineDash([]); }
  // rubber mats
  if (lay.mats) for (const m of L.mats) {
    if (m.pts.length < 3) continue; const b = G.bounds(m.pts);
    path(m.pts); const pat = x.createPattern(S.blockTile(m.block), 'repeat'); try { pat.setTransform(new DOMMatrix([.5 / 128, 0, 0, .5 / 128, b.minX, b.minZ])); } catch (e) { }
    if (LINE) { x.fillStyle = '#FFFFFF'; x.fill(); } else { x.globalAlpha = .62; x.fillStyle = pat; x.fill(); x.globalAlpha = 1; }
    if (.5 * s >= 7) { x.save(); path(m.pts); x.clip(); x.beginPath(); for (let gx = b.minX + .5; gx < b.maxX - .01; gx += .5) { x.moveTo(gx, b.minZ); x.lineTo(gx, b.maxZ); } for (let gz = b.minZ + .5; gz < b.maxZ - .01; gz += .5) { x.moveTo(b.minX, gz); x.lineTo(b.maxX, gz); } x.strokeStyle = LINE ? 'rgba(20,22,25,.22)' : 'rgba(20,22,25,.28)'; x.lineWidth = px; x.stroke(); x.restore(); }
    path(m.pts); const isSel = sel.has('mat:' + m.id), isHov = hov && hov.k === 'mat' && hov.id === m.id; x.strokeStyle = isSel ? '#2450E0' : isHov ? '#D9711A' : LINE ? '#1B1F23' : '#3A3F45'; x.lineWidth = (isSel || isHov ? 2.4 : 1.1) * px; x.stroke();
    if (m.trim && m.trim !== 'none') drawTrims(x, m, px);
  }
  // narrow aisle overlay
  if (lay.aisle && GP.checks && GP.checks.aisle && GP.checks.aisle.cv) { const A = GP.checks.aisle; x.imageSmoothingEnabled = false; x.drawImage(A.cv, A.x, A.z, A.w, A.h); x.imageSmoothingEnabled = true; }
  // items
  const items = lay.items ? L.items.slice() : [];
  const order = it => { const d = GP.getDef(it.type) || {}; const m = GP.mountOf(it); return d.flat ? 0 : m === 'floor' ? 1 : m === 'wall' ? 2 : 3; };
  items.sort((a, b) => order(a) - order(b));
  // clearance (use space) under equipment
  if (lay.clear) for (const it of items) {
    const def = GP.getDef(it.type); if (!def || GP.mountOf(it) !== 'floor' || def.flat) continue; const c = def.cl || {}; if (!(c.f + c.b + c.l + c.r)) continue; const d = GP.dims(it);
    const R = G.rectPts(it.x, it.z, it.rot, -d.w / 2 - c.l, d.w / 2 + c.r, -d.d / 2 - c.b, d.d / 2 + c.f); path(R); if (!LINE) { x.fillStyle = 'rgba(233,162,59,.07)'; x.fill(); } x.setLineDash([4 * px, 4 * px]); x.lineWidth = px; x.strokeStyle = LINE ? 'rgba(60,66,72,.45)' : 'rgba(196,127,14,.45)'; x.stroke(); x.setLineDash([]);
  }
  for (const it of items) drawItem(x, it, px, conf.has(it.uid) ? 'bad' : sel.has('item:' + it.uid) ? 'sel' : hov && hov.k === 'item' && hov.id === it.uid ? 'hover' : 'normal');
  // walls, partitions, openings
  drawWalls(x, L, px, sel, hov, scr);
  // emergency exit: the way out from the farthest point (green arrow), machines without a passage to a door (red rings)
  if (lay.egress && GP.checks && GP.checks.egress) {
    const E = GP.checks.egress, R = E.route || [];
    if (R.length > 1) {
      const pts = R.filter((p, i) => i === 0 || i === R.length - 1 || i % 3 === 0);
      x.lineJoin = 'round'; x.lineCap = 'round'; path(pts, false); x.strokeStyle = 'rgba(255,255,255,.9)'; x.lineWidth = 7 * px; x.stroke();
      path(pts, false); x.strokeStyle = '#1E8A5A'; x.lineWidth = 3.5 * px; x.setLineDash([10 * px, 6 * px]); x.stroke(); x.setLineDash([]);
      const a = pts[pts.length - 1], b = pts[Math.max(0, pts.length - 4)], ang = Math.atan2(a[1] - b[1], a[0] - b[0]), hl = 16 * px;
      x.beginPath(); x.moveTo(a[0], a[1]); x.lineTo(a[0] - Math.cos(ang - .45) * hl, a[1] - Math.sin(ang - .45) * hl); x.lineTo(a[0] - Math.cos(ang + .45) * hl, a[1] - Math.sin(ang + .45) * hl); x.closePath(); x.fillStyle = '#1E8A5A'; x.fill();
      x.beginPath(); x.arc(R[0][0], R[0][1], 6 * px, 0, 7); x.fillStyle = '#1E8A5A'; x.fill(); x.lineWidth = 2 * px; x.strokeStyle = '#fff'; x.stroke();
      SCR(); const [sx, sy] = toS(R[0][0], R[0][1]); x.font = `600 12px ${FONT}`; const tx = `출입문까지 약 ${Math.round(E.far)}m`, tw = x.measureText(tx).width;
      x.fillStyle = 'rgba(255,255,255,.92)'; x.fillRect(sx + 9, sy - 21, tw + 12, 20); x.fillStyle = '#1E8A5A'; x.fillText(tx, sx + 15, sy - 6); W2S();
    }
    for (const it of (E.cut || []).concat(E.blocked || [])) { const d = GP.dims(it); x.beginPath(); x.arc(it.x, it.z, Math.max(d.w, d.d) / 2 + .15, 0, 7); x.strokeStyle = '#D6362B'; x.lineWidth = 2.5 * px; x.setLineDash([6 * px, 4 * px]); x.stroke(); x.setLineDash([]); }
  }
  // distance lines for the selected item
  if (scr && S.distLines) S.distLines.forEach(l => { x.beginPath(); x.moveTo(l.a[0], l.a[1]); x.lineTo(l.b[0], l.b[1]); x.strokeStyle = l.warn ? '#D6362B' : '#2450E0'; x.lineWidth = 1.2 * px; x.setLineDash([5 * px, 3 * px]); x.stroke(); x.setLineDash([]); });
  // ghost
  if (scr && S.ghost && S.ghost.visible) { x.globalAlpha = .82; S.ghost.items.forEach((it, i) => drawItem(x, it, px, S.ghost.bad[i] ? 'bad' : 'sel', true)); x.globalAlpha = 1; }
  // dims
  if (lay.dims) for (const d of L.dims) { const sI = G.segInfo(d.a, d.b), nx = -sI.dz * .12, nz = sI.dx * .12; x.beginPath(); x.moveTo(d.a[0], d.a[1]); x.lineTo(d.b[0], d.b[1]); x.moveTo(d.a[0] - nx, d.a[1] - nz); x.lineTo(d.a[0] + nx, d.a[1] + nz); x.moveTo(d.b[0] - nx, d.b[1] - nz); x.lineTo(d.b[0] + nx, d.b[1] + nz); x.strokeStyle = sel.has('dim:' + d.id) ? '#2450E0' : '#1F2429'; x.lineWidth = 1.2 * px; x.stroke(); }
  /* ---------- screen-space labels ---------- */
  SCR();
  const text = (t, sx, sy, font, col, halo, align) => { x.font = font; x.textAlign = align || 'center'; x.textBaseline = 'middle'; if (halo) { x.lineJoin = 'round'; x.lineWidth = 3.4; x.strokeStyle = halo; x.strokeText(t, sx, sy); } x.fillStyle = col; x.fillText(t, sx, sy); };
  const pill = (t, sx, sy, font, bg, fg, rot, border) => { x.save(); x.translate(sx, sy); if (rot) x.rotate(rot); x.font = font; const tw = x.measureText(t).width + 10, th = 17; x.fillStyle = bg; rrect(x, -tw / 2, -th / 2, tw, th, 4); x.fill(); if (border) { x.strokeStyle = border; x.lineWidth = 1; x.stroke(); } x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(t, 0, 1); x.restore(); };
  // wall lengths (outside the room)
  if (lay.dims && P.length >= 3 && !(scr && ui.tool === 'vertex')) for (let i = 0; i < P.length; i++) {
    const e = G.edge(P, i), off = WALL_T + .38; const [ax, ay] = toS(e.a[0], e.a[1]), [bx, by] = toS(e.b[0], e.b[1]); if (Math.hypot(bx - ax, by - ay) < 44) continue;
    let ang = Math.atan2(by - ay, bx - ax); if (ang > Math.PI / 2) ang -= Math.PI; if (ang <= -Math.PI / 2) ang += Math.PI;
    const [sx, sy] = toS((e.a[0] + e.b[0]) / 2 - e.nx * off, (e.a[1] + e.b[1]) / 2 - e.nz * off);
    const hi = (GP.OV && GP.OV.hiWall && GP.OV.hiWall.has(i)) || sel.has('wall:' + i);
    pill(e.L.toFixed(2) + ' m', sx, sy, `600 11.5px ${MONO}`, hi ? '#2450E0' : 'rgba(255,255,255,.96)', hi ? '#fff' : '#2A3037', ang, hi ? null : 'rgba(40,46,52,.2)');
  }
  // partition segment lengths
  if (scr && ui.step === 'space') for (const p of L.partitions) for (let i = 0; i < p.pts.length - 1; i++) { const a = p.pts[i], b = p.pts[i + 1], sI = G.segInfo(a, b); const [ax, ay] = toS(a[0], a[1]), [bx, by] = toS(b[0], b[1]); if (Math.hypot(bx - ax, by - ay) < 50) continue; let ang = Math.atan2(by - ay, bx - ax); if (ang > Math.PI / 2) ang -= Math.PI; if (ang <= -Math.PI / 2) ang += Math.PI; const [sx, sy] = toS((a[0] + b[0]) / 2 - sI.dz * .3, (a[1] + b[1]) / 2 + sI.dx * .3); pill(sI.L.toFixed(2) + ' m', sx, sy, `600 10.5px ${MONO}`, 'rgba(255,255,255,.95)', '#48515A', ang, 'rgba(40,46,52,.2)'); }
  // zones & rooms
  if (lay.zones) for (const zn of L.zones) { const c = G.labelPoint(zn.pts), A = Math.abs(G.area(zn.pts)); const [sx, sy] = toS(c[0], c[1]); text(zn.name || '존', sx, sy - 8, `700 12.5px ${FONT}`, zn.color || '#2f6bd8', 'rgba(255,255,255,.9)'); text(`${A.toFixed(1)}㎡ · ${(A / U.PY).toFixed(1)}평`, sx, sy + 8, `500 10.5px ${MONO}`, '#5B6570', 'rgba(255,255,255,.9)'); }
  for (const r of L.rooms) { let A = S.roomAreaCache.get(r.id); if (A == null) { A = GP.calc.regionArea(r.x, r.z); S.roomAreaCache.set(r.id, A); } const [sx, sy] = toS(r.x, r.z); const on = sel.has('room:' + r.id); text(r.name || '공간', sx, sy - 8, `800 13px ${FONT}`, on ? '#2450E0' : '#1F2429', 'rgba(255,255,255,.95)'); text(`${A.toFixed(1)}㎡ · ${(A / U.PY).toFixed(1)}평`, sx, sy + 9, `500 10.5px ${MONO}`, '#5B6570', 'rgba(255,255,255,.95)'); }
  // mat labels
  if (lay.mats && (o.matLabels || (scr && ui.step === 'floor'))) for (const m of L.mats) { if (m.pts.length < 3) continue; const c = G.labelPoint(m.pts); const [sx, sy] = toS(c[0], c[1]); pill(`${(GP.BLOCKS[m.block] || {}).name || ''} · ${GP.calc.matBlocks(m)}장`, sx, sy, `700 11px ${FONT}`, 'rgba(255,255,255,.94)', '#1F2429', 0, sel.has('mat:' + m.id) ? '#2450E0' : 'rgba(30,35,40,.25)'); }
  // item names
  if (lay.items && lay.labels) for (const it of items) {
    const d = GP.dims(it), on = sel.has('item:' + it.uid); const big = Math.max(d.w, d.d) * s; if (!on && (big < 30 || Math.max(d.w, d.d) < .3)) continue;
    const [sx, sy] = toS(it.x, it.z); const nm = GP.itemName(it); const sz = U.clamp(Math.min(d.w, d.d) * s * .22, 9.5, 12.5);
    text(nm, sx, sy, `700 ${sz.toFixed(1)}px ${FONT}`, on ? '#2450E0' : conf.has(it.uid) ? '#D6362B' : '#1F2429', 'rgba(255,255,255,.92)');
  }
  // dimension texts
  if (lay.dims) for (const d of L.dims) { const sI = G.segInfo(d.a, d.b); const [sx, sy] = toS((d.a[0] + d.b[0]) / 2 - sI.dz * .22, (d.a[1] + d.b[1]) / 2 + sI.dx * .22); let ang = Math.atan2(sI.dz, sI.dx); if (ang > Math.PI / 2) ang -= Math.PI; if (ang <= -Math.PI / 2) ang += Math.PI; pill(G.len(d.a, d.b).toFixed(2) + ' m', sx, sy, `700 11px ${MONO}`, sel.has('dim:' + d.id) ? '#2450E0' : '#1F2429', '#fff', ang); }
  // distances
  if (scr && S.distLines) S.distLines.forEach(l => { const [sx, sy] = toS((l.a[0] + l.b[0]) / 2, (l.a[1] + l.b[1]) / 2); pill(Math.round(l.d * 100) + 'cm', sx, sy, `700 10.5px ${MONO}`, l.warn ? '#D6362B' : '#2450E0', '#fff'); });
  // notes
  if (lay.notes && o.notes !== false) for (const n of L.notes) { const [sx, sy] = toS(n.x, n.z); const t = n.text || '메모'; x.font = `600 11.5px ${FONT}`; const lines = String(t).split('\n').slice(0, 4); const tw = Math.min(240, Math.max(...lines.map(l => x.measureText(l).width)) + 14), th = 8 + lines.length * 15; x.fillStyle = '#FFF6D8'; rrect(x, sx + 6, sy - th - 4, tw, th, 5); x.fill(); x.strokeStyle = sel.has('note:' + n.id) ? '#2450E0' : 'rgba(150,110,20,.35)'; x.lineWidth = sel.has('note:' + n.id) ? 2 : 1; x.stroke(); x.fillStyle = '#E0622B'; x.beginPath(); x.arc(sx, sy, 5, 0, 7); x.fill(); x.fillStyle = '#3b2f10'; x.textAlign = 'left'; x.textBaseline = 'middle'; lines.forEach((l, i) => x.fillText(fitText(x, l, tw - 12), sx + 12, sy - th - 4 + 11 + i * 15)); }
};
function fitText(x, t, maxW) { t = String(t); if (x.measureText(t).width <= maxW) return t; while (t.length > 1 && x.measureText(t + '…').width > maxW) t = t.slice(0, -1); return t + '…'; }
function rrect(x, a, b, w, h, r) { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); }
S.rrect = rrect;

const imgCache = new Map();
function logoImg(id) { if (!id || !GP.P.images[id]) return null; let im = imgCache.get(id); if (!im) { im = new Image(); im.onload = () => S.invalidate(); im.src = GP.P.images[id].src; imgCache.set(id, im); } return im.complete && im.naturalWidth ? im : null; }
function drawItem(x, it, px, state, ghost) {
  const def = GP.getDef(it.type); if (!def) return; const d = GP.dims(it), m = GP.mountOf(it);
  x.save(); x.translate(it.x, it.z); x.rotate((it.rot || 0) * DEG);
  const faded = m === 'ceil' && !ghost; if (faded) x.globalAlpha *= .6;
  GP.SYM.draw(x, it, def, d, px, state, S._line ? 'line' : 'color');
  if (it.type === 'logo') { const im = logoImg(it.img); if (im) { const hw = d.w / 2; x.drawImage(im, -hw, -Math.max(d.d, .03), d.w, Math.max(d.d * 2, .06)); } }
  if (m === 'ceil' && !ghost) { x.setLineDash([4 * px, 3 * px]); x.strokeStyle = GP.SYM.PAL[state === 'normal' ? 'normal' : state].line; x.lineWidth = px; x.strokeRect(-d.w / 2, -d.d / 2, d.w, d.d); x.setLineDash([]); }
  x.restore();
}
S.drawItem = drawItem;

/* rubber trims: one continuous band along each run of exposed edges, mitred at corners */
function drawTrims(x, m, px) {
  const tr = GP.calc.matTrims(m); if (!tr.chains.length) return; const sw = GP.TRIM_W || .06;
  const band = Math.max(sw, 3 * px);
  const col = S._line ? ['#1B1F23', '#FFFFFF'] : m.trim === 'alu' ? ['#7B838B', '#CDD2D7'] : ['#0E0F11', '#34373B'];
  for (const ch of tr.chains) {
    const pts = offsetChain(ch.pts, ch.normals, band / 2, ch.closed);
    for (let pass = 0; pass < 2; pass++) { x.beginPath(); pts.forEach((p, i) => i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])); if (ch.closed) x.closePath(); x.strokeStyle = col[pass]; x.lineWidth = pass ? band - (S._line ? 2.2 : 1.4) * px : band; x.lineJoin = 'miter'; x.miterLimit = 4; x.lineCap = 'butt'; x.stroke(); }
    // piece joints (2400 mm straight pieces) as small ticks
    if (band / px > 5) { x.beginPath(); for (let i = 0; i < ch.pts.length - 1; i++) { const a = ch.pts[i], b = ch.pts[i + 1], sI = G.segInfo(a, b), n = ch.normals[i]; for (let t = 2.4; t < sI.L - .05; t += 2.4) { const cx = a[0] + sI.dx * t, cz = a[1] + sI.dz * t; x.moveTo(cx, cz); x.lineTo(cx + n[0] * band, cz + n[1] * band); } } x.strokeStyle = col[0]; x.lineWidth = px; x.stroke(); }
  }
}
/* offset an open/closed chain outward by d, with per-segment outward normals; mitred joins */
function offsetChain(pts, normals, d, closed) {
  const n = pts.length, out = [];
  for (let i = 0; i < n; i++) {
    const nPrev = closed ? normals[(i - 1 + normals.length) % normals.length] : (i > 0 ? normals[i - 1] : null), nNext = closed ? normals[i % normals.length] : (i < normals.length ? normals[i] : null);
    if (!nPrev || !nNext) { const nn = nPrev || nNext; out.push([pts[i][0] + nn[0] * d, pts[i][1] + nn[1] * d]); continue; }
    const mx = nPrev[0] + nNext[0], mz = nPrev[1] + nNext[1], dot = 1 + nPrev[0] * nNext[0] + nPrev[1] * nNext[1];
    const k = dot > .15 ? d / dot : d / .15; out.push([pts[i][0] + mx * k, pts[i][1] + mz * k]);
  }
  return out;
}
S.offsetChain = offsetChain;

/* 45° hatch inside a polygon (CAD wall poche) */
function hatchPoly(x, q, px) {
  x.save(); x.beginPath(); q.forEach((p, k) => k ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])); x.closePath(); x.clip();
  const b = G.bounds(q), step = Math.max(.06, 7 * px); x.beginPath(); for (let t = b.minX - b.sz; t < b.maxX + b.sz; t += step) { x.moveTo(t, b.maxZ); x.lineTo(t + (b.maxZ - b.minZ), b.minZ); }
  x.strokeStyle = 'rgba(27,31,35,.55)'; x.lineWidth = .8 * px; x.stroke(); x.restore();
}
function drawWalls(x, L, px, sel, hov, scr) {
  const P = L.room.pts, n = P.length, st = GP.P.settings; if (n < 3) return;
  const O = G.offset(P, WALL_T, true);
  const marks = L.wallMarks || {};
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n, a = P[i], b = P[j]; const Ls = G.len(a, b); if (Ls < 1e-3) continue;
    const e = G.edge(P, i); const ops = L.openings.filter(o => o.host === 'room' && o.seg === i);
    const inner = t => [a[0] + e.dx * t, a[1] + e.dz * t];
    const outer = t => t <= 1e-6 ? O[i] : t >= Ls - 1e-6 ? O[j] : [a[0] + e.dx * t - e.nx * WALL_T, a[1] + e.dz * t - e.nz * WALL_T];
    const hi = scr && ((GP.OV && GP.OV.hiWall && GP.OV.hiWall.has(i)) || sel.has('wall:' + i));
    const pieces = wallPieces(Ls, ops);
    for (const [s0, s1] of pieces) { const q = [inner(s0), inner(s1), outer(s1), outer(s0)]; x.beginPath(); q.forEach((p, k) => k ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])); x.closePath(); if (S._line && !hi) { x.fillStyle = '#FFFFFF'; x.fill(); hatchPoly(x, q, px); x.beginPath(); q.forEach((p, k) => k ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])); x.closePath(); x.strokeStyle = '#1B1F23'; x.lineWidth = 1.3 * px; x.stroke(); } else { x.fillStyle = hi ? '#2450E0' : '#2B3036'; x.fill(); x.strokeStyle = hi ? '#2450E0' : '#2B3036'; x.lineWidth = .6 * px; x.stroke(); } }
    if (marks[i] === 'mirror') for (const [s0, s1] of pieces) {
      const t0 = s0 + .03, t1 = s1 - .03; if (t1 - t0 < .1) continue; const bw = Math.max(.06, 6 * px);
      const q = [[a[0] + e.dx * t0, a[1] + e.dz * t0], [a[0] + e.dx * t1, a[1] + e.dz * t1], [a[0] + e.dx * t1 + e.nx * bw, a[1] + e.dz * t1 + e.nz * bw], [a[0] + e.dx * t0 + e.nx * bw, a[1] + e.dz * t0 + e.nz * bw]];
      x.beginPath(); q.forEach((p, k) => k ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])); x.closePath(); x.fillStyle = S._line ? '#FFFFFF' : '#CFE3F7'; x.fill(); x.strokeStyle = S._line ? '#1B1F23' : '#3B7FC4'; x.lineWidth = 1.3 * px; x.stroke();
      x.beginPath(); for (let t = t0 + Math.max(.12, 10 * px); t < t1 - .02; t += Math.max(.25, 18 * px)) { const cx = a[0] + e.dx * t, cz = a[1] + e.dz * t; x.moveTo(cx + e.nx * bw * .15, cz + e.nz * bw * .15); x.lineTo(cx + e.nx * bw * .85 + e.dx * bw * .7, cz + e.nz * bw * .85 + e.dz * bw * .7); } x.strokeStyle = S._line ? '#1B1F23' : '#3B7FC4'; x.lineWidth = px; x.stroke();
    }
  }
  // partitions
  for (const p of L.partitions) {
    if (!p.pts || p.pts.length < 2) continue; const t = p.thick || .1, Lf = G.offset(p.pts, t / 2, false), Rt = G.offset(p.pts, -t / 2, false);
    const on = scr && sel.has('part:' + p.id), hv = scr && hov && hov.k === 'part' && hov.id === p.id, kind = p.kind || 'wall';
    for (let i = 0; i < p.pts.length - 1; i++) {
      const a = p.pts[i], b = p.pts[i + 1], sI = G.segInfo(a, b); const ops = L.openings.filter(o => o.host === p.id && o.seg === i); const nlx = -sI.dz, nlz = sI.dx;
      const lf = u => u <= 1e-6 ? Lf[i] : u >= sI.L - 1e-6 ? Lf[i + 1] : [a[0] + sI.dx * u + nlx * t / 2, a[1] + sI.dz * u + nlz * t / 2];
      const rt = u => u <= 1e-6 ? Rt[i] : u >= sI.L - 1e-6 ? Rt[i + 1] : [a[0] + sI.dx * u - nlx * t / 2, a[1] + sI.dz * u - nlz * t / 2];
      for (const [s0, s1] of wallPieces(sI.L, ops)) {
        const q = [lf(s0), lf(s1), rt(s1), rt(s0)]; x.beginPath(); q.forEach((pp, k) => k ? x.lineTo(pp[0], pp[1]) : x.moveTo(pp[0], pp[1])); x.closePath();
        x.fillStyle = on ? '#2450E0' : hv ? '#D9711A' : S._line ? '#FFFFFF' : kind === 'glass' ? '#DCEAF6' : kind === 'half' ? '#C9CED3' : '#4A525B'; x.fill(); if (S._line && !on && !hv && kind === 'wall') { x.save(); hatchPoly(x, q, px); x.restore(); }
        x.beginPath(); q.forEach((pp, k) => k ? x.lineTo(pp[0], pp[1]) : x.moveTo(pp[0], pp[1])); x.closePath(); x.strokeStyle = on ? '#2450E0' : S._line ? '#1B1F23' : kind === 'glass' ? '#3B7FC4' : '#2B3036'; x.lineWidth = (S._line ? 1.2 : 1) * px; x.stroke();
        if (kind === 'glass' && !on) { const c0 = [a[0] + sI.dx * s0, a[1] + sI.dz * s0], c1 = [a[0] + sI.dx * s1, a[1] + sI.dz * s1]; x.beginPath(); x.moveTo(c0[0], c0[1]); x.lineTo(c1[0], c1[1]); x.strokeStyle = S._line ? '#1B1F23' : '#3B7FC4'; x.stroke(); }
        if (kind === 'half' && !on) { x.save(); x.clip(); x.beginPath(); for (let u = s0; u < s1 + t; u += .12) { const p0 = lf(Math.min(u, s1)), p1 = rt(Math.max(s0, u - t)); x.moveTo(p0[0], p0[1]); x.lineTo(p1[0], p1[1]); } x.strokeStyle = '#7F8891'; x.lineWidth = px; x.stroke(); x.restore(); }
      }
    }
  }
  // openings
  for (const o of L.openings) {
    const hs = GP.hostSeg(o); if (!hs) continue; const sp = GP.openingSpan(o, hs); const w = sp.w, c = sp.c;
    const cx = hs.a[0] + hs.dx * c + hs.nx * hs.mid, cz = hs.a[1] + hs.dz * c + hs.nz * hs.mid;
    const on = scr && sel.has('opening:' + o.id), hv = scr && hov && hov.k === 'opening' && hov.id === o.id;
    const line = on ? '#2450E0' : hv ? '#D9711A' : '#1B1F23', soft = on ? '#2450E0' : hv ? '#D9711A' : '#59626B';
    x.save(); x.transform(hs.dx, hs.dz, hs.nx, hs.nz, cx, cz);
    const T = hs.thick, flip = o.flip ? -1 : 1, hinge = o.hinge === 'R' ? 1 : -1;
    x.lineWidth = 1.3 * px; x.strokeStyle = line; x.lineCap = 'butt';
    const seg = (a, b, col, lw, dash) => { x.beginPath(); x.moveTo(a[0], a[1]); x.lineTo(b[0], b[1]); x.strokeStyle = col || line; x.lineWidth = (lw || 1.3) * px; x.setLineDash(dash ? [5 * px, 4 * px] : []); x.stroke(); x.setLineDash([]); };
    if (on || hv) { x.fillStyle = on ? 'rgba(36,80,224,.10)' : 'rgba(217,113,26,.10)'; x.fillRect(-w / 2, -T / 2 - .02, w, T + .04); }
    seg([-w / 2, -T / 2], [-w / 2, T / 2]); seg([w / 2, -T / 2], [w / 2, T / 2]);
    if (o.kind === 'window') { [-T / 2, 0, T / 2].forEach(v => seg([-w / 2, v], [w / 2, v], v || S._line ? line : '#3B7FC4', v ? 1.1 : 1.6)); }
    else if (o.kind === 'opening') seg([-w / 2, 0], [w / 2, 0], soft, 1, true);
    else if (o.kind === 'slide') { seg([-w / 2, flip * .03], [w * .45, flip * .03], line, 2); seg([-w * .45, -flip * .03], [w / 2, -flip * .03], line, 2); }
    else {
      const dbl = o.kind === 'door2' || o.kind === 'glass2'; const leaves = dbl ? [[-w / 2, w / 2, -1], [w / 2, w / 2, 1]] : [[hinge * w / 2, w, hinge]];
      if (o.kind === 'glass2') { const gc = S._line ? line : '#3B7FC4'; seg([-w / 2, 0], [0, 0], gc, 2.2); seg([0, 0], [w / 2, 0], gc, 2.2); }
      leaves.forEach(([hx, lw, sgn]) => {
        const z0 = flip * (T / 2); x.beginPath(); for (let k = 0; k <= 24; k++) { const t = k / 24 * Math.PI / 2; const u = hx - sgn * Math.cos(t) * lw, v = z0 + flip * Math.sin(t) * lw; k ? x.lineTo(u, v) : x.moveTo(u, v); }
        x.strokeStyle = soft; x.lineWidth = px; x.setLineDash(o.kind === 'glass2' ? [4 * px, 3 * px] : []); x.stroke(); x.setLineDash([]);
        if (o.kind !== 'glass2') seg([hx, z0], [hx, z0 + flip * lw], line, 1.8);
      });
    }
    x.restore();
  }
}

/* ---------------- picking ---------------- */
S.itemAt = (wx, wz, tolPx) => {
  const L = GP.L(); if (!S.layers.items) return null; const tol = (tolPx ?? 3) / S.cam.s;
  const order = it => { const d = GP.getDef(it.type) || {}; const m = GP.mountOf(it); return d.flat ? 0 : m === 'floor' ? 1 : m === 'wall' ? 2 : 3; };
  const list = L.items.slice().sort((a, b) => order(b) - order(a));
  let best = null, bestA = Infinity;
  for (const it of list) { const d = GP.dims(it); const [lx, lz] = G.w2l(it.x, it.z, it.rot, wx, wz); const hw = Math.max(d.w / 2, .04) + tol, hd = Math.max(d.d / 2, .04) + tol; if (Math.abs(lx) <= hw && Math.abs(lz) <= hd) { const o = order(it), A = d.w * d.d; if (!best || o > best.o || (o === best.o && A < bestA)) { best = { uid: it.uid, o }; bestA = A; } } }
  return best ? best.uid : null;
};
S.pickItem = (cx, cy) => { const f = S.floorAt(cx, cy); return S.itemAt(f.x, f.z); };
S.matAt = (wx, wz) => { const L = GP.L(); if (!S.layers.mats) return null; for (const m of L.mats.slice().reverse()) if (m.pts.length > 2 && G.pip(wx, wz, m.pts)) return m; return null; };
})();
