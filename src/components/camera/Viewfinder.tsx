import { useEffect, useRef, type PointerEvent, type RefObject } from "react";
import { type AspectId, type FocusPoint, type GridId } from "@/lib/camera/types";
import { lookById } from "@/lib/camera/looks";
import { useCamera } from "@/lib/camera/store";
import { cn } from "@/lib/utils";

type Props = {
  videoRef: RefObject<HTMLVideoElement | null>;
  live: boolean;
  flash: boolean;
  countdown: number | null;
  capturing: boolean;
  onFocus: (point: FocusPoint) => void;
};

export function Viewfinder({
  videoRef,
  live,
  flash,
  countdown,
  capturing,
  onFocus,
}: Props) {
  const grid = useCamera((s) => s.grid);
  const look = useCamera((s) => s.look);
  const zoom = useCamera((s) => s.zoom);
  const focus = useCamera((s) => s.focus);
  const peaking = useCamera((s) => s.peaking);
  const histogram = useCamera((s) => s.histogram);
  const level = useCamera((s) => s.level);
  const mode = useCamera((s) => s.mode);
  const process = useCamera((s) => s.process);
  const rawPlus = useCamera((s) => s.rawPlus);
  const hdr = useCamera((s) => s.hdr);
  const facing = useCamera((s) => s.facing);
  const aspect = useCamera((s) => s.aspect);
  const css = lookById(look).css;
  const peakRef = useRef<HTMLCanvasElement>(null);
  const histRef = useRef<HTMLCanvasElement>(null);

  function handlePointer(e: PointerEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    onFocus({
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    });
  }

  useEffect(() => {
    if (!histogram && !peaking) return;
    let raf = 0;
    let last = 0;
    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      if (t - last < 90) return;
      last = t;
      const src = live ? videoRef.current : null;
      if (!src || src.readyState < 2) return;
      const canvas = document.createElement("canvas");
      canvas.width = 96;
      canvas.height = 64;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(src, 0, 0, 96, 64);
      const data = ctx.getImageData(0, 0, 96, 64).data;
      if (histogram && histRef.current) {
        const bins = new Array(32).fill(0);
        for (let i = 0; i < data.length; i += 16) {
          const y = (data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722) / 255;
          bins[Math.min(31, Math.floor(y * 32))]++;
        }
        const hctx = histRef.current.getContext("2d");
        if (hctx) {
          const w = histRef.current.width;
          const h = histRef.current.height;
          hctx.clearRect(0, 0, w, h);
          const max = Math.max(...bins, 1);
          hctx.fillStyle = "rgba(243,241,236,0.55)";
          const bw = w / 32;
          bins.forEach((v, i) => {
            const bh = (v / max) * h;
            hctx.fillRect(i * bw, h - bh, bw - 0.6, bh);
          });
        }
      }
      if (peaking && peakRef.current) {
        const pctx = peakRef.current.getContext("2d");
        if (pctx) {
          pctx.clearRect(0, 0, peakRef.current.width, peakRef.current.height);
          pctx.fillStyle = "rgba(201,196,186,0.85)";
          for (let y = 1; y < 63; y += 2) {
            for (let x = 1; x < 95; x += 2) {
              const i = (y * 96 + x) * 4;
              const gx = data[i + 4] - data[i - 4];
              const gy = data[i + 96 * 4] - data[i - 96 * 4];
              if (gx * gx + gy * gy > 4800) {
                const px = (x / 96) * peakRef.current.width;
                const py = (y / 64) * peakRef.current.height;
                pctx.fillRect(px, py, 1.4, 1.4);
              }
            }
          }
        }
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [histogram, peaking, live, videoRef]);

  return (
    <div className="absolute inset-0 bg-bg" onPointerDown={handlePointer}>
      <div
        className="absolute inset-0 origin-center"
        style={{ transform: `scale(${zoom})` }}
      >
        <video
          ref={videoRef}
          className={cn(
            "absolute inset-0 size-full object-cover",
            live ? "opacity-100" : "opacity-0",
            facing === "user" && "-scale-x-100",
          )}
          style={{ filter: css }}
          playsInline
          muted
          autoPlay
        />
      </div>

      {peaking ? (
        <canvas ref={peakRef} width={320} height={240} className="pointer-events-none absolute inset-0 size-full" />
      ) : null}

      <GridOverlay grid={grid} aspect={aspect} />

      {live ? (
        <div
          className="af-box pointer-events-none absolute rounded-md border border-fg/80 scan-pulse"
          style={{
            left: `calc(${focus.x * 100}% - 2.25rem)`,
            top: `calc(${focus.y * 100}% - 2.25rem)`,
          }}
        />
      ) : null}

      {mode === "portrait" && live ? (
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_42%,rgba(7,7,8,0.42)_100%)]" />
      ) : null}

      {histogram ? (
        <canvas
          ref={histRef}
          width={120}
          height={44}
          className="pointer-events-none absolute right-3 top-16 rounded-sm bg-bg/50"
        />
      ) : null}

      {level ? <LevelBar /> : null}

      {live ? (
        <div className="pointer-events-none absolute inset-x-0 top-16 flex items-start justify-between p-3">
          <div className="rounded-sm bg-bg/45 px-2 py-1 font-mono text-xs tabular-nums tracking-wide text-fg/90">
            {rawPlus ? "RAW+" : "JPEG"} · {hdr ? "HDR" : "SDR"} · {aspect}
          </div>
          <div className="rounded-sm bg-bg/45 px-2 py-1 font-mono text-xs tabular-nums tracking-wide text-fg/90">
            {exifLine(process, zoom, mode)}
          </div>
        </div>
      ) : null}

      {flash ? <div className="flash-burst pointer-events-none absolute inset-0 bg-fg" /> : null}
      {capturing ? (
        <div className="pointer-events-none absolute inset-0 bg-bg/20" />
      ) : null}
      {countdown !== null ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span key={countdown} className="count-pop font-display text-7xl text-fg">
            {countdown}
          </span>
        </div>
      ) : null}
    </div>
  );
}

