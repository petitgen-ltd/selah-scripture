# Selah — final submission checklist (ONE submission, no do-overs)

Deadline: **Aug 1, 12:59 PM GMT+8**. Submit = a Kaggle **Writeup** with all assets attached and **publicly accessible**. Rules: one submission per team; winner open-sources (MIT ✅); original/IP-safe (✅).

## A. Assets — status
| Asset | Where | Status |
|---|---|---|
| **Writeup** (≤500 words) | `docs/writeup.md` | ✅ 488 words (auto-check: `wc -w docs/writeup.md`), presence-over-performance, IP-safe |
| **Video** (≤3 min, public YouTube) | `docs/selah-demo.mp4` | ✅ file exists → still needs the final re-cut, then **upload to YouTube (Public/Unlisted), paste link** |
| **Cover image** (required) | `docs/cover.jpg` | ✅ file exists (`docs/cover.jpg`) — refresh from the new hero only if it changes before submit |
| **Public notebook** | `negtitep/selah-scripture-engine` (Kaggle) | ✅ private now → auto-publishes after deadline (host-approved) |
| **Public code repo** | github.com/petitgen-ltd/selah-scripture | ✅ public, MIT license |
| **Public project link** | https://petitgen-ltd.github.io/selah-scripture/ | ✅ live |
| **YouVersion demonstrated** | live proxy `selah-proxy.petitgen.workers.dev` + notebook | ✅ real verses via the deployed Cloudflare Worker (add `YVP_APP_KEY` secret → live badge) |
| **Gloo demonstrated** | proxy `/personalize` + `/discern` + notebook | ⚠️ **integration built & wired** (endpoints verified vs live docs); live activation blocked by a **payment-processor decline on 3 cards** — raised with host (mhill@gloo.us + Discord); honest **labeled simulation** (`gloo-sim`) runs meanwhile, flips to real with one secret |

## B. Tonight, together (the human-only + key-dependent parts)
1. **API keys** (`docs/SETUP-APIS.md`): YouVersion App Key + Gloo credentials ($20 credit). ~15 min.
2. **Prove both APIs live** — flip `DEMO_MODE=False` in the notebook, run the smoke-test cell so a real verse + a real Gloo line print. Screenshot/keep the cell output. (Optionally wire the app to live mode via a tiny proxy.) *This closes the last "is it faked?" gap and satisfies the hard "demonstrate both APIs" requirement.*
3. **Upload the video** to YouTube (Public or Unlisted-with-link), copy the URL.
4. **Refresh the cover** (I'll regenerate from the new hero).

## C. Create + submit the Writeup (on the competition page)
1. Competition → **New Writeup**.
2. **Title:** `Selah — Scripture at the right physiological moment`
   **Subtitle:** `Scripture that finds you when you can't go looking.`
3. **Body:** paste `docs/writeup.md` (verify it renders ≤500 words).
4. **Media Gallery:** upload the **cover image** (required) + the YouTube video.
5. **Project Files / Notebook:** attach `negtitep/selah-scripture-engine`.
6. **Project link(s):** the live demo URL + the GitHub repo (put both in the writeup body too).
7. **Public-access check** (host stressed this): open each link in a private/incognito window — demo, repo, video, notebook — confirm **no login required**.
8. Click **Submit** (top-right). One submission only — verify everything first.

## D. Final consistency pass (no contradictions across assets)
- Name: **Maya** (runner) everywhere; the ache bookends are unnamed "she."
- Tagline: **"Scripture that finds you when you can't go looking"** (retire other taglines).
- Verse text: public-domain, labels say "public domain" (not a specific copyrighted translation).
- Tone: presence, not performance. No "crush your workout." Camera-heartbeat = easter egg only, not in the video.
- Numbers/URLs identical across writeup, video description, repo README.

## E. YouTube upload kit (paste-ready)
**Title:** Selah — Scripture that finds you when you can't go looking
**Description:**
```
Selah is a wearable-native Scripture companion. It reads the body in motion —
heart-rate, effort, recovery — and delivers the right verse at the exact
physiological moment: a haptic pulse at the wall, a wordless ambient glow in the
cool-down. Not a pop-up. Not another Bible app. Scripture for the moments you
can't go looking — on a run, in cardiac rehab, in the ninth hour of labor, on the
3 a.m. grief walk. Presence, not performance.

Built for the "Scripture in New Frontiers" hackathon with the YouVersion Platform
API (Scripture, 2,000+ languages) and the Gloo AI Studio API (faith-tuned,
pastoral encouragement).

Live demo: https://petitgen-ltd.github.io/selah-scripture/
Code: https://github.com/petitgen-ltd/selah-scripture

Scripture text shown is public domain; live mode serves the reader's own
translation via YouVersion. "Selah" — the Psalmist's word for a lifted pause.
```
**Visibility:** Public (or Unlisted if you prefer — judges must access without login).
**Tags:** Scripture, YouVersion, Gloo AI, wearable, faith tech, hackathon, Bible, presence
