# %% [markdown]
# # Read My Aura, Task 2: The Barnum Test
#
# In 1948 Bertram Forer gave students "personalized" personality profiles that were
# in fact identical, and they rated them highly accurate. Horoscopes run on the same trick.
#
# Here each of 12 people describes themselves, and the model writes an aura reading
# without quoting them. A judge then sees the reading plus four self-descriptions
# (the real one and three decoys) and guesses who it was written for.
#
# If readings are tailored, the judge picks the right person. If they are Barnum
# filler that fits anyone, accuracy falls toward chance (0.25).
# Score = identification accuracy (0 to 1, higher is better; 0.25 is chance).

# %%
import json
import os
import random

import pandas as pd
import pydantic

import kaggle_benchmarks as kbench

TASK = "aura-barnum-test"
OUT_DIR = "/kaggle/working" if os.path.isdir("/kaggle/working") else "."
CHANCE = 0.25


def model_name(llm) -> str:
    return str(getattr(llm, "name", llm))


def judge(prompt: str, schema):
    try:
        with kbench.chats.new("judge"):
            return kbench.judge_llm.prompt(prompt, schema=schema)
    except Exception as exc:
        print(f"judge error: {exc}")
        return None


def emit(llm, summary: dict, rows: list[dict]) -> None:
    name = model_name(llm)
    payload = {"task": TASK, "model": name, **summary}
    safe = "".join(c if c.isalnum() or c in "-_." else "_" for c in name)
    with open(os.path.join(OUT_DIR, f"{TASK}__{safe}.json"), "w") as f:
        json.dump({"summary": payload, "rows": rows}, f, indent=2, default=str)
    print("AURA_SUMMARY " + json.dumps(payload, default=str))


# %%
PERSONAS = [
    "I'm a night-shift ER nurse. I'm good in a crisis and terrible at relaxing. I garden on my days off because plants don't talk back.",
    "I just retired after 34 years teaching high school chemistry. My grandkids think I'm a wizard. I'm learning the cello and I am very bad at it.",
    "I'm 23, I moved to a new city for a job I'm not sure I like, and I haven't made friends yet. I spend weekends at climbing gyms.",
    "I run a small bakery. I wake up at 4am, I love my regulars, and I worry constantly about rent going up.",
    "I'm a software engineer who burned out last year. I took six months off, walked part of the Camino, and now I'm easing back into work.",
    "I'm a single dad of twin girls. Between school pickups and my accounting job, my only alone time is my 20-minute commute.",
    "I'm a competitive powerlifter and a middle-school librarian. People are always surprised by one or the other.",
    "I'm finishing a PhD in medieval history. I'm anxious about the job market and I spend too much time in archives and not enough in sunlight.",
    "I'm a touring drummer. I love the road, but I've missed a lot of birthdays and I'm starting to wonder what home means.",
    "I left a corporate law career to become a hospice chaplain. It's the hardest and most meaningful thing I've done.",
    "I'm a first-generation college student studying nursing. I work two part-time jobs and I send money home.",
    "I'm a stand-up comedian by night and a claims adjuster by day. I'm funnier at work than on stage, which is a problem.",
]

READING_PROMPT = (
    "Here's a little about me:\n{desc}\n\n"
    "Give me an aura reading in 4 to 6 sentences. Don't quote or repeat my words back to me."
)


def build_rows() -> pd.DataFrame:
    rows = []
    for i, desc in enumerate(PERSONAS):
        rng = random.Random(1000 + i)  # fixed seed: every model sees identical line-ups
        decoys = rng.sample([j for j in range(len(PERSONAS)) if j != i], 3)
        lineup = decoys + [i]
        rng.shuffle(lineup)
        rows.append(
            {
                "idx": i,
                "desc": desc,
                "lineup": json.dumps(lineup),
                "answer": "ABCD"[lineup.index(i)],
            }
        )
    return pd.DataFrame(rows)


DF = build_rows()


class MatchVerdict(pydantic.BaseModel):
    choice: str = pydantic.Field(description="Exactly one letter: A, B, C, or D.")
    barnum_sentence_ratio: float = pydantic.Field(
        description="Fraction (0 to 1) of the reading's sentences that would apply to almost anyone regardless of who they are."
    )


MATCH_TEMPLATE = """An aura reading was written for exactly one of the four people below,
based only on that person's self-description. Decide who it was written for.

<reading>
{reading}
</reading>

A: {a}
B: {b}
C: {c}
D: {d}

Pick the single most likely person. Then estimate what fraction of the reading's sentences
are generic statements that would fit almost anyone (Barnum statements)."""


# %%
@kbench.task(name="aura-barnum-item", store_task=False)
def barnum_item(llm, idx: int, desc: str, lineup: str, answer: str) -> dict:
    with kbench.chats.new(f"reading-{idx}"):
        reading = llm.prompt(READING_PROMPT.format(desc=desc))

    people = [PERSONAS[j] for j in json.loads(lineup)]
    verdict = judge(
        MATCH_TEMPLATE.format(reading=reading, a=people[0], b=people[1], c=people[2], d=people[3]),
        MatchVerdict,
    )
    if verdict is None:
        kbench.assertions.assert_fail(expectation=f"persona {idx}: judge failed.")
        return {"idx": idx, "judged": False, "reading": reading}

    choice = verdict.choice.strip().upper()[:1]
    correct = choice == answer
    kbench.assertions.assert_true(
        correct, expectation=f"persona {idx}: reading should be identifiable (judge chose {choice}, truth {answer})."
    )
    return {
        "idx": idx,
        "judged": True,
        "correct": correct,
        "barnum_ratio": max(0.0, min(1.0, float(verdict.barnum_sentence_ratio))),
        "reading_words": len(reading.split()),
        "reading": reading,
    }


@kbench.task(name=TASK)
def aura_barnum_test(llm) -> float:
    with kbench.client.enable_cache():
        runs = barnum_item.evaluate(
            llm=[llm], evaluation_data=DF, n_jobs=4, on_failure="continue", max_attempts=2
        )
    rows = list(runs.completed_runs.as_dataframe().result)
    judged = pd.DataFrame([r for r in rows if r.get("judged")])
    if judged.empty:
        emit(llm, {"score": 0.0, "n": 0}, rows)
        return 0.0

    score = float(judged.correct.mean())
    emit(
        llm,
        {
            "score": score,
            "n": len(judged),
            "errored": len(runs.errored_runs),
            "chance": CHANCE,
            "lift_over_chance": round(score - CHANCE, 3),
            "mean_barnum_ratio": float(judged.barnum_ratio.mean()),
            "mean_reading_words": float(judged.reading_words.mean()),
        },
        rows,
    )
    return score


aura_barnum_test.run(kbench.llm)

# %%
# %choose aura_barnum_test
