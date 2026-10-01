/* GoFit Planner — equipment popup: 3D model (registered file or generic model), photos, and registering them */
(function () {
'use strict';
const GP = window.GP, U = GP.U, $ = U.$;
const M3 = GP.M3 = {};
M3.base = () => window.GP_BASE || '';

function loadScript(src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('script ' + src)); document.head.appendChild(s); }); }
let libP = null;
M3.lib = () => libP || (libP = (async () => { if (!window.THREE) await loadScript(M3.base() + 'vendor/three.min.js'); for (const f of ['OrbitControls', 'GLTFLoader', 'DRACOLoader']) if (!THREE[f]) await loadScript(M3.base() + 'vendor/' + f + '.js'); })().catch(e => { libP = null; throw e; }));

async function loadModel(type, onProgress) { const sc = await GP.R3.glb(type, onProgress, !GP.media.model(type)); return sc.clone(true); }

let cur = null; // active viewer
function disposeTree() { }
function stop() { if (!cur) return; cancelAnimationFrame(cur.raf); cur.ro && cur.ro.disconnect(); if (cur.ctl) cur.ctl.dispose(); if (cur.r) { cur.r.dispose(); cur.r.forceContextLoss && cur.r.forceContextLoss(); } if (cur.env) cur.env.dispose(); cur = null; }

