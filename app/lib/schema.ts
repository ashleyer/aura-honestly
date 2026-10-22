// Shared types and validation for a reading. Kept dependency-free on purpose.

export type Reading = {
  auraName: string;
  colors: string[];
  reading: string;
  cues: string[];
  question: string;
  decisionNote: string;
  holdNote: string;
  mode: "model" | "demo" | "care";
  provider?: string;
};

export type ReadRequest = {
  text?: string;
  imageDataUrl?: string;
  palette?: string[];
};

const HEX = /^#[0-9a-f]{6}$/i;

export function isHex(v: unknown): v is string {
  return typeof v === "string" && HEX.test(v);
}

/** Pull the first JSON object out of a model reply, tolerating code fences and chatter. */
export function extractJson(raw: string): unknown {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("No JSON object in model reply");
  return JSON.parse(raw.slice(start, end + 1));
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Coerce untrusted model output into a safe Reading. Never trust shape or length. */
export function normalizeReading(input: unknown, fallbackColors: string[]): Omit<Reading, "mode"> {
  const o = (input ?? {}) as Record<string, unknown>;
  const colors = Array.isArray(o.colors) ? o.colors.filter(isHex).slice(0, 4) : [];
  const cues = Array.isArray(o.cues)
    ? o.cues.map((c) => str(c, 140)).filter(Boolean).slice(0, 5)
    : [];
  const reading = str(o.reading, 900);
  if (!reading) throw new Error("Model reply had no reading");
  return {
    auraName: str(o.auraName, 48) || "Unnamed Light",
    colors: colors.length >= 2 ? colors : fallbackColors.slice(0, 3),
    reading,
    cues,
    question: str(o.question, 200),
    decisionNote: str(o.decisionNote, 500),
    holdNote: str(o.holdNote, 500),
  };
}
