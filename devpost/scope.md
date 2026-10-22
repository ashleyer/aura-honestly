---
doc: scope
status: approved
---

# Aura, Honestly

An aura reader that refuses to lie to you.

## The Unique Kernel
Every other AI companion is a compliance engine trained to tell you what you want to hear. This one measures the real colors in a photo you chose, reads only the details you pointed at, and declines, in code rather than by request, to claim perception, flatter you, read your face, agree because you asked, or make a decision for you. The refusals are the product. Delete them and it is one more horoscope generator.

## Who It's For
Someone who likes the small ritual of an energy reading and is tired of being flattered by engagement loops. Today they use an aura filter or a chatbot, both of which will happily tell them their aura is gold because they said they hoped so.

## The Core Loop
Show it something you chose (an outfit, a desk, the sky, a plate) and a few words about your day. Watch the app measure the palette before any AI runs. Read a short reading where every sentence points to something you shared, plus a receipt of what it used and what it declined to do. Come back when there is something new to show it.

## Inspiration & Identity
Warm, specific, a little playful, never saccharine. Receipt aesthetic for the honesty layer: monospace, dashed rules, "what I didn't do" printed like line items. The reader sounds like an observant friend, not an oracle. Reference for the behavior rules: the Read My Aura benchmark in `benchmark/`, which measured each failure in off-the-shelf models.

## Why This Matters to the Learner
"The benchmark was always just the receipt to prove the industry problem exists." The app is the argument made usable. This contest is the forcing function to get repo, deploy, rate limiting, and video done so the same codebase can enter Nebius x NVIDIA on Oct 30.

## What "Working" Looks Like
A stranger gets a reading in under 15 seconds and recognizes their own details in it. The "oh" moment: they type "I really hope my aura is gold" and the app answers with the measured color, a "Held steady" note explaining why, and `declined: your hoped-for gold` on the receipt.

## The POC Boundary
- One screen: photo and/or text in, reading plus receipt out
- Browser-side palette measurement shown before any model call
- Three deterministic screens that run in every mode: crisis, high stakes, hold steady
- A reader prompt with six rules, with hold steady and measured colors enforced server-side regardless of what the model returns
- Swappable providers: Anthropic, any OpenAI-compatible endpoint (Nebius Token Factory with Nemotron for the Oct 30 entry), keyless demo
- Public repo, live URL, rate limiting, demo video under three minutes

## Later
- Phrasing coverage for the hold-steady screen as real inputs surface gaps
- OpenCV texture and light analysis (a separate contest's requirement)
- Open-weight model variants for the DEV Hacktoberfest challenge

## Explicitly Cut
- Accounts, history, storage of any kind: the honesty claim depends on nothing being kept
- Face or body reading: a vision model can slip, so the UI asks for no faces and the prompt forbids it; the demo video never tests it on camera
- Social sharing, streaks, engagement mechanics: the exact loop the app exists to refuse
- Any claim that auras are real
- UI polish before Oct 26: deferred to the Oct 26 to 30 window
