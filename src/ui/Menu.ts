import { MISSIONS, type MissionConfig } from "../core/missions";
import { ARMIES, ARMY_IDS } from "../core/factions";
import { DIFFICULTIES, DIFFICULTY_IDS, type DifficultyId } from "../core/difficulty";
import type { ArmyId } from "../core/types";
import { VERSION_LABEL } from "../version";
import { THEME, drawCRT, drawCrest, drawStatBar } from "./theme";
import { settings } from "../core/settings";

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type MenuAction = "start" | "sound" | "music" | "options" | null;

/** CRT-styled deployment screen: choose faction, difficulty and operation. */
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
  private optionsRect: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private soundRect: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private musicRect: Rect = { x: 0, y: 0, w: 0, h: 0 };

  get enemyArmy(): ArmyId {
    const i = ARMY_IDS.indexOf(this.army);
    return ARMY_IDS[(i + 1) % ARMY_IDS.length];
  }

  render(ctx: CanvasRenderingContext2D, vw: number, vh: number): void {
    ctx.fillStyle = "#04070a";
    ctx.fillRect(0, 0, vw, vh);
    // faint grid
    ctx.strokeStyle = "rgba(70,255,106,0.05)";
    ctx.lineWidth = 1;
    for (let x = 0; x < vw; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, vh);
      ctx.stroke();
    }

    // Header.
    ctx.textAlign = "left";
    ctx.fillStyle = THEME.phos;
    ctx.font = "800 22px 'Oxanium', monospace";
    ctx.fillText("EVE", 28, 38);
    ctx.fillStyle = THEME.inkDim;
    ctx.font = "12px 'Share Tech Mono', monospace";
    ctx.fillText("ELECTRONIC VIDEO ENGINE · DEPLOYMENT", 70, 38);

    // Options button (top-right).
    this.optionsRect = { x: vw - 130, y: 20, w: 110, h: 26 };
    this.chrome(ctx, this.optionsRect, "OPTIONEN", false);

    const colW = Math.min(1020, vw - 80);
    const x0 = (vw - colW) / 2;
    let y = 76;

    // ---- Faction cards ----------------------------------------------------
    this.heading(ctx, "WÄHLE DEINE FRAKTION", x0, y);
    y += 16;
    const gap = 16;
    const cardW = (colW - 2 * gap) / 3;
    const cardH = Math.min(280, vh - y - 150);
    this.armyRects = {};
    ARMY_IDS.forEach((id, i) => {
      const a = ARMIES[id];
      const r: Rect = { x: x0 + i * (cardW + gap), y, w: cardW, h: cardH };
      this.armyRects[id] = r;
      const sel = this.army === id;
      ctx.fillStyle = sel ? "rgba(13,28,18,0.95)" : "rgba(10,20,13,0.9)";
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.strokeStyle = sel ? a.color : this.isHover(r) ? THEME.edgeHot : THEME.edge;
      ctx.lineWidth = sel ? 2.5 : 1;
      ctx.strokeRect(r.x, r.y, r.w, r.h);

      drawCrest(ctx, a.crest, r.x + r.w / 2, r.y + 56, 78, a.color);

      ctx.textAlign = "center";
      ctx.fillStyle = THEME.ink;
      ctx.font = "800 16px 'Oxanium', monospace";
      ctx.fillText(a.name.toUpperCase(), r.x + r.w / 2, r.y + 112);
      ctx.fillStyle = a.color;
      ctx.font = "10px 'Share Tech Mono', monospace";
      ctx.fillText(a.tag, r.x + r.w / 2, r.y + 128);

      ctx.fillStyle = THEME.inkDim;
      ctx.font = "10px 'Share Tech Mono', monospace";
      this.wrap(ctx, a.description, r.x + 12, r.y + 146, r.w - 24, 13, 4);

      // Stat bars.
      const labels: [string, number][] = [
        ["Off", a.stats.offense],
        ["Def", a.stats.defense],
        ["Tech", a.stats.tech],
        ["Eco", a.stats.economy],
        ["Spd", a.stats.speed],
      ];
      let sy = r.y + cardH - 78;
      for (const [lab, val] of labels) {
        drawStatBar(ctx, lab, val, r.x + 14, sy, r.w - 28, a.color);
        sy += 15;
      }
    });
    y += cardH + 18;

    // ---- Difficulty -------------------------------------------------------
    this.heading(ctx, "SCHWIERIGKEIT", x0, y);
    y += 16;
    const chipW = (colW - 2 * gap) / 3;
    const chipH = 40;
    this.diffRects = {};
    DIFFICULTY_IDS.forEach((id, i) => {
      const d = DIFFICULTIES[id];
      const r: Rect = { x: x0 + i * (chipW + gap), y, w: chipW, h: chipH };
      this.diffRects[id] = r;
      this.chip(ctx, r, d.name, d.description, this.difficulty === id);
    });
    y += chipH + 16;

    // ---- Operation --------------------------------------------------------
    this.heading(ctx, "OPERATION", x0, y);
    y += 16;
    this.missionRects = {};
    MISSIONS.forEach((m, i) => {
      const r: Rect = { x: x0 + i * (chipW + gap), y, w: chipW, h: chipH };
      this.missionRects[m.id] = r;
      this.chip(ctx, r, m.name, "", this.mission.id === m.id);
    });
    y += chipH + 18;

    // ---- Deploy -----------------------------------------------------------
    const enemy = ARMIES[this.enemyArmy];
    ctx.textAlign = "center";
    ctx.fillStyle = THEME.inkDim;
    ctx.font = "12px 'Share Tech Mono', monospace";
    ctx.fillText(`${ARMIES[this.army].name}   ◂ VS ▸   ${enemy.name}`, vw / 2, y);
    y += 12;
    this.startRect = { x: vw / 2 - 150, y, w: 300, h: 42 };
    const sr = this.startRect;
    const hot = this.isHover(sr);
    ctx.fillStyle = hot ? "rgba(70,255,106,0.18)" : "rgba(14,58,28,0.5)";
    ctx.fillRect(sr.x, sr.y, sr.w, sr.h);
    ctx.strokeStyle = THEME.phos;
    ctx.lineWidth = 2;
    ctx.strokeRect(sr.x, sr.y, sr.w, sr.h);
    ctx.fillStyle = THEME.phos;
    ctx.shadowColor = THEME.phos;
    ctx.shadowBlur = hot ? 14 : 6;
    ctx.font = "800 20px 'Oxanium', monospace";
    ctx.fillText("▶ DEPLOY", vw / 2, sr.y + 28);
    ctx.shadowBlur = 0;

    // Sound / music toggles + version.
    this.soundRect = { x: vw / 2 - 160, y: vh - 34, w: 150, h: 22 };
    this.musicRect = { x: vw / 2 + 10, y: vh - 34, w: 150, h: 22 };
    this.chrome(ctx, this.soundRect, `SOUND: ${this.soundOn ? "AN" : "AUS"}`, false);
    this.chrome(ctx, this.musicRect, `MUSIK: ${this.musicOn ? "AN" : "AUS"}`, false);
    ctx.fillStyle = THEME.inkGhost;
    ctx.font = "10px 'Share Tech Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText(VERSION_LABEL, vw / 2, vh - 8);

    if (settings.crt) drawCRT(ctx, vw, vh);
  }

  click(mx: number, my: number): MenuAction {
    for (const id of ARMY_IDS) if (this.inside(this.armyRects[id], mx, my)) { this.army = id; return null; }
    for (const id of DIFFICULTY_IDS) if (this.inside(this.diffRects[id], mx, my)) { this.difficulty = id; return null; }
    for (const m of MISSIONS) if (this.inside(this.missionRects[m.id], mx, my)) { this.mission = m; return null; }
    if (this.inside(this.optionsRect, mx, my)) return "options";
    if (this.inside(this.startRect, mx, my)) return "start";
    if (this.inside(this.soundRect, mx, my)) return "sound";
    if (this.inside(this.musicRect, mx, my)) return "music";
    return null;
  }

  setHover(mx: number, my: number): void {
    this.hover = { x: mx, y: my };
  }

  // ---- helpers ----------------------------------------------------------

  private heading(ctx: CanvasRenderingContext2D, t: string, x: number, y: number): void {
    ctx.textAlign = "left";
    ctx.fillStyle = THEME.phos;
    ctx.font = "700 12px 'Oxanium', monospace";
    ctx.fillText(`// ${t}`, x, y);
  }

  private chip(ctx: CanvasRenderingContext2D, r: Rect, title: string, sub: string, sel: boolean): void {
    ctx.fillStyle = sel ? "rgba(13,28,18,0.95)" : "rgba(10,20,13,0.85)";
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = sel ? THEME.phos : this.isHover(r) ? THEME.edgeHot : THEME.edge;
    ctx.lineWidth = sel ? 2 : 1;
    ctx.strokeRect(r.x, r.y, r.w, r.h);
    ctx.textAlign = "left";
    ctx.fillStyle = sel ? THEME.ink : THEME.inkDim;
    ctx.font = "700 13px 'Oxanium', monospace";
    ctx.fillText(title, r.x + 10, r.y + (sub ? 18 : 25));
    if (sub) {
      ctx.fillStyle = THEME.inkGhost;
      ctx.font = "9px 'Share Tech Mono', monospace";
      this.wrap(ctx, sub, r.x + 10, r.y + 31, r.w - 16, 11, 1);
    }
  }

  private chrome(ctx: CanvasRenderingContext2D, r: Rect, label: string, sel: boolean): void {
    ctx.fillStyle = this.isHover(r) || sel ? "rgba(13,28,18,0.95)" : "rgba(10,20,13,0.8)";
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = THEME.edge;
    ctx.lineWidth = 1;
    ctx.strokeRect(r.x, r.y, r.w, r.h);
    ctx.textAlign = "center";
    ctx.fillStyle = THEME.phos;
    ctx.font = "11px 'Share Tech Mono', monospace";
    ctx.fillText(label, r.x + r.w / 2, r.y + r.h / 2 + 4);
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
    lh: number,
    maxLines: number
  ): void {
    const words = text.split(" ");
    let line = "";
    let cy = y;
    let lines = 0;
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (ctx.measureText(test).width > maxW && line) {
        ctx.fillText(line, x, cy);
        line = w;
        cy += lh;
        if (++lines >= maxLines - 1) break;
      } else line = test;
    }
    if (lines < maxLines) ctx.fillText(line, x, cy);
  }
}
