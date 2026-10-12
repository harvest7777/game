[ECS pattern](https://en.wikipedia.org/wiki/Entity_component_system)

# For skimming

A component are primitive types that ONLY HOLD DATA. They don't know how the data is consumed or manipulated. They are are CHARACTERISTICS that are found within archetypes. Ex velocity.

A bundle is a LOGICAL GROUPING of components for reusable and mental model convenience. Ex a movement bundle would have the position, velocity, and hitbox components.

An archetype is the set of components an entity currently has. Ex an enemy might contain the wandering bundle sometimes, or the chasing bundle sometimes.

A system is a series of pure helper functions that update the world state for some dt that has passed.

- Game systems ONLY know how to update the WORLD based on some DELTA TIME.
- Systems should never import each other, they MUST be completely self isolated. If they need to share some behavior, it goes in a helper under `src/ecs/shared/` (physics, firing, arming shooters, boss actions, teams, damage). Only `tick.ts` imports systems, and `architecture.test.ts` fails if anything else does.

# Content

Game content is data, one file per thing under `src/content/`: `projectiles/`, `weapons/`, `items/`, `enemies`, `characters`, reusable loot definitions and `dungeons/`. The types it's written in (`ProjectileDef`, `WeaponDef`, `ItemDef`, `EnemyDef`, `CharacterDef`, `LootTableDef`, `LootBagDef`) live with the systems that use them, and nothing in `src/ecs/` imports content.

- **Definitions refer to each other directly**, by importing them: an item holds its `WeaponDef`, a weapon its `ProjectileDef`, an enemy its weapons. Components do the same (`Projectile.def`, `Shooter.weapon`, `Item.def`, `Enemy.def`), so a typo or a missing definition doesn't compile, and nothing is looked up by id at runtime. Dungeons are the first exception: they're JSON for a future asset maker, naming things by id, checked as they load (see Dungeons). New content formats head that way.
- **Each folder's `index.ts` lists everything in it**, keyed by id, for debug pickers and for the content tests, which check every definition makes sense and that whatever it refers to is listed too.
- **Art lives with what uses it** (see Art), so there are no sprite names to keep in sync.
- **Engine tests don't use content.** They build what they need from the fixtures in `src/testing/defs.ts` (`testProjectile`, `testWeapon`, `testItem`, `testEnemy`, `testBoss`, `testCharacter`), passing only the fields the test is about, so retuning or removing content never breaks them.

To add something, add its file and list it in its folder's index.

# Levels

A `LevelDef` (one file each under `src/content/levels/`) draws its map as text, one character per tile, and its `legend` says what each character is: a wall (optionally in its own `WallDef` style, a top and side image), void (black, flat, and as solid as a wall), or a `GroundDef` to walk on, which can be the spawn (exactly one). Levels share the standard legend in `content/levels/legend.ts`: `#` wall, `,` grass, `=` wood, `~` water, `P` the wood characters spawn on. A level can also list enemies to place. `loadLevel` builds a fresh world on the map, places the enemies and returns the spawn point; a map that breaks the rules throws as it loads.

A `GroundDef` (one file each under `src/content/grounds/`) is its tile art, an optional `speedScale` and an optional `hazard`. The tiles keep the level's grounds (`tiles.grounds`, indexed by each tile's ground type), so the renderer draws each tile's own art and walking speed is scaled by the ground underfoot: water slows the player and enemies to half speed. Projectiles don't care.

A `hazard` (`{ damage, every }`) burns characters standing on the ground, like `lava`. `hazardSystem` runs after movement and keeps a `HazardExposure` timer on each `player`-team entity standing on hazardous ground: every `every` seconds on it deals `damage` through `applyDamage`, ignoring defense. Stepping off drops the timer, so a quick hop across is free. Enemies never burn.

`travel(from, to, entity, at)` moves an entity, with everything it has, into another world, leaving behind what only made sense in the old one (its target, container access and hazard timer). The camera follows if it was following it. `main.ts` uses it to swap the whole world when entering a level.

The game starts in the **nexus**, a cozy place to rest between fights: a rounded square of grass crossed by a plus of boardwalks, with a ring of them around a fountain in the middle sheltered by low curved walls, a pond with a dock in each quarter, and nooks off each arm. Nothing hostile lives there. Beside the spawn stand portals into the Abyss of Demons and the Test Caves.

# Portals

A `PortalDef` (`src/content/portals/`) is a label, sprite and `to`: a destination id the game resolves outside the simulation, so the ECS never builds levels. Levels place portals (`LevelDef.portals`), and an enemy with a `deathPortal` opens one where it dies (`deathPortalSystem`, before cleanup), like a dungeon boss's way home. Pressing Enter sends an `enterPortal` command; `portalSystem` finds the nearest portal within reach of the player (1 tile unless it says otherwise) and puts a `travel` message in the outbox. `main.ts` resolves its `to` with `destination` (`content/destinations.ts`): a level id, or a dungeon id built from a fresh random seed, then `travel`s the character there.

