import type { CaptureMode, FocusPoint, ProcessSettings } from "./types";

export type SceneKind = "day" | "night" | "portrait" | "food" | "indoor" | "backlit";

export type SceneMeter = {
  kind: SceneKind;
  label: string;
  luma: number;
  contrast: number;
  warmth: number;
  skin: number;
  sat: number;
  sharpness: number;
  clipHi: number;
  clipLo: number;
  focus: FocusPoint;
  ev: number;
  shadowLift: number;
  highlightRoll: number;
  warmthShift: number;
  flash: boolean;
};

function clamp(v: number, lo = 0, hi = 1) {
  return v < lo ? lo : v > hi ? hi : v;
}

function isSkin(r: number, g: number, b: number) {
  return r > 0.28 && g > 0.16 && b > 0.1 && r > g && g > b * 0.82 && r - b > 0.08 && r - g < 0.42;
}

export function meterFrame(data: Uint8ClampedArray, w: number, h: number): SceneMeter {
  let lumaSum = 0;
  let lumaSq = 0;
  let rSum = 0;
  let gSum = 0;
  let bSum = 0;
  let skinN = 0;
  let skinX = 0;
  let skinY = 0;
  let satSum = 0;
  let clipHi = 0;
  let clipLo = 0;
  let sharp = 0;
  let n = 0;
  const step = 4;
  const step = 4;

  for (let y = 1; y < h - 1; y += 2) {
    for (let x = 1; x < w - 1; x += 2) {
      const i = (y * w + x) * 4;
      const r = data[i] / 255;
      const g = data[i + 1] / 255;
      const b = data[i + 2] / 255;
      const Y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      lumaSum += Y;
      lumaSq += Y * Y;
      rSum += r;
      gSum += g;
      bSum += b;
      satSum += Math.max(r, g, b) - Math.min(r, g, b);
      if (Y > 0.92) clipHi++;
      if (Y < 0.06) clipLo++;
      if (isSkin(r, g, b)) {
        skinN++;
        skinX += x;
        skinY += y;
      }
      const i1 = (y * w + (x + 1)) * 4;
      const i2 = ((y + 1) * w + x) * 4;
      const y1 = (data[i1] * 0.2126 + data[i1 + 1] * 0.7152 + data[i1 + 2] * 0.0722) / 255;
      const y2 = (data[i2] * 0.2126 + data[i2 + 1] * 0.7152 + data[i2 + 2] * 0.0722) / 255;
      sharp += Math.abs(Y - y1) + Math.abs(Y - y2);
      n++;
    }
  }

  const luma = n ? lumaSum / n : 0.5;
  const variance = Math.max(0, (n ? lumaSq / n : 0) - luma * luma);
  const contrast = Math.sqrt(variance);
  const skin = n ? skinN / n : 0;
  const sat = n ? satSum / n : 0;
  const rm = n ? rSum / n : 0;
  const bm = n ? bSum / n : 0;
  const warmth = clamp((rm - bm) * 2, -1, 1);
  const hi = n ? clipHi / n : 0;
  const lo = n ? clipLo / n : 0;
  const sharpness = n ? sharp / n : 0;

  let kind: SceneKind = "day";
  if (luma < 0.16 || lo > 0.42) kind = "night";
  else if (hi > 0.12 && lo > 0.12) kind = "backlit";
  else if (skin > 0.1) kind = "portrait";
  else if (sat > 0.22 && warmth > 0.12 && luma > 0.28) kind = "food";
  else if (luma < 0.38 && contrast < 0.16) kind = "indoor";

  const target = kind === "night" ? 0.42 : kind === "backlit" ? 0.4 : 0.46;
  const ev = clamp((target - luma) * 2.4, -1.2, 1.4);
  const shadowLift = kind === "night" || kind === "backlit" || kind === "indoor" ? clamp(0.18 + (0.4 - luma) * 0.5, 0, 0.45) : 0.04;
  const highlightRoll = hi > 0.06 ? -clamp(hi * 1.4, 0, 0.32) : 0;
  const warmthShift = -warmth * 0.12;

  const cx = w > 1 ? (skinN > 4 ? skinX / skinN / (w - 1) : 0.5) : 0.5;
  const cy = h > 1 ? (skinN > 4 ? skinY / skinN / (h - 1) : 0.42) : 0.42;

  const labels: Record<SceneKind, string> = {
    day: "Daylight",
    night: "Night",
    portrait: "Portrait",
    food: "Food",
    indoor: "Indoor",
    backlit: "Backlit",
  };

  return {
    kind,
    label: labels[kind],
    luma,
    contrast,
    warmth,
    skin,
    sat,
    sharpness,
    clipHi: hi,
    clipLo: lo,
    focus: { x: cx, y: cy },
    ev,
    shadowLift,
    highlightRoll,
    warmthShift,
    flash: kind === "night" && luma < 0.12,
  };
}

