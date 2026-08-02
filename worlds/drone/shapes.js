// shapes.js — the CAD vocabulary this aircraft is built from.
//
// Three things separate a moulded product from a pile of primitives, and all three are here:
//
//   1. FILLETS. Nothing on a moulded part meets at a knife edge. Every solid below is a convex
//      hull of spheres, which is a fillet by construction — the radius is the sphere radius.
//   2. CREASE NORMALS. Manifold hands back a triangle soup; three's computeVertexNormals on a
//      non-indexed buffer then shades every facet flat, so a 20-segment fillet reads as a
//      20-sided prism. `smooth()` averages normals only across edges gentler than a threshold:
//      the fillet goes smooth, the chamfer it runs into stays sharp. That one function is the
//      difference between "faceted grey lump" and "moulded".
//   3. CUT FEATURES, NOT STUCK-ON ONES. A vent is a slot removed from the wall, a screw sits in
//      a counterbore sunk into the surface, a panel line is a groove. `engrave()` cuts a groove
//      that follows the skin, because a slab subtracted from a solid body leaves a gash, not a
//      panel line.
//
// Everything degrades: if manifold failed to load, `csg()` falls back to the plain primitive the
// caller passes, and the aircraft is coarse instead of missing.
import * as THREE from 'three';
import * as MK from '/runtime/solid.js';

export const D2R = Math.PI / 180;

// ---------------------------------------------------------------------------
// normals

/** Average vertex normals only across edges whose faces meet at less than `deg`.
 *  Sharper than that and the vertex keeps its own face normal — so fillets are smooth and the
 *  edges they blend into stay crisp. Works on non-indexed geometry (what MK.toGeometry returns). */
export function smooth(geo, deg = 38) {
  const pos = geo.getAttribute('position');
  const n = pos.count / 3;
  const fn = new Float32Array(n * 3);
  const ax = new THREE.Vector3(), bx = new THREE.Vector3(), cx = new THREE.Vector3();
  const e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), nv = new THREE.Vector3();
  for (let f = 0; f < n; f++) {
    ax.fromBufferAttribute(pos, f * 3); bx.fromBufferAttribute(pos, f * 3 + 1); cx.fromBufferAttribute(pos, f * 3 + 2);
    e1.subVectors(bx, ax); e2.subVectors(cx, ax);
    nv.crossVectors(e1, e2).normalize();
    fn[f * 3] = nv.x; fn[f * 3 + 1] = nv.y; fn[f * 3 + 2] = nv.z;
  }
  // bucket every corner by welded position
  const at = new Map();
  const key = (i) => `${Math.round(pos.getX(i) * 1e5)},${Math.round(pos.getY(i) * 1e5)},${Math.round(pos.getZ(i) * 1e5)}`;
  for (let i = 0; i < pos.count; i++) {
    const k = key(i);
    let list = at.get(k);
    if (!list) at.set(k, (list = []));
    list.push(i);
  }
  const cos = Math.cos(deg * D2R);
  const out = new Float32Array(pos.count * 3);
  const acc = new THREE.Vector3();
  for (const list of at.values()) {
    for (const i of list) {
      const f = (i / 3) | 0;
      acc.set(0, 0, 0);
      for (const j of list) {
        const g = (j / 3) | 0;
        const d = fn[f * 3] * fn[g * 3] + fn[f * 3 + 1] * fn[g * 3 + 1] + fn[f * 3 + 2] * fn[g * 3 + 2];
        if (d >= cos) { acc.x += fn[g * 3]; acc.y += fn[g * 3 + 1]; acc.z += fn[g * 3 + 2]; }
      }
      acc.normalize();
      out[i * 3] = acc.x; out[i * 3 + 1] = acc.y; out[i * 3 + 2] = acc.z;
    }
  }
  geo.setAttribute('normal', new THREE.BufferAttribute(out, 3));
  return geo;
}

// ---------------------------------------------------------------------------
// solids (manifold)

export const ball = (x, y, z, r, seg = 18) => MK.sphere(r, seg).translate([x, y, z]);

/** Rounded box as a hull of its eight corner spheres: r IS the fillet radius. */
export function rb(w, h, d, r, seg = 18, at = [0, 0, 0]) {
  const s = [];
  for (const x of [-(w / 2 - r), w / 2 - r])
    for (const y of [-(h / 2 - r), h / 2 - r])
      for (const z of [-(d / 2 - r), d / 2 - r]) s.push(ball(at[0] + x, at[1] + y, at[2] + z, r, seg));
  return MK.hull(...s);
}

