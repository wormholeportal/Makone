/**
 * Flash — Material flash effect for hit feedback.
 *
 * On hit: white flash for 80–120ms. On status (poison/burn): colored tint pulse.
 * Cheap to implement, huge feel improvement.
 *
 * Works by overriding emissive (preferred) or color (fallback) on the
 * mesh's material(s), then restoring after duration.
 *
 * See: skills/games/01-feel/juicing.md
 *
 * @example
 *   const flash = new Flash()
 *
 *   // In game loop:
 *   flash.tick(dt)
 *
 *   // On hit:
 *   flash.flashMesh(enemy.mesh, { color: 0xffffff, duration: 0.08 })
 *
 *   // Poison tick:
 *   flash.flashMesh(enemy.mesh, { color: 0x44ff44, duration: 0.15, intensity: 0.7 })
 *
 *   // Pulse (heals/buffs):
 *   flash.pulseMesh(player.mesh, { color: 0x66ddff, duration: 0.6, pulses: 3 })
 */

import type { Object3D, Material, MeshStandardMaterial } from 'three'
import { Color } from 'three'

type Mat = Material & {
  emissive?: Color
  emissiveIntensity?: number
  color?: Color
}

export type FlashConfig = {
  /** Flash color (hex or Color). Default white. */
  color?: number | Color
  /** Duration in seconds (default 0.1). */
  duration?: number
  /** 0..1 emissive intensity at peak (default 1). */
  intensity?: number
}

export type PulseConfig = FlashConfig & {
  /** Number of pulses to fire over `duration` (default 3). */
  pulses?: number
}

type ActiveFlash = {
  mesh: Object3D
  materials: Mat[]
  originalEmissive: Color[]
  originalIntensity: number[]
  color: Color
  duration: number
  intensity: number
  elapsed: number
  pulses: number
}

export class Flash {
  private active: ActiveFlash[] = []

  flashMesh(mesh: Object3D, config: FlashConfig = {}): void {
    this._start(mesh, config, 1)
  }

  pulseMesh(mesh: Object3D, config: PulseConfig = {}): void {
    this._start(mesh, config, config.pulses ?? 3)
  }

  private _start(mesh: Object3D, config: FlashConfig, pulses: number): void {
    const mats: Mat[] = []
    const origE: Color[] = []
    const origI: number[] = []
    mesh.traverse((obj: any) => {
      if (obj.material) {
        const list = Array.isArray(obj.material) ? obj.material : [obj.material]
        for (const m of list) {
          const mat = m as Mat
          if (!mat.emissive) continue // not a material that supports emissive
          mats.push(mat)
          origE.push(mat.emissive.clone())
          origI.push((mat as MeshStandardMaterial).emissiveIntensity ?? 1)
        }
      }
    })
    if (mats.length === 0) return

    // Cancel any active flash on the same mesh (prevent restore overwrite)
    for (let i = this.active.length - 1; i >= 0; i--) {
      if (this.active[i].mesh === mesh) {
        this._restore(this.active[i])
        this.active.splice(i, 1)
      }
    }

    this.active.push({
      mesh,
      materials: mats,
      originalEmissive: origE,
      originalIntensity: origI,
      color: new Color(config.color ?? 0xffffff),
      duration: config.duration ?? 0.1,
      intensity: config.intensity ?? 1,
      elapsed: 0,
      pulses,
    })
  }

  tick(dt: number): void {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const f = this.active[i]
      f.elapsed += dt
      const t = f.elapsed / f.duration
      if (t >= 1) {
        this._restore(f)
        this.active.splice(i, 1)
        continue
      }
      // Pulse envelope: |sin(π·t·pulses)|, decaying linearly
      const envelope =
        Math.abs(Math.sin(Math.PI * t * f.pulses)) * (1 - t) * f.intensity
      for (let m = 0; m < f.materials.length; m++) {
        const mat = f.materials[m]
        // Blend toward flash color in emissive
        mat.emissive!.copy(f.originalEmissive[m]).lerp(f.color, envelope)
        ;(mat as MeshStandardMaterial).emissiveIntensity = Math.max(
          f.originalIntensity[m],
          envelope * 2,
        )
      }
    }
  }

  private _restore(f: ActiveFlash): void {
    for (let m = 0; m < f.materials.length; m++) {
      f.materials[m].emissive!.copy(f.originalEmissive[m])
      ;(f.materials[m] as MeshStandardMaterial).emissiveIntensity =
        f.originalIntensity[m]
    }
  }

  /** Restore everything immediately. */
  clear(): void {
    for (const f of this.active) this._restore(f)
    this.active = []
  }
}
