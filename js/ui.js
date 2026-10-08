/* GoFit Planner — UI framework: selection, change pipeline, top bar, inspector, tooltip, summary, popovers, modals */
(function () {
'use strict';
const GP = window.GP, U = GP.U, G = GP.G, $ = U.$, $$ = U.$$;

/* ---------------- icons ---------------- */
const sv = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const IC = GP.IC = {
  menu: sv('<path d="M4 7h16M4 12h16M4 17h16"/>'), undo: sv('<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>'), redo: sv('<path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>'),
  x: sv('<path d="M18 6 6 18M6 6l12 12"/>'), share: sv('<path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7"/><path d="m16 6-4-4-4 4"/><path d="M12 2v13"/>'),
  plus: sv('<path d="M12 5v14M5 12h14"/>'), minus: sv('<path d="M5 12h14"/>'), fit: sv('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'), search: sv('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
  select: sv('<path d="m4 3 7 17 2.5-7.5L21 10z"/>'), multi: sv('<rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/><path d="M13 7h4v4M7 13v4h4" stroke-dasharray="2 2"/>'),
  vertex: sv('<path d="M4 18 9 5l10 3-3 11z"/><circle cx="4" cy="18" r="1.8" fill="currentColor"/><circle cx="9" cy="5" r="1.8" fill="currentColor"/><circle cx="19" cy="8" r="1.8" fill="currentColor"/><circle cx="16" cy="19" r="1.8" fill="currentColor"/>'),
  wall: sv('<path d="M3 20V9h8v11M11 20V4h10v16"/><path d="M3 20h18"/>'), door: sv('<path d="M5 21V4h9v17"/><path d="M14 6a9 9 0 0 1 5 8"/><path d="M3 21h18"/><circle cx="11.5" cy="13" r=".8" fill="currentColor"/>'),
  room: sv('<rect x="3" y="4" width="18" height="16" rx="1.5"/><path d="M7 9h6M7 13h4"/>'), ruler: sv('<path d="m3 17 14-14 4 4L7 21z"/><path d="m7 13 2 2M10 10l2 2M13 7l2 2"/>'), note: sv('<path d="M5 3h10l4 4v14H5z"/><path d="M15 3v4h4M8 12h8M8 16h5"/>'),
  fill: sv('<path d="M3 20h18"/><rect x="4" y="9" width="4" height="8"/><rect x="10" y="9" width="4" height="8"/><rect x="16" y="9" width="4" height="8"/><path d="M4 5h16" stroke-dasharray="2 2"/>'),
  matRect: sv('<rect x="3" y="5" width="18" height="14" rx="1"/><path d="M3 12h18M9 5v14M15 5v14"/>'), matPoly: sv('<path d="M4 19V8l6-4 10 4v11z"/><path d="M4 13h16M10 4v15M15 6v13"/>'),
  zone: sv('<rect x="3" y="4" width="18" height="16" rx="2" stroke-dasharray="3 3"/><path d="M8 12h8"/>'),
  rotL: sv('<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>'), rotR: sv('<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>'),
  folder: sv('<path d="M3 6a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/>'), filePlus: sv('<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5M12 11v6M9 14h6"/>'),
  save: sv('<path d="M5 3h11l3 3v15H5z"/><path d="M8 3v5h7V3M8 21v-7h8v7"/>'), open: sv('<path d="M3 7a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v2"/><path d="M3 7v11a1 1 0 0 0 1 1h14l3-8H7l-3 8"/>'), clock: sv('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  gear: sv('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
  help: sv('<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .8-1 1.5v.7"/><circle cx="12" cy="17" r=".6" fill="currentColor"/>'), install: sv('<path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 17v3h16v-3"/>'),
  image: sv('<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>'), pdf: sv('<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5M8 13h8M8 17h5"/>'),
  link: sv('<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>'), html: sv('<path d="m8 8-5 4 5 4M16 8l5 4-5 4M14 4l-4 16"/>'), cad: sv('<path d="M3 21 21 3M3 12h9v9M12 3v9"/>'),
  up: sv('<path d="m6 15 6-6 6 6"/>'), down: sv('<path d="m6 9 6 6 6-6"/>'), trash: sv('<path d="M4 7h16M10 11v6M14 11v6M5 7l1 13h12l1-13M9 7V4h6v3"/>'),
  eye: sv('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'), copy: sv('<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V4a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h4"/>'), build: sv('<rect x="3" y="12" width="8" height="8" rx="1"/><rect x="13" y="12" width="8" height="8" rx="1"/><rect x="8" y="3" width="8" height="8" rx="1"/>'),
  star: sv('<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/>'), cube: sv('<path d="m12 2 9 5v10l-9 5-9-5V7z"/><path d="m3 7 9 5 9-5M12 12v10"/>'),
  doc: sv('<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4M9 11h7M9 15h7M9 19h4"/>'), mirror: sv('<rect x="5" y="3" width="14" height="18" rx="1"/><path d="m8 9 4-4M8 14l8-8M11 17l5-5"/>'),
};
GP.fillIcons = (root) => { $$('.ic', root).forEach(el => { el.outerHTML = IC[el.dataset.ic] || ''; }); };

/* ---------------- josa (Korean particles) ---------------- */
U.jo = (w, a, b) => { const s = String(w || ''); const c = s.charCodeAt(s.length - 1); if (c >= 0xAC00 && c <= 0xD7A3) return s + ((c - 0xAC00) % 28 ? a : b); return s + b; };

/* ---------------- toast / busy / modal / popover / confirm ---------------- */
let toastT = 0;
GP.toast = (msg, o) => {
  o = o || {}; const t = $('#toast'); t.innerHTML = `<span>${U.esc(msg)}</span>` + (o.action ? `<button>${U.esc(o.action)}</button>` : '');
  t.classList.toggle('bad', !!o.bad); t.hidden = false; t.style.animation = 'none'; void t.offsetWidth; t.style.animation = '';
  if (o.action) t.querySelector('button').onclick = () => { t.hidden = true; o.onAction && o.onAction(); };
  clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, o.ms || (o.bad ? 3800 : 2600));
};
GP.busy = (on, text, pct) => { const b = $('#busy'); b.hidden = !on; if (text) $('#busyText').textContent = text; $('#busyBar').style.width = (pct == null ? 0 : pct * 100) + '%'; $('#busyBar').parentElement.hidden = pct == null; };
const modal = $('#modal');
GP.modal = (title, body, foot, o) => {
  o = o || {}; $('#modalTitle').textContent = title; const mb = $('#modalBody'); if (typeof body === 'string') mb.innerHTML = body; else { mb.innerHTML = ''; mb.appendChild(body); }
  $('#modalFoot').innerHTML = foot || ''; const card = modal.querySelector('.modal-card'); card.className = 'modal-card ' + (o.size || ''); modal.hidden = false; GP.fillIcons(modal); GP.modalOnClose = o.onClose || null;
  const f = mb.querySelector('[autofocus]'); if (f) setTimeout(() => f.focus(), 30);
  return mb;
};
GP.closeModal = () => { if (modal.hidden) return; modal.hidden = true; $('#modalBody').innerHTML = ''; const cb = GP.modalOnClose; GP.modalOnClose = null; if (cb) cb(); };
modal.addEventListener('click', e => { if (e.target === modal || e.target.closest('[data-close]')) GP.closeModal(); });
GP.confirm = (msg, okLabel, danger) => new Promise(res => {
  GP.modal('확인', `<p style="margin:4px 0 0;line-height:1.6">${U.esc(msg)}</p>`, `<button class="btn" data-close>취소</button><button class="btn ${danger ? 'danger' : 'primary'}" id="cfOk">${U.esc(okLabel || '확인')}</button>`, { size: 'narrow', onClose: () => res(false) });
  $('#cfOk').onclick = () => { GP.modalOnClose = null; GP.closeModal(); res(true); };
});
GP.prompt = (title, label, val) => new Promise(res => {
  GP.modal(title, `<label class="fld"><span>${U.esc(label)}</span><input id="pmIn" value="${U.esc(val || '')}" autofocus></label>`, `<button class="btn" data-close>취소</button><button class="btn primary" id="pmOk">확인</button>`, { size: 'narrow', onClose: () => res(null) });
  const ok = () => { const v = $('#pmIn').value; GP.modalOnClose = null; GP.closeModal(); res(v); };
  $('#pmOk').onclick = ok; $('#pmIn').onkeydown = e => { if (e.key === 'Enter') ok(); };
});
const pop = $('#pop');
GP.popover = (anchor, html, onClick) => {
  if (!pop.hidden && pop.dataset.anchor === anchor.id) { GP.closePop(); return; }
  pop.innerHTML = html; GP.fillIcons(pop); pop.hidden = false; pop.dataset.anchor = anchor.id || '';
  const r = anchor.getBoundingClientRect(); const pw = pop.offsetWidth, ph = pop.offsetHeight;
  let x = Math.min(window.innerWidth - pw - 8, Math.max(8, r.right - pw)); if (anchor.id === 'menuBtn') x = Math.max(8, r.left);
  let y = r.bottom + 6; if (y + ph > window.innerHeight - 8) y = Math.max(8, r.top - ph - 6);
  pop.style.left = x + 'px'; pop.style.top = y + 'px';
  pop.onclick = e => { const b = e.target.closest('[data-act]'); if (b && onClick) { const keep = onClick(b.dataset.act, b, e); if (!keep) GP.closePop(); } };
};
GP.closePop = () => { pop.hidden = true; pop.dataset.anchor = ''; };
document.addEventListener('pointerdown', e => { if (!pop.hidden && !pop.contains(e.target) && !e.target.closest('#' + (pop.dataset.anchor || 'x'))) GP.closePop(); }, true);

/* ---------------- prices & info (tooltip, inspector, viewer) ---------------- */
const INFO = GP.info = {};
INFO.NO_QUOTE = new Set(['column', 'outlet']);
INFO.showPrice = () => !GP.viewOnly || !!GP.viewPrice;
INFO.priceLines = (unitPrice, qty, unit) => {
  if (!INFO.showPrice()) return '';
  if (!unitPrice) return `<div class="tip-p none">가격 미입력</div>`;
  const sup = Math.round(unitPrice * (qty || 1)), inc = Math.round(sup * 1.1);
  return `<div class="tip-p"><span>부가세 별도</span><b>${U.won(sup)}원</b></div><div class="tip-p"><span>부가세 포함</span><b>${U.won(inc)}원</b></div>` + (qty > 1 ? `<div class="tip-s">${U.won(unitPrice)}원 × ${qty}${unit || ''}</div>` : '');
};
INFO.item = (it) => {
  const def = GP.getDef(it.type) || {}, d = GP.dims(it), m = GP.mountOf(it);
  const cat = (GP.CATS.find(c => c.id === def.cat) || {}).name || '';
  const where = m === 'wall' ? ` · 벽 설치 높이 ${U.cm(GP.itemY(it))}cm` : m === 'ceil' ? ' · 천장 설치' : '';
  const has3d = GP.R3.ok && GP.R3.hasModel(it.type), nph = GP.media.photos(it.type).length;
  const act = GP.viewOnly ? '눌러서' : '더블클릭하면';
  return `<div class="tip-h"><b>${U.esc(GP.itemName(it))}</b><small>${U.esc(cat)} · ${U.cm(d.w)}×${U.cm(d.d)}${def.hFromWall ? '' : '×' + U.cm(d.h)}cm${where}</small></div>`
    + (INFO.NO_QUOTE.has(it.type) ? '' : INFO.priceLines(GP.lib.prices[it.type] || 0, 1))
    + `<div class="tip-f">${has3d ? `${IC.cube}<span>${act} 3D 모델 보기${nph ? ` · 사진 ${nph}장` : ''}</span>` : nph ? `${IC.image}<span>${act} 사진 ${nph}장 보기</span>` : GP.viewOnly ? '<span class="muted">3D 모델 준비 중</span>' : `<span class="muted">더블클릭해서 사진·3D 등록</span>`}</div>`;
};
INFO.mat = (m) => {
  const B = GP.BLOCKS[m.block] || GP.BLOCKS.coat, A = GP.calc.matArea(m), n = GP.calc.matBlocks(m), t = GP.calc.matTrims(m);
  const trimTxt = m.trim && m.trim !== 'none' ? `${GP.TRIMS[m.trim].replace('경사형 ', '')} · 일자 ${t.straight} · 모서리 ${t.outC} · 역모서리 ${t.inC}` : '마감재 없음';
  return `<div class="tip-h"><b>${U.esc(B.name)} 25T</b><small>${A.toFixed(1)}㎡ (${(A / U.PY).toFixed(1)}평) · 500×500 · ${n}장</small></div>`
    + INFO.priceLines(GP.lib.matPrices[`${m.block}|25`] || 0, n, '장')
    + `<div class="tip-s">${trimTxt}</div>`;
};
INFO.opening = (o) => `<div class="tip-h"><b>${U.esc(GP.OPENINGS[o.kind] || '문')}</b><small>폭 ${U.cm(o.w)}cm${o.kind === 'window' ? ` · 높이 ${U.cm(o.h ?? 1.2)}cm` : ` · 높이 ${U.cm(o.h ?? 2.1)}cm`}</small></div>`;
const tip = $('#tip');
GP.tip = {
  show(cx, cy, html) { tip.innerHTML = html; tip.hidden = false; const r = $('#stage').getBoundingClientRect(); const w = tip.offsetWidth, h = tip.offsetHeight; let x = cx - r.left + 16, y = cy - r.top + 16; if (x + w > r.width - 8) x = cx - r.left - w - 12; if (y + h > r.height - 8) y = cy - r.top - h - 12; tip.style.transform = `translate(${Math.max(6, x)}px,${Math.max(6, y)}px)`; },
  hide() { tip.hidden = true; },
};

/* ---------------- selection ---------------- */
const ui = GP.ui = { step: 'place', tool: 'select', sel: [], multi: false, placing: null, drawing: null };
ui.selSet = () => new Set(ui.sel.map(s => s.k + ':' + s.id));
ui.select = (list, add) => {
  list = (list || []).filter(Boolean);
  if (add) { const cur = ui.selSet(); list.forEach(s => { const k = s.k + ':' + s.id; if (cur.has(k)) ui.sel = ui.sel.filter(q => q.k + ':' + q.id !== k); else ui.sel.push(s); }); }
  else ui.sel = list;
  GP.emit('selection');
};
ui.clearSel = () => { if (ui.sel.length) { ui.sel = []; GP.emit('selection'); } };
ui.selItems = () => ui.sel.filter(s => s.k === 'item').map(s => GP.findItem(s.id)).filter(Boolean);
ui.selObj = () => { if (ui.sel.length !== 1) return null; const s = ui.sel[0]; if (s.k === 'wall') return { k: 'wall', id: s.id, obj: s.id }; const o = GP.findBy(s.k, s.id); return o ? { k: s.k, id: s.id, obj: o } : null; };

/* ---------------- change pipeline ---------------- */
let fullT = 0;
GP.changed = (parts, opt) => {
  opt = opt || {}; const P = new Set(Array.isArray(parts) ? parts : [parts]); const S = GP.S;
  S.dataChanged(); GP.checks.quick(); ui.updateDistances();
  clearTimeout(fullT); fullT = setTimeout(() => { GP.checks.full(); S.invalidate(); }, opt.fast ? 600 : 250);
  GP.emit('changed', P);
  if (opt.commit !== false) GP.H.commit();
};
ui.updateDistances = () => { const it = ui.sel.length === 1 && ui.sel[0].k === 'item' ? GP.findItem(ui.sel[0].id) : null; GP.S.distLines = it && GP.mountOf(it) === 'floor' && !(GP.getDef(it.type) || {}).flat ? GP.calc.distances(it) : null; };
GP.on('selection', () => { ui.updateDistances(); GP.S.invalidate(); ui.renderInspector(); ui.renderSummary(); GP.emit('overlay'); });

/* ---------------- steps (tabs) & tools ---------------- */
const STEP_TOOLS = {
  space: [['select', '선택', 'select'], ['vertex', '벽 모양', 'vertex'], ['part', '가벽', 'wall'], ['opening', '문·창문', 'door'], ['roomlabel', '공간 이름', 'room'], ['measure', '줄자', 'ruler'], ['note', '메모', 'note']],
  place: [['select', '선택', 'select'], ['multi', '여러 개', 'multi'], ['fillwall', '벽 채우기', 'fill'], ['measure', '줄자', 'ruler'], ['note', '메모', 'note']],
  floor: [['select', '선택', 'select'], ['matRect', '사각형', 'matRect'], ['matPoly', '모양대로', 'matPoly'], ['zoneRect', '존 표시', 'zone']],
};
ui.setStep = (step) => {
  if (!STEP_TOOLS[step]) step = 'place';
  ui.step = step; $$('#steps button').forEach(b => b.classList.toggle('on', b.dataset.step === step));
  if (!$('#quoteSheet').hidden) ui.closeQuote();
  ['space', 'place', 'floor'].forEach(s => { $('#panel-' + s).hidden = s !== step; });
  $('#side').classList.toggle('scrolled', $('#panel-' + step).scrollTop > 2);
  GP.tools && GP.tools.cancel(); ui.setTool('select');
  ui.renderTools(); GP.emit('step', step); GP.emit('overlay'); GP.S.invalidate();
  ui.renderGuideBits();
};
/* beginner aids: a "next step" button under each step panel, and a card on an empty plan saying what to do first */
const NEXT = { space: ['place', '다음: 기구 놓기'], place: ['floor', '다음: 바닥 깔기'], floor: ['quote', '다음: 견적서 보기'] };
ui.renderGuideBits = () => {
  if (!GP.P) return; const L = GP.L(), st = ui.step, nx = $('#stepNext'), eh = $('#emptyHint');
  if (nx) {
    nx.hidden = GP.viewOnly; const n = NEXT[st] || NEXT.place;
    const info = st === 'space' ? `${U.r2(G.area(L.room.pts) / U.PY)}평 공간` : st === 'place' ? `기구 ${L.items.filter(it => !GP.info.NO_QUOTE.has(it.type)).length}대 놓음` : `고무블럭 ${L.mats.length}구역`;
    nx.innerHTML = `<small>${info}</small><button class="btn primary" data-next="${n[0]}">${n[1]} →</button>`;
  }
  if (eh) {
    let html = '';
    if (!GP.viewOnly && !ui.placing && $('#quoteSheet').hidden) {
      if (st === 'place' && !L.items.length) html = `<b>기구를 놓아 볼까요?</b><span>왼쪽 목록에서 기구를 누른 뒤 도면을 클릭하면 놓여요. 목록에서 도면으로 끌어다 놓아도 돼요.</span>`;
      else if (st === 'floor' && !L.mats.length) html = `<b>고무블럭을 깔아 볼까요?</b><span>왼쪽 ‘구역 그리기’에서 <b>방 전체</b>를 누르거나, <b>사각형</b>을 고른 뒤 깔 구역을 드래그해요.</span>`;
    }
    eh.innerHTML = ''; eh.hidden = true; void html; ui.setHint();   // the hint line says it now (no card over the plan)
  }
};
$('#stepNext') && $('#stepNext').addEventListener('click', e => { const b = e.target.closest('[data-next]'); if (!b) return; const n = b.dataset.next; if (n === 'quote') ui.openQuote(); else ui.setStep(n); $('#side .panel:not([hidden])') && ($('#side .panel:not([hidden])').scrollTop = 0); });
GP.on('changed', () => ui.renderGuideBits()); GP.on('placing', () => ui.renderGuideBits()); GP.on('project', () => ui.renderGuideBits());
ui.renderTools = () => {
  const t = $('#tools'); const list = STEP_TOOLS[ui.step] || [];
  t.hidden = !list.length || GP.viewOnly;
  t.innerHTML = list.map(q => `<button class="tool${(ui.tool === q[0] || (q[0] === 'multi' && ui.multi)) ? ' on' : ''}" data-tool="${q[0]}" title="${q[1]}">${IC[q[2]]}<span>${q[1]}</span></button>`).join('');
};
$('#tools').addEventListener('click', e => { const b = e.target.closest('[data-tool]'); if (!b) return; const id = b.dataset.tool; if (id === 'multi') { ui.multi = !ui.multi; ui.setTool('select'); GP.toast(ui.multi ? '누르는 기구가 차례로 선택에 추가돼요' : '여러 개 선택을 껐어요'); return; } ui.setTool(ui.tool === id && id !== 'select' ? 'select' : id); });
ui.setTool = (id) => {
  if (GP.tools) GP.tools.cancel();
  if (id !== 'select' && GP.V3 && GP.V3.on) GP.V3.show(false);
  ui.tool = id;
  ui.renderTools(); ui.setHint(); GP.emit('tool', id); GP.emit('overlay'); GP.S.invalidate();
};
$('#steps').addEventListener('click', e => { const b = e.target.closest('[data-step]'); if (b) ui.setStep(b.dataset.step); });
/* divider shadow under the step tabs while the panel is scrolled */
['space', 'place', 'floor'].forEach(s => $('#panel-' + s).addEventListener('scroll', e => $('#side').classList.toggle('scrolled', e.target.scrollTop > 2), { passive: true }));
/* colour / line-only (CAD) style — applies to the plan, the 3D view and exports */
ui.setStyle = (st) => { GP.S.style = st; try { localStorage.setItem('gofit:style', st); } catch (e) { } GP.S.invalidate(); if (GP.V3 && GP.V3.on) GP.V3.rebuild(); };
/* 보기 menu: drawing style, what the plan shows (these used to be a row of toggles under the plan), the wall magnet */
const VIEW_LAYERS = [['labels', '기구 이름'], ['dims', '치수'], ['clear', '사용 공간', '기구 앞뒤로 운동에 필요한 공간'], ['mats', '바닥(고무블럭)'], ['zones', '존'], ['notes', '메모'], ['aisle', '좁은 통로', '기준보다 좁은 곳을 빨갛게'], ['egress', '비상 동선', '가장 먼 곳에서 출입문까지']];
function viewMenuHtml() {
  const S = GP.S, lays = GP.viewOnly ? VIEW_LAYERS.filter(l => !['aisle', 'egress'].includes(l[0])) : VIEW_LAYERS;
  const row = (act, on, t, d) => `<button class="mi chk${on ? ' on' : ''}" data-act="${act}"><i class="cb"></i><div><b>${t}</b>${d ? `<small>${d}</small>` : ''}</div></button>`;
  return `<div class="ph">화면</div><div class="seg full vm-style"><button data-act="style:color" class="${S.style !== 'line' ? 'on' : ''}">컬러</button><button data-act="style:line" class="${S.style === 'line' ? 'on' : ''}">선만 (캐드처럼)</button></div>
    <div class="ph">도면에 보이기</div>${lays.map(([k, t, d]) => row('lay:' + k, S.layers[k], t, d)).join('')}
    ${GP.viewOnly ? '' : `<hr><div class="ph">편집 도움</div>${row('magnet', ui.magnet, '벽 자석', '기구를 벽 가까이 가져가면 붙어요')}`}`;
}
$('#viewBtn').addEventListener('click', () => {
  GP.popover($('#viewBtn'), viewMenuHtml(), (act) => {
    const S = GP.S;
    if (act.startsWith('style:')) ui.setStyle(act.slice(6));
    else if (act.startsWith('lay:')) { const k = act.slice(4); S.layers[k] = !S.layers[k]; if ((k === 'aisle' || k === 'egress') && S.layers[k]) GP.checks.full(); S.invalidate(); }
    else if (act === 'magnet') { ui.magnet = !ui.magnet; GP.toast(ui.magnet ? '벽 자석을 켰어요' : '벽 자석을 껐어요 (5cm 단위로만 맞춰져요)'); }
    $('#pop').innerHTML = viewMenuHtml(); return true;
  });
});
/* help: shortcuts and the guide */
$('#helpBtn').addEventListener('click', () => {
  const k = (keys, t) => `<div class="hk"><span>${keys.map(x => `<kbd>${x}</kbd>`).join(' ')}</span><em>${t}</em></div>`;
  GP.popover($('#helpBtn'), `<div class="ph">마우스</div><div class="hks">${k(['끌기'], '기구 옮기기 · 빈 곳은 여러 개 선택')}${k(['오른쪽 버튼 끌기'], '화면 이동')}${k(['Space', '끌기'], '화면 이동')}${k(['휠'], '확대 · 축소')}${k(['더블클릭'], '기구 3D 모델 보기')}</div>
    <div class="ph">키보드</div><div class="hks">${k(['R'], '90° 회전')}${k(['Q', 'E'], '15° 회전')}${k(['Del'], '삭제')}${k(['Ctrl', 'D'], '복제')}${k(['Ctrl', 'Z'], '되돌리기')}${k(['방향키'], '5cm 이동 (Shift 50cm)')}${k(['Esc'], '취소 · 선택 해제')}</div>
    <hr><button class="mi" data-act="guide">${IC.help}<div><b>사용 가이드 다시 보기</b><small>3단계로 둘러보기</small></div></button>`, a => { if (a === 'guide') GP.panels.guide(); });
});

/* ---------------- hint bar ---------------- */
const HINTS = {
  select: '기구를 <b>끌어</b> 옮기고 · 빈 곳을 끌면 여러 개 선택',
  selectSpace: '벽·문·가벽을 <b>눌러서</b> 고쳐요',
  selectFloor: '고무블럭 구역을 <b>눌러서</b> 종류·마감재를 바꿔요',
  emptyPlace: '왼쪽 목록에서 기구를 <b>누른 뒤</b> 도면을 클릭해 놓아 보세요',
  emptyFloor: '왼쪽 <b>방 전체</b>를 누르거나 <b>사각형</b>으로 구역을 그려 고무블럭을 깔아요',
  vertex: '꼭짓점·벽을 <b>끌어</b> 모양 바꾸기 · 길이·각도 숫자를 <b>눌러</b> 입력',
  part: '<b>클릭</b>으로 가벽 시작 · 계속 클릭해 꺾기 · <b>더블클릭</b>이나 <kbd>Enter</kbd>로 끝 · 숫자 입력 후 <kbd>Enter</kbd>로 길이 지정',
  opening: '벽이나 가벽 위를 <b>클릭</b>해서 놓기',
  roomlabel: '방 안을 <b>클릭</b>하면 이름을 붙이고 면적을 계산해요',
  measure: '두 점을 <b>클릭</b>해서 길이 재기',
  note: '메모를 붙일 곳을 <b>클릭</b>',
  matRect: '<b>드래그</b>해서 깔 구역을 그려요 · 벽에서 25cm 안이면 벽에 딱 붙어요',
  matPoly: '<b>클릭</b>으로 모서리를 찍고, 첫 점을 누르거나 <b>더블클릭</b>으로 완성',
  zoneRect: '<b>드래그</b>해서 존(유산소 존 등) 영역을 그려요',
  fillwall: '기구를 줄 세울 <b>벽을 클릭</b>하세요',
  placing: '<b>클릭</b>해서 놓기 · <kbd>R</kbd> 회전 · <kbd>Shift</kbd>+클릭 연속 배치 · <kbd>Alt</kbd> 자석 끄기',
  select3d: '기구를 <b>눌러 선택</b>한 뒤 <b>끌면</b> 이동 · <kbd>R</kbd> 회전 · <kbd>Del</kbd> 삭제 · 빈 곳을 끌면 화면 회전',
  other3d: '3D에서는 기구를 배치·이동할 수 있어요 · 벽·문·바닥은 <b>2D 도면</b>에서 고쳐요',
  placing3d: '원하는 곳을 <b>눌러서</b> 놓기 · <kbd>R</kbd> 회전 · <kbd>Shift</kbd>+클릭 연속 배치',
};
ui.setHint = (custom) => {
  const h = $('#hint'); let s = custom;
  const v3 = GP.V3 && GP.V3.on;
  if (!v3 && (ui.tool === 'part' || ui.tool === 'matPoly')) { h.innerHTML = ''; h.hidden = true; if (GP.tools && GP.tools.drawBar) GP.tools.drawBar(); return; }   // the drawing bar says it (and keeps saying it)
  if (v3 && GP.V3.walking && !custom) { h.innerHTML = ''; h.hidden = true; return; }     // the walk mode shows its own help
  if (!s && v3 && !GP.viewOnly) s = ui.placing ? HINTS.placing3d : ui.step === 'place' ? HINTS.select3d : HINTS.other3d;
  if (!s && !v3 && !GP.viewOnly && !ui.placing && ui.tool === 'select' && GP.P) { const L = GP.L(); if (ui.step === 'place' && !L.items.length) s = HINTS.emptyPlace; else if (ui.step === 'floor' && !L.mats.length) s = HINTS.emptyFloor; }
  if (!s) { if (GP.viewOnly) s = ''; else if (ui.placing) s = HINTS.placing; else if (ui.tool === 'select') s = ui.step === 'space' ? HINTS.selectSpace : ui.step === 'floor' ? HINTS.selectFloor : HINTS.select; else s = HINTS[ui.tool] || ''; }
  if (ui.tool === 'opening' && !custom) s += `<span class="opts">${Object.entries(GP.OPENINGS).map(([k, v]) => `<button class="btn xs ${ui.openingKind === k ? 'on' : ''}" data-ok="${k}">${v}</button>`).join('')}</span>`;
  if ((ui.placing || ['part', 'matPoly', 'measure', 'fillwall', 'opening'].includes(ui.tool)) && !custom) s += ` <button class="btn xs" data-cancel>취소 Esc</button>`;
  h.innerHTML = s; h.hidden = !s;
};
ui.openingKind = 'door';
$('#hint').addEventListener('click', e => { const k = e.target.closest('[data-ok]'); if (k) { ui.openingKind = k.dataset.ok; ui.setHint(); return; } if (e.target.closest('[data-cancel]')) { GP.tools.cancel(); ui.setTool('select'); } });

/* ---------------- HUD, layers, zoom ---------------- */
ui.renderHUD = () => {
  const L = GP.L(), A = Math.abs(G.area(L.room.pts)); const eq = L.items.filter(it => GP.EQUIP_CATS.has((GP.getDef(it.type) || {}).cat) && !(GP.getDef(it.type) || {}).flat).length;
  $('#hud').innerHTML = `<div class="hud-area"><b>${(A / U.PY).toFixed(1)}</b><span>평</span><em>${A.toFixed(1)}㎡</em></div><div class="hud-meta">운동기구 ${eq}대</div>`;
};
const LAYERS = [['labels', '이름'], ['clear', '사용 공간'], ['mats', '바닥'], ['zones', '존'], ['dims', '치수'], ['notes', '메모'], ['aisle', '좁은 통로'], ['egress', '비상 동선'], ['magnet', '벽 자석']];
/* wall magnet: a device setting (off by default); the button on the plan and the 보기 menu both switch it */
Object.defineProperty(ui, 'magnet', { get: () => !!GP.lib.magnet, set: v => { GP.lib.magnet = !!v; GP.saveLib(); ui.renderMagnet(); }, configurable: true });
ui.renderMagnet = () => {
  const b = $('#magChip'); if (!b) return; const on = ui.magnet;
  b.hidden = GP.viewOnly || ui.step !== 'place'; b.classList.toggle('on', on);
  b.innerHTML = `<i></i><span>벽 자석 <b>${on ? '켬' : '끔'}</b></span>`; b.title = on ? '켜져 있어요: 기구를 벽 가까이 가져가면 벽에 붙어요. 누르면 꺼져요' : '꺼져 있어요: 기구가 벽에 붙지 않고 5cm 단위로만 맞춰져요. 누르면 켜져요';
};
$('#magChip').addEventListener('click', () => { ui.magnet = !ui.magnet; GP.toast(ui.magnet ? '벽 자석을 켰어요 · 기구를 벽 가까이 가져가면 붙어요' : '벽 자석을 껐어요 · 벽에 붙지 않고 5cm 단위로 맞춰져요'); });
GP.on('step', ui.renderMagnet); GP.on('booted', ui.renderMagnet);
ui.renderLayers = () => {
  $('#layersBox').hidden = true; return;   // moved into the 보기 menu (top bar)
  const S = GP.S; let lays = LAYERS; if (GP.viewOnly) lays = LAYERS.filter(l => ['labels', 'clear', 'mats', 'zones', 'dims', 'notes'].includes(l[0]));
  $('#layersBox').innerHTML = `<span class="lb-t">${IC.eye}</span>` + lays.map(([k, n]) => `<button class="tg${(k === 'magnet' ? ui.magnet : S.layers[k]) ? ' on' : ''}" data-layer="${k}"><i></i>${n}</button>`).join('');
};
$('#layersBox').addEventListener('click', e => {
  const b = e.target.closest('[data-layer]'); if (!b) return; const k = b.dataset.layer, S = GP.S;
  if (k === 'magnet') { ui.magnet = !ui.magnet; GP.toast(ui.magnet ? '벽 자석을 켰어요' : '벽 자석을 껐어요 (5cm 격자로만 맞춰져요)'); }
  else { S.layers[k] = !S.layers[k]; if ((k === 'aisle' || k === 'egress') && S.layers[k]) GP.checks.full(); if (k === 'labels') S.layers.labels = S.layers.labels; S.invalidate(); }
  ui.renderLayers(); GP.emit('overlay');
});
ui.renderZoom = () => { $('#zoomBox').innerHTML = `<button data-z="in" title="확대">${IC.plus}</button><button data-z="out" title="축소">${IC.minus}</button><button data-z="fit" title="도면 전체 보기">${IC.fit}</button>`; };
$('#zoomBox').addEventListener('click', e => { const b = e.target.closest('[data-z]'); if (!b) return; const z = b.dataset.z, S = GP.V3 && GP.V3.on ? null : GP.S; if (!S) { if (z === 'in') GP.V3.zoomBy(1.25); else if (z === 'out') GP.V3.zoomBy(.8); else GP.V3.view('persp'); return; } if (z === 'in') S.zoomBy(1.25); else if (z === 'out') S.zoomBy(.8); else S.fit(); });

/* ---------------- variants (A안 / B안) ---------------- */
ui.renderVariants = () => {
  const P = GP.P; const v = $('#variants'); v.hidden = GP.viewOnly && P.variants.length < 2;
  v.innerHTML = `<button class="on var-btn" data-var="menu" title="배치안 바꾸기 · 새 안 만들기 · 비교">${U.esc(P.variants[P.cur].name)}${P.variants.length > 1 ? `<small>${P.cur + 1}/${P.variants.length}</small>` : ''}<span class="caret">▾</span></button>`;
};
$('#variants').addEventListener('click', e => {
  const b = e.target.closest('[data-var]'); if (!b) return; const v = b.dataset.var, P = GP.P;
  if (v === 'menu') {
    const eq = L => L.items.filter(it => !GP.info.NO_QUOTE.has(it.type)).length;
    GP.popover(b, `<div class="ph">배치안</div>${P.variants.map((q, i) => `<button class="mi${i === P.cur ? ' cur' : ''}" data-act="v${i}"><div><b>${U.esc(q.name)}${i === P.cur ? ' · 지금 보는 안' : ''}</b><small>기구 ${eq(q.layout)}대</small></div></button>`).join('')}
      ${GP.viewOnly ? '' : `<hr><button class="mi" data-act="add">${IC.plus}<div><b>새 안 만들기</b><small>지금 안을 복사해서 시작해요</small></div></button>${P.variants.length > 1 ? `<button class="mi" data-act="cmp">${IC.doc}<div><b>안 비교</b><small>기구 수 · 면적 · 견적을 나란히</small></div></button>` : ''}<button class="mi" data-act="ren">${IC.note}<div><b>이름 바꾸기 · 삭제</b><small>${U.esc(P.variants[P.cur].name)}</small></div></button>`}`, (a) => {
      if (a === 'cmp') GP.panels.compare(); else if (a === 'ren') ui.varRename(P.cur); else if (a === 'add') ui.varPick('add'); else if (a[0] === 'v') ui.varPick(+a.slice(1));
    });
    return;
  }
  ui.varPick(v);
});
ui.varPick = (v) => {
  const P = GP.P;
  if (v === 'add') { const src = P.variants[P.cur]; const n = { id: U.uid('v'), name: String.fromCharCode(65 + P.variants.length) + '안', layout: U.clone(src.layout) }; P.variants.push(n); P.cur = P.variants.length - 1; ui.sel = []; GP.changed('all'); ui.renderVariants(); GP.emit('project'); GP.toast(`${n.name}을 만들었어요. 지금 안을 복사했어요`); return; }
  const i = +v; if (i === P.cur) return; P.cur = i; ui.sel = []; GP.tools && GP.tools.cancel(); GP.changed('all', { commit: false }); if (!GP.viewOnly) GP.H.commit(); ui.renderVariants(); GP.emit('project');
};
ui.varRename = (i) => {
  const P = GP.P; if (GP.viewOnly) return;
  GP.modal('안 이름', `<label class="fld"><span>이름</span><input id="vName" value="${U.esc(P.variants[i].name)}" autofocus></label>`, `${P.variants.length > 1 ? '<button class="btn danger" id="vDel">이 안 삭제</button>' : ''}<button class="btn" data-close>닫기</button><button class="btn primary" id="vOk">저장</button>`, { size: 'narrow' });
  $('#vOk').onclick = () => { P.variants[i].name = $('#vName').value.trim() || P.variants[i].name; GP.closeModal(); ui.renderVariants(); GP.H.commit(); };
  const del = $('#vDel'); if (del) del.onclick = async () => { GP.closeModal(); if (!(await GP.confirm(`${P.variants[i].name}을 삭제할까요? 되돌리기로 복구할 수 있어요.`, '삭제', true))) return; P.variants.splice(i, 1); P.cur = Math.min(P.cur, P.variants.length - 1); ui.sel = []; GP.changed('all'); ui.renderVariants(); };
};

/* ---------------- quote summary card (right side) ---------------- */
ui.smOpen = (() => { try { return localStorage.getItem('gofit:smOpen') === '1'; } catch (e) { return false; } })();
ui.renderSummary = () => {
  const box = $('#summary'); if (!box || !GP.P) return;
  const hide = GP.viewOnly || !$('#insp').hidden || !$('#quoteSheet').hidden; box.hidden = hide; if (hide) return;
  const R = GP.quote.compute(); const list = GP.checks.list || []; const errs = list.filter(c => c.sev === 'err').length, warns = list.filter(c => c.sev === 'warn').length;
  const open = ui.smOpen, st = errs ? 'err' : warns ? 'warn' : 'ok';
  box.classList.toggle('mini', !open);
  box.innerHTML = open ? `<div class="sm-h"><b>견적 요약</b><span class="sm-acts"><button class="btn xs" id="smOpen">${IC.doc}견적서</button><button class="icon-btn ghost sm" id="smFold" title="접기" aria-label="접기">${IC.up}</button></span></div>
    <div class="kv"><span>부가세 별도</span><b>${U.won(R.supply)}원</b><span>부가세 포함</span><b class="big">${U.won(R.total)}원</b></div>
    ${R.missing ? `<p class="sm-miss">가격 미입력 ${R.missing}개 · 견적서에서 입력</p>` : ''}
    <button class="sm-chk ${st}" id="checkBtn"><i></i>${errs + warns ? `확인할 점 ${errs + warns}개` : '배치 점검 이상 없음'}</button>`
    : `<button class="sm-mini" id="smFold" title="견적 요약 펼치기"><span>견적</span><b>${U.won(R.total)}원</b>${R.missing ? `<em>미입력 ${R.missing}</em>` : ''}${IC.down}</button><button class="sm-chk mini ${st}" id="checkBtn" title="배치 점검"><i></i>${errs + warns ? `확인 ${errs + warns}` : '이상 없음'}</button>`;
  const so = $('#smOpen'); if (so) so.onclick = () => ui.openQuote();
  $('#smFold').onclick = () => { ui.smOpen = !ui.smOpen; try { localStorage.setItem('gofit:smOpen', ui.smOpen ? '1' : ''); } catch (e) { } ui.renderSummary(); };
  $('#checkBtn').onclick = () => { GP.checks.full(); openChecks(); };
};
GP.on('changed', () => ui.renderSummary());
GP.on('media', () => { ui.renderInspector(); GP.emit('library'); });
GP.on('checks', () => { ui.renderSummary(); if (!pop.hidden && pop.dataset.anchor === 'checkBtn') openChecks(true); });
ui.openQuote = () => { GP.tools && GP.tools.cancel(); $('#quoteSheet').hidden = false; GP.panels.renderQuote(); ui.renderInspector(); ui.renderSummary(); ui.renderGuideBits(); };
ui.closeQuote = () => { $('#quoteSheet').hidden = true; ui.renderSummary(); ui.renderGuideBits(); };
$('#quoteBtn').addEventListener('click', () => { if ($('#quoteSheet').hidden) ui.openQuote(); else ui.closeQuote(); });

/* ---------------- inspector ---------------- */
const insp = $('#insp');
const num = (id, v, step, unit, o) => `<div class="unit"><input id="${id}" type="number" step="${step}" value="${v}" ${o || ''}><em>${unit}</em></div>`;
ui.renderInspector = () => {
  if (GP.viewOnly || !$('#quoteSheet').hidden) { insp.hidden = true; return; }
  const items = ui.selItems();
  if (ui.sel.length > 1 && items.length === ui.sel.length) { renderMulti(items); return; }
  const so = ui.selObj(); if (!so) { insp.hidden = true; ui.renderSummary(); return; }
  insp.hidden = false;
  const f = { item: inspItem, part: inspPart, opening: inspOpening, mat: inspMat, zone: inspZone, room: inspRoom, note: inspNote, dim: inspDim, wall: inspWall }[so.k];
  if (f) f(so.obj); else insp.hidden = true;
  GP.fillIcons(insp); ui.renderSummary();
};
function head(title, sub, color, editable) { return `<div class="insp-h"><span class="dot" style="--c:${color || 'var(--muted)'}"></span><div class="insp-t">${editable ? `<input class="name" id="iName" value="${U.esc(title)}" title="이름 바꾸기">` : `<b style="font-size:15px">${U.esc(title)}</b>`}<small>${sub || ''}</small></div><button class="icon-btn ghost sm" data-act="close" aria-label="선택 해제">${IC.x}</button></div>`; }
function priceBox(pk, price, label) { return `<div class="sec"><span class="lbl">${label || '단가 (부가세 별도)'}</span>${num('iPrice', price || '', 1000, '원', `min="0" placeholder="가격 미입력" data-pk="${pk}"`)}<small class="vat">${price ? `부가세 포함 ${U.won(Math.round(price * 1.1))}원` : '입력하면 이 기구 모두에 적용돼요'}</small></div>`; }
function inspItem(it) {
  const def = GP.getDef(it.type) || {}, d = GP.dims(it), mount = GP.mountOf(it), c = def.cl || {}, bad = GP.checks.conflicts.get(it.uid);
  const params = (def.params || []).map(q => { const v = (it.params || {})[q.k] ?? q.def; if (q.type === 'select') return `<label class="fld"><span>${q.label}</span><select data-param="${q.k}">${q.options.map(([k, l]) => `<option value="${k}" ${k === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>`; if (q.type === 'color') return `<label class="fld"><span>${q.label}</span><input type="color" data-param="${q.k}" value="${v}"></label>`; return `<label class="fld"><span>${q.label}</span><input type="number" data-param="${q.k}" min="${q.min}" max="${q.max}" step="${q.step}" value="${v}"></label>`; }).join('');
  const has3d = GP.R3.ok && GP.R3.hasModel(it.type), nph = GP.media.photos(it.type).length;
  insp.innerHTML = head(GP.itemName(it), `${U.esc(GP.typeName(it.type))} · ${U.cm(d.w)}×${U.cm(d.d)} cm`, `var(--cat-${def.cat || 'facility'})`, true)
    + (bad ? `<div class="insp-warn">${[bad.has('wall') ? '벽 밖으로 나갔어요' : '', bad.has('overlap') ? '다른 물건과 겹쳐요' : '', bad.has('part') ? '가벽과 겹쳐요' : ''].filter(Boolean).join(' · ')}</div>` : '')
    + `<button class="btn wide soft" data-act="model">${has3d ? IC.cube : IC.image}${has3d ? '3D 모델 보기' + (nph ? ` · 사진 ${nph}` : '') : nph ? `사진 ${nph}장 보기` : '사진·3D 파일 등록'}</button>`
    + (INFO.NO_QUOTE.has(it.type) ? '' : priceBox('type:' + it.type, GP.lib.prices[it.type]))
    + `<div class="sec"><span class="lbl">크기 <a data-act="resetSize">기본 크기로</a></span><div class="row3"><label class="fld"><span>가로</span>${num('iW', U.cm(d.w), 5, 'cm', 'min="5"')}</label><label class="fld"><span>세로</span>${num('iD', U.cm(d.d), 5, 'cm', 'min="2"')}</label><label class="fld"><span>높이</span>${num('iH', U.cm(d.h), 5, 'cm', 'min="1"')}</label></div></div>`
    + (params ? `<div class="sec"><span class="lbl">모양</span><div class="row2">${params}</div></div>` : '')
    + `<div class="sec"><span class="lbl">방향</span><div class="rot-row"><button class="icon-btn" data-act="rotL" title="반시계 90° (Shift+R)">${IC.rotL}</button>${num('iRot', Math.round(it.rot * 10) / 10, 1, '°')}<button class="icon-btn" data-act="rotR" title="시계 90° (R)">${IC.rotR}</button></div></div>`
    + (mount !== 'floor' ? `<div class="sec"><span class="lbl">${mount === 'wall' ? '벽에 거는 높이 (바닥에서)' : '천장에서 내려오는 거리'}</span>${num('iElev', U.cm(mount === 'wall' ? GP.itemY(it) : (it.elev || 0)), 5, 'cm', 'min="0"')}</div>` : '')
    + (mount === 'floor' && c && (c.f || c.b || c.l) ? `<p class="insp-note">권장 사용 공간 앞 ${c.f}m · 뒤 ${c.b}m · 양옆 ${c.l}m</p>` : '')
    + (GP.WEIGHTS && GP.WEIGHTS[it.type] ? `<p class="insp-note">무게 약 ${GP.WEIGHTS[it.type]}kg <small>(일반적인 업소용 기준${['plate', 'rack', 'storage'].includes(def.cat) ? ' · 원판·덤벨 제외' : ''})</small></p>` : '')
    + `<details class="sec more"><summary>줄 세우기 · 위치</summary><div class="row3"><label class="fld"><span>개수</span>${num('iRowN', 4, 1, '대', 'min="2" max="30"')}</label><label class="fld"><span>간격</span>${num('iRowG', Math.round(Math.max(10, ((c.l || 0) + (c.r || 0)) / 2 * 100)), 5, 'cm', 'min="0"')}</label><button class="btn sm" data-act="row">한 줄로</button></div><div class="row2"><label class="fld"><span>X</span>${num('iX', it.x.toFixed(2), .05, 'm')}</label><label class="fld"><span>Y</span>${num('iZ', it.z.toFixed(2), .05, 'm')}</label></div><div class="mount"><button class="${mount === 'floor' ? 'on' : ''}" data-act="mount" data-m="floor">바닥</button><button class="${mount === 'wall' ? 'on' : ''}" data-act="mount" data-m="wall">벽에 걸기</button><button class="${mount === 'ceil' ? 'on' : ''}" data-act="mount" data-m="ceil">천장</button></div></details>`
    + `<div class="acts"><button class="btn sm" data-act="wall" title="가장 가까운 벽에 붙이기 (W)">벽에 붙이기</button><button class="btn sm" data-act="dup" title="옆으로 복제 (Ctrl+D)">복제</button><button class="btn sm" data-act="fav">${GP.lib.favorites.includes(it.type) ? '★' : '☆'} 즐겨찾기</button><button class="btn sm danger" data-act="del" title="삭제 (Delete)">삭제</button></div>`;
}
function renderMulti(items) {
  insp.hidden = false;
  insp.innerHTML = head(`${items.length}개 선택`, '함께 이동·회전·복제할 수 있어요', 'var(--accent)')
    + `<div class="sec"><span class="lbl">간격 맞추기</span><div class="row2"><label class="fld"><span>기구 사이 간격</span>${num('mGap', GP.ui.lastGap ?? 50, 5, 'cm', 'min="0"')}</label><button class="btn sm" data-act="gap">간격 적용</button></div><button class="btn sm soft" data-act="even">양끝 고정하고 균등하게</button></div>`
    + `<div class="sec"><span class="lbl">줄 맞추기 (처음 고른 기구 기준)</span><div class="acts"><button class="btn sm" data-act="alignF">앞선</button><button class="btn sm" data-act="alignC">가운데</button><button class="btn sm" data-act="alignB">뒷선</button></div></div>`
    + `<div class="acts"><button class="btn sm" data-act="grot">90° 회전</button><button class="btn sm" data-act="mdup">복제</button><button class="btn sm" data-act="saveset">세트로 저장</button><button class="btn sm danger" data-act="mdel">삭제</button></div>`;
  GP.fillIcons(insp); ui.renderSummary();
}
function inspPart(p) {
  let len = 0; for (let i = 0; i < p.pts.length - 1; i++) len += G.len(p.pts[i], p.pts[i + 1]);
  insp.innerHTML = head(GP.PARTS[p.kind || 'wall'], `총 길이 ${len.toFixed(2)} m`, '#4a525b')
    + `<div class="sec"><span class="lbl">종류</span><div class="mount">${Object.entries(GP.PARTS).map(([k, v]) => `<button class="${(p.kind || 'wall') === k ? 'on' : ''}" data-act="pkind" data-v="${k}">${v.replace('허리 높이 ', '')}</button>`).join('')}</div></div>`
    + `<label class="fld"><span>두께</span>${num('pT', U.cm(p.thick || .1), 1, 'cm', 'min="3"')}</label>`
    + `<p class="note">꼭짓점을 끌어 모양을 바꿔요. 문·창문 도구로 가벽에도 문을 낼 수 있어요.</p><div class="acts"><button class="btn sm danger" data-act="odel">가벽 삭제</button></div>`;
}
function inspOpening(o) {
  const win = o.kind === 'window', hs = GP.hostSeg(o), sp = hs && GP.openingSpan(o, hs);
  insp.innerHTML = head(GP.OPENINGS[o.kind] || '문', o.host === 'room' ? '외벽' : '가벽', '#8B6A3F')
    + `<div class="sec"><span class="lbl">종류</span><select id="oKind">${Object.entries(GP.OPENINGS).map(([k, v]) => `<option value="${k}" ${o.kind === k ? 'selected' : ''}>${v}</option>`).join('')}</select></div>`
    + `<div class="row2"><label class="fld"><span>폭</span>${num('oW', U.cm(o.w), 5, 'cm', 'min="30"')}</label><label class="fld"><span>높이</span>${num('oH', U.cm(o.h ?? (win ? 1.2 : 2.1)), 5, 'cm')}</label></div>`
    + `<div class="row2"><label class="fld"><span>벽 시작점에서</span>${num('oL', sp ? U.cm(sp.s0) : 0, 5, 'cm', 'min="0"')}</label>${win ? `<label class="fld"><span>바닥에서 창 높이</span>${num('oS', U.cm(o.sill ?? .9), 5, 'cm')}</label>` : `<label class="fld"><span>벽 끝점까지</span>${num('oR', sp && hs ? U.cm(hs.L - sp.s1) : 0, 5, 'cm', 'min="0"')}</label>`}</div>`
    + (!win && o.kind !== 'opening' ? `<div class="acts"><button class="btn sm" data-act="oflip">안·밖 방향 바꾸기</button>${o.kind === 'door' || o.kind === 'slide' ? '<button class="btn sm" data-act="ohinge">좌·우 바꾸기</button>' : ''}</div>` : '')
    + `<p class="note">도면에서 양 끝의 점을 끌면 폭이 바뀌고, 가운데를 끌면 벽을 따라 움직여요.</p><div class="acts"><button class="btn sm danger" data-act="odel">삭제</button></div>`;
}
function matInfo(m) { const A = GP.calc.matArea(m), t = GP.calc.matTrims(m); return `${A.toFixed(1)}㎡ · ${(A / U.PY).toFixed(1)}평 · ${GP.calc.matBlocks(m)}장` + (m.trim !== 'none' ? ` · 일자 ${t.straight} · 모서리 ${t.outC} · 역모서리 ${t.inC}` : ''); }
function inspMat(m) {
  const B = GP.BLOCKS[m.block] || GP.BLOCKS.coat;
  insp.innerHTML = head(B.name + ' 25T', matInfo(m), GP.S.blockColor(m.block))
    + `<div class="sec"><span class="lbl">고무블럭 종류</span><select id="mB">${Object.entries(GP.BLOCKS).map(([k, v]) => `<option value="${k}" ${m.block === k ? 'selected' : ''}>${v.name}</option>`).join('')}</select></div>`
    + `<div class="sec"><span class="lbl">마감재 (드러난 변에만)</span><div class="mount">${[['rubber', '고무'], ['alu', '알루미늄'], ['none', '없음']].map(([k, v]) => `<button class="${m.trim === k ? 'on' : ''}" data-act="mtrim" data-v="${k}">${v}</button>`).join('')}</div></div>`
    + priceBox(`mat:${m.block}|25`, GP.lib.matPrices[`${m.block}|25`], '장당 단가 (부가세 별도)')
    + `<p class="note">벽에 붙은 변은 마감재가 빠지고, 드러난 변에만 자동으로 둘러요.</p><div class="acts"><button class="btn sm" data-act="msnap">벽에 딱 붙이기</button><button class="btn sm danger" data-act="odel">삭제</button></div>`;
}
function inspZone(z) { const A = Math.abs(G.area(z.pts)); insp.innerHTML = head(z.name || '존', `${A.toFixed(1)}㎡ · ${(A / U.PY).toFixed(1)}평`, z.color) + `<div class="row2"><label class="fld"><span>이름</span><input id="zN" value="${U.esc(z.name || '')}"></label><label class="fld"><span>색상</span><input type="color" id="zC" value="${z.color || '#2f6bd8'}"></label></div><div class="acts"><button class="btn sm danger" data-act="odel">삭제</button></div>`; }
function inspRoom(r) { const A = GP.calc.regionArea(r.x, r.z); insp.innerHTML = head(r.name || '공간', `${A.toFixed(1)}㎡ · ${(A / U.PY).toFixed(1)}평 (벽·가벽으로 둘러싸인 면적)`, '#5b6570') + `<label class="fld"><span>이름</span><input id="rN" value="${U.esc(r.name || '')}" autofocus></label><div class="acts"><button class="btn sm danger" data-act="odel">삭제</button></div>`; setTimeout(() => { const i = $('#rN'); if (i && r._new) { i.select(); delete r._new; } }, 30); }
function inspNote(n) { insp.innerHTML = head('메모', '도면에 표시돼요', '#E0622B') + `<label class="fld"><span>내용</span><textarea id="nT" rows="3">${U.esc(n.text || '')}</textarea></label><div class="acts"><button class="btn sm danger" data-act="odel">삭제</button></div>`; setTimeout(() => { const t = $('#nT'); if (t && n._new) { t.focus(); delete n._new; } }, 30); }
function inspDim(d) { insp.innerHTML = head('치수', `${G.len(d.a, d.b).toFixed(2)} m`, '#1F2429') + `<div class="acts"><button class="btn sm danger" data-act="odel">삭제</button></div>`; }
function inspWall(i) {
  const L = GP.L(), e = G.edge(L.room.pts, i), mk = (L.wallMarks || {})[i];
  insp.innerHTML = head(`벽 ${i + 1}`, `길이 ${e.L.toFixed(2)} m`, '#2B3036')
    + `<label class="fld"><span>길이 (끝쪽이 늘어나요)</span>${num('wL', e.L.toFixed(2), .01, 'm', 'min=".3"')}</label>`
    + `<div class="sec"><span class="lbl">벽 마감</span><div class="mount" style="grid-template-columns:1fr 1fr"><button class="${mk === 'mirror' ? '' : 'on'}" data-act="wmark" data-v="">시공 없음</button><button class="${mk === 'mirror' ? 'on' : ''}" data-act="wmark" data-v="mirror">${IC.mirror} 거울</button></div></div>`
    + `<div class="acts"><button class="btn sm" data-act="wdoor">문 넣기</button><button class="btn sm" data-act="wwin">창문 넣기</button><button class="btn sm" data-act="wfill">기구로 채우기</button></div>`;
}
insp.addEventListener('click', e => { const b = e.target.closest('[data-act]'); if (b) GP.act.inspAction(b.dataset.act, b); });
insp.addEventListener('change', e => GP.act.inspChange(e.target));
insp.addEventListener('input', e => { if (['nT', 'rN', 'zN', 'iName'].includes(e.target.id)) GP.act.inspChange(e.target, true); });

/* ---------------- checks popover ---------------- */
function openChecks(refresh) {
  const list = GP.checks.list || []; const order = { err: 0, warn: 1, info: 2 };
  const rows = list.slice().sort((a, b) => order[a.sev] - order[b.sev]).map(c => `<button class="chk ${c.sev}" data-act="chk" data-i="${list.indexOf(c)}"><i></i><span>${U.esc(c.msg)}</span></button>`).join('') || `<div class="chk ok"><i></i><span>확인할 문제가 없어요.</span></div>`;
  const html = `<div class="ph">배치 점검</div><div class="chk-list">${rows}</div><hr><div style="display:grid;grid-template-columns:1fr;gap:8px;padding:4px 8px 8px"><label class="fld"><span>통로 최소 폭</span><div class="unit"><input type="number" id="ckAisle" step="5" value="${Math.round((GP.lib.defaults.aisleMin || .9) * 100)}"><em>cm</em></div></label></div><button class="mi" data-act="aisleLayer"><div><b>${GP.S.layers.aisle ? '좁은 통로 표시 끄기' : '좁은 통로를 도면에 표시'}</b><small>통로 기준보다 좁은 곳을 빨갛게 칠해요</small></div></button>`;
  if (refresh) { pop.innerHTML = html; bindCk(); return; }
  GP.popover($('#checkBtn'), html, (act, b) => {
    if (act === 'chk') { const c = list[+b.dataset.i]; if (c) { if (c.uids.length) ui.select(c.uids.map(u => ({ k: 'item', id: u }))); if (c.at) GP.S.focus(c.at); } return false; }
    if (act === 'aisleLayer') { GP.S.layers.aisle = !GP.S.layers.aisle; GP.checks.full(); GP.S.invalidate(); ui.renderLayers(); return false; }
    return true;
  });
  bindCk();
}
function bindCk() { const a = $('#ckAisle'); if (a) a.onchange = () => { GP.lib.defaults.aisleMin = U.clamp(+a.value || 90, 30, 300) / 100; GP.saveLib(); GP.checks.full(); GP.S.invalidate(); }; }
GP.focusAt = (p) => GP.S.focus(p);

/* ---------------- keyboard ---------------- */
window.addEventListener('keydown', e => {
  if (!modal.hidden) { if (e.key === 'Escape') GP.closeModal(); return; }
  if (!$('#guide').hidden) { if (e.key === 'Escape') $('#guide').hidden = true; return; }
  const tag = (e.target.tagName || '').toLowerCase(); if (tag === 'input' || tag === 'textarea' || tag === 'select') { if (e.key === 'Escape') e.target.blur(); return; }
  const mod = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
  if (GP.viewOnly) return;
  if (!$('#quoteSheet').hidden) { if (e.key === 'Escape') ui.closeQuote(); return; }
  if (GP.tools && GP.tools.key(e)) return;
  if (mod && k === 'z') { e.preventDefault(); e.shiftKey ? GP.H.redo() : GP.H.undo(); return; }
  if (mod && k === 'y') { e.preventDefault(); GP.H.redo(); return; }
  if (e.key === 'Escape') { if (ui.tool !== 'select') ui.setTool('select'); else ui.clearSel(); return; }
  GP.act.key(e, mod, k);
});

/* ---------------- top bar buttons ---------------- */
GP.fillIcons(document);
$('#undoBtn').innerHTML = IC.undo; $('#redoBtn').innerHTML = IC.redo; $('#helpBtn').innerHTML = IC.help; $('#menuBtn').innerHTML = IC.menu; modal.querySelector('[data-close]').innerHTML = IC.x;
$('#undoBtn').addEventListener('click', () => GP.H.undo()); $('#redoBtn').addEventListener('click', () => GP.H.redo());
GP.on('history', () => { $('#undoBtn').disabled = !GP.H.canUndo(); $('#redoBtn').disabled = !GP.H.canRedo(); });
ui.renderTop = () => { $('#projName').textContent = GP.P.name; $('#projClient').textContent = [GP.P.client, GP.P.consultant ? '담당 ' + GP.P.consultant : ''].filter(Boolean).join(' · ') || (GP.viewOnly ? '' : '고객사 정보 입력'); document.title = `${GP.P.name} — 고핏 플래너`; };
$('#projBtn').addEventListener('click', () => { if (!GP.viewOnly) GP.panels.editProjectInfo(); });
})();
