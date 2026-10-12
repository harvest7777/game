// Paths are relative to public/sounds, without the .wav extension.
export const sounds = {
  magicFire: "projectiles/magic-fire",
  arrowFire: "projectiles/arrow-fire",
  hitPlayer: "projectiles/hit-player",
  hitEnemy: "projectiles/hit-enemy",
  enemyDeath: "enemies/death",
  bossDeath: "enemies/boss-death",
  bossWindup: "enemies/boss-windup",
  bossCast: "enemies/boss-cast",
  bossDash: "enemies/boss-dash",
  bossExpose: "enemies/boss-expose",
} as const;

export type SoundId = keyof typeof sounds;
export type SoundFile = (typeof sounds)[SoundId];

export function soundFiles(): SoundFile[] {
  return [...new Set(Object.values(sounds))];
}
