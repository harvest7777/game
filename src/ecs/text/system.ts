import type { Color } from "../sprite/components";
import { spawn, type Entity, type World } from "../world";

export const DAMAGE_COLOR: Color = [0.95, 0.15, 0.15, 1];
export const DAMAGE_TEXT = { lifetime: 0.8, rise: 0.95 };
// Each extra number on the same target in one tick starts this many tiles
// higher than the last.
export const STACK_GAP = 0.3;

// A red damage number for every Damaged event, floating over the target.
export function damageTextSystem(world: World, _dt: number): void {
  const { position, floatingText } = world.components;
  const counts = new Map<Entity, number>();

  for (const { target, amount } of world.events.damaged) {
    const at = position.get(target);
    if (!at) continue;
    const stacked = counts.get(target) ?? 0;
    counts.set(target, stacked + 1);

    const text = spawn(world);
    stayOver(world, text, target);
    floatingText.set(text, {
      text: String(Math.round(amount)),
      color: [...DAMAGE_COLOR],
      age: 0,
      previousAge: 0,
      lifetime: DAMAGE_TEXT.lifetime,
      rise: DAMAGE_TEXT.rise,
      lift: stacked * STACK_GAP,
      follows: target,
    });
  }
}

// Ages floating text, keeps it over what it follows, and removes it once its
// lifetime is up.
export function floatingTextSystem(world: World, dt: number): void {
  for (const [entity, text] of world.components.floatingText) {
    if (text.follows !== undefined) stayOver(world, entity, text.follows);
    text.previousAge = text.age;
    text.age += dt;
    if (text.age >= text.lifetime) world.events.despawns.push(entity);
  }
}

// Moves `text` onto `target`, previous position included so it's drawn
// moving with it between ticks. Does nothing once the target is gone, so
// the text stays where it last was.
function stayOver(world: World, text: Entity, target: Entity): void {
  const { position, previousPosition } = world.components;
  const at = position.get(target);
  if (!at) return;
  const before = previousPosition.get(target) ?? at;
  position.set(text, { x: at.x, y: at.y });
  previousPosition.set(text, { x: before.x, y: before.y });
}