# Dungeons

Dungeons are generated, not drawn. A `DungeonDef` is plain JSON (`src/content/dungeons/*.json`) naming enemies and grounds by registry id, so an asset maker can write one without code. The generator in `src/dungeon/` knows nothing about the game: it imports only itself (`dungeon/architecture.test.ts` checks), works in cell kinds (`void`, `wall`, `floor`, `corridor`, `liquid`, `accent`) and string ids, and is seeded, so the same definition and seed always build the same dungeon.

`generateDungeon(spec, seed)` runs these stages in order, each a pure function with its own tests and an ASCII view for failures:

1. **Graph** (`graph.ts`): a main path of rooms from `start` to `goal`, with branches ending in `deadEnd`s: a tree, so everything is reachable. Then `loops` (`LOOPS`): a `shortcut` corridor between main path rooms `span` apart, or a `detour` of extra rooms leaving the main path and rejoining it further on. Loops never reach the goal, and no room joins more than four others.
2. **Shapes** (`shapes.ts`): each room's floor as a `Mask`, from the room spec its tag picked by weight: `rect`, `ellipse` or `cave` (cellular automata, retried when too small).
3. **Placement** (`place.ts`): `grow` puts each room `gap` tiles off a random side of its parent, its middle within the parent's span, clear of every other room and corridor.
4. **Routing** (`route.ts`): a corridor per edge, `width` wide, from the dungeon's list of routers tried in order: `straight` across a shared row or column, `L` with one bend, or `astar`, which finds any way around rooms in the way, wandering by `wiggle` and kept straight by `turnCost`. Corridors never enter rooms they don't join. Every tree edge must be routed; loop edges are routed if any router can, and left out otherwise.
5. **Rasterize** (`grid.ts`): everything onto one `DungeonMap` of cell kinds, walls around anything walkable, with each room's cells and the entrances corridors come in by.
6. **Features** (`features.ts`): `pool` (liquid or accent blobs), `pillars` and `border`. A try that would cut a room's safe floor in two or cover an entrance is undone and retried, then dropped.
7. **Populate** (`populate.ts`): each room's spawn groups roll weighted picks (`count` of each per pick) and place them on safe floor: `scatter` (spaced, away from entrances), `center`, `ring`, or `cluster` (packed around one spot, for packs). Nothing spawns where characters arrive.

A stage that can't satisfy its spec fails the attempt, and the next attempt starts over on a seed derived from the first (`deriveSeed`), up to 50 times, after which it throws naming the stages that failed. The result is also checked: every room must be reachable from the start without stepping in liquid.

Every variable piece is a table keyed by `kind` (`LOOPS`, `SHAPES`, `PLACERS`, `ROUTERS`, `FEATURES`, `PLACEMENTS`), so a new kind is a new entry. `parseDungeonDef` checks a definition field by field against matching tables of checks, so a new kind without a check doesn't compile, and reports every problem with its path (`rooms.normal[1].shape.w: min is more than max`), unknown fields and unknown ids included. Content indexes check their files as they load (`dungeonDef`), and content tests build each dungeon from many seeds.

`dungeonLevel(def, seed, registries)` (`ecs/level/dungeon.ts`) is the only place dungeons meet the game: it generates the dungeon and turns it into an ordinary `LevelDef`, drawing each cell kind as the theme's ground (liquid and accent fall back to floor), raising walls in the theme's `wall` style (or the default), leaving the rock around everything as void, and resolving enemy, ground and wall ids through the registries. `loadLevel` takes it from there.

# Debug panel

`src/debug/panel.ts` wires up the overlay's debug controls, outside `main.ts` and the ECS: the render toggles, an invulnerable toggle (off to start, applied to whoever is being played), a max-stats command, an item giver, an enemy spawner, and a dungeon picker that enters any dungeon from a typed seed (or a random one, then shown as the seed box's hint) and a button back to the nexus. Every new character is handed a kit of weapons to try.

# Characters

The player is an entity built from a `CharacterDef` (a class from the character list, like the `wizard`): name, art, hitbox, all eight starting stats and caps, and a starting weapon. `spawnCharacter` makes it player-controlled on the `player` team at full health and mana, wearing its starting weapon, with a `Character` component recording its class.

Characters die like anything else. `gravestoneSystem` leaves the class's `gravestone` art where one died, on the `ground` sprite layer under everything, for good, and moves a camera that was following the character onto it. The overlay's respawn button, shown while there's no character, spawns a fresh one at the level's spawn.

# Stats

