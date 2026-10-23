# Aura, Honestly

An aura reader that refuses to lie to you.

Show it a photo you chose and a few words about your day. It measures the real colors in your pixels before any AI runs, reads only what you shared, and declines, in code rather than by request, to claim it can see energy, read your face, agree because you asked, or decide something real for you. A receipt lists what it used and what it refused to do.

- `app/` The Next.js app. Start with `app/README.md`. Runs keyless in demo mode; on the live site it reads with NVIDIA Nemotron 3.5 Super VL through Nebius Token Factory.
- `devpost/` Scope, PRD, spec, and build checklist, written with the Devpost Learn skill pack.
- `benchmark/` Read My Aura, the six-task Kaggle benchmark that measured each failure the app guards against across twelve models.
- `post/` The write-up of the benchmark findings.

The app code was started Sept 26, 2026; the hold-steady guard and Devpost planning docs were added Oct 22.

MIT license.
