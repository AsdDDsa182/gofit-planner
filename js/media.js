/* GoFit Planner — photos & 3D files registered per equipment type.
   Kept in this browser (IndexedDB) and copied automatically to the user's own GitHub repository (served by GitHub Pages),
   so customer links can show them. Stale files are cleaned up automatically when the repository gets full. */
(function () {
'use strict';
const GP = window.GP, U = GP.U;
const MD = GP.media = {};
const LIMIT = 1024 * 1024 * 1024, CLEAN_AT = .8, CLEAN_TO = .7, STALE = 180 * 864e5;
MD.remote = null; // viewer mode: { type: { p: [url], m: url, r: rot } } from the link payload

/* ---------------- records (GP.lib.media[type] = { photos:[rec], model:rec|null, used }) ---------------- */
const lib = () => { GP.lib.media = GP.lib.media || {}; GP.lib.mediaDel = GP.lib.mediaDel || []; return GP.lib.media; };
MD.of = (type) => lib()[type] || null;
MD.photos = (type) => MD.remote ? ((MD.remote[type] || {}).p || []).map((u, i) => ({ id: type + i, url: u })) : ((MD.of(type) || {}).photos || []);
MD.model = (type) => MD.remote ? ((MD.remote[type] || {}).m ? { id: 'r' + type, url: MD.remote[type].m, rot: MD.remote[type].r || 0 } : null) : ((MD.of(type) || {}).model || null);
const ensure = (type) => { const m = lib(); return m[type] || (m[type] = { photos: [], model: null, used: Date.now() }); };
const tidy = (type) => { const r = lib()[type]; if (r && !r.photos.length && !r.model) delete lib()[type]; };

/* local blobs (IndexedDB 'blobs' store) */
const urlCache = new Map();
MD.src = async (rec) => {
  if (!rec) return null; if (rec.url) return rec.url; if (urlCache.has(rec.id)) return urlCache.get(rec.id);
  const b = await GP.DB.get('blobs', 'media:' + rec.id);
  if (b instanceof Blob) { const u = URL.createObjectURL(b); urlCache.set(rec.id, u); return u; }
  if (rec.path && GH.base()) return GH.base() + rec.path; // local copy missing (other PC): use the online one
  return null;
};

/* photo: shrink to ~1600px JPEG before storing */
async function shrink(file) {
  const src = await U.readFile(file); const img = await U.loadImage(src); const s = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s); const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height);
  return await new Promise(r => c.toBlob(r, 'image/jpeg', .82));
}
MD.addPhotos = async (type, files) => {
  const r = ensure(type); let n = 0;
  for (const f of files) { if (!/^image\//.test(f.type)) continue; const b = await shrink(f); const id = U.uid('ph'); await GP.DB.put('blobs', 'media:' + id, b); r.photos.push({ id, size: b.size, t: Date.now(), path: `media/${type}/${id}.jpg`, up: 0 }); n++; }
  r.used = Date.now(); GP.saveLib(); GP.emit('media', type); MD.syncSoon(); return n;
};
MD.setModel = async (type, file) => {
  if (!/\.glb$/i.test(file.name)) throw new Error('GLB 파일만 등록할 수 있어요');
  if (file.size > 60 * 1024 * 1024) throw new Error('60MB보다 큰 파일은 등록할 수 없어요');
  const r = ensure(type); if (r.model) await MD.removeModel(type, true);
  const id = U.uid('md'); await GP.DB.put('blobs', 'media:' + id, file.slice(0, file.size, 'model/gltf-binary'));
  r.model = { id, size: file.size, t: Date.now(), path: `media/${type}/${id}.glb`, up: 0, rot: 0 }; r.used = Date.now(); GP.saveLib(); GP.emit('media', type); MD.syncSoon();
};
MD.rotateModel = (type, deg) => { const m = MD.model(type); if (!m || MD.remote) return; m.rot = U.normRot((m.rot || 0) + deg); GP.saveLib(); GP.emit('media', type); };
MD.removePhoto = async (type, id) => { const r = MD.of(type); if (!r) return; const p = r.photos.find(q => q.id === id); if (!p) return; r.photos = r.photos.filter(q => q !== p); await drop(p); tidy(type); GP.saveLib(); GP.emit('media', type); MD.syncSoon(); };
MD.removeModel = async (type, keep) => { const r = MD.of(type); if (!r || !r.model) return; const m = r.model; r.model = null; await drop(m); if (!keep) { tidy(type); GP.saveLib(); GP.emit('media', type); MD.syncSoon(); } };
async function drop(rec) { await GP.DB.del('blobs', 'media:' + rec.id); if (urlCache.has(rec.id)) { URL.revokeObjectURL(urlCache.get(rec.id)); urlCache.delete(rec.id); } if (rec.up) { lib(); GP.lib.mediaDel.push(rec.path); } }
MD.pending = () => { let n = 0; for (const r of Object.values(lib())) { n += r.photos.filter(p => !p.up).length + (r.model && !r.model.up ? 1 : 0); } return n + (GP.lib.mediaDel || []).length; };

/* remember when each type was last used in a project (for the automatic cleanup) */
GP.on('changed', U.debounce(() => { if (GP.viewOnly || !GP.P) return; const m = lib(), now = Date.now(); let ch = false; new Set(GP.L().items.map(i => i.type)).forEach(t => { if (m[t] && now - (m[t].used || 0) > 864e5) { m[t].used = now; ch = true; } }); if (ch) GP.saveLib(); }, 3000));

/* payload for customer links / HTML files: online addresses of the files used in this layout */
MD.forPayload = (types) => {
  const out = {}; const base = GH.base(); if (!base) return out;
  for (const t of types) { const r = MD.of(t); if (!r) continue; const p = r.photos.filter(q => q.up).map(q => base + q.path), m = r.model && r.model.up ? base + r.model.path : null; if (p.length || m) out[t] = Object.assign({ p }, m ? { m, r: r.model.rot || 0 } : {}); }
  return out;
};

/* ---------------- GitHub (the user's own repository, served by GitHub Pages) ---------------- */
const GH = MD.gh = {};
GH.cfg = () => { try { return JSON.parse(localStorage.getItem('gofit:gh') || 'null'); } catch (e) { return null; } };
GH.save = (c) => { try { if (c) localStorage.setItem('gofit:gh', JSON.stringify(c)); else localStorage.removeItem('gofit:gh'); } catch (e) { } };
GH.base = () => { if (MD.remote) return ''; const c = GH.cfg(); return c && c.owner && c.repo ? `https://${c.owner.toLowerCase()}.github.io/${c.repo}/` : ''; };
async function api(path, opt) {
  const c = GH.cfg(); if (!c || !c.token) throw new Error('GitHub 연결이 안 되어 있어요');
  const r = await fetch('https://api.github.com' + path, Object.assign({}, opt || {}, { headers: Object.assign({ Authorization: 'Bearer ' + c.token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }, (opt && opt.body) ? { 'Content-Type': 'application/json' } : {}) }));
  if (!r.ok) { const e = new Error(`GitHub ${r.status}`); e.status = r.status; try { e.body = await r.json(); } catch (_) { } throw e; }
  return r.status === 204 ? null : r.json();
}
const repoPath = () => { const c = GH.cfg(); return `/repos/${c.owner}/${c.repo}`; };
const b64 = async (blob) => { const buf = new Uint8Array(await blob.arrayBuffer()); let s = ''; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000)); return btoa(s); };
/* connect: check the token & repository, create the first commit if empty, turn on GitHub Pages */
GH.connect = async (owner, repo, token) => {
  GH.save({ owner: owner.trim(), repo: repo.trim(), token: token.trim() });
  try {
    await api(repoPath());
    try { await api(repoPath() + '/git/ref/heads/main'); }
    catch (e) { if (e.status !== 409 && e.status !== 404) throw e; await api(repoPath() + '/contents/.nojekyll', { method: 'PUT', body: JSON.stringify({ message: '고핏 플래너 사진 저장소', content: '', branch: 'main' }) }); }
    let pages = true; try { await api(repoPath() + '/pages'); } catch (e) { if (e.status !== 404) throw e; try { await api(repoPath() + '/pages', { method: 'POST', body: JSON.stringify({ source: { branch: 'main', path: '/' } }) }); } catch (e2) { pages = false; } }
    return { ok: true, pages };
  } catch (e) { GH.save(null); throw e; }
};
GH.disconnect = () => GH.save(null);

