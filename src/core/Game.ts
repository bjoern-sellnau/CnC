import { Camera } from "../world/Camera";
import { GameMap } from "../world/GameMap";
import { FogOfWar } from "../world/FogOfWar";
import { Building } from "../entities/Building";
import { Unit } from "../entities/Unit";
import { Entity } from "../entities/Entity";
import { Explosion, Particle, Projectile } from "../systems/effects";
import { FactionState } from "../systems/FactionState";
import { EnemyAI } from "../systems/EnemyAI";
import { sound } from "../systems/Sound";
import {
  BUILDING_STATS,
  MAP_HEIGHT,
  MAP_WIDTH,
  TILE_SIZE,
  UNIT_STATS,
} from "./config";
import type { GameContext } from "./GameContext";
import type {
  BuildingType,
  Faction,
  ProducibleType,
  UnitType,
  Vec2,
} from "./types";
import type { MissionConfig } from "./missions";
import { MISSIONS } from "./missions";
import { computeSidebarButtons, type ButtonRect } from "../ui/layout";
import { dist } from "./util";

/** Top-level orchestrator. Owns all state and drives the simulation. */
export class Game implements GameContext {
  readonly mission: MissionConfig;
  readonly map: GameMap;
  readonly fog = new FogOfWar();
  readonly camera = new Camera();

  readonly units: Unit[] = [];
  readonly buildings: Building[] = [];
  readonly projectiles: Projectile[] = [];
  readonly explosions: Explosion[] = [];
  readonly particles: Particle[] = [];

  readonly player: FactionState;
  readonly enemy: FactionState;

  readonly selected = new Set<Unit>();
  placement: { type: BuildingType; tx: number; ty: number; valid: boolean } | null = null;
  selectionBox: { x: number; y: number; w: number; h: number } | null = null;

  buttons: ButtonRect[] = [];
  hoveredButton: ButtonRect | null = null;

  /** Entity currently under the cursor (for tooltips) and pointer position. */
  hoveredEntity: Entity | null = null;
  pointer = { x: 0, y: 0 };

  gameOver = false;
  victory = false;

  private readonly ai: EnemyAI;

  constructor(mission: MissionConfig = MISSIONS[0]) {
    this.mission = mission;
    this.map = new GameMap(mission.seed);
    this.player = new FactionState("player", mission.startingCredits);
    this.enemy = new FactionState("enemy", mission.enemyCredits);
    this.ai = new EnemyAI(this, mission.enemyWaveSize, mission.enemyWaveInterval);
    this.setupBases();
  }

  get ctx(): GameContext {
    return this;
  }

  // ---- Setup --------------------------------------------------------------

  private setupBases(): void {
    // Player base, top-left area.
    this.map.clearArea(4, 4, 8, 8);
    this.foundBase("player", 5, 5);

    // Enemy base, bottom-right area.
    this.map.clearArea(MAP_WIDTH - 14, MAP_HEIGHT - 14, 10, 10);
    this.foundBase("enemy", MAP_WIDTH - 10, MAP_HEIGHT - 10);

    // Center camera on the player's construction yard.
    const cy = this.buildings.find((b) => b.faction === "player");
    if (cy) this.camera.centerOn(cy.pos);
  }

  private foundBase(faction: Faction, tx: number, ty: number): void {
    this.placeBuilding(faction, "construction_yard", tx, ty);
    this.placeBuilding(faction, "power_plant", tx + 4, ty);
    // Starting units.
    const spawn = this.map.tileToWorldCenter(tx + 1, ty + 4);
    this.spawnUnitAt(faction, "harvester", spawn);
    for (let i = 0; i < 2; i++) {
      const s = this.map.tileToWorldCenter(tx + 3 + i, ty + 4);
      this.spawnUnitAt(faction, "soldier", s);
    }
    if (faction === "enemy") {
      // Give the AI the tech to actually fight & expand.
      this.placeBuilding(faction, "refinery", tx - 4, ty);
      this.placeBuilding(faction, "barracks", tx, ty + 4);
      this.placeBuilding(faction, "war_factory", tx + 4, ty + 4);
      if (this.mission.enemyDefences) {
        this.placeBuilding(faction, "guard_tower", tx - 1, ty - 1);
        this.placeBuilding(faction, "guard_tower", tx + 3, ty - 1);
        this.placeBuilding(faction, "guard_tower", tx - 1, ty + 3);
      }
    }
  }

