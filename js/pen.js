/* GoFit Planner — curved walls and the pen tool.

   Curved wall: room.curves[s] = { n, a, b }. The walls s .. s+n-1 (indices mod N) are the pieces of one cubic Bezier curve
   from corner s to corner s+n; a / b are its two control points as offsets from those corners (so moving a corner carries its
   handle along, like Photoshop). The pieces' inner points are generated (CV.resample) and stay ordinary polygon points, so area,
   3D walls, checks and exports need to know nothing about curves. The plan shows one length for the curve, hides the inner
   points, and shows the two handles instead.

   Pen tool (Photoshop's pen): click = a corner, press and drag = a smooth point whose handles shape the curve on both sides
   (Alt while dragging: only the outgoing handle), click the first point (or Enter / double-click / 완성) to close.
   Shift: 45° steps, Ctrl: 1 cm, Alt: free; type a number + Enter for an exact straight length. */
(function () {
'use strict';
const GP = window.GP, U = GP.U, G = GP.G, $ = U.$;
const ui = () => GP.ui;
const add = (p, v) => [p[0] + v[0], p[1] + v[1]], sub = (p, q) => [p[0] - q[0], p[1] - q[1]], mul = (v, k) => [v[0] * k, v[1] * k], vlen = v => Math.hypot(v[0], v[1]);
const r3v = v => [U.r3(v[0]), U.r3(v[1])];

/* ================= curve geometry ================= */
const CV = GP.CV = {};
CV.at = (p0, c1, c2, p3, t) => { const u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t; return [a * p0[0] + b * c1[0] + c * c2[0] + d * p3[0], a * p0[1] + b * c1[1] + c * c2[1] + d * p3[1]]; };
function dense(p0, c1, c2, p3, m) { const pts = [p0], acc = [0]; let L = 0; for (let k = 1; k <= m; k++) { const q = CV.at(p0, c1, c2, p3, k / m); L += G.len(pts[k - 1], q); pts.push(q); acc.push(L); } return { pts, acc, L }; }
CV.length = (p0, c1, c2, p3) => dense(p0, c1, c2, p3, 96).L;
/* n pieces of (nearly) equal length */
CV.sample = (p0, c1, c2, p3, n) => {
  const D = dense(p0, c1, c2, p3, Math.max(96, n * 12)), out = [p0.slice()]; let j = 1;
  for (let k = 1; k < n; k++) { const s = D.L * k / n; while (j < D.acc.length - 1 && D.acc[j] < s) j++; const f = (s - D.acc[j - 1]) / ((D.acc[j] - D.acc[j - 1]) || 1), a = D.pts[j - 1], b = D.pts[j]; out.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]); }
  out.push(p3.slice()); return out;
};
CV.nFor = L => U.clamp(Math.round(L / .3), 4, 40);      // about one piece per 30 cm
/* control offsets of a curve through the points Q (ends fixed): least squares with chord-length parameters */
CV.fit = (Q) => {
  const n = Q.length - 1, p0 = Q[0], p3 = Q[n], v = sub(p3, p0);
  const sym = (M) => { const m = mul(sub(M, mul(add(p0, p3), .5)), 4 / 3); return { a: add(mul(v, 1 / 3), m), b: add(mul(v, -1 / 3), m) }; };
  if (n < 3) return sym(Q[Math.max(1, Math.floor(n / 2))]);
  const t = [0]; let L = 0; for (let k = 1; k <= n; k++) { L += G.len(Q[k - 1], Q[k]); t.push(L); }
  let tt = t.map(v => v / (L || 1)), C1 = null, C2 = null;
  for (let it = 0; it < 6; it++) {      // solve for the handles, then move each point's parameter to its nearest place on that curve, again
    let A11 = 0, A12 = 0, A22 = 0; const X1 = [0, 0], X2 = [0, 0];
    for (let k = 0; k <= n; k++) {
      const tk = tt[k], u = 1 - tk, b0 = u * u * u, b1 = 3 * u * u * tk, b2 = 3 * u * tk * tk, b3 = tk * tk * tk;
      const R = [Q[k][0] - b0 * p0[0] - b3 * p3[0], Q[k][1] - b0 * p0[1] - b3 * p3[1]];
      A11 += b1 * b1; A12 += b1 * b2; A22 += b2 * b2; X1[0] += b1 * R[0]; X1[1] += b1 * R[1]; X2[0] += b2 * R[0]; X2[1] += b2 * R[1];
    }
    const det = A11 * A22 - A12 * A12; if (Math.abs(det) < 1e-9) return C1 ? { a: sub(C1, p0), b: sub(C2, p3) } : sym(Q[Math.floor(n / 2)]);
    C1 = [(A22 * X1[0] - A12 * X2[0]) / det, (A22 * X1[1] - A12 * X2[1]) / det]; C2 = [(A11 * X2[0] - A12 * X1[0]) / det, (A11 * X2[1] - A12 * X1[1]) / det];
    const D = []; for (let j = 0; j <= 240; j++) D.push(CV.at(p0, C1, C2, p3, j / 240));
    tt = Q.map((q, k) => { if (k === 0) return 0; if (k === n) return 1; let bj = 0, bd = Infinity; for (let j = 0; j <= 240; j++) { const d = Math.hypot(D[j][0] - q[0], D[j][1] - q[1]); if (d < bd) { bd = d; bj = j; } } return bj / 240; });
  }
  return { a: sub(C1, p0), b: sub(C2, p3) };
};

/* ================= curves of the room ================= */
CV.list = (L) => { const c = L.room.curves || {}, N = L.room.pts.length; return Object.keys(c).map(k => ({ s: +k, n: c[k].n, e: (+k + c[k].n) % N, ref: c[k] })); };
CV.of = (L, w) => { const N = L.room.pts.length; for (const c of CV.list(L)) if (((w - c.s + N) % N) < c.n) return c; return null; };
CV.inner = (L) => { const N = L.room.pts.length, S = new Set(); for (const c of CV.list(L)) for (let k = 1; k < c.n; k++) S.add((c.s + k) % N); return S; };
CV.ends = (L) => { const S = new Set(); for (const c of CV.list(L)) { S.add(c.s); S.add(c.e); } return S; };
const unit = v => { const l = vlen(v) || 1; return [v[0] / l, v[1] / l]; }, dot = (a, b) => a[0] * b[0] + a[1] * b[1];
/* a corner p between walls to A and B, rounded with radius r: the two points where the arc meets the walls, its handles, its
   bisector. The arc never runs past either wall's far end (the radius shrinks to fit). */
function rcGeom(p, A, B, r) {
  const u1 = unit(sub(A, p)), u2 = unit(sub(B, p)), th = Math.acos(U.clamp(dot(u1, u2), -1, 1)); if (th < .05 || th > Math.PI - .02) return null;
  let d = r / Math.tan(th / 2); const dmax = .95 * Math.min(G.len(A, p), G.len(B, p)); if (d > dmax) d = dmax;
  const re = d * Math.tan(th / 2), k = 4 / 3 * Math.tan((Math.PI - th) / 4) * re;
  return { t1: add(p, mul(u1, d)), t2: add(p, mul(u2, d)), a: mul(u1, -k), b: mul(u2, -k), r: re, th, bis: unit(add(u1, u2)) };
}
CV.rcGeom = rcGeom;
/* corners people see: the inner points of curves are not; a rounded corner is one corner (its virtual sharp point) */
CV.hidden = (L) => { const S = CV.inner(L); for (const c of CV.list(L)) if (c.ref.rc) { S.add(c.s); S.add(c.e); } return S; };
CV.ctrl = (L, c) => { const P = L.room.pts, p0 = P[c.s], p3 = P[c.e]; return { p0, c1: add(p0, c.ref.a), c2: add(p3, c.ref.b), p3 }; };
CV.len = (L, c) => { const k = CV.ctrl(L, c); return CV.length(k.p0, k.c1, k.c2, k.p3); };
CV.has = (L) => !!(L.room.curves && Object.keys(L.room.curves).length);
/* the number shown for corner i (1, 2, 3 … skipping the inner points of curves) */
CV.num = (L, i) => { if (!CV.has(L)) return i + 1; const skip = CV.inner(L); for (const c of CV.list(L)) if (c.ref.rc) skip.add(c.e); let k = 0; for (let j = 0; j <= i; j++) if (!skip.has(j)) k++; return k; };
/* curves that no longer fit the room (overlapping, out of range) go; the inner points follow the corners and handles */
CV.resample = (L) => {
  const C = L.room.curves; if (!C) return; const P = L.room.pts, N = P.length, used = new Set();
  for (const k of Object.keys(C).sort((a, b) => a - b)) {
    const s = +k, c = C[k]; let ok = Number.isInteger(s) && s >= 0 && s < N && c && Number.isInteger(c.n) && c.n >= 2 && c.n < N && Array.isArray(c.a) && Array.isArray(c.b);
    if (ok) for (let j = 0; j < c.n; j++) if (used.has((s + j) % N)) ok = false;
    if (!ok) { delete C[k]; continue; }
    for (let j = 0; j < c.n; j++) used.add((s + j) % N);
    const e = (s + c.n) % N;
    if (c.rc) { const g = rcGeom(c.rc.p, P[(s - 1 + N) % N], P[(e + 1) % N], c.rc.r); if (g) { P[s] = r3v(g.t1); P[e] = r3v(g.t2); c.a = r3v(g.a); c.b = r3v(g.b); } }
    const p0 = P[s], p3 = P[e], q = CV.sample(p0, add(p0, c.a), add(p3, c.b), p3, c.n);
    for (let j = 1; j < c.n; j++) P[(s + j) % N] = r3v(q[j]);
  }
  if (!Object.keys(C).length) delete L.room.curves;
};
/* after a point was added after i ('ins') or point i removed ('del') (tools.reindex): a curve keeps its place when its two ends
   are still there and still n points apart; one that was cut into goes back to plain points */
