import type { PortalDef } from "../../ecs/portal/definitions";
import { abyssPortal } from "./abyss";
import { nexusPortal } from "./nexus";
import { testCavesPortal } from "./testCaves";

// Every kind of portal, by id.
export const portals = {
  nexus: nexusPortal,
  abyss: abyssPortal,
  testCaves: testCavesPortal,
} satisfies Record<string, PortalDef>;
