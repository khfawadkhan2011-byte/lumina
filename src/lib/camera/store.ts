import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  AspectId,
  CaptureMode,
  FlashId,
  FocusPoint,
  GridId,
  LookId,
  ProcessSettings,
  Shot,
} from "./types";
import { DEFAULT_PROCESS } from "./types";
import { settingsForLook } from "./looks";

type CameraState = {
  mode: CaptureMode;
  look: LookId;
  aspect: AspectId;
  grid: GridId;
  flash: FlashId;
  hdr: boolean;
  rawPlus: boolean;
  timer: 0 | 3 | 10;
  zoom: number;
  facing: "environment" | "user";
  focus: FocusPoint;
  peaking: boolean;
  histogram: boolean;
  level: boolean;
  process: ProcessSettings;
  shots: Shot[];
  setMode: (mode: CaptureMode) => void;
  setLook: (look: LookId) => void;
  setAspect: (aspect: AspectId) => void;
  setGrid: (grid: GridId) => void;
  setFlash: (flash: FlashId) => void;
  setHdr: (hdr: boolean) => void;
  setRawPlus: (rawPlus: boolean) => void;
  setTimer: (timer: 0 | 3 | 10) => void;
  setZoom: (zoom: number) => void;
  toggleFacing: () => void;
  setFocus: (focus: FocusPoint) => void;
  setPeaking: (peaking: boolean) => void;
  setHistogram: (histogram: boolean) => void;
  setLevel: (level: boolean) => void;
  patchProcess: (patch: Partial<ProcessSettings>) => void;
  resetProcess: () => void;
  setShots: (shots: Shot[]) => void;
};

const modeLook: Record<CaptureMode, LookId> = {
  photo: "natural",
  portrait: "portrait",
  food: "food",
  night: "night",
  pro: "leica",
};

export const useCamera = create<CameraState>()(
  persist(
    (set, get) => ({
      mode: "photo",
      look: "natural",
      aspect: "4:3",
      grid: "thirds",
      flash: "off",
      hdr: true,
      rawPlus: true,
      timer: 0,
      zoom: 1,
      facing: "environment",
      focus: { x: 0.5, y: 0.42 },
      peaking: false,
      histogram: false,
      level: false,
      process: { ...DEFAULT_PROCESS, hdr: true },
      shots: [],
      setMode: (mode) => {
        const look = modeLook[mode];
        const process = settingsForLook(look, {
          ...DEFAULT_PROCESS,
          hdr: get().hdr,
          depth: mode === "portrait" ? 0.45 : 0,
          beauty: mode === "portrait" ? 0.22 : 0,
        });
        set({ mode, look, process });
      },
      setLook: (look) => {
        const process = settingsForLook(look, { ...get().process, look });
        set({ look, process });
      },
      setAspect: (aspect) => set({ aspect }),
      setGrid: (grid) => set({ grid }),
      setFlash: (flash) => set({ flash }),
      setHdr: (hdr) => set({ hdr, process: { ...get().process, hdr } }),
      setRawPlus: (rawPlus) => set({ rawPlus }),
      setTimer: (timer) => set({ timer }),
      setZoom: (zoom) => set({ zoom: Math.min(5, Math.max(1, zoom)) }),
      toggleFacing: () =>
        set({ facing: get().facing === "environment" ? "user" : "environment" }),
      setFocus: (focus) => set({ focus }),
      setPeaking: (peaking) => set({ peaking }),
      setHistogram: (histogram) => set({ histogram }),
      setLevel: (level) => set({ level }),
      patchProcess: (patch) => set({ process: { ...get().process, ...patch } }),
      resetProcess: () => {
        const { look, hdr, mode } = get();
        set({
          process: settingsForLook(look, {
            ...DEFAULT_PROCESS,
            hdr,
            depth: mode === "portrait" ? 0.45 : 0,
          }),
        });
      },
      setShots: (shots) => set({ shots }),
    }),
    {
      name: "lumina-camera",
      partialize: (s) => ({
        mode: s.mode,
        look: s.look,
        aspect: s.aspect,
        grid: s.grid,
        flash: s.flash,
        hdr: s.hdr,
        rawPlus: s.rawPlus,
        zoom: s.zoom,
        peaking: s.peaking,
        histogram: s.histogram,
        level: s.level,
      }),
    },
  ),
);
