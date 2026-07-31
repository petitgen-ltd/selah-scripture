"""Build notebook.ipynb — the Selah engine, end-to-end, demo-mode by default."""
import json

cells = []
def md(s): cells.append(("markdown", s))
def code(s): cells.append(("code", s))

md("""# Selah — Scripture at the right physiological moment
### The engine, end-to-end · YouVersion Platform API + Gloo AI Studio API

Every second of a workout, Selah turns a biometric stream into a Scripture delivery:

> **sense** the physiological moment → **discern** the verse built for it (YouVersion) →
> **deliver** one personal line in the moment's native format (Gloo AI).

This notebook runs the whole pipeline. **Demo mode is ON by default — no keys needed.**
Add your hackathon keys and set `DEMO_MODE = False` to run against the live APIs.""")

code('''# ═══ 1 · Config ═══════════════════════════════════════════════════════
YOUVERSION_API_KEY = ""     # 🔑 paste your YouVersion Platform key
GLOO_AI_API_KEY    = ""     # 🔑 paste your Gloo AI Studio key
DEMO_MODE          = True   # 🔑 set False once both keys are in

YOUVERSION_API_BASE = "https://api.youversion.com/v1"
GLOO_AI_API_BASE    = "https://api.gloo.ai/studio/v1"
print("Selah · DEMO MODE" if DEMO_MODE else "Selah · LIVE MODE (YouVersion + Gloo)")''')

code('''# ═══ 2 · Imports & data ═══════════════════════════════════════════════
import pandas as pd, numpy as np, textwrap, json
try:
    import requests
except ImportError:
    requests = None

# Kaggle attaches the competition data at /kaggle/input; fall back to local.
import os
def _find(name):
    for p in [f"/kaggle/input/scripture-in-new-frontiers/{name}", name]:
        if os.path.exists(p): return p
    return name
bio = pd.read_csv(_find("biometric movements.csv"))
vmap = pd.read_csv(_find("verse movement mapping.csv"))
print(f"{len(bio)} biometric snapshots · {bio.session_id.nunique()} sessions · "
      f"{bio.moment_type.nunique()} moment types")
bio.head()''')

md("""## Sense — a moment classifier trained on the body

Detection has to run on-device and never fire at the wrong moment, so the model is
small and anchored on the provided sessions: given heart-rate, zone, effort, recovery
and stress, name the *physiological moment*.""")

code('''# ═══ 3 · Train the moment classifier ══════════════════════════════════
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import cross_val_score

FEATURES = ["heart_rate", "hr_zone", "effort_pct", "recovery_score", "stress_index"]
X, y = bio[FEATURES], bio["moment_type"]

clf = RandomForestClassifier(n_estimators=200, max_depth=6, random_state=7)
scores = cross_val_score(clf, X, y, cv=5)
clf.fit(X, y)
print(f"5-fold accuracy: {scores.mean():.2f} ± {scores.std():.2f}")
print("\\nWhat the body tells the model (feature importance):")
for f, imp in sorted(zip(FEATURES, clf.feature_importances_), key=lambda t:-t[1]):
    print(f"  {f:15s} {imp:.2f}")

def classify_moment(hr, zone, effort, recovery, stress):
    row = pd.DataFrame([[hr, zone, effort, recovery, stress]], columns=FEATURES)
    return clf.predict(row)[0]''')

md("""## Discern — the verse for the moment, from YouVersion

Each moment maps to Scripture built for it. Verse text and translation come **live from
the YouVersion Platform API** (2,000+ languages) — in demo mode we serve a local mirror
so the notebook runs anywhere.""")

