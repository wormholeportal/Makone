import * as THREE from 'three'
import { ImprovedNoise } from 'three/addons/math/ImprovedNoise.js'
import RAPIER from '@dimforge/rapier3d-compat'

// ============================================================
// ❄️ SNOW DRIFT — Detailed off-road SUV with real Rapier vehicle
// physics, streaming SNOW terrain, checkpoint time-attack.
// (Winter re-skin of desertdrift: same vehicle/physics/gameplay.)
// Modeled after the a desert-racing reference build:
//   - 50+ part rounded-extruded SUV body + detailed wheels
//   - Rapier DynamicRayCastVehicleController (real wheels + suspension)
//   - Streaming heightmap terrain + biome shader (sand/dirt/grass/water)
//   - InstancedMesh dust + splash particle systems
//   - Sun tracks the car, scenery streams in cells
// On top: race checkpoints, timer, boost meter, lap completion.
// ============================================================

export default async function createWorld(container) {
  await RAPIER.init()

  const w = container.clientWidth || 800
  const h = container.clientHeight || 600
  const lowSpec = (navigator.hardwareConcurrency || 4) <= 4 || w * h > 1_800_000
  const pixelRatio = Math.min(window.devicePixelRatio, lowSpec ? 1.25 : 1.5)

  // ── Renderer ──
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'default' })
  renderer.setSize(w, h)
  renderer.setPixelRatio(pixelRatio)
  renderer.shadowMap.enabled = !lowSpec
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.0
  renderer.outputColorSpace = THREE.SRGBColorSpace
  container.appendChild(renderer.domElement)

  // ── Scene ──
  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#dbe7f2')
  scene.fog = new THREE.Fog('#dbe7f2', 70, 240)

  const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 500)
  camera.position.set(-8, 5, 0)

  // ============================================================
  // ☀️ Lighting — warm desert, dramatic shadows that follow the car
  // ============================================================
  const ambientLight = new THREE.AmbientLight(0xe8f0ff, 0.6)
  scene.add(ambientLight)
  const hemiLight = new THREE.HemisphereLight(0xeaf4ff, 0x9fb0c4, 0.75)
  scene.add(hemiLight)
  const dirLight = new THREE.DirectionalLight(0xfff8ee, 3.2)
  dirLight.position.set(10, 20, 10)
  dirLight.castShadow = true
  dirLight.shadow.mapSize.set(lowSpec ? 768 : 1536, lowSpec ? 768 : 1536)
  dirLight.shadow.camera.near = 0.5
  dirLight.shadow.camera.far = 100
  dirLight.shadow.camera.left = -60; dirLight.shadow.camera.right = 60
  dirLight.shadow.camera.top = 60; dirLight.shadow.camera.bottom = -60
  dirLight.shadow.bias = -0.0008
  dirLight.shadow.normalBias = 0.02
  scene.add(dirLight); scene.add(dirLight.target)
  const lightSettings = { azimuth: 320, elevation: 45 }

  // ============================================================
  // 🏜️ Terrain heightmap — Perlin via ImprovedNoise
  // ============================================================
  const perlin = new ImprovedNoise()
  const terrainSettings = { frequency: 0.004, amplitude: 14 }
  function getH(x, z) {
    const s = terrainSettings.frequency, a = terrainSettings.amplitude
    let h = perlin.noise(x * s, 0, z * s) * a
    h += perlin.noise(x * s * 2, 1, z * s * 2) * a * 0.5
    h += perlin.noise(x * s * 4, 2, z * s * 4) * a * 0.25
    return h
  }

  // Biome shader uniforms
  const biomeSettings = {
    waterLevel: -5.0, sandEnd: 2.0, dirtEnd: 6.0, transitionWidth: 1.8,
    sandColor1: '#eaf1f8', sandColor2: '#ffffff',
    dirtColor1: '#c4d2e2', dirtColor2: '#d8e3ef',
    grassColor1: '#8c97a6', grassColor2: '#aab4c0',
    waterColor: '#bfe3ec', waterColorDeep: '#7fb3c4',
  }
  const groundUniforms = {
    uWaterLevel: { value: biomeSettings.waterLevel },
    uSandEnd: { value: biomeSettings.sandEnd },
    uDirtEnd: { value: biomeSettings.dirtEnd },
    uTransition: { value: biomeSettings.transitionWidth },
    uSand1: { value: new THREE.Color(biomeSettings.sandColor1) },
    uSand2: { value: new THREE.Color(biomeSettings.sandColor2) },
    uDirt1: { value: new THREE.Color(biomeSettings.dirtColor1) },
    uDirt2: { value: new THREE.Color(biomeSettings.dirtColor2) },
    uGrass1: { value: new THREE.Color(biomeSettings.grassColor1) },
    uGrass2: { value: new THREE.Color(biomeSettings.grassColor2) },
  }
  const groundMat = new THREE.MeshStandardMaterial({ roughness: 0.88, metalness: 0 })
  groundMat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, groundUniforms)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vWorldP;`)
      .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>\nvWorldP = worldPosition.xyz;`)
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `
        #include <common>
        varying vec3 vWorldP;
        uniform float uWaterLevel, uSandEnd, uDirtEnd, uTransition;
        uniform vec3 uSand1, uSand2, uDirt1, uDirt2, uGrass1, uGrass2;
        float hash3(vec3 p) {
          p = fract(p * 0.3183099 + .1);
          p *= 17.0;
          return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
        }
        float vnoise(vec3 x) {
          vec3 p = floor(x); vec3 f = fract(x);
          f = f*f*(3.0-2.0*f);
          return mix(mix(mix(hash3(p+vec3(0,0,0)), hash3(p+vec3(1,0,0)), f.x),
                         mix(hash3(p+vec3(0,1,0)), hash3(p+vec3(1,1,0)), f.x), f.y),
                     mix(mix(hash3(p+vec3(0,0,1)), hash3(p+vec3(1,0,1)), f.x),
                         mix(hash3(p+vec3(0,1,1)), hash3(p+vec3(1,1,1)), f.x), f.y), f.z);
        }
      `)
      .replace('#include <map_fragment>', `
        #include <map_fragment>
        vec3 wp = vWorldP;
        float n = vnoise(vec3(wp.x*0.15, 0.0, wp.z*0.15));
        float tn = (vnoise(vec3(wp.x*0.06, 0.0, wp.z*0.06)) - 0.5) * uTransition;
        float h = wp.y + tn;
        float halfTW = uTransition * 0.5;
        float sandT = smoothstep(uSandEnd - halfTW, uSandEnd + halfTW, h);
        float grassT = smoothstep(uDirtEnd - halfTW, uDirtEnd + halfTW, h);
        vec3 sand = mix(uSand1, uSand2, n);
        vec3 dirt = mix(uDirt1, uDirt2, n);
        vec3 grass = mix(uGrass1, uGrass2, n);
        vec3 surf = mix(mix(sand, dirt, sandT), grass, grassT);
        float underwater = smoothstep(uWaterLevel + 0.5, uWaterLevel - 1.5, wp.y);
        surf = mix(surf, vec3(0.08, 0.12, 0.10), underwater);
        diffuseColor.rgb = surf;
      `)
  }

  // ── Streaming ground patch (rebuilt in chunks as the car drives) ──
  const GROUND_SIZE = 400, GROUND_SEG = lowSpec ? 128 : 180, GROUND_Y_OFF = -0.15, GROUND_SNAP = 8
  const groundGeo = new THREE.PlaneGeometry(GROUND_SIZE, GROUND_SIZE, GROUND_SEG, GROUND_SEG)
  const groundMesh = new THREE.Mesh(groundGeo, groundMat)
  groundMesh.rotation.x = -Math.PI / 2
  groundMesh.receiveShadow = true
  scene.add(groundMesh)

  function updateGroundSync(px, pz) {
    groundMesh.position.x = px; groundMesh.position.z = pz
    const posAttr = groundGeo.attributes.position
    for (let i = 0; i < posAttr.count; i++) {
      const lx = posAttr.getX(i), ly = posAttr.getY(i)
      posAttr.setZ(i, getH(lx + px, pz - ly) + GROUND_Y_OFF)
    }
    posAttr.needsUpdate = true
    groundGeo.computeVertexNormals()
  }
  updateGroundSync(0, 0)

  // Incremental ground rebuild — spreads work across frames
  let _gPending = false, _gTX = 0, _gTZ = 0, _gRow = 0, _gBuf = null
  const _gSegP1 = GROUND_SEG + 1, GROUND_ROWS_PER_FRAME = lowSpec ? 42 : 60
  function updateGround(px, pz) {
    _gTX = px; _gTZ = pz; _gRow = 0; _gPending = true
    if (!_gBuf || _gBuf.length !== _gSegP1 * _gSegP1) _gBuf = new Float32Array(_gSegP1 * _gSegP1)
  }
  function tickGround() {
    if (!_gPending) return
    const posAttr = groundGeo.attributes.position
    const endRow = Math.min(_gSegP1, _gRow + GROUND_ROWS_PER_FRAME)
    for (let row = _gRow; row < endRow; row++) {
      for (let col = 0; col < _gSegP1; col++) {
        const idx = row * _gSegP1 + col
        _gBuf[idx] = getH(posAttr.getX(idx) + _gTX, _gTZ - posAttr.getY(idx)) + GROUND_Y_OFF
      }
    }
    _gRow = endRow
    if (_gRow >= _gSegP1) {
      for (let i = 0; i < _gSegP1 * _gSegP1; i++) posAttr.setZ(i, _gBuf[i])
      posAttr.needsUpdate = true
      groundMesh.position.x = _gTX; groundMesh.position.z = _gTZ
      groundGeo.computeVertexNormals()
      _gPending = false
    }
  }

  // ── Water (with animated noise) ──
  const waterUniforms = {
    uTime: { value: 0 },
    uColor: { value: new THREE.Color(biomeSettings.waterColor) },
    uColorDeep: { value: new THREE.Color(biomeSettings.waterColorDeep) },
  }
  const waterMat = new THREE.MeshStandardMaterial({
    transparent: true, opacity: 0.55, roughness: 0.05, metalness: 0.3, side: THREE.DoubleSide,
  })
  waterMat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, waterUniforms)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vWorldP_w;`)
      .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>\nvWorldP_w = worldPosition.xyz;`)
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `
        #include <common>
        varying vec3 vWorldP_w;
        uniform float uTime;
        uniform vec3 uColor, uColorDeep;
        float hashW(vec3 p){p=fract(p*.3183099+.1);p*=17.0;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
        float vnW(vec3 x){vec3 p=floor(x);vec3 f=fract(x);f=f*f*(3.-2.*f);return mix(mix(mix(hashW(p),hashW(p+vec3(1,0,0)),f.x),mix(hashW(p+vec3(0,1,0)),hashW(p+vec3(1,1,0)),f.x),f.y),mix(mix(hashW(p+vec3(0,0,1)),hashW(p+vec3(1,0,1)),f.x),mix(hashW(p+vec3(0,1,1)),hashW(p+vec3(1,1,1)),f.x),f.y),f.z);}
      `)
      .replace('#include <map_fragment>', `
        #include <map_fragment>
        vec3 wp = vWorldP_w;
        float n = vnW(vec3(wp.x*0.04 + uTime*0.15, 0.0, wp.z*0.04 + uTime*0.10));
        diffuseColor.rgb = mix(uColorDeep, uColor, n);
      `)
  }
  const waterMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(GROUND_SIZE + 100, GROUND_SIZE + 100, 2, 2), waterMat
  )
  waterMesh.rotation.x = -Math.PI / 2
  waterMesh.position.y = biomeSettings.waterLevel
  waterMesh.receiveShadow = true
  scene.add(waterMesh)

  // ============================================================
  // ⚙️ Physics + heightfield collider (retiles as car moves)
  // ============================================================
  const physicsWorld = new RAPIER.World({ x: 0, y: -9.81, z: 0 })
  const FIXED_DT = 1 / 60
  physicsWorld.timestep = FIXED_DT

  const HF_SIZE = 600, HF_RES = lowSpec ? 128 : 180, HF_RETHRESHOLD = 150
  let hfBody = null, hfCollider = null
  const hfCenter = { x: 0, z: 0 }
  function createHFSync(cx, cz) {
    const heights = new Float32Array((HF_RES + 1) * (HF_RES + 1))
    for (let row = 0; row <= HF_RES; row++) {
      for (let col = 0; col <= HF_RES; col++) {
        const wx = cx + (col / HF_RES - 0.5) * HF_SIZE
        const wz = cz + (row / HF_RES - 0.5) * HF_SIZE
        heights[row + col * (HF_RES + 1)] = getH(wx, wz) + GROUND_Y_OFF
      }
    }
    if (hfCollider) { try { physicsWorld.removeCollider(hfCollider, false) } catch (_) {} }
    if (hfBody) { try { physicsWorld.removeRigidBody(hfBody) } catch (_) {} }
    hfBody = physicsWorld.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(cx, 0, cz))
    hfCollider = physicsWorld.createCollider(
      RAPIER.ColliderDesc.heightfield(HF_RES, HF_RES, heights, { x: HF_SIZE, y: 1, z: HF_SIZE })
        .setFriction(0.85).setRestitution(0.05),
      hfBody
    )
    hfCenter.x = cx; hfCenter.z = cz
  }
  createHFSync(0, 0)

  // ============================================================
  // 🚙 Vehicle materials (painterly off-road SUV palette)
  // ============================================================
  const M = {
    paint: new THREE.MeshStandardMaterial({ color: '#e07840', roughness: 0.55, metalness: 0.18 }),
    paintAccent: new THREE.MeshStandardMaterial({ color: '#c5612a', roughness: 0.55, metalness: 0.18 }),
    blackTrim: new THREE.MeshStandardMaterial({ color: '#2a2a2a', roughness: 0.7, metalness: 0.15 }),
    bumper: new THREE.MeshStandardMaterial({ color: '#4a4540', roughness: 0.75, metalness: 0.1 }),
    // Plain Standard material instead of Physical/transmission — looks
    // almost identical at this scale but avoids the per-frame refraction
    // render pass that PhysicalMaterial.transmission triggers.
    glass: new THREE.MeshStandardMaterial({
      color: '#7a9bb0', metalness: 0.2, roughness: 0.10,
      transparent: true, opacity: 0.55,
    }),
    glassDark: new THREE.MeshStandardMaterial({
      color: '#3a4750', metalness: 0.3, roughness: 0.15, transparent: true, opacity: 0.85,
    }),
    rubber: new THREE.MeshStandardMaterial({ color: '#0f0f0f', roughness: 0.95, metalness: 0 }),
    wheelArch: new THREE.MeshStandardMaterial({ color: '#1c1c1c', roughness: 0.85, metalness: 0.05 }),
    rim: new THREE.MeshStandardMaterial({ color: '#a8a8a8', metalness: 0.7, roughness: 0.4 }),
    chrome: new THREE.MeshStandardMaterial({ color: '#dadada', metalness: 0.92, roughness: 0.22 }),
    headlight: new THREE.MeshStandardMaterial({
      color: '#fff8e0', emissive: '#fff2c8', emissiveIntensity: 0.8, roughness: 0.2,
    }),
    taillight: new THREE.MeshStandardMaterial({
      color: '#5a0808', emissive: '#cc1818', emissiveIntensity: 0.55, roughness: 0.3,
    }),
    luggageRed: new THREE.MeshStandardMaterial({ color: '#9c4438', roughness: 0.85, metalness: 0.05 }),
    luggageBeige: new THREE.MeshStandardMaterial({ color: '#c8b08c', roughness: 0.85, metalness: 0.05 }),
    rackBar: new THREE.MeshStandardMaterial({ color: '#3a3530', roughness: 0.6, metalness: 0.4 }),
    plate: new THREE.MeshStandardMaterial({ color: '#e8d8b0', roughness: 0.5, metalness: 0.1 }),
    plateText: new THREE.MeshStandardMaterial({ color: '#2a2a2a', roughness: 0.5, metalness: 0.1 }),
    mirrorBack: new THREE.MeshStandardMaterial({ color: '#c5612a', roughness: 0.55, metalness: 0.18 }),
    mirrorFace: new THREE.MeshStandardMaterial({ color: '#aaaaaa', metalness: 0.9, roughness: 0.1 }),
    interior: new THREE.MeshStandardMaterial({ color: '#1a1612', roughness: 0.9, metalness: 0 }),
    amber: new THREE.MeshStandardMaterial({ color: '#ddaa44', emissive: '#dd8822', emissiveIntensity: 0.3, roughness: 0.4 }),
  }

  // Helper: rounded extruded box (matches reference)
  function roundedBox(w, h, d, r, mat, bevelSize = 0.04) {
    const shape = new THREE.Shape()
    const x = -w / 2, y = -h / 2
    shape.moveTo(x + r, y); shape.lineTo(x + w - r, y)
    shape.quadraticCurveTo(x + w, y, x + w, y + r)
    shape.lineTo(x + w, y + h - r)
    shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    shape.lineTo(x + r, y + h)
    shape.quadraticCurveTo(x, y + h, x, y + h - r)
    shape.lineTo(x, y + r); shape.quadraticCurveTo(x, y, x + r, y)
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: d, bevelEnabled: true,
      bevelSegments: 3, bevelSize: Math.min(r * 0.5, bevelSize), bevelThickness: bevelSize,
      curveSegments: 8,
    })
    geo.translate(0, 0, -d / 2); geo.computeVertexNormals()
    const m = new THREE.Mesh(geo, mat)
    m.castShadow = true; m.receiveShadow = true
    return m
  }

  // ============================================================
  // 🚙 BUILD THE SUV (50+ parts — ported from reference)
  // ============================================================
  function buildSUV() {
    const root = new THREE.Group()

    // === MAIN BODY (lower hull) ===
    const lowerBody = roundedBox(2.2, 0.55, 1.30, 0.18, M.paint, 0.06)
    lowerBody.position.set(0, -0.05, 0)
    root.add(lowerBody)
    for (const side of [-1, 1]) {
      const sill = roundedBox(2.0, 0.10, 0.04, 0.02, M.blackTrim)
      sill.position.set(0, -0.34, side * 0.66)
      root.add(sill)
    }

    // === REAR CARGO ===
    const rearBody = roundedBox(0.95, 0.50, 1.30, 0.16, M.paint, 0.05)
    rearBody.position.set(-0.62, 0.30, 0)
    root.add(rearBody)
    const rearRoof = roundedBox(0.95, 0.04, 1.20, 0.06, M.paintAccent)
    rearRoof.position.set(-0.62, 0.58, 0)
    root.add(rearRoof)
    const tailSeam = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.55, 1.20), M.blackTrim)
    tailSeam.position.set(-1.10, 0.30, 0)
    root.add(tailSeam)

    // === FRONT HOOD (sloped trapezoid) ===
    const hoodShape = new THREE.Shape()
    hoodShape.moveTo(-0.5, 0); hoodShape.lineTo(0.5, 0)
    hoodShape.lineTo(0.42, 0.18); hoodShape.lineTo(-0.46, 0.22)
    hoodShape.closePath()
    const hoodGeo = new THREE.ExtrudeGeometry(hoodShape, {
      depth: 1.20, bevelEnabled: true, bevelSegments: 2, bevelSize: 0.04, bevelThickness: 0.03,
      curveSegments: 6,
    })
    hoodGeo.translate(0, 0, -0.60); hoodGeo.rotateY(Math.PI / 2)
    const hood = new THREE.Mesh(hoodGeo, M.paint)
    hood.position.set(0.62, 0.24, 0)
    hood.castShadow = true; hood.receiveShadow = true
    root.add(hood)

    // === GREENHOUSE (windshield + roof + side windows + rear) ===
    const wsShape = new THREE.Shape()
    wsShape.moveTo(-0.55, 0); wsShape.lineTo(0.55, 0)
    wsShape.lineTo(0.55, 0.40); wsShape.lineTo(-0.55, 0.40)
    wsShape.closePath()
    const windshieldGeo = new THREE.ExtrudeGeometry(wsShape, { depth: 0.04, bevelEnabled: false })
    windshieldGeo.translate(0, 0, -0.02)
    const windshield = new THREE.Mesh(windshieldGeo, M.glass)
    windshield.position.set(0.32, 0.30, 0)
    windshield.rotation.y = Math.PI / 2
    windshield.rotation.x = -0.30
    root.add(windshield)

    const cabinRoof = roundedBox(1.10, 0.06, 1.18, 0.10, M.paint, 0.03)
    cabinRoof.position.set(0.05, 0.66, 0)
    root.add(cabinRoof)

    for (const side of [-1, 1]) {
      const aPillar = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.42, 0.08), M.paint)
      aPillar.position.set(0.46, 0.45, side * 0.59)
      aPillar.rotation.z = -0.30
      aPillar.castShadow = true
      root.add(aPillar)
      const bPillar = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.42, 0.08), M.paint)
      bPillar.position.set(-0.45, 0.45, side * 0.59)
      bPillar.castShadow = true
      root.add(bPillar)
    }

    for (const side of [-1, 1]) {
      const sideWin = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.36, 0.025), M.glass)
      sideWin.position.set(0.05, 0.46, side * 0.62)
      root.add(sideWin)
      const winFrame = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.04, 0.04), M.blackTrim)
      winFrame.position.set(0.05, 0.65, side * 0.62)
      root.add(winFrame)
    }

    const rearWin = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.36, 1.04), M.glass)
    rearWin.position.set(-0.51, 0.46, 0)
    root.add(rearWin)

    const wiper = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.02, 0.32), M.blackTrim)
    wiper.position.set(0.35, 0.21, 0.05)
    wiper.rotation.z = -0.3
    root.add(wiper)

    // === DOORS (seams + handles) ===
    for (const side of [-1, 1]) {
      const seam = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.45, 0.02), M.blackTrim)
      seam.position.set(0.05, 0.05, side * 0.66)
      root.add(seam)
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.025, 0.02), M.chrome)
      handle.position.set(-0.18, 0.18, side * 0.665)
      root.add(handle)
      const handle2 = handle.clone()
      handle2.position.set(0.32, 0.18, side * 0.665)
      root.add(handle2)
    }

    // === FRONT DETAILS (bumper + headlights + grille + turn signals) ===
    const frontBumper = roundedBox(0.18, 0.32, 1.30, 0.06, M.bumper)
    frontBumper.position.set(1.06, -0.06, 0)
    root.add(frontBumper)
    const bumperLip = roundedBox(0.06, 0.10, 1.20, 0.03, M.blackTrim)
    bumperLip.position.set(1.13, -0.20, 0)
    root.add(bumperLip)

    for (const side of [-1, 1]) {
      const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.08, 18), M.chrome)
      housing.rotation.z = Math.PI / 2
      housing.position.set(1.13, 0.10, side * 0.42)
      housing.castShadow = true
      root.add(housing)
      const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 0.06, 18), M.headlight)
      lens.rotation.z = Math.PI / 2
      lens.position.set(1.16, 0.10, side * 0.42)
      root.add(lens)
      const small = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.05, 12), M.headlight)
      small.rotation.z = Math.PI / 2
      small.position.set(1.16, 0.10, side * 0.21)
      root.add(small)
      const smallHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.06, 12), M.chrome)
      smallHousing.rotation.z = Math.PI / 2
      smallHousing.position.set(1.13, 0.10, side * 0.21)
      root.add(smallHousing)
    }

    const grille = roundedBox(0.04, 0.16, 0.55, 0.02, M.blackTrim)
    grille.position.set(1.16, 0.10, 0)
    root.add(grille)
    for (let i = -2; i <= 2; i++) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.025, 0.50), M.chrome)
      bar.position.set(1.18, 0.10 + i * 0.04, 0)
      root.add(bar)
    }

    for (const side of [-1, 1]) {
      const ts = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 0.10), M.amber)
      ts.position.set(1.16, -0.05, side * 0.55)
      root.add(ts)
    }

    // === REAR (bumper + taillights + plate + spare tire) ===
    const rearBumper = roundedBox(0.16, 0.30, 1.30, 0.06, M.bumper)
    rearBumper.position.set(-1.10, -0.06, 0)
    root.add(rearBumper)

    for (const side of [-1, 1]) {
      const tlHousing = roundedBox(0.04, 0.30, 0.18, 0.025, M.blackTrim)
      tlHousing.position.set(-1.05, 0.22, side * 0.50)
      root.add(tlHousing)
      const tlLens = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.26, 0.16), M.taillight)
      tlLens.position.set(-1.07, 0.22, side * 0.50)
      root.add(tlLens)
    }

    const plateBg = roundedBox(0.025, 0.10, 0.32, 0.012, M.plate)
    plateBg.position.set(-1.12, -0.08, 0)
    root.add(plateBg)
    for (let i = 0; i < 5; i++) {
      const letter = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.04, 0.025), M.plateText)
      letter.position.set(-1.13, -0.08, (i - 2) * 0.045)
      root.add(letter)
    }

    const tgHandle = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.06, 0.10), M.chrome)
    tgHandle.position.set(-1.11, 0.22, 0)
    root.add(tgHandle)

    const rwGlass = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.32, 1.0), M.glassDark)
    rwGlass.position.set(-1.05, 0.42, 0)
    root.add(rwGlass)

    // Spare tire on rear tailgate
    const spareTire = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.09, 12, 24), M.rubber)
    spareTire.position.set(-1.18, 0.20, 0.32)
    spareTire.rotation.y = Math.PI / 2
    spareTire.castShadow = true
    root.add(spareTire)
    const spareRim = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.10, 16), M.rim)
    spareRim.rotation.z = Math.PI / 2
    spareRim.position.set(-1.18, 0.20, 0.32)
    root.add(spareRim)

    // === ROOF RACK + LUGGAGE ===
    for (const side of [-1, 1]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(1.30, 0.025, 0.04), M.rackBar)
      rail.position.set(-0.05, 0.71, side * 0.50)
      root.add(rail)
      for (const x of [0.60, -0.70]) {
        const cap = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.08), M.rackBar)
        cap.position.set(x, 0.70, side * 0.50)
        root.add(cap)
      }
    }
    for (const x of [0.40, -0.20, -0.55]) {
      const cb = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.025, 1.10), M.rackBar)
      cb.position.set(x, 0.715, 0)
      root.add(cb)
    }

    const duffel = roundedBox(0.55, 0.18, 0.85, 0.07, M.luggageRed, 0.04)
    duffel.position.set(-0.30, 0.85, 0.05)
    root.add(duffel)
    const strap1 = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.025, 0.08), M.blackTrim)
    strap1.position.set(-0.30, 0.95, -0.20)
    root.add(strap1)
    const strap2 = strap1.clone()
    strap2.position.set(-0.30, 0.95, 0.30)
    root.add(strap2)

    const trunkBox = roundedBox(0.40, 0.20, 0.50, 0.04, M.luggageBeige, 0.025)
    trunkBox.position.set(0.30, 0.86, -0.25)
    root.add(trunkBox)
    const trunkLine = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.005, 0.52), M.blackTrim)
    trunkLine.position.set(0.30, 0.95, -0.25)
    root.add(trunkLine)

    const lightBarHousing = roundedBox(0.10, 0.06, 0.45, 0.02, M.blackTrim)
    lightBarHousing.position.set(0.55, 0.78, 0.30)
    root.add(lightBarHousing)
    for (let i = 0; i < 3; i++) {
      const led = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.04, 12), M.headlight)
      led.rotation.z = Math.PI / 2
      led.position.set(0.61, 0.78, 0.18 + i * 0.12)
      root.add(led)
    }

    // === SIDE MIRRORS ===
    for (const side of [-1, 1]) {
      const stem = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.10), M.paint)
      stem.position.set(0.45, 0.40, side * 0.66)
      root.add(stem)
      const mirrorBack = roundedBox(0.10, 0.10, 0.045, 0.025, M.mirrorBack)
      mirrorBack.position.set(0.45, 0.40, side * 0.78)
      mirrorBack.rotation.y = side === 1 ? -0.35 : 0.35
      root.add(mirrorBack)
      const mirrorFace = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.075, 0.005), M.mirrorFace)
      mirrorFace.position.set(0.45, 0.40, side * 0.81)
      mirrorFace.rotation.y = side === 1 ? -0.35 : 0.35
      root.add(mirrorFace)
    }

    // === WHEEL ARCHES (extruded shape) ===
    const archShape = new THREE.Shape()
    archShape.absarc(0, 0, 0.62, Math.PI * 0.05, Math.PI * 0.95, false)
    archShape.absarc(0, 0, 0.48, Math.PI * 0.95, Math.PI * 0.05, true)
    archShape.closePath()
    const archGeo = new THREE.ExtrudeGeometry(archShape, {
      depth: 0.42, bevelEnabled: true, bevelSize: 0.025, bevelThickness: 0.025, bevelSegments: 2,
    })
    archGeo.translate(0, 0, -0.21); archGeo.computeVertexNormals()
    for (const ax of [0.95, -0.95]) {
      for (const side of [-1, 1]) {
        const arch = new THREE.Mesh(archGeo, M.wheelArch)
        arch.position.set(ax, -0.05, side * 0.62)
        arch.castShadow = true
        root.add(arch)
      }
    }

    // === INTERIOR (visible through glass) ===
    for (const side of [-1, 1]) {
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.42, 0.30), M.interior)
      seat.position.set(-0.05, 0.30, side * 0.30)
      root.add(seat)
    }
    const dash = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.95), M.interior)
    dash.position.set(0.40, 0.36, 0)
    root.add(dash)
    const sw = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.012, 8, 18), M.blackTrim)
    sw.position.set(0.30, 0.46, -0.30)
    sw.rotation.y = Math.PI / 2
    sw.rotation.x = 0.3
    root.add(sw)

    // (Removed the SpotLight headlights — each spotlight added per-fragment
    // lighting cost across the entire scene, killing framerate. The emissive
    // headlight bulbs above are enough visual fidelity.)

    return root
  }

  // ============================================================
  // 🛞 BUILD WHEEL (detailed off-road tire with tread + rim + spokes)
  // ============================================================
  function buildWheel(isLeft) {
    const root = new THREE.Group()
    const R = 0.45, W = 0.32

    const tireGeo = new THREE.CylinderGeometry(R, R, W, 28, 1)
    tireGeo.rotateX(Math.PI / 2)
    const tire = new THREE.Mesh(tireGeo, M.rubber)
    tire.castShadow = true; tire.receiveShadow = true
    root.add(tire)

    // Chunky tread blocks
    const TREAD_COUNT = 16
    for (let i = 0; i < TREAD_COUNT; i++) {
      const a = (i / TREAD_COUNT) * Math.PI * 2
      const tg = new THREE.BoxGeometry(0.10, 0.04, W * 0.85)
      const tread = new THREE.Mesh(tg, M.rubber)
      tread.position.set(Math.cos(a) * (R + 0.018), Math.sin(a) * (R + 0.018), 0)
      tread.rotation.z = a
      tread.castShadow = true
      root.add(tread)
    }

    for (const zSide of [-W * 0.5, W * 0.5]) {
      const sw = new THREE.Mesh(new THREE.CircleGeometry(R - 0.02, 28), M.rubber)
      sw.position.z = zSide + (zSide > 0 ? 0.001 : -0.001)
      sw.rotation.y = zSide > 0 ? 0 : Math.PI
      root.add(sw)
    }

    const rimOuter = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.06, R - 0.06, W * 0.85, 20), M.rim)
    rimOuter.rotateX(Math.PI / 2)
    root.add(rimOuter)

    const faceZ = isLeft ? -W * 0.46 : W * 0.46
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 0.03, 16), M.rim)
    hub.rotateX(Math.PI / 2)
    hub.position.z = faceZ
    root.add(hub)

    // 5-spoke
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2
      const sg = new THREE.BoxGeometry(R * 0.6, 0.06, 0.025)
      const spoke = new THREE.Mesh(sg, M.rim)
      spoke.position.set(Math.cos(a) * R * 0.36, Math.sin(a) * R * 0.36, faceZ)
      spoke.rotation.z = a
      spoke.castShadow = true
      root.add(spoke)
    }

    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.015, 14), M.chrome)
    cap.rotateX(Math.PI / 2)
    cap.position.z = isLeft ? -W * 0.5 : W * 0.5
    root.add(cap)

    return root
  }

  // ============================================================
  // ⚙️ Vehicle physics (Rapier DynamicRayCastVehicleController)
  // ============================================================
  const CHASSIS_HW = 1.0, CHASSIS_HH = 0.35, CHASSIS_HD = 0.6
  const startH = getH(0, 0) + 3
  const chassisBody = physicsWorld.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic().setTranslation(0, startH, 0).setCanSleep(false)
  )
  physicsWorld.createCollider(
    RAPIER.ColliderDesc.cuboid(CHASSIS_HW, CHASSIS_HH, CHASSIS_HD)
      .setMassProperties(2.5, { x: 0, y: -0.3, z: 0 }, { x: 0.4, y: 1.1, z: 0.9 }, { x: 0, y: 0, z: 0, w: 1 })
      .setFriction(0.5),
    chassisBody
  )

  const chassisGroup = buildSUV()
  scene.add(chassisGroup)

  const vehicle = physicsWorld.createVehicleController(chassisBody)
  const WHEEL_R = 0.45
  const WHEEL_OFF = { x: 1.0, y: 0.1, z: 0.78 }
  const SUSP_REST = 0.55
  const wheelConns = [
    { x:  WHEEL_OFF.x, y: WHEEL_OFF.y, z:  WHEEL_OFF.z },
    { x:  WHEEL_OFF.x, y: WHEEL_OFF.y, z: -WHEEL_OFF.z },
    { x: -WHEEL_OFF.x, y: WHEEL_OFF.y, z:  WHEEL_OFF.z },
    { x: -WHEEL_OFF.x, y: WHEEL_OFF.y, z: -WHEEL_OFF.z },
  ]
  const dirCs = { x: 0, y: -1, z: 0 }
  const axleCs = { x: 0, y: 0, z: 1 }
  const wheelMeshes = []
  const wheelSpins = [0, 0, 0, 0]
  for (let i = 0; i < 4; i++) {
    vehicle.addWheel(wheelConns[i], dirCs, axleCs, SUSP_REST, WHEEL_R)
    vehicle.setWheelFrictionSlip(i, 2.0)
    vehicle.setWheelSuspensionStiffness(i, 14)
    vehicle.setWheelMaxSuspensionForce(i, 350)
    vehicle.setWheelMaxSuspensionTravel(i, 1.2)
    vehicle.setWheelSuspensionCompression(i, 1.8)
    vehicle.setWheelSuspensionRelaxation(i, 4.5)
    vehicle.setWheelSideFrictionStiffness(i, 2.2)
    const isLeft = wheelConns[i].z < 0
    const wm = buildWheel(isLeft)
    scene.add(wm)
    wheelMeshes.push(wm)
  }

  // ============================================================
  // 🪨 Scattered scenery — streaming cells of rocks + crates
  // ============================================================
  const _rockGeoCache = []
  for (let g = 0; g < 8; g++) {
    const geo = new THREE.SphereGeometry(1, 16, 12)
    const pos = geo.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i)
      const len = Math.hypot(x, y, z) || 1
      const ux = x / len, uy = y / len, uz = z / len
      const n1 = Math.sin(ux * 4 + g) * Math.cos(uz * 3 + g * 0.7) * 0.18
      const n2 = Math.sin(uy * 5 + g * 1.3) * 0.08
      const d = n1 + n2
      pos.setXYZ(i, x * (1 + d), y * (1 + d) * 0.5, z * (1 + d))
    }
    geo.computeVertexNormals()
    _rockGeoCache.push(geo)
  }
  const rockMats = [
    new THREE.MeshStandardMaterial({ color: '#b7c0cc', roughness: 0.95 }),
    new THREE.MeshStandardMaterial({ color: '#a4afbd', roughness: 0.97 }),
    new THREE.MeshStandardMaterial({ color: '#c8d2dd', roughness: 0.92 }),
  ]
  // snowy pine trees — a layered fir: 3 stacked tapered tiers (big→small) with
  // snow on each tier, a tapered trunk, and a snow star at the tip. Shared geo,
  // assembled per-tree in buildCell. Higher poly + silhouette than the old cone.
  const pineFoliageMat = new THREE.MeshStandardMaterial({ color: '#2f5e44', roughness: 0.92, flatShading: true })
  const pineFoliageMat2 = new THREE.MeshStandardMaterial({ color: '#37684c', roughness: 0.92, flatShading: true })
  const pineSnowMat = new THREE.MeshStandardMaterial({ color: '#f3f8fc', roughness: 0.8, flatShading: true })
  const pineTrunkMat = new THREE.MeshStandardMaterial({ color: '#5a4434', roughness: 0.9 })
  // three foliage tiers (radius, height) bottom→top, slightly overlapping
  const pineTierGeo = [
    new THREE.ConeGeometry(1.15, 1.5, 9),   // bottom (widest)
    new THREE.ConeGeometry(0.85, 1.3, 9),   // middle
    new THREE.ConeGeometry(0.52, 1.1, 9),   // top
  ]
  // a thin snow ring sitting on each tier's shoulders
  const pineSnowTierGeo = [
    new THREE.ConeGeometry(1.18, 0.42, 9),
    new THREE.ConeGeometry(0.88, 0.38, 9),
    new THREE.ConeGeometry(0.55, 0.34, 9),
  ]
  const pineTrunkGeo2 = new THREE.CylinderGeometry(0.14, 0.22, 0.8, 7)
  const pineTipGeo = new THREE.OctahedronGeometry(0.16, 0)

  const SCATTER_CELL = 14, SCATTER_RANGE = 9
  const scatterCells = new Map()
  const scatterGroup = new THREE.Group()
  scene.add(scatterGroup)

  function srand(x, z, s) {
    const n = Math.sin(x * 12.9898 + z * 78.233 + s * 43.123) * 43758.5453
    return n - Math.floor(n)
  }
  function buildCell(cx, cz) {
    const key = cx + ',' + cz
    if (scatterCells.has(key)) return
    const objs = []
    const wx0 = cx * SCATTER_CELL, wz0 = cz * SCATTER_CELL

    if (srand(wx0, wz0, 1) < 0.32) {
      const wx = wx0 + (srand(wx0, wz0, 2) - 0.5) * SCATTER_CELL * 0.7
      const wz = wz0 + (srand(wx0, wz0, 3) - 0.5) * SCATTER_CELL * 0.7
      const h = getH(wx, wz) + GROUND_Y_OFF
      if (h >= biomeSettings.waterLevel - 0.5) {
        const count = 1 + Math.floor(srand(wx0, wz0, 4) * 3)
        for (let i = 0; i < count; i++) {
          const dx = (srand(wx0, wz0, 5 + i) - 0.5) * 2.5
          const dz = (srand(wx0, wz0, 6 + i) - 0.5) * 2.5
          const ph = getH(wx + dx, wz + dz) + GROUND_Y_OFF
          const s = 0.3 + srand(wx0, wz0, 7 + i) * 0.9
          const m = new THREE.Mesh(_rockGeoCache[Math.floor(srand(wx0, wz0, 8 + i) * 8)], rockMats[Math.floor(srand(wx0, wz0, 9 + i) * 3)])
          m.position.set(wx + dx, ph - 0.1 * s, wz + dz)
          m.scale.set(s, s * 0.6, s)
          m.rotation.y = srand(wx0, wz0, 10 + i) * Math.PI * 2
          m.castShadow = true; m.receiveShadow = true
          scatterGroup.add(m); objs.push(m)
        }
      }
    }
    if (srand(wx0, wz0, 20) < 0.10) {
      const wx = wx0 + (srand(wx0, wz0, 21) - 0.5) * SCATTER_CELL * 0.6
      const wz = wz0 + (srand(wx0, wz0, 22) - 0.5) * SCATTER_CELL * 0.6
      const h = getH(wx, wz) + GROUND_Y_OFF
      if (h >= biomeSettings.sandEnd - 0.5) {
        const count = 1 + Math.floor(srand(wx0, wz0, 23) * 3)
        for (let i = 0; i < count; i++) {
          const dx = (srand(wx0, wz0, 24 + i) - 0.5) * 2.0
          const dz = (srand(wx0, wz0, 25 + i) - 0.5) * 2.0
          const ph = getH(wx + dx, wz + dz) + GROUND_Y_OFF
          const s = 1.0 + srand(wx0, wz0, 26 + i) * 1.1
          const tree = new THREE.Group()
          const trunk = new THREE.Mesh(pineTrunkGeo2, pineTrunkMat); trunk.position.y = 0.4; trunk.castShadow = true; tree.add(trunk)
          // 3 stacked tiers, each = green cone + a snow cone capping its shoulders
          const tierY = [1.05, 1.85, 2.5]
          for (let t = 0; t < 3; t++) {
            const foliage = new THREE.Mesh(pineTierGeo[t], t === 1 ? pineFoliageMat2 : pineFoliageMat)
            foliage.position.y = tierY[t]; foliage.castShadow = true; tree.add(foliage)
            const snow = new THREE.Mesh(pineSnowTierGeo[t], pineSnowMat)
            snow.position.y = tierY[t] + (t === 0 ? 0.62 : t === 1 ? 0.55 : 0.5); tree.add(snow)
          }
          const tip = new THREE.Mesh(pineTipGeo, pineSnowMat); tip.position.y = 3.15; tree.add(tip)
          tree.position.set(wx + dx, ph - 0.05, wz + dz)
          tree.scale.setScalar(s * 0.62)   // tiers are taller; scale down so footprint matches
          tree.rotation.y = srand(wx0, wz0, 28 + i) * Math.PI * 2
          scatterGroup.add(tree); objs.push(tree)
        }
      }
    }
    scatterCells.set(key, objs)
  }
  function removeCell(key) {
    const objs = scatterCells.get(key); if (!objs) return
    for (const o of objs) scatterGroup.remove(o)
    scatterCells.delete(key)
  }
  let _lastSCX = null, _lastSCZ = null
  let _scatterQueue = []
  function updateScatter(px, pz) {
    const cx = Math.round(px / SCATTER_CELL)
    const cz = Math.round(pz / SCATTER_CELL)
    if (cx === _lastSCX && cz === _lastSCZ) return
    _lastSCX = cx; _lastSCZ = cz
    for (const key of [...scatterCells.keys()]) {
      const sep = key.indexOf(',')
      const kx = parseInt(key.substring(0, sep))
      const kz = parseInt(key.substring(sep + 1))
      if (Math.abs(kx - cx) > SCATTER_RANGE + 1 || Math.abs(kz - cz) > SCATTER_RANGE + 1) removeCell(key)
    }
    _scatterQueue = []
    for (let gx = -SCATTER_RANGE; gx <= SCATTER_RANGE; gx++) {
      for (let gz = -SCATTER_RANGE; gz <= SCATTER_RANGE; gz++) {
        const key = (cx + gx) + ',' + (cz + gz)
        if (!scatterCells.has(key)) _scatterQueue.push({ cx: cx + gx, cz: cz + gz, d: gx * gx + gz * gz })
      }
    }
    _scatterQueue.sort((a, b) => a.d - b.d)
  }
  function tickScatterBuild() {
    const count = Math.min(3, _scatterQueue.length)
    for (let i = 0; i < count; i++) {
      const item = _scatterQueue.shift()
      buildCell(item.cx, item.cz)
    }
  }
  updateScatter(0, 0)
  while (_scatterQueue.length > 0) tickScatterBuild()

  // ============================================================
  // 💨 Dust particles — InstancedMesh + CanvasTexture
  // ============================================================
  const dustSettings = {
    emitRate: 0.3, minSpeed: 1.5, lifetime: 0.8, opacity: 0.6, spread: 0.8,
    upwardForce: 2.0, drag: 0.97,
    colorR: 0.96, colorG: 0.98, colorB: 1.0,
    colorR2: 0.82, colorG2: 0.88, colorB2: 0.95,
  }
  const DUST_COUNT = 1000
  const dustData = []
  for (let i = 0; i < DUST_COUNT; i++) dustData.push({ life: 0, maxLife: 0, x: 0, y: -999, z: 0, vx: 0, vy: 0, vz: 0, size: 0 })

  const dustCanvas = document.createElement('canvas')
  dustCanvas.width = 64; dustCanvas.height = 64
  const dctx = dustCanvas.getContext('2d')
  const dgrad = dctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  dgrad.addColorStop(0, 'rgba(255,255,255,1)')
  dgrad.addColorStop(0.25, 'rgba(244,249,255,0.85)')
  dgrad.addColorStop(0.5, 'rgba(228,238,250,0.45)')
  dgrad.addColorStop(0.75, 'rgba(210,224,240,0.15)')
  dgrad.addColorStop(1, 'rgba(200,216,236,0)')
  dctx.fillStyle = dgrad; dctx.fillRect(0, 0, 64, 64)
  const dustTex = new THREE.CanvasTexture(dustCanvas)

  const dustMat = new THREE.MeshBasicMaterial({
    map: dustTex, transparent: true, depthWrite: false, opacity: 0.5, color: 0xffffff,
  })
  const dustQuad = new THREE.PlaneGeometry(1, 1)
  const dustMesh = new THREE.InstancedMesh(dustQuad, dustMat, DUST_COUNT)
  dustMesh.frustumCulled = false
  dustMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  const dustColors = new Float32Array(DUST_COUNT * 3)
  dustMesh.instanceColor = new THREE.InstancedBufferAttribute(dustColors, 3)
  dustMesh.instanceColor.setUsage(THREE.DynamicDrawUsage)
  const _dm = new THREE.Matrix4(), _dp = new THREE.Vector3(), _ds = new THREE.Vector3()
  for (let i = 0; i < DUST_COUNT; i++) { _dm.makeScale(0, 0, 0); dustMesh.setMatrixAt(i, _dm) }
  dustMesh.instanceMatrix.needsUpdate = true
  scene.add(dustMesh)
  let dustIdx = 0
  function emitDust(wx, wy, wz, vx, vz, count) {
    for (let n = 0; n < count * 3; n++) {
      const i = dustIdx++ % DUST_COUNT
      const d = dustData[i]
      d.x = wx + (Math.random() - 0.5) * dustSettings.spread
      d.y = wy - WHEEL_R * 0.8 + Math.random() * 0.1
      d.z = wz + (Math.random() - 0.5) * dustSettings.spread
      d.vx = vx * 0.15 + (Math.random() - 0.5) * 1.5
      d.vy = Math.random() * dustSettings.upwardForce * 0.5 + 0.25
      d.vz = vz * 0.15 + (Math.random() - 0.5) * 1.5
      d.maxLife = dustSettings.lifetime + Math.random() * 1.0
      d.life = d.maxLife
      d.size = 0.15 + Math.random() * 0.25
    }
  }
  function updateDust(dt) {
    for (let i = 0; i < DUST_COUNT; i++) {
      const d = dustData[i]
      if (d.life <= 0) { _dm.makeScale(0, 0, 0); dustMesh.setMatrixAt(i, _dm); dustColors[i * 3] = 0; dustColors[i * 3 + 1] = 0; dustColors[i * 3 + 2] = 0; continue }
      d.life -= dt
      d.x += d.vx * dt; d.y += d.vy * dt; d.z += d.vz * dt
      d.vx *= dustSettings.drag; d.vy *= (dustSettings.drag - 0.01); d.vz *= dustSettings.drag
      const t = Math.max(0, d.life / d.maxLife)
      const smoothT = t * t * (3 - 2 * t)
      const grow = d.size * (1 + (1 - t) * 1.5) * smoothT
      const cT = 1 - t
      dustColors[i * 3] = dustSettings.colorR + (dustSettings.colorR2 - dustSettings.colorR) * cT
      dustColors[i * 3 + 1] = dustSettings.colorG + (dustSettings.colorG2 - dustSettings.colorG) * cT
      dustColors[i * 3 + 2] = dustSettings.colorB + (dustSettings.colorB2 - dustSettings.colorB) * cT
      _dp.set(d.x, d.y, d.z); _ds.set(grow, grow, grow)
      _dm.compose(_dp, camera.quaternion, _ds)
      dustMesh.setMatrixAt(i, _dm)
    }
    dustMesh.instanceMatrix.needsUpdate = true
    dustMesh.instanceColor.needsUpdate = true
  }

  // ============================================================
  // 💦 Splash particles (water) — InstancedMesh
  // ============================================================
  const splashSettings = { emitRate: 0.5, minSpeed: 0.8, lifetime: 0.6, spread: 0.6, upwardForce: 4.0, drag: 0.94, colorR: 0.45, colorG: 0.75, colorB: 0.78 }
  const SPLASH_COUNT = 300
  const splashData = []
  for (let i = 0; i < SPLASH_COUNT; i++) splashData.push({ life: 0, maxLife: 0, x: 0, y: -999, z: 0, vx: 0, vy: 0, vz: 0, size: 0, gravity: 0 })

  const splashTexCanvas = document.createElement('canvas')
  splashTexCanvas.width = 64; splashTexCanvas.height = 64
  const sctx = splashTexCanvas.getContext('2d')
  const sgrad = sctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  sgrad.addColorStop(0, 'rgba(255,255,255,1)')
  sgrad.addColorStop(0.4, 'rgba(180,220,230,0.6)')
  sgrad.addColorStop(1, 'rgba(120,180,200,0)')
  sctx.fillStyle = sgrad; sctx.fillRect(0, 0, 64, 64)
  const splashTex = new THREE.CanvasTexture(splashTexCanvas)

  const splashMat = new THREE.MeshBasicMaterial({ map: splashTex, transparent: true, depthWrite: false, opacity: 0.6, color: 0xffffff })
  const splashMesh = new THREE.InstancedMesh(dustQuad, splashMat, SPLASH_COUNT)
  splashMesh.frustumCulled = false
  splashMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  const splashColors = new Float32Array(SPLASH_COUNT * 3)
  splashMesh.instanceColor = new THREE.InstancedBufferAttribute(splashColors, 3)
  splashMesh.instanceColor.setUsage(THREE.DynamicDrawUsage)
  for (let i = 0; i < SPLASH_COUNT; i++) { _dm.makeScale(0, 0, 0); splashMesh.setMatrixAt(i, _dm) }
  splashMesh.instanceMatrix.needsUpdate = true
  scene.add(splashMesh)
  let splashIdx = 0
  function emitSplash(wx, wy, wz, vx, vz, count) {
    for (let n = 0; n < count; n++) {
      const i = splashIdx++ % SPLASH_COUNT
      const d = splashData[i]
      d.x = wx + (Math.random() - 0.5) * splashSettings.spread
      d.y = wy + Math.random() * 0.15
      d.z = wz + (Math.random() - 0.5) * splashSettings.spread
      const a = Math.random() * Math.PI * 2
      const sp = 1.5 + Math.random() * 1.0
      d.vx = vx * 0.1 + Math.cos(a) * sp
      d.vy = splashSettings.upwardForce * (0.5 + Math.random() * 0.5)
      d.vz = vz * 0.1 + Math.sin(a) * sp
      d.gravity = 6 + Math.random() * 4
      d.maxLife = splashSettings.lifetime + Math.random() * 0.4
      d.life = d.maxLife
      d.size = 0.08 + Math.random() * 0.15
    }
  }
  function updateSplash(dt) {
    for (let i = 0; i < SPLASH_COUNT; i++) {
      const d = splashData[i]
      if (d.life <= 0) { _dm.makeScale(0, 0, 0); splashMesh.setMatrixAt(i, _dm); splashColors[i * 3] = 0; splashColors[i * 3 + 1] = 0; splashColors[i * 3 + 2] = 0; continue }
      d.life -= dt
      d.x += d.vx * dt; d.vy -= d.gravity * dt; d.y += d.vy * dt; d.z += d.vz * dt
      d.vx *= splashSettings.drag; d.vz *= splashSettings.drag
      const t = Math.max(0, d.life / d.maxLife)
      const smoothT = t * t * (3 - 2 * t)
      const grow = d.size * (1 + (1 - t) * 0.8) * smoothT
      const white = 0.3 * (1 - t)
      splashColors[i * 3] = Math.min(1, splashSettings.colorR + white)
      splashColors[i * 3 + 1] = Math.min(1, splashSettings.colorG + white)
      splashColors[i * 3 + 2] = Math.min(1, splashSettings.colorB + white * 0.5)
      _dp.set(d.x, d.y, d.z); _ds.set(grow, grow, grow)
      _dm.compose(_dp, camera.quaternion, _ds)
      splashMesh.setMatrixAt(i, _dm)
    }
    splashMesh.instanceMatrix.needsUpdate = true
    splashMesh.instanceColor.needsUpdate = true
  }

  // ============================================================
  // 🏁 Checkpoint rings — race mechanic (NEW on top of reference base)
  // ============================================================
  const checkpointWorldPositions = [
    [ 18, -12], [ 38, -28], [ 58, -18], [ 70,  8], [ 56,  35], [ 28,  48],
    [ -8,  42], [-32,  22], [-50, -8], [-38, -32], [-12, -42], [ 5, -25],
  ]
  const checkpoints = []
  for (let idx = 0; idx < checkpointWorldPositions.length; idx++) {
    const [x, z] = checkpointWorldPositions[idx]
    const y = getH(x, z) + 2.6
    const g = new THREE.Group()
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(2.5, 0.22, 14, 36),
      new THREE.MeshStandardMaterial({
        color: 0x6fe0ff, emissive: 0x33b8e6, emissiveIntensity: 1.4,
        roughness: 0.4, metalness: 0.5,
      })
    )
    ring.rotation.x = Math.PI / 2
    ring.castShadow = true
    g.add(ring)
    const glow = new THREE.PointLight(0x55cdf0, 1.8, 16)
    glow.position.y = 1
    g.add(glow)
    // A soft glowing disc filling the ring — a "gate" you can see from afar
    // WITHOUT a sky-line beacon. Lies flat-ish, faces up, gently pulses.
    const fill = new THREE.Mesh(
      new THREE.CircleGeometry(2.3, 32),
      new THREE.MeshBasicMaterial({ color: 0x9fefff, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false })
    )
    fill.rotation.x = -Math.PI / 2
    fill.position.y = 0.1
    g.add(fill)
    g.position.set(x, y, z)
    scene.add(g)
    checkpoints.push({ group: g, ring, glow, fill, pos: new THREE.Vector3(x, y, z), idx, passed: false })
  }

  // ============================================================
  // 🎮 Input
  // ============================================================
  const keys = {}
  container.tabIndex = 0
  container.style.outline = 'none'
  const onKeyDown = (e) => {
    keys[e.code] = true
    if (['KeyW','KeyA','KeyS','KeyD','Space','ShiftLeft','ShiftRight','KeyR'].includes(e.code)) e.preventDefault()
    if (e.code === 'KeyR') resetCar()
  }
  const onKeyUp = (e) => { keys[e.code] = false }
  container.addEventListener('keydown', onKeyDown)
  container.addEventListener('keyup', onKeyUp)
  container.addEventListener('mousedown', () => container.focus())
  container.focus()

  function resetCar() {
    const h2 = getH(0, 0) + 3
    chassisBody.setTranslation({ x: 0, y: h2, z: 0 }, true)
    chassisBody.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true)
    chassisBody.setLinvel({ x: 0, y: 0, z: 0 }, true)
    chassisBody.setAngvel({ x: 0, y: 0, z: 0 }, true)
    wheelSpins.fill(0)
  }

  // ============================================================
  // 🎨 HUD — glassmorphism (overlays on container)
  // ============================================================
  const hudStyle =
    'position:absolute;background:rgba(20,12,8,0.36);backdrop-filter:blur(18px) saturate(160%);' +
    '-webkit-backdrop-filter:blur(18px) saturate(160%);border:1px solid rgba(255,200,150,0.12);' +
    'border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.4),inset 0 1px 0 rgba(255,255,255,0.08);' +
    'padding:12px 16px;pointer-events:none;user-select:none;color:#ffe5cc;font:13px -apple-system,sans-serif;'

  const speedPanel = document.createElement('div')
  speedPanel.style.cssText = hudStyle + 'top:18px;left:18px;min-width:138px;'
  speedPanel.innerHTML = `
    <div style="font-size:10px;letter-spacing:3px;text-transform:uppercase;opacity:0.55;margin-bottom:4px;">Speed</div>
    <div style="font-size:34px;font-weight:100;font-variant-numeric:tabular-nums;line-height:1;">
      <span id="dd-speed">0</span><span style="font-size:12px;opacity:0.55;margin-left:4px;">km/h</span>
    </div>
  `
  container.appendChild(speedPanel)

  const timePanel = document.createElement('div')
  timePanel.style.cssText = hudStyle + 'top:18px;right:18px;min-width:138px;text-align:right;'
  timePanel.innerHTML = `
    <div style="font-size:10px;letter-spacing:3px;text-transform:uppercase;opacity:0.55;margin-bottom:4px;">Time</div>
    <div style="font-size:34px;font-weight:100;font-variant-numeric:tabular-nums;line-height:1;">
      <span id="dd-time">60.0</span><span style="font-size:12px;opacity:0.55;margin-left:4px;">s</span>
    </div>
  `
  container.appendChild(timePanel)

  const cpPanel = document.createElement('div')
  cpPanel.style.cssText = hudStyle + 'top:18px;left:50%;transform:translateX(-50%);padding:9px 16px;'
  cpPanel.innerHTML = `
    <span style="font-size:10px;letter-spacing:3px;text-transform:uppercase;opacity:0.6;">Checkpoint</span>
    <span id="dd-cp" style="margin-left:8px;font-size:16px;font-weight:300;color:#ffeec0;">0 / ${checkpoints.length}</span>
  `
  container.appendChild(cpPanel)

  const ctrlPanel = document.createElement('div')
  ctrlPanel.style.cssText = hudStyle + 'bottom:18px;left:18px;font-size:12px;'
  const kbd = (s) => `<span style="background:rgba(255,200,150,0.10);padding:2px 7px;border-radius:5px;border:1px solid rgba(255,200,150,0.20);font:10px monospace;color:#ffeec0;margin-right:4px;">${s}</span>`
  ctrlPanel.innerHTML = `${kbd('WASD')}Drive ${kbd('Shift')}Boost ${kbd('Space')}Jump ${kbd('R')}Reset`
  container.appendChild(ctrlPanel)

  const compassPanel = document.createElement('div')
  compassPanel.style.cssText = hudStyle + 'bottom:18px;right:18px;width:108px;height:108px;padding:0;overflow:hidden;'
  compassPanel.innerHTML = `
    <div style="position:absolute;top:8px;left:12px;font-size:9px;letter-spacing:2px;opacity:0.55;text-transform:uppercase;">Next CP</div>
    <svg viewBox="0 0 108 108" style="position:absolute;inset:0;width:100%;height:100%;">
      <circle cx="54" cy="54" r="38" fill="none" stroke="rgba(255,200,150,0.14)" stroke-width="1"/>
      <circle cx="54" cy="54" r="3" fill="rgba(255,200,150,0.7)"/>
      <g id="dd-arrow"><path d="M 54 22 L 60 42 L 54 38 L 48 42 Z" fill="#ffcc55"/></g>
    </svg>
    <div id="dd-cp-dist" style="position:absolute;bottom:6px;right:12px;font-size:11px;opacity:0.7;font-variant-numeric:tabular-nums;">--m</div>
  `
  container.appendChild(compassPanel)

  const messageEl = document.createElement('div')
  messageEl.style.cssText = 'position:absolute;top:42%;left:50%;transform:translate(-50%,-50%);color:#fff;font:200 56px -apple-system,sans-serif;letter-spacing:10px;text-shadow:0 0 30px rgba(255,180,80,0.7);pointer-events:none;opacity:0;transition:opacity 0.5s;text-align:center;'
  container.appendChild(messageEl)

  const speedEl = speedPanel.querySelector('#dd-speed')
  const timeEl = timePanel.querySelector('#dd-time')
  const cpEl = cpPanel.querySelector('#dd-cp')
  const arrowEl = compassPanel.querySelector('#dd-arrow')
  const cpDistEl = compassPanel.querySelector('#dd-cp-dist')

  function showMessage(text, dur = 0) {
    messageEl.innerHTML = text
    messageEl.style.opacity = '1'
    if (dur > 0) setTimeout(() => { messageEl.style.opacity = '0' }, dur)
  }
  showMessage('SNOW DRIFT<div style="font-size:11px;letter-spacing:4px;opacity:0.6;margin-top:14px;">DRIVE THROUGH RINGS</div>', 3000)

  // (Bloom removed — the reference doesn't use it and it cost ~5ms/frame
  // for a marginal aesthetic gain when the sky already has bloom-like
  // tone-mapping bloom from ACES. Direct render is much smoother.)

  // ============================================================
  // 🎮 Game state + main loop
  // ============================================================
  const carSettings = {
    steer: 0.5, acceleration: 6, deceleration: 0.23, maxSpeed: 16,
    boostMultiplier: 2.2, jumpForce: 6, jumpCrouchTime: 0.05,
    flipForce: 2, grip: 2, tireLerp: 0.3,
  }
  const cameraSettings = { distance: 8, height: 4, lookHeight: 1, smoothing: 0.06 }

  const chassisPos = new THREE.Vector3()
  const chassisQuat = new THREE.Quaternion()
  const tmpV = new THREE.Vector3()
  const tmpQ = new THREE.Quaternion()
  const tmpQ2 = new THREE.Quaternion()
  const cameraIdeal = new THREE.Vector3()
  const SPIN_AXIS = new THREE.Vector3(0, 0, 1)
  const UP = new THREE.Vector3(0, 1, 0)

  let lastGroundX = 0, lastGroundZ = 0
  let jumpState = 'ready', jumpTimer = 0, prevSpace = false
  let frameCount = 0
  let timeAccum = 0

  let nextCheckpoint = 0
  let timeRemaining = 60
  let totalTime = 0
  let state = 'driving'

  let disposed = false

  // The page owns requestAnimationFrame; this is the former loop body (same order).
  function renderFrame(dt) {
    if (disposed) return
    const dtReal = Math.min(0.033, dt)
    timeAccum += FIXED_DT
    waterUniforms.uTime.value = timeAccum

    const accel = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0)
    const steer = (keys.KeyA ? 1 : 0) - (keys.KeyD ? 1 : 0)
    const spaceDown = !!keys.Space
    const jumpPressed = spaceDown && !prevSpace
    prevSpace = spaceDown
    const boosting = !!keys.ShiftLeft || !!keys.ShiftRight

    if (state === 'driving') {
      totalTime += dtReal
      timeRemaining = Math.max(0, timeRemaining - dtReal)
      if (timeRemaining === 0) {
        state = 'failed'
        showMessage(`TIME UP<div style="font-size:11px;letter-spacing:4px;opacity:0.6;margin-top:14px;">${nextCheckpoint}/${checkpoints.length} CP · PRESS R</div>`)
      }
    }

    const vel = chassisBody.linvel()
    const fwd = tmpV.set(1, 0, 0).applyQuaternion(chassisQuat)
    const fSpeed = fwd.x * vel.x + fwd.y * vel.y + fwd.z * vel.z
    const speed = Math.hypot(vel.x, vel.y, vel.z)

    const top = carSettings.maxSpeed * (boosting ? carSettings.boostMultiplier : 1)
    const over = Math.max(0, Math.abs(fSpeed) - top)
    let engine = (accel * carSettings.acceleration * (boosting ? carSettings.boostMultiplier : 1)) / (1 + over)
    let brake = 0
    if (!accel) brake = carSettings.deceleration * 0.15
    if (speed > 0.5 && ((accel > 0 && fSpeed < -0.5) || (accel < 0 && fSpeed > 0.5))) {
      brake = carSettings.deceleration; engine = 0
    }

    const chassisUp = tmpV.set(0, 1, 0).applyQuaternion(chassisQuat)
    const isUpsideDown = chassisUp.y < Math.cos(84 * Math.PI / 180)
    if (isUpsideDown && jumpPressed) {
      const mass = chassisBody.mass()
      chassisBody.applyImpulse({ x: 0, y: carSettings.flipForce * mass, z: 0 }, true)
      const t = tmpV.set(1, 0, 0).applyQuaternion(chassisQuat).multiplyScalar(carSettings.flipForce * 0.66 * mass)
      chassisBody.applyTorqueImpulse({ x: t.x, y: t.y, z: t.z }, true)
      jumpState = 'cooldown'; jumpTimer = 0
    }

    let onGround = 0
    for (let i = 0; i < 4; i++) if (vehicle.wheelIsInContact(i)) onGround++
    if (!isUpsideDown && jumpState === 'ready' && jumpPressed && onGround >= 2) {
      jumpState = 'crouching'; jumpTimer = 0
    }
    if (jumpState === 'crouching') {
      jumpTimer += FIXED_DT
      for (let i = 0; i < 4; i++) {
        vehicle.setWheelSuspensionRestLength(i, 0.05)
        vehicle.setWheelSuspensionStiffness(i, 80)
      }
      if (jumpTimer >= carSettings.jumpCrouchTime) {
        for (let i = 0; i < 4; i++) {
          vehicle.setWheelSuspensionRestLength(i, SUSP_REST)
          vehicle.setWheelSuspensionStiffness(i, 14)
        }
        const up = tmpV.set(0, 1, 0).applyQuaternion(chassisQuat)
        const mass = chassisBody.mass()
        chassisBody.applyImpulse({
          x: up.x * carSettings.jumpForce * mass,
          y: up.y * carSettings.jumpForce * mass,
          z: up.z * carSettings.jumpForce * mass,
        }, true)
        jumpState = 'cooldown'; jumpTimer = 0
      }
    }
    if (jumpState === 'cooldown') {
      jumpTimer += FIXED_DT
      if (jumpTimer > 0.3 && onGround >= 2) jumpState = 'ready'
    }

    const steerAngle = steer * carSettings.steer * Math.sqrt(carSettings.acceleration / 5)
    vehicle.setWheelSteering(0, steerAngle); vehicle.setWheelSteering(1, steerAngle)
    for (let i = 0; i < 4; i++) {
      vehicle.setWheelEngineForce(i, engine)
      vehicle.setWheelBrake(i, brake)
      vehicle.setWheelFrictionSlip(i, carSettings.grip)
    }

    // Underwater drag
    if (chassisPos.y < biomeSettings.waterLevel) {
      const v = chassisBody.linvel()
      const drag = 0.92
      chassisBody.setLinvel({ x: v.x * drag, y: v.y * drag, z: v.z * drag }, true)
    }

    vehicle.updateVehicle(FIXED_DT)
    physicsWorld.step()

    const p = chassisBody.translation()
    const r = chassisBody.rotation()
    chassisPos.set(p.x, p.y, p.z)
    chassisQuat.set(r.x, r.y, r.z, r.w)
    chassisGroup.position.copy(chassisPos)
    chassisGroup.quaternion.copy(chassisQuat)

    // Wheels
    for (let i = 0; i < 4; i++) {
      const conn = wheelConns[i]
      const inContact = vehicle.wheelIsInContact(i)
      const sLen = inContact ? (vehicle.wheelSuspensionLength(i) ?? SUSP_REST) : SUSP_REST
      tmpV.set(conn.x, conn.y - sLen, conn.z).applyQuaternion(chassisQuat).add(chassisPos)
      wheelMeshes[i].position.x = tmpV.x
      wheelMeshes[i].position.y = THREE.MathUtils.lerp(wheelMeshes[i].position.y, tmpV.y, carSettings.tireLerp)
      wheelMeshes[i].position.z = tmpV.z
      tmpQ.copy(chassisQuat)
      if (i < 2) tmpQ.multiply(tmpQ2.setFromAxisAngle(UP, steerAngle))
      if (inContact) wheelSpins[i] -= (fSpeed / WHEEL_R) * FIXED_DT
      tmpQ.multiply(tmpQ2.setFromAxisAngle(SPIN_AXIS, wheelSpins[i]))
      wheelMeshes[i].quaternion.slerp(tmpQ, carSettings.tireLerp)
    }

    // Stream ground
    const snapX = Math.round(chassisPos.x / GROUND_SNAP) * GROUND_SNAP
    const snapZ = Math.round(chassisPos.z / GROUND_SNAP) * GROUND_SNAP
    if (snapX !== lastGroundX || snapZ !== lastGroundZ) {
      lastGroundX = snapX; lastGroundZ = snapZ
      updateGround(snapX, snapZ)
    }
    tickGround()

    // Re-tile heightfield
    const dx = chassisPos.x - hfCenter.x
    const dz = chassisPos.z - hfCenter.z
    if (dx * dx + dz * dz > HF_RETHRESHOLD * HF_RETHRESHOLD) {
      createHFSync(chassisPos.x, chassisPos.z)
    }

    // Scatter
    frameCount++
    if (frameCount % 20 === 0) updateScatter(chassisPos.x, chassisPos.z)
    tickScatterBuild()

    // Water follows
    waterMesh.position.x = chassisPos.x
    waterMesh.position.z = chassisPos.z

    // Sun follows car (so shadows stay tight)
    const azR = lightSettings.azimuth * Math.PI / 180
    const elR = lightSettings.elevation * Math.PI / 180
    const D = 30
    dirLight.position.set(
      chassisPos.x + Math.cos(elR) * Math.sin(azR) * D,
      chassisPos.y + Math.sin(elR) * D,
      chassisPos.z + Math.cos(elR) * Math.cos(azR) * D,
    )
    dirLight.target.position.copy(chassisPos); dirLight.target.updateMatrixWorld()

    // Chase camera
    const camFwd = tmpV.set(1, 0, 0).applyQuaternion(chassisQuat)
    cameraIdeal.copy(chassisPos).addScaledVector(camFwd, -cameraSettings.distance)
    cameraIdeal.y = chassisPos.y + cameraSettings.height
    camera.position.lerp(cameraIdeal, cameraSettings.smoothing)
    camera.lookAt(chassisPos.x, chassisPos.y + cameraSettings.lookHeight, chassisPos.z)

    // Particles
    const groundSpeed = Math.hypot(vel.x, vel.z)
    const inWater = chassisPos.y < biomeSettings.waterLevel + 1.5
    if (onGround >= 2 && groundSpeed > dustSettings.minSpeed && !inWater) {
      const cnt = Math.min(3, Math.floor(groundSpeed * dustSettings.emitRate))
      for (let i = 0; i < 4; i++) {
        if (vehicle.wheelIsInContact(i)) {
          const wp = wheelMeshes[i].position
          emitDust(wp.x, wp.y, wp.z, -vel.x, -vel.z, cnt)
        }
      }
    }
    updateDust(FIXED_DT)

    if (inWater && groundSpeed > splashSettings.minSpeed) {
      const sc = Math.min(5, Math.floor(groundSpeed * splashSettings.emitRate))
      for (let i = 0; i < 4; i++) {
        const wp = wheelMeshes[i].position
        if (wp.y < biomeSettings.waterLevel + 0.5) emitSplash(wp.x, biomeSettings.waterLevel, wp.z, -vel.x, -vel.z, sc)
      }
    }
    updateSplash(FIXED_DT)

    if (chassisPos.y < -30) resetCar()

    // Checkpoint detection — ANY un-passed ring counts (no forced order), so
    // driving through a gate always registers. Generous radius for reliability.
    if (state === 'driving') {
      for (const cp of checkpoints) {
        if (cp.passed) continue
        const dx2 = chassisPos.x - cp.pos.x
        const dz2 = chassisPos.z - cp.pos.z
        const dist = Math.hypot(dx2, dz2)
        if (dist < 3.4 && Math.abs(chassisPos.y - cp.pos.y) < 4.0) {
          cp.passed = true
          // dim it to a spent grey
          cp.ring.material.emissiveIntensity = 0.1
          cp.ring.material.color.setHex(0x6b7682)
          cp.ring.material.emissive.setHex(0x4a525c)
          cp.glow.intensity = 0
          cp.fill.material.opacity = 0
          nextCheckpoint++
          if (nextCheckpoint >= checkpoints.length) {
            state = 'finished'
            showMessage(`FINISHED<div style="font-size:11px;letter-spacing:4px;opacity:0.6;margin-top:14px;">TIME: ${totalTime.toFixed(2)}s · PRESS R</div>`)
          } else {
            timeRemaining = Math.min(timeRemaining + 12, 90)
            showMessage('+12s', 900)
          }
        }
      }
    }

    // Animate checkpoints (spin the ring + pulse the gate fill)
    for (const cp of checkpoints) {
      if (cp.passed) continue
      cp.group.rotation.y += dtReal * 0.6
      cp.fill.material.opacity = 0.16 + 0.10 * Math.sin(timeAccum * 2 + cp.idx)
    }

    // HUD updates
    speedEl.textContent = Math.round(Math.abs(fSpeed) * 3.6 * 1.5)
    timeEl.textContent = timeRemaining.toFixed(1)
    timeEl.style.color = timeRemaining < 5 ? '#ff5544' : '#ffe5cc'
    cpEl.textContent = `${nextCheckpoint} / ${checkpoints.length}`
    if (state === 'driving' && nextCheckpoint < checkpoints.length) {
      const cp = checkpoints[nextCheckpoint]
      const dxc = cp.pos.x - chassisPos.x
      const dzc = cp.pos.z - chassisPos.z
      const cpAng = Math.atan2(dxc, -dzc)
      // Vehicle heading from quaternion
      const fwdQ = tmpV.set(1, 0, 0).applyQuaternion(chassisQuat)
      const carYaw = Math.atan2(-fwdQ.z, fwdQ.x) - Math.PI / 2
      const rel = cpAng - carYaw
      arrowEl.setAttribute('transform', `rotate(${rel * 180 / Math.PI}, 54, 54)`)
      cpDistEl.textContent = `${Math.hypot(dxc, dzc).toFixed(0)}m`
    }

    renderer.render(scene, camera)
  }

  return {
    renderFrame,
    dispose() {
      disposed = true
      container.removeEventListener('keydown', onKeyDown)
      container.removeEventListener('keyup', onKeyUp)
      speedPanel.remove(); timePanel.remove(); cpPanel.remove()
      ctrlPanel.remove(); compassPanel.remove(); messageEl.remove()
      scene.traverse(c => {
        if (c.isMesh || c.isPoints || c.isInstancedMesh) {
          c.geometry?.dispose()
          if (Array.isArray(c.material)) c.material.forEach(m => m.dispose())
          else c.material?.dispose()
        }
      })
      renderer.dispose()
      container.querySelectorAll('canvas').forEach(c => c.remove())
    },
    resize() {
      camera.aspect = container.clientWidth / container.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(container.clientWidth, container.clientHeight)
    },
    getCanvas() { return renderer.domElement },
    getScene() { return scene },
    getCamera() { return camera },
    getRenderer() { return renderer },
    getOrbitControls() { return null },
  }
}
