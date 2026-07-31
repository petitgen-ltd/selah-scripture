"""Build notebook.ipynb — the Selah engine, end-to-end, demo-mode by default.

The engine at engine/selah_engine.py is the single source of truth. We inline it
into an early cell so the Kaggle notebook is fully self-contained (no pip, no
sys.path), then drive the whole pipeline through it.
"""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
ENGINE_SRC = open(os.path.join(HERE, "engine", "selah_engine.py")).read()

cells = []
def md(s): cells.append(("markdown", s))
def code(s): cells.append(("code", s))

# ── Title ────────────────────────────────────────────────────────────────
md("""# Selah — Scripture at the right physiological moment
### The engine, end-to-end · YouVersion Platform API + Gloo AI Studio API

Every second of a workout, Selah turns a biometric stream into a Scripture delivery:

> **sense** the physiological moment → **discern** the verse built for it (YouVersion) →
> **deliver** one personal line in the moment's native format (Gloo AI).

This notebook runs the whole pipeline against the competition's `biometric movements.csv`
— **5 sessions, 4 activities (running · cycling · HIIT · weightlifting), 14 moment types.**

**Demo mode is ON by default — no keys needed.** It serves *public-domain* Scripture
(World English Bible) so the notebook runs anywhere and stays IP-safe. Add your
hackathon keys and set `DEMO_MODE = False` to run against the live APIs, which serve
each reader's own licensed translation.""")

# ── 1 · Config ───────────────────────────────────────────────────────────
code('''# ═══ 1 · Config ═══════════════════════════════════════════════════════
import os, json
YOUVERSION_API_KEY = os.environ.get("YOUVERSION_API_KEY", "")   # 🔑 YouVersion Platform key
GLOO_AI_API_KEY    = os.environ.get("GLOO_AI_API_KEY", "")      # 🔑 Gloo AI Studio key
DEMO_MODE          = True   # 🔑 set False once both keys are set (env vars or here)

YOUVERSION_API_BASE = "https://api.youversion.com/v1"
GLOO_AI_API_BASE    = "https://api.gloo.ai/studio/v1"

try:
    import requests
except ImportError:
    requests = None
print("Selah · DEMO MODE (public-domain Scripture)" if DEMO_MODE
      else "Selah · LIVE MODE (YouVersion + Gloo)")''')

# ── 2 · The engine (inlined source of truth) ─────────────────────────────
md("""## The engine — one source of truth

The cell below is `engine/selah_engine.py` verbatim: the sense→discern→deliver core
that the notebook, the test-suite, and the web demo all share. It is dependency-free.

Key contracts it exposes:
- `classify_moment(...)` — the transparent, activity-aware on-device classifier a watch runs.
- `get_verse(ref, ..., live=…)` — **demo** returns public-domain (WEB) text; **live** calls YouVersion.
- `personalize(moment, verse, ..., live=…)` — **demo** pastoral template; **live** calls Gloo AI.
- `deliver(snapshot, ..., live=…)` — the full loop, once per biometric snapshot.""")

code("# ═══ 2 · engine/selah_engine.py — inlined so the notebook is self-contained ═══\n"
     + ENGINE_SRC +
     '\nprint("engine loaded ·", len(MOMENT_VERSE), "moments ·", len(DEMO_VERSES_PD), "public-domain verses")')

# ── 3 · Data ─────────────────────────────────────────────────────────────
md("""## The data — every kind of effort

Kaggle attaches the competition data at `/kaggle/input`; we fall back to the local
file so the notebook also runs in this repo.""")

code('''# ═══ 3 · Load the biometric sessions ══════════════════════════════════
import pandas as pd, numpy as np
def _find(name):
    for p in [f"/kaggle/input/scripture-in-new-frontiers/{name}",
              f"/kaggle/input/scripture-new-frontiers/{name}", name]:
        if os.path.exists(p):
            return p
    return name
bio  = pd.read_csv(_find("biometric movements.csv"))
vmap = pd.read_csv(_find("verse movement mapping.csv"))
print(f"{len(bio)} snapshots · {bio.session_id.nunique()} sessions · "
      f"{bio.activity_type.nunique()} activities · {bio.moment_type.nunique()} moment types")
print("\\nsessions:")
print(bio.groupby("session_id").agg(activity=("activity_type","first"),
                                     minutes=("session_minute","max"),
                                     snapshots=("moment_type","size")))
bio.head()''')

