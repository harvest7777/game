import { enemyDef } from "../enemy/definitions";
import { projectileDef } from "../projectile/definitions";
import type { SoundMessage } from "../outbox";
import type { World } from "../world";

// Turns gameplay events into semantic sound requests for the browser. It runs
// before cleanup, while hit and death targets still have their components.
export function soundSystem(world: World, _dt: number): void {
  const sounds: SoundMessage[] = [];

  for (const cue of world.events.soundCues) {
    sounds.push({ kind: "sound", sound: cue.sound, at: { ...cue.at } });
  }

  for (const shot of world.events.shotsFired) {
    const enemy = world.components.enemy.get(shot.owner);
    const audible =
      world.components.playerControlled.has(shot.owner) ||
      (enemy !== undefined && enemyDef(enemy.def).playsShotSound === true);
    if (!audible) continue;
    sounds.push({
      kind: "sound",
      sound: projectileDef(shot.projectile).sound.fire,
      at: shot.at,
    });
  }

  for (const hit of world.events.hits) {
    const projectile = world.components.projectile.get(hit.projectile);
    const at = world.components.position.get(hit.target);
    if (!projectile || !at) continue;
    const sound = projectileDef(projectile.def).sound;
    sounds.push({
      kind: "sound",
      sound:
        world.components.team.get(hit.target) === "player"
          ? sound.hitPlayer
          : sound.hitEnemy,
      at: { ...at },
    });
  }

  for (const death of world.events.deaths) {
    const enemy = world.components.enemy.get(death.entity);
    const at = world.components.position.get(death.entity);
    if (!enemy || !at) continue;
    sounds.push({
      kind: "sound",
      sound: enemyDef(enemy.def).deathSound,
      at: { ...at },
    });
  }

  world.outbox.push(...sounds);
}
