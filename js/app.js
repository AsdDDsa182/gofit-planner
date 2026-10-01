/* GoFit Planner — boot, project lifecycle, menu, autosave, viewer mode, PWA */
(function () {
'use strict';
const GP = window.GP, U = GP.U, $ = U.$, IC = GP.IC, ui = GP.ui, S = GP.S;
const app = GP.app = {};

/* ---------------- sample project ---------------- */
app.sample = () => {
  const p = GP.newProject({ name: '예시 · 60평 피트니스 센터', pts: [[0, 0], [14.5, 0], [18, 3.5], [18, 11.5], [0, 11.5]] });
  p.client = '(예시) ○○피트니스 강남점'; p.consultant = '';
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
    let pts = [[0, 0], [12, 0], [12, 8], [0, 8]];
    if (w.mode === 'py') { const A = (w.py || 60) * U.PY, r = w.ratio || 1.5, d = U.snap(Math.sqrt(A / r), .05), wd = U.snap(d * r, .05); pts = [[0, 0], [wd, 0], [wd, d], [0, d]]; }
    p = GP.newProject({ name: w.name || '새 프로젝트', pts }); p.client = w.client || ''; p.consultant = w.consultant || '';
  }
  if (w.name) p.name = w.name; if (w.client) p.client = w.client; if (w.consultant) p.consultant = w.consultant;
  ui.step = 'space'; await app.loadProject(p); await GP.saveProject(); await GP.DB.put('kv', 'lastProject', p.id);
  if (w.mode === 'walk' || w.mode === 'shape') { const b = document.querySelector(`#spMode [data-m="${w.mode}"]`); if (b) b.click(); }
  if (w.mode === 'trace') GP.toast('왼쪽 아래 “고객 도면 대고 그리기”에서 평면도 사진이나 DXF를 올려 주세요', { ms: 5000 });
};
let saveT = 0;
app.thumb = () => { try { const c = GP.exp.planImage(480, 300, { notes: false, labels: false }); return c.toDataURL('image/jpeg', .8); } catch (e) { return ''; } };
app.saveNow = async () => { if (!GP.P || GP.viewOnly) return; clearTimeout(saveT); await GP.saveProject(app.thumb()); };
GP.on('dirty', () => { if (GP.viewOnly) return; clearTimeout(saveT); saveT = setTimeout(app.saveNow, 1200); });
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
  <button class="mi" data-act="info">${IC.note}<div><b>프로젝트 정보</b><small>이름 · 고객사 · 담당자</small></div></button>
  <button class="mi" data-act="versions">${IC.clock}<div><b>버전 기록</b><small>예전 상태로 되돌리기</small></div></button>
  <hr><button class="mi" data-act="save">${IC.save}<div><b>프로젝트 파일 저장 (.gofit)</b><small>백업하거나 다른 PC·태블릿으로 옮기기</small></div></button>
  <button class="mi" data-act="open">${IC.open}<div><b>프로젝트 파일 열기</b><small>.gofit 파일 불러오기</small></div></button>
  <hr><button class="mi" data-act="settings">${IC.gear}<div><b>설정</b><small>단가 · 기구 이름 · 회사 정보 · 3D 모델 받아두기</small></div></button>
  <button class="mi" data-act="guide">${IC.help}<div><b>사용 가이드</b><small>3단계로 둘러보기</small></div></button>
  ${app.installEvt ? `<button class="mi" data-act="install">${IC.install}<div><b>앱으로 설치</b><small>바탕화면 아이콘 · 인터넷 없이도 사용</small></div></button>` : (location.protocol.startsWith('http') && !matchMedia('(display-mode: standalone)').matches ? `<button class="mi" data-act="installHelp">${IC.install}<div><b>앱으로 설치하는 방법</b><small>크롬·엣지·아이패드</small></div></button>` : '')}
  <div class="ph" style="font-weight:500">고핏 플래너 v${GP.VERSION}</div>`;
  GP.popover($('#menuBtn'), html, (a) => {
    if (a === 'projects') GP.panels.projects(); else if (a === 'new') GP.panels.wizard(); else if (a === 'info') GP.panels.editProjectInfo(); else if (a === 'versions') GP.panels.versions();
    else if (a === 'save') GP.exp.saveProjectFile(); else if (a === 'open') $('#fileOpen').click(); else if (a === 'settings') GP.panels.settings(); else if (a === 'guide') GP.panels.guide();
    else if (a === 'install') { app.installEvt.prompt(); app.installEvt.userChoice.finally(() => { app.installEvt = null; }); }
    else if (a === 'installHelp') GP.modal('앱으로 설치하기', `<p class="note" style="font-size:13.5px;line-height:1.7"><b>PC (크롬·엣지)</b>: 주소창 오른쪽의 설치 아이콘(모니터에 화살표)을 누르거나, 메뉴 ⋮ → <b>앱 설치</b>를 누르세요.<br><b>아이패드·아이폰 (사파리)</b>: 공유 버튼 → <b>홈 화면에 추가</b>.<br><b>안드로이드 (크롬)</b>: 메뉴 ⋮ → <b>앱 설치</b> 또는 <b>홈 화면에 추가</b>.<br><br>설치한 뒤에는 인터넷이 없는 현장에서도 그대로 쓸 수 있어요. 3D 모델은 <b>설정 → 3D 모델·오프라인</b>에서 미리 받아 두세요.</p>`, '<button class="btn primary" data-close>확인</button>', { size: 'narrow' });
  });
});
$('#fileOpen').addEventListener('change', e => { const f = e.target.files[0]; e.target.value = ''; if (f) GP.exp.openProjectFile(f); });
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); app.installEvt = e; });

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
  new ResizeObserver(() => { S.resize(); GP.emit('overlay'); }).observe($('#stage'));
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
  if (!p) { p = app.sample(); await app.loadProject(p); await GP.saveProject(); await GP.DB.put('kv', 'lastProject', p.id); }
  else await app.loadProject(p);
  S.frame(); GP.emit('booted');
  if (!GP.lib.guideSeen) setTimeout(() => GP.panels.guide(), 400);
  if ('serviceWorker' in navigator && location.protocol.startsWith('http') && !window.GP_VIEW) { navigator.serviceWorker.register('sw.js').catch(() => { }); }
};
app.boot().catch(e => { console.error(e); const st = $('#stage'); st.insertAdjacentHTML('beforeend', `<div class="busy"><div class="busy-card"><b>앱을 시작하지 못했어요</b><small class="note">${U.esc(e.message || e)}</small><button class="btn" onclick="location.reload()">새로고침</button></div></div>`); });
})();