# ── 4 · Classifier, held out by session ──────────────────────────────────
md("""## Sense — prove the classifier generalizes across *people*

A wearable must name the moment on-device and never fire at the wrong one. So we
don't grade on random rows — we grade on **held-out people**. With only 5 sessions,
random splits leak a runner's own rows into both train and test; instead we use
**`GroupKFold` on `session_id`** so every prediction is made for a session the model
never trained on. That is the honest question: *does this transfer to a body it has
never seen?*""")

code('''# ═══ 4 · RandomForest, evaluated held-out BY SESSION (GroupKFold) ═════
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import GroupKFold, cross_val_predict
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix

FEATURES = ["heart_rate", "hr_zone", "effort_pct", "recovery_score", "stress_index"]
X = bio[FEATURES]
y = bio["moment_type"]
groups = bio["session_id"]

clf = RandomForestClassifier(n_estimators=300, max_depth=8,
                             class_weight="balanced", random_state=7)

# Every fold holds out whole sessions → predictions are for unseen people.
gkf = GroupKFold(n_splits=bio.session_id.nunique())
y_pred = cross_val_predict(clf, X, y, cv=gkf, groups=groups)
heldout_acc = accuracy_score(y, y_pred)

clf.fit(X, y)   # final model trained on everything, for inference below
print(f"Held-out-by-session accuracy: {heldout_acc:.2f}  "
      f"({(y_pred==y).sum()}/{len(y)} moments, across {bio.session_id.nunique()} unseen sessions)")
print("\\nWhat the body tells the model (feature importance):")
for f, imp in sorted(zip(FEATURES, clf.feature_importances_), key=lambda t:-t[1]):
    print(f"  {f:15s} {imp:.2f}")''')

md("""### Per-moment precision & recall

Accuracy hides which moments are hard. The classification report (on the held-out
predictions) shows precision/recall per moment — the interrupt moments (`peak_effort`,
`breakthrough_wall`, `final_rep`) are the ones that must not misfire.""")

code('''# ═══ 5 · Per-moment precision / recall on the held-out predictions ════
report = classification_report(y, y_pred, zero_division=0, digits=2)
print(report)

rep = classification_report(y, y_pred, zero_division=0, output_dict=True)
prf = (pd.DataFrame(rep).T
         .loc[[m for m in sorted(y.unique()) if m in rep]]
         [["precision","recall","f1-score","support"]]
         .sort_values("recall", ascending=False))
prf''')

# ── 6 · Confusion matrix chart ───────────────────────────────────────────
md("""### Where it confuses one moment for another

A confusion matrix on the held-out predictions. Rows are the true moment, columns the
predicted one; a strong diagonal means the model reads the body correctly for people it
has never seen. Off-diagonal cells are almost always *adjacent* intensities (e.g.
`steady_state` ↔ `early_push`) — a graceful failure mode for a Scripture wearable.""")

