import { applyDamage } from "../shared/damage";
import { groundUnder } from "../tiles";
import type { World } from "../world";

// Burns characters standing on hazardous ground, like lava: once for every
// `every` seconds they stay on it, ignoring defense. Stepping off forgets
// the time, so a quick hop across is free. Enemies don't burn, like RotMG.
export function hazardSystem(world: World, dt: number): void {
  const { position, hazardExposure, team } = world.components;
  for (const [entity, at] of position) {
    if (team.get(entity) !== "player" || !world.components.health.has(entity)) {
      continue;
    }
    const hazard = groundUnder(world.tiles, at)?.hazard;
    if (!hazard) {
      hazardExposure.delete(entity);
      continue;
    }
    const exposure = hazardExposure.get(entity) ?? { time: 0 };
    exposure.time += dt;
    while (exposure.time >= hazard.every) {
      exposure.time -= hazard.every;
      applyDamage(world, entity, hazard.damage, undefined, true);
    }
    hazardExposure.set(entity, exposure);
  }
}
