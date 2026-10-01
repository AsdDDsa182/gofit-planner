/* GoFit Planner — materials and 3D part library used by the equipment models */
(function () {
'use strict';
const GP = window.GP, U = GP.U;
const M = GP.M = {};
const GC = new Map();
const geo = GP.geo = (k, f) => { let g = GC.get(k); if (!g) { g = f(); GC.set(k, g); } return g; };

/* ---------- materials ---------- */
function S(c, o) { return new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: .6, metalness: .1 }, o || {})); }
GP.initMaterials = () => {
  M.frame = S('#1e2023', { metalness: .45, roughness: .42 });
  M.frame2 = S('#2b2e33', { metalness: .4, roughness: .5 });
  M.chrome = S('#d2d6db', { metalness: .95, roughness: .16 });
  M.silver = S('#bfc4ca', { metalness: .75, roughness: .3 });
  M.pad = S('#161718', { roughness: .72, metalness: .02 });
  M.pad2 = S('#232426', { roughness: .8 });
  M.shroud = S('#131416', { metalness: .35, roughness: .22 });
  M.accent = S('#f08a1c', { roughness: .45, metalness: .1 });
  M.rubber = S('#0e0f10', { roughness: .95, metalness: 0 });
  M.plate = S('#1a1b1d', { roughness: .7, metalness: .1 });
  M.plateRim = S('#2c2e31', { roughness: .45, metalness: .5 });
  M.stack = S('#3a3d41', { roughness: .45, metalness: .55 });
  M.screen = S('#0a1420', { emissive: '#1d5fd0', emissiveIntensity: .22, roughness: .25, metalness: .2 });
  M.body = S('#2a2d31', { roughness: .5, metalness: .15 });
  M.bodyLight = S('#8e949b', { roughness: .45, metalness: .35 });
  M.belt = S('#18191a', { roughness: .9 });
  M.logo = S('#e9e9e6', { roughness: .5 });
  M.white = S('#f2f2ee', { roughness: .8 });
  M.wood = S('#b48a5e', { roughness: .65 });
  M.woodDark = S('#6f4f35', { roughness: .65 });
  M.top = S('#ecebe6', { roughness: .4 });
  M.mirror = S('#d9e6ee', { metalness: .9, roughness: .05 });
  M.glass = S('#bcd7e6', { transparent: true, opacity: .32, roughness: .08, metalness: .1, depthWrite: false });
  M.column = S('#c2c5c1', { roughness: .92 });
  M.turf = S('#3d8b49', { roughness: 1 });
  M.matBlue = S('#56708a', { roughness: .95 });
  M.yogaA = S('#8fb3a6', { roughness: .9 }); M.yogaB = S('#c9a27a', { roughness: .9 });
  M.plant = S('#3f7d3a', { roughness: .85 }); M.pot = S('#d8d2c6', { roughness: .8 });
  M.fabric = S('#5b6168', { roughness: .95 });
  M.lightE = S('#fffdf5', { emissive: '#fff6dd', emissiveIntensity: .8, roughness: .5 });
  M.cad = new THREE.MeshLambertMaterial({ color: '#ffffff' });
  M.cadLine = new THREE.LineBasicMaterial({ color: '#1b1f23' });
  M.cadLineSoft = new THREE.LineBasicMaterial({ color: '#8a9096' });
  GP.applyEquipColors();
};
GP.applyEquipColors = () => {
  const s = GP.P ? GP.P.settings : { frameColor: 'black', accent: '#f08a1c', shroud: '#141517' };
  const fc = { black: ['#1e2023', '#2b2e33', .45, .42], silver: ['#b6bbc1', '#8f959c', .75, .32], white: ['#e9e9e6', '#c9cbcd', .2, .45] }[s.frameColor] || ['#1e2023', '#2b2e33', .45, .42];
  M.frame.color.set(fc[0]); M.frame.metalness = fc[2]; M.frame.roughness = fc[3];
  M.frame2.color.set(fc[1]);
  M.accent.color.set(s.accent || '#f08a1c');
  M.shroud.color.set(s.shroud || '#141517');
};
const colorMats = new Map();
GP.colorMat = (hex, kind) => { const k = hex + (kind || ''); let m = colorMats.get(k); if (!m) { m = kind === 'glass' ? S(hex, { transparent: true, opacity: .35, roughness: .08, depthWrite: false }) : kind === 'metal' ? S(hex, { metalness: .7, roughness: .3 }) : kind === 'emit' ? S(hex, { emissive: hex, emissiveIntensity: .7 }) : S(hex, { roughness: .6 }); colorMats.set(k, m); } return m; };

