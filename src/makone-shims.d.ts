/*
 * The gallery games in /games/*.js import from the bundled runtime toolkit via
 * the `makone/*` specifiers (resolved at build time by the Vite aliases in
 * vite.config.ts). Those JS modules are untyped, so we declare the specifiers
 * here to keep `tsc --noEmit` clean without type-checking third-party game code.
 */
declare module 'makone/game'
