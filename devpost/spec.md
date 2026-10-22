---
doc: spec
status: approved
---

# Aura, Honestly: Technical Spec

## How This Works, In Plain Language
Three pieces. The page in the browser measures the colors of your photo and sends the photo, the colors, and your words to one API route. The route runs three cheap keyword screens first (crisis, high stakes, hold steady), then either answers from a deterministic template (demo) or asks a model, then checks the model's answer against the measured colors before sending it back. The page shows the reading and a receipt. Nothing is written anywhere.

This shape rather than something bigger because every honesty claim is easier to keep when there is one route, no database, and no state. It is also the fastest shape: no loop, so the latency budget is one model round-trip, and every deterministic layer finishes before the model starts.

## The Core Journey Through the System
1. Photo chosen → `lib/palette.ts` downscales to 64px and runs k-means → swatches render.
2. Submit → `components/AuraApp.tsx` posts `{ text, imageDataUrl, palette }` to `POST /api/read`.
3. Vercel Firewall rate-limit rule checks the source IP; over the limit → 429 handled in the UI as "Give it a minute."
4. Route validates type and size caps → `isCrisis` → care reading, stop.
5. `detectHold` and `isHighStakes` compute flags.
6. Provider `demo` → `demoReading(text, palette, hold)` → response.
7. Provider model → `buildUserPrompt` with flags → `callModel` → `extractJson` → `normalizeReading` → if hold is active, palette overrides colors and `holdNote` is guaranteed → response.
8. Any model failure → labeled demo reading.
9. Page renders name, reading, notes, question, receipt.
PRD ref: `prd.md > The Core Journey`.

## Stack
- Next.js 16.3 App Router, React 19.3, TypeScript 5.9. https://nextjs.org/docs
- Zero runtime dependencies beyond those three; model calls use plain `fetch`. Rationale: nothing to audit, nothing to leak.
- Tests: Node's built-in runner with `--experimental-strip-types`. Rationale: no test framework to install.

## Where It Runs and How Someone Tries It
Browser plus one Node route on Vercel (Hobby plan). Node 22 or later locally.

```
cd app
cp .env.example .env.local   # optional; demo works with no keys
npm install
npm run dev                  # http://localhost:3000
npm test && npm run typecheck
```

Demo recording: run in `demo` mode for the hold-steady and decision-note shots so the refusals are reproducible, then one reading on the live model.

Deployment: Vercel, import repo with root directory `app`. Env for the Oct 26 and Oct 30 entries:
```
AURA_PROVIDER=openai-compatible
OPENAI_COMPAT_BASE_URL=https://api.tokenfactory.nebius.com/v1
OPENAI_COMPAT_MODEL=nvidia/Nemotron-3.5-Super-VL
OPENAI_COMPAT_API_KEY=<from Token Factory>
```
Unverified: that this model ID accepts `image_url` content parts on Token Factory. Check with one request before deploying; fall back to text-plus-palette if not.

## Look and Feel
Dark ground, single accent, reading in a readable serif or system sans, receipt in monospace with dashed rules. Spacious and calm. Copy: specific, warm, no exclamation marks, no emojis, no em dashes. Source: `prd.md > Look and Feel`.

## Components

### `lib/palette.ts`
Deterministic k-means with luminance-sorted seeding. PRD ref: `prd.md > Palette first`.

### `lib/guards.ts`
`isCrisis`, `isHighStakes`, `detectHold`, `holdNote`, `holdStopWords`, `CARE_READING`. Keyword floors, word-boundaried, tested for false positives. PRD ref: `prd.md > Three screens that run before the model`.

### `lib/prompt.ts`
Six-rule system prompt and the user prompt builder, which appends app notes for high stakes and hold. PRD ref: `prd.md > The reader`.

### `lib/providers.ts`
Anthropic Messages and OpenAI-compatible `/chat/completions` over `fetch`, 45s timeout. PRD ref: `prd.md > Providers`.

### `lib/schema.ts`
`Reading` type, `extractJson`, `normalizeReading` (hex-only colors, length caps, `holdNote` and `decisionNote` capped at 500). PRD ref: `prd.md > The reader`.

