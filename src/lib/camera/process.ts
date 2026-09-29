import type { AspectId, FocusPoint, ProcessSettings } from "./types";
import { ASPECTS } from "./types";

const MAX_EDGE = 2800;

function clamp(v: number, lo = 0, hi = 1) {
  return v < lo ? lo : v > hi ? hi : v;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function filmic(x: number) {
  const a = 2.51;
  const b = 0.03;
  const c = 2.43;
  const d = 0.59;
  const e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e));
}

function knee(x: number) {
  if (x <= 0.68) return x;
  const t = (x - 0.68) / 0.55;
  return 0.68 + t / (1 + t);
}

function kelvinRgb(k: number): [number, number, number] {
  const t = clamp(k, 2000, 10000) / 100;
  let r: number;
  let g: number;
  let b: number;
  if (t <= 66) {
    r = 255;
    g = 99.4708025861 * Math.log(t) - 161.1195681661;
  } else {
    r = 329.698727446 * Math.pow(t - 60, -0.1332047592);
    g = 288.1221695283 * Math.pow(t - 60, -0.0755148492);
  }
  if (t >= 66) b = 255;
  else if (t <= 19) b = 0;
  else b = 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  return [clamp(r / 255), clamp(g / 255), clamp(b / 255)];
}

function isSkin(r: number, g: number, b: number) {
  return r > 0.28 && g > 0.16 && b > 0.1 && r > g && g > b * 0.82 && r - b > 0.08 && r - g < 0.42;
}

function hash2(x: number, y: number) {
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return n - Math.floor(n);
}

function luma(r: number, g: number, b: number) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function cropRect(
  sw: number,
  sh: number,
  aspect: AspectId,
  zoom: number,
  focus: FocusPoint,
) {
  const spec = ASPECTS.find((a) => a.id === aspect) ?? ASPECTS[0];
  const target = spec.w / spec.h;
  let cw = sw;
  let ch = sh;
  if (sw / sh > target) cw = sh * target;
  else ch = sw / target;
  cw /= zoom;
  ch /= zoom;
  const cx = clamp(focus.x, 0.18, 0.82) * sw;
  const cy = clamp(focus.y, 0.18, 0.82) * sh;
  let sx = cx - cw / 2;
  let sy = cy - ch / 2;
  sx = clamp(sx, 0, sw - cw);
  sy = clamp(sy, 0, sh - ch);
  return { sx, sy, sw: cw, sh: ch };
}

export function fitSize(w: number, h: number, max = MAX_EDGE) {
  const edge = Math.max(w, h);
  if (edge <= max) return { w, h };
  const s = max / edge;
  return { w: Math.round(w * s), h: Math.round(h * s) };
}

function boxBlur(
  src: Uint8ClampedArray,
  w: number,
  h: number,
  radius: number,
): Uint8ClampedArray {
  const dst = new Uint8ClampedArray(src.length);
  const tmp = new Uint8ClampedArray(src.length);
  const r = Math.max(1, Math.round(radius));
  const div = r * 2 + 1;

  for (let y = 0; y < h; y++) {
    let rs = 0;
    let gs = 0;
    let bs = 0;
    const row = y * w * 4;
    for (let k = -r; k <= r; k++) {
      const x = clamp(k, 0, w - 1);
      const i = row + x * 4;
      rs += src[i];
      gs += src[i + 1];
      bs += src[i + 2];
    }
    for (let x = 0; x < w; x++) {
      const i = row + x * 4;
      tmp[i] = rs / div;
      tmp[i + 1] = gs / div;
      tmp[i + 2] = bs / div;
      tmp[i + 3] = src[i + 3];
      const x0 = clamp(x - r, 0, w - 1);
      const x1 = clamp(x + r + 1, 0, w - 1);
      const i0 = row + x0 * 4;
      const i1 = row + x1 * 4;
      rs += src[i1] - src[i0];
      gs += src[i1 + 1] - src[i0 + 1];
      bs += src[i1 + 2] - src[i0 + 2];
    }
  }

  for (let x = 0; x < w; x++) {
    let rs = 0;
    let gs = 0;
    let bs = 0;
    for (let k = -r; k <= r; k++) {
      const y = clamp(k, 0, h - 1);
      const i = (y * w + x) * 4;
      rs += tmp[i];
      gs += tmp[i + 1];
      bs += tmp[i + 2];
    }
    for (let y = 0; y < h; y++) {
      const i = (y * w + x) * 4;
      dst[i] = rs / div;
      dst[i + 1] = gs / div;
      dst[i + 2] = bs / div;
      dst[i + 3] = tmp[i + 3];
      const y0 = clamp(y - r, 0, h - 1);
      const y1 = clamp(y + r + 1, 0, h - 1);
      const i0 = (y0 * w + x) * 4;
      const i1 = (y1 * w + x) * 4;
      rs += tmp[i1] - tmp[i0];
      gs += tmp[i1 + 1] - tmp[i0 + 1];
      bs += tmp[i1 + 2] - tmp[i0 + 2];
    }
  }
  return dst;
}

