import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Heart } from "lucide-react";
import { getBlob, listShots } from "@/lib/camera/db";
import { useCamera } from "@/lib/camera/store";
import type { Shot } from "@/lib/camera/types";
import { cn } from "@/lib/utils";

export function GalleryScreen() {
  const navigate = useNavigate();
  const shots = useCamera((s) => s.shots);
  const setShots = useCamera((s) => s.setShots);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<"all" | "fav">("all");

  useEffect(() => {
    let cancelled = false;
    listShots().then((rows) => {
      if (!cancelled) setShots(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [setShots]);

  useEffect(() => {
    let cancelled = false;
    const urls: string[] = [];
    void (async () => {
      const next: Record<string, string> = {};
      for (const shot of shots) {
        const blob = await getBlob(shot.id, "thumb");
        if (blob) {
          const url = URL.createObjectURL(blob);
          urls.push(url);
          next[shot.id] = url;
        }
      }
      if (!cancelled) setThumbs(next);
    })();
    return () => {
      cancelled = true;
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [shots]);

  const visible = filter === "fav" ? shots.filter((s) => s.favorite) : shots;

  return (
    <div className="mx-auto min-h-dvh max-w-md bg-bg text-fg">
      <header className="sticky top-0 z-10 flex items-center gap-3 bg-bg/90 px-3 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={() => navigate({ to: "/" })}
          className="flex size-11 items-center justify-center rounded-full bg-fg/8 transition-[scale] duration-150 ease-out active:scale-[0.96]"
          aria-label="Back to camera"
        >
          <ArrowLeft className="size-5" />
        </button>
        <div className="flex-1">
          <h1 className="font-display text-3xl leading-tight">Roll</h1>
          <p className="text-sm text-muted">{shots.length} captured</p>
        </div>
        <button
          type="button"
          onClick={() => setFilter(filter === "all" ? "fav" : "all")}
          className={cn(
            "flex size-11 items-center justify-center rounded-full transition-[scale,background-color] duration-150 ease-out active:scale-[0.96]",
            filter === "fav" ? "bg-accent text-accent-fg" : "bg-fg/8",
          )}
          aria-label="Favorites"
        >
          <Heart className="size-5" />
        </button>
      </header>

      {visible.length === 0 && filter === "fav" ? (
        <p className="px-6 py-16 text-center text-muted">No favorites yet.</p>
      ) : null}

      {visible.length > 0 ? (
        <section className="px-2 pb-6">
          <h2 className="px-2 pb-2 text-sm font-medium tracking-wide text-muted uppercase">Captured</h2>
          <div className="grid grid-cols-3 gap-1">
            {visible.map((shot) => (
              <ShotTile
                key={shot.id}
                shot={shot}
                src={thumbs[shot.id]}
                onOpen={() => navigate({ to: "/shot/$id", params: { id: shot.id } })}
              />
            ))}
          </div>
        </section>
      ) : filter === "all" ? (
        <p className="px-6 py-16 text-center text-sm text-muted">
          The roll is empty. Open the live camera and fire the shutter.
        </p>
      ) : null}
    </div>
  );
}

function ShotTile({
  shot,
  src,
  onOpen,
}: {
  shot: Shot;
  src?: string;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="relative aspect-square overflow-hidden bg-surface transition-[scale] duration-150 ease-out active:scale-[0.96]"
    >
      {src ? (
        <img src={src} alt={shot.caption} className="size-full object-cover" />
      ) : (
        <span className="block size-full bg-surface" />
      )}
      {shot.favorite ? (
        <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-accent" />
      ) : null}
    </button>
  );
}