CV.reindex = (L, op, i, N0) => {
  const C = L.room.curves; if (!C) return; const N1 = L.room.pts.length, vm = k => op === 'ins' ? (k <= i ? k : k + 1) : (k === i ? null : k < i ? k : k - 1), out = {};
  for (const k of Object.keys(C)) { const s = +k, c = C[k], ns = vm(s), ne = vm((s + c.n) % N0); if (ns == null || ne == null || ((ne - ns + N1) % N1) !== c.n) continue; out[ns] = c; }
  L.room.curves = out; if (!Object.keys(out).length) delete L.room.curves;
};
/* a corner typed in the coordinate table that is an inner point of a curve: that curve becomes plain points */
CV.release = (L, i) => { const c = CV.inner(L).has(i) && CV.of(L, i); if (c) { delete L.room.curves[c.s]; if (!CV.has(L)) delete L.room.curves; } };
/* a straight wall i becomes a curve with control offsets a, b (its points are added after i) */
CV.bend = (L, i, a, b, nFix) => {
  const P = L.room.pts, N = P.length; if (CV.of(L, i)) return null;
  if (L.openings.some(o => o.host === 'room' && o.seg === i)) { GP.toast('문·창문이 있는 벽은 곡선으로 만들 수 없어요. 문·창문을 다른 벽으로 옮긴 뒤 해 주세요', { bad: true, ms: 4500 }); return null; }
  const p0 = P[i], p3 = P[(i + 1) % N], n = nFix || CV.nFor(Math.max(G.len(p0, p3), CV.length(p0, add(p0, a), add(p3, b), p3))), q = CV.sample(p0, add(p0, a), add(p3, b), p3, n), d = n - 1;
  P.splice(i + 1, 0, ...q.slice(1, n).map(r3v));
  L.openings.forEach(o => { if (o.host === 'room' && o.seg > i) o.seg += d; });
  for (const m of [L.wallMarks, L.wallTex]) if (m) { const nx = {}; for (const k of Object.keys(m)) { const w = +k; if (w < i) nx[w] = m[k]; else if (w === i) for (let j = 0; j < n; j++) nx[i + j] = m[k]; else nx[w + d] = m[k]; } for (const k in m) delete m[k]; Object.assign(m, nx); }
  const C = L.room.curves || {}, out = {}; for (const k of Object.keys(C)) out[+k > i ? +k + d : +k] = C[k];
  out[i] = { n, a: r3v(a), b: r3v(b) }; L.room.curves = out; return CV.list(L).find(c => c.s === i);
};
/* corner i rounded with radius r (a second point is added for where the arc meets the next wall) */
CV.round = (L, i, r) => {
  const P = L.room.pts, N = P.length; if (CV.inner(L).has(i) || CV.ends(L).has(i)) return null;
  const p = P[i].slice(), g = rcGeom(p, P[(i - 1 + N) % N], P[(i + 1) % N], r); if (!g) return null;
  const t = { kind: 'room', pts: P }, old = P.map(q => q.slice()); P.splice(i + 1, 0, r3v(g.t2)); GP.tools.reindex(t, 'ins', i, old); P[i] = r3v(g.t1);
  const c = CV.bend(L, i, g.a, g.b, 10);
  if (!c) { P[i] = p; const o2 = P.map(q => q.slice()); P.splice(i + 1, 1); GP.tools.reindex(t, 'del', i + 1, o2); return null; }
  c.ref.rc = { p: r3v(p), r: U.r3(g.r) }; CV.resample(L); return CV.list(L).find(q => q.s === i);
};
/* a rounded corner back to a sharp one */
CV.unround = (L, s) => {
  const c = CV.list(L).find(q => q.s === s); if (!c || !c.ref.rc) return; const p = c.ref.rc.p.slice();
  CV.flatten(L, s); const P = L.room.pts, N = P.length, t = { kind: 'room', pts: P }, k = (s + 1) % N, old = P.map(q => q.slice());
  P[s] = p; P.splice(k, 1); GP.tools.reindex(t, 'del', k, old);
};
/* the curve s back to one straight wall (its inner points go; doors on its pieces move onto the wall) */
CV.flatten = (L, s) => {
  const c = CV.list(L).find(q => q.s === s); if (!c) return; const N = L.room.pts.length, t = { kind: 'room', pts: L.room.pts };
  delete L.room.curves[s]; const idx = []; for (let j = 1; j < c.n; j++) idx.push((s + j) % N);
  idx.sort((a, b) => b - a).forEach(k => { const old = t.pts.map(p => p.slice()); t.pts.splice(k, 1); GP.tools.reindex(t, 'del', k, old); });
  if (L.room.curves && !Object.keys(L.room.curves).length) delete L.room.curves;
};
/* the run of points s .. s+n (already there, e.g. a curve drawn as many short walls) becomes one smooth curve */
CV.fitRun = (L, s, n) => {
  const P = L.room.pts, N = P.length; for (let j = 0; j < n; j++) if (CV.of(L, (s + j) % N)) return false;
  const Q = []; for (let j = 0; j <= n; j++) Q.push(P[(s + j) % N]); const f = CV.fit(Q);
  L.room.curves = Object.assign(L.room.curves || {}, { [s]: { n, a: r3v(f.a), b: r3v(f.b) } }); CV.resample(L); return true;
};
/* a run of selected corners (consecutive round the room) -> { s, n } or null */
CV.runOf = (sel, N) => {
  const m = sel.size; if (m < 2 || m >= N) return null;
  for (const s of sel) { if (sel.has((s - 1 + N) % N)) continue; let ok = true; for (let j = 0; j < m; j++) if (!sel.has((s + j) % N)) { ok = false; break; } if (ok) return { s, n: m - 1 }; }
  return null;
};

/* ================= the whole space at another scale (a known wall length, a target 평수) ================= */
CV.scaleAll = (k, O, opt) => {
  opt = opt || {}; const L = GP.L(), f = p => [U.r3(O[0] + (p[0] - O[0]) * k), U.r3(O[1] + (p[1] - O[1]) * k)];
  L.room.pts = L.room.pts.map(f); for (const c of Object.values(L.room.curves || {})) { c.a = r3v(mul(c.a, k)); c.b = r3v(mul(c.b, k)); if (c.rc) { c.rc.p = f(c.rc.p); c.rc.r = U.r3(c.rc.r * k); } }
  const sc = o => { const q = f([o.x, o.z]); o.x = q[0]; o.z = q[1]; }; L.items.forEach(sc); L.rooms.forEach(sc); L.notes.forEach(sc);
  [L.mats, L.zones, L.partitions].forEach(arr => arr.forEach(o => { o.pts = o.pts.map(f); }));
  L.openings.forEach(o => { o.t = U.r3(o.t * k); }); (L.dims || []).forEach(d => { d.a = f(d.a); d.b = f(d.b); });
  const UL = GP.S.underlay; if (UL && opt.underlay !== false) { const q = f([UL.x, UL.z]); UL.x = q[0]; UL.z = q[1]; if (UL.kind === 'image') UL.w = UL.w * k; else UL.scale = (UL.scale || 1) * k; GP.S.buildUnderlay(UL); GP.panels.saveUL(); if (GP.panels.renderUL) GP.panels.renderUL(); }
  GP.changed('all');
};

