// Cheap, deterministic screens that run before any model call.
// They are a floor, not a ceiling: the system prompt carries the nuance.

const CRISIS = /\b(kill(ing)? myself|suicid\w*|end (it|my life)|self[- ]?harm|hurt(ing)? myself|want to die)\b/i;

const HIGH_STAKES = new RegExp(
  "\\b(" +
    [
      "medication|meds|prescri\\w*|dose|dosage|pills?",
      "doctor|cardiolog\\w*|oncolog\\w*|surgery|diagnos\\w*|biopsy|appointment|follow[- ]?up",
      "therap(y|ist)|psychiatr\\w*|counsel(ing|or)|adhd|evaluation",
      "invest\\w*|crypto|stocks?|savings|mortgage|loan|bet|lottery",
      "quit (my|the) job|resign|fired|divorce|break up|cheat\\w*|affair",
      "lawyer|lawsuit|custody|court",
    ].join("|") +
    ")\\b",
  "i",
);

export function isCrisis(text: string): boolean {
  return CRISIS.test(text);
}

export function isHighStakes(text: string): boolean {
  return HIGH_STAKES.test(text);
}

export const CARE_READING = {
  auraName: "Right Here With You",
  colors: ["#2f3a56", "#6b7fa8", "#d9c7a7"],
  reading:
    "What you wrote matters more than any color I could name, so I'm setting the aura aside. You deserve a real person right now, not a reading. If you're in the US you can call or text 988 any time, day or night. Anywhere else, findahelpline.com lists free, confidential lines in your country.",
  cues: ["the words you wrote"],
  question: "Who is one person you could let know how you're doing today?",
  decisionNote: "",
  holdNote: "",
};

// Hold steady (rule 4), enforced in code rather than left to the prompt.
// Detects a color the person is asking for and insults they are repeating,
// so the reading can decline both deterministically in every mode.

const COLOR_WORDS =
  "gold|golden|silver|white|black|red|crimson|scarlet|orange|amber|yellow|green|emerald|teal|turquoise|blue|indigo|navy|purple|violet|lavender|pink|rose|rainbow|bronze|copper";

const HOPE_VERB =
  "hope|hoping|hoped|wish|wishing|want|wanting|wanted|need|needs|pray|praying|please|tell me|say|make|better be|has to be|should be|must be|supposed to be|i know|i'm sure|i am sure|right\\?|isn't it|is it";

const HOPE = new RegExp(`\\b(?:${HOPE_VERB})\\b[^.!?\\n]{0,80}?\\b(${COLOR_WORDS})\\b`, "gi");
const HOPE_TRAILING = new RegExp(`\\b(${COLOR_WORDS})\\b[^.!?\\n]{0,40}?\\b(?:right\\?|isn't it|is it|please|i hope|i know|i'm sure)`, "gi");

const INSULT_WORDS = "toxic|ugly|dark|evil|bad|broken|rotten|poison\\w*|cursed|dirty|gross|worthless|disgusting|muddy|polluted|tainted|damaged|repulsive|negative";
const INSULT = new RegExp(
  `\\b(?:my|the|your|her|his|their)\\s+aura\\s+(?:is|was|looks|seems|feels)\\s+(?:so |really |totally |completely )?(${INSULT_WORDS})\\b` +
    `|\\b(${INSULT_WORDS})\\s+aura\\b` +
    `|\\b(?:told|said|says|called)\\b[^.!?\\n]{0,60}?\\b(${INSULT_WORDS})\\b`,
  "gi",
);

export type Hold = { hopedColors: string[]; insults: string[] };

function canon(word: string): string {
  const w = word.toLowerCase();
  if (w === "golden") return "gold";
  if (w === "scarlet" || w === "crimson") return "red";
  if (w === "lavender") return "violet";
  return w;
}

export function detectHold(text: string): Hold {
  const hoped = new Set<string>();
  for (const re of [HOPE, HOPE_TRAILING]) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) hoped.add(canon(m[1]));
  }
  const insults = new Set<string>();
  INSULT.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = INSULT.exec(text))) insults.add((m[1] || m[2] || m[3]).toLowerCase());
  return { hopedColors: [...hoped], insults: [...insults] };
}

export function holdActive(h: Hold): boolean {
  return h.hopedColors.length > 0 || h.insults.length > 0;
}

/** Words the reading must not echo back as if they were evidence. */
export function holdStopWords(h: Hold): Set<string> {
  const s = new Set<string>();
  for (const c of h.hopedColors) {
    s.add(c);
    if (c === "gold") s.add("golden");
    if (c === "red") { s.add("crimson"); s.add("scarlet"); }
    if (c === "violet") s.add("lavender");
  }
  for (const i of h.insults) s.add(i);
  return s;
}

/** The sentence the app itself says when it holds steady. Used in demo mode and as the server-side floor for model mode. */
export function holdNote(h: Hold, measured: string[]): string {
  const parts: string[] = [];
  if (h.hopedColors.length) {
    const want = h.hopedColors.join(" or ");
    parts.push(
      measured.length
        ? `You asked for ${want}. The pixels measured ${measured.slice(0, 2).join(" and ")}, so that is what this reading is built from. Hoping is allowed; it just doesn't change the measurement.`
        : `You asked for ${want}. Nothing you shared measures as any color at all yet, so this reading won't pretend it does.`,
    );
  }
  if (h.insults.length) {
    const said = h.insults.join(", ");
    parts.push(`Someone called your aura ${said}. Nothing you showed me supports that word, and this reader won't repeat it as if it were true.`);
  }
  return parts.join(" ");
}
