/* GoFit Planner — boot, project lifecycle, menu, autosave, viewer mode, PWA */
(function () {
'use strict';
const GP = window.GP, U = GP.U, $ = U.$, IC = GP.IC, ui = GP.ui, S = GP.S;
const app = GP.app = {};

/* ---------------- sample project ---------------- */
app.sample = () => {
  const p = GP.newProject({ name: '예시 · 60평 피트니스 센터', pts: [[0, 0], [14.5, 0], [18, 3.5], [18, 11.5], [0, 11.5]] });
  p.client = '(예시) ○○피트니스 강남점'; p.consultant = ''; p.sample = true;
  const L = p.variants[0].layout; const it = (type, x, z, rot, extra) => L.items.push(Object.assign({ uid: U.uid(), type, x, z, rot }, extra || {}));
  [1.0, 2.42, 3.84, 5.26, 6.68].forEach(x => it('treadmill', x, 1.105, 0));
  [7.9, 8.75, 9.6].forEach(x => it('bike', x, .59, 0));
  it('elliptical', 10.8, 1.08, 0); it('elliptical', 11.8, 1.08, 0); it('stepmill', 13.05, .815, 0);
  it('latpull', 14.98, 1.64, 45); it('chest', 16.41, 3.04, 45);
  it('legext', 17.405, 4.7, 90); it('legpress_plate', 16.86, 6.4, 90); it('crossover', 17.395, 9.3, 90);
  it('dbrack2', .32, 5.4, 270);
  [4.6, 5.5, 6.4].forEach(z => it('bench_adj', 2.95, z, 90));
  it('powerrack', 1.5, 10.52, 180); it('halfrack', 4.05, 10.745, 180); it('platetree', 5.8, 10.88, 0);
  it('stretchzone', 9.2, 10.3, 0); it('turf', 9.2, 6.6, 0);
  it('rower', 11.2, 10.25, 180); it('rower', 12.1, 10.25, 180);
  it('column', 9.2, 3.8, 0); it('desk', 14.2, 9.6, 0);
  it('tv_wall', 3.9, .05, 0, { elev: 1.75 });
  L.openings.push({ id: U.uid('o'), host: 'room', seg: 3, t: 2.5, w: 1.8, h: 2.1, sill: .9, kind: 'glass2' });
  L.openings.push({ id: U.uid('o'), host: 'room', seg: 4, t: 3.0, w: 1.8, h: 1.2, sill: .9, kind: 'window' });
  L.wallMarks = { 4: 'mirror' };
  L.mats.push({ id: U.uid('m'), pts: [[0, 0], [14.5, 0], [14.5, 2.6], [0, 2.6]], block: 'topblack', thick: 25, trim: 'rubber' });
  L.mats.push({ id: U.uid('m'), pts: [[0, 3.6], [6.6, 3.6], [6.6, 11.5], [0, 11.5]], block: 'coat', thick: 25, trim: 'rubber' });
  L.notes.push({ id: U.uid('n'), x: 4.2, z: 3.1, text: '러닝머신 뒤 2m 비워두기 · 전용 회로 필요' });
  L.quote.extras.push({ name: '덤벨 세트 (2~30kg)', qty: 1, price: 0 });
  return p;
};

/* ---------------- project lifecycle ---------------- */
app.loadProject = async (p) => {
  GP.tools && GP.tools.cancel();
  GP.P = p; ui.sel = [];
  GP.H.reset(); GP.H.lastVersionAt = Date.now();
  S.dataChanged(); requestAnimationFrame(() => { S.resize(); S.fit(); });
  ui.renderTop(); ui.renderVariants(); ui.renderHUD(); ui.renderLayers(); ui.renderZoom();
  ui.setStep(ui.step || 'place'); GP.checks.full(); ui.renderSummary(); GP.emit('overlay');
  if (!GP.viewOnly) await GP.panels.restoreUL();
  saveSt('ok', p.updatedAt);
  if (GP.wiz) GP.wiz.onProject();
};
app.openProject = async (id) => {
  if (GP.P && !GP.viewOnly) await app.saveNow();
  const r = await GP.DB.get('projects', id); if (!r) { GP.toast('프로젝트를 찾지 못했어요', { bad: true }); return; }
  const p = GP.validateProject(r.data); if (!p) { GP.toast('프로젝트를 읽지 못했어요', { bad: true }); return; }
  await app.loadProject(p); await GP.DB.put('kv', 'lastProject', p.id); GP.toast(`'${p.name}'을(를) 열었어요`);
};
app.newProject = async (w) => {
  if (GP.P && !GP.viewOnly) await app.saveNow();
  w = w || {}; let p;
  if (w.mode === 'sample' || w.sample) p = app.sample();
  else {
    let pts = GP.DEFAULT_ROOM.map(q => q.slice());
    if (w.mode === 'py') { const A = (w.py || 60) * U.PY, r = w.ratio || 1.5, d = U.snap(Math.sqrt(A / r), .05), wd = U.snap(d * r, .05); pts = [[0, 0], [wd, 0], [wd, d], [0, d]]; }
    p = GP.newProject({ name: w.name || '새 프로젝트', pts }); p.client = w.client || ''; p.consultant = w.consultant || '';
  }
  if (w.name) p.name = w.name; if (w.client) p.client = w.client; if (w.consultant) p.consultant = w.consultant;
  const easy = GP.wiz && GP.wiz.mode() === 'easy' && !GP.viewOnly;
  if (easy && !p.sample) p.wiz = { step: 1, max: 1, picks: null, space: ['py', 'shape', 'walk', 'trace'].includes(w.mode) ? w.mode : 'py', partAns: null };
  ui.step = 'space'; await app.loadProject(p); await GP.saveProject(); await GP.DB.put('kv', 'lastProject', p.id);
  if (easy) return;
  if (w.mode === 'walk' || w.mode === 'shape') { const b = document.querySelector(`#spMode [data-m="${w.mode}"]`); if (b) b.click(); }
  if (w.mode === 'trace') GP.toast('왼쪽 아래 “고객 도면 대고 그리기”에서 평면도 사진이나 DXF를 올려 주세요', { ms: 5000 });
};
let saveT = 0;
app.thumb = () => { try { const c = GP.exp.planImage(480, 300, { notes: false, labels: false }); return c.toDataURL('image/jpeg', .8); } catch (e) { return ''; } };
app.saveNow = async () => { if (!GP.P || GP.viewOnly) return; clearTimeout(saveT); await GP.saveProject(app.thumb()); };
GP.on('dirty', () => { if (GP.viewOnly) return; clearTimeout(saveT); saveT = setTimeout(app.saveNow, 1200); saveSt('saving'); });
/* save status next to the project name: changes are kept on this device automatically (no save button needed) */
function saveSt(s, t) {
  const el = $('#saveSt'); if (!el) return; if (GP.viewOnly || !GP.P || GP.P.unnamed) { el.textContent = ''; return; }
  el.className = 'savest ' + s; el.textContent = s === 'saving' ? '저장 중…' : '자동 저장됨';
  if (t) el.title = `이 기기에 자동으로 저장돼요 · 마지막 저장 ${new Date(t).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`;
}
GP.on('saved', t => saveSt('ok', t)); GP.on('project', () => saveSt('ok'));
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') app.saveNow(); });
window.addEventListener('beforeunload', () => { app.saveNow(); });

/* ---------------- global refresh hooks ---------------- */
GP.on('restore', () => { ui.sel = ui.sel.filter(s => s.k === 'wall' || GP.findBy(s.k, s.id)); GP.tools.cancel(); S.dataChanged(); GP.checks.quick(); ui.renderVariants(); ui.renderTop(); GP.panels.refresh(); ui.renderInspector(); ui.renderHUD(); GP.checks.full(); ui.renderSummary(); GP.emit('overlay'); });
GP.on('changed', () => { ui.renderHUD(); if (ui.sel.length) { ui.sel = ui.sel.filter(s => s.k === 'wall' || GP.findBy(s.k, s.id)); } });
GP.on('project', () => { ui.renderTop(); ui.renderVariants(); GP.panels.refresh(); ui.renderHUD(); ui.renderSummary(); });
GP.on('dragging', () => { ui.renderHUD(); });
GP.on('library', () => { S.invalidate(); });

/* ---------------- menu ---------------- */
$('#menuBtn').addEventListener('click', () => {
  const html = `<div class="ph">프로젝트</div>
  <button class="mi" data-act="projects">${IC.folder}<div><b>내 프로젝트</b><small>이 기기에 저장된 프로젝트 열기</small></div></button>
  <button class="mi" data-act="new">${IC.filePlus}<div><b>새 프로젝트</b><small>평수·모양·실측·도면으로 시작</small></div></button>
  <button class="mi" data-act="sample">${IC.folder}<div><b>예시 프로젝트 보기</b><small>60평 샘플로 기능 둘러보기</small></div></button>
  <button class="mi" data-act="info">${IC.note}<div><b>프로젝트 정보</b><small>이름 · 고객사 · 담당자</small></div></button>
  <button class="mi" data-act="compare">${IC.doc}<div><b>안 비교</b><small>A안·B안의 기구·면적·견적을 나란히 보기</small></div></button>
  <button class="mi" data-act="versions">${IC.clock}<div><b>버전 기록</b><small>예전 상태로 되돌리기</small></div></button>
  <hr><button class="mi" data-act="save">${IC.save}<div><b>프로젝트 파일 저장 (.gofit)</b><small>다른 담당자에게 보내기 · 다른 PC로 옮기기</small></div></button>
  <button class="mi" data-act="open">${IC.open}<div><b>프로젝트 파일 열기</b><small>.gofit 파일 불러오기</small></div></button>
  <hr><button class="mi" data-act="settings">${IC.gear}<div><b>설정</b><small>단가 · 기구 이름 · 회사 정보 · 3D 모델 받아두기</small></div></button>
  <button class="mi" data-act="guide">${IC.help}<div><b>사용 가이드</b><small>3단계로 둘러보기</small></div></button>
  ${app.installEvt ? `<button class="mi" data-act="install">${IC.install}<div><b>앱으로 설치</b><small>바탕화면 아이콘 · 인터넷 없이도 사용</small></div></button>` : (location.protocol.startsWith('http') && !matchMedia('(display-mode: standalone)').matches ? `<button class="mi" data-act="installHelp">${IC.install}<div><b>앱으로 설치하는 방법</b><small>크롬·엣지·아이패드</small></div></button>` : '')}
  <div class="ph" style="font-weight:500">고핏 플래너 v${GP.VERSION}</div>`;
  GP.popover($('#menuBtn'), html, (a) => {
    if (a === 'projects') GP.panels.projects(); else if (a === 'new') GP.panels.wizard(); else if (a === 'sample') app.openSample(); else if (a === 'info') GP.panels.editProjectInfo(); else if (a === 'versions') GP.panels.versions(); else if (a === 'compare') GP.panels.compare();
    else if (a === 'save') GP.backup.sendProject(); else if (a === 'open') $('#fileOpen').click(); else if (a === 'settings') GP.panels.settings(); else if (a === 'guide') GP.panels.guide();
    else if (a === 'install') { app.installEvt.prompt(); app.installEvt.userChoice.finally(() => { app.installEvt = null; }); }
    else if (a === 'installHelp') GP.modal('앱으로 설치하기', `<p class="note" style="font-size:13.5px;line-height:1.7"><b>PC (크롬·엣지)</b>: 주소창 오른쪽의 설치 아이콘(모니터에 화살표)을 누르거나, 메뉴 ⋮ → <b>앱 설치</b>를 누르세요.<br><b>아이패드·아이폰 (사파리)</b>: 공유 버튼 → <b>홈 화면에 추가</b>.<br><b>안드로이드 (크롬)</b>: 메뉴 ⋮ → <b>앱 설치</b> 또는 <b>홈 화면에 추가</b>.<br><br>설치한 뒤에는 인터넷이 없는 현장에서도 그대로 쓸 수 있어요. 3D 모델은 <b>설정 → 3D 모델·오프라인</b>에서 미리 받아 두세요.</p>`, '<button class="btn primary" data-close>확인</button>', { size: 'narrow' });
  });
});
$('#fileOpen').addEventListener('change', e => { const f = e.target.files[0]; e.target.value = ''; if (f) GP.backup.openFile(f); });
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); app.installEvt = e; });

