"""Collect results from all six Read My Aura tasks into one table and one chart.

Feed it any mix of:
  * the per-model JSON files the tasks write ("<task>__<model>.json"), e.g. from
    `kaggle b t download <task> -o results/`
  * saved logs containing AURA_SUMMARY lines, e.g. `kaggle b t log <task> > logs/<task>.txt`

Usage: python analyze.py results/ logs/  ->  writes aura_results.md, aura_results.csv, aura_heatmap.png
"""

import json
import os
import sys

import pandas as pd

TASK_ORDER = [
    ("aura-claimed-perception", "Honest perception"),
    ("aura-barnum-test", "Specificity (chance .25)"),
    ("aura-name-swap", "Name-swap consistency"),
    ("aura-tint-test", "Tint honesty (vision)"),
    ("aura-sycophancy", "Holds steady"),
    ("aura-high-stakes", "High-stakes safety"),
]


def collect(paths: list[str]) -> list[dict]:
    found = {}
    for root in paths:
        for dirpath, _, files in os.walk(root):
            for f in files:
                p = os.path.join(dirpath, f)
                try:
                    if f.endswith(".json") and "__" in f:
                        s = json.load(open(p)).get("summary")
                        if s and "task" in s:
                            found[(s["task"], s["model"])] = s
                    elif f.endswith((".txt", ".log")):
                        for line in open(p, errors="ignore"):
                            if "AURA_SUMMARY " in line:
                                s = json.loads(line.split("AURA_SUMMARY ", 1)[1])
                                found[(s["task"], s["model"])] = s
                except (OSError, ValueError):
                    continue
    return list(found.values())


def main(paths: list[str]) -> None:
    summaries = collect(paths or ["."])
    if not summaries:
        sys.exit("No results found.")
    df = pd.DataFrame(summaries)
    df.to_csv("aura_results.csv", index=False)

    table = df.pivot_table(index="model", columns="task", values="score")
    cols = [t for t, _ in TASK_ORDER if t in table.columns]
    table = table[cols].rename(columns=dict(TASK_ORDER))
    table["Mean"] = table.mean(axis=1)
    table = table.sort_values("Mean", ascending=False).round(2)

    with open("aura_results.md", "w") as f:
        f.write(table.to_markdown())
        f.write("\n\nDiagnostics per task:\n\n")
        for task, label in TASK_ORDER:
            sub = df[df.task == task].drop(columns=["task"], errors="ignore").set_index("model")
            sub = sub.drop(columns=[c for c in sub.columns if sub[c].map(lambda v: isinstance(v, dict)).any()])
            if not sub.empty:
                f.write(f"### {label}\n\n{sub.round(3).to_markdown()}\n\n")
    print(table.to_string())

    try:
        import matplotlib

        matplotlib.use("Agg")
        import matplotlib.pyplot as plt

        fig, ax = plt.subplots(figsize=(1.6 * len(table.columns) + 3, 0.5 * len(table) + 2))
        im = ax.imshow(table.values, cmap="viridis", vmin=0, vmax=1, aspect="auto")
        ax.set_xticks(range(len(table.columns)), table.columns, rotation=30, ha="right")
        ax.set_yticks(range(len(table.index)), table.index)
        for (i, j), v in pd.DataFrame(table.values).stack().items():
            ax.text(j, i, f"{v:.2f}", ha="center", va="center", color="white" if v < 0.6 else "black", fontsize=9)
        fig.colorbar(im, ax=ax, fraction=0.03)
        ax.set_title("Read My Aura: higher is more honest, specific, fair, and safe")
        fig.tight_layout()
        fig.savefig("aura_heatmap.png", dpi=200)
    except ImportError:
        print("matplotlib not installed; skipped the chart.")


if __name__ == "__main__":
    main(sys.argv[1:])
