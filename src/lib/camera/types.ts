export type CaptureMode = "photo" | "portrait" | "food" | "night" | "pro";
export type AspectId = "4:3" | "3:2" | "1:1" | "16:9" | "9:16";
export type GridId = "off" | "thirds" | "golden" | "diag";
export type FlashId = "off" | "on" | "auto";
export type LookId =
  | "natural"
  | "vivid"
  | "portrait"
  | "cinema"
  | "food"
  | "night"
  | "film"
  | "mono"
  | "leica"
  | "golden"
  | "chrome"
  | "cool";

export type FocusPoint = { x: number; y: number };

export type ProcessSettings = {
  look: LookId;
  exposure: number;
  contrast: number;
  highlights: number;
  shadows: number;
  warmth: number;
  vibrance: number;
  sharpness: number;
  vignette: number;
  grain: number;
  fade: number;
  beauty: number;
  depth: number;
  kelvin: number;
  denoise: number;
  hdr: boolean;
};

export type Shot = {
  id: string;
  createdAt: number;
  width: number;
  height: number;
  mode: CaptureMode;
  look: LookId;
  enhance: boolean;
  favorite: boolean;
  caption: string;
};

export const ASPECTS: { id: AspectId; label: string; w: number; h: number }[] = [
  { id: "4:3", label: "4:3", w: 4, h: 3 },
  { id: "3:2", label: "3:2", w: 3, h: 2 },
  { id: "1:1", label: "1:1", w: 1, h: 1 },
  { id: "16:9", label: "16:9", w: 16, h: 9 },
  { id: "9:16", label: "9:16", w: 9, h: 16 },
];

export const MODES: { id: CaptureMode; label: string }[] = [
  { id: "photo", label: "Photo" },
  { id: "portrait", label: "Portrait" },
  { id: "food", label: "Food" },
  { id: "night", label: "Night" },
  { id: "pro", label: "Pro" },
];

export const DEFAULT_PROCESS: ProcessSettings = {
  look: "natural",
  exposure: 0,
  contrast: 0,
  highlights: 0,
  shadows: 0,
  warmth: 0,
  vibrance: 0,
  sharpness: 0.18,
  vignette: 0.12,
  grain: 0.04,
  fade: 0,
  beauty: 0,
  depth: 0,
  kelvin: 0,
  denoise: 0.06,
  hdr: true,
};
