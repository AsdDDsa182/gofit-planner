/* GoFit Planner — step panels (space / place / floor / quote) and dialogs */
(function () {
'use strict';
const GP = window.GP, U = GP.U, G = GP.G, $ = U.$, $$ = U.$$, IC = GP.IC;
const ui = GP.ui;
const panels = GP.panels = {};
const numI = (id, v, step, unit, o) => `<div class="unit"><input id="${id}" type="number" step="${step}" value="${v}" ${o || ''}><em>${unit}</em></div>`;

/* ======================= ① SPACE ======================= */
const SHAPES = {
  rect: { name: '직사각형', ps: [['w', '가로', 18], ['d', '세로', 11.5]], make: p => [[0, 0], [p.w, 0], [p.w, p.d], [0, p.d]], icon: 'M4 6h32v24H4z' },
  L: { name: 'L자형', ps: [['w', '전체 가로', 18], ['d', '전체 세로', 12], ['cw', '파인 가로', 6], ['cd', '파인 세로', 5]], make: p => { const cw = Math.min(p.cw, p.w - .5), cd = Math.min(p.cd, p.d - .5); return [[0, 0], [p.w - cw, 0], [p.w - cw, cd], [p.w, cd], [p.w, p.d], [0, p.d]]; }, icon: 'M4 6h20v10h12v14H4z' },
  cham: { name: '사선 모서리', ps: [['w', '가로', 18], ['d', '세로', 11.5], ['c', '사선 크기', 3.5]], make: p => { const c = Math.min(p.c, p.w - .5, p.d - .5); return [[0, 0], [p.w - c, 0], [p.w, c], [p.w, p.d], [0, p.d]]; }, icon: 'M4 6h24l8 8v16H4z' },
  trap: { name: '사다리꼴', ps: [['t', '윗변', 13], ['w', '아랫변', 18], ['d', '깊이', 11]], make: p => [[0, 0], [p.t, 0], [p.w, p.d], [0, p.d]], icon: 'M4 6h20l12 24H4z' },
};
panels.SHAPES = SHAPES;
const sp = { mode: 'py', shape: 'rect', vals: {}, walk: null };
for (const k in SHAPES) sp.vals[k] = Object.fromEntries(SHAPES[k].ps.map(p => [p[0], p[2]]));
let liveT = 0;
function applyRoomLive(P, fit) {
  const L = GP.L(); L.room.pts = P.map(p => [U.r3(p[0]), U.r3(p[1])]);
  GP.changed('room', { commit: false, fast: true }); clearTimeout(liveT); liveT = setTimeout(() => { GP.H.commit(); if (fit) GP.S.fit(); }, 700);
}
panels.renderSpace = () => {
  const P = GP.P, st = P.settings, L = GP.L(), A = Math.abs(G.area(L.room.pts));
  const el = $('#panel-space');
  el.innerHTML = `<p class="lead">고객 매장의 벽 모양과 크기를 만들어요. 숫자를 바꾸면 바로 도면에 반영돼요. 문·창문·가벽은 도면 위 도구로 넣어요.</p>
  <section class="blk"><h3>공간 만들기</h3>
    <div class="seg full" id="spMode"><button data-m="py" class="${sp.mode === 'py' ? 'on' : ''}">평수로</button><button data-m="shape" class="${sp.mode === 'shape' ? 'on' : ''}">모양 템플릿</button><button data-m="walk" class="${sp.mode === 'walk' ? 'on' : ''}">실측 입력</button></div>
    <div id="spBody" class="blk" style="border:0;padding:0"></div></section>
  <section class="blk"><h3>지금 모양 그대로 평수 맞추기</h3><div class="row2"><label class="fld"><span>목표 평수 (지금 ${(A / U.PY).toFixed(1)}평)</span>${numI('fitPy', (A / U.PY).toFixed(1), .5, '평', 'min="3"')}</label><button class="btn" id="fitApply">비율 유지하고 맞추기</button></div></section>
  <section class="blk"><h3>천장 높이</h3><div class="row2"><label class="fld"><span>바닥에서 천장까지</span>${numI('ceilH', st.wallH, .05, 'm', 'min="2" max="8"')}</label><p class="note" style="margin:0;align-self:end">기구마다 쓸 때 필요한 높이(트레드밀 위 사람 키, 스텝밀 맨 위 계단 등)를 이 높이로 점검해요. 3D 벽 높이로도 쓰여요.</p></div></section>
  <section class="blk"><h3>고객 로고</h3><p class="note">로고 이미지를 올리면 벽에 붙는 로고가 생겨요.</p><label class="btn wide file" style="position:relative;overflow:hidden">로고 이미지 올리기<input type="file" id="logoFile" accept="image/*" style="position:absolute;inset:0;opacity:0;cursor:pointer"></label></section>
  <details class="blk" ${sp.vt ? 'open' : ''} id="vtBlk"><summary>꼭짓점 좌표 (m)</summary><table class="tbl" id="vtable"></table></details>
  <section class="blk"><h3>고객 도면 대고 그리기</h3><p class="note">받은 평면도 사진이나 캐드 파일(DXF)을 바닥에 깔고 <b>벽 편집</b> 도구로 꼭짓점을 맞추면 실제 모양 그대로 만들 수 있어요.</p>
    <div class="row2"><label class="btn file" style="position:relative;overflow:hidden">이미지·PDF 캡처<input type="file" id="ulImg" accept="image/*" style="position:absolute;inset:0;opacity:0;cursor:pointer"></label><label class="btn file" style="position:relative;overflow:hidden">캐드 파일 (DXF)<input type="file" id="ulDxf" accept=".dxf" style="position:absolute;inset:0;opacity:0;cursor:pointer"></label></div>
    <div id="ulCtl"></div></section>`;
  renderSpBody(); renderVTable(); renderUL();
};
function renderSpBody() {
  const b = $('#spBody'); if (!b) return; const L = GP.L();
  if (sp.mode === 'py') {
    const A = Math.abs(G.area(L.room.pts)), bb = G.bounds(L.room.pts);
    b.innerHTML = `<div class="row2"><label class="fld"><span>평수</span>${numI('pyIn', sp.py ?? Math.round(A / U.PY), 1, '평', 'min="3"')}</label><label class="fld"><span>가로 : 세로</span><select id="pyRatio">${[[1, '1 : 1'], [1.3333, '4 : 3'], [1.5, '3 : 2'], [2, '2 : 1'], [3, '3 : 1']].map(([v, l]) => `<option value="${v}" ${Math.abs((sp.ratio || 1.5) - v) < .01 ? 'selected' : ''}>${l}</option>`).join('')}</select></label></div><p class="calc" id="pyCalc">가로 ${bb.sx.toFixed(2)} m × 세로 ${bb.sz.toFixed(2)} m</p><p class="note">평수나 비율을 바꾸면 바로 직사각형 도면이 돼요.</p>`;
  } else if (sp.mode === 'shape') {
    const S0 = SHAPES[sp.shape], V = sp.vals[sp.shape];
    b.innerHTML = `<div class="shapes">${Object.entries(SHAPES).map(([k, s]) => `<button class="shape${sp.shape === k ? ' on' : ''}" data-shape="${k}"><svg viewBox="0 0 40 36"><path d="${s.icon}" fill="var(--accent-soft)" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>${s.name}</button>`).join('')}</div>
      <div class="row2">${S0.ps.map(([k, l]) => `<label class="fld"><span>${l}</span>${numI('shp_' + k, V[k], .1, 'm', `min="0.5" data-k="${k}"`)}</label>`).join('')}</div><p class="calc" id="shpCalc"></p><p class="note">입력칸을 누르면 바뀌는 벽이 파랗게 표시돼요.</p>`;
    shpCalc();
  } else {
    if (!sp.walk) sp.walk = roomToWalk(L.room.pts);
    b.innerHTML = `<p class="note">현장에서 잰 벽 길이를 차례대로 입력하세요. 모퉁이마다 어느 쪽으로 꺾는지 고르면 돼요.</p><div class="list" id="walkRows">${sp.walk.map((r, i) => `<div class="walkrow"><b>${i + 1}</b>${numI('wl_' + i, r.len, .01, 'm', `data-i="${i}" data-f="len" min="0.1"`)}${i === 0 ? '<span class="note">첫 벽 (→ 방향)</span>' : `<select data-i="${i}" data-f="turn">${[[90, '오른쪽 90°'], [-90, '왼쪽 90°'], [45, '오른쪽 45°'], [-45, '왼쪽 45°'], [135, '오른쪽 135°'], [-135, '왼쪽 135°']].map(([v, l]) => `<option value="${v}" ${r.turn === v ? 'selected' : ''}>${l}</option>`).join('')}${![90, -90, 45, -45, 135, -135].includes(r.turn) ? `<option value="${r.turn}" selected>${r.turn > 0 ? '오른쪽' : '왼쪽'} ${Math.abs(r.turn)}°</option>` : ''}</select>`}<button class="icon-btn ghost sm" data-del="${i}" title="이 벽 삭제" ${sp.walk.length <= 2 ? 'disabled' : ''}>${IC.x}</button></div>`).join('')}</div>
      <div class="row2"><button class="btn sm" id="walkAdd">＋ 벽 추가</button><button class="btn sm soft" id="walkReset">지금 도면에서 다시 읽기</button></div><p class="calc" id="walkCalc"></p>`;
    walkCalc();
  }
}
function roomToWalk(P) { const out = []; let prev = null; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; const ang = Math.atan2(b[1] - a[1], b[0] - a[0]) / U.DEG; const turn = prev == null ? 0 : Math.round(U.angNorm((ang - prev) * U.DEG) / U.DEG); out.push({ len: U.r2(G.len(a, b)), turn }); prev = ang; } if (out.length > 1) out.pop(); return out; }
function walkToPts(rows) { const pts = [[0, 0]]; let h = 0; rows.forEach((r, i) => { if (i > 0) h += r.turn; const l = pts[pts.length - 1]; pts.push([U.r3(l[0] + Math.cos(h * U.DEG) * r.len), U.r3(l[1] + Math.sin(h * U.DEG) * r.len)]); }); const last = pts[pts.length - 1]; if (G.len(last, pts[0]) < .03) pts.pop(); return pts; }
function walkCalc() { const pts = walkToPts(sp.walk); const gap = G.len(pts[pts.length - 1], pts[0]); const el = $('#walkCalc'); if (el) el.textContent = gap < .03 ? '시작점으로 정확히 돌아왔어요 ✓' : `마지막 점이 시작점에서 ${gap.toFixed(2)} m 떨어져 있어요 → 자동으로 이어서 닫아요`; }
function shpCalc() { const P = SHAPES[sp.shape].make(sp.vals[sp.shape]); const A = Math.abs(G.area(P)); const el = $('#shpCalc'); if (el) el.textContent = `≈ ${A.toFixed(1)}㎡ · ${(A / U.PY).toFixed(1)}평`; }
function pyRect() { const py = +($('#pyIn').value) || 0, r = +($('#pyRatio').value) || 1.5; sp.py = py; sp.ratio = r; const A = py * U.PY, d = U.snap(Math.sqrt(A / r), .05), w = U.snap(d * r, .05); const c = $('#pyCalc'); if (c) c.textContent = `≈ ${A.toFixed(1)}㎡ · 가로 ${w.toFixed(2)} m × 세로 ${d.toFixed(2)} m`; return [[0, 0], [w, 0], [w, d], [0, d]]; }
function hiWallsFor(k) { const V = Object.assign({}, sp.vals[sp.shape]); const P0 = SHAPES[sp.shape].make(V); V[k] = V[k] + .37; const P1 = SHAPES[sp.shape].make(V); const out = new Set(); if (P0.length === P1.length) for (let i = 0; i < P0.length; i++) if (Math.abs(G.len(P0[i], P0[(i + 1) % P0.length]) - G.len(P1[i], P1[(i + 1) % P1.length])) > 1e-6) out.add(i); return out; }
function renderVTable() {
  const vt = $('#vtable'); if (!vt || vt.contains(document.activeElement)) return; const P = GP.L().room.pts;
  vt.innerHTML = '<thead><tr><th>#</th><th>X</th><th>Y</th><th></th></tr></thead><tbody>' + P.map((p, i) => `<tr><td class="mono">${i + 1}</td><td><input type="number" step="0.05" data-i="${i}" data-c="0" value="${p[0].toFixed(2)}"></td><td><input type="number" step="0.05" data-i="${i}" data-c="1" value="${p[1].toFixed(2)}"></td><td><button class="x" data-vdel="${i}" ${P.length <= 3 ? 'disabled' : ''}>×</button></td></tr>`).join('') + '</tbody>';
}
function renderUL() {
  const c = $('#ulCtl'); if (!c) return; const UL = GP.S.underlay; if (!UL) { c.innerHTML = ''; return; }
  c.innerHTML = `<div class="row2"><label class="fld"><span>${UL.kind === 'image' ? '이미지 가로 실제 길이' : '단위 배율'}</span>${UL.kind === 'image' ? numI('ulW', UL.w, .1, 'm', 'min="1"') : `<select id="ulScale">${[[1, 'm'], [.001, 'mm'], [.01, 'cm'], [.0254, 'inch']].map(([v, l]) => `<option value="${v}" ${Math.abs((UL.scale || 1) - v) < 1e-9 ? 'selected' : ''}>${l}</option>`).join('')}</select>`}</label><label class="fld"><span>진하기</span><input type="range" id="ulOp" min=".1" max="1" step=".05" value="${UL.op}"></label></div>
   <div class="row2"><label class="fld"><span>위치 X</span>${numI('ulX', U.r2(UL.x), .1, 'm')}</label><label class="fld"><span>위치 Y</span>${numI('ulY', U.r2(UL.z), .1, 'm')}</label></div>
   ${UL.kind === 'dxf' && UL.loops && UL.loops.length ? `<button class="btn wide soft" id="ulUseLoop">가장 큰 닫힌 선을 벽으로 쓰기 (${UL.loops.length}개 중 ${(UL.loopIdx || 0) + 1}번째)</button>` : ''}
   <div class="row2"><button class="btn" id="ulHide">${UL.hidden ? '밑그림 다시 보기' : '밑그림 잠깐 숨기기'}</button><button class="btn ghost" id="ulDel">도면 치우기</button></div>
   <p class="note">진하기를 낮추면 밑그림이 연해져서 그 위에 그린 벽이 잘 보여요.</p>`;
}
panels.renderUL = renderUL;
const spEl = $('#panel-space');
spEl.addEventListener('click', e => {
  const t = e.target; const m = t.closest('#spMode [data-m]'); if (m) { sp.mode = m.dataset.m; if (sp.mode === 'walk') sp.walk = null; panels.renderSpace(); return; }
  const shp = t.closest('[data-shape]'); if (shp) { sp.shape = shp.dataset.shape; renderSpBody(); applyRoomLive(SHAPES[sp.shape].make(sp.vals[sp.shape]), true); return; }
  if (t.id === 'fitApply') { const tg = +$('#fitPy').value; if (!(tg >= 3)) return; const L = GP.L(), P = L.room.pts, A = Math.abs(G.area(P)), s = Math.sqrt(tg * U.PY / A), b = G.bounds(P); L.room.pts = P.map(p => [U.r3(b.minX + (p[0] - b.minX) * s), U.r3(b.minZ + (p[1] - b.minZ) * s)]); const sc = (o) => { o.x = U.r3(b.minX + (o.x - b.minX) * s); o.z = U.r3(b.minZ + (o.z - b.minZ) * s); }; L.items.forEach(sc); L.rooms.forEach(sc); L.notes.forEach(sc); [L.mats, L.zones].forEach(arr => arr.forEach(o => { o.pts = o.pts.map(p => [U.r3(b.minX + (p[0] - b.minX) * s), U.r3(b.minZ + (p[1] - b.minZ) * s)]); })); L.partitions.forEach(o => { o.pts = o.pts.map(p => [U.r3(b.minX + (p[0] - b.minX) * s), U.r3(b.minZ + (p[1] - b.minZ) * s)]); }); L.openings.forEach(o => { o.t = U.r3(o.t * s); }); GP.changed('all'); GP.S.fit(); GP.toast(`모양은 그대로 두고 ${tg}평에 맞췄어요`); return; }
  if (t.id === 'walkAdd') { sp.walk.push({ len: 3, turn: 90 }); renderSpBody(); applyRoomLive(walkToPts(sp.walk)); return; }
  if (t.id === 'walkReset') { sp.walk = roomToWalk(GP.L().room.pts); renderSpBody(); return; }
  const wd = t.closest('[data-del]'); if (wd) { sp.walk.splice(+wd.dataset.del, 1); renderSpBody(); applyRoomLive(walkToPts(sp.walk)); return; }
  const vd = t.closest('[data-vdel]'); if (vd) { const P = GP.L().room.pts; if (P.length > 3) { P.splice(+vd.dataset.vdel, 1); GP.changed('room'); renderVTable(); } return; }
  if (t.id === 'ulHide') { const UL = GP.S.underlay; if (UL) { UL.hidden = !UL.hidden; GP.S.invalidate(); renderUL(); } return; }
  if (t.id === 'ulDel') { GP.S.buildUnderlay(null); GP.DB.del('blobs', 'ul:' + GP.P.id); renderUL(); return; }
  if (t.id === 'ulUseLoop') { const UL = GP.S.underlay; const loop = UL.loops[UL.loopIdx || 0]; UL.loopIdx = ((UL.loopIdx || 0) + 1) % UL.loops.length; const s = UL.scale || 1; applyRoomLive(loop.map(p => [p[0] * s + UL.x, p[1] * s + UL.z]), true); renderUL(); GP.toast('캐드 도면의 선을 벽으로 가져왔어요. 다시 누르면 다음 선을 써요'); return; }
});
spEl.addEventListener('input', e => {
  const t = e.target;
  if (t.id === 'pyIn' || t.id === 'pyRatio') { const P = pyRect(); if (sp.py >= 3) applyRoomLive(P, true); return; }
  if (t.id && t.id.startsWith('shp_')) { const v = +t.value; if (v > 0) { sp.vals[sp.shape][t.dataset.k] = v; shpCalc(); applyRoomLive(SHAPES[sp.shape].make(sp.vals[sp.shape])); GP.OV.hiWall = hiWallsFor(t.dataset.k); } return; }
  if (t.dataset.f && sp.walk) { const i = +t.dataset.i; if (t.dataset.f === 'len') { const v = +t.value; if (!(v > 0)) return; sp.walk[i].len = v; } else sp.walk[i].turn = +t.value; walkCalc(); applyRoomLive(walkToPts(sp.walk)); return; }
  if (t.id === 'ulOp' || t.id === 'ulW' || t.id === 'ulX' || t.id === 'ulY' || t.id === 'ulScale') { const UL = GP.S.underlay; if (!UL) return; const v = +t.value; if (!isFinite(v)) return; if (t.id === 'ulOp') UL.op = v; if (t.id === 'ulW') UL.w = Math.max(1, v); if (t.id === 'ulX') UL.x = v; if (t.id === 'ulY') UL.z = v; if (t.id === 'ulScale') UL.scale = v; GP.S.buildUnderlay(UL); panels.saveUL(); return; }
});
spEl.addEventListener('change', e => {
  const t = e.target;
  if (t.dataset.c != null && t.dataset.i != null && t.closest('#vtable')) { const P = GP.L().room.pts, i = +t.dataset.i, v = +t.value; if (isFinite(v) && P[i]) { P[i][+t.dataset.c] = U.r3(v); GP.changed('room'); } return; }
  if (t.id === 'ceilH') { const v = U.clamp(+t.value || 2.8, 2, 8); GP.P.settings.wallH = U.r2(v); t.value = GP.P.settings.wallH; GP.changed('all'); GP.toast(`천장 높이 ${GP.P.settings.wallH}m 기준으로 다시 점검했어요`); return; }
  if (t.id === 'logoFile') { const f = t.files[0]; t.value = ''; if (f) panels.addLogo(f); return; }
  if (t.id === 'ulImg') { const f = t.files[0]; t.value = ''; if (f) panels.loadUnderlayImage(f); return; }
  if (t.id === 'ulDxf') { const f = t.files[0]; t.value = ''; if (f) panels.loadUnderlayDxf(f); return; }
});
spEl.addEventListener('focusin', e => { if (e.target.id && e.target.id.startsWith('shp_')) { GP.OV.hiWall = hiWallsFor(e.target.dataset.k); GP.emit('overlay'); } });
spEl.addEventListener('focusout', e => { if (e.target.id && e.target.id.startsWith('shp_')) { GP.OV.hiWall = null; GP.emit('overlay'); } });
spEl.addEventListener('toggle', e => { if (e.target.id === 'vtBlk') sp.vt = e.target.open; }, true);
panels.addLogo = async (f) => {
  const src = await U.readFile(f); const im = await U.downscaleImage(src, 1024); const id = U.uid('img'); GP.P.images[id] = { src: im.src, w: im.w, h: im.h };
  const L = GP.L(), P = L.room.pts, e = G.edge(P, 0); const ratio = im.h / im.w, w = 1.6, h = U.r3(Math.min(1.2, w * ratio));
  const it = { uid: U.uid(), type: 'logo', x: U.r3((e.a[0] + e.b[0]) / 2 + e.nx * .03), z: U.r3((e.a[1] + e.b[1]) / 2 + e.nz * .03), rot: 0, w, h, d: .03, img: id, elev: 1.5 };
  const r = GP.tools.wallSnap(it.x, it.z, 0, w, .03, { force: true, relK: 0 }); if (r) { it.x = r.x; it.z = r.z; it.rot = r.rot; }
  L.items.push(it); GP.changed('items'); ui.setStep('place'); ui.select([{ k: 'item', id: it.uid }]); GP.toast('로고를 벽에 붙였어요. 끌어서 다른 벽으로 옮길 수 있어요');
};
panels.loadUnderlayImage = async (f) => {
  const src = await U.readFile(f); const im = await U.downscaleImage(src, 2400); const img = await U.loadImage(im.src); const b = G.bounds(GP.L().room.pts);
  const UL = { kind: 'image', src: im.src, img, w: Math.max(3, U.r2(b.sx)), x: U.r2(b.minX), z: U.r2(b.minZ), op: .6, aspect: img.naturalHeight / img.naturalWidth };
  GP.S.buildUnderlay(UL); panels.saveUL(); renderUL(); ui.setTool('vertex'); GP.toast('도면을 깔았어요. 가로 실제 길이를 맞춘 뒤 꼭짓점을 벽에 맞춰 옮기세요');
};
panels.loadUnderlayDxf = async (f) => {
  const txt = await U.readFile(f, 'text'); const r = GP.exp.parseDxf(txt); if (!r.segs.length) { GP.toast('DXF에서 선을 찾지 못했어요', { bad: true }); return; }
  const UL = { kind: 'dxf', segs: r.segs, loops: r.loops, scale: r.scale, x: 0, z: 0, op: .9, loopIdx: 0 };
  const b = G.bounds(r.segs.flat().map(p => [p[0] * r.scale, p[1] * r.scale])); UL.x = U.r2(-b.minX); UL.z = U.r2(-b.minZ);
  GP.S.buildUnderlay(UL); panels.saveUL(); renderUL(); GP.S.fit();
  GP.toast(`캐드 선 ${r.segs.length}개를 불러왔어요 (단위: ${r.unitName})${r.loops.length ? ' · 닫힌 선을 벽으로 쓸 수 있어요' : ''}`, { ms: 4200 });
};
panels.saveUL = U.debounce(() => { const UL = GP.S.underlay; if (!UL) return; const o = Object.assign({}, UL); delete o.img; GP.DB.put('blobs', 'ul:' + GP.P.id, o); }, 400);
panels.restoreUL = async () => { GP.S.buildUnderlay(null); const o = await GP.DB.get('blobs', 'ul:' + GP.P.id); if (!o) return; if (o.kind === 'image') { try { o.img = await U.loadImage(o.src); } catch (e) { return; } } GP.S.buildUnderlay(o); renderUL(); };

/* ======================= ② EQUIPMENT (catalog) ======================= */
const pl = { cat: 'fav', q: '' };
panels.recent = []; try { panels.recent = JSON.parse(localStorage.getItem('gofit:recent') || '[]'); } catch (e) { }
panels.pushRecent = (t) => { panels.recent = [t].concat(panels.recent.filter(x => x !== t)).slice(0, 12); try { localStorage.setItem('gofit:recent', JSON.stringify(panels.recent)); } catch (e) { } };
function allTypes() { const out = Object.keys(GP.CAT).filter(k => !GP.lib.hidden.includes(k)); Object.keys(GP.lib.customTypes).forEach(k => out.push(k)); return out; }
/* categories in four groups: the group row, then only that group's categories (with how many items each has) */
const PL_GROUPS = [
  { id: 'mine', name: '자주 쓰는', cats: ['fav', 'custom', 'sets'] },
  { id: 'cardio', name: '유산소', cats: ['cardio', 'air'] },
  { id: 'strength', name: '근력', cats: ['machine', 'plate', 'cable', 'rack', 'bench', 'storage'] },
  { id: 'etc', name: '존·기타', cats: ['func', 'stretch', 'facility', 'special'] },
];
const plGroupOf = c => PL_GROUPS.find(g => g.cats.includes(c)) || PL_GROUPS[0];
const plCatName = c => c === 'sets' ? '존 세트' : c === 'fav' ? '즐겨찾기' : (GP.lib.catNames[c] || (GP.CATS.find(x => x.id === c) || {}).name || c);
function plCount(c) {
  if (c === 'sets') return GP.SETS.length + GP.lib.sets.length;
  if (c === 'fav') return new Set(GP.lib.favorites.concat(panels.recent).filter(k => GP.getDef(k))).size;
  return allTypes().filter(k => (GP.getDef(k) || {}).cat === c).length;
}
panels.renderPlace = () => {
  const el = $('#panel-place'), grp = plGroupOf(pl.cat);
  el.innerHTML = `<p class="pl-lead">${IC.select}<span>기구를 누르고 도면을 클릭하면 놓여요 · 끌어다 놓아도 돼요</span></p>
  <div class="search">${IC.search}<input id="plQ" type="search" placeholder="기구 검색 (예: 랫풀다운, 벤치)" value="${U.esc(pl.q)}"></div>
  <div class="seg full pl-groups" id="plGroups">${PL_GROUPS.map(g => `<button data-grp="${g.id}" class="${g === grp ? 'on' : ''}">${g.id === 'mine' ? IC.star : ''}${g.name}</button>`).join('')}</div>
  <div class="pl-subs" id="plCats">${grp.cats.map(c => `<button class="pl-sub${pl.cat === c ? ' on' : ''}" data-cat="${c}">${U.esc(plCatName(c))}<em>${plCount(c)}</em></button>`).join('')}</div>
  <div class="grid" id="plGrid"></div>`;
  renderGrid();
};
function renderGrid() {
  const g = $('#plGrid'); if (!g) return; const q = pl.q.trim().toLowerCase().replace(/\s+/g, '');
  if (pl.cat === 'sets' && !q) { const sets = GP.SETS.concat(GP.lib.sets); g.innerHTML = sets.map(s => `<button class="li" data-set="${s.id}" style="grid-column:1/-1"><span class="t"><b>${U.esc(s.name)}</b><small>${U.esc(s.desc || (s.items.length + '개 기구'))}</small></span>${GP.lib.sets.includes(s) ? `<span class="icon-btn ghost sm" data-setdel="${s.id}" title="세트 삭제">${IC.trash}</span>` : ''}</button>`).join('') + `<p class="note" style="grid-column:1/-1">기구 여러 개를 선택하고 오른쪽에서 <b>세트로 저장</b>하면 여기에 추가돼요.</p>`; return; }
  let list = allTypes();
  if (q) list = list.filter(k => { const d = GP.getDef(k); return (GP.typeName(k) + d.name + (d.kw || '')).toLowerCase().replace(/\s+/g, '').includes(q); });
  else if (pl.cat === 'fav') { const fav = GP.lib.favorites.filter(k => GP.getDef(k)); const rec = panels.recent.filter(k => GP.getDef(k) && !fav.includes(k)); list = fav.concat(rec); }
  else list = list.filter(k => GP.getDef(k).cat === pl.cat);
  let html = list.map(k => card(k)).join('');
  if (pl.cat === 'custom' || pl.cat === 'special') html = `<button class="card" data-build="1"><span class="thumb" style="display:grid;place-items:center;color:var(--ink-2)">${IC.build}</span><span class="c-name"><span>직접 조립해서 만들기</span></span><span class="c-size">상자·원기둥 조합</span></button>` + html;
  if (pl.cat === 'fav' && !q && !list.length) html = '<p class="empty">★를 눌러 자주 쓰는 기구를 모아 두세요.</p>';
  g.innerHTML = html || '<p class="empty">찾는 기구가 없어요. 다른 이름으로 검색해 보세요.</p>';
}
function card(k) {
  const d = GP.getDef(k), fav = GP.lib.favorites.includes(k), on = ui.placing && ui.placing.list.length === 1 && ui.placing.list[0].it.type === k, pr = GP.lib.prices[k];
  return `<button class="card${on ? ' on' : ''}" data-type="${k}" title="${U.esc(GP.typeName(k))} 배치하기"><span class="thumb"><img src="${GP.SYM.thumbUrl(k)}" alt="" loading="lazy" draggable="false">${GP.R3.hasModel(k) ? '<span class="b3d">3D</span>' : ''}</span><span class="fav${fav ? ' on' : ''}" data-fav="${k}" title="즐겨찾기">★</span><span class="c-name"><span class="dot" style="--c:var(--cat-${d.cat})"></span><span>${U.esc(GP.typeName(k))}</span></span><span class="c-size">${U.cm(d.w)}×${U.cm(d.d)} cm${pr ? ` · ${U.won(pr)}원` : ''}</span></button>`;
}
const plEl = $('#panel-place'); let cardDrag = null;
plEl.addEventListener('input', e => { if (e.target.id === 'plQ') { pl.q = e.target.value; renderGrid(); } });
plEl.addEventListener('click', e => {
  const t = e.target;
  const fv = t.closest('[data-fav]'); if (fv) { e.stopPropagation(); const k = fv.dataset.fav, f = GP.lib.favorites, i = f.indexOf(k); if (i >= 0) f.splice(i, 1); else f.unshift(k); GP.saveLib(); renderGrid(); return; }
  const gb = t.closest('#plGroups [data-grp]'); if (gb) { const g = PL_GROUPS.find(x => x.id === gb.dataset.grp); if (g && !g.cats.includes(pl.cat)) { pl.cat = g.cats[0]; pl.q = ''; panels.renderPlace(); } return; }
  const c = t.closest('#plCats [data-cat]'); if (c) { pl.cat = c.dataset.cat; pl.q = ''; panels.renderPlace(); return; }
  const sd = t.closest('[data-setdel]'); if (sd) { e.stopPropagation(); GP.lib.sets = GP.lib.sets.filter(s => s.id !== sd.dataset.setdel); GP.saveLib(); renderGrid(); return; }
  const s = t.closest('[data-set]'); if (s) { const set = GP.SETS.concat(GP.lib.sets).find(q => q.id === s.dataset.set); if (set) GP.tools.startPlacing(set.items.filter(q => GP.getDef(q[0])).map(([type, x, z, r, extra]) => ({ it: Object.assign({ type }, extra || {}), rel: [x, z, r] })), { label: set.name }); return; }
  if (t.closest('[data-build]')) { panels.builder(); return; }
  const cd = t.closest('.card[data-type]'); if (cd) { if (cardDrag && cardDrag.dragged) return; const k = cd.dataset.type; if (ui.placing && ui.placing.list.length === 1 && ui.placing.list[0].it.type === k) { GP.tools.cancel(); renderGrid(); return; } GP.tools.startPlacing([{ it: { type: k } }]); renderGrid(); if (U.isNarrow()) GP.toast(GP.V3 && GP.V3.on ? '놓을 곳을 탭하세요' : '도면을 탭해서 놓으세요'); return; }
});
plEl.addEventListener('pointerdown', e => {
  const cd = e.target.closest('.card[data-type]'); if (!cd || e.pointerType !== 'mouse' || e.button !== 0 || e.target.closest('[data-fav]')) return; e.preventDefault();
  cardDrag = { type: cd.dataset.type, x: e.clientX, y: e.clientY, dragged: false };
  const tgt = () => GP.V3 && GP.V3.on ? $('#c3') : GP.S.canvas;      // dropping into the 3D view places there too
  const inside = ev => { const r = tgt().getBoundingClientRect(); return ev.clientX > r.left && ev.clientX < r.right && ev.clientY > r.top && ev.clientY < r.bottom; };
  const mv = ev => { if (!cardDrag.dragged) { if (Math.hypot(ev.clientX - cardDrag.x, ev.clientY - cardDrag.y) < 6) return; cardDrag.dragged = true; GP.tools.startPlacing([{ it: { type: cardDrag.type } }]); document.body.classList.add('grabbing'); } if (inside(ev)) tgt().dispatchEvent(new PointerEvent('pointermove', { clientX: ev.clientX, clientY: ev.clientY, pointerType: 'mouse' })); else if (GP.S.ghost) { GP.S.ghost.visible = false; GP.S.invalidate(); } };
  const up = ev => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); document.body.classList.remove('grabbing'); const cdr = cardDrag; setTimeout(() => { cardDrag = null; }, 0); if (!cdr || !cdr.dragged) return; if (inside(ev) && GP.S.ghost && GP.S.ghost.visible) { tgt().dispatchEvent(new PointerEvent('pointerdown', { clientX: ev.clientX, clientY: ev.clientY, button: 0, pointerType: 'mouse', pointerId: 91 })); tgt().dispatchEvent(new PointerEvent('pointerup', { clientX: ev.clientX, clientY: ev.clientY, button: 0, pointerType: 'mouse', pointerId: 91 })); } else GP.tools.cancel(); renderGrid(); };
  window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
});
GP.on('placing', () => { if (ui.step === 'place') { $$('#plGrid .card[data-type]').forEach(c => c.classList.toggle('on', !!(ui.placing && ui.placing.list.length === 1 && ui.placing.list[0].it.type === c.dataset.type))); } });
GP.on('library', () => { if (ui.step === 'place') renderGrid(); });

