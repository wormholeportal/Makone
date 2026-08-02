// forms.js — the shapes and drawn surfaces that are this world's own. Tubes, sprockets and the
// rest were promoted to /runtime/forms.js once a third world wanted them (rule of three); a laced
// wheel, a lug shoreline, a chain link and a roll of bar tape are still a bicycle's own business.
//
// Everything here is PURE GEOMETRY or a generated texture — no scene, no lights, no materials —
// so a part can call it and stay a pure build(params) -> Object3D (D7).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const UP = new THREE.Vector3(0, 1, 0);

// ---------------------------------------------------------------------------
// placing and merging
//
// A bicycle is fifty small chromed things, and fifty small chromed things are fifty draw calls
// unless they are welded together first. Everything static and same-material in this world goes
// through merge(): bolts, ferrules, rivets, lug liners, cassette sprockets.

/** One geometry out of many already-positioned ones. Null entries are ignored.
 *
 *  mergeGeometries is fussy in two ways that bite the moment a lathe meets an extrude:
 *  ExtrudeGeometry is non-indexed and nearly everything else is indexed, and a geometry with an
 *  extra attribute poisons the whole batch. Both are normalised here rather than at forty call
 *  sites. */
export function merge(geos) {
  const list = geos.filter(Boolean);
  if (list.length === 1) return list[0];
  const mixed = list.some((g) => g.index) && list.some((g) => !g.index);
  const norm = mixed ? list.map((g) => (g.index ? g.toNonIndexed() : g)) : list;
  const shared = Object.keys(norm[0].attributes)
    .filter((k) => norm.every((g) => g.attributes[k]));
  for (const g of norm) {
    for (const k of Object.keys(g.attributes)) if (!shared.includes(k)) g.deleteAttribute(k);
  }
  return mergeGeometries(norm, false);
}

/** A rotation whose local +Y is `dirY` and whose local +Z leans toward `dirZ`. Needed whenever a
 *  detail has to face a direction as well as follow a tube: a head badge is on the FRONT of the
 *  head tube, and a quaternion built from the tube axis alone puts it wherever it lands. */
export function frame3(dirY, dirZ) {
  const y = new THREE.Vector3(...dirY).normalize();
  const z = new THREE.Vector3(...dirZ).normalize();
  z.addScaledVector(y, -y.dot(z)).normalize();          // orthogonalise against the axis
  const x = new THREE.Vector3().crossVectors(y, z);
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
}

/** Move a geometry built along +Y from the origin so it starts at `at` and runs along `dir`.
 *  Pass `roll` to also fix which way its local +Z looks. Mutates and returns the geometry. */
export function alongGeo(geo, at, dir, roll = null) {
  const q = roll ? frame3(dir, roll)
    : new THREE.Quaternion().setFromUnitVectors(UP, new THREE.Vector3(...dir).normalize());
  return geo.applyMatrix4(new THREE.Matrix4().compose(
    new THREE.Vector3(...at), q, new THREE.Vector3(1, 1, 1)));
}

/** A tapering cylinder from a to b, as GEOMETRY in world position — the merge-friendly twin of
 *  runtime/forms.js `tube`. */
export function tubeGeo(a, b, r0, r1 = r0, seg = 16) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const dir = B.clone().sub(A);
  const g = new THREE.CylinderGeometry(r1, r0, dir.length(), seg, 1, false);
  g.translate(0, dir.length() / 2, 0);
  return alongGeo(g, A.toArray(), dir.normalize().toArray());
}

/** A swept tube whose radius changes along its length: a fork blade that thins toward the
 *  dropout, a seat stay, a brake arm. `radii` is sampled evenly along the curve — [r0, r1] is a
 *  plain taper, [r0, rMid, r1] bulges or waists in the middle.
 *
 *  TubeGeometry has no per-station radius, so it is built at radius 1 and each ring is scaled
 *  about its own centre afterwards. That centre is the mean of the ring's vertices — which is the
 *  curve point whatever frame three chose, and needs no assumption about getPoint vs getPointAt.
 *
 *  The last vertex of every ring is a DUPLICATE of the first (uv seam). Averaging it in shifts
 *  the centre by r/(radial+1), and since the tube is built at r = 1 that is a 143mm error on a
 *  6-sided tube: the scaled ring lands a hand's width off the curve and the part comes out as a
 *  giant hook. Sum the distinct vertices only. */
