/* GoFit Planner — core: utilities, geometry, storage, library, project model, history */
(function () {
'use strict';
const GP = window.GP = window.GP || {};
GP.VERSION = '2.2.2';
GP.errors = [];
window.addEventListener('error', e => { GP.errors.push(String(e.message || e)); });
window.addEventListener('unhandledrejection', e => { GP.errors.push('promise: ' + String(e.reason && e.reason.message || e.reason)); });

/* ---------------- utils ---------------- */
const U = GP.U = {};
U.$ = (s, r) => (r || document).querySelector(s);
U.$$ = (s, r) => Array.from((r || document).querySelectorAll(s));
U.PY = 3.305785;
U.DEG = Math.PI / 180;
U.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
U.snap = (v, g) => Math.round(v / g) * g;
U.r3 = v => Math.round(v * 1000) / 1000;
U.r2 = v => Math.round(v * 100) / 100;
U.cm = v => Math.round(v * 100);
U.f3 = v => (+v).toFixed(3);
U.won = v => (Math.round(v) || 0).toLocaleString('ko-KR');
U.normRot = r => { r = ((r % 360) + 360) % 360; r = Math.round(r * 10) / 10; return r >= 360 ? 0 : r; };
U.angNorm = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a <= -Math.PI) a += 2 * Math.PI; return a; };
let seq = 0;
U.uid = (p) => (p || 'i') + Date.now().toString(36) + (seq++).toString(36) + Math.random().toString(36).slice(2, 5);
U.esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
U.clone = o => JSON.parse(JSON.stringify(o));
U.debounce = (fn, ms) => { let t = 0; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
U.isNarrow = () => matchMedia('(max-width: 820px)').matches;
U.today = () => { const d = new Date(); return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`; };
U.stamp = (t) => { const d = new Date(t); return `${d.getMonth() + 1}월 ${d.getDate()}일 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
U.fileSafe = s => String(s || 'gofit').replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, '_').slice(0, 60);
U.download = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click();
  setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 1500);
};
U.readFile = (file, as) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; if (as === 'text') r.readAsText(file); else if (as === 'buffer') r.readAsArrayBuffer(file); else r.readAsDataURL(file); });
U.loadImage = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
U.downscaleImage = async (dataURL, max) => {
  const img = await U.loadImage(dataURL); const s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  if (s >= 1 && dataURL.length < 900000) return { src: dataURL, w: img.naturalWidth, h: img.naturalHeight };
  const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  const png = /png|gif|webp/i.test(dataURL.slice(0, 30));
  return { src: c.toDataURL(png ? 'image/png' : 'image/jpeg', .9), w: c.width, h: c.height };
};
U.copyText = async (txt) => {
  try { await navigator.clipboard.writeText(txt); return true; } catch (e) {
    try { const ta = document.createElement('textarea'); ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); const ok = document.execCommand('copy'); ta.remove(); return ok; } catch (e2) { return false; }
  }
};

