import { spawn, type World } from "../world";

// Leaves a gravestone where each character died, lying on the ground for
// good. It's only something to see: no hitbox, health or team. A camera
// following the character stays on its gravestone. Runs after deaths are
// found and before cleanup removes the character.
export function gravestoneSystem(world: World, _dt: number): void {
  const { character, position, sprite } = world.components;
  const { camera } = world;
  for (const { entity } of world.events.deaths) {
    const def = character.get(entity)?.def;
    const at = position.get(entity);
    if (!def || !at) continue;
    const grave = spawn(world);
    position.set(grave, { x: at.x, y: at.y });
    sprite.set(grave, { art: def.gravestone, layer: "ground" });
    if (camera.target === entity) camera.target = grave;
  }
}