The eight typed stat kinds are Health, Mana, Attack, Defense, Speed, Dexterity, Vitality and Wisdom. Each is a sparse ECS component holding `{ value, max }`, selected through the `STAT` constants rather than authored string ids. For Health and Mana, `value` is the resource left and `max` its capacity; for the six attributes, they are the base rating and class cap. A character definition supplies all eight. Enemy definitions require Health and opt into only the other stats they use, so thousands of ordinary enemies do not carry six empty values.

Pure helpers turn attributes into behavior: Attack scales projectile damage, Dexterity scales an authored weapon rate, Speed becomes tiles per second, Defense subtracts incoming damage with a 15% floor, and Vitality/Wisdom become health/mana regeneration. Missing attributes are neutral, preserving existing enemy tuning. Projectiles snapshot Attack when fired, so an owner disappearing or changing stats cannot alter a shot already in flight. The stat system only applies the `maxStats` command and regeneration; movement, shooting and damage read the shared helpers without calling it.

# Units

All distances are in tiles (1 tile = 1 meter) and all times are in seconds. Positions and sizes are in tiles, velocities in tiles per second. Field names don't repeat the unit.

Angles are in radians, turn rates in radians per second.

# Coordinate system

World coordinates match the screen when the camera isn't rotated:

- +x is right (east), -x is left (west).
- +y is **down** (south), -y is **up** (north). This is the canvas convention, so it's flipped from math class.
- The map's origin (0, 0) is its top-left corner. Tile (x, y) covers [x, x + 1) × [y, y + 1), so its center is (x + 0.5, y + 0.5). Everything outside the map counts as a wall.
- Positions are the **center** of an entity's hitbox.

Because y points down, a positive rotation by the usual formula `(x cos θ - y sin θ, x sin θ + y cos θ)` turns things **clockwise** on screen.

# Controls

Keys map to actions through a keybind preset (`keybindPresets`): `default` (F/R/S/T to move, W/P to turn) or `wasd` (WASD to move, Q/E to turn), both with Shift to crouch-walk. Tab toggles the player's autofire in either layout; it starts off, and holding the left mouse button on the game shoots either way. The overlay's settings (`src/settings/panel.ts`) switch presets and rebind HUD keys, remembering both in the browser. Only `main.ts` sees keys; everything else works with actions.

# Camera and movement input

`camera.angle` is the world direction the top of the screen faces, in radians clockwise from world up (-y). At 0 the screen and world line up. At π/2 the top of the screen faces world +x.

Movement keys are always **screen-relative**: Up moves toward the top of the screen no matter how the camera is rotated. The player input system builds the direction in screen space and rotates it by `camera.angle` to get the world direction. Nothing else should need to know the screen and world differ.

# Events

`world.events` holds what happened this tick, for other systems to react to: shots, hits, damage, deaths, item moves and despawns. A system records what happened, and each reaction is its own system reading the list, so loot, sounds and damage numbers never touch the system that found the event.

- Events last **one tick**: `runTick` clears them first, and the order in `tick.ts` runs producers before consumers.
- `despawns` is the removal queue. Systems ask for an entity to be removed, and `cleanupSystem` removes them all at the end of the tick, so nothing disappears while another system is iterating over it.
- `world.random` is the source of randomness (damage rolls). Tests swap in a predictable one.

# Combat

The Health stat works on anything, player or enemy. Each tick, after movement:

1. `hitSystem` finds projectiles that touched something with health on another `team`. It compares where both moved from and to over the tick, so neither can skip through the other. A shot that doesn't pierce hits the first thing it reached and is queued for removal. A piercing shot hits everything it touched, each thing once over its flight (`Projectile.struck`). Damage is rolled from the projectile's `damage: [min, max]`.
2. `damageSystem` applies each hit through `applyDamage` (`shared/damage.ts`), the one place damage happens. Defense reduces damage point-for-point down to 15% of the incoming hit, armor piercing bypasses it, then vulnerability applies. It records a `damaged` event with the final whole amount, and reaching 0 records a death once. Something `invulnerable` records the hit (so damage numbers still show) but keeps its health.
3. `damageTextSystem` turns each `damaged` event into a red `FloatingText` entity over the target. Several on one target in a tick start stacked. While its target exists, the renderer anchors the text to that target's own interpolated position, so it stays smooth through turns; it stays where it last was once the target is gone. `floatingTextSystem` ages them and queues them for removal after 0.8 s. The event lasts a tick; the entity carries the lasting effect.
4. `deathSystem` queues the dead for removal, the player included. Only `invulnerable` keeps something alive.
5. `cleanupSystem` removes everything queued.

# Enemies

An enemy is an ordinary entity built from an `EnemyDef` (one file per kind under `src/content/enemies/`, made with `defineEnemy`): sprite, hitbox, sparse stats (Health required), authored movement speed, an optional weapon, and a detection range. `spawnEnemy` gives it the movable bundle, a sprite on the enemy layer, its declared stats, the `enemy` team, `MoveSpeed`, a `Shooter` if it's armed, and an `Enemy` component recording its kind and `origin` (where it spawned, which home-anchored behaviors use).

