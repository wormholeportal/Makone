/**
 * Crossy Road 3D · Pixel Hop
 *
 * Voxel-style Frogger/Crossy Road — hop a cute chicken forward across
 * roads (with cars), rivers (with logs), and train tracks. Score = highest
 * row reached. Bright, chunky, adorable aesthetic.
 *
 * Controls:
 *   ↑ / W / Click     Hop forward
 *   ← / A             Hop left
 *   → / D             Hop right
 *   ↓ / S             Hop backward
 *   R                 Restart
 *
 *   V                 Toggle 1st / 3rd person
 *
 * Mobile: tap to hop forward, swipe for sideways, on-screen arrows
 */

import * as THREE from 'three'
import {
  ScreenShake,
  HUDLayer,
  GlassPanel,
  ParticleSystem,
  Flash,
  Cooldown,
} from 'makone/game'

export default async function createWorld(container) {

  // ─── Constants ─────────────────────────────────────────────────────────────
  const GRID_SIZE = 1                // each cell is 1x1 unit
  const COLS = 9                     // -4 to +4
  const MIN_COL = -4
  const MAX_COL = 4
  const ROWS_AHEAD = 18              // rows generated ahead of player
  const ROWS_BEHIND = 8              // rows kept behind player
  const HOP_DURATION = 0.12          // seconds per hop
  const HOP_HEIGHT = 0.55            // peak of jump arc
  const IDLE_TIMEOUT = 8             // seconds before eagle
  const CAM_OFFSET = new THREE.Vector3(0, 8, -6)
  const CAM_LOOK_AHEAD = 3           // look slightly ahead of player

  // Colors
  const GRASS_COLORS = [0x4CAF50, 0x66BB6A, 0x81C784, 0x43A047]
  const ROAD_COLOR = 0x424242
  const ROAD_LINE_COLOR = 0xeeeeee
  const WATER_COLOR = 0x42A5F5
  const WATER_DEEP = 0x1E88E5
  const RAIL_COLOR = 0x795548
  const RAIL_TIE_COLOR = 0x5D4037
  const LOG_COLOR = 0x8D6E63
  const LILY_COLOR = 0x66BB6A
  const COIN_COLOR = 0xFFD700
  const CAR_COLORS = [0xF44336, 0x2196F3, 0xFFEB3B, 0xE91E63, 0xFF9800, 0x9C27B0, 0x00BCD4]
  const TRUCK_COLORS = [0x3F51B5, 0x009688, 0x795548, 0xFF5722]
  const TRAIN_COLOR = 0x37474F
  const TRAIN_ACCENT = 0xF44336

  // ─── Renderer ──────────────────────────────────────────────────────────────
  const W0 = container.clientWidth || 800
  const H0 = container.clientHeight || 600

  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
  renderer.setSize(W0, H0)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.15
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  container.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x87CEEB)
  scene.fog = new THREE.Fog(0x87CEEB, 18, 32)

  const camera = new THREE.PerspectiveCamera(50, W0 / H0, 0.1, 100)
  camera.position.set(0, 8, -6)

  // ─── Lighting ──────────────────────────────────────────────────────────────
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7)
  scene.add(ambientLight)

  const dirLight = new THREE.DirectionalLight(0xfff8e7, 1.4)
  dirLight.position.set(5, 12, -4)
  dirLight.castShadow = true
  dirLight.shadow.mapSize.set(1024, 1024)
  dirLight.shadow.camera.left = -15
  dirLight.shadow.camera.right = 15
  dirLight.shadow.camera.top = 20
  dirLight.shadow.camera.bottom = -10
  dirLight.shadow.camera.near = 0.1
  dirLight.shadow.camera.far = 35
  dirLight.shadow.bias = -0.002
  scene.add(dirLight)

  const fillLight = new THREE.DirectionalLight(0xaad4ff, 0.35)
  fillLight.position.set(-4, 6, 3)
  scene.add(fillLight)

  // ─── Shared Geometries & Materials ─────────────────────────────────────────
  const boxGeo = new THREE.BoxGeometry(1, 1, 1)
  const smallBoxGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5)
  const tinyBoxGeo = new THREE.BoxGeometry(0.15, 0.15, 0.15)

  function mat(color, opts = {}) {
    return new THREE.MeshLambertMaterial({
      color,
      flatShading: true,
      ...opts,
    })
  }

  // Grass ground materials (different shades per row)
  const grassMats = GRASS_COLORS.map(c => mat(c))
  const roadMat = mat(ROAD_COLOR)
  const roadLineMat = mat(ROAD_LINE_COLOR)
  const waterMat = mat(WATER_COLOR, { transparent: true, opacity: 0.85 })
  const waterDeepMat = mat(WATER_DEEP)
  const railMat = mat(RAIL_COLOR)
  const railTieMat = mat(RAIL_TIE_COLOR)
  const logMat = mat(LOG_COLOR)
  const lilyMat = mat(LILY_COLOR)
  const coinMat = mat(COIN_COLOR)
  const trainMat = mat(TRAIN_COLOR)
  const trainAccentMat = mat(TRAIN_ACCENT)
  const treeTrunkMat = mat(0x795548)
  const treeLeafMats = [mat(0x2E7D32), mat(0x388E3C), mat(0x1B5E20)]
  const bushMat = mat(0x43A047)
  const whiteMat = mat(0xFAFAFA)
  const orangeMat = mat(0xFF8F00)
  const redMat = mat(0xE53935)
  const blackMat = mat(0x212121)
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.2,
    depthWrite: false,
  })

  // ─── Game Feel Systems ─────────────────────────────────────────────────────
  const hud = new HUDLayer(container)
  const shake = new ScreenShake(camera)
  const flash = new Flash()
  const hopCooldown = new Cooldown(0.08)

  const dustParticles = new ParticleSystem(scene, {
    maxParticles: 100,
    geometry: new THREE.BoxGeometry(0.06, 0.06, 0.06),
    material: new THREE.MeshBasicMaterial({ color: 0xBDBDBD }),
  })

  const splashParticles = new ParticleSystem(scene, {
    maxParticles: 80,
    geometry: new THREE.BoxGeometry(0.08, 0.08, 0.08),
    material: new THREE.MeshBasicMaterial({ color: 0x64B5F6 }),
  })

  const coinParticles = new ParticleSystem(scene, {
    maxParticles: 50,
    geometry: new THREE.BoxGeometry(0.05, 0.05, 0.05),
    material: new THREE.MeshBasicMaterial({ color: 0xFFD700 }),
  })

  const deathParticles = new ParticleSystem(scene, {
    maxParticles: 60,
    geometry: new THREE.BoxGeometry(0.1, 0.1, 0.1),
    material: new THREE.MeshBasicMaterial({ color: 0xFFFFFF }),
  })

  // ─── HUD ───────────────────────────────────────────────────────────────────
  const scoreDisplay = hud.text({
    top: 20, hCenter: true,
    font: 'bold 48px "Trebuchet MS", system-ui, sans-serif',
    color: '#fff',
    shadow: '0 2px 8px rgba(0,0,0,0.5), 0 0 20px rgba(0,0,0,0.2)',
  })

  const highScoreDisplay = hud.text({
    top: 72, hCenter: true,
    font: 'bold 16px system-ui, sans-serif',
    color: '#FFD700',
    shadow: '0 1px 4px rgba(0,0,0,0.4)',
  })
  highScoreDisplay.hide()

  const coinDisplay = hud.text({
    top: 20, left: 20,
    font: 'bold 22px system-ui, sans-serif',
    color: '#FFD700',
    shadow: '0 1px 4px rgba(0,0,0,0.4)',
  })
  coinDisplay.set('🪙 0')

  const startText = hud.text({
    hCenter: true, vCenter: true,
    font: 'bold 22px system-ui, sans-serif',
    color: '#fff',
    shadow: '0 2px 8px rgba(0,0,0,0.5)',
  })
  startText.set('Tap or press ↑ to start')

  let viewMode = 'third' // 'third' | 'first'
  const camModeLabel = hud.text({ bottom: 60, right: 16, font: '12px system-ui, sans-serif', color: 'rgba(255,255,255,0.6)', shadow: 'none' })
  camModeLabel.set('V: 3rd person')

  // On-screen mobile arrow buttons
  const arrowContainer = document.createElement('div')
  Object.assign(arrowContainer.style, {
    position: 'absolute',
    bottom: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    gap: '8px',
    pointerEvents: 'auto',
    zIndex: '20',
    userSelect: 'none',
  })

  function makeArrowBtn(label, onClick) {
    const btn = document.createElement('button')
    btn.textContent = label
    Object.assign(btn.style, {
      width: '52px', height: '52px',
      borderRadius: '12px',
      border: '2px solid rgba(255,255,255,0.3)',
      background: 'rgba(0,0,0,0.25)',
      backdropFilter: 'blur(4px)',
      color: '#fff',
      fontSize: '22px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0',
      fontFamily: 'system-ui',
    })
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault()
      onClick()
    })
    return btn
  }

  const btnLeft = makeArrowBtn('←', () => tryHop(0, 1))
  const btnUp = makeArrowBtn('↑', () => tryHop(1, 0))
  const btnDown = makeArrowBtn('↓', () => tryHop(-1, 0))
  const btnRight = makeArrowBtn('→', () => tryHop(0, -1))

  const topRow = document.createElement('div')
  Object.assign(topRow.style, { display: 'flex', justifyContent: 'center', width: '100%' })
  topRow.appendChild(btnUp)

  const midRow = document.createElement('div')
  Object.assign(midRow.style, { display: 'flex', gap: '8px', justifyContent: 'center', width: '100%' })
  midRow.appendChild(btnLeft)
  midRow.appendChild(btnDown)
  midRow.appendChild(btnRight)

  const arrowWrap = document.createElement('div')
  Object.assign(arrowWrap.style, { display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' })
  arrowWrap.appendChild(topRow)
  arrowWrap.appendChild(midRow)
  arrowContainer.appendChild(arrowWrap)
  hud.root.appendChild(arrowContainer)

  // ─── Player (Chicken!) ─────────────────────────────────────────────────────
  function createChicken() {
    const group = new THREE.Group()

    // Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.55), whiteMat)
    body.position.y = 0.35
    body.castShadow = true
    group.add(body)

    // Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.38, 0.38), whiteMat)
    head.position.set(0, 0.72, 0.05)
    head.castShadow = true
    group.add(head)

    // Beak
    const beak = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.15), orangeMat)
    beak.position.set(0, 0.66, 0.28)
    group.add(beak)

    // Comb (red thingy on top)
    const comb = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.08), redMat)
    comb.position.set(0, 0.96, 0.05)
    group.add(comb)

    // Eyes
    const eyeGeo = new THREE.BoxGeometry(0.07, 0.07, 0.04)
    const leftEye = new THREE.Mesh(eyeGeo, blackMat)
    leftEye.position.set(-0.1, 0.76, 0.2)
    group.add(leftEye)
    const rightEye = new THREE.Mesh(eyeGeo, blackMat)
    rightEye.position.set(0.1, 0.76, 0.2)
    group.add(rightEye)

    // Wings
    const wingGeo = new THREE.BoxGeometry(0.08, 0.25, 0.3)
    const leftWing = new THREE.Mesh(wingGeo, whiteMat)
    leftWing.position.set(-0.3, 0.38, 0)
    leftWing.name = 'leftWing'
    group.add(leftWing)
    const rightWing = new THREE.Mesh(wingGeo, whiteMat)
    rightWing.position.set(0.3, 0.38, 0)
    rightWing.name = 'rightWing'
    group.add(rightWing)

    // Feet
    const footGeo = new THREE.BoxGeometry(0.1, 0.04, 0.16)
    const leftFoot = new THREE.Mesh(footGeo, orangeMat)
    leftFoot.position.set(-0.12, 0.02, 0.04)
    group.add(leftFoot)
    const rightFoot = new THREE.Mesh(footGeo, orangeMat)
    rightFoot.position.set(0.12, 0.02, 0.04)
    group.add(rightFoot)

    // Tail
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.18, 0.1), whiteMat)
    tail.position.set(0, 0.52, -0.3)
    tail.rotation.x = -0.3
    group.add(tail)

    // Ground shadow
    const shadowGeo = new THREE.PlaneGeometry(0.6, 0.6)
    const shadow = new THREE.Mesh(shadowGeo, shadowMat)
    shadow.rotation.x = -Math.PI / 2
    shadow.position.y = 0.01
    shadow.name = 'shadow'
    group.add(shadow)

    return group
  }

  const chicken = createChicken()
  scene.add(chicken)

  // ─── Game State ────────────────────────────────────────────────────────────
  // Time comes from the host's dt, never from performance.now(): the harness steps
  // this world with a fixed dt and expects the same frames back every run.
  let worldTime = 0
  let gameStarted = false
  let gameOver = false
  let score = 0
  let highScore = 0
  let coins = 0
  let maxRow = 0          // furthest row reached
  let playerGridX = 0     // column
  let playerGridZ = 0     // row
  let playerTargetX = 0
  let playerTargetZ = 0
  let isHopping = false
  let hopProgress = 0
  let hopFrom = new THREE.Vector3()
  let hopTo = new THREE.Vector3()
  let hopDirAngle = 0     // angle chicken faces during hop
  let idleTimer = 0
  let eagleSwooping = false
  let onLog = null         // reference to log the player is riding
  let gameOverPanel = null
  let deathType = ''

  // Row data storage
  const rows = new Map()    // z -> row data
  let minGenZ = 0
  let maxGenZ = 0

  // ─── Row Generation ────────────────────────────────────────────────────────
  // Row data: { type, group, obstacles[], decorations[], speed, direction,
  //             coins[], logPositions[], lilyPositions[], trainWarning, trainTimer }

  function pickRowType(z) {
    if (z <= 3) return 'grass'
    // Ensure a path exists: occasional grass breaks
    if (z % 8 === 0) return 'grass'
    const difficulty = Math.min(z / 60, 1) // 0..1 ramp
    const r = Math.random()
    if (r < 0.18 - difficulty * 0.06) return 'grass'
    if (r < 0.58) return 'road'
    if (r < 0.82) return 'river'
    return 'rail'
  }

  function generateRow(z) {
    if (rows.has(z)) return rows.get(z)

    const type = pickRowType(z)
    const group = new THREE.Group()
    group.position.z = z * GRID_SIZE
    scene.add(group)

    const row = {
      type,
      group,
      obstacles: [],
      decorations: [],
      coins: [],
      speed: 0,
      direction: 1,
      logPositions: [],
      lilyPositions: [],
      trainActive: false,
      trainWarningTimer: 0,
      trainCooldown: 0,
      trainMesh: null,
      trainX: 0,
      warningLight: null,
    }

    const difficulty = Math.min(z / 50, 1)

    switch (type) {
      case 'grass': buildGrassRow(row, z); break
      case 'road': buildRoadRow(row, z, difficulty); break
      case 'river': buildRiverRow(row, z, difficulty); break
      case 'rail': buildRailRow(row, z, difficulty); break
    }

    rows.set(z, row)
    return row
  }

  // ─── Grass Row ─────────────────────────────────────────────────────────────
  function buildGrassRow(row, z) {
    const grassColor = GRASS_COLORS[Math.abs(z) % GRASS_COLORS.length]
    const ground = new THREE.Mesh(
      new THREE.BoxGeometry(COLS + 4, 0.3, GRID_SIZE),
      mat(grassColor)
    )
    ground.position.y = -0.15
    ground.receiveShadow = true
    row.group.add(ground)

    // Trees & bushes
    const treeCount = Math.floor(Math.random() * 3) + 1
    for (let t = 0; t < treeCount; t++) {
      const tx = MIN_COL - 1.5 + Math.random() * (COLS + 3)
      // Don't block playable columns too much
      if (Math.abs(tx) <= MAX_COL + 0.3) {
        // Add as decoration (collision check in game logic)
        if (Math.random() < 0.4) continue // skip sometimes in play area
      }
      const tree = createTree()
      tree.position.set(tx, 0, (Math.random() - 0.5) * 0.4)
      row.group.add(tree)
      row.decorations.push({ mesh: tree, x: tx, z: 0, radius: 0.3 })
    }

    // Coins (15% chance on grass rows)
    if (z > 2 && Math.random() < 0.15) {
      const coinX = Math.floor(Math.random() * COLS) + MIN_COL
      const coin = createCoin()
      coin.position.set(coinX, 0.5, 0)
      row.group.add(coin)
      row.coins.push({ mesh: coin, x: coinX, collected: false })
    }
  }

  function createTree() {
    const group = new THREE.Group()
    // Trunk
    const trunk = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.8, 0.25), treeTrunkMat)
    trunk.position.y = 0.4
    trunk.castShadow = true
    group.add(trunk)

    // Foliage (stacked boxes for cute look)
    const leafMat = treeLeafMats[Math.floor(Math.random() * treeLeafMats.length)]
    const sizes = [
      { w: 0.9, h: 0.5, d: 0.9, y: 1.05 },
      { w: 0.7, h: 0.45, d: 0.7, y: 1.5 },
      { w: 0.45, h: 0.35, d: 0.45, y: 1.85 },
    ]
    for (const s of sizes) {
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(s.w, s.h, s.d), leafMat)
      leaf.position.y = s.y
      leaf.castShadow = true
      group.add(leaf)
    }
    return group
  }

  function createCoin() {
    const group = new THREE.Group()
    const coin = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.08), coinMat)
    group.add(coin)
    group.userData.bobPhase = Math.random() * Math.PI * 2
    return group
  }

  // ─── Road Row ──────────────────────────────────────────────────────────────
  function buildRoadRow(row, z, difficulty) {
    // Road surface
    const ground = new THREE.Mesh(
      new THREE.BoxGeometry(COLS + 4, 0.3, GRID_SIZE),
      roadMat
    )
    ground.position.y = -0.15
    ground.receiveShadow = true
    row.group.add(ground)

    // Dashed center lines
    for (let lx = MIN_COL - 2; lx <= MAX_COL + 2; lx += 1.5) {
      const line = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.02, 0.06),
        roadLineMat
      )
      line.position.set(lx, 0.01, 0)
      row.group.add(line)
    }

    // Cars
    row.direction = Math.random() < 0.5 ? 1 : -1
    row.speed = 1.8 + Math.random() * 2.5 + difficulty * 2
    const carCount = 2 + Math.floor(Math.random() * 2) + (difficulty > 0.5 ? 1 : 0)
    const gap = (COLS + 6) / carCount

    for (let i = 0; i < carCount; i++) {
      const isTruck = Math.random() < 0.3
      const car = isTruck ? createTruck() : createCar()
      const startX = MIN_COL - 3 + i * gap + Math.random() * (gap * 0.4)
      car.position.set(startX, 0, 0)
      if (row.direction < 0) car.rotation.y = Math.PI
      row.group.add(car)
      row.obstacles.push({
        mesh: car,
        x: startX,
        width: isTruck ? 2.0 : 1.1,
        height: isTruck ? 0.8 : 0.6,
        type: 'car',
      })
    }
  }

  function createCar() {
    const group = new THREE.Group()
    const color = CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)]
    const carMat = mat(color)
    // Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.35, 0.65), carMat)
    body.position.y = 0.22
    body.castShadow = true
    group.add(body)
    // Roof
    const roof = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.25, 0.55), carMat)
    roof.position.set(-0.05, 0.5, 0)
    roof.castShadow = true
    group.add(roof)
    // Wheels
    const wheelGeo = new THREE.BoxGeometry(0.15, 0.15, 0.7)
    const wheelMat = mat(0x333333)
    const fw = new THREE.Mesh(wheelGeo, wheelMat)
    fw.position.set(0.3, 0.08, 0)
    group.add(fw)
    const bw = new THREE.Mesh(wheelGeo, wheelMat)
    bw.position.set(-0.3, 0.08, 0)
    group.add(bw)
    // Headlights
    const hlGeo = new THREE.BoxGeometry(0.04, 0.08, 0.12)
    const hlMat = mat(0xFFFF00)
    const hl = new THREE.Mesh(hlGeo, hlMat)
    hl.position.set(0.52, 0.25, 0)
    group.add(hl)
    return group
  }

  function createTruck() {
    const group = new THREE.Group()
    const color = TRUCK_COLORS[Math.floor(Math.random() * TRUCK_COLORS.length)]
    const truckMat = mat(color)
    // Cab
    const cab = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.65), truckMat)
    cab.position.set(0.65, 0.35, 0)
    cab.castShadow = true
    group.add(cab)
    // Cargo
    const cargo = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.6, 0.7), truckMat)
    cargo.position.set(-0.15, 0.35, 0)
    cargo.castShadow = true
    group.add(cargo)
    // Wheels
    const wheelGeo = new THREE.BoxGeometry(0.12, 0.15, 0.75)
    const wheelMat2 = mat(0x333333)
    for (const wx of [-0.6, 0.1, 0.65]) {
      const w = new THREE.Mesh(wheelGeo, wheelMat2)
      w.position.set(wx, 0.08, 0)
      group.add(w)
    }
    return group
  }

  // ─── River Row ─────────────────────────────────────────────────────────────
  function buildRiverRow(row, z, difficulty) {
    // Water surface
    const water = new THREE.Mesh(
      new THREE.BoxGeometry(COLS + 4, 0.25, GRID_SIZE),
      waterMat
    )
    water.position.y = -0.2
    water.receiveShadow = true
    row.group.add(water)
    // Darker water below
    const deep = new THREE.Mesh(
      new THREE.BoxGeometry(COLS + 4, 0.1, GRID_SIZE),
      waterDeepMat
    )
    deep.position.y = -0.35
    row.group.add(deep)

    row.direction = Math.random() < 0.5 ? 1 : -1
    row.speed = 1.0 + Math.random() * 1.5 + difficulty * 0.8

    // Logs
    const logCount = 2 + Math.floor(Math.random() * 2)
    const totalSpace = COLS + 6
    const spacing = totalSpace / logCount

    for (let i = 0; i < logCount; i++) {
      const logLen = 2 + Math.floor(Math.random() * 2) // 2-3 units
      const log = createLog(logLen)
      const startX = MIN_COL - 3 + i * spacing + (Math.random() - 0.5) * spacing * 0.3
      log.position.set(startX, 0, 0)
      row.group.add(log)
      row.logPositions.push({
        mesh: log,
        x: startX,
        length: logLen,
      })
    }

    // Lily pads (stationary safe spots, 0-2 per river)
    const lilyCount = Math.random() < 0.4 ? 1 : 0
    for (let i = 0; i < lilyCount; i++) {
      const lx = Math.floor(Math.random() * COLS) + MIN_COL
      const lily = new THREE.Mesh(
        new THREE.BoxGeometry(0.65, 0.08, 0.65),
        lilyMat
      )
      lily.position.set(lx, -0.02, 0)
      row.group.add(lily)
      row.lilyPositions.push({ x: lx })
    }
  }

  function createLog(length) {
    const group = new THREE.Group()
    const log = new THREE.Mesh(
      new THREE.BoxGeometry(length * 0.9, 0.3, 0.7),
      logMat
    )
    log.position.y = 0.05
    log.castShadow = true
    group.add(log)
    // Bark detail
    const bark = new THREE.Mesh(
      new THREE.BoxGeometry(length * 0.8, 0.1, 0.5),
      mat(0x6D4C41)
    )
    bark.position.y = 0.22
    group.add(bark)
    return group
  }

  // ─── Rail Row ──────────────────────────────────────────────────────────────
  function buildRailRow(row, z, difficulty) {
    // Ground
    const ground = new THREE.Mesh(
      new THREE.BoxGeometry(COLS + 4, 0.3, GRID_SIZE),
      mat(0x9E9E9E)
    )
    ground.position.y = -0.15
    ground.receiveShadow = true
    row.group.add(ground)

    // Rails
    for (const rz of [-0.25, 0.25]) {
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(COLS + 4, 0.06, 0.06),
        railMat
      )
      rail.position.set(0, 0.03, rz)
      row.group.add(rail)
    }

    // Ties
    for (let tx = MIN_COL - 3; tx <= MAX_COL + 3; tx += 0.6) {
      const tie = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.04, 0.8),
        railTieMat
      )
      tie.position.set(tx, 0.01, 0)
      row.group.add(tie)
    }

    // Warning light
    const lightPost = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.8, 0.08),
      mat(0x616161)
    )
    lightPost.position.set(MAX_COL + 1.2, 0.4, 0)
    row.group.add(lightPost)

    const warningLight = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.18, 0.18),
      mat(0x666666)
    )
    warningLight.position.set(MAX_COL + 1.2, 0.85, 0)
    row.group.add(warningLight)
    row.warningLight = warningLight

    // Train params
    row.direction = Math.random() < 0.5 ? 1 : -1
    row.speed = 12 + difficulty * 6
    row.trainCooldown = 3 + Math.random() * 4
    row.trainWarningTimer = 0
    row.trainActive = false
    row.trainX = row.direction > 0 ? MIN_COL - 20 : MAX_COL + 20
  }

  function createTrain(direction) {
    const group = new THREE.Group()
    const totalLen = 12
    // Engine
    const engine = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 1.0, 0.8),
      trainAccentMat
    )
    engine.position.set(direction > 0 ? totalLen / 2 - 0.9 : -totalLen / 2 + 0.9, 0.5, 0)
    engine.castShadow = true
    group.add(engine)

    // Cars
    const carCount = 5
    for (let i = 0; i < carCount; i++) {
      const cx = direction > 0
        ? totalLen / 2 - 2.2 - i * 2.0
        : -totalLen / 2 + 2.2 + i * 2.0
      const car = new THREE.Mesh(
        new THREE.BoxGeometry(1.8, 0.8, 0.75),
        trainMat
      )
      car.position.set(cx, 0.45, 0)
      car.castShadow = true
      group.add(car)
    }
    return group
  }

  // ─── Eagle (idle timeout) ──────────────────────────────────────────────────
  const eagleGroup = new THREE.Group()
  eagleGroup.visible = false
  // Simple eagle shadow on ground
  const eagleShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.5, 1.5),
    new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
    })
  )
  eagleShadow.rotation.x = -Math.PI / 2
  eagleShadow.position.y = 0.02
  eagleGroup.add(eagleShadow)
  scene.add(eagleGroup)

  // ─── World Management ──────────────────────────────────────────────────────
  function ensureRows() {
    const targetMin = playerGridZ - ROWS_BEHIND
    const targetMax = playerGridZ + ROWS_AHEAD

    // Generate new rows
    for (let z = targetMin; z <= targetMax; z++) {
      if (!rows.has(z)) {
        generateRow(z)
      }
    }

    // Remove old rows
    for (const [z, row] of rows.entries()) {
      if (z < targetMin - 2 || z > targetMax + 2) {
        scene.remove(row.group)
        // Dispose meshes
        row.group.traverse(child => {
          if (child.geometry && !isSharedGeo(child.geometry)) {
            child.geometry.dispose()
          }
        })
        if (row.trainMesh) {
          scene.remove(row.trainMesh)
        }
        rows.delete(z)
      }
    }

    // Update shadow light to follow player
    dirLight.position.set(playerGridX + 5, 12, playerGridZ - 4)
    dirLight.target.position.set(playerGridX, 0, playerGridZ)
    dirLight.target.updateMatrixWorld()
  }

  function isSharedGeo(geo) {
    return geo === boxGeo || geo === smallBoxGeo || geo === tinyBoxGeo
  }

  // ─── Hop Animation ─────────────────────────────────────────────────────────
  function tryHop(dz, dx) {
    if (gameOver || isHopping) return
    if (!gameStarted) {
      gameStarted = true
      startText.hide()
    }
    if (!hopCooldown.ready) return

    const targetX = playerGridX + dx
    const targetZ = playerGridZ + dz

    // Bounds check
    if (targetX < MIN_COL || targetX > MAX_COL) return

    // Check for tree collision at target
    const targetRow = rows.get(targetZ)
    if (targetRow) {
      for (const dec of targetRow.decorations) {
        if (Math.abs(dec.x - targetX) < dec.radius) return // blocked by tree
      }
    }

    hopCooldown.trigger()
    isHopping = true
    hopProgress = 0
    hopFrom.set(chicken.position.x, 0, chicken.position.z)
    hopTo.set(targetX * GRID_SIZE, 0, targetZ * GRID_SIZE)
    playerTargetX = targetX
    playerTargetZ = targetZ
    idleTimer = 0

    // Face direction
    if (dz > 0) hopDirAngle = 0
    else if (dz < 0) hopDirAngle = Math.PI
    else if (dx > 0) hopDirAngle = -Math.PI / 2
    else if (dx < 0) hopDirAngle = Math.PI / 2

    // Detach from log
    onLog = null
  }

  function updateHop(dt) {
    if (!isHopping) return

    hopProgress += dt / HOP_DURATION
    if (hopProgress >= 1) {
      hopProgress = 1
      isHopping = false
      playerGridX = playerTargetX
      playerGridZ = playerTargetZ

      // Landing effects
      chicken.position.set(
        playerGridX * GRID_SIZE,
        0,
        playerGridZ * GRID_SIZE
      )
      chicken.scale.set(1, 1, 1)

      // Dust burst on landing
      dustParticles.burst({
        position: { x: chicken.position.x, y: 0.05, z: chicken.position.z },
        count: 6,
        speed: [0.5, 1.5],
        lifetime: [0.2, 0.4],
        size: [0.8, 1.5],
        gravity: -3,
        spread: Math.PI,
        color: 0x9E9E9E,
      })

      // Camera bump on land
      shake.add({ amplitude: 0.02, frequency: 30, duration: 0.06 })

      // Update score
      if (playerGridZ > maxRow) {
        const gained = playerGridZ - maxRow
        maxRow = playerGridZ
        score = maxRow
      }

      // Check row generation
      ensureRows()

      // Check if landed on coin
      checkCoinPickup()

      return
    }

    // Interpolate position with arc
    const t = hopProgress
    const easedT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2 // easeInOutQuad
    const x = hopFrom.x + (hopTo.x - hopFrom.x) * easedT
    const z = hopFrom.z + (hopTo.z - hopFrom.z) * easedT
    const y = Math.sin(t * Math.PI) * HOP_HEIGHT

    chicken.position.set(x, y, z)

    // Squash & stretch
    if (t < 0.2) {
      // Takeoff squash
      const s = t / 0.2
      chicken.scale.set(
        1 - 0.15 * (1 - s),
        1 + 0.25 * (1 - s),
        1 - 0.15 * (1 - s)
      )
    } else if (t > 0.8) {
      // Landing stretch
      const s = (t - 0.8) / 0.2
      chicken.scale.set(
        1 + 0.08 * s,
        1 - 0.2 * s,
        1 + 0.08 * s
      )
    } else {
      chicken.scale.set(1, 1, 1)
    }

    // Wing flap during hop
    const wingFlap = Math.sin(t * Math.PI * 3) * 0.3
    const leftWing = chicken.getObjectByName('leftWing')
    const rightWing = chicken.getObjectByName('rightWing')
    if (leftWing) leftWing.rotation.z = wingFlap
    if (rightWing) rightWing.rotation.z = -wingFlap
  }

  // ─── Obstacle Updates ──────────────────────────────────────────────────────
  function updateObstacles(dt) {
    for (const [z, row] of rows.entries()) {
      if (row.type === 'road') {
        updateRoadRow(row, dt)
      } else if (row.type === 'river') {
        updateRiverRow(row, dt, z)
      } else if (row.type === 'rail') {
        updateRailRow(row, dt, z)
      }

      // Animate coins
      for (const coin of row.coins) {
        if (!coin.collected) {
          coin.mesh.rotation.y += dt * 2.5
          coin.mesh.position.y = 0.5 + Math.sin(worldTime * 3 + coin.mesh.userData.bobPhase) * 0.1
        }
      }
    }
  }

  function updateRoadRow(row, dt) {
    const wrap = COLS + 8
    for (const obs of row.obstacles) {
      obs.x += row.speed * row.direction * dt
      obs.mesh.position.x = obs.x

      // Wrap around
      if (row.direction > 0 && obs.x > MAX_COL + 4) {
        obs.x = MIN_COL - 4 - obs.width
      } else if (row.direction < 0 && obs.x < MIN_COL - 4) {
        obs.x = MAX_COL + 4 + obs.width
      }
    }
  }

  function updateRiverRow(row, dt, z) {
    for (const log of row.logPositions) {
      log.x += row.speed * row.direction * dt
      log.mesh.position.x = log.x

      // Wrap
      if (row.direction > 0 && log.x > MAX_COL + 5) {
        log.x = MIN_COL - 5 - log.length
      } else if (row.direction < 0 && log.x < MIN_COL - 5) {
        log.x = MAX_COL + 5 + log.length
      }
    }

    // Water animation: gently bob the water
    const waterChild = row.group.children[0]
    if (waterChild) {
      waterChild.position.y = -0.2 + Math.sin(worldTime + z * 1.5) * 0.03
    }
  }

  function updateRailRow(row, dt, z) {
    if (row.trainActive) {
      // Move train
      row.trainX += row.speed * row.direction * dt
      if (row.trainMesh) {
        row.trainMesh.position.x = row.trainX
      }

      // Train passed?
      const trainEnd = row.direction > 0 ? row.trainX - 7 : row.trainX + 7
      if ((row.direction > 0 && trainEnd > MAX_COL + 8) ||
          (row.direction < 0 && trainEnd < MIN_COL - 8)) {
        // Remove train
        if (row.trainMesh) {
          scene.remove(row.trainMesh)
          row.trainMesh = null
        }
        row.trainActive = false
        row.trainCooldown = 4 + Math.random() * 5
        // Reset warning
        if (row.warningLight) {
          row.warningLight.material = mat(0x666666)
        }
      }
    } else {
      // Countdown to next train
      row.trainCooldown -= dt
      if (row.trainCooldown <= 0 && row.trainCooldown > -1.5) {
        // Warning phase
        row.trainWarningTimer += dt
        // Flash warning light
        if (row.warningLight) {
          const flash = Math.sin(row.trainWarningTimer * 12) > 0
          row.warningLight.material = flash ? mat(0xFF1744) : mat(0x666666)
        }
        // Shake if player is on this row
        if (playerGridZ === z && !isHopping) {
          shake.add({ amplitude: 0.015, frequency: 40, duration: 0.05 })
        }
      }
      if (row.trainCooldown <= -1.5) {
        // Spawn train!
        row.trainActive = true
        row.trainX = row.direction > 0 ? MIN_COL - 14 : MAX_COL + 14
        row.trainMesh = createTrain(row.direction)
        row.trainMesh.position.set(row.trainX, 0, z * GRID_SIZE)
        scene.add(row.trainMesh)
        row.trainWarningTimer = 0
      }
    }
  }

  // ─── Collision Detection ───────────────────────────────────────────────────
  function checkCollisions() {
    if (gameOver || !gameStarted || isHopping) return

    const row = rows.get(playerGridZ)
    if (!row) return

    const px = playerGridX * GRID_SIZE

    if (row.type === 'road') {
      // Check car/truck collision
      for (const obs of row.obstacles) {
        const halfW = obs.width / 2
        if (px > obs.x - halfW - 0.25 && px < obs.x + halfW + 0.25) {
          die('car')
          return
        }
      }
    } else if (row.type === 'river') {
      // Must be on a log or lily pad
      let onSomething = false

      // Check logs
      for (const log of row.logPositions) {
        const halfLen = log.length / 2
        if (px > log.x - halfLen - 0.15 && px < log.x + halfLen + 0.15) {
          onSomething = true
          onLog = log
          break
        }
      }

      // Check lily pads
      if (!onSomething) {
        for (const lily of row.lilyPositions) {
          if (Math.abs(px - lily.x * GRID_SIZE) < 0.4) {
            onSomething = true
            break
          }
        }
      }

      if (!onSomething) {
        die('water')
        return
      }
    } else if (row.type === 'rail') {
      // Check train
      if (row.trainActive && row.trainMesh) {
        const trainHalf = 7
        if (px > row.trainX - trainHalf && px < row.trainX + trainHalf) {
          die('train')
          return
        }
      }
    }

    // Move with log if on one
    if (onLog && row.type === 'river') {
      const logDelta = row.speed * row.direction
      const newX = chicken.position.x + logDelta * (1 / 60) // approximate dt
      chicken.position.x = newX
      playerGridX = Math.round(newX / GRID_SIZE)

      // Fall off edge
      if (playerGridX < MIN_COL - 1 || playerGridX > MAX_COL + 1) {
        die('water')
      }
    }
  }

  // ─── Coin Pickup ───────────────────────────────────────────────────────────
  function checkCoinPickup() {
    const row = rows.get(playerGridZ)
    if (!row) return
    for (const coin of row.coins) {
      if (!coin.collected && Math.abs(coin.x - playerGridX) < 0.5) {
        coin.collected = true
        coin.mesh.visible = false
        coins++
        coinDisplay.set(`🪙 ${coins}`)

        // Golden flash & particles
        hud.flash('#FFD700', 0.15)
        coinParticles.burst({
          position: { x: chicken.position.x, y: 0.6, z: chicken.position.z },
          count: 12,
          speed: [2, 4],
          lifetime: [0.3, 0.6],
          size: [0.6, 1.2],
          gravity: -4,
          spread: Math.PI,
          color: [0xFFD700, 0xFFF176],
        })

        // Float "+1" text
        showFloatingText('+1', chicken.position)
      }
    }
  }

  // ─── Floating Text ─────────────────────────────────────────────────────────
  const floatingTexts = []

  function showFloatingText(text, worldPos) {
    const el = document.createElement('div')
    Object.assign(el.style, {
      position: 'absolute',
      pointerEvents: 'none',
      font: 'bold 20px system-ui',
      color: '#FFD700',
      textShadow: '0 1px 3px rgba(0,0,0,0.5)',
      transition: 'none',
      zIndex: '15',
    })
    el.textContent = text
    hud.root.appendChild(el)
    floatingTexts.push({
      el,
      worldPos: worldPos.clone(),
      life: 1.0,
      vy: -40, // pixels per sec upward
    })
  }

  function updateFloatingTexts(dt) {
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
      const ft = floatingTexts[i]
      ft.life -= dt
      ft.vy -= 20 * dt

      if (ft.life <= 0) {
        ft.el.remove()
        floatingTexts.splice(i, 1)
        continue
      }

      // Project world pos to screen
      const pos = ft.worldPos.clone()
      pos.y += (1 - ft.life) * 2
      pos.project(camera)
      const x = (pos.x * 0.5 + 0.5) * renderer.domElement.clientWidth
      const y = (-pos.y * 0.5 + 0.5) * renderer.domElement.clientHeight
      ft.el.style.left = `${x}px`
      ft.el.style.top = `${y}px`
      ft.el.style.opacity = `${ft.life}`
    }
  }

  // ─── Death ─────────────────────────────────────────────────────────────────
  function die(type) {
    if (gameOver) return
    gameOver = true
    deathType = type
    onLog = null

    switch (type) {
      case 'car':
        // Flatten
        chicken.scale.set(1.4, 0.08, 1.4)
        shake.add({ amplitude: 0.3, frequency: 25, duration: 0.35, decay: 'smooth' })
        hud.flash('#F44336', 0.2)
        deathParticles.burst({
          position: { x: chicken.position.x, y: 0.3, z: chicken.position.z },
          count: 15,
          speed: [2, 5],
          lifetime: [0.3, 0.8],
          size: [0.8, 1.5],
          gravity: -8,
          spread: Math.PI,
          color: [0xFFFFFF, 0xFAFAFA],
        })
        break

      case 'water':
        // Splash & sink
        splashParticles.burst({
          position: { x: chicken.position.x, y: 0.1, z: chicken.position.z },
          count: 20,
          speed: [1.5, 4],
          lifetime: [0.3, 0.7],
          size: [0.8, 1.5],
          gravity: -6,
          spread: Math.PI * 0.7,
          direction: { x: 0, y: 1, z: 0 },
          color: [0x42A5F5, 0x90CAF9],
        })
        hud.flash('#2196F3', 0.2)
        shake.add({ amplitude: 0.12, frequency: 20, duration: 0.25 })
        break

      case 'train':
        // Fling sideways
        shake.add({ amplitude: 0.5, frequency: 22, duration: 0.5, decay: 'smooth' })
        hud.flash('#FF1744', 0.25)
        deathParticles.burst({
          position: { x: chicken.position.x, y: 0.5, z: chicken.position.z },
          count: 25,
          speed: [4, 8],
          lifetime: [0.4, 1.0],
          size: [0.6, 1.2],
          gravity: -10,
          spread: Math.PI,
          color: [0xFFFFFF, 0xCFD8DC],
        })
        break

      case 'eagle':
        hud.flash('#795548', 0.3)
        shake.add({ amplitude: 0.2, frequency: 18, duration: 0.4 })
        break
    }

    // Update high score
    if (score > highScore) {
      highScore = score
    }

    // Show game over after brief pause
    setTimeout(() => {
      showGameOver()
    }, 800)
  }

  function showGameOver() {
    const isNewBest = score >= highScore && score > 0
    gameOverPanel = new GlassPanel({
      title: 'Game Over',
      subtitle: isNewBest ? `🏆 New Record! Best: ${highScore}` : `Best: ${highScore}`,
      body: `Score: ${score}  |  Coins: ${coins}`,
      buttons: [
        {
          label: 'Try Again',
          onClick: () => {
            gameOverPanel.dispose()
            gameOverPanel = null
            restart()
          },
          style: 'primary',
        },
      ],
      width: 320,
    })
    container.appendChild(gameOverPanel.el)
  }

  // ─── Eagle Swoop ───────────────────────────────────────────────────────────
  let eaglePhase = 0

  function updateEagle(dt) {
    if (!gameStarted || gameOver || isHopping) {
      idleTimer = 0
      return
    }

    idleTimer += dt

    if (idleTimer > IDLE_TIMEOUT - 2 && !eagleSwooping) {
      // Show eagle shadow growing
      eagleGroup.visible = true
      eagleGroup.position.set(chicken.position.x, 0, chicken.position.z)
      const scale = Math.min((idleTimer - (IDLE_TIMEOUT - 2)) / 2, 1)
      eagleShadow.scale.setScalar(0.3 + scale * 1.2)
      eagleShadow.material.opacity = 0.1 + scale * 0.4
    }

    if (idleTimer >= IDLE_TIMEOUT && !eagleSwooping) {
      eagleSwooping = true
      eaglePhase = 0
    }

    if (eagleSwooping) {
      eaglePhase += dt
      // Chicken rises up and disappears
      chicken.position.y = eaglePhase * 3
      chicken.scale.setScalar(Math.max(0, 1 - eaglePhase * 0.8))
      if (eaglePhase > 1.2) {
        eagleSwooping = false
        eagleGroup.visible = false
        die('eagle')
      }
    }
  }

  // ─── Restart ───────────────────────────────────────────────────────────────
  function restart() {
    // Clean up all rows
    for (const [z, row] of rows.entries()) {
      scene.remove(row.group)
      if (row.trainMesh) scene.remove(row.trainMesh)
    }
    rows.clear()

    // Clean up floating texts
    for (const ft of floatingTexts) ft.el.remove()
    floatingTexts.length = 0

    // Reset state
    gameStarted = false
    gameOver = false
    score = 0
    coins = 0
    maxRow = 0
    playerGridX = 0
    playerGridZ = 0
    playerTargetX = 0
    playerTargetZ = 0
    isHopping = false
    hopProgress = 0
    onLog = null
    idleTimer = 0
    eagleSwooping = false
    eagleGroup.visible = false
    deathType = ''

    chicken.position.set(0, 0, 0)
    chicken.rotation.set(0, 0, 0)
    chicken.scale.set(1, 1, 1)
    chicken.visible = true

    // Reset wings
    const leftWing = chicken.getObjectByName('leftWing')
    const rightWing = chicken.getObjectByName('rightWing')
    if (leftWing) leftWing.rotation.z = 0
    if (rightWing) rightWing.rotation.z = 0

    scoreDisplay.set('0')
    coinDisplay.set('🪙 0')
    highScoreDisplay.hide()
    startText.show()
    startText.set('Tap or press ↑ to start')

    dustParticles.clear()
    splashParticles.clear()
    coinParticles.clear()
    deathParticles.clear()

    ensureRows()
  }

  // ─── Camera ────────────────────────────────────────────────────────────────
  const camTarget = new THREE.Vector3()
  const camPos = new THREE.Vector3()
  let camBreathPhase = Math.random() * 100

  function updateCamera(dt) {
    camBreathPhase += dt

    if (viewMode === 'first') {
      // First-person: chicken's eye view looking forward
      const fp = chicken.position
      camera.position.set(fp.x, fp.y + 0.9, fp.z + 0.3)
      camera.lookAt(fp.x, fp.y + 0.9, fp.z + 12)
    } else {
      // Third-person: behind-and-above follow
      const targetZ = chicken.position.z + CAM_LOOK_AHEAD
      camTarget.set(
        chicken.position.x * 0.6, // dampen horizontal following
        0,
        targetZ
      )
      const desiredPos = camTarget.clone().add(CAM_OFFSET)
      // Subtle breathing motion
      desiredPos.y += Math.sin(camBreathPhase * 0.8) * 0.06
      desiredPos.x += Math.sin(camBreathPhase * 0.5) * 0.04
      const lerpSpeed = 5
      camera.position.lerp(desiredPos, 1 - Math.exp(-lerpSpeed * dt))
      const lookTarget = new THREE.Vector3(
        chicken.position.x * 0.5,
        0.5,
        chicken.position.z + 2
      )
      camera.lookAt(lookTarget)
    }
  }

  // ─── Death Animations (post-death) ─────────────────────────────────────────
  let deathAnimTimer = 0

  function updateDeathAnim(dt) {
    if (!gameOver) {
      deathAnimTimer = 0
      return
    }
    deathAnimTimer += dt

    switch (deathType) {
      case 'water':
        // Sink the chicken
        if (deathAnimTimer < 1.0) {
          chicken.position.y = -deathAnimTimer * 0.8
          chicken.rotation.x = deathAnimTimer * 0.5
        }
        break

      case 'train': {
        // Fling sideways
        const row = rows.get(playerGridZ)
        if (row && deathAnimTimer < 1.0) {
          const dir = row.direction || 1
          chicken.position.x += dir * dt * 15
          chicken.position.y = Math.max(0, 0.5 - deathAnimTimer * 2)
          chicken.rotation.z += dt * 12
        }
        break
      }
    }
  }

  // ─── Input ─────────────────────────────────────────────────────────────────
  function onKeyDown(e) {
    if (gameOver) {
      if (e.code === 'KeyR') restart()
      return
    }
    switch (e.code) {
      case 'ArrowUp': case 'KeyW':
        e.preventDefault()
        tryHop(1, 0)
        break
      case 'ArrowDown': case 'KeyS':
        e.preventDefault()
        tryHop(-1, 0)
        break
      case 'ArrowLeft': case 'KeyA':
        e.preventDefault()
        tryHop(0, 1)
        break
      case 'ArrowRight': case 'KeyD':
        e.preventDefault()
        tryHop(0, -1)
        break
      case 'KeyR':
        restart()
        break
      case 'KeyV':
        viewMode = viewMode === 'third' ? 'first' : 'third'
        camModeLabel.set(viewMode === 'first' ? 'V: 1st person' : 'V: 3rd person')
        break
    }
  }

  // Touch / click to hop forward
  let touchStartX = 0
  let touchStartY = 0
  let touchStartTime = 0

  function onPointerDown(e) {
    touchStartX = e.clientX
    touchStartY = e.clientY
    touchStartTime = performance.now()
  }

  function onPointerUp(e) {
    // Ignore if it was on a UI button
    if (e.target.tagName === 'BUTTON') return

    const dx = e.clientX - touchStartX
    const dy = e.clientY - touchStartY
    const dist = Math.sqrt(dx * dx + dy * dy)
    const elapsed = performance.now() - touchStartTime

    if (gameOver) return

    // Short tap = hop forward
    if (dist < 15 && elapsed < 300) {
      tryHop(1, 0)
      return
    }

    // Swipe detection
    if (dist > 30) {
      if (Math.abs(dx) > Math.abs(dy)) {
        // Horizontal swipe
        tryHop(0, dx > 0 ? -1 : 1)
      } else {
        // Vertical swipe
        tryHop(dy < 0 ? 1 : -1, 0)
      }
    }
  }

  window.addEventListener('keydown', onKeyDown)
  renderer.domElement.addEventListener('pointerdown', onPointerDown)
  renderer.domElement.addEventListener('pointerup', onPointerUp)

  // ─── Near-miss Detection ───────────────────────────────────────────────────
  const nearMissCooldown = new Cooldown(0.5)

  function checkNearMiss() {
    if (gameOver || !gameStarted) return

    const row = rows.get(playerGridZ)
    if (!row || row.type !== 'road') return

    const px = playerGridX * GRID_SIZE
    for (const obs of row.obstacles) {
      const halfW = obs.width / 2
      const dist = Math.min(
        Math.abs(px - (obs.x - halfW)),
        Math.abs(px - (obs.x + halfW))
      )
      if (dist < 0.6 && dist > 0.25 && nearMissCooldown.ready) {
        nearMissCooldown.trigger()
        // Brief pulse effect
        chicken.scale.set(1.15, 0.9, 1.15)
        setTimeout(() => {
          if (!gameOver) chicken.scale.set(1, 1, 1)
        }, 80)
        break
      }
    }
  }

  // ─── Update Score Display ──────────────────────────────────────────────────
  function updateHUD() {
    scoreDisplay.set(`${score}`)

    if (score > 0 && score >= highScore && highScore > 0) {
      highScoreDisplay.show()
      highScoreDisplay.set('✨ New Record!')
    }
  }

  // ─── Log-riding sync (accurate delta-based) ───────────────────────────────
  function updateLogRiding(dt) {
    if (gameOver || isHopping || !onLog) return

    const row = rows.get(playerGridZ)
    if (!row || row.type !== 'river') {
      onLog = null
      return
    }

    // Move chicken with log
    const delta = row.speed * row.direction * dt
    chicken.position.x += delta
    playerGridX = Math.round(chicken.position.x / GRID_SIZE)

    // Fell off screen?
    if (chicken.position.x < (MIN_COL - 2) * GRID_SIZE ||
        chicken.position.x > (MAX_COL + 2) * GRID_SIZE) {
      die('water')
    }
  }

  // ─── Chicken facing direction ──────────────────────────────────────────────
  function updateChickenRotation(dt) {
    // Smoothly rotate to face hop direction
    const targetRot = hopDirAngle
    let diff = targetRot - chicken.rotation.y
    // Wrap
    while (diff > Math.PI) diff -= Math.PI * 2
    while (diff < -Math.PI) diff += Math.PI * 2
    chicken.rotation.y += diff * Math.min(1, 15 * dt)
  }

  // ─── Frame ─────────────────────────────────────────────────────────────────
  // Host-driven (runtime/world.js): no rAF of our own, the player/harness calls
  // renderFrame(dt) — the tick is implied.

  // Initial setup
  ensureRows()
  scoreDisplay.set('0')

  function renderFrame(rawDt) {
    const dt = Math.min(rawDt || 0, 0.05) // cap dt
    worldTime += dt

    // Update systems
    hopCooldown.tick(dt)
    nearMissCooldown.tick(dt)
    flash.tick(dt)
    dustParticles.tick(dt)
    splashParticles.tick(dt)
    coinParticles.tick(dt)
    deathParticles.tick(dt)

    if (!gameOver) {
      updateHop(dt)
      updateLogRiding(dt)
      updateObstacles(dt)
      checkCollisions()
      checkNearMiss()
      updateEagle(dt)
      updateChickenRotation(dt)
      updateHUD()
    } else {
      updateObstacles(dt) // keep the world alive
      updateDeathAnim(dt)
    }

    updateCamera(dt)
    shake.tick(dt) // AFTER camera positioning
    updateFloatingTexts(dt)

    renderer.render(scene, camera)
  }

  // ─── Resize ────────────────────────────────────────────────────────────────
  function resize() {
    const w = container.clientWidth || 800
    const h = container.clientHeight || 600
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h)
  }

  // ─── Dispose ───────────────────────────────────────────────────────────────
  function dispose() {
    window.removeEventListener('keydown', onKeyDown)
    renderer.domElement.removeEventListener('pointerdown', onPointerDown)
    renderer.domElement.removeEventListener('pointerup', onPointerUp)

    // Clean rows
    for (const [z, row] of rows.entries()) {
      scene.remove(row.group)
      if (row.trainMesh) scene.remove(row.trainMesh)
    }
    rows.clear()

    // Clean floating texts
    for (const ft of floatingTexts) ft.el.remove()

    hud.dispose()
    dustParticles.dispose()
    splashParticles.dispose()
    coinParticles.dispose()
    deathParticles.dispose()

    if (gameOverPanel) gameOverPanel.dispose()

    // Dispose shared resources
    boxGeo.dispose()
    smallBoxGeo.dispose()
    tinyBoxGeo.dispose()

    renderer.dispose()
    container.removeChild(renderer.domElement)
  }

  // ─── WorldModule ───────────────────────────────────────────────────────────
  return {
    getScene: () => scene,
    getCamera: () => camera,
    getRenderer: () => renderer,
    getCanvas: () => renderer.domElement,
    getOrbitControls: () => null,
    resize, dispose, renderFrame,
  }
}
