import type { GameMap } from "./GameMap";
import type { Vec2 } from "../core/types";

interface Node {
  tx: number;
  ty: number;
  g: number;
  f: number;
  parent: Node | null;
}

/**
 * A* pathfinding on the map grid with 8-directional movement.
 * Returns a list of tile centers (world coords) from start to goal,
 * or null if no path exists. Diagonal moves through two blocked
 * corners are disallowed to avoid clipping through buildings.
 */
export function findPath(
  map: GameMap,
  start: Vec2,
  goal: Vec2,
  maxNodes = 6000
): Vec2[] | null {
  const s = map.worldToTile(start.x, start.y);
  let g = map.worldToTile(goal.x, goal.y);

  // If the goal tile is blocked, retarget to the nearest passable neighbour.
  if (!map.isPassable(g.tx, g.ty)) {
    const alt = nearestPassable(map, g.tx, g.ty);
    if (!alt) return null;
    g = alt;
  }

  if (s.tx === g.tx && s.ty === g.ty) return [map.tileToWorldCenter(g.tx, g.ty)];

  const open: Node[] = [];
  const openMap = new Map<number, Node>();
  const closed = new Set<number>();
  const key = (x: number, y: number) => y * map.width + x;

  const startNode: Node = { tx: s.tx, ty: s.ty, g: 0, f: heuristic(s, g), parent: null };
  open.push(startNode);
  openMap.set(key(s.tx, s.ty), startNode);

  let processed = 0;
  while (open.length > 0) {
    if (++processed > maxNodes) break;

    // Pop lowest f (linear scan; fine for our map sizes).
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (open[i].f < open[bi].f) bi = i;
    const cur = open.splice(bi, 1)[0];
    openMap.delete(key(cur.tx, cur.ty));

    if (cur.tx === g.tx && cur.ty === g.ty) {
      return reconstruct(map, cur);
    }
    closed.add(key(cur.tx, cur.ty));

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = cur.tx + dx;
        const ny = cur.ty + dy;
        if (!map.isPassable(nx, ny)) continue;
        // Prevent cutting diagonal corners.
        if (dx !== 0 && dy !== 0) {
          if (!map.isPassable(cur.tx + dx, cur.ty) || !map.isPassable(cur.tx, cur.ty + dy)) {
            continue;
          }
        }
        const k = key(nx, ny);
        if (closed.has(k)) continue;
        const stepCost = dx !== 0 && dy !== 0 ? 1.414 : 1;
        const ng = cur.g + stepCost;
        const existing = openMap.get(k);
        if (existing && ng >= existing.g) continue;
        const node: Node = {
          tx: nx,
          ty: ny,
          g: ng,
          f: ng + heuristic({ tx: nx, ty: ny }, g),
          parent: cur,
        };
        if (existing) {
          existing.g = node.g;
          existing.f = node.f;
          existing.parent = cur;
        } else {
          open.push(node);
          openMap.set(k, node);
        }
      }
    }
  }
  return null;
}

function heuristic(a: { tx: number; ty: number }, b: { tx: number; ty: number }): number {
  const dx = Math.abs(a.tx - b.tx);
  const dy = Math.abs(a.ty - b.ty);
  // Octile distance.
  return (dx + dy) + (1.414 - 2) * Math.min(dx, dy);
}

function reconstruct(map: GameMap, node: Node): Vec2[] {
  const out: Vec2[] = [];
  let cur: Node | null = node;
  while (cur) {
    out.push(map.tileToWorldCenter(cur.tx, cur.ty));
    cur = cur.parent;
  }
  out.reverse();
  out.shift(); // drop the starting tile; we are already there
  return out;
}

function nearestPassable(map: GameMap, tx: number, ty: number): { tx: number; ty: number } | null {
  for (let r = 1; r <= 6; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        if (map.isPassable(tx + dx, ty + dy)) return { tx: tx + dx, ty: ty + dy };
      }
    }
  }
  return null;
}