/* ======================= ③ FLOOR ======================= */
const brush = { block: 'coat', trim: 'rubber' };
panels.matBrush = () => brush;
const swatches = {}; const blockSwatch = k => swatches[k] || (swatches[k] = GP.S.blockSwatch(k));
panels.renderFloor = () => {
  const el = $('#panel-floor'), L = GP.L(), sum = GP.calc.matSummary(), so = ui.selObj();
  const selMat = so && so.k === 'mat' ? so.obj : null;
  el.innerHTML = `<p class="lead">고무블럭(500×500 · 25T)을 깔 구역을 그리면 장수와 마감재 개수가 자동으로 계산돼요. 벽에 붙은 변에는 마감재가 빠져요.</p>
  <section class="blk"><h3>${selMat ? '선택한 구역 바꾸기' : '① 깔 고무블럭 고르기'}</h3><div class="blocks">${Object.entries(GP.BLOCKS).map(([k, b]) => `<button class="block${(selMat ? selMat.block : brush.block) === k ? ' on' : ''}" data-block="${k}"><span class="swatch" style="background-image:url(${blockSwatch(k)})"></span><b>${b.name}</b><small>${GP.lib.matPrices[k + '|25'] ? U.won(GP.lib.matPrices[k + '|25']) + '원/장' : '25T'}</small></button>`).join('')}</div>
    <div class="fld"><span>마감재 (벽에 안 붙은 변에만)</span><div class="seg full" id="trimSeg">${[['rubber', '경사형 고무'], ['alu', '알루미늄 몰딩'], ['none', '없음']].map(([k, v]) => `<button data-tr="${k}" class="${(selMat ? selMat.trim : brush.trim) === k ? 'on' : ''}">${v}</button>`).join('')}</div></div></section>
  <section class="blk"><h3>② 구역 그리기</h3><div class="row3"><button class="btn sm" data-ft="matRect">${IC.matRect}사각형</button><button class="btn sm" data-ft="matPoly">${IC.matPoly}모양대로</button><button class="btn sm" data-ft="all">방 전체</button></div></section>
  <section class="blk"><h3>깐 구역 (${L.mats.length})</h3><div class="list">${L.mats.map(m => { const A = GP.calc.matArea(m); return `<button class="li${selMat === m ? ' on' : ''}" data-mat="${m.id}"><span class="sw" style="background-image:url(${blockSwatch(m.block)})"></span><span class="t"><b>${U.esc(GP.BLOCKS[m.block].name)}</b><small>${A.toFixed(1)}㎡ · ${(A / U.PY).toFixed(1)}평 · ${GP.TRIMS[m.trim].replace('경사형 ', '')}</small></span><span class="r">${GP.calc.matBlocks(m)}장</span></button>`; }).join('') || '<p class="note">아직 깐 구역이 없어요. 위에서 종류를 고르고 사각형이나 모양대로 그려 보세요.</p>'}</div></section>
  <section class="blk"><h3>합계</h3><div class="kv">${sum.blocks.map(b => `<span>${U.esc(GP.BLOCKS[b.block].name)} <small>(${b.area.toFixed(1)}㎡)</small></span><b>${b.count}장</b>`).join('') || '<span>고무블럭</span><b>0장</b>'}
    ${sum.trims.map(t => `<span>${GP.TRIMS[t.trim].replace('경사형 ', '')} 일자 (2400)</span><b>${t.straight}개</b><span>　모서리 / 역모서리 (300)</span><b>${t.outC} / ${t.inC}개</b><span>　드러난 변 길이</span><b>${t.len.toFixed(1)} m</b>`).join('')}</div>
    <label class="fld"><span>평당 블럭 장수 (잘린 조각 포함, 현장에 맞게)</span>${numI('bpp', GP.lib.defaults.blocksPerPyeong, 1, '장', 'min="4" max="30"')}</label></section>
  <section class="blk"><div class="blk-h"><h3>존 표시</h3><button class="btn xs" data-ft="zoneRect">＋ 그리기</button></div><div class="list">${L.zones.map(z => { const A = Math.abs(G.area(z.pts)); return `<button class="li${so && so.id === z.id ? ' on' : ''}" data-zone="${z.id}"><span class="sw" style="background:${z.color}"></span><span class="t"><b>${U.esc(z.name)}</b><small>${A.toFixed(1)}㎡ · ${(A / U.PY).toFixed(1)}평</small></span></button>`; }).join('') || '<p class="note">유산소 존, 웨이트 존처럼 영역을 표시하고 면적을 볼 수 있어요.</p>'}</div></section>`;
  GP.fillIcons(el);
};
const flEl = $('#panel-floor');
flEl.addEventListener('click', e => {
  const t = e.target, so = ui.selObj(), selMat = so && so.k === 'mat' ? so.obj : null;
  const b = t.closest('[data-block]'); if (b) { const k = b.dataset.block; if (selMat) { selMat.block = k; GP.changed('mats'); } brush.block = k; panels.renderFloor(); return; }
  const tr2 = t.closest('[data-tr]'); if (tr2) { if (selMat) { selMat.trim = tr2.dataset.tr; GP.changed('mats'); } brush.trim = tr2.dataset.tr; panels.renderFloor(); return; }
  const ft = t.closest('[data-ft]'); if (ft) { const k = ft.dataset.ft; if (k === 'all') { GP.tools.addMat(GP.L().room.pts.map(p => p.slice())); panels.renderFloor(); return; } ui.setTool(k); return; }
  const m = t.closest('[data-mat]'); if (m) { ui.select([{ k: 'mat', id: m.dataset.mat }]); return; }
  const z = t.closest('[data-zone]'); if (z) { ui.select([{ k: 'zone', id: z.dataset.zone }]); return; }
});
flEl.addEventListener('change', e => { if (e.target.id === 'bpp') { GP.lib.defaults.blocksPerPyeong = U.clamp(+e.target.value || 13, 4, 30); GP.saveLib(); GP.changed('mats', { commit: false }); panels.renderFloor(); } });