  // ---- GameContext implementation ----------------------------------------

  addCredits(faction: Faction, amount: number): void {
    this.factionState(faction).credits += amount;
  }

  spawnProjectile(
    from: Vec2,
    to: Vec2,
    damage: number,
    target: Entity,
    splashRadius = 0
  ): void {
    this.projectiles.push(new Projectile(from, to, damage, target, splashRadius));
    if (this.fog.isVisibleAt(from)) sound.play(splashRadius > 0 ? "rocket" : "shoot");
  }

  spawnExplosion(pos: Vec2, size: number): void {
    this.explosions.push(new Explosion(pos, size));
  }

  findNearestEnemy(faction: Faction, pos: Vec2, range: number): Entity | null {
    let best: Entity | null = null;
    let bestD = range;
    const consider = (e: Entity) => {
      if (e.dead || e.faction === faction) return;
      const d = dist(pos, e.pos);
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    };
    for (const u of this.units) consider(u);
    for (const b of this.buildings) consider(b);
    return best;
  }

  findNearestRefinery(faction: Faction, pos: Vec2): Building | null {
    let best: Building | null = null;
    let bestD = Infinity;
    for (const b of this.buildings) {
      if (b.dead || b.faction !== faction || b.type !== "refinery") continue;
      const d = dist(pos, b.pos);
      if (d < bestD) {
        bestD = d;
        best = b;
      }
    }
    return best;
  }

  // ---- Queries ------------------------------------------------------------

  factionState(faction: Faction): FactionState {
    return faction === "player" ? this.player : this.enemy;
  }

  hasBuilding(faction: Faction, type: BuildingType): boolean {
    return this.buildings.some((b) => !b.dead && b.faction === faction && b.type === type);
  }

  /** A target for an attacker of `attacker` faction to head for. */
  findAttackTarget(victimFaction: Faction): Entity | null {
    const yard = this.buildings.find(
      (b) => !b.dead && b.faction === victimFaction && b.type === "construction_yard"
    );
    if (yard) return yard;
    const anyBuilding = this.buildings.find((b) => !b.dead && b.faction === victimFaction);
    if (anyBuilding) return anyBuilding;
    return this.units.find((u) => !u.dead && u.faction === victimFaction) ?? null;
  }

  /** Whether the player is currently producing `what`. */
  isProducing(what: ProducibleType): boolean {
    return (
      this.player.buildingQueue?.what === what ||
      this.player.unitQueue.some((i) => i.what === what)
    );
  }

  /** How many of `what` the player has queued (for the sidebar badge). */
  queuedCount(what: ProducibleType): number {
    let n = this.player.unitQueue.reduce((acc, i) => (i.what === what ? acc + 1 : acc), 0);
    if (this.player.buildingQueue?.what === what) n++;
    return n;
  }

  /** Production progress 0..1 for `what` (the item finishing soonest), or null. */
  productionProgress(what: ProducibleType): number | null {
    if (this.player.buildingQueue?.what === what) {
      const q = this.player.buildingQueue;
      return 1 - q.remaining / q.total;
    }
    let best: number | null = null;
    for (const i of this.player.unitQueue) {
      if (i.what !== what) continue;
      const p = 1 - i.remaining / i.total;
      if (best === null || p > best) best = p;
    }
    return best;
  }

  // ---- Commands (called from input) --------------------------------------

  /** React to a sidebar build button press. */
  pressBuildButton(btn: ButtonRect): void {
    if (this.gameOver) return;
    if (btn.category === "unit") {
      // Require the producing building to exist.
      const producedBy = (this.unitProducer(btn.what as UnitType));
      if (!this.hasBuilding("player", producedBy)) return;
      this.player.queueUnit(btn.what as UnitType);
      return;
    }
    // Building button.
    const type = btn.what as BuildingType;
    const req = BUILDING_STATS[type].requires;
    if (req && !this.hasBuilding("player", req)) return;

    const q = this.player.buildingQueue;
    if (q && q.what === type && q.ready) {
      // Enter placement mode.
      this.enterPlacement(type);
    } else if (!q) {
      this.player.queueBuilding(type);
    }
  }

