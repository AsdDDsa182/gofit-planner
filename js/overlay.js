/* GoFit Planner — HTML/SVG overlay over the plan canvas: editable wall lengths, handles, drawing previews, scale bar */
(function () {
'use strict';
const GP = window.GP, U = GP.U, G = GP.G, $ = U.$;
const OV = GP.OV = {};
const base = $('#ovBase'), handles = $('#ovHandles');
const els = new Map(); // key -> {el, spec}
let specs = [];
let svg = null;
const ui = () => GP.ui;

function spec(key, cls, html, pos, o) { specs.push(Object.assign({ key, cls, html, pos }, o || {})); }
OV.sync = () => {
  if (!GP.P || !GP.S.scene) return;
  const L = GP.L(), u = ui(); specs = [];
  if (!L) return;
  // room wall lengths are editable while the wall tool is on
  if (u.tool === 'vertex' && !GP.viewOnly) {
    const P = L.room.pts;
    for (let i = 0; i < P.length; i++) { const e = G.edge(P, i), off = GP.WALL_T + .38; spec('w' + i, 'ov wl edit' + ((OV.hiWall && OV.hiWall.has(i)) ? ' hi' : ''), e.L.toFixed(2) + ' m', [(e.a[0] + e.b[0]) / 2 - e.nx * off, (e.a[1] + e.b[1]) / 2 - e.nz * off], { rotSeg: [e.a, e.b], minLen: 34, data: { wall: i }, interactive: true }); }
    // corner angles: press to type an angle
    for (let i = 0; i < P.length; i++) { const a = G.interior(P, i), q = angPos(P, i); if (!q) continue; const right = [90, 180, 270].some(v => Math.abs(a - v) < .3); spec('a' + i, 'ov ang edit' + (right ? ' right' : ''), (Math.round(a * 10) / 10) + '°', q, { data: { ang: i }, interactive: true }); }
  }
  diff();
  OV.syncHandles();
  OV.place();
};
function diff() {
  const keep = new Set();
  for (const s of specs) {
    keep.add(s.key); let rec = els.get(s.key);
    if (!rec) { const el = document.createElement('div'); rec = { el }; els.set(s.key, rec); base.appendChild(el); }
    const el = rec.el; if (el.className !== s.cls && !el.classList.contains('editing')) el.className = s.cls; if (rec.html !== s.html && !el.classList.contains('editing')) { el.innerHTML = s.html; rec.html = s.html; }
    el.style.pointerEvents = s.interactive ? 'auto' : ''; if (s.data) { for (const k in s.data) el.dataset[k] = s.data[k]; }
    rec.spec = s;
  }
  for (const [k, rec] of els) if (!keep.has(k)) { rec.el.remove(); els.delete(k); }
}
const place = (el, x, y, rot, anchor) => { el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) ${anchor === 'bl' ? 'translate(-7px,-100%)' : 'translate(-50%,-50%)'}${rot ? ` rotate(${rot.toFixed(2)}deg)` : ''}`; };
OV.place = () => {
  const S = GP.S; if (!GP.P || !S.scene) return;
  for (const [, rec] of els) {
    const s = rec.spec, el = rec.el; const [x, y] = S.toScreen(s.pos[0], 0, s.pos[1]);
    let rot = 0;
    if (s.rotSeg) { const [ax, ay] = S.toScreen(s.rotSeg[0][0], 0, s.rotSeg[0][1]), [bx, by] = S.toScreen(s.rotSeg[1][0], 0, s.rotSeg[1][1]); rot = Math.atan2(by - ay, bx - ax) / U.DEG; if (rot > 90) rot -= 180; if (rot <= -90) rot += 180; if (s.minLen && Math.hypot(bx - ax, by - ay) < s.minLen) { el.style.visibility = 'hidden'; continue; } if (el.classList.contains('editing')) rot = 0; }
    el.style.visibility = 'visible'; place(el, x, y, rot, s.anchor);
  }
  placeHandles(); drawSvg(); OV.scalebar();
};

/* ---------------- handles ---------------- */
let hspecs = [];
OV.syncHandles = () => {
  const S = GP.S, u = ui(); hspecs = [];
  if (GP.viewOnly) { renderHandles(); return; }
  const t = GP.tools.polyTarget();
  if (t) {
    const P = t.pts, n = P.length, room = t.kind === 'room';
    const segs = t.open ? n - 1 : n;
    for (let i = 0; i < segs; i++) { const a = P[i], b = P[(i + 1) % n]; hspecs.push({ cls: 'ov hd mid', html: '+', pos: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], h: 'm', i, title: '끌어서 꺾기' }); }
    for (let i = 0; i < n; i++) hspecs.push({ cls: 'ov hd' + (GP.tools.selV === i || GP.tools.selVs.has(i) ? ' sel' : ''), html: room ? i + 1 : '', pos: P[i], h: 'v', i, title: '끌어서 이동 · Shift+클릭 여러 개 선택 · 더블클릭 삭제' });
  }
  const its = u.selItems();
  if (its.length === 1 && u.sel.length === 1 && u.tool === 'select') {
    const it = its[0], d = GP.dims(it);
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([cx, cz]) => { const p = G.l2w(it.x, it.z, it.rot, cx * d.w / 2, cz * d.d / 2); hspecs.push({ cls: 'ov hd sq', html: '', pos: p, h: 'rs', cx, cz, title: '끌어서 크기 조절' }); });
    const rp = G.l2w(it.x, it.z, it.rot, 0, d.d / 2 + Math.max(.3, S.mpp() * 26)); hspecs.push({ cls: 'ov hd rot', html: '↻', pos: rp, h: 'rot', title: '끌어서 회전 (15° 단위, Alt 자유)' });
  }
  // opening: drag either end to change the width
  const so = u.selObj();
  if (so && so.k === 'opening' && u.tool === 'select') {
    const o = so.obj, hs = GP.hostSeg(o); const sp = hs && GP.openingSpan(o, hs);
    if (sp) [[-1, sp.s0], [1, sp.s1]].forEach(([side, t]) => { const p = [hs.a[0] + hs.dx * t + hs.nx * hs.mid, hs.a[1] + hs.dz * t + hs.nz * hs.mid]; hspecs.push({ cls: 'ov hd oe', html: '', pos: p, h: 'oe', side, title: '끌어서 폭 조절' }); });
  }
  renderHandles();
};
function renderHandles() {
  handles.innerHTML = hspecs.map((h, k) => `<div class="${h.cls}" data-k="${k}" ${h.h ? `data-h="${h.h}"` : ''} ${h.i != null ? `data-i="${h.i}"` : ''} ${h.side != null ? `data-side="${h.side}"` : ''} ${h.cx != null ? `data-cx="${h.cx}" data-cz="${h.cz}"` : ''} ${h.title ? `title="${h.title}"` : ''} style="${h.h ? 'pointer-events:auto' : ''}">${h.html}</div>`).join('') + '<svg id="ovSvg" style="position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none"></svg>';
  svg = handles.querySelector('#ovSvg');
}
function placeHandles() {
  const S = GP.S; const nodes = handles.children;
  for (let k = 0; k < hspecs.length; k++) { const h = hspecs[k], el = nodes[k]; if (!el) continue; const [x, y] = S.toScreen(h.pos[0], 0, h.pos[1]); place(el, x, y); }
}
function angPos(P, i) { const n = P.length, p = P[i], a = P[(i - 1 + n) % n], b = P[(i + 1) % n]; const la = G.len(a, p) || 1, lb = G.len(b, p) || 1; let bx = (a[0] - p[0]) / la + (b[0] - p[0]) / lb, bz = (a[1] - p[1]) / la + (b[1] - p[1]) / lb; const l = Math.hypot(bx, bz); if (l < 1e-3) return null; bx /= l; bz /= l; if (G.interior(P, i) > 180) { bx = -bx; bz = -bz; } return [p[0] + bx * .75, p[1] + bz * .75]; }
handles.addEventListener('pointerdown', e => { const el = e.target.closest('[data-h]'); if (el) GP.tools.handleDown(e, el); });
handles.addEventListener('dblclick', e => { const el = e.target.closest('[data-h="v"]'); if (el) GP.tools.deleteVertex(+el.dataset.i); });

/* ---------------- wall length edit ---------------- */
base.addEventListener('click', e => {
  const t = e.target.closest('.wl.edit'); if (!t || t.classList.contains('editing')) return; const i = +t.dataset.wall, L0 = G.edge(GP.L().room.pts, i).L;
  t.classList.add('editing'); t.innerHTML = `<input type="number" step="0.01" min="0.3" value="${L0.toFixed(2)}" aria-label="벽 길이 (m)">`; const inp = t.firstChild; inp.focus(); inp.select(); let done = false;
  const fin = ok => { if (done) return; done = true; t.classList.remove('editing'); const v = parseFloat(inp.value); const rec = [...els.values()].find(r => r.el === t); if (rec) rec.html = ''; if (ok && v >= .3 && v < 500 && Math.abs(v - L0) > .0005) GP.tools.setWallLength(i, v); OV.sync(); };
  inp.addEventListener('keydown', ev => { ev.stopPropagation(); if (ev.key === 'Enter') fin(true); else if (ev.key === 'Escape') fin(false); }); inp.addEventListener('blur', () => fin(true));
});

/* ---------------- corner angle edit: the angle, and which wall turns to make it (that wall keeps its length; its far end moves) ---------------- */
base.addEventListener('click', e => {
  const t = e.target.closest('.ang.edit'); if (!t) return; const i = +t.dataset.ang, P = GP.L().room.pts, n = P.length, a0 = G.interior(P, i);
  const v = k => `<b class="vtx">${(k + n) % n + 1}</b>`, nx = (i + 1) % n, pv = (i - 1 + n) % n;
  document.querySelectorAll('#angEdit').forEach(el => el.removeAttribute('id')); t.id = 'angEdit';
  GP.popover(t, `<div class="ph">${v(i)} 꼭짓점 각도</div><div class="ang-pop"><div class="unit"><input type="number" id="angIn" step="0.5" min="1" max="359" value="${Math.round(a0 * 10) / 10}"><em>°</em></div>
    <button class="mi" data-act="next"><div><b>${v(i)}–${v(nx)} 벽을 돌려서 맞추기</b><small>${v(nx)} 꼭짓점이 움직여요 · <kbd>Enter</kbd></small></div></button>
    <button class="mi" data-act="prev"><div><b>${v(pv)}–${v(i)} 벽을 돌려서 맞추기</b><small>${v(pv)} 꼭짓점이 움직여요</small></div></button>
    <p class="note">돌리는 벽의 길이는 그대로예요. 그 다음 벽이 늘거나 줄어서 맞춰져요.</p></div>`, (act) => {
    const val = parseFloat($('#angIn').value); if (!(val > 0 && val < 360)) { GP.toast('1~359° 사이로 넣어 주세요', { bad: true }); return true; }
    if (Math.abs(val - a0) < .05) return false;
    return !GP.tools.setAngle(i, val, act === 'prev' ? 'prev' : 'next');
  });
  const inp = $('#angIn'); setTimeout(() => { inp.focus(); inp.select(); }, 20);
  inp.addEventListener('keydown', ev => { ev.stopPropagation(); if (ev.key === 'Enter') { const b = document.querySelector('#pop [data-act="next"]'); if (b) b.click(); } else if (ev.key === 'Escape') GP.closePop(); });
});

/* ---------------- SVG previews (drawing, openings, fill wall) ---------------- */
function drawSvg() {
  if (!svg) return; const S = GP.S, t = GP.tools, d = t.getDraw(), hv = t.getHover(); let html = '';
  const P = (x, z) => S.toScreen(x, 0, z).slice(0, 2).map(v => v.toFixed(1)).join(',');
  const lbl = (x, z, txt) => { const [sx, sy] = S.toScreen(x, 0, z); const w = Math.max(60, txt.length * 7.5 + 12); return `<g transform="translate(${sx},${sy})"><rect x="${-w / 2}" y="-11" width="${w}" height="19" rx="4" fill="#2450E0"/><text x="0" y="2.5" text-anchor="middle" font-size="11.5" font-weight="700" fill="#fff" font-family="Pretendard,Malgun Gothic,sans-serif">${txt}</text></g>`; };
  if (d) {
    if (d.rect) { const a = d.a, b = d.b; html += `<polygon points="${[P(a[0], a[1]), P(b[0], a[1]), P(b[0], b[1]), P(a[0], b[1])].join(' ')}" fill="rgba(36,80,224,.12)" stroke="#2450E0" stroke-width="1.5" stroke-dasharray="5 4"/>`; const A = Math.abs((b[0] - a[0]) * (b[1] - a[1])); html += lbl((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, `${Math.abs(b[0] - a[0]).toFixed(2)} × ${Math.abs(b[1] - a[1]).toFixed(2)} m`); if (d.tool === 'matRect') html += lbl((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + S.mpp() * 23, `약 ${Math.ceil(A / U.PY * (GP.lib.defaults.blocksPerPyeong || 13))}장`); }
    else if (d.tool === 'measure') { html += `<polyline points="${P(d.a[0], d.a[1])} ${P(d.b[0], d.b[1])}" stroke="#1F2429" stroke-width="2" fill="none"/>`; html += lbl((d.a[0] + d.b[0]) / 2, (d.a[1] + d.b[1]) / 2, G.len(d.a, d.b).toFixed(2) + ' m'); }
    else if (d.pts) { const pts = d.pts.concat(d.cur ? [d.cur] : []); html += `<polyline points="${pts.map(p => P(p[0], p[1])).join(' ')}" stroke="${d.tool === 'part' ? '#4a525b' : '#2450E0'}" stroke-width="${d.tool === 'part' ? 6 : 2}" fill="none" stroke-linejoin="round" opacity=".8"/>`; pts.forEach(p => { const q = S.toScreen(p[0], 0, p[1]); html += `<circle cx="${q[0]}" cy="${q[1]}" r="4" fill="#fff" stroke="#2450E0" stroke-width="2"/>`; }); if (d.cur && d.pts.length) { const l = d.pts[d.pts.length - 1]; html += lbl((l[0] + d.cur[0]) / 2, (l[1] + d.cur[1]) / 2, (d.num ? d.num : G.len(l, d.cur).toFixed(2)) + ' m'); } }
  }
  if (hv && hv.snap && !d) { const [sx, sy] = S.toScreen(hv.snap[0], 0, hv.snap[1]); html += `<circle cx="${sx}" cy="${sy}" r="5" fill="none" stroke="#2450E0" stroke-width="2"/>`; }
  if (t.preview && GP.ui.tool === 'opening') { const pv = t.preview; const hs = GP.hostSeg({ host: pv.host, seg: pv.seg }); if (hs) { const w = GP.tools.openingWidth(GP.ui.openingKind); const c = U.clamp(pv.t, w / 2, hs.L - w / 2); const a = [hs.a[0] + hs.dx * (c - w / 2) + hs.nx * hs.mid, hs.a[1] + hs.dz * (c - w / 2) + hs.nz * hs.mid], b = [hs.a[0] + hs.dx * (c + w / 2) + hs.nx * hs.mid, hs.a[1] + hs.dz * (c + w / 2) + hs.nz * hs.mid]; html += `<polyline points="${P(a[0], a[1])} ${P(b[0], b[1])}" stroke="#E0622B" stroke-width="9" opacity=".75" fill="none"/>`; } }
  if (hv && hv.a && GP.ui.tool === 'fillwall') { html += `<polyline points="${P(hv.a[0], hv.a[1])} ${P(hv.b[0], hv.b[1])}" stroke="#13906F" stroke-width="8" opacity=".7" fill="none"/>` + lbl((hv.a[0] + hv.b[0]) / 2 + hv.nx * .5, (hv.a[1] + hv.b[1]) / 2 + hv.nz * .5, hv.L.toFixed(2) + ' m'); }
  svg.innerHTML = html;
}

/* ---------------- scale bar ---------------- */
OV.scalebar = () => {
  const sb = $('#scalebar'), S = GP.S; if (!sb) return;
  const m = S.mpp(), target = m * 110; const nice = [.5, 1, 2, 5, 10, 20, 50].reduce((a, b) => Math.abs(Math.log(b / target)) < Math.abs(Math.log(a / target)) ? b : a);
  sb.querySelector('.sb-bar').style.width = (nice / m).toFixed(1) + 'px'; sb.querySelector('span').textContent = nice + ' m';
};
GP.on('overlay', () => OV.sync());
GP.on('changed', () => OV.sync());
GP.on('rendered', () => OV.place());
})();
