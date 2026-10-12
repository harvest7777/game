import type { World } from "../world";

// How long after a hit something's health bar shows in full, then how long
// it takes to fade, in seconds.
export const HURT_SHOWN = 3;
export const HURT_FADE = 0.5;

// Remembers how long ago each thing last took damage, until its health bar
// has faded: every Damaged event starts the clock again.
export function recentlyHurtSystem(world: World, dt: number): void {
  const { recentlyHurt } = world.components;
  for (const [entity, hurt] of recentlyHurt) {
    hurt.previousAge = hurt.age;
    hurt.age += dt;
    if (hurt.previousAge >= HURT_SHOWN + HURT_FADE) recentlyHurt.delete(entity);
  }
  for (const { target } of world.events.damaged) {
    recentlyHurt.set(target, { age: 0, previousAge: 0 });
  }
}
