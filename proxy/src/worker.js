// ─────────────────────────────────────────────────────────────────────────────
// Selah — live-API proxy (Cloudflare Worker)
//
// Holds the YouVersion + Gloo credentials server-side and exposes a small,
// resilient API the public demo (GitHub Pages) calls. Designed for STRANGERS —
// hackathon judges — hitting it directly:
//   • CORS-open, no login required
//   • aggressive caching (verses are static; Gloo lines cached per input)
//   • rate-limited per IP + a global daily Gloo budget, so a judge mashing the
//     demo can never drain the $20 Gloo credit
//   • every path degrades gracefully — on any upstream failure it returns a
//     safe fallback so the demo NEVER shows a broken screen
//
// Endpoints:
//   GET  /health                      → { ok, live, youversion, gloo }
//   GET  /verse?ref=&lang=&bible=      → authoritative passage text (YouVersion)
//   GET  /votd?lang=                   → verse of the day (depth; falls back)
//   GET  /highlights?lang=             → real user highlights + plan (team acct)
//   POST /personalize {moment,verse,name,lang} → one Gloo pastoral line
//   POST /discern {moment,spokenContext,name,lang} → Gloo CHOOSES the fitting
//        verse for what you said (from a curated safe set) + writes the line;
//        YouVersion returns the text. Combines biometrics + voice + both APIs.
//
// Secrets (set with `wrangler secret put`):
//   YVP_APP_KEY            — YouVersion Platform app key
//   GLOO_CLIENT_ID         — Gloo OAuth2 client id
//   GLOO_CLIENT_SECRET     — Gloo OAuth2 client secret
//   YVP_USER_TOKEN (opt)   — team demo-account user token for real /highlights
// Binding:
//   SELAH (KV namespace)   — token cache, response cache, rate/budget counters
// ─────────────────────────────────────────────────────────────────────────────

const YV_BASE = "https://api.youversion.com/v1";
const GLOO_TOKEN_URL = "https://platform.ai.gloo.com/oauth2/token";
// official current endpoint (Completions V2, OpenAI-compatible, auto-routing) —
// verified against docs.gloo.com. `model` is optional (auto-routed) unless env.GLOO_MODEL set.
const GLOO_CHAT = "https://platform.ai.gloo.com/ai/v2/chat/completions";

// language → YouVersion bibleId. These are best-known ids; verify each against
// GET /bibles in the portal and override via env.BIBLES (JSON) without redeploy.
const DEFAULT_BIBLES = { en: 206, es: 128, sw: 1126, ko: 88, pt: 129 };

// Curated candidate verses Gloo must CHOOSE FROM (never invents a reference).
// Spans emotional needs so a whispered word maps to a fitting verse.
const CANDIDATES = {
  warmup: ["PSA.118.24", "LAM.3.22", "PRO.3.5"],
  steady_state: ["PSA.23.4", "PRO.3.5", "ISA.40.31"],
  breakthrough_wall: ["PHI.4.13", "ISA.41.10", "2CO.12.9", "JOS.1.9", "PSA.23.4"],
  peak_effort: ["ISA.40.31", "1CO.9.24", "PHI.4.13", "JOS.1.9"],
  finishing_strong: ["GAL.6.9", "1CO.9.24", "ISA.40.31"],
  post_workout: ["PSA.118.24", "LAM.3.22", "PSA.23.4"],
  working_set: ["PRO.3.5", "2CO.12.9", "PHI.4.13"],
  final_rep: ["2CO.12.9", "PHI.4.13", "ISA.40.31"],
  redline: ["ROM.8.37", "ISA.41.10", "PHI.4.13"],
  active_recovery: ["PSA.46.10", "PSA.23.4", "LAM.3.22"],
  rest_set: ["PSA.46.10", "LAM.3.22", "PSA.23.4"],
};
const ALL_REFS = [...new Set(Object.values(CANDIDATES).flat())];