/* a wall length was typed: this wall only, or everything in proportion (the usual case for a traced floor plan) */
CV.askLength = (el, i, v) => {
  const L = GP.L(), P = L.room.pts, cur = CV.list(L).find(c => c.s === i && el.dataset.curve != null), L0 = cur ? CV.len(L, cur) : G.edge(P, i).L, k = v / L0;
  if (!(k > 0) || Math.abs(k - 1) < 1e-4) return;
  const py0 = Math.abs(G.area(P)) / U.PY, UL = GP.S.underlay, defAll = !!UL || !!cur;
  el.id = 'wlAsk' + Date.now();
  const pct = (k * 100).toFixed(1).replace(/\.0$/, '');
  GP.popover(el, `<div class="ph">${cur ? '곡선' : '벽'} 길이 ${L0.toFixed(2)} m → <b>${v.toFixed(2)} m</b></div>
    ${cur ? '' : `<button class="mi${defAll ? '' : ' def'}" data-act="one"><div><b>이 벽만 바꾸기</b><small>다른 벽 길이는 그대로, 이어진 꼭짓점이 밀려요${defAll ? '' : ' · <kbd>Enter</kbd>'}</small></div></button>`}
    <button class="mi${defAll ? ' def' : ''}" data-act="all"><div><b>전체를 같은 비율로 (${pct}%)</b><small>${py0.toFixed(1)}평 → ${(py0 * k * k).toFixed(1)}평 · 기구 위치 · 바닥${UL ? ' · 도면 밑그림' : ''}도 함께${defAll ? ' · <kbd>Enter</kbd>' : ''}</small></div></button>
    <p class="note" style="margin:4px 10px 6px">${UL ? '도면 사진은 실제 크기와 다를 수 있어요. 확실히 아는 벽 하나로 전체를 맞추면 나머지 벽도 같이 맞아요.' : '도면을 대고 그렸다면 「전체를 같은 비율로」가 맞아요.'}</p>`, (act) => {
    if (act === 'one') GP.tools.setWallLength(i, v);
    else if (act === 'all') { const b = G.bounds(P); CV.scaleAll(k, [b.minX, b.minZ]); GP.S.fit(); GP.toast(`전체를 ${pct}%로 맞췄어요 · ${(Math.abs(G.area(GP.L().room.pts)) / U.PY).toFixed(1)}평 (Ctrl+Z로 되돌리기)`, { ms: 4500 }); }
  });
  const key = ev => { const pop = $('#pop'); if (pop.hidden) { document.removeEventListener('keydown', key, true); return; } if (ev.key === 'Enter') { ev.preventDefault(); ev.stopPropagation(); const b = pop.querySelector('.mi.def'); if (b) b.click(); } else if (ev.key === 'Escape') { ev.stopPropagation(); GP.closePop(); } };
  setTimeout(() => document.addEventListener('keydown', key, true), 0);
};
/* the curve's length label: its own menu */
CV.curvePop = (el, s) => {
  const L = GP.L(), c = CV.list(L).find(q => q.s === s); if (!c) return; const L0 = CV.len(L, c);
  el.id = 'cvPop' + s;
  if (c.ref.rc) {
    GP.popover(el, `<div class="ph">둥근 모서리</div><div class="ang-pop"><div class="unit"><input type="number" id="rcR" step="1" min="2" value="${U.cm(c.ref.rc.r)}"><em>cm</em></div>
      <button class="mi def" data-act="r"><div><b>반지름 바꾸기</b><small><kbd>Enter</kbd></small></div></button><button class="mi" data-act="sharp"><div><b>뾰족한 모서리로 되돌리기</b></div></button>
      <p class="note">모서리 안쪽 주황 점을 끌어도 반지름이 바뀌어요.</p></div>`, (act) => {
      if (act === 'sharp') { CV.unround(GP.L(), s); GP.changed(['room', 'openings']); return false; }
      const v = parseFloat($('#rcR').value); if (!(v >= 2)) { GP.toast('2cm 이상으로 넣어 주세요', { bad: true }); return true; } c.ref.rc.r = v / 100; GP.changed('room'); return false;
    });
    const ri = $('#rcR'); setTimeout(() => { ri.focus(); ri.select(); }, 20); ri.addEventListener('keydown', ev => { ev.stopPropagation(); if (ev.key === 'Enter') { const b = document.querySelector('#pop [data-act="r"]'); if (b) b.click(); } else if (ev.key === 'Escape') GP.closePop(); });
    return;
  }
  GP.popover(el, `<div class="ph">곡선 벽 · 길이 ${L0.toFixed(2)} m</div><div class="ang-pop"><div class="unit"><input type="number" id="cvLen" step="0.01" min="0.3" value="${L0.toFixed(2)}"><em>m</em></div>
    <button class="mi def" data-act="len"><div><b>이 길이에 맞춰 전체를 같은 비율로</b><small>도면을 대고 그렸을 때 · <kbd>Enter</kbd></small></div></button>
    <button class="mi" data-act="flat"><div><b>직선으로 펴기</b><small>곡선을 한 장의 곧은 벽으로 바꿔요</small></div></button>
    <p class="note">모양은 곡선 양 끝의 <b style="color:#E0622B">주황 손잡이</b>를 끌거나, 곡선을 직접 끌어서 바꿔요.</p></div>`, (act) => {
    if (act === 'flat') { CV.flatten(GP.L(), s); GP.changed(['room', 'openings']); GP.toast('곡선을 곧은 벽으로 폈어요'); return false; }
    if (act === 'len') { const v = parseFloat($('#cvLen').value); if (!(v >= .3 && v < 500)) { GP.toast('0.3m 이상으로 넣어 주세요', { bad: true }); return true; } if (Math.abs(v - L0) < .0005) return false; const k = v / L0, b = G.bounds(GP.L().room.pts); CV.scaleAll(k, [b.minX, b.minZ]); GP.S.fit(); GP.toast(`전체를 ${(k * 100).toFixed(1)}%로 맞췄어요 (Ctrl+Z로 되돌리기)`, { ms: 4000 }); return false; }
  });
  const inp = $('#cvLen'); setTimeout(() => { inp.focus(); inp.select(); }, 20);
  inp.addEventListener('keydown', ev => { ev.stopPropagation(); if (ev.key === 'Enter') { const b = document.querySelector('#pop [data-act="len"]'); if (b) b.click(); } else if (ev.key === 'Escape') GP.closePop(); });
};

/* ================= editing curves in the wall-shape tool ================= */
let cdrag = null;      // { kind: 'cp' | 'body', c, ... }
const curveHint = (txt, e) => ui().setHint(`${txt} · <kbd>Shift</kbd> 15° 단위 · <kbd>Alt</kbd> 한쪽 손잡이만`);
function endDrag() { window.removeEventListener('pointermove', onDragMove); window.removeEventListener('pointerup', endDrag); if (!cdrag) return; const d = cdrag; cdrag = null;
  if (d.kind === 'rr' && d.c && d.r != null && d.r < .02) { CV.unround(GP.L(), d.c.s); d.bent = true; } ui().setHint(); if (d.moved) GP.changed(d.bent ? ['room', 'openings'] : 'room'); else if (d.bent) GP.changed(['room', 'openings']); GP.emit('overlay'); }
