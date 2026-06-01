import type { Faction, Vec2 } from "../core/types";
import { nextId } from "../core/util";

/** Base class for everything that lives on the map (units & buildings). */
export abstract class Entity {
  readonly id = nextId();
  faction: Faction;
  pos: Vec2;
  hp: number;
  maxHp: number;
  radius = 8;
  dead = false;
  /** Seconds remaining of EMP stun (cannot move, fire or produce). */
  stunnedFor = 0;

  constructor(faction: Faction, pos: Vec2, hp: number) {
    this.faction = faction;
    this.pos = { x: pos.x, y: pos.y };
    this.hp = hp;
    this.maxHp = hp;
  }

  abstract get kind(): "unit" | "building";

  takeDamage(amount: number): void {
    this.hp -= amount;
    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
    }
  }

  get healthFraction(): number {
    return this.maxHp > 0 ? this.hp / this.maxHp : 0;
  }
}