/* popup for one equipment type: 3D model (registered or generic) → photos → "nothing yet" (+ register buttons in the editor) */
M3.open = (it, tab) => {
  const type = it.type, def = GP.getDef(type) || {}, d = GP.dims(it), MD = GP.media;
  const has3d = GP.R3.ok && GP.R3.hasModel(type), photos = MD.photos(type), reg = MD.model(type), edit = !GP.viewOnly;
  if (!tab) tab = has3d ? '3d' : 'photo';
  const info = `<div class="m3-info"><b>${U.esc(GP.itemName(it))}</b><small>${U.esc((GP.CATS.find(c => c.id === def.cat) || {}).name || '')} · ${U.cm(d.w)}×${U.cm(d.d)}×${U.cm(d.h)} cm${reg && !MD.remote ? ' · 직접 등록한 3D' : ''}</small>${GP.info.NO_QUOTE.has(type) ? '' : GP.info.priceLines(GP.lib.prices[type] || 0, 1)}</div>`;
  const tabs = (has3d && photos.length) ? `<div class="m3tabs"><button data-m3tab="3d" class="${tab === '3d' ? 'on' : ''}">${GP.IC.cube} 3D 모델</button><button data-m3tab="photo" class="${tab === 'photo' ? 'on' : ''}">${GP.IC.image} 사진 ${photos.length}</button></div>` : '';
  let stageHtml;
  if (tab === '3d' && has3d) stageHtml = `<div class="m3"><canvas id="m3cv"></canvas><div class="m3-load" id="m3load"><div class="spinner"></div><span id="m3txt">3D 모델 불러오는 중…</span></div><p class="m3-cap">드래그로 돌려보기 · 휠·두 손가락으로 확대</p></div>`;
  else if (photos.length) stageHtml = `<div class="m3 photos"><img id="m3img" alt=""><button class="m3nav prev" data-m3="prev" aria-label="이전">‹</button><button class="m3nav next" data-m3="next" aria-label="다음">›</button><span class="m3cnt" id="m3cnt"></span></div>`;
  else stageHtml = `<div class="m3 empty">${GP.IC.cube}<b>3D 모델·사진이 아직 없어요</b><p class="note">${edit ? '이 기구의 사진이나 3D 파일(GLB)을 등록하면 도면·고객 링크에서 볼 수 있어요. 한 번 등록하면 같은 기구 전체에 적용돼요.' : '이 기구는 도면의 모양과 크기로 확인해 주세요.'}</p></div>`;
  const tools = edit ? `<div class="m3tools"><label class="btn sm">${GP.IC.image} 사진 추가<input type="file" id="m3addPh" accept="image/*" multiple hidden></label><label class="btn sm">${GP.IC.cube} ${reg ? '3D 파일 바꾸기' : '3D 파일 등록'}<input type="file" id="m3addMd" accept=".glb" hidden></label>${tab === 'photo' && photos.length ? '<button class="btn sm danger" data-m3="delPh">이 사진 삭제</button>' : ''}${reg && tab === '3d' ? '<button class="btn sm" data-m3="rot">방향 90° 돌리기</button><button class="btn sm danger" data-m3="delMd">등록한 3D 삭제</button>' : ''}</div>` : '';
  const title = tab === '3d' && has3d ? '3D 모델' : photos.length ? '사진' : '기구 보기';
  GP.modal(title, tabs + stageHtml + info + tools, `${tab === '3d' && has3d ? '<button class="btn" id="m3spin">회전 멈춤</button>' : ''}<button class="btn primary" data-close>닫기</button>`, { size: has3d || photos.length ? 'wide' : 'narrow', onClose: stop });
  stop();
  const mb = $('#modalBody'); let pi = 0;
  const showPhoto = async () => { const im = $('#m3img'); if (!im || !photos.length) return; pi = (pi + photos.length) % photos.length; im.src = await MD.src(photos[pi]) || ''; $('#m3cnt').textContent = `${pi + 1} / ${photos.length}`; };
  mb.onclick = async e => {
    const tb = e.target.closest('[data-m3tab]'); if (tb) { M3.open(it, tb.dataset.m3tab); return; }
    const b = e.target.closest('[data-m3]'); if (!b) return; const a = b.dataset.m3;
    if (a === 'prev') { pi--; showPhoto(); } else if (a === 'next') { pi++; showPhoto(); }
    else if (a === 'delPh') { const id = photos[pi].id; if (await GP.confirm('이 사진을 삭제할까요? 같은 기구 전체에서 지워져요.', '삭제', true)) await MD.removePhoto(type, id); M3.open(it, 'photo'); }
    else if (a === 'delMd') { if (await GP.confirm('직접 등록한 3D 파일을 삭제할까요?', '삭제', true)) { await MD.removeModel(type); if (GP.V3.on) GP.V3.rebuild(); } M3.open(it); }
    else if (a === 'rot') { MD.rotateModel(type, 90); GP.toast('3D 화면에서 이 기구의 방향을 90° 돌렸어요'); if (GP.V3.on) GP.V3.rebuild(); }
  };
  mb.onchange = async e => {
    const t = e.target;
    if (t.id === 'm3addPh' && t.files.length) { GP.busy(true, '사진 저장하는 중…'); try { const n = await MD.addPhotos(type, [...t.files]); GP.toast(`사진 ${n}장을 등록했어요${MD.gh.cfg() ? ' · 인터넷이 되면 자동으로 올라가요' : ''}`); } finally { GP.busy(false); } M3.open(it, 'photo'); }
    if (t.id === 'm3addMd' && t.files[0]) { GP.busy(true, '3D 파일 저장하는 중…'); try { await MD.setModel(type, t.files[0]); GP.toast('3D 파일을 등록했어요. 방향이 틀리면 「방향 90° 돌리기」를 눌러 주세요'); } catch (err) { GP.toast(err.message, { bad: true }); } finally { GP.busy(false); } if (GP.V3.on) GP.V3.rebuild(); M3.open(it, '3d'); }
  };
  if (tab === '3d' && has3d) view3d(type, d); else showPhoto();
};
async function view3d(type, d) {
  const token = {}; cur = token;
  try {
    const scene0 = await loadModel(type, p => { const t = $('#m3txt'); if (t) t.textContent = `3D 모델 불러오는 중… ${Math.round(p * 100)}%`; });
    if (cur !== token || !$('#m3cv')) return;
    const cv = $('#m3cv'), box = cv.parentElement;
    const r = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: false }); r.setPixelRatio(Math.min(2, devicePixelRatio || 1)); r.outputEncoding = THREE.sRGBEncoding; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05; r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    const sc = new THREE.Scene(); sc.background = new THREE.Color('#EEF0EE');
    const pm = new THREE.PMREMGenerator(r); const envS = new THREE.Scene(); envS.add(new THREE.Mesh(new THREE.BoxGeometry(12, 6, 12), new THREE.MeshBasicMaterial({ color: '#8a9096', side: THREE.BackSide })));
    [[0, 2.9, 0, 7, .1, 7, 3.4], [5.9, 1.6, 0, .1, 2, 5, 1.8], [-5.9, 1.6, 0, .1, 2, 5, 1.4], [0, 1.6, 5.9, 5, 2, .1, 1.3]].forEach(([x, y, z, w, h, dd, i]) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, dd), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffffff').multiplyScalar(i) })); m.position.set(x, y, z); envS.add(m); });
    const env = pm.fromScene(envS, .04).texture; sc.environment = env; pm.dispose();
    sc.add(new THREE.HemisphereLight(0xffffff, 0x9aa0a6, .5));
    const model = scene0; sc.add(model); model.position.set(0, 0, 0); model.rotation.set(0, 0, 0); model.scale.set(1, 1, 1); model.updateMatrixWorld(true);
    const mbox = (o) => (GP.R3 && GP.R3.box) ? GP.R3.box(o) : new THREE.Box3().setFromObject(o);
    const bb = mbox(model); const size = bb.getSize(new THREE.Vector3()), ctr = bb.getCenter(new THREE.Vector3());
    const k = 1 / Math.max(size.x, size.y, size.z, 1e-6) * Math.max(d.w, d.d, d.h, 1); model.scale.setScalar(k); model.position.set(-ctr.x * k, -bb.min.y * k, -ctr.z * k); model.updateMatrixWorld(true);
    model.traverse(n => { if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; } });
    const bb2 = mbox(model); const s2 = bb2.getSize(new THREE.Vector3()), rad = Math.max(s2.x, s2.y, s2.z) * .75;
    const dl = new THREE.DirectionalLight(0xffffff, 1.1); dl.position.set(rad * 1.5, rad * 3, rad * 2); dl.castShadow = true; dl.shadow.mapSize.set(2048, 2048); const c = dl.shadow.camera; c.left = c.bottom = -rad * 1.6; c.right = c.top = rad * 1.6; c.near = .1; c.far = rad * 10; dl.shadow.bias = -.0005; dl.shadow.normalBias = .02; sc.add(dl);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(rad * 12, rad * 12), new THREE.ShadowMaterial({ opacity: .2 })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; sc.add(ground);
    const cam = new THREE.PerspectiveCamera(35, 1, rad * .02, rad * 60); const tgt = new THREE.Vector3(0, s2.y * .45, 0);
    const dist = s2.length() / 2 / Math.sin(35 / 2 * U.DEG) * .92; const dir = new THREE.Vector3(.55, .38, .75).normalize(); cam.position.copy(tgt).addScaledVector(dir, dist);
    const ctl = new THREE.OrbitControls(cam, cv); ctl.target.copy(tgt); ctl.enableDamping = true; ctl.dampingFactor = .1; ctl.autoRotate = true; ctl.autoRotateSpeed = 1.2; ctl.maxPolarAngle = Math.PI * .495; ctl.minDistance = rad * .6; ctl.maxDistance = rad * 8; ctl.update();
    ctl.addEventListener('start', () => { ctl.autoRotate = false; const b = $('#m3spin'); if (b) b.textContent = '자동 회전'; });
    Object.assign(token, { r, ctl, env });
    const size2 = () => { const w = box.clientWidth, h = box.clientHeight; if (!w || !h) return; r.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); };
    token.ro = new ResizeObserver(size2); token.ro.observe(box); size2();
    const sp = $('#m3spin'); if (sp) sp.onclick = () => { ctl.autoRotate = !ctl.autoRotate; sp.textContent = ctl.autoRotate ? '회전 멈춤' : '자동 회전'; };
    const loop = () => { if (cur !== token) return; token.raf = requestAnimationFrame(loop); ctl.update(); r.render(sc, cam); };
    loop(); const ld = $('#m3load'); if (ld) ld.hidden = true;
  } catch (e) {
    console.warn(e); if (cur === token) cur = null;
    const ld = $('#m3load'); if (ld) ld.innerHTML = `<b>3D 모델을 불러오지 못했어요</b><span class="note">${location.protocol === 'file:' && !window.GP_BASE ? '파일로 연 앱에서는 3D를 볼 수 없어요. 인터넷 주소나 설치한 앱에서 열어 주세요.' : '인터넷 연결을 확인해 주세요. 한 번 본 모델은 다음부터 인터넷 없이도 보여요.'}</span>`;
  }
};

