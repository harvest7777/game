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
