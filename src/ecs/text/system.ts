import type { Color } from "../sprite/components";
import { spawn, type Entity, type World } from "../world";

export const DAMAGE_COLOR: Color = [0.95, 0.15, 0.15, 1];
export const HEAL_COLOR: Color = [0.35, 0.95, 0.4, 1];
export const DAMAGE_TEXT = { lifetime: 0.8, rise: 0.95 };
// Each extra number on the same target in one tick starts this many tiles
// higher than the last, up to MAX_STACK numbers high. Past that they share
// the top row: every hit still gets its own number, but a crowd's worth of
// hits in one tick can't build a tower.
export const STACK_GAP = 0.15;
export const MAX_STACK = 4;

// A red damage number for every Damaged event, and a green number for
// every Healed one, floating over the target. (The bold font is digits
// only, so the color is what tells them apart.)
export function damageTextSystem(world: World, _dt: number): void {
  const { position, floatingText } = world.components;
  const counts = new Map<Entity, number>();
  const numbers = [
    ...world.events.damaged.map(({ target, amount }) => ({
      target,
      text: String(Math.round(amount)),
      color: DAMAGE_COLOR,
    })),
    ...world.events.healed.map(({ target, amount }) => ({
      target,
      text: String(Math.round(amount)),
      color: HEAL_COLOR,
    })),
  ];

  for (const { target, text: label, color } of numbers) {
    const at = position.get(target);
    // Something invulnerable still takes its hits (and their sounds), but
    // floats no numbers: in a stress test that's thousands of them.
    if (!at || world.components.invulnerable.has(target)) continue;
    const stacked = counts.get(target) ?? 0;
    counts.set(target, stacked + 1);

    const text = spawn(world);
    stayOver(world, text, target);
    floatingText.set(text, {
      text: label,
      color: [...color],
      age: 0,
      previousAge: 0,
      lifetime: DAMAGE_TEXT.lifetime,
      rise: DAMAGE_TEXT.rise,
      lift: Math.min(stacked, MAX_STACK - 1) * STACK_GAP,
      follows: target,
    });
  }
}

// Ages floating text, keeps it over what it follows, and removes it once its
// lifetime is up.
export function floatingTextSystem(world: World, dt: number): void {
  for (const [entity, text] of world.components.floatingText) {
    if (text.follows !== undefined && !stayOver(world, entity, text.follows)) {
      // Its target was removed after the last tick. Freeze both ends of the
      // text's interpolation segment at its last position so alpha cannot
      // replay the target's final movement every frame.
      text.follows = undefined;
      const at = world.components.position.get(entity);
      if (at) world.components.previousPosition.set(entity, { ...at });
    }
    text.previousAge = text.age;
    text.age += dt;
    if (text.age >= text.lifetime) world.events.despawns.push(entity);
  }
}

// Moves `text` onto `target`, previous position included so it's drawn
// moving with it between ticks. Does nothing once the target is gone, so
// the text stays where it last was.
function stayOver(world: World, text: Entity, target: Entity): boolean {
  const { position, previousPosition } = world.components;
  const at = position.get(target);
  if (!at) return false;
  const before = previousPosition.get(target) ?? at;
  position.set(text, { x: at.x, y: at.y });
  previousPosition.set(text, { x: before.x, y: before.y });
  return true;
}
