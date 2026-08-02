// outline.js — the violin's plan shape, and the arched plate lofted from it.
// Local to this world: nothing else in the repo has bouts.
import * as THREE from 'three';
import { BODY } from './params.js';

/** The half-outline, mirrored: upper bout, corner, C-bout, corner, lower bout. Returned as
 *  [x, z] pairs going anticlockwise from the top block. The corners are the violin's signature —
 *  a shape without them is a guitar. */
export function outlineShape(scale = 1) {
  const L = (BODY.len / 2) * scale;
  const U = BODY.upper * scale, W = BODY.waist * scale, D = BODY.lower * scale;
  const s = new THREE.Shape();
  s.moveTo(0, L);
  s.bezierCurveTo(U * 0.55, L, U, L * 0.78, U, L * 0.60);          // out to the upper bout
  s.bezierCurveTo(U, L * 0.44, U * 0.92, L * 0.34, U * 0.92, L * 0.26);  // in to the upper corner
  s.lineTo(U * 0.86, L * 0.225);                                    // the corner point itself
  s.bezierCurveTo(W * 1.00, L * 0.14, W * 0.98, L * 0.02, W * 1.06, -L * 0.12); // the C-bout
  s.lineTo(D * 0.80, -L * 0.245);                                   // the lower corner point
  s.lineTo(D * 0.76, -L * 0.30);
  s.bezierCurveTo(D * 0.90, -L * 0.40, D, -L * 0.52, D, -L * 0.66);
  s.bezierCurveTo(D, -L * 0.86, U * 0.55, -L, 0, -L);
  // mirror
  s.bezierCurveTo(-U * 0.55, -L, -D, -L * 0.86, -D, -L * 0.66);
  s.bezierCurveTo(-D, -L * 0.52, -D * 0.90, -L * 0.40, -D * 0.76, -L * 0.30);
  s.lineTo(-D * 0.80, -L * 0.245);
  s.lineTo(-W * 1.06, -L * 0.12);
  s.bezierCurveTo(-W * 0.98, L * 0.02, -W * 1.00, L * 0.14, -U * 0.86, L * 0.225);
  s.lineTo(-U * 0.92, L * 0.26);
  s.bezierCurveTo(-U * 0.92, L * 0.34, -U, L * 0.44, -U, L * 0.60);
  s.bezierCurveTo(-U, L * 0.78, -U * 0.55, L, 0, L);
  return s;
}

/** An ARCHED plate: the outline scaled inward ring by ring and lifted by the arch function, so
 *  the arch is a surface rather than a dome parked on a flat board. `sign` is +1 for the belly
 *  and −1 for the back.
 *
 *  The rings are scaled about the origin, which is not quite what a maker's gouge does in the
 *  C-bouts — but it keeps the recurve reading, and it is one line instead of a surface offsetter. */
export function plateGeo(archH, sign = 1, rings = BODY.rings, around = BODY.around) {
  // INDEXED, and that is not an optimisation: a non-indexed plate gets one normal per triangle,
  // and the ring structure shows up as terracing — the top view of the first cut looked like a
  // contour map of a hill. Sharing vertices between rings averages the normals and the arch reads
  // as one surface.
  const base = outlineShape().getSpacedPoints(around);
  const verts = [];
  for (let k = 0; k <= rings; k++) {
    const t = k / rings;                      // 0 at the edge, 1 at the crown
    const s = 1 - t * 0.97;
    const y = sign * archH * Math.pow(1 - (1 - t) ** 2, 0.62);
    for (let i = 0; i < around; i++) verts.push(base[i].x * s, y, base[i].y * s);
  }
  verts.push(0, sign * archH, 0);             // the crown
  const idx = [];
  for (let k = 0; k < rings; k++) {
    for (let i = 0; i < around; i++) {
      const j = (i + 1) % around;
      const a = k * around + i, b = k * around + j;
      const c = (k + 1) * around + i, d = (k + 1) * around + j;
      if (sign > 0) idx.push(a, c, d, a, d, b); else idx.push(a, d, c, a, b, d);
    }
  }
  const crown = (rings + 1) * around;
  for (let i = 0; i < around; i++) {
    const j = (i + 1) % around;
    const a = rings * around + i, b = rings * around + j;
    if (sign > 0) idx.push(a, crown, b); else idx.push(a, b, crown);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** The ribs: a wall standing on the outline, from y0 up by h. */
export function ribGeo(h, around = BODY.around) {
  const base = outlineShape(0.985).getSpacedPoints(around);
  const pos = [];
  for (let i = 0; i < around; i++) {
    const a = base[i], b = base[(i + 1) % around];
    pos.push(a.x, 0, a.y, b.x, 0, b.y, b.x, h, b.y);
    pos.push(a.x, 0, a.y, b.x, h, b.y, a.x, h, a.y);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}
