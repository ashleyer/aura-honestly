// Browser-side image prep: downscale for upload, and measure the real palette.
// The palette is shown to the user before any AI runs, so the colors in a
// reading can always be traced back to actual pixels.

export type PreparedImage = { dataUrl: string; palette: string[] };

const toHex = (r: number, g: number, b: number) =>
  "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");

/** k-means on a small sample of pixels; deterministic seeding so the same photo gives the same palette. */
export function kmeansPalette(pixels: Uint8ClampedArray, k = 5, iterations = 10): string[] {
  const pts: number[][] = [];
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] < 128) continue; // skip transparent
    pts.push([pixels[i], pixels[i + 1], pixels[i + 2]]);
  }
  if (pts.length === 0) return [];
  k = Math.min(k, pts.length);
  // Deterministic spread seeding: sort by luminance and take evenly spaced points.
  const byLum = [...pts].sort((a, b) => a[0] * 0.299 + a[1] * 0.587 + a[2] * 0.114 - (b[0] * 0.299 + b[1] * 0.587 + b[2] * 0.114));
  let centers = Array.from({ length: k }, (_, j) => [...byLum[Math.floor(((j + 0.5) / k) * byLum.length)]]);
  let counts = new Array(k).fill(0);

  for (let it = 0; it < iterations; it++) {
    const sums = Array.from({ length: k }, () => [0, 0, 0]);
    counts = new Array(k).fill(0);
    for (const p of pts) {
      let best = 0, bestD = Infinity;
      for (let c = 0; c < k; c++) {
        const d = (p[0] - centers[c][0]) ** 2 + (p[1] - centers[c][1]) ** 2 + (p[2] - centers[c][2]) ** 2;
        if (d < bestD) { bestD = d; best = c; }
      }
      sums[best][0] += p[0]; sums[best][1] += p[1]; sums[best][2] += p[2];
      counts[best]++;
    }
    centers = centers.map((c, j) => (counts[j] ? sums[j].map((s) => s / counts[j]) : c));
  }

  return centers
    .map((c, j) => ({ hex: toHex(c[0], c[1], c[2]), n: counts[j] }))
    .filter((c) => c.n > 0)
    .sort((a, b) => b.n - a.n)
    .map((c) => c.hex)
    .filter((hex, i, arr) => arr.indexOf(hex) === i);
}

export async function prepareImage(file: File, maxSide = 1024): Promise<PreparedImage> {
  if (!/^image\/(jpeg|png|webp|heic|heif)$/i.test(file.type) && !/\.(jpe?g|png|webp|heic)$/i.test(file.name)) {
    throw new Error("Please choose a JPEG, PNG, or WebP image.");
  }
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, w, h);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);

  const small = document.createElement("canvas");
  const side = 64;
  small.width = side;
  small.height = side;
  const sctx = small.getContext("2d", { willReadFrequently: true })!;
  sctx.drawImage(bitmap, 0, 0, side, side);
  const palette = kmeansPalette(sctx.getImageData(0, 0, side, side).data);
  bitmap.close();
  return { dataUrl, palette };
}
