export interface GameDefinition {
  /** Stable id, also the route param and the source filename without .js. */
  id: string
  title: string
  /** One-line hook shown on the detail sheet. */
  tagline: string
  /** Human-readable controls hint. */
  controls: string
  /** Short genre/feel tags shown in the detail card. */
  tags: string[]
  /** Single category label shown on the kiosk / card. */
  cat: string
  /** Accent color (hex string) for kiosk, gem, trim, and fallback cover. */
  accent: string
  /** Kiosk position on the island, [x, z] in world units. */
  pos: [number, number]
}

// Contributors: add one entry here after dropping games/<id>.js into /games.
// Keep positions spread around the island so kiosks do not overlap.
export const gameCatalog: GameDefinition[] = [
  {
    id: 'drift',
    title: 'Neon Drift',
    tagline: 'Drift the neon circuit - chain slides for boost.',
    controls: 'WASD / Arrows to drive - Space to drift',
    tags: ['Racing', 'Drift', 'Single player'],
    cat: 'RACING',
    accent: '#f6a486',
    pos: [0, -9],
  },
  {
    id: 'battle-city',
    title: 'Battle City',
    tagline: 'Defend the eagle, wipe out the steel raiders.',
    controls: 'WASD / Arrows to move - Space to fire',
    tags: ['Shooter', 'Tank', 'Single player'],
    cat: 'ACTION',
    accent: '#f0a93a',
    pos: [-12, -3],
  },
  {
    id: 'snowdrift',
    title: 'Snow Drift',
    tagline: 'Race the long snowy slopes at full speed.',
    controls: 'Arrows / WASD to steer - Space to brake',
    tags: ['Driving', 'Snow', 'Single player'],
    cat: 'RACING',
    accent: '#75c4d6',
    pos: [12, -4],
  },
  {
    id: 'pacman3d',
    title: 'Neon Labyrinth',
    tagline: 'Pac-chase through a glowing 3D maze.',
    controls: 'WASD / Arrows to move',
    tags: ['Maze', 'Arcade', 'Single player'],
    cat: 'ARCADE',
    accent: '#b9a3f3',
    pos: [-13, 8],
  },
  {
    id: 'dontstarve',
    title: "Don't Starve",
    tagline: 'Survive the wilderness, make it through every night.',
    controls: 'WASD to move - Mouse to interact',
    tags: ['Survival', 'Exploration', 'Single player'],
    cat: 'SURVIVAL',
    accent: '#7bcf9e',
    pos: [13, 8],
  },
]
