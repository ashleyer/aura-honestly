# Hackathon plan

Research date: September 26, 2026. Re-verify each page before submitting; rules change.

## Entry 1: Kaggle Benchmarking Challenge (DEV), due Oct 11, 11:59 PM PDT

Deliverables: `benchmark/` (six tasks, smoke test, analysis) and `post/dev-post.md`.

- Sept 27 to 29: push and run all six tasks; hand-check about 10 percent of judged items
- Sept 30 to Oct 3: analyze, fill the post, cut the heatmap
- By Oct 8: publish, leaving slack for fixes

## The app: Aura, Honestly

One codebase, contest-specific extras added on top, each disclosed in that contest's write-up.

| Contest | Deadline | Fit | What the app needs for it |
|---|---|---|---|
| [Build With AI: Basics](https://learn-ai-basics.devpost.com/) (Devpost) | Oct 26, 5:00 PM EDT | Best | Repo started from an empty folder in the submission window (it was, Sept 26). Uses Devpost's Learn Skill Pack with a coding agent; the repo must include the pack's `scope.md`, `prd.md`, and `spec.md`. The drafts in `app/docs/` are starting points; regenerate or reconcile them with the actual pack before submitting. Demo video under 3 minutes. |
| [DEV Hacktoberfest Open-Source AI Challenge](https://dev.to/challenges/hacktoberfest-week1-2026-10-05) | Weekly, Oct 5 to 31 | Likely | Prompts post Oct 1. Likely favors open-weight models: switch to `openai-compatible` with an open model. |
| [Nebius x NVIDIA Global AI Hackathon](https://nebiusglobalaihackathon.devpost.com/) | Oct 30, 10:00 AM PDT | Good, biggest prize | Must run on Nebius Token Factory or Nebius AI Cloud with at least one NVIDIA open model (Nemotron; a vision variant to read photos). Set `OPENAI_COMPAT_BASE_URL` to the Token Factory endpoint. Public repo with MIT license (done). Enter "Best Apps and Agents." |
| [OpenCV AI Competition 2026](https://opencv26.devpost.com/) | Oct 26, 11:45 PM PDT | Stretch | OpenCV 5 used substantively plus a meaningful AWS component: move palette extraction and add texture or light analysis in an OpenCV Lambda. About a day. |
| [DEV Sanity Challenge](https://dev.to/challenges/sanity-2026-09-16) | Oct 4 | Optional sprint | Next.js plus Sanity backend; archetypes and copy would live in Sanity. Tight. |

No rule found that forbids entering one project in several contests, but Galuxium, OpenCV, and the DEV challenges were not confirmed. Check each before submitting.

Shared requirements the app already meets: fresh repo, MIT license, Vercel-ready, swappable model layer, demo mode for zero-setup judging. Still to do: public GitHub repo, live Vercel URL, demo video, rate limiting before any public link spends a paid key.
