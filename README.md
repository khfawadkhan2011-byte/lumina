# Lumina

Computational camera — iPhone-style chrome with a RAW+ pipeline that grades every frame.

## Features

- **Live capture** on a phone (highest still the device will give), then HDR tone-mapping, skin-safe vibrance, and clarity
- **Modes:** Photo, Portrait, Food, Night, Pro
- **Looks:** Natural, Vivid, Cinema, Leica, 400H, Mono, Golden, Chrome, Alpine, and more
- **Pro desk:** EV, Kelvin, contrast, highlights, shadows, warmth, vibrance, vignette, grain, skin, depth, peaking, histogram, level
- **Roll + editor** with hold-to-compare, JPEG export, favorites

## Run

```bash
npm install
npm run dev
```

Open the app, allow the camera if prompted. Without a camera, Studio mode grades stills through the same engine.

```bash
npm run build
npm run typecheck
```

## Stack

React 19, TanStack Start, Tailwind v4, Zustand, IndexedDB for the roll.
