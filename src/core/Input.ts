import type { Game } from "./Game";
import type { Entity } from "../entities/Entity";
import type { Unit } from "../entities/Unit";
import { SIDEBAR_WIDTH } from "../ui/layout";
import { sound } from "../systems/Sound";
import { TILE_SIZE } from "./config";
import type { Vec2 } from "./types";
import { dist } from "./util";

/** Translates raw mouse & keyboard events into game commands. */
export class InputController {
  private mouse = { x: 0, y: 0 };
  private dragStart: Vec2 | null = null;
  private readonly keys = new Set<string>();
  /** When false (e.g. while the menu is shown) all input is ignored. */
  enabled = true;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private game: Game
  ) {
    this.attach();
  }

  /** Point the controller at a new game (e.g. after starting a mission). */
  setGame(game: Game): void {
    this.game = game;
    this.dragStart = null;
    this.keys.clear();
  }

  private attach(): void {
    const c = this.canvas;
    c.addEventListener("mousedown", (e) => this.onMouseDown(e));
    c.addEventListener("mousemove", (e) => this.onMouseMove(e));
    window.addEventListener("mouseup", (e) => this.onMouseUp(e));
    c.addEventListener("contextmenu", (e) => e.preventDefault());
    window.addEventListener("keydown", (e) => {
      sound.unlock();
      this.keys.add(e.key.toLowerCase());
    });
    window.addEventListener("keyup", (e) => {
      this.keys.delete(e.key.toLowerCase());
      if (!this.enabled) return;
      if (e.key === "Escape") this.game.cancelPlacement();
      if (e.key.toLowerCase() === "m") sound.toggle();
    });
  }

  private inSidebar(sx: number): boolean {
    return sx >= this.game.camera.viewportWidth - SIDEBAR_WIDTH;
  }

  private onMouseDown(e: MouseEvent): void {
    if (!this.enabled) return;
    const sx = e.offsetX;
    const sy = e.offsetY;
    this.mouse = { x: sx, y: sy };
    if (this.game.gameOver) return;

    // Sidebar interaction.
    if (this.inSidebar(sx)) {
      if (e.button === 0) this.handleSidebarClick(sx, sy);
      return;
    }

    // Placement mode: left click confirms, right click cancels.
    if (this.game.placement) {
      if (e.button === 0) this.game.confirmPlacement();
      else this.game.cancelPlacement();
      return;
    }

    if (e.button === 0) {
      // Begin selection.
      this.dragStart = { x: sx, y: sy };
    } else if (e.button === 2) {
      // Right-click command.
      this.issueCommand(sx, sy);
    }
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.enabled) return;
    this.mouse = { x: e.offsetX, y: e.offsetY };

    // Hovered sidebar button.
    this.game.hoveredButton =
      this.game.buttons.find(
        (b) =>
          this.mouse.x >= b.x &&
          this.mouse.x <= b.x + b.w &&
          this.mouse.y >= b.y &&
          this.mouse.y <= b.y + b.h
      ) ?? null;

    // Placement preview follows the cursor.
    if (this.game.placement && !this.inSidebar(this.mouse.x)) {
      this.game.updatePlacementHover(
        this.game.camera.screenToWorld(this.mouse.x, this.mouse.y)
      );
    }

    // Update selection box while dragging.
    if (this.dragStart) {
      const x = Math.min(this.dragStart.x, this.mouse.x);
      const y = Math.min(this.dragStart.y, this.mouse.y);
      this.game.selectionBox = {
        x,
        y,
        w: Math.abs(this.mouse.x - this.dragStart.x),
        h: Math.abs(this.mouse.y - this.dragStart.y),
      };
    }
  }

  private onMouseUp(e: MouseEvent): void {
    if (!this.enabled || e.button !== 0 || !this.dragStart) return;
    const box = this.game.selectionBox;
    const additive = this.keys.has("shift");
    if (!additive) this.game.selected.clear();

    if (box && (box.w > 5 || box.h > 5)) {
      // Box selection: all player units inside.
      for (const u of this.game.units) {
        if (u.faction !== "player") continue;
        const s = this.game.camera.worldToScreen(u.pos.x, u.pos.y);
        if (s.x >= box.x && s.x <= box.x + box.w && s.y >= box.y && s.y <= box.y + box.h) {
          this.game.selected.add(u);
        }
      }
    } else {
      // Single click selection.
      const world = this.game.camera.screenToWorld(this.mouse.x, this.mouse.y);
      const u = this.unitAt(world);
      if (u && u.faction === "player") this.game.selected.add(u);
    }

    this.dragStart = null;
    this.game.selectionBox = null;
  }

  private handleSidebarClick(sx: number, sy: number): void {
    const btn = this.game.buttons.find(
      (b) => sx >= b.x && sx <= b.x + b.w && sy >= b.y && sy <= b.y + b.h
    );
    if (btn) this.game.pressBuildButton(btn);
  }

  private issueCommand(sx: number, sy: number): void {
    if (this.game.selected.size === 0) return;
    const world = this.game.camera.screenToWorld(sx, sy);
    const targetEntity = this.enemyAt(world);
    const tile = this.game.map.worldToTile(world.x, world.y);
    const resourceHere = this.game.map.getResource(tile.tx, tile.ty) > 0;

    for (const u of this.game.selected) {
      if (targetEntity) {
        u.orderAttack(this.game.ctx, targetEntity);
      } else if (u.isHarvester && resourceHere) {
        u.orderHarvest(this.game.ctx);
      } else {
        u.orderMove(this.game.ctx, world);
      }
    }
  }

  private unitAt(world: Vec2): Unit | null {
    let best: Unit | null = null;
    let bestD = Infinity;
    for (const u of this.game.units) {
      const d = dist(world, u.pos);
      if (d <= u.radius + 4 && d < bestD) {
        bestD = d;
        best = u;
      }
    }
    return best;
  }

  private enemyAt(world: Vec2): Entity | null {
    const u = this.unitAt(world);
    if (u && u.faction === "enemy") return u;
    for (const b of this.game.buildings) {
      if (b.faction !== "enemy") continue;
      const left = b.tileX * TILE_SIZE;
      const top = b.tileY * TILE_SIZE;
      if (
        world.x >= left &&
        world.x <= left + b.tileW * TILE_SIZE &&
        world.y >= top &&
        world.y <= top + b.tileH * TILE_SIZE
      ) {
        return b;
      }
    }
    return null;
  }

  /** Called each frame to apply continuous input (camera scrolling). */
  update(dt: number): void {
    if (!this.enabled) return;
    const cam = this.game.camera;
    const speed = cam.speed * dt;
    let dx = 0;
    let dy = 0;
    if (this.keys.has("a") || this.keys.has("arrowleft")) dx -= speed;
    if (this.keys.has("d") || this.keys.has("arrowright")) dx += speed;
    if (this.keys.has("w") || this.keys.has("arrowup")) dy -= speed;
    if (this.keys.has("s") || this.keys.has("arrowdown")) dy += speed;

    // Edge scrolling.
    const edge = 12;
    const w = cam.viewportWidth;
    const h = cam.viewportHeight;
    if (this.mouse.x < edge) dx -= speed;
    else if (this.mouse.x > w - edge && !this.inSidebar(this.mouse.x)) dx += speed;
    if (this.mouse.y < edge) dy -= speed;
    else if (this.mouse.y > h - edge) dy += speed;

    if (dx !== 0 || dy !== 0) cam.move(dx, dy);
  }
}
