/**
 * The explorable island portal — a cozy low-poly 3D world where a mascot ("Mo")
 * roams between game kiosks. Adapted into the React app from the world.html
 * UI/UX reference: same feel (warm flat-shaded island, drifting clouds, kiosks
 * with covers + gems + labels, proximity prompts), rebuilt against three 0.183
 * ES modules and driven by the game registry.
 *
 * Pure code — kiosk covers are generated on a <canvas>, no external art assets.
 *
 * createIsland(container, opts) returns a handle the React HUD drives:
 *   - opts.onApproach(game|null) fires when the nearest kiosk changes
 *   - opts.onEnter(game)          fires on Space / click-to-open
 *   - handle.setKey / triggerEnter let the on-screen d-pad feed input
 */
import * as THREE from 'three'
import type { GameMeta } from '../games/registry'

export interface IslandOptions {
  games: GameMeta[]
  /** Nearest kiosk changed (null when none is in range). */
  onApproach: (game: GameMeta | null) => void
  /** Player pressed Space / clicked a kiosk. */
  onEnter: (game: GameMeta) => void
  /** Player position to spawn at (island coords), defaults to [0, 4]. */
  spawn?: [number, number]
}

export interface IslandHandle {
  setKey: (dir: 'up' | 'down' | 'left' | 'right', pressed: boolean) => void
  triggerEnter: () => void
  /** Current mascot position (island coords) — for persistence. */
  getPosition: () => [number, number]
  dispose: () => void
}

type Dir = 'up' | 'down' | 'left' | 'right'

const GROUND_R = 33
const CAM_OFF = new THREE.Vector3(0, 16, 18.5)
const ACTIVE_R = 5.4
const SPEED = 10

function getQuality(container: HTMLElement) {
  const cores = navigator.hardwareConcurrency || 4
  const area = (container.clientWidth || innerWidth) * (container.clientHeight || innerHeight)
  const low = cores <= 4 || area > 1_800_000
  const crisp = !low && (devicePixelRatio >= 1.5 || area <= 1_100_000)
  return {
    low,
    pixelRatio: Math.min(devicePixelRatio, low ? 1.25 : crisp ? 1.75 : 1.5),
    islandSegments: low ? 80 : 128,
    patchSegments: low ? 18 : 32,
    shadowSize: low ? 1024 : 2048,
    trees: low ? 18 : 26,
    rocks: low ? 9 : 14,
    flowers: low ? 28 : 46,
    tufts: low ? 70 : 120,
    clouds: low ? 3 : 5,
  }
}

function hexToInt(hex: string): number {
  return parseInt(hex.replace('#', ''), 16)
}

function flatMat(color: number, opts: THREE.MeshStandardMaterialParameters = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0, flatShading: true, ...opts })
}

function smoothMat(color: number, opts: THREE.MeshStandardMaterialParameters = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.78, metalness: 0, flatShading: false, ...opts })
}

/** Cozy procedural kiosk cover (no image assets). */
function coverTexture(name: string, accent: number, cat: string): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 320
  const x = c.getContext('2d')!
  const a = '#' + accent.toString(16).padStart(6, '0')

  // accent wash
  const g = x.createLinearGradient(0, 0, 0, 320)
  g.addColorStop(0, a)
  g.addColorStop(1, shade(accent, -0.28))
  x.fillStyle = g
  x.fillRect(0, 0, 512, 320)

  // soft light blob
  const rg = x.createRadialGradient(150, 80, 10, 150, 80, 320)
  rg.addColorStop(0, 'rgba(255,255,255,.35)')
  rg.addColorStop(1, 'rgba(255,255,255,0)')
  x.fillStyle = rg
  x.fillRect(0, 0, 512, 320)

  // big initial
  x.fillStyle = 'rgba(255,255,255,.92)'
  x.textAlign = 'center'
  x.textBaseline = 'middle'
  x.font = '700 180px Fredoka, sans-serif'
  x.fillText(name.charAt(0).toUpperCase(), 256, 150)

  // category chip
  x.font = '700 22px "Space Mono", monospace'
  x.fillStyle = 'rgba(255,255,255,.85)'
  x.fillText(cat.toUpperCase(), 256, 280)

  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  return t
}

function shade(hex: number, amt: number): string {
  const c = new THREE.Color(hex)
  const f = amt < 0 ? 1 + amt : 1
  const add = amt < 0 ? 0 : amt
  c.r = c.r * f + add
  c.g = c.g * f + add
  c.b = c.b * f + add
  return '#' + c.getHexString()
}

