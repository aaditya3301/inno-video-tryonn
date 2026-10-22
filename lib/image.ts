const MAX_SIDE = 1024;

const cache = new Map<string, Promise<Blob>>();

/**
 * Fetches a garment image and downsizes it so the upload to the try-on model
 * stays small. Results are cached per URL, so switching back to a garment you
 * already tried is instant.
 */
export function loadGarmentBlob(url: string): Promise<Blob> {
  let blob = cache.get(url);
  if (!blob) {
    blob = fetchAndResize(url).catch((err) => {
      cache.delete(url);
      throw err;
    });
    cache.set(url, blob);
  }
  return blob;
}

async function fetchAndResize(url: string): Promise<Blob> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not load garment image (${res.status})`);
  const bitmap = await createImageBitmap(await res.blob());

  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available in this browser");

  // JPEG has no alpha; flatten onto white (garment shots are on white anyway).
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Could not encode garment image"))),
      "image/jpeg",
      0.92,
    ),
  );
}