function onDragMove(ev) {
  const d = cdrag; if (!d) return; const L = GP.L(), fp = GP.S.floorAt(ev.clientX, ev.clientY), c = d.c && d.c.ref;
  if (d.kind === 'cp') {
    const A = L.room.pts[d.anchor]; let v = [fp.x - A[0], fp.z - A[1]];
    if (ev.shiftKey) { const l = vlen(v), a = Math.round(Math.atan2(v[1], v[0]) / (Math.PI / 12)) * Math.PI / 12; v = [Math.cos(a) * l, Math.sin(a) * l]; }
    v = r3v(v); if (d.side) c.b = v; else c.a = v;
    if (d.nb && !ev.altKey) { const u = r3v(mul(v, -d.nbLen / (vlen(v) || 1))); if (d.side) d.nb.ref.a = u; else d.nb.ref.b = u; }      // a smooth point stays smooth
    curveHint('곡선 손잡이', ev);
  } else if (d.kind === 'rr') {
    const q = GP.tools.gridOf(ev), m = dot(sub([fp.x, fp.z], d.p), d.bis) - (d.m0 || 0); let r = Math.max(0, m / (1 / Math.sin(d.th / 2) - 1)); if (!q.free) r = U.snap(r, q.g);      // (the dot of a sharp corner sits a little inside it: from there it is radius 0)
    if (d.fresh != null && r >= .02) { const c2 = CV.round(L, d.fresh, r); if (!c2) { GP.toast('이 모서리는 둥글게 만들 수 없어요 (문·창문이 너무 가깝거나 벽이 일직선이에요)', { bad: true }); cdrag = null; endDrag(); return; } d.c = c2; d.fresh = null; d.bent = true; GP.tools.selVs.clear(); GP.tools.selV = -1; }
    if (d.c) { const P = L.room.pts, N = P.length, g = rcGeom(d.c.ref.rc.p, P[(d.c.s - 1 + N) % N], P[(d.c.e + 1) % N], Math.max(.005, r)); if (g) r = g.r; d.c.ref.rc.r = U.r3(Math.max(.005, r)); d.r = r; }      // (no bigger than the walls allow)
    ui().setHint(`둥근 모서리 · 반지름 <b>${U.cm(r)}cm</b>${r < .02 ? ' · 놓으면 뾰족한 모서리' : ''}${GP.tools.gridHint(q)}`);
  } else if (d.kind === 'rcv') {
    const q = GP.tools.gridOf(ev); let p = [fp.x, fp.z]; if (!q.free) p = p.map(x => U.snap(x, q.g)); d.c.ref.rc.p = r3v(p);
    ui().setHint(`둥근 모서리 옮기기${GP.tools.gridHint(q)}`);
  } else {
    const q = GP.tools.gridOf(ev); let dv = [fp.x - d.fx, fp.z - d.fz]; if (!q.free) dv = dv.map(x => U.snap(x, q.g));
    const m = mul(dv, 4 / 3); c.a = r3v(add(d.a0, m)); c.b = r3v(add(d.b0, m));
    ui().setHint(`곡선 휘기 · 가운데가 <b>${U.cm(vlen(dv))}cm</b> 움직였어요${GP.tools.gridHint(q)}`);
  }
  d.moved = true; CV.resample(L); GP.S.dataChanged(); GP.emit('overlay');
}
const startDrag = (e, d) => { cdrag = d; try { (e.target || GP.S.canvas).setPointerCapture(e.pointerId); } catch (_) { } window.addEventListener('pointermove', onDragMove); window.addEventListener('pointerup', endDrag); };
/* a handle (handle element: data-i = curve start, data-side 0 = its first handle, 1 = its second) */
CV.cpDown = (e, el) => {
  e.preventDefault(); e.stopPropagation(); const L = GP.L(), c = CV.list(L).find(q => q.s === +el.dataset.i); if (!c) return;
  const side = +el.dataset.side, anchor = side ? c.e : c.s, mine = side ? c.ref.b : c.ref.a;
  const nb = CV.list(L).find(q => q !== c && (side ? q.s === anchor : q.e === anchor)); let nbLen = 0, smooth = false;
  if (nb) { const o = side ? nb.ref.a : nb.ref.b; nbLen = vlen(o); const cos = (mine[0] * o[0] + mine[1] * o[1]) / ((vlen(mine) * nbLen) || 1); smooth = cos < -.995; }      // the two handles in one line: a smooth point
  startDrag(e, { kind: 'cp', c, side, anchor, nb: smooth ? nb : null, nbLen });
};
/* the body of a curve: dragging it bends it (both handles move together) */
CV.bodyDown = (e, c, fp) => { startDrag(e, { kind: 'body', c, fx: fp.x, fz: fp.z, a0: c.ref.a.slice(), b0: c.ref.b.slice() }); };
/* Alt + drag on a straight wall: it becomes a curve and bends with the pointer */
CV.bendDown = (e, i, fp) => {
  const L = GP.L(), P = L.room.pts, N = P.length, v = sub(P[(i + 1) % N], P[i]); const c = CV.bend(L, i, mul(v, 1 / 3), mul(v, -1 / 3)); if (!c) return false;
  startDrag(e, { kind: 'body', c, fx: fp.x, fz: fp.z, a0: c.ref.a.slice(), b0: c.ref.b.slice(), bent: true }); GP.S.dataChanged(); GP.emit('overlay'); return true;
};
/* handle positions for the overlay */
CV.handles = (L) => CV.list(L).filter(c => !c.ref.rc).map(c => { const k = CV.ctrl(L, c); return { c, h: [[k.c1, k.p0, 0], [k.c2, k.p3, 1]].filter(([q, p]) => G.len(q, p) > .01) }; });      // (a corner with no handle shows none, like Photoshop)

/* rounded-corner widgets: the radius dot (on the arc, or just inside a selected sharp corner) and the virtual corner */
CV.widgets = (L) => {
  const out = [], P = L.room.pts, N = P.length;
  for (const c of CV.list(L)) if (c.ref.rc) { const k = CV.ctrl(L, c); out.push({ h: 'rr', pos: CV.at(k.p0, k.c1, k.c2, k.p3, .5), i: c.s, side: 1, title: `둥근 모서리 · 반지름 ${U.cm(c.ref.rc.r)}cm · 끌어서 바꾸기 (작게 끌면 뾰족한 모서리로)` }); out.push({ h: 'rcv', pos: c.ref.rc.p, i: c.s, num: CV.num(L, c.s), title: '끌어서 모서리 옮기기' }); }
  const S = GP.tools.selVs; if (S && S.size === 1) { const i = [...S][0], hid = CV.hidden(L); if (!hid.has(i) && !CV.ends(L).has(i) && i < N) { const g = rcGeom(P[i], P[(i - 1 + N) % N], P[(i + 1) % N], .01); if (g) out.push({ h: 'rr', pos: add(P[i], mul(g.bis, GP.S.mpp() * 30)), i, side: 0, title: '끌면 모서리가 둥글어져요' }); } }
  return out;
};
CV.rcDown = (e, el) => {
  e.preventDefault(); e.stopPropagation(); const L = GP.L(), P = L.room.pts, N = P.length, i = +el.dataset.i;
  if (el.dataset.h === 'rcv') { const c = CV.list(L).find(q => q.s === i); if (c) startDrag(e, { kind: 'rcv', c }); return; }
  if (+el.dataset.side) { const c = CV.list(L).find(q => q.s === i); if (!c) return; const g = rcGeom(c.ref.rc.p, P[(c.s - 1 + N) % N], P[(c.e + 1) % N], c.ref.rc.r); if (g) startDrag(e, { kind: 'rr', c, p: c.ref.rc.p.slice(), th: g.th, bis: g.bis }); return; }
  const g = rcGeom(P[i], P[(i - 1 + N) % N], P[(i + 1) % N], .01), fp = GP.S.floorAt(e.clientX, e.clientY); if (g) startDrag(e, { kind: 'rr', fresh: i, p: P[i].slice(), th: g.th, bis: g.bis, m0: dot(sub([fp.x, fp.z], P[i]), g.bis) });
};
/* a bar while corners are selected in the wall-shape tool: a run of them -> one curve; one straight wall -> a curve */
const cbar = document.createElement('div'); cbar.className = 'drawbar cvbar'; cbar.hidden = true; $('#stage').appendChild(cbar);
function curveBar() {
  const on = !GP.viewOnly && GP.P && ui().tool === 'vertex' && !(GP.V3 && GP.V3.on); if (!on) { cbar.hidden = true; return; }
  const L = GP.L(), N = L.room.pts.length, sel = GP.tools.selVs, run = sel && sel.size >= 2 ? CV.runOf(sel, N) : null;
  let html = '';
  if (run && run.n >= 2) { const busy = [...Array(run.n).keys()].some(j => CV.of(L, (run.s + j) % N)); if (!busy) html = `<div class="db-t"><b class="db-title">점 ${run.n + 1}개 선택</b><span class="db-info">잘게 나눠 그린 곡선을 매끄러운 곡선 하나로 바꿀 수 있어요</span></div><div class="db-b"><button class="btn sm primary" data-cb="fit">곡선 하나로 만들기</button><button class="btn sm" data-cb="line">직선으로 (가운데 점 지우기)</button></div>`; }
  else if (run && run.n === 1 && !CV.of(L, run.s)) html = `<div class="db-t"><b class="db-title">벽 1개 선택</b><span class="db-info">곡선으로 바꾼 뒤 주황 손잡이로 휘어요 (벽을 <kbd>Alt</kbd>+끌기로도 바로 휘어져요)</span></div><div class="db-b"><button class="btn sm primary" data-cb="bend">이 벽을 곡선으로</button></div>`;
  cbar.innerHTML = html; cbar.hidden = !html; cbar.dataset.s = run ? run.s : ''; cbar.dataset.n = run ? run.n : '';
}
cbar.addEventListener('click', e => {
  const b = e.target.closest('[data-cb]'); if (!b) return; const L = GP.L(), s = +cbar.dataset.s, n = +cbar.dataset.n, N = L.room.pts.length;
  if (b.dataset.cb === 'fit') { if (CV.fitRun(L, s, n)) { GP.tools.selVs.clear(); GP.tools.selV = -1; GP.changed('room'); GP.toast('곡선 하나로 만들었어요. 주황 손잡이로 모양을 다듬을 수 있어요'); } }
  else if (b.dataset.cb === 'line') { const t = { kind: 'room', pts: L.room.pts }; const idx = []; for (let j = 1; j < n; j++) idx.push((s + j) % N); idx.sort((a, c) => c - a).forEach(k => { const old = t.pts.map(p => p.slice()); t.pts.splice(k, 1); GP.tools.reindex(t, 'del', k, old); }); GP.tools.selVs.clear(); GP.tools.selV = -1; GP.changed(['room', 'openings']); GP.toast(`가운데 점 ${n - 1}개를 지웠어요`); }
  else if (b.dataset.cb === 'bend') { const P = L.room.pts, v = sub(P[(s + 1) % N], P[s]), nrm = mul([-v[1], v[0]], .12 * (G.area(P) > 0 ? -1 : 1)); if (CV.bend(L, s, add(mul(v, 1 / 3), nrm), add(mul(v, -1 / 3), nrm))) { GP.tools.selVs.clear(); GP.tools.selV = -1; GP.changed(['room', 'openings']); GP.toast('곡선이 됐어요. 주황 손잡이나 곡선을 끌어서 휘어 보세요'); } }
  curveBar();
});
GP.on('overlay', curveBar); GP.on('tool', curveBar); GP.on('changed', curveBar);

