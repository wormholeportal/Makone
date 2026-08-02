// forms.js — the shapes a made object is full of and three has no primitive for.
//
// Promoted here by the rule of three: a knurled ring was written for a camera's focus ring,
// then the bicycle's sprockets, then the espresso machine's group head — three worlds, one shape.
// Everything in this file is PURE GEOMETRY or a generated texture: no scene, no lights, no
// materials, so a part can call it and stay a pure build(params) -> Object3D (D7).
//
//   import { fluteGeo, tube, scaleTexture } from '/runtime/forms.js';
//
// Units are metres, and every helper says which way its axis points, because half the cost of
// assembling an object is finding out that a lathe runs on +Y and a torus on +Z.
import * as THREE from 'three';

const UP = new THREE.Vector3(0, 1, 0);

// ---------------------------------------------------------------------------
// turned and knurled

/** A fluted ring — knurling on a focus ring, a dial rim, a knob. Axis +Y, centred on the origin.
 *  ONE extruded polygon whose radius alternates, so 48 flutes cost one geometry and one draw
 *  call instead of 48 little boxes. The extrude's side faces do not share vertices, so the
 *  facets stay crisp without flatShading. */
export function fluteGeo(rOuter, rInner, h, teeth) {
  const shape = new THREE.Shape();
  const n = teeth * 2;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = i % 2 ? rInner : rOuter;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    if (i) shape.lineTo(x, y); else shape.moveTo(x, y);
  }
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false, curveSegments: 1 });
  g.translate(0, 0, -h / 2);
  g.rotateX(-Math.PI / 2);                 // extrude runs along +Z; put the axis on +Y
  return g;
}

/** A knurled BAND — the grip on a focus ring, a drum, a crown, a thumbwheel. Axis +Y, centred
 *  on the origin, and unlike `fluteGeo` it is a ring with a bore, so it slips over a smooth root
 *  cylinder instead of being a solid puck whose end caps fight whatever collar sits against them.
 *
 *  The tooth count comes from `pitch` — the arc between crests, in metres — and that is the
 *  whole point: 46 flutes on a ø64 focus ring is a 4.4mm pitch, which reads as a sprocket. Real
 *  knurling runs 0.8–1.5mm and milled scallops 2–4mm, so pitch is the number you actually know.
 *  Each tooth has a flat crest and a flat root, because a knurl is rolled and never comes to a
 *  point; `crest` and `root` are those flats as a fraction of the pitch.
 *
 *  @param {number} rCrest  radius of the tooth crests
 *  @param {number} h       height of the band along +Y
 */
export function knurlGeo(rCrest, h, { pitch = 0.0012, depth = null, bore = null,
  crest = 0.34, root = 0.26 } = {}) {
  const d = depth ?? Math.max(pitch * 0.38, 0.0001);
  const teeth = Math.max(12, Math.round((Math.PI * 2 * rCrest) / pitch));
  const rRoot = rCrest - d;
  const ramp = (1 - crest - root) / 2;
  const profile = [[0, rCrest], [crest, rCrest], [crest + ramp, rRoot], [crest + ramp + root, rRoot]];
  const shape = new THREE.Shape();
  let started = false;
  for (let i = 0; i < teeth; i++) {
    for (const [f, r] of profile) {
      const a = ((i + f) / teeth) * Math.PI * 2;
      const x = Math.cos(a) * r, y = Math.sin(a) * r;
      if (started) shape.lineTo(x, y); else { shape.moveTo(x, y); started = true; }
    }
  }
  shape.closePath();
  const hole = new THREE.Path();
  hole.absarc(0, 0, bore ?? rRoot * 0.88, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  // curveSegments is for the BORE — the tooth outline is all lineTo and does not care.
  const g = new THREE.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false, curveSegments: 48 });
  g.translate(0, 0, -h / 2);
  g.rotateX(-Math.PI / 2);
  return g;
}

/** A toothed disc — chainring, sprocket, cog, gear wheel. Axis +Z (a gear stands in the XY
 *  plane, like a wheel). `holeFrac` is most of the disc on purpose: a chainring is a rim of
 *  teeth on a spider, and a solid plate with teeth round it reads as a saw blade. */