function exifLine(
  process: { exposure: number; kelvin: number },
  zoom: number,
  mode: string,
) {
  const iso = mode === "night" ? 1250 : mode === "pro" ? 200 : 64;
  const shutter = mode === "night" ? "1/30" : "1/125";
  const ev = process.exposure === 0 ? "±0" : `${process.exposure > 0 ? "+" : ""}${process.exposure.toFixed(1)}`;
  const mm = Math.round(24 * zoom);
  return `${iso} ISO · ${mm}mm · f/1.8 · ${shutter} · ${ev}`;
}

function GridOverlay({ grid, aspect: _aspect }: { grid: GridId; aspect: AspectId }) {
  if (grid === "off") return null;
  const thirds = (
    <>
      <span className="absolute top-1/3 right-0 left-0 h-px bg-fg/25" />
      <span className="absolute top-2/3 right-0 left-0 h-px bg-fg/25" />
      <span className="absolute top-0 bottom-0 left-1/3 w-px bg-fg/25" />
      <span className="absolute top-0 bottom-0 left-2/3 w-px bg-fg/25" />
    </>
  );
  if (grid === "thirds") return <div className="pointer-events-none absolute inset-0">{thirds}</div>;
  if (grid === "golden") {
    return (
      <div className="pointer-events-none absolute inset-0">
        <span className="absolute top-[38.2%] right-0 left-0 h-px bg-fg/25" />
        <span className="absolute top-[61.8%] right-0 left-0 h-px bg-fg/25" />
        <span className="absolute top-0 bottom-0 left-[38.2%] w-px bg-fg/25" />
        <span className="absolute top-0 bottom-0 left-[61.8%] w-px bg-fg/25" />
      </div>
    );
  }
  return (
    <div className="pointer-events-none absolute inset-0">
      <span className="absolute top-0 left-0 h-px w-full origin-top-left rotate-45 bg-fg/20" />
      <span className="absolute top-0 right-0 h-px w-full origin-top-right -rotate-45 bg-fg/20" />
    </div>
  );
}

function LevelBar() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 items-center justify-center gap-8">
      <span className="h-px w-10 bg-fg/50" />
      <span className="size-1.5 rounded-full bg-fg/80" />
      <span className="h-px w-10 bg-fg/50" />
    </div>
  );
}