/* ================= the pen tool ================= */
const pen = GP.pen = {};
let st = null;      // { A: [{ p, in, out }], down, cur, num, guides, hoverFirst }
const bar = document.createElement('div'); bar.className = 'drawbar penbar'; bar.hidden = true;
bar.innerHTML = `<div class="db-t"><b class="db-title"></b><span class="db-info"></span></div><div class="db-b"><button class="btn sm primary" data-pb="done">완성 <kbd>Enter</kbd></button><button class="btn sm" data-pb="undo">마지막 점 지우기</button><button class="btn sm ghost" data-pb="cancel">취소 <kbd>Esc</kbd></button></div>`;
$('#stage').appendChild(bar);
pen.bar = () => {
  const on = !GP.viewOnly && ui().tool === 'pen' && !(GP.V3 && GP.V3.on); bar.hidden = !on; if (!on) return;
  const n = st ? st.A.length : 0;
  bar.querySelector('.db-title').textContent = n ? `벽 그리는 중 · 점 ${n}개` : '펜으로 벽 그리기';
  bar.querySelector('.db-info').innerHTML = st && st.num ? `길이 <b>${st.num} m</b> 입력 중 · <kbd>Enter</kbd>로 확정`
    : !n ? '모서리를 <b>클릭</b>하세요. 휘어진 곳은 <b>누른 채 끌면</b> 곡선이 돼요.'
    : n < 3 ? '다음 모서리를 <b>클릭</b> · 곡선은 <b>누른 채 끌기</b> · 숫자를 치고 Enter: 그 길이로 · <kbd>Shift</kbd> 45° · <kbd>Ctrl</kbd> 1cm'
    : '<b>첫 점</b>을 누르면 완성돼요 · 곡선은 <b>누른 채 끌기</b> (<kbd>Alt</kbd>: 한쪽 손잡이만)';
  bar.querySelector('[data-pb="done"]').hidden = n < 3; bar.querySelector('[data-pb="undo"]').hidden = !n;
};
bar.addEventListener('click', e => { const b = e.target.closest('[data-pb]'); if (!b) return; const a = b.dataset.pb; if (a === 'done') finish(); else if (a === 'undo') undo(); else if (a === 'cancel') { if (st) pen.cancel(); else ui().setTool('select'); } pen.bar(); });
pen.cancel = () => { st = null; GP.emit('overlay'); pen.bar(); };
pen.active = () => !!st;
function undo() { if (!st) return; if (st.num) st.num = st.num.slice(0, -1); else { st.A.pop(); if (!st.A.length) st = null; } GP.emit('overlay'); pen.bar(); }
const scrDist = (p, e) => { const R = GP.S.canvas.getBoundingClientRect(), [x, y] = GP.S.toScreen(p[0], 0, p[1]); return Math.hypot(x + R.left - e.clientX, y + R.top - e.clientY); };
function snapA(fp, e) {
  const prev = st && st.A.length ? st.A[st.A.length - 1].p : null;
  const p = GP.tools.snapPoint(fp.x, fp.z, { e, prev, shift: e.shiftKey, noRoom: true, extra: st ? st.A.map(a => a.p) : [] });
  const guides = []; if (st && !e.altKey && !(e.ctrlKey || e.metaKey)) { const tol = GP.S.mpp() * 8; let gx = null, gz = null; for (const a of st.A) { if (gx == null && Math.abs(fp.x - a.p[0]) < tol) gx = a.p; if (gz == null && Math.abs(fp.z - a.p[1]) < tol) gz = a.p; } if (gx && !e.shiftKey) { p[0] = gx[0]; guides.push(['x', gx]); } if (gz && !e.shiftKey) { p[1] = gz[1]; guides.push(['z', gz]); } }
  if (st) st.guides = guides; return p;
}
pen.down = (e, fp) => {
  if (!st) { st = { A: [] }; if (ui().sel.length) ui().clearSel(); }
  if (st.A.length >= 3 && scrDist(st.A[0].p, e) < 11) { st.down = { close: true, sx: e.clientX, sy: e.clientY }; return; }
  const p = snapA(fp, e); const last = st.A[st.A.length - 1]; if (last && G.len(last.p, p) < .02) { st.down = { idx: st.A.length - 1, sx: e.clientX, sy: e.clientY }; return; }
  st.A.push({ p, in: null, out: null }); st.num = ''; st.down = { idx: st.A.length - 1, sx: e.clientX, sy: e.clientY }; GP.emit('overlay'); pen.bar();
};
pen.move = (e) => {
  const fp = GP.S.floorAt(e.clientX, e.clientY);
  if (st && st.down) {
    if (!st.down.moved && Math.hypot(e.clientX - st.down.sx, e.clientY - st.down.sy) < 5) return; st.down.moved = true;
    const a = st.down.close ? st.A[0] : st.A[st.down.idx]; let v = [fp.x - a.p[0], fp.z - a.p[1]];
    if (e.shiftKey) { const l = vlen(v), g = Math.round(Math.atan2(v[1], v[0]) / (Math.PI / 4)) * Math.PI / 4; v = [Math.cos(g) * l, Math.sin(g) * l]; }
    v = r3v(v);
    if (st.down.close) { a.in = mul(v, -1); if (a.out && !e.altKey) a.out = v; }
    else { a.out = v; if (!e.altKey) a.in = mul(v, -1); }
    ui().setHint(`곡선 손잡이 <b>${U.cm(vlen(v))}cm</b> · <kbd>Alt</kbd> 한쪽만 · <kbd>Shift</kbd> 45°`);
  } else if (st) { st.cur = snapA(fp, e); st.hoverFirst = st.A.length >= 3 && scrDist(st.A[0].p, e) < 11; GP.S.canvas.style.cursor = st.hoverFirst ? 'pointer' : 'crosshair'; }
  else { GP.S.canvas.style.cursor = 'crosshair'; }
  GP.emit('overlay');
};
pen.up = () => { if (!st || !st.down) return; const d = st.down; st.down = null; ui().setHint(); if (d.close) finish(); GP.emit('overlay'); pen.bar(); };
pen.dbl = () => { if (st && st.A.length >= 3) finish(); };
pen.key = (e) => {
  if (GP.XF && GP.XF.key(e)) return true;
  if (ui().tool !== 'pen') return false; const k = e.key;
  if (/^[0-9.]$/.test(k) && st && st.A.length) { st.num = (st.num || '') + k; pen.bar(); return true; }
  if (k === 'Backspace') { e.preventDefault(); undo(); return true; }
  if (k === 'Enter') {
    if (st && st.num) { const l = parseFloat(st.num), last = st.A[st.A.length - 1].p, cur = st.cur || last; const ang = Math.atan2(cur[1] - last[1], cur[0] - last[0]) || 0; if (l > 0) st.A.push({ p: r3v([last[0] + Math.cos(ang) * l, last[1] + Math.sin(ang) * l]), in: null, out: null }); st.num = ''; GP.emit('overlay'); pen.bar(); }
    else finish();
    return true;
  }
  if (k === 'Escape') { if (st) pen.cancel(); else ui().setTool('select'); return true; }
  return false;
};
/* the drawn outline -> the room (corners, curve pieces, curves) */
function build(A) {
  const m = A.length, pts = [], curves = {};
  for (let k = 0; k < m; k++) {
    const p0 = A[k].p, p3 = A[(k + 1) % m].p, o = A[k].out, i = A[(k + 1) % m].in; pts.push(p0.slice());
    if ((o && vlen(o) > .01) || (i && vlen(i) > .01)) {
      const a = o || [0, 0], b = i || [0, 0], c1 = add(p0, a), c2 = add(p3, b), n = CV.nFor(CV.length(p0, c1, c2, p3)), q = CV.sample(p0, c1, c2, p3, n);
      curves[pts.length - 1] = { n, a: r3v(a), b: r3v(b) }; for (let j = 1; j < n; j++) pts.push(r3v(q[j]));
    }
  }
  return { pts, curves };
}
function finish() {
  if (!st || st.A.length < 3) { GP.toast('점을 3개 이상 찍어 주세요', { bad: true }); return; }
  const { pts, curves } = build(st.A);
  if (G.selfX(pts)) { GP.toast('벽이 서로 엇갈려요. 마지막 점을 지우고 다시 찍어 보세요', { bad: true, ms: 4000 }); return; }
  if (Math.abs(G.area(pts)) < 1) { GP.toast('공간이 너무 작아요', { bad: true }); return; }
  const L = GP.L(); L.room.pts = pts; delete L.room.empty; if (Object.keys(curves).length) L.room.curves = curves; else delete L.room.curves;
  const gone = GP.pruneWalls(); st = null; GP.changed(['room', 'openings']); GP.S.fit();
  ui().setTool('vertex');
  GP.toast(`벽을 만들었어요 · ${(Math.abs(G.area(pts)) / U.PY).toFixed(1)}평${gone ? ` · 없어진 벽의 문·창문 ${gone}개는 지웠어요` : ''}. ${GP.S.underlay ? '확실히 아는 벽 하나의 길이 숫자를 눌러 입력하면 전체를 그 비율로 맞출 수 있어요' : '길이 숫자를 눌러 정확한 길이로 바꿀 수 있어요'}`, { ms: 6500 });
}
/* drawing on the overlay (overlay.js calls this) */
pen.svg = (P) => {
  let html = '';
  const S = GP.S, path = [], scr = p => S.toScreen(p[0], 0, p[1]).slice(0, 2).map(v => v.toFixed(1)).join(',');
  // curve handles of the room (wall-shape tool)
  if (ui().tool === 'vertex' && !GP.viewOnly) for (const h of CV.handles(GP.L())) for (const [c, a] of h.h) html += `<line x1="${S.toScreen(a[0], 0, a[1])[0]}" y1="${S.toScreen(a[0], 0, a[1])[1]}" x2="${S.toScreen(c[0], 0, c[1])[0]}" y2="${S.toScreen(c[0], 0, c[1])[1]}" stroke="#E0622B" stroke-width="1.3" opacity=".85"/>`;
  if (GP.XF) html += GP.XF.svg();
  if (ui().tool !== 'pen' || !st) return html;
  const A = st.A, m = A.length; if (!m) return html;
  // guides
  for (const [ax, q] of st.guides || []) { const R = S.canvas.getBoundingClientRect(), [qx, qy] = S.toScreen(q[0], 0, q[1]); html += ax === 'x' ? `<line x1="${qx}" y1="0" x2="${qx}" y2="${R.height}" stroke="#E0622B" stroke-width="1" stroke-dasharray="4 4" opacity=".7"/>` : `<line x1="0" y1="${qy}" x2="${R.width}" y2="${qy}" stroke="#E0622B" stroke-width="1" stroke-dasharray="4 4" opacity=".7"/>`; }
  path.push(`M${scr(A[0].p)}`);
  const seg = (a, b) => (a.out || b.in) ? `C${scr(add(a.p, a.out || [0, 0]))} ${scr(add(b.p, b.in || [0, 0]))} ${scr(b.p)}` : `L${scr(b.p)}`;
  for (let k = 1; k < m; k++) path.push(seg(A[k - 1], A[k]));
  const last = A[m - 1], cur = st.cur && !st.down ? st.cur : null;
  html += `<path d="${path.join(' ')}" stroke="#1F2429" stroke-width="2.5" fill="none" stroke-linejoin="round" stroke-linecap="round" opacity=".85"/>`;
  if (cur) { const close = st.hoverFirst; const tgt = close ? A[0] : { p: cur, in: null }; html += `<path d="M${scr(last.p)} ${seg(last, tgt)}" stroke="#2450E0" stroke-width="2.5" fill="none" stroke-dasharray="${close ? '0' : '6 4'}"/>`; }
  // handles of the point being dragged / the last point
  const hp = st.down && st.down.close ? A[0] : st.down ? A[st.down.idx] : last;
  for (const v of [hp.in, hp.out]) if (v && vlen(v) > .01) { const [ax, ay] = S.toScreen(hp.p[0], 0, hp.p[1]), q = add(hp.p, v), [bx, by] = S.toScreen(q[0], 0, q[1]); html += `<line x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}" stroke="#E0622B" stroke-width="1.4"/><circle cx="${bx}" cy="${by}" r="4.5" fill="#E0622B" stroke="#fff" stroke-width="1.5"/>`; }
  A.forEach((a, k) => { const [x, y] = S.toScreen(a.p[0], 0, a.p[1]), big = k === 0 && st.hoverFirst; html += big ? `<circle cx="${x}" cy="${y}" r="9" fill="#16A05A" stroke="#fff" stroke-width="2"/>` : `<rect x="${x - 4.5}" y="${y - 4.5}" width="9" height="9" fill="${k === m - 1 ? '#2450E0' : '#fff'}" stroke="#2450E0" stroke-width="1.8"/>`; });
  // length of the segment being drawn
  if (cur || st.num) { const b = cur || last.p, mid = [(last.p[0] + b[0]) / 2, (last.p[1] + b[1]) / 2], [sx, sy] = S.toScreen(mid[0], 0, mid[1]), txt = (st.num ? st.num : (last.out ? CV.length(last.p, add(last.p, last.out), b, b) : G.len(last.p, b)).toFixed(2)) + ' m', w = Math.max(56, txt.length * 7.5 + 12); html += `<g transform="translate(${sx},${sy - 16})"><rect x="${-w / 2}" y="-11" width="${w}" height="19" rx="4" fill="#2450E0"/><text x="0" y="2.5" text-anchor="middle" font-size="11.5" font-weight="700" fill="#fff" font-family="Pretendard,Malgun Gothic,sans-serif">${txt}</text></g>`; }
  if (st.hoverFirst) { const [x, y] = S.toScreen(A[0].p[0], 0, A[0].p[1]); html += `<g transform="translate(${x},${y - 22})"><rect x="-34" y="-11" width="68" height="19" rx="4" fill="#16A05A"/><text x="0" y="2.5" text-anchor="middle" font-size="11.5" font-weight="700" fill="#fff" font-family="Pretendard,Malgun Gothic,sans-serif">눌러서 완성</text></g>`; }
  return html;
};
GP.on('tool', () => { if (ui().tool !== 'pen') st = null; pen.bar(); });
GP.on('step', pen.bar);