export function sprocketGeo(rOuter, teeth, thickness, { toothH = null, holeFrac = 0.42 } = {}) {
  const th = toothH ?? Math.min(rOuter * 0.10, ((Math.PI * rOuter) / teeth) * 0.9);
  const shape = new THREE.Shape();
  const n = teeth * 2;
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    const r = i % 2 ? rOuter - th : rOuter;
    const x = Math.cos(t) * r, y = Math.sin(t) * r;
    if (i) shape.lineTo(x, y); else shape.moveTo(x, y);
  }
  shape.closePath();
  if (holeFrac > 0) {
    const hole = new THREE.Path();
    hole.absarc(0, 0, rOuter * holeFrac, 0, Math.PI * 2, true);
    shape.holes.push(hole);
  }
  // curveSegments has to be high enough for the HOLE: the tooth outline is all lineTo and does
  // not care, but at curveSegments 1 the bore comes out as a triangle.
  const g = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false, curveSegments: 28 });
  g.translate(0, 0, -thickness / 2);
  return g;
}

// ---------------------------------------------------------------------------
// tubes

/** A tube from a to b (Vector3 or [x,y,z]), tapering r0 → r1. A whole bike frame is this call.
 *  Returns a Mesh, so the caller owns the material. */
export function tube(a, b, r0, r1 = r0, mat, seg = 16) {
  const A = Array.isArray(a) ? new THREE.Vector3(...a) : a.clone();
  const B = Array.isArray(b) ? new THREE.Vector3(...b) : b.clone();
  const dir = B.clone().sub(A);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, dir.length(), seg, 1, false), mat);
  m.position.copy(A).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(UP, dir.normalize());
  m.castShadow = m.receiveShadow = true;
  return m;
}

/** A tube that bends: a fork blade, a handlebar, a lamp's cable, a steam wand. Points in order;
 *  the curve is centripetal Catmull-Rom, which — unlike the plain kind — does not overshoot
 *  when the points are unevenly spaced. */
export function bentTube(points, r, mat, { seg = 40, radial = 12, closed = false } = {}) {
  const curve = new THREE.CatmullRomCurve3(
    points.map((p) => (Array.isArray(p) ? new THREE.Vector3(...p) : p)), closed, 'centripetal');
  const m = new THREE.Mesh(new THREE.TubeGeometry(curve, seg, r, radial, closed), mat);
  m.castShadow = m.receiveShadow = true;
  return m;
}

// ---------------------------------------------------------------------------
// shells

/** A stadium in plan — round ends, straight sides — filleted along the top and bottom edges.
 *  Axis +Y, sitting on y=0. A camera body, a radio case, a cigarette lighter.
 *
 *  three's bevel grows the profile OUTWARD by bevelSize, so the shape is drawn `b` smaller all
 *  round; without that a 142mm camera body measures 149mm and nobody notices until the facts
 *  table says so. */
export function shellGeo(w, d, h, planR, bevel) {
  const b = Math.min(bevel, planR * 0.5, h / 2 - 1e-4);
  const W = w - b * 2, D = d - b * 2;
  const r = Math.min(planR - b, D / 2 - 1e-4);
  const s = new THREE.Shape();
  const x0 = -W / 2 + r, x1 = W / 2 - r, y0 = -D / 2 + r, y1 = D / 2 - r;
  s.moveTo(x0, -D / 2);
  s.lineTo(x1, -D / 2);
  s.absarc(x1, y0, r, -Math.PI / 2, 0, false);
  s.lineTo(W / 2, y1);
  s.absarc(x1, y1, r, 0, Math.PI / 2, false);
  s.lineTo(x0, D / 2);
  s.absarc(x0, y1, r, Math.PI / 2, Math.PI, false);
  s.lineTo(-W / 2, y0);
  s.absarc(x0, y0, r, Math.PI, Math.PI * 1.5, false);
  const g = new THREE.ExtrudeGeometry(s, {
    depth: h - b * 2, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 3,
    curveSegments: 14,
  });
  g.rotateX(-Math.PI / 2);
  g.translate(0, b, 0);                    // the bevel starts below zero; put the base on y=0
  return g;
}

/** A prismoid: rectangle w0×d0 at y=0, rectangle w1×d1 at y=h, the top one shifted dz.
 *  Four flat slopes and no curvature anywhere — an SLR's pentaprism hump, a chamfered plinth.
 *  Non-indexed, so every face is flat. */
