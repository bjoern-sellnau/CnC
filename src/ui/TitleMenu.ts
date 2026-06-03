import { ARMIES } from "../core/factions";
import type { ArmyId } from "../core/types";
import { VERSION_LABEL } from "../version";
import { THEME, drawCRT, drawCrest } from "./theme";
import { settings } from "../core/settings";

interface Item {
  label: string;
  desc: string;
  action: TitleAction;
  enabled: boolean;
  badge?: string;
}

export type TitleAction = "deploy" | "options" | null;

const ITEMS: Item[] = [
  { label: "New Campaign", desc: "14 Operationen · Einzelspieler", action: "deploy", enabled: true },
  { label: "Skirmish", desc: "Sofortgefecht gegen die KI", action: "deploy", enabled: true },
  { label: "Multiplayer", desc: "bis zu 8 Kommandanten", action: null, enabled: false, badge: "SOON" },
  { label: "Load Operation", desc: "keine gespeicherten Schlachten", action: null, enabled: false },
  { label: "Options", desc: "Audio · Video · EVE-Stimme", action: "options", enabled: true },
  { label: "Exit to Terminal", desc: "Sitzung beenden", action: null, enabled: false },
];

/**
 * The design's Title main menu: wordmark, a bracket-selector menu list and a
 * rotating faction emblem. Sits between the boot intro and the deployment
 * (faction-select) screen.
 */
export class TitleMenu {
  army: ArmyId = "alliance";
  private sel = 0;
  private spin = 0;
  private rects: { r: { x: number; y: number; w: number; h: number }; i: number }[] = [];

  private get enabledIdx(): number[] {
    return ITEMS.map((it, i) => (it.enabled ? i : -1)).filter((i) => i >= 0);
  }

  update(dt: number): void {
    this.spin = (this.spin + dt * 0.35) % (Math.PI * 2);
  }

  setHover(x: number, y: number): void {
    for (const { r, i } of this.rects) {
      if (ITEMS[i].enabled && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
        this.sel = this.enabledIdx.indexOf(i);
      }
    }
  }

  move(dir: number): void {
    const n = this.enabledIdx.length;
    this.sel = (this.sel + dir + n) % n;
  }

  activate(): TitleAction {
    return ITEMS[this.enabledIdx[this.sel]].action;
  }

  click(x: number, y: number): TitleAction {
    for (const { r, i } of this.rects) {
      if (ITEMS[i].enabled && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
        this.sel = this.enabledIdx.indexOf(i);
        return ITEMS[i].action;
      }
    }
    return null;
  }

