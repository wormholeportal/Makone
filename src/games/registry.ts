import type { SceneControls } from '../types/scenes'
import { gameCatalog, type GameDefinition } from './catalog'

/** A game module: `export default createScene(container) => SceneControls`. */
export type CreateScene = (container: HTMLElement) => SceneControls | Promise<SceneControls>

export interface GameMeta extends GameDefinition {
  /** Auto-generated preview (games/covers/<id>.jpg); undefined → procedural
   *  fallback. Regenerate with `npm run gen-covers`. */
  cover?: string
  /** Lazy loader → the game's ES module. Code-split into its own chunk. */
  load: () => Promise<{ default: CreateScene }>
}

// Vite turns every /games/*.js into its own lazily-loaded chunk. Visitors only
// download the bytes for the game they actually open.
const modules = import.meta.glob('/games/*.js') as Record<
  string,
  () => Promise<{ default: CreateScene }>
>

// Auto-generated cover screenshots, resolved to hashed URLs at build time.
// Absent when gen-covers hasn't been run — the UI falls back to a procedural
// cover in that case.
const coverUrls = import.meta.glob('/games/covers/*.jpg', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

function loader(id: string): () => Promise<{ default: CreateScene }> {
  const path = `/games/${id}.js`
  const fn = modules[path]
  if (!fn) {
    throw new Error(
      `Game "${id}" not found at ${path}. Drop the file into /games and add an entry to src/games/catalog.ts.`,
    )
  }
  return fn
}

export const games: GameMeta[] = gameCatalog.map(def => ({
  ...def,
  cover: coverUrls[`/games/covers/${def.id}.jpg`],
  load: loader(def.id),
}))

export function findGame(id: string): GameMeta | undefined {
  return games.find(g => g.id === id)
}
