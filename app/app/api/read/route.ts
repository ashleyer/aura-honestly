import { CARE_READING, detectHold, holdActive, holdNote, isCrisis, isHighStakes } from "@/lib/guards";
import { demoReading } from "@/lib/demo";
import { buildUserPrompt, SYSTEM_PROMPT } from "@/lib/prompt";
import { activeProvider, callModel, providerLabel } from "@/lib/providers";
import { extractJson, isHex, normalizeReading, type ReadRequest, type Reading } from "@/lib/schema";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_TEXT = 1200;
const MAX_IMAGE_BYTES = 2_500_000; // client downscales to about 1024px JPEG; this is the ceiling
const DATA_URL = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/;

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "cache-control": "no-store" } });
}

export async function POST(req: Request) {
  let body: ReadRequest;
  try {
    body = (await req.json()) as ReadRequest;
  } catch {
    return json({ error: "Send JSON." }, 400);
  }

  const text = typeof body.text === "string" ? body.text.trim().slice(0, MAX_TEXT) : "";
  const palette = Array.isArray(body.palette) ? body.palette.filter(isHex).slice(0, 6) : [];

  let image: { mediaType: string; base64: string } | undefined;
  if (body.imageDataUrl) {
    const m = DATA_URL.exec(body.imageDataUrl);
    if (!m) return json({ error: "Images must be JPEG, PNG, or WebP." }, 400);
    if (m[2].length * 0.75 > MAX_IMAGE_BYTES) return json({ error: "That image is too large." }, 413);
    image = { mediaType: m[1], base64: m[2] };
  }

  if (!text && !image) return json({ error: "Share a photo or a few words first." }, 400);

  // Safety floor: a person in crisis gets people, not a reading. No model call.
  if (isCrisis(text)) {
    const reading: Reading = { ...CARE_READING, mode: "care" };
    return json(reading);
  }

  const hold = detectHold(text);
  const provider = activeProvider();
  if (provider === "demo") {
    return json({ ...demoReading(text, palette, hold), mode: "demo", provider: providerLabel(provider) } satisfies Reading);
  }

  try {
    const raw = await callModel(provider, {
      system: SYSTEM_PROMPT,
      user: buildUserPrompt(text, palette, Boolean(image), isHighStakes(text), hold),
      image,
    });
    const reading = normalizeReading(extractJson(raw), palette);
    // Hold steady is enforced here, not trusted to the prompt: when the person asked for a color,
    // the measured palette wins over whatever the model chose, and the note is guaranteed to appear.
    if (holdActive(hold)) {
      if (hold.hopedColors.length && palette.length >= 2) reading.colors = palette.slice(0, 3);
      if (!reading.holdNote) reading.holdNote = holdNote(hold, palette.length ? reading.colors : []);
      // The receipt line is the app's statement, not the model's, so it is written here in every mode.
      const declined = [
        ...hold.hopedColors.map((c) => `declined: your hoped-for ${c}`),
        ...hold.insults.map((i) => `declined: "${i}"`),
      ];
      const hoped = new Set([...hold.hopedColors, ...hold.insults]);
      reading.cues = [
        ...reading.cues.filter((c) => ![...hoped].some((h) => c.toLowerCase().includes(h))),
        ...declined,
      ].slice(0, 6);
    }
    return json({ ...reading, mode: "model", provider: providerLabel(provider) } satisfies Reading);
  } catch (err) {
    // Fail honest: fall back to the labeled template instead of inventing anything.
    console.error("reading failed:", err instanceof Error ? err.message : err);
    return json({
      ...demoReading(text, palette, hold),
      mode: "demo",
      provider: "fallback template (the model call failed)",
    } satisfies Reading);
  }
  // Nothing is stored: the photo and text live only for the length of this request.
}
