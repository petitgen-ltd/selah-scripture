# Gloo AI Studio — integration status & honest fallback

**TL;DR:** Selah's Gloo integration is **fully built and wired** against Gloo's
current, documented API. We could not *activate* it because the Gloo payment step
**declines New Zealand-issued cards** — we tried **three different cards (a NZ
personal card, a Wise virtual card, and a second NZ card), all declined** at the
payment form. Access is a billing gate on Gloo's side, not a code gap on ours.
We've raised it with the host (mhill@gloo.us) and the Kaggle discussion board.

To keep the product whole and the pipeline provable, we run an **honest, clearly
labeled simulation** (`source: "gloo-sim"`) that mimics Gloo's output shape. It is
**never presented as the live API**, and it flips to the real Gloo API with **one
secret and zero code changes**.

---

## What's real (the integration itself)

The proxy (`proxy/src/worker.js`, deployed as a Cloudflare Worker) implements the
exact Gloo flow from Gloo's own docs (verified live against `docs.gloo.com`):

1. **Auth — OAuth2 client-credentials.**
   `POST https://platform.ai.gloo.com/oauth2/token`
   with `grant_type=client_credentials&scope=api/access`, Basic-auth
   `CLIENT_ID:CLIENT_SECRET`. Token cached (~55 min) in Cloudflare KV.
2. **Inference — Completions V2 (OpenAI-compatible).**
   `POST https://platform.ai.gloo.com/ai/v2/chat/completions`
   with `Authorization: Bearer <token>` and a `messages` array (auto-routing, so
   no model pin needed).

Two endpoints use it:

- **`/personalize`** — given `{moment, verse, name}`, Gloo writes one short,
  faith-tuned pastoral line safe to read at a glance mid-effort.
- **`/discern`** — given `{moment, spokenContext, name}` (what the person
  *whispered*), Gloo **chooses** the single fitting verse from a curated, safe
  candidate set **and** writes the line grounded in what they said. YouVersion
  then returns the authoritative text. This combines three data sources
  (biometrics + voice + both APIs).

The moment `GLOO_CLIENT_ID` / `GLOO_CLIENT_SECRET` are set as Worker secrets, every
call above goes live. Nothing else changes.

## What the simulation is (and is not)

When Gloo credentials are **absent** (our current state), the proxy returns a
**labeled** response instead of failing:

- **It is labeled.** Every simulated response carries `source: "gloo-sim"` (vs
  `"gloo"` for live). The app's badge shows **"Gloo simulated"**, never "Gloo
  live." Nothing is passed off as the real API.
- **`/personalize` (sim):** a curated, faith-tuned line per physiological moment,
  written in the pastoral tone Gloo produces.
- **`/discern` (sim):** a keyword matcher maps the whispered words to an emotional
  need (fear, weakness, grief, gratitude, peace, strength) and picks the fitting
  verse **from the same candidate set Gloo would choose from** — so the full
  end-to-end pipeline (whisper → moment → verse selection → line → YouVersion
  text) is exercised and provable.
- **It is a shim, not a claim.** The simulation exists so the demo is complete and
  the architecture is verifiable while billing access is pending. It is **not** a
  substitute for the Gloo API and is not represented as one.

## Why we couldn't activate it

The Gloo Studio payment form (required to unlock API access, even with the
hackathon's $20 credit) **declined every New Zealand-issued card we tried** — a
personal NZ card, a **Wise** virtual card, and a second NZ card — each returning
"card declined." This is a known friction the host flagged; it is a
payment-processor limitation with non-US / NZ cards, outside our control.

## How to go fully live (for a judge or the host)

```bash
cd proxy
npx wrangler secret put GLOO_CLIENT_ID        # paste Client ID
npx wrangler secret put GLOO_CLIENT_SECRET    # paste Client Secret
# live immediately — no redeploy. /health then reports "gloo": true,
# and every /personalize + /discern response switches to source:"gloo".
```

**Status:** YouVersion — **live** (real verses, 2,000+ languages, via the proxy).
Gloo — **built, wired, and one secret from live**, running the honest simulation
until billing access is granted.
