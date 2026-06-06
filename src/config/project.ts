export const PROJECT = {
  name: 'Makone Arcade',
  siteUrl: 'https://makone.dev',
  repoUrl: 'https://github.com/wormholeportal/Makone',
  xUrl: 'https://x.com/0xWormhole404',
  defaultBranch: 'main',
} as const

export const PROJECT_LINKS = {
  contributing: `${PROJECT.repoUrl}/blob/${PROJECT.defaultBranch}/CONTRIBUTING.md`,
  pullRequests: `${PROJECT.repoUrl}/pulls`,
  issues: `${PROJECT.repoUrl}/issues`,
} as const