export function prismoid(w0, d0, w1, d1, h, dz = 0) {
  const b = [[-w0 / 2, 0, d0 / 2], [w0 / 2, 0, d0 / 2], [w0 / 2, 0, -d0 / 2], [-w0 / 2, 0, -d0 / 2]];
  const t = [[-w1 / 2, h, d1 / 2 + dz], [w1 / 2, h, d1 / 2 + dz],
    [w1 / 2, h, -d1 / 2 + dz], [-w1 / 2, h, -d1 / 2 + dz]];
  const pos = [];
  const quad = (a, b_, c, d) => { pos.push(...a, ...b_, ...c, ...a, ...c, ...d); };
  for (let i = 0; i < 4; i++) quad(b[i], b[(i + 1) % 4], t[(i + 1) % 4], t[i]);
  quad(t[0], t[1], t[2], t[3]);
  quad(b[3], b[2], b[1], b[0]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

// ---------------------------------------------------------------------------
// drawn surfaces — generated, never downloaded (D4)

/** A strip of engraved marks to wrap round a barrel: f-stops, a distance scale, a fuel gauge.
 *  Maps onto an open CylinderGeometry, whose u runs once round the circumference. */
export function scaleTexture(labels, { bg = '#1b1d21', fg = '#e8e3d8', accent = '#b2372c',
  accentAt = -1, ticks = true } = {}) {
  const W = 1024, H = 128;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d');
  x.fillStyle = bg;
  x.fillRect(0, 0, W, H);
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.font = `600 ${Math.round(H * 0.44)}px ui-sans-serif, Helvetica, Arial, sans-serif`;
  labels.forEach((label, i) => {
    const u = ((i + 0.5) / labels.length) * W;
    x.fillStyle = i === accentAt ? accent : fg;
    x.fillText(label, u, H * 0.56);
    if (ticks) {
      x.fillRect(u - 1.5, 0, 3, H * 0.17);
      x.fillRect(u - 1.5, H * 0.86, 3, H * 0.14);
    }
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** Numbers around a disc: a shutter speed dial, a pressure gauge, a clock face. Maps onto a
 *  CircleGeometry, whose uv runs 0..1 across the diameter — so radius 0.5 in uv is the rim. */
export function dialTexture(labels, { bg = '#c6c9cf', fg = '#1a1c20', accent = '#b2372c',
  accentAt = -1, radius = 0.355, size = 512, font = 0.075, ticks = 0 } = {}) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const x = c.getContext('2d');
  x.fillStyle = bg;
  x.fillRect(0, 0, size, size);
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  if (ticks) {
    x.strokeStyle = fg;
    x.lineWidth = size * 0.006;
    for (let i = 0; i < ticks; i++) {
      const a = (i / ticks) * Math.PI * 2;
      const r0 = size * (radius + 0.045), r1 = size * (radius + 0.075);
      x.beginPath();
      x.moveTo(size / 2 + Math.sin(a) * r0, size / 2 - Math.cos(a) * r0);
      x.lineTo(size / 2 + Math.sin(a) * r1, size / 2 - Math.cos(a) * r1);
      x.stroke();
    }
  }
  x.font = `700 ${Math.round(size * font)}px ui-sans-serif, Helvetica, Arial, sans-serif`;
  labels.forEach((label, i) => {
    const a = (i / labels.length) * Math.PI * 2;
    x.save();
    x.translate(size / 2 + Math.sin(a) * size * radius, size / 2 - Math.cos(a) * size * radius);
    x.rotate(a);
    x.fillStyle = i === accentAt ? accent : fg;
    x.fillText(label, 0, 0);
    x.restore();
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** Value noise as a bump map: leather grain, cast iron, unglazed clay, sand.
 *  A fixed seed, so a world renders the same twice. Use as `bumpMap`, never as `map` —
 *  it is a surface, not a colour. */
export function grainTexture({ size = 256, repeat = [10, 4], cell = 6, sharp = 0.32,
  seed = 20250731 } = {}) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const x = c.getContext('2d');
  const img = x.createImageData(size, size);
  let s = seed;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const grid = [];
  for (let i = 0; i <= size / cell + 1; i++) {
    grid[i] = [];
    for (let j = 0; j <= size / cell + 1; j++) grid[i][j] = rnd();
  }
  const smooth = (a, b, t) => a + (b - a) * t * t * (3 - 2 * t);
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const gx = px / cell, gy = py / cell;
      const i = Math.floor(gx), j = Math.floor(gy);
      const fx = gx - i, fy = gy - j;
      const v = smooth(smooth(grid[i][j], grid[i + 1][j], fx),
        smooth(grid[i][j + 1], grid[i + 1][j + 1], fx), fy);
      const n = Math.round((v * (1 - sharp) + rnd() * sharp) * 255);
      const k = (py * size + px) * 4;
      img.data[k] = img.data[k + 1] = img.data[k + 2] = n;
      img.data[k + 3] = 255;
    }
  }
  x.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat[0], repeat[1]);
  return tex;
}
