# Read My Aura: a Kaggle benchmark

Six tasks that measure how language models behave when asked to do something they cannot do: read an aura. There is no ground truth, so every task measures behavior instead of accuracy.

| # | Task slug | Question | Score (higher is better) |
|---|---|---|---|
| 1 | `aura-claimed-perception` | Does it claim to perceive what it can't, or refuse coldly instead of playing honestly? | share honest and engaged |
| 2 | `aura-barnum-test` | Is the reading tailored, or horoscope filler that fits anyone? | identification accuracy, chance 0.25 |
| 3 | `aura-name-swap` | Same words, different first name: does the aura change? | cross-name consistency |
| 4 | `aura-tint-test` | Does a vision model pass off the background color as your aura? | share honest about the pixels |
| 5 | `aura-sycophancy` | Does the reading bend to what you hope, or fear, is true? | share holding steady |
| 6 | `aura-high-stakes` | Will it let an aura make a medical, money, or relationship decision? | share safe and still helpful |

Each file is a self-contained Kaggle task in jupytext percent format. The leaderboard allows one task per notebook, so each file is its own task; group all six into one benchmark in the Kaggle web UI.

## Run it

Option A, in the browser: open https://www.kaggle.com/benchmarks/tasks/new, paste one file's contents into the notebook, uncomment the last line so it reads `%choose <task_function>`, and Save Version. Repeat for the other five. Then use "Evaluate More Models" on each task page.

Option B, from a terminal with the Kaggle CLI:

```bash
pip install kaggle kaggle-benchmarks
kaggle b init -y                     # writes short-lived model-proxy credentials to .env
python 01_claimed_perception.py      # local validation against the default model
kaggle b t push aura-claimed-perception -f 01_claimed_perception.py --wait
kaggle b t models                    # see the current model lineup
kaggle b t run aura-claimed-perception -m <model> -m <model> --wait
```

Repeat push and run for each file. Then create the benchmark (the collection of six tasks) in the Kaggle web UI; the CLI manages tasks only.

After the first push, open the task page and confirm a leaderboard score appears. The `# %choose` line relies on jupytext restoring it as a magic when the file becomes a notebook; if no score shows, open the backing notebook, make that last cell a bare `%choose <task_function>`, and save a new version.

## Collect results

```bash
mkdir -p logs
for t in aura-claimed-perception aura-barnum-test aura-name-swap aura-tint-test aura-sycophancy aura-high-stakes; do
  kaggle b t log "$t" > "logs/$t.txt"
done
python analyze.py logs/
```

This writes `aura_results.md` (main table plus per-task diagnostics), `aura_results.csv`, and `aura_heatmap.png` for the post.

## Test offline

`python smoke_test.py` runs all six tasks against mock models. It proves the code executes and emits summaries; it says nothing about real models.

## Method notes

- Temperature 0 everywhere (library default), so the name swap isolates the name.
- Judgments come from Kaggle's configured judge model, always in an isolated chat so it never sees the subject's history. If a subject model is also the judge model, flag that row in the write-up: self-preference is a known bias.
- Judge failures are counted as errors, never silently scored.
- Before publishing, hand-check about 10 percent of judged items (the per-item JSON files carry the full responses and the judge's one-line reason) and report agreement.
- The name swap uses first names as a proxy for gender and ethnicity. That proxy is imperfect; the task measures what the model does with a name, not who anyone is.
- The tint test uses a drawn silhouette, not a photo of a real person, so no biometric data is involved.

License: Apache-2.0.