/* ======================= QUOTE (full sheet) ======================= */
const Q = GP.quote = {};
Q.itemKey = it => { const d = GP.dims(it); return [it.type, U.cm(d.w), U.cm(d.d), U.cm(d.h), JSON.stringify(it.params || null)].join('|'); };
Q.compute = () => {
  const L = GP.L(), lib = GP.lib, groups = [];
  const eq = new Map();
  for (const it of L.items) { if (GP.info.NO_QUOTE.has(it.type)) continue; const k = Q.itemKey(it); const g = eq.get(k) || { type: it.type, it, n: 0 }; g.n++; eq.set(k, g); }
  const order = GP.CATS.map(c => c.id);
  const eqRows = [...eq.values()].sort((a, b) => order.indexOf(GP.getDef(a.type).cat) - order.indexOf(GP.getDef(b.type).cat) || GP.typeName(a.type).localeCompare(GP.typeName(b.type), 'ko')).map(g => { const d = GP.dims(g.it); const pk = 'type:' + g.type; return { name: GP.typeName(g.type), spec: `${U.cm(d.w)}×${U.cm(d.d)}×${U.cm(d.h)}`, qty: g.n, unit: '대', price: lib.prices[g.type] || 0, pk }; });
  if (eqRows.length) groups.push({ name: '운동기구·물품', rows: eqRows });
  const ms = GP.calc.matSummary(); const flRows = [];
  ms.blocks.forEach(b => flRows.push({ name: `${GP.BLOCKS[b.block].name} 25T`, spec: '500×500', qty: b.count, unit: '장', price: lib.matPrices[`${b.block}|25`] || 0, pk: `mat:${b.block}|25` }));
  ms.trims.forEach(t => { const nm = GP.TRIMS[t.trim]; [['straight', '일자', 2400, t.straight], ['out', '모서리', 300, t.outC], ['in', '역모서리', 300, t.inC]].forEach(([pc, pn, len, q]) => { if (q > 0) flRows.push({ name: `${nm} 25T ${pn}`, spec: `${len}mm`, qty: q, unit: '개', price: lib.trimPrices[`${t.trim}|25|${pc}`] || 0, pk: `trim:${t.trim}|25|${pc}` }); }); });
  if (flRows.length) groups.push({ name: '바닥재·마감재', rows: flRows });
  const pl2 = GP.calc.partLength(); const ptRows = Object.entries(pl2).filter(([, v]) => v > 0).map(([k, v]) => ({ name: GP.PARTS[k], spec: '시공', qty: U.r2(v), unit: 'm', price: lib.partPrices[k] || 0, pk: 'part:' + k }));
  if (ptRows.length) groups.push({ name: '가벽', rows: ptRows });
  const q = L.quote; const ex = (q.extras || []).map((x, i) => ({ name: x.name || '항목', spec: x.spec || '', qty: +x.qty || 0, unit: x.unit || '식', price: +x.price || 0, extra: i }));
  const ship = q.shipping ?? lib.defaults.shipping ?? 0, inst = q.install ?? lib.defaults.install ?? 0;
  if (ex.length) groups.push({ name: '소도구·기타 품목', rows: ex });
  const si = []; if (ship > 0) si.push({ name: '운송비', spec: '', qty: 1, unit: '식', price: ship, fixed: 'shipping' }); if (inst > 0) si.push({ name: '설치비', spec: '', qty: 1, unit: '식', price: inst, fixed: 'install' });
  if (si.length) groups.push({ name: '운송·설치', rows: si });
  let sub = 0; groups.forEach(g => g.rows.forEach(r => { r.amount = Math.round(r.qty * r.price); sub += r.amount; }));
  const disc = Math.round(sub * (+q.discountPct || 0) / 100) + (+q.discountAmt || 0);
  const supply = Math.max(0, sub - disc), vat = Math.round(supply * .1);
  const missing = groups.reduce((n, g) => n + g.rows.filter(r => !r.price && r.pk).length, 0);
  return { groups, sub, disc, supply, vat, total: supply + vat, missing };
};
/* installment / lease estimate: monthly payment at the low and high end of the rate range the salesperson enters
   (the real rate depends on the buyer's credit). Lease: the residual value is left at the end (balloon). */