/* ---------- geometries ---------- */
function roundedBoxGeo(w, h, d, r, seg) {
  r = Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4); seg = seg || 3;
  if (r <= 0.0005) return new THREE.BoxGeometry(w, h, d);
  const g = new THREE.BoxGeometry(1, 1, 1, seg * 2 + 1, seg * 2 + 1, seg * 2 + 1);
  const pos = g.attributes.position, v = new THREE.Vector3(), hw = w / 2 - r, hh = h / 2 - r, hd = d / 2 - r;
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const sx = Math.sign(v.x), sy = Math.sign(v.y), sz = Math.sign(v.z);
    const ax = Math.abs(v.x) * 2, ay = Math.abs(v.y) * 2, az = Math.abs(v.z) * 2; // 0..1
    const n = new THREE.Vector3(Math.max(0, ax - .5) * 2 * sx, Math.max(0, ay - .5) * 2 * sy, Math.max(0, az - .5) * 2 * sz);
    const inner = new THREE.Vector3(Math.min(ax, .5) * 2 * sx * hw, Math.min(ay, .5) * 2 * sy * hh, Math.min(az, .5) * 2 * sz * hd);
    if (n.lengthSq() > 0) n.normalize().multiplyScalar(r);
    pos.setXYZ(i, inner.x + n.x, inner.y + n.y, inner.z + n.z);
  }
  g.computeVertexNormals();
  return g;
}
GP.roundedBoxGeo = roundedBoxGeo;
const UP = new THREE.Vector3(0, 1, 0);
const tmpV = new THREE.Vector3(), tmpQ = new THREE.Quaternion();