- `aggroSystem` sets each enemy's `target` to the nearest living thing on another team within its `detectRange`, and clears it when nothing is. Like `hitSystem`, it groups targets by team once a tick (`targetsByTeam`) and only looks at other teams, so ten thousand enemies each check the player rather than each other.
- `spawnCrowd` scatters many enemies over a disc around a point, loose enough not to start piled up and off walls, for swarms and stress tests.
- Shooters the player doesn't control aim at their target and only fire while they have one, ready to shoot the moment they get one.
- Enemy shots are ordinary projectiles on the `enemy` team, so the same hit, damage and death systems hurt the player.

The overlay's enemy picker spawns any kind 4 tiles from the player, toward where it's aiming.

## Behaviors

How an enemy moves is data too (`src/ecs/enemy/behaviors.ts`). Each definition has an `idle` behavior, used with no target, and an `aggro` behavior, used once it has one:

- `stationary`: doesn't move.
- `wander`: strolls between random points within `radius` of its origin, pausing at each, and gives up on points it can't reach.
- `chase`: heads for its target, stopping `stopAt` tiles away.
- `orbit`: circles its target `radius` tiles out.
- `charge`: winds up, dashes at where the target was when the windup ended, then rests.
- `returnHome`: walks back to its origin.

Each behavior is a pure steering function from position, origin, target, speed and a small `BehaviorMemory` to a velocity. `brainSystem` picks idle or aggro, starts a fresh memory whenever that switches, and sets velocity, the way player input does. Movement then handles walls for enemies the same as for everything else.

So a group doesn't move as one:

- **Quirks.** Each enemy rolls its own at spawn (from `world.random`, so still deterministic): speed within 10% of its kind's, a `reach` of 0.8–1.2 that scales how far off it stops (`chase`) or circles (`orbit`), and a coin flip on orbit direction.
- **Separation.** Enemies that move ease apart from other enemies closer than their hitboxes plus 0.5 tiles, harder the closer they are (`separation.ts`). The push is added to the steering and capped at the enemy's speed (or a dash's own speed), so they still chase, just as a loose arc instead of a pile. Neighbors come from a grid of cells sorted into flat arrays each tick, so thousands of enemies stay cheap. Only enemies space out, not the player, and stationary ones aren't pushed.

## Phases

A definition can add `phases`: a starting phase and a list of named phases. Each phase can override the enemy's `idle`, `aggro` and `weapon` (`weapon: null` holds fire), and lists transitions checked in order: `healthBelow` (fraction of max), `after` (seconds in the phase), `targetWithin` and `targetBeyond` (tiles). Each condition is one entry in the `CONDITIONS` table in `phases.ts`, so adding one touches nothing else. `phaseSystem` runs before the brain, times the phase and takes the first transition that holds, at most one per tick. Switching restarts the phase clock, swaps the weapon (keeping its cooldown) and gives the brain a fresh memory.

A boss phase can instead declare a deterministic `rotation` of named sequences. A sequence is an authored timeline of stages: each stage names its animation clip, duration, movement (`phase`, `stationary`, or a locked-aim `dash`), optional weak-point multiplier, whether it's `invulnerable`, and timed cues. Cues cross their timestamp exactly once; `fire` uses the same weapon/pattern path as ordinary shooters, `sound` becomes a spatial sound request, and `summon` calls `count` minions in around the boss, `radius` tiles out, never letting more than `max` it summoned be alive (each records its `summoner`). Movement kinds and cue kinds are each a table of handlers (`stageMovement.ts`, `cues.ts`), so a new kind is a new entry, not a new branch in the brain or the action system.

**Names are checked at compile time.** `defineEnemy` ties a boss's phase names, sequence names and animation clips together, so a transition to a phase it doesn't have, a rotation naming a missing sequence, or a stage playing a clip its art doesn't have won't compile. `bossActionSystem` owns the timeline and runs before the brain; the renderer only samples its clip progress, never deciding gameplay. A phase transition restarts its rotation, and losing a target pauses it and clears any vulnerability.

`slimeKing` demonstrates the encounter pattern. At 100–66% it teaches an outward ring and aim-locked spray; at 66–30% it alternates a clearly telegraphed dash with ring casts, exposing itself after the dash; below 30% it repeats frenzy, dash and a bright `collapse` core that takes double damage. Like every other enemy, its projectiles originate at its center, so standing on the King during a release is dangerous.

`malphas`, the Abyss of Demons' boss, builds on it. Above 70% it circles at range casting flame rings and three aim-locked lance volleys, and summons imps while invulnerable; to 35% it dash-slams into a shockwave and stands exposed, spins out pinwheels of curling flame and summons flamers; below that it chases with frenzies of mirrored curling flames until it collapses, taking double damage. It opens a portal home when it falls and may drop the Demonfire Staff. The Abyss is tuned for medium difficulty at roughly half-maxed stats.

