// Deterministic reading used when no model is connected. It is honest about
// being a template: it only reflects measured colors and the user's own words.

import type { Reading } from "./schema";
import { detectHold, holdActive, holdNote, holdStopWords, type Hold } from "./guards.ts";

type Family = { name: string; mood: string; question: string };

const FAMILIES: Array<[number, Family]> = [
  [15, { name: "Ember", mood: "warmth that doesn't ask permission", question: "What are you ready to say out loud?" }],
  [45, { name: "Amber", mood: "the patience of late afternoon", question: "What would you do today if nothing needed finishing?" }],
  [70, { name: "Citrine", mood: "curiosity with the lights on", question: "What small thing surprised you this week?" }],
  [160, { name: "Fern", mood: "steady, unhurried growth", question: "What is quietly getting stronger in your life?" }],
  [200, { name: "Tidewater", mood: "calm that has depth under it", question: "Where do you feel most at ease?" }],
  [255, { name: "Harbor", mood: "reliability, the kind people lean on", question: "Who leans on you, and who do you lean on?" }],
  [290, { name: "Dusk Violet", mood: "imagination held close", question: "What idea keeps coming back to you?" }],
  [335, { name: "Rosewater", mood: "tenderness with good boundaries", question: "What are you taking care of right now?" }],
  [361, { name: "Ember", mood: "warmth that doesn't ask permission", question: "What are you ready to say out loud?" }],
];

const STOP = new Set(
  "about after again also always because been being could didn doesn every from have into just like made make more most much only really should some still than that their them then there these they thing think this those through today very want were what when where which while with would your yours myself finally oddly actually pretty maybe kind sort i'm i've it's don't can't".split(
    " ",
  ),
);

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: h * 60, s, l };
}

function family(hex: string): Family {
  const { h, s } = hexToHsl(hex);
  if (s < 0.12) return { name: "Pewter", mood: "clarity without decoration", question: "What would you keep if you had to keep only three things?" };
  return FAMILIES.find(([edge]) => h < edge)![1];
}

function keywords(text: string, drop: Set<string>): string[] {
  const words = (text.toLowerCase().match(/[a-z][a-z']{3,}/g) || []).filter((w) => !STOP.has(w) && !drop.has(w));
  return [...new Set(words)].sort((a, b) => b.length - a.length).slice(0, 3);
}

export function demoReading(text: string, palette: string[], hold: Hold = detectHold(text)): Omit<Reading, "mode"> {
  const colors = palette.length ? palette.slice(0, 3) : ["#6b7fa8", "#c9a36b", "#2f3a56"];
  const lead = family(colors[0]);
  const { l } = hexToHsl(colors[0]);
  const light = l > 0.7 ? "Morning" : l < 0.3 ? "Night" : "Low";
  const words = keywords(text, holdStopWords(hold));
  const held = holdActive(hold) ? holdNote(hold, palette.length ? colors : []) : "";

  const sentences: string[] = [];
  if (palette.length) {
    sentences.push(
      `The strongest color in what you showed me measures ${colors[0]}, ${/^[aeiou]/i.test(lead.name) ? "an" : "a"} ${lead.name.toLowerCase()} tone, so that is where this reading starts: ${lead.mood}.`,
    );
    if (colors[1]) sentences.push(`It sits next to ${colors[1]}, which keeps it from being one note.`);
  }
  if (words.length) {
    sentences.push(`In your own words, "${words.join('", "')}" carried the most weight, and they read as things you're paying attention to on purpose.`);
  }
  if (!sentences.length) sentences.push("You haven't shown me anything yet, so there is nothing honest to read. Share a photo or a few lines and try again.");
  sentences.push("This is demo mode: a template reflecting measured colors and your words back to you. No model, and no mysticism, was involved.");

  return {
    auraName: `${light} ${lead.name}`,
    colors,
    reading: sentences.join(" "),
    cues: [
      ...(palette.length ? [`photo palette: ${colors.join(", ")}`] : []),
      ...words.map((w) => `your word "${w}"`),
      ...hold.hopedColors.map((c) => `declined: your hoped-for ${c}`),
      ...hold.insults.map((i) => `declined: "${i}"`),
    ],
    question: lead.question,
    decisionNote: "",
    holdNote: held,
  };
}