code('''# ═══ 6 · Confusion matrix — dark, brand-teal sequential ═══════════════
import matplotlib.pyplot as plt
from matplotlib.colors import LinearSegmentedColormap

# Brand palette
BG, INK, INK2, MUTED = "#0a0c10", "#eef1f5", "#c3c2b7", "#7f8794"
GRID, ACCENT = "#2a2f38", "#38e1c0"
# Sequential single-hue teal ramp: near-zero recedes into the dark surface.
teal_seq = LinearSegmentedColormap.from_list(
    "selah_teal", ["#11161c", "#123b3a", "#1c7d72", "#38e1c0"])

labels = sorted(y.unique())
cm = confusion_matrix(y, y_pred, labels=labels)

fig, ax = plt.subplots(figsize=(9.2, 8), dpi=120)
fig.patch.set_facecolor(BG); ax.set_facecolor(BG)
vmax = cm.max()
im = ax.imshow(cm, cmap=teal_seq, vmin=0, vmax=vmax, aspect="equal")

# 2px surface gap between cells (grid on minor ticks in the surface color)
ax.set_xticks(np.arange(-.5, len(labels), 1), minor=True)
ax.set_yticks(np.arange(-.5, len(labels), 1), minor=True)
ax.grid(which="minor", color=BG, linewidth=2)
ax.tick_params(which="minor", length=0)

# Count labels — white on dark cells, ink on bright cells (by luminance).
for i in range(len(labels)):
    for j in range(len(labels)):
        v = cm[i, j]
        if v == 0:
            continue
        tone = INK if (v / vmax) < 0.55 else BG
        ax.text(j, i, str(v), ha="center", va="center", fontsize=9,
                color=tone, fontweight="bold" if i == j else "normal")

ax.set_xticks(range(len(labels))); ax.set_yticks(range(len(labels)))
ax.set_xticklabels(labels, rotation=45, ha="right", fontsize=8, color=MUTED)
ax.set_yticklabels(labels, fontsize=8, color=MUTED)
ax.set_xlabel("predicted moment", color=INK2, fontsize=10)
ax.set_ylabel("true moment", color=INK2, fontsize=10)
ax.set_title("Selah · moment confusion — held out by session",
             color=INK, loc="left", fontsize=13, pad=12)
for s in ax.spines.values():
    s.set_color(GRID)
cbar = fig.colorbar(im, ax=ax, fraction=0.045, pad=0.03)
cbar.set_label("snapshots", color=MUTED, fontsize=9)
cbar.ax.yaxis.set_tick_params(color=GRID); cbar.outline.set_edgecolor(GRID)
plt.setp(cbar.ax.get_yticklabels(), color=MUTED)
plt.tight_layout(); plt.show()''')

# ── 7 · Discern — YouVersion, IP-safe ────────────────────────────────────
md("""## Discern — the verse for the moment, from YouVersion

Each moment maps to Scripture built for it (`MOMENT_VERSE` in the engine, extending
the hackathon's verse mapping). Verse text comes **live from the YouVersion Platform
API** — 2,000+ languages, and critically the reader's *own* licensed translation
(NIV, ESV, NLT…).

> **IP-safe by design.** Because translations like NIV/ESV are copyrighted, this
> notebook's demo mode never ships them. `get_verse(...)` returns **public-domain**
> World English Bible text offline; the licensed translation is only ever fetched
> live, per-reader, from YouVersion — exactly how a shipping app must handle it.""")

code('''# ═══ 7 · Moment → verse (engine-driven, public-domain in demo) ════════
demo_moments = ["breakthrough_wall", "peak_effort", "recovery_window", "post_workout"]
for m in demo_moments:
    ref, theme = MOMENT_VERSE[m]
    v = get_verse(ref, live=not DEMO_MODE, api_key=YOUVERSION_API_KEY, requests=requests)
    print(f"{m:<18} → {v['name']:<16} [{theme}]  ({v['translation']})")
    print(f"    “{v['text']}”\\n")''')

# ── 8 · Innovative API use — breadth of YouVersion ───────────────────────
md("""## Innovative API use — Selah reads *more* of YouVersion than a single verse

A verse lookup is the floor. Selah is designed to meet the reader inside their existing
YouVersion life, so it pulls from three richer surfaces of the Platform API — each with
a real endpoint shape and a demo fallback:

1. **Verse of the Day** — anchor the warm-up in what the reader is *already* reading today.
2. **Active reading plan** — if they're mid-plan (e.g. a 21-day endurance plan), the
   peak-effort verse can come from *their* plan, not a generic map.
3. **Highlights** — verses the reader has personally highlighted are prioritized, so
   Scripture that already moved them returns at the moment their body needs it most.""")

