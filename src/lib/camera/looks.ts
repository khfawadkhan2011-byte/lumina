import type { LookId, ProcessSettings } from "./types";

export type LookDef = {
  id: LookId;
  name: string;
  hint: string;
  css: string;
  patch: Partial<ProcessSettings>;
};

export const LOOKS: LookDef[] = [
  {
    id: "natural",
    name: "Natural",
    hint: "True color, iPhone-like",
    css: "contrast(1.04) saturate(1.04) brightness(1.02)",
    patch: { contrast: 0.06, vibrance: 0.08, sharpness: 0.24, vignette: 0.08, denoise: 0.06 },
  },
  {
    id: "vivid",
    name: "Vivid",
    hint: "Punchy midtones",
    css: "contrast(1.14) saturate(1.28) brightness(1.03)",
    patch: { contrast: 0.16, vibrance: 0.28, sharpness: 0.28, vignette: 0.1 },
  },
  {
    id: "portrait",
    name: "Portrait",
    hint: "Skin-true, soft falloff",
    css: "contrast(1.06) saturate(0.96) brightness(1.05) sepia(0.06)",
    patch: {
      contrast: 0.04,
      warmth: 0.12,
      vibrance: 0.04,
      beauty: 0.28,
      depth: 0.42,
      vignette: 0.22,
      sharpness: 0.18,
      denoise: 0.1,
    },
  },
  {
    id: "cinema",
    name: "Cinema",
    hint: "Teal shadows, rolled highlights",
    css: "contrast(1.12) saturate(0.86) hue-rotate(-12deg) brightness(0.98)",
    patch: {
      contrast: 0.14,
      warmth: -0.1,
      vibrance: -0.08,
      fade: 0.12,
      vignette: 0.28,
      grain: 0.08,
    },
  },
  {
    id: "food",
    name: "Food",
    hint: "Warm spice, extra bite",
    css: "contrast(1.12) saturate(1.38) brightness(1.06)",
    patch: {
      contrast: 0.14,
      warmth: 0.18,
      vibrance: 0.32,
      sharpness: 0.38,
      vignette: 0.16,
      highlights: -0.08,
    },
  },
  {
    id: "night",
    name: "Night",
    hint: "Lifted shadows, quiet grain",
    css: "contrast(1.18) brightness(1.16) saturate(0.9)",
    patch: {
      exposure: 0.18,
      shadows: 0.32,
      contrast: 0.1,
      grain: 0.12,
      vibrance: -0.06,
      vignette: 0.2,
      denoise: 0.36,
    },
  },
  {
    id: "film",
    name: "400H",
    hint: "Pastel fade, analog grain",
    css: "contrast(0.92) saturate(0.86) sepia(0.1) brightness(1.04)",
    patch: {
      contrast: -0.08,
      fade: 0.22,
      grain: 0.16,
      warmth: 0.1,
      vibrance: -0.04,
      vignette: 0.14,
    },
  },
  {
    id: "mono",
    name: "Mono",
    hint: "Silver gelatin",
    css: "grayscale(1) contrast(1.18) brightness(1.02)",
    patch: { contrast: 0.18, vibrance: -1, vignette: 0.24, grain: 0.1, sharpness: 0.22 },
  },
  {
    id: "leica",
    name: "Leica",
    hint: "High microcontrast",
    css: "contrast(1.22) saturate(0.92) brightness(1.01)",
    patch: {
      contrast: 0.22,
      sharpness: 0.36,
      vibrance: -0.04,
      vignette: 0.18,
      highlights: -0.1,
    },
  },
  {
    id: "golden",
    name: "Golden",
    hint: "Late sun on skin",
    css: "sepia(0.22) saturate(1.12) brightness(1.06) contrast(1.06)",
    patch: { warmth: 0.28, exposure: 0.08, vibrance: 0.12, fade: 0.06, vignette: 0.16 },
  },
  {
    id: "chrome",
    name: "Chrome",
    hint: "Hard light, clean whites",
    css: "contrast(1.28) saturate(1.12) brightness(1.04)",
    patch: { contrast: 0.28, highlights: -0.16, sharpness: 0.32, vibrance: 0.14, vignette: 0.08 },
  },
  {
    id: "cool",
    name: "Alpine",
    hint: "Open shade, clean blues",
    css: "saturate(0.94) hue-rotate(10deg) contrast(1.08) brightness(1.03)",
    patch: { warmth: -0.18, contrast: 0.1, vibrance: 0.06, highlights: 0.06 },
  },
];

export function lookById(id: LookId): LookDef {
  return LOOKS.find((l) => l.id === id) ?? LOOKS[0];
}

export function settingsForLook(
  look: LookId,
  base: ProcessSettings,
): ProcessSettings {
  const def = lookById(look);
  return { ...base, ...def.patch, look };
}
