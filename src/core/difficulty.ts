/** Difficulty presets selectable in the menu. */
export type DifficultyId = "easy" | "normal" | "hard";

export interface Difficulty {
  id: DifficultyId;
  name: string;
  description: string;
  /** Multiplier on the enemy's starting credits. */
  enemyCreditMul: number;
  /** Added to the mission's base wave size (bigger = less aggressive). */
  waveSizeDelta: number;
  /** Multiplier on the seconds between enemy waves. */
  waveIntervalMul: number;
  /** Multiplier on damage dealt to the player. */
  enemyDamageMul: number;
}

export const DIFFICULTIES: Record<DifficultyId, Difficulty> = {
  easy: {
    id: "easy",
    name: "Leicht",
    description: "Schwächerer Gegner, seltenere Angriffe.",
    enemyCreditMul: 0.6,
    waveSizeDelta: 2,
    waveIntervalMul: 1.4,
    enemyDamageMul: 0.85,
  },
  normal: {
    id: "normal",
    name: "Normal",
    description: "Ausgewogene Herausforderung.",
    enemyCreditMul: 1,
    waveSizeDelta: 0,
    waveIntervalMul: 1,
    enemyDamageMul: 1,
  },
  hard: {
    id: "hard",
    name: "Schwer",
    description: "Reicher, aggressiver Gegner mit härteren Treffern.",
    enemyCreditMul: 1.6,
    waveSizeDelta: -1,
    waveIntervalMul: 0.7,
    enemyDamageMul: 1.2,
  },
};

export const DIFFICULTY_IDS: DifficultyId[] = ["easy", "normal", "hard"];
