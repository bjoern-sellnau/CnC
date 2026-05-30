import type { Entity } from "../entities/Entity";
import type { Vec2 } from "../core/types";

/** A travelling shot that deals damage to its target when it lands. */
export class Projectile {
  pos: Vec2;
  readonly target: Entity;
  readonly to: Vec2;
  readonly damage: number;
  readonly splashRadius: number;
  readonly speed = 480;
  dead = false;

  constructor(from: Vec2, to: Vec2, damage: number, target: Entity, splashRadius = 0) {
    this.pos = { x: from.x, y: from.y };
    this.to = { x: to.x, y: to.y };
    this.damage = damage;
    this.target = target;
    this.splashRadius = splashRadius;
  }

  update(dt: number, onHit: (p: Projectile) => void): void {
    // Track moving targets.
    if (!this.target.dead) {
      this.to.x = this.target.pos.x;
      this.to.y = this.target.pos.y;
    }
    const dx = this.to.x - this.pos.x;
    const dy = this.to.y - this.pos.y;
    const d = Math.hypot(dx, dy);
    const step = this.speed * dt;
    if (d <= step) {
      this.pos.x = this.to.x;
      this.pos.y = this.to.y;
      this.dead = true;
      onHit(this);
    } else {
      this.pos.x += (dx / d) * step;
      this.pos.y += (dy / d) * step;
    }
  }
}

/** A short-lived expanding circle for explosions / impacts. */
export class Explosion {
  pos: Vec2;
  readonly maxSize: number;
  age = 0;
  readonly life = 0.4;
  dead = false;

  constructor(pos: Vec2, size: number) {
    this.pos = { x: pos.x, y: pos.y };
    this.maxSize = size;
  }

  update(dt: number): void {
    this.age += dt;
    if (this.age >= this.life) this.dead = true;
  }

  get progress(): number {
    return this.age / this.life;
  }
}
