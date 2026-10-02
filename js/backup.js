/* GoFit Planner — project files: send / open (.gofit), all projects in one file, automatic backup to a folder (Chrome · Edge) */
(function () {
'use strict';
const GP = window.GP, U = GP.U, $ = U.$;
const B = GP.backup = { dir: null, state: 'off', last: 0 };
const booted = new Promise(r => GP.on('booted', r));
B.supported = typeof window.showDirectoryPicker === 'function';

/* ---------------- one project file ---------------- */
const fileOf = p => new File([JSON.stringify(p)], U.fileSafe(p.name) + '.gofit', { type: 'application/json' });
/* phones / tablets: the share sheet (KakaoTalk, mail, Drive…); elsewhere a download */
B.sendProject = async () => {
  const f = fileOf(GP.projectPayload());
  if (matchMedia('(pointer:coarse)').matches && navigator.canShare && navigator.canShare({ files: [f] })) {
    try { await navigator.share({ files: [f], title: GP.P.name }); return; } catch (e) { if (e && e.name === 'AbortError') return; }
  }
  U.download(f, f.name); GP.toast('프로젝트 파일을 저장했어요. 받는 사람은 고핏 플래너 메뉴 → 프로젝트 파일 열기로 열어요', { ms: 5000 });
};

/* ---------------- all projects in one file (restore on a new PC, or where folder backup is not available) ---------------- */
B.saveAll = async () => {
  const list = await GP.listProjects(); if (!list.length) { GP.toast('저장된 프로젝트가 없어요'); return; }
  const d = new Date(), stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  U.download(new Blob([JSON.stringify({ kind: 'gofit-all', v: 1, at: Date.now(), projects: list.map(r => r.data) })], { type: 'application/json' }), `고핏플래너_전체프로젝트_${stamp}.gofit`);
  GP.toast(`프로젝트 ${list.length}개를 파일 하나로 저장했어요`);
};
/* a bundle: projects already here are replaced only by a newer copy */
B.importAll = async (o) => {
  let add = 0, upd = 0, same = 0;
  for (const raw of o.projects || []) {
    const p = GP.validateProject(raw); if (!p) continue;
    const ex = await GP.DB.get('projects', p.id);
    if (ex && (ex.updatedAt || 0) >= (p.updatedAt || 0)) { same++; continue; }
    await GP.DB.put('projects', p.id, { id: p.id, name: p.name, client: p.client, updatedAt: p.updatedAt || Date.now(), thumb: ex ? ex.thumb : '', data: p }); ex ? upd++ : add++;
  }
  GP.toast(`불러왔어요 · 새 프로젝트 ${add}개${upd ? ` · 더 새것으로 바꾼 것 ${upd}개` : ''}${same ? ` · 이미 있던 것 ${same}개` : ''}`, { ms: 5000 });
  if (add + upd) GP.panels.projects();
};
/* any .gofit: a single project or a bundle */
B.openFile = async (f) => {
  let o; try { o = JSON.parse(await U.readFile(f, 'text')); } catch (e) { GP.toast('파일을 읽지 못했어요', { bad: true }); return; }
  if (o && o.kind === 'gofit-all') return B.importAll(o);
  return GP.exp.openProjectFile(f);
};

/* ---------------- automatic backup to a folder ---------------- */
async function perm(h, ask) { try { const o = { mode: 'readwrite' }; let p = await h.queryPermission(o); if (p !== 'granted' && ask) p = await h.requestPermission(o); return p === 'granted'; } catch (e) { return false; } }
B.init = async () => {
  if (!B.supported) { B.state = 'unsupported'; return; }
  const h = await GP.DB.get('kv', 'backupDir'); B.last = (await GP.DB.get('kv', 'backupLast')) || 0;
  if (!h) { B.state = 'off'; chip(); return; }
  B.dir = h; B.state = (await perm(h, false)) ? 'ok' : 'need'; chip();
};
B.choose = async () => {
  if (!B.supported) return;
  let h; try { h = await window.showDirectoryPicker({ id: 'gofit-backup', mode: 'readwrite' }); } catch (e) { return; }
  B.dir = h; await GP.DB.put('kv', 'backupDir', h); B.state = 'ok'; chip();
  const n = await B.writeAll(); GP.toast(`'${h.name}' 폴더에 자동 백업을 켰어요 · 지금 ${n}개 저장`, { ms: 5000 });
};
B.off = async () => { B.dir = null; B.state = 'off'; await GP.DB.del('kv', 'backupDir'); chip(); };
B.reconnect = async () => { if (!B.dir) return; if (await perm(B.dir, true)) { B.state = 'ok'; chip(); await B.writeAll(); GP.toast('백업 폴더를 다시 연결했어요'); } };
/* file name: the project name; a project renamed later replaces its old file */
async function write(p) {
  const names = (await GP.DB.get('kv', 'backupNames')) || {}, list = await GP.listProjects();
  let name = U.fileSafe(p.name) + '.gofit';
  if (list.some(r => r.id !== p.id && U.fileSafe(r.name) + '.gofit' === name)) name = U.fileSafe(p.name) + '_' + p.id.slice(-4) + '.gofit';
  const fh = await B.dir.getFileHandle(name, { create: true }), w = await fh.createWritable(); await w.write(JSON.stringify(p)); await w.close();
  if (names[p.id] && names[p.id] !== name) { try { await B.dir.removeEntry(names[p.id]); } catch (e) { } }
  names[p.id] = name; await GP.DB.put('kv', 'backupNames', names);
  B.last = Date.now(); await GP.DB.put('kv', 'backupLast', B.last);
}
B.writeAll = async () => { if (B.state !== 'ok') return 0; let n = 0; for (const r of await GP.listProjects()) { try { await write(r.data); n++; } catch (e) { console.warn(e); } } chip(); return n; };
let tm = 0;
GP.on('saved', () => {
  if (B.state !== 'ok' || !GP.P || GP.viewOnly) return; clearTimeout(tm);
  tm = setTimeout(async () => { try { await write(GP.projectPayload()); chip(); } catch (e) { console.warn(e); B.state = (await perm(B.dir, false)) ? 'ok' : 'need'; chip(); } }, 4000);
});
/* top bar: a button when the browser needs the folder permission again (it asks once per visit) */
function chip() {
  const b = $('#bkChip'); if (!b) return;
  b.hidden = GP.viewOnly || B.state !== 'need';
}
B.statusHtml = () => {
  if (!B.supported) return `<p class="note">이 브라우저(아이패드·사파리 등)는 폴더 자동 백업을 지원하지 않아요. 대신 아래 <b>모든 프로젝트를 파일 하나로 저장</b>을 가끔 눌러 두세요.</p>`;
  if (B.state === 'off') return `<p class="note">폴더를 하나 정해 두면, 저장될 때마다 프로젝트 파일(.gofit)이 그 폴더에 자동으로 쌓여요. 원드라이브·구글 드라이브 폴더를 고르면 다른 PC에서도 꺼내 쓸 수 있어요.</p><div class="acts"><button class="btn primary" id="bkChoose">백업 폴더 정하기</button></div>`;
  return `<p class="note">백업 폴더: <b>${U.esc(B.dir.name)}</b>${B.state === 'need' ? ' · <span style="color:var(--amber)">연결이 필요해요</span>' : ''}${B.last ? ` · 마지막 백업 ${new Date(B.last).toLocaleString('ko-KR')}` : ''}</p>
    <div class="acts">${B.state === 'need' ? '<button class="btn primary" id="bkRe">다시 연결</button>' : '<button class="btn" id="bkNow">지금 전체 백업</button>'}<button class="btn" id="bkChoose">다른 폴더로 바꾸기</button><button class="btn danger" id="bkOff">자동 백업 끄기</button></div>`;
};

/* ---------------- open by dropping a file on the window, or from the installed app (file handler) ---------------- */
window.addEventListener('dragover', e => { if (GP.viewOnly || !e.dataTransfer || ![...e.dataTransfer.items || []].some(i => i.kind === 'file')) return; e.preventDefault(); });
window.addEventListener('drop', e => {
  if (GP.viewOnly || !e.dataTransfer || !e.dataTransfer.files.length) return; const f = e.dataTransfer.files[0];
  if (!/\.gofit$/i.test(f.name)) return; e.preventDefault(); B.openFile(f);
});
if ('launchQueue' in window) window.launchQueue.setConsumer(async params => { for (const h of params.files || []) { try { await booted; B.openFile(await h.getFile()); } catch (e) { } } });

GP.on('booted', () => { if (!GP.viewOnly) B.init(); });
document.addEventListener('click', e => {
  const t = e.target.closest('#bkChip,#bkChoose,#bkRe,#bkNow,#bkOff,#bkAllSave'); if (!t) return;
  const re = () => { const box = $('#bkBox'); if (box) box.innerHTML = B.statusHtml(); };
  if (t.id === 'bkChip' || t.id === 'bkRe') B.reconnect().then(re);
  else if (t.id === 'bkChoose') B.choose().then(re);
  else if (t.id === 'bkNow') B.writeAll().then(n => { GP.toast(`프로젝트 ${n}개를 백업 폴더에 저장했어요`); re(); });
  else if (t.id === 'bkOff') GP.confirm('자동 백업을 끌까요? 폴더에 있는 파일은 그대로 남아요.', '끄기', true).then(ok => { if (ok) B.off().then(re); });
  else if (t.id === 'bkAllSave') B.saveAll();
});
})();
