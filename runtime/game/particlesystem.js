/**
 * ParticleSystem — InstancedMesh-backed particle emitter.
 *
 * NEVER use individual Mesh objects for particles. One InstancedMesh of N
 * particles renders in one draw call; N meshes render in N draw calls and
 * eat your frame budget at 50+ particles.
 *
 * Per-particle state lives in flat typed arrays for cache-friendliness.
 *
 * @example
 *   const sparks = new ParticleSystem(scene, {
 *     maxParticles: 200,
 *     geometry: new THREE.SphereGeometry(0.05, 4, 4),
 *     material: new THREE.MeshBasicMaterial({ color: 0xffaa33 }),
 *   })
 *
 *   // In game loop:
 *   sparks.tick(dt)
 *
 *   // On hit:
 *   sparks.burst({
 *     position: hitPos,
 *     count: 18,
 *     speed: [3, 7],
 *     lifetime: [0.3, 0.7],
 *     gravity: -9.8,
 *     spread: Math.PI,         // hemisphere
 *     sizeOverLife: [1, 0],    // shrink to 0
 *   })
 */

import {
  InstancedMesh,
  Object3D,
  Color,
  Vector3,
  Matrix4,
} from 'three'

/**
 * ParticleSystemConfig:
 *   maxParticles: number
 *   geometry:     BufferGeometry
 *   material:     Material
 *   useColors?:   Whether to use per-particle color (default true).
 *
 * BurstConfig:
 *   position:      { x, y, z }
 *   count:         number
 *   speed?:        Initial speed range [min, max] m/s.
 *   lifetime?:     Lifetime range [min, max] seconds.
 *   size?:         Initial size range [min, max] (scales geometry).
 *   sizeOverLife?: Optional [start, end] size lerp over life.
 *   color?:        Hex color or [from, to] for color lerp over life.
 *   gravity?:      Gravity (acceleration, m/s²). Negative = down. Default 0.
 *   drag?:         Drag coefficient (0 = none, 1 = stops in 1 sec). Default 0.
 *   spread?:       Spread cone half-angle in radians. PI = full sphere, PI/2 = hemisphere. Default PI.
 *   direction?:    Bias direction (for directional bursts like sparks off a hit). Default up.
 */

const _dummy = new Object3D()
const _mat = new Matrix4()
const _color = new Color()

export class ParticleSystem {
  constructor(scene, config) {
    this.scene = scene
    this.color0 = []
    this.color1 = []
    this.nextIndex = 0
    this.active = 0

    this.maxParticles = config.maxParticles
    const n = config.maxParticles
    this.mesh = new InstancedMesh(config.geometry, config.material, n)
    this.mesh.frustumCulled = false
    this.mesh.count = 0 // start invisible
    scene.add(this.mesh)

    this.posX = new Float32Array(n)
    this.posY = new Float32Array(n)
    this.posZ = new Float32Array(n)
    this.velX = new Float32Array(n)
    this.velY = new Float32Array(n)
    this.velZ = new Float32Array(n)
    this.life = new Float32Array(n)
    this.maxLife = new Float32Array(n)
    this.size0 = new Float32Array(n)
    this.size1 = new Float32Array(n)
    this.gravity = new Float32Array(n)
    this.drag = new Float32Array(n)

    if (config.useColors !== false) {
      this.colorAttr = null // InstancedMesh.setColorAt handles this internally
      // Pre-init color arrays
      for (let i = 0; i < n; i++) {
        this.color0.push(new Color(1, 1, 1))
        this.color1.push(new Color(1, 1, 1))
      }
    } else {
      this.colorAttr = null
    }
  }

  /** Spawn a burst of particles. */
  burst(config) {
    const count = Math.min(config.count, this.maxParticles)
    const speedMin = config.speed?.[0] ?? 2
    const speedMax = config.speed?.[1] ?? 5
    const lifeMin = config.lifetime?.[0] ?? 0.4
    const lifeMax = config.lifetime?.[1] ?? 0.9
    const sizeMin = config.size?.[0] ?? 1
    const sizeMax = config.size?.[1] ?? 1
    const sizeEnd = config.sizeOverLife?.[1] ?? sizeMax
    const sizeStart = config.sizeOverLife?.[0] ?? sizeMax
    const spread = config.spread ?? Math.PI
    const dir = config.direction ?? { x: 0, y: 1, z: 0 }
    const dirVec = new Vector3(dir.x, dir.y, dir.z).normalize()

    for (let i = 0; i < count; i++) {
      const idx = this._claim()
      this.posX[idx] = config.position.x
      this.posY[idx] = config.position.y
      this.posZ[idx] = config.position.z

      // Random direction within spread cone around dir
      const v = _randomConeDir(dirVec, spread)
      const sp = speedMin + Math.random() * (speedMax - speedMin)
      this.velX[idx] = v.x * sp
      this.velY[idx] = v.y * sp
      this.velZ[idx] = v.z * sp

      const lt = lifeMin + Math.random() * (lifeMax - lifeMin)
      this.life[idx] = lt
      this.maxLife[idx] = lt
      this.size0[idx] = sizeStart * (config.sizeOverLife ? 1 : sizeMin + Math.random() * (sizeMax - sizeMin))
      this.size1[idx] = sizeEnd * (config.sizeOverLife ? 1 : this.size0[idx])

      this.gravity[idx] = config.gravity ?? 0
      this.drag[idx] = config.drag ?? 0

      if (this.color0.length) {
        if (Array.isArray(config.color)) {
          this.color0[idx].set(config.color[0])
          this.color1[idx].set(config.color[1])
        } else if (config.color !== undefined) {
          this.color0[idx].set(config.color)
          this.color1[idx].copy(this.color0[idx])
        } else {
          this.color0[idx].setRGB(1, 1, 1)
          this.color1[idx].setRGB(1, 1, 1)
        }
      }
    }
  }