# Items and inventory

Items are data, one file each under `src/content/items/`. Every item has a name, icon and loot profile. Equipment also has a `kind` (one of `ITEM_KINDS`: `weapon`, `ability`, `armor` or `ring`), while consumables are a separate category that can sit in general storage but never in an equipment slot. A loot profile has either a validated numeric tier or typed tag-definition references such as `SPECIAL`; definitions refer to those tags directly, never by string id.

What someone owns is an `Item` (`{ def }`, an object so per-copy data can be added later) in one of two components:

- `Equipment`: one slot per kind in `ITEM_KINDS`. Only weapons exist so far, so the other three stay empty.
- `Inventory`: 8 slots that take anything.

A `SlotRef` names any slot: equipment and inventory slots are local to the acting entity, while `{ in: "container", entity, index }` identifies a world container explicitly. The rules are pure functions in `slots.ts`: moving onto an occupied slot swaps, an equipment slot only takes its own kind, and a swap only happens if _both_ items fit where they land. Any move involving a world container is accepted only when that player has current `ContainerAccess` to that exact entity, so stale UI commands cannot loot at a distance.

**Commands.** The player's one-off requests (`move`, `take`, `equip`, debug `give`) arrive as `world.input.commands`, so neither keys nor the HUD touch the world. `inventorySystem` applies them in order early in the tick, records an `itemsMoved` event for each move that happened, and keeps the player's `Shooter` firing the equipped weapon (keeping its cooldown, or removing it when no weapon is worn). The equipped weapon is the one source of truth; enemies still use `Shooter` directly.

Number keys 1–8 equip that inventory slot in every control layout. The overlay's item picker gives any item.

# Loot

An enemy definition can hold a `LootTableDef`. A table is a list of independent rolls whose sources can be exact item-definition references, catalog queries, or weighted combinations of either. Tier-range sources choose uniformly among the eligible non-empty equipment kinds first, then uniformly among that kind's matching items, so adding hundreds of weapons does not crowd armor and rings out of a general pool.

At startup, `createLootRuntime` indexes the item registry by category, equipment kind, tier and typed tag. It compiles and memoizes every query used by enemy tables and bags, validates exact references and probabilities, and rejects a droppable item that matches no bag. A death therefore rolls only precompiled arrays; it never scans all content. Adding a tiered item to the item registry automatically places it in every matching tier-range pool.

`lootSystem` reacts to death events before cleanup removes the enemy. Successful rolls from one death are ordered by their highest matching bag priority and partitioned into eight-item bundles. Each becomes a ground entity with generic `Container` and `ProximityContainer` components plus a `LootBag` component. A special item upgrades the bundle containing it to the white-and-blue special bag; overflow creates more bags and is resolved independently. Current ordinary gear (tiers 0–8) and consumables use the brown bag, while the lower-priority blue tiered fallback automatically catches future tier 9+ gear. Existing bags age in `lootBagSystem`; emptied bags leave immediately and all others expire after 60 seconds through the normal despawn queue.

Bag appearance is data under `src/content/loot/`. A `LootBagDef` has art, shader outline, priority, capacity, lifetime, expiry flash and one or more item queries. The highest-priority bag matching any item in a bundle wins, so stat potions override brown bags and special items override everything without conditionals in the loot system. Bag PNGs contain only colored art; the normal 0.2-pixel sprite shader draws their black outline. During the final 10 seconds, rendering interpolates bag age and eases its tint to black and back with frequency accelerating from 1 Hz to 7 Hz. `Container` is deliberately independent from `LootBag`, leaving the same storage component reusable for chests, vaults and trades.

Container access is independent too. After movement, `containerAccessSystem` chooses the nearest non-empty `ProximityContainer` whose radius covers each player and writes only that player's `ContainerAccess`; it never transfers items or calls another system. `inventorySystem` consumes commands against that state, `lootBagSystem` owns bag cleanup, and the HUD only reads it. Future containers can therefore add another access policy without changing storage, transfers or bag behavior.

# Projectiles

A projectile is an ordinary entity: a movable bundle, a sprite on the projectile layer, and a `Projectile` component. The component holds who fired it (`owner`), which side it's on (`team`, copied so it outlives the owner), where and which way it was fired (`origin`, unit `direction`), and its `age`. Everything about how it behaves comes from its **definition**, one file per kind under `src/content/projectiles/`.

## Definitions

