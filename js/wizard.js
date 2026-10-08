/* GoFit Planner — easy mode: one question per step, the plan beside it.
   name → space → partitions → doors & ceiling → equipment (counts) → automatic layout → rubber floor → check & send.
   The expert screen stays one button away (GP.lib.mode). */
(function () {
'use strict';
const GP = window.GP, U = GP.U, G = GP.G, $ = U.$, IC = GP.IC, ui = GP.ui;
const W = GP.wiz = { on: false, step: 1 };
const STEPS = [
  { id: 'name', t: '이름', app: 'space' },
  { id: 'space', t: '공간', app: 'space' },
  { id: 'part', t: '가벽', app: 'space' },
  { id: 'door', t: '문·천장', app: 'space' },
  { id: 'equip', t: '기구 고르기', app: 'place' },
  { id: 'auto', t: '자동 배치', app: 'place' },
  { id: 'floor', t: '바닥', app: 'floor' },
  { id: 'done', t: '점검·보내기', app: 'place' },
];
const cat = it => (GP.getDef(it.type || it) || {}).cat;
const eqOnly = it => GP.EQUIP_CATS.has(cat(it)) && !(GP.getDef(it.type) || {}).flat;
const st = () => { const P = GP.P; if (!P.wiz) P.wiz = { step: null, max: 1, picks: null, space: 'py', partAns: null }; return P.wiz; };   // kept in the project file

/* ---------------- mode ---------------- */
W.mode = () => GP.lib.mode || 'easy';
W.setMode = (m) => { GP.lib.mode = m; GP.saveLib(); apply(); if (m === 'expert') { ui.setStep('place'); GP.toast('전문가 모드예요. 위쪽 「쉬운 모드」로 언제든 돌아갈 수 있어요'); } };
function apply() {
  const easy = !GP.viewOnly && W.mode() === 'easy'; W.on = easy;
  $('#app').classList.toggle('easy', easy); $('#wiz').hidden = !easy;
  const mb = $('#modeBtn'); if (mb) { mb.hidden = GP.viewOnly; mb.innerHTML = easy ? `${IC.gear}<span class="lbl">전문가 모드</span>` : `${IC.steps}<span class="lbl">쉬운 모드</span>`; mb.title = easy ? '모든 도구가 보이는 화면으로' : '단계별로 안내하는 화면으로'; }
  if (easy) { const s = st(); W.go(s.step != null ? s.step : defaultStep(), true); } else { parkSpace(); ui.renderTools(); ui.setHint(); }
  requestAnimationFrame(() => { GP.S.resize(); GP.emit('overlay'); });
}
function defaultStep() { const L = GP.L(); return L.items.some(eqOnly) ? 7 : 1; }
W.onProject = () => { W.lastAuto = null; if (!GP.viewOnly) apply(); };
W.refresh = () => { if (W.on && cur && cur.refresh) { const b = $('#wzBody'), y = b ? b.scrollTop : 0; cur.refresh(); const b2 = $('#wzBody'); if (b2) b2.scrollTop = y; } };

/* ---------------- navigation ---------------- */
let cur = null;
W.go = (i, quiet) => {
  i = U.clamp(i, 0, STEPS.length - 1); const s = st();
  if (cur && cur.leave) cur.leave();
  W.step = s.step = i; s.max = Math.max(s.max || 0, i);
  GP.tools && GP.tools.cancel(); if (ui.step !== STEPS[i].app) ui.setStep(STEPS[i].app); else ui.setTool('select');
  render(); if (!quiet) GP.emit('dirty');
};
function render() {
  parkSpace(); const el = $('#wiz'), i = W.step, s = st(), last = i === STEPS.length - 1;
  el.innerHTML = `<div class="wz-head"><div class="wz-steps">${STEPS.map((x, k) => `<button class="wz-st${k === i ? ' on' : k <= (s.max || 0) ? ' done' : ''}" data-wgo="${k}" title="${x.t}"${k > (s.max || 0) + 1 ? ' disabled' : ''}>${k < i || (k <= (s.max || 0) && k !== i) ? '✓' : k + 1}</button>`).join('<i></i>')}</div>
    <div class="wz-where"><b>${i + 1}. ${STEPS[i].t}</b><span>${i + 1} / ${STEPS.length}</span></div></div>
    <div class="wz-body" id="wzBody"></div>
    <div class="wz-foot">${i > 0 ? '<button class="btn" data-wnav="prev">← 이전</button>' : '<span></span>'}<button class="btn primary" data-wnav="next">${last ? '처음부터 다시 보기' : `다음: ${STEPS[i + 1].t} →`}</button></div>`;
  cur = R[STEPS[i].id]; cur.render($('#wzBody'));
}
$('#wiz').addEventListener('click', e => {
  const g = e.target.closest('[data-wgo]'); if (g && !g.disabled) { W.go(+g.dataset.wgo); return; }
  const n = e.target.closest('[data-wnav]'); if (!n) return;
  if (n.dataset.wnav === 'prev') W.go(W.step - 1);
  else if (cur && cur.next && cur.next() === false) return;
  else W.go(W.step === STEPS.length - 1 ? 0 : W.step + 1);
});
const head = (t, d) => `<h2 class="wz-t">${t}</h2>${d ? `<p class="wz-d">${d}</p>` : ''}`;

/* the expert space panel is borrowed for the space step (its forms already do 평수 / 템플릿 / 실측 / 도면) */
function parkSpace() { const ps = $('#panel-space'), side = $('#side'); if (ps && ps.parentElement !== side) side.insertBefore(ps, $('#panel-place')); }

/* ---------------- steps ---------------- */
const R = {};
R.name = {
  render(b) {
    const P = GP.P;
    b.innerHTML = head('프로젝트 이름을 정해요', '견적서와 제안서 맨 위에 들어가요.') + `<label class="fld"><span>프로젝트 이름</span><input id="wzN" value="${U.esc(P.name)}" placeholder="예: 강남 ○○피트니스"></label>
      <label class="fld"><span>고객사 <small class="note">(선택)</small></span><input id="wzC" value="${U.esc(P.client || '')}"></label>
      <label class="fld"><span>담당자 <small class="note">(선택)</small></span><input id="wzK" value="${U.esc(P.consultant || '')}"></label>`;
    b.oninput = () => { P.name = $('#wzN').value.trim() || '새 프로젝트'; P.client = $('#wzC').value.trim(); P.consultant = $('#wzK').value.trim(); ui.renderTop(); GP.emit('dirty'); };
  },
};
R.space = {
  render(b) {
    parkSpace();      // the borrowed panel goes home first: replacing this step's HTML would otherwise throw it away
    const s = st(), m = s.space || 'py';
    b.innerHTML = head('공간 모양을 만들어요', '가지고 있는 정보에 맞는 방법을 고르세요. 오른쪽 도면에 바로 그려져요.') +
      `<div class="wz-cards">${[['py', '평수만 알아요', '평수와 가로·세로 비율로'], ['shape', '모양이 특이해요', 'L자 · 사선 · 사다리꼴'], ['walk', '벽 길이를 재 왔어요', '잰 길이를 차례로 입력'], ['trace', '도면 사진이 있어요', '사진 위에 따라 그리기']].map(([k, t, d]) => `<button class="wz-card${m === k ? ' on' : ''}" data-sm="${k}"><b>${t}</b><small>${d}</small></button>`).join('')}</div>
      <div class="wz-host wz-sm-${m === 'trace' ? 'trace' : 'make'}" id="wzSpace"></div>
      ${m === 'trace' ? `<div class="wz-tip"><b>따라 그리는 순서</b><ol><li>아래에서 도면 사진을 올려요.</li><li>「이미지 가로 실제 길이」를 맞춰요. (사진의 가로가 실제로 몇 m인지)</li><li>도면의 동그란 꼭짓점을 끌어 사진의 벽 모서리에 맞춰요. 벽 가운데 ＋를 끌면 꺾여요.</li></ol></div>` : ''}`;
    const host = $('#wzSpace'), ps = $('#panel-space'); host.appendChild(ps); ps.hidden = false;
    GP.panels.openFold(m === 'trace' ? 'trace' : 'make');
    if (m !== 'trace') GP.panels.spaceMode(m); else { GP.panels.renderSpace(); ui.setTool('vertex'); }
    b.onclick = e => { const c = e.target.closest('[data-sm]'); if (!c) return; s.space = c.dataset.sm; R.space.render(b); };
  },
  leave() { parkSpace(); },
};
R.part = {
  render(b) {
    const s = st(), L = GP.L(), parts = L.partitions, ans = parts.length ? 'yes' : s.partAns, kind = GP.tools.partKind || 'wall';
    b.innerHTML = head('안에 가벽(칸막이 벽)이 있나요?', 'PT룸·탈의실을 나누는 벽, 유리 칸막이, 허리 높이 벽 같은 것이에요.') +
      `<div class="wz-choice"><button class="wz-card${ans === 'no' ? ' on' : ''}" data-pa="no"><b>없어요</b><small>바로 다음 단계로</small></button><button class="wz-card${ans === 'yes' ? ' on' : ''}" data-pa="yes"><b>있어요</b><small>도면에 그려 넣을게요</small></button></div>
      ${ans === 'yes' ? `<div class="fld"><span>가벽 종류</span><div class="seg full" id="wzPk">${Object.entries(GP.PARTS).map(([k, n]) => `<button data-pk="${k}" class="${kind === k ? 'on' : ''}">${n}</button>`).join('')}</div></div>
        <button class="btn primary wide" id="wzDraw">${IC.wall}${parts.length ? '가벽 하나 더 그리기' : '가벽 그리기 시작'}</button>
        <p class="note">도면에서 시작점을 클릭하고, 꺾이는 곳마다 클릭해요. 끝나면 위쪽 막대의 <b>완료</b>를 누르세요.</p>
        ${parts.length ? `<div class="wz-list">${parts.map((p, k) => { let l = 0; for (let j = 1; j < p.pts.length; j++) l += G.len(p.pts[j - 1], p.pts[j]); return `<div class="wz-li"><span>가벽 ${k + 1} · ${GP.PARTS[p.kind] || '일반 가벽'} · ${l.toFixed(2)}m</span><button class="btn xs ghost danger" data-pdel="${p.id}">지우기</button></div>`; }).join('')}</div>` : ''}` : ''}`;
    b.onclick = e => {
      const L = GP.L(), a = e.target.closest('[data-pa]'); if (a) { s.partAns = a.dataset.pa; if (s.partAns === 'no' && L.partitions.length) { GP.toast('그려 둔 가벽은 그대로 있어요. 지우려면 목록에서 지우기를 누르세요'); } R.part.render(b); if (s.partAns === 'yes' && !L.partitions.length) ui.setTool('part'); return; }
      const k = e.target.closest('[data-pk]'); if (k) { GP.tools.partKind = k.dataset.pk; R.part.render(b); return; }
      if (e.target.closest('#wzDraw')) { ui.setTool('part'); return; }
      const d = e.target.closest('[data-pdel]'); if (d) { L.partitions = L.partitions.filter(p => p.id !== d.dataset.pdel); L.openings = L.openings.filter(o => o.host !== d.dataset.pdel); GP.changed('parts'); R.part.render(b); }
    };
  },
  refresh() { R.part.render($('#wzBody')); },
};
const OPEN_KINDS = [['glass2', '유리 자동문'], ['door2', '양개문'], ['door', '여닫이 문'], ['slide', '미닫이 문']];
R.door = {
  render(b) {
    const L = GP.L(), P = GP.P, ops = L.openings.filter(o => o.host === 'room'), cols = L.items.filter(it => it.type === 'column'), waiting = ui.tool === 'opening';
    b.innerHTML = head('출입문은 어디에 있나요?', '버튼을 누른 뒤 도면에서 문이 있는 벽을 클릭하면 놓여요. 놓은 문은 끌어서 옮길 수 있어요.') +
      `<div class="fld"><span>문 종류</span><div class="seg full sm" id="wzOk">${OPEN_KINDS.map(([k, n]) => `<button data-ok="${k}" class="${(W.doorKind || 'glass2') === k ? 'on' : ''}">${n}</button>`).join('')}</div></div>
      <div class="row2"><button class="btn${waiting && ui.openingKind !== 'window' ? ' primary' : ''}" data-op="door">${IC.door}출입문 놓기</button><button class="btn${waiting && ui.openingKind === 'window' ? ' primary' : ''}" data-op="window">${IC.door}창문 놓기</button></div>
      ${waiting ? `<p class="wz-wait">도면에서 ${ui.openingKind === 'window' ? '창문' : '문'}이 있는 <b>벽을 클릭</b>하세요</p>` : ''}
      ${ops.length ? `<div class="wz-list">${ops.map(o => `<div class="wz-li"><span>${GP.OPENINGS[o.kind] || '문'} · 폭 ${o.w.toFixed(2)}m · ${o.seg + 1}번 벽</span><button class="btn xs ghost danger" data-odel="${o.id}">지우기</button></div>`).join('')}</div>` : '<p class="note">출입문이 있어야 비상 동선(대피로)을 점검할 수 있어요.</p>'}
      <div class="row2"><button class="btn" data-op="column">${IC.room}기둥 놓기</button><span class="note" style="align-self:center">${cols.length ? `기둥 ${cols.length}개` : '기둥이 있으면 넣어 주세요'}</span></div>
      <div class="fld wz-ceil"><span>천장 높이</span><div class="chips">${[2.6, 2.8, 3.0, 3.3, 4.0].map(h => `<button class="chip${Math.abs(P.settings.wallH - h) < .001 ? ' on' : ''}" data-ch="${h}">${h.toFixed(1)}m</button>`).join('')}</div><div class="unit" style="max-width:140px"><input id="wzCh" type="number" step="0.05" min="2" max="8" value="${P.settings.wallH}"><em>m</em></div><small class="note">트레드밀·스텝밀처럼 높이가 필요한 기구를 점검하는 데 써요.</small></div>`;
    b.onclick = e => {
      const k = e.target.closest('[data-ok]'); if (k) { W.doorKind = k.dataset.ok; if (ui.tool === 'opening' && ui.openingKind !== 'window') ui.openingKind = W.doorKind; R.door.render(b); return; }
      const o = e.target.closest('[data-op]'); if (o) { const a = o.dataset.op; if (a === 'column') { GP.tools.startPlacing([{ it: { type: 'column' } }]); return; } ui.openingKind = a === 'window' ? 'window' : (W.doorKind || 'glass2'); ui.setTool('opening'); R.door.render(b); return; }
      const d = e.target.closest('[data-odel]'); if (d) { const L = GP.L(); L.openings = L.openings.filter(x => x.id !== d.dataset.odel); GP.changed('openings'); R.door.render(b); return; }
      const c = e.target.closest('[data-ch]'); if (c) { setCeil(+c.dataset.ch); R.door.render(b); }
    };
    b.onchange = e => { if (e.target.id === 'wzCh') { setCeil(+e.target.value); R.door.render(b); } };
  },
  refresh() { R.door.render($('#wzBody')); },
};
function setCeil(h) { if (!(h >= 2 && h <= 8)) return; GP.P.settings.wallH = U.r2(h); GP.changed('all'); }

/* ---------------- equipment: counts ---------------- */
const EQ_GROUPS = [['유산소', ['cardio', 'air']], ['웨이트 머신', ['machine']], ['플레이트 로디드', ['plate']], ['케이블', ['cable']], ['랙 · 벤치', ['rack', 'bench']], ['프리웨이트 보관', ['storage']], ['기능성 · 스트레칭', ['func', 'stretch']]];
let eqQ = '', eqOpen = new Set(['유산소']);
function picks() {
  const s = st(); if (!s.picks) { s.picks = {}; GP.L().items.filter(eqOnly).forEach(it => { s.picks[it.type] = (s.picks[it.type] || 0) + 1; }); }
  return s.picks;
}
R.equip = {
  render(b) {
    const pk = picks(), types = Object.keys(GP.CAT).filter(k => GP.EQUIP_CATS.has(cat(k)) && !GP.lib.hidden.includes(k) && !(GP.getDef(k) || {}).flat);
    const n = Object.values(pk).reduce((a, v) => a + v, 0), A = Math.abs(G.area(GP.L().room.pts)) || 1;
    let foot = 0, price = 0, missing = 0; for (const [k, v] of Object.entries(pk)) { const d = GP.getDef(k); if (!d || !v) continue; const c = d.cl || {}; foot += (d.w + (c.l || 0) / 2 + (c.r || 0) / 2) * (d.d + (c.f || 0) + (c.b || 0) / 2) * v; const p = GP.lib.prices[k] || 0; if (p) price += p * v; else missing++; }
    const pct = Math.round(foot / A * 100);
    const row = k => { const d = GP.getDef(k), v = pk[k] || 0; return `<div class="wz-eq${v ? ' on' : ''}"><img src="${GP.SYM.thumbUrl(k)}" alt="" loading="lazy"><span class="wz-eqn"><b>${U.esc(GP.typeName(k))}</b><small>${U.cm(d.w)}×${U.cm(d.d)}cm</small></span><button class="wz-pm" data-dec="${k}" aria-label="빼기"${v ? '' : ' disabled'}>−</button><b class="wz-cnt">${v}</b><button class="wz-pm" data-inc="${k}" aria-label="더하기">+</button></div>`; };
    const eqList = () => { const q = eqQ.trim().replace(/\s+/g, '').toLowerCase(); return q ? `<div class="wz-eqs">${types.filter(k => (GP.typeName(k) + (GP.getDef(k).kw || '')).replace(/\s+/g, '').toLowerCase().includes(q)).map(row).join('') || '<p class="note">찾는 기구가 없어요.</p>'}</div>`
      : EQ_GROUPS.map(([g, cs]) => { const ks = types.filter(k => cs.includes(cat(k))); const c = ks.reduce((a, k) => a + (pk[k] || 0), 0); return `<details class="fold" data-eg="${g}" ${eqOpen.has(g) ? 'open' : ''}><summary><span class="fd-t">${g}</span><span class="fd-v">${c ? c + '대' : ''}</span></summary><div class="fd-b wz-eqs">${ks.map(row).join('')}</div></details>`; }).join(''); };
    b.innerHTML = head('어떤 기구가 필요하세요?', '개수만 정하면 다음 단계에서 알아서 놓아 드려요.') +
      `<div class="wz-sum"><div><b>${n}대</b><small>고른 기구</small></div><div><b class="${pct > 55 ? 'bad' : pct > 42 ? 'warn' : ''}">${pct}%</b><small>공간 차지 (사용 공간 포함)</small></div><div><b>${price ? '약 ' + U.won(Math.round(price * 1.1 / 10000)) + '만원' : '-'}</b><small>${missing ? `단가 미입력 ${missing}종` : '부가세 포함'}</small></div></div>
      ${pct > 55 ? '<p class="wz-warn">기구가 공간에 비해 많아요. 통로가 좁아지거나 못 놓는 기구가 생길 수 있어요.</p>' : ''}
      <div class="fld"><span>빠르게 고르기 (묶음)</span><div class="chips">${GP.SETS.map(sv => `<button class="chip" data-set="${sv.id}" title="${U.esc(sv.desc || '')}">＋ ${U.esc(sv.name)}</button>`).join('')}</div></div>
      <div class="search">${IC.search}<input id="wzQ" type="search" placeholder="기구 이름으로 찾기" value="${U.esc(eqQ)}"></div>
      <div id="wzEqList" class="wz-eqlist">${eqList()}</div>
      ${n ? `<button class="btn ghost sm" data-clear="1">모두 0대로</button>` : ''}`;
    b.onclick = e => {
      const i = e.target.closest('[data-inc]'), d = e.target.closest('[data-dec]'), set = e.target.closest('[data-set]');
      if (i) pk[i.dataset.inc] = (pk[i.dataset.inc] || 0) + 1;
      else if (d) { const k = d.dataset.dec; pk[k] = Math.max(0, (pk[k] || 0) - 1); if (!pk[k]) delete pk[k]; }
      else if (set) { const sv = GP.SETS.find(x => x.id === set.dataset.set); sv.items.forEach(([t]) => { if (GP.EQUIP_CATS.has(cat(t))) pk[t] = (pk[t] || 0) + 1; }); GP.toast(`'${sv.name}'을(를) 더했어요`); }
      else if (e.target.closest('[data-clear]')) { for (const k in pk) delete pk[k]; }
      else return;
      const y = b.scrollTop, inp = $('#wzQ'), typing = inp && document.activeElement === inp; R.equip.render(b); b.scrollTop = y; if (typing) { const i2 = $('#wzQ'); i2.focus(); i2.setSelectionRange(i2.value.length, i2.value.length); } GP.emit('dirty');
    };
    b.oninput = e => { if (e.target.id === 'wzQ') { eqQ = e.target.value; const l = $('#wzEqList'); if (l) l.innerHTML = eqList(); } };
    if (!b._tg) { b._tg = true; b.addEventListener('toggle', e => { const g = e.target.dataset && e.target.dataset.eg; if (!g) return; if (e.target.open) eqOpen.add(g); else eqOpen.delete(g); }, true); }
  },
  next() { const n = Object.values(picks()).reduce((a, v) => a + v, 0); if (!n) { GP.toast('기구를 하나 이상 골라 주세요. 기구 없이 넘어가려면 위쪽 단계 번호를 누르세요', { bad: true }); return false; } },
};

/* ---------------- automatic layout ---------------- */
R.auto = {
  render(b) {
    const L = GP.L(), placed = L.items.filter(eqOnly), pk = picks(), want = Object.values(pk).reduce((a, v) => a + v, 0), res = W.lastAuto, df = diff();
    const list = (GP.checks.list || []).filter(c => c.sev !== 'info');
    b.innerHTML = head('자동으로 놓아 볼게요', '고른 기구를 종류별로 모아서 벽을 따라 놓아요. 기구마다 필요한 운동 공간과 출입문 앞 통로를 비워 둬요.') +
      `${placed.length && (df.more || df.extra) && !(res && res.failed.length >= df.more && !df.extra) ? `<div class="wz-res warn"><b>고른 기구와 도면이 달라요</b>${df.more && !(res && res.failed.length >= df.more) ? `<span>더 놓을 기구 ${df.more}대 · 지금 배치는 그대로 두고 빈자리에 놓을 수 있어요.</span>` : ''}${df.extra ? `<span>고른 개수보다 도면에 더 놓인 기구 ${df.extra}대 · 지우지 않고 그대로 둬요.</span>` : ''}<div class="row2">${df.more ? '<button class="btn sm primary" id="wzAdd">새로 고른 기구만 놓기</button>' : ''}<button class="btn sm" id="wzSync">고르기 목록을 도면에 맞추기</button></div></div>` : ''}
      <button class="btn ${placed.length ? '' : 'primary '}wide big" id="wzAuto">${placed.length ? '처음부터 다시 자동 배치하기' : `기구 ${want}대 자동 배치하기`}</button>
      ${res ? `<div class="wz-res${res.failed.length ? ' warn' : ''}"><b>${res.placed}대를 ${res.add ? '더 ' : ''}놓았어요</b>${res.failed.length ? `<span>공간이 부족해서 ${res.failed.length}대는 못 놓았어요: ${[...new Set(res.failed)].map(t => U.esc(GP.typeName(t))).join(', ')}</span><span>기구 수를 줄이거나, 전문가 모드에서 직접 놓아 보세요.</span>` : ''}</div>` : ''}
      ${placed.length ? `<div class="wz-tip"><b>원하는 대로 고치기</b><ul><li>기구를 <b>끌면</b> 옮겨져요. 벽에 딱 붙이고 싶으면 도면 오른쪽 아래 <b>벽 자석</b>을 켜세요.</li><li>기구를 <b>누르면</b> 오른쪽에 돌리기·지우기가 나와요. <kbd>R</kbd>로 돌려도 돼요.</li><li>마음에 안 들면 <b>처음부터 다시 자동 배치하기</b>를 누르세요. 기구를 더 고르고 왔다면 <b>새로 고른 기구만 놓기</b>로 지금 배치를 살린 채 더할 수 있어요.</li></ul></div>` : ''}
      ${placed.length ? (list.length ? `<div class="wz-list"><div class="wz-lh">확인할 점 ${list.length}개 <small>눌러서 위치 보기</small></div>${list.slice(0, 6).map((c, k) => `<button class="wz-li chk ${c.sev}" data-ck="${k}"><i></i><span>${U.esc(c.msg)}</span></button>`).join('')}</div>` : '<p class="wz-ok">겹치거나 좁은 곳 없이 잘 놓였어요.</p>') : ''}`;
    b.onclick = async e => {
      if (e.target.closest('#wzAuto')) {
        if (!want) { GP.toast('먼저 놓을 기구를 골라 주세요', { bad: true }); W.go(4); return; }
        if (placed.length && !(await GP.confirm('지금 놓인 기구를 모두 지우고 다시 자동으로 놓을까요? 되돌리기로 돌아올 수 있어요.', '다시 배치'))) return;
        await runAuto(); R.auto.render(b); return;
      }
      if (e.target.closest('#wzAdd')) { await runAuto('add'); R.auto.render(b); return; }
      if (e.target.closest('#wzSync')) { st().picks = counts(); GP.toast('기구 고르기 목록을 지금 도면에 맞췄어요'); R.auto.render(b); GP.emit('dirty'); return; }
      const c = e.target.closest('[data-ck]'); if (c) { const it = list[+c.dataset.ck]; if (it.uids.length) ui.select(it.uids.map(u => ({ k: 'item', id: u }))); if (it.at) GP.S.focus(it.at); }
    };
  },
  refresh() { R.auto.render($('#wzBody')); },
};
/* machines on the plan by type, and how they differ from the picks */
function counts() { const c = {}; GP.L().items.filter(eqOnly).forEach(it => { c[it.type] = (c[it.type] || 0) + 1; }); return c; }
function diff() { const pk = picks(), have = counts(); let more = 0, extra = 0; for (const k of new Set(Object.keys(pk).concat(Object.keys(have)))) { const d = (pk[k] || 0) - (have[k] || 0); if (d > 0) more += d; else extra -= d; } return { more, extra }; }
async function runAuto(mode) {
  const pk = picks(), list = [], add = mode === 'add', have = counts();
  for (const [k, v] of Object.entries(pk)) for (let i = add ? (have[k] || 0) : 0; i < v; i++) list.push(k);
  GP.busy && GP.busy(true, '자동 배치 중… 기구마다 통로를 확인하고 있어요');
  await new Promise(r => setTimeout(r, 40));      // let the busy card paint before the heavy part
  try {
    const r = GP.autoLayout(list, { keep: add }), L = GP.L();
    L.items = (add ? L.items : L.items.filter(it => !eqOnly(it))).concat(r.placed.map(p => Object.assign({ uid: U.uid() }, p)));
    W.lastAuto = { placed: r.placed.length, failed: r.failed, add };
    ui.sel = []; GP.changed('items'); GP.checks.full(); GP.S.fit(); ui.renderInspector();
  } finally { GP.busy && GP.busy(false); }
}

/* Rule-based placement. Groups in turn (cardio, strength machines, free-weight racks / storage, benches, functional), each item at
   the first spot that works: along walls first (cardio prefers the wall with windows, others the longest walls), facing into the
   room with its back off the wall by its rear clearance; benches and whatever no wall takes go inside, near their group.
   A spot works when the item and its front zone are inside the room, its use space (front / back / sides) is clear of every other
   item, partition and column, and nothing stands in the 1.5 m in front of a door. */
GP.autoLayout = (types, opt) => {      // opt.keep: the machines on the plan stay where they are (and keep their use space)
  opt = opt || {}; const L = GP.L(), P = L.room.pts, rect = G.rectPts, ov = G.overlap;
  const obst = [], placed = [], failed = [];
  for (const it of L.items) {
    if (eqOnly(it) && !opt.keep) continue; const d = GP.getDef(it.type) || {}; if (d.wall || GP.mountOf(it) !== 'floor') continue;
    // machines kept in place and floor areas (turf lane, lifting platform, stretching zone) keep their use space clear too
    const C = GP.footprint(it), c = d.cl || {}, dm = GP.dims(it);
    obst.push({ C, U: eqOnly(it) || d.flat ? rect(it.x, it.z, it.rot, -dm.w / 2 - (c.l || 0), dm.w / 2 + (c.r || 0), -dm.d / 2 - (c.b || 0), dm.d / 2 + (c.f || 0)) : C });
  }
  for (const p of L.partitions) for (let i = 0; i < p.pts.length - 1; i++) { const a = p.pts[i], b = p.pts[i + 1], s = G.segInfo(a, b), t = (p.thick || .1) / 2 + .05, nx = -s.dz * t, nz = s.dx * t; const C = [[a[0] + nx, a[1] + nz], [b[0] + nx, b[1] + nz], [b[0] - nx, b[1] - nz], [a[0] - nx, a[1] - nz]]; obst.push({ C, U: C }); }
  const doorZ = [];
  for (const o of L.openings) { if (o.kind === 'window') continue; const hs = GP.hostSeg(o); if (!hs) continue; const sp = GP.openingSpan(o, hs), at = (u, d) => [hs.a[0] + hs.dx * u + hs.nx * d, hs.a[1] + hs.dz * u + hs.nz * d]; for (const sg of o.host === 'room' ? [1] : [1, -1]) doorZ.push([at(sp.s0 - .3, 0), at(sp.s1 + .3, 0), at(sp.s1 + .3, 1.5 * sg), at(sp.s0 - .3, 1.5 * sg)]); }
  const fits = (k, x, z, rot) => {
    const d = GP.getDef(k), c = d.cl || {}, w = d.w, dd = d.d;
    const C = rect(x, z, rot, -w / 2, w / 2, -dd / 2, dd / 2); if (!G.rectInside(C, P)) return null;
    const F = rect(x, z, rot, -w / 2, w / 2, -dd / 2, dd / 2 + (c.f || 0)); if ((c.f || 0) > 0 && !G.rectInside(F, P, .02)) return null;
    const Uz = rect(x, z, rot, -w / 2 - (c.l || 0), w / 2 + (c.r || 0), -dd / 2 - (c.b || 0), dd / 2 + (c.f || 0));
    for (const o of obst) if (ov(C, o.U) || ov(Uz, o.C)) return null;
    for (const o of placed) if (ov(C, o.U) || ov(Uz, o.C)) return null;
    for (const z0 of doorZ) if (ov(F, z0)) return null;
    return { C, U: Uz };
  };
  const keptFloor = opt.keep ? L.items.slice() : L.items.filter(it => !eqOnly(it)), minW = GP.lib.defaults.aisleMin || .9, hasDoor = L.openings.some(o => o.kind !== 'window' && o.host === 'room');
  const base = new Set(); if (hasDoor && opt.keep) { const E0 = GP.calc.egress(minW, keptFloor); if (E0) E0.blocked.concat(E0.cut).forEach(it => base.add(it)); }      // problems the plan already has
  const reach = () => { if (!hasDoor) return true; const E = GP.calc.egress(minW, keptFloor.concat(placed)); return !E || (!E.blocked.some(it => !base.has(it)) && !E.cut.filter(eqOnly).some(it => !base.has(it))); };
  let misses = 0;      // spots that fit but would cut someone off from the doors; after 60 of them this item gives up (each test is a flood fill)
  const put = (k, x, z, rot, g) => { if (misses > 60) return false; const r = fits(k, x, z, rot); if (!r) return false; placed.push({ type: k, x: U.r3(x), z: U.r3(z), rot, C: r.C, U: r.U, g }); if (reach()) return true; placed.pop(); misses++; return false; };
  // walls, with their windows; the rotation that makes an item face into the room from that wall
  const edges = P.map((_, i) => { const e = G.edge(P, i); e.i = i; e.rot = U.normRot(Math.round(Math.atan2(-e.nx, e.nz) / U.DEG)); e.win = L.openings.filter(o => o.host === 'room' && o.seg === i && o.kind === 'window').reduce((a, o) => a + o.w, 0); return e; });
  const longest = edges.slice().sort((a, b) => b.L - a.L)[0];
  const wallTry = (k, order, g) => {
    const d = GP.getDef(k), c = d.cl || {};
    for (const e of order) {
      const off = Math.max(.05, c.b || 0) + d.d / 2, s0 = d.w / 2 + .05, s1 = e.L - d.w / 2 - .05;
      for (let s = s0; s <= s1 + 1e-6; s += .1) { const x = e.a[0] + e.dx * s + e.nx * off, z = e.a[1] + e.dz * s + e.nz * off; if (put(k, x, z, e.rot, g)) return true; }
    }
    return false;
  };
  const b = G.bounds(P), centre = [b.cx, b.cz];
  const inside = (k, anchor, g) => {
    const pts = []; for (let z = b.minZ + .2; z < b.maxZ; z += .2) for (let x = b.minX + .2; x < b.maxX; x += .2) pts.push([x, z, Math.hypot(x - anchor[0], z - anchor[1])]);
    pts.sort((p, q) => p[2] - q[2]);
    const rots = [longest.rot, U.normRot(longest.rot + 180), U.normRot(longest.rot + 90), U.normRot(longest.rot + 270)];
    for (const [x, z] of pts) for (const r of rots) if (put(k, x, z, r, g)) return true;
    return false;
  };
  const centroid = g => { const ps = placed.filter(p => p.g === g); return ps.length ? [ps.reduce((a, p) => a + p.x, 0) / ps.length, ps.reduce((a, p) => a + p.z, 0) / ps.length] : null; };
  const GROUPS = [
    { g: 'cardio', cats: ['cardio', 'air'], walls: edges.slice().sort((a, c) => (c.win - a.win) || (c.L - a.L)) },
    { g: 'strength', cats: ['machine', 'cable', 'plate'], walls: edges.slice().sort((a, c) => c.L - a.L) },
    { g: 'free', cats: ['rack', 'storage'], walls: edges.slice().sort((a, c) => c.L - a.L) },
    { g: 'bench', cats: ['bench'], walls: null },
    { g: 'etc', cats: ['func', 'stretch'], walls: edges.slice().sort((a, c) => c.L - a.L) },
  ];
  const area = k => { const d = GP.getDef(k); return d.w * d.d; };
  for (const G0 of GROUPS) {
    const ks = types.filter(k => G0.cats.includes(cat(k)));
    const order = [...new Set(ks)].sort((p, q) => area(q) - area(p)); ks.sort((p, q) => order.indexOf(p) - order.indexOf(q));
    for (const k of ks) {
      misses = 0;
      if (G0.walls && wallTry(k, G0.walls, G0.g)) continue;
      misses = 0; const anchor = centroid(G0.g) || (G0.g === 'bench' ? centroid('free') : null) || centre;
      if (!inside(k, anchor, G0.g)) failed.push(k);
    }
  }
  types.filter(k => !GROUPS.some(G0 => G0.cats.includes(cat(k)))).forEach(k => { misses = 0; if (!wallTry(k, edges, 'etc') && !inside(k, centre, 'etc')) failed.push(k); });
  return { placed: placed.map(({ type, x, z, rot }) => ({ type, x, z, rot })), failed };
};

/* ---------------- rubber floor ---------------- */
R.floor = {
  render(b) {
    const L = GP.L(), s = st(), how = s.floorHow || 'free', blk = s.floorBlock || 'coat', n = GP.calc.matSummary().blocks.reduce((a, x) => a + x.count, 0);
    b.innerHTML = head('고무블럭을 어디에 깔까요?', '무게를 떨어뜨리는 곳에는 깔아 주는 게 좋아요.') +
      `<div class="wz-cards">${[['free', '프리웨이트 구역만', '랙·벤치·덤벨 주변 (추천)'], ['all', '공간 전체', '바닥 전체를 덮어요'], ['none', '깔지 않기', '고무블럭 없이']].map(([k, t, d]) => `<button class="wz-card${how === k ? ' on' : ''}" data-fh="${k}"><b>${t}</b><small>${d}</small></button>`).join('')}</div>
      ${how !== 'none' ? `<div class="fld"><span>고무블럭 종류</span><div class="wz-blocks">${Object.entries(GP.BLOCKS).map(([k, v]) => `<button class="wz-blk${blk === k ? ' on' : ''}" data-fb="${k}"><i style="background:${v.color}"></i>${U.esc(v.name.replace(' 고무블럭', ''))}</button>`).join('')}</div></div>` : ''}
      <button class="btn primary wide" id="wzMat">${how === 'none' ? '고무블럭 모두 치우기' : '이대로 깔기'}</button>
      <p class="note">${L.mats.length ? `지금 고무블럭 ${L.mats.length}구역 · ${n}장이 깔려 있어요.` : '아직 깔린 고무블럭이 없어요.'}</p>`;
    b.onclick = e => {
      const h = e.target.closest('[data-fh]'); if (h) { s.floorHow = h.dataset.fh; R.floor.render(b); return; }
      const k = e.target.closest('[data-fb]'); if (k) { s.floorBlock = k.dataset.fb; R.floor.render(b); return; }
      if (e.target.closest('#wzMat')) { layMats(s.floorHow || 'free', s.floorBlock || 'coat'); R.floor.render(b); }
    };
  },
  refresh() { R.floor.render($('#wzBody')); },
};
function layMats(how, block) {
  const L = GP.L(), P = L.room.pts;
  const fw = L.items.filter(it => ['rack', 'bench', 'storage'].includes(cat(it)));
  if (how === 'free' && !fw.length) { GP.toast('프리웨이트 기구(랙·벤치·덤벨랙)가 없어서 깔 곳이 없어요. 「공간 전체」를 골라 보세요', { bad: true, ms: 4500 }); return; }
  L.mats = [];
  const add = pts => L.mats.push({ id: U.uid('m'), pts, block, thick: 25, trim: 'rubber' });
  if (how === 'all') add(P.map(p => p.slice()));
  else if (how === 'free') {
    // one area around each free-weight item (its use space + 30 cm, on the 50 cm block grid); areas that touch become one, so no block is counted twice
    const box = pts => { const b = G.bounds(pts); return { pts, x0: U.snap(b.minX, .5), x1: U.snap(b.maxX, .5), z0: U.snap(b.minZ, .5), z1: U.snap(b.maxZ, .5) }; };
    const cl = fw.map(it => { const d = GP.dims(it), c = (GP.getDef(it.type) || {}).cl || {}; return box(G.rectPts(it.x, it.z, it.rot, -d.w / 2 - (c.l || 0) - .3, d.w / 2 + (c.r || 0) + .3, -d.d / 2 - (c.b || 0) - .3, d.d / 2 + (c.f || 0) + .3)); });
    for (let i = 0; i < cl.length; i++) for (let j = i + 1; j < cl.length; j++) { const a = cl[i], b = cl[j]; if (a.x0 < b.x1 && b.x0 < a.x1 && a.z0 < b.z1 && b.z0 < a.z1) { cl[i] = box(a.pts.concat(b.pts)); cl.splice(j, 1); i = -1; break; } }
    for (const g of cl) { const r = GP.tools.clipPoly(P, [[g.x0, g.z0], [g.x1, g.z0], [g.x1, g.z1], [g.x0, g.z1]]); if (r.length >= 3) add(r.map(p => [U.r3(p[0]), U.r3(p[1])])); }
  }
  GP.changed('mats');
}

/* ---------------- check & send ---------------- */
R.done = {
  render(b) {
    GP.checks.full(); const L = GP.L(), A = Math.abs(G.area(L.room.pts)), R0 = GP.quote.compute(), list = (GP.checks.list || []).filter(c => c.sev !== 'info'), blocks = GP.calc.matSummary().blocks.reduce((a, x) => a + x.count, 0);
    b.innerHTML = head('마지막으로 확인하고 보내요', '확인할 점을 보고, 단가를 넣은 뒤 고객에게 보내세요.') +
      `<div class="wz-sum"><div><b>${(A / U.PY).toFixed(1)}평</b><small>${A.toFixed(1)}㎡</small></div><div><b>${L.items.filter(eqOnly).length}대</b><small>운동기구</small></div><div><b>${blocks}장</b><small>고무블럭</small></div></div>
      <div class="wz-res${R0.missing ? ' warn' : ''}"><b>견적 ${U.won(R0.total)}원 <small>(부가세 포함)</small></b>${R0.missing ? `<span>단가가 없는 품목이 ${R0.missing}개 있어요.</span>` : ''}<button class="btn sm" id="wzQuote">${IC.doc}${R0.missing ? '단가 입력하기' : '견적서 보기'}</button></div>
      ${list.length ? `<div class="wz-list"><div class="wz-lh">확인할 점 ${list.length}개 <small>눌러서 위치 보기</small></div>${list.slice(0, 8).map((c, k) => `<button class="wz-li chk ${c.sev}" data-ck="${k}"><i></i><span>${U.esc(c.msg)}</span></button>`).join('')}</div>` : '<p class="wz-ok">배치 점검 결과 확인할 점이 없어요.</p>'}
      <div class="wz-send"><button class="btn primary" data-sd="link">${IC.link}고객용 링크 보내기</button><button class="btn" data-sd="proposal">${IC.pdf}제안서 PDF</button><button class="btn" data-sd="quote">${IC.pdf}견적서 PDF</button><button class="btn" data-sd="3d">${IC.cube}3D로 보기</button></div>
      <button class="btn ghost wide" data-sd="expert">${IC.gear}전문가 모드에서 더 다듬기</button>`;
    b.onclick = e => {
      if (e.target.closest('#wzQuote')) { ui.openQuote(); return; }
      const c = e.target.closest('[data-ck]'); if (c) { const it = list[+c.dataset.ck]; if (it.uids.length) ui.select(it.uids.map(u => ({ k: 'item', id: u }))); if (it.at) GP.S.focus(it.at); return; }
      const s = e.target.closest('[data-sd]'); if (!s) return; const a = s.dataset.sd;
      if (a === 'link') GP.exp.shareDialog('link'); else if (a === 'proposal') GP.exp.proposalPdf(true); else if (a === 'quote') GP.exp.quotePdf(); else if (a === '3d') GP.V3.show(!GP.V3.on); else if (a === 'expert') W.setMode('expert');
    };
  },
  refresh() { R.done.render($('#wzBody')); },
};

/* live updates of the open step (partitions drawn, doors placed, items moved) */
GP.on('changed', U.debounce(() => W.refresh(), 120));
GP.on('restore', () => { W.lastAuto = null; W.refresh(); });
GP.on('tool', () => { if (W.on && cur && cur.refresh && (STEPS[W.step].id === 'door' || STEPS[W.step].id === 'part')) cur.refresh(); });

$('#modeBtn') && $('#modeBtn').addEventListener('click', () => W.setMode(W.mode() === 'easy' ? 'expert' : 'easy'));
})();
