// keyboard — four staggered rows of ringed keys on their levers, plus the space bar.
// Datum: mounted. Built in the machine's own floor coordinates (y=0 = desk), because the row
// rake is arithmetic against the shell height and belongs in the same numbers.
import * as THREE from 'three';
import * as MK from '/runtime/solid.js';
import { KEYBOARD, ASSEMBLY, PALETTE } from '../params.js';

export const params = KEYBOARD;
export const datum = 'mounted';

/** Legends, back row first — content, not a dimension, so it lives here and not in params.
 *  Row lengths must match KEYBOARD.rows; the loop asserts it rather than trusting it. */
const LEGENDS = ['1234567890-', 'QWERTYUIOP@', 'ASDFGHJKL;\'', 'ZXCVBNM,.?'];
const ATLAS_COLS = 8, ATLAS_ROWS = 6;

export const inventory = [
  `${params.rows.reduce((a, b) => a + b)} keys in rows of ${params.rows.join('/')}, `
    + `${params.keyPitch * 1000}mm pitch`,
  `rake: each row back is ${params.rowRise * 1000}mm higher and ${params.rowDepth * 1000}mm deeper `
    + `than the one in front, so the back row sits ${params.rowRise * 3000}mm up`,
  `rows step ${params.rowStagger * 1000}mm sideways, like a real QWERTY bank`,
  'each key: black glass face, white legend, nickel hoop at the rim — the legend is drawn, not downloaded',
  `levers run all the way down to the tray floor at ${ASSEMBLY.trayY * 1000}mm`,
  `space bar ${params.spaceW * 1000}mm wide on two levers`,
];

/** One canvas holding every glyph; each key gets a clone of the texture with its own offset,
 *  so all 43 legends share a single upload (E4 applies to textures too). */
function legendAtlas() {
  const S = 512, cell = S / ATLAS_COLS, rowH = S / ATLAS_ROWS;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const x = c.getContext('2d');
  // white legend on a black glass face — a cream face with dark letters reads as a modern
  // keyboard, which is exactly the wrong century (checked on the top view)
  x.fillStyle = '#17181c';
  x.fillRect(0, 0, S, S);
  x.fillStyle = '#f1ece2';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.font = `600 ${Math.round(rowH * 0.62)}px ui-serif, Georgia, serif`;
  LEGENDS.join('').split('').forEach((ch, i) => {
    const col = i % ATLAS_COLS, row = Math.floor(i / ATLAS_COLS);
    x.fillText(ch, col * cell + cell / 2, row * rowH + rowH / 2);
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

export default function build(p = params) {
  const g = new THREE.Group();
  g.name = 'keys';

  const capMat = new THREE.MeshStandardMaterial({ color: PALETTE.keyBlack, roughness: 0.42, metalness: 0.1 });
  const ringMat = new THREE.MeshStandardMaterial({ color: PALETTE.keyRing, roughness: 0.22, metalness: 0.92 });
  const leverMat = new THREE.MeshStandardMaterial({ color: PALETTE.steelDark, roughness: 0.34, metalness: 0.8 });

  // The cap is a shallow CUP, not a disc: a cylinder's flat top sits above the legend and hides
  // it completely from every angle that matters (found on the top view — twice).
  const capGeo = MK.latheGeo([
    [0, -p.capH / 2], [p.capR * 0.88, -p.capH / 2],
    [p.capR, p.capH / 2],                                  // outer wall, slight flare
    [p.capR * 0.88, p.capH / 2 - 0.0002],                  // over the rim
    [p.capR * 0.80, p.capH / 2 - p.capDish],               // down into the dish
    [0, p.capH / 2 - p.capDish - 0.0004],
  ], 22);
  const ringGeo = new THREE.TorusGeometry(p.capR * 0.94, p.ringTube, 8, 24).rotateX(Math.PI / 2);
  const faceGeo = new THREE.CircleGeometry(p.capR * 0.74, 22).rotateX(-Math.PI / 2);
  const atlas = legendAtlas();

  const keys = [];
  let glyph = 0;
  for (let row = 0; row < p.rows.length; row++) {
    if (LEGENDS[row].length !== p.rows[row])
      throw new Error(`keyboard: row ${row} has ${p.rows[row]} keys but ${LEGENDS[row].length} legends`);
    const back = p.rows.length - 1 - row;                 // 3 for the back row, 0 for the front
    const y = p.frontY + back * p.rowRise;
    const z = ASSEMBLY.keyFrontZ - back * p.rowDepth;
    const x0 = -((p.rows[row] - 1) * p.keyPitch) / 2 - back * p.rowStagger;
    // one lever geometry per row, not per key: within a row the length is the same number (E4)
    const leverLen = y - ASSEMBLY.trayY;
    const leverGeo = new THREE.CylinderGeometry(p.stalkR, p.stalkR * 0.85, leverLen, 8);

    for (let i = 0; i < p.rows[row]; i++, glyph++) {
      const key = new THREE.Group();
      key.position.set(x0 + i * p.keyPitch, y, z);

      const cap = new THREE.Mesh(capGeo, capMat);
      cap.castShadow = true;
      key.add(cap);

      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.y = p.capH / 2 - 0.0002;
      key.add(ring);

      // dished top: the legend sits below the ring, which is what makes a key look pressable
      const tex = atlas.clone();
      tex.needsUpdate = true;
      tex.repeat.set(1 / ATLAS_COLS, 1 / ATLAS_ROWS);
      tex.offset.set((glyph % ATLAS_COLS) / ATLAS_COLS,
        1 - (Math.floor(glyph / ATLAS_COLS) + 1) / ATLAS_ROWS);
      const face = new THREE.Mesh(faceGeo,
        new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55 }));
      face.position.y = p.capH / 2 - p.capDish + 0.00025;
      key.add(face);

      // the lever, all the way down to the tray floor — a key cap floating on nothing reads as UI
      const lever = new THREE.Mesh(leverGeo, leverMat);
      lever.position.y = -leverLen / 2 - p.capH / 2;
      lever.castShadow = true;
      key.add(lever);

      keys.push(key);
      g.add(key);
    }
  }

  // --- space bar: same lever idea, one long cap ---
  const barZ = ASSEMBLY.keyFrontZ + p.rowDepth * 0.95;
  const bar = new THREE.Group();
  bar.name = 'spacebar';
  bar.position.set(0, p.frontY - 0.008, barZ);
  const barCap = new THREE.Mesh(MK.rbGeo(p.spaceW, p.spaceH, p.spaceD, 0.0022), capMat);
  barCap.castShadow = true;
  bar.add(barCap);
  const barLen = bar.position.y - ASSEMBLY.trayY;
  const barLeverGeo = new THREE.CylinderGeometry(p.stalkR, p.stalkR, barLen, 8);   // shared
  for (const sx of [-1, 1]) {
    const lever = new THREE.Mesh(barLeverGeo, leverMat);
    lever.position.set(sx * p.spaceW * 0.34, -barLen / 2, 0);
    lever.castShadow = true;
    bar.add(lever);
  }
  g.add(bar);

  // main.js presses keys by index; names would collide, an array does not
  g.userData.keys = keys;
  return g;
}