  private unitProducer(type: UnitType): BuildingType {
    return UNIT_STATS[type].producedBy;
  }

  private enterPlacement(type: BuildingType): void {
    this.placement = { type, tx: 0, ty: 0, valid: false };
  }

  updatePlacementHover(world: Vec2): void {
    if (!this.placement) return;
    const s = BUILDING_STATS[this.placement.type];
    const tx = Math.floor(world.x / TILE_SIZE) - Math.floor(s.width / 2);
    const ty = Math.floor(world.y / TILE_SIZE) - Math.floor(s.height / 2);
    this.placement.tx = tx;
    this.placement.ty = ty;
    this.placement.valid = this.canPlace("player", this.placement.type, tx, ty);
  }

  /** Confirm building placement at the current hovered tile. */
  confirmPlacement(): boolean {
    const p = this.placement;
    if (!p || !p.valid) return false;
    this.placeBuilding("player", p.type, p.tx, p.ty);
    this.player.buildingQueue = null;
    this.placement = null;
    sound.play("place");
    return true;
  }

  cancelPlacement(): void {
    this.placement = null;
  }

  private canPlace(faction: Faction, type: BuildingType, tx: number, ty: number): boolean {
    const s = BUILDING_STATS[type];
    let nearFriendly = false;
    for (let y = ty; y < ty + s.height; y++) {
      for (let x = tx; x < tx + s.width; x++) {
        if (!this.map.isBuildableTerrain(x, y)) return false;
        if (this.map.occupied[this.map.index(x, y)]) return false;
        if (this.map.getResource(x, y) > 0) return false;
      }
    }
    // Must be reasonably close to an existing friendly building.
    const center = {
      x: (tx + s.width / 2) * TILE_SIZE,
      y: (ty + s.height / 2) * TILE_SIZE,
    };
    for (const b of this.buildings) {
      if (b.dead || b.faction !== faction) continue;
      if (dist(center, b.pos) < 9 * TILE_SIZE) {
        nearFriendly = true;
        break;
      }
    }
    return nearFriendly;
  }

  // ---- Spawning -----------------------------------------------------------

  placeBuilding(faction: Faction, type: BuildingType, tx: number, ty: number): Building {
    const b = new Building(faction, type, tx, ty);
    for (const t of b.tiles()) this.map.setOccupied(t.tx, t.ty, true);
    this.buildings.push(b);
    return b;
  }

  spawnUnitAt(faction: Faction, type: UnitType, pos: Vec2): Unit {
    const u = new Unit(faction, type, pos);
    this.units.push(u);
    return u;
  }

  /** Spawn a freshly produced unit at its producer's rally point. */
  private produceUnit(faction: Faction, type: UnitType): void {
    const producer = this.unitProducer(type);
    const building =
      this.buildings.find((b) => !b.dead && b.faction === faction && b.type === producer) ??
      this.buildings.find((b) => !b.dead && b.faction === faction);
    if (!building) return;
    const spawn = {
      x: building.pos.x,
      y: building.pos.y + (building.tileH / 2 + 1) * TILE_SIZE,
    };
    const u = this.spawnUnitAt(faction, type, spawn);
    if (type === "harvester") {
      u.orderHarvest(this);
    } else {
      u.orderMove(this, building.rallyPoint);
    }
    if (faction === "player") sound.play("ready");
  }

  // ---- Main update --------------------------------------------------------

  update(dt: number): void {
    if (this.gameOver) {
      this.updateEffects(dt);
      return;
    }

    this.recomputePower();
    this.tickProduction(dt, this.player);
    this.tickProduction(dt, this.enemy);
    this.ai.update(dt);

    for (const u of this.units) if (!u.dead) u.update(dt, this);
    for (const b of this.buildings) if (!b.dead && b.isDefensive) b.update(dt, this);
    this.updateEffects(dt);

    this.updateFog();
    this.cleanupDead();
    this.checkEndConditions();
  }

  /** Re-stamp player vision from all friendly units and buildings. */
  private updateFog(): void {
    this.fog.beginFrame();
    for (const u of this.units) {
      if (u.dead || u.faction !== "player") continue;
      this.fog.reveal(u.pos, UNIT_STATS[u.type].sightRadius);
    }
    for (const b of this.buildings) {
      if (b.dead || b.faction !== "player") continue;
      this.fog.reveal(b.pos, Math.max(b.radius * 2, 120));
    }
  }