/** Outlined sprite label, billboard-style. */
function labelSprite(text: string): THREE.Sprite {
  const c = document.createElement('canvas')
  c.width = 1024
  c.height = 256
  const x = c.getContext('2d')!
  x.font = '600 116px Fredoka, sans-serif'
  x.textAlign = 'center'
  x.textBaseline = 'middle'
  x.lineWidth = 20
  x.lineJoin = 'round'
  x.strokeStyle = 'rgba(40,55,38,.92)'
  x.strokeText(text, 512, 132)
  x.fillStyle = '#fff8ee'
  x.fillText(text, 512, 132)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, depthTest: false }))
  s.scale.set(4.4, 1.1, 1)
  return s
}

interface Mascot {
  group: THREE.Group
  body: THREE.Mesh
  eyes: THREE.Group[]
  arms: THREE.Mesh[]
  feet: THREE.Mesh[]
  antGem: THREE.Mesh
  glow: THREE.Mesh
  cap: THREE.Group
}

function createMascot(): Mascot {
  const m = new THREE.Group()
  const coral = smoothMat(0xf28b78, { roughness: 0.54 })
  const coralDark = smoothMat(0xcf6a58, { roughness: 0.6 })
  const cream = smoothMat(0xfff1dc, { roughness: 0.7 })
  const teal = smoothMat(0x75c4d6, { roughness: 0.56 })
  const violet = smoothMat(0xb9a3f3, { roughness: 0.62 })
  const amber = smoothMat(0xf7c86b, { roughness: 0.48, emissive: 0xf7c86b, emissiveIntensity: 0.08 })

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.82, 48, 32), coral)
  body.scale.set(1, 1.06, 0.96)
  body.position.y = 0.1
  body.castShadow = true
  m.add(body)

  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.5, 36, 24), cream)
  belly.scale.set(0.9, 1.0, 0.48)
  belly.position.set(0, -0.02, 0.53)
  m.add(belly)

  const eyeWhiteGeo = new THREE.SphereGeometry(0.2, 28, 20)
  const eyeWhiteMat = smoothMat(0xffffff, { roughness: 0.35 })
  const pupilGeo = new THREE.SphereGeometry(0.115, 22, 16)
  const pupilMat = smoothMat(0x2c2a33, { roughness: 0.32 })
  const eyes: THREE.Group[] = []
  ;[-0.27, 0.27].forEach(sx => {
    const eg = new THREE.Group()
    eg.position.set(sx, 0.42, 0.66)
    const w = new THREE.Mesh(eyeWhiteGeo, eyeWhiteMat)
    w.scale.set(1, 1, 0.6)
    eg.add(w)
    const p = new THREE.Mesh(pupilGeo, pupilMat)
    p.position.set(0, -0.01, 0.15)
    eg.add(p)
    const hl = new THREE.Mesh(new THREE.SphereGeometry(0.038, 12, 10), smoothMat(0xffffff, { roughness: 0.2 }))
    hl.position.set(0.05, 0.05, 0.21)
    eg.add(hl)
    eg.rotation.y = -sx * 0.6
    m.add(eg)
    eyes.push(eg)
  })

  ;[-0.5, 0.5].forEach(sx => {
    const ch = new THREE.Mesh(new THREE.CircleGeometry(0.1, 24), smoothMat(0xff9fbc, { roughness: 1, side: THREE.DoubleSide }))
    ch.position.set(sx, 0.28, 0.62)
    ch.rotation.y = sx * 0.5
    m.add(ch)
  })

  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.03, 12, 28, Math.PI), smoothMat(0x5a3244, { roughness: 0.68 }))
  smile.position.set(0, 0.2, 0.75)
  smile.rotation.set(0, 0, Math.PI)
  m.add(smile)

  const arms: THREE.Mesh[] = []
  ;[-0.86, 0.86].forEach(sx => {
    const arm = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 16), teal)
    arm.scale.set(0.72, 1.06, 0.72)
    arm.position.set(sx, 0.05, 0.05)
    arm.castShadow = true
    m.add(arm)
    arms.push(arm)
  })

  const feet: THREE.Mesh[] = []
  ;[-0.32, 0.32].forEach(sx => {
    const ft = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 16), teal)
    ft.scale.set(1, 0.7, 1.25)
    ft.position.set(sx, -0.78, 0.08)
    ft.castShadow = true
    m.add(ft)
    feet.push(ft)
  })

  const cap = new THREE.Group()
  cap.position.set(0, 0.9, 0.07)
  const crown = new THREE.Mesh(new THREE.SphereGeometry(0.48, 32, 18, 0, Math.PI * 2, 0, Math.PI / 2), violet)
  crown.scale.set(1.05, 0.74, 0.78)
  crown.castShadow = true
  cap.add(crown)
  const brim = new THREE.Mesh(new THREE.SphereGeometry(0.28, 28, 16), violet)
  brim.scale.set(1.15, 0.18, 0.52)
  brim.position.set(0, -0.04, 0.42)
  brim.rotation.x = -0.12
  brim.castShadow = true
  cap.add(brim)
  const badge = new THREE.Mesh(new THREE.SphereGeometry(0.085, 16, 12), amber)
  badge.position.set(0.31, 0.07, 0.18)
  badge.rotation.z = 0.32
  cap.add(badge)
  m.add(cap)

  const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.4, 12), coralDark)
  stalk.position.set(0, 1.18, -0.06)
  stalk.rotation.x = -0.18
  m.add(stalk)
  const antGem = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 18, 14),
    smoothMat(0xf7c86b, { emissive: 0xf7c86b, emissiveIntensity: 0.34, roughness: 0.32, metalness: 0.06 }),
  )
  antGem.position.set(0, 1.52, -0.12)
  antGem.castShadow = true
  m.add(antGem)

  const glow = new THREE.Mesh(new THREE.CircleGeometry(0.78, 48), new THREE.MeshBasicMaterial({ color: 0xffddb0, transparent: true, opacity: 0.34 }))
  glow.rotation.x = -Math.PI / 2
  glow.position.y = -1.0
  m.add(glow)

  return { group: m, body, eyes, arms, feet, antGem, glow, cap }
}