/* ---------------- plan geometry (x, z) — z grows downward on the plan ---------------- */
const G = GP.G = {};
G.area = P => { let a = 0; for (let i = 0; i < P.length; i++) { const p = P[i], q = P[(i + 1) % P.length]; a += p[0] * q[1] - q[0] * p[1]; } return a / 2; };
G.bounds = P => { let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity; for (const p of P) { if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < z0) z0 = p[1]; if (p[1] > z1) z1 = p[1]; } if (!P.length) { x0 = z0 = 0; x1 = z1 = 1; } return { minX: x0, maxX: x1, minZ: z0, maxZ: z1, sx: x1 - x0, sz: z1 - z0, cx: (x0 + x1) / 2, cz: (z0 + z1) / 2 }; };
G.pip = (x, z, P) => { let ins = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const xi = P[i][0], zi = P[i][1], xj = P[j][0], zj = P[j][1]; if (((zi > z) !== (zj > z)) && (x < (xj - xi) * (z - zi) / (zj - zi) + xi)) ins = !ins; } return ins; };
G.crs = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
G.segX = (a, b, c, d) => { const d1 = G.crs(c, d, a), d2 = G.crs(c, d, b), d3 = G.crs(a, b, c), d4 = G.crs(a, b, d); return ((d1 > 1e-9 && d2 < -1e-9) || (d1 < -1e-9 && d2 > 1e-9)) && ((d3 > 1e-9 && d4 < -1e-9) || (d3 < -1e-9 && d4 > 1e-9)); };
G.selfX = P => { const n = P.length; for (let i = 0; i < n; i++) for (let j = i + 2; j < n; j++) { if (i === 0 && j === n - 1) continue; if (G.segX(P[i], P[(i + 1) % n], P[j], P[(j + 1) % n])) return true; } return false; };
G.len = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
G.segInfo = (a, b) => { const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1e-9; return { a, b, L, dx: (b[0] - a[0]) / L, dz: (b[1] - a[1]) / L }; };
/* closest point on segment: returns {t (0..L), d (distance), x, z} */
G.closest = (x, z, a, b) => { const s = G.segInfo(a, b); let t = (x - a[0]) * s.dx + (z - a[1]) * s.dz; t = Math.max(0, Math.min(s.L, t)); const px = a[0] + s.dx * t, pz = a[1] + s.dz * t; return { t, d: Math.hypot(x - px, z - pz), x: px, z: pz, L: s.L }; };
/* inward normal for polygon edge i (polygon orientation aware) */
G.edge = (P, i) => { const n = P.length, a = P[i], b = P[(i + 1) % n], s = G.segInfo(a, b), sg = G.area(P) > 0 ? 1 : -1; return { a, b, L: s.L, dx: s.dx, dz: s.dz, nx: -s.dz * sg, nz: s.dx * sg }; };
G.offset = (P, t, closed = true) => {
  /* outward offset (t>0) for closed polygons; for open polylines offset to the left side of travel */
  const n = P.length, out = [], sg = closed ? (G.area(P) > 0 ? 1 : -1) : -1;
  const nrm = (a, b) => { const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; const dx = (b[0] - a[0]) / L, dz = (b[1] - a[1]) / L; return [dz * sg, -dx * sg]; };
  for (let i = 0; i < n; i++) {
    const hasPrev = closed || i > 0, hasNext = closed || i < n - 1;
    const p1 = P[i];
    if (!hasPrev) { const n2 = nrm(P[i], P[i + 1]); out.push([p1[0] + n2[0] * t, p1[1] + n2[1] * t]); continue; }
    if (!hasNext) { const n1 = nrm(P[i - 1], P[i]); out.push([p1[0] + n1[0] * t, p1[1] + n1[1] * t]); continue; }
    const p0 = P[(i - 1 + n) % n], p2 = P[(i + 1) % n];
    const n1 = nrm(p0, p1), n2 = nrm(p1, p2);
    const d1 = [p1[0] - p0[0], p1[1] - p0[1]], d2 = [p2[0] - p1[0], p2[1] - p1[1]];
    const q1 = [p1[0] + n1[0] * t, p1[1] + n1[1] * t], q2 = [p1[0] + n2[0] * t, p1[1] + n2[1] * t];
    const den = d1[0] * d2[1] - d1[1] * d2[0]; let r = q2;
    if (Math.abs(den) > 1e-9) { const u = ((q2[0] - q1[0]) * d2[1] - (q2[1] - q1[1]) * d2[0]) / den; r = [q1[0] + d1[0] * u, q1[1] + d1[1] * u]; }
    const dl = Math.hypot(r[0] - p1[0], r[1] - p1[1]), lim = Math.abs(t) * 4;
    if (dl > lim) { const f = lim / dl; r = [p1[0] + (r[0] - p1[0]) * f, p1[1] + (r[1] - p1[1]) * f]; }
    out.push(r);
  }
  return out;
};
G.interior = (P, i) => { const n = P.length, p = P[i], a = P[(i - 1 + n) % n], b = P[(i + 1) % n]; const e1 = [p[0] - a[0], p[1] - a[1]], e2 = [b[0] - p[0], b[1] - p[1]]; const turn = Math.atan2(e1[0] * e2[1] - e1[1] * e2[0], e1[0] * e2[0] + e1[1] * e2[1]); const s = G.area(P) > 0 ? 1 : -1; return 180 - turn * s / U.DEG; };
G.centroid = P => { let a = 0, cx = 0, cz = 0; for (let i = 0; i < P.length; i++) { const p = P[i], q = P[(i + 1) % P.length], f = p[0] * q[1] - q[0] * p[1]; a += f; cx += (p[0] + q[0]) * f; cz += (p[1] + q[1]) * f; } if (Math.abs(a) < 1e-9) { const b = G.bounds(P); return [b.cx, b.cz]; } return [cx / (3 * a), cz / (3 * a)]; };
/* label position well inside a polygon (pole of inaccessibility approximation) */
G.labelPoint = P => {
  const c = G.centroid(P); if (G.pip(c[0], c[1], P)) return c;
  const b = G.bounds(P); let best = null, bd = -1; const st = Math.max(b.sx, b.sz) / 24;
  for (let x = b.minX + st / 2; x < b.maxX; x += st) for (let z = b.minZ + st / 2; z < b.maxZ; z += st) {
    if (!G.pip(x, z, P)) continue; let d = Infinity; for (let i = 0; i < P.length; i++) d = Math.min(d, G.closest(x, z, P[i], P[(i + 1) % P.length]).d); if (d > bd) { bd = d; best = [x, z]; }
  }
  return best || c;
};
G.rectPts = (x, z, rot, x0, x1, z0, z1) => { const f = -rot * U.DEG, c = Math.cos(f), s = Math.sin(f); return [[x0, z0], [x1, z0], [x1, z1], [x0, z1]].map(([lx, lz]) => [x + lx * c + lz * s, z - lx * s + lz * c]); };
G.l2w = (x, z, rot, lx, lz) => { const f = -rot * U.DEG, c = Math.cos(f), s = Math.sin(f); return [x + lx * c + lz * s, z - lx * s + lz * c]; };
G.w2l = (x, z, rot, wx, wz) => { const f = -rot * U.DEG, c = Math.cos(f), s = Math.sin(f), dx = wx - x, dz = wz - z; return [dx * c - dz * s, dx * s + dz * c]; };
/* SAT overlap for convex polygons; tol shrinks */
G.overlap = (A, B, tol = .01) => {
  for (const P of [A, B]) for (let i = 0; i < P.length; i++) {
    const p = P[i], q = P[(i + 1) % P.length]; const nx = q[1] - p[1], nz = p[0] - q[0], L = Math.hypot(nx, nz) || 1;
    let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity;
    for (const v of A) { const t = (v[0] * nx + v[1] * nz) / L; if (t < a0) a0 = t; if (t > a1) a1 = t; }
    for (const v of B) { const t = (v[0] * nx + v[1] * nz) / L; if (t < b0) b0 = t; if (t > b1) b1 = t; }
    if (a1 - b0 < tol || b1 - a0 < tol) return false;
  }
  return true;
};
/* gap between two convex polygons (0 if overlapping) */
G.polyGap = (A, B) => { if (G.overlap(A, B, 0)) return 0; let d = Infinity; for (const P of [[A, B], [B, A]]) for (const v of P[0]) for (let i = 0; i < P[1].length; i++) d = Math.min(d, G.closest(v[0], v[1], P[1][i], P[1][(i + 1) % P[1].length]).d); return d; };
G.rectInside = (C, P, shrink = .012) => {
  let cx = 0, cz = 0; for (const c of C) { cx += c[0]; cz += c[1]; } cx /= C.length; cz /= C.length;
  const S = C.map(([x, z]) => { const dx = cx - x, dz = cz - z, l = Math.hypot(dx, dz) || 1; return [x + dx / l * shrink, z + dz / l * shrink]; });
  if (!S.every(p => G.pip(p[0], p[1], P))) return false;
  const n = P.length; for (let i = 0; i < S.length; i++) for (let j = 0; j < n; j++) if (G.segX(S[i], S[(i + 1) % S.length], P[j], P[(j + 1) % n])) return false;
  return true;
};
G.segHitsPoly = (a, b, P) => { for (let i = 0; i < P.length; i++) if (G.segX(a, b, P[i], P[(i + 1) % P.length])) return true; return false; };
/* ray from point along direction; returns distance to first hit among segments */
G.rayHit = (x, z, dx, dz, segs, maxD = 50) => {
  let best = maxD;
  for (const [a, b] of segs) {
    const ex = b[0] - a[0], ez = b[1] - a[1]; const den = dx * ez - dz * ex; if (Math.abs(den) < 1e-12) continue;
    const t = ((a[0] - x) * ez - (a[1] - z) * ex) / den; const u = ((a[0] - x) * dz - (a[1] - z) * dx) / den;
    if (t > 1e-6 && u >= -1e-9 && u <= 1 + 1e-9 && t < best) best = t;
  }
  return best;
};