code('''# ═══ 4 · Moment → verse, and YouVersion retrieval ═════════════════════
# The map extends the hackathon's verse movement mapping.
MOMENT_VERSE = {
    "pre_workout":       ("PSA.118.24", "rejoice"),
    "early_push":        ("JOS.1.9",    "courage"),
    "steady_state":      ("PSA.23.4",   "presence"),
    "breakthrough_wall": ("PHI.4.13",   "strength"),
    "peak_effort":       ("ISA.40.31",  "endurance"),
    "final_rep":         ("2CO.12.9",   "grace"),
    "finishing_strong":  ("GAL.6.9",    "perseverance"),
    "recovery_window":   ("PSA.46.10",  "peace"),
    "post_workout":      ("1CO.9.24",   "the prize"),
}
DEMO_VERSES = {  # local mirror for demo mode (NIV)
 "PSA.118.24":"This is the day the LORD has made; let us rejoice and be glad in it.",
 "JOS.1.9":"Be strong and courageous. Do not be afraid; the LORD your God will be with you wherever you go.",
 "PSA.23.4":"Even though I walk through the darkest valley, I will fear no evil, for you are with me.",
 "PHI.4.13":"I can do all this through him who gives me strength.",
 "ISA.40.31":"Those who hope in the LORD will renew their strength. They will run and not grow weary.",
 "2CO.12.9":"My grace is sufficient for you, for my power is made perfect in weakness.",
 "GAL.6.9":"Let us not become weary in doing good, for at the proper time we will reap a harvest if we do not give up.",
 "PSA.46.10":"Be still, and know that I am God.",
 "1CO.9.24":"Run in such a way as to get the prize.",
}

def get_verse(ref, translation="NIV", language="en"):
    """Retrieve verse text. LIVE: YouVersion Platform API. DEMO: local mirror."""
    if DEMO_MODE or requests is None:
        return {"reference": ref, "text": DEMO_VERSES.get(ref, ""), "translation": translation}
    r = requests.get(f"{YOUVERSION_API_BASE}/verses/{ref}",
                     headers={"Authorization": f"Bearer {YOUVERSION_API_KEY}",
                              "Accept": "application/json"},
                     params={"translation": translation, "language": language}, timeout=10)
    r.raise_for_status()
    d = r.json()
    return {"reference": ref, "text": d.get("text", ""), "translation": translation}''')

md("""## Deliver — one personal line from Gloo, in the moment's native format

A faith-tuned model shapes a short encouragement for *this* runner, *this* moment —
pastoral, never generic. The wearable delivers it the way a watch would: a haptic pulse
and a line at peak effort; an ambient glow in recovery.""")

code('''# ═══ 5 · Gloo personalization + delivery format ═══════════════════════
DELIVERY = {  # how a watch speaks at each moment
 "peak_effort":"haptic pulse + display", "breakthrough_wall":"haptic pulse + audio",
 "final_rep":"haptic pulse + display", "finishing_strong":"haptic pulse + display",
 "steady_state":"ambient display", "early_push":"display", "pre_workout":"gentle display",
 "recovery_window":"ambient glow", "post_workout":"ambient glow",
}
DEMO_NOTES = {
 "breakthrough_wall":"This is the wall. You were built to go through it.",
 "peak_effort":"Right here, at the top — new strength. Keep running.",
 "finishing_strong":"The last mile is the offering. Don't give up now.",
 "recovery_window":"Be still. You did enough.", "post_workout":"You ran your race today. Well done.",
}
def personalize(moment, verse, name="runner"):
    """One short line. LIVE: Gloo AI Studio. DEMO: pastoral template."""
    if DEMO_MODE or requests is None:
        return DEMO_NOTES.get(moment, "Keep going — He's with you.")
    prompt = (f"In one short, warm sentence a runner can read at a glance during "
              f"'{moment.replace('_',' ')}', encourage {name} with this verse: "
              f"\\"{verse['text']}\\" ({verse['reference']}). Pastoral, no preamble.")
    r = requests.post(f"{GLOO_AI_API_BASE}/chat/completions",
                      headers={"Authorization": f"Bearer {GLOO_AI_API_KEY}",
                               "Content-Type": "application/json"},
                      json={"messages":[{"role":"user","content":prompt}], "max_tokens":40},
                      timeout=15)
    r.raise_for_status()
    return r.json()["choices"][0]["message"]["content"].strip()

def deliver(snapshot, name="Morgan", translation="NIV", language="en"):
    """The full loop, once per snapshot."""
    m = classify_moment(snapshot.heart_rate, snapshot.hr_zone, snapshot.effort_pct,
                        snapshot.recovery_score, snapshot.stress_index)
    ref, theme = MOMENT_VERSE.get(m, ("PHI.4.13","strength"))
    verse = get_verse(ref, translation, language)
    note  = personalize(m, verse, name)
    return {"moment": m, "theme": theme, "reference": verse["reference"],
            "verse": verse["text"], "note": note, "format": DELIVERY.get(m,"display"),
            "hr": snapshot.heart_rate, "minute": snapshot.session_minute}''')

