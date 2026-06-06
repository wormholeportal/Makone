/**
 * Battle City Reborn
 *
 * 🟢 BUILT FROM DESIGN DOC — worlds/battle-city.design.md
 *    Step 0 fantasy: 5/5 ✅
 *
 * Top-down (45° pitch) low-poly tank combat. Defend the eagle, destroy 20 enemy
 * tanks. Bricks crumble corner-by-corner, steel resists, water blocks tanks but
 * not bullets, grass hides tanks.
 *
 * Controls:
 *   ↑ ↓ ← → / WASD    move + aim (tank turret follows movement direction)
 *   Space             fire
 *   R                 restart on game over
 *
 * Per skills/games/03-architecture/share-geometries-and-materials.md — every
 * tank/bullet/wall block re-uses ONE geometry per type.
 */

import * as THREE from 'three'
import {
  Cooldown,
  ScreenShake,
  Flash,
  Stopwatch,
  HUDLayer,
  GlassPanel,
  ParticleSystem,
} from 'makone/game'

export default async function createScene(container) {
  const canvasArea = (container.clientWidth || 800) * (container.clientHeight || 600)
  const lowSpec = (navigator.hardwareConcurrency || 4) <= 4 || canvasArea > 1_800_000
  const pixelRatio = Math.min(window.devicePixelRatio, lowSpec ? 1.25 : 1.5)
  // ───────────────────────────────────────────────────────────────────────────
  // PALETTE — bright top-down board-game look
  // ───────────────────────────────────────────────────────────────────────────
  const C = {
    floor:       0x4a4a3a,        // dark earthy ground (so bricks pop)
    floorEdge:   0x32322a,
    brick:       0xc8503a,
    brickLine:   0x6a1c0e,
    brickShade:  0xa83822,
    steel:       0x8a8a98,
    steelHi:     0xb8b8c8,
    water:       0x2c7fb8,
    waterFoam:   0x6cd0f0,
    grass:       0x4aa838,
    grassDark:   0x32802a,
    eagle:       0xffc83a,
    eagleDark:   0x8a6010,
    eagleBeak:   0xff8a18,
    player:      0x4caf50,
    playerTrack: 0x2a6a30,
    enemyBasic:  0xc8c8c8,
    enemyFast:   0xff8a32,
    enemyPower:  0xe0d8f0,
    enemyHeavy:  0xffd040,
    bulletPlayer:0xffffff,
    bulletEnemy: 0xff8030,
    pickup:      0xffd84a,
    sky:         0x6ac6ff,
    explosion:   [0xff8030, 0xffe038, 0xffffff],
  }

  // ───────────────────────────────────────────────────────────────────────────
  // CONSTANTS — gameplay tuning
  // ───────────────────────────────────────────────────────────────────────────
  // World is a 13×13 cell grid. Each cell = 2 world units. Brick has 4 sub-cells.
  const GRID_W = 13                  // cells
  const GRID_H = 13
  const CELL = 2.0                   // world units per cell
  const SUB = 4                      // brick sub-cells per cell (2×2)
  const MAP_W = GRID_W * CELL        // 26
  const MAP_H = GRID_H * CELL
  // Tank size — slightly smaller than cell so they pass each other in corridors
  const TANK_SIZE = 1.7
  const TANK_HALF = TANK_SIZE / 2
  // Speeds (m/s)
  const PLAYER_SPEED = 5.5
  const ENEMY_SPEED = { basic: 3.8, fast: 6.2, power: 4.0, heavy: 3.0 }
  const ENEMY_HP    = { basic: 1,   fast: 1,   power: 2,   heavy: 4 }
  const ENEMY_SCORE = { basic: 100, fast: 200, power: 300, heavy: 400 }
  // Bullet
  const BULLET_SPEED = 18
  const BULLET_LEN = 0.6
  const FIRE_CD = 0.45                // sec between shots
  // Enemy spawning
  const MAX_ENEMIES_ALIVE = 4
  const ENEMY_SPAWN_INTERVAL = 3.5    // sec between spawns
  const TOTAL_ENEMIES = 20
  const ENEMY_FIRE_CD = [1.5, 3.5]    // sec range
  // Player
  const PLAYER_LIVES = 3
  const RESPAWN_INVULN = 2.5          // sec of blinking invulnerability

  // ───────────────────────────────────────────────────────────────────────────
  // RENDERER + ORTHOGRAPHIC TOP-DOWN/TILTED CAMERA
  // ───────────────────────────────────────────────────────────────────────────
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'default' })
  renderer.setPixelRatio(pixelRatio)
  renderer.setSize(container.clientWidth, container.clientHeight)
  // REAL TIME SHADOWS — biggest "this is 3D" upgrade for this style of scene
  renderer.shadowMap.enabled = !lowSpec
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.NoToneMapping
  container.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(C.sky)

  // PerspectiveCamera so we can cycle TOP-DOWN / 3rd PERSON / 1st PERSON.
  // (Was Orthographic; switched to Perspective for unified mode switching.)
  const aspect = container.clientWidth / container.clientHeight
  const camera = new THREE.PerspectiveCamera(38, aspect, 0.1, 300)
  // Initial pose = TOP-DOWN BOARD VIEW (narrow FOV from high altitude gives ortho-like read)
  camera.position.set(MAP_W / 2, 52, MAP_H / 2 + 22)
  camera.lookAt(MAP_W / 2, 0, MAP_H / 2)

  // Camera modes — cycle with V.
  // CRITICAL: in a 4-dir grid game, ANY camera that rotates with the tank
  // is dizzying (player flips dir every ~0.4s). All modes here keep a FIXED
  // world-relative orientation. Camera translates with tank but never spins.
  const CAM_MODES = [
    { id: 'top',   label: 'TOP (Tactical)', fov: 38 },
    { id: 'iso',   label: 'ISO (3D)',       fov: 45 },
    { id: 'close', label: 'CLOSE (Chase)',  fov: 50 },
  ]
  let camModeIdx = 0
  function cycleCameraMode() {
    camModeIdx = (camModeIdx + 1) % CAM_MODES.length
    const m = CAM_MODES[camModeIdx]
    camera.fov = m.fov
    camera.updateProjectionMatrix()
    if (cameraModeLabel) cameraModeLabel.textContent = `📷 ${m.label} — V to cycle`
  }
  function currentCamMode() { return CAM_MODES[camModeIdx].id }

  // Smoothing state for follow cameras
  const camTargetPos = new THREE.Vector3().copy(camera.position)
  const camTargetLook = new THREE.Vector3(MAP_W / 2, 0, MAP_H / 2)
  const camCurLook = new THREE.Vector3().copy(camTargetLook)

  // Lighting — stronger contrast for shadow drama
  scene.add(new THREE.HemisphereLight(0xc8e0ff, 0x404050, 0.55))
  const sun = new THREE.DirectionalLight(0xfff0d8, 1.35)
  sun.position.set(MAP_W / 2 + 14, 32, MAP_H / 2 + 18)
  sun.castShadow = true
  sun.shadow.mapSize.set(lowSpec ? 512 : 1024, lowSpec ? 512 : 1024)
  // Orthographic shadow frustum sized to map (no waste)
  const sc = sun.shadow.camera
  sc.left = -MAP_W / 2 - 4; sc.right = MAP_W / 2 + 4
  sc.top = MAP_H / 2 + 4;   sc.bottom = -MAP_H / 2 - 4
  sc.near = 1; sc.far = 80
  sun.shadow.bias = -0.0006
  sun.shadow.normalBias = 0.04
  sun.target.position.set(MAP_W / 2, 0, MAP_H / 2)
  scene.add(sun, sun.target)

  const fx = {
    render: () => renderer.render(scene, camera),
    resize: () => {},
    dispose: () => {},
  }

  // ───────────────────────────────────────────────────────────────────────────
  // SHARED GEOMETRIES / MATERIALS — one of each, used everywhere
  // ───────────────────────────────────────────────────────────────────────────
  // ── BRICK: textured procedurally — a canvas pattern that reads as real masonry ──
  function makeBrickTexture() {
    const c = document.createElement('canvas')
    c.width = c.height = 128
    const ctx = c.getContext('2d')
    // Base brick color
    ctx.fillStyle = '#c8503a'
    ctx.fillRect(0, 0, 128, 128)
    // Brick courses (2 rows × staggered)
    ctx.fillStyle = '#6a1c0e'   // dark mortar
    // Horizontal lines
    ctx.fillRect(0, 31, 128, 3)
    ctx.fillRect(0, 95, 128, 3)
    // Vertical lines (staggered)
    ctx.fillRect(63, 0, 3, 32)
    ctx.fillRect(31, 32, 3, 64)
    ctx.fillRect(95, 32, 3, 64)
    ctx.fillRect(63, 96, 3, 32)
    // Subtle brick-face shading (lighter scratches)
    ctx.fillStyle = 'rgba(255, 200, 160, 0.13)'
    for (let i = 0; i < 30; i++) {
      const x = Math.random() * 128, y = Math.random() * 128
      ctx.fillRect(x, y, 2 + Math.random() * 4, 1)
    }
    // Dark wear spots
    ctx.fillStyle = 'rgba(0,0,0,0.18)'
    for (let i = 0; i < 12; i++) {
      const x = Math.random() * 128, y = Math.random() * 128
      ctx.beginPath(); ctx.arc(x, y, 1 + Math.random() * 3, 0, Math.PI * 2); ctx.fill()
    }
    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 4
    return tex
  }
  const brickTex = makeBrickTexture()
  const SUB_SIZE = CELL / 2          // 1.0
  const BRICK_SUB_GEO = new THREE.BoxGeometry(SUB_SIZE * 0.92, 0.9, SUB_SIZE * 0.92)
  const brickMat = new THREE.MeshLambertMaterial({ color: 0xffffff, map: brickTex })

  // ── STEEL: textured with rivets + plate edges for armor-plate feel ──
  function makeSteelTexture() {
    const c = document.createElement('canvas')
    c.width = c.height = 128
    const ctx = c.getContext('2d')
    // Base
    ctx.fillStyle = '#8a8a98'
    ctx.fillRect(0, 0, 128, 128)
    // Diagonal hatching (subtle metal grain)
    ctx.strokeStyle = 'rgba(255,255,255,0.07)'
    ctx.lineWidth = 1
    for (let i = -64; i < 128; i += 6) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + 64, 128); ctx.stroke()
    }
    // Plate seam (border)
    ctx.strokeStyle = '#404048'
    ctx.lineWidth = 4
    ctx.strokeRect(2, 2, 124, 124)
    // 4 corner rivets
    for (const [x, y] of [[16, 16], [112, 16], [16, 112], [112, 112]]) {
      // dark recess
      ctx.fillStyle = '#404048'
      ctx.beginPath(); ctx.arc(x, y, 5.5, 0, Math.PI * 2); ctx.fill()
      // bright rivet head
      ctx.fillStyle = '#c8c8d8'
      ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2); ctx.fill()
      // highlight glint
      ctx.fillStyle = '#ffffff'
      ctx.beginPath(); ctx.arc(x - 1, y - 1, 1.3, 0, Math.PI * 2); ctx.fill()
    }
    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 4
    return tex
  }
  const steelTex = makeSteelTexture()
  const STEEL_GEO = new THREE.BoxGeometry(CELL * 0.96, 1.1, CELL * 0.96)
  const steelMat = new THREE.MeshLambertMaterial({ color: 0xffffff, map: steelTex })

  // ── WATER: animated 2-tone via mat color shift ──
  const WATER_GEO = new THREE.BoxGeometry(CELL * 0.98, 0.18, CELL * 0.98)
  const waterMat = new THREE.MeshLambertMaterial({ color: C.water })

  // ── GRASS ──
  const GRASS_GEO = new THREE.BoxGeometry(CELL * 0.95, 0.05, CELL * 0.95)
  const grassMat = new THREE.MeshBasicMaterial({ color: C.grass, transparent: true, opacity: 0.85 })

  // ── GROUND with subtle dirt texture (no per-tile geometry) ──
  function makeGroundTexture() {
    const c = document.createElement('canvas')
    c.width = c.height = 256
    const ctx = c.getContext('2d')
    ctx.fillStyle = '#4a4a3a'
    ctx.fillRect(0, 0, 256, 256)
    // Dirt patches — varied dark blobs
    for (let i = 0; i < 30; i++) {
      ctx.fillStyle = `rgba(${30 + Math.random() * 20}, ${30 + Math.random() * 20}, ${20 + Math.random() * 15}, 0.5)`
      const x = Math.random() * 256, y = Math.random() * 256
      const r = 8 + Math.random() * 22
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill()
    }
    // Small pebble specks
    for (let i = 0; i < 80; i++) {
      ctx.fillStyle = `rgba(${100 + Math.random() * 40}, ${90 + Math.random() * 30}, ${70 + Math.random() * 30}, 0.4)`
      const x = Math.random() * 256, y = Math.random() * 256
      ctx.fillRect(x, y, 1 + Math.random() * 2, 1 + Math.random() * 2)
    }
    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    tex.repeat.set(3, 3)
    return tex
  }
  const groundMat = new THREE.MeshLambertMaterial({ color: 0xffffff, map: makeGroundTexture() })

  // Bullets
  const BULLET_GEO = new THREE.CylinderGeometry(0.10, 0.10, BULLET_LEN, 6)
  // Pickups
  const PICKUP_BASE_GEO = new THREE.BoxGeometry(0.9, 0.18, 0.9)
  const pickupBaseMat = new THREE.MeshLambertMaterial({ color: 0x202028 })

  // ───────────────────────────────────────────────────────────────────────────
  // GROUND + WALL DECORATION
  // ───────────────────────────────────────────────────────────────────────────
  // Ground floor (whole grid)
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(MAP_W + 6, MAP_H + 6),
    groundMat,
  )
  ground.rotation.x = -Math.PI / 2
  ground.position.set(MAP_W / 2, -0.05, MAP_H / 2)
  ground.receiveShadow = true
  scene.add(ground)
  // Outer frame (steel-colored border around the play area)
  const frameMat = new THREE.MeshLambertMaterial({ color: 0x303038 })
  for (const [w, h, x, z] of [
    [MAP_W + 4, 2, MAP_W / 2, -1],
    [MAP_W + 4, 2, MAP_W / 2, MAP_H + 1],
    [2, MAP_H + 4, -1, MAP_H / 2],
    [2, MAP_H + 4, MAP_W + 1, MAP_H / 2],
  ]) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(w, 0.5, h), frameMat)
    f.position.set(x, 0.25, z)
    scene.add(f)
  }

  // ───────────────────────────────────────────────────────────────────────────
  // LEVEL DATA — 13×13 grid (top row = y=0)
  // Legend:
  //   .  empty
  //   B  brick (4 sub-cells, all alive)
  //   S  steel (indestructible by basic gun)
  //   W  water (blocks tanks, bullets pass)
  //   G  grass (tanks hide, bullets pass — drawn ABOVE tanks)
  //   E  eagle (at the bottom-center)
  //   p  player spawn
  //   e  enemy spawn (3 fixed at top-left, top-center, top-right)
  // ───────────────────────────────────────────────────────────────────────────
  const RAW_MAP = [
    'e...e....e..e',
    '.............',
    '..B..S.B..B..',
    '..B....B..B..',
    '.WWW.....WWW.',
    '...B.....B...',
    'S..B..B..B..S',
    '...B.....B...',
    '.WWW.B.B.WWW.',
    '..B...G...B..',
    '..B.GGGGG.B..',
    '..B.G.B.G.B..',
    '....B.E.B....',
    // Note: 13 rows above (we want GRID_H = 13)
  ]
  // Pad / trim to GRID_H rows × GRID_W cols
  while (RAW_MAP.length < GRID_H) RAW_MAP.unshift('.'.repeat(GRID_W))
  RAW_MAP.length = GRID_H
  const MAP = RAW_MAP.map(r => r.padEnd(GRID_W, '.').slice(0, GRID_W))

  // Grid coordinate helpers
  // World position: x in [0..MAP_W], z in [0..MAP_H]. Grid cell (cx, cz):
  //   cx = floor(x / CELL),  cz = floor(z / CELL)
  // Grid (cx, cz) center: (cx*CELL + CELL/2, cz*CELL + CELL/2)
  function cellCenter(cx, cz) {
    return new THREE.Vector3(cx * CELL + CELL / 2, 0, cz * CELL + CELL / 2)
  }

  // ───────────────────────────────────────────────────────────────────────────
  // BRICK SYSTEM — each cell stores 2×2 sub-cells (NE, NW, SE, SW alive flags)
  // Each alive sub-cell has its own Mesh — bullets can destroy them individually.
  // ───────────────────────────────────────────────────────────────────────────
  /** @type {Map<string, { type: string, mesh?: THREE.Mesh, subs?: Array<{mesh: THREE.Mesh, alive: boolean}> }>} */
  const cells = new Map()
  function cellKey(cx, cz) { return `${cx},${cz}` }
  const enemySpawnPoints = []
  let playerSpawn = null
  let eagleCell = null

  const brickGroup = new THREE.Group()
  const steelGroup = new THREE.Group()
  const waterGroup = new THREE.Group()
  const grassGroup = new THREE.Group()
  scene.add(brickGroup, steelGroup, waterGroup)

  for (let cz = 0; cz < GRID_H; cz++) {
    for (let cx = 0; cx < GRID_W; cx++) {
      const ch = MAP[cz][cx]
      const center = cellCenter(cx, cz)
      if (ch === 'B') {
        const subs = []
        for (let sy = 0; sy < 2; sy++) {
          for (let sx = 0; sx < 2; sx++) {
            const m = new THREE.Mesh(BRICK_SUB_GEO, brickMat)
            m.position.set(
              center.x - SUB_SIZE / 2 + sx * SUB_SIZE,
              0.45,
              center.z - SUB_SIZE / 2 + sy * SUB_SIZE,
            )
            m.castShadow = true
            m.receiveShadow = true
            brickGroup.add(m)
            subs.push({ mesh: m, alive: true, sx, sy })
          }
        }
        cells.set(cellKey(cx, cz), { type: 'B', subs, cx, cz })
      } else if (ch === 'S') {
        const m = new THREE.Mesh(STEEL_GEO, steelMat)
        m.position.set(center.x, 0.55, center.z)
        m.castShadow = true
        m.receiveShadow = true
        steelGroup.add(m)
        cells.set(cellKey(cx, cz), { type: 'S', mesh: m, cx, cz })
      } else if (ch === 'W') {
        const m = new THREE.Mesh(WATER_GEO, waterMat)
        m.position.set(center.x, 0.09, center.z)
        waterGroup.add(m)
        cells.set(cellKey(cx, cz), { type: 'W', mesh: m, cx, cz })
      } else if (ch === 'G') {
        // grass added separately (above tanks)
        const m = new THREE.Mesh(GRASS_GEO, grassMat)
        m.position.set(center.x, 1.0, center.z)
        m.renderOrder = 5
        grassGroup.add(m)
        cells.set(cellKey(cx, cz), { type: 'G', mesh: m, cx, cz })
      } else if (ch === 'E') {
        eagleCell = { cx, cz, center }
      } else if (ch === 'e') {
        enemySpawnPoints.push({ cx, cz, center })
      } else if (ch === 'p') {
        playerSpawn = { cx, cz, center }
      }
    }
  }
  // Default player spawn = left-of-center along bottom row.
  // Must be on an EMPTY cell. cx=2 is '.', cx=4 is 'B' (do NOT use 4).
  if (!playerSpawn) {
    const cx = 2, cz = GRID_H - 1
    playerSpawn = { cx, cz, center: cellCenter(cx, cz) }
  }
  // Default eagle cell (bottom center) if not in map
  if (!eagleCell) {
    eagleCell = { cx: 6, cz: GRID_H - 1, center: cellCenter(6, GRID_H - 1) }
  }
  // Default enemy spawns at top corners + center
  if (enemySpawnPoints.length === 0) {
    enemySpawnPoints.push(
      { cx: 0, cz: 0, center: cellCenter(0, 0) },
      { cx: 6, cz: 0, center: cellCenter(6, 0) },
      { cx: 12, cz: 0, center: cellCenter(12, 0) },
    )
  }

  // Grass added LAST so it draws above tanks (depth test still applies but renderOrder helps)
  scene.add(grassGroup)

  // ───────────────────────────────────────────────────────────────────────────
  // EAGLE BASE (the thing you defend)
  // ───────────────────────────────────────────────────────────────────────────
  /** @type {{ alive: boolean, mesh: THREE.Group, cell: any, dyingT: number }} */
  const eagle = {
    alive: true,
    cell: eagleCell,
    mesh: new THREE.Group(),
    dyingT: 0,
  }
  function buildEagle() {
    const g = eagle.mesh
    while (g.children.length) g.remove(g.children[0])
    // Base pedestal
    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.85, 0.95, 0.45, 14),
      new THREE.MeshLambertMaterial({ color: C.eagleDark }),
    )
    pedestal.position.y = 0.22
    g.add(pedestal)
    // Body
    const body = new THREE.Mesh(
      new THREE.SphereGeometry(0.55, 14, 10),
      new THREE.MeshLambertMaterial({ color: C.eagle }),
    )
    body.scale.set(1, 1.1, 0.95)
    body.position.y = 0.95
    g.add(body)
    // Head
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 12, 10),
      new THREE.MeshLambertMaterial({ color: C.eagle }),
    )
    head.position.set(0, 1.55, 0.2)
    g.add(head)
    // Beak
    const beak = new THREE.Mesh(
      new THREE.ConeGeometry(0.12, 0.3, 5),
      new THREE.MeshLambertMaterial({ color: C.eagleBeak }),
    )
    beak.rotation.x = -Math.PI / 2
    beak.position.set(0, 1.5, 0.55)
    g.add(beak)
    // Eyes
    for (const sx of [-0.13, 0.13]) {
      const eye = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 6, 5),
        new THREE.MeshBasicMaterial({ color: 0x111 }),
      )
      eye.position.set(sx, 1.62, 0.45)
      g.add(eye)
    }
    // Wings (small triangle planes on each side)
    const wingMat = new THREE.MeshLambertMaterial({ color: C.eagleDark, side: THREE.DoubleSide })
    for (const sign of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.45), wingMat)
      wing.position.set(sign * 0.45, 0.95, -0.05)
      wing.rotation.y = sign * Math.PI * 0.15
      g.add(wing)
    }
    g.position.copy(eagle.cell.center)
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true } })
  }
  buildEagle()
  scene.add(eagle.mesh)

  // The eagle's CELL itself acts as solid (tanks bounce off, bullets explode on it)
  cells.set(cellKey(eagle.cell.cx, eagle.cell.cz), { type: 'E', cx: eagle.cell.cx, cz: eagle.cell.cz })

  // ───────────────────────────────────────────────────────────────────────────
  // TANK BUILDER — shared per body type, returns Group with .turret pivot
  // ───────────────────────────────────────────────────────────────────────────
  // Shared geos for tanks (chunky low-poly: hull + tracks + turret + barrel)
  const TANK_HULL_GEO = new THREE.BoxGeometry(TANK_SIZE * 0.85, 0.45, TANK_SIZE * 0.7)
  const TANK_TRACK_GEO = new THREE.BoxGeometry(TANK_SIZE * 0.94, 0.35, TANK_SIZE * 0.22)
  const TANK_TURRET_GEO = new THREE.CylinderGeometry(0.42, 0.48, 0.36, 12)
  const TANK_BARREL_GEO = new THREE.CylinderGeometry(0.08, 0.10, 0.95, 8)
  const TANK_HATCH_GEO = new THREE.CylinderGeometry(0.18, 0.18, 0.06, 8)
  const TANK_WHEEL_GEO = new THREE.CylinderGeometry(0.15, 0.15, 0.08, 8)
  const TANK_AERIAL_GEO = new THREE.CylinderGeometry(0.018, 0.018, 0.6, 5)

  function buildTank(bodyColor, trackColor, accent = 0xfff5d8) {
    const g = new THREE.Group()
    const hullMat = new THREE.MeshLambertMaterial({ color: bodyColor })
    const trackMat = new THREE.MeshLambertMaterial({ color: trackColor })
    // Two tracks (left + right)
    for (const sx of [-1, 1]) {
      const tr = new THREE.Mesh(TANK_TRACK_GEO, trackMat)
      tr.position.set(0, 0.18, sx * (TANK_SIZE * 0.36))
      g.add(tr)
      // Wheel detail on each side
      for (const ox of [-0.55, -0.2, 0.2, 0.55]) {
        const w = new THREE.Mesh(TANK_WHEEL_GEO, hullMat)
        w.rotation.z = Math.PI / 2
        w.position.set(ox, 0.18, sx * (TANK_SIZE * 0.45))
        g.add(w)
      }
    }
    // Hull
    const hull = new THREE.Mesh(TANK_HULL_GEO, hullMat)
    hull.position.y = 0.5
    g.add(hull)
    // Turret group (rotates independently — though for FC-style we keep it locked to body)
    const turret = new THREE.Group()
    turret.position.y = 0.7
    g.add(turret)
    const turretBody = new THREE.Mesh(TANK_TURRET_GEO, hullMat)
    turretBody.position.y = 0.18
    turret.add(turretBody)
    // Hatch (small lighter disc on top of turret)
    const hatch = new THREE.Mesh(TANK_HATCH_GEO, new THREE.MeshLambertMaterial({ color: trackColor }))
    hatch.position.y = 0.38
    turret.add(hatch)
    // Barrel (extends FORWARD = +Z in mesh local; we'll rotate the whole tank to face dir)
    const barrel = new THREE.Mesh(TANK_BARREL_GEO, trackMat)
    barrel.rotation.x = Math.PI / 2
    barrel.position.set(0, 0.18, 0.65)
    turret.add(barrel)
    // Aerial wire (top-back)
    const aerial = new THREE.Mesh(TANK_AERIAL_GEO, trackMat)
    aerial.position.set(-0.3, 0.55, -0.4)
    aerial.rotation.x = -0.2
    turret.add(aerial)
    // Tiny accent star on the side of the hull (gives team color)
    const star = new THREE.Mesh(
      new THREE.CircleGeometry(0.18, 5),
      new THREE.MeshBasicMaterial({ color: accent }),
    )
    star.position.set(0.01, 0.55, 0)
    star.rotation.y = Math.PI / 2
    hull.add(star)
    g.userData.turret = turret
    g.userData.barrel = barrel
    // All tank pieces cast + receive shadows
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true } })
    return g
  }

  // ───────────────────────────────────────────────────────────────────────────
  // PLAYER TANK
  // ───────────────────────────────────────────────────────────────────────────
  const player = {
    pos: new THREE.Vector3(),
    dir: { dx: 0, dz: -1 },              // facing up (toward -z aka top of grid)
    moving: false,
    speed: PLAYER_SPEED,
    mesh: buildTank(C.player, C.playerTrack, 0xfff5d8),
    fireCD: new Cooldown(FIRE_CD),     // positional API: seconds
    lives: PLAYER_LIVES,
    alive: true,
    invuln: 0,
    powerLevel: 1,                       // 1=basic, 2=fast bullet, 3=2 bullets, 4=destroys steel
    bulletsActive: 0,
    maxBullets: 1,
  }
  player.pos.copy(playerSpawn.center)
  player.mesh.position.copy(player.pos)
  // mesh.rotation.y == 0 means barrel points +z. We want it pointing -z (up the grid).
  player.mesh.rotation.y = Math.PI
  scene.add(player.mesh)

  // ───────────────────────────────────────────────────────────────────────────
  // INPUT
  // ───────────────────────────────────────────────────────────────────────────
  const keys = { up: false, down: false, left: false, right: false, fire: false }
  const onKeyDown = (e) => {
    if (e.code === 'ArrowUp' || e.code === 'KeyW') keys.up = true
    if (e.code === 'ArrowDown' || e.code === 'KeyS') keys.down = true
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = true
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = true
    if (e.code === 'Space') { keys.fire = true; e.preventDefault() }
    if (e.code === 'KeyV') cycleCameraMode()
    if (e.code === 'Digit1') { camModeIdx = -1; cycleCameraMode() }   // jump to top
    if (e.code === 'Digit2') { camModeIdx = 0; cycleCameraMode() }    // jump to third
    if (e.code === 'Digit3') { camModeIdx = 1; cycleCameraMode() }    // jump to first
    if (e.code === 'KeyR' && (gameState === 'lost' || gameState === 'won')) restart()
  }
  const onKeyUp = (e) => {
    if (e.code === 'ArrowUp' || e.code === 'KeyW') keys.up = false
    if (e.code === 'ArrowDown' || e.code === 'KeyS') keys.down = false
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false
    if (e.code === 'Space') keys.fire = false
  }
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)

  // ───────────────────────────────────────────────────────────────────────────
  // COLLISION HELPERS — tank-vs-grid AABB walking
  // ───────────────────────────────────────────────────────────────────────────
  /**
   * Check if a tank can occupy world position (px, pz) with given half-extent.
   * Pass the tank's own object reference as `selfTank` so we skip self-collision.
   * (Old id-based version broke for player — player has no `.id` field.)
   */
  function tankCanOccupy(px, pz, half, selfTank) {
    if (px - half < 0 || px + half > MAP_W) return false
    if (pz - half < 0 || pz + half > MAP_H) return false
    const cx0 = Math.floor((px - half) / CELL)
    const cx1 = Math.floor((px + half) / CELL)
    const cz0 = Math.floor((pz - half) / CELL)
    const cz1 = Math.floor((pz + half) / CELL)
    for (let cz = cz0; cz <= cz1; cz++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        const cell = cells.get(cellKey(cx, cz))
        if (!cell) continue
        if (cell.type === 'B') {
          for (const sub of cell.subs) {
            if (!sub.alive) continue
            const sx = cx * CELL + (sub.sx + 0.5) * SUB_SIZE
            const sz = cz * CELL + (sub.sy + 0.5) * SUB_SIZE
            if (Math.abs(px - sx) < half + SUB_SIZE / 2 - 0.05
              && Math.abs(pz - sz) < half + SUB_SIZE / 2 - 0.05) return false
          }
        } else if (cell.type === 'S' || cell.type === 'W' || cell.type === 'E') {
          return false
        }
      }
    }
    // Tank-vs-tank — REFERENCE compare so we always skip ourselves.
    // Threshold = full TANK_SIZE so meshes never overlap visually (was 0.9
    // which let them clip slightly — visible mesh overlap).
    for (const t of allTanks()) {
      if (t === selfTank) continue
      if (!t.alive) continue
      const dx = px - t.pos.x, dz = pz - t.pos.z
      if (Math.abs(dx) < TANK_SIZE && Math.abs(dz) < TANK_SIZE) return false
    }
    return true
  }

  function allTanks() {
    return [player, ...enemies]
  }

  // ───────────────────────────────────────────────────────────────────────────
  // BULLETS
  // ───────────────────────────────────────────────────────────────────────────
  /** @type {Array<{pos:THREE.Vector3, vel:THREE.Vector3, owner:any, mesh:THREE.Mesh, alive:boolean, power:number}>} */
  const bullets = []
  const bulletPlayerMat = new THREE.MeshBasicMaterial({ color: C.bulletPlayer })
  const bulletEnemyMat = new THREE.MeshBasicMaterial({ color: C.bulletEnemy })
  function spawnBullet(owner) {
    if (!owner.alive) return false
    if (owner === player) {
      if (player.bulletsActive >= player.maxBullets) return false
      if (!player.fireCD.trigger()) return false   // trigger() returns false if still cooling
      player.bulletsActive += 1
    } else {
      if (owner.bulletsActive >= 1) return false
      owner.bulletsActive += 1
    }
    const mat = owner === player ? bulletPlayerMat : bulletEnemyMat
    const mesh = new THREE.Mesh(BULLET_GEO, mat)
    // Orient bullet along direction (cylinder default = up Y)
    const dir = owner.dir
    if (dir.dz !== 0) mesh.rotation.x = Math.PI / 2
    if (dir.dx !== 0) mesh.rotation.z = Math.PI / 2
    // Start position: tank center + barrel forward offset
    const startX = owner.pos.x + dir.dx * (TANK_HALF + 0.1)
    const startZ = owner.pos.z + dir.dz * (TANK_HALF + 0.1)
    mesh.position.set(startX, 0.7, startZ)
    scene.add(mesh)
    const bspeed = owner === player ? (player.powerLevel >= 2 ? BULLET_SPEED * 1.4 : BULLET_SPEED)
                                    : BULLET_SPEED * 0.7
    bullets.push({
      pos: new THREE.Vector3(startX, 0.7, startZ),
      vel: new THREE.Vector3(dir.dx * bspeed, 0, dir.dz * bspeed),
      owner,
      mesh,
      alive: true,
      power: owner === player ? player.powerLevel : 1,
    })
    return true
  }

  function bulletDestroy(b, hitX = null, hitZ = null) {
    if (!b.alive) return
    b.alive = false
    scene.remove(b.mesh)
    if (b.owner === player) player.bulletsActive = Math.max(0, player.bulletsActive - 1)
    else if (b.owner.alive) b.owner.bulletsActive = Math.max(0, b.owner.bulletsActive - 1)
    // Hit spark
    fxPS.burst({
      position: { x: hitX ?? b.pos.x, y: 0.7, z: hitZ ?? b.pos.z },
      count: 6, speed: [3, 6], lifetime: [0.15, 0.3],
      sizeOverLife: [1.0, 0],
      color: [0xfff5a0, 0xffffff], gravity: 0, spread: Math.PI,
    })
  }

  function updateBullets(dt) {
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i]
      if (!b.alive) { bullets.splice(i, 1); continue }
      b.pos.addScaledVector(b.vel, dt)
      b.mesh.position.copy(b.pos)
      // Out of bounds
      if (b.pos.x < 0 || b.pos.x > MAP_W || b.pos.z < 0 || b.pos.z > MAP_H) {
        bulletDestroy(b)
        bullets.splice(i, 1)
        continue
      }
      // Hit tanks
      let hitTank = null
      for (const t of allTanks()) {
        if (!t.alive || t === b.owner) continue
        // Enemy bullets don't hit other enemies (classic Battle City)
        if (b.owner !== player && t !== player) continue
        const dx = Math.abs(b.pos.x - t.pos.x), dz = Math.abs(b.pos.z - t.pos.z)
        if (dx < TANK_HALF * 0.9 && dz < TANK_HALF * 0.9) { hitTank = t; break }
      }
      if (hitTank) {
        damageTank(hitTank, b)
        bulletDestroy(b, hitTank.pos.x, hitTank.pos.z)
        bullets.splice(i, 1)
        continue
      }
      // Hit eagle
      if (eagle.alive) {
        const ec = eagle.cell.center
        if (Math.abs(b.pos.x - ec.x) < CELL / 2 && Math.abs(b.pos.z - ec.z) < CELL / 2) {
          killEagle()
          bulletDestroy(b, ec.x, ec.z)
          bullets.splice(i, 1)
          continue
        }
      }
      // Hit grid cell
      const cx = Math.floor(b.pos.x / CELL)
      const cz = Math.floor(b.pos.z / CELL)
      const cell = cells.get(cellKey(cx, cz))
      if (cell) {
        if (cell.type === 'B') {
          // Find which sub-cell the bullet is in
          const localX = b.pos.x - cx * CELL  // 0..CELL
          const localZ = b.pos.z - cz * CELL
          const sx = localX < SUB_SIZE ? 0 : 1
          const sy = localZ < SUB_SIZE ? 0 : 1
          let destroyed = false
          for (const sub of cell.subs) {
            if (sub.alive && sub.sx === sx && sub.sy === sy) {
              sub.alive = false
              brickGroup.remove(sub.mesh)
              destroyed = true
              // Brick chunk burst
              fxPS.burst({
                position: { x: sub.mesh.position.x, y: 0.5, z: sub.mesh.position.z },
                count: 10, speed: [2, 5], lifetime: [0.3, 0.7],
                sizeOverLife: [1.3, 0.4],
                color: [C.brick, C.brickShade, 0x6a1c0e], gravity: -8, spread: Math.PI,
              })
              // Leave a small rubble patch on the ground (permanent)
              const rubble = new THREE.Mesh(
                new THREE.CircleGeometry(0.42, 10),
                new THREE.MeshBasicMaterial({ color: 0x4a1a0e, transparent: true, opacity: 0.55, depthWrite: false }),
              )
              rubble.rotation.x = -Math.PI / 2
              rubble.position.set(sub.mesh.position.x, 0.02, sub.mesh.position.z)
              scene.add(rubble)
              break
            }
          }
          if (destroyed || cell.subs.every(s => !s.alive)) {
            bulletDestroy(b, b.pos.x, b.pos.z)
            bullets.splice(i, 1)
            continue
          }
        } else if (cell.type === 'S') {
          // Only level-4 player bullet destroys steel
          if (b.owner === player && b.power >= 4) {
            steelGroup.remove(cell.mesh)
            cells.delete(cellKey(cx, cz))
            fxPS.burst({
              position: { x: cell.mesh.position.x, y: 0.5, z: cell.mesh.position.z },
              count: 14, speed: [3, 6], lifetime: [0.4, 0.7],
              sizeOverLife: [1.4, 0.4],
              color: [C.steel, C.steelHi, 0xffffff], gravity: -8, spread: Math.PI,
            })
            shake.add({ amplitude: 0.18, frequency: 26, duration: 0.18 })
          }
          bulletDestroy(b, b.pos.x, b.pos.z)
          bullets.splice(i, 1)
          continue
        }
        // Water + grass = bullet passes through
      }
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // ENEMIES
  // ───────────────────────────────────────────────────────────────────────────
  /** @type {Array<{id:number,type:string,pos:THREE.Vector3,dir:{dx:number,dz:number},
   *               mesh:THREE.Group,hp:number,alive:boolean,fireTimer:number,
   *               changeDirTimer:number,bulletsActive:number,speed:number,
   *               flashing:boolean,spawnT:number,invuln:number}>} */
  const enemies = []
  let enemyIdCounter = 1
  let enemiesSpawned = 0
  let enemiesKilled = 0
  let spawnTimer = 1.0

  function tankColor(type) {
    return { basic: C.enemyBasic, fast: C.enemyFast, power: C.enemyPower, heavy: C.enemyHeavy }[type]
  }
  function trackColor(type) {
    return { basic: 0x6a6a72, fast: 0xa84a18, power: 0x8888a0, heavy: 0xa07810 }[type]
  }

  function spawnEnemy() {
    if (enemiesSpawned >= TOTAL_ENEMIES) return
    if (enemies.filter(e => e.alive).length >= MAX_ENEMIES_ALIVE) return
    // Pick a spawn point that's not occupied by player or other tanks
    const usable = enemySpawnPoints.filter(sp => {
      for (const t of allTanks()) {
        if (!t.alive) continue
        if (Math.abs(t.pos.x - sp.center.x) < CELL && Math.abs(t.pos.z - sp.center.z) < CELL) return false
      }
      return true
    })
    if (usable.length === 0) return
    const sp = usable[Math.floor(Math.random() * usable.length)]
    // Pick type with progression (later enemies harder)
    const idx = enemiesSpawned
    const types = ['basic', 'basic', 'fast', 'basic', 'power', 'basic', 'fast', 'power',
                   'basic', 'heavy', 'fast', 'power', 'fast', 'heavy', 'power', 'fast',
                   'heavy', 'power', 'heavy', 'heavy']
    const type = types[idx] || 'basic'
    const flashing = (idx === 3 || idx === 9 || idx === 15)  // pick-up dropper
    const e = {
      id: enemyIdCounter++,
      type,
      pos: sp.center.clone(),
      dir: { dx: 0, dz: 1 },
      mesh: buildTank(tankColor(type), trackColor(type), flashing ? 0xff5050 : 0xfff5d8),
      hp: ENEMY_HP[type],
      alive: true,
      fireTimer: 1.5 + Math.random() * 2,
      changeDirTimer: 0,
      bulletsActive: 0,
      speed: ENEMY_SPEED[type],
      flashing,
      spawnT: 0,            // 0..0.8 = appearing animation
      invuln: 0.8,
    }
    e.mesh.position.copy(e.pos)
    e.mesh.rotation.y = 0   // facing +z initially (down)
    scene.add(e.mesh)
    enemies.push(e)
    enemiesSpawned += 1
    // Spawn ring effect
    fxPS.burst({
      position: { x: sp.center.x, y: 0.5, z: sp.center.z },
      count: 14, speed: [2, 4], lifetime: [0.4, 0.7],
      sizeOverLife: [1.3, 0],
      color: [0xffffff, 0xffe860], gravity: 0, spread: Math.PI,
    })
  }

  function damageTank(t, b) {
    if (t === player) {
      if (player.invuln > 0) return
      playerDie()
      return
    }
    // Enemy
    if (t.invuln > 0) return
    t.hp -= b.power >= 2 ? 2 : 1
    flash.flashMesh(t.mesh, { color: 0xffffff, duration: 0.15, intensity: 1.2 })
    if (t.hp <= 0) killEnemy(t)
  }

  function bigExplosion(x, z, scale = 1) {
    // Core radial burst — bright fast fragments
    fxPS.burst({
      position: { x, y: 0.7, z },
      count: Math.floor(28 * scale), speed: [4, 9], lifetime: [0.35, 0.7],
      sizeOverLife: [1.5 * scale, 0.2],
      color: [0xfff5a0, 0xff8030, 0xffffff],
      gravity: -4, spread: Math.PI,
    })
    // Secondary slow fireball — orange/red
    fxPS.burst({
      position: { x, y: 0.9, z },
      count: Math.floor(20 * scale), speed: [1.5, 3.5], lifetime: [0.5, 1.0],
      sizeOverLife: [2.2 * scale, 0.4],
      color: [0xff5018, 0xa83018, 0xff8030],
      gravity: -1, spread: Math.PI,
    })
    // Smoke ring — gray, longer lived, low velocity
    fxPS.burst({
      position: { x, y: 0.5, z },
      count: Math.floor(16 * scale), speed: [1, 2.5], lifetime: [0.8, 1.5],
      sizeOverLife: [2.5 * scale, 1.0],
      color: [0x707078, 0x404048, 0x909098],
      gravity: 0.8, spread: Math.PI,
    })
    // Flash light briefly (a quick point light for "boom")
    const flashLight = new THREE.PointLight(0xff8830, 4 * scale, 8 * scale)
    flashLight.position.set(x, 1.2, z)
    scene.add(flashLight)
    let fl = 0
    const flashTick = setInterval(() => {
      fl += 0.05
      flashLight.intensity *= 0.7
      if (fl > 0.3) {
        clearInterval(flashTick)
        scene.remove(flashLight)
      }
    }, 30)
    // Scorch mark on ground — dark circle, fades
    const scorch = new THREE.Mesh(
      new THREE.CircleGeometry(1.2 * scale, 16),
      new THREE.MeshBasicMaterial({ color: 0x0a0a0a, transparent: true, opacity: 0.6, depthWrite: false }),
    )
    scorch.rotation.x = -Math.PI / 2
    scorch.position.set(x, 0.04, z)
    scene.add(scorch)
    // Slow fade — leave for 4 seconds then remove
    setTimeout(() => {
      const fade = setInterval(() => {
        scorch.material.opacity *= 0.85
        if (scorch.material.opacity < 0.05) {
          clearInterval(fade)
          scene.remove(scorch)
          scorch.material.dispose()
          scorch.geometry.dispose()
        }
      }, 50)
    }, 3000)
  }

  function killEnemy(e) {
    if (!e.alive) return
    e.alive = false
    scene.remove(e.mesh)
    enemiesKilled += 1
    score.value += ENEMY_SCORE[e.type]
    // Tank death = big multi-stage boom
    shake.add({ amplitude: 0.28, frequency: 22, duration: 0.32 })
    bigExplosion(e.pos.x, e.pos.z, 1.0)
    if (e.flashing) spawnPickup(e.pos)
    // Win check
    if (enemiesKilled >= TOTAL_ENEMIES) playerWin()
  }

  function killEagle() {
    if (!eagle.alive) return
    eagle.alive = false
    eagle.dyingT = 0
    shake.add({ amplitude: 0.55, frequency: 18, duration: 0.7 })
    bigExplosion(eagle.cell.center.x, eagle.cell.center.z, 1.8)
    playerLose('eagle')
  }

  // Enemy AI — move in direction; at intersections, randomly change
  function updateEnemies(dt) {
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i]
      if (!e.alive) { enemies.splice(i, 1); continue }
      e.spawnT += dt
      if (e.invuln > 0) {
        e.invuln -= dt
        e.mesh.visible = Math.floor(runTime * 14) % 2 === 0
      } else {
        e.mesh.visible = true
      }
      e.changeDirTimer -= dt
      // If currently can't move forward, change direction
      const nextX = e.pos.x + e.dir.dx * e.speed * dt
      const nextZ = e.pos.z + e.dir.dz * e.speed * dt
      const canMove = tankCanOccupy(nextX, nextZ, TANK_HALF, e)
      if (!canMove || e.changeDirTimer <= 0) {
        // Choose new direction
        const candidates = [
          { dx: 0, dz: -1 }, { dx: 0, dz: 1 }, { dx: -1, dz: 0 }, { dx: 1, dz: 0 },
        ]
        // 60% chance: aim toward player or eagle
        if (Math.random() < 0.6) {
          const target = (Math.random() < 0.55 && player.alive) ? player.pos : eagle.cell.center
          const dx = target.x - e.pos.x, dz = target.z - e.pos.z
          // Prefer axis with larger gap
          const aimDir = Math.abs(dx) > Math.abs(dz)
            ? { dx: Math.sign(dx) || 1, dz: 0 }
            : { dx: 0, dz: Math.sign(dz) || 1 }
          // Insert at front
          candidates.unshift(aimDir)
        } else {
          // Shuffle
          candidates.sort(() => Math.random() - 0.5)
        }
        for (const c of candidates) {
          const tx = e.pos.x + c.dx * 0.5, tz = e.pos.z + c.dz * 0.5
          if (tankCanOccupy(tx, tz, TANK_HALF, e)) {
            e.dir = c
            break
          }
        }
        e.changeDirTimer = 1.5 + Math.random() * 2.0
      } else {
        e.pos.x = nextX
        e.pos.z = nextZ
        e.mesh.position.copy(e.pos)
      }
      // Face direction
      e.mesh.rotation.y = dirAngle(e.dir)
      // Fire timer
      e.fireTimer -= dt
      if (e.fireTimer <= 0) {
        spawnBullet(e)
        e.fireTimer = ENEMY_FIRE_CD[0] + Math.random() * (ENEMY_FIRE_CD[1] - ENEMY_FIRE_CD[0])
      }
      // Flashing tank visual cue
      if (e.flashing) {
        const f = Math.sin(runTime * 8) > 0
        e.mesh.userData.turret.children[0].material = f
          ? new THREE.MeshLambertMaterial({ color: 0xff5050 })
          : new THREE.MeshLambertMaterial({ color: tankColor(e.type) })
      }
    }
  }
  function dirAngle(dir) {
    // Mesh barrel built at local +z. mesh.rotation.y = θ rotates +z to
    // (sin θ, 0, cos θ). So to make barrel point world +x we need θ = +π/2,
    // not -π/2. Previously had sign flipped on x → tanks faced backward
    // sideways (visible in 3rd/1st person; hidden in top-down).
    if (dir.dz === 1) return 0
    if (dir.dz === -1) return Math.PI
    if (dir.dx === 1) return Math.PI / 2
    if (dir.dx === -1) return -Math.PI / 2
    return 0
  }
  /** Shortest signed-angle delta from a → b, in [-π, π]. */
  function angleDelta(a, b) {
    let d = (b - a) % (Math.PI * 2)
    if (d > Math.PI) d -= Math.PI * 2
    if (d < -Math.PI) d += Math.PI * 2
    return d
  }

  // ───────────────────────────────────────────────────────────────────────────
  // PICKUPS (spawn from flashing enemies)
  // ───────────────────────────────────────────────────────────────────────────
  /** @type {Array<{type:string,pos:THREE.Vector3,mesh:THREE.Group,alive:boolean,bob:number}>} */
  const pickups = []
  const PICKUP_TYPES = ['star', 'shovel', 'grenade', 'life', 'helmet']
  function buildPickup(type) {
    const g = new THREE.Group()
    const base = new THREE.Mesh(PICKUP_BASE_GEO, pickupBaseMat)
    g.add(base)
    let icon
    if (type === 'star') {
      // 5-point star via small spheres in ring
      icon = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.32, 0),
        new THREE.MeshLambertMaterial({ color: C.pickup }),
      )
      icon.position.y = 0.32
    } else if (type === 'shovel') {
      // Shovel = small spade (cone on stick)
      icon = new THREE.Group()
      const head = new THREE.Mesh(
        new THREE.BoxGeometry(0.32, 0.08, 0.22),
        new THREE.MeshLambertMaterial({ color: 0xa8a8b0 }),
      )
      head.position.y = 0.5
      const stick = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 0.45, 6),
        new THREE.MeshLambertMaterial({ color: 0x6a3a1a }),
      )
      stick.position.y = 0.28
      icon.add(head, stick)
    } else if (type === 'grenade') {
      icon = new THREE.Mesh(
        new THREE.SphereGeometry(0.26, 12, 10),
        new THREE.MeshLambertMaterial({ color: 0x303030 }),
      )
      const fuse = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.035, 0.18, 5),
        new THREE.MeshLambertMaterial({ color: 0x8a6010 }),
      )
      fuse.position.y = 0.2
      icon.add(fuse)
      icon.position.y = 0.4
    } else if (type === 'life') {
      // Tiny tank silhouette
      icon = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, 0.18, 0.32),
        new THREE.MeshLambertMaterial({ color: C.player }),
      )
      icon.position.y = 0.35
      const barrel = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.06, 0.32),
        new THREE.MeshLambertMaterial({ color: C.playerTrack }),
      )
      barrel.position.z = 0.3
      icon.add(barrel)
    } else if (type === 'helmet') {
      icon = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshLambertMaterial({ color: 0x68a8ff }),
      )
      icon.position.y = 0.35
    }
    if (icon) g.add(icon)
    return g
  }

  function spawnPickup(pos) {
    const type = PICKUP_TYPES[Math.floor(Math.random() * PICKUP_TYPES.length)]
    // Random valid cell
    let cx = Math.floor(Math.random() * GRID_W)
    let cz = Math.floor(Math.random() * (GRID_H - 1))
    // try a few times
    for (let tries = 0; tries < 20; tries++) {
      const cell = cells.get(cellKey(cx, cz))
      if (!cell || cell.type === 'G') break
      cx = Math.floor(Math.random() * GRID_W)
      cz = Math.floor(Math.random() * (GRID_H - 1))
    }
    const center = cellCenter(cx, cz)
    const mesh = buildPickup(type)
    mesh.position.copy(center)
    scene.add(mesh)
    pickups.push({ type, pos: center, mesh, alive: true, bob: 0 })
  }

  function applyPickup(p) {
    if (p.type === 'star') {
      player.powerLevel = Math.min(4, player.powerLevel + 1)
      if (player.powerLevel >= 3) player.maxBullets = 2
      score.value += 500
    } else if (p.type === 'shovel') {
      // Replace eagle perimeter with steel for 20s
      fortifyEagle(20)
    } else if (p.type === 'grenade') {
      // Kill all visible enemies instantly
      for (const e of enemies) if (e.alive) killEnemy(e)
    } else if (p.type === 'life') {
      player.lives += 1
    } else if (p.type === 'helmet') {
      player.invuln = 10
    }
    flash.flashMesh(player.mesh, { color: 0xffffff, duration: 0.2, intensity: 1.5 })
  }

  function updatePickups(dt) {
    for (let i = pickups.length - 1; i >= 0; i--) {
      const p = pickups[i]
      if (!p.alive) { scene.remove(p.mesh); pickups.splice(i, 1); continue }
      p.bob += dt
      p.mesh.position.y = Math.sin(p.bob * 2.5) * 0.15
      p.mesh.rotation.y += dt * 1.5
      if (player.alive) {
        const dx = player.pos.x - p.pos.x, dz = player.pos.z - p.pos.z
        if (dx * dx + dz * dz < 1.0 * 1.0) {
          applyPickup(p)
          p.alive = false
        }
      }
    }
  }

  // Shovel: replace bricks around eagle with steel temporarily
  let fortifyTimer = 0
  const eaglePerimeter = []   // remember which cells were bricks (to restore)
  function fortifyEagle(seconds) {
    fortifyTimer = seconds
    const c = eagle.cell
    const around = [
      [c.cx - 1, c.cz], [c.cx + 1, c.cz], [c.cx, c.cz - 1],
      [c.cx - 1, c.cz - 1], [c.cx + 1, c.cz - 1],
    ]
    for (const [acx, acz] of around) {
      const cell = cells.get(cellKey(acx, acz))
      if (!cell) {
        // Add fresh steel here
        const center = cellCenter(acx, acz)
        const m = new THREE.Mesh(STEEL_GEO, steelMat)
        m.position.set(center.x, 0.55, center.z)
        steelGroup.add(m)
        cells.set(cellKey(acx, acz), { type: 'S', mesh: m, _fortify: true, cx: acx, cz: acz })
        eaglePerimeter.push({ cx: acx, cz: acz, wasNone: true })
      } else if (cell.type === 'B') {
        // Hide bricks, add steel
        for (const sub of cell.subs) if (sub.alive) brickGroup.remove(sub.mesh)
        const center = cellCenter(acx, acz)
        const m = new THREE.Mesh(STEEL_GEO, steelMat)
        m.position.set(center.x, 0.55, center.z)
        steelGroup.add(m)
        cells.set(cellKey(acx, acz), { type: 'S', mesh: m, _fortify: true, _wasBrick: cell, cx: acx, cz: acz })
        eaglePerimeter.push({ cx: acx, cz: acz, wasBrick: cell })
      }
    }
  }
  function expireFortify() {
    for (const ep of eaglePerimeter) {
      const cell = cells.get(cellKey(ep.cx, ep.cz))
      if (cell && cell._fortify) {
        steelGroup.remove(cell.mesh)
        if (ep.wasBrick) {
          // Restore brick (alive sub-cells only)
          for (const sub of ep.wasBrick.subs) {
            if (sub.alive) brickGroup.add(sub.mesh)
          }
          cells.set(cellKey(ep.cx, ep.cz), ep.wasBrick)
        } else {
          cells.delete(cellKey(ep.cx, ep.cz))
        }
      }
    }
    eaglePerimeter.length = 0
  }

  // ───────────────────────────────────────────────────────────────────────────
  // PLAYER UPDATE
  // ───────────────────────────────────────────────────────────────────────────
  function updatePlayer(dt) {
    if (!player.alive || gameState !== 'play') return
    player.fireCD.tick(dt)
    if (player.invuln > 0) {
      player.invuln -= dt
      player.mesh.visible = Math.floor(runTime * 14) % 2 === 0
    } else {
      player.mesh.visible = true
    }
    // Movement input — strict 4-dir
    let dir = null
    if (keys.up) dir = { dx: 0, dz: -1 }
    else if (keys.down) dir = { dx: 0, dz: 1 }
    else if (keys.left) dir = { dx: -1, dz: 0 }
    else if (keys.right) dir = { dx: 1, dz: 0 }

    if (dir) {
      player.dir = dir
      // Snap-to-lane: when on x-axis, slide z toward lane center (vice versa).
      // CRUCIAL: also runs collision check, else the snap can push tank
      // sideways through enemies / walls (was the visible-clip bug).
      if (dir.dz !== 0) {
        const cx = Math.floor(player.pos.x / CELL)
        const targetX = cx * CELL + CELL / 2
        const trySnapX = player.pos.x + (targetX - player.pos.x) * Math.min(1, 18 * dt)
        if (tankCanOccupy(trySnapX, player.pos.z, TANK_HALF, player)) {
          player.pos.x = trySnapX
        }
      } else {
        const cz = Math.floor(player.pos.z / CELL)
        const targetZ = cz * CELL + CELL / 2
        const trySnapZ = player.pos.z + (targetZ - player.pos.z) * Math.min(1, 18 * dt)
        if (tankCanOccupy(player.pos.x, trySnapZ, TANK_HALF, player)) {
          player.pos.z = trySnapZ
        }
      }
      // Then forward movement — also collision-checked
      const nextX = player.pos.x + dir.dx * player.speed * dt
      const nextZ = player.pos.z + dir.dz * player.speed * dt
      if (tankCanOccupy(nextX, nextZ, TANK_HALF, player)) {
        player.pos.x = nextX
        player.pos.z = nextZ
      }
    }
    player.mesh.position.copy(player.pos)
    player.mesh.rotation.y = dirAngle(player.dir)
    // Fire
    if (keys.fire) spawnBullet(player)
  }

  function playerDie() {
    if (!player.alive) return
    player.lives -= 1
    shake.add({ amplitude: 0.36, frequency: 22, duration: 0.45 })
    bigExplosion(player.pos.x, player.pos.z, 1.2)
    if (player.lives <= 0) {
      player.alive = false
      playerLose('lives')
    } else {
      // Respawn at spawn cell
      setTimeout(() => {
        if (gameState !== 'play') return
        player.pos.copy(playerSpawn.center)
        player.dir = { dx: 0, dz: -1 }
        player.invuln = RESPAWN_INVULN
        player.mesh.position.copy(player.pos)
        player.mesh.rotation.y = Math.PI
        player.alive = true
        player.powerLevel = Math.max(1, player.powerLevel - 1)   // lose 1 power on death
      }, 800)
      player.alive = false
      setTimeout(() => { if (!player.alive) player.alive = true }, 900)
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // CAMERA — TOP / ISO / CLOSE  (all fixed-orientation, only POSITION follows)
  // ───────────────────────────────────────────────────────────────────────────
  // No rotation-with-tank. World compass is always the same — the camera just
  // floats above or near the tank from a constant angle. Tank still snap-turns
  // on its own axis (you see the turret swing) but the world doesn't spin.
  function updateCamera(dt) {
    const mode = currentCamMode()
    // Edge clamp so close cameras don't fly outside the map and reveal void
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
    if (mode === 'top') {
      // Whole-board static view
      camTargetPos.set(MAP_W / 2, 52, MAP_H / 2 + 22)
      camTargetLook.set(MAP_W / 2, 0, MAP_H / 2)
    } else if (mode === 'iso') {
      // Isometric-ish: fixed SE angle, follows player position.
      // Offset (-13, +22, +13) gives ~50° pitch + 45° yaw classic iso feel.
      const px = clamp(player.pos.x, 6, MAP_W - 6)
      const pz = clamp(player.pos.z, 6, MAP_H - 6)
      camTargetPos.set(px - 13, 22, pz + 13)
      camTargetLook.set(px, 0.3, pz)
    } else if (mode === 'close') {
      // Close 3/4: shoulder-of-sky view, follows player tight.
      // Tank moving the screen feels good; world doesn't rotate.
      const px = clamp(player.pos.x, 3, MAP_W - 3)
      const pz = clamp(player.pos.z, 3, MAP_H - 3)
      camTargetPos.set(px - 5.5, 7.5, pz + 5.5)
      camTargetLook.set(px, 0.6, pz)
    }
    // Position smoothing — slower for TOP (essentially static), snappier
    // for follow modes so the tank stays well-framed.
    const k = mode === 'top' ? 6 : 10
    const a = Math.min(1, k * dt)
    camera.position.lerp(camTargetPos, a)
    camCurLook.lerp(camTargetLook, a)
    camera.lookAt(camCurLook)
  }

  function playerWin() {
    if (gameState !== 'play') return
    gameState = 'won'
    showWinPanel()
  }
  function playerLose(reason) {
    if (gameState !== 'play') return
    gameState = 'lost'
    setTimeout(() => showLossPanel(reason), 800)
  }

  // ───────────────────────────────────────────────────────────────────────────
  // RESOURCES + FEEL PRIMITIVES
  // ───────────────────────────────────────────────────────────────────────────
  const shake = new ScreenShake(camera)
  const flash = new Flash()
  const watch = new Stopwatch()
  const fxPS = new ParticleSystem(scene, { maxParticles: 300 })
  const score = { value: 0 }

  // ───────────────────────────────────────────────────────────────────────────
  // GAME STATE + LOOP CONTROL
  // ───────────────────────────────────────────────────────────────────────────
  let gameState = 'play'  // play | won | lost

  // ───────────────────────────────────────────────────────────────────────────
  // HUD
  // ───────────────────────────────────────────────────────────────────────────
  const hud = new HUDLayer(container)
  const titleText = hud.text({
    top: 18, left: 24,
    font: '700 22px ui-monospace, monospace',
    color: '#fff8e0', shadow: '0 2px 8px rgba(0,0,0,0.5)',
  })
  titleText.set('BATTLE CITY')
  const subText = hud.text({
    top: 46, left: 24,
    font: '500 11px ui-monospace, monospace',
    color: 'rgba(255,255,255,0.65)',
  })
  subText.set('BATTLE CITY · STAGE 1')
  const livesText = hud.text({
    top: 18, right: 24,
    font: '700 18px ui-monospace, monospace',
    color: '#7ce088', shadow: '0 2px 8px rgba(0,0,0,0.5)',
  })
  const enemiesText = hud.text({
    top: 44, right: 24,
    font: '600 14px ui-monospace, monospace',
    color: '#ff8a50', shadow: '0 2px 6px rgba(0,0,0,0.5)',
  })
  const scoreText = hud.text({
    top: 18, hCenter: true,
    font: '700 20px ui-monospace, monospace',
    color: '#ffd84a', shadow: '0 2px 8px rgba(0,0,0,0.5)',
  })
  const hintText = hud.text({
    bottom: 24, hCenter: true,
    font: '500 12px ui-monospace, monospace',
    color: 'rgba(255,255,255,0.7)',
    shadow: '0 2px 6px rgba(0,0,0,0.4)',
  })
  hintText.set('↑↓←→ move · SPACE fire · V camera (TOP / ISO / CLOSE)')

  // Camera mode badge (lower-left)
  const cameraModeLabel = document.createElement('div')
  cameraModeLabel.style.cssText = `
    position: absolute; bottom: 56px; left: 24px;
    padding: 6px 12px; border-radius: 4px;
    background: rgba(0,0,0,0.55); color: #fff8e0;
    font: 700 12px ui-monospace, monospace;
    border: 1px solid rgba(255,255,255,0.3);
    pointer-events: none;
  `
  cameraModeLabel.textContent = '📷 TOP (Tactical) — V to cycle'
  container.appendChild(cameraModeLabel)

  // Power-level indicator (color squares)
  const powerWrap = document.createElement('div')
  powerWrap.style.cssText = `
    position: absolute; top: 70px; left: 24px;
    display: flex; gap: 4px; pointer-events: none;
  `
  const powerSquares = []
  for (let i = 0; i < 4; i++) {
    const sq = document.createElement('div')
    sq.style.cssText = `
      width: 14px; height: 14px; border-radius: 2px;
      background: rgba(255,255,255,0.18);
      border: 1px solid rgba(255,255,255,0.4);
    `
    powerWrap.appendChild(sq)
    powerSquares.push(sq)
  }
  container.appendChild(powerWrap)
  function updatePower() {
    for (let i = 0; i < 4; i++) {
      powerSquares[i].style.background = i < player.powerLevel ? '#ffd84a' : 'rgba(255,255,255,0.18)'
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // PANELS
  // ───────────────────────────────────────────────────────────────────────────
  let activePanel = null
  function showWinPanel() {
    activePanel = new GlassPanel({
      title: '🏆 STAGE CLEAR',
      subtitle: `Score ${score.value} · Time ${fmtTime(watch.elapsed)}`,
      body: 'All 20 enemy tanks destroyed. The eagle survived.',
      buttons: [{ label: 'Play again (R)', onClick: () => restart() }],
    })
    container.appendChild(activePanel.el)
  }
  function showLossPanel(reason) {
    const body = reason === 'eagle'
      ? 'The eagle was destroyed. Grab a shovel pickup next time to fortify it with steel.'
      : 'Out of lives. Watch out — ramming an enemy tank costs a life too.'
    activePanel = new GlassPanel({
      title: '💀 GAME OVER',
      subtitle: `Score ${score.value} · ${enemiesKilled}/${TOTAL_ENEMIES} tanks killed`,
      body,
      buttons: [{ label: 'Try again (R)', onClick: () => restart() }],
    })
    container.appendChild(activePanel.el)
  }
  function restart() {
    if (activePanel) { activePanel.dispose(); activePanel = null }
    // Restore all bricks
    for (const cell of cells.values()) {
      if (cell.type === 'B') {
        for (const sub of cell.subs) {
          if (!sub.alive) { brickGroup.add(sub.mesh); sub.alive = true }
        }
      }
    }
    // Remove all bullets, enemies, pickups
    for (const b of bullets) scene.remove(b.mesh)
    bullets.length = 0
    for (const e of enemies) scene.remove(e.mesh)
    enemies.length = 0
    for (const p of pickups) scene.remove(p.mesh)
    pickups.length = 0
    // Restore eagle
    eagle.alive = true
    eagle.dyingT = 0
    buildEagle()
    if (!eagle.mesh.parent) scene.add(eagle.mesh)
    // Expire fortify
    expireFortify()
    fortifyTimer = 0
    // Reset player
    player.pos.copy(playerSpawn.center)
    player.dir = { dx: 0, dz: -1 }
    player.alive = true
    player.lives = PLAYER_LIVES
    player.invuln = RESPAWN_INVULN
    player.powerLevel = 1
    player.maxBullets = 1
    player.bulletsActive = 0
    player.mesh.visible = true
    player.mesh.position.copy(player.pos)
    player.mesh.rotation.y = Math.PI
    // Reset state
    score.value = 0
    enemiesSpawned = 0
    enemiesKilled = 0
    spawnTimer = 1.0
    watch.reset(); watch.start()
    shake.clear(); flash.clear(); fxPS.clear()
    gameState = 'play'
  }

  // ───────────────────────────────────────────────────────────────────────────
  // LOOP
  // ───────────────────────────────────────────────────────────────────────────
  const clock = new THREE.Clock()
  let raf = 0, paused = false, disposed = false, runTime = 0
  watch.start()

  function loop() {
    if (disposed) return
    raf = requestAnimationFrame(loop)
    if (paused) return
    const dt = Math.min(clock.getDelta(), 1 / 30)
    runTime += dt

    flash.tick(dt)
    fxPS.tick(dt)

    if (gameState === 'play') {
      watch.tick(dt)
      // Spawn enemies on a timer
      spawnTimer -= dt
      if (spawnTimer <= 0) {
        spawnEnemy()
        spawnTimer = ENEMY_SPAWN_INTERVAL
      }
      updatePlayer(dt)
      updateEnemies(dt)
      updateBullets(dt)
      updatePickups(dt)
      // Fortify timer
      if (fortifyTimer > 0) {
        fortifyTimer -= dt
        if (fortifyTimer <= 0) expireFortify()
      }
    }
    if (!eagle.alive && eagle.mesh.parent) {
      eagle.dyingT += dt
      eagle.mesh.rotation.z = Math.min(Math.PI / 2, eagle.dyingT * 1.5)
      eagle.mesh.position.y = Math.max(-2, -eagle.dyingT * 1.5)
    }

    updateCamera(dt)
    shake.tick(dt)

    // HUD
    livesText.set(`× ${player.lives}`)
    enemiesText.set(`Enemies ${TOTAL_ENEMIES - enemiesKilled}`)
    scoreText.set(String(score.value).padStart(6, '0'))
    updatePower()

    fx.render(dt)
  }
  loop()

  // ───────────────────────────────────────────────────────────────────────────
  // RESIZE · DISPOSE
  // ───────────────────────────────────────────────────────────────────────────
  function resize(w, h) {
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h)
    fx.resize(w, h)
  }
  function dispose() {
    if (disposed) return
    disposed = true
    cancelAnimationFrame(raf)
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('keyup', onKeyUp)
    fxPS.dispose()
    if (powerWrap.parentNode === container) container.removeChild(powerWrap)
    if (cameraModeLabel.parentNode === container) container.removeChild(cameraModeLabel)
    hud.dispose()
    if (activePanel) activePanel.dispose()
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
    play: () => { paused = false },
    pause: () => { paused = true },
    seekTo: () => {},
    getProgress: () => enemiesKilled / TOTAL_ENEMIES,
    renderFrame: () => fx.render(0),
    hasCinematic: false,
    duration: 0,
  }
}

function fmtTime(s) {
  const m = Math.floor(s / 60), ss = Math.floor(s % 60)
  return `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
}
