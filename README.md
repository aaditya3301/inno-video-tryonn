# Live Try-On

A small Next.js app that streams your webcam to [Decart](https://decart.ai)'s realtime virtual try-on model (`lucy-vton-latest`, fast mode), and lets you swap between 22 garments with one click.

Based on the `standalone` example from [DecartAI/tryon-examples](https://github.com/DecartAI/tryon-examples) (MIT). The garment images in `public/garments` come from Wikimedia Commons; sources and licenses are in [`public/garments/CREDITS.md`](public/garments/CREDITS.md).

## Run locally

1. Copy `keys.example.csv` to `keys.csv` and paste your Decart API keys, one per line. (A single key in `.env.local` as `DECART_API_KEY=...` also works.)

2. Install and start:

   ```bash
   npm install
   npm run dev
   ```

3. Open http://localhost:3000, click **Start try-on**, allow the camera, then click any garment.

## Deploy to GCP (personal use)

The GCP setup uses Cloud Run in Singapore, sleeping when idle and capped at one
instance. It is configured for `livetryon.fabricvton.com` with managed HTTPS; API keys are
provided by Secret Manager. See [`deploy/README.md`](deploy/README.md) for the
deployment commands, GoDaddy DNS instructions, costs, and key rotation.

## Deploy to Vercel (alternative)

1. Push this folder to a GitHub repo and import it in Vercel (framework is detected as Next.js).
2. In **Project Settings → Environment Variables** add `DECART_API_KEYS` (comma-separated). `keys.csv` is gitignored, so it isn't deployed.
3. Deploy. Camera access requires HTTPS, which Vercel provides.

## How it works

- `lib/keys.ts` — loads the key pool from `keys.csv` (re-read on every request), `DECART_API_KEYS` and `DECART_API_KEY`.
- `app/api/token/route.ts` — `GET` lists the pool as hashed ids; `POST { keyId }` mints a short-lived client token for one key. The permanent keys never reach the browser.
- `lib/rotatingSession.ts` — the live session. It connects to Decart over WebRTC, swaps garments with `setImage(image, { prompt })` without reconnecting, and rotates keys: shortly before the current key is expected to run dry it opens a standby session on the next key (already wearing the selected garment), and when Decart ends the current one with `insufficient_credits` the standby's stream is swapped in.
- `lib/keyUsage.ts` — estimates, in the browser, how long the current key will last so the next key can be started a few seconds early. Seconds of live generation are counted per key in `localStorage` against a budget: `CREDITS_PER_KEY` (default 1000) ÷ 4 credits/sec ≈ 250 seconds, then however long that key really lasted. The real balances are on `/billing`.
- `lib/credits.ts`, `lib/gcpSecret.ts`, `app/billing/` — the billing page: it asks Decart for each key's credits and removes keys that are at zero (from `keys.csv` and the Secret Manager secret).
- `hooks/useTryOn.ts` — opens the camera and connects the session to React state.
- `lib/garments.ts` — the garment catalog. Each entry has an image and a prompt; edit or add entries here.
- `components/TryOn.tsx` — the page; `components/GarmentCarousel.tsx` — the endless, swipeable garment picker (swipe, tap, arrow buttons or arrow keys all change the outfit).

## Adding your own garments

Drop a clean product shot (plain background, at least 512×512) in `public/garments/` and add an entry to `lib/garments.ts`. Prompts work best at 20–30 words with colour, material and fit, using "Substitute the current top with …" for clothing or "Add … to the person's head" for hats. If the image isn't yours, add its source and license to `public/garments/CREDITS.md`.

## Rotating API keys

The try-on model in fast mode (`speed: "fast"`, for lower latency) bills 4 credits per second, so a 1000-credit key lasts about 4 minutes. The app rotates through every key in `keys.csv`. The real credits and time left across all keys are on the [billing page](#billing-page). Keys that run out are remembered in the browser and skipped; new keys are picked up the next time you press **Start**. If you top up keys that ran out, use the **Try them again** link under the Start button.

Handoffs overlap by a couple of seconds (both keys are billed while the standby comes up), which keeps the picture from dropping. If a key ends sooner than estimated, the app falls back to connecting the next key on the spot, which takes a few seconds; the estimate corrects itself from then on.

## Billing page

Open `/billing` (for example `https://livetryon.fabricvton.com/billing`) to see the real credits left on every key, the total across all keys, and the time that buys (credits ÷ 4 per second, counted per key so a key's leftover under one second isn't included). The page asks Decart's `GET /v1/credits` for each key every time it loads. `/api/billing` returns the same numbers as JSON. Neither ever shows a key, only a short hash.

You don't have to open the page for that to happen. The app also asks the server to check the keys and clear out empty ones when the page loads, when you press **Start**, and whenever a key runs dry during a session (at most once every 10 seconds). Keys that run dry while nobody has the page open are cleared the next time someone opens it. When a key is at zero credits it is removed from the key list: from `keys.csv` locally, and on Google Cloud from the `KEYS_SECRET` secret (saved as a new secret version, so the old list can be restored). Keys that only exist in the `DECART_API_KEYS` variable can't be removed by the app and are flagged instead. Add `?prune=0` to check without removing. Set `REMOVE_BELOW_CREDITS` to remove keys earlier, for example `4` removes keys that can no longer pay for one second.

### Keys on the same Decart account

Keys that belong to the same Decart account share one balance. The app works out which keys share an account by creating a short-lived token for each key (a token names its owner; only a hash of that id is kept or shown), and then:

- `/billing` marks a key as "Same account as Key N" and counts that account's balance once in the credits and time totals;
- the **Add a key** dialog warns when a new key is on an account already in the list ("shares that balance and adds no extra time") and offers **Save anyway**;
- when switching keys, a key on the same account as one that is running is never picked, and when one key runs out all keys on its account are skipped.

If an account can't be worked out (Decart didn't answer in time), the key is treated as its own account and tried again on the next check.

### Adding a key from the billing page

The **Add a key** button on `/billing` opens a dialog. Paste a Decart API key and press **Save**: the server first asks Decart whether the key works and has credits (junk, rejected and empty keys are refused), then adds it to `keys.csv` locally and, on Google Cloud, to the Secret Manager secret as a new version. The page updates straight away and the key is used from the next session. A key already in the list is reported and not added twice. The same permission that removes empty keys (`secretVersionAdder`) is what lets it save.

The page is public, so anyone with its link could add keys. Set `BILLING_PASSWORD` to require a password in the dialog (10 wrong passwords block further tries for ten minutes). Without it the dialog says so. Saves are limited to 20 checks per ten minutes, and the list is capped at 200 keys.

## Site password

Every live session spends Decart credits, so set `SITE_PASSWORD` to keep strangers from using your keys. When it is set, the whole site is locked: visitors are sent to a login page (`/login`), and after entering the password they stay logged in for 30 days (a signed, HttpOnly cookie). Page loads, `/api/token`, `/billing` and the other APIs all need that login. Changing the password logs everyone out. Scripts can use `curl -u anyname:PASSWORD`. Ten wrong passwords from one address block that address for ten minutes.

Leave `SITE_PASSWORD` empty and there is no lock, which is what you want when running locally. On Google Cloud the password lives in the `livetryon-site-password` secret; see [`deploy/README.md`](deploy/README.md).

## Cost note

Every live session consumes Decart credits. Set `SITE_PASSWORD` (above) on any deployment other people could find, because without it anyone with the URL can start sessions on your keys.