interface Kiosk {
  game: GameMeta
  grp: THREE.Group
  bb: THREE.Group
  gem: THREE.Mesh
  ring: THREE.Mesh
  baseY: number
  phase: number
}

export function createIsland(container: HTMLElement, opts: IslandOptions): IslandHandle {
  // The reference world.html runs three r128, where material hex colors are NOT
  // linearized (legacy color management). three 0.183 linearizes by default,
  // which darkens/saturates the same palette. Disabling ColorManagement makes
  // the verbatim r128 palette render with the same light, pastel look.
  // (This is a global static — only a full reload re-applies it.)
  THREE.ColorManagement.enabled = false

  const quality = getQuality(container)
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'default' })
  renderer.setPixelRatio(quality.pixelRatio)
  renderer.setSize(container.clientWidth || innerWidth, container.clientHeight || innerHeight)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 0.94
  container.appendChild(renderer.domElement)
  renderer.domElement.style.display = 'block'

  const scene = new THREE.Scene()

  // gradient sky
  {
    const c = document.createElement('canvas')
    c.width = 4
    c.height = 256
    const x = c.getContext('2d')!
    const g = x.createLinearGradient(0, 0, 0, 256)
    g.addColorStop(0, '#8fd6dc')
    g.addColorStop(0.42, '#b8e6de')
    g.addColorStop(0.74, '#ffe2bd')
    g.addColorStop(1, '#ffd4ad')
    x.fillStyle = g
    x.fillRect(0, 0, 4, 256)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    scene.background = t
  }
  // light minty haze
  scene.fog = new THREE.Fog(0xffd8ad, 62, 112)

  const camera = new THREE.PerspectiveCamera(40, container.clientWidth / container.clientHeight || 1, 0.1, 200)

  // lights — brighter fill for an airy, light look (with a little sun for depth)
  scene.add(new THREE.HemisphereLight(0xd6f6ef, 0xd0b178, 0.44))
  scene.add(new THREE.AmbientLight(0xfff7e8, 0.16))
  const sun = new THREE.DirectionalLight(0xffefd0, 1.28)
  sun.position.set(-22, 30, 16)
  sun.castShadow = true
  sun.shadow.mapSize.set(quality.shadowSize, quality.shadowSize)
  sun.shadow.camera.near = 1
  sun.shadow.camera.far = 95
  const S = 40
  const shadowCam = sun.shadow.camera as THREE.OrthographicCamera
  shadowCam.left = -S
  shadowCam.right = S
  shadowCam.top = S
  shadowCam.bottom = -S
  sun.shadow.bias = -0.00035
  sun.shadow.normalBias = 0.06
  scene.add(sun)

  const dummy = new THREE.Object3D()
  const disposables: Array<{ dispose: () => void }> = []
  const track = <T extends { dispose?: () => void }>(o: T): T => {
    if (o && typeof (o as any).dispose === 'function') disposables.push(o as any)
    return o
  }

  // island
  const island = new THREE.Group()
  const topGeo = track(new THREE.CylinderGeometry(GROUND_R, GROUND_R - 0.6, 1.4, quality.islandSegments))
  const islandTop = new THREE.Mesh(topGeo, track(flatMat(0x8ccc8a)))
  islandTop.position.y = -0.7
  islandTop.receiveShadow = true
  island.add(islandTop)
  const dirt1 = new THREE.Mesh(track(new THREE.CylinderGeometry(GROUND_R - 0.6, GROUND_R - 2.6, 2.4, quality.islandSegments)), track(flatMat(0xd99a57)))
  dirt1.position.y = -2.1
  island.add(dirt1)
  const dirt2 = new THREE.Mesh(track(new THREE.CylinderGeometry(GROUND_R - 2.6, GROUND_R - 6.5, 5.5, quality.islandSegments)), track(flatMat(0x9a7047)))
  dirt2.position.y = -5.0
  island.add(dirt2)
  const patchGeo = track(new THREE.CircleGeometry(1, quality.patchSegments))
  const patchColors = [0xa5d98e, 0x86ce8f, 0xc6df84]
  for (let i = 0; i < (quality.low ? 6 : 9); i++) {
    const p = new THREE.Mesh(patchGeo, track(flatMat(patchColors[i % 3], { roughness: 1 })))
    p.scale.setScalar(4 + Math.random() * 6)
    p.rotation.x = -Math.PI / 2
    const a = Math.random() * 6.28
    const d = 7 + Math.random() * 19
    p.position.set(Math.cos(a) * d, 0.02 + i * 0.002, Math.sin(a) * d)
    p.receiveShadow = true
    island.add(p)
  }
  scene.add(island)

  const sea = new THREE.Mesh(track(new THREE.CircleGeometry(120, quality.low ? 40 : 60)), track(new THREE.MeshStandardMaterial({ color: 0x7fcfdb, roughness: 0.55, metalness: 0 })))
  sea.rotation.x = -Math.PI / 2
  sea.position.y = -6.4
  scene.add(sea)

  // placement masks around kiosks
  const blocked = opts.games.map(g => new THREE.Vector2(g.pos[0], g.pos[1]))
  const clearOf = (x: number, z: number, min: number) =>
    blocked.every(b => b.distanceTo(new THREE.Vector2(x, z)) > min) && Math.hypot(x, z) > 5

  // trees (instanced)
  const treeData: Array<{ x: number; z: number; s: number; rot: number; blossom: boolean }> = []
  {
    let n = 0
    let tries = 0
    while (n < quality.trees && tries < 600) {
      tries++
      const a = Math.random() * 6.28
      const d = 6 + Math.random() * 25
      const x = Math.cos(a) * d
      const z = Math.sin(a) * d
      if (!clearOf(x, z, 4.6)) continue
      treeData.push({ x, z, s: 0.78 + Math.random() * 0.7, rot: Math.random() * 6.28, blossom: Math.random() < 0.28 })
      n++
    }
  }
  const trunkMesh = new THREE.InstancedMesh(track(new THREE.CylinderGeometry(0.18, 0.26, 1.0, quality.low ? 8 : 10)), track(flatMat(0x9c6a40)), treeData.length)
  const canopyLowMesh = new THREE.InstancedMesh(track(new THREE.ConeGeometry(1.25, 1.7, quality.low ? 9 : 12)), track(flatMat(0xffffff)), treeData.length)
  const canopyTopMesh = new THREE.InstancedMesh(track(new THREE.ConeGeometry(0.95, 1.6, quality.low ? 9 : 12)), track(flatMat(0xffffff)), treeData.length)
  ;[trunkMesh, canopyLowMesh, canopyTopMesh].forEach(m => {
    m.castShadow = true
    m.receiveShadow = true
  })
  const greenSet = [new THREE.Color(0x89c27d), new THREE.Color(0x91d0a4), new THREE.Color(0x79ad7b), new THREE.Color(0xb2d67c)]
  const blossomSet = [new THREE.Color(0xf4a7c7), new THREE.Color(0xf6bfd8), new THREE.Color(0xf7c86b)]
  treeData.forEach((t, i) => {
    dummy.position.set(t.x, 0.5 * t.s, t.z)
    dummy.rotation.set(0, t.rot, 0)
    dummy.scale.setScalar(t.s)
    dummy.updateMatrix()
    trunkMesh.setMatrixAt(i, dummy.matrix)
    dummy.position.set(t.x, 1.45 * t.s, t.z)
    dummy.scale.setScalar(t.s)
    dummy.updateMatrix()
    canopyLowMesh.setMatrixAt(i, dummy.matrix)
    dummy.position.set(t.x, 2.35 * t.s, t.z)
    dummy.scale.setScalar(t.s)
    dummy.updateMatrix()
    canopyTopMesh.setMatrixAt(i, dummy.matrix)
    const col = t.blossom ? blossomSet[i % blossomSet.length] : greenSet[i % greenSet.length]
    canopyLowMesh.setColorAt(i, col.clone().multiplyScalar(0.9))
    canopyTopMesh.setColorAt(i, col)
  })
  scene.add(trunkMesh, canopyLowMesh, canopyTopMesh)

  // rocks (instanced)
  const rockData: Array<{ x: number; z: number; s: number; rx: number; ry: number }> = []
  {
    let n = 0
    let tries = 0
    while (n < quality.rocks && tries < 400) {
      tries++
      const a = Math.random() * 6.28
      const d = 9 + Math.random() * 21
      const x = Math.cos(a) * d
      const z = Math.sin(a) * d
      if (!clearOf(x, z, 4)) continue
      rockData.push({ x, z, s: 0.4 + Math.random() * 0.5, rx: Math.random() * 6, ry: Math.random() * 6 })
      n++
    }
  }
  const rockMesh = new THREE.InstancedMesh(track(new THREE.DodecahedronGeometry(1, quality.low ? 0 : 1)), track(flatMat(0x9aa1a6)), rockData.length)
  rockMesh.castShadow = true
  rockMesh.receiveShadow = true
  rockData.forEach((r, i) => {
    dummy.position.set(r.x, 0.25 * r.s, r.z)
    dummy.rotation.set(r.rx, r.ry, 0)
    dummy.scale.setScalar(r.s)
    dummy.updateMatrix()
    rockMesh.setMatrixAt(i, dummy.matrix)
  })
  scene.add(rockMesh)

  // flowers (instanced)
  const flowerData: Array<{ x: number; z: number; s: number; rot: number; c: number }> = []
  {
    let n = 0
    let tries = 0
    const palette = [0xf28b78, 0xf7c86b, 0x75c4d6, 0xb9a3f3, 0xfff3e0]
    while (n < quality.flowers && tries < 700) {
      tries++
      const a = Math.random() * 6.28
      const d = 6 + Math.random() * 24
      const x = Math.cos(a) * d
      const z = Math.sin(a) * d
      if (!clearOf(x, z, 3.2)) continue
      flowerData.push({ x, z, s: 0.5 + Math.random() * 0.6, rot: Math.random() * 6.28, c: palette[(Math.random() * 5) | 0] })
      n++
    }
  }
  const petalMesh = new THREE.InstancedMesh(track(new THREE.CylinderGeometry(0.34, 0.34, 0.07, quality.low ? 8 : 10)), track(flatMat(0xffffff, { roughness: 1 })), flowerData.length)
  const coreMesh = new THREE.InstancedMesh(track(new THREE.SphereGeometry(0.12, quality.low ? 10 : 14, quality.low ? 8 : 10)), track(flatMat(0xffd23f, { roughness: 0.8 })), flowerData.length)
  petalMesh.receiveShadow = true
  flowerData.forEach((f, i) => {
    dummy.position.set(f.x, 0.12 * f.s, f.z)
    dummy.rotation.set(0, f.rot, 0)
    dummy.scale.setScalar(f.s)
    dummy.updateMatrix()
    petalMesh.setMatrixAt(i, dummy.matrix)
    petalMesh.setColorAt(i, new THREE.Color(f.c))
    dummy.position.set(f.x, 0.2 * f.s, f.z)
    dummy.scale.setScalar(f.s)
    dummy.updateMatrix()
    coreMesh.setMatrixAt(i, dummy.matrix)
  })
  scene.add(petalMesh, coreMesh)

  // grass tufts (instanced)
  const tuftData: Array<{ x: number; z: number; s: number; rot: number }> = []
  {
    let n = 0
    let tries = 0
    while (n < quality.tufts && tries < 1200) {
      tries++
      const a = Math.random() * 6.28
      const d = 5 + Math.random() * 26
      const x = Math.cos(a) * d
      const z = Math.sin(a) * d
      if (Math.hypot(x, z) > GROUND_R - 2) continue
      tuftData.push({ x, z, s: 0.5 + Math.random() * 0.8, rot: Math.random() * 6.28 })
      n++
    }
  }
  const tuftMesh = new THREE.InstancedMesh(track(new THREE.ConeGeometry(0.16, 0.6, 4)), track(flatMat(0x80c982, { roughness: 1 })), tuftData.length)
  tuftData.forEach((g, i) => {
    dummy.position.set(g.x, 0.28 * g.s, g.z)
    dummy.rotation.set(0, g.rot, 0)
    dummy.scale.set(g.s, g.s, g.s)
    dummy.updateMatrix()
    tuftMesh.setMatrixAt(i, dummy.matrix)
  })
  scene.add(tuftMesh)

  // clouds
  const cloudMat = track(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0, flatShading: false }))
  const cloudGeo = track(new THREE.SphereGeometry(1, quality.low ? 10 : 14, quality.low ? 8 : 10))
  const clouds: Array<{ group: THREE.Group; spd: number }> = []
  for (let i = 0; i < quality.clouds; i++) {
    const cl = new THREE.Group()
    const a = Math.random() * 6.28
    const d = 20 + Math.random() * 22
    cl.position.set(Math.cos(a) * d, 17 + Math.random() * 7, Math.sin(a) * d)
    const n = 3 + ((Math.random() * 2) | 0)
    for (let j = 0; j < n; j++) {
      const puff = new THREE.Mesh(cloudGeo, cloudMat)
      puff.position.set((j - n / 2) * 1.5, Math.random() * 0.5, Math.random() * 1.2 - 0.6)
      puff.scale.set(1.6 + Math.random(), 1.1, 1.4)
      cl.add(puff)
    }
    clouds.push({ group: cl, spd: 0.2 + Math.random() * 0.25 })
    scene.add(cl)
  }

  // kiosks (registry-driven)
  const texLoader = new THREE.TextureLoader()
  const kiosks: Kiosk[] = []
  const frameMat = track(flatMat(0xfff8ee, { roughness: 0.8 }))
  const padMat = track(flatMat(0xe9c79a))
  const padTopMat = track(flatMat(0xf3ddbb))
  const poleMat = track(flatMat(0xd6ad7e))
  const sharedFrameGeo = track(new THREE.BoxGeometry(3.7, 2.45, 0.2))
  const sharedCoverGeo = track(new THREE.PlaneGeometry(3.35, 2.1))
  const gemGeo = track(new THREE.OctahedronGeometry(0.4, quality.low ? 0 : 1))
  const ringGeo = track(new THREE.RingGeometry(2.0, 2.42, quality.low ? 48 : 72))

  opts.games.forEach(g => {
    const accent = hexToInt(g.accent)
    const grp = new THREE.Group()
    grp.position.set(g.pos[0], 0, g.pos[1])

    const base = new THREE.Mesh(track(new THREE.CylinderGeometry(1.55, 1.85, 0.5, quality.low ? 24 : 36)), padMat)
    base.position.y = 0.25
    base.castShadow = true
    base.receiveShadow = true
    grp.add(base)
    const base2 = new THREE.Mesh(track(new THREE.CylinderGeometry(1.15, 1.55, 0.42, quality.low ? 24 : 36)), padTopMat)
    base2.position.y = 0.62
    base2.castShadow = true
    base2.receiveShadow = true
    grp.add(base2)
    const pole = new THREE.Mesh(track(new THREE.CylinderGeometry(0.14, 0.14, 2.0, quality.low ? 12 : 16)), poleMat)
    pole.position.y = 1.62
    pole.castShadow = true
    grp.add(pole)

    const bb = new THREE.Group()
    bb.position.y = 3.5
    bb.rotation.x = -0.14
    const frame = new THREE.Mesh(sharedFrameGeo, frameMat)
    frame.castShadow = true
    frame.receiveShadow = true
    bb.add(frame)
    const accentTrim = new THREE.Mesh(track(new THREE.BoxGeometry(3.7, 0.16, 0.22)), track(flatMat(accent)))
    accentTrim.position.y = -1.16
    bb.add(accentTrim)
    const coverMat = track(new THREE.MeshStandardMaterial({ roughness: 0.65, metalness: 0, color: 0xffffff }))
    if (g.cover) {
      // real auto-generated screenshot (games/covers/<id>.jpg)
      texLoader.load(g.cover, (t: THREE.Texture) => {
        t.colorSpace = THREE.SRGBColorSpace
        t.anisotropy = 4
        coverMat.map = t
        coverMat.needsUpdate = true
        track(t)
      })
    } else {
      coverMat.map = track(coverTexture(g.title, accent, g.cat))
    }
    const cover = new THREE.Mesh(sharedCoverGeo, coverMat)
    cover.position.z = 0.11
    bb.add(cover)
    grp.add(bb)

    const gem = new THREE.Mesh(
      gemGeo,
      track(new THREE.MeshStandardMaterial({ color: accent, roughness: 0.28, metalness: 0.12, emissive: accent, emissiveIntensity: 0.28, flatShading: false })),
    )
    gem.position.y = 5.45
    gem.castShadow = true
    grp.add(gem)

    const label = labelSprite(g.title)
    label.position.y = 6.4
    grp.add(label)
    if (label.material.map) track(label.material.map)
    track(label.material)

    const ring = new THREE.Mesh(ringGeo, track(new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0, side: THREE.DoubleSide })))
    ring.rotation.x = -Math.PI / 2
    ring.position.y = 0.07
    grp.add(ring)

    scene.add(grp)
    kiosks.push({ game: g, grp, bb, gem, ring, baseY: 3.5, phase: Math.random() * 6.28 })
  })

  // mascot
  const mo = createMascot()
  const buddy = mo.group
  const spawn = opts.spawn ?? [0, 4]
  buddy.position.set(spawn[0], 1.3, spawn[1])
  scene.add(buddy)
  camera.position.set(spawn[0] + CAM_OFF.x, CAM_OFF.y, spawn[1] + CAM_OFF.z)
  camera.lookAt(buddy.position)

  // input
  const keys: Record<Dir, boolean> = { up: false, down: false, left: false, right: false }
  let active: Kiosk | null = null

  const triggerEnter = () => {
    if (active) opts.onEnter(active.game)
  }

  // click-to-open
  const ray = new THREE.Raycaster()
  const mouse = new THREE.Vector2()
  const onPointerDown = (e: PointerEvent) => {
    const rect = renderer.domElement.getBoundingClientRect()
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
    ray.setFromCamera(mouse, camera)
    const hits = ray.intersectObjects(kiosks.map(k => k.bb), true)
    if (hits.length) {
      let o: THREE.Object3D | null = hits[0].object
      const k = kiosks.find(k => k.bb === o || k.bb === o?.parent)
      if (k) opts.onEnter(k.game)
    }
  }
  renderer.domElement.addEventListener('pointerdown', onPointerDown)

  // loop
  const clock = new THREE.Clock()
  const want = new THREE.Vector3()
  let blinkT = 2 + Math.random() * 3
  let raf = 0
  let disposed = false

  const tick = () => {
    if (disposed) return
    const dt = Math.min(clock.getDelta(), 0.05)
    const t = clock.elapsedTime

    let vx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0)
    let vz = (keys.down ? 1 : 0) - (keys.up ? 1 : 0)
    const moving = vx || vz
    if (moving) {
      const l = Math.hypot(vx, vz)
      vx /= l
      vz /= l
      buddy.position.x += vx * SPEED * dt
      buddy.position.z += vz * SPEED * dt
      const r = Math.hypot(buddy.position.x, buddy.position.z)
      if (r > GROUND_R - 2) {
        buddy.position.x *= (GROUND_R - 2) / r
        buddy.position.z *= (GROUND_R - 2) / r
      }
      const yaw = Math.atan2(vx, vz)
      let d = yaw - buddy.rotation.y
      d = Math.atan2(Math.sin(d), Math.cos(d))
      buddy.rotation.y += d * Math.min(1, dt * 12)
    }

    buddy.position.y = 1.3 + Math.sin(t * 2.4) * 0.08 + (moving ? Math.abs(Math.sin(t * 8)) * 0.04 : 0)
    mo.body.rotation.x = moving ? -0.2 + Math.sin(t * 8) * 0.04 : Math.sin(t * 1.8) * 0.03
    mo.body.rotation.z = moving ? -vx * 0.14 : Math.sin(t * 1.4) * 0.025
    ;(mo.glow.material as THREE.MeshBasicMaterial).opacity = 0.32 + (moving ? 0.22 : 0) + Math.sin(t * 9) * 0.06
    mo.antGem.rotation.y += dt * 3.2
    mo.antGem.position.y = 1.52 + Math.sin(t * 3) * 0.04
    mo.cap.rotation.z = Math.sin(t * 2.2) * 0.04 + (moving ? -vx * 0.08 : 0)
    mo.feet.forEach((f, i) => {
      f.position.y = -0.78 + Math.sin(t * 8 + i * Math.PI) * (moving ? 0.1 : 0.03)
      f.position.z = 0.08 + Math.cos(t * 8 + i * Math.PI) * (moving ? 0.08 : 0.02)
    })
    mo.arms.forEach((a, i) => {
      a.rotation.z = Math.sin(t * 8 + i * Math.PI) * (moving ? 0.58 : 0.2)
      a.position.y = 0.05 + Math.cos(t * 6 + i) * (moving ? 0.06 : 0.025)
    })
    blinkT -= dt
    let ey = 1
    if (blinkT < 0.14) ey = Math.max(0.1, Math.abs(blinkT - 0.07) / 0.07)
    if (blinkT < 0) blinkT = 2.4 + Math.random() * 3.4
    mo.eyes.forEach(e => (e.scale.y = ey))

    want.set(buddy.position.x + CAM_OFF.x, CAM_OFF.y, buddy.position.z + CAM_OFF.z)
    camera.position.lerp(want, 1 - Math.pow(0.0015, dt))
    camera.lookAt(buddy.position.x, 1.5, buddy.position.z)

    for (const cl of clouds) {
      cl.group.position.x += cl.spd * dt
      if (cl.group.position.x > 60) cl.group.position.x = -60
    }

    let nearest: Kiosk | null = null
    let nd = ACTIVE_R
    for (const k of kiosks) {
      k.gem.rotation.y += dt * 1.5
      k.gem.position.y = 5.45 + Math.sin(t * 2 + k.phase) * 0.16
      const dist = Math.hypot(buddy.position.x - k.grp.position.x, buddy.position.z - k.grp.position.z)
      if (dist < nd) {
        nd = dist
        nearest = k
      }
    }
    if (nearest !== active) {
      active = nearest
      opts.onApproach(active ? active.game : null)
    }
    for (const k of kiosks) {
      const on = k === active
      const ts = on ? 1.12 : 1
      k.bb.scale.x += (ts - k.bb.scale.x) * 0.18
      k.bb.scale.y = k.bb.scale.x
      const ringMat = k.ring.material as THREE.MeshBasicMaterial
      ringMat.opacity += ((on ? 0.5 + Math.sin(t * 4) * 0.14 : 0) - ringMat.opacity) * 0.2
      k.ring.scale.setScalar(on ? 1 + Math.sin(t * 4) * 0.04 : 1)
      k.bb.position.y += ((on ? k.baseY + 0.16 + Math.sin(t * 2.2) * 0.05 : k.baseY) - k.bb.position.y) * 0.18
    }

    renderer.render(scene, camera)
    raf = requestAnimationFrame(tick)
  }

  // keyboard
  const KEYMAP: Record<string, Dir> = {
    ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
    ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  }
  const onKeyDown = (e: KeyboardEvent) => {
    if (KEYMAP[e.code]) {
      keys[KEYMAP[e.code]] = true
      e.preventDefault()
    }
    if (e.code === 'Space' || e.code === 'Enter') {
      triggerEnter()
      e.preventDefault()
    }
  }
  const onKeyUp = (e: KeyboardEvent) => {
    if (KEYMAP[e.code]) keys[KEYMAP[e.code]] = false
  }
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)

  // resize
  const ro = new ResizeObserver(() => {
    const w = container.clientWidth || innerWidth
    const h = container.clientHeight || innerHeight
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h)
  })
  ro.observe(container)

  // render once, then loop (avoids a blank first frame)
  renderer.render(scene, camera)
  raf = requestAnimationFrame(tick)

  return {
    setKey: (dir, pressed) => {
      keys[dir] = pressed
    },
    triggerEnter,
    getPosition: () => [+buddy.position.x.toFixed(1), +buddy.position.z.toFixed(1)],
    dispose: () => {
      disposed = true
      cancelAnimationFrame(raf)
      ro.disconnect()
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      renderer.domElement.removeEventListener('pointerdown', onPointerDown)
      for (const d of disposables) {
        try {
          d.dispose()
        } catch {
          /* ignore */
        }
      }
      const bg = scene.background as THREE.Texture | null
      if (bg && typeof bg.dispose === 'function') bg.dispose()
      renderer.dispose()
      if (renderer.domElement.parentElement === container) container.removeChild(renderer.domElement)
    },
  }
}