let syncing = null, syncT = 0;
MD.syncSoon = () => { clearTimeout(syncT); syncT = setTimeout(() => MD.sync(), 4000); };
/* upload new files + delete removed ones in ONE commit (GitHub Pages rebuilds once) */
MD.sync = () => {
  if (syncing) return syncing;
  syncing = (async () => {
    if (MD.remote || !GH.cfg() || !navigator.onLine) return { skipped: true };
    const m = lib(), ups = []; for (const [t, r] of Object.entries(m)) { r.photos.forEach(p => { if (!p.up) ups.push(p); }); if (r.model && !r.model.up) ups.push(r.model); }
    const dels = GP.lib.mediaDel.slice(); if (!ups.length && !dels.length) return { done: 0 };
    GP.emit('mediaSync', { busy: true });
    const ref = await api(repoPath() + '/git/ref/heads/main'); const head = ref.object.sha; const hc = await api(repoPath() + '/git/commits/' + head);
    const tree = [];
    for (const rec of ups) { const b = await GP.DB.get('blobs', 'media:' + rec.id); if (!(b instanceof Blob)) continue; const bl = await api(repoPath() + '/git/blobs', { method: 'POST', body: JSON.stringify({ content: await b64(b), encoding: 'base64' }) }); tree.push({ path: rec.path, mode: '100644', type: 'blob', sha: bl.sha }); }
    const existing = new Set((await api(repoPath() + '/git/trees/' + hc.tree.sha + '?recursive=1')).tree.map(e => e.path));
    dels.forEach(p => { if (existing.has(p)) tree.push({ path: p, mode: '100644', type: 'blob', sha: null }); });
    if (tree.length) {
      const nt = await api(repoPath() + '/git/trees', { method: 'POST', body: JSON.stringify({ base_tree: hc.tree.sha, tree }) });
      const nc = await api(repoPath() + '/git/commits', { method: 'POST', body: JSON.stringify({ message: `사진·3D ${ups.length}개 올림, ${dels.length}개 지움`, tree: nt.sha, parents: [head] }) });
      await api(repoPath() + '/git/refs/heads/main', { method: 'PATCH', body: JSON.stringify({ sha: nc.sha }) });
      GP.lib.mediaCommits = (GP.lib.mediaCommits || 0) + 1;
    }
    ups.forEach(r => { r.up = 1; }); GP.lib.mediaDel = GP.lib.mediaDel.filter(p => !dels.includes(p)); GP.saveLib();
    if (dels.length || GP.lib.mediaCommits > 40) await MD.squash();
    return { done: ups.length + dels.length };
  })().catch(e => { console.warn('media sync', e); if (e.status === 401) GP.toast('GitHub 열쇠(토큰)가 맞지 않거나 지워졌어요. 설정 → 사진·3D 저장소에서 다시 연결해 주세요', { bad: true, ms: 7000 }); return { error: e }; }).finally(() => { syncing = null; GP.emit('mediaSync', { busy: false }); });
  return syncing;
};
/* drop old history so deleted files really free space (the app is the only writer of this repository) */
MD.squash = async () => {
  const ref = await api(repoPath() + '/git/ref/heads/main'); const hc = await api(repoPath() + '/git/commits/' + ref.object.sha);
  const nc = await api(repoPath() + '/git/commits', { method: 'POST', body: JSON.stringify({ message: '고핏 플래너 사진·3D (정리됨)', tree: hc.tree.sha, parents: [] }) });
  await api(repoPath() + '/git/refs/heads/main', { method: 'PATCH', body: JSON.stringify({ sha: nc.sha, force: true }) }); GP.lib.mediaCommits = 0; GP.saveLib();
};
MD.usage = async () => { const ref = await api(repoPath() + '/git/ref/heads/main'); const hc = await api(repoPath() + '/git/commits/' + ref.object.sha); const t = await api(repoPath() + '/git/trees/' + hc.tree.sha + '?recursive=1'); const used = t.tree.reduce((s, e) => s + (e.size || 0), 0); GP.lib.mediaUsage = { used, at: Date.now() }; GP.saveLib(); return used; };
/* when 80% full: remove the files of types not used in any project for 6 months, oldest first, down to 70% */
MD.cleanup = async (force) => {
  let used = await MD.usage(); if (!force && used < LIMIT * CLEAN_AT) return [];
  const now = Date.now(), m = lib(); const cand = Object.entries(m).filter(([, r]) => now - (r.used || 0) > STALE).sort((a, b) => (a[1].used || 0) - (b[1].used || 0)); const removed = [];
  for (const [t, r] of cand) { if (used < LIMIT * CLEAN_TO) break; const sz = r.photos.reduce((s, p) => s + (p.size || 0), 0) + (r.model ? r.model.size || 0 : 0); for (const p of r.photos.slice()) await drop(p); if (r.model) await drop(r.model); delete m[t]; used -= sz; removed.push(GP.typeName(t)); }
  if (removed.length) { GP.saveLib(); await MD.sync(); GP.toast(`저장소가 80% 넘게 차서, 6개월 넘게 안 쓴 기구 사진·3D를 정리했어요: ${removed.slice(0, 6).join(', ')}${removed.length > 6 ? ` 외 ${removed.length - 6}개` : ''}`, { ms: 7000 }); GP.emit('media'); }
  return removed;
};
MD.LIMIT = LIMIT;
/* sync when the connection comes back, and once in a while */
window.addEventListener('online', () => MD.sync());
setInterval(() => { if (MD.pending()) MD.sync(); }, 5 * 60 * 1000);
GP.on('booted', () => { if (GP.viewOnly) return; setTimeout(async () => { if (!GH.cfg() || !navigator.onLine) return; await MD.sync(); const last = (GP.lib.mediaUsage || {}).at || 0; if (Date.now() - last > 864e5) { try { await MD.cleanup(); } catch (e) { } } }, 6000); });
})();
