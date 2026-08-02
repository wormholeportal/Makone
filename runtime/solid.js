// solid.js — Manifold-3D (WASM CSG) helpers for worlds. ESM, three r183+.
// Ported from MakoneLift/vr (r128 global version); the scar-tissue rules survive:
//  - take ONLY Manifold's positions+indices, let three compute normals (else all-black)
//  - rounded box = convex hull of 8 corner spheres (clean, robust)
//  - init() has a timeout; every helper degrades to a plain three primitive
// Usage:
//   import * as MK from '/runtime/solid.js';
//   await MK.init();                       // ~1s; safe to call more than once
//   mesh.geometry = MK.rbGeo(w, h, d, r);  // rounded box (cached by size)
//   const g = MK.toGeometry(MK.subtract(MK.cube(2,2,2), MK.sphere(1.2)));
import * as THREE from 'three';

let MF = null;
const cache = new Map();

export async function init({ timeoutMs = 9000, wasmBinary = globalThis.__MANIFOLD_WASM } = {}) {
  if (MF) return true;
  try {
    const mod = await Promise.race([
      // wasmBinary lets a single-file export (harness/export.mjs) hand over an inlined copy;
      // without it emscripten fetches manifold.wasm, which file:// forbids — and then every
      // rounded box would silently degrade to a plain one.
      import('manifold-3d').then((m) => m.default(wasmBinary ? { wasmBinary } : {})),
      new Promise((_, rej) => setTimeout(() => rej(new Error('manifold timeout')), timeoutMs)),
    ]);
    mod.setup();
    MF = mod;
  } catch (err) {
    console.warn('solid: init failed, falling back to plain primitives', err);
    MF = null;
  }
  return !!MF;
}

export const on = () => !!MF;

// ---- solid constructors (return Manifold solids; null when manifold is off) ----
export const cube = (w, h, d) => MF && MF.Manifold.cube([w, h, d], true);
export const sphere = (r, segments = 24) => MF && MF.Manifold.sphere(r, segments);
export const cylinder = (h, rBottom, rTop = rBottom, segments = 24) =>
  MF && MF.Manifold.cylinder(h, rBottom, rTop, segments, true);

// ---- boolean ops ----
export const union = (...solids) => solids.reduce((a, b) => a.add(b));
export const subtract = (a, b) => a.subtract(b);
export const intersect = (a, b) => a.intersect(b);
export const hull = (...solids) => union(...solids).hull();

/** Manifold solid -> three BufferGeometry. positions+indices only; three computes
 *  normals via toNonIndexed (flat facets — the crisp CSG look). */
export function toGeometry(solid) {
  const m = solid.getMesh();
  const np = m.numProp, vp = m.vertProperties, nv = vp.length / np;
  const pos = new Float32Array(nv * 3);
  for (let i = 0; i < nv; i++) {
    pos[i * 3] = vp[i * np];
    pos[i * 3 + 1] = vp[i * np + 1];
    pos[i * 3 + 2] = vp[i * np + 2];
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setIndex(new THREE.BufferAttribute(m.triVerts, 1));
  const flat = g.toNonIndexed();
  flat.computeVertexNormals();
  g.dispose();
  return flat;
}

/** Rounded box: convex hull of 8 corner spheres. Cached by size; falls back to BoxGeometry. */
export function rbGeo(w, h, d, r) {
  const key = 'rb' + [w, h, d, r].map((v) => (+v).toFixed(3)).join('_');
  if (cache.has(key)) return cache.get(key);
  let geo;
  const rr = Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4);
  if (MF && rr > 0) {
    try {
      const s = MF.Manifold.sphere(rr, 12);
      const corners = [];
      for (const x of [-(w / 2 - rr), w / 2 - rr])
        for (const y of [-(h / 2 - rr), h / 2 - rr])
          for (const z of [-(d / 2 - rr), d / 2 - rr])
            corners.push(s.translate([x, y, z]));
      geo = toGeometry(hull(...corners));
    } catch (err) {
      console.warn('solid: rbGeo failed, plain box', err);
      geo = new THREE.BoxGeometry(w, h, d);
    }
  } else {
    geo = new THREE.BoxGeometry(w, h, d);
  }
  cache.set(key, geo);
  return geo;
}

/** Hollow container of revolution: [r, y] profile points
 *  (outer-bottom → outer-wall → rim → inner-wall → inner-bottom). Plain three, always works. */
export function latheGeo(profile, segments = 28) {
  return new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), segments);
}
