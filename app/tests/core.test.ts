import { test } from "node:test";
import assert from "node:assert/strict";
import { detectHold, isCrisis, isHighStakes } from "../lib/guards.ts";
import { extractJson, normalizeReading } from "../lib/schema.ts";
import { demoReading } from "../lib/demo.ts";
import { kmeansPalette } from "../lib/palette.ts";

test("crisis screen catches clear statements and ignores ordinary ones", () => {
  assert.equal(isCrisis("honestly I want to die"), true);
  assert.equal(isCrisis("thinking about self-harm again"), true);
  assert.equal(isCrisis("I died laughing at the party"), false);
});

test("high-stakes screen uses word boundaries", () => {
  assert.equal(isHighStakes("can I stop my medication?"), true);
  assert.equal(isHighStakes("should I put my savings in crypto"), true);
  assert.equal(isHighStakes("feeling better today"), false); // 'bet' must not match 'better'
});

test("extractJson tolerates fences and chatter", () => {
  const raw = 'Here you go:\n```json\n{"reading":"x","colors":["#aabbcc"]}\n```';
  assert.deepEqual(extractJson(raw), { reading: "x", colors: ["#aabbcc"] });
});

test("normalizeReading drops bad colors and falls back to the measured palette", () => {
  const r = normalizeReading({ reading: "ok", colors: ["red", "#12345"], cues: ["a", 3] }, ["#111111", "#222222", "#333333"]);
  assert.deepEqual(r.colors, ["#111111", "#222222", "#333333"]);
  assert.deepEqual(r.cues, ["a"]);
  assert.throws(() => normalizeReading({ colors: [] }, []));
});

test("demo reading is deterministic and labels itself", () => {
  const a = demoReading("Fixed the bicycle chain after lunch", ["#2c60c4", "#d9b77a"]);
  const b = demoReading("Fixed the bicycle chain after lunch", ["#2c60c4", "#d9b77a"]);
  assert.deepEqual(a, b);
  assert.match(a.reading, /demo mode/i);
  assert.match(a.reading, /#2c60c4/);
});

test("palette extraction finds the dominant color first", () => {
  const px = new Uint8ClampedArray(100 * 4);
  for (let i = 0; i < 100; i++) {
    const blue = i < 70;
    px.set(blue ? [40, 90, 200, 255] : [230, 130, 40, 255], i * 4);
  }
  const pal = kmeansPalette(px, 2);
  assert.equal(pal[0], "#285ac8");
});

test("hold-steady guard catches hoped-for colors and repeated insults, ignores plain color talk", () => {
  assert.deepEqual(detectHold("I really hope my aura is gold today").hopedColors, ["gold"]);
  assert.deepEqual(detectHold("Please tell me it's purple").hopedColors, ["purple"]);
  assert.deepEqual(detectHold("it's golden, right?").hopedColors, ["gold"]);
  assert.deepEqual(detectHold("my ex said my aura is toxic").insults, ["toxic"]);
  assert.deepEqual(detectHold("someone called me a toxic person").insults, ["toxic"]);
  const plain = detectHold("I painted the fence blue and the gold leaf cracked");
  assert.deepEqual(plain.hopedColors, []);
  assert.deepEqual(plain.insults, []);
  assert.deepEqual(detectHold("the dark room was quiet").insults, []);
});

test("demo mode refuses to echo a hoped-for color and says so", () => {
  const r = demoReading("I really hope my aura is gold today, I need it to be golden", ["#2c60c4", "#d9b77a"]);
  assert.ok(!r.cues.some((c) => /your word "gold/i.test(c)), "hoped color must not appear as evidence");
  assert.ok(r.cues.includes("declined: your hoped-for gold"));
  assert.match(r.holdNote, /asked for gold/i);
  assert.match(r.holdNote, /#2c60c4/);
  assert.deepEqual(r.colors, ["#2c60c4", "#d9b77a"]);
});

test("demo mode will not affirm an insult", () => {
  const r = demoReading("my sister says my aura is toxic and honestly she might be right", []);
  assert.ok(!r.cues.some((c) => /"toxic"/.test(c) && !/declined/.test(c)));
  assert.match(r.holdNote, /called your aura toxic/i);
  assert.match(r.holdNote, /won't repeat it/i);
});

test("ordinary text produces no hold note", () => {
  const r = demoReading("Fixed the bicycle chain after lunch", ["#2c60c4"]);
  assert.equal(r.holdNote, "");
});

test("thinking blocks are removed before JSON is parsed, including one cut off mid-thought", async () => {
  const { stripThinking } = await import("../lib/providers.ts");
  assert.equal(stripThinking('<think>gold? no, measure first {</think>{"reading":"x"}'), '{"reading":"x"}');
  assert.equal(stripThinking("<think>still thinking when the limit hit {"), "");
  assert.equal(stripThinking('{"reading":"plain"}'), '{"reading":"plain"}');
});
