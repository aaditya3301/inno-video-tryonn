# Live Try-On

A small Next.js app that streams your webcam to [Decart](https://decart.ai)'s realtime video editing model, Lucy 2.5 in fast mode (`lucy-2.5`, `speed: "fast"`), and lets you swap between 12 garments with one click.

Based on the `standalone` example from [DecartAI/tryon-examples](https://github.com/DecartAI/tryon-examples) (MIT). The garment images in `public/garments` come from Wikimedia Commons; sources and licenses are in [`public/garments/CREDITS.md`](public/garments/CREDITS.md).

## Run locally

1. Copy `keys.example.csv` to `keys.csv` and paste your Decart API keys, one per line. (A single key in `.env.local` as `DECART_API_KEY=...` also works.)

2. Install and start:

   ```bash
   npm install
   npm run dev
   ```

3. Open http://localhost:3000, click **Start try-on**, allow the camera, then click any garment.

## Deploy to Vercel

1. Push this folder to a GitHub repo and import it in Vercel (framework is detected as Next.js).
2. In **Project Settings → Environment Variables** add `DECART_API_KEYS` (comma-separated). `keys.csv` is gitignored, so it isn't deployed.
3. Deploy. Camera access requires HTTPS, which Vercel provides.

## How it works

- `lib/keys.ts` — loads the key pool from `keys.csv` (re-read on every request), `DECART_API_KEYS` and `DECART_API_KEY`.
- `app/api/token/route.ts` — `GET` lists the pool as hashed ids; `POST { keyId }` mints a short-lived client token for one key. The permanent keys never reach the browser.
- `lib/rotatingSession.ts` — the live session. It connects to Decart over WebRTC, swaps garments with `setImage(image, { prompt })` without reconnecting, and rotates keys: shortly before the current key is expected to run dry it opens a standby session on the next key (already wearing the selected garment), and when Decart ends the current one with `insufficient_credits` the standby's stream is swapped in.
- `lib/keyUsage.ts` — the countdown. Decart has no balance API, so seconds of live generation are counted per key in `localStorage` against a budget: `CREDITS_PER_KEY` (default 1000) ÷ 4 credits/sec ≈ 250 seconds until a key has actually run out, then however long that key really lasted.
- `hooks/useTryOn.ts` — opens the camera and connects the session to React state.
- `lib/garments.ts` — the garment catalog. Each entry has an image and a prompt; edit or add entries here.
- `components/TryOn.tsx` — the UI.

## Adding your own garments

Drop a clean product shot (plain background, at least 512×512) in `public/garments/` and add an entry to `lib/garments.ts`. Prompts work best at 20–30 words with colour, material and fit, using "Dress the person in …" for full outfits or "Replace the person's top with …" for single pieces. If the image isn't yours, add its source and license to `public/garments/CREDITS.md`.

## Rotating API keys

Lucy 2.5 fast mode bills 4 credits per second, so a 1000-credit key lasts about 4 minutes. The app rotates through every key in `keys.csv`. The timer in the top bar shows the estimated time left across all of them and which key is on screen. Keys that run out are remembered in the browser and skipped; new keys are picked up the next time you press **Start**. If you top up keys that ran out, use **Reset the timer** under the Start button.

Handoffs overlap by a couple of seconds (both keys are billed while the standby comes up), which keeps the picture from dropping. If a key ends sooner than estimated, the app falls back to connecting the next key on the spot, which takes a few seconds; the estimate corrects itself from then on.

## Cost note

Every live session consumes Decart credits, and `/api/token` is a public endpoint on your deployment (it only accepts same-origin requests). If you share the URL widely, consider adding authentication or rate limiting to that route.
