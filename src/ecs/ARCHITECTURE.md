[ECS pattern](https://en.wikipedia.org/wiki/Entity_component_system)

# For skimming

A component are primitive types that ONLY HOLD DATA. They don't know how the data is consumed or manipulated. They are are CHARACTERISTICS that are found within archetypes. Ex velocity.

A bundle is a LOGICAL GROUPING of components for reusable and mental model convenience. Ex a movement bundle would have the position, velocity, and hitbox components.

An archetype is the set of components an entity currently has. Ex an enemy might contain the wandering bundle sometimes, or the chasing bundle sometimes.

A system is a series of pure helper functions that update the world state for some dt that has passed.

- Game systems ONLY know how to update the WORLD based on some DELTA TIME.
- Systems should never import each other, they MUST be completely self isolated. If they need to share some behavior, that is a good candidate for a shared helper function.

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

# Camera and movement input

`camera.angle` is the world direction the top of the screen faces, in radians clockwise from world up (-y). At 0 the screen and world line up. At π/2 the top of the screen faces world +x.

Movement keys are always **screen-relative**: Up moves toward the top of the screen no matter how the camera is rotated. The player input system builds the direction in screen space and rotates it by `camera.angle` to get the world direction. Nothing else should need to know the screen and world differ.

# Events

`world.events` holds what happened this tick, for other systems to react to: `hits`, `deaths` and `despawns`. A system records what happened, and each reaction is its own system reading the list, so adding a reaction (loot, sounds, damage numbers) never touches the system that found the event.

- Events last **one tick**: `runTick` clears them first, and the order in `tick.ts` runs producers before consumers.
- `despawns` is the removal queue. Systems ask for an entity to be removed, and `cleanupSystem` removes them all at the end of the tick, so nothing disappears while another system is iterating over it.
- `world.random` is the source of randomness (damage rolls). Tests swap in a predictable one.

# Combat

`Health { hp, max }` works on anything, player or enemy. Each tick, after movement:

1. `hitSystem` finds projectiles that touched something with health on another `team`. It compares where both moved from and to over the tick, so neither can skip through the other. A shot that doesn't pierce hits the first thing it reached and is queued for removal. A piercing shot hits everything it touched, each thing once over its flight (`Projectile.struck`). Damage is rolled from the projectile's `damage: [min, max]`.
2. `damageSystem` applies each hit through `applyDamage`, the one place damage happens. Defense and armor piercing go there when stats arrive. Reaching 0 records a death once.
3. `deathSystem` queues the dead for removal. The player doesn't die yet: it stays at 0.
4. `cleanupSystem` removes everything queued.

# Enemies

An enemy is an ordinary entity built from an `EnemyDef` in `src/ecs/enemy/definitions.ts`: sprite, hitbox, health, speed, an optional weapon, and a detection range. `spawnEnemy` gives it the movable bundle, a sprite on the enemy layer, `Health`, the `enemy` team, `Speed`, a `Shooter` if it's armed, and an `Enemy` component recording its kind and `origin` (where it spawned, which home-anchored behaviors use).

- `aggroSystem` sets each enemy's `target` to the nearest living thing on another team within its `detectRange`, and clears it when nothing is.
- Shooters the player doesn't control aim at their target and only fire while they have one, ready to shoot the moment they get one.
- Enemy shots are ordinary projectiles on the `enemy` team, so the same hit, damage and death systems hurt the player.

The overlay's enemy picker spawns any kind 4 tiles from the player, toward where it's aiming.

# Projectiles

A projectile is an ordinary entity: a movable bundle, a sprite on the projectile layer, and a `Projectile` component. The component holds who fired it (`owner`), which side it's on (`team`, copied so it outlives the owner), where and which way it was fired (`origin`, unit `direction`), and its `age`. Everything about how it behaves comes from its **definition** in `src/ecs/projectile/definitions.ts`.

## Definitions

Each kind of projectile is a typed data object (`ProjectileDef`), checked with `satisfies`. To add a kind, add an entry and, if it needs new art, a PNG plus a manifest entry. Tests check every definition makes sense and has art. Fields reuse component types where they end up in components (`hitbox: Hitbox`, `sprite` is part of a `Sprite`, `walls` is a `WallResponse` or `"pass"`, speeds are `Speed`), so spawning just copies them, deep-copied so nothing is shared.

## Paths

A projectile's path is a **pure function of its age** (`pathOffset`), in a local frame where x is forward and y is to the right of travel (clockwise on screen):

- It runs along a track at `speed`, changed by `acceleration` and held between `minSpeed` and `maxSpeed`. A negative `minSpeed` lets it fly backwards.
- `turnRate` curves the track. It's radians per second at the starting speed, applied as a fixed curvature, so speeding up covers the same curve faster.
- `wave` weaves across the track, perpendicular to it even while turning.
- `boomerang` retraces the whole path, wave included, back to the origin at the end of its lifetime.

Each tick, `projectileSystem` sets velocity to exactly cover this tick's stretch of the path, and the movement system does the moving. So walls are swept for projectiles too: nothing tunnels, however fast or wavy. Projectiles past their lifetime, or that hit a wall last step (`Blocked`), are removed. `spin` turns the sprite at a fixed rate, and `faceDirection` points it along its movement.

## Weapons and shooting

A **weapon** (`src/ecs/projectile/weapons.ts`) decides what a shooter fires and in what pattern: which projectile, `rate` (shots per second), `count` (projectiles per shot) and `arcGap` (radians between them, centered on the aim). Every projectile automatically gets a single-shot weapon so each can be tried alone. `extremePrejudice` fires ten `prejudice` shards in a full ring.

A `Shooter` autofires its weapon at its rate, several shots per tick if needed. Every tick it also records where it's aiming (`Shooter.aim`). The player aims at the cursor's world point (`input.aim`, worked out from the view the frame was drawn with, so the camera's rotation and zoom don't matter). Otherwise it aims the way it's moving, or keeps its last aim when still. The overlay's weapon picker switches the player's weapon.

Shooters **face where they aim**, RotMG style, so you can walk one way while shooting another. `facingSystem` owns facing, and runs after shooting so each tick's aim decides that tick's facing.

Projectile art is drawn at 80% (`DEFAULT_PROJECTILE_SCALE`) unless a definition sets `sprite.scale`. Scale only changes the look, never the hitbox.

# Rendering

Rendering lives in `src/render/`, outside the ECS. It only reads the world; nothing in `src/ecs/` knows about WebGL. The ECS holds plain data the renderer reads: `Sprite` (which art, which layer, outline/glow), `Facing`, and the camera resource.

## Every frame

1. `alpha = accumulator / TICK_MS`: how far the leftover time reaches into the next tick.
2. `frameView` works out where the camera looks (the followed entity's interpolated position) and builds a `View`.
3. `buildFrame` fills a `QuadBuffer` with every quad to draw. It's pure: world + view + art in, flat quad data out. This is where all the rendering logic and its tests live.
4. `renderer.draw` uploads that buffer once and draws it in up to **three instanced draw calls** (terrain, sprites, then UI and debug renders together) from **one atlas texture**.

Entities are drawn at `lerp(previousPosition, position, alpha)`, so the screen runs **up to one tick behind** the game (50 ms at 20 ticks/s). In exchange, movement is smooth at any monitor refresh rate.

The camera angle is interpolated the same way, from `camera.previousAngle` to `camera.angle`, turning the short way around. Rotation stays a tick-rate game decision, because movement direction depends on it, while the screen turns smoothly at the monitor's rate.

## Screen vs world

Screen pixels are device pixels with the origin at the canvas's top-left and y down. At zoom 1, one tile is 40 CSS pixels and one sprite pixel is 5 (sprites are 8x8 = one tile). `camera.zoom` scales that with no limit, and `camera.focusOffset` moves where the followed entity sits on screen. Only tiles and entities inside the visible area are emitted, so zooming out just draws more.

## Draw order and depth

1. Ground tiles: rotate with the camera, farthest back. Tiles outside the map aren't drawn.
2. Walls: cubes one tile tall. Each wall draws the side faces that face the viewer after rotation and don't touch another wall in the map, then its raised top. Walls are sorted back to front by screen y.
3. Sprites: enemies, then projectiles, then the player. Within a layer, sprites lower on screen draw over higher ones.

Every quad carries a depth from how far down the screen it stands (a wall's tile center, a sprite's position). Lower on screen is nearer. Ground and walls write their depth into the GPU depth buffer, and sprites only test against it. So a wall hides the part of a sprite standing behind it (north of it, unrotated), never one standing in front. Sprites don't write depth, so they still stack purely by layer among themselves.

Sprites stay upright unless the entity has a `Rotation` (a world angle, smoothed between ticks). Rotated art points right. `Sprite.scale` draws the art bigger or smaller, outline included.

Walkers with `attack` art thrust their weapon for the first half of each shot interval, so the attack pulses with the fire rate. Only the body changes: the legs keep the walk cycle, so attacking while walking works in every direction. Which way a walker appears to face is worked out on screen, so turning the camera turns them too. Diagonals show the side view, and left is the mirrored side view.

## Health bars

Everything with `Health` gets a bar centered just under its sprite, at its interpolated position, always level on screen. It's a dark frame with the remaining health filled from the left: green, yellow below half, red below a quarter. Bars are solid quads (`fill`), so they need no art, and are drawn in the UI section, over everything.

## Debug renders

`RenderDebug` holds overlays you can turn on from the stats panel. They're drawn last with depth testing off, so they show over everything, walls included.

- **hitboxes**: a circle outline around every entity's hitbox at its interpolated position. Player is green, enemies red, projectiles yellow, anything without a sprite white.

Rings are drawn by the shader (a quad with `ring > 0`), so they need no art.

## Outline and glow

Both happen in the fragment shader, not in the art, so any sprite can get any color at runtime. A sprite with an outline is drawn on a quad enlarged by `margin` sprite pixels. Transparent pixels within 0.2 sprite pixels of an opaque one get the outline color. With a glow, pixels further out up to `glow.radius` get a fading version of it, pulsing at `glow.pulseHz`.

## Art

Sprites are separate 8x8 PNGs under `public/sprites/` so they're easy to edit. `src/render/assets.ts` lists which files each sprite name and tile type uses. At load, every file is packed into one atlas canvas with 1 px of padding and uploaded to the GPU once. To add art, drop in a PNG and reference it in the manifest. A test fails if the manifest names a file that doesn't exist.

`scripts/generate-sprites.mjs` only seeded the starter art. Re-running it overwrites the PNGs.
