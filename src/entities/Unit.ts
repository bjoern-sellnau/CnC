import { Entity } from "./Entity";
import type { Building } from "./Building";
import type { Faction, UnitType, Vec2 } from "../core/types";
import type { GameContext } from "../core/GameContext";
import { HARVESTER_CAPACITY, TILE_SIZE, UNIT_STATS } from "../core/config";
import { dist, dist2 } from "../core/util";
import { findPath } from "../world/Pathfinding";

type HarvestState = "seek" | "harvest" | "return" | "unload";

/** A mobile, commandable unit (soldier, tank, or harvester). */
export class Unit extends Entity {
  readonly type: UnitType;
  readonly stats = UNIT_STATS;

  // Movement
  path: Vec2[] = [];
  pathIndex = 0;
  moveGoal: Vec2 | null = null;

  // Combat
  attackTarget: Entity | null = null;
  private cooldown = 0;
  /** When true the unit chases targets it spots; false = hold position. */
  aggressive = true;

  // Harvester economy
  cargo = 0;
  private harvestState: HarvestState = "seek";
  private harvestTile: { tx: number; ty: number } | null = null;
  private unloadTimer = 0;
  private targetRefinery: Building | null = null;

  constructor(faction: Faction, type: UnitType, pos: Vec2) {
    const s = UNIT_STATS[type];
    super(faction, pos, s.hp);
    this.type = type;
    this.radius = s.radius;
  }

  get kind(): "unit" {
    return "unit";
  }

  get speed(): number {
    return UNIT_STATS[this.type].speed;
  }

  get isHarvester(): boolean {
    return this.type === "harvester";
  }

  /** Player/AI command: move to a world position. Clears combat intent. */
  orderMove(ctx: GameContext, goal: Vec2): void {
    this.attackTarget = null;
    if (this.isHarvester) this.harvestState = "seek";
    this.setDestination(ctx, goal);
  }

  /** Player/AI command: attack a specific entity. */
  orderAttack(ctx: GameContext, target: Entity): void {
    if (this.isHarvester) return;
    this.attackTarget = target;
    this.setDestination(ctx, target.pos);
  }

  /** Send a harvester to start gathering. */
  orderHarvest(_ctx: GameContext): void {
    if (!this.isHarvester) return;
    this.attackTarget = null;
    this.harvestState = this.cargo >= HARVESTER_CAPACITY ? "return" : "seek";
    this.harvestTile = null;
  }

  private setDestination(ctx: GameContext, goal: Vec2): void {
    this.moveGoal = { x: goal.x, y: goal.y };
    const p = findPath(ctx.map, this.pos, goal);
    if (p && p.length > 0) {
      this.path = p;
      this.pathIndex = 0;
    } else {
      this.path = [];
      this.pathIndex = 0;
    }
  }

  update(dt: number, ctx: GameContext): void {
    if (this.cooldown > 0) this.cooldown -= dt;

    if (this.isHarvester) {
      this.updateHarvester(dt, ctx);
    } else {
      this.updateCombatUnit(dt, ctx);
    }
  }

  // ---- Combat units -------------------------------------------------------

  private updateCombatUnit(dt: number, ctx: GameContext): void {
    const s = UNIT_STATS[this.type];

    // Drop dead targets.
    if (this.attackTarget && this.attackTarget.dead) this.attackTarget = null;

    // Auto-acquire a target when aggressive and idle.
    if (!this.attackTarget && this.aggressive && !this.moveGoal) {
      const enemy = ctx.findNearestEnemy(this.faction, this.pos, s.sightRadius);
      if (enemy) this.attackTarget = enemy;
    }

    if (this.attackTarget) {
      const d = dist(this.pos, this.attackTarget.pos);
      const reach = s.range + this.attackTarget.radius;
      if (d <= reach) {
        // In range: stop and fire.
        this.path = [];
        this.moveGoal = null;
        if (this.cooldown <= 0) {
          ctx.spawnProjectile(this.pos, this.attackTarget.pos, s.damage, this.attackTarget);
          this.cooldown = s.attackCooldown;
        }
        return;
      } else {
        // Chase: refresh path toward the target periodically.
        if (!this.moveGoal || dist2(this.moveGoal, this.attackTarget.pos) > (TILE_SIZE * 1.5) ** 2) {
          this.setDestination(ctx, this.attackTarget.pos);
        }
      }
    }

    this.advanceAlongPath(dt, ctx);
  }