  render(ctx: CanvasRenderingContext2D, vw: number, vh: number): void {
    const fac = ARMIES[this.army];
    ctx.fillStyle = "#02060a";
    ctx.fillRect(0, 0, vw, vh);
    this.drawFloor(ctx, vw, vh);

    // Header.
    ctx.textAlign = "left";
    ctx.fillStyle = THEME.inkDim;
    ctx.font = "12px 'Share Tech Mono', monospace";
    ctx.fillText("EVE TACTICAL OS · v3.7.2     SECTOR: KARELIAN BASIN", 32, 30);
    ctx.textAlign = "right";
    ctx.fillStyle = THEME.phos;
    ctx.fillText("● BATTLE NETWORK ONLINE", vw - 32, 30);

    const leftX = Math.max(48, vw * 0.08);

    // Wordmark.
    ctx.textAlign = "left";
    ctx.fillStyle = THEME.inkDim;
    ctx.font = "700 14px 'Oxanium', monospace";
    ctx.fillText("A   C R Y S T A L   W A R S   S I M U L A T I O N", leftX, vh * 0.26);
    ctx.fillStyle = "#dffce7";
    ctx.font = "800 76px 'Oxanium', monospace";
    ctx.shadowColor = "rgba(70,255,106,0.35)";
    ctx.shadowBlur = 6;
    ctx.fillText("COMMAND", leftX, vh * 0.26 + 78);
    const ampW = ctx.measureText("&").width;
    ctx.fillStyle = THEME.phos;
    ctx.shadowColor = THEME.phos;
    ctx.shadowBlur = 22;
    ctx.fillText("&", leftX, vh * 0.26 + 150);
    ctx.fillStyle = "#dffce7";
    ctx.shadowColor = "rgba(70,255,106,0.35)";
    ctx.shadowBlur = 6;
    ctx.fillText(" CONQUEST", leftX + ampW, vh * 0.26 + 150);
    ctx.shadowBlur = 0;
    // rule
    ctx.fillStyle = THEME.phos;
    ctx.fillRect(leftX, vh * 0.26 + 172, 360, 2);
    ctx.fillStyle = THEME.ink;
    ctx.font = "15px 'Share Tech Mono', monospace";
    ctx.fillText("HARVEST · BUILD · DOMINATE", leftX, vh * 0.26 + 198);

    // Menu list.
    this.rects = [];
    let my = vh * 0.26 + 236;
    const enabledIdx = this.enabledIdx;
    ITEMS.forEach((it, i) => {
      const isSel = it.enabled && enabledIdx[this.sel] === i;
      const rect = { x: leftX - 14, y: my - 22, w: 520, h: 34 };
      this.rects.push({ r: rect, i });
      if (isSel) {
        const g = ctx.createLinearGradient(rect.x, 0, rect.x + 360, 0);
        g.addColorStop(0, "rgba(70,255,106,0.12)");
        g.addColorStop(1, "rgba(70,255,106,0)");
        ctx.fillStyle = g;
        ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      }
      ctx.textAlign = "left";
      if (isSel) {
        ctx.fillStyle = THEME.phos;
        ctx.font = "20px 'Share Tech Mono', monospace";
        ctx.fillText("▶", leftX - 6, my + 2);
      }
      ctx.fillStyle = !it.enabled ? THEME.inkGhost : isSel ? "#eafff0" : THEME.inkDim;
      ctx.font = "700 24px 'Oxanium', monospace";
      ctx.fillText(it.label.toUpperCase(), leftX + 24, my + 4);
      const lw = ctx.measureText(it.label.toUpperCase()).width;
      if (it.badge) {
        ctx.fillStyle = THEME.phos;
        ctx.fillRect(leftX + 24 + lw + 12, my - 11, 44, 16);
        ctx.fillStyle = "#04070a";
        ctx.font = "10px 'Share Tech Mono', monospace";
        ctx.fillText(it.badge, leftX + 24 + lw + 18, my + 1);
      }
      if (isSel) {
        ctx.fillStyle = THEME.inkGhost;
        ctx.font = "12px 'Share Tech Mono', monospace";
        ctx.textAlign = "right";
        ctx.fillText(it.desc, leftX + 520, my + 2);
      }
      my += 42;
    });

    // Emblem (right side).
    this.drawEmblem(ctx, vw * 0.74, vh * 0.5, Math.min(vh * 0.32, vw * 0.18), fac);

    // Footer.
    ctx.textAlign = "left";
    ctx.fillStyle = THEME.ink;
    ctx.font = "13px 'Share Tech Mono', monospace";
    ctx.fillText("> WÄHLE EINE OPERATION ZUM EINSATZ", 32, vh - 26);
    ctx.textAlign = "right";
    ctx.fillStyle = THEME.inkDim;
    ctx.font = "11px 'Share Tech Mono', monospace";
    ctx.fillText(`${VERSION_LABEL}   ·   ↑↓ NAVIGIEREN · ⏎/KLICK WÄHLEN`, vw - 32, vh - 26);

    if (settings.crt) drawCRT(ctx, vw, vh);
  }

  private drawEmblem(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    r: number,
    fac: { color: string; crest: import("../core/factions").CrestKind; name: string; tag: string }
  ): void {
    ctx.save();
    // Rings.
    ctx.strokeStyle = "rgba(70,255,106,0.18)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 8]);
    ctx.beginPath();
    ctx.arc(cx, cy, r, this.spin, this.spin + Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = "rgba(70,255,106,0.28)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.78, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([3, 7]);
    ctx.strokeStyle = "rgba(70,255,106,0.22)";
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.58, -this.spin * 1.4, -this.spin * 1.4 + Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    // orbiting blips on middle ring
    for (const a of [this.spin, this.spin + Math.PI]) {
      ctx.fillStyle = THEME.phos;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * r * 0.78, cy + Math.sin(a) * r * 0.78, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    // Crest.
    drawCrest(ctx, fac.crest, cx, cy, r * 0.9, fac.color);
    ctx.restore();

    ctx.textAlign = "center";
    ctx.fillStyle = THEME.ink;
    ctx.font = "800 18px 'Oxanium', monospace";
    ctx.fillText(fac.name.toUpperCase(), cx, cy + r + 30);
    ctx.fillStyle = THEME.inkDim;
    ctx.font = "11px 'Share Tech Mono', monospace";
    ctx.fillText(fac.tag, cx, cy + r + 48);
  }

  private drawFloor(ctx: CanvasRenderingContext2D, vw: number, vh: number): void {
    ctx.save();
    const horizon = vh * 0.62;
    ctx.strokeStyle = "rgba(70,255,106,0.1)";
    ctx.lineWidth = 1;
    for (let i = 1; i < 14; i++) {
      const p = i / 14;
      const y = horizon + p * p * (vh - horizon);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(vw, y);
      ctx.stroke();
    }
    const cx = vw / 2;
    for (let i = -14; i <= 14; i++) {
      ctx.beginPath();
      ctx.moveTo(cx + i * 30, horizon);
      ctx.lineTo(cx + i * 200, vh);
      ctx.stroke();
    }
    ctx.restore();
  }
}