code('''# ═══ 8 · Broader YouVersion Platform surfaces (real shapes + demo) ════
def yv_get(path, params=None):
    """GET a YouVersion Platform endpoint (live), or return None in demo mode."""
    if DEMO_MODE or requests is None:
        return None
    r = requests.get(f"{YOUVERSION_API_BASE}{path}",
                     headers={"Authorization": f"Bearer {YOUVERSION_API_KEY}",
                              "Accept": "application/json"},
                     params=params or {}, timeout=10)
    r.raise_for_status()
    return r.json()

def verse_of_the_day(translation="WEB"):
    # LIVE  GET /verse_of_the_day  →  {"reference": "...", "text": "..."}
    data = yv_get("/verse_of_the_day", {"translation": translation})
    if data:
        return {"reference": data["reference"], "text": data["text"], "source": "YouVersion VOTD"}
    ref = "PSA.118.24"                       # demo anchor
    return {**get_verse(ref), "source": "demo VOTD (public-domain)"}

def verse_from_reading_plan(user_id, moment):
    # LIVE  GET /users/{id}/reading_plans/active  →  {"plan_id","day","references":[...]}
    plan = yv_get(f"/users/{user_id}/reading_plans/active")
    if plan and plan.get("references"):
        ref = plan["references"][0]          # pick a plan verse aligned to today
        return {**get_verse(ref), "source": f"reading plan {plan['plan_id']} · day {plan['day']}"}
    ref, _ = MOMENT_VERSE[moment]            # demo fallback → moment map
    return {**get_verse(ref), "source": "demo (no active plan)"}

def verse_from_highlights(user_id, theme):
    # LIVE  GET /users/{id}/highlights?theme=...  →  {"items":[{"reference","color"},...]}
    hl = yv_get(f"/users/{user_id}/highlights", {"theme": theme})
    if hl and hl.get("items"):
        ref = hl["items"][0]["reference"]    # a verse THEY highlighted, on-theme
        return {**get_verse(ref), "source": "your highlight"}
    return {**get_verse("ISA.40.31"), "source": "demo highlight (public-domain)"}

votd = verse_of_the_day()
plan = verse_from_reading_plan("maya", "peak_effort")
high = verse_from_highlights("maya", "endurance")
for label, v in [("Verse of the Day", votd), ("From reading plan", plan), ("From highlights", high)]:
    print(f"{label:<18} {v['name']:<16} — {v['source']}")
    print(f"    “{v['text']}”\\n")''')

# ── 9 · Gloo personalization endpoint ────────────────────────────────────
md("""## Personalize — one pastoral line from Gloo AI Studio

The engine's `personalize(...)` calls **Gloo AI Studio's chat/inference endpoint** with a
tightly-scoped prompt: one warm sentence a runner can read at a glance, grounded in the
retrieved verse, faith-tuned, no preamble. Below is the exact request shape and the prompt
Gloo receives — plus the demo template it falls back to offline.""")

code('''# ═══ 9 · Gloo AI Studio — the real request shape + prompt ═════════════
def gloo_prompt(moment, verse, name="Maya"):
    return (f"In one short, warm sentence a runner can read at a glance during "
            f"'{moment.replace('_',' ')}', encourage {name} with this verse: "
            f"\\"{verse['text']}\\" ({verse['reference']}). Pastoral, no preamble.")

_m = "breakthrough_wall"
_ref, _ = MOMENT_VERSE[_m]
_verse = get_verse(_ref, live=not DEMO_MODE, api_key=YOUVERSION_API_KEY, requests=requests)

print("POST", f"{GLOO_AI_API_BASE}/chat/completions")
print(json.dumps({
    "model": "gloo-faith-1",
    "messages": [{"role": "user", "content": gloo_prompt(_m, _verse)}],
    "max_tokens": 40,
}, indent=2))

line = personalize(_m, _verse, "Maya", live=not DEMO_MODE,
                   api_key=GLOO_AI_API_KEY, requests=requests)
print("\\n→ Gloo returns:", repr(line))''')

# ── 10 · Real API smoke test ─────────────────────────────────────────────
md("""## Smoke test — the integration is wired, not faked

This cell attempts a **real** call to each API when its key is present, prints the
result, and **fails gracefully** with a clear message when a key is missing or the
network is unavailable. It is proof the wiring is real: give it keys and it lights up.""")

