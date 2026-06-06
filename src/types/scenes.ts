/** Controls returned by a game module after it mounts into a container. */
export interface SceneControls {
  dispose: () => void
  resize?: (w: number, h: number) => void
  play?: () => void
  pause?: () => void
  setOrbitMode?: () => void
  /** Optional serializable game state (score/lives/status) for HUD wiring. */
  getState?: () => { score?: number; lives?: number; status?: string; [key: string]: unknown }
}