/* ---------------- first run: name the project, start from one plain room ---------------- */
app.isSample = p => !!(p && (p.sample || /^예시 · /.test(p.name || '')));
/* the sample opens the one already on this device (a new copy only the first time) */
app.openSample = async () => {
  const s = (await GP.listProjects()).find(r => app.isSample(r.data));
  if (s) await app.openProject(s.id); else await app.newProject({ mode: 'sample' });
  ui.setStep('place');
};
app.welcome = () => {
  let done = false;
  const start = async () => {
    if (done) return; done = true;
    const nm = ($('#wcName') || {}).value, cl = ($('#wcClient') || {}).value;
    GP.P.name = (nm || '').trim() || '새 프로젝트'; GP.P.client = (cl || '').trim(); delete GP.P.unnamed;
    GP.modalOnClose = null; GP.closeModal();
    await GP.saveProject(); await GP.DB.put('kv', 'lastProject', GP.P.id);
    ui.renderTop();
    if (GP.wiz && GP.wiz.on) { GP.wiz.go(1); return; }      // easy mode: the wizard walks on from here
    ui.setStep('space');
    GP.toast('기본 공간(10 × 8 m)이 깔려 있어요. 벽을 끌거나 크기를 입력해 바꿔 보세요', { ms: 5000 });
    if (!GP.lib.guideSeen) setTimeout(() => GP.panels.guide(), 600);
  };
  GP.modal('고핏 플래너 시작하기', `<div class="wiz"><p class="note">프로젝트 이름을 정하면 기본 공간(가로 10m × 세로 8m)이 깔린 상태로 시작해요. 공간의 크기와 모양은 바로 다음 화면에서 바꿀 수 있어요.</p>
    <label class="fld"><span>프로젝트 이름</span><input id="wcName" placeholder="예: 강남 ○○피트니스" maxlength="60" autofocus></label>
    <label class="fld"><span>고객사 <small class="note">(선택)</small></span><input id="wcClient" maxlength="60"></label>
    <button class="btn ghost sm" id="wcSample" type="button">${IC.folder}<span>먼저 예시 프로젝트 둘러보기</span></button></div>`,
    `<button class="btn primary" id="wcGo">시작하기</button>`, { size: 'narrow', onClose: start });
  $('#wcGo').onclick = start;
  $('#wcName').onkeydown = e => { if (e.key === 'Enter') start(); };
  $('#wcSample').onclick = async () => { done = true; GP.modalOnClose = null; GP.closeModal(); GP.P = null; await app.openSample(); GP.toast('예시 프로젝트예요. 내 프로젝트는 메뉴 → 새 프로젝트에서 시작하세요', { ms: 5000 }); };
};