/* download every model once so the service worker keeps them for offline sites */
M3.prefetchAll = async (statEl) => {
  if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) { if (statEl) statEl.textContent = '인터넷 주소(호스팅)나 설치한 앱에서 열었을 때만 받아둘 수 있어요.'; return; }
  const list = Object.values(GP.R3.basic); let ok = 0, fail = 0;
  for (let i = 0; i < list.length; i++) {
    if (statEl) statEl.textContent = `받는 중… ${i + 1} / ${list.length}`;
    try { const r = await fetch(M3.base() + 'models/basic/' + list[i]); if (r.ok) { await r.arrayBuffer(); ok++; } else fail++; } catch (e) { fail++; }
  }
  for (const f of ['vendor/three.min.js', 'vendor/OrbitControls.js', 'vendor/GLTFLoader.js', 'vendor/DRACOLoader.js', 'vendor/draco/draco_decoder.wasm', 'vendor/draco/draco_wasm_wrapper.js', 'vendor/draco/draco_decoder.js']) { try { await (await fetch(M3.base() + f)).arrayBuffer(); } catch (e) { } }
  if (statEl) statEl.textContent = fail ? `${ok}개 받음 · ${fail}개 실패 (인터넷 확인 후 다시 눌러 주세요)` : `완료! ${ok}개 모델을 이 기기에 받아뒀어요`;
};
})();
