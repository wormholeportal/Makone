/**
 * Neon Labyrinth — First-Person 3D Pac-Man
 *
 * Classic Pac-Man reimagined as a first-person cyberpunk maze experience.
 * Navigate neon corridors, collect glowing dots, avoid ghost entities,
 * and use power pellets to hunt them down.
 *
 * Controls:
 *   W / ArrowUp     move North
 *   S / ArrowDown   move South
 *   A / ArrowLeft   move West
 *   D / ArrowRight  move East
 *   R               restart on death
 *   Esc             menu
 */

import * as THREE from 'three'
import {
  ScreenShake,
  HUDLayer,
  GlassPanel,
  ParticleSystem,
} from 'makone/game'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'

export default async function createWorld(container) {
  const canvasArea = (container.clientWidth || 800) * (container.clientHeight || 600)
  const lowSpec = (navigator.hardwareConcurrency || 4) <= 4 || canvasArea > 1_800_000
  const pixelRatio = Math.min(window.devicePixelRatio, lowSpec ? 1.25 : 1.5)

  // ─── Constants ─────────────────────────────────────────────────────────────
  const CELL = 2
  const WALL_H = 2.8
  const EYE_H = 1.35
  const ROWS = 21, COLS = 21
  const PLAYER_SPEED = 4.0
  const GHOST_SPEED = 3.7
  const SCARED_SPEED = 2.0
  const EATEN_SPEED = 6.0
  const POWER_TIME = 8
  const DIR_N = 0, DIR_E = 1, DIR_S = 2, DIR_W = 3
  const DR = [-1, 0, 1, 0], DC = [0, 1, 0, -1]
  const DIR_ANGLE = [0, -Math.PI / 2, Math.PI, Math.PI / 2]
  const PI = Math.PI, TWO_PI = PI * 2

  // ─── Maze ──────────────────────────────────────────────────────────────────
  const M = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,1,0,1,1,1,0,1,0,1,1,1,0,1,1,1,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,0,1,0,1,1,1,1,1,1,1,0,1,0,1,1,0,1],
    [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],
    [1,1,1,1,0,1,1,1,0,0,1,0,0,1,1,1,0,1,1,1,1],
    [1,1,1,1,0,1,0,0,0,0,0,0,0,0,0,1,0,1,1,1,1],
    [1,1,1,1,0,1,0,1,1,0,0,0,1,1,0,1,0,1,1,1,1],
    [0,0,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,0,0],
    [1,1,1,1,0,1,0,1,1,1,1,1,1,1,0,1,0,1,1,1,1],
    [1,1,1,1,0,1,0,0,0,0,0,0,0,0,0,1,0,1,1,1,1],
    [1,1,1,1,0,1,0,1,1,1,1,1,1,1,0,1,0,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,1,0,1,1,1,0,1,0,1,1,1,0,1,1,1,0,1],
    [1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1],
    [1,1,1,0,1,0,1,0,1,1,1,1,1,0,1,0,1,0,1,1,1],
    [1,0,0,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,0,0,1],
    [1,0,1,1,1,1,1,1,1,0,1,0,1,1,1,1,1,1,1,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  ]

  // Ghost house region (no dots)
  const ghostHouse = new Set()
  for (let r = 7; r <= 11; r++) for (let c = 7; c <= 13; c++) ghostHouse.add(`${r},${c}`)

  // Power pellet positions
  const POWER_POS = [[1,1],[1,19],[19,1],[19,19]]

  function isWall(r, c) {
    if (r < 0 || r >= ROWS) return true
    // Tunnel wrap
    if (c < 0 || c >= COLS) return r !== 9
    return M[r][c] === 1
  }

  function cellX(c) { return c * CELL }
  function cellZ(r) { return r * CELL }

  // ─── Renderer · Scene · Camera ─────────────────────────────────────────────
  const W0 = container.clientWidth || 800, H0 = container.clientHeight || 600

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'default' })
  renderer.setPixelRatio(pixelRatio)
  renderer.setSize(W0, H0)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05
  container.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0xa8d8f0)  // Pokémon sky blue
  scene.fog = new THREE.FogExp2(0xb8def4, 0.005)

  const camera = new THREE.PerspectiveCamera(75, W0 / H0, 0.1, 200)
  camera.position.set(cellX(10), EYE_H, cellZ(15))

  // ─── PostFX ────────────────────────────────────────────────────────────────
  const composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))
  const bloom = new UnrealBloomPass(new THREE.Vector2(W0, H0), lowSpec ? 0.08 : 0.18, 0.4, 0.86)
  composer.addPass(bloom)

  const vignetteShader = {
    uniforms: {
      tDiffuse: { value: null },
      intensity: { value: lowSpec ? 0.16 : 0.25 },
      chromaticAberration: { value: lowSpec ? 0 : 0.003 },
    },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `
      uniform sampler2D tDiffuse;
      uniform float intensity;
      uniform float chromaticAberration;
      varying vec2 vUv;
      void main(){
        vec2 uv=vUv;
        vec2 offset=chromaticAberration*(uv-0.5);
        float r=texture2D(tDiffuse,uv+offset).r;
        float g=texture2D(tDiffuse,uv).g;
        float b=texture2D(tDiffuse,uv-offset).b;
        vec3 col=vec3(r,g,b);
        float d=distance(uv,vec2(0.5));
        col*=1.-intensity*d*d*2.;
        gl_FragColor=vec4(col,1.);
      }`,
  }
  composer.addPass(new ShaderPass(vignetteShader))
  composer.addPass(new OutputPass())

  // ─── Generated Wall Texture ────────────────────────────────────────────────
  function makeWallTexture() {
    const s = 64
    const c = document.createElement('canvas')
    c.width = s; c.height = s
    const g = c.getContext('2d')
    // Base: rich cobalt blue (Squirtle/Snorlax blue)
    g.fillStyle = '#2f6fbb'
    g.fillRect(0, 0, s, s)
    // Lighter inner panel
    g.fillStyle = '#3a7fd0'
    g.fillRect(6, 6, s - 12, s - 12)
    // Outer border (2px): bright cyan-white
    g.strokeStyle = '#88d8ff'
    g.lineWidth = 2
    g.strokeRect(1, 1, s - 2, s - 2)
    // Inner border (1px): soft white
    g.strokeStyle = '#ffffff'
    g.lineWidth = 1
    g.strokeRect(4, 4, s - 8, s - 8)
    // Corner L-brackets: bright white accents
    const cs = 10
    g.fillStyle = '#ccecff'
    ;[[0,0,cs,2],[0,0,2,cs],[s-cs,0,cs,2],[s-2,0,2,cs],
      [0,s-2,cs,2],[0,s-cs,2,cs],[s-cs,s-2,cs,2],[s-2,s-cs,2,cs]
    ].forEach(([x,y,w,h]) => g.fillRect(x,y,w,h))
    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
  }

  function makeWallEmissiveMap() {
    const s = 64
    const c = document.createElement('canvas')
    c.width = s; c.height = s
    const g = c.getContext('2d')
    // Black base (no emission in center)
    g.fillStyle = '#000'
    g.fillRect(0, 0, s, s)
    // Only emit at edges
    g.strokeStyle = '#ffffff'
    g.lineWidth = 2
    g.strokeRect(1, 1, s - 2, s - 2)
    g.lineWidth = 1
    g.strokeRect(4, 4, s - 8, s - 8)
    // Corner accents
    const cs = 10
    g.fillStyle = '#ffffff'
    ;[[0,0,cs,2],[0,0,2,cs],[s-cs,0,cs,2],[s-2,0,2,cs],
      [0,s-2,cs,2],[0,s-cs,2,cs],[s-cs,s-2,cs,2],[s-2,s-cs,2,cs]
    ].forEach(([x,y,w,h]) => g.fillRect(x,y,w,h))
    return new THREE.CanvasTexture(c)
  }

  const wallTex = makeWallTexture()
  const wallEmissiveTex = makeWallEmissiveMap()

  // ─── Lighting ──────────────────────────────────────────────────────────────
  scene.add(new THREE.AmbientLight(0xd0ecff, 1.1))          // sky blue ambient — toned down
  const playerLight = new THREE.PointLight(0xffe88a, 1.0, 14, 2.0)
  scene.add(playerLight)
  scene.add(new THREE.HemisphereLight(0x88ccff, 0xc8a440, 0.6))  // sky / sandy ground

  // ─── Floor (grid shader) ───────────────────────────────────────────────────
  const floorUniforms = { time: { value: 0 } }
  const floorMat = new THREE.ShaderMaterial({
    uniforms: {
      time: floorUniforms.time,
      cellSize: { value: CELL },
    },
    vertexShader: `
      varying vec2 vWorldPos;
      void main(){
        vec4 wPos=modelMatrix*vec4(position,1.);
        vWorldPos=wPos.xz;
        gl_Position=projectionMatrix*viewMatrix*wPos;
      }`,
    fragmentShader: `
      uniform float time, cellSize;
      varying vec2 vWorldPos;
      void main(){
        vec2 uv = vWorldPos / cellSize;
        vec2 grid = abs(fract(uv) - 0.5);
        float line = min(grid.x, grid.y);
        float glow  = smoothstep(0.03, 0.0, line) * 0.6;
        float faint = smoothstep(0.09, 0.02, line) * 0.22;
        // Sandy warm ground base — slightly dimmed so walls contrast well
        vec3 sandBase = vec3(0.78, 0.68, 0.46);
        // Amber/tan grid lines — clearly visible on sand
        vec3 lineCol = mix(vec3(0.55, 0.38, 0.14), vec3(0.72, 0.52, 0.22), faint);
        vec3 col = sandBase + lineCol * (glow + faint);
        gl_FragColor = vec4(col, 1.0);
      }`,
  })
  const floorGeo = new THREE.PlaneGeometry(COLS * CELL + 4, ROWS * CELL + 4)
  const floor = new THREE.Mesh(floorGeo, floorMat)
  floor.rotation.x = -PI / 2
  floor.position.set((COLS - 1) * CELL / 2, 0, (ROWS - 1) * CELL / 2)
  scene.add(floor)

  // ─── Starfield ─────────────────────────────────────────────────────────────
  const starCount = lowSpec ? 90 : 160
  const starGeo = new THREE.BufferGeometry()
  const starPos = new Float32Array(starCount * 3)
  for (let i = 0; i < starCount; i++) {
    starPos[i * 3] = (Math.random() - 0.5) * 100 + (COLS * CELL) / 2
    starPos[i * 3 + 1] = 8 + Math.random() * 40
    starPos[i * 3 + 2] = (Math.random() - 0.5) * 100 + (ROWS * CELL) / 2
  }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3))
  const starMat = new THREE.PointsMaterial({
    color: 0xffffff, size: 0.25, transparent: true, opacity: 0.85,
    blending: THREE.AdditiveBlending, depthWrite: false,
  })
  scene.add(new THREE.Points(starGeo, starMat))

  // ─── Walls (InstancedMesh) ─────────────────────────────────────────────────
  let wallCount = 0
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (M[r][c] === 1) wallCount++

  const wallGeo = new THREE.BoxGeometry(CELL, WALL_H, CELL)
  const wallMat = new THREE.MeshStandardMaterial({
    map: wallTex,
    color: 0x7ab8e8,        // saturated blue tint — keeps cobalt rich, not washed
    roughness: 0.55, metalness: 0.1,
    emissiveMap: wallEmissiveTex,
    emissive: 0x2288cc,     // deeper blue glow
    emissiveIntensity: 0.4,
  })
  const wallMesh = new THREE.InstancedMesh(wallGeo, wallMat, wallCount)
  wallMesh.receiveShadow = true

  // Neon top strips — vibrant cyan glow
  const stripGeo = new THREE.BoxGeometry(CELL * 0.92, 0.08, CELL * 0.92)
  const stripMat = new THREE.MeshStandardMaterial({
    color: 0xffdd22, emissive: 0xffbb00, emissiveIntensity: 0.55,  // Pikachu yellow — controlled glow
    roughness: 0.15, metalness: 0.2,
  })
  const stripMesh = new THREE.InstancedMesh(stripGeo, stripMat, wallCount)

  const tmpM = new THREE.Matrix4()
  let wi = 0
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (M[r][c] === 1) {
        tmpM.makeTranslation(cellX(c), WALL_H / 2, cellZ(r))
        wallMesh.setMatrixAt(wi, tmpM)
        tmpM.makeTranslation(cellX(c), WALL_H + 0.03, cellZ(r))
        stripMesh.setMatrixAt(wi, tmpM)
        wi++
      }
    }
  }
  wallMesh.instanceMatrix.needsUpdate = true
  stripMesh.instanceMatrix.needsUpdate = true

  // Per-zone wall colours (warm pastel quadrants)
  wallMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(wallCount * 3), 3)
  const zoneColors = [
    new THREE.Color(0x88c4ee), // sky blue top-left
    new THREE.Color(0x80ddc8), // mint top-right  (Bulbasaur green tint)
    new THREE.Color(0xa0b8ee), // periwinkle bottom-left
    new THREE.Color(0x88ccdd), // teal bottom-right (Squirtle tint)
  ]
  let wci = 0
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (M[r][c] === 1) {
        const zone = (r < ROWS/2 ? 0 : 2) + (c < COLS/2 ? 0 : 1)
        wallMesh.setColorAt(wci++, zoneColors[zone])
      }
    }
  }
  wallMesh.instanceColor.needsUpdate = true

  scene.add(wallMesh)
  scene.add(stripMesh)

  // Bottom neon strips (base of walls)
  const baseStripGeo = new THREE.BoxGeometry(CELL * 0.96, 0.04, CELL * 0.96)
  const baseStripMat = new THREE.MeshStandardMaterial({
    color: 0xff77bb, emissive: 0xff3388, emissiveIntensity: 0.45,  // Jigglypuff pink
    roughness: 0.15, metalness: 0.2,
  })
  const baseStripMesh = new THREE.InstancedMesh(baseStripGeo, baseStripMat, wallCount)
  wi = 0
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (M[r][c] === 1) {
        tmpM.makeTranslation(cellX(c), 0.02, cellZ(r))
        baseStripMesh.setMatrixAt(wi, tmpM)
        wi++
      }
    }
  }
  baseStripMesh.instanceMatrix.needsUpdate = true
  scene.add(baseStripMesh)

  // ─── Ceiling (covers corridors, encloses the maze) ─────────────────────────
  {
    let corrCount = 0
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (M[r][c] === 0) corrCount++

    const ceilGeo = new THREE.PlaneGeometry(CELL, CELL)
    ceilGeo.rotateX(Math.PI / 2)           // face downward (-Y normal)
    const ceilMat = new THREE.MeshStandardMaterial({
      color: 0xd4eefa, roughness: 0.9, metalness: 0, side: THREE.FrontSide,  // light sky ceiling
    })
    const ceilMesh = new THREE.InstancedMesh(ceilGeo, ceilMat, corrCount)

    const cM = new THREE.Matrix4()
    let ci = 0
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (M[r][c] === 0) {
          cM.makeTranslation(cellX(c), WALL_H - 0.01, cellZ(r))
          ceilMesh.setMatrixAt(ci++, cM)
        }
      }
    }
    ceilMesh.instanceMatrix.needsUpdate = true
    scene.add(ceilMesh)
  }

  // ─── Corridor accent lights (colourful TRON-style ceiling lamps) ───────────
  const accentDefs = [
    { pos: [3,5],   color: 0xff4444, intensity: 1.2 }, // red (Charmander)
    { pos: [3,15],  color: 0xffdd00, intensity: 1.2 }, // yellow (Pikachu)
    { pos: [9,0],   color: 0xff88cc, intensity: 1.1 }, // pink (Jigglypuff)
    { pos: [9,20],  color: 0x44ccee, intensity: 1.1 }, // cyan (Squirtle)
    { pos: [13,5],  color: 0x66cc44, intensity: 1.2 }, // green (Bulbasaur)
    { pos: [13,15], color: 0xff6633, intensity: 1.2 }, // orange (Charmander fire)
    { pos: [17,10], color: 0xaa66ee, intensity: 1.1 }, // purple (Gengar)
    { pos: [1,10],  color: 0xffdd00, intensity: 1.0 }, // yellow
    { pos: [5,10],  color: 0xff4444, intensity: 1.0 }, // red
    { pos: [19,10], color: 0x44ccee, intensity: 1.0 }, // cyan
  ]
  for (const { pos: [r, c], color, intensity } of accentDefs) {
    if (M[r]?.[c] === 0) {
      const al = new THREE.PointLight(color, intensity, 9, 2)
      al.position.set(cellX(c), WALL_H - 0.2, cellZ(r))
      scene.add(al)
      // Small emissive sphere as lamp body
      const lampMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 8, 6),
        new THREE.MeshBasicMaterial({ color })
      )
      lampMesh.position.set(cellX(c), WALL_H - 0.12, cellZ(r))
      scene.add(lampMesh)
    }
  }

  // ─── Dots (InstancedMesh) ──────────────────────────────────────────────────
  const dotPositions = []
  const powerPositions = []
  const powerSet = new Set(POWER_POS.map(p => `${p[0]},${p[1]}`))

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (M[r][c] === 0 && !ghostHouse.has(`${r},${c}`)) {
        if (r === 15 && c === 10) continue // player start
        if (powerSet.has(`${r},${c}`)) {
          powerPositions.push({ r, c, idx: powerPositions.length })
        } else {
          dotPositions.push({ r, c, idx: dotPositions.length, alive: true })
        }
      }
    }
  }

  const dotGeo = new THREE.SphereGeometry(0.20, 10, 8)
  const dotMat = new THREE.MeshStandardMaterial({
    color: 0xe8a200, emissive: 0xc07800, emissiveIntensity: 1.6,  // deep amber, not white-yellow
    roughness: 0.15, metalness: 0.1,
  })
  const dotMesh = new THREE.InstancedMesh(dotGeo, dotMat, dotPositions.length)
  const dotAlive = new Array(dotPositions.length).fill(true)

  for (let i = 0; i < dotPositions.length; i++) {
    const d = dotPositions[i]
    tmpM.makeTranslation(cellX(d.c), 1.0, cellZ(d.r))
    dotMesh.setMatrixAt(i, tmpM)
  }
  dotMesh.instanceMatrix.needsUpdate = true
  scene.add(dotMesh)

  // Build a lookup from (r,c) -> dot index for fast collection
  const dotLookup = new Map()
  for (let i = 0; i < dotPositions.length; i++) {
    dotLookup.set(`${dotPositions[i].r},${dotPositions[i].c}`, i)
  }

  // ─── Power Pellets ─────────────────────────────────────────────────────────
  const powerPellets = []
  const powerLookup = new Map()
  for (let i = 0; i < POWER_POS.length; i++) {
    const [r, c] = POWER_POS[i]
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.30, 20, 14),
      new THREE.MeshStandardMaterial({
        color: 0xff88dd, emissive: 0xff44aa, emissiveIntensity: 2.5,  // vivid Jigglypuff pink
        roughness: 0.05, metalness: 0.1,
      })
    )
    sphere.position.set(cellX(c), 1.0, cellZ(r))
    scene.add(sphere)
    // Outer glow ring
    const ringMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.48, 14, 10),
      new THREE.MeshBasicMaterial({ color: 0xff66cc, transparent: true, opacity: 0.28, side: THREE.BackSide, depthWrite: false })
    )
    sphere.add(ringMesh)

    const light = new THREE.PointLight(0xff66cc, 1.4, 9, 2)
    light.position.copy(sphere.position)
    scene.add(light)

    const pellet = { r, c, sphere, light, alive: true }
    powerPellets.push(pellet)
    powerLookup.set(`${r},${c}`, i)
  }

  // ─── Ghost Construction ────────────────────────────────────────────────────
  function buildGhost(color) {
    const group = new THREE.Group()

    // One shared material for all body parts — easy to colour-swap
    const bodyMat = new THREE.MeshStandardMaterial({
      color, emissive: color, emissiveIntensity: 0.9,
      roughness: 0.35, metalness: 0.05,
    })

    // bodyGroup can be hidden all-at-once for the "eaten" state (eyes-only)
    const bodyGroup = new THREE.Group()
    group.add(bodyGroup)

    // Dome (top half-sphere)
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(0.62, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), bodyMat)
    dome.position.y = 0.28
    bodyGroup.add(dome)

    // Straight sides
    bodyGroup.add(new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.56, 14), bodyMat))

    // 4 wavy bottom bumps
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + Math.PI / 4
      const bump = new THREE.Mesh(
        new THREE.SphereGeometry(0.21, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), bodyMat)
      bump.rotation.x = Math.PI
      bump.position.set(Math.sin(angle) * 0.42, -0.28, Math.cos(angle) * 0.42)
      bodyGroup.add(bump)
    }
    const cap = new THREE.Mesh(new THREE.CircleGeometry(0.62, 14), bodyMat)
    cap.rotation.x = Math.PI / 2; cap.position.y = -0.28
    bodyGroup.add(cap)

    // Aura inside bodyGroup so it hides with the body
    const aura = new THREE.Mesh(
      new THREE.SphereGeometry(0.82, 10, 7),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.18, side: THREE.BackSide, depthWrite: false })
    )
    bodyGroup.add(aura)

    // Eyes attached directly to group so they stay visible when eaten
    const eyeGeo = new THREE.SphereGeometry(0.16, 10, 7)
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff })
    const pupilGeo = new THREE.SphereGeometry(0.09, 8, 5)
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x112244 })
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat)
    leftEye.position.set(-0.20, 0.22, -0.42)
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat)
    rightEye.position.set(0.20, 0.22, -0.42)
    const leftPupil = new THREE.Mesh(pupilGeo, pupilMat)
    leftPupil.position.set(0, 0, -0.08); leftEye.add(leftPupil)
    const rightPupil = new THREE.Mesh(pupilGeo, pupilMat.clone())
    rightPupil.position.set(0, 0, -0.08); rightEye.add(rightPupil)
    group.add(leftEye, rightEye)

    const glow = new THREE.PointLight(color, 1.2, 8, 2)
    group.add(glow)

    group.scale.y = 1.5

    group.userData = { bodyMat, bodyGroup, aura, glow, leftEye, rightEye, leftPupil, rightPupil, baseColor: color }
    return group
  }

  // ─── Ghost AI State ────────────────────────────────────────────────────────
  const GHOST_DEFS = [
    { name: 'Blinky', color: 0xdd2020, startR: 7, startC: 10, exitDelay: 0  },  // red
    { name: 'Pinky',  color: 0xe060a0, startR: 9, startC: 10, exitDelay: 3  },  // pink
    { name: 'Inky',   color: 0x2299cc, startR: 9, startC: 9,  exitDelay: 6  },  // cyan
    { name: 'Clyde',  color: 0xe07020, startR: 9, startC: 11, exitDelay: 9  },  // orange
    { name: 'Sue',    color: 0x8833cc, startR: 7, startC: 8,  exitDelay: 12 },  // purple
    { name: 'Funky',  color: 0x228844, startR: 7, startC: 12, exitDelay: 15 },  // green
  ]

  const ghosts = GHOST_DEFS.map(def => {
    const mesh = buildGhost(def.color)
    mesh.position.set(cellX(def.startC), EYE_H - 0.2, cellZ(def.startR))
    scene.add(mesh)
    return {
      ...def, mesh,
      row: def.startR, col: def.startC,
      targetRow: def.startR, targetCol: def.startC,
      moveProgress: 1, dir: DIR_N,
      state: 'waiting', // waiting, roaming, scared, eaten
      waitTimer: def.exitDelay,
      scaredTimer: 0,
    }
  })

  // ─── Player State ──────────────────────────────────────────────────────────
  const player = {
    row: 15, col: 10,
    targetRow: 15, targetCol: 10,
    moveProgress: 1, dir: DIR_W,
    queuedDir: -1,
    cameraAngle: DIR_ANGLE[DIR_W],
    score: 0, lives: 3,
    powerTimer: 0, ghostMultiplier: 1,
    dotsLeft: dotPositions.length + powerPellets.length,
  }

  // ─── Camera Mode ────────────────────────────────────────────────────────────
  let cameraMode = 'top' // default: top-down; cycles top → third → first → top

  // ─── Player mesh (visible in 3rd/top person) ──────────────────────────────
  // Use a Group so pacMesh.position / rotation / visible all work identically to before
  const pacMesh = new THREE.Group()
  pacMesh.visible = true  // visible by default (top-down is default view)
  scene.add(pacMesh)

  // Flattened disc body — looks like a classic pac-man coin from above
  const pacBody = new THREE.Mesh(
    new THREE.SphereGeometry(0.66, 32, 16),
    new THREE.MeshStandardMaterial({
      color: 0xf0b800, emissive: 0xd08800, emissiveIntensity: 1.1,
      roughness: 0.2, metalness: 0.15,
    })
  )
  pacBody.scale.y = 0.55   // flatten into a disc shape
  pacMesh.add(pacBody)

  // White orbit ring — the single most distinctive feature vs ghosts
  const pacRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.92, 0.09, 8, 44),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  )
  pacRing.rotation.x = Math.PI / 2   // lie flat (horizontal)
  pacMesh.add(pacRing)

  // Second thinner ring — dashed look with slightly different radius
  const pacRing2 = new THREE.Mesh(
    new THREE.TorusGeometry(1.08, 0.04, 6, 28),
    new THREE.MeshBasicMaterial({ color: 0xffe060, transparent: true, opacity: 0.7 })
  )
  pacRing2.rotation.x = Math.PI / 2
  pacMesh.add(pacRing2)

  // Direction arrow — white cone pointing forward (-Z in local space)
  const pacArrow = new THREE.Mesh(
    new THREE.ConeGeometry(0.16, 0.42, 8),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  )
  pacArrow.rotation.x = -Math.PI / 2   // tip faces -Z (forward)
  pacArrow.position.set(0, 0.05, -0.82)
  pacMesh.add(pacArrow)

  // Small eye
  const pacEye = new THREE.Mesh(
    new THREE.SphereGeometry(0.11, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0x111122 })
  )
  pacEye.position.set(0, 0.28, -0.5)
  pacMesh.add(pacEye)

  // Soft underbody glow
  const pacAura = new THREE.Mesh(
    new THREE.SphereGeometry(1.05, 16, 10),
    new THREE.MeshBasicMaterial({ color: 0xffcc00, transparent: true, opacity: 0.14, side: THREE.BackSide, depthWrite: false })
  )
  pacMesh.add(pacAura)

  // Store animated children in userData
  pacMesh.userData = { ring: pacRing, ring2: pacRing2 }

  const pacLight = new THREE.PointLight(0xffdd00, 1.2, 8, 2)
  pacMesh.add(pacLight)

  // ─── Particles · Shake ─────────────────────────────────────────────────────
  const dotPS = new ParticleSystem(scene, {
    maxParticles: 200,
    geometry: new THREE.BoxGeometry(0.04, 0.04, 0.04),
    material: new THREE.MeshBasicMaterial({ color: 0xffdd66 }),
  })
  const powerPS = new ParticleSystem(scene, {
    maxParticles: 300,
    geometry: new THREE.SphereGeometry(0.06, 4, 3),
    material: new THREE.MeshBasicMaterial({ color: 0x44ddff }),
  })
  const ghostPS = new ParticleSystem(scene, {
    maxParticles: 400,
    geometry: new THREE.SphereGeometry(0.05, 4, 3),
    material: new THREE.MeshBasicMaterial({ color: 0xff4444 }),
  })
  const deathPS = new ParticleSystem(scene, {
    maxParticles: 500,
    geometry: new THREE.BoxGeometry(0.05, 0.05, 0.05),
    material: new THREE.MeshBasicMaterial({ color: 0xff3333 }),
  })
  const shake = new ScreenShake(camera)

  // ─── HUD ───────────────────────────────────────────────────────────────────
  const hud = new HUDLayer(container)
  const scoreTxt = hud.text({ top: 14, hCenter: true, font: 'bold 26px monospace', color: '#1a4a8a', shadow: '0 0 8px rgba(60,140,240,0.5)' })
  const livesTxt = hud.text({ top: 14, left: 16, font: 'bold 18px monospace', color: '#cc2255', shadow: '0 0 8px rgba(220,40,100,0.45)' })
  const powerTxt = hud.text({ top: 44, hCenter: true, font: 'bold 20px monospace', color: '#cc44aa', shadow: '0 0 14px rgba(220,60,180,0.7)' })
  powerTxt.hide()
  const bannerTxt = hud.text({ hCenter: true, vCenter: true, font: 'bold 44px monospace', color: '#1a3a8a', shadow: '2px 2px 0 rgba(200,230,255,0.9), 0 0 22px rgba(40,100,230,0.55)' })
  bannerTxt.hide()
  const hintTxt = hud.text({ bottom: 8, hCenter: true, font: '13px monospace', color: 'rgba(20,60,130,0.60)' })

  // ─── Minimap ───────────────────────────────────────────────────────────────
  const miniCanvas = document.createElement('canvas')
  miniCanvas.width = 168; miniCanvas.height = 168
  miniCanvas.style.cssText = 'position:absolute;top:12px;right:12px;border:1px solid rgba(60,120,200,0.4);border-radius:6px;opacity:0.9;pointer-events:none;'
  container.appendChild(miniCanvas)
  const miniCtx = miniCanvas.getContext('2d')
  const miniScale = 168 / (COLS + 2)

  function drawMinimap() {
    miniCtx.fillStyle = '#d8eef8'   // light sky background
    miniCtx.fillRect(0, 0, 168, 168)
    const s = miniScale
    const ox = s, oy = s
    // Walls — cobalt blue
    miniCtx.fillStyle = '#3a7abf'
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      if (M[r][c] === 1) miniCtx.fillRect(ox + c * s, oy + r * s, s, s)
    }
    // Dots
    miniCtx.fillStyle = '#ffdd66'
    for (let i = 0; i < dotPositions.length; i++) {
      if (!dotAlive[i]) continue
      const d = dotPositions[i]
      miniCtx.fillRect(ox + d.c * s + s * 0.35, oy + d.r * s + s * 0.35, s * 0.3, s * 0.3)
    }
    // Power pellets
    miniCtx.fillStyle = '#44ddff'
    for (const p of powerPellets) {
      if (!p.alive) continue
      miniCtx.beginPath()
      miniCtx.arc(ox + p.c * s + s / 2, oy + p.r * s + s / 2, s * 0.4, 0, TWO_PI)
      miniCtx.fill()
    }
    // Ghosts
    for (const g of ghosts) {
      if (g.state === 'waiting') continue
      miniCtx.fillStyle = g.state === 'scared' ? '#4444ff' :
        g.state === 'eaten' ? 'rgba(255,255,255,0.4)' :
        `#${g.color.toString(16).padStart(6, '0')}`
      miniCtx.beginPath()
      miniCtx.arc(ox + g.col * s + s / 2, oy + g.row * s + s / 2, s * 0.45, 0, TWO_PI)
      miniCtx.fill()
    }
    // Player
    miniCtx.fillStyle = '#44ff44'
    miniCtx.beginPath()
    miniCtx.arc(ox + player.col * s + s / 2, oy + player.row * s + s / 2, s * 0.45, 0, TWO_PI)
    miniCtx.fill()
  }

  // ─── Game State ────────────────────────────────────────────────────────────
  let state = 'menu', menuPanel = null, bannerTimer = 0, globalTime = 0

  // Cursor hiding style
  const cursorCSS = document.createElement('style')
  cursorCSS.textContent = `body.pac3d-hide-cursor, body.pac3d-hide-cursor * { cursor: none !important; }`
  document.head.appendChild(cursorCSS)

  // ─── Input ─────────────────────────────────────────────────────────────────
  const keys = new Set()
  // Map key to intended grid direction based on camera mode
  function keyToDir(code) {
    if (cameraMode === 'first') {
      // Relative to facing: W=forward, S=back, A=left-strafe, D=right-strafe
      if (code === 'KeyW' || code === 'ArrowUp')    return player.dir
      if (code === 'KeyS' || code === 'ArrowDown')  return (player.dir + 2) % 4
      if (code === 'KeyA' || code === 'ArrowLeft')  return (player.dir + 3) % 4
      if (code === 'KeyD' || code === 'ArrowRight') return (player.dir + 1) % 4
    } else {
      // Absolute: W=north, S=south, A=west, D=east (matches screen in 3rd/top)
      if (code === 'KeyW' || code === 'ArrowUp')    return DIR_N
      if (code === 'KeyS' || code === 'ArrowDown')  return DIR_S
      if (code === 'KeyA' || code === 'ArrowLeft')  return DIR_W
      if (code === 'KeyD' || code === 'ArrowRight') return DIR_E
    }
    return -1
  }

  function onKD(e) {
    keys.add(e.code)
    if (state === 'playing') {
      const d = keyToDir(e.code)
      if (d >= 0) { e.preventDefault(); player.queuedDir = d }
    }
    if (e.code === 'KeyV') {
      if (cameraMode === 'top') cameraMode = 'third'
      else if (cameraMode === 'third') cameraMode = 'first'
      else cameraMode = 'top'
      pacMesh.visible = (cameraMode === 'third' || cameraMode === 'top')
      if (cameraMode !== 'top') camera.up.set(0, 1, 0)
    }
    if (e.code === 'KeyR' && (state === 'dead' || state === 'gameover')) startGame()
    if (e.code === 'Escape') showMenu()
  }
  function onKU(e) { keys.delete(e.code) }
  window.addEventListener('keydown', onKD)
  window.addEventListener('keyup', onKU)
  container.tabIndex = 0; container.style.outline = 'none'
  container.focus()

  // ─── Movement Helpers ──────────────────────────────────────────────────────
  function canMove(r, c, dir) {
    let nr = r + DR[dir], nc = c + DC[dir]
    // Tunnel wrap
    if (r === 9 && nc < 0) nc = COLS - 1
    if (r === 9 && nc >= COLS) nc = 0
    return !isWall(nr, nc)
  }

  function wrapCol(c) {
    if (c < 0) return COLS - 1
    if (c >= COLS) return 0
    return c
  }

  // ─── Held-key helper ──────────────────────────────────────────────────────
  function heldDir() {
    for (const code of ['KeyW','ArrowUp','KeyS','ArrowDown','KeyA','ArrowLeft','KeyD','ArrowRight']) {
      if (keys.has(code)) {
        const d = keyToDir(code)
        if (d >= 0) return d
      }
    }
    return -1
  }

  // ─── Player Movement ───────────────────────────────────────────────────────
  function updatePlayer(dt) {
    if (player.moveProgress < 1) {
      player.moveProgress += PLAYER_SPEED * dt
      if (player.moveProgress >= 1) {
        player.moveProgress = 1
        player.row = player.targetRow
        player.col = wrapCol(player.targetCol)
        collectDotAt(player.row, player.col)
      }
    }

    if (player.moveProgress >= 1) {
      player.row = player.targetRow
      player.col = wrapCol(player.targetCol)

      const held = heldDir()
      let moved = false

      // Queued direction takes priority
      if (player.queuedDir >= 0 && canMove(player.row, player.col, player.queuedDir)) {
        player.dir = player.queuedDir
        player.queuedDir = -1
        moved = true
      } else if (player.queuedDir >= 0) {
        // Queued but blocked — try continuing current dir
        player.queuedDir = -1
      }

      if (!moved) {
        // Move only if a key is currently held
        if (held >= 0) {
          if (canMove(player.row, player.col, held)) {
            player.dir = held
            moved = true
          } else if (held !== player.dir && canMove(player.row, player.col, player.dir)) {
            // Pressed into wall; keep going forward
            moved = true
          }
        }
        // No key held → stop (moveProgress stays at 1)
      }

      if (moved) {
        player.targetRow = player.row + DR[player.dir]
        player.targetCol = player.col + DC[player.dir]
        if (player.row === 9) player.targetCol = wrapCol(player.targetCol)
        player.moveProgress = 0
      }
    }

    // Camera angle tracks movement direction
    // 1st person: smooth but fast turn (feels natural FPS)
    // 3rd/top: instant snap (pac-man visual on mesh only)
    const targetAngle = DIR_ANGLE[player.dir]
    let angleDiff = targetAngle - player.cameraAngle
    while (angleDiff > PI) angleDiff -= TWO_PI
    while (angleDiff < -PI) angleDiff += TWO_PI
    const turnSpeed = cameraMode === 'first' ? Math.min(1, dt * 18) : Math.min(1, dt * 40)
    player.cameraAngle += angleDiff * turnSpeed

    // Interpolate position
    const t = Math.min(player.moveProgress, 1)
    const px = cellX(player.col) + (cellX(wrapCol(player.targetCol)) - cellX(player.col)) * t
    const pz = cellZ(player.row) + (cellZ(player.targetRow) - cellZ(player.row)) * t
    const bobY = 0

    if (cameraMode === 'third') {
      pacMesh.visible = true
      pacMesh.position.set(px, 0.9, pz)
      pacMesh.rotation.y = player.cameraAngle + Math.PI
      // Camera from the south side looking north:
      //   W = screen-up = north, S = screen-down, A = screen-left, D = screen-right ✓
      camera.up.set(0, 1, 0)
      camera.position.set(px, 18, pz + 18)
      camera.lookAt(px, 0.5, pz)
    } else if (cameraMode === 'top') {
      pacMesh.visible = true
      pacMesh.position.set(px, 0.9, pz)
      pacMesh.rotation.y = player.cameraAngle + Math.PI
      // Fixed overhead centered on whole maze, north = screen up
      const mazeCX = (COLS - 1) * CELL / 2
      const mazeCZ = (ROWS - 1) * CELL / 2
      camera.up.set(0, 0, -1)
      camera.position.set(mazeCX, 34, mazeCZ)
      camera.lookAt(mazeCX, 0, mazeCZ)
    } else {
      pacMesh.visible = false
      camera.up.set(0, 1, 0)
      camera.position.set(px, EYE_H + bobY, pz)
      camera.rotation.order = 'YXZ'
      camera.rotation.y = player.cameraAngle
      camera.rotation.x = 0
    }

    playerLight.position.set(px, EYE_H, pz)
  }

  // ─── Dot Collection ────────────────────────────────────────────────────────
  function collectDotAt(r, c) {
    const key = `${r},${c}`
    // Regular dot
    const dotIdx = dotLookup.get(key)
    if (dotIdx !== undefined && dotAlive[dotIdx]) {
      dotAlive[dotIdx] = false
      // Hide dot by moving far away
      tmpM.makeTranslation(0, -100, 0)
      dotMesh.setMatrixAt(dotIdx, tmpM)
      dotMesh.instanceMatrix.needsUpdate = true
      player.score += 10
      player.dotsLeft--
      dotPS.burst({
        position: { x: cellX(c), y: 1.0, z: cellZ(r) },
        count: 12, speed: [1, 4], lifetime: [0.1, 0.35],
        size: [0.4, 1.0], sizeOverLife: [1, 0], spread: PI, gravity: 0,
      })
    }
    // Power pellet
    const powIdx = powerLookup.get(key)
    if (powIdx !== undefined && powerPellets[powIdx].alive) {
      const p = powerPellets[powIdx]
      p.alive = false
      p.sphere.visible = false
      p.light.intensity = 0
      player.score += 50
      player.dotsLeft--
      player.powerTimer = POWER_TIME
      player.ghostMultiplier = 1
      // Scare all roaming ghosts
      for (const g of ghosts) {
        if (g.state === 'roaming') {
          g.state = 'scared'
          g.scaredTimer = POWER_TIME
          setGhostScared(g, true)
        }
      }
      powerPS.burst({
        position: { x: cellX(c), y: 1.0, z: cellZ(r) },
        count: 50, speed: [3, 10], lifetime: [0.2, 0.7],
        size: [0.6, 1.8], sizeOverLife: [1, 0], spread: PI, gravity: -2,
      })
      shake.add({ amplitude: 0.12, frequency: 25, duration: 0.2 })
    }
    // Win check
    if (player.dotsLeft <= 0) winGame()
  }

  // ─── Ghost Visual State ────────────────────────────────────────────────────
  function setGhostScared(g, scared) {
    const ud = g.mesh.userData
    if (scared) {
      ud.bodyMat.color.set(0x2233cc)
      ud.bodyMat.emissive.set(0x2233cc)
      ud.aura.material.color.set(0x2233cc)
      ud.glow.color.set(0x2233cc)
      ud.leftEye.children[0].material.color.set(0xffffff)
      ud.rightEye.children[0].material.color.set(0xffffff)
    } else {
      ud.bodyMat.color.set(g.color)
      ud.bodyMat.emissive.set(g.color)
      ud.aura.material.color.set(g.color)
      ud.glow.color.set(g.color)
      ud.leftEye.children[0].material.color.set(0x112244)
      ud.rightEye.children[0].material.color.set(0x112244)
    }
  }

  function setGhostEaten(g) {
    const ud = g.mesh.userData
    ud.bodyGroup.visible = false   // hide body, show eyes only
    ud.glow.intensity = 0.15
  }

  function setGhostNormal(g) {
    const ud = g.mesh.userData
    ud.bodyGroup.visible = true
    ud.glow.intensity = 1.2
    setGhostScared(g, false)
  }

  // ─── Ghost AI ──────────────────────────────────────────────────────────────
  function ghostTargetTile(g) {
    if (g.state === 'eaten') {
      return { r: g.startR, c: g.startC }
    }
    if (g.state === 'scared') {
      // Random direction
      return { r: Math.floor(Math.random() * ROWS), c: Math.floor(Math.random() * COLS) }
    }
    // Roaming — classic targeting
    switch (g.name) {
      case 'Blinky': return { r: player.row, c: player.col }
      case 'Pinky': {
        const ahead = 4
        return { r: player.row + DR[player.dir] * ahead, c: player.col + DC[player.dir] * ahead }
      }
      case 'Inky': {
        const blinky = ghosts[0]
        const pivotR = player.row + DR[player.dir] * 2
        const pivotC = player.col + DC[player.dir] * 2
        return { r: pivotR + (pivotR - blinky.row), c: pivotC + (pivotC - blinky.col) }
      }
      case 'Clyde': {
        const dist = Math.abs(g.row - player.row) + Math.abs(g.col - player.col)
        if (dist > 8) return { r: player.row, c: player.col }
        return { r: ROWS - 2, c: 0 } // scatter corner
      }
      case 'Sue': {
        // Flanks from behind — targets tile behind player
        return { r: player.row - DR[player.dir] * 3, c: player.col - DC[player.dir] * 3 }
      }
      case 'Funky': {
        // Randomly roams, occasionally charges toward player
        if (Math.random() < 0.25) return { r: Math.floor(Math.random() * ROWS), c: Math.floor(Math.random() * COLS) }
        return { r: player.row, c: player.col }
      }
      default: return { r: player.row, c: player.col }
    }
  }

  function updateGhosts(dt) {
    for (const g of ghosts) {
      // Waiting state
      if (g.state === 'waiting') {
        g.waitTimer -= dt
        if (g.waitTimer <= 0) {
          g.state = 'roaming'
          g.row = 7; g.col = 10 // exit ghost house
          g.targetRow = 7; g.targetCol = 10
          g.moveProgress = 1
          g.mesh.position.set(cellX(10), EYE_H - 0.2, cellZ(7))
          setGhostNormal(g)
        } else {
          // Bob up and down in ghost house
          const bobY = Math.sin(globalTime * 3 + g.exitDelay) * 0.2
          g.mesh.position.y = EYE_H - 0.2 + bobY
          continue
        }
      }

      const speed = g.state === 'scared' ? SCARED_SPEED :
                    g.state === 'eaten' ? EATEN_SPEED : GHOST_SPEED

      if (g.moveProgress < 1) {
        g.moveProgress += speed * dt
        if (g.moveProgress >= 1) {
          g.moveProgress = 1
          g.row = g.targetRow
          g.col = wrapCol(g.targetCol)
          // Check if eaten ghost returned home
          if (g.state === 'eaten' && g.row === g.startR && g.col === g.startC) {
            g.state = 'roaming'
            setGhostNormal(g)
          }
        }
      }

      if (g.moveProgress >= 1) {
        const target = ghostTargetTile(g)
        let bestDir = -1, bestDist = Infinity
        const reverseDir = (g.dir + 2) % 4

        for (let d = 0; d < 4; d++) {
          if (d === reverseDir && g.state !== 'eaten') continue
          if (!canMove(g.row, g.col, d)) continue
          const nr = g.row + DR[d]
          const nc = wrapCol(g.col + DC[d])
          const dist = Math.abs(nr - target.r) + Math.abs(nc - target.c)
          if (dist < bestDist) { bestDist = dist; bestDir = d }
        }

        // Dead-end: no forward path found — allow reversing so ghost never freezes
        if (bestDir < 0 && canMove(g.row, g.col, reverseDir)) {
          bestDir = reverseDir
        }

        if (bestDir >= 0) {
          g.dir = bestDir
          g.targetRow = g.row + DR[bestDir]
          g.targetCol = g.col + DC[bestDir]
          if (g.row === 9) g.targetCol = wrapCol(g.targetCol)
          g.moveProgress = 0
        }
      }

      // Scared timer
      if (g.state === 'scared') {
        g.scaredTimer -= dt
        if (g.scaredTimer <= 0) {
          g.state = 'roaming'
          setGhostScared(g, false)
        }
      }

      // Interpolate position
      const t = Math.min(g.moveProgress, 1)
      const gx = cellX(g.col) + (cellX(wrapCol(g.targetCol)) - cellX(g.col)) * t
      const gz = cellZ(g.row) + (cellZ(g.targetRow) - cellZ(g.row)) * t
      g.mesh.position.x = gx
      g.mesh.position.z = gz
      if (g.state !== 'waiting') {
        g.mesh.position.y = EYE_H - 0.2 + Math.sin(globalTime * 2 + g.exitDelay) * 0.08
      }

      // Eyes look at player
      const ud = g.mesh.userData
      const dx = cellX(player.col) - gx
      const dz = cellZ(player.row) - gz
      const eyeAngle = Math.atan2(dx, -dz)
      g.mesh.rotation.y = eyeAngle
    }
  }

  // ─── Collision: Player vs Ghosts ───────────────────────────────────────────
  function checkGhostCollisions() {
    const t = Math.min(player.moveProgress, 1)
    const px = cellX(player.col) + (cellX(wrapCol(player.targetCol)) - cellX(player.col)) * t
    const pz = cellZ(player.row) + (cellZ(player.targetRow) - cellZ(player.row)) * t
    for (const g of ghosts) {
      if (g.state === 'waiting' || g.state === 'eaten') continue
      const dx = g.mesh.position.x - px
      const dz = g.mesh.position.z - pz
      const dist = Math.sqrt(dx * dx + dz * dz)
      if (dist < 1.0) {
        if (g.state === 'scared') {
          // Eat ghost
          g.state = 'eaten'
          setGhostEaten(g)
          const pts = 200 * player.ghostMultiplier
          player.score += pts
          player.ghostMultiplier *= 2
          ghostPS.burst({
            position: { x: g.mesh.position.x, y: EYE_H, z: g.mesh.position.z },
            count: 60, speed: [3, 12], lifetime: [0.2, 0.8],
            size: [0.5, 2.0], sizeOverLife: [1, 0], spread: PI, gravity: -3,
          })
          shake.add({ amplitude: 0.15, frequency: 20, duration: 0.25 })
          showBanner(`+${pts}`)
        } else {
          // Player dies
          playerDie()
          return
        }
      }
    }
  }

  // ─── Player Death ──────────────────────────────────────────────────────────
  function playerDie() {
    player.lives--
    const pt = Math.min(player.moveProgress, 1)
    const deathX = cellX(player.col) + (cellX(wrapCol(player.targetCol)) - cellX(player.col)) * pt
    const deathZ = cellZ(player.row) + (cellZ(player.targetRow) - cellZ(player.row)) * pt
    deathPS.burst({
      position: { x: deathX, y: EYE_H, z: deathZ },
      count: 100, speed: [4, 14], lifetime: [0.3, 1.0],
      size: [0.8, 2.5], sizeOverLife: [1, 0], spread: PI, gravity: -5,
    })
    shake.add({ amplitude: 0.5, frequency: 18, duration: 0.5, decay: 'smooth' })

    if (player.lives <= 0) {
      gameOver()
    } else {
      showBanner(`Lives: ${player.lives}`)
      resetPositions()
    }
  }

  function resetPositions() {
    player.row = 15; player.col = 10
    player.targetRow = 15; player.targetCol = 10
    player.moveProgress = 1; player.dir = DIR_W
    player.queuedDir = -1; player.cameraAngle = DIR_ANGLE[DIR_W]
    player.powerTimer = 0

    camera.position.set(cellX(10), EYE_H, cellZ(15))

    for (let i = 0; i < ghosts.length; i++) {
      const g = ghosts[i], def = GHOST_DEFS[i]
      g.row = def.startR; g.col = def.startC
      g.targetRow = def.startR; g.targetCol = def.startC
      g.moveProgress = 1; g.dir = DIR_N
      g.state = 'waiting'; g.waitTimer = def.exitDelay
      g.scaredTimer = 0
      g.mesh.position.set(cellX(def.startC), EYE_H - 0.2, cellZ(def.startR))
      setGhostNormal(g)
    }
  }

  // ─── Game Control ──────────────────────────────────────────────────────────
  let readyTimer = 0

  function startGame() {
    if (menuPanel) { menuPanel.dispose(); menuPanel = null }
    hideBanner()

    // Reset dots
    for (let i = 0; i < dotAlive.length; i++) {
      dotAlive[i] = true
      const d = dotPositions[i]
      tmpM.makeTranslation(cellX(d.c), 1.0, cellZ(d.r))
      dotMesh.setMatrixAt(i, tmpM)
    }
    dotMesh.instanceMatrix.needsUpdate = true

    // Reset power pellets
    for (const p of powerPellets) {
      p.alive = true
      p.sphere.visible = true
      p.light.intensity = 0.8
    }

    player.score = 0; player.lives = 3
    player.dotsLeft = dotPositions.length + powerPellets.length
    player.powerTimer = 0; player.ghostMultiplier = 1
    resetPositions()

    state = 'playing'
    readyTimer = 2.0 // freeze ghosts for 2 seconds
    document.body.classList.add('pac3d-hide-cursor')
    hintTxt.set('V: Top → Side → 1st · 1st person: W=Fwd A/D=Strafe · Top/Side: WASD=↑↓←→')
    showBanner('READY!', 1.5)
  }

  function gameOver() {
    state = 'gameover'
    document.body.classList.remove('pac3d-hide-cursor')
    showBanner('GAME OVER')

    setTimeout(() => {
      if (state !== 'gameover') return
      if (menuPanel) { menuPanel.dispose(); menuPanel = null }
      menuPanel = new GlassPanel({
        title: `Score: ${player.score}`,
        subtitle: 'All lives lost!',
        buttons: [
          { label: 'Try Again (R)', onClick: () => { if (menuPanel) { menuPanel.dispose(); menuPanel = null }; startGame() } },
          { label: 'Menu', onClick: () => { if (menuPanel) { menuPanel.dispose(); menuPanel = null }; showMenu() } },
        ],
      })
      hud.custom(menuPanel.el, { hCenter: true, vCenter: true })
    }, 1200)
  }

  function winGame() {
    state = 'win'
    document.body.classList.remove('pac3d-hide-cursor')
    showBanner('YOU WIN!')
    // Big celebration particles
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        powerPS.burst({
          position: { x: camera.position.x + (Math.random() - 0.5) * 4, y: EYE_H + 1, z: camera.position.z + (Math.random() - 0.5) * 4 },
          count: 40, speed: [3, 10], lifetime: [0.3, 1.0],
          size: [0.5, 2.0], sizeOverLife: [1, 0], spread: PI, gravity: -2,
        })
      }, i * 300)
    }

    setTimeout(() => {
      if (state !== 'win') return
      if (menuPanel) { menuPanel.dispose(); menuPanel = null }
      menuPanel = new GlassPanel({
        title: `Victory! Score: ${player.score}`,
        subtitle: 'All dots collected!',
        buttons: [
          { label: 'Play Again (R)', onClick: () => { if (menuPanel) { menuPanel.dispose(); menuPanel = null }; startGame() } },
          { label: 'Menu', onClick: () => { if (menuPanel) { menuPanel.dispose(); menuPanel = null }; showMenu() } },
        ],
      })
      hud.custom(menuPanel.el, { hCenter: true, vCenter: true })
    }, 2000)
  }

  function showMenu() {
    state = 'menu'; document.body.classList.remove('pac3d-hide-cursor'); bannerTxt.hide()
    scoreTxt.set(''); livesTxt.set(''); powerTxt.hide()
    if (menuPanel) { menuPanel.dispose(); menuPanel = null }
    menuPanel = new GlassPanel({
      title: 'NEON LABYRINTH',
      subtitle: 'First-Person Pac-Man\nNavigate the neon maze, eat all dots, avoid ghosts!',
      buttons: [{ label: '>>> Start', onClick: () => { if (menuPanel) { menuPanel.dispose(); menuPanel = null }; startGame() } }],
    })
    hud.custom(menuPanel.el, { hCenter: true, vCenter: true })
    hintTxt.set('WASD: Move · V: 1st / 3rd / Top view · Collect dots · Eat power pellets to fight back!')

    // Position camera for menu view (overhead)
    camera.position.set(cellX(10), 30, cellZ(10))
    camera.rotation.order = 'YXZ'
    camera.rotation.set(-PI / 2, 0, 0)
  }

  let bannerTimeout = 0
  function showBanner(text, duration = 1.8) {
    bannerTxt.set(text); bannerTxt.show(); bannerTimer = duration
    clearTimeout(bannerTimeout)
    bannerTimeout = setTimeout(() => {
      bannerTxt.set(''); bannerTxt.hide(); bannerTimer = 0
    }, duration * 1000)
  }
  function hideBanner() {
    clearTimeout(bannerTimeout)
    bannerTxt.set(''); bannerTxt.hide(); bannerTimer = 0
  }

  // ─── Update HUD ────────────────────────────────────────────────────────────
  function updateHUD() {
    scoreTxt.set(`Score: ${player.score}`)
    livesTxt.set('❤'.repeat(player.lives))
    if (player.powerTimer > 0) {
      powerTxt.set(`POWER! ${player.powerTimer.toFixed(1)}s`)
      powerTxt.show()
    } else {
      powerTxt.hide()
    }
  }

  // ─── Animate Dots & Pellets ────────────────────────────────────────────────
  function animateCollectibles(dt) {
    // Dot bobbing
    let needsUpdate = false
    for (let i = 0; i < dotPositions.length; i++) {
      if (!dotAlive[i]) continue
      const d = dotPositions[i]
      const y = 1.0 + Math.sin(globalTime * 3 + d.r * 0.5 + d.c * 0.7) * 0.08
      tmpM.makeTranslation(cellX(d.c), y, cellZ(d.r))
      dotMesh.setMatrixAt(i, tmpM)
      needsUpdate = true
    }
    if (needsUpdate) dotMesh.instanceMatrix.needsUpdate = true

    // Power pellet pulsating
    for (const p of powerPellets) {
      if (!p.alive) continue
      const scale = 1.0 + Math.sin(globalTime * 4) * 0.4
      p.sphere.scale.setScalar(scale)
      p.light.intensity = 0.6 + Math.sin(globalTime * 4) * 0.4
      p.sphere.position.y = 1.0 + Math.sin(globalTime * 2) * 0.15
      p.light.position.y = p.sphere.position.y
    }
  }

  // ─── Game Loop ─────────────────────────────────────────────────────────────
  let disposed = false

  function renderFrame(rawDt) {
    if (disposed) return
    const dt = Math.min(rawDt, 1 / 20)
    globalTime += dt

    dotPS.tick(dt); powerPS.tick(dt); ghostPS.tick(dt); deathPS.tick(dt)
    if (bannerTimer > 0) { bannerTimer -= dt; if (bannerTimer <= 0) hideBanner() }

    floorUniforms.time.value = globalTime
    animateCollectibles(dt)

    // Animate pac-man rings when visible
    if (pacMesh.visible && pacMesh.userData.ring) {
      pacMesh.userData.ring.rotation.z  += dt * 1.8   // outer white ring spins
      pacMesh.userData.ring2.rotation.z -= dt * 2.5   // inner gold ring counter-spins
      const p = 1.0 + Math.sin(globalTime * 4) * 0.07
      pacMesh.userData.ring.scale.setScalar(p)         // subtle pulse
    }

    if (state === 'playing') {
      // Ready countdown — ghosts freeze during this
      if (readyTimer > 0) readyTimer -= dt

      // Power timer
      if (player.powerTimer > 0) {
        player.powerTimer -= dt
        if (player.powerTimer <= 0) {
          player.powerTimer = 0
          for (const g of ghosts) {
            if (g.state === 'scared') {
              g.state = 'roaming'
              setGhostScared(g, false)
            }
          }
        }
      }

      updatePlayer(dt)
      if (readyTimer <= 0) {
        updateGhosts(dt)
        checkGhostCollisions()
      }
      updateHUD()
      drawMinimap()
    } else if (state === 'menu') {
      // Slow camera rotation for menu
      camera.position.x = cellX(10) + Math.sin(globalTime * 0.2) * 6
      camera.position.z = cellZ(10) + Math.cos(globalTime * 0.2) * 6
      camera.lookAt(cellX(10), 0, cellZ(10))
      drawMinimap()
    }

    shake.tick(dt)
    composer.render()
  }

  showMenu()

  // ─── Resize · Dispose ──────────────────────────────────────────────────────
  function resize() {
    const w = container.clientWidth, h = container.clientHeight
    camera.aspect = w / h; camera.updateProjectionMatrix()
    renderer.setSize(w, h); composer.setSize(w, h)
  }

  function dispose() {
    if (disposed) return; disposed = true
    clearTimeout(bannerTimeout)
    window.removeEventListener('keydown', onKD); window.removeEventListener('keyup', onKU)
    document.body.classList.remove('pac3d-hide-cursor'); cursorCSS.remove()
    dotPS.dispose(); powerPS.dispose(); ghostPS.dispose(); deathPS.dispose()
    hud.dispose(); if (menuPanel) menuPanel.dispose()
    renderer.dispose(); composer.dispose()
    if (miniCanvas.parentNode) miniCanvas.parentNode.removeChild(miniCanvas)
    if (renderer.domElement.parentNode === container) container.removeChild(renderer.domElement)
  }

  return {
    getScene: () => scene, getCamera: () => camera,
    getRenderer: () => renderer, getCanvas: () => renderer.domElement,
    getOrbitControls: () => null,
    resize, dispose, renderFrame,
  }
}
