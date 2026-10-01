/* GoFit Planner — models: cable, racks, benches, storage, functional, stretching, facilities, special templates, custom */
(function () {
'use strict';
const GP = window.GP, M = GP.M, T = GP.defType3;

/* ===================== CABLE ===================== */
T('crossover', '케이블 크로스오버', 'cable', 3.48, 1.17, 2.38, { kw: '크로스오버 케이블 cable crossover', cl: [1.5, .1, .3, .3], uh: 2.4 }, c => {
  const X = c.w / 2 - .3;
  for (const s of [-1, 1]) {
    c.tower(s * X, -.22, 2.25, { w: .46, shroud: false });                                                   // open weight tower
    c.fr([s * (X + .27), .04, -.42], [s * (X + .27), 2.3, -.42], .075); c.fr([s * (X - .27), .04, -.42], [s * (X - .27), 2.3, -.42], .075);
    c.fr([s * (X - .38), .04, .1], [s * (X - .38), 2.25, .1], .07); c.fr([s * (X + .27), .04, -.42], [s * (X - .38), .04, .1], .07);   // adjustable pulley column
    for (let y = .3; y < 2.1; y += .14) c.box(.08, .02, .02, s * (X - .38), y, .14, M.frame2);
    c.box(.12, .12, .12, s * (X - .38), 1.1, .15, M.accent, { r: .02 }); c.pulley(s * (X - .38), 1.16, .24, 'x'); c.cable([s * (X - .38), 1.12, .26], [s * (X - .5), 1.02, .38]); c.tube([[s * (X - .56), 1.0, .38], [s * (X - .46), 1.0, .44]], .016, M.rubber);
    c.foot(s * X, -.42); c.foot(s * (X - .38), .1);
  }
  c.fr([-X - .27, 2.3, -.42], [X + .27, 2.3, -.42], .1); c.fr([-X, .04, -.42], [X, .04, -.42], .08);
  c.tube([[-.7, 2.18, -.3], [-.6, 2.22, -.42], [.6, 2.22, -.42], [.7, 2.18, -.3]], .016, M.chrome);      // pull-up bar
});
T('dualpulley', '듀얼 풀리', 'cable', 1.67, 1.1, 2.37, { kw: '펑셔널 트레이너 듀얼 풀리 dual', cl: [1.5, .1, .4, .4], uh: 2.4 }, c => {
  for (const s of [-1, 1]) { c.tower(.5 * s, -.25, 2.25, { w: .42 }); c.fr([.72 * s, .04, .02], [.72 * s, 2.3, .02], .07); c.pulley(.72 * s, 1.3, .1, 'x'); c.tube([[.72 * s, 1.2, .2], [.66 * s, 1.2, .26]], .016, M.rubber); }
  c.fr([-.72, 2.33, .02], [.72, 2.33, .02], .08); c.fr([-.72, .04, -.45], [.72, .04, -.45], .08); c.fr([-.72, .04, .02], [.72, .04, .02], .08);
  c.tube([[-.4, 2.25, .1], [.4, 2.25, .1]], .016, M.chrome);
});
T('chestweight', '체스트 웨이트', 'cable', 1.67, 1.1, 2.37, { kw: '벽부착 케이블 chest weight', cl: [1.5, .1, .4, .4], uh: 2.4 }, c => {
  for (const s of [-1, 1]) { c.tower(.42 * s, -.28, 2.3, { w: .38 }); c.pulley(.42 * s, 2.2, .0, 'z'); c.cable([.42 * s, 2.15, .02], [.5 * s, 1.5, .35]); c.tube([[.52 * s, 1.45, .35], [.44 * s, 1.45, .42]], .016, M.rubber); }
  c.fr([-.7, 2.33, -.28], [.7, 2.33, -.28], .08); c.fr([-.7, .04, -.28], [.7, .04, -.28], .08); c.fr([-.7, .04, -.4], [-.7, .04, .3], .07); c.fr([.7, .04, -.4], [.7, .04, .3], .07);
});
T('multistation', '멀티 스테이션', 'cable', 3.17, 1.8, 2.33, { kw: '멀티짐 멀티스테이션 multi', cl: [.9, .1, .5, .5], uh: 2.4 }, c => {
  c.fr([-1.4, .04, -.5], [1.4, .04, -.5], .09); c.fr([-1.4, 2.3, -.5], [1.4, 2.3, -.5], .09);
  c.tower(-1.0, -.5, 2.25, { w: .48 }); c.bar([-1.0, 2.2, -.5], [-1.0, 2.2, .25], .08, .08, M.frame); c.cable([-1, 2.1, .25], [-1, 1.5, .25]); c.tube([[-1.55, 1.42, .3], [-1.45, 1.5, .25], [-.55, 1.5, .25], [-.45, 1.42, .3]], .014, M.chrome);
  c.seat(-1.0, .48, .3, .42, .38); c.fr([-1, .04, .2], [-1, .72, .15], .06); c.roller(-1, .76, .15, .46, .06);
  c.tower(.1, -.5, 2.0, { w: .48 }); c.seat(.1, .5, .15, .42, .4); c.back(.1, .55, -.12, .42, .65, -.1); for (const s of [-1, 1]) { c.bar([.1 + .2 * s, 1.4, -.3], [.1 + .32 * s, 1.1, .45], .05, .05, M.frame); c.grip([.1 + .32 * s, 1.0, .45], [.1 + .32 * s, 1.2, .47], .02); }
  c.tower(1.1, -.5, 2.0, { w: .44 }); c.pad(.3, .08, 1.0, 1.1, .4, .35); c.fr([1.1, .04, .1], [1.1, .4, .1], .06); c.fr([1.1, .04, .7], [1.1, .4, .7], .06); c.pulley(1.1, .3, -.25, 'x');
  c.fr([-1.4, .04, -.5], [-1.4, .04, .75], .08); c.fr([1.45, .04, -.5], [1.45, .04, .8], .08);
});

/* ===================== RACKS ===================== */
function uprights(c, pts, h, m) { pts.forEach(([x, z]) => { c.box(.075, h, .075, x, 0, z, m || M.frame, { r: .008 }); for (let y = .5; y < h - .2; y += .1) { c.box(.078, .018, .01, x, y, z + .038, M.frame2); } }); }
function bar(c, y, z, len, plates) {
  c.cyl(.014, len, 0, y, z, M.chrome, 'x', 12); for (const s of [-1, 1]) { c.cyl(.025, .42, s * (len / 2 - .21), y, z, M.chrome, 'x', 12); (plates || []).forEach((r, i) => c.plate(r, .055, s * (len / 2 - .38 + i * .06), y, z, 'x')); }
}
T('powerrack', '파워랙', 'rack', 1.74, 1.92, 2.32, { kw: '파워랙 스쿼트 power rack', cl: [1.2, .3, .5, .5], heavy: true, uh: 2.5 }, c => {
  const X = .58, Z = .52;
  uprights(c, [[-X, -Z], [X, -Z], [-X, Z], [X, Z]], 2.3);
  for (const z of [-Z, Z]) { c.fr([-X, 2.26, z], [X, 2.26, z], .075); c.fr([-X, .04, z], [X, .04, z], .075); }
  for (const x of [-X, X]) { c.fr([x, 2.26, -Z], [x, 2.26, Z], .075); c.fr([x, .04, -.9], [x, .04, Z + .1], .075); c.box(.075, 1.3, .075, x, 0, -.88, M.frame); c.box(.07, .07, 1.25, x, .6, 0, M.accent, { r: .01 }); c.box(.08, .08, .12, x, 1.35, Z - .06, M.accent, { r: .01 }); c.horn(x * 1.28, .5, -.88, 'x', .25, [.225]); c.horn(x * 1.28, 1.0, -.88, 'x', .25, [.2]); }
  c.fr([-X, 1.3, -.88], [X, 1.3, -.88], .07);
  c.tube([[-X - .06, 2.22, Z + .08], [X + .06, 2.22, Z + .08]], .016, M.chrome);
  bar(c, 1.42, Z - .08, 2.2, [.225]);
});
T('halfrack', '하프랙', 'rack', 1.81, 1.47, 2.33, { kw: '하프랙 half rack', cl: [1.2, .3, .5, .5], heavy: true, uh: 2.5 }, c => {
  const X = .58; uprights(c, [[-X, .2], [X, .2], [-X, -.55], [X, -.55]], 2.3);
  for (const x of [-X, X]) { c.fr([x, 2.26, -.55], [x, 2.26, .2], .075); c.fr([x, .04, -.65], [x, .04, .6], .075); c.box(.07, .07, .55, x, .62, .45, M.accent, { r: .01 }); c.box(.08, .08, .12, x, 1.35, .28, M.accent, { r: .01 }); c.horn(x * 1.3, .5, -.55, 'x', .25, [.225]); c.horn(x * 1.3, 1.0, -.55, 'x', .25, [.2]); c.horn(x * 1.3, 1.5, -.55, 'x', .25, []); }
  c.fr([-X, 2.26, -.55], [X, 2.26, -.55], .075); c.fr([-X, .04, -.55], [X, .04, -.55], .075);
  c.tube([[-X - .06, 2.2, .3], [X + .06, 2.2, .3]], .016, M.chrome); bar(c, 1.42, .3, 2.2, [.225]);
});
T('squatrack', '스쿼트랙', 'rack', 1.76, 1.72, 1.89, { kw: '스쿼트랙 squat', cl: [1.2, .3, .5, .5], heavy: true, uh: 2.3 }, c => {
  const X = .58; uprights(c, [[-X, 0], [X, 0]], 1.88);
  for (const x of [-X, X]) { c.fr([x, .04, -.8], [x, .04, .8], .08); c.fr([x, .04, -.6], [x, 1.2, -.02], .07); c.fr([x, .04, .6], [x, 1.2, .02], .07); c.box(.08, .08, .12, x, 1.35, .08, M.accent, { r: .01 }); c.horn(x * 1.35, .6, -.55, 'x', .25, [.225]); }
  c.fr([-X, .04, -.8], [X, .04, -.8], .07); bar(c, 1.42, .1, 2.2, []);
});
function smithPart(c, x0, x1, z0, z1, h, rodZ) {
  const cx = (x0 + x1) / 2, rx = (x1 - x0) / 2 - .17;
  for (const s of [-1, 1]) { c.cyl(.02, h - .15, cx + rx * s, h / 2, rodZ, M.chrome, 'y', 10); c.box(.1, .15, .1, cx + rx * s, 1.2, rodZ, M.accent, { r: .02 }); }
  c.cyl(.016, x1 - x0 + .5, cx, 1.28, rodZ, M.chrome, 'x', 12); c.plate(.225, .055, cx - (x1 - x0) / 2 - .12, 1.28, rodZ, 'x'); c.plate(.225, .055, cx + (x1 - x0) / 2 + .12, 1.28, rodZ, 'x');
}
T('smith', '스미스 머신', 'rack', 2.22, 1.27, 2.24, { kw: '스미스 smith', cl: [.9, .6, .5, .5], heavy: true, uh: 2.4 }, c => {
  const X = 1.0, Z = .5; uprights(c, [[-X, -Z], [X, -Z], [-X, Z], [X, Z]], 2.22);
  for (const z of [-Z, Z]) { c.fr([-X, 2.18, z], [X, 2.18, z], .08); } for (const x of [-X, X]) { c.fr([x, 2.18, -Z], [x, 2.18, Z], .08); c.fr([x, .04, -Z], [x, .04, Z], .08); c.horn(x * .9, .45, -Z - .1, 'z', .22, [.225]); }
  c.fr([-X, .04, -Z], [X, .04, -Z], .08);
  smithPart(c, -.95, .95, -Z, Z, 2.18, 0); for (const x of [-X, X]) c.box(.07, .07, 1.0, x * .96, .55, 0, M.accent, { r: .01 });
});
T('smith_right', '직각 스미스 머신', 'rack', 2.21, 2.02, 2.33, { kw: '직각 스미스', cl: [.9, .3, .5, .5], heavy: true, uh: 2.5 }, c => {
  const X = .62; uprights(c, [[-X, -.55], [X, -.55], [-X, .45], [X, .45]], 2.3);
  for (const z of [-.55, .45]) c.fr([-X, 2.26, z], [X, 2.26, z], .08); for (const x of [-X, X]) { c.fr([x, 2.26, -.55], [x, 2.26, .45], .08); c.fr([x, .04, -.95], [x, .04, .8], .08); c.horn(x * 1.3, .5, -.85, 'x', .26, [.225]); c.horn(x * 1.3, 1.0, -.85, 'x', .26, [.2]); c.box(.075, 1.3, .075, x, 0, -.85, M.frame); }
  smithPart(c, -.55, .55, -.55, .45, 2.26, -.05); c.tube([[-X, 2.22, .52], [X, 2.22, .52]], .016, M.chrome);
});
T('multirack', '멀티랙', 'rack', 2.21, 2.02, 2.33, { kw: '멀티랙 랙 스미스 multi rack', cl: [1.2, .3, .5, .5], heavy: true, uh: 2.5 }, c => {
  const Z = .5; uprights(c, [[-1.02, -Z], [-.05, -Z], [-1.02, Z], [-.05, Z], [1.02, -Z], [1.02, Z]], 2.3);
  for (const z of [-Z, Z]) c.fr([-1.02, 2.26, z], [1.02, 2.26, z], .08); for (const x of [-1.02, -.05, 1.02]) { c.fr([x, 2.26, -Z], [x, 2.26, Z], .08); c.fr([x, .04, -.9], [x, .04, Z + .15], .08); }
  for (const x of [-1.02, -.05]) { c.box(.08, .08, .12, x, 1.35, Z - .06, M.accent, { r: .01 }); c.box(.07, .07, 1.1, x, .62, 0, M.accent, { r: .01 }); }
  smithPart(c, .05, .98, -Z, Z, 2.26, 0);
  for (const x of [-1.02, 1.02]) { c.horn(x * 1.12, .5, -.88, 'x', .25, [.225]); c.horn(x * 1.12, 1.0, -.88, 'x', .25, [.2]); c.box(.075, 1.3, .075, x, 0, -.88, M.frame); }
  c.tube([[-1.05, 2.2, Z + .08], [-.02, 2.2, Z + .08]], .016, M.chrome);
});
function rig(c, depth) {
  const W = c.W, n = Math.max(1, Math.round(W / 1.5)), Z = depth / 2 - .1; const xs = []; for (let i = 0; i <= n; i++) xs.push(-W / 2 + .06 + i * (W - .12) / n);
  const H = c.H; xs.forEach(x => { uprights(c, [[x, -Z], [x, Z]], H - .02); c.fr([x, H - .06, -Z], [x, H - .06, Z], .08); c.fr([x, .04, -Z - .1], [x, .04, Z + .1], .08); c.box(.08, .08, .12, x, 1.35, Z - .06, M.accent, { r: .01 }); });
  for (const z of [-Z, Z]) c.fr([xs[0], H - .06, z], [xs[xs.length - 1], H - .06, z], .08);
  for (let i = 0; i < n; i++) { const a = xs[i], b = xs[i + 1]; c.tube([[a, H - .15, Z + .08], [b, H - .15, Z + .08]], .016, M.chrome); if (i % 2 === 0) c.tube([[a, H - .15, -Z - .08], [b, H - .15, -Z - .08]], .016, M.chrome); }
}
T('monsterrack', '몬스터랙', 'rack', 4.5, 1.9, 2.6, { kw: '몬스터랙 리그 rig monster', cl: [1.2, 1.2, .5, .5], heavy: true, uh: 2.8, fit: 'actual' }, c => rig(c, 1.9));
T('rig', '펑셔널 리그', 'rack', 4.0, 1.5, 2.6, { kw: '철봉 리그 functional rig', cl: [1.2, 1.2, .5, .5], heavy: true, uh: 2.8, fit: 'actual' }, c => rig(c, 1.5));
T('allinone', '올인원 트레이너', 'rack', 2.08, 2.02, 2.35, { kw: '올인원 랙 케이블 all in one', cl: [1.2, .3, .4, .4], heavy: true, uh: 2.5 }, c => {
  const X = .55, Z = .5; uprights(c, [[-X, -Z], [X, -Z], [-X, Z], [X, Z]], 2.3);
  for (const z of [-Z, Z]) c.fr([-X, 2.26, z], [X, 2.26, z], .08); for (const x of [-X, X]) { c.fr([x, 2.26, -Z], [x, 2.26, Z], .08); c.fr([x, .04, -.8], [x, .04, Z + .15], .08); c.box(.08, .08, .12, x, 1.35, Z - .06, M.accent, { r: .01 }); }
  for (const s of [-1, 1]) { c.tower(.82 * s, -.3, 2.25, { w: .4 }); c.pulley(.62 * s, 2.15, .1, 'x'); c.pulley(.62 * s, .3, .1, 'x'); }
  smithPart(c, -.5, .5, -Z, Z, 2.26, -.15); c.tube([[-X, 2.2, Z + .08], [X, 2.2, Z + .08]], .016, M.chrome);
});
T('chindip', '친딥 레그레이즈', 'rack', 1.13, 1.25, 2.28, { kw: '치닝디핑 턱걸이 파워타워 chin dip', cl: [.8, .2, .4, .4], uh: 2.5 }, c => {
  for (const s of [-1, 1]) { c.fr([.42 * s, .04, -.55], [.42 * s, .04, .55], .08); c.fr([.42 * s, .04, -.35], [.38 * s, 2.25, -.3], .08); c.fr([.42 * s, .04, .45], [.38 * s, 1.25, -.2], .07); c.pad(.1, .08, .3, .25 * s, 1.2, -.12); c.grip([.25 * s, 1.25, .08], [.22 * s, 1.25, .22], .02); c.grip([.3 * s, 1.1, .15], [.22 * s, 1.1, .35], .02); }
  c.pad(.36, .55, .08, 0, .75, -.28); c.fr([-.38, 2.25, -.3], [.38, 2.25, -.3], .07); c.tube([[-.55, 2.15, -.05], [-.4, 2.22, -.2], [.4, 2.22, -.2], [.55, 2.15, -.05]], .018, M.chrome);
});

/* ===================== BENCHES ===================== */
function feet2(c, z0, z1, w) { c.box(w || .6, .05, .09, 0, 0, z0, M.frame, { r: .02 }); c.box(w || .6, .05, .09, 0, 0, z1, M.frame, { r: .02 }); [[-(w || .6) / 2 + .04, z0], [(w || .6) / 2 - .04, z0], [-(w || .6) / 2 + .04, z1], [(w || .6) / 2 - .04, z1]].forEach(([x, z]) => c.foot(x, z, .05)); }
T('bench_flat', '평벤치', 'bench', .6, 1.17, .43, { kw: '플랫 벤치 flat bench', cl: [.6, .6, .6, .6], uh: 1.9 }, c => {
  feet2(c, -.5, .5); c.fr([0, .05, -.5], [0, .34, -.38], .07); c.fr([0, .05, .5], [0, .34, .38], .07); c.fr([0, .33, -.45], [0, .33, .45], .07);
  c.pad(.3, .08, 1.15, 0, .35, 0, M.pad, { s: 'z' });
});
T('bench_adj', '각도조절벤치', 'bench', .66, 1.35, .45, { kw: '멀티벤치 조절벤치 인클라인 adjustable', cl: [.6, .6, .6, .6], uh: 1.9 }, c => {
  feet2(c, -.6, .58, .66); c.fr([0, .05, -.6], [0, .32, -.45], .07); c.fr([0, .05, .58], [0, .32, .45], .07); c.fr([0, .3, -.5], [0, .3, .5], .07);
  c.pad(.3, .08, .38, 0, .36, .38); const b = c.pad(.3, .08, .8, 0, .4, -.12); b.rotation.x = -.14;
  c.fr([0, .3, -.35], [0, .4, -.15], .05); for (let i = 0; i < 5; i++) c.box(.12, .02, .03, 0, .32, -.3 + i * .05, M.chrome);
  c.cyl(.04, .05, .28, .05, .58, M.rubber, 'x'); c.cyl(.04, .05, -.28, .05, .58, M.rubber, 'x'); c.grip([-.12, .4, -.62], [.12, .4, -.62], .018);
});
T('bench_util', '직각벤치', 'bench', .66, .89, .9, { kw: '유틸리티 직각 벤치', cl: [.6, .6, .6, .6], uh: 1.9 }, c => {
  feet2(c, -.36, .36, .66); c.fr([0, .05, -.36], [0, .45, -.2], .07); c.fr([0, .05, .36], [0, .42, .2], .07);
  c.pad(.36, .08, .4, 0, .43, .12); const b = c.pad(.34, .6, .08, 0, .45, -.26); b.rotation.x = -.14;
});
function olyUprights(c, z, h, w) { for (const s of [-1, 1]) { c.fr([w * s, .04, z - .3], [w * s, .04, z + .25], .07); c.fr([w * s, .04, z], [w * s, h, z], .07); c.box(.07, .05, .1, w * s, h - .35, z + .04, M.accent); c.box(.07, .05, .1, w * s, h - .12, z + .04, M.accent); c.horn(w * s * 1.3, .45, z - .1, 'x', .2, [.2]); } c.fr([-w, .45, z - .1], [w, .45, z - .1], .06); bar(c, h - .05, z + .04, 2.2, []); }
T('benchpress', '벤치프레스', 'bench', 1.3, 1.7, 1.25, { kw: '올림픽 플랫 벤치프레스 bench press', cl: [.6, .6, .5, .5], heavy: true, uh: 1.9 }, c => {
  olyUprights(c, -.55, 1.2, .55); c.fr([0, .04, -.5], [0, .04, .75], .07); c.fr([0, .04, .75], [0, .35, .6], .07); c.fr([0, .04, -.3], [0, .38, -.3], .07); c.pad(.3, .08, 1.1, 0, .38, .2); feet2(c, -.62, .78, .6);
});
T('bench_incline', '인클라인 벤치프레스', 'bench', 1.3, 1.5, 1.4, { kw: '올림픽 인클라인 벤치', cl: [.6, .6, .5, .5], heavy: true, uh: 1.9 }, c => {
  olyUprights(c, -.55, 1.38, .55); c.fr([0, .04, -.5], [0, .04, .6], .07); c.pad(.34, .08, .36, 0, .5, .3); const b = c.pad(.3, .08, .78, 0, .7, -.12); b.rotation.x = -.6; c.fr([0, .04, .3], [0, .5, .3], .07); c.box(.5, .04, .25, 0, .28, .62, M.frame2);
});
T('bench_decline', '디클라인 벤치프레스', 'bench', 1.3, 1.55, 1.26, { kw: '올림픽 디클라인 벤치', cl: [.6, .6, .5, .5], heavy: true, uh: 1.9 }, c => {
  olyUprights(c, -.6, 1.2, .55); c.fr([0, .04, -.5], [0, .04, .65], .07); const b = c.pad(.3, .08, 1.0, 0, .5, .0); b.rotation.x = .25; c.fr([0, .04, .1], [0, .52, .1], .07); c.roller(0, .72, .55, .36, .06); c.fr([0, .04, .6], [0, .7, .55], .06);
});
T('ab_decline', '복근 디클라인 벤치', 'bench', .6, 1.53, .87, { kw: '복근 디클라인 싯업', cl: [.6, .5, .5, .5], uh: 1.6 }, c => {
  feet2(c, -.66, .66); c.fr([0, .05, -.66], [0, .38, -.55], .06); c.fr([0, .05, .66], [0, .7, .5], .07); const b = c.pad(.3, .08, 1.1, 0, .5, -.1); b.rotation.x = -.3; c.roller(0, .82, .6, .34, .055); c.roller(0, .7, .45, .34, .055);
});
function situp(c, x) { const b = c.pad(.42, .08, 1.5, x, .55, .05); b.rotation.x = -.45; c.roller(x, 1.05, .82, .36, .06); }
T('situp1', '싯업 벤치 (1인)', 'bench', .65, 1.9, 1.2, { kw: '싯업 복근 윗몸', cl: [.6, .5, .5, .5], uh: 1.6 }, c => { situp(c, 0); for (const s of [-1, 1]) c.fr([.28 * s, .04, .9], [.28 * s, 1.18, .9], .06); for (let y = .3; y < 1.2; y += .15) c.cyl(.015, .56, 0, y, .9, M.chrome, 'x'); c.fr([-.28, .04, -.85], [.28, .04, -.85], .06); c.fr([0, .04, -.85], [0, .04, .9], .06); });
T('situp2', '싯업 벤치 (2인)', 'bench', 1.27, 2.09, 1.19, { kw: '싯업 2인', cl: [.6, .5, .4, .4], uh: 1.6 }, c => { situp(c, -.32); situp(c, .32); for (const s of [-1, 0, 1]) c.fr([.6 * s, .04, 1.0], [.6 * s, 1.17, 1.0], .06); for (let y = .3; y < 1.2; y += .15) c.cyl(.015, 1.2, 0, y, 1.0, M.chrome, 'x'); c.fr([-.6, .04, -.9], [.6, .04, -.9], .06); c.fr([0, .04, -.9], [0, .04, 1.0], .06); });
T('romanchair', '로만 체어', 'bench', .8, 1.27, .9, { kw: '백익스텐션 하이퍼 로만체어 roman', cl: [.8, .8, .4, .4], uh: 1.7 }, c => {
  c.fr([0, .04, -.55], [0, .04, .55], .07); c.fr([-.35, .04, -.55], [.35, .04, -.55], .07); c.fr([-.35, .04, .55], [.35, .04, .55], .07);
  c.fr([0, .04, -.3], [0, .8, .05], .07); const p = c.pad(.42, .08, .32, 0, .78, .02); p.rotation.x = -.7;
  const f = c.box(.45, .03, .3, 0, .15, .42, M.frame2); f.rotation.x = -.7; c.fr([0, .04, .45], [0, .4, .42], .06); c.roller(0, .38, .38, .36, .05); c.grip([-.2, .8, .18], [-.2, .9, .2], .02); c.grip([.2, .8, .18], [.2, .9, .2], .02);
});
T('curlbench', '암컬 벤치', 'bench', 1.2, .9, 1.09, { kw: '프리처 암컬 컬 벤치 preacher', cl: [.6, .6, .4, .4], uh: 1.7 }, c => {
  feet2(c, -.36, .36, .7); c.fr([0, .05, .1], [0, .45, .2], .07); c.pad(.36, .08, .32, 0, .47, .22); c.fr([0, .05, -.2], [0, .85, -.12], .07); const p = c.pad(.6, .08, .32, 0, .88, -.05); p.rotation.x = .6;
  for (const s of [-1, 1]) { c.fr([.35 * s, .05, -.3], [.35 * s, 1.05, -.3], .06); c.box(.06, .05, .08, .35 * s, 1.0, -.26, M.accent); } bar(c, 1.06, -.26, 1.2, []);
});
T('curlbench_adj', '조절식 암컬 벤치', 'bench', .85, 1.5, 1.45, { kw: '조절식 암컬 플레이트', cl: [.6, .6, .4, .4], heavy: true, uh: 1.7 }, c => {
  c.fr([0, .04, -.65], [0, .04, .65], .08); c.fr([-.35, .04, -.65], [.35, .04, -.65], .08); c.box(.7, 1.4, .06, 0, .04, -.62, M.shroud, { r: .01 }); c.box(.16, .05, .005, 0, 1.25, -.585, M.logo);
  c.fr([0, .04, .35], [0, .48, .4], .07); c.pad(.38, .08, .34, 0, .5, .42); c.fr([0, .04, .05], [0, .85, .05], .07); const p = c.pad(.6, .08, .3, 0, .9, .12); p.rotation.x = .6;
  for (const s of [-1, 1]) { c.bar([.3 * s, .9, .0], [.3 * s, 1.15, -.15], .05, .05, M.frame); c.grip([.3 * s, 1.15, -.15], [.18 * s, 1.18, -.15], .02); } c.horn(.45, .95, -.3, 'x', .2, [.2]);
});
T('tbar', 'T바 로우', 'bench', .76, 1.85, .39, { kw: '티바로우 랜드마인 T-bar', cl: [.6, .5, .6, .6], heavy: true, uh: 1.6 }, c => {
  c.box(.4, .04, .4, 0, 0, -.72, M.frame, { r: .01 }); c.cyl(.05, .1, 0, .08, -.72, M.chrome, 'x');
  c.cyl(.025, 1.45, 0, .22, .0, M.chrome, 'z', 12).rotation.x = Math.PI / 2 - .2; c.tube([[-.22, .36, .62], [0, .38, .68], [.22, .36, .62]], .02, M.rubber);
  c.plate(.225, .05, .12, .25, .45, 'x'); c.plate(.225, .05, -.12, .25, .45, 'x'); c.box(.7, .04, .35, 0, 0, .7, M.frame2, { r: .01 });
});
T('twist', '트위스트', 'bench', .66, 1.3, 1.28, { kw: '트위스트 허리 회전 twist', cl: [.6, .3, .4, .4], uh: 2.0 }, c => {
  c.fr([0, .04, -.55], [0, .04, .5], .08); c.fr([-.3, .04, -.55], [.3, .04, -.55], .07);
  c.disc(.3, .05, 0, .1, .2, 'y', M.frame2, 32); c.disc(.26, .052, 0, .1, .2, 'y', M.rubber, 32);
  c.fr([0, .04, -.45], [0, 1.25, -.4], .08); c.tube([[-.25, 1.2, -.3], [-.2, 1.24, -.4], [.2, 1.24, -.4], [.25, 1.2, -.3]], .02, M.rubber); c.pad(.32, .06, .22, 0, .8, -.3);
});

/* ===================== STORAGE ===================== */
function dbRack(c, tiers) {
  const W = c.W, D = c.D;
  const legs = []; for (let x = -W / 2 + .06; x <= W / 2 - .05; x += Math.max(.6, (W - .12) / Math.max(1, Math.round((W - .12) / 1.1)))) legs.push(x);
  if (Math.abs(legs[legs.length - 1] - (W / 2 - .06)) > .05) legs.push(W / 2 - .06);
  legs.forEach(x => { c.box(.06, .05, D - .02, x, 0, 0, M.frame); c.fr([x, .05, -D / 2 + .12], [x, c.H - .03, -D / 2 + .15], .06); c.fr([x, .05, D / 2 - .1], [x, .45, D / 2 - .15], .06); });
  const n = Math.max(2, Math.floor((W - .2) / .24));
  for (let t = 0; t < tiers; t++) {
    const y = .38 + t * (c.H - .45) / Math.max(1, tiers - 1) * .92, z = D / 2 - .16 - t * (D - .3) / Math.max(1, tiers - 1);
    const tb = c.box(W - .04, .03, .28, 0, y, z, M.frame); tb.rotation.x = .2;
    const r0 = t === 0 ? .075 : t === 1 ? .055 : .042, r1 = t === 0 ? .1 : t === 1 ? .075 : .058;
    for (let i = 0; i < n; i++) {
      const x = -W / 2 + .16 + i * ((W - .32) / (n - 1)); const r = Math.round((r0 + (r1 - r0) * i / (n - 1)) * 200) / 200; const yy = y + r + .02;
      c.cyl(r, .065, x, yy, z - .1, M.rubber, 'z', 6); c.cyl(r, .065, x, yy, z + .1, M.rubber, 'z', 6); c.cyl(.016, .13, x, yy, z, M.chrome, 'z', 8);
    }
  }
}
T('dbrack2', '덤벨랙 (2단)', 'storage', 2.3, .6, .83, { kw: '덤벨 랙 dumbbell', cl: [1.5, 0, .3, .3], heavy: true, fit: 'actual' }, c => dbRack(c, 2));
T('dbrack3', '덤벨랙 (3단)', 'storage', 2.3, .74, 1.03, { kw: '덤벨 랙 3단', cl: [1.5, 0, .3, .3], heavy: true, fit: 'actual' }, c => dbRack(c, 3));
T('platetree', '원판 거치대', 'storage', .75, .6, .93, { kw: '원판 웨이트트리 plate tree', cl: [.6, .6, .6, .6], heavy: true }, c => {
  c.fr([-.33, .04, -.25], [-.33, .04, .25], .07); c.fr([.33, .04, -.25], [.33, .04, .25], .07); c.fr([-.33, .04, 0], [.33, .04, 0], .07);
  c.fr([-.28, .04, 0], [0, .92, 0], .06); c.fr([.28, .04, 0], [0, .92, 0], .06); c.cyl(.02, .5, 0, .9, 0, M.chrome, 'x');
  [[.25, .225, 'z'], [.55, .2, 'z']].forEach(([y, r]) => { for (const s of [-1, 1]) { c.cyl(.024, .24, 0, y, s * .14, M.chrome, 'z', 12); c.plate(r, .045, 0, y, s * .12, 'z'); c.plate(r * .85, .04, 0, y, s * .17, 'z'); } });
});
T('barbellrack', '바벨 거치대', 'storage', 1.02, .84, 1.39, { kw: '바벨랙 바 거치대 barbell rack', cl: [.6, .6, .3, .3], heavy: true }, c => {
  for (const s of [-1, 1]) { c.fr([.45 * s, .04, -.38], [.45 * s, 1.37, 0], .06); c.fr([.45 * s, .04, .38], [.45 * s, 1.37, 0], .06); c.fr([.45 * s, .04, -.38], [.45 * s, .04, .38], .06); for (let y = .3; y < 1.3; y += .22) { c.cyl(.012, .1, .45 * s, y, -.1 + (y - .3) * .08, M.chrome, 'z'); c.cyl(.012, .1, .45 * s, y, .1 - (y - .3) * .08, M.chrome, 'z'); } }
  c.fr([-.45, 1.37, 0], [.45, 1.37, 0], .06);
  for (let y = .34; y < 1.3; y += .22) { const z = -.14 + (y - .34) * .06; c.cyl(.014, 1.2, 0, y, z, M.chrome, 'x'); c.cyl(.07, .08, -.55, y, z, M.plate, 'x', 16); c.cyl(.07, .08, .55, y, z, M.plate, 'x', 16); }
});
T('fixedbarbell', '고정식 바벨 랙', 'storage', 1.6, .6, 1.1, { kw: '고정식 바벨 fixed barbell', cl: [1.2, 0, .3, .3], heavy: true }, c => {
  for (const s of [-1, 0, 1]) { c.fr([.75 * s, .04, -.25], [.75 * s, 1.08, -.1], .06); c.fr([.75 * s, .04, -.25], [.75 * s, .04, .25], .06); }
  for (let t = 0; t < 4; t++) { const y = .3 + t * .24, z = .12 - t * .08; c.box(1.54, .03, .12, 0, y, z, M.frame); c.cyl(.015, 1.25, 0, y + .1, z, M.chrome, 'x'); for (const s of [-1, 1]) c.cyl(.09 + t * .005, .09, .67 * s, y + .1, z, M.plate, 'x', 20); }
});
T('kettlebell', '케틀벨 랙', 'storage', 1.4, .5, .7, { kw: '케틀벨 kettlebell', cl: [1, 0, .3, .3], heavy: true }, c => {
  for (const s of [-1, 1]) c.box(.05, .7, .45, .67 * s, 0, 0, M.frame); c.box(1.36, .03, .45, 0, .08, 0, M.frame); c.box(1.36, .03, .45, 0, .4, 0, M.frame);
  for (const y of [.11, .43]) for (let i = 0; i < 6; i++) { const x = -.55 + i * .22, r = .07 + (y > .2 ? 0 : .02); const s = c.box(r * 2, r * 1.8, r * 2, x, y, 0, M.plate, { r: r * .9 }); c.tube([[x - .05, y + r * 1.8, 0], [x - .04, y + r * 1.8 + .08, 0], [x + .04, y + r * 1.8 + .08, 0], [x + .05, y + r * 1.8, 0]], .012, M.plate); }
});
T('medball', '메디신볼 랙', 'storage', 1.0, .45, 1.3, { kw: '메디신볼 월볼 medicine ball', cl: [.8, 0, .3, .3], heavy: true }, c => {
  for (const s of [-1, 1]) c.fr([.48 * s, .04, -.18], [.48 * s, 1.28, -.18], .05);
  for (let t = 0; t < 3; t++) { const y = .15 + t * .42; const sh = c.box(.96, .03, .38, 0, y, 0, M.frame); sh.rotation.x = .15; for (let i = 0; i < 3; i++) { const r = .14 - t * .015; const b = c.box(r * 2, r * 2, r * 2, -.3 + i * .3, y + .03, .02, i % 2 ? M.plate : M.accent, { r: r * .99 }); } }
});
T('platform', '데드리프트 플랫폼', 'storage', 2.4, 2.4, .05, { kw: '플랫폼 데드리프트 역도 platform', cl: [.6, .6, .6, .6], heavy: true, flat: true, surface: true, fit: 'actual' }, c => { c.box(c.W, .05, c.D, 0, 0, 0, M.rubber); c.box(Math.max(.6, c.W * .42), .052, c.D - .02, 0, 0, 0, M.wood); });

/* ===================== FUNCTIONAL ===================== */
T('turf', '인조잔디 트랙', 'func', 8, 1.8, .02, { kw: '터프 썰매 잔디 turf', cl: [0, 0, 0, 0], flat: true, fit: 'actual' }, c => {
  const W = c.W, D = c.D; c.box(W, .02, D, 0, 0, 0, M.turf);
  for (let x = -W / 2 + 1; x < W / 2 - .5; x += 1) c.box(.05, .004, D - .16, x, .02, 0, M.white);
  c.box(W - .1, .004, .05, 0, .02, -D / 2 + .08, M.white); c.box(W - .1, .004, .05, 0, .02, D / 2 - .08, M.white);
});
T('sled', '슬레드', 'func', .6, .9, 1.0, { kw: '썰매 푸시 슬레드 sled', cl: [2, .5, .2, .2], heavy: true }, c => {
  c.box(.56, .05, .86, 0, 0, 0, M.frame, { r: .02 }); c.box(.5, .12, .5, 0, .05, -.15, M.frame2, { r: .02 });
  for (const s of [-1, 1]) c.tube([[.22 * s, .1, .2], [.22 * s, .95, .38]], .022, M.chrome); c.cyl(.025, .3, 0, .3, -.15, M.chrome, 'y'); c.plate(.225, .05, 0, .21, -.15, 'y');
});
T('plyobox', '플라이오 박스', 'func', .9, .75, .76, { kw: '플라이오 점프 박스 plyo box', cl: [.8, .8, .3, .3] }, c => {
  c.box(.9, .3, .75, 0, 0, 0, M.plate, { r: .03 }); c.box(.76, .25, .62, 0, .3, 0, M.accent, { r: .03 }); c.box(.6, .2, .5, 0, .55, 0, M.plate, { r: .03 });
});
T('battlerope', '배틀로프', 'func', .6, 5.0, .2, { kw: '배틀로프 로프 battle rope', cl: [1.2, 0, .5, .5], flat: true }, c => {
  c.box(.3, .2, .3, 0, 0, -2.3, M.frame, { r: .03 }); const pts = []; for (let i = 0; i <= 20; i++) { const t = i / 20; pts.push([Math.sin(t * Math.PI * 3) * .12 + (i ? .12 : 0), .03, -2.2 + t * 4.6]); }
  c.tube(pts.map(p => [p[0] + .06, p[1], p[2]]), .02, M.rubber, { seg: 8 }); c.tube(pts.map(p => [-p[0] - .06, p[1], p[2]]), .02, M.rubber, { seg: 8 });
});
T('stretchzone', '스트레칭 존', 'func', 3, 2, .02, { kw: '스트레칭 매트 요가 stretch', cl: [0, 0, 0, 0], flat: true, fit: 'actual' }, c => {
  const W = c.W, D = c.D; c.box(W, .02, D, 0, 0, 0, M.matBlue);
  if (D >= 1.9) { const n = Math.min(8, Math.floor((W - .2) / .85)); for (let i = 0; i < n; i++) c.box(.6, .008, 1.75, -W / 2 + .5 + i * .85, .02, 0, i % 2 ? M.yogaA : M.yogaB); }
  if (W >= 2 && D >= 1.2) c.cyl(.075, .9, W / 2 - .25, .095, 0, M.accent, 'z', 16);
});
T('ballrack', '짐볼·폼롤러 거치대', 'func', 1.0, .45, 1.2, { kw: '짐볼 폼롤러 거치대', cl: [.6, 0, .2, .2] }, c => {
  for (const s of [-1, 1]) c.fr([.48 * s, .04, -.15], [.48 * s, 1.18, -.15], .05); c.box(.96, .03, .4, 0, .02, 0, M.frame); c.box(.96, .03, .4, 0, .62, 0, M.frame);
  for (let i = 0; i < 3; i++) c.box(.3, .3, .3, -.32 + i * .32, .66, 0, [M.accent, M.matBlue, M.plate][i], { r: .148 });
  for (let i = 0; i < 5; i++) c.cyl(.075, .38, -.36 + i * .18, .13, 0, i % 2 ? M.yogaA : M.frame2, 'z', 16);
});
T('sandbag', '샌드백', 'func', .45, .45, 1.8, { kw: '샌드백 복싱 sandbag', cl: [.8, .8, .8, .8], mount: 'ceil', y: 0 }, c => {
  c.cyl(.18, 1.1, 0, .55, 0, M.plate, 'y', 24); c.cyl(.185, .06, 0, 1.1, 0, M.frame2, 'y', 24); for (let i = 0; i < 3; i++) c.cable([Math.cos(i * 2.1) * .16, 1.12, Math.sin(i * 2.1) * .16], [0, 1.4, 0]); c.tube([[0, 1.4, 0], [0, 1.8, 0]], .008, M.chrome, { seg: 6 });
});

/* ===================== STRETCHING & CARE ===================== */
T('stretchmachine', '스트레칭 머신', 'stretch', .87, 1.66, 1.65, { kw: '스트레칭 머신 고플렉스', cl: [.6, .3, .4, .4], pw: 100, uh: 2.0 }, c => {
  c.box(.85, .1, 1.64, 0, 0, 0, M.frame, { r: .02 }); for (const s of [-1, 1]) { c.fr([.4 * s, .1, -.78], [.4 * s, .35, .78], .05); c.fr([.4 * s, .1, -.78], [.4 * s, 1.63, -.78], .06); }
  c.box(.7, .06, .9, 0, .35, .25, M.wood, { r: .02 }); c.box(.7, .5, .06, 0, .42, -.2, M.wood, { r: .02 }); c.box(.66, .9, .05, 0, .7, -.8, M.shroud, { r: .01 }); c.screen(.3, .2, 0, 1.45, -.75, 0);
  c.grip([-.4, 1.0, -.6], [-.4, 1.0, -.3], .02); c.grip([.4, 1.0, -.6], [.4, 1.0, -.3], .02);
});
function mirrorPanel(c, x, z, w, ry, disp) {
  const g = new THREE.Group(); g.position.set(c.X(x), 0, c.Z(z)); g.rotation.y = ry || 0; c.g.add(g);
  const cc = GP.ctx(g, { w: 1, d: 1, h: 1 }, { w: 1, d: 1, h: 1 });
  cc.box(w, 2.08, .08, 0, 0, 0, M.shroud, { r: .01 }); cc.box(w - .08, 1.5, .01, 0, .35, .045, disp ? M.screen : M.mirror);
  for (let y = .25; y < 1.9; y += .12) cc.cyl(.03, .12, -w / 2 + .1, y, .09, M.wood, 'y', 10);
}
T('mirror_t', '스트레칭 미러 (T형)', 'stretch', 1.56, 1.46, 2.09, { kw: '미러 스트레칭 부스 T', cl: [.8, .1, .1, .1], pw: 200, uh: 2.1 }, c => { mirrorPanel(c, 0, -.6, 1.0, 0, true); mirrorPanel(c, -.55, 0, 1.0, Math.PI / 2 - .35); mirrorPanel(c, .55, 0, 1.0, -Math.PI / 2 + .35); c.box(1.5, .04, 1.3, 0, 0, .05, M.frame2); });
T('mirror_lr', '스트레칭 미러 (LR형)', 'stretch', 1.55, .81, 2.09, { kw: '미러 스트레칭 LR', cl: [.8, .1, .1, .1], pw: 200, uh: 2.1 }, c => { mirrorPanel(c, .2, -.3, 1.0, 0, true); mirrorPanel(c, -.6, .05, .75, Math.PI / 2 - .35); });
T('vibration', '진동 운동기', 'stretch', .8, 1.0, 1.4, { kw: '진동 플레이트 바이브라핏 vibration', cl: [.6, .3, .3, .3], pw: 1000, uh: 2.1 }, c => {
  c.box(.76, .16, .8, 0, 0, .08, M.body, { r: .04 }); c.box(.6, .02, .6, 0, .16, .1, M.rubber, { r: .01 }); c.bar([0, .15, -.4], [0, 1.25, -.42], .12, .08, M.silver, { r: .02 }); c.tube([[-.25, 1.1, -.2], [-.22, 1.2, -.4], [.22, 1.2, -.4], [.25, 1.1, -.2]], .02, M.silver); c.screen(.2, .14, 0, 1.28, -.43, -.3);
});
T('inbody', '체성분 측정기', 'stretch', .5, .9, 1.0, { kw: '인바디 체성분 체중계 inbody', cl: [.6, .1, .2, .2], pw: 100, uh: 2.0 }, c => {
  c.box(.46, .08, .6, 0, 0, .12, M.white, { r: .03 }); c.box(.3, .01, .15, -.08, .08, .15, M.chrome); c.box(.3, .01, .15, .08, .08, .15, M.chrome);
  c.bar([0, .08, -.25], [0, .95, -.3], .1, .06, M.white, { r: .02 }); c.screen(.26, .18, 0, .96, -.33, -.3); c.grip([-.2, .95, -.15], [-.22, .95, -.3], .02); c.grip([.2, .95, -.15], [.22, .95, -.3], .02);
});

/* ===================== FACILITIES (floor / wall / ceiling) ===================== */
T('mirror', '벽 거울', 'facility', 3, .04, 1.9, { kw: '거울 mirror', cl: [0, 0, 0, 0], wall: true, mount: 'wall', y: .3, fit: 'actual' }, c => { c.box(c.W, c.H, c.D, 0, 0, 0, M.frame); c.box(c.W - .04, c.H - .04, .01, 0, .02, c.D / 2, M.mirror); });
T('column', '기둥', 'facility', .6, .6, 2.8, { kw: '기둥 column', cl: [0, 0, 0, 0], fit: 'actual', hFromWall: true }, c => { c.box(c.W, c.H, c.D, 0, 0, 0, M.column); });
T('outlet', '콘센트', 'facility', .12, .04, .12, { kw: '콘센트 전기 outlet 전원', cl: [0, 0, 0, 0], wall: true, mount: 'wall', y: .3 }, c => { c.box(.12, .12, .02, 0, 0, 0, M.white, { r: .01 }); c.cyl(.022, .01, -.028, .06, .012, M.frame2, 'z', 12); c.cyl(.022, .01, .028, .06, .012, M.frame2, 'z', 12); });
T('logo', '로고', 'facility', 1.5, .03, .6, { kw: '로고 간판 사인 logo', cl: [0, 0, 0, 0], wall: true, mount: 'wall', y: 1.6, fit: 'actual' }, c => { c.box(c.W, c.H, c.D, 0, 0, 0, M.white); });
T('tv_wall', '벽걸이 TV', 'facility', 1.45, .06, .84, { kw: '티비 tv 모니터 벽걸이', cl: [0, 0, 0, 0], wall: true, mount: 'wall', y: 1.4, pw: 200 }, c => { c.box(1.45, .84, .05, 0, 0, 0, M.body, { r: .01 }); c.box(1.4, .79, .01, 0, .025, .026, M.screen); });
T('speaker_wall', '스피커 (벽)', 'facility', .25, .22, .38, { kw: '스피커 음향 speaker', cl: [0, 0, 0, 0], wall: true, mount: 'wall', y: 2.2, pw: 60 }, c => { c.box(.25, .38, .2, 0, 0, 0, M.body, { r: .02 }); c.cyl(.08, .01, 0, .13, .1, M.frame2, 'z', 18); c.cyl(.035, .01, 0, .3, .1, M.frame2, 'z', 14); });
T('speaker_ceil', '스피커 (천장)', 'facility', .25, .25, .1, { kw: '천장 스피커', cl: [0, 0, 0, 0], wall: true, mount: 'ceil', pw: 30 }, c => { c.cyl(.12, .08, 0, .05, 0, M.white, 'y', 24); c.cyl(.1, .01, 0, .005, 0, M.frame2, 'y', 20); });
T('ac_wall', '벽걸이 에어컨', 'facility', 1.0, .25, .33, { kw: '에어컨 냉방 벽걸이 ac', cl: [.5, 0, 0, 0], wall: true, mount: 'wall', y: 2.3, pw: 1800 }, c => { c.box(1.0, .33, .23, 0, 0, 0, M.white, { r: .06 }); c.box(.9, .03, .02, 0, .04, .115, M.frame2); });
T('ac_stand', '스탠드 에어컨', 'facility', .5, .4, 1.85, { kw: '에어컨 스탠드', cl: [.8, 0, 0, 0], pw: 2500 }, c => { c.box(.5, 1.85, .38, 0, 0, 0, M.white, { r: .08 }); c.box(.36, .9, .01, 0, .8, .19, M.frame2, { r: .02 }); });
T('ac_ceil', '천장형 에어컨', 'facility', .95, .95, .3, { kw: '시스템 에어컨 천장 4way', cl: [0, 0, 0, 0], wall: true, mount: 'ceil', pw: 3000 }, c => { c.box(.95, .05, .95, 0, 0, 0, M.white, { r: .02 }); c.box(.82, .25, .82, 0, .05, 0, M.bodyLight); c.box(.5, .01, .5, 0, -.002, 0, M.frame2); });
T('light_ceil', '천장 조명', 'facility', .6, .6, .08, { kw: '조명 천장등 원형 light', cl: [0, 0, 0, 0], wall: true, mount: 'ceil', pw: 50 }, c => { c.cyl(.3, .06, 0, .05, 0, M.white, 'y', 32); c.cyl(.28, .01, 0, .015, 0, M.lightE, 'y', 32); });
T('light_line', '라인 조명', 'facility', 2.4, .08, .06, { kw: '라인 조명 led', cl: [0, 0, 0, 0], wall: true, mount: 'ceil', pw: 40, fit: 'actual' }, c => { c.box(c.W, .05, c.D, 0, .01, 0, M.body); c.box(c.W - .02, .012, c.D - .02, 0, 0, 0, M.lightE); });
T('light_wall', '벽 조명', 'facility', .2, .12, .3, { kw: '벽등 브라켓 조명', cl: [0, 0, 0, 0], wall: true, mount: 'wall', y: 2.0, pw: 20 }, c => { c.box(.12, .3, .03, 0, 0, -.045, M.body, { r: .01 }); c.box(.18, .22, .1, 0, .04, .01, M.lightE, { r: .03 }); });
T('clock', '시계', 'facility', .4, .05, .4, { kw: '벽시계 clock 타이머', cl: [0, 0, 0, 0], wall: true, mount: 'wall', y: 2.2 }, c => { c.cyl(.2, .04, 0, .2, 0, M.body, 'z', 32); c.cyl(.18, .01, 0, .2, .02, M.white, 'z', 32); c.box(.01, .12, .005, 0, .2, .028, M.frame2); c.box(.08, .01, .005, .03, .2, .028, M.frame2); });
T('frame', '액자·포스터', 'facility', .7, .03, 1.0, { kw: '액자 포스터 사진 frame', cl: [0, 0, 0, 0], wall: true, mount: 'wall', y: 1.3, fit: 'actual' }, c => { c.box(c.W, c.H, c.D, 0, 0, 0, M.frame); c.box(c.W - .06, c.H - .06, .005, 0, .03, c.D / 2, M.fabric); });
T('shelf_wall', '벽 선반', 'facility', 1.2, .25, .04, { kw: '벽선반 선반 shelf', cl: [0, 0, 0, 0], wall: true, mount: 'wall', y: 1.5, fit: 'actual', surface: true }, c => { c.box(c.W, .03, c.D, 0, 0, 0, M.wood); for (const s of [-1, 1]) c.box(.02, .12, c.D * .8, s * (c.W / 2 - .15), -.12, -c.D * .1, M.frame); });

/* ===================== SPECIAL ITEM TEMPLATES (param-driven, built at actual size) ===================== */
const colorP = (k, label, def) => ({ k, label, type: 'color', def });
T('desk', '인포데스크', 'special', 2.0, .7, 1.05, {
  kw: '인포데스크 카운터 리셉션 데스크 counter', cl: [1, .8, 0, 0], fit: 'actual', pw: 300, surface: true,
  params: [{ k: 'shape', label: '모양', type: 'select', def: 'straight', options: [['straight', '일자형'], ['L', 'ㄱ자형'], ['U', 'ㄷ자형'], ['round', '라운드형'], ['two', '2단 카운터']] }, colorP('body', '몸체 색', '#b48a5e'), colorP('top', '상판 색', '#ecebe6')],
}, (c, p) => {
  const W = c.W, D = c.D, H = c.H, P = p.params || {}, body = GP.colorMat(P.body || '#b48a5e'), top = GP.colorMat(P.top || '#ecebe6'), t = Math.min(.7, D);
  const seg = (x, z, w, d) => { c.box(w, H - .04, d, x, 0, z, body); c.box(w + .03, .04, d + .03, x, H - .04, z, top); };
  const shape = P.shape || 'straight';
  if (shape === 'round') {
    const a0 = Math.PI * .1, R = W / (2 * Math.cos(a0)), Ri = Math.max(.2, R - t);
    const sh = new THREE.Shape(); sh.absarc(0, 0, R, Math.PI + a0, 2 * Math.PI - a0, false); sh.absarc(0, 0, Ri, 2 * Math.PI - a0, Math.PI + a0, true);
    const mk = (h, y, m) => { const gg = new THREE.ExtrudeGeometry(sh, { depth: h, bevelEnabled: false, curveSegments: 32 }); gg.rotateX(-Math.PI / 2); const me = new THREE.Mesh(gg, m); me.position.set(0, y, D / 2 - R); c.g.add(me); };
    mk(H - .04, 0, body); mk(.04, H - .04, top); return;
  }
  seg(0, D / 2 - t / 2, W, t);
  if (shape === 'L' || shape === 'U') seg(W / 2 - t / 2, -t / 2 + .0, t, D - t);
  if (shape === 'U') seg(-W / 2 + t / 2, -t / 2, t, D - t);
  if (shape === 'two') { c.box(W, .25, .3, 0, H, D / 2 - .15, body); c.box(W + .03, .04, .36, 0, H + .25, D / 2 - .15, top); }
  c.box(Math.min(.5, W * .4), .3, .03, Math.min(.4, W / 2 - .35), H, D / 2 - t + .12, M.body); c.box(Math.min(.46, W * .38), .26, .01, Math.min(.4, W / 2 - .35), H + .02, D / 2 - t + .102, M.screen);
});
T('cabinet', '벽장·수납장', 'special', 1.2, .45, 2.0, {
  kw: '벽장 수납장 캐비닛 장 cabinet', cl: [.6, 0, 0, 0], fit: 'actual',
  params: [{ k: 'cols', label: '칸 수', type: 'num', def: 2, min: 1, max: 8, step: 1 }, { k: 'style', label: '문', type: 'select', def: 'door', options: [['door', '여닫이 문'], ['open', '오픈형'], ['glass', '유리문']] }, colorP('color', '색상', '#e9e6df')],
}, (c, p) => {
  const W = c.W, D = c.D, H = c.H, P = p.params || {}, n = Math.max(1, Math.min(8, Math.round(P.cols || 2))), m = GP.colorMat(P.color || '#e9e6df');
  c.box(W, H, D - .02, 0, 0, -.01, m); const cw = (W - .04) / n;
  if ((P.style || 'door') === 'open') { for (let i = 0; i < n; i++) { const x = -W / 2 + .02 + cw * (i + .5); c.box(cw - .03, H - .1, .01, x, .05, D / 2 - .01, M.frame2); for (let y = .45; y < H - .1; y += .4) c.box(cw - .03, .025, D - .06, x, y, 0, m); } return; }
  for (let i = 0; i < n; i++) { const x = -W / 2 + .02 + cw * (i + .5); c.box(cw - .012, H - .06, .02, x, .03, D / 2, (P.style === 'glass') ? M.glass : m); c.box(.015, .18, .02, x + (i % 2 ? -1 : 1) * (cw / 2 - .05), H * .48, D / 2 + .02, M.chrome); }
});
T('locker', '락커', 'special', .9, .5, 1.8, {
  kw: '락커 사물함 옷장 locker', cl: [.8, 0, 0, 0], fit: 'actual',
  params: [{ k: 'cols', label: '가로 칸', type: 'num', def: 3, min: 1, max: 12, step: 1 }, { k: 'rows', label: '세로 칸', type: 'num', def: 2, min: 1, max: 6, step: 1 }, colorP('color', '색상', '#6b7580')],
}, (c, p) => {
  const W = c.W, D = c.D, H = c.H, P = p.params || {}, nc = Math.max(1, Math.round(P.cols || 3)), nr = Math.max(1, Math.round(P.rows || 2)), m = GP.colorMat(P.color || '#6b7580');
  c.box(W, H, D - .02, 0, 0, -.01, M.frame2); const cw = W / nc, rh = (H - .1) / nr;
  for (let i = 0; i < nc; i++) for (let j = 0; j < nr; j++) { const x = -W / 2 + cw * (i + .5), y = .1 + rh * j; c.box(cw - .012, rh - .012, .02, x, y + .006, D / 2, m); c.box(.06, .04, .005, x, y + rh - .12, D / 2 + .012, M.white); c.box(.012, .07, .02, x + cw / 2 - .06, y + rh * .45, D / 2 + .015, M.chrome); }
});
T('shelf', '선반·수건장', 'special', 1.2, .4, 1.8, {
  kw: '선반 수건장 진열대 shelf towel', cl: [.6, 0, 0, 0], fit: 'actual', surface: true,
  params: [{ k: 'tiers', label: '단 수', type: 'num', def: 4, min: 2, max: 8, step: 1 }, { k: 'towel', label: '수건 놓기', type: 'select', def: 'no', options: [['no', '없음'], ['yes', '수건']] }, colorP('color', '색상', '#2b2e33')],
}, (c, p) => {
  const W = c.W, D = c.D, H = c.H, P = p.params || {}, n = Math.max(2, Math.round(P.tiers || 4)), m = GP.colorMat(P.color || '#2b2e33');
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) c.box(.03, H, .03, sx * (W / 2 - .015), 0, sz * (D / 2 - .015), m);
  for (let i = 0; i < n; i++) { const y = .08 + i * (H - .12) / (n - 1); c.box(W, .025, D, 0, y, 0, m); if (P.towel === 'yes' && i < n - 1) for (let k = 0; k < Math.floor((W - .1) / .22); k++) c.box(.2, .12, D * .7, -W / 2 + .16 + k * .22, y + .025, 0, M.white, { r: .03 }); }
});
T('screen', '이동식 파티션', 'special', 1.2, .5, 1.6, { kw: '파티션 칸막이 가림막 screen', cl: [0, 0, 0, 0], fit: 'actual', params: [colorP('color', '색상', '#5b6168')] }, (c, p) => {
  const W = c.W, D = c.D, H = c.H, m = GP.colorMat((p.params || {}).color || '#5b6168');
  c.box(W, H - .1, .04, 0, .1, 0, m, { r: .01 }); c.box(W + .02, .03, .05, 0, H - .03, 0, M.silver); for (const s of [-1, 1]) { c.box(.04, H, .05, s * W / 2, 0, 0, M.silver); c.box(.06, .03, D, s * (W / 2 - .05), 0, 0, M.silver); }
});
T('purifier', '정수기', 'special', .3, .45, 1.25, { kw: '정수기 냉온수기 water', cl: [.6, 0, 0, 0], pw: 500, params: [{ k: 'type', label: '형태', type: 'select', def: 'stand', options: [['stand', '스탠드형'], ['counter', '카운터형']] }] }, (c, p) => {
  const counter = (p.params || {}).type === 'counter'; const H = counter ? .5 : 1.25; c.box(.3, H, .45, 0, 0, 0, M.white, { r: .03 });
  c.box(.22, .22, .02, 0, H - .42, .225, M.frame2, { r: .01 }); c.box(.2, .02, .1, 0, H - .44, .2, M.silver);
});
T('tv_stand', 'TV (스탠드)', 'special', 1.45, .5, 1.6, { kw: '스탠드 티비 tv', cl: [.8, 0, 0, 0], pw: 200 }, c => { c.box(.7, .04, .45, 0, 0, 0, M.frame2, { r: .02 }); c.bar([0, .04, 0], [0, .9, -.02], .1, .05, M.silver); c.box(1.45, .84, .05, 0, .74, 0, M.body, { r: .01 }); c.box(1.4, .79, .01, 0, .765, .026, M.screen); });
T('monitor', 'PC 모니터', 'special', .6, .2, .45, { kw: '모니터 컴퓨터 pc', cl: [0, 0, 0, 0], sitOn: true, pw: 80 }, c => { c.box(.25, .02, .18, 0, 0, 0, M.frame2, { r: .01 }); c.bar([0, .02, 0], [0, .2, -.02], .05, .02, M.frame2); c.box(.6, .36, .03, 0, .09, 0, M.body, { r: .01 }); c.box(.57, .33, .01, 0, .105, .016, M.screen); });
T('plant', '화분', 'special', .5, .5, 1.2, {
  kw: '화분 식물 나무 plant', cl: [0, 0, 0, 0], sitOn: true,
  params: [{ k: 'size', label: '크기', type: 'select', def: 'm', options: [['s', '작은 화분'], ['m', '중간'], ['l', '큰 나무']] }],
}, (c, p) => {
  const s = { s: .45, m: 1, l: 1.5 }[(p.params || {}).size || 'm'] || 1; c.cyl(.2 * Math.sqrt(s), .35 * s, 0, .175 * s, 0, M.pot, 'y', 20);
  for (let i = 0; i < 7; i++) { const a = i * 2.3, r = .12 * s; const b = c.box(.3 * s, .3 * s, .3 * s, Math.cos(a) * r, .45 * s + (i % 3) * .18 * s, Math.sin(a) * r, M.plant, { r: .148 * s }); }
});
T('sofa', '소파·벤치 의자', 'special', 1.9, .85, .85, {
  kw: '소파 의자 대기 벤치 sofa', cl: [.6, 0, 0, 0], fit: 'actual',
  params: [{ k: 'kind', label: '종류', type: 'select', def: 'sofa3', options: [['sofa2', '2인 소파'], ['sofa3', '3인 소파'], ['bench', '벤치 의자']] }, colorP('color', '색상', '#5b6168')],
}, (c, p) => {
  const W = c.W, D = c.D, H = c.H, P = p.params || {}, m = GP.colorMat(P.color || '#5b6168');
  if (P.kind === 'bench') { c.pad(W, .08, D * .5, 0, .38, 0, m); for (const s of [-1, 1]) c.box(.05, .38, D * .45, s * (W / 2 - .1), 0, 0, M.frame); return; }
  const n = P.kind === 'sofa2' ? 2 : 3; c.box(W, .25, D, 0, .05, 0, m, { r: .03 }); const cw = (W - .3) / n;
  for (let i = 0; i < n; i++) c.pad(cw - .02, .14, D - .25, -W / 2 + .15 + cw * (i + .5), .3, .1, m);
  c.pad(W - .3, H - .3, .2, 0, .3, -D / 2 + .12, m); for (const s of [-1, 1]) c.pad(.15, .35, D, s * (W / 2 - .075), .3, 0, m);
});
T('showcase', '쇼케이스 냉장고', 'special', 1.2, .65, 1.9, { kw: '쇼케이스 음료 냉장고', cl: [.8, 0, 0, 0], pw: 400, fit: 'actual', params: [{ k: 'doors', label: '문', type: 'num', def: 2, min: 1, max: 4, step: 1 }] }, (c, p) => {
  const W = c.W, D = c.D, H = c.H, n = Math.max(1, Math.round((p.params || {}).doors || 2)); c.box(W, H, D, 0, 0, 0, M.body, { r: .02 });
  const dw = (W - .06) / n; for (let i = 0; i < n; i++) { const x = -W / 2 + .03 + dw * (i + .5); c.box(dw - .02, H - .3, .01, x, .15, D / 2 + .005, M.glass); for (let y = .35; y < H - .3; y += .38) { c.box(dw - .06, .01, D - .1, x, y, 0, M.silver); for (let k = 0; k < 4; k++) c.cyl(.03, .2, x - dw / 2 + .1 + k * (dw - .2) / 3, y + .11, .1, [M.accent, M.matBlue, M.yogaA, M.lightE][k], 'y', 10); } }
});
T('fridge', '냉장고', 'special', .8, .75, 1.85, { kw: '냉장고 fridge', cl: [.8, 0, 0, 0], pw: 300, fit: 'actual', params: [{ k: 'doors', label: '문', type: 'num', def: 2, min: 1, max: 4, step: 1 }] }, (c, p) => {
  const W = c.W, D = c.D, H = c.H, n = Math.max(1, Math.round((p.params || {}).doors || 2)); c.box(W, H, D, 0, 0, 0, M.silver, { r: .02 }); const dw = W / n;
  for (let i = 0; i < n; i++) { const x = -W / 2 + dw * (i + .5); c.box(dw - .01, H - .02, .01, x, .01, D / 2 + .005, M.bodyLight); c.box(.02, .4, .03, x + (i % 2 ? -1 : 1) * (dw / 2 - .06), H * .5, D / 2 + .02, M.chrome); }
});

/* ===================== CUSTOM (직접 조립) ===================== */
GP.buildCustom = (g, def, p) => {
  const sx = p.w / def.w, sy = p.h / def.h, sz = p.d / def.d;
  (def.parts || []).forEach(q => {
    const m = GP.colorMat(q.color || '#8e949b', q.mat || '');
    let geo;
    if (q.s === 'cyl') geo = GP.geo(`cc${q.w},${q.h}`, () => new THREE.CylinderGeometry(.5, .5, 1, 28));
    else if (q.s === 'sph') geo = GP.geo('csph', () => new THREE.SphereGeometry(.5, 24, 16));
    else if (q.s === 'rbox') geo = GP.geo(`crb`, () => GP.roundedBoxGeo(1, 1, 1, .12, 3));
    else geo = GP.geo('cbox', () => new THREE.BoxGeometry(1, 1, 1));
    const me = new THREE.Mesh(geo, m); me.scale.set(q.w * sx, q.h * sy, (q.s === 'cyl' || q.s === 'sph' ? q.w : q.d) * sz);
    me.position.set(q.x * sx, (q.y + q.h / 2) * sy, q.z * sz); me.rotation.y = -(q.ry || 0) * GP.U.DEG; g.add(me);
  });
};

/* ===================== ZONE SETS (relative layouts) ===================== */

})();
