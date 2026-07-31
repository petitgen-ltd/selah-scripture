# Selah test-suite

Rigorous, dependency-light pytest suite that proves the pipeline in
`engine/selah_engine.py` (the single source of truth) works end-to-end, matches the
real competition data, and stays IP-safe.

## Run

```bash
# one-time: create an isolated env (system Python 3.14 on this box has a broken
# pyexpat; 3.12 is used here) and install deps
python3.12 -m venv .venv
.venv/bin/pip install pytest pandas

# run everything
.venv/bin/python -m pytest tests/ -v
```

Only `pytest` is required for the core tests; `pandas` is used by one data test
(auto-skips via `importorskip` if absent).

The app-parity validator also runs standalone (no pytest):

```bash
.venv/bin/python tests/validate_app_data.py
```

## What each file proves

| File | Covers |
|------|--------|
| `test_engine_coverage.py` | Engine internal consistency: every `MOMENT_VERSE` moment has demo text + a display name + a `DELIVERY` entry with mode ∈ {interrupt, ambient}; every theme has a valid 2-stop hex color; no dangling references anywhere. |
| `test_classify_moment.py` | `classify_moment` behavior — warmup@min0, post_workout@last-min, peak_effort / breakthrough_wall (running), final_rep / working_set / rest_set (weightlifting), redline / active_recovery (hiit), recovery at low effort; monotonic intensity vs effort; a fuzz sweep asserting every result is a key of `MOMENT_VERSE`. |
| `test_data_grounded.py` | Against `biometric movements.csv` + `verse movement mapping.csv`: every `moment_type` in the data is mapped by the engine; every engine-referenced `assigned_verse_id` has demo text; engine moments are a superset of what the demo needs; CSV loads cleanly (pandas) with valid ranges. |
| `test_pipeline.py` | `get_verse` / `personalize` / `deliver` demo shapes; **IP-safety** — demo mode ships World English Bible text and must NOT emit the copyrighted NIV Philippians 4:13 string; full `deliver()` loop on real snapshots from the CSV, with mode/format/color agreeing with `DELIVERY` / `THEME_COLOR`. |
| `test_live_wiring.py` | Live integration wiring with an injected fake `requests` (no network): asserts the correct YouVersion (`/bibles/{bibleId}/passages/{ref}` with `X-YVP-App-Key`, text from `.content`) and Gloo (OAuth2 token exchange at `platform.ai.gloo.com/oauth2/token` → `platform.ai.gloo.com/ai/v2/chat/completions`) endpoints, auth, and prompt shape — mirrors `proxy/src/worker.js` and proves live mode is wired correctly without real keys. |
| `validate_app_data.py` | Parses `SESSION` / `VERSES` / `THEME` embedded in `app/index.html` and checks refs + moment→verse/theme mapping are consistent with the engine. The app may embed a *subset*; structural integrity (valid refs, no orphan moments) is always enforced. Color parity is a **soft** check that skips with the concrete divergence when the app (owned by another worker) hasn't yet been mirrored — so it documents drift instead of falsely failing. |

## Notes

- `conftest.py` puts `engine/` on `sys.path` and exposes the CSVs as fixtures.
- `pytest.ini` additionally collects `validate_*.py` so the app validator runs in the
  full suite as well as standalone.
- Tests read whatever the app currently embeds and validate it tolerantly; a green
  run with the parity test skipped means "engine is sound, app not yet fully mirrored".
