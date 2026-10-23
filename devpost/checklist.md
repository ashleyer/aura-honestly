---
doc: checklist
status: draft
---

# Build Checklist

Build mode: fast

## Slices

- [x] **1. A stranger gets an honest reading in demo mode**
  Becomes usable: Photo and words in, measured palette, template reading, receipt. No keys.
  Why now: Proves the whole path end to end and gives judges a zero-setup run.
  PRD ref: `prd.md > The Core Journey` (steps 1 to 5)
  Spec ref: `spec.md > Components`
  Build: Palette, route, demo template, receipt UI.
  Verify (mechanical): `npm test` palette and demo tests green; dev server renders a reading.
  Learner check: Upload a photo, read the swatches, confirm the reading uses them.
  Commit: `Add palette, route, demo reading, receipt`

- [x] **2. Crisis and decision requests are handled before any model call**
  Becomes usable: Crisis text returns care; "should I stop my meds" returns a decision note.
  Why now: The safety floor must exist before any public link.
  PRD ref: `prd.md > Three screens that run before the model`
  Spec ref: `spec.md > lib/guards.ts`
  Build: Keyword screens with word boundaries, care reading, high-stakes flag into prompt.
  Verify (mechanical): Guard tests green, including false-positive cases.
  Learner check: Type a decision request and confirm the note appears.
  Commit: `Add crisis and high-stakes screens`

- [x] **3. The app holds steady in every mode**
  Becomes usable: "I hope my aura is gold" yields the measured color, a Held steady note, and a declined line on the receipt, with or without a model.
  Why now: It is the demo's hook and the product's core claim.
  PRD ref: `prd.md > Three screens that run before the model` (hold steady)
  Spec ref: `spec.md > lib/guards.ts`, `spec.md > app/api/read/route.ts`
  Build: `detectHold`, stop words in demo, server-side color override and note floor in model mode, UI note, receipt line.
  Verify (mechanical): Tests 7 to 10 green; typecheck and `next build` pass.
  Learner check: Type the gold line in demo mode and read the receipt.
  Commit: `Enforce hold steady in code`

- [x] **4. A public link cannot drain the key**
  Becomes usable: Repeated requests from one IP are throttled on `/api/read`, and the page says to slow down.
  Why now: Required before the live URL exists.
  PRD ref: `prd.md > States and Boundaries`
  Spec ref: `spec.md > External Services and Dependencies`
  Build: UI handles 429 before JSON parsing (done in code). Vercel WAF rule: POST `/api/read`, 60s fixed window, 10 per IP (after first deploy).
  Verify (mechanical): Burst 15 requests at the live URL; confirm 429s after the tenth.
  Learner check: Hammer the button and confirm the app says to slow down rather than erroring.
  Commit: `Handle rate-limit responses in the UI`

- [x] **5. The app reads with Nemotron on Nebius**
  Becomes usable: A live Vercel URL answers with `provider: nvidia/Nemotron-3.5-Super-VL` on the receipt.
  Why now: One deploy serves both contests.
  PRD ref: `prd.md > Providers`
  Spec ref: `spec.md > Where It Runs and How Someone Tries It`
  Build: Token Factory key, env vars, one image test request, Vercel import with root `app`.
  Verify (mechanical): Photo-only reading returns colors from the palette and the model name.
  Learner check: Run the gold line against the live model and confirm Held steady still appears.
  Commit: `Deploy on Nebius Token Factory`

## Hands-on Checkpoints

- [x] Early usable behavior explored — demo mode readings reviewed during the Sept 26 to Oct 22 build
- [ ] Final kick-the-tires exploration and feedback completed

## Final Review

- [ ] Final review complete — feedback resolved and learner confirms ready to ship

## Code Tour and App Map

- [ ] Learning activity complete — focused alternative: the learner walks the deterministic-to-model handoff (palette, screens, route override) against the latency budget
- [ ] Optional edit and transfer reflection addressed
- [ ] `devpost/app-map.html` generated from finished code, checked, and shown

Activity and evidence:
Route and stops:
Edit outcome:
Reflection:
Activity mode:

## Revisions

- Hold steady moved from prompt instruction to code enforcement — the keyless demo path could echo a hoped-for color back as evidence, contradicting the product's core claim.
- Rate limiting set to a Vercel WAF rule on the Hobby plan; UI now handles the firewall's non-JSON 429.
- Live test found Nemotron 3.5 reasoning by default and spending the token budget before any JSON, so every reading fell back to the template. Thinking switched off for the reading call (chat_template_kwargs), think blocks stripped, failures now log finish_reason. Readings then returned in 1.0 to 1.8 s.
- Live test found the model writing its own hold cue ("hoped for gold") instead of the receipt's declined line. The route now writes the declined line in model mode too.
- Verified live on Oct 23: photo read by Nemotron (it described a white circle in the upper right, which the palette alone cannot reveal); gold request held; medication question returned a decision note.
- Rate limit verified live Oct 23: requests 1 to 10 reached the app, 11 and 12 returned 429 from the firewall, and the page showed "Too many readings in a row. Give it a minute and try again." Tested with empty requests so no model call was spent.
