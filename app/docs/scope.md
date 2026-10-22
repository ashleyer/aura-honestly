# Scope

Draft for the Build With AI: Basics submission. Reconcile with the Devpost Learn Skill Pack's own template before submitting.

## Problem

Aura and vibe apps are popular and dishonest by design: they claim to perceive energy, generate horoscope filler that fits anyone, and, when built on general AI models, can drift into reading faces, flattering users, or weighing in on real decisions. A benchmark run for this project measured those failures directly.

## In scope

- One-screen web app: photo and/or a few words in, aura reading out
- Browser-side palette measurement shown before any AI runs
- A reader prompt with six enforced rules (no claimed perception, no filler, no body reading, hold steady, no decisions, grounded voice)
- A receipt listing exactly what the reading used and what it did not do
- Crisis and high-stakes screens that run before any model call
- Swappable providers (Anthropic, any OpenAI-compatible endpoint, keyless demo)

## Out of scope

- Accounts, history, storage of any kind
- Reading faces, bodies, or any demographic attribute
- Social sharing feeds, streaks, or engagement mechanics
- Any claim that auras are real

## Success looks like

A stranger gets a reading in under 15 seconds, recognizes their own details in it, and can see on the receipt that nothing mystical happened.
