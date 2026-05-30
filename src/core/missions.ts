/** Selectable scenarios shown in the start menu. */
export interface MissionConfig {
  id: string;
  name: string;
  description: string;
  /** Map generation seed (same seed => same map). */
  seed: number;
  startingCredits: number;
  enemyCredits: number;
  /** Smaller = enemy attacks with fewer units (more aggressive). */
  enemyWaveSize: number;
  /** Seconds between enemy attack waves. */
  enemyWaveInterval: number;
  /** Whether the enemy base starts with extra defences. */
  enemyDefences: boolean;
}

export const MISSIONS: MissionConfig[] = [
  {
    id: "skirmish",
    name: "1 — Grenzscharmützel",
    description:
      "Ein ruhiger Einstieg. Baue deine Basis auf, sammle Tiberium und überrenne den schwachen Gegner.",
    seed: 1337,
    startingCredits: 6000,
    enemyCredits: 3000,
    enemyWaveSize: 5,
    enemyWaveInterval: 35,
    enemyDefences: false,
  },
  {
    id: "uprising",
    name: "2 — Aufstand",
    description:
      "Der Gegner ist besser finanziert und greift in dichteren Wellen an. Verteidigung wird wichtig.",
    seed: 7,
    startingCredits: 5000,
    enemyCredits: 6000,
    enemyWaveSize: 4,
    enemyWaveInterval: 25,
    enemyDefences: false,
  },
  {
    id: "laststand",
    name: "3 — Letztes Gefecht",
    description:
      "Eine befestigte Gegnerbasis mit Geschütztürmen und aggressiver KI. Nur für erfahrene Kommandanten.",
    seed: 99,
    startingCredits: 5000,
    enemyCredits: 9000,
    enemyWaveSize: 3,
    enemyWaveInterval: 18,
    enemyDefences: true,
  },
];
