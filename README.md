# Selah — Scripture at the right physiological moment

**A wearable-native Scripture companion for the [Scripture in New Frontiers](https://www.kaggle.com/competitions/scripture-in-new-frontiers) hackathon.**
Selah reads the body in motion and delivers the right verse at the exact physiological moment — the wall, the rehab ward, the ninth hour of labor, the quiet after — using the **YouVersion Platform API** (Scripture in 2,000+ languages) and the **Gloo AI Studio API** (faith-tuned encouragement).

> Not another Bible app. **Scripture that finds you when you can't go looking** — for the moments you can't open an app: the wall, the hospital corridor, the ninth hour of labor, the 3 a.m. grief walk. Presence, not performance.

## What's here
| | |
|---|---|
| `app/index.html` | The live, self-contained demo — a wearable running a real session, classifying the moment, and blooming Scripture in native watch formats (haptic pulse, ambient glow, spoken verse). **Self-plays and loops.** |
| `notebook.ipynb` | The engine: biometric stream → moment classifier → YouVersion verse retrieval → Gloo AI personalization → wearable delivery. Runs in **demo mode** out of the box; flip two keys for **live mode**. |
| `docs/writeup.md` | The ≤500-word technical writeup. |
| `docs/video-script.md` | The 3-minute video script + storyboard. |
| `docs/cover.png` | Cover image / thumbnail. |

## Run the demo
```bash
# any static server works — it's a single self-contained file
cd app && python3 -m http.server 8099
# open http://localhost:8099
```
Or just open `app/index.html` in a browser. It starts a run automatically and loops. Click **Begin a run** to restart, the language chips to switch translation, **Sound on** to hear the verse spoken.

## The pipeline (what the notebook does, once a second)
```
snapshot = read_wearable()            # heart_rate, hr_zone, effort, recovery, stress
moment   = classify_moment(snapshot)  # peak_effort | breakthrough_wall | steady_state | ...
verse    = youversion.get_verse(pick(moment), translation, language)   # 2,000+ languages
note     = gloo.personalize(moment, verse, user_history)               # faith-tuned, 1 line
wearable.deliver(verse, note, format=delivery_for(moment))             # haptic / glow / display
```
Moment detection is trained on the hackathon's `biometric movements.csv`; the moment→verse map extends `verse movement mapping.csv`.

## Going live (both APIs)
Both are free to registered participants; Gloo requires a payment method + the kickoff-form credit.
1. Create a **YouVersion Platform** account → get an API key.
2. Create a **Gloo AI Studio** account, add a payment method, submit the kickoff form for the $20 credit → get an API key.
3. In `notebook.ipynb`, set `YOUVERSION_API_KEY` and `GLOO_AI_API_KEY`, and `DEMO_MODE = False`.
4. (Optional) wire the same two keys into a tiny proxy so `app/index.html` calls the live APIs server-side.

Endpoints used: `https://api.youversion.com/v1` · `https://api.gloo.ai/studio/v1`.

## Credits
Built for Scripture in New Frontiers. Scripture © respective translations, served via YouVersion. Faith-tuned inference via Gloo AI Studio.