Q.fin = (q) => Object.assign({}, GP.lib.defaults.finance, q.finance || {});
Q.monthly = (amount, f, ratePct) => {
  const P = Math.max(0, amount * (1 - (+f.downPct || 0) / 100)), RV = f.kind === 'lease' ? amount * (+f.rvPct || 0) / 100 : 0, n = Math.max(1, +f.months || 36), r = (+ratePct || 0) / 1200;
  if (r <= 0) return Math.max(0, (P - RV) / n);
  return Math.max(0, (P - RV / Math.pow(1 + r, n)) * r / (1 - Math.pow(1 + r, -n)));
};
Q.finance = (R) => {
  const f = Q.fin(GP.L().quote), amt = R.total, lo = Math.min(+f.rateLo || 0, +f.rateHi || 0), hi = Math.max(+f.rateLo || 0, +f.rateHi || 0);
  const mLo = Math.round(Q.monthly(amt, f, lo) / 100) * 100, mHi = Math.round(Q.monthly(amt, f, hi) / 100) * 100;
  const down = Math.round(amt * (+f.downPct || 0) / 100), rv = f.kind === 'lease' ? Math.round(amt * (+f.rvPct || 0) / 100) : 0;
  return { f, amt, lo, hi, mLo, mHi, down, rv, n: +f.months || 36, totLo: down + mLo * (+f.months || 36) + rv, totHi: down + mHi * (+f.months || 36) + rv };
};
Q.setPrice = (pk, v) => { const lib = GP.lib; const [kind, key] = [pk.slice(0, pk.indexOf(':')), pk.slice(pk.indexOf(':') + 1)]; if (kind === 'type') lib.prices[key] = v; else if (kind === 'mat') lib.matPrices[key] = v; else if (kind === 'trim') lib.trimPrices[key] = v; else if (kind === 'part') lib.partPrices[key] = v; GP.saveLib(); };
Q.no = () => { const q = GP.L().quote; if (!q.no) { const d = new Date(); q.no = `GF-${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${String(Math.floor(Math.random() * 900) + 100)}`; } return q.no; };
/* quote-only items: common small equipment, then names used before */
const EXTRA_PRESETS = [['덤벨 세트', '2~30kg', '세트'], ['바벨·원판 세트', '', '세트'], ['케틀벨 세트', '', '세트'], ['덤벨 거치대', '', '개'], ['요가·스트레칭 매트', '', '개'], ['폼롤러', '', '개'], ['밴드·튜빙 세트', '', '세트'], ['메디신볼 세트', '', '세트'], ['짐볼', '', '개'], ['플라이오 박스', '', '개']];
function extraChips() { const seen = new Set(EXTRA_PRESETS.map(p => p[0])); return (GP.lib.extraRecent || []).filter(n => n && !seen.has(n)).map(n => [n, '', '식']).concat(EXTRA_PRESETS); }
panels.renderQuote = () => {
  const qs = $('#quoteSheet'); if (qs.hidden) return; const R = Q.compute(), q = GP.L().quote, lib = GP.lib;
  qs.innerHTML = `<div class="qtool"><button class="btn" data-q="close">← 도면으로</button><b class="qt-title">견적서</b><div class="acts" style="flex:0"><button class="btn" data-q="prices">${IC.gear} 단가 한 번에</button><button class="btn primary" data-q="pdf">${IC.pdf} 견적서 PDF</button></div></div>
  <div class="qwrap"><aside class="qside">
    <section class="blk"><div class="kv"><span>부가세 별도</span><b>${U.won(R.supply)}원</b><span>부가세 10%</span><b>${U.won(R.vat)}원</b><span class="big"><b>부가세 포함</b></span><b class="big">${U.won(R.total)}원</b></div>${R.missing ? `<p class="note" style="color:var(--amber)">가격 미입력 ${R.missing}개 — 노란 칸에 단가를 넣으면 다음부터 기억해요.</p>` : ''}</section>
    <section class="blk"><h3>추가 비용 · 할인</h3><div class="row2"><label class="fld"><span>운송비</span>${numI('qShip', q.shipping ?? lib.defaults.shipping ?? 0, 10000, '원')}</label><label class="fld"><span>설치비</span>${numI('qInst', q.install ?? lib.defaults.install ?? 0, 10000, '원')}</label></div><div class="row2"><label class="fld"><span>할인율</span>${numI('qDp', q.discountPct || 0, 1, '%', 'min="0" max="100"')}</label><label class="fld"><span>할인 금액</span>${numI('qDa', q.discountAmt || 0, 10000, '원', 'min="0"')}</label></div></section>
    <section class="blk"><div class="blk-h"><h3>견적에만 넣는 품목</h3><button class="btn xs" id="qAdd">＋ 직접 입력</button></div><p class="note">덤벨·원판처럼 도면에 놓기 애매한 소도구는 여기서 넣어요. 눌러서 바로 추가:</p>
      <div class="xchips">${extraChips().map(([n, sp, un]) => `<button class="chip" data-xadd="${U.esc(n)}" data-sp="${U.esc(sp)}" data-un="${U.esc(un)}">＋ ${U.esc(n)}${lib.extraPrices[n] ? ` <small>${U.won(lib.extraPrices[n])}원</small>` : ''}</button>`).join('')}</div>
      ${(q.extras || []).length ? `<div class="xrows">${q.extras.map((x, i) => `<div class="xrow"><input class="xn" data-x="${i}" data-f="name" value="${U.esc(x.name || '')}" placeholder="품목 이름"><input class="xs" data-x="${i}" data-f="spec" value="${U.esc(x.spec || '')}" placeholder="규격 (선택)"><div class="xq"><input data-x="${i}" data-f="qty" type="number" min="0" value="${x.qty ?? 1}" aria-label="수량"><select data-x="${i}" data-f="unit" aria-label="단위">${['개', '세트', '식', 'm', '박스'].map(u => `<option${(x.unit || '식') === u ? ' selected' : ''}>${u}</option>`).join('')}</select></div><div class="unit xp"><input data-x="${i}" data-f="price" type="number" step="1000" min="0" value="${x.price || ''}" placeholder="단가"><em>원</em></div><button class="x" data-xdel="${i}" aria-label="삭제">×</button></div>`).join('')}</div>` : ''}</section>
    ${finBlock(R, q)}
    <section class="blk"><h3>견적 정보</h3><div class="row2"><label class="fld"><span>견적 번호</span><input id="qNo" value="${U.esc(Q.no())}"></label><label class="fld"><span>유효기간</span>${numI('qValid', q.validDays ?? lib.defaults.validDays ?? 30, 1, '일')}</label></div><label class="fld"><span>비고 (견적서 아래에 들어가요)</span><textarea id="qNote" rows="3" placeholder="예: 설치 일정 협의, 배송 조건 등">${U.esc(q.note || '')}</textarea></label></section>
  </aside><div class="qmain">${sheetHtml(R)}</div></div>`;
  GP.fillIcons(qs);
};
function finBlock(R, q) {
  const F = Q.finance(R), f = F.f, lease = f.kind === 'lease';
  return `<section class="blk"><div class="blk-h"><h3>할부·리스 월 납입 <small class="note">(예상)</small></h3><label class="tg-s"><input type="checkbox" id="fOn" ${f.show ? 'checked' : ''}> 견적서에 넣기</label></div>
    <div class="seg sm fin-kind"><button data-fk="install" class="${lease ? '' : 'on'}">할부</button><button data-fk="lease" class="${lease ? 'on' : ''}">리스</button></div>
    <div class="row2"><label class="fld"><span>기간</span><select id="fMonths">${[12, 24, 36, 48, 60].map(m => `<option value="${m}"${F.n === m ? ' selected' : ''}>${m}개월</option>`).join('')}</select></label><label class="fld"><span>선수금</span>${numI('fDown', f.downPct || 0, 5, '%', 'min="0" max="90"')}</label></div>
    <div class="row2"><label class="fld"><span>연 금리 (낮을 때)</span>${numI('fLo', f.rateLo, .5, '%', 'min="0" max="40"')}</label><label class="fld"><span>연 금리 (높을 때)</span>${numI('fHi', f.rateHi, .5, '%', 'min="0" max="40"')}</label></div>
    ${lease ? `<label class="fld"><span>만기 잔존가치</span>${numI('fRv', f.rvPct || 0, 5, '%', 'min="0" max="60"')}</label>` : ''}
    <div class="fin-out">${R.total > 0 ? `<span>월 약</span><b>${U.won(F.mLo)}${F.mHi !== F.mLo ? ` ~ ${U.won(F.mHi)}` : ''}원</b><small>${F.n}개월 · 연 ${F.lo}${F.hi !== F.lo ? `~${F.hi}` : ''}% 기준${F.down ? ` · 선수금 ${U.won(F.down)}원` : ''}${F.rv ? ` · 만기 잔존가치 ${U.won(F.rv)}원` : ''}</small><small>총 납입 약 ${U.won(F.totLo)}${F.totHi !== F.totLo ? ` ~ ${U.won(F.totHi)}` : ''}원</small>` : '<small>단가를 넣으면 월 납입금이 계산돼요.</small>'}</div>
    <p class="note">금리는 구매자 신용도와 금융사 심사에 따라 달라져요. 예상 범위로 안내하고, 확정 조건은 금융사 승인 후 알려 주세요.</p></section>`;
}
function sheetHtml(R) {
  const P = GP.P, q = GP.L().quote, co = GP.lib.company;
  const valid = q.validDays ?? GP.lib.defaults.validDays ?? 30; const vd = new Date(Date.now() + valid * 864e5);
  return `<div class="qdoc" id="qdoc"><h1>견 적 서</h1>
   <div class="qhead"><div class="qbox"><span>수신</span><b>${U.esc(P.client || '고객사')} 귀하</b><span>프로젝트</span><b>${U.esc(P.name)}${P.variants.length > 1 ? ' · ' + U.esc(P.variants[P.cur].name) : ''}</b><span>견적 번호</span><b>${U.esc(Q.no())}</b><span>견적일</span><b>${U.today()}</b><span>유효기간</span><b>${vd.getFullYear()}.${String(vd.getMonth() + 1).padStart(2, '0')}.${String(vd.getDate()).padStart(2, '0')}까지</b></div>
   <div class="qbox"><span>공급자</span><b>${U.esc(co.name || 'GOFIT KOREA')}</b>${co.ceo ? `<span>대표</span><b>${U.esc(co.ceo)}</b>` : ''}${co.bizNo ? `<span>사업자번호</span><b>${U.esc(co.bizNo)}</b>` : ''}${co.addr ? `<span>주소</span><b>${U.esc(co.addr)}</b>` : ''}${co.tel ? `<span>연락처</span><b>${U.esc(co.tel)}</b>` : ''}${P.consultant ? `<span>담당</span><b>${U.esc(P.consultant)}</b>` : ''}</div></div>
   <div class="qsum"><span>합계 금액 (부가세 포함)</span><b>₩ ${U.won(R.total)}</b></div>
   <table class="qtbl"><thead><tr><th>품목</th><th>규격</th><th style="width:60px">수량</th><th style="width:130px">단가</th><th style="width:120px">금액</th></tr></thead><tbody>
   ${R.groups.map(g => `<tr class="grp"><td colspan="5">${U.esc(g.name)}</td></tr>` + g.rows.map(r => `<tr><td>${U.esc(r.name)}</td><td class="c">${U.esc(r.spec)}</td><td class="n">${r.qty} ${r.unit}</td><td class="n">${r.pk ? `<input class="price" data-pk="${r.pk}" type="number" step="1000" value="${r.price || ''}" placeholder="단가 입력">` : U.won(r.price)}</td><td class="n">${U.won(r.amount)}</td></tr>`).join('')).join('') || '<tr><td colspan="5" class="c">도면에 기구를 놓으면 품목이 자동으로 들어와요</td></tr>'}
   </tbody></table>
   <div class="qtot"><span>소계</span><b>${U.won(R.sub)}원</b>${R.disc ? `<span>할인</span><b>-${U.won(R.disc)}원</b>` : ''}<span>공급가 (부가세 별도)</span><b>${U.won(R.supply)}원</b><span>부가세 (10%)</span><b>${U.won(R.vat)}원</b><span class="big">합계 (부가세 포함)</span><b class="big">${U.won(R.total)}원</b></div>
   ${Q.fin(q).show && R.total > 0 ? (() => { const F = Q.finance(R); return `<div class="qfin"><b>${F.f.kind === 'lease' ? '리스' : '할부'} 예상 월 납입금</b><span>월 약 ${U.won(F.mLo)}${F.mHi !== F.mLo ? ` ~ ${U.won(F.mHi)}` : ''}원 <small>(${F.n}개월 · 연 ${F.lo}${F.hi !== F.lo ? `~${F.hi}` : ''}% 기준${F.down ? ` · 선수금 ${U.won(F.down)}원` : ''}${F.rv ? ` · 만기 잔존가치 ${U.won(F.rv)}원` : ''})</small></span><small>※ 예상 금액이며, 실제 금리와 조건은 신용도 및 금융사 심사에 따라 달라집니다.</small></div>`; })() : ''}
   ${q.note ? `<div class="qnote">${U.esc(q.note)}</div>` : ''}</div>`;
}
const qs = $('#quoteSheet');
qs.addEventListener('click', e => {
  const b = e.target.closest('[data-q]'); if (b) { const a = b.dataset.q; if (a === 'pdf') GP.exp.quotePdf(); else if (a === 'prices') panels.settings('prices'); else if (a === 'close') ui.closeQuote(); return; }
  if (e.target.id === 'qAdd') { const q = GP.L().quote; (q.extras = q.extras || []).push({ name: '', qty: 1, unit: '개', price: 0 }); GP.H.commit(); panels.renderQuote(); const ins = $$('#quoteSheet .xn'); if (ins.length) ins[ins.length - 1].focus(); return; }
  const xa = e.target.closest('[data-xadd]'); if (xa) { const q = GP.L().quote, n = xa.dataset.xadd; (q.extras = q.extras || []).push({ name: n, spec: xa.dataset.sp || '', qty: 1, unit: xa.dataset.un || '식', price: GP.lib.extraPrices[n] || 0 }); GP.H.commit(); panels.renderQuote(); ui.renderSummary(); GP.toast(`'${n}'을(를) 견적에 넣었어요${GP.lib.extraPrices[n] ? '' : ' · 단가를 입력해 주세요'}`); return; }
  const xd = e.target.closest('[data-xdel]'); if (xd) { GP.L().quote.extras.splice(+xd.dataset.xdel, 1); GP.H.commit(); panels.renderQuote(); return; }
  const fk = e.target.closest('[data-fk]'); if (fk) { setFin({ kind: fk.dataset.fk }); return; }
});
qs.addEventListener('change', e => {
  const t = e.target, q = GP.L().quote, v = +t.value;
  if (t.dataset.pk) { Q.setPrice(t.dataset.pk, Math.max(0, v || 0)); panels.renderQuote(); ui.renderSummary(); return; }
  const fm = { fMonths: 'months', fDown: 'downPct', fLo: 'rateLo', fHi: 'rateHi', fRv: 'rvPct' }[t.id];
  if (fm) { setFin({ [fm]: U.clamp(v || 0, 0, fm === 'months' ? 120 : 100) }); return; }
  if (t.id === 'fOn') { setFin({ show: t.checked }); return; }
  if (t.id === 'qShip') q.shipping = v || 0; else if (t.id === 'qInst') q.install = v || 0; else if (t.id === 'qDp') q.discountPct = U.clamp(v || 0, 0, 100); else if (t.id === 'qDa') q.discountAmt = Math.max(0, v || 0);
  else if (t.id === 'qNo') q.no = t.value; else if (t.id === 'qValid') q.validDays = Math.max(1, v || 30); else if (t.id === 'qNote') q.note = t.value;
  else if (t.dataset.x != null) {
    const x = q.extras[+t.dataset.x], f = t.dataset.f; if (!x) return;
    x[f] = ['name', 'spec', 'unit'].includes(f) ? t.value.trim() : Math.max(0, +t.value || 0);
    const nm = (x.name || '').trim(), lib = GP.lib;     // remember the price and the name for next time
    if (nm && (f === 'price' || f === 'name')) { if (x.price > 0) lib.extraPrices[nm] = x.price; lib.extraRecent = [nm].concat((lib.extraRecent || []).filter(v => v !== nm)).slice(0, 8); GP.saveLib(); }
  }
  else return;
  GP.H.commit(); panels.renderQuote(); ui.renderSummary();
});
/* finance terms: kept on the quote; the terms (not the on/off) also become this device's default for the next quote */
function setFin(o) {
  const q = GP.L().quote; q.finance = Object.assign(Q.fin(q), o);
  const d = Object.assign({}, q.finance); delete d.show; GP.lib.defaults.finance = d; GP.saveLib();
  GP.H.commit(); panels.renderQuote();
}
qs.addEventListener('keydown', e => { if (e.target.dataset.pk && e.key === 'Enter') { e.target.blur(); } });

