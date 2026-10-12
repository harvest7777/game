import type { World } from "../world";

// Enemies further than this many tiles from every player, with no
// target, sleep. It's beyond any enemy's detection range, so a sleeper
// could never have noticed anyone anyway (content tests check that).
export const SLEEP_DISTANCE = 30;

// Puts far-off, idle enemies to sleep and wakes them as a player comes
// near, so a dungeon's worth of enemies only costs the few around the
// players. A sleeper stands still: thinking, moving, facing, noticing,
// phases and boss timelines all skip it, and it holds its place and its
// phase until it wakes. Runs before anything that skips sleepers.
export function sleepSystem(world: World, _dt: number): void {
  const { enemy, position, target, playerControlled, asleep, velocity } =
    world.components;
  const watchers = [];
  for (const [entity] of playerControlled) {
    const at = position.get(entity);
    if (at) watchers.push(at);
  }
  const reach = SLEEP_DISTANCE * SLEEP_DISTANCE;

  for (const [entity] of enemy) {
    const at = position.get(entity);
    if (!at) continue;
    let awake = target.has(entity);
    for (let i = 0; i < watchers.length && !awake; i++) {
      const dx = watchers[i].x - at.x;
      const dy = watchers[i].y - at.y;
      awake = dx * dx + dy * dy <= reach;
    }
    if (awake) {
      asleep.delete(entity);
    } else if (!asleep.has(entity)) {
      asleep.set(entity, true);
      const v = velocity.get(entity);
      if (v) {
        v.x = 0;
        v.y = 0;
      }
    }
  }
}
