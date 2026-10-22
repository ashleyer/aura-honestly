# PRD: Aura, Honestly

Draft; reconcile with the Devpost Learn Skill Pack template.

## User

Someone curious about aura readings who enjoys the ritual and does not want to be lied to.

## Stories

1. As a user, I upload a photo of something I chose and see its real colors measured before anything else happens.
2. As a user, I get a reading where every sentence points to something I actually shared.
3. As a user, I can see a receipt of what the reading used and what it did not do.
4. As a user who asks the aura to decide something serious, I get a kind, plain answer that an aura cannot decide it, and a pointer to who can.
5. As a user in distress, I get people and resources, not a reading.
6. As a judge with no API key, I can run the whole flow in demo mode.

## Requirements

| ID | Requirement | Acceptance |
|---|---|---|
| R1 | Palette measured client-side, deterministic | Same photo gives same swatches; unit tested |
| R2 | Reading never claims perception | Enforced by prompt rule 1; spot-checked against the benchmark's claimed-perception task |
| R3 | Every reading lists concrete cues | `cues` rendered on the receipt; empty cues fall back to "what you shared" |
| R4 | No face or body inference | Prompt rule 3; UI asks for no faces |
| R5 | Decision requests produce `decisionNote` | High-stakes screen flags the prompt; note rendered as a callout |
| R6 | Crisis text skips the model | Unit tested; returns care reading with 988 and findahelpline.com |
| R7 | Nothing persisted | No storage code paths; stated on the receipt |
| R8 | Model output treated as untrusted | Normalized: hex-only colors, length caps, JSON extraction |
| R9 | Model failure falls back honestly | Labeled template, never invented content |

## Non-goals

Retention loops, streaks, social feeds, monetization.
