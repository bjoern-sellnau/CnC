import type { Game } from "../core/Game";
import { BUILDING_STATS, MAP_HEIGHT, MAP_WIDTH, TILE_SIZE } from "../core/config";
import type { TerrainType } from "../core/types";
import { MINIMAP, SIDEBAR_WIDTH } from "../ui/layout";

const TERRAIN_COLORS: Record<TerrainType, string> = {
  grass: "#3b5a2a",
  sand: "#9c8a4e",
  rock: "#4a4a4a",
  water: "#274a6b",
};

/** Draws the whole game frame: world, entities, effects and HUD. */
export class Renderer {
  constructor(
    private readonly ctx: CanvasRenderingContext2D,
    private readonly game: Game
  ) {}

  render(): void {
    const { ctx, game } = this;
    const cam = game.camera;
    const w = cam.viewportWidth;
    const h = cam.viewportHeight;

    ctx.clearRect(0, 0, w, h);

    this.drawTerrain();
    this.drawResources();
    this.drawBuildings();
    this.drawPlacementPreview();
    this.drawUnits();
    this.drawProjectiles();
    this.drawExplosions();
    this.drawSelectionBox();
    this.drawHud();

    if (game.gameOver) this.drawGameOver();
  }

  // ---- World --------------------------------------------------------------

  private drawTerrain(): void {
    const { ctx, game } = this;
    const cam = game.camera;
    const startTx = Math.max(0, Math.floor(cam.x / TILE_SIZE));
    const startTy = Math.max(0, Math.floor(cam.y / TILE_SIZE));
    const endTx = Math.min(MAP_WIDTH, Math.ceil((cam.x + this.worldViewW()) / TILE_SIZE));
    const endTy = Math.min(MAP_HEIGHT, Math.ceil((cam.y + cam.viewportHeight) / TILE_SIZE));

    for (let ty = startTy; ty < endTy; ty++) {
      for (let tx = startTx; tx < endTx; tx++) {
        const t = game.map.getTerrain(tx, ty);
        ctx.fillStyle = TERRAIN_COLORS[t];
        const sx = tx * TILE_SIZE - cam.x;
        const sy = ty * TILE_SIZE - cam.y;
        ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
      }
    }
  }

  private drawResources(): void {
    const { ctx, game } = this;
    const cam = game.camera;
    const startTx = Math.max(0, Math.floor(cam.x / TILE_SIZE));
    const startTy = Math.max(0, Math.floor(cam.y / TILE_SIZE));
    const endTx = Math.min(MAP_WIDTH, Math.ceil((cam.x + this.worldViewW()) / TILE_SIZE));
    const endTy = Math.min(MAP_HEIGHT, Math.ceil((cam.y + cam.viewportHeight) / TILE_SIZE));

    for (let ty = startTy; ty < endTy; ty++) {
      for (let tx = startTx; tx < endTx; tx++) {
        const r = game.map.getResource(tx, ty);
        if (r <= 0) continue;
        const sx = tx * TILE_SIZE - cam.x;
        const sy = ty * TILE_SIZE - cam.y;
        const frac = Math.min(1, r / 1000);
        ctx.fillStyle = `rgba(120, 220, 140, ${0.35 + frac * 0.5})`;
        ctx.fillRect(sx + 2, sy + 2, TILE_SIZE - 4, TILE_SIZE - 4);
        // crystal specks
        ctx.fillStyle = "rgba(180, 255, 190, 0.9)";
        ctx.fillRect(sx + TILE_SIZE / 2 - 1, sy + TILE_SIZE / 2 - 1, 3, 3);
      }
    }
  }

  private drawBuildings(): void {
    const { ctx, game } = this;
    const cam = game.camera;
    for (const b of game.buildings) {
      const sx = b.tileX * TILE_SIZE - cam.x;
      const sy = b.tileY * TILE_SIZE - cam.y;
      const pw = b.tileW * TILE_SIZE;
      const ph = b.tileH * TILE_SIZE;
      if (sx + pw < 0 || sy + ph < 0 || sx > cam.viewportWidth || sy > cam.viewportHeight) continue;

      ctx.fillStyle = b.stats.color;
      ctx.fillRect(sx + 1, sy + 1, pw - 2, ph - 2);
      // Faction trim.
      ctx.strokeStyle = b.faction === "player" ? "#5fd0ff" : "#ff6a5f";
      ctx.lineWidth = 2;
      ctx.strokeRect(sx + 2, sy + 2, pw - 4, ph - 4);

      // Label.
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(sx + 2, sy + ph - 14, pw - 4, 12);
      ctx.fillStyle = "#e8f0d8";
      ctx.font = "9px monospace";
      ctx.textAlign = "center";
      ctx.fillText(b.stats.name, sx + pw / 2, sy + ph - 4);

      this.drawHealthBar(sx, sy - 6, pw, b.healthFraction);
    }
  }