export function taperedTubeGeo(points, radii, { seg = 40, radial = 12, closed = false } = {}) {
  const curve = new THREE.CatmullRomCurve3(
    points.map((p) => (Array.isArray(p) ? new THREE.Vector3(...p) : p)), closed, 'centripetal');
  const g = new THREE.TubeGeometry(curve, seg, 1, radial, closed);
  const pos = g.attributes.position;
  const ring = radial + 1;
  const c = new THREE.Vector3(), v = new THREE.Vector3();
  for (let i = 0; i <= seg; i++) {
    const f = (i / seg) * (radii.length - 1);
    const k = Math.min(Math.floor(f), radii.length - 2);
    const r = radii[k] + (radii[k + 1] - radii[k]) * (f - k);
    c.set(0, 0, 0);
    for (let j = 0; j < radial; j++) c.add(v.fromBufferAttribute(pos, i * ring + j));
    c.multiplyScalar(1 / radial);
    for (let j = 0; j < ring; j++) {
      v.fromBufferAttribute(pos, i * ring + j).sub(c).multiplyScalar(r).add(c);
      pos.setXYZ(i * ring + j, v.x, v.y, v.z);
    }
  }
  g.computeVertexNormals();
  return g;
}

// ---------------------------------------------------------------------------
// lugwork

/** A lug: the chromed sleeve where two tubes meet, plus the SHORELINES — the two or three points
 *  that run on up the tube past the sleeve and taper into it. Those points are the whole reason a
 *  lugged frame reads as built rather than welded; a plain sleeve reads as a hose clamp.
 *
 *  Each point is an open cone shell whose tip radius is UNDER the tube's, so it disappears into
 *  the paint exactly where a filed lug does. Returns one geometry — a lug is one draw call. */
export function lugGeo(at, dir, len, r, { points = 3, tip = 0.9, phase = 0.4 } = {}) {
  const d = new THREE.Vector3(...dir).normalize();
  const end = new THREE.Vector3(...at).addScaledVector(d, len);
  const parts = [tubeGeo(at, end.toArray(), r, r * 0.95, 20)];
  const base = new THREE.Vector3(...at).addScaledVector(d, len * 0.58);
  for (let k = 0; k < points; k++) {
    const span = ((Math.PI * 2) / points) * 0.46;
    const t0 = (k / points) * Math.PI * 2 + phase - span / 2;
    const L = len * tip;
    const s = new THREE.CylinderGeometry(r * 0.955, r * 1.010, L, 10, 1, true, t0, span);
    s.translate(0, L / 2, 0);
    parts.push(alongGeo(s, base.toArray(), d.toArray()));
  }
  return merge(parts);
}

/** The gold line a painter runs round the edge of a lug. One thin torus per edge — merged with
 *  the rest it costs the frame a single draw call, and it is the difference between "a red
 *  frame" and "a painted frame". */
export function linerGeo(at, dir, r) {
  return alongGeo(new THREE.TorusGeometry(r, 0.00075, 6, 40).rotateX(Math.PI / 2), at, dir);
}

// ---------------------------------------------------------------------------
// the wheel

/** 32 spokes as ONE draw call, and their nipples as a second. Three-cross lacing: each spoke
 *  leaves the flange `cross` holes away from its rim hole, alternating sides — which is why a
 *  wheel photographs as a weave and not as a sunburst.
 *
 *  The nipple belongs HERE and not in the wheel part: it sits on the spoke's own line, and the
 *  only place that line exists is this loop. */
export function lacing(p) {
  const spokes = { geo: new THREE.CylinderGeometry(0.00095, 0.00080, 1, 5), m: [] };
  const nipples = {
    geo: merge([
      new THREE.CylinderGeometry(0.0021, 0.0026, 0.0110, 8).translate(0, -0.0055, 0),
      new THREE.CylinderGeometry(0.0030, 0.0030, 0.0032, 8).translate(0, 0.0016, 0),
    ]),
    m: [],
  };
  const q = new THREE.Quaternion();
  const one = new THREE.Vector3(1, 1, 1);
  const from = new THREE.Vector3(), to = new THREE.Vector3(), mid = new THREE.Vector3();
  for (let i = 0; i < p.spokes; i++) {
    const side = i % 2 ? 1 : -1;
    const flangeA = ((i / p.spokes) * Math.PI * 2) + (side > 0 ? Math.PI / p.spokes : 0);
    const rimA = flangeA + (side * p.cross * 2 * Math.PI * 2) / p.spokes;
    from.set(Math.cos(flangeA) * p.flangeR, Math.sin(flangeA) * p.flangeR, (side * p.flangeGap) / 2);
    to.set(Math.cos(rimA) * (p.rimR - p.rimDepth), Math.sin(rimA) * (p.rimR - p.rimDepth), 0);
    const dir = to.clone().sub(from);
    const len = dir.length();
    q.setFromUnitVectors(UP, dir.clone().normalize());
    mid.copy(from).addScaledVector(dir, 0.5);
    spokes.m.push(new THREE.Matrix4().compose(mid, q, new THREE.Vector3(1, len, 1)));
    nipples.m.push(new THREE.Matrix4().compose(to.clone(), q.clone(), one));
  }
  return { spokes, nipples };
}

