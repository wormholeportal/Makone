/**
 * Neon Drift (3-stage arcade racer)
 *
 * 🟢 USES THREEJS SKILLS:
 *   - threejs-geometry  → CatmullRomCurve3 + custom ribbon road via BufferGeometry
 *   - threejs-materials → MeshToonMaterial for cel-shaded cartoon look
 *   - threejs-fundamentals → Vector3 math, chase camera, Quaternion for orientation
 *
 * Genre: kart-style arcade racer with drift-boost mechanic.
 *
 * Loop: 3 stages, each = 3 laps × 4 cars (you + 3 AI). Top-3 finish = next stage.
 * Stage 1 (Sunset Coast) → Stage 2 (Neon City) → Stage 3 (Cyber Canyon) → WIN.
 *
 * Controls:
 *   W / ↑              accelerate
 *   S / ↓              brake / reverse
 *   A D / ← →          steer
 *   Space (hold)       drift (release for boost — drift longer = bigger boost)
 *   R                  restart on game over
 */

import * as THREE from 'three'
import {
  EventBus,
  Cooldown,
  Stopwatch,
  ScreenShake,
  Flash,
  HUDLayer,
  GlassPanel,
  ParticleSystem,
} from 'makone/game'

export default async function createScene(container) {
  const canvasArea = (container.clientWidth || 800) * (container.clientHeight || 600)
  const lowSpec = (navigator.hardwareConcurrency || 4) <= 4 || canvasArea > 1_800_000
  const pixelRatio = Math.min(window.devicePixelRatio, lowSpec ? 1.25 : 1.5)
  // ───────────────────────────────────────────────────────────────────────────
  // RENDERER · SCENE · CAMERA
  // ───────────────────────────────────────────────────────────────────────────
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'default' })
  renderer.setPixelRatio(pixelRatio)
  renderer.setSize(container.clientWidth, container.clientHeight)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.NoToneMapping
  renderer.shadowMap.enabled = false
  container.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(
    62, container.clientWidth / container.clientHeight, 0.1, 600,
  )

  // ───────────────────────────────────────────────────────────────────────────
  // STAGE THEMES — each stage has palette + curve + scenery type
  // ───────────────────────────────────────────────────────────────────────────
  const STAGES = [
    {
      name: 'Candy Factory',
      nameEn: 'Candy Land',
      palette: {
        skyTop: 0xff77c4, skyMid: 0xffb3e0, skyHorizon: 0xfff0d4,
        ground: 0xf0d4a8, road: 0x6b4423, roadStripe: 0xfff5d0,
        wallA: 0xff4488, wallB: 0x44ddee,
        scenery: 0xff66aa, sceneryAccent: 0xffee44,
      },
      // Gentle oval — friendly first stage
      controlPoints: [
        [0, 0, -45], [25, 0, -45], [40, 0, -28],
        [42, 0, 0], [35, 0, 28], [10, 0, 45],
        [-15, 0, 45], [-38, 0, 30], [-42, 0, 5],
        [-38, 0, -25], [-20, 0, -45],
      ],
      sceneryType: 'candy',
      laps: 3,
      aiSpeed: 0.82,
    },
    {
      name: 'Desert Oasis',
      nameEn: 'Desert Oasis',
      palette: {
        skyTop: 0x4488dd, skyMid: 0xffaa44, skyHorizon: 0xffd66e,
        ground: 0xd8a866, road: 0x4a3a26, roadStripe: 0xfff5a8,
        wallA: 0xc46a3a, wallB: 0x88aa44,
        scenery: 0xc4a44a, sceneryAccent: 0x66cc44,
      },
      controlPoints: [
        [0, 0, -50], [22, 0, -48], [38, 0, -30],
        [30, 0, -10], [40, 0, 15], [25, 0, 38],
        [0, 0, 32], [-20, 0, 45], [-40, 0, 28],
        [-30, 0, 5], [-42, 0, -18], [-22, 0, -45],
      ],
      sceneryType: 'desert',
      laps: 3,
      aiSpeed: 0.92,
    },
    {
      name: 'Mars Canyon',
      nameEn: 'Mars Rally',
      // Bright Mars DAYTIME — peach/cream sky (real Martian daylight is pinkish),
      // warm rust ground, soft pastel walls. Was dark sunset, now noon.
      palette: {
        skyTop: 0xf6a880, skyMid: 0xffd0a0, skyHorizon: 0xfff0d8,
        ground: 0xc46838, road: 0x4a2218, roadStripe: 0xffe888,
        wallA: 0xff9c88, wallB: 0x88c8ff,
        scenery: 0xa84a26, sceneryAccent: 0xffd088,
      },
      controlPoints: [
        [0, 0, -48], [30, 0, -48], [45, 0, -28],
        [25, 0, -8], [42, 0, 18], [30, 0, 45],
        [0, 0, 28], [-22, 0, 48], [-42, 0, 28],
        [-25, 0, 8], [-45, 0, -18], [-28, 0, -45],
      ],
      sceneryType: 'mars',
      laps: 3,
      aiSpeed: 1.0,
    },
  ]

  // ───────────────────────────────────────────────────────────────────────────
  // CONSTANTS — car physics
  // ───────────────────────────────────────────────────────────────────────────
  const ROAD_WIDTH = 6.5
  const MAX_SPEED = 32          // m/s
  const REVERSE_SPEED = 12
  const ACCEL = 14              // approach max speed at this rate
  const BRAKE = 25
  const COAST_DRAG = 1.6
  const STEER_RATE = 1.9        // rad/s base
  const DRIFT_STEER_MUL = 1.7
  const GRIP_NORMAL = 5.2       // lateral velocity damping (higher = grippier)
  const GRIP_DRIFT = 1.0        // lower grip = car slides
  const BOOST_TIER1_TIME = 0.6  // seconds of drift for small boost
  const BOOST_TIER2_TIME = 1.5
  const BOOST_TIER1_DUR = 1.0
  const BOOST_TIER2_DUR = 1.8
  const BOOST_SPEED_MUL = 1.45
  const WALL_BOUNCE = 0.3
  const WALL_SLOWDOWN = 0.55

  // ───────────────────────────────────────────────────────────────────────────
  // SHARED MATERIAL UTILITIES (per threejs-materials skill)
  // ───────────────────────────────────────────────────────────────────────────
  function makeToonGrad(stops) {
    const grad = new Uint8Array(stops)
    const tex = new THREE.DataTexture(grad, stops.length, 1, THREE.RedFormat)
    tex.minFilter = THREE.NearestFilter
    tex.magFilter = THREE.NearestFilter
    tex.needsUpdate = true
    return tex
  }
  const toonGrad4 = makeToonGrad([0x44, 0x88, 0xbb, 0xff])
  function toon(color) {
    return new THREE.MeshToonMaterial({ color, gradientMap: toonGrad4 })
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SKY DOME (per stage, color-themed)
  // ───────────────────────────────────────────────────────────────────────────
  const skyUniforms = {
    top: { value: new THREE.Color() },
    mid: { value: new THREE.Color() },
    horizon: { value: new THREE.Color() },
  }
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: skyUniforms,
    vertexShader: `varying vec3 vN; void main() { vN = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      varying vec3 vN;
      uniform vec3 top; uniform vec3 mid; uniform vec3 horizon;
      void main() {
        float t = clamp(vN.y * 0.5 + 0.5, 0.0, 1.0);
        vec3 col = mix(horizon, mid, smoothstep(0.0, 0.55, t));
        col = mix(col, top, smoothstep(0.5, 1.0, t));
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  })
  const skyDome = new THREE.Mesh(new THREE.SphereGeometry(300, 24, 16), skyMat)
  scene.add(skyDome)

  // ───────────────────────────────────────────────────────────────────────────
  // LIGHTING — simple bright (changes per stage)
  // ───────────────────────────────────────────────────────────────────────────
  const hemi = new THREE.HemisphereLight(0xffffff, 0x222244, 0.85)
  scene.add(hemi)
  const sun = new THREE.DirectionalLight(0xffffff, 1.0)
  sun.position.set(5, 12, 6)
  scene.add(sun)
  const rim = new THREE.DirectionalLight(0xffffff, 0.4)
  rim.position.set(-5, 6, -8)
  scene.add(rim)

  // ───────────────────────────────────────────────────────────────────────────
  // GROUND PLANE (visible beyond the road)
  // ───────────────────────────────────────────────────────────────────────────
  const groundMat = toon(0x224422)
  const groundGeo = new THREE.CircleGeometry(180, 48)
  groundGeo.rotateX(-Math.PI / 2)
  const ground = new THREE.Mesh(groundGeo, groundMat)
  ground.position.y = -0.05
  scene.add(ground)

  // ───────────────────────────────────────────────────────────────────────────
  // STAGE STATE
  // ───────────────────────────────────────────────────────────────────────────
  let currentStageIdx = 0
  let currentStage = null
  let trackCurve = null
  let roadMesh = null
  let wallMeshL = null, wallMeshR = null
  let sceneryGroup = null
  let stripesGroup = null

  /** @typedef {{
   *   group: THREE.Group, color: number,
   *   pos: THREE.Vector3, vel: THREE.Vector3,
   *   facing: number, // radians
   *   isPlayer: boolean,
   *   curveT: number, // 0..1 progress along curve (this lap)
   *   lap: number,
   *   totalProgress: number, // lap + curveT
   *   driftT: number, driftDir: number, boostT: number, boostMul: number,
   *   wheels: THREE.Mesh[], spoiler: THREE.Mesh,
   *   raceTime: number, finished: boolean, finishPlace: number,
   * }} Car */

  /** @type {Car[]} */
  let cars = []
  let playerCar = null

  // ───────────────────────────────────────────────────────────────────────────
  // BUILD TRACK from control points
  // ───────────────────────────────────────────────────────────────────────────
  function buildStage(stageIdx) {
    // Clear existing
    if (roadMesh) { scene.remove(roadMesh); roadMesh.geometry.dispose() }
    if (wallMeshL) { scene.remove(wallMeshL); wallMeshL.geometry.dispose() }
    if (wallMeshR) { scene.remove(wallMeshR); wallMeshR.geometry.dispose() }
    if (sceneryGroup) { scene.remove(sceneryGroup); sceneryGroup.traverse(o => o.geometry?.dispose?.()) }
    if (stripesGroup) { scene.remove(stripesGroup); stripesGroup.traverse(o => o.geometry?.dispose?.()) }

    currentStage = STAGES[stageIdx]
    const p = currentStage.palette

    // Sky colors
    skyUniforms.top.value.setHex(p.skyTop)
    skyUniforms.mid.value.setHex(p.skyMid)
    skyUniforms.horizon.value.setHex(p.skyHorizon)
    // Ground tint
    groundMat.color.setHex(p.ground)
    // Lighting tint
    sun.color.setHex(p.skyHorizon).lerp(new THREE.Color(0xffffff), 0.5)
    hemi.color.setHex(p.skyMid)

    // Build curve (closed loop)
    const pts = currentStage.controlPoints.map(pt => new THREE.Vector3(...pt))
    trackCurve = new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.5)
    trackCurve.arcLengthDivisions = 400

    // Ribbon road
    const segments = 400
    const positions = []
    const uvs = []
    const indices = []
    for (let i = 0; i <= segments; i++) {
      const t = i / segments
      const pp = trackCurve.getPointAt(t)
      const tan = trackCurve.getTangentAt(t).normalize()
      const left = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), tan).normalize()
      const half = ROAD_WIDTH / 2
      positions.push(
        pp.x - left.x * half, pp.y, pp.z - left.z * half,
        pp.x + left.x * half, pp.y, pp.z + left.z * half,
      )
      uvs.push(0, t * 40, 1, t * 40)
      if (i < segments) {
        const a = i * 2
        indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
      }
    }
    const roadGeo = new THREE.BufferGeometry()
    roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    roadGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    roadGeo.setIndex(indices)
    roadGeo.computeVertexNormals()
    roadMesh = new THREE.Mesh(roadGeo, toon(p.road))
    roadMesh.position.y = 0.01
    scene.add(roadMesh)

    // Centerline stripes (dashed white line) — using small box meshes every N units
    stripesGroup = new THREE.Group()
    scene.add(stripesGroup)
    const stripeCount = 60
    for (let i = 0; i < stripeCount; i += 2) {
      const t = i / stripeCount
      const pp = trackCurve.getPointAt(t)
      const tan = trackCurve.getTangentAt(t)
      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.03, 0.9),
        new THREE.MeshBasicMaterial({ color: p.roadStripe }),
      )
      stripe.position.set(pp.x, 0.04, pp.z)
      stripe.rotation.y = Math.atan2(tan.x, tan.z)
      stripesGroup.add(stripe)
    }

    // Walls (left + right side rails) — built as ribbon offset out + raised
    function buildWall(side, color) {
      const wallPos = []
      const wallUvs = []
      const wallIdx = []
      const wallH = 0.5
      for (let i = 0; i <= segments; i++) {
        const t = i / segments
        const pp = trackCurve.getPointAt(t)
        const tan = trackCurve.getTangentAt(t).normalize()
        const left = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), tan).normalize()
        const off = (ROAD_WIDTH / 2 + 0.12) * side
        const bx = pp.x + left.x * off, bz = pp.z + left.z * off
        // bottom
        wallPos.push(bx, 0.02, bz)
        // top
        wallPos.push(bx, wallH, bz)
        wallUvs.push(0, t * 30, 1, t * 30)
        if (i < segments) {
          const a = i * 2
          wallIdx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
        }
      }
      const wgeo = new THREE.BufferGeometry()
      wgeo.setAttribute('position', new THREE.Float32BufferAttribute(wallPos, 3))
      wgeo.setAttribute('uv', new THREE.Float32BufferAttribute(wallUvs, 2))
      wgeo.setIndex(wallIdx)
      wgeo.computeVertexNormals()
      return new THREE.Mesh(wgeo, new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }))
    }
    wallMeshL = buildWall(1, p.wallA)
    wallMeshR = buildWall(-1, p.wallB)
    scene.add(wallMeshL, wallMeshR)

    // Start/finish line — checkered band
    {
      const startT = 0
      const pp = trackCurve.getPointAt(startT)
      const tan = trackCurve.getTangentAt(startT).normalize()
      const left = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), tan).normalize()
      // Checkered pattern using small boxes
      for (let c = -4; c <= 4; c++) {
        for (let r = 0; r < 2; r++) {
          const color = ((c + r) & 1) ? 0xffffff : 0x111111
          const tile = new THREE.Mesh(
            new THREE.BoxGeometry(0.65, 0.04, 0.4),
            new THREE.MeshBasicMaterial({ color }),
          )
          tile.position.set(
            pp.x + left.x * c * 0.7 + tan.x * r * 0.45,
            0.04,
            pp.z + left.z * c * 0.7 + tan.z * r * 0.45,
          )
          tile.rotation.y = Math.atan2(tan.x, tan.z)
          stripesGroup.add(tile)
        }
      }
    }

    // Scenery
    sceneryGroup = new THREE.Group()
    scene.add(sceneryGroup)
    buildScenery(currentStage.sceneryType, p)
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SCENERY — themed for each stage
  // ───────────────────────────────────────────────────────────────────────────
  function buildScenery(type, p) {
    const samples = 50
    for (let i = 0; i < samples; i++) {
      const t = i / samples + Math.random() * 0.005
      const pp = trackCurve.getPointAt(t)
      const tan = trackCurve.getTangentAt(t).normalize()
      const left = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), tan).normalize()
      for (const side of [-1, 1]) {
        const dist = ROAD_WIDTH / 2 + 2.5 + Math.random() * 6
        const x = pp.x + left.x * side * dist
        const z = pp.z + left.z * side * dist
        let obj
        if (type === 'candy') {
          // Alternate lollipops and gumdrops
          obj = Math.random() < 0.5 ? buildLollipop(p) : buildGumdrop(p)
        } else if (type === 'desert') {
          const r = Math.random()
          obj = r < 0.4 ? buildCactus(p) : r < 0.7 ? buildSandDune(p) : buildPalmTree(p)
        } else if (type === 'mars') {
          // Mix of natural Mars (rocks/spires) + colony tech (domes/towers/solar)
          const r = Math.random()
          obj = r < 0.30 ? buildMarsRock(p)
              : r < 0.45 ? buildMarsSpire(p)
              : r < 0.65 ? buildMarsDome(p)
              : r < 0.82 ? buildMarsTower(p)
              :           buildMarsSolar(p)
        }
        if (obj) {
          obj.position.set(x, 0, z)
          obj.rotation.y = Math.random() * Math.PI * 2
          sceneryGroup.add(obj)
        }
      }
    }
    // Mars (daytime): bright sun + pale Phobos high in the sky.
    // Big distant mesas around the horizon for a canyon feel.
    if (type === 'mars') {
      // Bright Mars sun — small, hot, pale
      const marsSun = new THREE.Mesh(
        new THREE.SphereGeometry(5, 24, 18),
        new THREE.MeshBasicMaterial({ color: 0xfff4d0 }),
      )
      marsSun.position.set(60, 40, -85)
      sceneryGroup.add(marsSun)
      // Phobos — small pale moon, daytime visible
      const phobos = new THREE.Mesh(
        new THREE.SphereGeometry(2.2, 14, 10),
        new THREE.MeshBasicMaterial({ color: 0xe8d8c0 }),
      )
      phobos.position.set(-70, 32, -70)
      sceneryGroup.add(phobos)
      // Distant mesa ring — 6 tall flat-top cylinders far out, makes the
      // horizon feel like a canyon basin instead of empty void
      const mesaMat = toon(0x9a4a26)
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + 0.3
        const dist = 95 + Math.random() * 25
        const h = 10 + Math.random() * 14
        const r = 4 + Math.random() * 3
        const mesa = new THREE.Mesh(
          new THREE.CylinderGeometry(r * 0.85, r, h, 8, 1),
          mesaMat,
        )
        mesa.position.set(Math.cos(a) * dist, h / 2 - 1, Math.sin(a) * dist)
        sceneryGroup.add(mesa)
        // Flat cap (slightly lighter, gives layered-rock read)
        const cap = new THREE.Mesh(
          new THREE.CylinderGeometry(r * 0.9, r * 0.85, 0.6, 8),
          toon(0xc4683a),
        )
        cap.position.set(mesa.position.x, h - 1, mesa.position.z)
        sceneryGroup.add(cap)
      }
    }
    // Candy: floating candy clouds above
    if (type === 'candy') {
      for (let i = 0; i < 18; i++) {
        const cloudColors = [0xffc8e0, 0xc8e8ff, 0xffe8a8, 0xddc8ff]
        const cloud = new THREE.Mesh(
          new THREE.SphereGeometry(2 + Math.random() * 2, 10, 8),
          new THREE.MeshBasicMaterial({
            color: cloudColors[i % cloudColors.length],
            transparent: true, opacity: 0.85,
          }),
        )
        const a = Math.random() * Math.PI * 2
        const r = 40 + Math.random() * 60
        cloud.position.set(Math.cos(a) * r, 15 + Math.random() * 10, Math.sin(a) * r)
        cloud.scale.y = 0.5
        sceneryGroup.add(cloud)
      }
    }
    // Desert: heat-haze ripples around horizon (simple low-poly)
    if (type === 'desert') {
      // big sun
      const sun = new THREE.Mesh(
        new THREE.SphereGeometry(7, 24, 18),
        new THREE.MeshBasicMaterial({ color: 0xffeeaa }),
      )
      sun.position.set(40, 20, -85)
      sceneryGroup.add(sun)
    }
  }

  // 🍭 LOLLIPOP — colored sphere on a stick
  function buildLollipop(p) {
    const g = new THREE.Group()
    const h = 3 + Math.random() * 2
    const stick = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, h, 8),
      toon(0xffffff),
    )
    stick.position.y = h / 2
    g.add(stick)
    const candyColors = [0xff4488, 0x44ddee, 0xffee44, 0xee88ff, 0x88ee88, 0xff8844]
    const color = candyColors[Math.floor(Math.random() * candyColors.length)]
    const candy = new THREE.Mesh(
      new THREE.SphereGeometry(0.7, 16, 12),
      toon(color),
    )
    candy.position.y = h + 0.3
    candy.scale.set(1.2, 1.0, 0.4) // flat lollipop disc
    g.add(candy)
    // Spiral stripe (one band around the candy)
    const stripe = new THREE.Mesh(
      new THREE.TorusGeometry(0.65, 0.06, 5, 16),
      toon(0xffffff),
    )
    stripe.position.y = h + 0.3
    stripe.rotation.x = Math.PI / 2
    g.add(stripe)
    return g
  }

  // 🟢 GUMDROP — pile of colored half-spheres (like candy gumdrop)
  function buildGumdrop(p) {
    const g = new THREE.Group()
    const colors = [0xff66aa, 0x66ddff, 0xffdd44, 0xaa66ff, 0x88ff88]
    const count = 2 + Math.floor(Math.random() * 4)
    for (let i = 0; i < count; i++) {
      const c = colors[Math.floor(Math.random() * colors.length)]
      const r = 0.6 + Math.random() * 0.7
      const drop = new THREE.Mesh(
        new THREE.SphereGeometry(r, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2),
        toon(c),
      )
      const ang = (i / count) * Math.PI * 2
      const dist = Math.random() * 0.4
      drop.position.set(Math.cos(ang) * dist, 0, Math.sin(ang) * dist)
      // Sugar dust (white spots)
      g.add(drop)
    }
    return g
  }

  // 🌵 CACTUS — pillar with stubby arms
  function buildCactus(p) {
    const g = new THREE.Group()
    const h = 1.5 + Math.random() * 2.5
    const cactusMat = toon(0x6cb04c)
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.35, h, 10),
      cactusMat,
    )
    trunk.position.y = h / 2
    g.add(trunk)
    // 1-2 arms
    const armCount = 1 + Math.floor(Math.random() * 2)
    for (let i = 0; i < armCount; i++) {
      const side = i === 0 ? -1 : 1
      const armH = 0.8 + Math.random() * 0.6
      const arm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.22, armH, 8),
        cactusMat,
      )
      arm.position.set(side * 0.3, h * 0.4 + armH / 2, 0)
      g.add(arm)
      const armTop = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.2, 0.7, 8),
        cactusMat,
      )
      armTop.position.set(side * 0.45, h * 0.4 + armH + 0.35, 0)
      g.add(armTop)
    }
    // Spikes (dots)
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2
      const spike = new THREE.Mesh(
        new THREE.ConeGeometry(0.04, 0.1, 4),
        new THREE.MeshBasicMaterial({ color: 0xfff8a8 }),
      )
      spike.position.set(Math.cos(a) * 0.32, h * 0.5 + (Math.random() - 0.5) * h * 0.5, Math.sin(a) * 0.32)
      spike.rotation.z = Math.PI / 2
      spike.rotation.y = a + Math.PI / 2
      g.add(spike)
    }
    // Flower on top (random color)
    if (Math.random() < 0.4) {
      const flower = new THREE.Mesh(
        new THREE.SphereGeometry(0.15, 8, 6),
        toon([0xff6644, 0xff44aa, 0xffee44][Math.floor(Math.random() * 3)]),
      )
      flower.position.y = h + 0.1
      g.add(flower)
    }
    return g
  }

  // 🏜️ SAND DUNE — rounded mound (couple of stacked spheres)
  function buildSandDune(p) {
    const g = new THREE.Group()
    const sandMat = toon(0xe0b878)
    const r = 1.5 + Math.random() * 1.5
    const dune = new THREE.Mesh(
      new THREE.SphereGeometry(r, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      sandMat,
    )
    dune.scale.set(1.5, 0.4, 1.0)
    g.add(dune)
    // 2nd smaller dune behind
    const dune2 = new THREE.Mesh(
      new THREE.SphereGeometry(r * 0.7, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2),
      sandMat,
    )
    dune2.position.set(r * 0.8, 0, r * 0.4)
    dune2.scale.set(1.2, 0.35, 0.9)
    g.add(dune2)
    return g
  }

  // 🌴 PALM (kept for desert oasis variety)
  function buildPalmTree(p) {
    const g = new THREE.Group()
    const h = 4 + Math.random() * 2
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.25, h, 8),
      toon(0x6a4a30),
    )
    trunk.position.y = h / 2
    g.add(trunk)
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2
      const leaf = new THREE.Mesh(
        new THREE.ConeGeometry(0.35, 1.4, 5),
        toon(0x4ca830),
      )
      leaf.position.set(Math.cos(a) * 0.4, h + 0.2, Math.sin(a) * 0.4)
      leaf.rotation.z = Math.PI / 2 - 0.3
      leaf.rotation.y = a
      g.add(leaf)
    }
    return g
  }

  // 🪨 MARS ROCK — angular boulder cluster
  function buildMarsRock(p) {
    const g = new THREE.Group()
    const rockMat = toon(p.scenery)
    const count = 2 + Math.floor(Math.random() * 3)
    for (let i = 0; i < count; i++) {
      const r = 0.6 + Math.random() * 1.5
      const rock = new THREE.Mesh(
        new THREE.IcosahedronGeometry(r, 0),
        rockMat,
      )
      const a = (i / count) * Math.PI * 2 + Math.random() * 0.3
      rock.position.set(Math.cos(a) * r * 0.4, r * 0.4, Math.sin(a) * r * 0.4)
      // Random rotation for unique angular look
      rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI)
      rock.scale.y = 0.7 + Math.random() * 0.3
      g.add(rock)
    }
    // Glowing crack veins (one bright accent line)
    if (Math.random() < 0.5) {
      const vein = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.6, 0.05),
        new THREE.MeshBasicMaterial({ color: p.sceneryAccent }),
      )
      vein.position.y = 0.3
      vein.rotation.z = Math.random() * 0.5
      g.add(vein)
    }
    return g
  }

  // 🌋 MARS SPIRE — twisted alien spire
  function buildMarsSpire(p) {
    const g = new THREE.Group()
    const h = 4 + Math.random() * 6
    const spireMat = toon(p.scenery)
    // 3 stacked tapered cones
    let lastH = 0
    let lastR = 0.6 + Math.random() * 0.3
    for (let i = 0; i < 3; i++) {
      const sectionH = h / 3 + (Math.random() - 0.5) * 0.5
      const nextR = lastR * (0.55 + Math.random() * 0.2)
      const section = new THREE.Mesh(
        new THREE.CylinderGeometry(nextR, lastR, sectionH, 6),
        spireMat,
      )
      section.position.y = lastH + sectionH / 2
      // Slight tilt for organic spire look
      section.rotation.z = (Math.random() - 0.5) * 0.2
      g.add(section)
      lastH += sectionH
      lastR = nextR
    }
    // Top spike
    const top = new THREE.Mesh(
      new THREE.ConeGeometry(lastR, 0.6, 6),
      new THREE.MeshBasicMaterial({ color: p.sceneryAccent }),
    )
    top.position.y = lastH + 0.3
    g.add(top)
    return g
  }

  // 🛸 MARS DOME — geodesic habitat (transparent dome + visible ribs + base ring)
  // Adapted from worlds/marscolony.js — simplified for toon style + drift perf
  function buildMarsDome(p) {
    const g = new THREE.Group()
    const r = 2.2 + Math.random() * 1.0
    const domeColors = [0x88ccff, 0xffccaa, 0xaaffcc, 0xffeeaa]
    const tint = domeColors[Math.floor(Math.random() * domeColors.length)]
    // Glass dome (transparent)
    const glass = new THREE.Mesh(
      new THREE.SphereGeometry(r, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshLambertMaterial({
        color: tint, transparent: true, opacity: 0.30,
        side: THREE.DoubleSide,
      }),
    )
    g.add(glass)
    // White metal base ring
    const base = new THREE.Mesh(
      new THREE.TorusGeometry(r + 0.05, 0.12, 6, 18),
      toon(0xeeeeee),
    )
    base.rotation.x = Math.PI / 2
    g.add(base)
    // 6 vertical ribs
    const ribMat = toon(0xbbbbbb)
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2
      const pts = []
      for (let j = 0; j <= 8; j++) {
        const phi = (j / 8) * (Math.PI / 2)
        pts.push(new THREE.Vector3(
          Math.cos(a) * Math.cos(phi) * (r + 0.04),
          Math.sin(phi) * (r + 0.04),
          Math.sin(a) * Math.cos(phi) * (r + 0.04),
        ))
      }
      const rib = new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 8, 0.04, 4, false),
        ribMat,
      )
      g.add(rib)
    }
    // Horizontal latitude ring
    const lat = new THREE.Mesh(
      new THREE.TorusGeometry(r * 0.78, 0.04, 4, 18),
      ribMat,
    )
    lat.position.y = r * 0.5
    lat.rotation.x = Math.PI / 2
    g.add(lat)
    // Small antenna / hub spike on top
    const spike = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.5, 5),
      toon(0xcc4444),
    )
    spike.position.y = r + 0.25
    g.add(spike)
    return g
  }

  // 📡 MARS TOWER — communications mast: pole + 2 blue rings + cone top
  function buildMarsTower(p) {
    const g = new THREE.Group()
    const h = 4 + Math.random() * 2.5
    // Main pole (tan/beige)
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.42, h, 10),
      toon(0xd4a878),
    )
    pole.position.y = h / 2
    g.add(pole)
    // 2 blue accent rings around the pole
    const ringMat = toon(0x44a8ff)
    for (let i = 1; i <= 2; i++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.5, 0.08, 6, 16),
        ringMat,
      )
      ring.position.y = (h * 0.35) + i * (h * 0.25)
      ring.rotation.x = Math.PI / 2
      g.add(ring)
    }
    // Cone top — red or blue tipped (matches marscolony image)
    const tipColor = Math.random() < 0.5 ? 0xee4040 : 0x88ccff
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(0.55, 1.4, 8),
      toon(tipColor),
    )
    cone.position.y = h + 0.7
    g.add(cone)
    // Tiny dish on the side (optional detail)
    if (Math.random() < 0.5) {
      const dish = new THREE.Mesh(
        new THREE.SphereGeometry(0.25, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2),
        toon(0xeeeeee),
      )
      dish.position.set(0.55, h * 0.7, 0)
      dish.rotation.z = -Math.PI / 2
      g.add(dish)
    }
    return g
  }

  // ☀️ MARS SOLAR — tilted solar panel array on a stand
  function buildMarsSolar(p) {
    const g = new THREE.Group()
    // Tripod stand
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.10, 0.14, 1.6, 8),
      toon(0x888888),
    )
    pole.position.y = 0.8
    g.add(pole)
    // Panel frame (dark blue, tilted toward Mars sun)
    const panelFrame = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 0.08, 1.4),
      toon(0x303040),
    )
    panelFrame.position.y = 1.7
    panelFrame.rotation.x = -0.45  // tilt back
    g.add(panelFrame)
    // Solar cell grid — 3×2 dark-blue squares with thin separators
    const cellMat = toon(0x2244aa)
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 3; c++) {
        const cell = new THREE.Mesh(
          new THREE.PlaneGeometry(0.62, 0.6),
          cellMat,
        )
        cell.position.set(-0.7 + c * 0.7, 1.74, -0.32 + r * 0.62)
        cell.rotation.x = -Math.PI / 2 - 0.45
        g.add(cell)
      }
    }
    // Small white control box at base of pole
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.35, 0.3),
      toon(0xeeeeee),
    )
    box.position.set(0.3, 0.18, 0)
    g.add(box)
    return g
  }

  // ───────────────────────────────────────────────────────────────────────────
  // BUILD CAR
  // ───────────────────────────────────────────────────────────────────────────
  function buildCar(color, isPlayer = false) {
    // Wrap-inner pattern: physics rotates the WRAP via rotation.y = facing.
    // The INNER group is pre-rotated π so the car body (nose at local +Z)
    // ends up pointing along the physics "fwd" direction (-Z in world before
    // applying facing). Without this, cars visually drive REAR-FIRST relative
    // to their nose — player doesn't notice (chase cam behind), but you can
    // clearly see AI cars going "backwards" from the side.
    const wrap = new THREE.Group()
    const g = new THREE.Group()
    // Main body (rounded box via box + scale)
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.4, 1.8),
      toon(color),
    )
    body.position.y = 0.35
    g.add(body)
    // Cabin (smaller box on top)
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(0.78, 0.32, 0.9),
      toon(0x223344),
    )
    cabin.position.set(0, 0.7, -0.1)
    g.add(cabin)
    // Front nose (tapered)
    const nose = new THREE.Mesh(
      new THREE.BoxGeometry(0.85, 0.18, 0.4),
      toon(color),
    )
    nose.position.set(0, 0.25, 0.9)
    g.add(nose)
    // Spoiler (rear wing)
    const spoiler = new THREE.Mesh(
      new THREE.BoxGeometry(0.95, 0.06, 0.18),
      toon(0x222),
    )
    spoiler.position.set(0, 0.7, -0.85)
    g.add(spoiler)
    const spoilerL = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.18, 0.18),
      toon(0x222),
    )
    spoilerL.position.set(-0.4, 0.6, -0.85)
    g.add(spoilerL)
    const spoilerR = spoilerL.clone()
    spoilerR.position.x = 0.4
    g.add(spoilerR)
    // Wheels — 4 cylinders
    const wheelMat = toon(0x1a1a1a)
    const wheels = []
    for (const [sx, sz] of [[-0.45, 0.55], [0.45, 0.55], [-0.45, -0.55], [0.45, -0.55]]) {
      const w = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.22, 0.16, 12),
        wheelMat,
      )
      w.position.set(sx, 0.22, sz)
      w.rotation.z = Math.PI / 2
      g.add(w)
      wheels.push(w)
      // Hubcap accent
      const cap = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.1, 0.17, 8),
        toon(color),
      )
      cap.position.set(sx, 0.22, sz)
      cap.rotation.z = Math.PI / 2
      g.add(cap)
    }
    // Headlights
    for (const sx of [-0.3, 0.3]) {
      const hl = new THREE.Mesh(
        new THREE.SphereGeometry(0.07, 8, 6),
        new THREE.MeshBasicMaterial({ color: 0xffffaa }),
      )
      hl.position.set(sx, 0.35, 1.05)
      g.add(hl)
    }
    // Brake lights (rear)
    for (const sx of [-0.3, 0.3]) {
      const bl = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 8, 6),
        new THREE.MeshBasicMaterial({ color: 0xff3344 }),
      )
      bl.position.set(sx, 0.45, -0.95)
      g.add(bl)
    }
    // Pre-rotate inner group π so the nose (local +Z) ends up matching
    // the physics fwd direction. Now wrap.rotation.y = c.facing works correctly.
    g.rotation.y = Math.PI
    wrap.add(g)
    // Proxy userData refs onto wrap so animation code (wheels, body tilt) keeps working
    wrap.userData.body = body
    wrap.userData.spoiler = spoiler
    wrap.userData.wheels = wheels
    return wrap
  }

  // ───────────────────────────────────────────────────────────────────────────
  // PARTICLES — drift smoke + boost flames
  // ───────────────────────────────────────────────────────────────────────────
  const driftPS = new ParticleSystem(scene, {
    maxParticles: 300,
    geometry: new THREE.PlaneGeometry(0.4, 0.4),
    material: new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.75,
      depthWrite: false, side: THREE.DoubleSide,
    }),
  })
  const boostPS = new ParticleSystem(scene, {
    maxParticles: 200,
    geometry: new THREE.PlaneGeometry(0.4, 0.4),
    material: new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    }),
  })

  // ───────────────────────────────────────────────────────────────────────────
  // SYSTEMS
  // ───────────────────────────────────────────────────────────────────────────
  const events = new EventBus()
  const shake = new ScreenShake(camera)
  const flash = new Flash()
  const stopwatch = new Stopwatch()

  // ───────────────────────────────────────────────────────────────────────────
  // INIT CARS for current stage
  // ───────────────────────────────────────────────────────────────────────────
  function initCars() {
    for (const c of cars) scene.remove(c.group)
    cars = []

    const startT = 0.01
    const pp = trackCurve.getPointAt(startT)
    const tan = trackCurve.getTangentAt(startT).normalize()
    const left = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), tan).normalize()

    const carColors = [0xff3344, 0x44aaff, 0xffd644, 0x44ff88]
    const carNames = ['YOU', 'CPU 1', 'CPU 2', 'CPU 3']
    for (let i = 0; i < 4; i++) {
      const isPlayer = i === 0
      const g = buildCar(carColors[i], isPlayer)
      // Offset cars side-by-side and front-back at start
      const sideOff = (i % 2 === 0 ? -1 : 1) * 1.2
      const backOff = -1.5 * Math.floor(i / 2)
      const startPos = pp.clone()
        .add(left.clone().multiplyScalar(sideOff))
        .add(tan.clone().multiplyScalar(backOff))
      startPos.y = 0
      g.position.copy(startPos)
      // Facing must be such that fwd = (-sin(f), 0, -cos(f)) == tan direction
      // i.e. -sin(f) = tan.x and -cos(f) = tan.z → f = atan2(-tan.x, -tan.z).
      // The earlier atan2(tan.x, tan.z) had cars FACING OPPOSITE the track,
      // forcing players to U-turn at race start.
      const facing = Math.atan2(-tan.x, -tan.z)
      g.rotation.y = facing
      scene.add(g)
      cars.push({
        group: g, color: carColors[i], name: carNames[i],
        pos: startPos.clone(), vel: new THREE.Vector3(),
        facing, isPlayer,
        curveT: startT, lap: 0, totalProgress: 0,
        driftT: 0, driftDir: 0, boostT: 0, boostMul: 1,
        wheels: g.userData.wheels, spoiler: g.userData.spoiler,
        raceTime: 0, finished: false, finishPlace: 0,
        // AI random offset around centerline (slight unique racing line)
        aiOffset: isPlayer ? 0 : (Math.random() - 0.5) * 2,
        aiSkillNoise: isPlayer ? 0 : Math.random() * 0.1,
      })
    }
    playerCar = cars[0]
  }

  // ───────────────────────────────────────────────────────────────────────────
  // INPUT
  // ───────────────────────────────────────────────────────────────────────────
  const keys = Object.create(null)
  const onKeyDown = (e) => {
    keys[e.code] = true
    if (e.code === 'Space') e.preventDefault()
    if (e.code === 'KeyR' && (state.mode === 'lost' || state.mode === 'won')) location.reload()
  }
  const onKeyUp = (e) => { keys[e.code] = false }
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)

  // ───────────────────────────────────────────────────────────────────────────
  // CAR PHYSICS UPDATE
  // ───────────────────────────────────────────────────────────────────────────
  // Closest point search — returns { t, distance, point, tangent }
  // Caches last t for each car so search is local (efficient).
  const _tempV = new THREE.Vector3()
  function nearestOnCurve(carPos, lastT = 0.5) {
    let bestT = lastT, bestD = Infinity
    // Search ±0.1 around lastT in 40 samples
    const range = 0.12
    for (let i = -20; i <= 20; i++) {
      const t = ((lastT + (i / 20) * range) + 1) % 1
      trackCurve.getPointAt(t, _tempV)
      const dx = _tempV.x - carPos.x
      const dz = _tempV.z - carPos.z
      const d = dx * dx + dz * dz
      if (d < bestD) { bestD = d; bestT = t }
    }
    const p = trackCurve.getPointAt(bestT).clone()
    const tan = trackCurve.getTangentAt(bestT).clone().normalize()
    return { t: bestT, distance: Math.sqrt(bestD), point: p, tangent: tan }
  }

  function updatePlayerCar(c, dt) {
    const accel = keys['KeyW'] || keys['ArrowUp']
    const brake = keys['KeyS'] || keys['ArrowDown']
    const steerL = keys['KeyA'] || keys['ArrowLeft']
    const steerR = keys['KeyD'] || keys['ArrowRight']
    const drift = keys['Space']

    const fwd = new THREE.Vector3(-Math.sin(c.facing), 0, -Math.cos(c.facing))
    const fwdSpeed = c.vel.dot(fwd)
    const lateral = c.vel.clone().sub(fwd.clone().multiplyScalar(fwdSpeed))

    // Target speed
    let targetSpeed = 0
    if (accel) targetSpeed = MAX_SPEED * (c.boostT > 0 ? BOOST_SPEED_MUL : 1)
    if (brake) targetSpeed = -REVERSE_SPEED

    // Approach target speed
    const accelRate = (accel || brake) ? ACCEL : COAST_DRAG
    const newFwdSpeed = THREE.MathUtils.lerp(fwdSpeed, targetSpeed, Math.min(1, accelRate / Math.max(1, Math.abs(targetSpeed - fwdSpeed)) * dt))

    // Steer
    const steerInput = (steerL ? 1 : 0) - (steerR ? 1 : 0)
    const speedFactor = Math.min(1, Math.abs(newFwdSpeed) / 10)
    let steerRate = STEER_RATE * (drift ? DRIFT_STEER_MUL : 1)
    c.facing += steerInput * steerRate * speedFactor * dt
    if (newFwdSpeed < 0) {
      // reverse steers opposite
      // (no change — same direction feels more arcade)
    }

    // Drift tracking
    if (drift && Math.abs(steerInput) > 0.3 && Math.abs(newFwdSpeed) > 8) {
      c.driftT += dt
      c.driftDir = steerInput
      // Drift smoke from rear wheels
      if (Math.random() < 0.6) {
        for (const wi of [2, 3]) {
          const w = c.wheels[wi]
          const wp = new THREE.Vector3()
          w.getWorldPosition(wp)
          driftPS.burst({
            position: { x: wp.x, y: 0.2, z: wp.z },
            count: 2, speed: [0.5, 1.5], lifetime: [0.4, 0.8],
            sizeOverLife: [1.4, 0.4],
            color: 0xeeeef0, gravity: 1, spread: Math.PI / 2,
            direction: { x: 0, y: 1, z: 0 },
          })
        }
      }
    } else if (c.driftT > 0) {
      // Drift released — apply boost
      if (c.driftT >= BOOST_TIER2_TIME) {
        c.boostT = BOOST_TIER2_DUR
        boostBurst(c, 0xff8844)
      } else if (c.driftT >= BOOST_TIER1_TIME) {
        c.boostT = BOOST_TIER1_DUR
        boostBurst(c, 0x44ddff)
      }
      c.driftT = 0
    }
    if (c.boostT > 0) c.boostT -= dt

    // Apply velocity (combine forward + lateral with grip)
    const newFwd = new THREE.Vector3(-Math.sin(c.facing), 0, -Math.cos(c.facing))
    const grip = drift ? GRIP_DRIFT : GRIP_NORMAL
    // Lateral velocity decays
    lateral.multiplyScalar(Math.exp(-grip * dt))
    c.vel.copy(newFwd).multiplyScalar(newFwdSpeed).add(lateral)
    // Integrate
    c.pos.addScaledVector(c.vel, dt)

    // Wall collision — only kill the component going INTO the wall (not total velocity).
    // Grazing the wall = nearly no penalty; head-on slam = noticeable penalty.
    const nearest = nearestOnCurve(c.pos, c.curveT)
    c.curveT = nearest.t
    if (nearest.distance > ROAD_WIDTH / 2 - 0.5) {
      const inDir = new THREE.Vector3()
        .subVectors(nearest.point, c.pos)
        .setY(0).normalize()
      const overshoot = nearest.distance - (ROAD_WIDTH / 2 - 0.5)
      c.pos.addScaledVector(inDir, overshoot)
      // Velocity component going INTO wall = -dot(vel, inDir)
      const vIntoWall = -c.vel.dot(inDir)
      if (vIntoWall > 0) {
        // Cancel inward velocity + tiny bounce
        c.vel.addScaledVector(inDir, vIntoWall * 1.15)
      }
      // Slight friction loss along the wall (was 0.55 = 45% loss; now ~5% loss)
      c.vel.multiplyScalar(0.95)
      // FX only on hard hits
      if (vIntoWall > 6) {
        shake.add({ amplitude: 0.06 + Math.min(0.15, vIntoWall * 0.01), frequency: 26, duration: 0.18 })
      }
    }

    // Sync mesh
    c.group.position.copy(c.pos)
    c.group.rotation.y = c.facing

    // Wheel spin animation
    const spinRate = newFwdSpeed * 4
    for (const w of c.wheels) w.rotation.x += spinRate * dt
    // Front wheels turn with steering
    c.wheels[0].rotation.y = -steerInput * 0.4
    c.wheels[1].rotation.y = -steerInput * 0.4
    // Body tilts in turn
    c.group.userData.body.rotation.z = THREE.MathUtils.lerp(
      c.group.userData.body.rotation.z, steerInput * 0.08 * speedFactor, Math.min(1, 10 * dt),
    )
  }

  function updateAICar(c, dt) {
    // Look ahead on curve, steer toward that point + lateral offset
    const lookAheadT = (c.curveT + 0.025) % 1
    const targetPos = trackCurve.getPointAt(lookAheadT).clone()
    const tan = trackCurve.getTangentAt(lookAheadT).normalize()
    const left = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), tan).normalize()
    targetPos.addScaledVector(left, c.aiOffset)

    const desired = new THREE.Vector3().subVectors(targetPos, c.pos).setY(0)
    const desiredFacing = Math.atan2(-desired.x, -desired.z)
    let diff = desiredFacing - c.facing
    while (diff > Math.PI) diff -= Math.PI * 2
    while (diff < -Math.PI) diff += Math.PI * 2

    // Steer toward
    const turnRate = STEER_RATE * 0.85
    c.facing += THREE.MathUtils.clamp(diff, -turnRate * dt, turnRate * dt)

    // Throttle: full speed, slow on sharp turns
    const targetSpeed = MAX_SPEED * currentStage.aiSpeed * (1 - Math.min(0.4, Math.abs(diff) * 0.5))
    const fwd = new THREE.Vector3(-Math.sin(c.facing), 0, -Math.cos(c.facing))
    const fwdSpeed = c.vel.dot(fwd)
    const newFwdSpeed = THREE.MathUtils.lerp(fwdSpeed, targetSpeed, Math.min(1, ACCEL / 30 * dt))
    const lateral = c.vel.clone().sub(fwd.clone().multiplyScalar(fwdSpeed))
    lateral.multiplyScalar(Math.exp(-GRIP_NORMAL * dt))
    c.vel.copy(fwd).multiplyScalar(newFwdSpeed).add(lateral)
    c.pos.addScaledVector(c.vel, dt)

    // Wall clamp — gentle, same logic as player
    const nearest = nearestOnCurve(c.pos, c.curveT)
    c.curveT = nearest.t
    if (nearest.distance > ROAD_WIDTH / 2 - 0.5) {
      const inDir = new THREE.Vector3().subVectors(nearest.point, c.pos).setY(0).normalize()
      c.pos.addScaledVector(inDir, nearest.distance - (ROAD_WIDTH / 2 - 0.5))
      const vIntoWall = -c.vel.dot(inDir)
      if (vIntoWall > 0) c.vel.addScaledVector(inDir, vIntoWall * 1.1)
      c.vel.multiplyScalar(0.96)
    }

    c.group.position.copy(c.pos)
    c.group.rotation.y = c.facing
    const spinRate = newFwdSpeed * 4
    for (const w of c.wheels) w.rotation.x += spinRate * dt
  }

  // ───────────────────────────────────────────────────────────────────────────
  // CAR-VS-CAR COLLISION — sphere/sphere with push apart + impulse exchange
  // ───────────────────────────────────────────────────────────────────────────
  const CAR_RADIUS = 0.95
  function resolveCarCollisions() {
    const minDist = CAR_RADIUS * 2
    for (let i = 0; i < cars.length; i++) {
      const a = cars[i]
      for (let j = i + 1; j < cars.length; j++) {
        const b = cars[j]
        const dx = b.pos.x - a.pos.x
        const dz = b.pos.z - a.pos.z
        const d2 = dx * dx + dz * dz
        if (d2 >= minDist * minDist || d2 < 0.0001) continue
        const d = Math.sqrt(d2)
        const overlap = minDist - d
        const nx = dx / d, nz = dz / d
        // Push both cars apart equally
        a.pos.x -= nx * overlap * 0.5
        a.pos.z -= nz * overlap * 0.5
        b.pos.x += nx * overlap * 0.5
        b.pos.z += nz * overlap * 0.5
        // Relative velocity along normal
        const relVx = b.vel.x - a.vel.x
        const relVz = b.vel.z - a.vel.z
        const closing = relVx * nx + relVz * nz
        if (closing < 0) {
          // Cars approaching — exchange impulse (elastic-ish, lose 30% energy)
          const impulse = -closing * 0.7
          a.vel.x -= nx * impulse
          a.vel.z -= nz * impulse
          b.vel.x += nx * impulse
          b.vel.z += nz * impulse
          // Visual feedback: subtle shake if player is involved
          if ((a.isPlayer || b.isPlayer) && Math.abs(closing) > 4) {
            shake.add({
              amplitude: 0.06 + Math.min(0.1, Math.abs(closing) * 0.012),
              frequency: 26, duration: 0.15,
            })
            // Spark particles at contact point
            const contactX = a.pos.x + nx * CAR_RADIUS
            const contactZ = a.pos.z + nz * CAR_RADIUS
            boostPS.burst({
              position: { x: contactX, y: 0.4, z: contactZ },
              count: 6, speed: [1, 3], lifetime: [0.15, 0.3],
              sizeOverLife: [1, 0],
              color: 0xffdd66,
              gravity: -2, spread: Math.PI,
            })
          }
        }
      }
    }
  }

  function boostBurst(c, color) {
    const fwd = new THREE.Vector3(-Math.sin(c.facing), 0, -Math.cos(c.facing))
    const back = c.pos.clone().addScaledVector(fwd, -1)
    boostPS.burst({
      position: { x: back.x, y: 0.4, z: back.z },
      count: 30, speed: [4, 8], lifetime: [0.3, 0.7],
      sizeOverLife: [1.4, 0.3],
      color: color, gravity: 1, spread: Math.PI / 4,
      direction: { x: -fwd.x, y: 0.3, z: -fwd.z },
    })
    if (c.isPlayer) shake.add({ amplitude: 0.06, frequency: 28, duration: 0.18 })
  }

  // ───────────────────────────────────────────────────────────────────────────
  // LAP / POSITION TRACKING
  // ───────────────────────────────────────────────────────────────────────────
  let prevCurveTs = new Map()
  function updateLapTracking(dt) {
    for (const c of cars) {
      if (c.finished) continue
      // Detect crossing start line (curveT goes from ~0.95+ to ~0.05)
      const prev = prevCurveTs.get(c) ?? c.curveT
      if (prev > 0.85 && c.curveT < 0.15) {
        c.lap++
        if (c.lap >= currentStage.laps) {
          c.finished = true
          c.finishPlace = cars.filter(x => x.finished).length
          c.raceTime = stopwatch.elapsed
          if (c.isPlayer) onPlayerFinish()
        }
      }
      prevCurveTs.set(c, c.curveT)
      c.totalProgress = c.lap + c.curveT
      if (!c.finished) c.raceTime = stopwatch.elapsed
    }
  }

  function getPlayerPosition() {
    const sorted = [...cars].sort((a, b) => {
      if (a.finished && b.finished) return a.finishPlace - b.finishPlace
      if (a.finished) return -1
      if (b.finished) return 1
      return b.totalProgress - a.totalProgress
    })
    return sorted.indexOf(playerCar) + 1
  }

  // ───────────────────────────────────────────────────────────────────────────
  // CAMERA — chase camera with lag + slight tilt
  // ───────────────────────────────────────────────────────────────────────────
  const camTarget = new THREE.Vector3()
  const camDesired = new THREE.Vector3()
  function updateCamera(dt) {
    if (!playerCar) return
    const fwd = new THREE.Vector3(-Math.sin(playerCar.facing), 0, -Math.cos(playerCar.facing))
    const back = fwd.clone().multiplyScalar(-1)
    const speed = Math.abs(playerCar.vel.dot(fwd))
    // Camera position: behind + above, distance grows slightly with speed
    const dist = 5.5 + Math.min(2, speed * 0.06)
    const height = 3 + Math.min(1, speed * 0.03)
    camDesired.copy(playerCar.pos)
      .addScaledVector(back, dist)
      .add(new THREE.Vector3(0, height, 0))
    camera.position.lerp(camDesired, Math.min(1, 6 * dt))
    // Look at point ahead of car
    const lookAhead = playerCar.pos.clone().addScaledVector(fwd, 4).add(new THREE.Vector3(0, 1, 0))
    camTarget.lerp(lookAhead, Math.min(1, 8 * dt))
    camera.lookAt(camTarget)
    // FOV widens at high speed (sense of speed)
    const targetFov = 62 + Math.min(12, speed * 0.5)
    camera.fov += (targetFov - camera.fov) * Math.min(1, 4 * dt)
    camera.updateProjectionMatrix()
  }

  // ───────────────────────────────────────────────────────────────────────────
  // GAME STATE
  // ───────────────────────────────────────────────────────────────────────────
  const state = {
    mode: 'countdown', // 'countdown' | 'racing' | 'finished' | 'won' | 'lost'
    countdownT: 3.5,
  }

  function onPlayerFinish() {
    state.mode = 'finished'
    setTimeout(() => {
      const pos = playerCar.finishPlace
      if (pos <= 3) {
        if (currentStageIdx >= STAGES.length - 1) {
          state.mode = 'won'
          showWinPanel()
        } else {
          showStageClearPanel()
        }
      } else {
        state.mode = 'lost'
        showLossPanel()
      }
    }, 1200)
  }

  function advanceStage() {
    if (endPanel) { endPanel.dispose(); endPanel = null }
    currentStageIdx++
    if (currentStageIdx >= STAGES.length) {
      state.mode = 'won'
      showWinPanel()
      return
    }
    buildStage(currentStageIdx)
    initCars()
    state.mode = 'countdown'
    state.countdownT = 3.5
    stopwatch.reset(); stopwatch.start()
    prevCurveTs.clear()
  }

  // ───────────────────────────────────────────────────────────────────────────
  // HUD
  // ───────────────────────────────────────────────────────────────────────────
  const hud = new HUDLayer(container)
  const speedText = hud.text({
    bottom: 32, right: 28,
    font: '700 36px ui-monospace, monospace',
    color: '#fff8a8', shadow: '0 2px 10px rgba(0,0,0,0.6)',
  })
  const speedSub = hud.text({
    bottom: 22, right: 28,
    font: '500 10px ui-monospace, monospace',
    color: 'rgba(255,255,255,0.5)',
  })
  speedSub.set('KM/H')
  const lapText = hud.text({
    top: 18, hCenter: true,
    font: '700 26px ui-monospace, monospace',
    color: '#fff8e0', shadow: '0 2px 10px rgba(0,0,0,0.6)',
  })
  const posText = hud.text({
    top: 18, left: 24,
    font: '700 30px ui-monospace, monospace',
    color: '#ffd266', shadow: '0 2px 10px rgba(0,0,0,0.6)',
  })
  const posSub = hud.text({
    top: 50, left: 24,
    font: '500 11px ui-monospace, monospace',
    color: 'rgba(255,255,255,0.55)',
  })
  posSub.set('POSITION')
  const stageText = hud.text({
    top: 50, hCenter: true,
    font: '500 12px ui-monospace, monospace',
    color: 'rgba(255,255,255,0.5)',
  })
  const timeText = hud.text({
    top: 18, right: 24,
    font: '600 18px ui-monospace, monospace',
    color: '#88ddff', shadow: '0 2px 8px rgba(0,0,0,0.5)',
  })
  // Drift charge bar (bottom left)
  const driftBarWrap = document.createElement('div')
  Object.assign(driftBarWrap.style, {
    position: 'absolute', bottom: '28px', left: '28px',
    width: '200px', height: '12px',
    background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.3)',
    borderRadius: '6px', overflow: 'hidden',
  })
  const driftBarFill = document.createElement('div')
  Object.assign(driftBarFill.style, {
    width: '0%', height: '100%',
    background: 'linear-gradient(90deg, #44ddff, #ff8844)',
    transition: 'width 0.05s linear',
  })
  driftBarWrap.appendChild(driftBarFill)
  hud.custom(driftBarWrap)
  const driftLabel = hud.text({
    bottom: 44, left: 28,
    font: '600 10px ui-monospace, monospace',
    color: '#88ddff',
  })
  driftLabel.set('DRIFT BOOST')
  // Hint
  const hintText = hud.text({
    bottom: 8, hCenter: true,
    font: '500 11px ui-monospace, monospace',
    color: 'rgba(255,255,255,0.4)',
  })
  hintText.set('WASD to drive · SPACE to drift (release for boost)')

  // Countdown text (big)
  const countdownEl = document.createElement('div')
  Object.assign(countdownEl.style, {
    position: 'absolute', top: '40%', left: '50%',
    transform: 'translate(-50%, -50%)',
    fontSize: '120px', fontFamily: 'ui-monospace, monospace', fontWeight: '700',
    color: '#fff', textShadow: '0 0 30px rgba(255,200,80,0.6), 0 0 80px rgba(255,150,40,0.4)',
    pointerEvents: 'none', zIndex: '60',
    transition: 'transform 0.2s, opacity 0.3s',
  })
  hud.custom(countdownEl)

  // ───────────────────────────────────────────────────────────────────────────
  // PANELS
  // ───────────────────────────────────────────────────────────────────────────
  let endPanel = null
  function showStageClearPanel() {
    const place = playerCar.finishPlace
    const placeText = ['🥇 1st place!', '🥈 2nd place', '🥉 3rd place'][place - 1]
    endPanel = new GlassPanel({
      title: 'Stage Clear!',
      subtitle: `${currentStage.name} · ${placeText} · ${fmtTime(playerCar.raceTime)}`,
      body: `Up next — Stage ${currentStageIdx + 2}: ${STAGES[currentStageIdx + 1].name}`,
      buttons: [{ label: 'Next Stage', onClick: advanceStage }],
    })
    container.appendChild(endPanel.el)
  }
  function showLossPanel() {
    endPanel = new GlassPanel({
      title: 'Stage Failed',
      subtitle: `${currentStage.name} · Finished ${playerCar.finishPlace}`,
      body: 'You need a top-3 finish to advance.\nTip: charge a drift BEFORE the corner, release at the apex — a good drift saves 1s+ per turn.',
      buttons: [{ label: 'Retry stage (R)', onClick: () => location.reload() }],
    })
    container.appendChild(endPanel.el)
  }
  function showWinPanel() {
    endPanel = new GlassPanel({
      title: 'CHAMPION!',
      subtitle: 'All 3 stages cleared!',
      body: `${currentStage.name} · ${fmtTime(playerCar.raceTime)}\n\nYou are now a legend of these tracks.`,
      buttons: [{ label: 'Play again (R)', onClick: () => location.reload() }],
    })
    container.appendChild(endPanel.el)
  }

  // ───────────────────────────────────────────────────────────────────────────
  // INITIAL SETUP
  // ───────────────────────────────────────────────────────────────────────────
  buildStage(0)
  initCars()
  stopwatch.start()

  // ───────────────────────────────────────────────────────────────────────────
  // LOOP
  // ───────────────────────────────────────────────────────────────────────────
  const clock = new THREE.Clock()
  let raf = 0, disposed = false
  function loop() {
    if (disposed) return
    raf = requestAnimationFrame(loop)
    const dt = Math.min(clock.getDelta(), 1 / 30)
    flash.tick(dt)
    driftPS.tick(dt)
    boostPS.tick(dt)

    if (state.mode === 'countdown') {
      state.countdownT -= dt
      const tCount = state.countdownT
      let display = ''
      if (tCount > 2.5) display = '3'
      else if (tCount > 1.5) display = '2'
      else if (tCount > 0.5) display = '1'
      else if (tCount > -0.5) display = 'GO!'
      else { state.mode = 'racing'; stopwatch.reset(); stopwatch.start() }
      countdownEl.textContent = display
      if (display) {
        countdownEl.style.opacity = '1'
        const ageInPhase = (tCount > 0.5 ? (3.5 - tCount) % 1 : 0.5 + tCount * (-1))
        countdownEl.style.transform = `translate(-50%, -50%) scale(${1.5 - ageInPhase * 0.5})`
      } else {
        countdownEl.style.opacity = '0'
      }
    } else if (state.mode === 'racing' || state.mode === 'finished') {
      if (state.mode === 'racing') stopwatch.tick(dt)
      updatePlayerCar(playerCar, dt)
      for (let i = 1; i < cars.length; i++) updateAICar(cars[i], dt)
      // After all cars have moved this frame, resolve mutual collisions.
      // (Order matters — don't do mid-update, or one car gets pushed before
      // the other has even moved.)
      resolveCarCollisions()
      // After collision push, sync mesh transforms (cars may have shifted)
      for (const c of cars) {
        c.group.position.copy(c.pos)
        c.group.rotation.y = c.facing
      }
      updateLapTracking(dt)
    }
    updateCamera(dt)
    shake.tick(dt)

    // HUD
    const fwd = new THREE.Vector3(-Math.sin(playerCar.facing), 0, -Math.cos(playerCar.facing))
    const speed = Math.abs(playerCar.vel.dot(fwd))
    const kmh = Math.round(speed * 3.6)
    speedText.set(String(kmh).padStart(3, '0'))
    const lap = Math.min(currentStage.laps, playerCar.lap + 1)
    lapText.set(`LAP ${lap} / ${currentStage.laps}`)
    posText.set(`#${getPlayerPosition()}`)
    stageText.set(`${currentStage.name} (Stage ${currentStageIdx + 1})`)
    timeText.set(fmtTime(stopwatch.elapsed))
    // Drift bar
    const charge = Math.min(1, playerCar.driftT / BOOST_TIER2_TIME)
    driftBarFill.style.width = `${charge * 100}%`
    if (playerCar.boostT > 0) {
      driftBarFill.style.background = 'linear-gradient(90deg, #ff8844, #ffee66)'
    } else {
      driftBarFill.style.background = 'linear-gradient(90deg, #44ddff, #ff8844)'
    }

    renderer.render(scene, camera)
  }
  loop()

  // ───────────────────────────────────────────────────────────────────────────
  // RESIZE · DISPOSE
  // ───────────────────────────────────────────────────────────────────────────
  function resize(w, h) {
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h)
  }
  function dispose() {
    if (disposed) return
    disposed = true
    cancelAnimationFrame(raf)
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('keyup', onKeyUp)
    driftPS.dispose()
    boostPS.dispose()
    scene.traverse(o => { if (o.geometry) o.geometry.dispose?.(); if (o.material && !Array.isArray(o.material)) o.material.dispose?.() })
    hud.dispose()
    if (endPanel) endPanel.dispose()
    renderer.dispose()
    if (renderer.domElement.parentNode === container) container.removeChild(renderer.domElement)
  }

  return {
    getScene: () => scene,
    getCamera: () => camera,
    getRenderer: () => renderer,
    getCanvas: () => renderer.domElement,
    getOrbitControls: () => null,
    dispose, resize,
    play: () => {}, pause: () => {},
    seekTo: () => {}, getProgress: () => state.mode === 'won' ? 1 : (currentStageIdx + (playerCar?.totalProgress || 0) / currentStage.laps) / STAGES.length,
    renderFrame: () => renderer.render(scene, camera),
    hasCinematic: false, duration: 0,
  }
}

function fmtTime(s) {
  const m = Math.floor(s / 60)
  const ss = (s % 60).toFixed(2)
  return `${String(m).padStart(2, '0')}:${String(ss).padStart(5, '0')}`
}