  private updateEffects(dt: number): void {
    for (const p of this.projectiles) {
      if (p.dead) continue;
      p.update(dt, (proj) => {
        this.applyProjectileDamage(proj);
      });
    }
    for (const e of this.explosions) if (!e.dead) e.update(dt);
    for (const p of this.particles) if (!p.dead) p.update(dt);
  }

  private applyProjectileDamage(proj: Projectile): void {
    const impact = proj.to;
    if (proj.splashRadius > 0) {
      // Area damage to everything sharing the target's faction nearby.
      const victimFaction = proj.target.faction;
      for (const e of [...this.units, ...this.buildings]) {
        if (e.dead || e.faction !== victimFaction) continue;
        const d = dist(impact, e.pos);
        if (d <= proj.splashRadius + e.radius) {
          const falloff = 1 - (d / (proj.splashRadius + e.radius)) * 0.5;
          e.takeDamage(proj.damage * falloff);
        }
      }
      this.spawnExplosion(impact, proj.splashRadius);
      this.emitHitParticles(impact, proj.target);
    } else if (!proj.target.dead) {
      proj.target.takeDamage(proj.damage);
      this.spawnExplosion(impact, proj.target.kind === "building" ? 14 : 8);
      this.emitHitParticles(proj.target.pos, proj.target);
    }
    if (this.fog.isVisibleAt(impact)) sound.play("explosion");
  }

  /** Spatter on impact: red blood for infantry, sparks/debris for the rest. */
  private emitHitParticles(at: Vec2, target: Entity): void {
    const infantry = target instanceof Unit && target.isInfantry;
    if (infantry) {
      this.emitBurst(at, 8, ["#c01818", "#e23a2a", "#8a0f0f"], 70, 0.5, 2.2);
    } else {
      this.emitBurst(at, 6, ["#ffd24a", "#ff9b3d", "#cfcfcf"], 90, 0.35, 1.8);
    }
  }

  /** Larger burst when something is destroyed. */
  private emitDeathParticles(e: Entity): void {
    if (e instanceof Unit && e.isInfantry) {
      this.emitBurst(e.pos, 16, ["#c01818", "#e23a2a", "#8a0f0f", "#5a0a0a"], 95, 0.8, 3);
    } else if (e.kind === "building") {
      this.emitBurst(e.pos, 34, ["#ff9b3d", "#ffd24a", "#888", "#444", "#222"], 150, 1.1, e.radius * 0.5);
    } else {
      // Vehicles / aircraft: fiery debris.
      this.emitBurst(e.pos, 22, ["#ff9b3d", "#ffd24a", "#999", "#333"], 130, 0.9, 4);
    }
  }

