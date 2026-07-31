# Selah — review & improvement plan (working doc)

Full re-read of the brief + **rules** + a UI/code audit, mapped to the judging rubric.
**Deadline: ~20h. ONE submission only (rules §2.2) — no iterating. Everything must land in one shot.**

Rubric: **Impact & Vision 40 · Video Storytelling 30 · Technical Depth 30.** Judged primarily on the video; writeup + code verify it's real.

---

## 🔴 P0 — Compliance / disqualification risk (must do)
- [x] **Open-source LICENSE.** Rules §2.5: the winning submission + source must be under an OSI-approved license allowing commercial use. Repo had none → add **MIT** (OSI-approved, allows commercial use).
- [ ] **Scripture IP.** Rules §3.14 warranty (original, non-infringing). Copyrighted translations (NIV/ESV/NLT) must be **served via the YouVersion API (licensed)**, not shipped as hardcoded text. Fix: demo fallback uses **public-domain (KJV / WEB)**; live mode uses YouVersion for all translations; state this in the writeup + code comments.
- [ ] **One-submission rigor.** No leaderboard do-overs → the writeup, video, notebook, links must all be final-quality and mutually consistent (name, numbers, URLs) before submit.
- [ ] **Attribution.** YouVersion + Gloo credited; Scripture © respective translations via YouVersion.

## 🔴 P0 — Impact & Vision (40 pts) — the biggest bucket
- [ ] **Answer the core judging line directly: "not a pop-up."** Differentiate **delivery modes** in the UI: `ambient_glow`/`display_only` moments must NOT throw a verse card — the watch just *breathes a color* (and an optional whisper); only `haptic_pulse` moments interrupt with the full bloom. This visually proves Scripture that "feels designed for the environment," not an overlay.
- [ ] **Breadth of vision (scale).** Demo only shows one running session. Data has **running, cycling, HIIT, weightlifting** + 14 moment types. Add an **activity selector** (Run / Lift / HIIT) so the video shows Scripture meeting *every* kind of effort — the wall on a run, the **final rep** lifting (2 Cor 12:9 "my power is made perfect in weakness"), the **redline** of HIIT (Rom 8:37).
- [ ] **Close the loop → shareable "recap" card.** After a session, a *"the words that carried you today"* card (the verses received). This adds the **social/creator frontier** and a **viral hook** (people share it), strengthening both Impact and Video.

## 🟠 P1 — Technical Depth (30 pts)
- [ ] **Use MORE of the YouVersion API** (brief explicitly lists reading plans, verse of the day, user highlights, community data). Wire + narrate: the verse can come from *"your reading plan"* or *"a verse you highlighted"* — innovative API use + real personalization.
- [ ] **Deeper Gloo personalization.** Show it adapts to the *person* (name, history, prior verses / tone), not a static template. Real endpoint + prompt in the notebook.
- [ ] **Classifier rigor.** Evaluate **held-out by session** (generalize across people, not random CV) + a **confusion matrix** (use the `dataviz` skill). Report per-moment precision.
- [ ] **Real API smoke-test cell** in the notebook that actually hits YouVersion + Gloo (fails gracefully without keys) — proves the integration is wired, "not faked."
- [ ] **Verify real endpoint shapes** against the live API docs once keys exist (YouVersion `/verses`, Gloo chat/inference path). Flag assumptions.

## 🟠 P1 — Tests & validation (user asked explicitly)
- [ ] **pytest suite** for the pipeline: `classify_moment` on known rows; `get_verse` demo + live-shape; `personalize` demo; `deliver` end-to-end; delivery-format + moment→verse **coverage** (every moment_type maps to a verse & a format); data integrity (embedded app data == CSVs).
- [ ] **App data-parity validator** — a script asserting the app's embedded session/verses/mapping match the source CSVs (no drift).
- [ ] Run everything green in CI-style locally; include a `tests/` dir + README badge/how-to.

## 🟡 P2 — UI polish (helps the video)
- [ ] **Live HR waveform / ECG line** on the watch face (currently just a number) → "alive," realistic.
- [ ] **Name consistency.** App/notebook say "Morgan"; video script says "Maya." Pick **one** (Maya) everywhere.
- [ ] **Hero accent stability.** The whole hero italics recolor with the glow (pink at warm-up). Consider pinning the hero accent to brand teal; let only the *watch* glow shift — keeps the identity stable. (A/B judgment.)
- [ ] **Mobile.** Verify the stacked layout at 390px (judges may watch on a phone). Tune watch size + spacing.
- [ ] **a11y.** `aria-live` on the verse for screen readers; respect `prefers-reduced-motion` for autoplay (don't auto-animate if reduced); visible focus (have it).
- [ ] **Sections need a visual.** "How it works" / "The build" are text+code only; add the notebook's HR-curve chart or a bloom still.

## 🟢 Code cleanup / bugs found in `app/index.html`
- [ ] Dead code: `const deliver = ...` computed in `render()` but unused → remove.
- [ ] `bloomIt = !(steady_state && i===5)` hardcodes skipping one beat → replace with proper **delivery-mode** logic (ambient vs interrupt).
- [ ] Language switch mid-run can paint a verse over telemetry on a non-bloom beat → guard.
- [ ] TTS reads references oddly; keep off by default (it is) + sanitize.

---

## Signup steps the user needs to do (API keys) — see `docs/SETUP-APIS.md`
Both APIs are free to participants; Gloo needs a card + the kickoff-form $20 credit. Exact steps recorded there.

## Definition of done
Live demo (multi-activity + delivery modes + recap) · rigorous tested notebook (real API smoke test) · ≤500-word writeup (IP-safe) · cover · video script · LICENSE · SETUP-APIS · all tests green.