  tick(dt) {
    let visible = 0
    for (let i = 0; i < this.maxParticles; i++) {
      if (this.life[i] <= 0) continue

      // Integrate
      this.velY[i] += this.gravity[i] * dt
      if (this.drag[i] > 0) {
        const f = Math.max(0, 1 - this.drag[i] * dt)
        this.velX[i] *= f
        this.velY[i] *= f
        this.velZ[i] *= f
      }
      this.posX[i] += this.velX[i] * dt
      this.posY[i] += this.velY[i] * dt
      this.posZ[i] += this.velZ[i] * dt
      this.life[i] -= dt

      const t = 1 - this.life[i] / this.maxLife[i] // 0..1 progress
      const size = this.size0[i] + (this.size1[i] - this.size0[i]) * t

      _dummy.position.set(this.posX[i], this.posY[i], this.posZ[i])
      _dummy.scale.setScalar(size)
      _dummy.rotation.set(0, 0, 0)
      _dummy.updateMatrix()
      this.mesh.setMatrixAt(visible, _dummy.matrix)

      if (this.color0.length) {
        _color.copy(this.color0[i]).lerp(this.color1[i], t)
        this.mesh.setColorAt(visible, _color)
      }

      // Compact: swap dead slots to end
      if (i !== visible) {
        // Move this active particle's data into slot `visible`
        this._move(i, visible)
        this.life[i] = 0 // mark old slot as free
      }
      visible++
    }

    this.mesh.count = visible
    this.active = visible
    this.mesh.instanceMatrix.needsUpdate = true
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true
  }

  get activeCount() {
    return this.active
  }

  clear() {
    for (let i = 0; i < this.maxParticles; i++) this.life[i] = 0
    this.mesh.count = 0
    this.active = 0
  }

  dispose() {
    this.scene.remove(this.mesh)
    this.mesh.geometry.dispose()
    this.mesh.material.dispose?.()
    this.mesh.dispose()
  }

  _claim() {
    // Find first dead slot starting from nextIndex
    for (let i = 0; i < this.maxParticles; i++) {
      const idx = (this.nextIndex + i) % this.maxParticles
      if (this.life[idx] <= 0) {
        this.nextIndex = (idx + 1) % this.maxParticles
        return idx
      }
    }
    // All alive — overwrite oldest (just use nextIndex)
    const idx = this.nextIndex
    this.nextIndex = (idx + 1) % this.maxParticles
    return idx
  }

  _move(from, to) {
    if (from === to) return
    this.posX[to] = this.posX[from]
    this.posY[to] = this.posY[from]
    this.posZ[to] = this.posZ[from]
    this.velX[to] = this.velX[from]
    this.velY[to] = this.velY[from]
    this.velZ[to] = this.velZ[from]
    this.life[to] = this.life[from]
    this.maxLife[to] = this.maxLife[from]
    this.size0[to] = this.size0[from]
    this.size1[to] = this.size1[from]
    this.gravity[to] = this.gravity[from]
    this.drag[to] = this.drag[from]
    if (this.color0.length) {
      this.color0[to].copy(this.color0[from])
      this.color1[to].copy(this.color1[from])
    }
  }
}

function _randomConeDir(axis, halfAngle) {
  // Pick random direction in cone around `axis` with half-angle `halfAngle`
  const u = Math.random()
  const cosTheta = 1 - u * (1 - Math.cos(halfAngle))
  const sinTheta = Math.sqrt(1 - cosTheta * cosTheta)
  const phi = Math.random() * Math.PI * 2
  // Cone-local direction
  const local = new Vector3(sinTheta * Math.cos(phi), cosTheta, sinTheta * Math.sin(phi))
  // Rotate from +Y to axis
  const yAxis = new Vector3(0, 1, 0)
  if (axis.distanceToSquared(yAxis) < 1e-6) return local
  const v = new Vector3().crossVectors(yAxis, axis)
  const c = yAxis.dot(axis)
  const s = v.length()
  if (s < 1e-6) {
    // Opposite direction
    return local.multiplyScalar(-1)
  }
  // Rodrigues' rotation
  const k = v.normalize()
  const kxLocal = new Vector3().crossVectors(k, local)
  const dot = k.dot(local)
  return local
    .multiplyScalar(c)
    .add(kxLocal.multiplyScalar(s))
    .add(k.multiplyScalar(dot * (1 - c)))
    .normalize()
}