export function drawSource(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  dw: number,
  dh: number,
  crop: { sx: number; sy: number; sw: number; sh: number } | null,
) {
  if (crop) {
    ctx.drawImage(source, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, dw, dh);
  } else {
    ctx.drawImage(source, 0, 0, dw, dh);
  }
}

export function processPixels(
  image: ImageData,
  settings: ProcessSettings,
  focus: FocusPoint,
  blurred: Uint8ClampedArray | null,
) {
  const { data, width: w, height: h } = image;
  const exposure = Math.pow(2, settings.exposure);
  const contrast = 1 + settings.contrast;
  const warmth = settings.warmth;
  const vibrance = settings.vibrance;
  const shadows = settings.shadows;
  const highlights = settings.highlights;
  const fade = settings.fade;
  const vignette = settings.vignette;
  const grainAmt = settings.grain;
  const beauty = settings.beauty;
  const depth = settings.depth;
  const sharp = settings.sharpness;
  const denoise = settings.denoise;
  const mono = settings.look === "mono" || vibrance <= -0.99;
  const hdr = settings.hdr;
  const cinema = settings.look === "cinema";
  const food = settings.look === "food";
  const kMul = settings.kelvin > 0 ? kelvinRgb(settings.kelvin) : null;

  const fx = focus.x * w;
  const fy = focus.y * h;
  const minSide = Math.min(w, h);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      let r = data[i] / 255;
      let g = data[i + 1] / 255;
      let b = data[i + 2] / 255;

      if (kMul) {
        r *= 1 / Math.max(0.35, kMul[0]);
        g *= 1 / Math.max(0.35, kMul[1]);
        b *= 1 / Math.max(0.35, kMul[2]);
      }

      r *= exposure;
      g *= exposure;
      b *= exposure;

      r = knee(r);
      g = knee(g);
      b = knee(b);

      let Y = luma(r, g, b);
      if (shadows !== 0) {
        const lift = Math.pow(1 - Y, 2) * shadows;
        r += lift;
        g += lift;
        b += lift;
      }
      if (highlights !== 0) {
        const roll = Y * Y * highlights;
        r += roll;
        g += roll;
        b += roll;
      }

      r = (r - 0.5) * contrast + 0.5;
      g = (g - 0.5) * contrast + 0.5;
      b = (b - 0.5) * contrast + 0.5;

      r += warmth * 0.08;
      b -= warmth * 0.08;
      g += warmth * 0.02;

      Y = luma(r, g, b);
      const satBoost = vibrance;
      const satMask = 1 - clamp(Math.abs(r - g) + Math.abs(g - b) + Math.abs(b - r));
      const skin = isSkin(r, g, b);
      const skinProtect = skin ? 0.35 : 1;
      const s = 1 + satBoost * lerp(0.45, 1, satMask) * skinProtect;
      r = Y + (r - Y) * s;
      g = Y + (g - Y) * s;
      b = Y + (b - Y) * s;

      if (food) {
        r *= 1.06;
        g *= 1.03;
        b *= 0.96;
      }
      if (cinema) {
        r = lerp(r, r * 1.04, 0.4);
        b = lerp(b, b * 1.08, 0.45);
        g = lerp(g, g * 0.98, 0.3);
      }

      if (blurred) {
        const br = blurred[i] / 255;
        const bg = blurred[i + 1] / 255;
        const bb = blurred[i + 2] / 255;
        if (sharp > 0) {
          r += (r - br) * sharp * 1.4;
          g += (g - bg) * sharp * 1.4;
          b += (b - bb) * sharp * 1.4;
        }
        if (beauty > 0 && skin) {
          r = lerp(r, br, beauty * 0.55);
          g = lerp(g, bg, beauty * 0.55);
          b = lerp(b, bb, beauty * 0.55);
        }
        if (depth > 0) {
          const dx = (x - fx) / minSide;
          const dy = (y - fy) / (minSide * 1.15);
          const dist = Math.sqrt(dx * dx + dy * dy);
          const mask = clamp((dist - 0.22) / 0.55);
          const amt = depth * Math.pow(mask, 1.2);
          r = lerp(r, br, amt);
          g = lerp(g, bg, amt);
          b = lerp(b, bb, amt);
        }
        if (denoise > 0) {
          const edge = clamp((Math.abs(r - br) + Math.abs(g - bg) + Math.abs(b - bb)) * 3.6);
          const dark = 1 - clamp(Y * 1.35);
          const amtN = denoise * dark * (1 - edge);
          r = lerp(r, br, amtN);
          g = lerp(g, bg, amtN);
          b = lerp(b, bb, amtN);
        }
      }

      if (hdr) {
        r = filmic(r * 0.95);
        g = filmic(g * 0.95);
        b = filmic(b * 0.95);
      }

      if (fade > 0) {
        r = lerp(r, lerp(r, 0.55, fade), fade);
        g = lerp(g, lerp(g, 0.52, fade), fade);
        b = lerp(b, lerp(b, 0.5, fade), fade);
        r = lerp(r, 0.18, fade * 0.12);
        g = lerp(g, 0.16, fade * 0.12);
        b = lerp(b, 0.14, fade * 0.12);
      }

      if (vignette > 0) {
        const nx = x / w - 0.5;
        const ny = y / h - 0.5;
        const v = 1 - vignette * Math.pow(nx * nx * 2.4 + ny * ny * 2.4, 1.15);
        r *= v;
        g *= v;
        b *= v;
      }

      if (grainAmt > 0) {
        const n = (hash2(x + 0.5, y + 0.7) - 0.5) * grainAmt * 0.22;
        r += n;
        g += n;
        b += n;
      }

      if (mono) {
        const m = luma(r, g, b);
        r = g = b = m;
      }

      data[i] = clamp(r) * 255;
      data[i + 1] = clamp(g) * 255;
      data[i + 2] = clamp(b) * 255;
    }
  }
}

