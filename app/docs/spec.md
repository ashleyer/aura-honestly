# Technical spec

Draft; reconcile with the Devpost Learn Skill Pack template.

## Architecture

```
Browser                                   Server (Next.js route, Node)
-------                                   ---------------------------
file -> createImageBitmap                 POST /api/read
     -> 1024px JPEG data URL  ----------> validate: JSON, type, size caps
     -> 64px canvas -> k-means palette    crisis screen  -> care reading (no model)
text (<= 1200 chars) ------------------>  high-stakes screen -> flag into prompt
                                          provider: anthropic | openai-compatible | demo
                                          extractJson -> normalizeReading
UI: orb + reading + receipt  <----------  Reading JSON (mode, provider)
```

## Files

| Path | Role |
|---|---|
| `lib/palette.ts` | Downscale, k-means palette (luminance-sorted deterministic seeding) |
| `lib/guards.ts` | Crisis and high-stakes keyword screens, care reading |
| `lib/prompt.ts` | System prompt (six rules), user prompt builder |
| `lib/providers.ts` | Fetch-based Anthropic and OpenAI-compatible calls, 45 s timeout |
| `lib/schema.ts` | Types, JSON extraction, output normalization |
| `lib/demo.ts` | Deterministic labeled template reading |
| `app/api/read/route.ts` | Request validation, orchestration, honest fallback |
| `components/AuraApp.tsx` | Single-page UI, accessible form and live result region |

## Contract

Request: `{ text?: string, imageDataUrl?: "data:image/(jpeg|png|webp);base64,...", palette?: string[] }`

Response: `{ auraName, colors[], reading, cues[], question, decisionNote, mode: "model"|"demo"|"care", provider }`

Errors: 400 for bad input, 413 for oversized images. Model failures return 200 with a labeled demo reading.

## Security and privacy

No storage, no logging of content (only error messages), `cache-control: no-store`, image type allowlist, size ceilings, model output never rendered as HTML.

## Tests

`npm test` covers the screens (including word-boundary false positives), JSON extraction, normalization, demo determinism, and palette ordering.