  // ---- Harvester ----------------------------------------------------------

  private updateHarvester(dt: number, ctx: GameContext): void {
    switch (this.harvestState) {
      case "seek": {
        if (this.cargo >= HARVESTER_CAPACITY) {
          this.harvestState = "return";
          return;
        }
        if (!this.harvestTile || ctx.map.getResource(this.harvestTile.tx, this.harvestTile.ty) <= 0) {
          this.harvestTile = ctx.map.findNearestResource(this.pos);
          if (this.harvestTile) {
            const c = ctx.map.tileToWorldCenter(this.harvestTile.tx, this.harvestTile.ty);
            this.setDestination(ctx, c);
          } else {
            // Nothing to harvest; idle in place.
            this.moveGoal = null;
            this.path = [];
            return;
          }
        }
        const center = ctx.map.tileToWorldCenter(this.harvestTile.tx, this.harvestTile.ty);
        if (dist(this.pos, center) < TILE_SIZE) {
          this.harvestState = "harvest";
          this.path = [];
          this.moveGoal = null;
        } else {
          this.advanceAlongPath(dt, ctx);
        }
        break;
      }
      case "harvest": {
        if (!this.harvestTile) {
          this.harvestState = "seek";
          return;
        }
        const rate = 200 * dt; // units of resource per second
        const got = ctx.map.takeResource(this.harvestTile.tx, this.harvestTile.ty, rate);
        this.cargo += got;
        if (got <= 0 || this.cargo >= HARVESTER_CAPACITY) {
          this.cargo = Math.min(this.cargo, HARVESTER_CAPACITY);
          this.harvestState = this.cargo > 0 ? "return" : "seek";
          this.harvestTile = null;
        }
        break;
      }
      case "return": {
        if (!this.targetRefinery || this.targetRefinery.dead) {
          this.targetRefinery = ctx.findNearestRefinery(this.faction, this.pos);
          if (this.targetRefinery) this.setDestination(ctx, this.targetRefinery.pos);
        }
        if (!this.targetRefinery) {
          // No refinery: wait.
          this.moveGoal = null;
          this.path = [];
          return;
        }
        if (dist(this.pos, this.targetRefinery.pos) < TILE_SIZE * 2) {
          this.harvestState = "unload";
          this.unloadTimer = 0;
          this.path = [];
          this.moveGoal = null;
        } else {
          if (!this.moveGoal) this.setDestination(ctx, this.targetRefinery.pos);
          this.advanceAlongPath(dt, ctx);
        }
        break;
      }
      case "unload": {
        this.unloadTimer += dt;
        const perSecond = HARVESTER_CAPACITY / 2; // ~2s to fully unload
        const amount = Math.min(this.cargo, perSecond * dt);
        this.cargo -= amount;
        ctx.addCredits(this.faction, amount);
        if (this.cargo <= 0.5) {
          this.cargo = 0;
          this.harvestState = "seek";
          this.harvestTile = null;
        }
        break;
      }
    }
  }

  // ---- Shared movement ----------------------------------------------------

  private advanceAlongPath(dt: number, ctx: GameContext): void {
    if (this.pathIndex >= this.path.length) {
      this.moveGoal = null;
      return;
    }
    const target = this.path[this.pathIndex];
    const dx = target.x - this.pos.x;
    const dy = target.y - this.pos.y;
    const d = Math.hypot(dx, dy);
    const step = this.speed * dt;

    if (d <= step) {
      this.pos.x = target.x;
      this.pos.y = target.y;
      this.pathIndex++;
      if (this.pathIndex >= this.path.length) {
        this.moveGoal = null;
      }
    } else {
      this.pos.x += (dx / d) * step;
      this.pos.y += (dy / d) * step;
    }

    // Light separation so units don't perfectly overlap.
    this.separate(ctx);
  }

  private separate(ctx: GameContext): void {
    for (const other of ctx.units) {
      if (other === this || other.dead) continue;
      const dx = this.pos.x - other.pos.x;
      const dy = this.pos.y - other.pos.y;
      const minDist = this.radius + other.radius;
      const d2 = dx * dx + dy * dy;
      if (d2 > 0 && d2 < minDist * minDist) {
        const d = Math.sqrt(d2);
        const push = (minDist - d) / 2;
        this.pos.x += (dx / d) * push;
        this.pos.y += (dy / d) * push;
      }
    }
  }

  get isMoving(): boolean {
    return this.pathIndex < this.path.length;
  }
}
