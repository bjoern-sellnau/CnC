import { MAP_HEIGHT, MAP_WIDTH, TILE_SIZE } from "../core/config";
import type { Vec2 } from "../core/types";

export const FOG_HIDDEN = 0; // never seen
export const FOG_EXPLORED = 1; // seen before, not currently visible
export const FOG_VISIBLE = 2; // currently in sight

/**
 * Per-tile visibility for the player. Tiles start hidden; units and buildings
 * reveal a circular area each frame. Previously seen tiles stay "explored"
 * (terrain remembered) but enemies in them are hidden until seen again.
 */
export class FogOfWar {
  readonly width = MAP_WIDTH;
  readonly height = MAP_HEIGHT;
  readonly state: Uint8Array;
  enabled = true;

  constructor() {
    this.state = new Uint8Array(this.width * this.height).fill(FOG_HIDDEN);
  }

  get(tx: number, ty: number): number {
    if (tx < 0 || ty < 0 || tx >= this.width || ty >= this.height) return FOG_HIDDEN;
    return this.state[ty * this.width + tx];
  }

  /** Is a world position currently visible to the player? */
  isVisibleAt(world: Vec2): boolean {
    if (!this.enabled) return true;
    const tx = Math.floor(world.x / TILE_SIZE);
    const ty = Math.floor(world.y / TILE_SIZE);
    return this.get(tx, ty) === FOG_VISIBLE;
  }

  /** Demote all currently-visible tiles to explored before re-stamping sight. */
  beginFrame(): void {
    if (!this.enabled) return;
    const s = this.state;
    for (let i = 0; i < s.length; i++) {
      if (s[i] === FOG_VISIBLE) s[i] = FOG_EXPLORED;
    }
  }

  /** Reveal a circular area (sight radius in pixels) around a world point. */
  reveal(world: Vec2, sightPixels: number): void {
    if (!this.enabled) return;
    const cx = world.x / TILE_SIZE;
    const cy = world.y / TILE_SIZE;
    const r = sightPixels / TILE_SIZE;
    const r2 = r * r;
    const minX = Math.max(0, Math.floor(cx - r));
    const maxX = Math.min(this.width - 1, Math.ceil(cx + r));
    const minY = Math.max(0, Math.floor(cy - r));
    const maxY = Math.min(this.height - 1, Math.ceil(cy + r));
    for (let ty = minY; ty <= maxY; ty++) {
      for (let tx = minX; tx <= maxX; tx++) {
        const dx = tx + 0.5 - cx;
        const dy = ty + 0.5 - cy;
        if (dx * dx + dy * dy <= r2) {
          this.state[ty * this.width + tx] = FOG_VISIBLE;
        }
      }
    }
  }
}