// Human-readable names for refs (for prompts + fallback UI).
const REF_NAME = {
  "PSA.118.24": "Psalm 118:24", "LAM.3.22": "Lamentations 3:22-23",
  "PRO.3.5": "Proverbs 3:5", "PSA.23.4": "Psalm 23:4", "ISA.40.31": "Isaiah 40:31",
  "PHI.4.13": "Philippians 4:13", "ISA.41.10": "Isaiah 41:10", "2CO.12.9": "2 Corinthians 12:9",
  "JOS.1.9": "Joshua 1:9", "1CO.9.24": "1 Corinthians 9:24", "GAL.6.9": "Galatians 6:9",
  "ROM.8.37": "Romans 8:37", "PSA.46.10": "Psalm 46:10",
};

// Soft limits (protect the $20 Gloo credit against strangers testing).
const RL_PER_MIN = 40;       // per-IP requests/min
const GLOO_DAILY_CAP = 1200; // global Gloo calls/day; beyond → skip Gloo, keep verse

// ── helpers ──────────────────────────────────────────────────────────────────
const json = (obj, status = 200, extra = {}) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...cors(), ...extra },
  });

function cors() {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "86400",
  };
}

async function sha(s) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].slice(0, 12).map((x) => x.toString(16).padStart(2, "0")).join("");
}

function bibles(env) {
  try { return { ...DEFAULT_BIBLES, ...(env.BIBLES ? JSON.parse(env.BIBLES) : {}) }; }
  catch { return DEFAULT_BIBLES; }
}

// per-IP soft rate limit (KV; eventually-consistent is fine for a soft cap)
async function underRateLimit(env, ip) {
  if (!env.SELAH) return true;
  const bucket = Math.floor(Date.now() / 60000);
  const key = `rl:${ip}:${bucket}`;
  const n = parseInt((await env.SELAH.get(key)) || "0", 10) + 1;
  await env.SELAH.put(key, String(n), { expirationTtl: 120 });
  return n <= RL_PER_MIN;
}

// global daily Gloo budget guard
async function glooBudgetLeft(env) {
  if (!env.SELAH) return true;
  const day = new Date().toISOString().slice(0, 10);
  const n = parseInt((await env.SELAH.get(`gloo:count:${day}`)) || "0", 10);
  return n < GLOO_DAILY_CAP;
}
async function bumpGloo(env) {
  if (!env.SELAH) return;
  const day = new Date().toISOString().slice(0, 10);
  const key = `gloo:count:${day}`;
  const n = parseInt((await env.SELAH.get(key)) || "0", 10) + 1;
  await env.SELAH.put(key, String(n), { expirationTtl: 90000 });
}

// ── YouVersion ─────────────────────────────────────────────────────────────
async function fetchVerse(env, ref, lang) {
  const bible = bibles(env)[lang] || bibles(env).en;
  const cacheKey = `verse:${bible}:${ref}`;
  if (env.SELAH) {
    const hit = await env.SELAH.get(cacheKey);
    if (hit) return JSON.parse(hit);
  }
  const r = await fetch(`${YV_BASE}/bibles/${bible}/passages/${ref}`, {
    headers: { "X-YVP-App-Key": env.YVP_APP_KEY, Accept: "application/json" },
  });
  if (!r.ok) throw new Error(`youversion ${r.status}`);
  const data = await r.json();
  // shape is still settling on the new platform — pull text from common fields
  const text = (data.content || data.text || data.passage || "")
    .toString().replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const out = { ref, name: REF_NAME[ref] || ref, text, lang, source: "youversion" };
  if (env.SELAH && text) await env.SELAH.put(cacheKey, JSON.stringify(out), { expirationTtl: 604800 });
  return out;
}

// ── Gloo ───────────────────────────────────────────────────────────────────
async function glooToken(env) {
  if (env.SELAH) {
    const cached = await env.SELAH.get("gloo:token");
    if (cached) return cached;
  }
  const body = "grant_type=client_credentials&scope=api/access";
  const auth = btoa(`${env.GLOO_CLIENT_ID}:${env.GLOO_CLIENT_SECRET}`);
  const r = await fetch(GLOO_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", authorization: `Basic ${auth}` },
    body,
  });
  if (!r.ok) throw new Error(`gloo token ${r.status}`);
  const t = await r.json();
  const token = t.access_token;
  const ttl = Math.max(60, (t.expires_in || 3600) - 120);
  if (env.SELAH && token) await env.SELAH.put("gloo:token", token, { expirationTtl: ttl });
  return token;
}