  private drawPlacementPreview(): void {
    const { ctx, game } = this;
    const p = game.placement;
    if (!p) return;
    const cam = game.camera;
    const s = BUILDING_STATS[p.type];
    const sx = p.tx * TILE_SIZE - cam.x;
    const sy = p.ty * TILE_SIZE - cam.y;
    const pw = s.width * TILE_SIZE;
    const ph = s.height * TILE_SIZE;
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = p.valid ? "#4caf50" : "#c0392b";
    ctx.fillRect(sx, sy, pw, ph);
    ctx.globalAlpha = 1;
    // Per-tile grid showing validity.
    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    ctx.lineWidth = 1;
    for (let y = 0; y < s.height; y++) {
      for (let x = 0; x < s.width; x++) {
        ctx.strokeRect(sx + x * TILE_SIZE, sy + y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }
    }
  }

  private drawUnits(): void {
    const { ctx, game } = this;
    const cam = game.camera;
    for (const u of game.units) {
      const sx = u.pos.x - cam.x;
      const sy = u.pos.y - cam.y;
      if (sx < -20 || sy < -20 || sx > cam.viewportWidth + 20 || sy > cam.viewportHeight + 20) continue;

      // Selection ring.
      if (game.selected.has(u)) {
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(sx, sy, u.radius + 4, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.fillStyle = u.stats[u.type].color;
      ctx.beginPath();
      ctx.arc(sx, sy, u.radius, 0, Math.PI * 2);
      ctx.fill();

      // Faction outline.
      ctx.strokeStyle = u.faction === "player" ? "#5fd0ff" : "#ff6a5f";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Harvester cargo pip.
      if (u.isHarvester && u.cargo > 0) {
        ctx.fillStyle = "#7CFC9A";
        ctx.fillRect(sx - 3, sy - 3, 6, 6);
      }

      if (u.healthFraction < 1) {
        this.drawHealthBar(sx - u.radius, sy - u.radius - 8, u.radius * 2, u.healthFraction);
      }
    }
  }

  private drawProjectiles(): void {
    const { ctx, game } = this;
    const cam = game.camera;
    ctx.strokeStyle = "#ffe27a";
    ctx.lineWidth = 2;
    for (const p of game.projectiles) {
      const sx = p.pos.x - cam.x;
      const sy = p.pos.y - cam.y;
      ctx.fillStyle = "#fff2a8";
      ctx.fillRect(sx - 1.5, sy - 1.5, 3, 3);
    }
  }

  private drawExplosions(): void {
    const { ctx, game } = this;
    const cam = game.camera;
    for (const e of game.explosions) {
      const sx = e.pos.x - cam.x;
      const sy = e.pos.y - cam.y;
      const r = e.maxSize * (0.4 + e.progress);
      ctx.globalAlpha = 1 - e.progress;
      ctx.fillStyle = "#ff9b3d";
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  private drawHealthBar(x: number, y: number, width: number, frac: number): void {
    const { ctx } = this;
    const h = 3;
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(x, y, width, h);
    ctx.fillStyle = frac > 0.5 ? "#5fd05f" : frac > 0.25 ? "#e0c040" : "#d04040";
    ctx.fillRect(x, y, width * frac, h);
  }

  private drawSelectionBox(): void {
    const { ctx, game } = this;
    const box = game.selectionBox;
    if (!box) return;
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.fillStyle = "rgba(120,200,255,0.15)";
    ctx.lineWidth = 1;
    ctx.fillRect(box.x, box.y, box.w, box.h);
    ctx.strokeRect(box.x, box.y, box.w, box.h);
  }

  // ---- HUD ----------------------------------------------------------------

  private worldViewW(): number {
    return this.game.camera.viewportWidth - SIDEBAR_WIDTH;
  }

  private drawHud(): void {
    const { ctx, game } = this;
    const w = game.camera.viewportWidth;
    const h = game.camera.viewportHeight;
    const x0 = w - SIDEBAR_WIDTH;

    // Sidebar panel.
    ctx.fillStyle = "#1a1a14";
    ctx.fillRect(x0, 0, SIDEBAR_WIDTH, h);
    ctx.strokeStyle = "#3a3a2a";
    ctx.lineWidth = 2;
    ctx.strokeRect(x0, 0, SIDEBAR_WIDTH, h);

    // Credits & power readout.
    ctx.fillStyle = "#ffe27a";
    ctx.font = "bold 14px monospace";
    ctx.textAlign = "left";
    ctx.fillText(`$ ${Math.floor(game.player.credits)}`, x0 + 10, 24);
    ctx.fillStyle = game.player.power < 0 ? "#ff7a6a" : "#9ad06b";
    ctx.font = "11px monospace";
    ctx.fillText(`Strom: ${game.player.power}`, x0 + 10, 42);

    this.drawMinimap(x0);
    this.drawBuildButtons();
  }

  private drawMinimap(x0: number): void {
    const { ctx, game } = this;
    const size = MINIMAP.size;
    const mx = x0 + MINIMAP.margin;
    const my = 56;
    ctx.fillStyle = "#000";
    ctx.fillRect(mx, my, size, size);

    const sx = size / MAP_WIDTH;
    const sy = size / MAP_HEIGHT;

    // Terrain (coarse: sample every tile, cheap enough at this map size).
    for (let ty = 0; ty < MAP_HEIGHT; ty += 1) {
      for (let tx = 0; tx < MAP_WIDTH; tx += 1) {
        if (game.map.getResource(tx, ty) > 0) {
          ctx.fillStyle = "#7CFC9A";
        } else {
          ctx.fillStyle = TERRAIN_COLORS[game.map.getTerrain(tx, ty)];
        }
        ctx.fillRect(mx + tx * sx, my + ty * sy, sx + 0.5, sy + 0.5);
      }
    }
    // Entities.
    for (const b of game.buildings) {
      ctx.fillStyle = b.faction === "player" ? "#5fd0ff" : "#ff6a5f";
      ctx.fillRect(mx + b.tileX * sx, my + b.tileY * sy, b.tileW * sx, b.tileH * sy);
    }
    for (const u of game.units) {
      ctx.fillStyle = u.faction === "player" ? "#aef" : "#fbb";
      const t = game.map.worldToTile(u.pos.x, u.pos.y);
      ctx.fillRect(mx + t.tx * sx, my + t.ty * sy, 2, 2);
    }
    // Camera viewport rectangle.
    const cam = game.camera;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    ctx.strokeRect(
      mx + (cam.x / TILE_SIZE) * sx,
      my + (cam.y / TILE_SIZE) * sy,
      (this.worldViewW() / TILE_SIZE) * sx,
      (cam.viewportHeight / TILE_SIZE) * sy
    );
  }

  private drawBuildButtons(): void {
    const { ctx, game } = this;
    for (const btn of game.buttons) {
      const affordable = game.player.credits >= btn.cost;
      const inProgress = game.isProducing(btn.what);
      ctx.fillStyle = inProgress ? "#3b5a2a" : affordable ? "#2a2a20" : "#201818";
      ctx.fillRect(btn.x, btn.y, btn.w, btn.h);
      ctx.strokeStyle = game.hoveredButton === btn ? "#ffe27a" : "#4a4a3a";
      ctx.lineWidth = 1;
      ctx.strokeRect(btn.x, btn.y, btn.w, btn.h);

      ctx.fillStyle = affordable ? "#e8f0d8" : "#7a6a6a";
      ctx.font = "11px monospace";
      ctx.textAlign = "left";
      ctx.fillText(btn.label, btn.x + 6, btn.y + 14);
      ctx.fillStyle = "#c8b95a";
      ctx.font = "10px monospace";
      ctx.fillText(`$${btn.cost}`, btn.x + 6, btn.y + 27);

      // Progress overlay.
      const prog = game.productionProgress(btn.what);
      if (prog !== null) {
        ctx.fillStyle = "rgba(120, 220, 140, 0.25)";
        ctx.fillRect(btn.x, btn.y, btn.w * prog, btn.h);
        if (prog >= 1) {
          ctx.fillStyle = "#ffe27a";
          ctx.font = "9px monospace";
          ctx.textAlign = "right";
          ctx.fillText("BEREIT", btn.x + btn.w - 4, btn.y + 12);
        }
      }
    }
  }

  private drawGameOver(): void {
    const { ctx, game } = this;
    const w = game.camera.viewportWidth;
    const h = game.camera.viewportHeight;
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = game.victory ? "#9ad06b" : "#ff6a5f";
    ctx.font = "bold 48px monospace";
    ctx.textAlign = "center";
    ctx.fillText(game.victory ? "SIEG!" : "NIEDERLAGE", w / 2, h / 2);
    ctx.fillStyle = "#d8e8c0";
    ctx.font = "16px monospace";
    ctx.fillText("F5 zum Neustarten", w / 2, h / 2 + 36);
  }
}