export function mergeAuto(
  base: ProcessSettings,
  meter: SceneMeter,
  mode: CaptureMode,
  autoOn: boolean,
): ProcessSettings {
  if (!autoOn) return { ...base };
  const p: ProcessSettings = { ...base };
  p.hdr = true;
  p.exposure = clamp(base.exposure + meter.ev * 0.7, -1.4, 1.5);
  p.shadows = clamp(base.shadows + meter.shadowLift, -0.15, 0.55);
  p.highlights = clamp(base.highlights + meter.highlightRoll, -0.45, 0.2);
  p.warmth = clamp(base.warmth + meter.warmthShift, -0.35, 0.35);
  p.sharpness = Math.max(p.sharpness, 0.2);

  if (meter.kind === "night" || mode === "night") {
    p.denoise = Math.max(p.denoise, 0.34);
    p.grain = Math.max(p.grain, 0.08);
    p.contrast = Math.max(p.contrast, 0.08);
    p.hdr = true;
  }
  if (meter.kind === "portrait" || mode === "portrait" || meter.skin > 0.1) {
    p.beauty = Math.max(p.beauty, mode === "portrait" ? 0.26 : 0.16);
    p.depth = Math.max(p.depth, mode === "portrait" || meter.kind === "portrait" ? 0.4 : 0.12);
    p.warmth = clamp(p.warmth + 0.06, -0.3, 0.4);
  }
  if (meter.kind === "food" || mode === "food") {
    p.vibrance = Math.max(p.vibrance, 0.24);
    p.sharpness = Math.max(p.sharpness, 0.32);
    p.warmth = clamp(p.warmth + 0.1, -0.2, 0.4);
  }
  if (meter.kind === "backlit") {
    p.hdr = true;
    p.shadows = Math.max(p.shadows, 0.28);
    p.highlights = Math.min(p.highlights, -0.18);
    p.denoise = Math.max(p.denoise, 0.1);
  }
  if (meter.kind === "day") {
    p.vibrance = Math.max(p.vibrance, 0.08);
    p.contrast = Math.max(p.contrast, 0.05);
  }
  return p;
}

export function sharpnessScore(data: Uint8ClampedArray, w: number, h: number) {
  let s = 0;
  for (let y = 1; y < h - 1; y += 2) {
    for (let x = 1; x < w - 1; x += 2) {
      const i = (y * w + x) * 4;
      const Y = data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722;
      const gx = data[i + 4] - data[i - 4];
      const gy = data[i + w * 4] - data[i - w * 4];
      s += gx * gx + gy * gy + Math.abs(Y - 128);
    }
  }
  return s;
}

export async function pickSharpest(
  frames: Array<{ source: CanvasImageSource; width: number; height: number }>,
): Promise<{ source: CanvasImageSource; width: number; height: number }> {
  if (frames.length <= 1) return frames[0];
  const canvas = document.createElement("canvas");
  canvas.width = 96;
  canvas.height = 64;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return frames[0];
  let best = frames[0];
  let bestScore = -1;
  for (const frame of frames) {
    ctx.drawImage(frame.source, 0, 0, 96, 64);
    const score = sharpnessScore(ctx.getImageData(0, 0, 96, 64).data, 96, 64);
    if (score > bestScore) {
      bestScore = score;
      best = frame;
    }
  }
  return best;
}

export async function stackFrames(
  frames: Array<{ source: CanvasImageSource; width: number; height: number }>,
): Promise<{ source: CanvasImageSource; width: number; height: number }> {
  if (frames.length <= 1) return frames[0];
  const w = frames[0].width;
  const h = frames[0].height;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return frames[0];
  ctx.globalAlpha = 1 / frames.length;
  for (const frame of frames) {
    ctx.drawImage(frame.source, 0, 0, w, h);
  }
  ctx.globalAlpha = 1;
  return { source: canvas, width: w, height: h };
}

export function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