/** A lofted shell from cross-sections: each station is {z, top, bot, halfW, r}. The hull of all
 *  their corner spheres — one convex body, filleted everywhere, tapering exactly as the numbers
 *  say. `inset` shrinks the skin inward, which is how the inner solid for engrave() is made. */
export function loft(stations, inset = 0, seg = 18) {
  const s = [];
  stations.forEach((st, i) => {
    const r = Math.max(st.r - inset * 0.4, 0.0015);
    const hw = st.halfW - inset, top = st.top - inset, bot = st.bot + inset;
    // the end sections pull IN by their own radius, so the hull stops exactly at the station
    // plane. Leave them on it and the body runs a fillet's worth past its own nose — and every
    // feature cut into that nose ends up buried inside solid material, invisible and unfindable.
    const z = st.z + (i === 0 ? r + inset : i === stations.length - 1 ? -r - inset : 0);
    for (const x of [-(hw - r), hw - r])
      for (const y of [bot + r, top - r]) s.push(ball(x, y, z, r, seg));
  });
  return MK.hull(...s);
}

/** Cylinder along Y (manifold's own is along Z). */
export const cylY = (h, r0, r1 = r0, seg = 28, at = [0, 0, 0]) =>
  MK.cylinder(h, r0, r1, seg).rotate([-90, 0, 0]).translate(at);
/** Cylinder along Z. */
export const cylZ = (h, r0, r1 = r0, seg = 28, at = [0, 0, 0]) =>
  MK.cylinder(h, r0, r1, seg).translate(at);
/** Cylinder along X. */
export const cylX = (h, r0, r1 = r0, seg = 28, at = [0, 0, 0]) =>
  MK.cylinder(h, r0, r1, seg).rotate([0, 90, 0]).translate(at);

export const box = (w, h, d, at = [0, 0, 0], rot = [0, 0, 0]) =>
  MK.cube(w, h, d).rotate(rot).translate(at);

/** Cut `cutter` into `solid`, but only where it is outside `inner` — a groove of exactly the
 *  wall depth, following the skin. Subtracting the raw cutter would open a hole right through. */
export const engrave = (solid, inner, cutter) => solid.subtract(cutter.subtract(inner));

/** A countersunk fastener seat: through-hole + the cone the head sits in. */
export const screwSeat = (r, headR, depth, at, dir = 'y') => {
  const f = dir === 'y' ? cylY : dir === 'z' ? cylZ : cylX;
  return MK.union(
    f(depth * 3, r, r, 14, at),
    f(headR * 1.1, headR * 1.35, r * 1.05, 14,
      dir === 'y' ? [at[0], at[1] - headR * 0.55 + 0.0001, at[2]]
        : dir === 'z' ? [at[0], at[1], at[2] - headR * 0.55 + 0.0001]
          : [at[0] - headR * 0.55 + 0.0001, at[1], at[2]]));
};

/** Build with CSG when manifold is up, and with `fallback()` when it is not (D-degrade). */
export function csg(build, fallback, crease = 38) {
  if (!MK.on()) return fallback();
  try {
    return smooth(MK.toGeometry(build()), crease);
  } catch (err) {
    console.warn('drone: csg failed, falling back', err);
    return fallback();
  }
}

// ---------------------------------------------------------------------------
// three-side helpers

/** One InstancedMesh from a list of [position, quaternion|euler, scale] placements. Repetition
 *  is what a machine-made object is full of — screws, vents, windings — and it must not cost a
 *  draw call each (E4). */
export function repeat(geo, mat, places, { shadow = true } = {}) {
  const m = new THREE.InstancedMesh(geo, mat, places.length);
  const mx = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  const p = new THREE.Vector3(), s = new THREE.Vector3();
  places.forEach((pl, i) => {
    p.set(...(pl.at ?? [0, 0, 0]));
    if (pl.q) q.copy(pl.q); else q.setFromEuler(e.set(...(pl.rot ?? [0, 0, 0])));
    s.set(...(typeof pl.scale === 'number' ? [pl.scale, pl.scale, pl.scale] : pl.scale ?? [1, 1, 1]));
    m.setMatrixAt(i, mx.compose(p, q, s));
  });
  m.instanceMatrix.needsUpdate = true;
  m.castShadow = shadow;
  return m;
}

