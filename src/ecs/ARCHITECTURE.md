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

# Rendering

Rendering lives in `src/render/`, outside the ECS. It only reads the world; nothing in `src/ecs/` knows about WebGL. The ECS holds plain data the renderer reads: `Sprite` (which art, which layer, outline/glow), `Facing`, and the camera resource.

## Every frame

1. `alpha = accumulator / TICK_MS`: how far the leftover time reaches into the next tick.
2. `frameView` works out where the camera looks (the followed entity's interpolated position) and builds a `View`.
3. `buildFrame` fills a `QuadBuffer` with every quad to draw. It's pure: world + view + art in, flat quad data out. This is where all the rendering logic and its tests live.
4. `renderer.draw` uploads that buffer and draws everything in **one instanced draw call** from **one atlas texture**.

Entities are drawn at `lerp(previousPosition, position, alpha)`, so the screen runs **up to one tick behind** the game (50 ms at 20 ticks/s). In exchange, movement is smooth at any monitor refresh rate.

## Screen vs world

Screen pixels are device pixels with the origin at the canvas's top-left and y down. At zoom 1, one tile is 40 CSS pixels and one sprite pixel is 5 (sprites are 8x8 = one tile). `camera.zoom` scales that with no limit, and `camera.focusOffset` moves where the followed entity sits on screen. Only tiles and entities inside the visible area are emitted, so zooming out just draws more.

## Draw order (bottom to top)

1. Ground tiles: rotate with the camera. Tiles outside the map aren't drawn.
2. Walls: cubes one tile tall. Each wall draws the side faces that face the viewer after rotation and don't touch another wall, then its raised top. Walls are sorted back to front by screen y.
3. Enemies, then projectiles, then the player. Within a layer, sprites lower on screen draw over higher ones.

Sprites always stay upright. Which way a walker appears to face is worked out on screen, so turning the camera turns them too. Diagonals show the side view, and left is the mirrored side view.

## Outline and glow

Both happen in the fragment shader, not in the art, so any sprite can get any color at runtime. A sprite with an outline is drawn on a quad enlarged by `margin` sprite pixels. Transparent pixels within 0.2 sprite pixels of an opaque one get the outline color. With a glow, pixels further out up to `glow.radius` get a fading version of it, pulsing at `glow.pulseHz`.

## Art

Sprites are separate 8x8 PNGs under `public/sprites/` so they're easy to edit. `src/render/assets.ts` lists which files each sprite name and tile type uses. At load, every file is packed into one atlas canvas with 1 px of padding and uploaded to the GPU once. To add art, drop in a PNG and reference it in the manifest. A test fails if the manifest names a file that doesn't exist.

`scripts/generate-sprites.mjs` only seeded the starter art. Re-running it overwrites the PNGs.
