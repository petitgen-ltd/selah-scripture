# Setup — Get both API keys in minutes

Selah runs in **demo mode** out of the box (public-domain WEB verses, templated notes), so
nothing here is required to reproduce the notebook. To light up **live mode** — real
translations in 2,000+ languages from YouVersion, and faith-tuned encouragement from Gloo —
you need two keys. This is the exact, current signup path for each. Budget ~10 minutes total.

At the end you paste two strings into `notebook.ipynb`, flip `DEMO_MODE = False`, and re-run.

---

## 1. YouVersion Platform API  (~3 min, free for hackathon)

The YouVersion Platform API is **free** and access for hackathon participants is granted at
sign-up — no card, no billing.

### Steps
1. Go to the developer portal: **https://platform.youversion.com/**
   (the older link **https://developers.youversion.com/** redirects to the same platform).
2. Click **Sign in / Get started** and log in with your **YouVersion account**
   (the same account as the Bible app — create a free one if you don't have it).
3. **Create an app / organization.** Give it a name (e.g. `Selah`) and confirm. This
   registers your application on the platform.
4. Open the app and click **Get My Token / App Key**. Copy the value that appears — this is
   your **App Key**. (There's a *refresh* option to rotate it if you ever need to.)

### What you now have
- **Base URL:** `https://api.youversion.com/v1`
- **Auth header:** `X-YVP-App-Key: <YOUR_APP_KEY>`  ← note: **not** `Authorization: Bearer`
- **Accept header:** `application/json`

### Endpoints Selah uses
Paths that are publicly documented:

| Purpose | Method + path | Notes |
|---|---|---|
| List Bible versions | `GET /bibles` | returns version ids + languages; find the `bibleId` for a translation (e.g. WEB, NIV) |
| Verse / passage by reference | `GET /bibles/{bibleId}/passages/{reference}` | reference in OSIS-style form, e.g. `JHN.3.16`, `PHI.4.13`. Example: `https://api.youversion.com/v1/bibles/3034/passages/JHN.3.16` |

Example request Selah makes for a verse:

```bash
curl "https://api.youversion.com/v1/bibles/3034/passages/PHI.4.13" \
  -H "X-YVP-App-Key: $YOUVERSION_API_KEY" \
  -H "Accept: application/json"
```

**Language / translation** are selected by choosing the right `bibleId` from `/bibles` (each
version is a language-specific id), which is how Selah serves any of the 2,000+ languages.

The following are part of the platform but their **exact request/response shapes are not fully
published**; use the interactive API reference in the portal to confirm the current paths.
Best-known shapes (from the legacy `developers.youversion.com/api/1.0` portal):

| Purpose | Best-known shape | Status |
|---|---|---|
| Verse of the Day | `GET /verse_of_the_day/{day}?version_id={id}` (legacy portal) | confirm current path in portal reference |
| Reading plans | plans collection + plan/day sub-resources | documented as available; shape not public — check portal |
| User highlights | user-scoped highlights collection (requires **user auth / login**, not just the app key) | documented as available; shape not public — check portal |

> Selah's engine calls the verse/passage endpoint for its live path; VOTD, plans, and
> highlights are wired as roadmap features. If a path 404s, open the portal's interactive
> reference and copy the current route — the platform is new and routes are still settling.

---

## 2. Gloo AI Studio API  (~6 min — a card is required)

Gloo gives hackathon teams a **$20 credit**, but you must still **add a payment method (a real
card)** to activate API access — the host confirmed the card is required even with the promo.
You will not be charged within the credit.

### Steps
1. Sign up: **https://studio.ai.gloo.com/**  → create your account and **verify your email**
   to reach the onboarding wizard.
2. **Create an organization** in onboarding — name it after your team (this is the top-level
   container for everything).
3. **Add a payment method (required).** Go to **Billing → Payment Methods → Add payment
   method**, enter a credit card (Visa/MC/Amex/Discover, Apple Pay, or US ACH), and save.
   *This step is mandatory to unlock API access even though you have the promo credit.*
4. **Claim the $20 credit:** complete the hackathon **kickoff form** (linked in the hackathon
   materials / Discord) with the org you just created so Gloo applies the credit.
5. **(Optional) Add teammates:** profile icon (bottom-left) → **Manage Organizations** →
   your org → **Manage Users → Invite User**; assign **Admin / Editor / Viewer** and send.
6. **Create the API key:** in the Studio sidebar open **API Credentials → Create New Key**,
   name it, and copy the generated **Client ID** and **Client Secret**.
   (Only org **Admins** can create credentials.)

> Payment / credit problems? Email the host: **mhill@gloo.us**

### Auth — exchange Client ID/Secret for a token
Gloo uses OAuth2 **client-credentials**. Access tokens are short-lived (~1 hour), so mint one,
then call the API with it:

```bash
# 1) get a bearer token
curl -X POST https://platform.ai.gloo.com/oauth2/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&scope=api/access" \
  -u "$GLOO_CLIENT_ID:$GLOO_CLIENT_SECRET"
# → { "access_token": "...", "expires_in": 3600, "token_type": "Bearer" }
```

### Base URL + chat/inference endpoint
The hackathon host's sample uses base URL **`https://api.gloo.ai/studio/v1`** with an
OpenAI-compatible **`/chat/completions`** endpoint. (The general Gloo platform equivalent is
`https://platform.ai.gloo.com/ai/v2/chat/completions` — same OpenAI-compatible shape; use the
host's base URL for the hackathon.)

Example — a short faith-tuned completion (the exact call Selah's engine makes):

```bash
curl -X POST https://api.gloo.ai/studio/v1/chat/completions \
  -H "Authorization: Bearer $GLOO_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "In one short warm sentence a runner can read at a glance, encourage Maya at the wall with Philippians 4:13."}
    ],
    "max_tokens": 40
  }'
# → choices[0].message.content  ← the one-line encouragement
```

Because it's OpenAI-compatible, you can also point any OpenAI SDK at the base URL — swap
`base_url` and `api_key` and the rest of your code is unchanged.

---

## 3. Final checklist — go live

1. Open **`notebook.ipynb`** and set, in the config cell:
   ```python
   YOUVERSION_API_KEY = "…"   # your YouVersion App Key
   GLOO_AI_API_KEY    = "…"   # your Gloo bearer/access token (or Client ID:Secret per the notebook's auth cell)
   DEMO_MODE          = False
   ```
2. **Re-run the notebook top-to-bottom.** Live mode now pulls real translations from
   YouVersion and real faith-tuned lines from Gloo, running the exact same pipeline.
3. **(Optional) Wire the web app to live mode** via a tiny proxy: stand up a minimal endpoint
   (e.g. a serverless function) that holds the two keys server-side, does the Gloo token
   exchange, and forwards verse + personalize requests — then point `app/index.html` at it.
   Keys stay off the client; the demo becomes a live front-end.

> Keep both keys **out of git** (they're gitignored). Demo mode needs neither key, so the
> public notebook and demo always reproduce with zero setup.
