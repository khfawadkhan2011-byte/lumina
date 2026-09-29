export type CameraHandle = {
  stream: MediaStream;
  video: HTMLVideoElement;
  track: MediaStreamTrack;
};

type TrackCaps = MediaTrackCapabilities & {
  torch?: boolean;
  zoom?: { min: number; max: number };
  exposureCompensation?: { min: number; max: number };
  exposureMode?: string[];
  whiteBalanceMode?: string[];
  focusMode?: string[];
  pointsOfInterest?: boolean;
};

function armVideo(video: HTMLVideoElement, stream: MediaStream) {
  video.setAttribute("playsinline", "true");
  video.setAttribute("webkit-playsinline", "true");
  video.playsInline = true;
  video.muted = true;
  video.autoplay = true;
  video.srcObject = stream;
}

async function playVideo(video: HTMLVideoElement) {
  try {
    await video.play();
    return;
  } catch {
    /* wait for metadata, then retry */
  }
  if (video.readyState >= 2) {
    await video.play().catch(() => undefined);
    return;
  }
  await new Promise<void>((resolve) => {
    const finish = () => {
      window.clearTimeout(timer);
      video.removeEventListener("loadedmetadata", onReady);
      void video.play().finally(() => resolve());
    };
    const onReady = () => finish();
    const timer = window.setTimeout(finish, 2500);
    video.addEventListener("loadedmetadata", onReady);
  });
}

async function requestStream(facing: "environment" | "user"): Promise<MediaStream> {
  if (!window.isSecureContext) {
    throw new DOMException("Camera needs a secure page", "SecurityError");
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new DOMException("Camera API missing", "NotSupportedError");
  }

  const attempts: MediaStreamConstraints[] = [
    {
      audio: false,
      video: {
        facingMode: { ideal: facing },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        frameRate: { ideal: 30 },
      },
    },
    { audio: false, video: { facingMode: { ideal: facing } } },
    { audio: false, video: { facingMode: facing } },
    { audio: false, video: true },
  ];

  let last: unknown;
  for (const constraints of attempts) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
      last = err;
    }
  }
  throw last instanceof Error ? last : new Error("Camera failed");
}

async function preferFacing(stream: MediaStream, facing: "environment" | "user"): Promise<MediaStream> {
  const track = stream.getVideoTracks()[0];
  const settings = track?.getSettings?.() ?? {};
  if (settings.facingMode === facing) return stream;

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const match = devices.find((d) => {
      if (d.kind !== "videoinput") return false;
      const label = d.label.toLowerCase();
      if (facing === "environment") return /back|rear|environment|world/.test(label);
      return /front|user|face|selfie/.test(label);
    });
    if (!match?.deviceId || match.deviceId === settings.deviceId) return stream;
    stream.getTracks().forEach((t) => t.stop());
    return await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { deviceId: { exact: match.deviceId } },
    });
  } catch {
    return stream;
  }
}

export function cameraErrorMessage(err: unknown): string {
  const name = err && typeof err === "object" && "name" in err ? String((err as { name: string }).name) : "";
  if (name === "SecurityError" || !window.isSecureContext) {
    return "Open the published app on your phone to use the live camera.";
  }
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return "Allow camera when Android asks, then tap Open camera.";
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") {
    return "No camera found on this device.";
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    return "Camera is busy. Close other camera apps and try again.";
  }
  if (name === "NotSupportedError" || name === "TypeError") {
    return "This browser cannot open the camera.";
  }
  return "Could not open the camera. Tap Open camera to try again.";
}

function pickMode(modes: string[] | undefined, wanted: string[]) {
  if (!modes?.length) return null;
  return wanted.find((m) => modes.includes(m)) ?? null;
}

export async function applySmartHardware(
  track: MediaStreamTrack,
  opts: { ev?: number; point?: { x: number; y: number } } = {},
) {
  const caps = (track.getCapabilities?.() ?? {}) as TrackCaps;
  const advanced: Record<string, unknown> = {};
  const focus = pickMode(caps.focusMode, ["continuous", "single-shot"]);
  const wb = pickMode(caps.whiteBalanceMode, ["continuous"]);
  const exp = pickMode(caps.exposureMode, ["continuous"]);
  if (focus) advanced.focusMode = focus;
  if (wb) advanced.whiteBalanceMode = wb;
  if (exp) advanced.exposureMode = exp;
  if (caps.exposureCompensation && typeof opts.ev === "number") {
    const { min, max } = caps.exposureCompensation;
    advanced.exposureCompensation = Math.min(max, Math.max(min, opts.ev));
  }
  if (caps.pointsOfInterest && opts.point) {
    advanced.pointsOfInterest = [{ x: opts.point.x, y: opts.point.y }];
  }
  if (Object.keys(advanced).length === 0) return false;
  try {
    await track.applyConstraints({ advanced: [advanced as MediaTrackConstraintSet] });
    return true;
  } catch {
    return false;
  }
}

