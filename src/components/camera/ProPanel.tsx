import { X } from "lucide-react";
import { useCamera } from "@/lib/camera/store";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
};

const SLIDERS: Array<{
  key:
    | "exposure"
    | "contrast"
    | "highlights"
    | "shadows"
    | "warmth"
    | "vibrance"
    | "sharpness"
    | "vignette"
    | "grain"
    | "beauty"
    | "depth"
    | "kelvin";
  label: string;
  min: number;
  max: number;
  step: number;
}> = [
  { key: "exposure", label: "EV", min: -2, max: 2, step: 0.1 },
  { key: "kelvin", label: "Kelvin", min: 0, max: 9000, step: 100 },
  { key: "contrast", label: "Contrast", min: -0.4, max: 0.5, step: 0.02 },
  { key: "highlights", label: "Highlights", min: -0.5, max: 0.5, step: 0.02 },
  { key: "shadows", label: "Shadows", min: -0.4, max: 0.6, step: 0.02 },
  { key: "warmth", label: "Warmth", min: -0.5, max: 0.5, step: 0.02 },
  { key: "vibrance", label: "Vibrance", min: -0.5, max: 0.5, step: 0.02 },
  { key: "sharpness", label: "Clarity", min: 0, max: 0.6, step: 0.02 },
  { key: "vignette", label: "Vignette", min: 0, max: 0.5, step: 0.02 },
  { key: "grain", label: "Grain", min: 0, max: 0.3, step: 0.01 },
  { key: "beauty", label: "Skin", min: 0, max: 0.6, step: 0.02 },
  { key: "depth", label: "Depth", min: 0, max: 0.8, step: 0.02 },
];

export function ProPanel({ open, onClose }: Props) {
  const process = useCamera((s) => s.process);
  const patchProcess = useCamera((s) => s.patchProcess);
  const resetProcess = useCamera((s) => s.resetProcess);
  const peaking = useCamera((s) => s.peaking);
  const setPeaking = useCamera((s) => s.setPeaking);
  const histogram = useCamera((s) => s.histogram);
  const setHistogram = useCamera((s) => s.setHistogram);
  const level = useCamera((s) => s.level);
  const setLevel = useCamera((s) => s.setLevel);

  if (!open) return null;

  return (
    <div className="absolute inset-x-0 bottom-0 z-20 rounded-t-xl bg-bg-elevated p-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[var(--shadow-border)]">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="font-display text-2xl text-fg">Pro desk</p>
          <p className="text-sm text-muted">Computational RAW+ capture</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={resetProcess}
            className="rounded-full bg-fg/8 px-3 py-2 text-sm text-fg transition-[scale] duration-150 ease-out active:scale-[0.96]"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex size-11 items-center justify-center rounded-full bg-fg/8 text-fg transition-[scale] duration-150 ease-out active:scale-[0.96]"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>
      </div>

      <div className="mb-4 flex gap-2">
        <ToggleChip label="Peaking" on={peaking} onClick={() => setPeaking(!peaking)} />
        <ToggleChip label="Histogram" on={histogram} onClick={() => setHistogram(!histogram)} />
        <ToggleChip label="Level" on={level} onClick={() => setLevel(!level)} />
      </div>

      <div className="grid max-h-64 grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
        {SLIDERS.map((s) => (
          <label key={s.key} className="flex flex-col gap-1">
            <span className="flex justify-between font-mono text-xs tabular-nums text-muted">
              <span>{s.label}</span>
              <span>
                {s.key === "kelvin"
                  ? process.kelvin === 0
                    ? "Auto"
                    : `${process.kelvin}K`
                  : process[s.key].toFixed(2)}
              </span>
            </span>
            <input
              type="range"
              min={s.min}
              max={s.max}
              step={s.step}
              value={process[s.key]}
              onChange={(e) => patchProcess({ [s.key]: Number(e.target.value) })}
              className="h-11 w-full accent-accent"
            />
          </label>
        ))}
      </div>
    </div>
  );
}

function ToggleChip({
  label,
  on,
  onClick,
}: {
  label: string;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-2 text-sm font-medium",
        "transition-[background-color,color,scale] duration-150 ease-out",
        "active:scale-[0.96]",
        on ? "bg-accent text-accent-fg" : "bg-fg/8 text-muted",
      )}
    >
      {label}
    </button>
  );
}
