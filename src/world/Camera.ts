import { MAP_HEIGHT, MAP_WIDTH, TILE_SIZE } from "../core/config";
import { clamp } from "../core/util";
import type { Vec2 } from "../core/types";

/** Viewport over the world. Holds a top-left offset in world pixels. */
export class Camera {
  x = 0;
  y = 0;
  viewportWidth = 0;
  viewportHeight = 0;

  private readonly worldWidth = MAP_WIDTH * TILE_SIZE;
  private readonly worldHeight = MAP_HEIGHT * TILE_SIZE;

  readonly speed = 600; // pixels per second when scrolling

  setViewport(w: number, h: number): void {
    this.viewportWidth = w;
    this.viewportHeight = h;
    this.clampToWorld();
  }

  move(dx: number, dy: number): void {
    this.x += dx;
    this.y += dy;
    this.clampToWorld();
  }

  centerOn(world: Vec2): void {
    this.x = world.x - this.viewportWidth / 2;
    this.y = world.y - this.viewportHeight / 2;
    this.clampToWorld();
  }

  worldToScreen(wx: number, wy: number): Vec2 {
    return { x: wx - this.x, y: wy - this.y };
  }

  screenToWorld(sx: number, sy: number): Vec2 {
    return { x: sx + this.x, y: sy + this.y };
  }

  private clampToWorld(): void {
    this.x = clamp(this.x, 0, Math.max(0, this.worldWidth - this.viewportWidth));
    this.y = clamp(this.y, 0, Math.max(0, this.worldHeight - this.viewportHeight));
  }
}