/* ================= free transform: the whole space in a box (Photoshop's Ctrl+T; here the T key / 「크기 변형」) =================
   Corner handles scale keeping the proportions (Shift: each way on its own), side handles one way, ↻ turns, dragging inside
   moves; Alt: about the centre. The room (with its curves and rounded corners) and, unless switched off, the equipment, floor,
   zones, partitions, notes and measurements go along (equipment keeps its size). Doors stay at the same place along their wall.
   The floor-plan picture follows a plain scale (no turn, same both ways). Enter / 적용 keeps it, Esc / 취소 puts it back. */
const X = GP.XF = {};
let xs = null, xbusy = false;
const rotv = (v, d) => G.l2w(0, 0, d, v[0], v[1]);
const XK = ['room', 'items', 'mats', 'zones', 'partitions', 'openings', 'dims', 'notes', 'rooms'];
function xfStart() {
  const L = GP.L(), b = G.bounds(L.room.pts), UL = GP.S.underlay, snap = {}; for (const k of XK) if (L[k] !== undefined) snap[k] = JSON.parse(JSON.stringify(L[k]));
  xs = { snap, ul: UL ? { x: UL.x, z: UL.z, w: UL.w, scale: UL.scale } : null, c0: [b.cx, b.cz], W0: Math.max(.1, b.sx), H0: Math.max(.1, b.sz), sx: 1, sy: 1, d: 0, t: [0, 0], all: xs ? xs.all : true, changed: false };
}
const xc = () => add(xs.c0, xs.t);
const xbox = () => { const c = xc(), W = xs.W0 * xs.sx, H = xs.H0 * xs.sy; return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([i, j]) => add(c, rotv([i * W / 2, j * H / 2], xs.d))); };
function xfApply() {
  const L = GP.L(), S0 = xs.snap; xbusy = true;
  for (const k of XK) if (S0[k] !== undefined) L[k] = JSON.parse(JSON.stringify(S0[k]));
  const c = xc(), f = p => r3v(add(c, rotv([(p[0] - xs.c0[0]) * xs.sx, (p[1] - xs.c0[1]) * xs.sy], xs.d))), lin = v => r3v(rotv([v[0] * xs.sx, v[1] * xs.sy], xs.d));
  const P0 = L.room.pts.map(p => p.slice()), parts0 = new Map(L.partitions.map(p => [p.id, p.pts.map(q => q.slice())]));
  L.room.pts = L.room.pts.map(f);
  for (const q of Object.values(L.room.curves || {})) { q.a = lin(q.a); q.b = lin(q.b); if (q.rc) { q.rc.p = f(q.rc.p); q.rc.r = U.r3(q.rc.r * Math.sqrt(Math.abs(xs.sx * xs.sy))); } }
  if (xs.all) {
    const mv = o => { const q = f([o.x, o.z]); o.x = q[0]; o.z = q[1]; };
    L.items.forEach(it => { mv(it); if (xs.d) it.rot = U.normRot(it.rot + xs.d); }); L.notes.forEach(mv); L.rooms.forEach(mv);
    [L.mats, L.zones, L.partitions].forEach(arr => arr.forEach(o => { o.pts = o.pts.map(f); }));
    (L.dims || []).forEach(dd => { dd.a = f(dd.a); dd.b = f(dd.b); });
  }
  L.openings.forEach(o => {
    let a, b; if (o.host === 'room') { const n = P0.length; a = [P0[o.seg], P0[(o.seg + 1) % n]]; b = [L.room.pts[o.seg], L.room.pts[(o.seg + 1) % n]]; }
    else { const p0 = parts0.get(o.host), p1 = L.partitions.find(q => q.id === o.host); if (!p0 || !p1) return; a = [p0[o.seg], p0[o.seg + 1]]; b = [p1.pts[o.seg], p1.pts[o.seg + 1]]; }
    if (!a[0] || !a[1] || !b[0] || !b[1]) return; const l0 = G.len(a[0], a[1]), l1 = G.len(b[0], b[1]); if (l0 > 1e-6) o.t = U.r3(o.t * l1 / l0);
  });
  const UL = GP.S.underlay; if (UL && xs.ul) { Object.assign(UL, xs.ul); if (xs.all && !xs.d && Math.abs(xs.sx - xs.sy) < 1e-6) { const q = f([UL.x, UL.z]); UL.x = q[0]; UL.z = q[1]; if (UL.kind === 'image') UL.w = xs.ul.w * xs.sx; else UL.scale = (xs.ul.scale || 1) * xs.sx; } GP.S.buildUnderlay(UL); }
  CV.resample(L); xs.changed = !(xs.sx === 1 && xs.sy === 1 && !xs.d && !xs.t[0] && !xs.t[1]);
  GP.checks.quick(); GP.S.dataChanged(); GP.emit('overlay'); xbar(); xbusy = false;
}
X.commit = (leave) => {
  if (!xs) return; const ch = xs.changed; if (ch) { xbusy = true; GP.changed('all'); if (GP.S.underlay) GP.panels.saveUL(); xbusy = false; GP.toast(`크기 변형을 적용했어요 · ${(Math.abs(G.area(GP.L().room.pts)) / U.PY).toFixed(1)}평 (Ctrl+Z로 되돌리기)`); }
  xs = null; if (leave) ui().setTool('vertex'); else xfStart(); GP.emit('overlay'); xbar();
};
X.cancel = (leave) => { if (!xs) return; if (xs.changed) { xs.sx = xs.sy = 1; xs.d = 0; xs.t = [0, 0]; xfApply(); xbusy = true; GP.changed('all', { commit: false }); xbusy = false; } xs = null; if (leave) ui().setTool('vertex'); GP.emit('overlay'); xbar(); };
/* handles for the overlay */
X.handles = () => {
  if (!xs || ui().tool !== 'xform') return []; const c = xc(), W = xs.W0 * xs.sx, H = xs.H0 * xs.sy, out = [];
  for (const [i, j] of [[-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0]]) out.push({ cls: 'ov hd sq xf', html: '', pos: add(c, rotv([i * W / 2, j * H / 2], xs.d)), h: 'xf', cx: i, cz: j, title: i && j ? '끌어서 크기 바꾸기 (비율 그대로 · Shift: 가로세로 따로 · Alt: 가운데 기준)' : '끌어서 한 방향으로 늘이기 · 줄이기 (Alt: 가운데 기준)' });
  out.push({ cls: 'ov hd rot', html: '↻', pos: add(c, rotv([0, -H / 2 - GP.S.mpp() * 44], xs.d)), h: 'xfr', title: '끌어서 돌리기 (15° 단위 · Shift/Ctrl: 1° · Alt: 자유)' });
  return out;
};
let xd = null;
X.handleDown = (e, el) => {
  if (!xs) return; e.preventDefault(); e.stopPropagation(); try { el.setPointerCapture(e.pointerId); } catch (_) { }
  const fp = GP.S.floorAt(e.clientX, e.clientY), c = xc();
  if (el.dataset.h === 'xfr') { const v = sub([fp.x, fp.z], c); xd = { kind: 'rot', a0: Math.atan2(v[1], v[0]), d0: xs.d }; }
  else { const ix = +el.dataset.cx, iy = +el.dataset.cz, W = xs.W0 * xs.sx, H = xs.H0 * xs.sy; xd = { kind: 'size', ix, iy, W, H, A: add(c, rotv([-ix * W / 2, -iy * H / 2], xs.d)), C: c }; }
  window.addEventListener('pointermove', xMove); window.addEventListener('pointerup', xUp);
};
function xMove(e) {
  if (!xd || !xs) return; const fp = GP.S.floorAt(e.clientX, e.clientY), q = GP.tools.gridOf(e, true);
  if (xd.kind === 'move') { let dv = [fp.x - xd.f[0], fp.z - xd.f[1]]; if (!q.free) dv = dv.map(v => U.snap(v, q.g)); xs.t = r3v(add(xd.t0, dv)); xfApply(); ui().setHint(`옮기기 <b>${U.cm(vlen(dv))}cm</b>${GP.tools.gridHint(q, true)}`); return; }
  if (xd.kind === 'rot') {
    const v = sub([fp.x, fp.z], xc()); let d = xd.d0 + (Math.atan2(v[1], v[0]) - xd.a0) / U.DEG; d = ((d % 360) + 540) % 360 - 180;
    d = e.altKey ? Math.round(d * 10) / 10 : U.snap(d, (e.shiftKey || e.ctrlKey || e.metaKey) ? 1 : 15); xs.d = d; xfApply();
    ui().setHint(`돌리기 <b>${Math.round(d * 10) / 10}°</b> · 15° 단위 · <kbd>Shift</kbd>/<kbd>Ctrl</kbd> 1° · <kbd>Alt</kbd> 자유`); return;
  }
  const alt = e.altKey, A = alt ? xd.C : xd.A, v = rotv(sub([fp.x, fp.z], A), -xs.d), m = alt ? 2 : 1; let Wn = xd.W, Hn = xd.H;
  if (xd.ix && xd.iy && !e.shiftKey) { let k = ((xd.ix * v[0]) * xd.W + (xd.iy * v[1]) * xd.H) / (xd.W * xd.W + xd.H * xd.H) * m; Wn = U.snap(xd.W * k, .01); k = Wn / xd.W; Hn = xd.H * k; }
  else { if (xd.ix) Wn = U.snap(xd.ix * v[0] * m, .05 / GP.S.mpp() >= 20 ? .01 : .05); if (xd.iy) Hn = U.snap(xd.iy * v[1] * m, .05 / GP.S.mpp() >= 20 ? .01 : .05); }
  Wn = Math.max(.3, Wn); Hn = Math.max(.3, Hn);
  const c = alt ? xd.C : add(A, rotv([xd.ix * Wn / 2, xd.iy * Hn / 2], xs.d));
  xs.sx = Wn / xs.W0; xs.sy = Hn / xs.H0; xs.t = sub(c, xs.c0); xfApply();
  ui().setHint(`가로 <b>${Wn.toFixed(2)} m</b> × 세로 <b>${Hn.toFixed(2)} m</b> · ${(Math.abs(G.area(GP.L().room.pts)) / U.PY).toFixed(1)}평${xd.ix && xd.iy ? ' · <kbd>Shift</kbd> 가로세로 따로' : ''} · <kbd>Alt</kbd> 가운데 기준`);
}
function xUp() { window.removeEventListener('pointermove', xMove); window.removeEventListener('pointerup', xUp); xd = null; ui().setHint(); GP.emit('overlay'); }
/* the canvas in this tool: drag inside the box to move it */
X.down = (e, fp) => { if (!xs) xfStart(); if (!G.pip(fp.x, fp.z, xbox())) return; xd = { kind: 'move', f: [fp.x, fp.z], t0: xs.t.slice() }; window.addEventListener('pointermove', xMove); window.addEventListener('pointerup', xUp); };
X.move = (e) => { if (!xs || xd) return; const fp = GP.S.floorAt(e.clientX, e.clientY); GP.S.canvas.style.cursor = G.pip(fp.x, fp.z, xbox()) ? 'move' : ''; };
X.up = () => { };
X.dbl = () => X.commit(true);
X.key = (e) => { if (ui().tool !== 'xform' || !xs) return false; if (e.key === 'Enter') { X.commit(true); return true; } if (e.key === 'Escape') { X.cancel(true); return true; } return false; };
X.svg = () => { if (!xs || ui().tool !== 'xform') return ''; const S = GP.S, pts = xbox().map(p => S.toScreen(p[0], 0, p[1]).slice(0, 2).map(v => v.toFixed(1)).join(',')).join(' '); return `<polygon points="${pts}" fill="rgba(36,80,224,.05)" stroke="#2450E0" stroke-width="1.5" stroke-dasharray="6 4"/>`; };
/* its bar: numbers to type, the contents switch, keep / put back */
const xb = document.createElement('div'); xb.className = 'drawbar xfbar'; xb.hidden = true;
xb.innerHTML = `<div class="db-t"><b class="db-title">크기 변형</b><span class="db-info">모서리: 비율 그대로 · 변: 한 방향 · ↻ 돌리기 · 안쪽을 끌면 옮기기</span></div>
  <div class="db-b xf-in"><label>가로<input type="number" id="xfW" step="0.01" min="0.3"><em>m</em></label><label>세로<input type="number" id="xfH" step="0.01" min="0.3"><em>m</em></label><label>비율<input type="number" id="xfK" step="1" min="5"><em>%</em></label><label>회전<input type="number" id="xfD" step="1"><em>°</em></label>
  <label class="xf-all"><input type="checkbox" id="xfAll" checked>기구 · 바닥도 함께</label><button class="btn sm primary" data-xb="ok">적용 <kbd>Enter</kbd></button><button class="btn sm ghost" data-xb="cancel">취소 <kbd>Esc</kbd></button></div>`;
