import type { Entity, World } from "../ecs/world";
import type { PanelLayout } from "./elements";
import { itemView, type ItemView } from "./items";
import { slotPanel } from "./layout";

export type ContainerView = (ItemView | null)[];

export function containerView(
  world: World,
  entity: Entity,
): ContainerView | undefined {
  return world.components.container.get(entity)?.slots.map(itemView);
}

export function containerPanel(
  entity: Entity,
  view: ContainerView,
): PanelLayout {
  return slotPanel(
    view.map((item, index) => ({
      ref: { in: "container", entity, index },
      item,
    })),
    4,
  );
}
