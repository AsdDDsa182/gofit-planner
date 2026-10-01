/* GoFit Planner — plan pictures: top views rendered from the 3D models (pre-rendered in /assets/plan, the rest rendered on the fly) */
(function () {
'use strict';
const GP = window.GP;
const SYM = GP.SYM = {};
SYM.FONT = '"Pretendard","Malgun Gothic","Apple SD Gothic Neo","Noto Sans KR",sans-serif';
SYM.PAL = { normal: { line: '#59626B' }, sel: { line: '#2450E0' }, hover: { line: '#D9711A' }, bad: { line: '#D6362B' } };
const TINT = { sel: ['rgba(36,80,224,.16)', '#2450E0'], hover: ['rgba(217,113,26,.14)', '#D9711A'], bad: ['rgba(214,54,43,.2)', '#D6362B'] };

SYM.man = {}; const imgs = new Map(), lines = new Map(); SYM.ready = Promise.resolve();
SYM.base = () => window.GP_BASE || '';
SYM.loadManifest = async () => {
  try { SYM.man = await (await fetch(SYM.base() + 'assets/plan/manifest.json')).json(); } catch (e) { SYM.man = {}; return; }
  // pictures load in the background (the plan redraws as they arrive); exports wait for SYM.ready
  const load = (t, dir, map) => new Promise(res => { const im = new Image(); im.crossOrigin = 'anonymous'; im.onload = () => { map.set(t, im); if (GP.S && GP.S.invalidate) GP.S.invalidate(); res(); }; im.onerror = () => { map.set(t, null); res(); }; im.src = SYM.base() + dir + t + '.png'; });
  SYM.ready = Promise.all(Object.keys(SYM.man).flatMap(t => [load(t, 'assets/plan/', imgs), load(t, 'assets/plan-line/', lines)]));
};
SYM.hasImage = t => imgs.has(t);
/* catalog card picture */
SYM.thumbUrl = t => { const d = GP.getDef(t); if (SYM.man[t] && d && !d.custom && !d.params) return SYM.base() + 'assets/thumb/' + t + '.png'; return GP.R3.thumb(t); };
SYM.thumb = SYM.thumbUrl;
SYM.clearThumbs = () => GP.R3.clear();

/* draw an item in local meters (origin = item centre, +Z = front) */
SYM.draw = (x, it, def, dm, px, state, style) => {
  let src = null, ext = null; const line = style === 'line';
  const pre = def && !def.custom && !def.params && SYM.man[it.type], map = line ? lines : imgs, im = pre && map.get(it.type);
  if (im) { src = im; ext = SYM.man[it.type].ext; }
  else if (pre && !map.has(it.type)) { x.fillStyle = 'rgba(200,205,210,.35)'; x.fillRect(-dm.w / 2, -dm.d / 2, dm.w, dm.d); }
  else { const tv = GP.R3.topView(it, null, line); if (tv) { src = tv.canvas; ext = tv.ext; } }
  if (src) x.drawImage(src, ext[0] * dm.w, ext[2] * dm.d, (ext[1] - ext[0]) * dm.w, (ext[3] - ext[2]) * dm.d);
  else { x.fillStyle = '#E9EBED'; x.fillRect(-dm.w / 2, -dm.d / 2, dm.w, dm.d); x.strokeStyle = '#59626B'; x.lineWidth = 1.2 * px; x.strokeRect(-dm.w / 2, -dm.d / 2, dm.w, dm.d); }
  const t = TINT[state]; if (t) { x.fillStyle = t[0]; x.fillRect(-dm.w / 2, -dm.d / 2, dm.w, dm.d); x.strokeStyle = t[1]; x.lineWidth = 2 * px; x.strokeRect(-dm.w / 2, -dm.d / 2, dm.w, dm.d); }
};
})();
