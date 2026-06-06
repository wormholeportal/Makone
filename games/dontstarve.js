/**
 * Don't Starve — A Bear in the Wilderness
 *
 * Tim Burton-esque hand-drawn survival inspired by Klei's Don't Starve.
 * Play as a 狗熊 (Asiatic black bear) wandering an infinite procedural world.
 * Roam plains, forests, swamps and rocky lands. Gather, eat, and survive.
 *
 * World: infinite chunk-streamed (24-unit chunks, 8×8 active around player)
 *   4 biomes: plain · forest · rocky · swamp — each with unique density and decor.
 *   Decorations: ponds, boulders, pebbles, bones, dead trees, mushrooms, flowers.
 *
 * Controls:
 *   WASD / Arrows     Move (3rd: world-space ; 1st: forward/back + turn left/right)
 *   V                 Toggle 1st-person ↔ 3rd-person view
 *   Mouse Click       Attack / chop / mine (hold to keep swinging)
 *   F / Space         Pick the closest plant
 *   Q                 Eat berry  (+18 🍗 +3 ♥)
 *   E                 Eat mushroom (+25 🍗  ±0~7 ☼  — some are risky!)
 *   B                 Build menu (campfire: 2🪵+1🪨)
 *   R                 Restart after death
 */

import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import {
  HUDLayer,
  GlassPanel,
  ParticleSystem,
  ScreenShake,
  Flash,
  Cooldown,
} from 'makone/game'