md("## Run a full session\nWatch Selah move through a real run, moment by moment.")

code('''# ═══ 6 · One session, delivered ═══════════════════════════════════════
session = bio[bio.session_id == "S001"]
for _, snap in session.iterrows():
    d = deliver(snap)
    print(f"[{d['minute']:>2}m · {d['hr']:>3}bpm · {d['moment']:<17}] "
          f"{d['reference']:<11} — {d['format']}")
    print(f"        “{d['verse']}”")
    print(f"        › {d['note']}\\n")''')

md("## See it — the run, with Scripture landing on it\nThe heart-rate curve of the run, with each verse delivery marked at the moment it fired.")

code('''# ═══ 7 · Visualize deliveries on the effort curve ═════════════════════
import matplotlib.pyplot as plt
s = bio[bio.session_id=="S001"].reset_index(drop=True)
fig, ax = plt.subplots(figsize=(11,4.2))
ax.plot(s.session_minute, s.heart_rate, color="#38e1c0", lw=2.2, zorder=2)
ax.fill_between(s.session_minute, s.heart_rate, s.heart_rate.min()-8,
                color="#38e1c0", alpha=.08, zorder=1)
COLORS={"peak_effort":"#ff7a1a","breakthrough_wall":"#3d5bff","finishing_strong":"#f5a623",
        "steady_state":"#14b8a6","pre_workout":"#e0729a","post_workout":"#37c98a"}
for _, r in s.iterrows():
    d = deliver(r)
    ax.scatter(r.session_minute, r.heart_rate, s=90, zorder=3,
               color=COLORS.get(d["moment"], "#888"), edgecolors="#0a0c10", linewidths=1.5)
    ax.annotate(d["reference"].split(".")[0], (r.session_minute, r.heart_rate),
                textcoords="offset points", xytext=(0,10), ha="center",
                fontsize=8, color="#aab2bd")
ax.set_facecolor("#0a0c10"); fig.patch.set_facecolor("#0a0c10")
ax.set_title("Selah — Scripture delivered across one run", color="#eef1f5", loc="left", fontsize=13)
ax.set_xlabel("minute", color="#9aa3b0"); ax.set_ylabel("heart rate (bpm)", color="#9aa3b0")
ax.tick_params(colors="#5d6672"); [ax.spines[k].set_visible(False) for k in ("top","right")]
[ax.spines[k].set_color("#2a2f38") for k in ("left","bottom")]
plt.tight_layout(); plt.show()''')

md("""---
**Selah** — Scripture that meets you at the wall, the peak, and the quiet after.
Built with the YouVersion Platform API and the Gloo AI Studio API.
Live demo + writeup + video in the submission.""")

# emit ipynb
nb = {"cells": [], "metadata": {"kernelspec": {"name":"python3","display_name":"Python 3"},
      "language_info": {"name":"python"}}, "nbformat": 4, "nbformat_minor": 5}
for kind, src in cells:
    c = {"cell_type": kind, "metadata": {}, "source": src.splitlines(keepends=True)}
    if kind == "code": c["outputs"] = []; c["execution_count"] = None
    nb["cells"].append(c)
json.dump(nb, open("notebook.ipynb","w"), indent=1)
print("wrote notebook.ipynb with", len(cells), "cells")
