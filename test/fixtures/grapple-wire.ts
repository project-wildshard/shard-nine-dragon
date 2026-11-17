/** Original public wire fields, pinned by the real client/room crossing below. */
export const GRAPPLE_PHASES = ['idle', 'fire', 'bite', 'lift', 'zip', 'vault', 'settle', 'miss', 'reel', 'dock'] as const;
export const NO_HOOK = -1;
export const grappleRow = (player: string, field: 'phase' | 'clock' | 'hook' | 'armed' | 'mx' | 'my' | 'mz'): string => `grapple.${player}.${field}`;