/* Build context: positions scale by (sx, sy, sz) so resized equipment keeps part shapes */
GP.ctx = (g, def, p) => {
  const sx = p.w / def.w, sy = p.h / def.h, sz = p.d / def.d;
  const X = x => x * sx, Y = y => y * sy, Z = z => z * sz;
  const c = { g, p, sx, sy, sz, W: p.w, D: p.d, H: p.h, w: def.w, d: def.d, h: def.h, X, Y, Z };
  const add = (mesh) => { g.add(mesh); return mesh; };
  /* box: center-x, bottom-y, center-z. opts.s = axes whose SIZE also stretches (e.g. 'xz') */
  c.box = (w, h, d, x, y, z, m, o) => {
    o = o || {}; const s = o.s || '';
    const W = s.includes('x') ? w * sx : w, Hh = s.includes('y') ? h * sy : h, Dd = s.includes('z') ? d * sz : d;
    const r = o.r || 0;
    const gg = geo(`rb${U.f3(W)},${U.f3(Hh)},${U.f3(Dd)},${U.f3(r)}`, () => r ? roundedBoxGeo(W, Hh, Dd, r, 2) : new THREE.BoxGeometry(W, Hh, Dd));
    const me = add(new THREE.Mesh(gg, m)); me.position.set(X(x), Y(y) + Hh / 2, Z(z));
    if (o.rx) me.rotation.x = o.rx; if (o.ry) me.rotation.y = o.ry; if (o.rz) me.rotation.z = o.rz;
    return me;
  };
  c.pad = (w, h, d, x, y, z, m, o) => c.box(w, h, d, x, y, z, m || M.pad, Object.assign({ r: Math.min(.035, h * .45, w * .3, d * .3) }, o || {}));
  /* cylinder: center position, axis 'x'|'y'|'z' */
  c.cyl = (r, len, x, y, z, m, ax, seg, o) => {
    o = o || {}; const L = o.stretch ? len * (ax === 'x' ? sx : ax === 'z' ? sz : sy) : len;
    const gg = geo(`cy${U.f3(r)},${U.f3(L)},${seg || 18}`, () => new THREE.CylinderGeometry(r, r, L, seg || 18));
    const me = add(new THREE.Mesh(gg, m)); me.position.set(X(x), Y(y), Z(z));
    if (ax === 'x') me.rotation.z = Math.PI / 2; else if (ax === 'z') me.rotation.x = Math.PI / 2;
    return me;
  };
  /* round tube through points [[x,y,z],...] with joints */
  c.tube = (pts, r, m, o) => {
    o = o || {}; const P = pts.map(q => new THREE.Vector3(X(q[0]), Y(q[1]), Z(q[2])));
    const seg = o.seg || 12;
    for (let i = 0; i < P.length - 1; i++) {
      const a = P[i], b = P[i + 1], L = a.distanceTo(b); if (L < 1e-4) continue;
      const gg = geo(`tu${U.f3(r)},${seg}`, () => new THREE.CylinderGeometry(r, r, 1, seg, 1, true));
      const me = add(new THREE.Mesh(gg, m));
      me.scale.set(1, L, 1); me.position.copy(a).add(b).multiplyScalar(.5);
      tmpV.copy(b).sub(a).normalize(); me.quaternion.setFromUnitVectors(UP, tmpV);
    }
    const js = o.caps === false ? P.slice(1, -1) : P;
    js.forEach(q => { const s = add(new THREE.Mesh(geo(`sp${U.f3(r)}`, () => new THREE.SphereGeometry(r, seg, 8)), m)); s.position.copy(q); });
  };
  /* rectangular (rounded) tube from a to b; w = width across, t = thickness across; up hint vector */
  c.bar = (a, b, w, t, m, o) => {
    o = o || {}; const A = new THREE.Vector3(X(a[0]), Y(a[1]), Z(a[2])), B = new THREE.Vector3(X(b[0]), Y(b[1]), Z(b[2]));
    const L = A.distanceTo(B); if (L < 1e-4) return;
    const r = Math.min(o.r ?? .008, w / 2.2, t / 2.2);
    const gg = geo(`bar${U.f3(w)},${U.f3(t)},${U.f3(r)}`, () => roundedBoxGeo(w, 1, t, r, 2));
    const me = add(new THREE.Mesh(gg, m)); me.scale.set(1, L + (o.ext || 0), 1); me.position.copy(A).add(B).multiplyScalar(.5);
    tmpV.copy(B).sub(A).normalize(); me.quaternion.setFromUnitVectors(UP, tmpV);
    if (o.twist) me.rotateY(o.twist);
    return me;
  };
  /* square frame tube (default frame member) */
  c.fr = (a, b, s, m) => c.bar(a, b, s || .06, s || .06, m || M.frame);
  /* olympic plate on axis ('x' or 'z') */
  c.plate = (r, t, x, y, z, ax, m) => {
    const gg = geo(`pl${U.f3(r)},${U.f3(t)}`, () => {
      const hub = Math.min(.05, r * .3);
      const pts = [new THREE.Vector2(.026, -t / 2), new THREE.Vector2(hub, -t / 2), new THREE.Vector2(hub + .01, -t * .3), new THREE.Vector2(r - .025, -t * .3), new THREE.Vector2(r, -t / 2), new THREE.Vector2(r, t / 2), new THREE.Vector2(r - .025, t * .3), new THREE.Vector2(hub + .01, t * .3), new THREE.Vector2(hub, t / 2), new THREE.Vector2(.026, t / 2)];
      return new THREE.LatheGeometry(pts, 28);
    });
    const me = add(new THREE.Mesh(gg, m || M.plate)); me.position.set(X(x), Y(y), Z(z));
    if (ax === 'x') me.rotation.z = Math.PI / 2; else if (ax === 'z') me.rotation.x = Math.PI / 2;
    return me;
  };
  c.disc = (r, t, x, y, z, ax, m, seg) => c.cyl(r, t, x, y, z, m, ax, seg || 32);
  c.foot = (x, z, s) => c.box(s || .09, .02, s || .09, x, 0, z, M.rubber);
  c.knob = (x, y, z, ax) => { c.cyl(.018, .05, x, y, z, M.accent, ax || 'x', 14); };
  c.grip = (a, b, r) => c.tube([a, b], r || .018, M.rubber);
  c.screen = (w, h, x, y, z, rx, m) => { rx = rx || 0; const f = c.box(w + .03, h + .03, .03, x, y - .015, z, M.body, { r: .008 }); f.rotation.x = rx; const s = c.box(w, h, .01, x, y, z, m || M.screen); s.rotation.x = rx; s.position.z += .014 * Math.cos(rx); s.position.y -= .014 * Math.sin(rx); return f; };
  c.pulley = (x, y, z, ax) => { c.disc(.05, .03, x, y, z, ax || 'x', M.chrome, 20); };
  c.cable = (a, b) => c.tube([a, b], .003, M.rubber, { seg: 5, caps: false });
  /* selectorized weight tower: x,z center; face = +1 (plates facing +Z) ; width w */
  c.tower = (x, z, h, o) => {
    o = o || {}; const w = o.w || .56, dep = o.dep || .3, face = o.face || 1;
    c.box(w + .08, .07, dep + .06, x, 0, z, M.frame, { r: .01 });
    c.box(w + .08, .08, dep + .04, x, h - .08, z, M.frame, { r: .012 });
    // uprights
    c.box(.07, h - .1, .07, x - w / 2, .05, z - face * dep * .35, M.frame, { r: .01 });
    c.box(.07, h - .1, .07, x + w / 2, .05, z - face * dep * .35, M.frame, { r: .01 });
    // weight plates stack
    const n = o.plates || 14, ph = .032, gap = .004; for (let i = 0; i < n; i++) c.box(.3, ph, .13, x, .12 + i * (ph + gap), z, M.stack, { r: .004 });
    c.box(.3, .08, .14, x, .12 + n * (ph + gap) + .01, z, M.frame2, { r: .008 });
    c.cyl(.011, h - .25, x - .1, .12 + (h - .25) / 2, z, M.chrome, 'y', 10); c.cyl(.011, h - .25, x + .1, .12 + (h - .25) / 2, z, M.chrome, 'y', 10);
    c.knob(x + .17, .3, z + face * .07, 'x');
    // shroud (tall glossy panel like DRAX Welliv)
    if (o.shroud !== false) {
      c.box(w + .06, h - .12, .02, x, .06, z + face * (dep / 2 + .005), M.shroud, { r: .006 });
      c.box(w + .06, h - .12, .02, x, .06, z - face * (dep / 2 + .005), M.shroud, { r: .006 });
      c.box(.14, .045, .005, x, h - .3, z + face * (dep / 2 + .02), M.logo);
    }
    return { top: h };
  };
  c.seat = (x, y, z, w, d, o) => { o = o || {}; c.box(.07, y - .06, .07, x, .05, z, M.frame, { r: .01 }); c.pad(w || .42, .09, d || .4, x, y - .06, z, M.pad, { rx: o.tilt || 0 }); c.knob(x + .07, y * .55, z, 'x'); };
  c.back = (x, y, z, w, h, tilt) => { const b = c.pad(w || .42, h || .6, .09, x, y, z, M.pad); b.rotation.x = tilt || 0; return b; };
  c.roller = (x, y, z, len, r) => { c.cyl(r || .06, len || .38, x, y, z, M.pad, 'x', 18); c.cyl(.012, (len || .38) + .08, x, y, z, M.chrome, 'x', 8); };
  c.baseFrame = (x0, z0, x1, z1, s) => { s = s || .08; c.fr([x0, s / 2, z0], [x1, s / 2, z0], s); c.fr([x0, s / 2, z1], [x1, s / 2, z1], s); c.fr([x0, s / 2, z0], [x0, s / 2, z1], s); c.fr([x1, s / 2, z0], [x1, s / 2, z1], s); [[x0, z0], [x1, z0], [x0, z1], [x1, z1]].forEach(([a, b]) => c.foot(a, b)); };
  c.horn = (x, y, z, ax, len, plates) => { c.cyl(.025, len || .28, x, y, z, M.chrome, ax, 12); (plates || []).forEach((pr, i) => { const off = (i - (plates.length - 1) / 2) * .055; if (ax === 'x') c.plate(pr, .045, x + off, y, z, 'x'); else if (ax === 'z') c.plate(pr, .045, x, y, z + off, 'z'); else c.plate(pr, .045, x, y + off, z, 'y'); }); };
  return c;
};

/* ---------- merge meshes by material (fewer draw calls) ---------- */
GP.mergeGroup = (group) => {
  group.updateMatrixWorld(true);
  const buckets = new Map();
  group.traverse(o => {
    if (!o.isMesh) return;
    let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    if (!g.attributes.normal) g.computeVertexNormals();
    g.applyMatrix4(o.matrixWorld);
    const keep = { position: g.attributes.position, normal: g.attributes.normal };
    const b = buckets.get(o.material) || []; b.push(keep); buckets.set(o.material, b);
  });
  const out = [];
  for (const [mat, list] of buckets) {
    let n = 0; list.forEach(a => n += a.position.count);
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3); let off = 0;
    list.forEach(a => { pos.set(a.position.array.subarray(0, a.position.count * 3), off * 3); nor.set(a.normal.array.subarray(0, a.normal.count * 3), off * 3); off += a.position.count; });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    g.computeBoundingSphere(); g.computeBoundingBox();
    out.push({ geometry: g, material: mat });
  }
  return out;
};
/* edges for CAD look, cached on geometry */
GP.edgesOf = (geom) => { if (!geom.userData.edges) geom.userData.edges = new THREE.EdgesGeometry(geom, 28); return geom.userData.edges; };
})();