$('#stage').appendChild(xb);
function xbar() {
  const on = !GP.viewOnly && ui().tool === 'xform' && !!xs && !(GP.V3 && GP.V3.on); xb.hidden = !on; if (!on) return;
  const set = (id, v) => { const el = $('#' + id); if (el && document.activeElement !== el) el.value = v; };
  set('xfW', (xs.W0 * xs.sx).toFixed(2)); set('xfH', (xs.H0 * xs.sy).toFixed(2)); set('xfK', Math.abs(xs.sx - xs.sy) < 1e-6 ? Math.round(xs.sx * 1000) / 10 : ''); set('xfD', Math.round(xs.d * 10) / 10); $('#xfAll').checked = xs.all;
  const note = GP.S.underlay && xs.all && (xs.d || Math.abs(xs.sx - xs.sy) > 1e-6) ? ' · 도면 밑그림은 돌리기 · 한 방향 늘이기를 따라가지 않아요' : '';
  xb.querySelector('.db-info').textContent = '모서리: 비율 그대로 (Shift 따로) · 변: 한 방향 · ↻ 돌리기 · 안쪽을 끌면 옮기기' + note;
}
xb.addEventListener('click', e => { const b = e.target.closest('[data-xb]'); if (!b) return; if (b.dataset.xb === 'ok') X.commit(true); else X.cancel(true); });
xb.addEventListener('change', e => {
  if (!xs) return; const id = e.target.id, v = parseFloat(e.target.value);
  if (id === 'xfAll') { xs.all = e.target.checked; xfApply(); return; }
  if (!isFinite(v)) return;
  if (id === 'xfW' && v >= .3) xs.sx = v / xs.W0; else if (id === 'xfH' && v >= .3) xs.sy = v / xs.H0; else if (id === 'xfK' && v >= 5) xs.sx = xs.sy = v / 100; else if (id === 'xfD') xs.d = ((v % 360) + 540) % 360 - 180; else return;
  xfApply();
});
xb.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') { e.target.dispatchEvent(new Event('change', { bubbles: true })); X.commit(true); } else if (e.key === 'Escape') X.cancel(true); });
GP.on('tool', () => { if (ui().tool === 'xform') { if (!xs) xfStart(); } else if (xs) { if (xs.changed) X.commit(false); xs = null; } xbar(); GP.emit('overlay'); });
GP.on('changed', () => { if (xs && !xbusy && !xs.changed) xfStart(); xbar(); });      // the space changed some other way (undo, a typed length): a new box
GP.on('project', () => { xs = null; xbar(); });

