import {
  Grid3x3,
  Images,
  SlidersHorizontal,
  SwitchCamera,
  Timer,
  Zap,
  ZapOff,
} from "lucide-react";
import { LOOKS } from "@/lib/camera/looks";
import { ASPECTS, MODES, type FlashId, type GridId } from "@/lib/camera/types";
import { useCamera } from "@/lib/camera/store";
import { cn } from "@/lib/utils";
import { IconButton } from "./IconButton";

type Props = {
  onShutter: () => void;
  onOpenRoll: () => void;
  lastThumb?: string | null;
  shutterDisabled?: boolean;
};

export function TopChrome({
  onOpenPro,
  onEnableCamera,
  live,
}: {
  onOpenPro: () => void;
  onEnableCamera: () => void;
  live: boolean;
}) {
  const flash = useCamera((s) => s.flash);
  const setFlash = useCamera((s) => s.setFlash);
  const timer = useCamera((s) => s.timer);
  const setTimer = useCamera((s) => s.setTimer);
  const grid = useCamera((s) => s.grid);
  const setGrid = useCamera((s) => s.setGrid);
  const hdr = useCamera((s) => s.hdr);
  const setHdr = useCamera((s) => s.setHdr);
  const rawPlus = useCamera((s) => s.rawPlus);
  const setRawPlus = useCamera((s) => s.setRawPlus);

  const flashes: FlashId[] = ["off", "on", "auto"];
  const grids: GridId[] = ["off", "thirds", "golden", "diag"];
  const timers: Array<0 | 3 | 10> = [0, 3, 10];

  return (
    <div className="flex items-center justify-between gap-2 px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <div className="flex items-center gap-0.5">
        <IconButton
          label="Flash"
          active={flash !== "off"}
          onClick={() => setFlash(flashes[(flashes.indexOf(flash) + 1) % flashes.length])}
        >
          {flash === "off" ? <ZapOff className="size-5" /> : <Zap className="size-5" />}
        </IconButton>
        <IconButton
          label="Timer"
          active={timer !== 0}
          onClick={() => setTimer(timers[(timers.indexOf(timer) + 1) % timers.length])}
        >
          <Timer className="size-5" />
          {timer !== 0 ? (
            <span className="absolute -right-0.5 -bottom-0.5 font-mono text-xs tabular-nums text-accent">
              {timer}
            </span>
          ) : null}
        </IconButton>
        <IconButton
          label="Grid"
          active={grid !== "off"}
          onClick={() => setGrid(grids[(grids.indexOf(grid) + 1) % grids.length])}
        >
          <Grid3x3 className="size-5" />
        </IconButton>
      </div>

      <button
        type="button"
        onClick={live ? undefined : onEnableCamera}
        className="font-display text-xl tracking-tight text-fg"
      >
        Lumina
      </button>

      <div className="flex items-center gap-0.5">
        <IconButton active={hdr} onClick={() => setHdr(!hdr)}>
          <span className="font-mono text-xs font-medium tracking-wide">HDR</span>
        </IconButton>
        <IconButton active={rawPlus} onClick={() => setRawPlus(!rawPlus)}>
          <span className="font-mono text-xs font-medium tracking-wide">RAW</span>
        </IconButton>
        <IconButton label="Pro tools" onClick={onOpenPro}>
          <SlidersHorizontal className="size-5" />
        </IconButton>
      </div>
    </div>
  );
}

export function BottomChrome({
  onShutter,
  onOpenRoll,
  lastThumb,
  shutterDisabled,
}: Props) {
  const mode = useCamera((s) => s.mode);
  const setMode = useCamera((s) => s.setMode);
  const look = useCamera((s) => s.look);
  const setLook = useCamera((s) => s.setLook);
  const zoom = useCamera((s) => s.zoom);
  const setZoom = useCamera((s) => s.setZoom);
  const aspect = useCamera((s) => s.aspect);
  const setAspect = useCamera((s) => s.setAspect);
  const toggleFacing = useCamera((s) => s.toggleFacing);

  return (
    <div className="flex flex-col gap-3 px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2">
      <div className="flex justify-center gap-2">
        {[1, 2, 3].map((z) => (
          <button
            key={z}
            type="button"
            onClick={() => setZoom(z)}
            className={cn(
              "min-h-11 min-w-11 rounded-full px-3 font-mono text-sm tabular-nums",
              "transition-[background-color,color,scale] duration-150 ease-out",
              "active:scale-[0.96]",
              zoom === z ? "bg-fg text-accent-fg" : "bg-fg/10 text-fg",
            )}
          >
            {z}×
          </button>
        ))}
      </div>

      <div className="-mx-3 flex gap-2 overflow-x-auto px-3 [scrollbar-width:none]">
        {LOOKS.map((l) => (
          <button
            key={l.id}
            type="button"
            onClick={() => setLook(l.id)}
            className={cn(
              "shrink-0 rounded-full px-2.5 py-2 text-xs font-medium",
              "transition-[background-color,color,scale] duration-150 ease-out",
              "active:scale-[0.96]",
              look === l.id ? "bg-accent text-accent-fg" : "bg-fg/8 text-muted",
            )}
          >
            {l.name}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-center gap-2">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMode(m.id)}
            className={cn(
              "rounded-full px-3 py-2 text-sm font-medium uppercase tracking-wider",
              "transition-[color,opacity,scale] duration-150 ease-out",
              "active:scale-[0.96]",
              mode === m.id ? "text-accent" : "text-muted",
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onOpenRoll}
          className="size-12 overflow-hidden rounded-md bg-surface shadow-[var(--shadow-border)] transition-[scale] duration-150 ease-out active:scale-[0.96]"
          aria-label="Open roll"
        >
          {lastThumb ? (
            <img src={lastThumb} alt="" className="size-full object-cover" />
          ) : (
            <span className="flex size-full items-center justify-center text-muted">
              <Images className="size-5" />
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={onShutter}
          disabled={shutterDisabled}
          aria-label="Shutter"
          className="shutter-ring flex items-center justify-center rounded-full border-4 border-fg bg-transparent p-1 transition-[scale] duration-150 ease-out active:scale-[0.96] disabled:opacity-50"
        >
          <span className="size-full rounded-full bg-shutter" />
        </button>

        <button
          type="button"
          onClick={toggleFacing}
          className="flex size-12 items-center justify-center rounded-full bg-fg/8 text-fg transition-[scale,background-color] duration-150 ease-out active:scale-[0.96]"
          aria-label="Flip camera"
        >
          <SwitchCamera className="size-5" />
        </button>
      </div>

      <div className="flex justify-center gap-1">
        {ASPECTS.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => setAspect(a.id)}
            className={cn(
              "min-h-8 rounded-full px-2.5 font-mono text-xs tabular-nums",
              "transition-[color,background-color] duration-150 ease-out",
              aspect === a.id ? "bg-fg/12 text-fg" : "text-subtle",
            )}
          >
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}
