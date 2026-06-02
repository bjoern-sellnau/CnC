import type { Game } from "../core/Game";
import { ARMIES } from "../core/factions";
import { DIFFICULTIES } from "../core/difficulty";

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Post-mission debriefing screen (à la Command & Conquer, without FMV):
 * a victory/defeat banner and a summary of the engagement statistics.
 */
export class Debriefing {
  private button: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private hover = { x: -1, y: -1 };

  render(ctx: CanvasRenderingContext2D, vw: number, vh: number, game: Game): void {
    const win = game.victory;
    const accent = win ? "#9ad06b" : "#ff6a5f";

    // Dim the battlefield behind the report.
    ctx.fillStyle = "rgba(4, 6, 3, 0.82)";
    ctx.fillRect(0, 0, vw, vh);

    const panelW = Math.min(560, vw - 60);
    const panelH = 430;
    const px = (vw - panelW) / 2;
    const py = (vh - panelH) / 2;

    ctx.fillStyle = "#0e120a";
    ctx.fillRect(px, py, panelW, panelH);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 3;
    ctx.strokeRect(px, py, panelW, panelH);

    // Banner.
    ctx.textAlign = "center";
    ctx.fillStyle = accent;
    ctx.font = "bold 40px monospace";
    ctx.fillText(win ? "MISSION ERFÜLLT" : "MISSION GESCHEITERT", vw / 2, py + 56);

    ctx.fillStyle = "#8aa070";
    ctx.font = "13px monospace";
    ctx.fillText("— EINSATZBERICHT —", vw / 2, py + 80);

    // Context line.
    ctx.fillStyle = "#c8d8b0";
    ctx.font = "13px monospace";
    ctx.fillText(
      `${game.mission.name}   ·   ${ARMIES[game.playerArmy].name}   ·   ${DIFFICULTIES[game.difficulty].name}`,
      vw / 2,
      py + 104
    );

    // Stats table.
    const s = game.stats;
    const rows: [string, string][] = [
      ["Einsatzdauer", formatTime(s.elapsed)],
      ["Einheiten gebaut", String(s.unitsBuilt)],
      ["Einheiten verloren", String(s.unitsLost)],
      ["Gegner vernichtet", String(s.enemiesDestroyed)],
      ["Gebäude verloren", String(s.buildingsLost)],
      ["Tiberium gesammelt", `$ ${Math.floor(s.creditsHarvested)}`],
    ];
    const score = Math.max(
      0,
      Math.round(s.enemiesDestroyed * 100 + s.creditsHarvested / 10 - s.unitsLost * 40 - s.buildingsLost * 120 + (win ? 1000 : 0))
    );

    let ry = py + 140;
    const lx = px + 40;
    const rx = px + panelW - 40;
    ctx.font = "15px monospace";
    for (const [label, value] of rows) {
      ctx.textAlign = "left";
      ctx.fillStyle = "#9aaa88";
      ctx.fillText(label, lx, ry);
      ctx.textAlign = "right";
      ctx.fillStyle = "#e8f0d8";
      ctx.fillText(value, rx, ry);
      // dotted leader line
      ctx.strokeStyle = "rgba(120,150,90,0.18)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(lx, ry + 4);
      ctx.lineTo(rx, ry + 4);
      ctx.stroke();
      ry += 30;
    }

    // Score.
    ry += 6;
    ctx.textAlign = "left";
    ctx.fillStyle = accent;
    ctx.font = "bold 17px monospace";
    ctx.fillText("PUNKTE", lx, ry);
    ctx.textAlign = "right";
    ctx.fillText(String(score), rx, ry);

    // Continue button.
    const bw = 240;
    const bh = 44;
    this.button = { x: vw / 2 - bw / 2, y: py + panelH - 60, w: bw, h: bh };
    const b = this.button;
    const hot = this.inside(b, this.hover.x, this.hover.y);
    ctx.fillStyle = hot ? "#2f5a22" : "#1c2415";
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.strokeRect(b.x, b.y, b.w, b.h);
    ctx.textAlign = "center";
    ctx.fillStyle = "#e8f0d8";
    ctx.font = "bold 18px monospace";
    ctx.fillText("ZURÜCK ZUM MENÜ", vw / 2, b.y + 29);
  }

  setHover(x: number, y: number): void {
    this.hover = { x, y };
  }

  /** True if the continue button was clicked. */
  click(x: number, y: number): boolean {
    return this.inside(this.button, x, y);
  }

  private inside(r: Rect, x: number, y: number): boolean {
    return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  }
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