/* ---------------- event bus ---------------- */
const handlers = {};
GP.on = (ev, fn) => { (handlers[ev] = handlers[ev] || []).push(fn); };
GP.emit = (ev, data) => { (handlers[ev] || []).forEach(fn => { try { fn(data); } catch (e) { console.error(ev, e); GP.errors.push(ev + ': ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e)); } }); };

/* ---------------- storage (IndexedDB with localStorage fallback) ---------------- */
const DB = GP.DB = {};
let dbp = null;
function openDB() {
  if (dbp) return dbp;
  dbp = new Promise((res) => {
    try {
      const rq = indexedDB.open('gofit-planner', 1);
      rq.onupgradeneeded = () => { const db = rq.result; ['projects', 'kv', 'versions', 'blobs'].forEach(s => { if (!db.objectStoreNames.contains(s)) db.createObjectStore(s); }); };
      rq.onsuccess = () => res(rq.result); rq.onerror = () => res(null); rq.onblocked = () => res(null);
    } catch (e) { res(null); }
  });
  return dbp;
}
function tx(store, mode, fn) {
  return openDB().then(db => new Promise((res) => {
    if (!db) { res(fn(null)); return; }
    try { const t = db.transaction(store, mode), st = t.objectStore(store); const r = fn(st); t.oncomplete = () => res(r && r.result !== undefined ? r.result : r); t.onerror = () => res(undefined); t.onabort = () => res(undefined); } catch (e) { res(undefined); }
  }));
}
const LSK = (s, k) => `gofit:${s}:${k}`;
DB.get = (store, key) => openDB().then(db => {
  if (!db) { try { const v = localStorage.getItem(LSK(store, key)); return v ? JSON.parse(v) : undefined; } catch (e) { return undefined; } }
  return new Promise(res => { try { const r = db.transaction(store).objectStore(store).get(key); r.onsuccess = () => res(r.result); r.onerror = () => res(undefined); } catch (e) { res(undefined); } });
});
DB.put = (store, key, val) => openDB().then(db => {
  if (!db) { try { localStorage.setItem(LSK(store, key), JSON.stringify(val)); } catch (e) { } return; }
  return tx(store, 'readwrite', st => st.put(val, key));
});
DB.del = (store, key) => openDB().then(db => { if (!db) { try { localStorage.removeItem(LSK(store, key)); } catch (e) { } return; } return tx(store, 'readwrite', st => st.delete(key)); });
DB.all = (store) => openDB().then(db => {
  if (!db) { const out = []; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith(`gofit:${store}:`)) out.push({ key: k.slice(`gofit:${store}:`.length), value: JSON.parse(localStorage.getItem(k)) }); } } catch (e) { } return out; }
  return new Promise(res => { try { const out = []; const r = db.transaction(store).objectStore(store).openCursor(); r.onsuccess = () => { const c = r.result; if (c) { out.push({ key: c.key, value: c.value }); c.continue(); } else res(out); }; r.onerror = () => res(out); } catch (e) { res([]); } });
});

/* ---------------- library (settings shared by all projects) ---------------- */
const LIB_DEFAULT = () => ({
  v: 1,
  names: {}, catNames: {}, prices: {}, power: {}, favorites: ['treadmill', 'bike', 'latpull', 'chest', 'legpress_plate', 'powerrack', 'bench_flat', 'bench_adj', 'dbrack2'], hidden: [],
  matPrices: {}, trimPrices: {}, partPrices: { wall: 0, glass: 0, half: 0 },
  customTypes: {}, sets: [],
  extraPrices: {}, extraRecent: [], mode: 'easy', magnet: false,   // magnet: items dragged near a wall snap onto it (off by default)      // mode: 'easy' (step-by-step wizard) or 'expert' (every tool)      // quote-only items (not on the plan): last price per name, recently used names
  defaults: { blocksPerPyeong: 13, aisleMin: .9, shipping: 0, install: 0, validDays: 30, cordLen: 3, finance: { kind: 'install', months: 36, downPct: 0, rateLo: 6, rateHi: 12, rvPct: 0 } },
  company: { name: 'GOFIT KOREA', ceo: '', tel: '', addr: '', bizNo: '', email: '' },
  guideSeen: false,
});
GP.lib = LIB_DEFAULT();
GP.loadLib = async () => {
  const v = await DB.get('kv', 'lib');
  const d = LIB_DEFAULT();
  if (v && typeof v === 'object') { GP.lib = Object.assign(d, v); GP.lib.defaults = Object.assign(LIB_DEFAULT().defaults, v.defaults || {}); GP.lib.company = Object.assign(LIB_DEFAULT().company, v.company || {}); }
  else GP.lib = d;
};
GP.saveLib = U.debounce(() => { DB.put('kv', 'lib', GP.lib); }, 300);

/* ---------------- project model ---------------- */
GP.BLOCKS = {
  basic: { name: '일반 고무블럭', thick: [25], color: '#3a3f3c' },
  coat: { name: '코팅 고무블럭', thick: [25], color: '#1b1b1c' },
  arena: { name: '아레나 코팅 고무블럭', thick: [25], color: '#c48a55' },
  topblack: { name: '탑블랙 코팅 고무블럭', thick: [25], color: '#2d2e30' },
  stone: { name: '스톤 블랙 코팅 고무블럭', thick: [25], color: '#5a5b5c' },
};
GP.TRIM_W = .06; /* 25T trim: 60 mm slope, 25 mm high */
GP.TRIMS = { rubber: '경사형 고무 마감재', alu: '경사형 알루미늄 몰딩', none: '마감재 없음' };
GP.PARTS = { wall: '일반 가벽', glass: '유리 파티션', half: '허리 높이 반벽' };
GP.OPENINGS = { door: '여닫이 문', door2: '양개문', glass2: '유리 자동문', slide: '미닫이 문', opening: '개구부(문 없음)', window: '창문' };

GP.DEFAULT_ROOM = [[0, 0], [10, 0], [10, 8], [0, 8]];     // a new project starts with one plain 10 x 8 m room
GP.newLayout = (pts) => ({
  room: { pts: pts || GP.DEFAULT_ROOM.map(q => q.slice()) },
  wallColors: {}, wallMarks: {},
  openings: [], partitions: [], items: [], mats: [], zones: [], rooms: [], notes: [], dims: [], scenes: [],
  quote: { extras: [], shipping: null, install: null, discountPct: 0, discountAmt: 0, note: '', validDays: null, no: '' },
});
GP.newProject = (o) => {
  o = o || {};
  const id = U.uid('p');
  return {
    v: 2, id, name: o.name || '새 프로젝트', client: o.client || '', consultant: o.consultant || '',
    createdAt: Date.now(), updatedAt: Date.now(),
    settings: { wallH: 2.8, wallColor: '#eeede8', floorBase: 'concrete', frameColor: 'black', accent: '#f08a1c', shroud: '#141517' },
    variants: [{ id: U.uid('v'), name: 'A안', layout: GP.newLayout(o.pts) }], cur: 0,
    images: {},
  };
};
GP.validateProject = (o) => {
  if (!o || typeof o !== 'object' || !Array.isArray(o.variants) || !o.variants.length) return null;
  const base = GP.newProject();
  const p = Object.assign(base, o);
  p.settings = Object.assign(GP.newProject().settings, o.settings || {});
  p.images = o.images || {};
  p.variants = o.variants.map(v => {
    const L = Object.assign(GP.newLayout(), v.layout || {});
    if (!L.room || !Array.isArray(L.room.pts) || L.room.pts.length < 3) L.room = { pts: GP.DEFAULT_ROOM.map(q => q.slice()) };
    ['openings', 'partitions', 'items', 'mats', 'zones', 'rooms', 'notes', 'dims', 'scenes'].forEach(k => { if (!Array.isArray(L[k])) L[k] = []; });
    L.quote = Object.assign(GP.newLayout().quote, L.quote || {});
    L.wallColors = L.wallColors || {}; L.wallMarks = L.wallMarks || {};
    L.mats.forEach(m => { m.thick = 25; if (!GP.BLOCKS[m.block]) m.block = 'coat'; if (!m.trim) m.trim = 'rubber'; });
    L.items = L.items.filter(it => it && isFinite(it.x) && isFinite(it.z) && it.type).map(it => Object.assign(it, { uid: it.uid || U.uid(), rot: U.normRot(+it.rot || 0) }));
    return { id: v.id || U.uid('v'), name: v.name || 'A안', layout: L };
  });
  p.cur = U.clamp(+o.cur || 0, 0, p.variants.length - 1);
  if (o.customTypes) { for (const k in o.customTypes) if (!GP.lib.customTypes[k]) GP.lib.customTypes[k] = o.customTypes[k]; }
  return p;
};
GP.P = null;
GP.L = () => GP.P ? GP.P.variants[GP.P.cur].layout : null;      // null only while the first project is still loading
GP.findItem = uid => GP.L().items.find(i => i.uid === uid);
GP.findBy = (kind, id) => { const L = GP.L(); const map = { item: L.items, part: L.partitions, opening: L.openings, mat: L.mats, zone: L.zones, room: L.rooms, note: L.notes, dim: L.dims }; const arr = map[kind]; if (!arr) return null; return arr.find(o => (o.uid || o.id) === id) || null; };

/* ---------------- history ---------------- */
const H = GP.H = { stack: [], idx: -1, lastVersionAt: 0 };
H.snap = () => { const p = GP.P; return JSON.stringify({ settings: p.settings, variants: p.variants, cur: p.cur }); };      // name / client stay out: undoing a move must not bring back an old name
H.reset = () => { H.stack = [H.snap()]; H.idx = 0; GP.emit('history'); };
H.commit = () => {
  const s = H.snap(); if (H.stack[H.idx] === s) return false;
  H.stack = H.stack.slice(0, H.idx + 1); H.stack.push(s); if (H.stack.length > 200) H.stack.shift(); H.idx = H.stack.length - 1;
  GP.P.updatedAt = Date.now(); GP.emit('history'); GP.emit('dirty'); return true;
};
H.apply = (s) => { const o = JSON.parse(s); Object.assign(GP.P, o); GP.emit('restore'); GP.emit('history'); GP.emit('dirty'); };
H.undo = () => { if (H.idx <= 0) return; H.idx--; H.apply(H.stack[H.idx]); };
H.redo = () => { if (H.idx >= H.stack.length - 1) return; H.idx++; H.apply(H.stack[H.idx]); };
H.canUndo = () => H.idx > 0; H.canRedo = () => H.idx < H.stack.length - 1;

/* ---------------- project persistence ---------------- */
GP.projectPayload = () => { const p = GP.P; const used = new Set(); p.variants.forEach(v => v.layout.items.forEach(it => { if (String(it.type).startsWith('c_')) used.add(it.type); })); const ct = {}; used.forEach(k => { if (GP.lib.customTypes[k]) ct[k] = GP.lib.customTypes[k]; }); return Object.assign({}, p, { customTypes: ct }); };
GP.saveProject = async (thumb) => {
  if (!GP.P || GP.viewOnly || GP.P.unnamed) return;      // the first-run project is saved once it has a name
  const p = GP.projectPayload(); p.updatedAt = Date.now();
  const rec = { id: p.id, name: p.name, client: p.client, updatedAt: p.updatedAt, thumb: thumb || (await DB.get('projects', p.id))?.thumb || '', data: p };
  await DB.put('projects', p.id, rec); await DB.put('kv', 'lastProject', p.id); GP.emit('saved', p.updatedAt);
  const now = Date.now();
  if (now - H.lastVersionAt > 4 * 60 * 1000) { H.lastVersionAt = now; await GP.addVersion(''); }
};
GP.addVersion = async (label) => {
  const key = GP.P.id; const list = (await DB.get('versions', key)) || [];
  list.unshift({ t: Date.now(), label: label || '', data: H.snap() }); if (list.length > 40) list.length = 40;
  await DB.put('versions', key, list);
};
GP.listVersions = async () => (await DB.get('versions', GP.P.id)) || [];
GP.listProjects = async () => (await DB.all('projects')).map(r => r.value).filter(Boolean).sort((a, b) => b.updatedAt - a.updatedAt);
GP.deleteProject = async (id) => { await DB.del('projects', id); await DB.del('versions', id); };
})();
