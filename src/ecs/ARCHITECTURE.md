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
