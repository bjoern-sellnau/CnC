import type { Game } from "../core/Game";
import { BUILDING_STATS, MAP_HEIGHT, MAP_WIDTH, TILE_SIZE, UNIT_STATS } from "../core/config";
import type { TerrainType } from "../core/types";
import { Unit } from "../entities/Unit";
import { Building } from "../entities/Building";
import { FOG_EXPLORED, FOG_HIDDEN, FOG_VISIBLE } from "../world/FogOfWar";
import { MINIMAP, SIDEBAR_WIDTH } from "../ui/layout";
import { VERSION_LABEL } from "../version";

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
    this.drawParticles();
    this.drawFog();
    if (game.debug) this.drawDebug();
    this.drawSelectionBox();
    if (game.superTargeting) this.drawSuperTargeting();
    this.drawHud();
    this.drawTooltip();
    if (game.sellMode || game.powerMode) this.drawModeBanner();

    // The debriefing screen (drawn by main.ts) takes over when the game ends.
    this.drawVersion();
  }

  private drawModeBanner(): void {
    const { ctx, game } = this;
    const sell = game.sellMode;
    const text = sell
      ? "VERKAUFEN — Gebäude anklicken (Rechtsklick/Esc beendet)"
      : "STROM — Gebäude an/aus klicken (Rechtsklick/Esc beendet)";
    ctx.font = "bold 13px monospace";
    const w = ctx.measureText(text).width + 24;
    const x = (game.camera.viewportWidth - SIDEBAR_WIDTH) / 2 - w / 2;
    ctx.fillStyle = sell ? "rgba(120,40,30,0.85)" : "rgba(40,70,110,0.85)";
    ctx.fillRect(x, 10, w, 26);
    ctx.strokeStyle = sell ? "#ff7a6a" : "#6aa0e0";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, 10, w, 26);
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.fillText(text, x + w / 2, 28);
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
      // Hide enemy buildings in never-explored fog.
      if (b.faction === "enemy" && this.fogHidden(b.pos.x, b.pos.y)) continue;

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

      // Turret barrel for defensive buildings.
      if (b.isDefensive) {
        ctx.fillStyle = "#2a2a2a";
        ctx.beginPath();
        ctx.arc(sx + pw / 2, sy + ph / 2, pw * 0.28, 0, Math.PI * 2);
        ctx.fill();
      }

      // Label (only for buildings wide enough to fit text).
      if (b.tileW >= 2) {
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(sx + 2, sy + ph - 14, pw - 4, 12);
        ctx.fillStyle = "#e8f0d8";
        ctx.font = "9px monospace";
        ctx.textAlign = "center";
        ctx.fillText(b.stats.name, sx + pw / 2, sy + ph - 4);
      }

      // Primary production building marker.
      if (game.isPrimary(b)) {
        ctx.fillStyle = "#ffe27a";
        ctx.font = "bold 12px monospace";
        ctx.textAlign = "left";
        ctx.fillText("★", sx + 4, sy + 14);
      }

      // Powered-off overlay.
      if (b.poweredOff) {
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(sx + 1, sy + 1, pw - 2, ph - 2);
        ctx.fillStyle = "#ff7a6a";
        ctx.font = "bold 10px monospace";
        ctx.textAlign = "center";
        ctx.fillText("STROM AUS", sx + pw / 2, sy + ph / 2 + 3);
      }

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
      // Enemy units are only visible inside the player's current sight.
      if (u.faction === "enemy" && !game.fog.isVisibleAt(u.pos)) continue;

      const sx = u.pos.x - cam.x;
      const sy = u.pos.y - cam.y;
      if (sx < -20 || sy < -20 || sx > cam.viewportWidth + 20 || sy > cam.viewportHeight + 20) continue;

      // Flying units cast a small shadow to read as airborne.
      if (u.isFlying) {
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.beginPath();
        ctx.arc(sx + 6, sy + 8, u.radius, 0, Math.PI * 2);
        ctx.fill();
      }

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

  /** Floating info box for the entity currently under the cursor. */
  private drawTooltip(): void {
    const { ctx, game } = this;
    const e = game.hoveredEntity;
    if (!e || e.dead || game.gameOver) return;

    const title = e instanceof Unit ? UNIT_STATS[e.type].name : (e as Building).stats.name;
    const factionLabel = e.faction === "player" ? "Eigen" : "Feind";
    const lines: string[] = [`HP ${Math.ceil(e.hp)}/${e.maxHp}`];

    if (e instanceof Unit) {
      const s = UNIT_STATS[e.type];
      if (e.isHarvester) lines.push(`Ladung ${Math.floor(e.cargo)}`);
      else lines.push(`Schaden ${s.damage} · Rw ${Math.round(s.range)}`);
    } else if (e instanceof Building) {
      const p = e.stats.power;
      if (p !== 0) lines.push(p > 0 ? `Strom +${p}` : `Strom ${p}`);
      if (e.isDefensive) lines.push("Verteidigung");
    }

    ctx.font = "12px monospace";
    const titleW = ctx.measureText(title).width;
    let w = Math.max(titleW, ...lines.map((l) => ctx.measureText(l).width)) + 16;
    const h = 30 + lines.length * 15;

    let x = game.pointer.x + 16;
    let y = game.pointer.y + 16;
    // Keep the box on screen and clear of the sidebar.
    const maxX = game.camera.viewportWidth - SIDEBAR_WIDTH - w - 4;
    if (x > maxX) x = game.pointer.x - w - 16;
    if (x < 4) x = 4;
    if (y + h > game.camera.viewportHeight - 4) y = game.pointer.y - h - 16;

    ctx.fillStyle = "rgba(10, 14, 8, 0.92)";
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = e.faction === "player" ? "#5fd0ff" : "#ff6a5f";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, w, h);

    ctx.textAlign = "left";
    ctx.fillStyle = "#e8f0d8";
    ctx.font = "bold 12px monospace";
    ctx.fillText(title, x + 8, y + 16);
    ctx.fillStyle = e.faction === "player" ? "#7fb0c0" : "#c08070";
    ctx.font = "9px monospace";
    ctx.textAlign = "right";
    ctx.fillText(factionLabel, x + w - 8, y + 14);

    ctx.textAlign = "left";
    ctx.fillStyle = "#aaba98";
    ctx.font = "11px monospace";
    let ly = y + 32;
    for (const l of lines) {
      ctx.fillText(l, x + 8, ly);
      ly += 15;
    }

    // Health bar inside the tooltip.
    const barW = w - 16;
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(x + 8, y + h - 7, barW, 3);
    const f = e.healthFraction;
    ctx.fillStyle = f > 0.5 ? "#5fd05f" : f > 0.25 ? "#e0c040" : "#d04040";
    ctx.fillRect(x + 8, y + h - 7, barW * f, 3);
  }

  /**
   * Pathfinding debug overlay for the selected units: the A* cells that were
   * expanded (coloured by search order), the chosen path, the next waypoint
   * and the final goal, plus a small state panel.
   */
  private drawDebug(): void {
    const { ctx, game } = this;
    const cam = game.camera;
    const toScreen = (wx: number, wy: number) => ({ x: wx - cam.x, y: wy - cam.y });

    for (const u of game.selected) {
      // Expanded A* cells, tinted from blue (early) to cyan (late).
      const n = u.debugVisited.length;
      for (let i = 0; i < n; i++) {
        const c = u.debugVisited[i];
        const t = n > 1 ? i / (n - 1) : 1;
        ctx.fillStyle = `rgba(60, ${Math.round(120 + t * 135)}, 255, 0.22)`;
        ctx.fillRect(c.tx * TILE_SIZE - cam.x, c.ty * TILE_SIZE - cam.y, TILE_SIZE, TILE_SIZE);
      }

      // Sight radius.
      const us = toScreen(u.pos.x, u.pos.y);
      ctx.strokeStyle = "rgba(255,255,255,0.18)";
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(us.x, us.y, UNIT_STATS[u.type].sightRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Chosen path: unit -> remaining waypoints.
      if (u.path.length > 0) {
        ctx.strokeStyle = "#ffe27a";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(us.x, us.y);
        for (let i = u.pathIndex; i < u.path.length; i++) {
          const p = toScreen(u.path[i].x, u.path[i].y);
          ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();

        // Waypoint dots.
        for (let i = u.pathIndex; i < u.path.length; i++) {
          const p = toScreen(u.path[i].x, u.path[i].y);
          ctx.fillStyle = i === u.pathIndex ? "#fff" : "#ffd24a";
          ctx.beginPath();
          ctx.arc(p.x, p.y, i === u.pathIndex ? 4 : 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Goal marker (X).
      if (u.moveGoal) {
        const g = toScreen(u.moveGoal.x, u.moveGoal.y);
        ctx.strokeStyle = "#ff5f5f";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(g.x - 6, g.y - 6);
        ctx.lineTo(g.x + 6, g.y + 6);
        ctx.moveTo(g.x + 6, g.y - 6);
        ctx.lineTo(g.x - 6, g.y + 6);
        ctx.stroke();
      }
    }

    this.drawDebugPanel();
  }

  private drawDebugPanel(): void {
    const { ctx, game } = this;
    const lines: string[] = [
      `DEBUG (F3/\`)  ausgewählt: ${game.selected.size}`,
      `Einheiten ${game.units.length} · Gebäude ${game.buildings.length} · Partikel ${game.particles.length}`,
    ];
    const first = game.selected.values().next().value;
    if (first) {
      const state = first.attackTarget
        ? "Angriff"
        : first.isMoving
        ? "Bewegung"
        : "Leerlauf";
      lines.push(
        `Pfad: ${first.pathIndex}/${first.path.length} Wegpkt · besucht ${first.debugVisited.length} Felder · ${state}`
      );
    }

    ctx.font = "11px monospace";
    const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 16;
    const h = 8 + lines.length * 15;
    ctx.fillStyle = "rgba(10,14,8,0.8)";
    ctx.fillRect(8, 8, w, h);
    ctx.strokeStyle = "#9ad06b";
    ctx.lineWidth = 1;
    ctx.strokeRect(8, 8, w, h);
    ctx.fillStyle = "#9ad06b";
    ctx.textAlign = "left";
    let y = 22;
    for (const l of lines) {
      ctx.fillText(l, 16, y);
      y += 15;
    }
  }

  /** Crosshair + blast radius while aiming the player's superweapon. */
  private drawSuperTargeting(): void {
    const { ctx, game } = this;
    const def = game.superDef("player");
    if (!def) return;
    const px = game.pointer.x;
    const py = game.pointer.y;
    if (px >= game.camera.viewportWidth - SIDEBAR_WIDTH) return;
    ctx.strokeStyle = def.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(px, py, def.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(px - 14, py);
    ctx.lineTo(px + 14, py);
    ctx.moveTo(px, py - 14);
    ctx.lineTo(px, py + 14);
    ctx.stroke();
    ctx.fillStyle = def.color;
    ctx.font = "bold 13px monospace";
    ctx.textAlign = "center";
    ctx.fillText(`${def.name} — Ziel wählen (Esc bricht ab)`, px, py - def.radius - 10);
  }

  private drawParticles(): void {
    const { ctx, game } = this;
    const cam = game.camera;
    for (const p of game.particles) {
      const sx = p.pos.x - cam.x;
      const sy = p.pos.y - cam.y;
      if (sx < -10 || sy < -10 || sx > cam.viewportWidth + 10 || sy > cam.viewportHeight + 10) continue;
      ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha));
      ctx.fillStyle = p.color;
      ctx.fillRect(sx - p.size / 2, sy - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  private fogHidden(wx: number, wy: number): boolean {
    if (!this.game.fog.enabled) return false;
    const t = this.game.map.worldToTile(wx, wy);
    return this.game.fog.get(t.tx, t.ty) === FOG_HIDDEN;
  }

  /** Overlay darkness for unexplored (black) and explored-but-unseen (dim) tiles. */
  private drawFog(): void {
    const { ctx, game } = this;
    if (!game.fog.enabled) return;
    const cam = game.camera;
    const startTx = Math.max(0, Math.floor(cam.x / TILE_SIZE));
    const startTy = Math.max(0, Math.floor(cam.y / TILE_SIZE));
    const endTx = Math.min(MAP_WIDTH, Math.ceil((cam.x + this.worldViewW()) / TILE_SIZE));
    const endTy = Math.min(MAP_HEIGHT, Math.ceil((cam.y + cam.viewportHeight) / TILE_SIZE));

    for (let ty = startTy; ty < endTy; ty++) {
      for (let tx = startTx; tx < endTx; tx++) {
        const f = game.fog.get(tx, ty);
        if (f === FOG_VISIBLE) continue;
        ctx.fillStyle = f === FOG_HIDDEN ? "#000000" : "rgba(0,0,0,0.5)";
        ctx.fillRect(tx * TILE_SIZE - cam.x, ty * TILE_SIZE - cam.y, TILE_SIZE + 1, TILE_SIZE + 1);
      }
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
    this.drawSuperStatus(x0, h);
  }

  /** Superweapon charge / ready indicator at the bottom of the sidebar. */
  private drawSuperStatus(x0: number, h: number): void {
    const { ctx, game } = this;
    if (!game.hasBuildingRole("player", "super")) return;
    const def = game.superDef("player")!;
    const y = h - 40;
    ctx.fillStyle = "#12160e";
    ctx.fillRect(x0 + 8, y, SIDEBAR_WIDTH - 16, 32);
    const ready = game.superReady.player;
    ctx.strokeStyle = ready ? def.color : "#3a4a2a";
    ctx.lineWidth = ready ? 2 : 1;
    ctx.strokeRect(x0 + 8, y, SIDEBAR_WIDTH - 16, 32);
    ctx.textAlign = "left";
    ctx.fillStyle = "#d8e8c0";
    ctx.font = "10px monospace";
    ctx.fillText(def.name, x0 + 14, y + 13);
    if (ready) {
      ctx.fillStyle = def.color;
      ctx.font = "bold 11px monospace";
      ctx.fillText("BEREIT — Taste T", x0 + 14, y + 26);
    } else {
      const frac = 1 - game.superTimer.player / def.chargeTime;
      ctx.fillStyle = "rgba(120,220,140,0.25)";
      ctx.fillRect(x0 + 8, y, (SIDEBAR_WIDTH - 16) * Math.max(0, Math.min(1, frac)), 32);
      ctx.fillStyle = "#9aaa88";
      ctx.font = "10px monospace";
      ctx.fillText(`Lädt: ${Math.ceil(game.superTimer.player)}s`, x0 + 14, y + 26);
    }
  }

  private drawMinimap(x0: number): void {
    const { ctx, game } = this;
    const size = MINIMAP.size;
    const mx = x0 + MINIMAP.margin;
    const my = 56;
    ctx.fillStyle = "#000";
    ctx.fillRect(mx, my, size, size);

    // Radar goes offline on a power deficit (classic C&C low-power behaviour).
    if (game.player.power < 0) {
      for (let i = 0; i < 260; i++) {
        ctx.fillStyle = `rgba(120,160,90,${Math.random() * 0.25})`;
        ctx.fillRect(mx + Math.random() * size, my + Math.random() * size, 2, 2);
      }
      ctx.fillStyle = "#ff7a6a";
      ctx.font = "bold 11px monospace";
      ctx.textAlign = "center";
      ctx.fillText("RADAR OFFLINE", mx + size / 2, my + size / 2 - 4);
      ctx.fillStyle = "#c08070";
      ctx.font = "9px monospace";
      ctx.fillText("Strom benötigt", mx + size / 2, my + size / 2 + 10);
      return;
    }

    const sx = size / MAP_WIDTH;
    const sy = size / MAP_HEIGHT;

    // Terrain (coarse: sample every tile, cheap enough at this map size).
    for (let ty = 0; ty < MAP_HEIGHT; ty += 1) {
      for (let tx = 0; tx < MAP_WIDTH; tx += 1) {
        const f = game.fog.enabled ? game.fog.get(tx, ty) : FOG_VISIBLE;
        if (f === FOG_HIDDEN) {
          ctx.fillStyle = "#000";
        } else if (game.map.getResource(tx, ty) > 0) {
          ctx.fillStyle = "#7CFC9A";
        } else {
          ctx.fillStyle = TERRAIN_COLORS[game.map.getTerrain(tx, ty)];
        }
        ctx.fillRect(mx + tx * sx, my + ty * sy, sx + 0.5, sy + 0.5);
        if (f === FOG_EXPLORED) {
          ctx.fillStyle = "rgba(0,0,0,0.45)";
          ctx.fillRect(mx + tx * sx, my + ty * sy, sx + 0.5, sy + 0.5);
        }
      }
    }
    // Entities (enemies only where currently visible).
    for (const b of game.buildings) {
      if (b.faction === "enemy" && this.fogHidden(b.pos.x, b.pos.y)) continue;
      ctx.fillStyle = b.faction === "player" ? "#5fd0ff" : "#ff6a5f";
      ctx.fillRect(mx + b.tileX * sx, my + b.tileY * sy, b.tileW * sx, b.tileH * sy);
    }
    for (const u of game.units) {
      if (u.faction === "enemy" && !game.fog.isVisibleAt(u.pos)) continue;
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
        if (prog >= 1 && btn.category === "building") {
          ctx.fillStyle = "#ffe27a";
          ctx.font = "9px monospace";
          ctx.textAlign = "right";
          ctx.fillText("BEREIT", btn.x + btn.w - 4, btn.y + 12);
        }
      }

      // Queue count badge (parallel unit production).
      const count = game.queuedCount(btn.what);
      if (count > 1) {
        ctx.fillStyle = "#ffe27a";
        ctx.font = "bold 11px monospace";
        ctx.textAlign = "right";
        ctx.fillText(`x${count}`, btn.x + btn.w - 4, btn.y + 13);
      }
    }
  }

  /** Build/version footer at the bottom-left of the screen. */
  private drawVersion(): void {
    const { ctx, game } = this;
    ctx.font = "11px monospace";
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    const w = ctx.measureText(VERSION_LABEL).width + 10;
    ctx.fillRect(4, game.camera.viewportHeight - 18, w, 15);
    ctx.fillStyle = "rgba(154, 208, 107, 0.65)";
    ctx.fillText(VERSION_LABEL, 9, game.camera.viewportHeight - 7);
  }
}
