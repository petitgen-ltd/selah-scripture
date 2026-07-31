# Selah live-API proxy (Cloudflare Worker)

Holds the YouVersion + Gloo credentials **server-side** and gives the public demo a
small, resilient API. Built for strangers (judges) hitting it directly: CORS-open,
no login, cached, rate-limited to protect the **$20 Gloo credit**, and every path
**degrades gracefully** — if an upstream fails, the demo falls back to baked-in data
and never shows a broken screen.

## Endpoints
| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | `{ ok, live, youversion, gloo, userHighlights }` — powers the "● live" badge |
| GET | `/verse?ref=PHI.4.13&lang=en` | authoritative passage text (YouVersion) |
| GET | `/votd?lang=en` | verse of the day (falls back to a rotating pick) |
| GET | `/highlights?lang=en` | real user highlights + plan (team account) or seeded |
| POST | `/personalize` | `{moment,verse,name,lang}` → one Gloo pastoral line |
| POST | `/discern` | `{moment,spokenContext,name,lang}` → Gloo **chooses** the fitting verse for what you said + writes the line; YouVersion returns the text |

## Deploy (≈5 min) — you run these; secrets never leave your machine

```bash
cd proxy
npm install                      # gets wrangler locally

npx wrangler login               # opens the browser → authorize YOUR Cloudflare account

# 1) create the KV namespace, copy the printed id into wrangler.toml (id = "…")
npx wrangler kv namespace create SELAH

# 2) set the secrets — wrangler prompts; you PASTE each value (nothing is committed)
npx wrangler secret put YVP_APP_KEY            # YouVersion App Key (Selah app)
npx wrangler secret put GLOO_CLIENT_ID         # Gloo API credential — Client ID
npx wrangler secret put GLOO_CLIENT_SECRET     # Gloo API credential — Client Secret
# optional — real user-scoped highlights from a team demo account:
npx wrangler secret put YVP_USER_TOKEN

# 3) ship it
npx wrangler deploy              # prints your URL, e.g. https://selah-proxy.<subdomain>.workers.dev
```

## Verify (what a judge effectively does)
```bash
BASE="https://selah-proxy.<subdomain>.workers.dev"
curl "$BASE/health"                                   # → {"ok":true,"youversion":true,"gloo":true,...}
curl "$BASE/verse?ref=PHI.4.13&lang=en"               # → real verse text
curl -X POST "$BASE/discern" -H 'content-type: application/json' \
  -d '{"moment":"breakthrough_wall","spokenContext":"I am scared","name":"Maya","lang":"en"}'
# → { ref, text, note, source:{youversion:true, gloo:true} }
```

## Wire the demo to it
In `app/index.html` set `PROXY = "https://selah-proxy.<subdomain>.workers.dev"`.
Empty string = pure demo mode (self-plays with baked data, no network). The app pings
`/health` on load and only flips to live (and shows the **● live** badge) when the proxy
answers — so the public demo is safe even if the Worker is down.

## Notes
- **Cost guard:** verses cached 7 days; Gloo lines cached; per-IP 40 req/min; global
  Gloo cap 1,200/day. Beyond caps it serves cached/fallback data — the credit is safe.
- **bibleId map:** defaults are best-known; confirm via `GET /bibles` and override with
  the `BIBLES` var in `wrangler.toml` (no redeploy of code needed).
- Secrets are set via `wrangler secret put` and are **never** in git or the client.
