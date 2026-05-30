import type { ProducibleType } from "../core/types";
import { BUILD_ORDER, BUILDING_STATS, UNIT_STATS } from "../core/config";

export const SIDEBAR_WIDTH = 168;

export interface ButtonRect {
  x: number;
  y: number;
  w: number;
  h: number;
  what: ProducibleType;
  category: "unit" | "building";
  label: string;
  cost: number;
}

/**
 * Compute the clickable build-button rectangles for the sidebar given the
 * current viewport height. Buildings first, then unit-production buttons.
 */
export function computeSidebarButtons(
  viewportWidth: number,
  unitOptions: ProducibleType[]
): ButtonRect[] {
  const buttons: ButtonRect[] = [];
  const x = viewportWidth - SIDEBAR_WIDTH + 10;
  const w = SIDEBAR_WIDTH - 20;
  const h = 34;
  const gap = 6;
  let y = 150; // leave room for the minimap on top

  for (const b of BUILD_ORDER) {
    const s = BUILDING_STATS[b];
    buttons.push({ x, y, w, h, what: b, category: "building", label: s.name, cost: s.cost });
    y += h + gap;
  }

  y += 12; // separator before units
  for (const u of unitOptions) {
    const s = UNIT_STATS[u as keyof typeof UNIT_STATS];
    if (!s) continue;
    buttons.push({ x, y, w, h, what: u, category: "unit", label: s.name, cost: s.cost });
    y += h + gap;
  }

  return buttons;
}

export const MINIMAP = {
  margin: 10,
  size: SIDEBAR_WIDTH - 20,
};
