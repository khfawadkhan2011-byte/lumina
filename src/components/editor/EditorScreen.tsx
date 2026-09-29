import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Download, Heart, Trash2 } from "lucide-react";
import { LOOKS, lookById, settingsForLook } from "@/lib/camera/looks";
import { deleteShot, getBlob, getShot, saveShot, updateShot } from "@/lib/camera/db";
import {
  canvasToBlob,
  loadImage,
  makeThumb,
  renderProcessed,
} from "@/lib/camera/process";
import { DEFAULT_PROCESS, type LookId, type ProcessSettings, type Shot } from "@/lib/camera/types";
import { useCamera } from "@/lib/camera/store";
import { cn } from "@/lib/utils";

type Props = { id: string };

export function EditorScreen({ id }: Props) {
  const navigate = useNavigate();
  const setShots = useCamera((s) => s.setShots);
  const shots = useCamera((s) => s.shots);
  const [shot, setShot] = useState<Shot | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [compare, setCompare] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [look, setLook] = useState<LookId>("natural");
  const [settings, setSettings] = useState<ProcessSettings>({ ...DEFAULT_PROCESS });

  useEffect(() => {
    let revoked: string[] = [];
    let cancelled = false;
    void (async () => {
      const row = await getShot(id);
      if (!row || cancelled) return;
      setShot(row);
      setLook(row.look);
      setSettings(settingsForLook(row.look, { ...DEFAULT_PROCESS, hdr: true }));
      const blob = await getBlob(id, "full");
      if (blob) {
        const url = URL.createObjectURL(blob);
        revoked.push(url);
        if (!cancelled) {
          setOriginalUrl(url);
          setPreviewUrl(url);
        }
      }
    })();
    return () => {
      cancelled = true;
      revoked.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [id]);

  useEffect(() => {
    if (!originalUrl || !shot) return;
    if (!dirty) {
      setPreviewUrl(originalUrl);
      return;
    }
    let cancelled = false;
    const handle = window.setTimeout(() => {
      void (async () => {
        setBusy(true);
        try {
          const img = await loadImage(originalUrl);
          const canvas = renderProcessed(
            img,
            img.naturalWidth,
            img.naturalHeight,
            settings,
            { maxEdge: 1400 },
          );
          const blob = await canvasToBlob(canvas, "image/jpeg", 0.9);
          if (cancelled) return;
          const url = URL.createObjectURL(blob);
          setPreviewUrl((prev) => {
            if (prev && prev !== originalUrl) URL.revokeObjectURL(prev);
            return url;
          });
        } finally {
          if (!cancelled) setBusy(false);
        }
      })();
    }, 80);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [originalUrl, settings, shot, dirty]);

  async function download() {
    if (!originalUrl) return;
    setBusy(true);
    try {
      const img = await loadImage(originalUrl);
      const canvas = renderProcessed(img, img.naturalWidth, img.naturalHeight, settings, {
        maxEdge: 2400,
      });
      const blob = await canvasToBlob(canvas, "image/jpeg", 0.95);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `lumina-${id}.jpg`;
      a.click();
    } finally {
      setBusy(false);
    }
  }

  async function saveAsNew() {
    if (!originalUrl) return;
    setBusy(true);
    try {
      const img = await loadImage(originalUrl);
      const canvas = renderProcessed(img, img.naturalWidth, img.naturalHeight, settings, {
        maxEdge: 2400,
      });
      const jpeg = await canvasToBlob(canvas, "image/jpeg", 0.95);
      const thumb = await canvasToBlob(makeThumb(canvas), "image/jpeg", 0.82);
      const next: Shot = {
        id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        createdAt: Date.now(),
        width: canvas.width,
        height: canvas.height,
        mode: shot?.mode ?? "photo",
        look,
        enhance: true,
        favorite: false,
        caption: `${lookById(look).name} grade`,
      };
      await saveShot(next, jpeg, thumb);
      setShots([next, ...shots.filter((s) => s.id !== next.id)]);
      navigate({ to: "/shot/$id", params: { id: next.id } });
    } finally {
      setBusy(false);
    }
  }

  async function toggleFav() {
    if (!shot) return;
    const next = { ...shot, favorite: !shot.favorite };
    setShot(next);
    await updateShot(next);
    setShots(shots.map((s) => (s.id === next.id ? next : s)));
  }

  async function remove() {
    if (!shot) return;
    await deleteShot(shot.id);
    setShots(shots.filter((s) => s.id !== shot.id));
    navigate({ to: "/roll" });
  }

  const shown = compare ? originalUrl : previewUrl ?? originalUrl;

  return (
    <div className="mx-auto flex h-dvh max-w-md flex-col bg-bg text-fg">
      <header className="flex items-center gap-2 px-3 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={() => navigate({ to: "/roll" })}
          className="flex size-11 items-center justify-center rounded-full bg-fg/8 transition-[scale] duration-150 ease-out active:scale-[0.96]"
          aria-label="Back"
        >
          <ArrowLeft className="size-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-2xl leading-tight">
            {shot?.caption ?? "Grade"}
          </h1>
          <p className="text-sm text-muted">
            {busy ? "Rendering look…" : "Hold compare to see the negative"}
          </p>
        </div>
        <button
          type="button"
          onPointerDown={() => setCompare(true)}
          onPointerUp={() => setCompare(false)}
          onPointerLeave={() => setCompare(false)}
          className="rounded-full bg-fg/8 px-3 py-2 text-sm text-fg transition-[scale] duration-150 ease-out active:scale-[0.96]"
        >
          Compare
        </button>
      </header>

      <div className="flex min-h-0 flex-1 items-center justify-center px-3">
        {shown ? (
          <img
            src={shown}
            alt=""
            crossOrigin="anonymous"
            className="max-h-full max-w-full rounded-md object-contain shadow-[var(--shadow-border)]"
          />
        ) : (
          <div className="h-64 w-full max-w-sm rounded-md bg-surface" />
        )}
      </div>

      <div className="flex flex-col gap-3 px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        <div className="-mx-3 flex gap-2 overflow-x-auto px-3 [scrollbar-width:none]">
          {LOOKS.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => {
                setLook(l.id);
                setDirty(true);
                setSettings(settingsForLook(l.id, { ...settings, look: l.id }));
              }}
              className={cn(
                "shrink-0 rounded-full px-3 py-2 text-sm font-medium",
                "transition-[background-color,color,scale] duration-150 ease-out active:scale-[0.96]",
                look === l.id ? "bg-accent text-accent-fg" : "bg-fg/8 text-muted",
              )}
            >
              {l.name}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Slider
            label="EV"
            min={-2}
            max={2}
            step={0.1}
            value={settings.exposure}
            onChange={(exposure) => {
              setDirty(true);
              setSettings({ ...settings, exposure });
            }}
          />
          <Slider
            label="Warmth"
            min={-0.5}
            max={0.5}
            step={0.02}
            value={settings.warmth}
            onChange={(warmth) => {
              setDirty(true);
              setSettings({ ...settings, warmth });
            }}
          />
          <Slider
            label="Clarity"
            min={0}
            max={0.6}
            step={0.02}
            value={settings.sharpness}
            onChange={(sharpness) => {
              setDirty(true);
              setSettings({ ...settings, sharpness });
            }}
          />
          <Slider
            label="Depth"
            min={0}
            max={0.8}
            step={0.02}
            value={settings.depth}
            onChange={(depth) => {
              setDirty(true);
              setSettings({ ...settings, depth });
            }}
          />
        </div>

        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => void download()}
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-fg text-accent-fg transition-[scale] duration-150 ease-out active:scale-[0.96]"
          >
            <Download className="size-4" />
            Save JPEG
          </button>
          <button
            type="button"
            onClick={() => void saveAsNew()}
            className="flex h-11 flex-1 items-center justify-center rounded-full bg-accent text-accent-fg transition-[scale] duration-150 ease-out active:scale-[0.96]"
          >
            Keep look
          </button>
          {shot ? (
            <>
              <button
                type="button"
                onClick={() => void toggleFav()}
                className="flex size-11 items-center justify-center rounded-full bg-fg/8 transition-[scale] duration-150 ease-out active:scale-[0.96]"
                aria-label="Favorite"
              >
                <Heart className={cn("size-5", shot.favorite && "fill-fg")} />
              </button>
              <button
                type="button"
                onClick={() => void remove()}
                className="flex size-11 items-center justify-center rounded-full bg-fg/8 text-danger transition-[scale] duration-150 ease-out active:scale-[0.96]"
                aria-label="Delete"
              >
                <Trash2 className="size-5" />
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Slider({
  label,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="flex justify-between font-mono text-xs tabular-nums text-muted">
        <span>{label}</span>
        <span>{value.toFixed(2)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-11 w-full accent-accent"
      />
    </label>
  );
}
