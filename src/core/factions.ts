/**
 * Faction (army) definitions. Each of the three sides has its own full roster
 * of units and buildings with distinct names, stats, colours and a unique
 * superweapon. The engine works in terms of roles (see types.ts) so all of
 * these army-specific ids plug into the same game logic.
 */
import type { ArmyId, BuildingRole, BuildingType, UnitRole, UnitType } from "./types";

export interface DefenseStats {
  damage: number;
  range: number;
  attackCooldown: number;
  sightRadius: number;
}

export interface SuperweaponDef {
  name: string;
  chargeTime: number; // seconds to charge / recharge
  radius: number; // effect radius in pixels
  damage: number; // damage at the centre
  emp: boolean; // also stuns units & buildings in radius
  color: string;
}

export interface UnitStats {
  id: UnitType;
  army: ArmyId;
  role: UnitRole;
  name: string;
  cost: number;
  hp: number;
  speed: number; // px/s
  damage: number;
  range: number; // px
  attackCooldown: number; // s
  sightRadius: number; // px
  buildTime: number; // s
  /** Role of the building that produces this unit. */
  producedBy: BuildingRole;
  color: string;
  radius: number; // px
  flying?: boolean;
  splashRadius?: number;
  infantry?: boolean; // bleeds red, light
}

export interface BuildingStats {
  id: BuildingType;
  army: ArmyId;
  role: BuildingRole;
  name: string;
  cost: number;
  hp: number;
  width: number; // tiles
  height: number; // tiles
  buildTime: number; // s
  power: number; // + produces, - consumes
  color: string;
  requires?: BuildingRole;
  defense?: DefenseStats;
  superweapon?: SuperweaponDef;
}

export type CrestKind = "hex" | "crown" | "rings";

export interface FactionStats {
  offense: number;
  defense: number;
  tech: number;
  economy: number;
  speed: number;
}

export interface ArmyDef {
  id: ArmyId;
  name: string;
  description: string;
  /** Faction UI accent colour (drives crests, menu accents). */
  color: string;
  /** Darker companion colour for fills. */
  deep: string;
  /** Short motto shown on the faction card. */
  tag: string;
  crest: CrestKind;
  stats: FactionStats;
  units: UnitStats[];
  buildings: BuildingStats[];
}

// ---- Builder helpers (keep the data tables compact & consistent) ----------

function mkUnit(army: ArmyId, id: UnitType, role: UnitRole, over: Partial<UnitStats>): UnitStats {
  return {
    id,
    army,
    role,
    name: id,
    cost: 100,
    hp: 60,
    speed: 50,
    damage: 8,
    range: 80,
    attackCooldown: 0.7,
    sightRadius: 160,
    buildTime: 3,
    producedBy: "infantry",
    color: "#cccccc",
    radius: 6,
    ...over,
  };
}

function mkBuilding(
  army: ArmyId,
  id: BuildingType,
  role: BuildingRole,
  over: Partial<BuildingStats>
): BuildingStats {
  return {
    id,
    army,
    role,
    name: id,
    cost: 300,
    hp: 500,
    width: 2,
    height: 2,
    buildTime: 4,
    power: 0,
    color: "#777777",
    ...over,
  };
}

/** Shared building set generator — each army themes colours & names. */
function baseBuildings(
  army: ArmyId,
  prefix: string,
  color: string,
  names: Record<BuildingRole, string>,
  superweapon: SuperweaponDef,
  tint: { power: string; ref: string; inf: string; veh: string; def: string; sup: string }
): BuildingStats[] {
  const P = (r: BuildingRole) => `${prefix}_${r}`;
  return [
    mkBuilding(army, P("hq"), "hq", { name: names.hq, cost: 0, hp: 1500, width: 3, height: 3, color }),
    mkBuilding(army, P("power"), "power", { name: names.power, cost: 300, hp: 500, width: 2, height: 2, buildTime: 4, power: 100, color: tint.power }),
    mkBuilding(army, P("refinery"), "refinery", { name: names.refinery, cost: 2000, hp: 900, width: 3, height: 2, buildTime: 10, power: -40, color: tint.ref, requires: "power" }),
    mkBuilding(army, P("infantry"), "infantry", { name: names.infantry, cost: 400, hp: 600, width: 2, height: 2, buildTime: 6, power: -20, color: tint.inf, requires: "power" }),
    mkBuilding(army, P("vehicle"), "vehicle", { name: names.vehicle, cost: 2000, hp: 1000, width: 3, height: 3, buildTime: 12, power: -50, color: tint.veh, requires: "refinery" }),
    mkBuilding(army, P("defense"), "defense", { name: names.defense, cost: 600, hp: 700, width: 1, height: 1, buildTime: 5, power: -30, color: tint.def, requires: "infantry", defense: { damage: 26, range: 165, attackCooldown: 0.9, sightRadius: 190 } }),
    mkBuilding(army, P("wall"), "wall", { name: names.wall, cost: 25, hp: 500, width: 1, height: 1, buildTime: 1, power: 0, color: "#5a5a52" }),
    mkBuilding(army, P("super"), "super", { name: names.super, cost: 4000, hp: 1000, width: 3, height: 2, buildTime: 18, power: -150, color: tint.sup, requires: "vehicle", superweapon }),
  ];
}

