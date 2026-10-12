import type { Item } from "../inventory/components";
import type { Entity } from "../world";

// General item storage for world objects. Loot bags use it now; chests and
// other containers can reuse it without inheriting bag presentation rules.
export type Container = { slots: (Item | null)[] };

// A world container that opens automatically while a player is nearby.
// Keeping this separate from Container lets future chests use another access
// policy without changing storage or transfer rules.
export type ProximityContainer = { radius: number };

// Which world container a player may currently interact with.
export type ContainerAccess = { container: Entity };