/** An InstancedMesh out of what `lacing` returned. */
export function instanced({ geo, m }, mat) {
  const mesh = new THREE.InstancedMesh(geo, mat, m.length);
  m.forEach((mat4, i) => mesh.setMatrixAt(i, mat4));
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = true;
  return mesh;
}

// ---------------------------------------------------------------------------
// the chain
//
// A chain is not a tube. It is ~110 rollers on a closed path with side plates bridging them, and
// at any zoom past "thumbnail" a smooth tube reads as a wire coat hanger. Three instanced meshes,
// driven by ONE number — how far the chain has run — so it moves when the cranks turn.

/** The peanut-shaped side plate every bicycle chain has had since 1880. */
export function chainPlateGeo(pitch, h, t) {
  const hp = pitch / 2, r = h / 2;
  const s = new THREE.Shape();
  s.moveTo(-hp, r);
  s.quadraticCurveTo(0, r * 0.58, hp, r);
  s.absarc(hp, 0, r, Math.PI / 2, -Math.PI / 2, true);
  s.quadraticCurveTo(0, -r * 0.58, -hp, -r);
  s.absarc(-hp, 0, r, -Math.PI / 2, -Math.PI * 1.5, true);
  return new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: false, curveSegments: 6 })
    .translate(0, 0, -t / 2);
}

/** Lay a chain on a closed curve. Returns the three instanced meshes and `place(distance)`,
 *  which is the only thing the animation has to call. */
export function chainRun(curve, C, mats) {
  const total = curve.getLength();
  const n = Math.round(total / C.pitch / 2) * 2;        // even: outer and inner plates alternate
  const pitch = total / n;
  // Sampling the curve 6× per link ONCE, then walking the table, keeps a 110-link chain off
  // getPointAt's binary search every frame.
  const FINE = 6, TOTAL = n * FINE;
  const pts = curve.getSpacedPoints(TOTAL);

  const rollerGeo = merge([
    new THREE.CylinderGeometry(C.rollerR, C.rollerR, C.rollerW, 10).rotateX(Math.PI / 2),
    new THREE.CylinderGeometry(0.0016, 0.0016, (C.outerZ + C.plateT) * 2 + 0.0016, 6)
      .rotateX(Math.PI / 2),
  ]);
  const plateGeo = chainPlateGeo(pitch, C.plateH, C.plateT);
  const rollers = new THREE.InstancedMesh(rollerGeo, mats.roller, n);
  const outer = new THREE.InstancedMesh(plateGeo, mats.plate, n);
  const inner = new THREE.InstancedMesh(plateGeo, mats.plate, n);
  for (const mesh of [rollers, outer, inner]) mesh.castShadow = true;

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const Z = new THREE.Vector3(0, 0, 1);
  const one = new THREE.Vector3(1, 1, 1);
  const p0 = new THREE.Vector3(), p1 = new THREE.Vector3(), d = new THREE.Vector3();
  const mid = new THREE.Vector3();
  const at = (out, dist) => {
    let f = ((dist / total) * TOTAL) % TOTAL;
    if (f < 0) f += TOTAL;
    const i0 = Math.floor(f);
    return out.copy(pts[i0 % TOTAL]).lerp(pts[(i0 + 1) % TOTAL], f - i0);
  };

  const place = (dist) => {
    for (let i = 0; i < n; i++) {
      at(p0, dist + i * pitch);
      at(p1, dist + (i + 1) * pitch);
      rollers.setMatrixAt(i, m.compose(p0, q.identity(), one));
      d.copy(p1).sub(p0);
      q.setFromAxisAngle(Z, Math.atan2(d.y, d.x));
      const target = i % 2 ? inner : outer;
      const z = i % 2 ? C.innerZ : C.outerZ;
      for (const sz of [-1, 1]) {
        mid.copy(p0).addScaledVector(d, 0.5);
        mid.z += sz * z;
        target.setMatrixAt(i + (sz > 0 ? 1 : 0) - (i % 2 ? 1 : 0), m.compose(mid, q, one));
      }
    }
    rollers.instanceMatrix.needsUpdate = true;
    outer.instanceMatrix.needsUpdate = true;
    inner.instanceMatrix.needsUpdate = true;
  };

  return { links: n, pitch, place, meshes: [rollers, outer, inner] };
}

// ---------------------------------------------------------------------------
// drawn surfaces — generated, never downloaded (D4)

const canvas = (w, h) => {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
};

