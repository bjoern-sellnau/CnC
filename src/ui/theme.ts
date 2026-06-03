/**
 * Shared visual theme for the CRT "EVE Tactical OS" look — colour palette and
 * canvas helpers (faction crests, scanline/vignette overlay, stat bars).
 * Ported from the Command & Conquest design bundle (cnc.css / factions.js).
 */
import type { CrestKind } from "../core/factions";

export const THEME = {
  bg: "#04070a",
  panel: "#0a140d",
  panel2: "#0d1c12",
  edge: "#1d3a24",
  edgeHot: "#2f6b41",
  ink: "#a6ffc0",
  inkDim: "#4f7e5c",
  inkGhost: "#2c4a36",
  phos: "#46ff6a",
  amber: "#ffb23a",
  red: "#ff4d4d",
};

// ---- CRT overlay ----------------------------------------------------------

let scanPattern: CanvasPattern | null = null;
function getScanPattern(ctx: CanvasRenderingContext2D): CanvasPattern | null {
  if (scanPattern) return scanPattern;
  const c = document.createElement("canvas");
  c.width = 1;
  c.height = 3;
  const p = c.getContext("2d")!;
  p.fillStyle = "rgba(0,0,0,0.22)";
  p.fillRect(0, 0, 1, 1); // one dark line every 3px
  scanPattern = ctx.createPattern(c, "repeat");
  return scanPattern;
}

/** Draw scanlines + vignette + faint phosphor glow over the whole canvas. */
export function drawCRT(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  if (typeof document === "undefined") return; // no-op outside the browser
  const pat = getScanPattern(ctx);
  if (pat) {
    ctx.fillStyle = pat;
    ctx.fillRect(0, 0, w, h);
  }
  // Vignette.
  const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);
}

// ---- Faction crests (canvas port of the SVG crests) -----------------------

export function drawCrest(
  ctx: CanvasRenderingContext2D,
  kind: CrestKind,
  cx: number,
  cy: number,
  size: number,
  color: string
): void {
  const s = size / 200;
  const px = (x: number) => cx - size / 2 + x * s;
  const py = (y: number) => cy - size / 2 + y * s;
  const poly = (pts: number[][]) => {
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(px(p[0]), py(p[1])) : ctx.moveTo(px(p[0]), py(p[1]))));
    ctx.closePath();
  };
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineJoin = "round";

  if (kind === "crown") {
    ctx.lineWidth = 3 * s;
    ctx.beginPath();
    [[34, 138], [34, 80], [68, 110], [100, 50], [132, 110], [166, 80], [166, 138]].forEach((p, i) =>
      i ? ctx.lineTo(px(p[0]), py(p[1])) : ctx.moveTo(px(p[0]), py(p[1]))
    );
    ctx.closePath();
    ctx.globalAlpha = 0.14;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.stroke();
    ctx.strokeRect(px(32), py(140), 136 * s, 20 * s);
    for (const jx of [68, 100, 132]) {
      ctx.beginPath();
      ctx.arc(px(jx), py(150), 4.2 * s, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (kind === "rings") {
    const ring = (r: number, alpha: number, dash: number[]) => {
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 2.4 * s;
      ctx.setLineDash(dash.map((d) => d * s));
      ctx.beginPath();
      ctx.arc(cx, cy, r * s, 0, Math.PI * 2);
      ctx.stroke();
    };
    ring(84, 0.32, [5, 9]);
    ring(63, 0.7, []);
    ring(42, 0.5, [3, 7]);
    ctx.setLineDash([]);
    ctx.globalAlpha = 0.85;
    ctx.lineWidth = 2.2 * s;
    poly([[100, 82], [116, 110], [84, 110]]);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, 9 * s, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // hex (Vanguard)
    ctx.lineWidth = 3 * s;
    poly([[100, 12], [170, 52], [170, 132], [100, 172], [30, 132], [30, 52]]);
    ctx.globalAlpha = 0.1;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.stroke();
    ctx.lineWidth = 1.6 * s;
    poly([[100, 36], [150, 65], [150, 119], [100, 148], [50, 119], [50, 65]]);
    ctx.stroke();
    ctx.lineWidth = 2.4 * s;
    const line = (a: number[], b: number[]) => {
      ctx.beginPath();
      ctx.moveTo(px(a[0]), py(a[1]));
      ctx.lineTo(px(b[0]), py(b[1]));
      ctx.stroke();
    };
    line([100, 44], [100, 140]);
    line([60, 67], [140, 113]);
    line([140, 67], [60, 113]);
    ctx.beginPath();
    ctx.arc(px(100), py(92), 15 * s, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** A small labelled value bar (0..5) used on the faction cards. */
export function drawStatBar(
  ctx: CanvasRenderingContext2D,
  label: string,
  value: number,
  x: number,
  y: number,
  w: number,
  color: string
): void {
  ctx.textAlign = "left";
  ctx.fillStyle = THEME.inkDim;
  ctx.font = "9px monospace";
  ctx.fillText(label.toUpperCase(), x, y - 3);
  const barX = x + 64;
  const barW = w - 64;
  ctx.fillStyle = "#06160c";
  ctx.fillRect(barX, y - 9, barW, 8);
  ctx.strokeStyle = THEME.edge;
  ctx.lineWidth = 1;
  ctx.strokeRect(barX, y - 9, barW, 8);
  const seg = barW / 5;
  ctx.fillStyle = color;
  for (let i = 0; i < value; i++) {
    ctx.fillRect(barX + i * seg + 1, y - 8, seg - 2, 6);
  }
}