### `lib/demo.ts`
Template reading from measured colors and the person's words, minus hold stop words, with the app-generated hold note. PRD ref: `prd.md > Providers`.

### `app/api/read/route.ts`
Validation, screens, provider switch, server-side hold enforcement, honest fallback. PRD ref: `prd.md > The Core Journey`.

### `components/AuraApp.tsx`
Single-page UI, accessible form, live result region, "Held steady" and decision notes, receipt. Handles a firewall 429 before parsing JSON. PRD ref: `prd.md > Screens and Layout`, `prd.md > States and Boundaries`.

## Data Model
No persistence. In-flight shape only:

Request `{ text?: string (<=1200), imageDataUrl?: data:image/(jpeg|png|webp);base64, palette?: string[] (<=6 hex) }`
Response `{ auraName, colors[], reading, cues[], question, decisionNote, holdNote, mode: "model"|"demo"|"care", provider? }`

When the person leaves, everything is gone.

## File Structure
```
read-my-aura/
├── app/                      # the Next.js app (Vercel root directory)
│   ├── app/api/read/route.ts
│   ├── app/page.tsx, layout.tsx, globals.css
│   ├── components/AuraApp.tsx
│   ├── lib/{palette,guards,prompt,providers,schema,demo}.ts
│   ├── tests/core.test.ts
│   └── docs/                 # screenshots and the Sept 26 drafts
├── benchmark/                # the Kaggle benchmark that justified each rule
├── post/dev-post.md
├── devpost/                  # Devpost learning workspace (this folder)
└── HACKATHON-PLAN.md
```

## External Services and Dependencies
- Nebius Token Factory, OpenAI-compatible: `POST {base}/chat/completions`, `{ model, temperature: 0, messages: [system, user with text and optional image_url] }`, response `choices[0].message.content`. Key required. Pay per token. Docs: https://docs.nebius.com
- Anthropic Messages API, optional alternative. Docs: https://docs.claude.com
- Vercel hosting, Hobby plan. Rate limiting: one Vercel WAF rate-limit rule (Hobby allows one per project), path `/api/read`, method POST, fixed window 60s, 10 requests per IP, default 429 action. Configured in the dashboard, no code. Docs: https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting

## Important Failure Modes
- **Model call fails or times out** → labeled template reading from measured colors and the person's words; provider line reads "fallback template."
- **Model ignores rule 4** → route overrides colors with the measured palette and fills `holdNote`; the person sees the refusal regardless.
- **Public link spends a paid key under load** → firewall rule throttles per IP before the route runs; demo mode costs nothing.
- **Rate limit hit** → firewall returns a non-JSON 429; the UI checks status before parsing and shows "Give it a minute."

## What Was Simplified and Why
- **Keyword screens** instead of classifiers: deterministic, testable, and honest about being a floor; a classifier would add a model call to the thing meant to run before model calls.
- **Server-side override of colors** instead of re-prompting the model when it drifts: one call, no loop, and the measured palette is the evidence anyway.
- **Firewall rule** instead of an in-app limiter: serverless instances do not share memory, so an in-app counter would leak; a store like Redis is more to run than the problem warrants.
- **No storage** instead of a history feature: the honesty claim depends on it.

## Decisions and Open Issues
- Learner choice: hold steady becomes enforcement. Tradeoff accepted: a keyword floor misses phrasings a classifier would catch.
- Learner choice: deploy on Nebius from day one. Tradeoff: Nebius signup and model verification become the critical path for the Oct 26 entry too.
- Learner choice: no face-reading demo. Tradeoff: the most visually dramatic refusal stays off camera.
- Rate limiting via Vercel WAF on Hobby. Tradeoff: counters are per region and the rule lives in the dashboard, not the repo; the README documents it.
- Investigation during build: confirm image input on Nemotron 3.5 Super VL with one request; evidence is the receipt showing the model name on a photo-only reading.
- Open: the Sept 26 drafts in `app/docs/` predate this workspace; recommended to keep as evidence of plan-first work.