Each kind of projectile is a typed data object (`ProjectileDef`). To add a kind, add its file, list it in the index and, if it needs new art, add a PNG. Tests check every definition makes sense and has art. Fields reuse component types where they end up in components (`hitbox: Hitbox`, `sprite` is part of a `Sprite`, `walls` is a `WallResponse` or `"pass"`, speeds are `Speed`), so spawning just copies them, deep-copied so nothing is shared.

## Paths

A projectile's path is a **pure function of its age** (`pathOffset`), in a local frame where x is forward and y is to the right of travel (clockwise on screen):

- It runs along a track at `speed`, changed by `acceleration` and held between `minSpeed` and `maxSpeed`. A negative `minSpeed` lets it fly backwards.
- `turnRate` curves the track. It's radians per second at the starting speed, applied as a fixed curvature, so speeding up covers the same curve faster.
- `turnAcceleration` changes the turn rate as it flies (radians per second²), for curves that aren't perfect arcs: against `turnRate` the curve straightens out. A track like that has no exact formula, so it's worked out in 1/240 s steps once per definition and kept.
- `wave` weaves across the track, perpendicular to it even while turning.
- `boomerang` retraces the whole path, wave included, back to the origin at the end of its lifetime.

Each tick, `projectileSystem` sets velocity to exactly cover this tick's stretch of the path, and the movement system does the moving. So walls are swept for projectiles too: nothing tunnels, however fast or wavy. Projectiles past their lifetime, or that hit a wall last step (`Blocked`), are removed. `spin` turns the sprite at a fixed rate, and `faceDirection` points it along its movement.

## Weapons and shooting

A **weapon** (one file each under `src/content/weapons/`) decides how often it shoots (`rate`, shots per second), its firing `sound`, and what each shot `fires`: a list of projectiles, each with its own kind, `angle` from the aim (positive is clockwise on screen) and whether it's `mirror`ed, curving and weaving to the other side. So one shot can mix kinds: the Leafblade Staff fires a straight vein between two edges that bow out and close back in, and two of the same weaving shot, one mirrored, braid into a helix. `spread` and `ring` build the evenly spaced lists, like `extremePrejudice`'s ten shards in a full ring.

A shooter's shots take its own `team`, so every shooter needs one: firing without one throws rather than guessing a side.

A `Shooter` autofires its weapon at its rate, several shots per tick if needed. Every tick it also records where it's aiming (`Shooter.aim`). The player aims at the cursor's world point (`input.aim`, worked out from the view the frame was drawn with, so the camera's rotation and zoom don't matter). Otherwise it aims the way it's moving, or keeps its last aim when still. The player's weapon comes from what they have equipped (see Items and inventory).

Shooters **face where they aim**, RotMG style, so you can walk one way while shooting another. `facingSystem` owns facing, and runs after shooting so each tick's aim decides that tick's facing.

Projectile art is drawn at 80% (`DEFAULT_PROJECTILE_SCALE`) unless a definition sets `sprite.scale`. Scale only changes the look, never the hitbox.

# Rendering

Rendering lives in `src/render/`, outside the ECS. It only reads the world; nothing in `src/ecs/` knows about WebGL. The ECS holds plain data the renderer reads: `Sprite` (which art, which layer, outline/glow), `Facing`, and the camera resource.

## Every frame