/* ================= no space yet: a card in the middle of the plan ================= */
const IC = GP.IC, ec = document.createElement('div'); ec.className = 'empty-room'; ec.hidden = true;
ec.innerHTML = `<div class="er-card"><div class="er-ic">${IC.pen}</div><div class="er-tx"><b class="er-t">공간 만들기</b><p class="er-d">고객 매장의 벽 모양부터 만들어요</p></div>
  <button class="btn primary er-main" data-er="pen">${IC.pen}<span>펜으로 그리기</span><small>클릭: 모서리 · 누른 채 끌기: 곡선</small></button>
  <div class="er-row"><button class="btn" data-er="py">평수로 시작</button><button class="btn" data-er="shape">모양 템플릿</button><button class="btn" data-er="trace">도면 사진 올리기</button></div></div>`;
$('#stage').appendChild(ec);
function emptyCard() {
  const on = !!GP.P && !GP.viewOnly && GP.roomEmpty() && ui().tool !== 'pen' && !(GP.V3 && GP.V3.on); ec.hidden = !on; if (!on) return;
  const ul = !!GP.S.underlay; ec.classList.toggle('compact', ul);      // a floor-plan picture is down: do not hide it, sit on top
  ec.querySelector('.er-main span').textContent = ul ? '펜으로 따라 그리기' : '펜으로 그리기';
  ec.querySelector('[data-er="trace"]').hidden = ul;
}
GP.emptyCard = emptyCard;
ec.addEventListener('click', e => {
  const b = e.target.closest('[data-er]'); if (!b) return; const a = b.dataset.er, W = GP.wiz, easy = W && W.on, u = ui();
  if (easy && W.step !== 1) W.go(1);
  else if (!easy && u.step !== 'space') u.setStep('space');
  const pick = m => { const c = document.querySelector(`#wiz [data-sm="${m}"]`); if (easy && c) c.click(); };
  if (a === 'pen') { u.setTool('pen'); GP.toast('모서리를 차례로 클릭하세요. 휘어진 곳은 누른 채 끌면 곡선이 돼요. 첫 점을 누르면 완성!', { ms: 5000 }); }
  else if (a === 'py') { pick('py'); if (!easy) { GP.panels.openFold('make'); GP.panels.spaceMode('py'); } GP.panels.applyPy(); }
  else if (a === 'shape') { pick('shape'); if (!easy) { GP.panels.openFold('make'); GP.panels.spaceMode('shape'); } GP.toast('왼쪽에서 모양을 고르세요', { ms: 3000 }); }
  else if (a === 'trace') { pick('trace'); if (!easy) { GP.panels.openFold('trace'); GP.panels.renderSpace(); } const f = $('#ulImg'); if (f) f.click(); }
  emptyCard();
});
['changed', 'tool', 'project', 'step', 'overlay'].forEach(ev => GP.on(ev, emptyCard));
GP.toolExt = { pen: { down: (e, fp) => pen.down(e, fp), move: e => pen.move(e), up: e => pen.up(e), dbl: e => pen.dbl(e) }, xform: { down: X.down, move: X.move, up: X.up, dbl: X.dbl } };
})();
