import { addControllable, addMovable, addSprite } from "../bundles";
import { addHoldings } from "../inventory/bundle";
import type { Vec2 } from "../shared/physics/math";
import { spawn, type Entity, type World } from "../world";
import type { CharacterDef } from "./definitions";

// Creates a player-controlled character from its class at `at`: on the
// player team, at full health, wearing its starting weapon with an empty
// inventory. Everything taken from the definition is copied, so characters
// never share objects with it.
export function spawnCharacter(
  world: World,
  def: CharacterDef,
  at: Vec2,
): Entity {
  const entity = spawn(world);
  const { components } = world;

  components.character.set(entity, { def });
  addMovable(world, entity, { at, hitbox: def.hitbox });
  addControllable(world, entity, { speed: def.speed });
  addSprite(world, entity, {
    art: def.sprite.art,
    layer: "player",
    ...(def.sprite.scale !== undefined && { scale: def.sprite.scale }),
    ...(def.sprite.outline && {
      outline: structuredClone(def.sprite.outline),
    }),
  });
  components.team.set(entity, "player");
  components.health.set(entity, { hp: def.health, max: def.health });
  addHoldings(world, entity, { weapon: def.startingWeapon });
  return entity;
}