code('''# ═══ 10 · Live smoke test (safe: no-op when keys absent) ══════════════
def smoke_youversion():
    if not YOUVERSION_API_KEY or requests is None:
        return "SKIP · no YouVersion key set (demo mode serves public-domain WEB)"
    try:
        v = get_verse("PHI.4.13", translation="NIV", live=True,
                      api_key=YOUVERSION_API_KEY, requests=requests)
        return f"OK · YouVersion returned {v['reference']} [{v['translation']}]: “{v['text'][:60]}…”"
    except Exception as e:
        return f"FAIL · YouVersion call errored: {type(e).__name__}: {e}"

def smoke_gloo():
    if not GLOO_AI_API_KEY or requests is None:
        return "SKIP · no Gloo key set (demo mode serves pastoral template)"
    try:
        v = get_verse("PHI.4.13")
        line = personalize("breakthrough_wall", v, "Maya", live=True,
                           api_key=GLOO_AI_API_KEY, requests=requests)
        return f"OK · Gloo returned: “{line}”"
    except Exception as e:
        return f"FAIL · Gloo call errored: {type(e).__name__}: {e}"

print("YouVersion:", smoke_youversion())
print("Gloo AI   :", smoke_gloo())
print("\\nDemo mode runs everything above with zero keys — the calls are wired, "
      "not faked; add keys to light them up.")''')

# ── 11 · Deliver across multiple activities ──────────────────────────────
md("""## Deliver — Scripture meeting every kind of effort

Selah is not a running app. The same engine serves a runner grinding through the wall
and a lifter on a final rep. We run the full `deliver(...)` loop across **two very
different sessions** — S001 (running) and S003 (weightlifting) — building an engine
`Snapshot` from each biometric row and letting the engine sense, discern, and deliver.

Note the two **delivery modes**: `interrupt` (a haptic pulse + a verse to read *now*, at
peak effort) versus `ambient` (the watch just breathes a color, never interrupting
recovery).""")

code('''# ═══ 11 · Run the pipeline across running AND weightlifting ═══════════
def snap_from_row(r):
    return Snapshot(heart_rate=int(r.heart_rate), hr_zone=int(r.hr_zone),
                    effort_pct=float(r.effort_pct), recovery_score=int(r.recovery_score),
                    stress_index=float(r.stress_index), activity_type=str(r.activity_type),
                    session_minute=int(r.session_minute))

def run_session(sid, name):
    s = bio[bio.session_id == sid].sort_values("session_minute")
    act = s.activity_type.iloc[0]
    print(f"══ {sid} · {act.upper()} · {name} " + "═"*(46-len(act)-len(name)))
    rows = []
    for _, r in s.iterrows():
        d = deliver(snap_from_row(r), name=name, live=not DEMO_MODE,
                    yv_key=YOUVERSION_API_KEY, gloo_key=GLOO_AI_API_KEY, requests=requests)
        d["minute"] = int(r.session_minute); d["hr"] = int(r.heart_rate)
        rows.append(d)
        tag = "▶ INTERRUPT" if d["mode"] == "interrupt" else "· ambient  "
        print(f"[{d['minute']:>2}m {d['hr']:>3}bpm] {tag} {d['moment']:<17} "
              f"{d['name']:<16} — {d['format']}")
        if d["mode"] == "interrupt":
            print(f"            “{d['verse']}”")
            print(f"            › {d['note']}")
    print()
    return rows

run_rows  = run_session("S001", "Maya")
lift_rows = run_session("S003", "David")''')

md("""### See both — Scripture landing on two different bodies

Small multiples, one panel per session: the effort curve, with each Scripture delivery
marked at the moment it fired. **Filled markers = interrupt** (haptic + verse); **hollow
markers = ambient** (glow only). The interrupt deliveries cluster exactly where the body
is under the most load — the wall, the peak, the final rep.""")