  /** Emit `count` particles radiating from `pos`. */
  private emitBurst(
    pos: Vec2,
    count: number,
    colors: string[],
    speed: number,
    life: number,
    spread: number
  ): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const sp = speed * (0.3 + Math.random() * 0.7);
      const color = colors[(Math.random() * colors.length) | 0];
      this.particles.push(
        new Particle(
          { x: pos.x + (Math.random() - 0.5) * spread, y: pos.y + (Math.random() - 0.5) * spread },
          Math.cos(angle) * sp,
          Math.sin(angle) * sp,
          life * (0.6 + Math.random() * 0.8),
          1 + Math.random() * 2.5,
          color,
          120 // gravity so debris arcs down
        )
      );
    }
  }

  private recomputePower(): void {
    for (const fs of [this.player, this.enemy]) {
      fs.powerProduced = 0;
      fs.powerConsumed = 0;
    }
    for (const b of this.buildings) {
      if (b.dead) continue;
      const fs = this.factionState(b.faction);
      if (b.power > 0) fs.powerProduced += b.power;
      else fs.powerConsumed += -b.power;
    }
  }

  countBuildings(faction: Faction, type: BuildingType): number {
    let n = 0;
    for (const b of this.buildings) if (!b.dead && b.faction === faction && b.type === type) n++;
    return n;
  }

  private tickProduction(dt: number, fs: FactionState): void {
    const step = dt * fs.productionSpeedFactor;
    this.tickUnitProduction(step, fs);
    // Buildings.
    if (fs.buildingQueue && !fs.buildingQueue.ready) {
      fs.buildingQueue.remaining -= step;
      if (fs.buildingQueue.remaining <= 0) {
        fs.buildingQueue.remaining = 0;
        if (fs.faction === "enemy") {
          this.autoPlaceEnemyBuilding(fs.buildingQueue.what as BuildingType);
          fs.buildingQueue = null;
        } else {
          fs.buildingQueue.ready = true; // player must place it
          sound.play("ready");
        }
      }
    }
  }

  /**
   * Advance the unit queue. Items are grouped by their producer building type;
   * each producer type can build as many units in parallel as the faction has
   * buildings of that type. So two barracks train two soldiers at once.
   */
  private tickUnitProduction(step: number, fs: FactionState): void {
    if (fs.unitQueue.length === 0) return;
    const slotsUsed = new Map<BuildingType, number>();
    const completed: number[] = [];

    for (let i = 0; i < fs.unitQueue.length; i++) {
      const item = fs.unitQueue[i];
      const producer = UNIT_STATS[item.what as UnitType].producedBy;
      const capacity = this.countBuildings(fs.faction, producer);
      const used = slotsUsed.get(producer) ?? 0;
      if (used >= capacity) continue; // every producer of this type is busy
      slotsUsed.set(producer, used + 1);
      item.remaining -= step;
      if (item.remaining <= 0) completed.push(i);
    }

    // Spawn finished units in queue order, then remove them.
    for (const idx of completed) {
      this.produceUnit(fs.faction, fs.unitQueue[idx].what as UnitType);
    }
    for (let k = completed.length - 1; k >= 0; k--) {
      fs.unitQueue.splice(completed[k], 1);
    }
  }

  private autoPlaceEnemyBuilding(type: BuildingType): void {
    const base = this.buildings.find(
      (b) => b.faction === "enemy" && b.type === "construction_yard"
    );
    if (!base) return;
    for (let r = 2; r < 10; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const tx = base.tileX + dx;
          const ty = base.tileY + dy;
          if (this.canPlace("enemy", type, tx, ty)) {
            this.placeBuilding("enemy", type, tx, ty);
            return;
          }
        }
      }
    }
  }

  private cleanupDead(): void {
    for (let i = this.units.length - 1; i >= 0; i--) {
      const u = this.units[i];
      if (u.dead) {
        this.selected.delete(u);
        if (this.hoveredEntity === u) this.hoveredEntity = null;
        this.spawnExplosion(u.pos, u.radius * 1.5);
        this.emitDeathParticles(u);
        this.units.splice(i, 1);
      }
    }
    for (let i = this.buildings.length - 1; i >= 0; i--) {
      const b = this.buildings[i];
      if (b.dead) {
        for (const t of b.tiles()) this.map.setOccupied(t.tx, t.ty, false);
        if (this.hoveredEntity === b) this.hoveredEntity = null;
        this.spawnExplosion(b.pos, b.radius);
        this.emitDeathParticles(b);
        this.buildings.splice(i, 1);
      }
    }
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      if (this.projectiles[i].dead) this.projectiles.splice(i, 1);
    }
    for (let i = this.explosions.length - 1; i >= 0; i--) {
      if (this.explosions[i].dead) this.explosions.splice(i, 1);
    }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      if (this.particles[i].dead) this.particles.splice(i, 1);
    }
  }

  private checkEndConditions(): void {
    const playerAlive = this.buildings.some((b) => b.faction === "player");
    const enemyAlive = this.buildings.some((b) => b.faction === "enemy");
    if (!enemyAlive) {
      this.gameOver = true;
      this.victory = true;
    } else if (!playerAlive) {
      this.gameOver = true;
      this.victory = false;
    }
  }

  /** Rebuild sidebar buttons for the current viewport. */
  rebuildButtons(): void {
    const unitOptions: ProducibleType[] = [];
    if (this.hasBuilding("player", "barracks")) unitOptions.push("soldier", "rocket_soldier");
    if (this.hasBuilding("player", "war_factory"))
      unitOptions.push("tank", "artillery", "aircraft", "harvester");
    this.buttons = computeSidebarButtons(this.camera.viewportWidth, unitOptions);
  }
}