/* ---------------- viewer (customer link / HTML file) ---------------- */
async function viewerPayload() {
  if (window.GP_VIEW) return GP.exp.decode(window.GP_VIEW);
  const h = location.hash; if (h.startsWith('#v=')) return GP.exp.decode(h.slice(3));
  return null;
}
function projectFromPayload(pl) {
  const p = GP.newProject({ name: pl.n || '공간 배치안' }); p.client = pl.c || ''; p.consultant = pl.k || ''; p.settings = Object.assign(p.settings, pl.s || {});
  p.variants = [{ id: 'v1', name: pl.var || 'A안', layout: Object.assign(GP.newLayout(), pl.L || {}) }];
  Object.assign(GP.lib.customTypes, pl.ct || {}); Object.assign(GP.lib.names, pl.nm || {}); if (pl.co) GP.lib.company.name = pl.co;
  GP.lib.prices = Object.assign({}, pl.pr || {}); GP.lib.matPrices = Object.assign({}, pl.mp || {}); GP.media.remote = pl.md || {};
  return GP.validateProject(p);
}
function viewerQuote(q) {
  const rows = q.g.map(g => `<tr class="grp"><td colspan="5">${U.esc(g.n)}</td></tr>` + g.r.map(r => `<tr><td>${U.esc(r[0])}</td><td class="c">${U.esc(r[1])}</td><td class="n">${r[2]} ${U.esc(r[3])}</td><td class="n">${r[4] ? U.won(r[4]) : '미입력'}</td><td class="n">${U.won(r[5])}</td></tr>`).join('')).join('');
  GP.modal('견적', `<div class="qdoc" style="padding:20px;box-shadow:none"><div class="qsum"><span>합계 (부가세 포함)</span><b>₩ ${U.won(q.total)}</b></div><table class="qtbl"><thead><tr><th>품목</th><th>규격</th><th>수량</th><th>단가</th><th>금액</th></tr></thead><tbody>${rows}</tbody></table><div class="qtot"><span>부가세 별도</span><b>${U.won(q.supply)}원</b><span>부가세</span><b>${U.won(q.vat)}원</b><span class="big">부가세 포함</span><b class="big">${U.won(q.total)}원</b></div>${q.note ? `<div class="qnote">${U.esc(q.note)}</div>` : ''}</div>`, '<button class="btn primary" data-close>닫기</button>', { size: 'wide' });
}