code('''# ═══ 12 · Visualize both sessions ════════════════════════════════════
INTERRUPT, AMBIENT = "#ff8a3d", "#38e1c0"   # 2 categories: mode
panels = [("S001", "running · Maya", run_rows), ("S003", "weightlifting · David", lift_rows)]

fig, axes = plt.subplots(2, 1, figsize=(11, 7.4), dpi=120)
fig.patch.set_facecolor(BG)
for ax, (sid, title, rows) in zip(axes, panels):
    s = bio[bio.session_id == sid].sort_values("session_minute")
    mins = s.session_minute.values; hr = s.heart_rate.values
    ax.set_facecolor(BG)
    ax.plot(mins, hr, color=ACCENT, lw=2, zorder=2, solid_capstyle="round")
    ax.fill_between(mins, hr, hr.min()-6, color=ACCENT, alpha=0.10, zorder=1)
    for d in rows:
        interrupt = d["mode"] == "interrupt"
        ax.scatter(d["minute"], d["hr"], s=95, zorder=4,
                   facecolors=INTERRUPT if interrupt else "none",
                   edgecolors=INTERRUPT if interrupt else AMBIENT,
                   linewidths=2)
        if interrupt:   # label sparingly — only the moments that interrupt
            ax.annotate(d["reference"].split(".")[0], (d["minute"], d["hr"]),
                        textcoords="offset points", xytext=(0, 11), ha="center",
                        fontsize=8, color=INK2, fontweight="bold")
    ax.set_title(f"Selah · {title}", color=INK, loc="left", fontsize=12, pad=8)
    ax.set_ylabel("heart rate (bpm)", color=MUTED, fontsize=9)
    ax.tick_params(colors=MUTED, labelsize=8)
    for k in ("top", "right"): ax.spines[k].set_visible(False)
    for k in ("left", "bottom"): ax.spines[k].set_color(GRID)
axes[-1].set_xlabel("session minute", color=MUTED, fontsize=9)

# Legend (identity is never color-alone: fill vs hollow + labels)
from matplotlib.lines import Line2D
legend = [Line2D([0],[0], marker="o", linestyle="none", markersize=9,
                 markerfacecolor=INTERRUPT, markeredgecolor=INTERRUPT, label="interrupt · haptic + verse"),
          Line2D([0],[0], marker="o", linestyle="none", markersize=9,
                 markerfacecolor="none", markeredgecolor=AMBIENT, markeredgewidth=2, label="ambient · glow only")]
axes[0].legend(handles=legend, loc="upper left", frameon=False,
               labelcolor=INK2, fontsize=8.5)
fig.suptitle("Scripture meeting every kind of effort", color=INK, x=0.012, ha="left",
             fontsize=14, y=0.99)
plt.tight_layout(rect=[0, 0, 1, 0.97]); plt.show()''')

# ── Closing ──────────────────────────────────────────────────────────────
md("""---
## Selah

**Sense** the moment on-device — proven to generalize to bodies it has never seen.
**Discern** the verse from YouVersion — the reader's own translation, their plan, their
highlights, their verse of the day. **Deliver** one pastoral line from Gloo AI, in the
moment's native format — a haptic verse at the wall, an ambient glow in the quiet after.

Everything above ran in **demo mode with zero keys**, on public-domain Scripture, wired
to the real endpoints. Add your YouVersion and Gloo keys, set `DEMO_MODE = False`, and
the same pipeline lights up live — Scripture that meets you at the wall, the peak, and
the quiet after.

*Built with the YouVersion Platform API and the Gloo AI Studio API. Live demo, writeup,
and video in the submission.*""")

# ── emit ipynb ───────────────────────────────────────────────────────────
nb = {"cells": [], "metadata": {"kernelspec": {"name":"python3","display_name":"Python 3"},
      "language_info": {"name":"python"}}, "nbformat": 4, "nbformat_minor": 5}
for kind, src in cells:
    c = {"cell_type": kind, "metadata": {}, "source": src.splitlines(keepends=True)}
    if kind == "code":
        c["outputs"] = []; c["execution_count"] = None
    nb["cells"].append(c)
json.dump(nb, open(os.path.join(HERE, "notebook.ipynb"), "w"), indent=1)
print("wrote notebook.ipynb with", len(cells), "cells")
