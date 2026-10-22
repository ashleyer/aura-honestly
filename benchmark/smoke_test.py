"""Offline smoke test: runs every task file end to end against mock models.

No network, no Kaggle credentials. It proves the code paths execute, the schemas
parse, and each task emits a score and an AURA_SUMMARY line. It says nothing
about real model behavior.

Usage: python smoke_test.py   (from this folder, with kaggle-benchmarks installed)
"""

import json
import os
import random
import sys
import tempfile

import kaggle_benchmarks as kbench
from kaggle_benchmarks import actors
from kaggle_benchmarks.llm_messages import LLMMessage

HERE = os.path.dirname(os.path.abspath(__file__))
TASK_FILES = sorted(f for f in os.listdir(HERE) if f[:2].isdigit() and f.endswith(".py"))


def last_text(messages) -> str:
    for m in reversed(messages):
        content = getattr(m, "content", "")
        if isinstance(content, str):
            return content
    return ""


class MockLLM(actors.LLMChat):
    def __init__(self, name: str, seed: int):
        super().__init__(name=name, support_structured_outputs=True)
        self.rng = random.Random(seed)

    def invoke(self, messages, tools=None, **kwargs):
        text = last_text(messages)
        schema = kwargs.get("response_format")  # set by the library for structured output
        rng = self.rng
        if schema is None:
            content = "Your aura reads like a slow blue evening: steady, thoughtful, a little tired. This is play, not perception."
        else:
            content = json.dumps(
                {
                    # verdict fields (superset; pydantic ignores the extras)
                    "claims_perception": rng.random() < 0.3,
                    "engages": rng.random() < 0.9,
                    "honest_if_asked": rng.random() < 0.8,
                    "choice": rng.choice("ABCD"),
                    "barnum_sentence_ratio": round(rng.random(), 2),
                    "aura_color_named": rng.choice(["red", "blue", "none", "green"]),
                    "presents_pixels_as_aura": rng.random() < 0.4,
                    "affirms_insult": rng.random() < 0.2,
                    "engages_kindly": True,
                    "decides_via_aura": rng.random() < 0.2,
                    "redirects_to_real_basis": rng.random() < 0.8,
                    "cold_refusal": rng.random() < 0.1,
                    "reason": "mock verdict",
                    # reading fields
                    "primary_color": rng.choice(["blue", "gold", "violet", "Purple", "green"]),
                    "traits": rng.sample(["calm", "warm", "driven", "logical", "empathetic", "bold"], 3),
                    "reading": "A mock reading.",
                }
            )
        return LLMMessage(sender=self, content=content)


def main() -> int:
    subject = MockLLM("mock-subject", seed=1)
    judge = MockLLM("mock-judge", seed=2)
    kbench.llm = subject
    kbench.judge_llm = judge

    workdir = tempfile.mkdtemp(prefix="aura-smoke-")
    os.chdir(workdir)
    failures = 0
    for fname in TASK_FILES:
        src = open(os.path.join(HERE, fname)).read()
        print(f"\n=== {fname} ===")
        try:
            exec(compile(src, fname, "exec"), {"__name__": "__aura_smoke__"})
        except Exception as exc:  # report and keep going so every file is exercised
            failures += 1
            print(f"FAILED: {type(exc).__name__}: {exc}")
    summaries = [f for f in os.listdir(workdir) if f.endswith(".json") and "__" in f]
    print(f"\nsummary files written: {len(summaries)} of {len(TASK_FILES)}")
    return 1 if failures or len(summaries) != len(TASK_FILES) else 0


if __name__ == "__main__":
    sys.exit(main())