/* ---------------- boot ---------------- */
app.boot = async () => {
  await Promise.all([GP.loadLib(), GP.SYM.loadManifest(), GP.R3.loadBasic()]);
  S.init($('#c'), $('#stage'));
  GP.tools.attach(S.canvas);
  // a page opened hidden (background tab) lays out at zero size: fit again once the plan really has room
  new ResizeObserver(() => { S.resize(); if ((S.fitW || 0) < 200 && S.W >= 200 && S.H >= 150) S.fit(); GP.emit('overlay'); }).observe($('#stage'));
  let pl = null; try { pl = await viewerPayload(); } catch (e) { console.warn(e); }
  if (pl) {
    GP.viewOnly = true; GP.viewPrice = !!pl.q; GP.saveLib = () => { }; $('#app').classList.add('viewer'); S.layers.clear = false; S.layers.aisle = false;
    const p = projectFromPayload(pl); GP.P = p; ui.step = 'place';
    await app.loadProject(p);
    if (pl.q) { const b = document.createElement('button'); b.className = 'btn primary'; b.innerHTML = `${IC.doc}<span>견적 보기</span>`; b.onclick = () => viewerQuote(pl.q); $('.tb-right').appendChild(b); }
    const touch = matchMedia('(pointer:coarse)').matches; $('#viewerHint').hidden = false; $('#viewerHint').innerHTML = `<span>${touch ? `기구를 <b>누르면</b> 3D 모델${GP.viewPrice ? '·가격' : ''}을 볼 수 있어요 · 두 손가락으로 확대` : `${U.jo('기구에 마우스를 올리면 이름' + (GP.viewPrice ? '·가격' : ''), '이', '가')} 나오고, <b>누르면 3D 모델</b>을 볼 수 있어요`}</span><button class="icon-btn ghost sm" aria-label="닫기">${IC.x}</button>`; $('#viewerHint button').onclick = () => { $('#viewerHint').hidden = true; };
    S.frame(); GP.emit('booted'); return;
  }
  let p = null; const last = await GP.DB.get('kv', 'lastProject');
  if (last) { const r = await GP.DB.get('projects', last); if (r) p = GP.validateProject(r.data); }
  if (!p) { const all = await GP.listProjects(); if (all.length) p = GP.validateProject(all[0].data); }
  ui.step = 'place';
  /* first visit (or only the sample so far): a plain room under the name dialog; it is saved once named */
  const fresh = !p || (app.isSample(p) && !(await GP.listProjects()).some(r => !app.isSample(r.data)));
  if (fresh) { p = GP.newProject({ name: '새 프로젝트' }); Object.defineProperty(p, 'unnamed', { value: true, writable: true, configurable: true }); ui.step = 'space'; }
  await app.loadProject(p);
  S.frame(); GP.emit('booted');
  if (fresh) app.welcome();
  else if (!GP.lib.guideSeen && !(GP.wiz && GP.wiz.on)) setTimeout(() => GP.panels.guide(), 400);
  if ('serviceWorker' in navigator && location.protocol.startsWith('http') && !window.GP_VIEW) { navigator.serviceWorker.register('sw.js').catch(() => { }); }
};
app.boot().catch(e => { console.error(e); const st = $('#stage'); st.insertAdjacentHTML('beforeend', `<div class="busy"><div class="busy-card"><b>앱을 시작하지 못했어요</b><small class="note">${U.esc(e.message || e)}</small><button class="btn" onclick="location.reload()">새로고침</button></div></div>`); });
})();