// ---- ALLIANCE: balanced, blue, precise ------------------------------------

const alliance: ArmyDef = {
  id: "alliance",
  name: "Vanguard Coalition",
  description:
    "Ein Bund der alten Nationalstaaten, geschmiedet im ersten Kristallkrieg. Sie antworten der grünen Flut mit befestigten Linien, schwerer Panzerung und einer Abnutzung, die sie immer überdauern.",
  color: "#46ff6a",
  deep: "#0e3a1c",
  tag: "Order Through Steel",
  crest: "hex",
  stats: { offense: 3, defense: 5, tech: 3, economy: 4, speed: 2 },
  units: [
    mkUnit("alliance", "all_harvester", "harvester", { name: "Sammler", cost: 1100, hp: 400, speed: 40, damage: 0, range: 0, sightRadius: 130, buildTime: 10, producedBy: "vehicle", color: "#8a9bb0", radius: 11 }),
    mkUnit("alliance", "all_rifle", "infantry", { name: "Schütze", cost: 100, hp: 60, speed: 55, damage: 9, range: 75, attackCooldown: 0.55, buildTime: 3, color: "#9ad06b", infantry: true }),
    mkUnit("alliance", "all_rocket", "anti_armor", { name: "Raketenwerfer", cost: 300, hp: 70, speed: 48, damage: 30, range: 145, attackCooldown: 1.2, sightRadius: 185, buildTime: 5, color: "#c97b5a", infantry: true }),
    mkUnit("alliance", "all_tank", "tank", { name: "Grizzly-Panzer", cost: 600, hp: 330, speed: 48, damage: 35, range: 125, attackCooldown: 1.3, sightRadius: 190, buildTime: 8, producedBy: "vehicle", color: "#c8b95a", radius: 10 }),
    mkUnit("alliance", "all_arty", "artillery", { name: "Haubitze", cost: 900, hp: 160, speed: 34, damage: 70, range: 230, attackCooldown: 3, sightRadius: 220, buildTime: 11, producedBy: "vehicle", color: "#b08040", radius: 10, splashRadius: 45 }),
    mkUnit("alliance", "all_heli", "air", { name: "Adler-Heli", cost: 1200, hp: 150, speed: 118, damage: 24, range: 115, attackCooldown: 0.45, sightRadius: 250, buildTime: 12, producedBy: "vehicle", color: "#7a8a9a", radius: 9, flying: true }),
    mkUnit("alliance", "all_ranger", "special", { name: "Ranger-Jeep", cost: 500, hp: 180, speed: 95, damage: 18, range: 110, attackCooldown: 0.35, sightRadius: 240, buildTime: 6, producedBy: "vehicle", color: "#6fb0d0", radius: 8 }),
  ],
  buildings: baseBuildings(
    "alliance",
    "all",
    "#3f6196",
    { hq: "Bauhof", power: "Kraftwerk", refinery: "Raffinerie", infantry: "Kaserne", vehicle: "Fahrzeughalle", defense: "Wachturm", wall: "Mauer", super: "Orbitalkanone" },
    { name: "Orbitallaser", chargeTime: 80, radius: 70, damage: 650, emp: false, color: "#7fe0ff" },
    { power: "#4a6a8a", ref: "#8a7a4a", inf: "#6a8a5a", veh: "#5a6a8a", def: "#6a6a7a", sup: "#3a7a9a" }
  ),
};

// ---- LEGION: heavy, slow, cheap mass, nuke --------------------------------

