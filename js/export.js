/* GoFit Planner — exports: image, PDF, share link, HTML viewer, DXF, project files */
(function () {
'use strict';
const GP = window.GP, U = GP.U, G = GP.G, $ = U.$, IC = GP.IC;
const exp = GP.exp = {};
const FONT = '"Malgun Gothic","Apple SD Gothic Neo","Noto Sans KR","Pretendard",sans-serif', MONO = 'Consolas,"SFMono-Regular",ui-monospace,monospace';

exp.canvasThumb = (src, w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); const s = Math.max(w / src.width, h / src.height); x.drawImage(src, (w - src.width * s) / 2, (h - src.height * s) / 2, src.width * s, src.height * s); return c.toDataURL('image/jpeg', .8); };
function rr(x, a, b, w, h, r) { x.beginPath(); x.moveTo(a + r, b); x.lineTo(a + w - r, b); x.quadraticCurveTo(a + w, b, a + w, b + r); x.lineTo(a + w, b + h - r); x.quadraticCurveTo(a + w, b + h, a + w - r, b + h); x.lineTo(a + r, b + h); x.quadraticCurveTo(a, b + h, a, b + h - r); x.lineTo(a, b + r); x.quadraticCurveTo(a, b, a + r, b); x.closePath(); }
function fit(x, t, maxW) { t = String(t); if (x.measureText(t).width <= maxW) return t; while (t.length > 1 && x.measureText(t + '…').width > maxW) t = t.slice(0, -1); return t + '…'; }

/* ---------------- plan image (2D renderer, white paper) ---------------- */
exp.planImage = (w, h, o) => {
  o = o || {}; const S = GP.S, L = GP.L(); const b = G.bounds(L.room.pts); const m = 1.3;
  const sc = Math.min(w / (b.sx + m * 2), h / (b.sz + m * 2)); const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
  const k = Math.max(1, Math.min(w, h) / 900); // label scale for large prints
  const V = { x: b.cx, z: b.cz, s: sc / k, W: w / k, H: h / k, dpr: k };
  const layers = Object.assign({}, S.layers, { items: true, labels: o.labels !== false, mats: true, dims: true, zones: true, notes: o.notes !== false, clear: !!o.clear, aisle: false });
  S.drawPlan(x, V, { white: true, grid: false, matLabels: true, layers, notes: o.notes !== false, style: o.style });
  if (o.gray) { const im = x.getImageData(0, 0, w, h), d = im.data; for (let i = 0; i < d.length; i += 4) { const g = d[i] * .3 + d[i + 1] * .59 + d[i + 2] * .11; d[i] = d[i + 1] = d[i + 2] = g; } x.putImageData(im, 0, 0); }
  return c;
};

/* ---------------- title block ---------------- */
function titleBlock(x, W, H, k, o) {
  o = o || {}; const P = GP.P, L = GP.L(), A = Math.abs(G.area(L.room.pts)); const eq = L.items.filter(it => GP.EQUIP_CATS.has((GP.getDef(it.type) || {}).cat) && !(GP.getDef(it.type) || {}).flat).length;
  const who = [P.client ? `고객 ${P.client}` : '', P.consultant ? `담당 ${P.consultant}` : ''].filter(Boolean).join('  ·  ');
  const bw = Math.min(360 * k, W - 24 * k), bh = (who ? 132 : 112) * k, bx = W - bw - 16 * k, by = H - bh - 16 * k, pad = 14 * k;
  x.save(); x.fillStyle = 'rgba(255,255,255,.97)'; rr(x, bx, by, bw, bh, 8 * k); x.fill(); x.strokeStyle = '#1B2024'; x.lineWidth = 1.3 * k; x.stroke();
  x.textBaseline = 'alphabetic'; x.textAlign = 'left'; x.fillStyle = '#1B2024'; x.font = `800 ${18 * k}px ${FONT}`; x.fillText((GP.lib.company.name || 'GOFIT KOREA'), bx + pad, by + 25 * k);
  x.textAlign = 'right'; x.fillStyle = '#78818A'; x.font = `500 ${10.5 * k}px ${FONT}`; x.fillText(o.kind || '공간 컨설팅 · 기구 배치안', bx + bw - pad, by + 24 * k);
  x.strokeStyle = '#DDE1DE'; x.lineWidth = k; x.beginPath(); x.moveTo(bx + pad, by + 35 * k); x.lineTo(bx + bw - pad, by + 35 * k); x.stroke();
  x.textAlign = 'left'; x.fillStyle = '#1B2024'; x.font = `700 ${15 * k}px ${FONT}`; x.fillText(fit(x, P.name + (P.variants.length > 1 ? ' · ' + P.variants[P.cur].name : ''), bw - pad * 2), bx + pad, by + 57 * k);
  let y = by + 57 * k; x.font = `400 ${11.5 * k}px ${FONT}`; x.fillStyle = '#48515A';
  if (who) { y += 20 * k; x.fillText(fit(x, who, bw - pad * 2), bx + pad, y); }
  y += 20 * k; x.fillText(fit(x, `면적 ${A.toFixed(1)}㎡ (${(A / U.PY).toFixed(1)}평)  ·  운동기구 ${eq}대`, bw - pad * 2), bx + pad, y);
  y += 20 * k; x.font = `500 ${10.5 * k}px ${MONO}`; x.fillStyle = '#78818A'; x.fillText(`${U.today()}  ·  ${o.sub || '평면도'}  ·  1칸 = 1m`, bx + pad, y); x.restore();
}

/* ---------------- current view image (PNG) ---------------- */
function showImage(c, title, suffix) {
  const url = c.toDataURL('image/png');
  GP.modal(title, `<img class="preview" src="${url}" alt="${title}">`, `<span class="note">카톡·메일로 보내거나 인쇄할 수 있어요.</span><button class="btn" id="imCopy">${IC.copy} 이미지 복사</button><button class="btn primary" id="imSave">${IC.install} 파일로 저장</button>`, { size: 'wide' });
  $('#imSave').onclick = () => c.toBlob(b => U.download(b, U.fileSafe(GP.P.name) + suffix + '.png'));
  $('#imCopy').onclick = () => { try { navigator.clipboard.write([new ClipboardItem({ 'image/png': new Promise(r => c.toBlob(r, 'image/png')) })]).then(() => GP.toast('이미지를 복사했어요'), () => GP.toast('이 브라우저에서는 복사가 안 돼요. 파일로 저장해 주세요', { bad: true })); } catch (e) { GP.toast('이 브라우저에서는 복사가 안 돼요. 파일로 저장해 주세요', { bad: true }); } };
}
exp.imageDialog = async () => {
  GP.busy(true, '이미지 만드는 중…'); await GP.SYM.ready; await new Promise(r => setTimeout(r, 30)); let c;
  try { const w = 2400, h = 1700; c = exp.planImage(w, h, {}); titleBlock(c.getContext('2d'), w, h, h / 900, { sub: '평면도' }); } finally { GP.busy(false); }
  showImage(c, '도면 이미지', '_평면도');
};
/* 3D picture: the current 3D camera when the 3D view is open, otherwise the default angle */
exp.image3dDialog = async () => {
  GP.busy(true, '3D 이미지 만드는 중… (실제 모델을 불러오는 중일 수 있어요)'); let c;
  try { const w = 2400, h = 1500; c = await GP.V3.snapshot(w, h, GP.V3.on ? null : 'persp'); if (c) titleBlock(c.getContext('2d'), w, h, h / 900, { sub: '3D 투시도' }); } catch (e) { console.error(e); } finally { GP.busy(false); }
  if (!c) { GP.toast('3D 이미지를 만들지 못했어요', { bad: true }); return; }
  showImage(c, '3D 이미지', '_3D');
};

/* ---------------- tiny PDF writer (JPEG pages) ---------------- */
exp.pdf = async (pages) => {
  // pages: [{canvas, wPt, hPt}]
  const enc = new TextEncoder(); const chunks = []; let off = 0; const offsets = [];
  const push = (d) => { const b = typeof d === 'string' ? enc.encode(d) : d; chunks.push(b); off += b.length; };
  pages = pages.map(p => Object.assign({}, p, { canvas: p.canvas || p.c }));
  const jpgs = await Promise.all(pages.map(p => new Promise(r => p.canvas.toBlob(async b => r(new Uint8Array(await b.arrayBuffer())), 'image/jpeg', .9))));
  push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'.replace(/[\u0080-ÿ]/g, 'x'));
  const n = pages.length; const obj = (i, body) => { offsets[i] = off; push(`${i} 0 obj\n`); if (Array.isArray(body)) body.forEach(push); else push(body); push('\nendobj\n'); };
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  obj(2, `<< /Type /Pages /Kids [${pages.map((_, i) => `${3 + i * 3} 0 R`).join(' ')}] /Count ${n} >>`);
  pages.forEach((p, i) => {
    const pg = 3 + i * 3, im = pg + 1, ct = pg + 2; const c = `q ${p.wPt.toFixed(2)} 0 0 ${p.hPt.toFixed(2)} 0 0 cm /Im0 Do Q`;
    obj(pg, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${p.wPt.toFixed(2)} ${p.hPt.toFixed(2)}] /Resources << /XObject << /Im0 ${im} 0 R >> >> /Contents ${ct} 0 R >>`);
    obj(im, [`<< /Type /XObject /Subtype /Image /Width ${p.canvas.width} /Height ${p.canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpgs[i].length} >>\nstream\n`, jpgs[i], '\nendstream']);
    obj(ct, `<< /Length ${c.length} >>\nstream\n${c}\nendstream`);
  });
  const xref = off; const total = 3 + n * 3; let s = `xref\n0 ${total}\n0000000000 65535 f \n`; for (let i = 1; i < total; i++) s += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
  s += `trailer\n<< /Size ${total} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`; push(s);
  return new Blob(chunks, { type: 'application/pdf' });
};
const PT = mm => mm / 25.4 * 72;
function page(wmm, hmm, dpi) { dpi = dpi || 150; const c = document.createElement('canvas'); c.width = Math.round(wmm / 25.4 * dpi); c.height = Math.round(hmm / 25.4 * dpi); const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); return { c, x, W: c.width, H: c.height, mm: v => v / 25.4 * dpi, wPt: PT(wmm), hPt: PT(hmm) }; }
function header(pg, title, sub) { const { x, mm, W } = pg; x.fillStyle = '#1B2024'; x.textBaseline = 'alphabetic'; x.textAlign = 'left'; x.font = `800 ${mm(6)}px ${FONT}`; x.fillText(GP.lib.company.name || 'GOFIT KOREA', mm(12), mm(16)); x.font = `700 ${mm(5)}px ${FONT}`; x.textAlign = 'right'; x.fillText(title, W - mm(12), mm(16)); x.font = `500 ${mm(3)}px ${FONT}`; x.fillStyle = '#78818A'; x.fillText(sub || '', W - mm(12), mm(21.5)); x.strokeStyle = '#1B2024'; x.lineWidth = mm(.4); x.beginPath(); x.moveTo(mm(12), mm(24)); x.lineTo(W - mm(12), mm(24)); x.stroke(); }
function footer(pg, n, tot) { const { x, mm, W, H } = pg; x.fillStyle = '#9aa1a8'; x.font = `500 ${mm(2.6)}px ${FONT}`; x.textAlign = 'left'; x.fillText(`${GP.P.name} · ${U.today()}`, mm(12), H - mm(8)); x.textAlign = 'right'; x.fillText(tot ? `${n} / ${tot}` : `${n}`, W - mm(12), H - mm(8)); }

/* quote page(s) drawn on canvas (A4 portrait) */
function quotePages(R) {
  const P = GP.P, q = GP.L().quote, co = GP.lib.company, pages = []; let pg = page(210, 297, 170), { x, mm, W } = pg; let y;
  const valid = q.validDays ?? GP.lib.defaults.validDays ?? 30, vd = new Date(Date.now() + valid * 864e5);
  const first = () => {
    x.fillStyle = '#1B2024'; x.textAlign = 'center'; x.font = `800 ${mm(9)}px ${FONT}`; x.fillText('견   적   서', W / 2, mm(24));
    const box = (bx, by, bw, rows) => { x.strokeStyle = '#cfd4d1'; x.lineWidth = mm(.3); rr(x, bx, by, bw, mm(7) * rows.length + mm(4), mm(1.5)); x.stroke(); rows.forEach(([k, v], i) => { x.textAlign = 'left'; x.fillStyle = '#6b747c'; x.font = `500 ${mm(3.1)}px ${FONT}`; x.fillText(k, bx + mm(3), by + mm(7) * (i + 1)); x.fillStyle = '#1B2024'; x.font = `700 ${mm(3.2)}px ${FONT}`; x.fillText(fit(x, v, bw - mm(28)), bx + mm(24), by + mm(7) * (i + 1)); }); };
    box(mm(12), mm(32), mm(90), [['수신', `${P.client || '고객사'} 귀하`], ['프로젝트', P.name], ['견적 번호', GP.quote.no()], ['견적일', U.today()], ['유효기간', `${vd.getFullYear()}.${String(vd.getMonth() + 1).padStart(2, '0')}.${String(vd.getDate()).padStart(2, '0')}까지`]]);
    box(mm(108), mm(32), mm(90), [['공급자', co.name || 'GOFIT KOREA'], ['대표', co.ceo || '-'], ['사업자번호', co.bizNo || '-'], ['연락처', co.tel || '-'], ['담당', P.consultant || '-']]);
    y = mm(76); x.strokeStyle = '#1B2024'; x.lineWidth = mm(.6); x.beginPath(); x.moveTo(mm(12), y); x.lineTo(W - mm(12), y); x.stroke();
    x.textAlign = 'left'; x.font = `600 ${mm(3.6)}px ${FONT}`; x.fillStyle = '#1B2024'; x.fillText('합계 금액 (부가세 포함)', mm(14), y + mm(8)); x.textAlign = 'right'; x.font = `800 ${mm(6)}px ${FONT}`; x.fillText(`₩ ${U.won(R.total)}`, W - mm(14), y + mm(9)); y += mm(13); x.lineWidth = mm(.3); x.beginPath(); x.moveTo(mm(12), y); x.lineTo(W - mm(12), y); x.stroke(); y += mm(4);
  };
  const cols = [mm(12), mm(96), mm(128), mm(146), mm(172), W - mm(12)];
  const th = () => { x.fillStyle = '#f1f3f1'; x.fillRect(mm(12), y, W - mm(24), mm(8)); x.fillStyle = '#1B2024'; x.font = `700 ${mm(3.1)}px ${FONT}`; x.textAlign = 'center'; ['품목', '규격', '수량', '단가', '금액'].forEach((t, i) => x.fillText(t, (cols[i] + cols[i + 1]) / 2, y + mm(5.6))); y += mm(8); };
  const newPage = () => { footer(pg, pages.length + 1, 0); pages.push(pg); pg = page(210, 297, 170); ({ x, mm, W } = pg); y = mm(14); th(); };
  first(); th();
  R.groups.forEach(g => {
    if (y > mm(262)) newPage();
    x.fillStyle = '#fafbfa'; x.fillRect(mm(12), y, W - mm(24), mm(7)); x.fillStyle = '#48515a'; x.font = `700 ${mm(3)}px ${FONT}`; x.textAlign = 'left'; x.fillText(g.name, mm(14), y + mm(5)); y += mm(7);
    g.rows.forEach(r => { if (y > mm(268)) newPage(); x.font = `500 ${mm(3.05)}px ${FONT}`; x.fillStyle = '#1B2024'; x.textAlign = 'left'; x.fillText(fit(x, r.name, cols[1] - cols[0] - mm(4)), cols[0] + mm(2), y + mm(5)); x.textAlign = 'center'; x.fillStyle = '#48515a'; x.fillText(fit(x, r.spec, cols[2] - cols[1] - mm(2)), (cols[1] + cols[2]) / 2, y + mm(5)); x.textAlign = 'right'; x.fillStyle = '#1B2024'; x.font = `500 ${mm(3.05)}px ${MONO}`; x.fillText(`${r.qty} ${r.unit}`, cols[3] - mm(2), y + mm(5)); x.fillText(r.price ? U.won(r.price) : '-', cols[4] - mm(2), y + mm(5)); x.fillText(U.won(r.amount), cols[5] - mm(2), y + mm(5)); x.strokeStyle = '#e1e4e2'; x.lineWidth = mm(.2); x.beginPath(); x.moveTo(mm(12), y + mm(7)); x.lineTo(W - mm(12), y + mm(7)); x.stroke(); y += mm(7); });
  });
  if (y > mm(240)) newPage();
  y += mm(4); const tot = [['소계', U.won(R.sub) + '원']].concat(R.disc ? [['할인', '-' + U.won(R.disc) + '원']] : []).concat([['공급가 (부가세 별도)', U.won(R.supply) + '원'], ['부가세 (10%)', U.won(R.vat) + '원'], ['합계 (부가세 포함)', U.won(R.total) + '원']]);
  tot.forEach(([k, v], i) => { const last = i === tot.length - 1; if (last) { x.strokeStyle = '#1B2024'; x.lineWidth = mm(.4); x.beginPath(); x.moveTo(mm(110), y + mm(1)); x.lineTo(W - mm(12), y + mm(1)); x.stroke(); } x.textAlign = 'left'; x.fillStyle = '#1B2024'; x.font = `${last ? 800 : 500} ${mm(last ? 3.8 : 3.2)}px ${FONT}`; x.fillText(k, mm(112), y + mm(6)); x.textAlign = 'right'; x.font = `${last ? 800 : 600} ${mm(last ? 3.8 : 3.2)}px ${MONO}`; x.fillText(v, W - mm(14), y + mm(6)); y += mm(last ? 9 : 7); });
  if (q.note) { y += mm(4); x.textAlign = 'left'; x.fillStyle = '#48515a'; x.font = `500 ${mm(3)}px ${FONT}`; String(q.note).split('\n').forEach(line => { x.fillText(line, mm(14), y + mm(4)); y += mm(5); }); }
  // installment / lease estimate (only when the salesperson ticked 「견적서에 넣기」)
  if (GP.quote.fin(q).show && R.total > 0) {
    const F = GP.quote.finance(R); if (y > mm(250)) newPage(); y += mm(4);
    x.fillStyle = '#f7f9f8'; x.strokeStyle = '#d9dedb'; x.lineWidth = mm(.25); x.fillRect(mm(12), y, W - mm(24), mm(19)); x.strokeRect(mm(12), y, W - mm(24), mm(19));
    x.textAlign = 'left'; x.fillStyle = '#1B2024'; x.font = `700 ${mm(3.1)}px ${FONT}`; x.fillText(`${F.f.kind === 'lease' ? '리스' : '할부'} 예상 월 납입금`, mm(15), y + mm(5.5));
    x.font = `700 ${mm(3.6)}px ${FONT}`; x.fillText(`월 약 ${U.won(F.mLo)}${F.mHi !== F.mLo ? ` ~ ${U.won(F.mHi)}` : ''}원`, mm(15), y + mm(11));
    x.font = `500 ${mm(2.8)}px ${FONT}`; x.fillStyle = '#48515a'; x.fillText(fit(x, `${F.n}개월 · 연 ${F.lo}${F.hi !== F.lo ? `~${F.hi}` : ''}% 기준${F.down ? ` · 선수금 ${U.won(F.down)}원` : ''}${F.rv ? ` · 만기 잔존가치 ${U.won(F.rv)}원` : ''}`, W - mm(92)), mm(80), y + mm(11));
    x.fillStyle = '#6b747c'; x.font = `500 ${mm(2.6)}px ${FONT}`; x.fillText('※ 예상 금액이며, 실제 금리와 조건은 신용도 및 금융사 심사에 따라 달라집니다.', mm(15), y + mm(16.2)); y += mm(21);
  }
  footer(pg, pages.length + 1, 0); pages.push(pg);
  return pages;
}
exp.quotePdf = async () => { GP.busy(true, '견적서 PDF 만드는 중…'); await new Promise(r => setTimeout(r, 30)); try { const pages = quotePages(GP.quote.compute()); const blob = await exp.pdf(pages); U.download(blob, U.fileSafe(GP.P.name) + '_견적서.pdf'); GP.toast('견적서 PDF를 저장했어요'); } catch (e) { console.error(e); GP.toast('PDF를 만들지 못했어요', { bad: true }); } finally { GP.busy(false); } };
exp.planPdf = async (size, o) => {
  o = o || {}; GP.busy(true, '인쇄용 도면 만드는 중…'); await GP.SYM.ready; await new Promise(r => setTimeout(r, 30));
  try { const dims = size === 'A3' ? [420, 297] : [297, 210]; const pg = page(dims[0], dims[1], size === 'A3' ? 150 : 200); const img = exp.planImage(pg.W, pg.H, o); pg.x.drawImage(img, 0, 0); titleBlock(pg.x, pg.W, pg.H, pg.H / 900, { sub: `평면도 · ${size}` }); const blob = await exp.pdf([pg]); U.download(blob, `${U.fileSafe(GP.P.name)}_도면_${size}.pdf`); GP.toast('인쇄용 도면 PDF를 저장했어요'); }
  catch (e) { console.error(e); GP.toast('PDF를 만들지 못했어요', { bad: true }); } finally { GP.busy(false); }
};
exp.proposalPdf = async (withPrice) => {
  if (withPrice == null) withPrice = true;
  GP.busy(true, '제안서 만드는 중…', 0); await GP.SYM.ready; await new Promise(r => setTimeout(r, 30));
  try {
    const pages = [], L = GP.L(), P = GP.P;
    // 1. plan
    let pg = page(297, 210, 150); header(pg, '공간 배치 제안서', `${P.client || ''} ${P.variants.length > 1 ? '· ' + P.variants[P.cur].name : ''}`);
    const pw = pg.W - pg.mm(24), ph = pg.H - pg.mm(40); const img = exp.planImage(Math.round(pw), Math.round(ph), {}); pg.x.drawImage(img, pg.mm(12), pg.mm(28)); pg.x.strokeStyle = '#dde1de'; pg.x.strokeRect(pg.mm(12), pg.mm(28), pw, ph); titleBlock(pg.x, pg.W - pg.mm(12), pg.H - pg.mm(12), pg.H / 1000, { sub: '평면도' }); pages.push(pg); GP.busy(true, '3D 장면 그리는 중…', .35);
    if (GP.R3.ok) { try { pg = page(297, 210, 150); header(pg, '3D 공간 이미지', '실제 기구 모델'); const gw = (pg.W - pg.mm(30)) / 2, gh = pg.H - pg.mm(44); const shots = [['persp', '전체 모습'], ['persp2', '반대편에서']]; for (let i = 0; i < shots.length; i++) { const c = await GP.V3.snapshot(Math.round(gw), Math.round(gh), shots[i][0]); if (!c) continue; const gx = pg.mm(12) + i * (gw + pg.mm(6)), gy = pg.mm(30); pg.x.drawImage(c, gx, gy); pg.x.fillStyle = 'rgba(27,32,36,.75)'; pg.x.font = `700 ${pg.mm(3.4)}px ${FONT}`; const t = shots[i][1]; const tw = pg.x.measureText(t).width + pg.mm(5); rr(pg.x, gx + pg.mm(3), gy + pg.mm(3), tw, pg.mm(7), pg.mm(1.5)); pg.x.fill(); pg.x.fillStyle = '#fff'; pg.x.textAlign = 'left'; pg.x.fillText(t, gx + pg.mm(5.5), gy + pg.mm(8)); } pages.push(pg); } catch (e) { console.warn('3D page', e); } }
    if (GP.R3.ok) { try {
      const views = GP.V3.eyeViews().slice(0, 3);
      if (views.length) {
        GP.busy(true, '공간 둘러보기 이미지 만드는 중…', .45); pg = page(297, 210, 150); header(pg, '공간 둘러보기', '사람 눈높이에서 본 모습');
        const gap = pg.mm(6), x0 = pg.mm(12), y0 = pg.mm(30), Wt = pg.W - pg.mm(24), Ht = pg.H - pg.mm(44);
        const boxes = views.length === 1 ? [[x0, y0, Wt, Ht]] : views.length === 2 ? [[x0, y0, (Wt - gap) / 2, Ht], [x0 + (Wt + gap) / 2, y0, (Wt - gap) / 2, Ht]]
          : [[x0, y0, Wt * .62, Ht], [x0 + Wt * .62 + gap, y0, Wt * .38 - gap, (Ht - gap) / 2], [x0 + Wt * .62 + gap, y0 + (Ht + gap) / 2, Wt * .38 - gap, (Ht - gap) / 2]];
        for (let i = 0; i < views.length; i++) {
          const [bx, by, bw, bh] = boxes[i], c = await GP.V3.snapshot(Math.round(bw), Math.round(bh), views[i]); if (!c) continue;
          pg.x.drawImage(c, bx, by); pg.x.strokeStyle = '#dde1de'; pg.x.strokeRect(bx, by, bw, bh);
          pg.x.fillStyle = 'rgba(27,32,36,.75)'; pg.x.font = `700 ${pg.mm(3.4)}px ${FONT}`; const t = views[i].label, tw = pg.x.measureText(t).width + pg.mm(5); rr(pg.x, bx + pg.mm(3), by + pg.mm(3), tw, pg.mm(7), pg.mm(1.5)); pg.x.fill(); pg.x.fillStyle = '#fff'; pg.x.textAlign = 'left'; pg.x.fillText(t, bx + pg.mm(5.5), by + pg.mm(8));
        }
        pages.push(pg);
      }
    } catch (e) { console.warn('eye-level page', e); } }
    GP.busy(true, '목록 정리하는 중…', .6);
    // 3. summary: equipment list, areas, floor
    pg = page(297, 210, 150); header(pg, '기구 목록 · 면적 요약', U.today()); const { x, mm } = pg; let y = mm(34);
    const occ = GP.calc.occupancy(), A = Math.abs(G.area(L.room.pts)); const pc = v => Math.round(v / (occ.room || 1) * 100);
    x.textAlign = 'left'; x.fillStyle = '#1B2024'; x.font = `700 ${mm(4)}px ${FONT}`; x.fillText('면적', mm(14), y); y += mm(7);
    [[`전체 면적`, `${A.toFixed(1)}㎡ · ${(A / U.PY).toFixed(1)}평`], ['기구가 차지하는 면적', `${occ.foot.toFixed(1)}㎡ · ${pc(occ.foot)}%`], ['운동 존 · 안전 여유공간', `${Math.max(0, occ.used - occ.foot).toFixed(1)}㎡ · ${pc(occ.used - occ.foot)}%`], ['남는 동선 · 빈 공간', `${Math.max(0, occ.room - occ.used).toFixed(1)}㎡ · ${pc(occ.room - occ.used)}%`]].forEach(([k, v]) => { x.font = `500 ${mm(3.3)}px ${FONT}`; x.fillStyle = '#48515a'; x.fillText(k, mm(14), y); x.fillStyle = '#1B2024'; x.font = `600 ${mm(3.3)}px ${MONO}`; x.fillText(v, mm(80), y); y += mm(6.5); });
    y += mm(4); const ms = GP.calc.matSummary(); if (ms.blocks.length) { x.font = `700 ${mm(4)}px ${FONT}`; x.fillStyle = '#1B2024'; x.fillText('바닥 (고무블럭 · 마감재)', mm(14), y); y += mm(7); ms.blocks.forEach(b => { x.font = `500 ${mm(3.2)}px ${FONT}`; x.fillStyle = '#48515a'; x.fillText(`${GP.BLOCKS[b.block].name} 25T`, mm(14), y); x.fillStyle = '#1B2024'; x.font = `600 ${mm(3.2)}px ${MONO}`; x.fillText(`${b.count}장 (${b.area.toFixed(1)}㎡)`, mm(80), y); y += mm(6); }); ms.trims.forEach(t => { x.font = `500 ${mm(3.2)}px ${FONT}`; x.fillStyle = '#48515a'; x.fillText(`${GP.TRIMS[t.trim]} 25T`, mm(14), y); x.fillStyle = '#1B2024'; x.font = `600 ${mm(3.2)}px ${MONO}`; x.fillText(`일자 ${t.straight} · 모서리 ${t.outC} · 역모서리 ${t.inC}`, mm(80), y); y += mm(6); }); }
    // equipment table (right column)
    const R = GP.quote.compute(); const eqG = R.groups.find(g => g.name === '운동기구·물품'); let yy = mm(34); const X0 = mm(160);
    x.font = `700 ${mm(4)}px ${FONT}`; x.fillStyle = '#1B2024'; x.fillText('기구 목록', X0, yy); yy += mm(7);
    (eqG ? eqG.rows : []).forEach(r => { if (yy > pg.H - mm(20)) return; x.font = `500 ${mm(3.1)}px ${FONT}`; x.fillStyle = '#1B2024'; x.fillText(fit(x, r.name, mm(70)), X0, yy); x.fillStyle = '#78818A'; x.font = `500 ${mm(2.8)}px ${MONO}`; x.fillText(r.spec, X0 + mm(74), yy); x.fillStyle = '#1B2024'; x.textAlign = 'right'; x.font = `700 ${mm(3.1)}px ${MONO}`; x.fillText(r.qty + '대', pg.W - mm(14), yy); x.textAlign = 'left'; yy += mm(5.8); });
    const chk = (GP.checks.list || []).filter(c => c.sev !== 'info'); if (chk.length) { y += mm(4); x.font = `700 ${mm(4)}px ${FONT}`; x.fillStyle = '#1B2024'; x.fillText('확인할 점', mm(14), y); y += mm(7); chk.slice(0, 8).forEach(c => { x.font = `500 ${mm(3)}px ${FONT}`; x.fillStyle = c.sev === 'err' ? '#D6362B' : '#C47F0E'; x.fillText('• ' + fit(x, c.msg, mm(130)), mm(14), y); y += mm(5.5); }); }
    pages.push(pg);
    // 4. quote
    if (withPrice) quotePages(R).forEach(p => pages.push(p));
    pages.forEach((p, i) => { if (p.wPt > p.hPt) footer(p, i + 1, pages.length); });
    GP.busy(true, 'PDF 만드는 중…', .9);
    const blob = await exp.pdf(pages); U.download(blob, U.fileSafe(P.name) + '_제안서.pdf'); GP.toast('제안서 PDF를 저장했어요');
  } catch (e) { console.error(e); GP.toast('제안서를 만들지 못했어요', { bad: true }); } finally { GP.busy(false); }
};

/* ---------------- share payload (link / HTML) ---------------- */
exp.payload = (o) => {
  const P = GP.P, L = U.clone(GP.L()); delete L.scenes; delete L.steps;
  if (!o.notes) L.notes = []; L.items.forEach(it => { delete it.img; });
  const ct = {}; L.items.forEach(it => { if (String(it.type).startsWith('c_') && GP.lib.customTypes[it.type]) ct[it.type] = GP.lib.customTypes[it.type]; });
  const names = {}; L.items.forEach(it => { if (GP.lib.names[it.type]) names[it.type] = GP.lib.names[it.type]; });
  const md = GP.media.forPayload([...new Set(L.items.map(i => i.type))]);
  const out = { v: 2, md, n: P.name, c: P.client, k: P.consultant, s: P.settings, L, ct, nm: names, co: GP.lib.company.name, d: U.today(), var: P.variants.length > 1 ? P.variants[P.cur].name : '' };
  if (o.price) {
    const pr = {}; L.items.forEach(it => { if (GP.lib.prices[it.type]) pr[it.type] = GP.lib.prices[it.type]; });
    const mp = {}; L.mats.forEach(m => { const k = m.block + '|25'; if (GP.lib.matPrices[k]) mp[k] = GP.lib.matPrices[k]; });
    const R = GP.quote.compute(); out.pr = pr; out.mp = mp;
    out.q = { g: R.groups.map(g => ({ n: g.name, r: g.rows.map(r => [r.name, r.spec, r.qty, r.unit, r.price, r.amount]) })), sub: R.sub, disc: R.disc, supply: R.supply, vat: R.vat, total: R.total, no: GP.quote.no(), note: GP.L().quote.note || '' };
  }
  return out;
};
const b64u = (bytes) => { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const unb64u = (s) => { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; const bin = atob(s); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; };
exp.encode = async (obj) => { const raw = new TextEncoder().encode(JSON.stringify(obj)); if (window.CompressionStream) { const cs = new Response(new Blob([raw]).stream().pipeThrough(new CompressionStream('deflate-raw'))); return 'z' + b64u(new Uint8Array(await cs.arrayBuffer())); } return 'j' + b64u(raw); };
exp.decode = async (s) => { const kind = s[0], bytes = unb64u(s.slice(1)); if (kind === 'z') { const ds = new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'))); return JSON.parse(await ds.text()); } return JSON.parse(new TextDecoder().decode(bytes)); };
/* before a link or HTML file is made: push any photos / 3D files of this layout that are not online yet */
exp.syncMediaFirst = async () => {
  const MD = GP.media, types = new Set(GP.L().items.map(i => i.type)); const local = [...types].filter(t => { const r = MD.of(t); return r && (r.photos.some(p => !p.up) || (r.model && !r.model.up)); });
  if (!local.length) return;
  if (!MD.gh.cfg()) { GP.toast('직접 등록한 사진·3D는 GitHub 저장소를 연결해야 고객 링크에 보여요 (설정 → 사진·3D 저장소)', { ms: 5500 }); return; }
  if (!navigator.onLine) { GP.toast('인터넷이 없어서 등록한 사진·3D가 아직 안 올라갔어요. 연결되면 자동으로 올라가요', { ms: 5000 }); return; }
  GP.busy(true, '등록한 사진·3D 올리는 중…'); try { await MD.sync(); } finally { GP.busy(false); }
};
exp.shareLink = async (o) => { const data = await exp.encode(exp.payload(o)); return location.origin + location.pathname.replace(/index\.html$/, '') + '#v=' + data; };
exp.htmlFile = async (o) => {
  GP.busy(true, 'HTML 파일 만드는 중…');
  try {
    const get = u => fetch(u, { cache: 'no-cache' }).then(r => { if (!r.ok) throw new Error(u); return r.text(); });
    let html = await get('index.html'); const css = await get('css/app.css');
    const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]); const bodies = await Promise.all(scripts.map(get));
    const data = await exp.encode(exp.payload(o));
    html = html.replace(/<link rel="manifest"[^>]*>\s*/, '').replace(/<link rel="(apple-touch-icon|icon)"[^>]*>\s*/g, '').replace(/<link rel="stylesheet" href="css\/app.css">/, () => `<style>${css}</style>`);
    let first = true; html = html.replace(/<script src="([^"]+)"><\/script>/g, (m, src) => { const i = scripts.indexOf(src); const pre = first ? `<script>window.GP_VIEW=${JSON.stringify(data)};window.GP_BASE=${JSON.stringify(location.origin + location.pathname.replace(/[^/]*$/, ''))};</script>\n` : ''; first = false; return pre + '<script>' + bodies[i].replace(/<\/script/gi, '<\\/script') + '</script>'; });
    html = html.replace(/<title>[^<]*<\/title>/, `<title>${U.esc(GP.P.name)} — 배치도</title>`);
    U.download(new Blob([html], { type: 'text/html' }), `${U.fileSafe(GP.P.name)}_배치도.html`); GP.toast('HTML 파일을 저장했어요. 받은 사람은 더블클릭으로 열어요 (3D 모델은 인터넷이 될 때 보여요)', { ms: 4800 });
  } catch (e) { console.error(e); GP.toast('HTML 파일은 앱을 인터넷 주소(호스팅)로 열었을 때 만들 수 있어요', { bad: true, ms: 4500 }); }
  finally { GP.busy(false); }
};

/* ---------------- share menu ---------------- */
exp.menu = () => {
  const html = `<div class="ph">고객에게 보내기</div>
  <button class="mi" data-act="link">${IC.link}<div><b>고객용 링크</b><small>휴대폰·PC에서 도면 보기 · 누르면 3D 모델 · 가격 표시 선택</small></div></button>
  <button class="mi" data-act="proposal">${IC.pdf}<div><b>제안서 PDF</b><small>평면도 · 3D 이미지 · 기구 목록 · 견적서</small></div></button>
  <button class="mi" data-act="proposalNP">${IC.pdf}<div><b>제안서 PDF (가격 없이)</b><small>견적서 페이지를 빼고 만들어요</small></div></button>
  <button class="mi" data-act="quote">${IC.pdf}<div><b>견적서 PDF</b><small>부가세 별도 · 부가세 포함</small></div></button>
  <button class="mi" data-act="png">${IC.image}<div><b>도면 이미지 (PNG)</b><small>카톡으로 바로 보내기 좋아요</small></div></button>
  <button class="mi" data-act="png3d">${IC.cube}<div><b>3D 이미지 (PNG)</b><small>3D 보기의 지금 각도 그대로</small></div></button>
  <hr><div class="ph">다른 담당자에게 (편집 가능)</div>
  <button class="mi" data-act="gofit">${IC.save}<div><b>프로젝트 파일 (.gofit)</b><small>받은 사람이 고핏 플래너에서 열면 그대로 고칠 수 있어요</small></div></button>
  <hr><div class="ph">기타</div>
  <button class="mi" data-act="print">${IC.pdf}<div><b>인쇄용 도면 PDF</b><small>A3 · A4 · 흑백</small></div></button>
  <button class="mi" data-act="html">${IC.html}<div><b>HTML 파일</b><small>링크 대신 파일로 보낼 때 (예비용)</small></div></button>
  <button class="mi" data-act="dxf">${IC.cad}<div><b>캐드 파일 (DXF)</b><small>오토캐드에서 열기 · mm 단위</small></div></button>`;
  GP.popover($('#shareBtn'), html, (a) => {
    if (a === 'png') exp.imageDialog(); else if (a === 'png3d') exp.image3dDialog(); else if (a === 'proposal') exp.proposalPdf(true); else if (a === 'proposalNP') exp.proposalPdf(false); else if (a === 'quote') exp.quotePdf(); else if (a === 'dxf') exp.dxfExport();
    else if (a === 'gofit') GP.backup.sendProject();
    else if (a === 'print') exp.printDialog(); else if (a === 'link' || a === 'html') exp.shareDialog(a);
  });
};
exp.printDialog = () => {
  GP.modal('인쇄용 도면 PDF', `<div class="row2"><div class="fld"><span>용지</span><div class="seg full" id="prSize"><button data-v="A3" class="on">A3 가로</button><button data-v="A4">A4 가로</button></div></div><div class="fld"><span>표시</span><div class="seg full" id="prStyle"><button data-v="color" class="${GP.S.style === 'line' ? '' : 'on'}">컬러</button><button data-v="gray">흑백</button><button data-v="line" class="${GP.S.style === 'line' ? 'on' : ''}">선만(CAD)</button></div></div></div><label class="tg" style="justify-content:flex-start" id="prClear"><i></i>기구 사용 공간(여유공간) 표시</label><p class="note">치수·기구 이름·고무블럭 장수·도면 정보가 함께 들어가요.</p>`, `<button class="btn" data-close>취소</button><button class="btn primary" id="prGo">PDF 저장</button>`, { size: 'narrow' });
  const pick = id => { const el = $('#' + id); el.onclick = e => { const b = e.target.closest('[data-v]'); if (!b) return; [...el.children].forEach(c => c.classList.toggle('on', c === b)); }; }; pick('prSize'); pick('prStyle');
  let clear = false; $('#prClear').onclick = e => { e.preventDefault(); clear = !clear; $('#prClear').classList.toggle('on', clear); };
  $('#prGo').onclick = () => { const size = $('#prSize .on').dataset.v, sv = $('#prStyle .on').dataset.v; GP.closeModal(); exp.planPdf(size, { gray: sv === 'gray', style: sv === 'line' ? 'line' : 'color', clear }); };
};
exp.shareDialog = (kind) => {
  const isLink = kind === 'link';
  GP.modal(isLink ? '고객용 링크' : 'HTML 파일', `<p class="note">${isLink ? '링크를 받은 고객은 휴대폰·PC에서 도면을 직접 확대해 보고, 기구에 마우스를 올리거나 누르면 이름·가격과 3D 모델을 볼 수 있어요. 편집은 할 수 없어요.' : '파일 하나로 도면 보기가 들어가요. 받은 사람은 더블클릭해서 열어요. 3D 모델은 인터넷이 될 때 보여요.'}</p>
   <label class="tg on" style="justify-content:flex-start" id="shPrice"><i></i><span><b>가격 표시</b> <small class="note">(끄면 가격 없이 보내요)</small></span></label>
   <label class="tg" style="justify-content:flex-start" id="shNotes"><i></i>메모 포함 (내부용 메모는 빼는 게 좋아요)</label>
   ${isLink ? '<textarea id="shOut" rows="3" readonly placeholder="아래 버튼을 누르면 링크가 만들어져요" style="width:100%;font:12px var(--f-mono)"></textarea>' : ''}${location.protocol === 'file:' ? '<p class="note" style="color:var(--amber)">지금은 파일로 열어서 링크·HTML이 이 컴퓨터에서만 열려요. 앱을 인터넷 주소(호스팅)에 올린 뒤 만들어 주세요.</p>' : ''}`,
    `<button class="btn" data-close>닫기</button><button class="btn primary" id="shGo">${isLink ? '링크 만들고 복사' : 'HTML 파일 저장'}</button>`, { size: 'narrow' });
  let price = true, notes = false;
  $('#shPrice').onclick = e => { e.preventDefault(); price = !price; $('#shPrice').classList.toggle('on', price); };
  $('#shNotes').onclick = e => { e.preventDefault(); notes = !notes; $('#shNotes').classList.toggle('on', notes); };
  $('#shGo').onclick = async () => {
    if (!isLink) { GP.closeModal(); await exp.syncMediaFirst(); exp.htmlFile({ price, notes }); return; }
    await exp.syncMediaFirst(); const url = await exp.shareLink({ price, notes }); $('#shOut').value = url; const ok = await U.copyText(url); GP.toast(ok ? `링크를 복사했어요 · ${price ? '가격 표시' : '가격 숨김'}` : '링크를 선택해서 복사해 주세요'); $('#shOut').select();
  };
};

/* ---------------- DXF export / import ---------------- */
exp.dxfExport = () => {
  const L = GP.L(), out = []; const X = v => (v * 1000).toFixed(1), Y = v => (-v * 1000).toFixed(1);
  const layers = [['WALL', 7], ['PARTITION', 8], ['OPENING', 4], ['EQUIPMENT', 5], ['CLEARANCE', 30], ['MAT', 3], ['TRIM', 1], ['ZONE', 6], ['TEXT', 7], ['DIM', 2], ['NOTE', 40]];
  const w = (...a) => a.forEach(v => out.push(String(v)));
  w(0, 'SECTION', 2, 'HEADER', 9, '$ACADVER', 1, 'AC1009', 9, '$INSUNITS', 70, 4, 0, 'ENDSEC');
  w(0, 'SECTION', 2, 'TABLES', 0, 'TABLE', 2, 'LAYER', 70, layers.length); layers.forEach(([n, c]) => w(0, 'LAYER', 2, n, 70, 0, 62, c, 6, 'CONTINUOUS')); w(0, 'ENDTAB', 0, 'ENDSEC');
  w(0, 'SECTION', 2, 'ENTITIES');
  const line = (a, b, ly) => w(0, 'LINE', 8, ly, 10, X(a[0]), 20, Y(a[1]), 30, 0, 11, X(b[0]), 21, Y(b[1]), 31, 0);
  const poly = (pts, ly, closed) => { w(0, 'POLYLINE', 8, ly, 66, 1, 70, closed ? 1 : 0); pts.forEach(p => w(0, 'VERTEX', 8, ly, 10, X(p[0]), 20, Y(p[1]), 30, 0)); w(0, 'SEQEND', 8, ly); };
  const text = (p, h, t, ly, rot) => w(0, 'TEXT', 8, ly || 'TEXT', 10, X(p[0]), 20, Y(p[1]), 30, 0, 40, (h * 1000).toFixed(0), 1, t, 50, (rot || 0).toFixed(1), 72, 1, 11, X(p[0]), 21, Y(p[1]), 31, 0);
  const P = L.room.pts; poly(P, 'WALL', true); poly(G.offset(P, GP.WALL_T, true), 'WALL', true);
  for (let i = 0; i < P.length; i++) { const e = G.edge(P, i); text([(e.a[0] + e.b[0]) / 2 - e.nx * .6, (e.a[1] + e.b[1]) / 2 - e.nz * .6], .18, e.L.toFixed(2) + 'm', 'DIM', -Math.atan2(e.dz, e.dx) / U.DEG); }
  for (const p of L.partitions) { const t = p.thick || .1; poly(G.offset(p.pts, t / 2, false), 'PARTITION', false); poly(G.offset(p.pts, -t / 2, false), 'PARTITION', false); }
  for (const o of L.openings) { const hs = GP.hostSeg(o); if (!hs) continue; const c = o.t; const a = [hs.a[0] + hs.dx * (c - o.w / 2) + hs.nx * hs.mid, hs.a[1] + hs.dz * (c - o.w / 2) + hs.nz * hs.mid], b = [hs.a[0] + hs.dx * (c + o.w / 2) + hs.nx * hs.mid, hs.a[1] + hs.dz * (c + o.w / 2) + hs.nz * hs.mid]; line(a, b, 'OPENING'); text([(a[0] + b[0]) / 2 + hs.nx * .35, (a[1] + b[1]) / 2 + hs.nz * .35], .12, GP.OPENINGS[o.kind] + ' ' + U.cm(o.w), 'OPENING'); }
  for (const it of L.items) { const F = GP.footprint(it); poly(F, 'EQUIPMENT', true); const def = GP.getDef(it.type) || {}, c = def.cl, d = GP.dims(it); if (c && GP.mountOf(it) === 'floor' && (c.f + c.b + c.l + c.r) > 0) poly(G.rectPts(it.x, it.z, it.rot, -d.w / 2 - c.l, d.w / 2 + c.r, -d.d / 2 - c.b, d.d / 2 + c.f), 'CLEARANCE', true); const fr = G.l2w(it.x, it.z, it.rot, 0, d.d / 2); line([it.x, it.z], fr, 'EQUIPMENT'); text([it.x, it.z], .12, GP.itemName(it), 'TEXT'); }
  for (const m of L.mats) { poly(m.pts, 'MAT', true); const c = G.labelPoint(m.pts); text(c, .14, `${GP.BLOCKS[m.block].name} 25T ${GP.calc.matBlocks(m)}장`, 'MAT'); GP.calc.matTrims(m).segs.forEach(s => line([s.a[0] + s.nx * .06, s.a[1] + s.nz * .06], [s.b[0] + s.nx * .06, s.b[1] + s.nz * .06], 'TRIM')); }
  for (const z of L.zones) { poly(z.pts, 'ZONE', true); text(G.labelPoint(z.pts), .2, z.name || '존', 'ZONE'); }
  for (const r of L.rooms) text([r.x, r.z], .22, r.name || '공간', 'TEXT');
  for (const d of L.dims) { line(d.a, d.b, 'DIM'); text([(d.a[0] + d.b[0]) / 2, (d.a[1] + d.b[1]) / 2 - .15], .14, G.len(d.a, d.b).toFixed(2) + 'm', 'DIM'); }
  for (const n of L.notes) text([n.x, n.z], .14, n.text || '메모', 'NOTE');
  w(0, 'ENDSEC', 0, 'EOF');
  U.download(new Blob([out.join('\r\n')], { type: 'application/dxf' }), U.fileSafe(GP.P.name) + '.dxf'); GP.toast('캐드 파일(DXF)을 저장했어요 · 1단위 = 1mm');
};
exp.parseDxf = (txt) => {
  const lines = txt.split(/\r?\n/); const pairs = []; for (let i = 0; i + 1 < lines.length; i += 2) pairs.push([parseInt(lines[i].trim(), 10), lines[i + 1].trim()]);
  let units = 0; for (let i = 0; i < pairs.length - 1; i++) if (pairs[i][0] === 9 && pairs[i][1] === '$INSUNITS') { units = parseInt(pairs[i + 1][1], 10); break; }
  const blocks = {}; const segs = [], loops = [];
  const parseEntities = (start, end, sink, loopSink) => {
    let i = start;
    while (i < end) {
      if (pairs[i][0] !== 0) { i++; continue; } const type = pairs[i][1]; let j = i + 1; const ent = { type, pts: [], codes: {} };
      while (j < end && pairs[j][0] !== 0) { const [c, v] = pairs[j]; if (c === 10) ent.pts.push([+v, 0]); else if (c === 20 && ent.pts.length) ent.pts[ent.pts.length - 1][1] = +v; else ent.codes[c] = ent.codes[c] == null ? v : ent.codes[c]; if (c === 11) ent.x2 = +v; if (c === 21) ent.y2 = +v; if (c === 40) ent.r = +v; if (c === 50) ent.a0 = +v; if (c === 51) ent.a1 = +v; if (c === 70) ent.flag = +v; if (c === 2) ent.name = v; if (c === 41) ent.sx = +v; if (c === 42) ent.sy = +v; j++; }
      if (type === 'LINE' && ent.pts[0]) sink.push([ent.pts[0], [ent.x2, ent.y2]]);
      else if (type === 'LWPOLYLINE' && ent.pts.length > 1) { for (let k = 0; k < ent.pts.length - 1; k++) sink.push([ent.pts[k], ent.pts[k + 1]]); if (ent.flag & 1) { sink.push([ent.pts[ent.pts.length - 1], ent.pts[0]]); loopSink.push(ent.pts.slice()); } }
      else if (type === 'POLYLINE') { const vs = []; let k = j; while (k < end && !(pairs[k][0] === 0 && pairs[k][1] === 'SEQEND')) { if (pairs[k][0] === 0 && pairs[k][1] === 'VERTEX') { let q = k + 1, v = [0, 0]; while (q < end && pairs[q][0] !== 0) { if (pairs[q][0] === 10) v[0] = +pairs[q][1]; if (pairs[q][0] === 20) v[1] = +pairs[q][1]; q++; } vs.push(v); k = q; } else k++; } for (let q = 0; q < vs.length - 1; q++) sink.push([vs[q], vs[q + 1]]); if ((ent.flag & 1) && vs.length > 2) { sink.push([vs[vs.length - 1], vs[0]]); loopSink.push(vs); } j = k + 1; }
      else if ((type === 'ARC' || type === 'CIRCLE') && ent.pts[0] && ent.r) { const a0 = type === 'CIRCLE' ? 0 : (ent.a0 || 0), a1 = type === 'CIRCLE' ? 360 : (ent.a1 || 360); let span = a1 - a0; if (span <= 0) span += 360; const n = Math.max(6, Math.ceil(span / 10)); let prev = null; for (let k = 0; k <= n; k++) { const a = (a0 + span * k / n) * U.DEG; const p = [ent.pts[0][0] + Math.cos(a) * ent.r, ent.pts[0][1] + Math.sin(a) * ent.r]; if (prev) sink.push([prev, p]); prev = p; } }
      else if (type === 'INSERT' && ent.name && blocks[ent.name] && ent.pts[0]) { const bl = blocks[ent.name], sx = ent.sx || 1, sy = ent.sy || sx, rot = (+ent.codes[50] || 0) * U.DEG, c = Math.cos(rot), s = Math.sin(rot); const tf = p => { const x = (p[0] - bl.base[0]) * sx, y = (p[1] - bl.base[1]) * sy; return [ent.pts[0][0] + x * c - y * s, ent.pts[0][1] + x * s + y * c]; }; bl.segs.forEach(([a, b]) => sink.push([tf(a), tf(b)])); }
      i = j;
    }
  };
  let bs = -1, es = -1; for (let i = 0; i < pairs.length; i++) { if (pairs[i][0] === 2 && pairs[i][1] === 'BLOCKS') bs = i; if (pairs[i][0] === 2 && pairs[i][1] === 'ENTITIES') es = i; }
  if (bs >= 0) { let i = bs; while (i < pairs.length && !(pairs[i][0] === 0 && pairs[i][1] === 'ENDSEC')) { if (pairs[i][0] === 0 && pairs[i][1] === 'BLOCK') { let name = '', base = [0, 0], j = i + 1; while (j < pairs.length && pairs[j][0] !== 0) { if (pairs[j][0] === 2) name = pairs[j][1]; if (pairs[j][0] === 10) base[0] = +pairs[j][1]; if (pairs[j][0] === 20) base[1] = +pairs[j][1]; j++; } let k = j; while (k < pairs.length && !(pairs[k][0] === 0 && pairs[k][1] === 'ENDBLK')) k++; const bsegs = []; parseEntities(j, k, bsegs, []); blocks[name] = { base, segs: bsegs }; i = k; } i++; } }
  if (es >= 0) { let end = es; while (end < pairs.length && !(pairs[end][0] === 0 && pairs[end][1] === 'ENDSEC')) end++; parseEntities(es + 1, end, segs, loops); }
  let ext = 0; segs.forEach(([a, b]) => { ext = Math.max(ext, Math.abs(a[0]), Math.abs(a[1]), Math.abs(b[0]), Math.abs(b[1])); });
  const scaleMap = { 1: .0254, 2: .3048, 4: .001, 5: .01, 6: 1 }; let scale = scaleMap[units]; if (!scale) scale = ext > 400 ? .001 : 1;
  const unitName = { 1: 'inch', 2: 'feet', 4: 'mm', 5: 'cm', 6: 'm' }[units] || (scale === .001 ? 'mm (추정)' : 'm (추정)');
  const flip = p => [p[0], -p[1]];
  const loopsOut = loops.map(l => l.map(flip)).filter(l => l.length >= 3).sort((a, b) => Math.abs(G.area(b)) - Math.abs(G.area(a)));
  return { segs: segs.map(([a, b]) => [flip(a), flip(b)]), loops: loopsOut, scale, unitName };
};

/* ---------------- project file (.gofit) ---------------- */
exp.saveProjectFile = () => { const p = GP.projectPayload(); U.download(new Blob([JSON.stringify(p)], { type: 'application/json' }), U.fileSafe(p.name) + '.gofit'); GP.toast('프로젝트 파일을 저장했어요. 다른 PC에서 메뉴 → 프로젝트 파일 열기로 불러와요'); };
exp.openProjectFile = async (f) => {
  try { const o = JSON.parse(await U.readFile(f, 'text')); const p = GP.validateProject(o); if (!p) throw 0; const ex = await GP.DB.get('projects', p.id); if (ex) { p.id = U.uid('p'); p.name += ' (사본)'; } if (GP.P && !GP.viewOnly) await GP.app.saveNow(); await GP.app.loadProject(p); await GP.saveProject(); GP.toast(ex ? `같은 프로젝트가 이미 있어서 '${p.name}'(으)로 열었어요` : `'${p.name}' 프로젝트를 열었어요`); }
  catch (e) { GP.toast('프로젝트 파일을 읽지 못했어요', { bad: true }); }
};
$('#shareBtn').addEventListener('click', () => exp.menu());
})();