/** One tooth of a knurled ring: radially thin, as tall as the collar, as wide as the pitch. */
export const knurlTooth = (r, h, count, depth = 0.00040) =>
  new THREE.BoxGeometry(depth * 2, h, (r * 2.3 * Math.PI) / count);

/** `count` placements evenly round a ring of radius `r`, in a frame given by quaternion `q` and
 *  origin `o` — the ring's axis is that frame's Y. Every knurl, every bolt circle, every stator
 *  tooth on this aircraft is one call to this, so repetition costs one draw call, not `count`. */
export function ringPlaces(count, r, q, o, phase = 0) {
  const out = [];
  const v = new THREE.Vector3(), spin = new THREE.Quaternion(), e = new THREE.Euler();
  for (let i = 0; i < count; i++) {
    const a = phase + (i / count) * Math.PI * 2;
    v.set(Math.cos(a) * r, 0, Math.sin(a) * r).applyQuaternion(q).add(o);
    spin.setFromEuler(e.set(0, -a, 0));
    out.push({ at: v.toArray(), q: q.clone().multiply(spin) });
  }
  return out;
}

// ---------------------------------------------------------------------------
// the propeller blade

/** A cambered section: NACA-4-ish thickness over a parabolic camber line, as a closed loop of
 *  points in (chordwise, thickness). A propeller blade is a wing; a rectangle rotated by the
 *  twist angle is a paddle, and it reads as one from every angle. */
function section(chord, thickPct, camberPct, n = 14) {
  const pts = [];
  const yt = (u) => 5 * thickPct * (0.2969 * Math.sqrt(u) - 0.1260 * u - 0.3516 * u * u
    + 0.2843 * u ** 3 - 0.1036 * u ** 4);
  const yc = (u) => 4 * camberPct * u * (1 - u);
  for (let i = 0; i <= n; i++) {                     // upper surface, leading → trailing
    const u = 0.5 - 0.5 * Math.cos((i / n) * Math.PI);
    pts.push([u * chord, (yc(u) + yt(u)) * chord]);
  }
  for (let i = n - 1; i > 0; i--) {                  // lower surface, back to the leading edge
    const u = 0.5 - 0.5 * Math.cos((i / n) * Math.PI);
    pts.push([u * chord, (yc(u) - yt(u)) * chord]);
  }
  return pts;
}

/**
 * One blade, lofted from real aerofoil sections.
 * `plan(t)` returns {r, chord, twistDeg, sweep, rise, thick, camber} for span fraction t.
 * The blade lies along +X, chord along Z, thickness in Y.
 */
export function bladeGeo(plan, span = 22, n = 14) {
  const rings = [];
  for (let i = 0; i <= span; i++) {
    const t = i / span;
    const s = plan(t);
    const sec = section(s.chord, s.thick, s.camber, n);
    const c = Math.cos(s.twistDeg * D2R), sn = Math.sin(s.twistDeg * D2R);
    rings.push(sec.map(([z, y]) => {
      const z0 = z - s.chord * 0.30;                 // twist about the quarter-ish chord
      return [s.r, y * c - z0 * sn + s.rise, z0 * c + y * sn + s.sweep];
    }));
  }
  const pos = [];
  const tri = (a, b, c) => pos.push(...a, ...b, ...c);
  const m = rings[0].length;
  for (let i = 0; i < span; i++)
    for (let j = 0; j < m; j++) {
      const k = (j + 1) % m;
      tri(rings[i][j], rings[i + 1][j], rings[i + 1][k]);
      tri(rings[i][j], rings[i + 1][k], rings[i][k]);
    }
  // caps, so the blade is closed and casts an honest shadow
  for (const [ring, flip] of [[rings[0], false], [rings[rings.length - 1], true]]) {
    const cx = ring.reduce((a, p) => [a[0] + p[0] / m, a[1] + p[1] / m, a[2] + p[2] / m], [0, 0, 0]);
    for (let j = 0; j < m; j++) {
      const k = (j + 1) % m;
      if (flip) tri(cx, ring[j], ring[k]); else tri(cx, ring[k], ring[j]);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  return smooth(g, 46);                              // smooth over the skin, sharp at the trailing edge
}