const legion: ArmyDef = {
  id: "legion",
  name: "Kröwn Syndicate",
  description:
    "Ein Söldnerkartell, das Kristall zum Verkauf schürft, nicht zur Anbetung. Sie ertränken das Feld in billigen Schwärmen, kaufen Überläufer und verschwinden, bevor der Gegenangriff einschlägt.",
  color: "#ff7a3a",
  deep: "#3a1c08",
  tag: "Profit Above All",
  crest: "crown",
  stats: { offense: 4, defense: 2, tech: 3, economy: 5, speed: 5 },
  units: [
    mkUnit("legion", "leg_harvester", "harvester", { name: "Erntemaschine", cost: 1100, hp: 480, speed: 36, damage: 0, range: 0, sightRadius: 130, buildTime: 10, producedBy: "vehicle", color: "#a08068", radius: 12 }),
    mkUnit("legion", "leg_conscript", "infantry", { name: "Konskript", cost: 80, hp: 75, speed: 50, damage: 8, range: 70, attackCooldown: 0.55, buildTime: 3, color: "#b0a060", infantry: true }),
    mkUnit("legion", "leg_at", "anti_armor", { name: "Panzerfaust", cost: 300, hp: 90, speed: 44, damage: 34, range: 140, attackCooldown: 1.4, sightRadius: 185, buildTime: 5, color: "#c08a4a", infantry: true }),
    mkUnit("legion", "leg_mammoth", "tank", { name: "Mammut-Panzer", cost: 900, hp: 560, speed: 34, damage: 48, range: 130, attackCooldown: 1.8, sightRadius: 195, buildTime: 12, producedBy: "vehicle", color: "#b09040", radius: 12, splashRadius: 20 }),
    mkUnit("legion", "leg_katyusha", "artillery", { name: "Katjuscha", cost: 850, hp: 150, speed: 36, damage: 60, range: 215, attackCooldown: 2.6, sightRadius: 215, buildTime: 10, producedBy: "vehicle", color: "#a86838", radius: 10, splashRadius: 55 }),
    mkUnit("legion", "leg_hind", "air", { name: "Sturm-Hubschrauber", cost: 1300, hp: 200, speed: 100, damage: 30, range: 110, attackCooldown: 0.6, sightRadius: 240, buildTime: 13, producedBy: "vehicle", color: "#9a6a4a", radius: 10, flying: true }),
    mkUnit("legion", "leg_flametank", "special", { name: "Flammenpanzer", cost: 800, hp: 360, speed: 42, damage: 55, range: 85, attackCooldown: 0.9, sightRadius: 170, buildTime: 9, producedBy: "vehicle", color: "#d05a30", radius: 10, splashRadius: 35 }),
  ],
  buildings: baseBuildings(
    "legion",
    "leg",
    "#8a4030",
    { hq: "Kommandozentrale", power: "Reaktor", refinery: "Raffinerie", infantry: "Ausbildungslager", vehicle: "Kriegsfabrik", defense: "Bunker", wall: "Betonmauer", super: "Raketensilo" },
    { name: "Nuklearrakete", chargeTime: 120, radius: 150, damage: 480, emp: false, color: "#ff9b3d" },
    { power: "#7a3a2a", ref: "#8a6030", inf: "#7a4a30", veh: "#8a4a3a", def: "#6a4030", sup: "#9a3a2a" }
  ),
};

// ---- SYNDICATE: fast, fragile, high-tech, EMP -----------------------------