export function renderProcessed(
  source: CanvasImageSource,
  srcW: number,
  srcH: number,
  settings: ProcessSettings,
  opts: {
    aspect?: AspectId;
    zoom?: number;
    focus?: FocusPoint;
    maxEdge?: number;
    crop?: { sx: number; sy: number; sw: number; sh: number } | null;
  } = {},
): HTMLCanvasElement {
  const zoom = opts.zoom ?? 1;
  const focus = opts.focus ?? { x: 0.5, y: 0.42 };
  const crop =
    opts.crop ??
    (opts.aspect ? cropRect(srcW, srcH, opts.aspect, zoom, focus) : null);
  const outW = crop ? crop.sw : srcW;
  const outH = crop ? crop.sh : srcH;
  const fitted = fitSize(outW, outH, opts.maxEdge ?? MAX_EDGE);
  const canvas = document.createElement("canvas");
  canvas.width = fitted.w;
  canvas.height = fitted.h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return canvas;
  drawSource(ctx, source, fitted.w, fitted.h, crop);
  const image = ctx.getImageData(0, 0, fitted.w, fitted.h);
  const needBlur =
    settings.sharpness > 0.02 ||
    settings.beauty > 0.02 ||
    settings.depth > 0.02 ||
    settings.denoise > 0.02;
  const radius = Math.max(1, Math.round(Math.min(fitted.w, fitted.h) / 220));
  const blurred = needBlur ? boxBlur(image.data, fitted.w, fitted.h, radius) : null;
  processPixels(image, settings, focus, blurred);
  ctx.putImageData(image, 0, 0);
  return canvas;
}

export function canvasToBlob(
  canvas: HTMLCanvasElement,
  type = "image/jpeg",
  quality = 0.96,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("encode failed"));
      },
      type,
      quality,
    );
  });
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image load failed"));
    img.src = src;
  });
}

export async function blobToImage(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob);
  try {
    return await loadImage(url);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function makeThumb(canvas: HTMLCanvasElement, size = 360): HTMLCanvasElement {
  const scale = size / Math.max(canvas.width, canvas.height);
  const w = Math.max(1, Math.round(canvas.width * scale));
  const h = Math.max(1, Math.round(canvas.height * scale));
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const ctx = out.getContext("2d");
  if (ctx) {
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(canvas, 0, 0, w, h);
  }
  return out;
}