export async function startCamera(
  video: HTMLVideoElement,
  facing: "environment" | "user",
): Promise<CameraHandle> {
  const raw = await requestStream(facing);
  const stream = await preferFacing(raw, facing);
  armVideo(video, stream);
  await playVideo(video);
  const track = stream.getVideoTracks()[0];
  if (!track) throw new Error("Camera failed");
  await applySmartHardware(track);
  return { stream, video, track };
}

export function stopCamera(handle: CameraHandle | null) {
  if (!handle) return;
  handle.stream.getTracks().forEach((t) => t.stop());
  handle.video.srcObject = null;
}

export async function setTorch(track: MediaStreamTrack, on: boolean) {
  const caps = track.getCapabilities?.() as TrackCaps | undefined;
  if (!caps?.torch) return false;
  try {
    await track.applyConstraints({
      advanced: [{ torch: on } as MediaTrackConstraintSet],
    });
    return true;
  } catch {
    return false;
  }
}

export async function setZoom(track: MediaStreamTrack, zoom: number) {
  const caps = track.getCapabilities?.() as TrackCaps | undefined;
  if (!caps?.zoom) return false;
  const z = Math.min(caps.zoom.max, Math.max(caps.zoom.min, zoom));
  try {
    await track.applyConstraints({ advanced: [{ zoom: z } as MediaTrackConstraintSet] });
    return true;
  } catch {
    return false;
  }
}

async function snapshotVideo(video: HTMLVideoElement) {
  const bmp = await createImageBitmap(video);
  return { source: bmp as CanvasImageSource, width: bmp.width, height: bmp.height };
}

export async function grabFrame(
  video: HTMLVideoElement,
  track: MediaStreamTrack | null,
): Promise<{ source: CanvasImageSource; width: number; height: number; blob?: Blob }> {
  if (track && "ImageCapture" in window) {
    try {
      const cap = new ImageCapture(track);
      const photoOpts: Record<string, number> = {};
      try {
        const caps = await cap.getPhotoCapabilities?.();
        if (caps?.imageWidth?.max) photoOpts.imageWidth = caps.imageWidth.max;
        if (caps?.imageHeight?.max) photoOpts.imageHeight = caps.imageHeight.max;
      } catch {
        /* optional */
      }
      const blob = await cap.takePhoto(Object.keys(photoOpts).length ? photoOpts : undefined);
      const bmp = await createImageBitmap(blob);
      return { source: bmp, width: bmp.width, height: bmp.height, blob };
    } catch {
      /* fall through */
    }
    try {
      const cap = new ImageCapture(track);
      const bmp = await cap.grabFrame();
      return { source: bmp, width: bmp.width, height: bmp.height };
    } catch {
      /* video snapshot */
    }
  }
  try {
    return await snapshotVideo(video);
  } catch {
    return {
      source: video,
      width: video.videoWidth || 1920,
      height: video.videoHeight || 1080,
    };
  }
}

export async function grabBurst(
  video: HTMLVideoElement,
  track: MediaStreamTrack | null,
  count: number,
  gapMs = 70,
): Promise<Array<{ source: CanvasImageSource; width: number; height: number }>> {
  const frames: Array<{ source: CanvasImageSource; width: number; height: number }> = [];
  for (let i = 0; i < count; i++) {
    frames.push(await grabFrame(video, i === 0 ? track : null));
    if (i < count - 1) {
      await new Promise((r) => window.setTimeout(r, gapMs));
    }
  }
  return frames;
}

declare class ImageCapture {
  constructor(track: MediaStreamTrack);
  takePhoto(photoSettings?: Record<string, number>): Promise<Blob>;
  grabFrame(): Promise<ImageBitmap>;
  getPhotoCapabilities?: () => Promise<{
    imageWidth?: { min: number; max: number };
    imageHeight?: { min: number; max: number };
  }>;
}