/* ======================= dialogs ======================= */
panels.editProjectInfo = () => {
  const P = GP.P;
  GP.modal('프로젝트 정보', `<label class="fld"><span>프로젝트 이름</span><input id="piName" value="${U.esc(P.name)}" autofocus></label><div class="row2"><label class="fld"><span>고객사</span><input id="piClient" value="${U.esc(P.client)}" placeholder="예: ○○피트니스 강남점"></label><label class="fld"><span>담당 컨설턴트</span><input id="piCons" value="${U.esc(P.consultant)}"></label></div>`, `<button class="btn" data-close>취소</button><button class="btn primary" id="piOk">저장</button>`, { size: 'narrow' });
  $('#piOk').onclick = () => { P.name = $('#piName').value.trim() || P.name; P.client = $('#piClient').value.trim(); P.consultant = $('#piCons').value.trim(); GP.closeModal(); GP.H.commit(); GP.emit('project'); };
};
panels.projects = async () => {
  const list = await GP.listProjects();
  const body = `<div class="blk-h"><p class="note" style="margin:0">이 기기에 저장된 프로젝트예요. 다른 PC로 옮길 땐 메뉴의 <b>프로젝트 파일 저장</b>을 쓰세요.</p><button class="btn primary sm" id="pjNew">＋ 새 프로젝트</button></div>
   <div class="proj-grid">${list.map(r => `<div class="proj-card${r.id === GP.P.id ? ' cur' : ''}"><img class="pt" src="${r.thumb || ''}" alt="" data-open="${r.id}" style="cursor:pointer"><div class="pi"><b>${U.esc(r.name)}</b><small>${U.esc(r.client || '')} · ${U.stamp(r.updatedAt)}</small></div><div class="pa"><button class="btn xs" data-open="${r.id}">열기</button><button class="btn xs" data-dup="${r.id}">복제</button><button class="btn xs danger" data-pdel="${r.id}">삭제</button></div></div>`).join('') || '<p class="empty">저장된 프로젝트가 없어요.</p>'}</div>`;
  GP.modal('내 프로젝트', body, '', { size: 'wide' });
  const mb = $('#modalBody');
  mb.onclick = async e => {
    if (e.target.id === 'pjNew') { GP.closeModal(); panels.wizard(); return; }
    const o = e.target.closest('[data-open]'); if (o) { GP.closeModal(); await GP.app.openProject(o.dataset.open); return; }
    const d = e.target.closest('[data-dup]'); if (d) { const r = list.find(x => x.id === d.dataset.dup); if (r) { const p = GP.validateProject(U.clone(r.data)); p.id = U.uid('p'); p.name = p.name + ' (복사)'; await GP.DB.put('projects', p.id, { id: p.id, name: p.name, client: p.client, updatedAt: Date.now(), thumb: r.thumb, data: p }); panels.projects(); } return; }
    const x = e.target.closest('[data-pdel]'); if (x) { const r = list.find(q => q.id === x.dataset.pdel); if (!r) return; if (!(await GP.confirm(`'${r.name}' 프로젝트를 삭제할까요? 이 기기에서 지워지고 되돌릴 수 없어요.`, '삭제', true))) { panels.projects(); return; } await GP.deleteProject(r.id); if (r.id === GP.P.id) { const rest = (await GP.listProjects()); if (rest.length) await GP.app.openProject(rest[0].id); else await GP.app.newProject({ sample: true }); } panels.projects(); }
  };
};
panels.wizard = () => {
  const w = { step: 1, mode: 'py', py: 60, ratio: 1.5, name: '', client: '', consultant: GP.lib.lastConsultant || '' };
  const render = () => {
    let body = '';
    if (w.step === 1) body = `<div class="wiz"><p class="note">새 프로젝트를 시작해요. 이름과 고객사만 넣으면 돼요.</p><label class="fld"><span>프로젝트 이름</span><input id="wzName" value="${U.esc(w.name)}" placeholder="예: 강남 PT 스튜디오 리뉴얼" autofocus></label><div class="row2"><label class="fld"><span>고객사</span><input id="wzClient" value="${U.esc(w.client)}"></label><label class="fld"><span>담당 컨설턴트</span><input id="wzCons" value="${U.esc(w.consultant)}"></label></div></div>`;
    else body = `<div class="wiz"><p class="note">공간을 어떻게 시작할까요?</p><div class="wiz-opts">${[['py', '평수로', '평수와 가로·세로 비율만 넣으면 직사각형으로 시작해요'], ['shape', '모양 템플릿', 'L자형, 사선 모서리, 사다리꼴'], ['walk', '실측 입력', '현장에서 잰 벽 길이를 차례로 입력'], ['trace', '도면 대고 그리기', '받은 평면도 사진이나 DXF를 깔고 따라 그려요'], ['sample', '예시 도면', '60평 샘플로 기능을 둘러봐요']].map(([k, t, s]) => `<button class="wiz-opt${w.mode === k ? ' on' : ''}" data-wm="${k}"><b>${t}</b><small>${s}</small></button>`).join('')}</div>${w.mode === 'py' ? `<div class="row2"><label class="fld"><span>평수</span>${numI('wzPy', w.py, 1, '평', 'min="3"')}</label><label class="fld"><span>가로 : 세로</span><select id="wzRatio">${[[1, '1 : 1'], [1.3333, '4 : 3'], [1.5, '3 : 2'], [2, '2 : 1']].map(([v, l]) => `<option value="${v}" ${w.ratio === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label></div>` : ''}</div>`;
    GP.modal('새 프로젝트', body, w.step === 1 ? `<button class="btn" data-close>취소</button><button class="btn primary" id="wzNext">다음</button>` : `<button class="btn" id="wzBack">이전</button><button class="btn primary" id="wzGo">시작하기</button>`, { size: 'narrow' });
    const mb = $('#modalBody');
    mb.onclick = e => { const o = e.target.closest('[data-wm]'); if (o) { save(); w.mode = o.dataset.wm; render(); } };
    const nx = $('#wzNext'); if (nx) nx.onclick = () => { save(); w.step = 2; render(); };
    const bk = $('#wzBack'); if (bk) bk.onclick = () => { save(); w.step = 1; render(); };
    const go = $('#wzGo'); if (go) go.onclick = async () => { save(); GP.closeModal(); GP.lib.lastConsultant = w.consultant; GP.saveLib(); await GP.app.newProject(w); };
  };
  const save = () => { const g = id => $('#' + id); if (g('wzName')) { w.name = g('wzName').value.trim(); w.client = g('wzClient').value.trim(); w.consultant = g('wzCons').value.trim(); } if (g('wzPy')) { w.py = +g('wzPy').value || 60; w.ratio = +g('wzRatio').value || 1.5; } };
  render();
};
/* ---------- A안·B안 비교: every variant computed in turn (plan picture, equipment, space, floor, quote, checks) ---------- */
panels.compare = () => {
  const P = GP.P, keep = P.cur; if (P.variants.length < 2) { GP.toast('안이 하나뿐이에요. 위쪽 ＋로 B안을 만들면 비교할 수 있어요'); return; }
  const catName = c => GP.lib.catNames[c] || (GP.CATS.find(x => x.id === c) || {}).name || c;
  const V = P.variants.map((v, i) => {
    P.cur = i; GP.S.dataChanged();
    const L = GP.L(), R = GP.quote.compute(), list = GP.checks.full(), occ = GP.calc.occupancy(), ms = GP.calc.matSummary(), pl = GP.calc.partLength();
    const byCat = {}; let eqN = 0; L.items.forEach(it => { if (GP.info.NO_QUOTE.has(it.type)) return; const c = (GP.getDef(it.type) || {}).cat; byCat[c] = (byCat[c] || 0) + 1; eqN++; });
    let img = ''; try { img = GP.exp.planImage(420, 280, { notes: false, labels: false }).toDataURL('image/jpeg', .82); } catch (e) { }
    return { name: v.name, img, eqN, byCat, room: occ.room, foot: occ.foot, used: occ.used, blocks: ms.blocks.reduce((n, b) => n + b.count, 0), part: Object.values(pl).reduce((a, b) => a + b, 0), total: R.total, missing: R.missing, err: list.filter(c => c.sev === 'err').length, warn: list.filter(c => c.sev === 'warn').length, aisle: (GP.checks.aisle && GP.checks.aisle.comps.length) || 0 };
  });
  P.cur = keep; GP.S.dataChanged(); GP.checks.full(); GP.S.invalidate();
  const pct = (a, b) => b > 0 ? Math.round(a / b * 100) : 0;
  const diff = (v, base, fmt, unit) => { const d = v - base; if (Math.abs(d) < 1e-9) return ''; return ` <small class="cmp-d ${d > 0 ? 'up' : 'dn'}">${d > 0 ? '+' : '−'}${fmt(Math.abs(d))}${unit || ''}</small>`; };
  const row = (label, f, num) => `<tr><th>${label}</th>${V.map((v, i) => `<td>${f(v)}${num && i ? diff(num(v), num(V[0]), num.fmt || (x => U.won(Math.round(x))), num.unit) : ''}</td>`).join('')}</tr>`;
  const won = Object.assign(v => v.total, { fmt: x => U.won(Math.round(x)), unit: '원' });
  const html = `<div class="cmp-wrap"><table class="cmp-tbl"><thead><tr><th></th>${V.map((v, i) => `<th>${U.esc(v.name)}${i === keep ? ' <small>(지금 보는 안)</small>' : ''}</th>`).join('')}</tr></thead><tbody>
    <tr><th>도면</th>${V.map(v => `<td>${v.img ? `<img src="${v.img}" alt="">` : ''}</td>`).join('')}</tr>
    ${row('기구 수', v => `<b>${v.eqN}대</b>`, Object.assign(v => v.eqN, { fmt: x => x, unit: '대' }))}
    ${row('구성', v => Object.entries(v.byCat).sort((a, b) => b[1] - a[1]).map(([c, k]) => `${U.esc(catName(c))} ${k}`).join(' · ') || '-')}
    ${row('기구가 차지하는 면적', v => `${U.r2(v.foot)}㎡ <small>(${pct(v.foot, v.room)}%)</small>`, Object.assign(v => v.foot, { fmt: x => U.r2(x), unit: '㎡' }))}
    ${row('사용 공간 포함', v => `${U.r2(v.used)}㎡ <small>(${pct(v.used, v.room)}%)</small>`, Object.assign(v => v.used, { fmt: x => U.r2(x), unit: '㎡' }))}
    ${row('고무블럭', v => v.blocks ? `${v.blocks}장` : '-', Object.assign(v => v.blocks, { fmt: x => x, unit: '장' }))}
    ${row('가벽', v => v.part ? `${U.r2(v.part)}m` : '-', Object.assign(v => v.part, { fmt: x => U.r2(x), unit: 'm' }))}
    ${row('견적 합계 (부가세 포함)', v => `<b>${U.won(v.total)}원</b>${v.missing ? `<br><small class="cmp-miss">가격 미입력 ${v.missing}개</small>` : ''}`, won)}
    ${row('배치 점검', v => v.err + v.warn ? `<span class="cmp-bad">확인할 점 ${v.err + v.warn}개</span>${v.aisle ? ` <small>(좁은 통로 ${v.aisle}곳)</small>` : ''}` : '<span class="cmp-ok">이상 없음</span>')}
    <tr><th></th>${V.map((v, i) => `<td>${i === keep ? '' : `<button class="btn sm" data-cmpgo="${i}">${U.esc(v.name)} 보기</button>`}</td>`).join('')}</tr>
  </tbody></table></div><p class="note">숫자 옆 작은 글씨는 ${U.esc(V[0].name)}과의 차이예요. 사용 공간은 기구 앞뒤로 운동할 때 필요한 공간까지 포함한 면적이에요.</p>`;
  GP.modal('안 비교', html, '<button class="btn primary" data-close>닫기</button>', { size: 'wide' });
  $('#modalBody').onclick = e => { const b = e.target.closest('[data-cmpgo]'); if (!b) return; GP.closeModal(); const vb = $(`#variants [data-var="${b.dataset.cmpgo}"]`); if (vb) vb.click(); };
};
panels.versions = async () => {
  const list = await GP.listVersions();
  GP.modal('버전 기록', `<p class="note">4분마다 자동으로 저장돼요. 원하는 때로 되돌릴 수 있어요 (되돌린 뒤에도 Ctrl+Z로 취소 가능).</p><div class="row2"><input id="verLbl" placeholder="이름 (예: 1차 제안)"><button class="btn" id="verSave">지금 버전 저장</button></div><div class="list">${list.map((v, i) => `<div class="li"><span class="t"><b>${U.esc(v.label || '자동 저장')}</b><small>${U.stamp(v.t)}</small></span><button class="btn xs" data-ver="${i}">이 버전으로</button></div>`).join('') || '<p class="empty">아직 저장된 버전이 없어요.</p>'}</div>`, '', { size: 'narrow' });
  $('#verSave').onclick = async () => { await GP.addVersion($('#verLbl').value.trim() || '수동 저장'); GP.toast('버전을 저장했어요'); panels.versions(); };
  $('#modalBody').onclick = e => { const b = e.target.closest('[data-ver]'); if (!b) return; const v = list[+b.dataset.ver]; GP.closeModal(); const o = JSON.parse(v.data); Object.assign(GP.P, o); GP.H.commit(); GP.emit('restore'); GP.toast(`${U.stamp(v.t)} 버전으로 되돌렸어요`, { action: '취소', onAction: () => GP.H.undo() }); };
};
panels.settings = (tab) => {
  tab = tab || 'prices'; const lib = GP.lib; let q = '';
  const tabs = [['prices', '기구 단가·이름'], ['floor', '바닥재·마감재·가벽'], ['base', '기준값'], ['company', '회사 정보'], ['offline', '사진·3D 저장소'], ['backup', '백업']];
  const render = () => {
    let body = `<div class="tabs">${tabs.map(([k, v]) => `<button data-tab="${k}" class="${tab === k ? 'on' : ''}">${v}</button>`).join('')}</div>`;
    if (tab === 'prices') {
      const types = Object.keys(GP.CAT).concat(Object.keys(lib.customTypes)).filter(k => { const d = GP.getDef(k); return !q || (GP.typeName(k) + d.name + d.kw).toLowerCase().includes(q.toLowerCase()); });
      body += `<div class="search">${IC.search}<input id="stQ" placeholder="찾기" value="${U.esc(q)}"></div><p class="note">이름을 바꾸면 목록·도면·견적서 모두에 적용돼요. 단가는 공급가(부가세 별도) 기준이에요. 비워 두면 도면과 링크에 '가격 미입력'으로 나와요.</p>
      <table class="tbl"><thead><tr><th>종류</th><th>이름</th><th style="width:130px">단가(원)</th><th style="width:44px">3D</th><th style="width:44px">숨김</th></tr></thead><tbody>${types.map(k => { const d = GP.getDef(k); return `<tr><td><span class="dot" style="--c:var(--cat-${d.cat})"></span> <small>${U.esc(GP.lib.catNames[d.cat] || (GP.CATS.find(c => c.id === d.cat) || {}).name || '')}</small></td><td><input data-name="${k}" value="${U.esc(GP.typeName(k))}" placeholder="${U.esc(d.name)}"></td><td><input data-price="${k}" type="number" step="1000" value="${lib.prices[k] || ''}"></td><td style="text-align:center;color:var(--ok)">${GP.R3.hasModel(k) ? '●' : ''}</td><td style="text-align:center"><input type="checkbox" data-hide="${k}" ${lib.hidden.includes(k) ? 'checked' : ''}></td></tr>`; }).join('')}</tbody></table>`;
    } else if (tab === 'floor') {
      body += `<p class="note">고무블럭은 장당, 마감재는 개당, 가벽은 m당 단가예요.</p><table class="tbl"><thead><tr><th>품목</th><th style="width:140px">단가(원)</th></tr></thead><tbody>
      ${Object.entries(GP.BLOCKS).map(([k, b]) => `<tr><td>${b.name} 25T (장)</td><td><input data-mp="${k}|25" type="number" step="100" value="${lib.matPrices[k + '|25'] || ''}"></td></tr>`).join('')}
      ${['rubber', 'alu'].map(tr2 => [['straight', '일자 2400'], ['out', '모서리 300'], ['in', '역모서리 300']].map(([pc, pn]) => `<tr><td>${GP.TRIMS[tr2]} 25T ${pn} (개)</td><td><input data-tp="${tr2}|25|${pc}" type="number" step="100" value="${lib.trimPrices[`${tr2}|25|${pc}`] || ''}"></td></tr>`).join('')).join('')}
      ${Object.entries(GP.PARTS).map(([k, v]) => `<tr><td>${v} (m)</td><td><input data-pp="${k}" type="number" step="1000" value="${lib.partPrices[k] || ''}"></td></tr>`).join('')}</tbody></table>`;
    } else if (tab === 'base') {
      const D = lib.defaults;
      body += `<div class="row2"><label class="fld"><span>평당 고무블럭 장수</span>${numI('dfBpp', D.blocksPerPyeong, 1, '장')}</label><label class="fld"><span>통로 최소 폭</span>${numI('dfAisle', Math.round(D.aisleMin * 100), 5, 'cm')}</label><label class="fld"><span>견적 유효기간</span>${numI('dfValid', D.validDays, 1, '일')}</label><label class="fld"><span>기본 운송비</span>${numI('dfShip', D.shipping, 10000, '원')}</label><label class="fld"><span>기본 설치비</span>${numI('dfInst', D.install, 10000, '원')}</label></div>`;
    } else if (tab === 'company') {
      const C = lib.company;
      body += `<p class="note">견적서와 제안서의 공급자 칸에 들어가요.</p><div class="row2">${[['name', '회사명'], ['ceo', '대표'], ['bizNo', '사업자등록번호'], ['tel', '연락처'], ['email', '이메일'], ['addr', '주소']].map(([k, l]) => `<label class="fld"><span>${l}</span><input data-co="${k}" value="${U.esc(C[k] || '')}"></label>`).join('')}</div>`;
    } else if (tab === 'offline') {
      const MD = GP.media, c = MD.gh.cfg(), u = GP.lib.mediaUsage, pend = MD.pending();
      const mb = v => (v / 1048576).toFixed(v < 10485760 ? 1 : 0) + 'MB';
      body += `<section class="blk"><h3>사진·3D 자동 저장 (GitHub · 무료)</h3>` + (c ? `
        <p class="note">연결됨: <b>${U.esc(c.owner)}/${U.esc(c.repo)}</b> · 등록한 사진·3D 파일이 인터넷이 될 때 자동으로 올라가고, 고객 링크에서도 보여요.</p>
        <div class="usage"><div class="ubar"><i style="width:${u ? Math.min(100, u.used / MD.LIMIT * 100).toFixed(1) : 0}%"></i></div><span>${u ? `${mb(u.used)} / 1GB` : '사용량 확인 전'}</span></div>
        <p class="note">${pend ? `올라갈 파일 ${pend}개가 기다리고 있어요.` : '모두 올라가 있어요.'} 저장소가 80% 넘게 차면 6개월 넘게 안 쓴 기구의 사진·3D부터 자동으로 정리해요.</p>
        <div class="acts"><button class="btn sm primary" id="ghSync">지금 올리기</button><button class="btn sm" id="ghUsage">사용량 확인</button><button class="btn sm danger" id="ghOff">연결 끊기</button></div><span class="note" id="ghStat"></span>` : `
        <p class="note">처음 한 번만 연결하면, 기구에 등록한 사진·3D 파일이 <b>자동으로</b> 올라가서 고객 링크에서도 보여요. 계정·열쇠 만들기는 아래 순서대로 직접 해 주세요.</p>
        <details class="blk" open><summary>연결 방법 (10분)</summary><ol class="steps-ol">
          <li><a href="https://github.com/signup" target="_blank" rel="noopener">github.com</a>에 무료로 가입해요.</li>
          <li>오른쪽 위 <b>＋ → New repository</b> → 이름 <b>gofit-media</b> → <b>Public</b> 선택 → <b>Create repository</b>.</li>
          <li>오른쪽 위 프로필 사진 → <b>Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token (classic)</b>.</li>
          <li>Note에 <b>gofit</b>, Expiration은 <b>No expiration</b>, 권한은 <b>public_repo</b> 하나만 체크 → <b>Generate token</b> → 나온 열쇠를 복사해요.</li>
          <li>아래에 GitHub 아이디, 저장소 이름, 열쇠를 넣고 <b>연결하기</b>를 눌러요.</li></ol></details>
        <div class="row3"><label class="fld"><span>GitHub 아이디</span><input id="ghOwner" autocomplete="off"></label><label class="fld"><span>저장소 이름</span><input id="ghRepo" value="gofit-media" autocomplete="off"></label><label class="fld"><span>열쇠 (토큰)</span><input id="ghToken" type="password" autocomplete="off"></label></div>
        <div class="acts"><button class="btn sm primary" id="ghOn">연결하기</button></div><span class="note" id="ghStat"></span>`) + `</section>
        <section class="blk"><h3>인터넷 없는 현장 대비</h3><p class="note">3D 모델은 처음 볼 때 받아서 이 기기에 저장돼요. 현장에 가기 전에 한 번 눌러 두면 어디서나 3D가 떠요. (약 15MB)</p><div class="row2"><button class="btn" id="m3All">3D 모델 전체 받아두기</button><span class="note" id="m3Stat"></span></div></section>`;
    } else {
      body += `<section class="blk"><h3>자동 백업 폴더</h3><div id="bkBox">${GP.backup.statusHtml()}</div></section>
        <section class="blk"><h3>모든 프로젝트를 파일 하나로</h3><p class="note">새 PC로 옮기거나 만일에 대비해 보관해요. 불러올 때는 메뉴 → 프로젝트 파일 열기에서 이 파일을 고르면, 없는 프로젝트만 추가되고 같은 프로젝트는 더 최근 것으로 남아요.</p><div class="acts"><button class="btn" id="bkAllSave">모든 프로젝트 저장</button></div></section>
        <section class="blk"><h3>설정 파일</h3><p class="note">단가·이름·내 물품·세트 같은 설정을 파일로 저장해 두거나 다른 기기로 옮길 수 있어요.</p><div class="row2"><button class="btn" id="libExport">설정 파일 저장</button><label class="btn" style="position:relative;overflow:hidden">설정 파일 불러오기<input type="file" id="libImport" accept=".json" style="position:absolute;inset:0;opacity:0"></label></div></section>`;
    }
    GP.modal('설정', body, '<button class="btn primary" data-close>닫기</button>', { size: 'wide', onClose: () => { GP.emit('library'); panels.renderQuote(); ui.renderSummary(); ui.renderInspector(); GP.changed([], { commit: false }); } });
    const mb = $('#modalBody');
    mb.onclick = e => { const t = e.target.closest('[data-tab]'); if (t) { tab = t.dataset.tab; render(); } if (e.target.id === 'm3All') GP.M3.prefetchAll($('#m3Stat'));
      const st = t2 => { const el = $('#ghStat'); if (el) el.textContent = t2; };
      if (e.target.id === 'ghOn') { const o = $('#ghOwner').value.trim(), r = $('#ghRepo').value.trim() || 'gofit-media', k = $('#ghToken').value.trim(); if (!o || !k) { st('아이디와 열쇠를 넣어 주세요'); return; } st('연결 확인 중…'); GP.media.gh.connect(o, r, k).then(res => { GP.toast(res.pages ? 'GitHub 저장소를 연결했어요' : 'GitHub을 연결했어요. 저장소 Settings → Pages에서 Branch를 main으로 켜 주세요', { ms: 6000 }); GP.media.sync(); render(); }).catch(err => st(err.status === 401 ? '열쇠가 맞지 않아요. 다시 복사해서 넣어 주세요' : err.status === 404 ? '저장소를 찾지 못했어요. 아이디와 저장소 이름을 확인해 주세요' : '연결하지 못했어요 (' + (err.message || err) + ')')); }
      if (e.target.id === 'ghSync') { st('올리는 중…'); GP.media.sync().then(r => { st(r && r.error ? '올리지 못했어요. 인터넷과 열쇠를 확인해 주세요' : '모두 올렸어요'); setTimeout(render, 900); }); }
      if (e.target.id === 'ghUsage') { st('확인 중…'); GP.media.cleanup().then(() => render()).catch(() => st('확인하지 못했어요')); }
      if (e.target.id === 'ghOff') { GP.confirm('GitHub 연결을 끊을까요? 이미 올라간 사진은 그대로 남아요.', '연결 끊기', true).then(ok => { if (ok) { GP.media.gh.disconnect(); render(); } }); } if (e.target.id === 'libExport') U.download(new Blob([JSON.stringify(GP.lib, null, 1)], { type: 'application/json' }), 'gofit-설정.json'); };
    mb.oninput = e => { if (e.target.id === 'stQ') { q = e.target.value; const pos = e.target.selectionStart; render(); const i = $('#stQ'); i.focus(); i.setSelectionRange(pos, pos); } };
    mb.onchange = async e => {
      const t = e.target, v = +t.value;
      if (t.dataset.name) { const k = t.dataset.name; if (t.value.trim() && t.value.trim() !== GP.getDef(k).name) lib.names[k] = t.value.trim(); else delete lib.names[k]; }
      else if (t.dataset.price) lib.prices[t.dataset.price] = Math.max(0, v || 0);
      else if (t.dataset.hide) { const k = t.dataset.hide; lib.hidden = lib.hidden.filter(x => x !== k); if (t.checked) lib.hidden.push(k); }
      else if (t.dataset.mp) lib.matPrices[t.dataset.mp] = Math.max(0, v || 0);
      else if (t.dataset.tp) lib.trimPrices[t.dataset.tp] = Math.max(0, v || 0);
      else if (t.dataset.pp) lib.partPrices[t.dataset.pp] = Math.max(0, v || 0);
      else if (t.dataset.co) lib.company[t.dataset.co] = t.value.trim();
      else if (t.id === 'dfBpp') lib.defaults.blocksPerPyeong = U.clamp(v || 13, 4, 30); else if (t.id === 'dfAisle') lib.defaults.aisleMin = U.clamp(v || 90, 30, 300) / 100; else if (t.id === 'dfValid') lib.defaults.validDays = Math.max(1, v || 30); else if (t.id === 'dfShip') lib.defaults.shipping = Math.max(0, v || 0); else if (t.id === 'dfInst') lib.defaults.install = Math.max(0, v || 0);
      else if (t.id === 'libImport') { const f = t.files[0]; if (!f) return; try { const o = JSON.parse(await U.readFile(f, 'text')); if (!o || typeof o !== 'object' || !o.prices) throw 0; Object.assign(GP.lib, o); GP.saveLib(); GP.toast('설정을 불러왔어요'); render(); } catch (err) { GP.toast('설정 파일을 읽지 못했어요', { bad: true }); } return; }
      GP.saveLib();
    };
  };
  render();
};
panels.fillWallDialog = (W) => {
  const favs = GP.lib.favorites.concat(panels.recent).filter((k, i, a) => GP.getDef(k) && a.indexOf(k) === i && GP.getDef(k).mount === 'floor');
  const st = { type: favs[0] || 'treadmill', gap: 50, margin: 30 };
  const body = `<p class="note">고른 벽(${W.L.toFixed(2)} m)을 따라 기구를 등지게 줄 세워요.</p><label class="fld"><span>기구</span><select id="fwType">${Object.keys(GP.CAT).concat(Object.keys(GP.lib.customTypes)).filter(k => (GP.getDef(k).mount || 'floor') === 'floor' && !GP.getDef(k).flat).sort((a, b) => (favs.includes(b) - favs.includes(a)) || GP.typeName(a).localeCompare(GP.typeName(b), 'ko')).map(k => `<option value="${k}" ${k === st.type ? 'selected' : ''}>${favs.includes(k) ? '★ ' : ''}${U.esc(GP.typeName(k))}</option>`).join('')}</select></label><div class="row2"><label class="fld"><span>기구 사이 간격</span>${numI('fwGap', st.gap, 5, 'cm', 'min="0"')}</label><label class="fld"><span>벽 끝 여백</span>${numI('fwMar', st.margin, 5, 'cm', 'min="0"')}</label></div><p class="calc" id="fwCalc"></p>`;
  GP.modal('벽 채우기', body, '<button class="btn" data-close>취소</button><button class="btn primary" id="fwOk">채우기</button>', { size: 'narrow' });
  const calc = () => { st.type = $('#fwType').value; st.gap = (+$('#fwGap').value || 0) / 100; st.margin = (+$('#fwMar').value || 0) / 100; const d = GP.getDef(st.type); const n = Math.max(0, Math.floor((W.L - 2 * st.margin + st.gap) / (d.w + st.gap))); $('#fwCalc').textContent = `${n}대가 들어가요 (기구 폭 ${U.cm(d.w)}cm)`; return n; };
  ['fwType', 'fwGap', 'fwMar'].forEach(id => $('#' + id).addEventListener('input', calc)); calc();
  $('#fwOk').onclick = () => {
    const n = calc(); if (!n) { GP.toast('들어갈 자리가 없어요', { bad: true }); return; } const d = GP.getDef(st.type), L = GP.L(), out = []; const used = n * d.w + (n - 1) * st.gap, t0 = (W.L - used) / 2 + d.w / 2; const rot = U.normRot(-Math.atan2(W.nx, W.nz) / U.DEG);
    for (let i = 0; i < n; i++) { const t = t0 + i * (d.w + st.gap); const x = W.a[0] + W.dx * t + W.nx * (d.d / 2 + .02), z = W.a[1] + W.dz * t + W.nz * (d.d / 2 + .02); const it = { uid: U.uid(), type: st.type, x: U.r3(x), z: U.r3(z), rot }; L.items.push(it); out.push(it); }
    GP.closeModal(); GP.changed('items'); ui.setTool('select'); ui.select(out.map(it => ({ k: 'item', id: it.uid }))); GP.toast(`${GP.typeName(st.type)} ${n}대를 줄 세웠어요`); panels.pushRecent(st.type);
  };
};
panels.saveSetDialog = (items) => {
  GP.modal('세트로 저장', `<label class="fld"><span>세트 이름</span><input id="setName" placeholder="예: 우리 표준 유산소 존" autofocus></label><p class="note">${items.length}개 기구의 배치 모양을 저장해요. 배치 단계의 <b>존 세트</b>에서 한 번에 놓을 수 있어요.</p>`, '<button class="btn" data-close>취소</button><button class="btn primary" id="setOk">저장</button>', { size: 'narrow' });
  $('#setOk').onclick = () => { let cx = 0, cz = 0; items.forEach(it => { cx += it.x; cz += it.z; }); cx /= items.length; cz /= items.length; const s = { id: U.uid('set'), name: $('#setName').value.trim() || '내 세트', desc: `${items.length}개 기구`, items: items.map(it => { const extra = {}; ['w', 'd', 'h', 'params', 'name'].forEach(k => { if (it[k] != null) extra[k] = it[k]; }); return [it.type, U.r3(it.x - cx), U.r3(it.z - cz), it.rot, extra]; }) }; GP.lib.sets.push(s); GP.saveLib(); GP.closeModal(); GP.toast('세트를 저장했어요'); if (ui.step === 'place') renderGrid(); };
};

/* ---------------- 직접 조립 builder ---------------- */
panels.builder = (editId) => {
  const src = editId ? GP.lib.customTypes[editId] : null;
  const st = { name: src ? src.name : '새 물품', parts: src ? U.clone(src.parts) : [{ s: 'box', x: 0, y: 0, z: 0, w: .8, h: .8, d: .5, ry: 0, color: '#8e949b' }], sel: 0 };
  const body = document.createElement('div'); body.className = 'builder';
  body.innerHTML = `<div class="bview"><canvas id="bCv"></canvas><p class="note bcap">위에서 본 모양 · 부품을 끌어서 옮겨요</p></div><div class="bside">
    <label class="fld"><span>물품 이름</span><input id="bName" value="${U.esc(st.name)}"></label>
    <div class="fld"><span>부품 추가 (선택한 부품 옆에 붙어요)</span><div class="row3"><button class="btn sm" data-add="box">상자</button><button class="btn sm" data-add="rbox">둥근 상자</button><button class="btn sm" data-add="cyl">원기둥</button><button class="btn sm" data-add="plate">얇은 판</button><button class="btn sm" data-add="leg">다리 4개</button></div></div>
    <div class="fld"><span>붙일 위치</span><div class="seg full sm" id="bWhere"><button data-w="front" class="on">앞</button><button data-w="back">뒤</button><button data-w="left">왼쪽</button><button data-w="right">오른쪽</button><button data-w="top">위</button></div></div>
    <div class="parts-list" id="bParts"></div><div id="bProps"></div></div>`;
  GP.modal('직접 조립해서 물품 만들기', body, `<span class="note">cm 단위 · 도면에는 위에서 본 모양으로 그려져요</span><button class="btn" data-close>취소</button><button class="btn primary" id="bSave">저장하고 배치</button>`, { size: 'wide' });
  const cv = $('#bCv'), x = cv.getContext('2d'); let where = 'front', view = null, dragP = null;
  const bounds = () => { let x0 = Infinity, x1 = -Infinity, y1 = 0, z0 = Infinity, z1 = -Infinity; st.parts.forEach(q => { const hw = q.w / 2, hd = (q.s === 'cyl' ? q.w : q.d) / 2; x0 = Math.min(x0, q.x - hw); x1 = Math.max(x1, q.x + hw); z0 = Math.min(z0, q.z - hd); z1 = Math.max(z1, q.z + hd); y1 = Math.max(y1, q.y + q.h); }); return { x0, x1, z0, z1, y1 }; };
  const draw = () => {
    const r = cv.parentElement.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1); const W = Math.max(300, r.width), H = Math.max(320, r.height); cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px';
    const b = bounds(); const span = Math.max(b.x1 - b.x0, b.z1 - b.z0, .6) * 1.5; const s = Math.min(W, H) / span; view = { s, cx: (b.x0 + b.x1) / 2, cz: (b.z0 + b.z1) / 2, W, H };
    x.setTransform(dpr, 0, 0, dpr, 0, 0); x.fillStyle = '#F7F8F6'; x.fillRect(0, 0, W, H);
    x.setTransform(dpr * s, 0, 0, dpr * s, dpr * (W / 2 - view.cx * s), dpr * (H / 2 - view.cz * s));
    x.strokeStyle = '#E3E6E3'; x.lineWidth = 1 / s; x.beginPath(); const g0x = Math.floor((view.cx - W / 2 / s) * 10) / 10, g0z = Math.floor((view.cz - H / 2 / s) * 10) / 10; for (let gx = g0x; gx < view.cx + W / 2 / s; gx += .1) { x.moveTo(gx, g0z); x.lineTo(gx, view.cz + H / s); } for (let gz = g0z; gz < view.cz + H / 2 / s; gz += .1) { x.moveTo(g0x, gz); x.lineTo(view.cx + W / s, gz); } x.stroke();
    const tv = GP.R3.topView({ type: '_b' }, { custom: true, parts: st.parts, w: 1, d: 1, h: 1 }); if (tv) x.drawImage(tv.canvas, tv.ext[0], tv.ext[2], tv.ext[1] - tv.ext[0], tv.ext[3] - tv.ext[2]);
    const q = st.parts[st.sel]; if (q) { x.save(); x.translate(q.x, q.z); x.rotate((q.ry || 0) * U.DEG); x.strokeStyle = '#2450E0'; x.lineWidth = 2.5 / s; if (q.s === 'cyl') { x.beginPath(); x.arc(0, 0, q.w / 2, 0, 7); x.stroke(); } else x.strokeRect(-q.w / 2, -q.d / 2, q.w, q.d); x.restore(); }
    x.setTransform(dpr, 0, 0, dpr, 0, 0); x.fillStyle = '#78818A'; x.font = `600 11px ${GP.S.MONO}`; x.fillText(`${U.cm(b.x1 - b.x0)} × ${U.cm(b.z1 - b.z0)} × 높이 ${U.cm(b.y1)} cm`, 10, 18); x.fillText('▼ 앞쪽', W / 2 - 22, H - 10);
    renderParts();
  };
  const renderParts = () => { $('#bParts').innerHTML = st.parts.map((q, i) => `<button class="${i === st.sel ? 'on' : ''}" data-ps="${i}"><span class="dot" style="--c:${q.color}"></span>${{ box: '상자', rbox: '둥근 상자', cyl: '원기둥', sph: '공' }[q.s] || '상자'} ${i + 1} <small class="mono">${U.cm(q.w)}×${U.cm(q.s === 'cyl' || q.s === 'sph' ? q.w : q.d)}×${U.cm(q.h)}</small></button>`).join(''); const q = st.parts[st.sel]; $('#bProps').innerHTML = q ? `<div class="row3">${[['x', '좌우 위치'], ['z', '앞뒤 위치'], ['y', '바닥에서']].map(([k, l]) => `<label class="fld"><span>${l}</span>${numI('bp_' + k, U.cm(q[k]), 1, 'cm')}</label>`).join('')}${[['w', q.s === 'cyl' ? '지름' : '가로'], ['d', '세로'], ['h', '높이']].filter(([k]) => !(q.s === 'cyl' && k === 'd')).map(([k, l]) => `<label class="fld"><span>${l}</span>${numI('bp_' + k, U.cm(q[k]), 1, 'cm', 'min="1"')}</label>`).join('')}<label class="fld"><span>회전</span>${numI('bp_ry', q.ry || 0, 5, '°')}</label><label class="fld"><span>색</span><input type="color" id="bp_color" value="${q.color}"></label></div><div class="acts"><button class="btn sm" id="bDup">복제</button><button class="btn sm danger" id="bDel" ${st.parts.length <= 1 ? 'disabled' : ''}>부품 삭제</button></div>` : ''; };
  const toW = e => { const r = cv.getBoundingClientRect(); return [view.cx + (e.clientX - r.left - view.W / 2) / view.s, view.cz + (e.clientY - r.top - view.H / 2) / view.s]; };
  cv.addEventListener('pointerdown', e => { const [wx, wz] = toW(e); for (let i = st.parts.length - 1; i >= 0; i--) { const q = st.parts[i]; const [lx, lz] = G.w2l(q.x, q.z, q.ry || 0, wx, wz); if (Math.abs(lx) <= q.w / 2 && Math.abs(lz) <= (q.s === 'cyl' ? q.w : q.d) / 2) { st.sel = i; dragP = { i, ox: q.x - wx, oz: q.z - wz }; cv.setPointerCapture(e.pointerId); draw(); return; } } });
  cv.addEventListener('pointermove', e => { if (!dragP) return; const [wx, wz] = toW(e); const q = st.parts[dragP.i]; q.x = U.r3(U.snap(wx + dragP.ox, .01)); q.z = U.r3(U.snap(wz + dragP.oz, .01)); draw(); });
  cv.addEventListener('pointerup', () => { dragP = null; });
  body.addEventListener('click', e => {
    const ps = e.target.closest('[data-ps]'); if (ps) { st.sel = +ps.dataset.ps; draw(); return; }
    const w = e.target.closest('[data-w]'); if (w) { where = w.dataset.w; $$('#bWhere button').forEach(b => b.classList.toggle('on', b === w)); return; }
    const ad = e.target.closest('[data-add]'); if (ad) {
      const base = st.parts[st.sel] || { x: 0, y: 0, z: 0, w: 0, h: 0, d: 0, s: 'box' }; const bd = base.s === 'cyl' ? base.w : base.d; const k = ad.dataset.add;
      const mk = (s, w2, h2, d2) => { const n = { s, w: w2, h: h2, d: d2, ry: 0, color: base.color || '#8e949b', x: base.x, y: base.y, z: base.z }; const nd = s === 'cyl' ? w2 : d2; if (where === 'top') n.y = base.y + base.h; else if (where === 'front') n.z = base.z + bd / 2 + nd / 2; else if (where === 'back') n.z = base.z - bd / 2 - nd / 2; else if (where === 'left') n.x = base.x - base.w / 2 - w2 / 2; else n.x = base.x + base.w / 2 + w2 / 2; return n; };
      if (k === 'leg') { const lw = .05, lh = Math.max(.1, base.y || .4); [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sz]) => st.parts.push({ s: 'box', w: lw, h: lh, d: lw, ry: 0, color: '#2b2e33', x: base.x + sx * (base.w / 2 - lw), y: 0, z: base.z + sz * (bd / 2 - lw) })); }
      else st.parts.push(k === 'plate' ? mk('box', .6, .03, .4) : k === 'cyl' ? mk('cyl', .3, .6, .3) : mk(k, .4, .4, .4));
      st.sel = st.parts.length - 1; draw(); return;
    }
    if (e.target.id === 'bDup') { const q = U.clone(st.parts[st.sel]); q.x += .1; q.z += .1; st.parts.push(q); st.sel = st.parts.length - 1; draw(); return; }
    if (e.target.id === 'bDel') { st.parts.splice(st.sel, 1); st.sel = Math.max(0, st.sel - 1); draw(); return; }
  });
  body.addEventListener('change', e => { const t = e.target, q = st.parts[st.sel]; if (!q) return; const k = t.id.replace('bp_', ''); if (k === 'color') q.color = t.value; else if (k === 'ry') q.ry = +t.value || 0; else if (['x', 'y', 'z', 'w', 'h', 'd'].includes(k)) { const v = (+t.value || 0) / 100; q[k] = ['w', 'h', 'd'].includes(k) ? Math.max(.01, v) : v; if (k === 'y') q.y = Math.max(0, q.y); if (k === 'w' && q.s === 'cyl') q.d = q.w; } else return; draw(); });
  $('#bName').oninput = e => { st.name = e.target.value; };
  $('#bSave').onclick = () => {
    const b = bounds(); const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2; const parts = st.parts.map(q => Object.assign({}, q, { x: U.r3(q.x - cx), z: U.r3(q.z - cz) }));
    const id = editId || U.uid('c_'); GP.lib.customTypes[id] = { name: st.name.trim() || '내 물품', w: U.r3(b.x1 - b.x0), d: U.r3(b.z1 - b.z0), h: U.r3(b.y1), parts }; GP.saveLib(); GP.SYM.clearThumbs();
    GP.closeModal(); pl.cat = 'custom'; panels.renderPlace(); GP.tools.startPlacing([{ it: { type: id } }]); GP.toast('내 물품에 저장했어요. 도면을 클릭해서 놓으세요');
  };
  requestAnimationFrame(draw);
};