const syndicate: ArmyDef = {
  id: "syndicate",
  name: "Choralität",
  description:
    "Technokultisten, die den Kristall als einen einzigen lebenden Geist hören. Ihre Heerschar kämpft mit Lichtbogen-Energie, Tarnfeldern und von Resonanz umgeschriebenem Fleisch.",
  color: "#a07bff",
  deep: "#26123a",
  tag: "Resonance Is Truth",
  crest: "rings",
  stats: { offense: 4, defense: 3, tech: 5, economy: 3, speed: 3 },
  units: [
    mkUnit("syndicate", "syn_harvester", "harvester", { name: "Sammeldrohne", cost: 1100, hp: 340, speed: 46, damage: 0, range: 0, sightRadius: 140, buildTime: 9, producedBy: "vehicle", color: "#6aa0a0", radius: 10 }),
    mkUnit("syndicate", "syn_merc", "infantry", { name: "Söldner", cost: 110, hp: 52, speed: 62, damage: 10, range: 85, attackCooldown: 0.5, sightRadius: 170, buildTime: 3, color: "#5ad0a0", infantry: true }),
    mkUnit("syndicate", "syn_laser", "anti_armor", { name: "Laser-Schütze", cost: 350, hp: 60, speed: 54, damage: 32, range: 165, attackCooldown: 1.1, sightRadius: 200, buildTime: 5, color: "#7ad0c0", infantry: true }),
    mkUnit("syndicate", "syn_hover", "tank", { name: "Hover-Panzer", cost: 650, hp: 260, speed: 62, damage: 34, range: 140, attackCooldown: 1.1, sightRadius: 205, buildTime: 8, producedBy: "vehicle", color: "#4ac0a8", radius: 9 }),
    mkUnit("syndicate", "syn_plasma", "artillery", { name: "Plasma-Werfer", cost: 950, hp: 130, speed: 38, damage: 75, range: 240, attackCooldown: 3.2, sightRadius: 230, buildTime: 11, producedBy: "vehicle", color: "#7a90d0", radius: 10, splashRadius: 50 }),
    mkUnit("syndicate", "syn_drone", "air", { name: "Kampfdrohne", cost: 1150, hp: 120, speed: 135, damage: 20, range: 120, attackCooldown: 0.4, sightRadius: 260, buildTime: 11, producedBy: "vehicle", color: "#8a8ad0", radius: 8, flying: true }),
    mkUnit("syndicate", "syn_stealth", "special", { name: "Tarnkappen-Läufer", cost: 1000, hp: 200, speed: 70, damage: 40, range: 150, attackCooldown: 1, sightRadius: 230, buildTime: 10, producedBy: "vehicle", color: "#9a6ad0", radius: 9 }),
  ],
  buildings: baseBuildings(
    "syndicate",
    "syn",
    "#2a7d63",
    { hq: "Nexus", power: "Fusionszelle", refinery: "Verarbeitung", infantry: "Klonkammer", vehicle: "Roboterfabrik", defense: "Laserturm", wall: "Energiewall", super: "EMP-Kanone" },
    { name: "EMP-Sturm", chargeTime: 95, radius: 135, damage: 70, emp: true, color: "#b07ce0" },
    { power: "#2a6a7a", ref: "#2a7a6a", inf: "#2a7d70", veh: "#2a6a7d", def: "#3a6a7a", sup: "#4a3a8a" }
  ),
};

// ---- Registries -----------------------------------------------------------

export const ARMIES: Record<ArmyId, ArmyDef> = { alliance, legion, syndicate };
export const ARMY_IDS: ArmyId[] = ["alliance", "legion", "syndicate"];

export const UNIT_STATS: Record<string, UnitStats> = {};
export const BUILDING_STATS: Record<string, BuildingStats> = {};
for (const army of ARMY_IDS) {
  for (const u of ARMIES[army].units) UNIT_STATS[u.id] = u;
  for (const b of ARMIES[army].buildings) BUILDING_STATS[b.id] = b;
}

/** The id of an army's building for a given role (HQ, power, …). */
export function armyBuilding(army: ArmyId, role: BuildingRole): BuildingType {
  const b = ARMIES[army].buildings.find((x) => x.role === role);
  if (!b) throw new Error(`army ${army} has no building for role ${role}`);
  return b.id;
}

/** A unit id of the given role for an army (first match). */
export function armyUnit(army: ArmyId, role: UnitRole): UnitType {
  const u = ARMIES[army].units.find((x) => x.role === role);
  if (!u) throw new Error(`army ${army} has no unit for role ${role}`);
  return u.id;
}

/** Sidebar build order (constructible buildings, excludes the HQ). */
const BUILD_ROLE_ORDER: BuildingRole[] = ["power", "refinery", "infantry", "vehicle", "defense", "super", "wall"];
export function armyBuildOrder(army: ArmyId): BuildingType[] {
  return BUILD_ROLE_ORDER.map((r) => armyBuilding(army, r));
}

/** Producible unit ids for an army, in a sensible sidebar order. */
const UNIT_ROLE_ORDER: UnitRole[] = ["infantry", "anti_armor", "special", "tank", "artillery", "air", "harvester"];
export function armyUnitOrder(army: ArmyId): UnitType[] {
  const out: UnitType[] = [];
  for (const role of UNIT_ROLE_ORDER) {
    for (const u of ARMIES[army].units) if (u.role === role) out.push(u.id);
  }
  return out;
}

export function unitRole(id: UnitType): UnitRole {
  return UNIT_STATS[id].role;
}
export function buildingRole(id: BuildingType): BuildingRole {
  return BUILDING_STATS[id].role;
}
