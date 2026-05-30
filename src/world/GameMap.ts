import { MAP_HEIGHT, MAP_WIDTH, RESOURCE_PER_TILE, TILE_SIZE } from "../core/config";
import type { TerrainType, Vec2 } from "../core/types";

/**
 * The tile-based world map: terrain, resources, and a build/occupancy grid.
 * Coordinates come in two flavours:
 *  - tile coords (column/row, integers)
 *  - world coords (pixels), where worldX = tileX * TILE_SIZE
 */
export class GameMap {
  readonly width = MAP_WIDTH;
  readonly height = MAP_HEIGHT;

  readonly terrain: TerrainType[];
  /** Remaining resource amount per tile (0 = none). */
  readonly resources: number[];
  /** True when a building occupies the tile (blocks movement & building). */
  readonly occupied: boolean[];

  /** Seeded RNG so a given mission seed always produces the same map. */
  private rng: () => number;

  constructor(seed = Date.now() >>> 0) {
    const n = this.width * this.height;
    this.terrain = new Array(n).fill("grass");
    this.resources = new Array(n).fill(0);
    this.occupied = new Array(n).fill(false);
    this.rng = mulberry32(seed);
    this.generate();
  }

  index(tx: number, ty: number): number {
    return ty * this.width + tx;
  }

  inBounds(tx: number, ty: number): boolean {
    return tx >= 0 && ty >= 0 && tx < this.width && ty < this.height;
  }

  getTerrain(tx: number, ty: number): TerrainType {
    return this.terrain[this.index(tx, ty)];
  }

  getResource(tx: number, ty: number): number {
    if (!this.inBounds(tx, ty)) return 0;
    return this.resources[this.index(tx, ty)];
  }

  /** Harvest up to `amount` from a tile, returning what was actually taken. */
  takeResource(tx: number, ty: number, amount: number): number {
    if (!this.inBounds(tx, ty)) return 0;
    const i = this.index(tx, ty);
    const taken = Math.min(this.resources[i], amount);
    this.resources[i] -= taken;
    return taken;
  }

  isPassable(tx: number, ty: number): boolean {
    if (!this.inBounds(tx, ty)) return false;
    const i = this.index(tx, ty);
    const t = this.terrain[i];
    if (t === "rock" || t === "water") return false;
    return !this.occupied[i];
  }

  /** Like isPassable but ignores buildings — used to validate placement spots. */
  isBuildableTerrain(tx: number, ty: number): boolean {
    if (!this.inBounds(tx, ty)) return false;
    const t = this.terrain[this.index(tx, ty)];
    return t === "grass" || t === "sand";
  }

  setOccupied(tx: number, ty: number, value: boolean): void {
    if (this.inBounds(tx, ty)) this.occupied[this.index(tx, ty)] = value;
  }

  tileToWorldCenter(tx: number, ty: number): Vec2 {
    return { x: (tx + 0.5) * TILE_SIZE, y: (ty + 0.5) * TILE_SIZE };
  }

  worldToTile(wx: number, wy: number): { tx: number; ty: number } {
    return { tx: Math.floor(wx / TILE_SIZE), ty: Math.floor(wy / TILE_SIZE) };
  }

  /** Find the nearest tile that still holds resources, within `maxTiles`. */
  findNearestResource(from: Vec2, maxTiles = 40): { tx: number; ty: number } | null {
    const start = this.worldToTile(from.x, from.y);
    let best: { tx: number; ty: number } | null = null;
    let bestD = Infinity;
    for (let ty = Math.max(0, start.ty - maxTiles); ty < Math.min(this.height, start.ty + maxTiles); ty++) {
      for (let tx = Math.max(0, start.tx - maxTiles); tx < Math.min(this.width, start.tx + maxTiles); tx++) {
        if (this.resources[this.index(tx, ty)] <= 0) continue;
        const dx = tx - start.tx;
        const dy = ty - start.ty;
        const d = dx * dx + dy * dy;
        if (d < bestD) {
          bestD = d;
          best = { tx, ty };
        }
      }
    }
    return best;
  }

  private generate(): void {
    // Sandy patches and rock outcrops via simple value noise blobs.
    this.scatterBlobs("rock", 10, 2, 5);
    this.scatterBlobs("water", 4, 3, 6);
    this.scatterBlobs("sand", 14, 3, 7);

    // Resource fields: a few clusters of tiberium-like tiles on grass/sand.
    for (let c = 0; c < 6; c++) {
      const cx = 6 + Math.floor(this.rng() * (this.width - 12));
      const cy = 6 + Math.floor(this.rng() * (this.height - 12));
      const r = 3 + Math.floor(this.rng() * 3);
      for (let ty = cy - r; ty <= cy + r; ty++) {
        for (let tx = cx - r; tx <= cx + r; tx++) {
          if (!this.inBounds(tx, ty)) continue;
          const d = Math.hypot(tx - cx, ty - cy);
          if (d > r) continue;
          const i = this.index(tx, ty);
          if (this.terrain[i] === "rock" || this.terrain[i] === "water") continue;
          if (this.rng() < 1 - d / (r + 1)) {
            this.resources[i] = RESOURCE_PER_TILE;
          }
        }
      }
    }
  }

  private scatterBlobs(type: TerrainType, count: number, minR: number, maxR: number): void {
    for (let c = 0; c < count; c++) {
      const cx = Math.floor(this.rng() * this.width);
      const cy = Math.floor(this.rng() * this.height);
      const r = minR + Math.floor(this.rng() * (maxR - minR + 1));
      for (let ty = cy - r; ty <= cy + r; ty++) {
        for (let tx = cx - r; tx <= cx + r; tx++) {
          if (!this.inBounds(tx, ty)) continue;
          if (Math.hypot(tx - cx, ty - cy) > r) continue;
          this.terrain[this.index(tx, ty)] = type;
        }
      }
    }
  }

  /** Clear terrain & resources in a rectangle — used to guarantee start areas. */
  clearArea(tx: number, ty: number, w: number, h: number): void {
    for (let y = ty; y < ty + h; y++) {
      for (let x = tx; x < tx + w; x++) {
        if (!this.inBounds(x, y)) continue;
        const i = this.index(x, y);
        this.terrain[i] = "grass";
        this.resources[i] = 0;
      }
    }
  }
}

/** Small, fast, seedable PRNG (mulberry32). */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