const finish = (c, { repeat = [1, 1] } = {}) => {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(...repeat);
  t.anisotropy = 8;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

/** Bar tape, as it is actually applied: one diagonal seam per tile, tiled ~34 times along the
 *  bar, which comes out of TubeGeometry's uv (u along the bar, v around it) as a helix. Tape you
 *  can count the turns of is the difference between a taped bar and a black tube. */
export function tapeTexture({ base = '#1d1f24', seam = '#0a0b0e', gloss = '#3d424b' } = {}) {
  const [c, x] = canvas(64, 64);
  x.fillStyle = base;
  x.fillRect(0, 0, 64, 64);
  for (const [w, style] of [[3.2, seam], [1.4, gloss]]) {
    x.lineWidth = w;
    x.strokeStyle = style;
    for (const dx of [-64, 0, 64]) {                    // three copies so the diagonal wraps
      x.beginPath();
      x.moveTo(dx + (style === gloss ? 6 : 0), 0);
      x.lineTo(dx + 64 + (style === gloss ? 6 : 0), 64);
      x.stroke();
    }
  }
  return finish(c, { repeat: [34, 1] });
}

/** A file tread: fine chevrons on the crown of the tyre. Lathe uv runs u round the wheel, so the
 *  pattern repeats 90 times round and once across the profile. */
export function treadTexture() {
  const [c, x] = canvas(32, 64);
  x.fillStyle = '#26282d';
  x.fillRect(0, 0, 32, 64);
  x.strokeStyle = '#141519';
  x.lineWidth = 4;
  x.beginPath();
  x.moveTo(-4, 0); x.lineTo(16, 32); x.lineTo(-4, 64);
  x.moveTo(28, 0); x.lineTo(48, 32); x.lineTo(28, 64);
  x.stroke();
  return finish(c, { repeat: [90, 1] });
}

/** The gum sidewall with its size moulded into it. Torus uv: u round the wheel, v round the
 *  cross-section — so the two text bands sit where the sidewall is, and the tread's own lathe
 *  covers the crown between them. */
export function sidewallTexture(label = '700 × 25C') {
  const [c, x] = canvas(512, 256);
  x.fillStyle = '#a8794c';
  x.fillRect(0, 0, 512, 256);
  // v = 0.5 is the far side of the casing, right where it tucks into the rim: that is where the
  // bead shadow belongs, not at v = 0 (the crown, which the tread covers).
  x.fillStyle = 'rgba(0,0,0,0.17)';
  x.fillRect(0, 112, 512, 32);
  x.font = '600 30px ui-sans-serif, Helvetica, Arial, sans-serif';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  for (const [y, flip] of [[48, false], [208, true]]) {
    x.save();
    x.translate(256, y);
    if (flip) x.scale(1, -1);
    x.fillStyle = '#43301d';
    x.fillText(label, 0, 0);
    x.restore();
  }
  return finish(c, { repeat: [5, 1] });
}

/** A decal: lettering on a transparent ground, for wrapping round a painted tube. The text is
 *  drawn turned 90°, because on a cylinder u runs AROUND and v ALONG — and a down tube decal
 *  reads along the tube. */
export function decalTexture(text, { fg = '#f2efe6', accent = null, size = 74 } = {}) {
  const [c, x] = canvas(256, 1024);
  x.clearRect(0, 0, 256, 1024);
  x.save();
  x.translate(128, 512);
  x.rotate(-Math.PI / 2);
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.font = `800 ${size}px ui-sans-serif, Helvetica, Arial, sans-serif`;
  if (accent) {
    x.strokeStyle = accent;
    x.lineWidth = 7;
    x.lineJoin = 'round';
    x.strokeText(text, 0, 0);
  }
  x.fillStyle = fg;
  x.fillText(text, 0, 0);
  x.restore();
  const t = finish(c);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

/** The head badge: a shield with a letter in it, alpha-tested onto a curved plate on the front of
 *  the head tube. Every frame worth the name has one. */
export function badgeTexture(letter = 'M') {
  const [c, x] = canvas(256, 384);
  x.clearRect(0, 0, 256, 384);
  x.beginPath();
  x.moveTo(40, 20); x.lineTo(216, 20); x.lineTo(216, 246);
  x.quadraticCurveTo(216, 328, 128, 366);
  x.quadraticCurveTo(40, 328, 40, 246);
  x.closePath();
  x.fillStyle = '#c8a44a';
  x.fill();
  x.lineWidth = 9;
  x.strokeStyle = '#6d1420';
  x.stroke();
  x.fillStyle = '#6d1420';
  x.fillRect(56, 168, 144, 12);
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.font = '800 132px ui-serif, Georgia, serif';
  x.fillText(letter, 128, 108);
  x.font = '700 30px ui-sans-serif, Helvetica, Arial, sans-serif';
  x.fillText('CYCLES', 128, 240);
  return finish(c);
}
