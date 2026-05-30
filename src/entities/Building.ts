import { Entity } from "./Entity";
import type { BuildingType, Faction, Vec2 } from "../core/types";
import { BUILDING_STATS, TILE_SIZE } from "../core/config";

/** A static structure occupying a rectangular footprint of tiles. */
export class Building extends Entity {
  readonly type: BuildingType;
  readonly tileX: number;
  readonly tileY: number;
  readonly tileW: number;
  readonly tileH: number;

  /** Where freshly produced units gather. World coords. */
  rallyPoint: Vec2;

  constructor(faction: Faction, type: BuildingType, tileX: number, tileY: number) {
    const s = BUILDING_STATS[type];
    const pos: Vec2 = {
      x: (tileX + s.width / 2) * TILE_SIZE,
      y: (tileY + s.height / 2) * TILE_SIZE,
    };
    super(faction, pos, s.hp);
    this.type = type;
    this.tileX = tileX;
    this.tileY = tileY;
    this.tileW = s.width;
    this.tileH = s.height;
    this.radius = (Math.min(s.width, s.height) * TILE_SIZE) / 2;
    // Default rally point just below the building.
    this.rallyPoint = {
      x: pos.x,
      y: (tileY + s.height + 1) * TILE_SIZE,
    };
  }

  get kind(): "building" {
    return "building";
  }

  get stats() {
    return BUILDING_STATS[this.type];
  }

  get power(): number {
    return this.stats.power;
  }

  /** Iterate the tile coordinates this building covers. */
  *tiles(): IterableIterator<{ tx: number; ty: number }> {
    for (let y = this.tileY; y < this.tileY + this.tileH; y++) {
      for (let x = this.tileX; x < this.tileX + this.tileW; x++) {
        yield { tx: x, ty: y };
      }
    }
  }
}
