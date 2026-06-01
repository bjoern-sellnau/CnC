import { MISSIONS, type MissionConfig } from "../core/missions";
import { ARMIES, ARMY_IDS } from "../core/factions";
import { DIFFICULTIES, DIFFICULTY_IDS, type DifficultyId } from "../core/difficulty";
import type { ArmyId } from "../core/types";
import { VERSION_LABEL } from "../version";

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type MenuAction = "start" | "sound" | "music" | null;

/** Start screen: choose army, difficulty and mission, then start the battle. */
export class Menu {
  army: ArmyId = "alliance";
  difficulty: DifficultyId = "normal";
  mission: MissionConfig = MISSIONS[0];
  soundOn = true;
  musicOn = true;

  private hover = { x: -1, y: -1 };
  private armyRects: Record<string, Rect> = {};
  private diffRects: Record<string, Rect> = {};
  private missionRects: Record<string, Rect> = {};
  private startRect: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private soundRect: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private musicRect: Rect = { x: 0, y: 0, w: 0, h: 0 };

  /** The auto-assigned opponent army (the next one in the list). */
  get enemyArmy(): ArmyId {
    const i = ARMY_IDS.indexOf(this.army);
    return ARMY_IDS[(i + 1) % ARMY_IDS.length];
  }

  render(ctx: CanvasRenderingContext2D, vw: number, vh: number): void {
    ctx.fillStyle = "#0c0f0a";
    ctx.fillRect(0, 0, vw, vh);
    ctx.strokeStyle = "rgba(120,180,90,0.06)";
    ctx.lineWidth = 1;
    for (let x = 0; x < vw; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, vh);
      ctx.stroke();
    }

    ctx.textAlign = "center";
    ctx.fillStyle = "#9ad06b";
    ctx.font = "bold 46px monospace";
    ctx.fillText("COMMAND & CONQUEST", vw / 2, 70);

    const colW = Math.min(900, vw - 80);
    const x0 = (vw - colW) / 2;
    let y = 110;

    // ---- Army selection ---------------------------------------------------
    this.sectionTitle(ctx, "PARTEI WÄHLEN", x0, y);
    y += 14;
    const cardW = (colW - 2 * 12) / 3;
    const cardH = 96;
    this.armyRects = {};
    ARMY_IDS.forEach((id, i) => {
      const a = ARMIES[id];
      const r: Rect = { x: x0 + i * (cardW + 12), y, w: cardW, h: cardH };
      this.armyRects[id] = r;
      const sel = this.army === id;
      ctx.fillStyle = sel ? "#26331c" : "#161b10";
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.strokeStyle = sel ? a.color : this.isHover(r) ? "#9ad06b" : "#3a4a2a";
      ctx.lineWidth = sel ? 3 : 1.5;
      ctx.strokeRect(r.x, r.y, r.w, r.h);
      // colour swatch
      ctx.fillStyle = a.color;
      ctx.fillRect(r.x + 10, r.y + 12, 16, 16);
      ctx.fillStyle = "#e8f0d8";
      ctx.font = "bold 17px monospace";
      ctx.textAlign = "left";
      ctx.fillText(a.name, r.x + 34, r.y + 25);
      ctx.fillStyle = "#9aaa88";
      ctx.font = "11px monospace";
      this.wrap(ctx, a.description, r.x + 10, r.y + 46, r.w - 20, 14);
    });
    y += cardH + 18;

    // ---- Difficulty -------------------------------------------------------
    this.sectionTitle(ctx, "SCHWIERIGKEIT", x0, y);
    y += 14;
    const chipW = (colW - 2 * 12) / 3;
    const chipH = 48;
    this.diffRects = {};
    DIFFICULTY_IDS.forEach((id, i) => {
      const d = DIFFICULTIES[id];
      const r: Rect = { x: x0 + i * (chipW + 12), y, w: chipW, h: chipH };
      this.diffRects[id] = r;
      this.chip(ctx, r, d.name, d.description, this.difficulty === id);
    });
    y += chipH + 18;

    // ---- Mission ----------------------------------------------------------
    this.sectionTitle(ctx, "MISSION", x0, y);
    y += 14;
    this.missionRects = {};
    MISSIONS.forEach((m, i) => {
      const r: Rect = { x: x0 + i * (chipW + 12), y, w: chipW, h: chipH };
      this.missionRects[m.id] = r;
      this.chip(ctx, r, m.name, "", this.mission.id === m.id);
    });
    y += chipH + 22;