export default async function createScene(container) {
  const canvasArea = (container.clientWidth || 800) * (container.clientHeight || 600)
  const lowSpec = (navigator.hardwareConcurrency || 4) <= 4 || canvasArea > 1_800_000
  const pixelRatio = Math.min(window.devicePixelRatio, lowSpec ? 1.25 : 1.5)

  // ─── Constants ──────────────────────────────────────────────────────────────
  // Infinite world via chunk streaming
  const CHUNK_SIZE = 24            // world units per chunk
  const CHUNK_RADIUS = lowSpec ? 3 : 4 // chunks around player to keep generated
  const GROUND_TILE_SIZE = 240     // big ground plane that follows player

  const PLAYER_SPEED = 5.5
  const PLAYER_RADIUS = 0.35
  const INTERACT_RANGE = 1.8

  const DAY_LENGTH = 75           // seconds of full day
  const DUSK_LENGTH = 18
  const NIGHT_LENGTH = 35
  const DAWN_LENGTH = 10
  const FULL_CYCLE = DAY_LENGTH + DUSK_LENGTH + NIGHT_LENGTH + DAWN_LENGTH

  const MAX_HEALTH = 100
  const MAX_HUNGER = 100
  const MAX_SANITY = 100
  const HUNGER_RATE = 1.4         // hunger per second
  const SANITY_NIGHT_DRAIN = 4
  const STARVE_DAMAGE = 6

  const CAMPFIRE_RANGE = 6.5
  const CAMPFIRE_LIFETIME = 50    // seconds before burnout
  const FIRE_HEAL_SANITY = 8

  // ─── Renderer ───────────────────────────────────────────────────────────────
  const W0 = container.clientWidth || 800
  const H0 = container.clientHeight || 600

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'default' })
  renderer.setPixelRatio(pixelRatio)
  renderer.setSize(W0, H0)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.35
  renderer.shadowMap.enabled = !lowSpec
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  container.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x4a5a3a)

  // ─── Camera (top-down 3/4 isometric) ───────────────────────────────────────
  const camera = new THREE.PerspectiveCamera(38, W0 / H0, 0.5, 200)
  const CAM_OFFSET = new THREE.Vector3(0, 22, 14)
  camera.position.copy(CAM_OFFSET)
  camera.lookAt(0, 0, 0)

  // ─── Post-processing ────────────────────────────────────────────────────────
  const composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))
  const bloomPass = new UnrealBloomPass(new THREE.Vector2(W0, H0), lowSpec ? 0.12 : 0.28, 0.55, 0.9)
  composer.addPass(bloomPass)

  // Vignette shader pass for hand-drawn moody feel
  const vignetteShader = {
    uniforms: {
      tDiffuse: { value: null },
      uVignette: { value: 1.0 },
      uDarkness: { value: 0.0 },
      uTime: { value: 0 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D tDiffuse;
      uniform float uVignette;
      uniform float uDarkness;
      uniform float uTime;
      varying vec2 vUv;
      void main() {
        vec4 col = texture2D(tDiffuse, vUv);
        // Mild vignette — only darkens far corners
        vec2 c = vUv - 0.5;
        float r = length(c);
        float vig = smoothstep(0.95, 0.55, r);
        float vigFactor = mix(0.70, 1.0, vig); // corners only down to 70% brightness
        col.rgb *= mix(1.0, vigFactor, uVignette);
        // Night darkness overlay (preserves bright sources like fire)
        col.rgb = mix(col.rgb, col.rgb * vec3(0.42, 0.48, 0.62), uDarkness);
        // Subtle film grain
        float grain = fract(sin(dot(vUv * 1024.0 + uTime, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
        col.rgb += grain * 0.015;
        gl_FragColor = col;
      }
    `,
  }
  const vignettePass = new ShaderPass(vignetteShader)
  composer.addPass(vignettePass)
  composer.addPass(new OutputPass())
  // Alias for easier reference
  const fxMat = { uniforms: vignettePass.uniforms }

  // ─── Lighting ───────────────────────────────────────────────────────────────
  const ambLight = new THREE.AmbientLight(0xe2e6c8, 1.05)
  scene.add(ambLight)

  const sunLight = new THREE.DirectionalLight(0xfff4d0, 1.85)
  sunLight.position.set(18, 30, 16)
  sunLight.castShadow = true
  sunLight.shadow.mapSize.set(lowSpec ? 768 : 1536, lowSpec ? 768 : 1536)
  sunLight.shadow.camera.left = -30
  sunLight.shadow.camera.right = 30
  sunLight.shadow.camera.top = 30
  sunLight.shadow.camera.bottom = -30
  sunLight.shadow.camera.near = 5
  sunLight.shadow.camera.far = 80
  sunLight.shadow.bias = -0.0008
  sunLight.shadow.normalBias = 0.02
  scene.add(sunLight)
  scene.add(sunLight.target)

  const hemiLight = new THREE.HemisphereLight(0xd8e2b8, 0x3a2a18, 0.7)
  scene.add(hemiLight)

  // ─── Fog ────────────────────────────────────────────────────────────────────
  scene.fog = new THREE.Fog(0x8a9866, 55, 130)

  // ─── Outline helper (inverted-hull, sketchy black) ──────────────────────────
  const OUTLINE_MAT = new THREE.MeshBasicMaterial({
    color: 0x05060a,
    side: THREE.BackSide,
    fog: false,
  })
  function addOutline(mesh, thickness = 0.045) {
    const outline = new THREE.Mesh(mesh.geometry, OUTLINE_MAT)
    outline.scale.setScalar(1 + thickness)
    outline.castShadow = false
    outline.receiveShadow = false
    outline.userData.isOutline = true
    mesh.add(outline)
    return outline
  }
  // Apply outline to all meshes under a group
  function outlineGroup(group, thickness = 0.045) {
    group.traverse(obj => {
      if (obj.isMesh && !obj.userData.isOutline && !obj.userData.noOutline) {
        const outline = new THREE.Mesh(obj.geometry, OUTLINE_MAT)
        outline.scale.setScalar(1 + thickness)
        outline.userData.isOutline = true
        outline.castShadow = false
        outline.receiveShadow = false
        obj.add(outline)
      }
    })
  }

  // ─── Ground ─────────────────────────────────────────────────────────────────
  // Hand-drawn-style ground via canvas texture (organic blotches + grass marks)
  function makeGroundTexture() {
    const SIZE = 1024
    const c = document.createElement('canvas')
    c.width = SIZE; c.height = SIZE
    const ctx = c.getContext('2d')
    // Base olive (brighter for sunlight)
    ctx.fillStyle = '#94a55a'
    ctx.fillRect(0, 0, SIZE, SIZE)
    // Darker organic blotches
    for (let i = 0; i < 220; i++) {
      ctx.fillStyle = `rgba(60,76,38,${0.12 + Math.random() * 0.18})`
      const x = Math.random() * SIZE
      const y = Math.random() * SIZE
      const r = 18 + Math.random() * 90
      ctx.beginPath()
      // jagged organic blob
      const segs = 12
      for (let s = 0; s <= segs; s++) {
        const a = (s / segs) * Math.PI * 2
        const rr = r * (0.7 + Math.random() * 0.6)
        const px = x + Math.cos(a) * rr
        const py = y + Math.sin(a) * rr
        if (s === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
      }
      ctx.closePath()
      ctx.fill()
    }
    // Lighter speckles
    for (let i = 0; i < 600; i++) {
      ctx.fillStyle = `rgba(140,150,90,${0.10 + Math.random() * 0.18})`
      const x = Math.random() * SIZE
      const y = Math.random() * SIZE
      const r = 3 + Math.random() * 6
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()
    }
    // Grass strokes (short curved lines)
    ctx.strokeStyle = 'rgba(40,52,22,0.32)'
    ctx.lineWidth = 1.3
    for (let i = 0; i < 1800; i++) {
      const x = Math.random() * SIZE
      const y = Math.random() * SIZE
      const len = 4 + Math.random() * 8
      const ang = Math.random() * Math.PI * 2
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x + Math.cos(ang) * len, y - Math.abs(Math.sin(ang)) * len)
      ctx.stroke()
    }
    const tex = new THREE.CanvasTexture(c)
    tex.wrapS = THREE.RepeatWrapping
    tex.wrapT = THREE.RepeatWrapping
    tex.repeat.set(GROUND_TILE_SIZE / 30, GROUND_TILE_SIZE / 30)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 4
    return tex
  }
  const groundTex = makeGroundTexture()
  const groundMat = new THREE.MeshStandardMaterial({
    map: groundTex,
    color: 0xc8d088,
    roughness: 1.0,
    metalness: 0.0,
  })
  const groundGeo = new THREE.PlaneGeometry(GROUND_TILE_SIZE, GROUND_TILE_SIZE, 1, 1)
  groundGeo.rotateX(-Math.PI / 2)
  const ground = new THREE.Mesh(groundGeo, groundMat)
  ground.receiveShadow = true
  scene.add(ground)

  // ─── Player Character (狗熊 — Asiatic black bear, anthropomorphic) ──────────
  const playerGroup = new THREE.Group()
  scene.add(playerGroup)

  const furDarkMat  = new THREE.MeshStandardMaterial({ color: 0x1c1410, roughness: 0.92 })
  const furLightMat = new THREE.MeshStandardMaterial({ color: 0x2a1f18, roughness: 0.9 })
  const chestMat    = new THREE.MeshStandardMaterial({ color: 0xe8c890, roughness: 0.85 })
  const muzzleMat   = new THREE.MeshStandardMaterial({ color: 0xa07a55, roughness: 0.8 })
  const pawMat      = new THREE.MeshStandardMaterial({ color: 0x0d0805, roughness: 0.85 })
  const noseMat     = new THREE.MeshStandardMaterial({ color: 0x080404, roughness: 0.4 })
  const blackMat    = new THREE.MeshStandardMaterial({ color: 0x05050a, roughness: 0.4 })

  // Torso — rotund barrel shape
  const torsoGeo = new THREE.SphereGeometry(0.55, 14, 12)
  torsoGeo.scale(0.95, 1.05, 0.85)
  const torso = new THREE.Mesh(torsoGeo, furDarkMat)
  torso.position.y = 0.95
  torso.castShadow = true
  playerGroup.add(torso)

  // Iconic cream V-shaped chest patch (Asiatic black bear marking)
  const chestPatch = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), chestMat)
  chestPatch.scale.set(0.85, 0.55, 0.4)
  chestPatch.position.set(0, 1.0, 0.4)
  chestPatch.userData.noOutline = true
  playerGroup.add(chestPatch)
  // Small "wing" extensions of the V
  const vL = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), chestMat)
  vL.scale.set(0.7, 0.35, 0.3); vL.position.set(-0.22, 1.18, 0.4); vL.userData.noOutline = true
  playerGroup.add(vL)
  const vR = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), chestMat)
  vR.scale.set(0.7, 0.35, 0.3); vR.position.set(0.22, 1.18, 0.4); vR.userData.noOutline = true
  playerGroup.add(vR)

  // Head — round and big
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.36, 14, 12), furDarkMat)
  head.position.y = 1.7
  head.scale.set(1.05, 0.95, 1.0)
  head.castShadow = true
  playerGroup.add(head)

  // Muzzle — protruding snout
  const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), muzzleMat)
  muzzle.scale.set(0.95, 0.7, 1.15)
  muzzle.position.set(0, 1.62, 0.32)
  muzzle.castShadow = true
  playerGroup.add(muzzle)

  // Nose tip
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), noseMat)
  nose.position.set(0, 1.66, 0.46)
  nose.userData.noOutline = true
  playerGroup.add(nose)

  // Ears — round small black hemispheres on top
  const earGeo = new THREE.SphereGeometry(0.13, 10, 8)
  const earL = new THREE.Mesh(earGeo, furDarkMat)
  earL.scale.set(0.95, 0.95, 0.55); earL.position.set(-0.24, 1.95, -0.04); earL.castShadow = true
  playerGroup.add(earL)
  const earR = new THREE.Mesh(earGeo, furDarkMat)
  earR.scale.set(0.95, 0.95, 0.55); earR.position.set(0.24, 1.95, -0.04); earR.castShadow = true
  playerGroup.add(earR)
  // Inner ear (pink)
  const innerEarMat = new THREE.MeshStandardMaterial({ color: 0x6a3a35, roughness: 0.85 })
  const innerL = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), innerEarMat)
  innerL.scale.set(0.9, 0.9, 0.4); innerL.position.set(-0.24, 1.96, -0.005); innerL.userData.noOutline = true
  playerGroup.add(innerL)
  const innerR = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), innerEarMat)
  innerR.scale.set(0.9, 0.9, 0.4); innerR.position.set(0.24, 1.96, -0.005); innerR.userData.noOutline = true
  playerGroup.add(innerR)

  // Eyes — small beady
  const eyeGeo = new THREE.SphereGeometry(0.05, 8, 6)
  const eyeL = new THREE.Mesh(eyeGeo, blackMat); eyeL.position.set(-0.13, 1.78, 0.28); eyeL.userData.noOutline = true
  playerGroup.add(eyeL)
  const eyeR = new THREE.Mesh(eyeGeo, blackMat); eyeR.position.set(0.13, 1.78, 0.28); eyeR.userData.noOutline = true
  playerGroup.add(eyeR)
  // Eye highlights
  const eyeHl = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false })
  const ehL = new THREE.Mesh(new THREE.SphereGeometry(0.016, 6, 5), eyeHl); ehL.position.set(-0.118, 1.795, 0.32); ehL.userData.noOutline = true
  playerGroup.add(ehL)
  const ehR = new THREE.Mesh(new THREE.SphereGeometry(0.016, 6, 5), eyeHl); ehR.position.set(0.142, 1.795, 0.32); ehR.userData.noOutline = true
  playerGroup.add(ehR)

  // Mouth (small dark line below muzzle)
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 0.02), blackMat)
  mouth.position.set(0, 1.54, 0.5); mouth.userData.noOutline = true
  playerGroup.add(mouth)

  // Arms — thick & furry
  const armPivotL = new THREE.Group(); armPivotL.position.set(-0.48, 1.20, 0); playerGroup.add(armPivotL)
  const armPivotR = new THREE.Group(); armPivotR.position.set(0.48, 1.20, 0);  playerGroup.add(armPivotR)
  const armGeo = new THREE.CapsuleGeometry(0.16, 0.42, 4, 8)
  const armL = new THREE.Mesh(armGeo, furDarkMat); armL.position.y = -0.30; armL.castShadow = true; armPivotL.add(armL)
  const armR = new THREE.Mesh(armGeo, furDarkMat); armR.position.y = -0.30; armR.castShadow = true; armPivotR.add(armR)
  // Paws (hands)
  const pawHandGeo = new THREE.SphereGeometry(0.16, 10, 8)
  const pawL = new THREE.Mesh(pawHandGeo, pawMat); pawL.scale.set(1, 0.75, 1.05); pawL.position.y = -0.55; pawL.castShadow = true; armPivotL.add(pawL)
  const pawR = new THREE.Mesh(pawHandGeo, pawMat); pawR.scale.set(1, 0.75, 1.05); pawR.position.y = -0.55; pawR.castShadow = true; armPivotR.add(pawR)
  // Tiny claws (3 per paw)
  const clawMat = new THREE.MeshStandardMaterial({ color: 0xf2e4c0, roughness: 0.5 })
  for (const pivot of [armPivotL, armPivotR]) {
    for (let i = 0; i < 3; i++) {
      const claw = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.07, 4), clawMat)
      claw.position.set((i - 1) * 0.05, -0.62, 0.13)
      claw.rotation.x = -0.3
      claw.userData.noOutline = true
      pivot.add(claw)
    }
  }

  // Legs — thick & stubby
  const legPivotL = new THREE.Group(); legPivotL.position.set(-0.22, 0.55, 0); playerGroup.add(legPivotL)
  const legPivotR = new THREE.Group(); legPivotR.position.set(0.22, 0.55, 0);  playerGroup.add(legPivotR)
  const legGeo = new THREE.CapsuleGeometry(0.18, 0.30, 4, 8)
  const legL = new THREE.Mesh(legGeo, furDarkMat); legL.position.y = -0.25; legL.castShadow = true; legPivotL.add(legL)
  const legR = new THREE.Mesh(legGeo, furDarkMat); legR.position.y = -0.25; legR.castShadow = true; legPivotR.add(legR)
  // Hind paws
  const pawFootGeo = new THREE.SphereGeometry(0.20, 10, 8)
  const footL = new THREE.Mesh(pawFootGeo, pawMat); footL.scale.set(1, 0.55, 1.35); footL.position.set(0, -0.46, 0.05); footL.castShadow = true; legPivotL.add(footL)
  const footR = new THREE.Mesh(pawFootGeo, pawMat); footR.scale.set(1, 0.55, 1.35); footR.position.set(0, -0.46, 0.05); footR.castShadow = true; legPivotR.add(footR)

  // Tiny stub tail
  const tail = new THREE.Mesh(new THREE.SphereGeometry(0.10, 8, 6), furDarkMat)
  tail.position.set(0, 1.0, -0.5); tail.scale.set(1, 0.8, 0.7)
  playerGroup.add(tail)

  outlineGroup(playerGroup, 0.045)

  let playerX = 0, playerZ = 0
  let playerVX = 0, playerVZ = 0
  let playerFacing = 0 // radians, 0 = +Z
  let walkPhase = 0
  let attackSwing = 0 // 0..1 anim progress; 0 = idle
  let attackCooldown = new Cooldown(0.45)

  // ─── Resource Definitions ───────────────────────────────────────────────────
  /**
   * Each resource has:
   *  - kind: 'tree' | 'grass' | 'berry' | 'rock' | 'sapling' (regrown)
   *  - x, z, model (Group), hp, drops {wood, grass, berry, stone, flint}, regrowTimer
   *  - active: false when fully harvested (and removed/hidden)
   */
  const resources = []
  // Spatial index by chunk for fast overlap testing
  const chunks = new Map() // "cx,cz" -> { biome, generated, resources: [], decorations: [] }
  function chunkKey(cx, cz) { return cx + ',' + cz }
  function worldToChunk(x, z) {
    return { cx: Math.floor(x / CHUNK_SIZE), cz: Math.floor(z / CHUNK_SIZE) }
  }

  // Deterministic biome from chunk coords
  function chunkBiome(cx, cz) {
    // Multi-octave hash for blob-like biome regions
    const lowFreq = Math.sin(cx * 0.31 + 0.7) * Math.cos(cz * 0.27 - 0.4) * 0.5 + 0.5
    const highFreq = Math.sin(cx * 1.3 + cz * 0.9) * 0.2
    const v = lowFreq + highFreq
    if (v < 0.30) return 'plain'
    if (v < 0.55) return 'forest'
    if (v < 0.78) return 'rocky'
    return 'swamp'
  }

  // Per-chunk biome ground patch (colored translucent disk)
  const biomePatches = []
  function addBiomePatch(cx, cz, biome) {
    const colors = {
      plain:  null, // default ground
      forest: 0x4a5a2a,
      rocky:  0x88857a,
      swamp:  0x3a4a30,
    }
    const col = colors[biome]
    if (!col) return
    const cx0 = cx * CHUNK_SIZE + CHUNK_SIZE / 2
    const cz0 = cz * CHUNK_SIZE + CHUNK_SIZE / 2
    const r = CHUNK_SIZE * 0.72
    const geo = new THREE.CircleGeometry(r, 18)
    geo.rotateX(-Math.PI / 2)
    const mat = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.32, depthWrite: false })
    const patch = new THREE.Mesh(geo, mat)
    patch.position.set(cx0, 0.015, cz0)
    patch.renderOrder = -1
    patch.userData.noOutline = true
    scene.add(patch)
    biomePatches.push(patch)
  }

  // Seeded RNG for deterministic per-chunk content
  function makeRng(seed) {
    let s = seed | 0
    return () => {
      s = (s * 1664525 + 1013904223) | 0
      return ((s >>> 0) % 1000000) / 1000000
    }
  }

  function ensureChunk(cx, cz) {
    const key = chunkKey(cx, cz)
    if (chunks.has(key)) return chunks.get(key)
    const biome = chunkBiome(cx, cz)
    const chunk = { biome, generated: true, resources: [], decorations: [] }
    chunks.set(key, chunk)
    generateChunkContents(cx, cz, chunk)
    addBiomePatch(cx, cz, biome)
    return chunk
  }

  function generateChunkContents(cx, cz, chunk) {
    const isStart = cx === 0 && cz === 0
    const rng = makeRng(cx * 73856093 ^ cz * 19349663 ^ 0x42)

    // Biome-specific spawn counts
    const profile = {
      plain:  { tree: 2, grass: 6, berry: 3, rock: 1, flower: 7, mushroom: 0, deadtree: 0, boulder: 0, pond: 0.15 },
      forest: { tree: 9, grass: 3, berry: 3, rock: 1, flower: 1, mushroom: 4, deadtree: 1, boulder: 0, pond: 0 },
      rocky:  { tree: 1, grass: 2, berry: 0, rock: 6, flower: 0, mushroom: 1, deadtree: 1, boulder: 0.8, pond: 0 },
      swamp:  { tree: 3, grass: 1, berry: 2, rock: 1, flower: 0, mushroom: 6, deadtree: 2, boulder: 0, pond: 0.6 },
    }[chunk.biome]

    function tryPlace(kind, count) {
      const c = Math.floor(count) + (rng() < (count - Math.floor(count)) ? 1 : 0)
      for (let i = 0; i < c; i++) {
        const x = cx * CHUNK_SIZE + 1 + rng() * (CHUNK_SIZE - 2)
        const z = cz * CHUNK_SIZE + 1 + rng() * (CHUNK_SIZE - 2)
        if (isStart && Math.hypot(x, z) < 4) continue
        // Check 8 nearest chunks for overlap (resources only)
        let ok = true
        for (let dcx = -1; dcx <= 1 && ok; dcx++) {
          for (let dcz = -1; dcz <= 1 && ok; dcz++) {
            const k = chunks.get(chunkKey(cx + dcx, cz + dcz))
            if (!k) continue
            for (const r of k.resources) {
              const dx = r.x - x, dz = r.z - z
              if (dx * dx + dz * dz < 1.6 * 1.6) { ok = false; break }
            }
          }
        }
        if (ok) {
          const r = addResource(kind, x, z)
          if (r) chunk.resources.push(r)
        }
      }
    }

    tryPlace('tree', profile.tree)
    tryPlace('grass', profile.grass)
    tryPlace('berry', profile.berry)
    tryPlace('rock', profile.rock)
    tryPlace('flower', profile.flower)
    tryPlace('mushroom', profile.mushroom)
    tryPlace('deadtree', profile.deadtree)

    // Decorations (non-harvestable)
    if (rng() < profile.boulder) {
      const x = cx * CHUNK_SIZE + 2 + rng() * (CHUNK_SIZE - 4)
      const z = cz * CHUNK_SIZE + 2 + rng() * (CHUNK_SIZE - 4)
      addBoulder(x, z, chunk)
    }
    if (rng() < profile.pond) {
      const x = cx * CHUNK_SIZE + 3 + rng() * (CHUNK_SIZE - 6)
      const z = cz * CHUNK_SIZE + 3 + rng() * (CHUNK_SIZE - 6)
      addPond(x, z, chunk)
    }
    // Scatter pebbles per biome for surface texture
    const pebbleCount = chunk.biome === 'rocky' ? 6 : 2
    for (let i = 0; i < pebbleCount; i++) {
      const x = cx * CHUNK_SIZE + rng() * CHUNK_SIZE
      const z = cz * CHUNK_SIZE + rng() * CHUNK_SIZE
      addPebble(x, z, chunk)
    }
    // Bones in swamp
    if (chunk.biome === 'swamp' && rng() < 0.45) {
      const x = cx * CHUNK_SIZE + 4 + rng() * (CHUNK_SIZE - 8)
      const z = cz * CHUNK_SIZE + 4 + rng() * (CHUNK_SIZE - 8)
      addBones(x, z, chunk)
    }
  }

  // Update streaming around player
  function updateChunks() {
    const { cx, cz } = worldToChunk(playerX, playerZ)
    for (let dcx = -CHUNK_RADIUS; dcx <= CHUNK_RADIUS; dcx++) {
      for (let dcz = -CHUNK_RADIUS; dcz <= CHUNK_RADIUS; dcz++) {
        // Skip far corners for circular coverage
        if (dcx * dcx + dcz * dcz > (CHUNK_RADIUS + 0.5) * (CHUNK_RADIUS + 0.5)) continue
        ensureChunk(cx + dcx, cz + dcz)
      }
    }
  }

  // ── Tree builder ──
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x35200e, roughness: 0.95 })
  const pineMat  = new THREE.MeshStandardMaterial({ color: 0x1f3a1a, roughness: 0.85, flatShading: true })
  const pineMatDark = new THREE.MeshStandardMaterial({ color: 0x14281a, roughness: 0.9, flatShading: true })
  function buildTree(seed = 0) {
    const g = new THREE.Group()
    // Trunk - cylindrical, slightly tapered
    const trunkH = 1.7 + (seed % 5) * 0.15
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.27, trunkH, 6), trunkMat)
    trunk.position.y = trunkH / 2
    trunk.castShadow = true
    trunk.receiveShadow = true
    g.add(trunk)
    // Three stacked cones for pine canopy
    const layers = 3
    let yBase = trunkH * 0.55
    for (let i = 0; i < layers; i++) {
      const t = i / (layers - 1)
      const r = 1.2 * (1 - t * 0.55)
      const h = 1.2
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(r, h, 7),
        i === 1 ? pineMatDark : pineMat
      )
      cone.position.y = yBase + h * 0.45
      cone.rotation.y = (seed * 0.7 + i) % (Math.PI * 2)
      cone.castShadow = true
      yBase += h * 0.7
      g.add(cone)
    }
    outlineGroup(g, 0.04)
    return g
  }

  // ── Grass tuft ──
  const grassMat = new THREE.MeshStandardMaterial({ color: 0x6c7a32, roughness: 0.9, flatShading: true })
  function buildGrass() {
    const g = new THREE.Group()
    // Cluster of 5 cones
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + Math.random() * 0.3
      const r = 0.12 + Math.random() * 0.05
      const blade = new THREE.Mesh(new THREE.ConeGeometry(0.10 + Math.random() * 0.03, 0.45 + Math.random() * 0.15, 4), grassMat)
      blade.position.set(Math.cos(a) * r, 0.22, Math.sin(a) * r)
      blade.rotation.z = (Math.random() - 0.5) * 0.3
      blade.castShadow = true
      g.add(blade)
    }
    // Center blade
    const cb = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.5, 4), grassMat)
    cb.position.y = 0.25
    cb.castShadow = true
    g.add(cb)
    outlineGroup(g, 0.04)
    return g
  }

  // ── Berry bush ──
  const bushMat   = new THREE.MeshStandardMaterial({ color: 0x2a3a18, roughness: 0.9, flatShading: true })
  const berryMat  = new THREE.MeshStandardMaterial({ color: 0xc02520, roughness: 0.55, emissive: 0x401010, emissiveIntensity: 0.4 })
  function buildBerryBush() {
    const g = new THREE.Group()
    // 2-3 dark green blobs
    for (let i = 0; i < 3; i++) {
      const a = i * (Math.PI * 2 / 3)
      const r = 0.20
      const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.34, 0), bushMat)
      b.position.set(Math.cos(a) * r, 0.32, Math.sin(a) * r)
      b.scale.set(1, 0.9, 1)
      b.castShadow = true
      g.add(b)
    }
    // Berries (red dots scattered on top)
    for (let i = 0; i < 6; i++) {
      const a = Math.random() * Math.PI * 2
      const r = 0.18 + Math.random() * 0.18
      const berry = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 5), berryMat)
      berry.position.set(Math.cos(a) * r, 0.46 + Math.random() * 0.08, Math.sin(a) * r)
      berry.userData.noOutline = true
      g.add(berry)
    }
    outlineGroup(g, 0.05)
    return g
  }

  // ── Rock / flint ──
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x5a5a5a, roughness: 0.95, flatShading: true })
  const flintMat = new THREE.MeshStandardMaterial({ color: 0x202028, roughness: 0.6, flatShading: true })
  function buildRock(seed = 0) {
    const g = new THREE.Group()
    const bigGeo = new THREE.DodecahedronGeometry(0.55 + (seed % 3) * 0.06, 0)
    // Deform vertices slightly for natural look
    const posA = bigGeo.attributes.position
    for (let i = 0; i < posA.count; i++) {
      const x = posA.getX(i), y = posA.getY(i), z = posA.getZ(i)
      const n = 1 + 0.15 * Math.sin(x * 5 + seed) * Math.cos(z * 4 + y * 3)
      posA.setXYZ(i, x * n, y * n * 0.7, z * n)
    }
    bigGeo.computeVertexNormals()
    const big = new THREE.Mesh(bigGeo, rockMat)
    big.position.y = 0.35
    big.castShadow = true
    big.receiveShadow = true
    g.add(big)
    // Small flint chips
    for (let i = 0; i < 2; i++) {
      const a = Math.random() * Math.PI * 2
      const r = 0.4 + Math.random() * 0.15
      const chip = new THREE.Mesh(new THREE.TetrahedronGeometry(0.10), flintMat)
      chip.position.set(Math.cos(a) * r, 0.10, Math.sin(a) * r)
      chip.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3)
      chip.castShadow = true
      g.add(chip)
    }
    outlineGroup(g, 0.05)
    return g
  }

  // ── Twigs/sapling stump after tree harvest ──
  const stumpMat = new THREE.MeshStandardMaterial({ color: 0x3a2614, roughness: 0.95 })
  function buildStump() {
    const g = new THREE.Group()
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.30, 0.30, 8), stumpMat)
    s.position.y = 0.15
    s.castShadow = true
    s.receiveShadow = true
    g.add(s)
    outlineGroup(g, 0.04)
    return g
  }

  // ── Flower (decorative pickable - heals sanity) ──
  const flowerStemMat = new THREE.MeshStandardMaterial({ color: 0x5a7a32, roughness: 0.9 })
  function buildFlower() {
    const g = new THREE.Group()
    const colors = [0xff6688, 0xffdd55, 0xff8844, 0xc890ff, 0xffffff, 0xff4466]
    const col = colors[Math.floor(Math.random() * colors.length)]
    const petalMat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.7, emissive: col, emissiveIntensity: 0.15 })
    // Stem
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.35, 4), flowerStemMat)
    stem.position.y = 0.175
    g.add(stem)
    // 5 petals around a center
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2
      const petal = new THREE.Mesh(new THREE.SphereGeometry(0.075, 6, 5), petalMat)
      petal.scale.set(1, 0.4, 1)
      petal.position.set(Math.cos(a) * 0.08, 0.36, Math.sin(a) * 0.08)
      petal.userData.noOutline = true
      g.add(petal)
    }
    // Yellow center
    const ctr = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 5), new THREE.MeshStandardMaterial({ color: 0xffcc00, emissive: 0x886000, emissiveIntensity: 0.5 }))
    ctr.position.y = 0.37
    ctr.userData.noOutline = true
    g.add(ctr)
    return g
  }

  // ── Mushroom (pickable - small food) ──
  function buildMushroom() {
    const g = new THREE.Group()
    const isRed = Math.random() < 0.6
    const capMat = new THREE.MeshStandardMaterial({
      color: isRed ? 0xc02818 : 0xa07a40,
      roughness: 0.7,
      emissive: isRed ? 0x401008 : 0x201608,
      emissiveIntensity: 0.25,
    })
    const stalkMat = new THREE.MeshStandardMaterial({ color: 0xeae0c4, roughness: 0.85 })
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.10, 0.30, 7), stalkMat)
    stalk.position.y = 0.15
    stalk.castShadow = true
    g.add(stalk)
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), capMat)
    cap.position.y = 0.32
    cap.scale.y = 0.75
    cap.castShadow = true
    g.add(cap)
    // White spots if red
    if (isRed) {
      for (let i = 0; i < 4; i++) {
        const a = Math.random() * Math.PI * 2
        const r = Math.random() * 0.12
        const spot = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 4), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 }))
        spot.position.set(Math.cos(a) * r, 0.40 + Math.random() * 0.03, Math.sin(a) * r)
        spot.userData.noOutline = true
        g.add(spot)
      }
    }
    outlineGroup(g, 0.04)
    return g
  }

  // ── Dead tree (chopable, drops only wood, no canopy) ──
  function buildDeadTree(seed = 0) {
    const g = new THREE.Group()
    const trunkH = 2.4 + (seed % 4) * 0.2
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.30, trunkH, 6), new THREE.MeshStandardMaterial({ color: 0x2a1c12, roughness: 1.0 }))
    trunk.position.y = trunkH / 2
    trunk.castShadow = true
    g.add(trunk)
    // 3 gnarled branches
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + seed * 0.3
      const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.10, 0.9, 5), new THREE.MeshStandardMaterial({ color: 0x2a1c12, roughness: 1.0 }))
      branch.position.set(Math.cos(a) * 0.3, trunkH * 0.7, Math.sin(a) * 0.3)
      branch.rotation.z = Math.cos(a) * 0.9
      branch.rotation.x = Math.sin(a) * 0.9
      branch.castShadow = true
      g.add(branch)
    }
    outlineGroup(g, 0.04)
    return g
  }

  // ── Decorative boulder (non-harvestable, big landmark) ──
  function addBoulder(x, z, chunk) {
    const g = new THREE.Group()
    const scale = 1.8 + Math.random() * 1.2
    const geo = new THREE.DodecahedronGeometry(0.9, 0)
    // Deform
    const posA = geo.attributes.position
    for (let i = 0; i < posA.count; i++) {
      const px = posA.getX(i), py = posA.getY(i), pz = posA.getZ(i)
      const n = 1 + 0.2 * Math.sin(px * 3.7 + pz * 2.1) * Math.cos(py * 4)
      posA.setXYZ(i, px * n, py * n * 0.6, pz * n)
    }
    geo.computeVertexNormals()
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x6e6a64, roughness: 0.95, flatShading: true }))
    m.position.y = 0.6
    m.castShadow = true
    m.receiveShadow = true
    g.add(m)
    outlineGroup(g, 0.04)
    g.position.set(x, 0, z)
    g.scale.setScalar(scale)
    g.rotation.y = Math.random() * Math.PI * 2
    scene.add(g)
    chunk.decorations.push(g)
  }

  // ── Pond (decorative water pool) ──
  function addPond(x, z, chunk) {
    const r = 2.5 + Math.random() * 1.5
    const geo = new THREE.CircleGeometry(r, 24)
    geo.rotateX(-Math.PI / 2)
    const mat = new THREE.MeshStandardMaterial({
      color: 0x2c4a5a,
      roughness: 0.3,
      metalness: 0.4,
      emissive: 0x102030,
      emissiveIntensity: 0.25,
    })
    const pond = new THREE.Mesh(geo, mat)
    pond.position.set(x, 0.02, z)
    pond.userData.noOutline = true
    pond.userData.isPond = true
    scene.add(pond)
    chunk.decorations.push(pond)
    // Reed/cattails around
    const reedMat = new THREE.MeshStandardMaterial({ color: 0x3a4a20, roughness: 0.9 })
    const reedCnt = 4 + Math.floor(Math.random() * 4)
    for (let i = 0; i < reedCnt; i++) {
      const a = (i / reedCnt) * Math.PI * 2 + Math.random() * 0.3
      const px = x + Math.cos(a) * (r * 1.05)
      const pz = z + Math.sin(a) * (r * 1.05)
      const reed = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.7, 4), reedMat)
      reed.position.set(px, 0.35, pz)
      reed.rotation.z = (Math.random() - 0.5) * 0.3
      reed.castShadow = true
      scene.add(reed)
      chunk.decorations.push(reed)
    }
  }

  // ── Pebble (tiny decoration on ground) ──
  function addPebble(x, z, chunk) {
    const geo = new THREE.DodecahedronGeometry(0.08 + Math.random() * 0.06, 0)
    const mat = new THREE.MeshStandardMaterial({ color: 0x767068 + Math.random() * 0x101010, roughness: 0.95, flatShading: true })
    const m = new THREE.Mesh(geo, mat)
    m.position.set(x, 0.04, z)
    m.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3)
    m.userData.noOutline = true
    m.castShadow = true
    scene.add(m)
    chunk.decorations.push(m)
  }

  // ── Bones (skull / ribs scattered in swamp) ──
  function addBones(x, z, chunk) {
    const boneMat = new THREE.MeshStandardMaterial({ color: 0xe8dfc4, roughness: 0.8 })
    const g = new THREE.Group()
    // Skull
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 7), boneMat)
    skull.scale.set(1, 0.85, 1.15)
    skull.position.set(0, 0.16, 0)
    skull.castShadow = true
    g.add(skull)
    // Eye sockets
    const socketMat = new THREE.MeshBasicMaterial({ color: 0x05050a, fog: false })
    const sL = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 5), socketMat)
    sL.position.set(-0.06, 0.20, 0.16); sL.userData.noOutline = true
    g.add(sL)
    const sR = sL.clone(); sR.position.x = 0.06; g.add(sR)
    // 2 ribs
    for (let i = 0; i < 3; i++) {
      const rib = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.022, 4, 10, Math.PI), boneMat)
      rib.position.set(0.35 + i * 0.12, 0.06, 0.04 * (i % 2))
      rib.rotation.x = Math.PI / 2
      rib.rotation.z = 0.15
      g.add(rib)
    }
    outlineGroup(g, 0.04)
    g.position.set(x, 0, z)
    g.rotation.y = Math.random() * Math.PI * 2
    scene.add(g)
    chunk.decorations.push(g)
  }

  function addResource(kind, x, z) {
    let model
    const seed = Math.floor(Math.random() * 100)
    switch (kind) {
      case 'tree':     model = buildTree(seed); break
      case 'grass':    model = buildGrass(); break
      case 'berry':    model = buildBerryBush(); break
      case 'rock':     model = buildRock(seed); break
      case 'flower':   model = buildFlower(); break
      case 'mushroom': model = buildMushroom(); break
      case 'deadtree': model = buildDeadTree(seed); break
      default: return
    }
    model.position.set(x, 0, z)
    model.rotation.y = Math.random() * Math.PI * 2
    scene.add(model)
    const res = {
      kind, x, z, model,
      hp: kind === 'tree' ? 5 : kind === 'rock' ? 6 : kind === 'deadtree' ? 3 : 1,
      maxHp: kind === 'tree' ? 5 : kind === 'rock' ? 6 : kind === 'deadtree' ? 3 : 1,
      active: true,
      shakeT: 0,
      regrowT: 0,
      stage: 'full',
      stumpModel: null,
    }
    resources.push(res)
    return res
  }

  // Initial world: generate chunks around origin (will continue streaming each tick)
  for (let dcx = -2; dcx <= 2; dcx++) {
    for (let dcz = -2; dcz <= 2; dcz++) {
      ensureChunk(dcx, dcz)
    }
  }

  // ─── Campfires (placed by player) ──────────────────────────────────────────
  const campfires = []
  const logMat = new THREE.MeshStandardMaterial({ color: 0x3a2210, roughness: 0.95 })
  const fireMat = new THREE.MeshBasicMaterial({ color: 0xff7a22, transparent: true, opacity: 1 })
  function buildCampfire() {
    const g = new THREE.Group()
    // Stone ring
    const ringMat = new THREE.MeshStandardMaterial({ color: 0x4a4a4a, roughness: 0.95, flatShading: true })
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2
      const r = 0.55
      const s = new THREE.Mesh(new THREE.DodecahedronGeometry(0.16, 0), ringMat)
      s.position.set(Math.cos(a) * r, 0.10, Math.sin(a) * r)
      s.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3)
      s.castShadow = true
      g.add(s)
    }
    // Crossed logs
    for (let i = 0; i < 3; i++) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.85, 6), logMat)
      log.rotation.z = Math.PI / 2
      log.rotation.y = (i / 3) * Math.PI * 2
      log.position.y = 0.22
      log.castShadow = true
      g.add(log)
    }
    outlineGroup(g, 0.05)
    // Flame (no outline — emissive, glowing)
    const flameGroup = new THREE.Group()
    flameGroup.position.y = 0.4
    for (let i = 0; i < 3; i++) {
      const flame = new THREE.Mesh(
        new THREE.ConeGeometry(0.22 - i * 0.05, 0.6 - i * 0.12, 5),
        new THREE.MeshBasicMaterial({
          color: i === 0 ? 0xff5510 : i === 1 ? 0xffa030 : 0xffe070,
          transparent: true, opacity: 0.95, fog: false,
        })
      )
      flame.position.y = 0.18 + i * 0.05
      flame.userData.noOutline = true
      flame.userData.flameIdx = i
      flameGroup.add(flame)
    }
    g.add(flameGroup)
    g.userData.flameGroup = flameGroup
    return g
  }
  function placeCampfire(x, z) {
    const model = buildCampfire()
    model.position.set(x, 0, z)
    scene.add(model)
    // Add point light for warm glow
    const light = new THREE.PointLight(0xff8030, 4.0, 12, 1.5)
    light.position.set(x, 1.2, z)
    light.castShadow = true
    light.shadow.mapSize.set(512, 512)
    scene.add(light)
    campfires.push({ x, z, model, light, life: CAMPFIRE_LIFETIME, maxLife: CAMPFIRE_LIFETIME })
  }

  // ─── Shadow Creatures (spawn at night when sanity low) ──────────────────────
  const creatures = []
  const shadowMat = new THREE.MeshBasicMaterial({ color: 0x05030a, transparent: true, opacity: 0.92, fog: false })
  function buildShadowCreature() {
    const g = new THREE.Group()
    // Wispy body — distorted blob
    const body = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45, 1), shadowMat)
    body.position.y = 0.7
    g.add(body)
    // Spike ears
    const earL = new THREE.Mesh(new THREE.ConeGeometry(0.10, 0.4, 4), shadowMat)
    earL.position.set(-0.15, 1.15, 0); earL.rotation.z = 0.3
    g.add(earL)
    const earR = new THREE.Mesh(new THREE.ConeGeometry(0.10, 0.4, 4), shadowMat)
    earR.position.set(0.15, 1.15, 0); earR.rotation.z = -0.3
    g.add(earR)
    // Red glowing eyes
    const redMat = new THREE.MeshBasicMaterial({ color: 0xff2020, fog: false })
    const eyeGeo2 = new THREE.SphereGeometry(0.045, 6, 5)
    const eL = new THREE.Mesh(eyeGeo2, redMat); eL.position.set(-0.10, 0.78, 0.36); eL.userData.noOutline = true
    g.add(eL)
    const eR = new THREE.Mesh(eyeGeo2, redMat); eR.position.set(0.10, 0.78, 0.36); eR.userData.noOutline = true
    g.add(eR)
    // Floating arms (long thin tentacles)
    const armMat = shadowMat
    const aL = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.03, 0.7, 4), armMat)
    aL.position.set(-0.4, 0.6, 0); aL.rotation.z = 0.4
    g.add(aL)
    const aR = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.03, 0.7, 4), armMat)
    aR.position.set(0.4, 0.6, 0); aR.rotation.z = -0.4
    g.add(aR)
    return g
  }
  function spawnShadowCreature() {
    const model = buildShadowCreature()
    // Spawn at edge of vision
    const a = Math.random() * Math.PI * 2
    const r = 14 + Math.random() * 6
    const x = playerX + Math.cos(a) * r
    const z = playerZ + Math.sin(a) * r
    model.position.set(x, 0.05, z)
    scene.add(model)
    creatures.push({
      model, x, z,
      hp: 3, alive: true, life: 0,
      attackCD: 0,
    })
  }

  // ─── Particle Systems ───────────────────────────────────────────────────────
  const chipsPS = new ParticleSystem(scene, {
    maxParticles: 200,
    geometry: new THREE.BoxGeometry(0.08, 0.08, 0.08),
    material: new THREE.MeshStandardMaterial({ color: 0x9a7a4a, roughness: 0.85 }),
  })
  const sparkPS = new ParticleSystem(scene, {
    maxParticles: 200,
    geometry: new THREE.SphereGeometry(0.05, 4, 4),
    material: new THREE.MeshBasicMaterial({ color: 0xffaa44, transparent: true, opacity: 0.95, fog: false }),
  })
  const leafPS = new ParticleSystem(scene, {
    maxParticles: 200,
    geometry: new THREE.PlaneGeometry(0.18, 0.18),
    material: new THREE.MeshStandardMaterial({ color: 0x2f5a22, side: THREE.DoubleSide, roughness: 0.95 }),
  })
  const dustPS = new ParticleSystem(scene, {
    maxParticles: 100,
    geometry: new THREE.SphereGeometry(0.06, 4, 4),
    material: new THREE.MeshBasicMaterial({ color: 0x666644, transparent: true, opacity: 0.7, fog: false }),
  })

  const shake = new ScreenShake(camera)
  const flash = new Flash()

  // ─── Game State ─────────────────────────────────────────────────────────────
  let state = 'menu' // 'menu' | 'playing' | 'dead'
  let paused = false
  let viewMode = 'third' // 'third' (top-down iso) | 'first' (FPS)
  let disposed = false
  let raf = 0
  let globalTime = 0
  let gameTime = 0
  let dayCount = 1

  // Stats
  let health = MAX_HEALTH
  let hunger = MAX_HUNGER
  let sanity = MAX_SANITY

  // Inventory
  const inv = { wood: 0, grass: 0, berry: 0, stone: 0, flint: 0, flower: 0, mushroom: 0 }

  // ─── HUD ────────────────────────────────────────────────────────────────────
  const hud = new HUDLayer(container)
  const hpText = hud.text({ top: 20, left: 20, font: 'bold 22px Georgia, serif', color: '#f8e8c0', shadow: '0 2px 6px rgba(0,0,0,0.7)' })
  const hungerText = hud.text({ top: 50, left: 20, font: 'bold 22px Georgia, serif', color: '#f8e8c0', shadow: '0 2px 6px rgba(0,0,0,0.7)' })
  const sanityText = hud.text({ top: 80, left: 20, font: 'bold 22px Georgia, serif', color: '#f8e8c0', shadow: '0 2px 6px rgba(0,0,0,0.7)' })
  const dayText = hud.text({ top: 20, hCenter: true, font: 'bold 24px Georgia, serif', color: '#fbe7b3', shadow: '0 2px 8px rgba(0,0,0,0.7)' })
  const invText = hud.text({ bottom: 70, hCenter: true, font: '17px Georgia, serif', color: '#f0e0b0', shadow: '0 2px 6px rgba(0,0,0,0.7)' })
  const hintText = hud.text({ bottom: 20, hCenter: true, font: '14px Georgia, serif', color: 'rgba(255,240,200,0.6)', shadow: '0 1px 4px rgba(0,0,0,0.6)' })
  const tooltipText = hud.text({ hCenter: true, top: 140, font: 'bold 18px Georgia, serif', color: '#fff8d0', shadow: '0 2px 8px rgba(0,0,0,0.85)' })
  tooltipText.hide()
  hintText.set('WASD move · V view · Click attack · F pick · Q eat 🍓 · E eat 🍄 · B build · R restart')

  function fmtBar(label, val, max, emojis) {
    const pct = Math.max(0, val / max)
    const filled = Math.round(pct * 10)
    const bar = emojis.full.repeat(filled) + emojis.empty.repeat(10 - filled)
    return `${label} ${bar} ${Math.ceil(val)}`
  }

  function updateHUD() {
    hpText.set(fmtBar('♥', health, MAX_HEALTH, { full: '█', empty: '░' }))
    hungerText.set(fmtBar('🍗', hunger, MAX_HUNGER, { full: '█', empty: '░' }))
    sanityText.set(fmtBar('☼', sanity, MAX_SANITY, { full: '█', empty: '░' }))
    dayText.set(`Day ${dayCount} — ${phaseName}`)
    invText.set(
      `🪵${inv.wood}  🌾${inv.grass}  🪨${inv.stone}  ⚡${inv.flint}  ` +
      `| 🍓${inv.berry} (Q)  🍄${inv.mushroom || 0} (E)  🌸${inv.flower || 0}`
    )
  }

  function showTooltip(text, ms = 1600) {
    tooltipText.set(text)
    tooltipText.show()
    if (showTooltip._t) clearTimeout(showTooltip._t)
    showTooltip._t = setTimeout(() => tooltipText.hide(), ms)
  }

  // ─── Day/Night Cycle ────────────────────────────────────────────────────────
  let phaseName = 'Day'
  let darkness = 0   // 0 = full day, 1 = full night

  function updateCycle() {
    const t = gameTime % FULL_CYCLE
    let d = 0
    if (t < DAY_LENGTH) { phaseName = 'Day'; d = 0 }
    else if (t < DAY_LENGTH + DUSK_LENGTH) {
      const k = (t - DAY_LENGTH) / DUSK_LENGTH
      phaseName = 'Dusk'; d = k
    } else if (t < DAY_LENGTH + DUSK_LENGTH + NIGHT_LENGTH) {
      phaseName = 'Night'; d = 1
    } else {
      const k = (t - DAY_LENGTH - DUSK_LENGTH - NIGHT_LENGTH) / DAWN_LENGTH
      phaseName = 'Dawn'; d = 1 - k
    }
    darkness = d
    dayCount = Math.floor(gameTime / FULL_CYCLE) + 1

    // Update sky / lighting
    const skyDay = new THREE.Color(0xc8c688)
    const skyNight = new THREE.Color(0x1a2030)
    scene.background.copy(skyDay).lerp(skyNight, d)
    scene.fog.color.copy(scene.background)
    scene.fog.near = 55 - d * 18
    scene.fog.far = 130 - d * 45

    // Sun stays strong by day, dims gracefully — never goes fully black
    sunLight.intensity = 1.85 * (1 - d * 0.75) + 0.15
    sunLight.color.setRGB(1.0 - d * 0.25, 0.95 - d * 0.35, 0.82 - d * 0.3)
    ambLight.intensity = 1.05 * (1 - d * 0.55) + 0.35
    hemiLight.intensity = 0.7 * (1 - d * 0.4) + 0.25

    // Vignette darkness — max 0.5 at midnight (was 0.78 → too dark)
    fxMat.uniforms.uDarkness.value = d * 0.5
  }

  // ─── Input ──────────────────────────────────────────────────────────────────
  const keys = {}
  function onKeyDown(e) {
    keys[e.code] = true
    if (e.code === 'KeyR' && state === 'dead') startGame()
    if (e.code === 'KeyF' || e.code === 'Space') {
      if (state === 'playing') tryHarvestNearest()
      e.preventDefault()
    }
    if (e.code === 'KeyB' && state === 'playing') openBuildMenu()
    if (e.code === 'KeyQ' && state === 'playing') eatBerry()
    if (e.code === 'KeyE' && state === 'playing') eatMushroom()
    if (e.code === 'Digit1' && state === 'playing') eatBerry()
    if (e.code === 'KeyV') {
      viewMode = viewMode === 'third' ? 'first' : 'third'
      showTooltip(viewMode === 'first' ? '👁 First-person (WS=forward/back, AD=turn)' : '🗺 Third-person', 1800)
    }
  }
  function onKeyUp(e) { keys[e.code] = false }

  let mouseDown = false
  function onMouseDown(e) {
    if (e.button !== 0) return
    if (state !== 'playing') return
    mouseDown = true
    tryAttack()
  }
  function onMouseUp() { mouseDown = false }

  // Convert mouse position to world point (via ground plane intersection)
  const raycaster = new THREE.Raycaster()
  const mouse = new THREE.Vector2()
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
  const mouseWorld = new THREE.Vector3()
  function onMouseMove(e) {
    const rect = renderer.domElement.getBoundingClientRect()
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
    raycaster.setFromCamera(mouse, camera)
    raycaster.ray.intersectPlane(groundPlane, mouseWorld)
  }

  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  renderer.domElement.addEventListener('pointerdown', onMouseDown)
  window.addEventListener('pointerup', onMouseUp)
  renderer.domElement.addEventListener('pointermove', onMouseMove)

  // ─── Harvest / Attack ───────────────────────────────────────────────────────
  function findClosestResource(maxRange) {
    let best = null
    let bestD = maxRange * maxRange
    for (const r of resources) {
      if (!r.active) continue
      const dx = r.x - playerX, dz = r.z - playerZ
      const d = dx * dx + dz * dz
      if (d < bestD) { best = r; bestD = d }
    }
    return best
  }

  function findClosestCreature(maxRange) {
    let best = null
    let bestD = maxRange * maxRange
    for (const c of creatures) {
      if (!c.alive) continue
      const dx = c.x - playerX, dz = c.z - playerZ
      const d = dx * dx + dz * dz
      if (d < bestD) { best = c; bestD = d }
    }
    return best
  }

  function tryAttack() {
    if (!attackCooldown.ready) return
    attackCooldown.reset()

    // In first-person attack in the direction we're already facing.
    // In third-person face the cursor (click-to-attack).
    if (viewMode === 'third') {
      const dx = mouseWorld.x - playerX
      const dz = mouseWorld.z - playerZ
      playerFacing = Math.atan2(dx, dz)
    }
    attackSwing = 1.0

    // Hit creature first
    const creature = findClosestCreature(2.0)
    if (creature) {
      const angle = Math.atan2(creature.x - playerX, creature.z - playerZ)
      const facingDelta = Math.abs(((angle - playerFacing + Math.PI * 3) % (Math.PI * 2)) - Math.PI)
      if (facingDelta < 1.2) {
        creature.hp -= 1
        if (creature.hp <= 0) creature.alive = false
        sparkPS.burst({
          position: { x: creature.x, y: 0.7, z: creature.z },
          count: 10, speed: [3, 6], lifetime: [0.3, 0.6],
          size: [0.6, 1.2], color: 0x6a3070, gravity: -4, spread: Math.PI,
        })
        shake.add({ amplitude: 0.18, duration: 0.18, frequency: 22 })
        return
      }
    }

    // Hit resource
    const res = findClosestResource(INTERACT_RANGE)
    if (res) hitResource(res)
  }

  function tryHarvestNearest() {
    const res = findClosestResource(INTERACT_RANGE)
    if (!res) { showTooltip('Nothing in reach'); return }
    if (res.kind === 'grass' || res.kind === 'berry') {
      // Free-pick — no damage needed
      hitResource(res, res.hp + 10)
    } else {
      hitResource(res)
    }
  }

  function hitResource(res, damage = 1) {
    res.hp -= damage
    res.shakeT = 0.4
    // Chip burst
    if (res.kind === 'tree') {
      chipsPS.burst({
        position: { x: res.x, y: 1.0, z: res.z }, count: 6,
        speed: [2, 4], lifetime: [0.5, 1.0], size: [0.6, 1.0],
        color: 0x9a7a4a, gravity: -10, spread: Math.PI * 0.7,
      })
    } else if (res.kind === 'rock') {
      dustPS.burst({
        position: { x: res.x, y: 0.4, z: res.z }, count: 8,
        speed: [1.5, 3.5], lifetime: [0.4, 0.8], size: [0.5, 1.0],
        color: 0x888866, gravity: -8, spread: Math.PI * 0.6,
      })
      shake.add({ amplitude: 0.08, duration: 0.12, frequency: 18 })
    }
    if (res.hp <= 0) harvestResource(res)
  }

  function harvestResource(res) {
    res.active = false
    let dropMsg = ''
    if (res.kind === 'tree') {
      const wood = 2 + Math.floor(Math.random() * 2)
      inv.wood += wood
      dropMsg = `+${wood} 🪵`
      // Leaves burst
      leafPS.burst({
        position: { x: res.x, y: 2.0, z: res.z }, count: 15,
        speed: [1, 3], lifetime: [1.0, 2.0], size: [0.6, 1.4],
        color: 0x335a22, gravity: -2, drag: 0.5, spread: Math.PI * 0.8,
      })
      // Replace with stump (regrows after time)
      const stump = buildStump()
      stump.position.set(res.x, 0, res.z)
      stump.rotation.y = Math.random() * Math.PI * 2
      scene.add(stump)
      res.stumpModel = stump
      scene.remove(res.model)
      res.regrowT = 60 + Math.random() * 30
      res.stage = 'stump'
      shake.add({ amplitude: 0.18, duration: 0.25, frequency: 16 })
    } else if (res.kind === 'grass') {
      inv.grass += 1
      dropMsg = '+1 🌾'
      scene.remove(res.model)
      res.regrowT = 50 + Math.random() * 30
      res.stage = 'gone'
    } else if (res.kind === 'berry') {
      const berries = 2 + Math.floor(Math.random() * 2)
      inv.berry += berries
      dropMsg = `+${berries} 🍓`
      // Just remove berries — bush remains and regrows
      res.model.children.forEach(c => {
        if (c.material === berryMat) c.visible = false
      })
      res.regrowT = 45 + Math.random() * 20
      res.stage = 'picked'
    } else if (res.kind === 'rock') {
      const stones = 2 + Math.floor(Math.random() * 2)
      const flint = Math.random() < 0.55 ? 1 : 0
      inv.stone += stones
      inv.flint += flint
      dropMsg = flint > 0 ? `+${stones} 🪨 +1 ⚡` : `+${stones} 🪨`
      scene.remove(res.model)
      res.regrowT = 90 + Math.random() * 40
      res.stage = 'gone'
    } else if (res.kind === 'flower') {
      inv.flower = (inv.flower || 0) + 1
      sanity = Math.min(MAX_SANITY, sanity + 5)
      dropMsg = '+1 🌸  +5 ☼'
      scene.remove(res.model)
      res.regrowT = 80 + Math.random() * 40
      res.stage = 'gone'
    } else if (res.kind === 'mushroom') {
      inv.mushroom = (inv.mushroom || 0) + 1
      dropMsg = '+1 🍄'
      scene.remove(res.model)
      res.regrowT = 60 + Math.random() * 30
      res.stage = 'gone'
    } else if (res.kind === 'deadtree') {
      const wood = 1 + Math.floor(Math.random() * 2)
      inv.wood += wood
      dropMsg = `+${wood} 🪵`
      // Tree falls — particles
      chipsPS.burst({
        position: { x: res.x, y: 1.5, z: res.z }, count: 12,
        speed: [2, 4], lifetime: [0.8, 1.4], size: [0.6, 1.2],
        color: 0x4a3220, gravity: -10, spread: Math.PI * 0.7,
      })
      scene.remove(res.model)
      res.regrowT = 9999 // dead trees don't regrow
      res.stage = 'gone'
      shake.add({ amplitude: 0.14, duration: 0.18, frequency: 16 })
    }
    showTooltip(dropMsg)
  }

  function tickResources(dt) {
    for (const res of resources) {
      // Visual shake when hit
      if (res.shakeT > 0) {
        res.shakeT -= dt
        const s = Math.sin(globalTime * 60) * res.shakeT * 0.5
        const m = res.model || res.stumpModel
        if (m) m.rotation.z = s
      } else if (res.model && res.model.rotation.z !== 0) {
        res.model.rotation.z *= 0.9
      }

      // Regrow logic
      if (!res.active && res.regrowT > 0) {
        res.regrowT -= dt
        if (res.regrowT <= 0) regrow(res)
      }
    }
  }

  function regrow(res) {
    if (res.kind === 'tree') {
      if (res.stumpModel) { scene.remove(res.stumpModel); res.stumpModel = null }
      const model = buildTree(Math.floor(Math.random() * 100))
      model.position.set(res.x, 0, res.z)
      model.rotation.y = Math.random() * Math.PI * 2
      // Start small, grow
      model.scale.setScalar(0.2)
      scene.add(model)
      res.model = model
      const growIv = setInterval(() => {
        if (model.scale.x >= 1) { clearInterval(growIv); return }
        model.scale.multiplyScalar(1.05)
      }, 60)
    } else if (res.kind === 'grass') {
      const model = buildGrass()
      model.position.set(res.x, 0, res.z)
      model.rotation.y = Math.random() * Math.PI * 2
      scene.add(model)
      res.model = model
    } else if (res.kind === 'berry') {
      res.model.children.forEach(c => {
        if (c.material === berryMat) c.visible = true
      })
    } else if (res.kind === 'rock') {
      const model = buildRock(Math.floor(Math.random() * 100))
      model.position.set(res.x, 0, res.z)
      model.rotation.y = Math.random() * Math.PI * 2
      scene.add(model)
      res.model = model
    } else if (res.kind === 'flower') {
      const model = buildFlower()
      model.position.set(res.x, 0, res.z)
      model.rotation.y = Math.random() * Math.PI * 2
      scene.add(model)
      res.model = model
    } else if (res.kind === 'mushroom') {
      const model = buildMushroom()
      model.position.set(res.x, 0, res.z)
      model.rotation.y = Math.random() * Math.PI * 2
      scene.add(model)
      res.model = model
    } else if (res.kind === 'deadtree') {
      return // dead trees stay gone
    }
    res.hp = res.maxHp
    res.active = true
    res.stage = 'full'
  }

  // ─── Eat Functions ──────────────────────────────────────────────────────────
  function eatBerry() {
    if (inv.berry <= 0) { showTooltip('No berries 🍓'); return }
    inv.berry -= 1
    hunger = Math.min(MAX_HUNGER, hunger + 18)
    health = Math.min(MAX_HEALTH, health + 3)
    showTooltip('+18 🍗  +3 ♥')
    sparkPS.burst({
      position: { x: playerX, y: 1.4, z: playerZ }, count: 6,
      speed: [1, 2], lifetime: [0.3, 0.6], size: [0.4, 0.8],
      color: 0xff6a55, gravity: -3, spread: Math.PI * 0.5,
    })
    // Bear chomp animation: arm raises briefly
    attackSwing = Math.max(attackSwing, 0.6)
  }
  function eatMushroom() {
    if ((inv.mushroom || 0) <= 0) { showTooltip('No mushrooms 🍄'); return }
    inv.mushroom -= 1
    hunger = Math.min(MAX_HUNGER, hunger + 25)
    // Random sanity effect — some mushrooms are unsafe
    const sanityRoll = (Math.random() - 0.4) * 12 // -4.8 to +7.2
    sanity = Math.max(0, Math.min(MAX_SANITY, sanity + sanityRoll))
    const sanityTxt = sanityRoll > 0 ? `+${sanityRoll.toFixed(0)} ☼` : `${sanityRoll.toFixed(0)} ☼`
    showTooltip(`+25 🍗  ${sanityTxt}`)
    sparkPS.burst({
      position: { x: playerX, y: 1.4, z: playerZ }, count: 6,
      speed: [1, 2], lifetime: [0.3, 0.6], size: [0.4, 0.8],
      color: 0xaa6644, gravity: -3, spread: Math.PI * 0.5,
    })
    attackSwing = Math.max(attackSwing, 0.6)
  }

  // ─── Build Menu ─────────────────────────────────────────────────────────────
  let buildPanel = null
  function openBuildMenu() {
    if (buildPanel) return
    const canBuild = inv.wood >= 2 && inv.stone >= 1
    const bodyEl = document.createElement('div')
    bodyEl.style.cssText = 'text-align:left; line-height:1.6; font-size:14px; padding:8px;'
    bodyEl.innerHTML = `
      <div style="margin-bottom:8px; font-weight:700;">🔥 Campfire</div>
      <div>Cost: 2 🪵 + 1 🪨</div>
      <div style="margin-top:4px; opacity:0.7;">Lights the night and restores sanity.</div>
      <div style="margin-top:10px;">You have: ${inv.wood} 🪵 · ${inv.stone} 🪨</div>
    `
    buildPanel = new GlassPanel({
      title: 'Build',
      body: bodyEl,
      buttons: [
        canBuild ? { label: 'Build Campfire', style: 'primary', onClick: () => { closeBuildMenu(); doBuildCampfire() } } : { label: '(Need 2🪵 + 1🪨)', style: 'secondary', onClick: () => {} },
        { label: 'Cancel', onClick: closeBuildMenu },
      ],
      width: 320,
    })
    container.appendChild(buildPanel.el)
  }
  function closeBuildMenu() {
    if (buildPanel) { buildPanel.dispose(); buildPanel = null }
  }
  function doBuildCampfire() {
    if (inv.wood < 2 || inv.stone < 1) return
    inv.wood -= 2; inv.stone -= 1
    // Place at player position, offset forward by 1.2
    const px = playerX + Math.sin(playerFacing) * 1.2
    const pz = playerZ + Math.cos(playerFacing) * 1.2
    placeCampfire(px, pz)
    showTooltip('🔥 Campfire lit!')
    shake.add({ amplitude: 0.1, duration: 0.2, frequency: 14 })
  }

  // ─── Game flow ──────────────────────────────────────────────────────────────
  let menuPanel = null
  let gameOverPanel = null

  function showMenu() {
    state = 'menu'
    menuPanel = new GlassPanel({
      title: "Don't Starve",
      subtitle: '🐻 Bear in the Wilderness',
      body: 'A lost black bear in an endless hostile wilderness. Roam the plains, forests, swamps and rocky lands. Gather wood and food, build fire, and survive the night.\n\nQ to eat berry  ·  E to eat mushroom  ·  F to pick',
      buttons: [{ label: 'Begin', style: 'primary', onClick: startGame }],
      width: 380,
    })
    container.appendChild(menuPanel.el)
  }

  function startGame() {
    if (menuPanel) { menuPanel.dispose(); menuPanel = null }
    if (gameOverPanel) { gameOverPanel.dispose(); gameOverPanel = null }
    if (buildPanel) closeBuildMenu()
    // Reset state
    health = MAX_HEALTH; hunger = MAX_HUNGER; sanity = MAX_SANITY
    inv.wood = 0; inv.grass = 0; inv.berry = 0; inv.stone = 0; inv.flint = 0; inv.flower = 0; inv.mushroom = 0
    playerX = 0; playerZ = 0; playerVX = 0; playerVZ = 0
    gameTime = 0
    dayCount = 1
    // Clean creatures
    for (const c of creatures) { if (c.model.parent) scene.remove(c.model) }
    creatures.length = 0
    // Clean campfires
    for (const cf of campfires) {
      if (cf.model.parent) scene.remove(cf.model)
      if (cf.light.parent) scene.remove(cf.light)
    }
    campfires.length = 0
    // Wipe world and regenerate around origin
    for (const r of resources) {
      if (r.model && r.model.parent) scene.remove(r.model)
      if (r.stumpModel && r.stumpModel.parent) scene.remove(r.stumpModel)
    }
    resources.length = 0
    for (const [, ch] of chunks) {
      for (const d of ch.decorations) {
        if (d.parent) scene.remove(d)
      }
    }
    for (const p of biomePatches) {
      if (p.parent) scene.remove(p)
    }
    biomePatches.length = 0
    chunks.clear()
    for (let dcx = -2; dcx <= 2; dcx++) {
      for (let dcz = -2; dcz <= 2; dcz++) {
        ensureChunk(dcx, dcz)
      }
    }
    state = 'playing'
    updateHUD()
  }

  function gameOver(reason) {
    if (state === 'dead') return
    state = 'dead'
    const bodyEl = document.createElement('div')
    bodyEl.style.cssText = 'text-align:center; line-height:1.7; font-size:15px;'
    bodyEl.innerHTML = `
      <div style="font-size:32px; margin-bottom:8px;">☠</div>
      <div style="font-weight:700; margin-bottom:10px;">${reason}</div>
      <div>You survived <b>${dayCount}</b> day${dayCount !== 1 ? 's' : ''}.</div>
      <div style="margin-top:6px; opacity:0.7;">🪵 ${inv.wood} · 🌾 ${inv.grass} · 🍓 ${inv.berry} · 🪨 ${inv.stone} · ⚡ ${inv.flint}</div>
    `
    gameOverPanel = new GlassPanel({
      title: 'You Have Perished',
      body: bodyEl,
      buttons: [{ label: 'Try Again', style: 'primary', onClick: startGame }],
      width: 360,
    })
    container.appendChild(gameOverPanel.el)
  }

  // ─── Update ─────────────────────────────────────────────────────────────────
  const clock = new THREE.Clock()
  let cycleAcc = 0

  function tickPlayer(dt) {
    const speed = PLAYER_SPEED * (1 - Math.max(0, (MAX_HUNGER - hunger) / MAX_HUNGER) * 0.25)
    let movingLen = 0

    if (viewMode === 'first') {
      // FPS controls: W/S = forward/back along facing, A/D = turn
      let forward = 0, turn = 0
      if (keys.KeyW || keys.ArrowUp)    forward += 1
      if (keys.KeyS || keys.ArrowDown)  forward -= 1
      if (keys.KeyA || keys.ArrowLeft)  turn -= 1
      if (keys.KeyD || keys.ArrowRight) turn += 1
      playerFacing -= turn * dt * 2.5  // turn rate rad/s
      // Wrap facing
      playerFacing = (playerFacing + Math.PI * 3) % (Math.PI * 2) - Math.PI
      const dx = Math.sin(playerFacing) * forward
      const dz = Math.cos(playerFacing) * forward
      playerX += dx * speed * dt
      playerZ += dz * speed * dt
      movingLen = Math.abs(forward)
    } else {
      // Third-person: world-space WASD
      let dx = 0, dz = 0
      if (keys.KeyW || keys.ArrowUp)    dz -= 1
      if (keys.KeyS || keys.ArrowDown)  dz += 1
      if (keys.KeyA || keys.ArrowLeft)  dx -= 1
      if (keys.KeyD || keys.ArrowRight) dx += 1
      const len = Math.hypot(dx, dz)
      if (len > 0) {
        dx /= len; dz /= len
        playerFacing = Math.atan2(dx, dz)
      }
      playerX += dx * speed * dt
      playerZ += dz * speed * dt
      movingLen = len
    }

    if (movingLen > 0) walkPhase += dt * 8
    else walkPhase *= 0.9

    playerGroup.position.set(playerX, 0, playerZ)
    playerGroup.rotation.y = playerFacing
    // Hide bear in first-person to avoid camera-inside-head clipping
    playerGroup.visible = (viewMode === 'third')

    // Walk anim
    const walkAmp = (movingLen > 0 ? 1 : 0)
    legPivotL.rotation.x = Math.sin(walkPhase) * 0.6 * walkAmp
    legPivotR.rotation.x = -Math.sin(walkPhase) * 0.6 * walkAmp
    armPivotL.rotation.x = -Math.sin(walkPhase) * 0.45 * walkAmp
    armPivotR.rotation.x = Math.sin(walkPhase) * 0.45 * walkAmp

    // Attack swing animation
    if (attackSwing > 0) {
      attackSwing = Math.max(0, attackSwing - dt * 4)
      // Right arm chops down
      armPivotR.rotation.x = -1.3 * Math.sin(attackSwing * Math.PI)
      armPivotR.rotation.z = -0.3 * Math.sin(attackSwing * Math.PI)
    }

    // If holding mouse, keep attacking
    if (mouseDown && state === 'playing' && attackCooldown.ready) {
      tryAttack()
    }
    attackCooldown.tick(dt)
  }

  function tickStats(dt) {
    // Hunger drain
    hunger = Math.max(0, hunger - HUNGER_RATE * dt)
    // Sanity drain at night, restore by campfire
    let sanityDelta = 0
    if (darkness > 0.4) sanityDelta -= SANITY_NIGHT_DRAIN * darkness * dt
    // Check campfires
    let nearFire = false
    for (const cf of campfires) {
      if (cf.life <= 0) continue
      const d = Math.hypot(cf.x - playerX, cf.z - playerZ)
      if (d < CAMPFIRE_RANGE) { nearFire = true; sanityDelta += FIRE_HEAL_SANITY * dt; break }
    }
    // Sanity recovers a bit during day
    if (darkness < 0.2 && hunger > 30) sanityDelta += 1.5 * dt
    sanity = Math.max(0, Math.min(MAX_SANITY, sanity + sanityDelta))

    // Starvation damage
    if (hunger <= 0) health -= STARVE_DAMAGE * dt
    // Sanity 0 = damage at night
    if (sanity <= 0 && darkness > 0.5) health -= 5 * dt

    if (health <= 0) {
      let reason = 'A grim fate awaits all in this place.'
      if (hunger <= 0) reason = 'You starved to death.'
      else if (sanity <= 0 && darkness > 0.5) reason = 'Shadows claimed your mind.'
      else reason = 'A creature has slain you.'
      gameOver(reason)
    }
  }

  function tickCampfires(dt) {
    for (let i = campfires.length - 1; i >= 0; i--) {
      const cf = campfires[i]
      cf.life -= dt
      const k = Math.max(0, cf.life / cf.maxLife)
      cf.light.intensity = 4.0 * k + 0.3 * Math.sin(globalTime * 18)
      // Flame animation
      const flameGroup = cf.model.userData.flameGroup
      if (flameGroup) {
        flameGroup.children.forEach((flame, idx) => {
          const f = idx % 3
          flame.scale.y = 1 + Math.sin(globalTime * 6 + idx * 1.5) * 0.18 + (1 - k) * 0.2
          flame.scale.x = 1 + Math.cos(globalTime * 8 + idx) * 0.1
          flame.position.y = 0.18 + f * 0.05 + Math.sin(globalTime * 4 + idx) * 0.04
          flame.material.opacity = (0.85 + Math.sin(globalTime * 12 + idx) * 0.1) * (0.3 + 0.7 * k)
        })
      }
      // Sparks
      if (Math.random() < 0.4 * k) {
        sparkPS.burst({
          position: { x: cf.x + (Math.random() - 0.5) * 0.3, y: 0.7, z: cf.z + (Math.random() - 0.5) * 0.3 },
          count: 1, speed: [1.5, 3], lifetime: [0.5, 1.0],
          size: [0.3, 0.7], color: 0xff8030, gravity: -2, spread: Math.PI * 0.15,
          direction: { x: 0, y: 1, z: 0 },
        })
      }

      // Burnout
      if (cf.life <= 0) {
        scene.remove(cf.model)
        scene.remove(cf.light)
        campfires.splice(i, 1)
      }
    }
  }

  function tickCreatures(dt) {
    // Spawn logic: at night, when sanity low
    const dangerLevel = (darkness > 0.5 ? 1 : 0) * Math.max(0, (60 - sanity) / 60)
    const targetCount = Math.floor(dangerLevel * 4)
    const aliveCount = creatures.filter(c => c.alive).length
    if (aliveCount < targetCount && Math.random() < 0.02) spawnShadowCreature()

    for (let i = creatures.length - 1; i >= 0; i--) {
      const c = creatures[i]
      if (!c.alive) {
        // Sink and remove
        c.model.position.y -= dt * 1.5
        c.model.children.forEach(ch => {
          if (ch.material && ch.material.opacity !== undefined) {
            ch.material.opacity = Math.max(0, ch.material.opacity - dt * 2)
          }
        })
        if (c.model.position.y < -2) {
          scene.remove(c.model)
          creatures.splice(i, 1)
        }
        continue
      }
      c.life += dt
      // If near a campfire, retreat
      let fleeing = false
      for (const cf of campfires) {
        if (cf.life <= 0) continue
        const fd = Math.hypot(cf.x - c.x, cf.z - c.z)
        if (fd < CAMPFIRE_RANGE) {
          // Move away from fire
          const ang = Math.atan2(c.x - cf.x, c.z - cf.z)
          c.x += Math.sin(ang) * 3 * dt
          c.z += Math.cos(ang) * 3 * dt
          fleeing = true
          break
        }
      }
      if (!fleeing) {
        // Chase player
        const dx = playerX - c.x, dz = playerZ - c.z
        const d = Math.hypot(dx, dz) + 0.001
        const speed = 1.8 + Math.min(1.4, c.life * 0.05)
        c.x += (dx / d) * speed * dt
        c.z += (dz / d) * speed * dt
        // Attack
        c.attackCD -= dt
        if (d < 1.0 && c.attackCD <= 0) {
          c.attackCD = 1.2
          health -= 8
          sanity = Math.max(0, sanity - 4)
          flash.set(0xff2030, 0.25)
          shake.add({ amplitude: 0.3, duration: 0.3, frequency: 22 })
        }
      }
      c.model.position.set(c.x, 0.05 + Math.sin(c.life * 6 + c.x) * 0.08, c.z)
      c.model.rotation.y = Math.atan2(playerX - c.x, playerZ - c.z)
      // Pulsing wisp scale
      const pulse = 1 + Math.sin(c.life * 4) * 0.05
      c.model.scale.setScalar(pulse)
    }
  }

  // ─── Mouse cursor indicator on ground ───────────────────────────────────────
  const cursorRingGeo = new THREE.RingGeometry(0.4, 0.5, 24)
  cursorRingGeo.rotateX(-Math.PI / 2)
  const cursorRingMat = new THREE.MeshBasicMaterial({ color: 0xfff0a0, transparent: true, opacity: 0.7, fog: false })
  const cursorRing = new THREE.Mesh(cursorRingGeo, cursorRingMat)
  cursorRing.userData.noOutline = true
  cursorRing.position.y = 0.02
  scene.add(cursorRing)

  // Hover highlight for nearest interactable
  const highlightGeo = new THREE.RingGeometry(0.7, 0.85, 28)
  highlightGeo.rotateX(-Math.PI / 2)
  const highlightMat = new THREE.MeshBasicMaterial({ color: 0xffe080, transparent: true, opacity: 0.0, fog: false })
  const highlightRing = new THREE.Mesh(highlightGeo, highlightMat)
  highlightRing.userData.noOutline = true
  highlightRing.position.y = 0.025
  scene.add(highlightRing)

  // ─── Camera follow ─────────────────────────────────────────────────────────
  let _bobPhase = 0
  function tickCamera(dt) {
    const k = 1 - Math.exp(-6 * dt)
    if (viewMode === 'first') {
      // FPS — at bear's eye height, looking forward in facing direction
      const moving = !!(keys.KeyW || keys.KeyS || keys.ArrowUp || keys.ArrowDown)
      if (moving) _bobPhase += dt * 9
      const bob = moving ? Math.sin(_bobPhase) * 0.06 : _bobPhase * 0 // settle to 0 when stop
      const eyeY = 1.75 + bob
      // Snap to player (no lerp — FPS feels more responsive)
      camera.position.set(playerX, eyeY, playerZ)
      camera.fov = 70
      camera.updateProjectionMatrix()
      const lookDist = 8
      const lookX = playerX + Math.sin(playerFacing) * lookDist
      const lookZ = playerZ + Math.cos(playerFacing) * lookDist
      camera.lookAt(lookX, eyeY * 0.92, lookZ)
    } else {
      // Third-person — isometric top-down follow
      const targetX = playerX + CAM_OFFSET.x
      const targetY = CAM_OFFSET.y
      const targetZ = playerZ + CAM_OFFSET.z
      camera.position.x += (targetX - camera.position.x) * k
      camera.position.y += (targetY - camera.position.y) * k
      camera.position.z += (targetZ - camera.position.z) * k
      // Smoothly restore FOV
      camera.fov += (38 - camera.fov) * 0.15
      camera.updateProjectionMatrix()
      camera.lookAt(playerX, 1, playerZ)
    }

    // Sun light follows player so shadows always render around current area
    sunLight.position.set(playerX + 18, 30, playerZ + 16)
    sunLight.target.position.set(playerX, 0, playerZ)
    sunLight.target.updateMatrixWorld()
  }

  // ─── Main Loop ──────────────────────────────────────────────────────────────
  function loop() {
    if (disposed) return
    raf = requestAnimationFrame(loop)
    const rawDt = clock.getDelta()
    const dt = Math.min(rawDt, 0.06)
    globalTime += dt
    if (paused) {
      composer.render()
      return
    }

    if (state === 'playing') {
      gameTime += dt
      tickPlayer(dt)
      tickStats(dt)
      tickResources(dt)
      tickCampfires(dt)
      tickCreatures(dt)
      updateChunks()
      // Ground follows player (snap to chunk grid to avoid texture sliding)
      ground.position.x = Math.round(playerX / 30) * 30
      ground.position.z = Math.round(playerZ / 30) * 30
      // Highlight nearest resource
      const near = findClosestResource(INTERACT_RANGE)
      if (near) {
        highlightRing.position.x = near.x
        highlightRing.position.z = near.z
        highlightMat.opacity += (0.6 - highlightMat.opacity) * 0.2
      } else {
        highlightMat.opacity *= 0.85
      }
      // Cursor ring (hide in first-person — irrelevant)
      if (viewMode === 'first') {
        cursorRingMat.opacity *= 0.85
        cursorRing.position.set(99999, 0, 99999)
      } else {
        cursorRing.position.x = mouseWorld.x
        cursorRing.position.z = mouseWorld.z
        cursorRingMat.opacity = 0.55 + Math.sin(globalTime * 4) * 0.15
      }
    } else {
      // Menu / dead — keep cycle running but slowly
      gameTime += dt * 0.5
      cursorRing.position.set(99999, 0, 99999)
      highlightMat.opacity *= 0.9
      ground.position.x = Math.round(playerX / 30) * 30
      ground.position.z = Math.round(playerZ / 30) * 30
    }

    updateCycle()
    updateHUD()

    // FX
    chipsPS.tick(dt); sparkPS.tick(dt); leafPS.tick(dt); dustPS.tick(dt)
    flash.tick(dt)
    shake.tick(dt)
    tickCamera(dt)

    fxMat.uniforms.uTime.value = globalTime

    // Render scene with composer (bloom + vignette + output)
    composer.render()
  }

  // Resize support
  function resize(w, h) {
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h)
    composer.setSize(w, h)
  }

  function dispose() {
    if (disposed) return
    disposed = true
    cancelAnimationFrame(raf)
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('keyup', onKeyUp)
    renderer.domElement.removeEventListener('pointerdown', onMouseDown)
    window.removeEventListener('pointerup', onMouseUp)
    renderer.domElement.removeEventListener('pointermove', onMouseMove)
    chipsPS.dispose(); sparkPS.dispose(); leafPS.dispose(); dustPS.dispose()
    hud.dispose()
    if (menuPanel) menuPanel.dispose()
    if (gameOverPanel) gameOverPanel.dispose()
    if (buildPanel) buildPanel.dispose()
    renderer.dispose()
    if (renderer.domElement.parentNode === container) container.removeChild(renderer.domElement)
  }

  // Initial render so something appears before RAF
  updateCycle()
  composer.render()

  loop()
  showMenu()

  return {
    getScene: () => scene,
    getCamera: () => camera,
    getRenderer: () => renderer,
    getCanvas: () => renderer.domElement,
    getOrbitControls: () => null,
    dispose,
    resize,
    play: () => { paused = false },
    pause: () => { paused = true },
    seekTo: () => {},
    getProgress: () => 0,
    renderFrame: () => composer.render(),
    setSpeed: () => {},
    hasCinematic: false,
    duration: 0,
  }
}
