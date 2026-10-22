# Live Try-On

A small Next.js app that streams your webcam to [Decart](https://decart.ai)'s realtime virtual try-on model (`lucy-vton-latest`) and lets you swap between 8 garments with one click.

Based on the `standalone` example from [DecartAI/tryon-examples](https://github.com/DecartAI/tryon-examples) (MIT). The garment images in `public/garments` come from that repo.

## Run locally

1. Put your key in `.env.local`:

   ```
   DECART_API_KEY=your_key_here
   ```

2. Install and start:

   ```bash
   npm install
   npm run dev
   ```

3. Open http://localhost:3000, click **Start try-on**, allow the camera, then click any garment.

## Deploy to Vercel

1. Push this folder to a GitHub repo and import it in Vercel (framework is detected as Next.js).
2. In **Project Settings → Environment Variables** add `DECART_API_KEY`.
3. Deploy. Camera access requires HTTPS, which Vercel provides.

## How it works

- `app/api/token/route.ts` — server route that uses `DECART_API_KEY` to mint a short-lived client token. The permanent key never reaches the browser.
- `hooks/useTryOn.ts` — opens the camera, fetches a token, connects to Decart over WebRTC, and swaps garments with `setImage(image, { prompt })` without reconnecting.
- `lib/garments.ts` — the garment catalog. Each entry has an image and a prompt; edit or add entries here.
- `components/TryOn.tsx` — the UI.

## Adding your own garments

Drop a clean product shot (plain background, at least 512×512) in `public/garments/` and add an entry to `lib/garments.ts`. Prompts work best at 20–30 words with colour, material and fit, using "Substitute the current top with …" for clothing or "Add … to the person's head" for hats.

## Cost note

Every live session consumes Decart credits, and `/api/token` is a public endpoint on your deployment (it only accepts same-origin requests). If you share the URL widely, consider adding authentication or rate limiting to that route.