async function glooChat(env, prompt, maxTokens = 60) {
  if (!(await glooBudgetLeft(env))) throw new Error("gloo budget");
  const token = await glooToken(env);
  const r = await fetch(GLOO_CHAT, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "user", content: prompt }], max_tokens: maxTokens }),
  });
  if (!r.ok) throw new Error(`gloo chat ${r.status}`);
  await bumpGloo(env);
  const data = await r.json();
  return (data.choices?.[0]?.message?.content || "").trim();
}

// ── route handlers ───────────────────────────────────────────────────────────
async function handleVerse(env, url) {
  const ref = (url.searchParams.get("ref") || "PHI.4.13").toUpperCase();
  const lang = url.searchParams.get("lang") || "en";
  if (!ALL_REFS.includes(ref)) return json({ error: "unknown ref" }, 400);
  try { return json(await fetchVerse(env, ref, lang)); }
  catch (e) { return json({ ref, name: REF_NAME[ref], text: "", lang, source: "fallback", error: String(e) }, 200); }
}

async function handlePersonalize(env, req) {
  const { moment = "", verse = "", name = "friend", lang = "en" } = await req.json().catch(() => ({}));
  const cacheKey = `pers:${await sha(`${moment}|${verse}|${name}|${lang}`)}`;
  if (env.SELAH) { const hit = await env.SELAH.get(cacheKey); if (hit) return json(JSON.parse(hit)); }
  try {
    const line = await glooChat(env,
      `In ONE short, warm, pastoral sentence a person can read at a glance mid-effort, ` +
      `encourage ${name} at this moment ("${moment}") grounded in this verse: "${verse}". ` +
      `Tender, never performance-y. No emojis, no quotes, under 18 words.`);
    const out = { note: line || "", moment, source: "gloo" };
    if (env.SELAH && line) await env.SELAH.put(cacheKey, JSON.stringify(out), { expirationTtl: 86400 });
    return json(out);
  } catch (e) { return json({ note: "", moment, source: "fallback", error: String(e) }, 200); }
}

async function handleDiscern(env, req) {
  const body = await req.json().catch(() => ({}));
  const moment = (body.moment || "steady_state").toString();
  const spoken = (body.spokenContext || "").toString().slice(0, 240);
  const name = (body.name || "friend").toString().slice(0, 40);
  const lang = (body.lang || "en").toString();
  const candidates = CANDIDATES[moment] || CANDIDATES.steady_state;

  const cacheKey = `disc:${await sha(`${moment}|${spoken}|${name}|${lang}`)}`;
  if (env.SELAH) { const hit = await env.SELAH.get(cacheKey); if (hit) return json(JSON.parse(hit)); }

  // Gloo DISCERNS: choose the fitting verse from the safe set + write the line.
  let ref = candidates[0], note = "";
  try {
    const menu = candidates.map((r) => `${r} (${REF_NAME[r]})`).join(", ");
    const prompt =
      `A person on a wearable is at the moment "${moment}". ` +
      (spoken ? `They just whispered: "${spoken}". ` : `They said nothing. `) +
      `From EXACTLY this list, choose the single verse that best meets them right now: ${menu}. ` +
      `Then write ONE short, tender, pastoral sentence (under 18 words, no emojis/quotes) for ${name} ` +
      `grounded in that verse and what they said. ` +
      `Reply as strict JSON only: {"ref":"<one ref from the list>","line":"<sentence>"}`;
    const raw = await glooChat(env, prompt, 90);
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) {
      const parsed = JSON.parse(m[0]);
      if (parsed.ref && candidates.includes(parsed.ref.toUpperCase())) ref = parsed.ref.toUpperCase();
      if (parsed.line) note = parsed.line.trim();
    }
  } catch (_) { /* graceful: keep moment-default ref, empty note */ }

  // authoritative text from YouVersion (falls back to empty text on failure)
  let verse = { ref, name: REF_NAME[ref], text: "", lang, source: "fallback" };
  try { verse = await fetchVerse(env, ref, lang); } catch (_) {}

  const out = { ...verse, note, moment, spokenHeard: !!spoken, source: { youversion: !!verse.text, gloo: !!note } };
  if (env.SELAH && (verse.text || note)) await env.SELAH.put(cacheKey, JSON.stringify(out), { expirationTtl: 43200 });
  return json(out);
}

