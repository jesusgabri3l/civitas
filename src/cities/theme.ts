/** '#0f1a2a' -> 0x0f1a2a: the 3D side reads the theme colors of `meta.ts` through this. */
export const colorNumber = (hex: string): number => Number.parseInt(hex.replace('#', ''), 16);