1. `alpha = accumulator / TICK_MS`: how far the leftover time reaches into the next tick.
2. `frameView` works out where the camera looks (the followed entity's interpolated position) and builds a `View`.
3. `buildFrame` fills a `QuadBuffer` with every quad to draw. It's pure: world + view + art in, flat quad data out. This is where all the rendering logic and its tests live.
4. `renderer.draw` uploads that buffer once and draws it in up to **three instanced draw calls** (terrain, then health bars and sprites, then floating text and debug renders) from **one atlas texture**.

Entities are drawn at `lerp(previousPosition, position, alpha)`, so the screen runs **up to one tick behind** the game (50 ms at 20 ticks/s). In exchange, movement is smooth at any monitor refresh rate.

The camera angle is interpolated the same way, from `camera.previousAngle` to `camera.angle`, turning the short way around. Rotation stays a tick-rate game decision, because movement direction depends on it, while the screen turns smoothly at the monitor's rate.

## Screen vs world

Screen pixels are device pixels with the origin at the canvas's top-left and y down. At zoom 1, one tile is 40 CSS pixels and one sprite pixel is 5 (sprites are 8x8 = one tile). `camera.zoom` scales that with no limit, and `camera.focusOffset` moves where the followed entity sits on screen. Only tiles and entities inside the visible area are emitted, so zooming out just draws more.

## Draw order and depth

1. Ground tiles: rotate with the camera, farthest back. Tiles outside the map aren't drawn.
2. Walls: cubes one tile tall, each in its own style (the default wall unless its legend gave one). Each wall draws the side faces that face the viewer after rotation and don't touch another wall in the map, then its raised top; faces looking out at void show. Walls are sorted back to front by screen y. Void tiles draw nothing, leaving the black background.
3. Sprites: enemies, then projectiles, then the player. Within a layer, sprites lower on screen draw over higher ones.

Every quad carries a depth from how far down the screen it stands (a wall's tile center, a sprite's position). Lower on screen is nearer. Ground and walls write their depth into the GPU depth buffer, and sprites only test against it. So a wall hides the part of a sprite standing behind it (north of it, unrotated), never one standing in front. Sprites don't write depth, so they still stack purely by layer among themselves.

Sprites stay upright unless the entity has a `Rotation` (a world angle, smoothed between ticks). Rotated art points right. `Sprite.scale` draws the art bigger or smaller, outline included.

Walkers with `attack` art thrust their weapon for the first half of each shot interval, so the attack pulses with the fire rate. Only the body changes: the legs keep the walk cycle, so attacking while walking works in every direction. Which way a walker appears to face is worked out on screen, so turning the camera turns them too. Diagonals show the side view, and left is the mirrored side view.

`creature` art is for things that only face the viewer, like the Abyss demons: an `idle` loop (3 frames a second, offset per entity so a pack doesn't move in step) and an `attack` swing played around each shot while it has a target, its first half winding up to the shot and the rest releasing after, up to 0.3 s each way (40% of the shot interval for fast shooters). It's worked out from the shooter's cooldown alone, so the simulation knows nothing about it.

## Health bars

Everything with the Health stat gets a bar centered just under its sprite, at its interpolated position, always level on screen. It's a dark frame with the remaining health filled from the left: blending smoothly from green when full through yellow at half to red when empty (`healthColor`, shared with the HUD). Bars are solid quads (`fill`), so they need no art. They're drawn layer by layer with the sprites, each just before its own layer's sprites: an enemy's sprite covers its bar, and the player's bar shows over enemies and their bars. Each is at its owner's depth, so a wall that hides an entity hides its bar too.

## Fonts and text

There are two fonts, both white glyphs in 8×8 cells in the atlas like any other art, tinted when drawn:

- `regular`: 1-pixel strokes, with letters, digits and common punctuation, for labels and tooltips. Capitals and digits are 7 rows tall, and the bottom row is for descenders.
- `bold`: chunky 2-pixel digits for damage numbers.

Glyph files are named so case can't collide on any file system (`upper-a`, `lower-a`, `7`, `question`; see `glyphFile`). **Spacing comes from the art**: when the atlas loads, each glyph's inked columns are measured, so narrow letters take less room, and editing a PNG is all it takes to change a character's spacing. `layoutText` places glyphs by those widths with 1 font pixel between letters and 3 for a space. `pushText` draws laid-out text in screen space, left-aligned or centered, with an optional outline. The font debug render shows every glyph.

## Floating text

Damage numbers are drawn in the bold font at 0.48 of a tile tall, centered over what they follow. They're tinted their color (the quad `tint` multiplies the art), outlined in black, rise 0.95 tiles up the screen easing out (so a stream of numbers separates), and fade over the last third of their life. Their age is interpolated between ticks like positions. They're in the overlay, after sprites and without depth testing, so they show over walls.

## HUD

The HUD lives in `src/hud/`, outside the ECS, and is drawn with the same renderer as the game: same atlas, outline shader and font, so it looks of a piece with the world.

- **It's a view.** It reads the world (`equipmentView`, `inventoryView`, `containerView`) and never changes it. Clicks become commands (`move`, `take`, `equip`) queued for the next tick.
- **`HudState` is client-side:** where each panel sits (a screen corner plus a whole-UI-pixel offset, saved in the browser), what's hovered and since when, what's pressed or dragged, the last click, which slots are flashing, and whether edit mode is on.
- **Panels are pure layouts.** Data in, a size and a list of elements out (boxes, icons, text and invisible `slot` areas), in UI pixels relative to the panel. A panel is just its slot squares (12 UI pixels, an 8×8 icon with a pixel of room inside a lighter border, 2 apart), with nothing behind them. Drawing turns elements into quads; `hitTest` reads the same list, so what you see is what you can click.
- **Input is a pure state machine** (`hudPointer`): pointer events in, commands out, plus whether the HUD used the event.
  - Press an item and drag it past 2 UI pixels to move it; dropping on any slot sends `move` (swaps, equips and unequips all follow the inventory rules).
  - Double-click an inventory item to equip it, a worn item to take it off, or a bag item to take it into the first empty inventory slot.
  - In **edit mode** (`editMode`, no way to turn it on yet), pressing anywhere on a panel grabs its whole group instead; on release the group's screen-placed panel attaches to its nearest screen corner, kept on screen.
- **Feedback:** the hovered slot's border lights up, a dragged item follows the pointer with a faint copy left behind, and a slot an item lands in flashes white (fed by the outbox).
- **Tooltips** appear after hovering an item for 0.3 s, never while dragging, beside the pointer and kept on screen, drawn at half the HUD's scale. `itemTooltip` works them out from the item, weapon and projectile definitions: name, kind, damage (×shots), rate, range (the farthest the projectile's real path gets) and traits.
- **UI scale is its own.** One UI pixel is one art pixel, at 6 CSS pixels rounded to whole device pixels, so the HUD stays crisp whatever the world zoom.

Panels: **equipment** (weapon, ability, armor, ring; dim W/S/A/R when empty), stacked **health/mana** bars just above it, the read-only six-attribute **stats** widget to its left, and the **inventory** (8 slots, numbered by the key that equips them) to its right, bottoms lined up, in the bottom-right corner. A panel is placed either against a screen corner or attached to another panel (`above`, to its `left`, or to its `right`), so a group moves together, and hiding one panel never moves the others. While proximity grants access to a container, its transient panel attaches above the vitals; world movement never changes its screen position, and it is not draggable or persisted.

**HUD hotkeys** (`hotkeys.ts`) change only the HUD and never reach the game: G toggles the inventory, rebindable in settings to any key the game isn't using.

**Vitals** (`hpBar.ts` and `vitals.ts`) are render-only: health keeps its green-to-red fill and animated white damage chunk, while mana is blue. Each shows `value/max` in the regular font at a third of the HUD's size (a panel can have its own smaller pixels, `PanelLayout.scale`). A health chunk holds for 0.15 s then shrinks to the new health over 0.4 s, slowly at first and then faster (eased in, cubed); more damage while it shrinks extends it from where it has got to. That memory (`HpBarState`) lives in `HudState.hpBars`, stepped once a frame by `updateHpBars`.

## Outbox

`world.outbox` carries what the simulation tells the outside world: item moves for HUD feedback and positioned sound requests. It isn't cleared per tick: the client drains it after running the frame's ticks, so a frame that ran two ticks still sees both. Network messages belong here too.

## Sound

Weapons author their firing sound, played once per volley; one without a sound fires quietly, so crowds of ordinary enemies don't drown everything out. Projectile definitions author their player-hit and enemy-hit sounds, and enemy definitions their death sound. Shooting records one event per volley and entity impacts reuse `hits`. `soundSystem` translates those events into `{ sound, at }` outbox messages before cleanup removes their entities. Wall impacts are intentionally silent.

Playback lives in `src/audio/`, outside the ECS. WAV files under `public/sounds/` are loaded into Web Audio buffers. The player position is the listener: sounds are full volume within 2 tiles, fade to silence at 18, and pan in the camera's rotated screen space. The browser plays the nearest requests first with at most 32 voices, so enemy crowds cannot create unbounded audio nodes. Audio resumes on the first keyboard or pointer interaction, as browsers require.

## Debug renders

`RenderDebug` holds overlays you can turn on from the stats panel. They're drawn last with depth testing off, so they show over everything, walls included.

- **hitboxes**: a circle outline around every entity's hitbox at its interpolated position.
- **font**: every glyph of both fonts in the top-right corner. Player is green, enemies red, projectiles yellow, anything without a sprite white.

Rings are drawn by the shader (a quad with `ring > 0`), so they need no art.

## Outline and glow

Both happen in the fragment shader, not in the art, so any sprite can get any color at runtime. A sprite with an outline is drawn on a quad enlarged by `margin` sprite pixels. Transparent pixels within 0.2 sprite pixels of an opaque one get the outline color. With a glow, pixels further out up to `glow.radius` get a fading version of it, pulsing at `glow.pulseHz`.

How far each pixel is from the art comes from a **distance map** baked when the atlas loads (`distance.ts`): one byte per atlas texel, the distance from its center to the nearest opaque texel of its own sprite, reaching 5 texels past each sprite (sprites are packed 10 apart so maps never overlap). The shader samples it once, smoothly, for glows, instead of searching the texels around every pixel, which was what made thousands of overlapping glowing shots slow. Smooth sampling rounds off pixel corners, so within a texel of the art, where the crisp outline is, it measures exactly from just the 3×3 texels around the pixel. Glows reach at most 4 sprite pixels.

## Art

Sprites are separate 8x8 PNGs under `public/sprites/` so they're easy to edit. A `Sprite` holds its `SpriteArt` directly (`src/ecs/sprite/art.ts`: a static file, a walker's facings or a set of animation clips), and definitions declare that art beside everything else about them. `contentArt()` gathers every piece of content art, and `createManifest` adds the fonts and tiles. At load, every file is packed into one atlas canvas with 1 px of padding and uploaded to the GPU once. To add art, drop in a PNG and point a definition at it. A test fails if the manifest names a file that doesn't exist.

`scripts/generate-sprites.mjs` only seeded the starter art. Re-running it overwrites the PNGs.