async function handleVotd(env, url) {
  const lang = url.searchParams.get("lang") || "en";
  // VOTD path shape is still settling; try, else fall back to a rotating pick.
  try {
    const bible = bibles(env)[lang] || bibles(env).en;
    const day = Math.floor(Date.now() / 86400000) % 366 + 1;
    const r = await fetch(`${YV_BASE}/verse_of_the_day/${day}?version_id=${bible}`, {
      headers: { "X-YVP-App-Key": env.YVP_APP_KEY, Accept: "application/json" },
    });
    if (r.ok) { const d = await r.json(); return json({ ...d, source: "youversion" }); }
  } catch (_) {}
  const ref = ALL_REFS[(Math.floor(Date.now() / 86400000)) % ALL_REFS.length];
  try { return json({ ...(await fetchVerse(env, ref, lang)), votd: true, source: "youversion" }); }
  catch { return json({ ref, name: REF_NAME[ref], text: "", votd: true, source: "fallback" }, 200); }
}

async function handleHighlights(env, url) {
  const lang = url.searchParams.get("lang") || "en";
  // Real user-scoped highlights from a team demo account, if a user token is set.
  if (env.YVP_USER_TOKEN) {
    try {
      const r = await fetch(`${YV_BASE}/users/me/highlights`, {
        headers: { "X-YVP-App-Key": env.YVP_APP_KEY, Authorization: `Bearer ${env.YVP_USER_TOKEN}`, Accept: "application/json" },
      });
      if (r.ok) { const d = await r.json(); return json({ ...d, source: "youversion-user" }); }
    } catch (_) {}
  }
  // Seeded fallback (real refs; labeled as demo) so the feature always shows.
  return json({
    source: "seed",
    highlights: [
      { ref: "PHI.4.13", name: REF_NAME["PHI.4.13"], when: "3 weeks ago" },
      { ref: "ISA.40.31", name: REF_NAME["ISA.40.31"], when: "last winter" },
    ],
    plan: { ref: "PSA.23.4", name: REF_NAME["PSA.23.4"], title: "Through the Valley", day: 6 },
    lang,
  });
}

// ── entry ──────────────────────────────────────────────────────────────────
export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === "OPTIONS") return new Response(null, { headers: cors() });

    if (url.pathname === "/health") {
      return json({
        ok: true, live: true,
        youversion: !!env.YVP_APP_KEY,
        gloo: !!(env.GLOO_CLIENT_ID && env.GLOO_CLIENT_SECRET),
        userHighlights: !!env.YVP_USER_TOKEN,
      });
    }

    const ip = req.headers.get("cf-connecting-ip") || "0.0.0.0";
    if (!(await underRateLimit(env, ip))) return json({ error: "rate_limited" }, 429);

    try {
      if (url.pathname === "/verse" && req.method === "GET") return await handleVerse(env, url);
      if (url.pathname === "/votd" && req.method === "GET") return await handleVotd(env, url);
      if (url.pathname === "/highlights" && req.method === "GET") return await handleHighlights(env, url);
      if (url.pathname === "/personalize" && req.method === "POST") return await handlePersonalize(env, req);
      if (url.pathname === "/discern" && req.method === "POST") return await handleDiscern(env, req);
    } catch (e) {
      return json({ error: "upstream", detail: String(e) }, 200); // never hard-fail the demo
    }
    return json({ error: "not_found" }, 404);
  },
};