/* ---------------- guide ---------------- */
panels.guide = () => {
  const slides = [
    ['1', '공간을 만들어요', '평수만 넣거나, 모양 템플릿·실측 입력으로 고객 매장 모양을 만들어요. 꼭짓점을 끌면 사선 벽도 자유롭게 만들어져요. 가벽·문·창문도 여기서 넣어요.', IC.vertex],
    ['2', '기구를 놓아요', '왼쪽 목록에서 기구를 누르고 도면을 클릭하면 놓여요. 벽 가까이 가져가면 벽에 붙어요. 기구 위에 마우스를 올리면 이름과 가격이 나오고, 더블클릭하면 3D 모델을 볼 수 있어요.', IC.select],
    ['3', '바닥 · 견적 · 보내기', '고무블럭 구역을 그리면 장수와 마감재가 자동 계산돼요. 오른쪽 위 견적서에서 가격을 넣고, 보내기로 고객에게 링크·PDF를 보내요.', IC.share],
  ];
  let i = 0; const g = $('#guide');
  const r = () => { const s = slides[i]; g.innerHTML = `<div class="guide-card"><div class="gart">${s[3].replace('<svg', '<svg style="width:64px;height:64px;color:var(--accent)"')}</div><span class="gnum">STEP ${s[0]}</span><h2>${s[1]}</h2><p>${s[2]}</p><div class="guide-f"><div class="gdots">${slides.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</div><div class="acts" style="flex:0"><button class="btn ghost" data-g="skip">건너뛰기</button><button class="btn primary" data-g="next">${i < slides.length - 1 ? '다음' : '시작하기'}</button></div></div></div>`; };
  g.hidden = false; r();
  g.onclick = e => { const b = e.target.closest('[data-g]'); if (!b) return; if (b.dataset.g === 'next' && i < slides.length - 1) { i++; r(); return; } g.hidden = true; GP.lib.guideSeen = true; GP.saveLib(); };
};

/* ---------------- refresh hooks ---------------- */
panels.refresh = () => { const s = ui.step; if (s === 'space') panels.renderSpace(); else if (s === 'place') panels.renderPlace(); else if (s === 'floor') panels.renderFloor(); panels.renderQuote(); };
GP.on('step', () => panels.refresh());
GP.on('changed', (P) => { const s = ui.step; if (s === 'floor') panels.renderFloor(); else if (s === 'space') { renderVTable(); if (P && (P.has('all') || P.has('settings'))) panels.renderSpace(); } panels.renderQuote(); });
GP.on('selection', () => { if (ui.step === 'floor') panels.renderFloor(); });
})();
