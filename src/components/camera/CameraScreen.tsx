import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Camera } from "lucide-react";
import {
  startCamera,
  stopCamera,
  setTorch,
  setZoom as applyTrackZoom,
  grabFrame,
  cameraErrorMessage,
  type CameraHandle,
} from "@/lib/camera/media";
import { canvasToBlob, makeThumb, renderProcessed } from "@/lib/camera/process";
import { lookById } from "@/lib/camera/looks";
import { saveShot, listShots, getBlob } from "@/lib/camera/db";
import { useCamera } from "@/lib/camera/store";
import type { FocusPoint, Shot } from "@/lib/camera/types";
import { Viewfinder } from "./Viewfinder";
import { BottomChrome, TopChrome } from "./Controls";
import { ProPanel } from "./ProPanel";

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function CameraScreen() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const handleRef = useRef<CameraHandle | null>(null);
  const [live, setLive] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proOpen, setProOpen] = useState(false);
  const [flash, setFlashOn] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [lastThumb, setLastThumb] = useState<string | null>(null);

  const facing = useCamera((s) => s.facing);
  const mode = useCamera((s) => s.mode);
  const look = useCamera((s) => s.look);
  const aspect = useCamera((s) => s.aspect);
  const zoom = useCamera((s) => s.zoom);
  const focus = useCamera((s) => s.focus);
  const process = useCamera((s) => s.process);
  const hdr = useCamera((s) => s.hdr);
  const flashMode = useCamera((s) => s.flash);
  const timer = useCamera((s) => s.timer);
  const setFocus = useCamera((s) => s.setFocus);
  const setShots = useCamera((s) => s.setShots);
  const shots = useCamera((s) => s.shots);

  useEffect(() => {
    let cancelled = false;
    listShots()
      .then(async (rows) => {
        if (cancelled) return;
        setShots(rows);
        if (rows[0]) {
          const thumb = await getBlob(rows[0].id, "thumb");
          if (thumb && !cancelled) setLastThumb(URL.createObjectURL(thumb));
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [setShots]);

  const enableCamera = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    setStarting(true);
    stopCamera(handleRef.current);
    handleRef.current = null;
    setLive(false);
    try {
      const handle = await startCamera(video, facing);
      handleRef.current = handle;
      setLive(true);
      setError(null);
      void applyTrackZoom(handle.track, useCamera.getState().zoom);
    } catch (err) {
      setLive(false);
      setError(cameraErrorMessage(err));
    } finally {
      setStarting(false);
    }
  }, [facing]);

  useEffect(() => {
    void enableCamera();
    const onVis = () => {
      if (document.visibilityState === "visible") void enableCamera();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      stopCamera(handleRef.current);
      handleRef.current = null;
    };
  }, [enableCamera]);

  useEffect(() => {
    const track = handleRef.current?.track;
    if (!track || !live) return;
    void applyTrackZoom(track, zoom);
  }, [zoom, live]);

  const onFocus = useCallback(
    (point: FocusPoint) => {
      setFocus(point);
    },
    [setFocus],
  );

  const captureNow = useCallback(async () => {
    const video = videoRef.current;
    if (!live || !video) {
      void enableCamera();
      return;
    }
    setCapturing(true);
    if (flashMode !== "off") {
      setFlashOn(true);
      const track = handleRef.current?.track;
      if (track) await setTorch(track, true);
      window.setTimeout(() => {
        setFlashOn(false);
        if (track) void setTorch(track, false);
      }, 160);
    }

    try {
      const frame = await grabFrame(video, handleRef.current?.track ?? null);
      const canvas = renderProcessed(frame.source, frame.width, frame.height, { ...process, hdr }, {
        aspect,
        zoom,
        focus,
      });
      const jpeg = await canvasToBlob(canvas, "image/jpeg", 0.95);
      const thumb = await canvasToBlob(makeThumb(canvas), "image/jpeg", 0.82);
      const shot: Shot = {
        id: uid(),
        createdAt: Date.now(),
        width: canvas.width,
        height: canvas.height,
        mode,
        look,
        enhance: true,
        favorite: false,
        caption: `${lookById(look).name} · RAW+`,
      };
      await saveShot(shot, jpeg, thumb);
      const next = [shot, ...shots];
      setShots(next);
      if (lastThumb) URL.revokeObjectURL(lastThumb);
      setLastThumb(URL.createObjectURL(thumb));
      navigate({ to: "/shot/$id", params: { id: shot.id } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Capture failed");
    } finally {
      setCapturing(false);
    }
  }, [
    flashMode,
    live,
    enableCamera,
    process,
    hdr,
    aspect,
    zoom,
    focus,
    mode,
    look,
    shots,
    setShots,
    lastThumb,
    navigate,
  ]);

  const onShutter = useCallback(() => {
    if (!live) {
      void enableCamera();
      return;
    }
    if (capturing || countdown !== null) return;
    if (timer === 0) {
      void captureNow();
      return;
    }
    let left = timer;
    setCountdown(left);
    const tick = window.setInterval(() => {
      left -= 1;
      if (left <= 0) {
        window.clearInterval(tick);
        setCountdown(null);
        void captureNow();
      } else {
        setCountdown(left);
      }
    }, 1000);
  }, [live, enableCamera, capturing, countdown, timer, captureNow]);

  return (
    <div className="relative mx-auto h-dvh w-full max-w-md overflow-hidden bg-bg text-fg">
      <Viewfinder
        videoRef={videoRef}
        live={live}
        flash={flash}
        countdown={countdown}
        capturing={capturing}
        onFocus={onFocus}
      />

      {!live ? (
        <div className="absolute inset-x-0 bottom-0 top-16 z-[5] flex flex-col items-center justify-center gap-4 bg-bg px-8 text-center">
          <Camera className="size-10 text-accent" />
          <div className="flex flex-col gap-2">
            <p className="font-display text-3xl leading-tight">Live camera</p>
            <p className="text-sm text-muted">
              {error ?? "Uses your phone’s camera. Allow access when Android asks."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void enableCamera()}
            disabled={starting}
            className="min-h-12 rounded-full bg-fg px-6 text-sm font-medium text-accent-fg transition-[scale,opacity] duration-150 ease-out active:scale-[0.96] disabled:opacity-50"
          >
            {starting ? "Opening…" : "Open camera"}
          </button>
          <button
            type="button"
            onClick={() => navigate({ to: "/roll" })}
            className="min-h-11 text-sm text-muted transition-[color,scale] duration-150 ease-out active:scale-[0.96]"
          >
            View roll
          </button>
        </div>
      ) : null}

      <div className="pointer-events-none absolute inset-0 z-10 flex flex-col">
        <div className="pointer-events-auto">
          <TopChrome live={live} onOpenPro={() => setProOpen(true)} onEnableCamera={() => void enableCamera()} />
        </div>
        <div className="min-h-0 flex-1" />
        {live ? (
          <div className="pointer-events-auto bg-gradient-to-t from-bg/80 to-transparent">
            <BottomChrome
              onShutter={onShutter}
              onOpenRoll={() => navigate({ to: "/roll" })}
              shutterDisabled={capturing}
              lastThumb={lastThumb}
            />
          </div>
        ) : null}
      </div>

      <ProPanel open={proOpen} onClose={() => setProOpen(false)} />
    </div>
  );
}