    // ---- Start button -----------------------------------------------------
    const enemy = ARMIES[this.enemyArmy];
    ctx.textAlign = "center";
    ctx.fillStyle = "#9aaa88";
    ctx.font = "13px monospace";
    ctx.fillText(`Du: ${ARMIES[this.army].name}   vs.   Gegner: ${enemy.name}`, vw / 2, y);
    y += 14;
    this.startRect = { x: vw / 2 - 150, y, w: 300, h: 44 };
    const sr = this.startRect;
    ctx.fillStyle = this.isHover(sr) ? "#3b7a2a" : "#2f5a22";
    ctx.fillRect(sr.x, sr.y, sr.w, sr.h);
    ctx.strokeStyle = "#9ad06b";
    ctx.lineWidth = 2;
    ctx.strokeRect(sr.x, sr.y, sr.w, sr.h);
    ctx.fillStyle = "#e8f0d8";
    ctx.font = "bold 20px monospace";
    ctx.fillText("GEFECHT STARTEN", vw / 2, sr.y + 29);

    // ---- Sound / music toggles & version ---------------------------------
    this.soundRect = { x: vw / 2 - 160, y: vh - 36, w: 150, h: 24 };
    this.musicRect = { x: vw / 2 + 10, y: vh - 36, w: 150, h: 24 };
    this.toggleChip(ctx, this.soundRect, `Sound: ${this.soundOn ? "AN" : "AUS"}`);
    this.toggleChip(ctx, this.musicRect, `Musik: ${this.musicOn ? "AN" : "AUS"}`);

    ctx.fillStyle = "#3f4a30";
    ctx.font = "11px monospace";
    ctx.fillText(VERSION_LABEL, vw / 2, vh - 8);
  }

  click(mx: number, my: number): MenuAction {
    for (const id of ARMY_IDS) if (this.inside(this.armyRects[id], mx, my)) { this.army = id; return null; }
    for (const id of DIFFICULTY_IDS) if (this.inside(this.diffRects[id], mx, my)) { this.difficulty = id; return null; }
    for (const m of MISSIONS) if (this.inside(this.missionRects[m.id], mx, my)) { this.mission = m; return null; }
    if (this.inside(this.startRect, mx, my)) return "start";
    if (this.inside(this.soundRect, mx, my)) return "sound";
    if (this.inside(this.musicRect, mx, my)) return "music";
    return null;
  }

  setHover(mx: number, my: number): void {
    this.hover = { x: mx, y: my };
  }

  // ---- helpers ----------------------------------------------------------

  private sectionTitle(ctx: CanvasRenderingContext2D, text: string, x: number, y: number): void {
    ctx.textAlign = "left";
    ctx.fillStyle = "#6a8a4a";
    ctx.font = "bold 13px monospace";
    ctx.fillText(text, x, y);
  }

  private chip(ctx: CanvasRenderingContext2D, r: Rect, title: string, sub: string, sel: boolean): void {
    ctx.fillStyle = sel ? "#26331c" : "#161b10";
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = sel ? "#9ad06b" : this.isHover(r) ? "#6a8a4a" : "#3a4a2a";
    ctx.lineWidth = sel ? 2.5 : 1.5;
    ctx.strokeRect(r.x, r.y, r.w, r.h);
    ctx.textAlign = "left";
    ctx.fillStyle = "#e8f0d8";
    ctx.font = "bold 14px monospace";
    ctx.fillText(title, r.x + 10, r.y + (sub ? 20 : 28));
    if (sub) {
      ctx.fillStyle = "#9aaa88";
      ctx.font = "10px monospace";
      this.wrap(ctx, sub, r.x + 10, r.y + 34, r.w - 16, 12);
    }
  }

  private toggleChip(ctx: CanvasRenderingContext2D, r: Rect, label: string): void {
    ctx.fillStyle = this.isHover(r) ? "#26331c" : "#161b10";
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = "#3a4a2a";
    ctx.lineWidth = 1;
    ctx.strokeRect(r.x, r.y, r.w, r.h);
    ctx.textAlign = "center";
    ctx.fillStyle = "#9ad06b";
    ctx.font = "12px monospace";
    ctx.fillText(label, r.x + r.w / 2, r.y + 16);
  }

  private isHover(r: Rect): boolean {
    return this.inside(r, this.hover.x, this.hover.y);
  }

  private inside(r: Rect | undefined, mx: number, my: number): boolean {
    return !!r && mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h;
  }

  private wrap(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxW: number,
    lh: number
  ): void {
    const words = text.split(" ");
    let line = "";
    let cy = y;
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (ctx.measureText(test).width > maxW && line) {
        ctx.fillText(line, x, cy);
        line = w;
        cy += lh;
      } else line = test;
    }
    if (line) ctx.fillText(line, x, cy);
  }
}
