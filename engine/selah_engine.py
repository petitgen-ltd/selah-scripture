"""Selah engine — the single source of truth for the pipeline.

sense (physiological moment) → discern (verse, via YouVersion) → deliver (Gloo, native format).

Dependency-free and testable. The notebook imports this; the test-suite tests it;
the web demo mirrors its data. Scripture text for offline demo mode is **public
domain** (World English Bible) to stay IP-safe (Rules §3.14); live mode serves
the reader's chosen translation via the YouVersion Platform API.

The deployed Cloudflare Worker `proxy/src/worker.js` (selah-proxy.petitgen.workers.dev)
is the REFERENCE live integration — it holds the keys server-side, does the Gloo
OAuth2 token exchange, and is what the web demo actually calls. The live branches
below mirror that flow for the notebook / direct use.
"""
from __future__ import annotations
from dataclasses import dataclass

# ── moment → verse + theme (extends the hackathon's verse movement mapping) ──
MOMENT_VERSE = {
    "warmup":            ("PSA.118.24", "gratitude"),
    "pre_workout":       ("PSA.118.24", "gratitude"),
    "early_push":        ("JOS.1.9",    "courage"),
    "steady_state":      ("PSA.23.4",   "presence"),
    "working_set":       ("PRO.3.5",    "trust"),
    "breakthrough_wall": ("PHI.4.13",   "strength"),
    "peak_effort":       ("ISA.40.31",  "endurance"),
    "redline":           ("ROM.8.37",   "victory"),
    "final_rep":         ("2CO.12.9",   "grace"),
    "finishing_strong":  ("GAL.6.9",    "perseverance"),
    "rest_set":          ("ISA.41.10",  "renewal"),
    "recovery_window":   ("PSA.46.10",  "peace"),
    "active_recovery":   ("LAM.3.22",   "renewal"),
    "post_workout":      ("1CO.9.24",   "purpose"),
}

# ── how a watch should speak at each moment ──
# mode: "interrupt" = haptic + a verse the runner reads now;
#       "ambient"   = never interrupts — the watch just breathes a color / glow.
DELIVERY = {
    "warmup":            ("gentle display",        "ambient"),
    "pre_workout":       ("gentle display",        "ambient"),
    "early_push":        ("display",               "ambient"),
    "steady_state":      ("ambient display",       "ambient"),
    "working_set":       ("ambient display",       "ambient"),
    "breakthrough_wall": ("haptic pulse + audio",  "interrupt"),
    "peak_effort":       ("haptic pulse + display","interrupt"),
    "redline":           ("haptic pulse + display","interrupt"),
    "final_rep":         ("haptic pulse + display","interrupt"),
    "finishing_strong":  ("haptic pulse + display","interrupt"),
    "rest_set":          ("ambient glow",          "ambient"),
    "recovery_window":   ("ambient glow",          "ambient"),
    "active_recovery":   ("ambient glow",          "ambient"),
    "post_workout":      ("ambient glow",          "ambient"),
}

# ── theme → glow (physiological colour the interface becomes) ──
THEME_COLOR = {
    "gratitude":"#f0a6c0,#e0729a", "courage":"#ff9d5c,#ff6a2a", "presence":"#38e1c0,#14b8a6",
    "trust":"#a98bff,#7c5cff", "strength":"#6f8cff,#3d5bff", "endurance":"#ffb347,#ff7a1a",
    "victory":"#ffd34d,#f5a623", "grace":"#7fd8ff,#38b6ff", "perseverance":"#ffd34d,#f5a623",
    "renewal":"#8ee6b0,#37c98a", "peace":"#8ee6b0,#37c98a", "purpose":"#ffd34d,#f5a623",
}

# ── public-domain verse text for offline DEMO mode (World English Bible) ──
# Live mode serves the reader's own translation via YouVersion (licensed).
DEMO_VERSES_PD = {
 "PSA.118.24":"This is the day that the LORD has made. We will rejoice and be glad in it!",
 "JOS.1.9":"Haven't I commanded you? Be strong and courageous. Don't be afraid, neither be dismayed, for the LORD your God is with you wherever you go.",
 "PSA.23.4":"Even though I walk through the valley of the shadow of death, I will fear no evil, for you are with me.",
 "PRO.3.5":"Trust in the LORD with all your heart, and don't lean on your own understanding.",
 "PHI.4.13":"I can do all things through Christ, who strengthens me.",
 "ISA.40.31":"But those who wait for the LORD will renew their strength. They will mount up with wings like eagles. They will run, and not be weary.",
 "ROM.8.37":"No, in all these things, we are more than conquerors through him who loved us.",
 "2CO.12.9":"My grace is sufficient for you, for my power is made perfect in weakness.",
 "GAL.6.9":"Let us not be weary in doing good, for we will reap in due season, if we don't give up.",
 "ISA.41.10":"Don't be afraid, for I am with you. Don't be dismayed, for I am your God. I will strengthen you.",
 "PSA.46.10":"Be still, and know that I am God.",
 "LAM.3.22":"It is because of the LORD's loving kindnesses that we are not consumed, because his compassion doesn't fail.",
 "1CO.9.24":"Don't you know that those who run in a race all run, but one receives the prize? Run like that, so that you may win.",
}
VERSE_NAME = {
 "PSA.118.24":"Psalm 118:24","JOS.1.9":"Joshua 1:9","PSA.23.4":"Psalm 23:4","PRO.3.5":"Proverbs 3:5",
 "PHI.4.13":"Philippians 4:13","ISA.40.31":"Isaiah 40:31","ROM.8.37":"Romans 8:37","2CO.12.9":"2 Corinthians 12:9",
 "GAL.6.9":"Galatians 6:9","ISA.41.10":"Isaiah 41:10","PSA.46.10":"Psalm 46:10","LAM.3.22":"Lamentations 3:22",
 "1CO.9.24":"1 Corinthians 9:24",
}

# ── faith-tuned one-liners for demo mode (Gloo shapes these live) ──
DEMO_NOTES = {
 "breakthrough_wall":"This is the wall, Maya. You were built to go through it.",
 "peak_effort":"Right here, at the top — new strength. Keep running.",
 "redline":"All the way through the red. More than a conqueror.",
 "final_rep":"One more. His power shows up right where you're weakest.",
 "finishing_strong":"The last mile is the offering. Don't give up now.",
 "recovery_window":"Be still, Maya. You did enough.",
 "post_workout":"You ran your race today. Well done.",
}


@dataclass
class Snapshot:
    heart_rate: int; hr_zone: int; effort_pct: float
    recovery_score: int = 70; stress_index: float = 2.0
    activity_type: str = "running"; session_minute: int = 0
    translation: str = "WEB"; language: str = "en"


def classify_moment(hr_zone: int, effort_pct: float, activity: str = "running",
                    minute: int = 5, session_len: int = 30) -> str:
    """Transparent, on-device moment classifier (activity-aware).

    The notebook additionally trains + validates a RandomForest on the provided
    sessions; this rule-anchored version is the tiny model a watch would run."""
    if minute == 0:                          return "warmup"
    if minute >= session_len - 1:            return "post_workout"
    if activity == "weightlifting":
        if effort_pct >= 0.80:               return "final_rep"
        if effort_pct >= 0.55:               return "working_set"
        return "rest_set"
    if activity == "hiit":
        if effort_pct >= 0.90 or hr_zone >= 5: return "redline"
        if effort_pct >= 0.55:               return "working_set"
        return "active_recovery"
    # running / cycling
    if effort_pct >= 0.88 or hr_zone >= 5:   return "peak_effort"
    if effort_pct >= 0.74:                   return "breakthrough_wall"
    if effort_pct >= 0.45:                   return "steady_state"
    if effort_pct >= 0.25:                   return "early_push"
    return "recovery_window"


def delivery_for(moment: str):
    """(format, mode) — mode is 'interrupt' (haptic + verse) or 'ambient' (glow only)."""
    return DELIVERY.get(moment, ("display", "ambient"))


# internal ref book-codes → YouVersion USFM codes (only where they differ).
# Passage ids use USFM codes, e.g. Philippians is PHP (not PHI).
_YV_BOOK_FIX = {"PHI": "PHP"}


def _to_yv_ref(ref):
    """Map an internal ref (e.g. 'PHI.4.13') to a YouVersion USFM passage id ('PHP.4.13')."""
    dot = ref.find(".")
    book = ref[:dot] if dot > 0 else ref
    return _YV_BOOK_FIX[book] + ref[dot:] if book in _YV_BOOK_FIX else ref


# English public-domain default: bibleId 3034 = Berean Standard Bible (BSB).
YV_DEFAULT_BIBLE_ID = 3034


def get_verse(ref, translation="WEB", language="en", *, live=False,
              api_key="", api_base="https://api.youversion.com/v1",
              bible_id=YV_DEFAULT_BIBLE_ID, requests=None):
    """DEMO: public-domain (WEB) mirror. LIVE: YouVersion Platform API.

    Live path mirrors proxy/src/worker.js:
      GET {api_base}/bibles/{bible_id}/passages/{passage_id}
      header  X-YVP-App-Key: <key>   (NOT Authorization: Bearer)
      Accept: application/json  →  verse text is in the response `.content` field.
    English default bible_id = 3034 (Berean Standard Bible, public domain).
    Other languages/translations: pick the bibleId via GET /v1/bibles?language_ranges[]=<lang>.
    """
    if not live or requests is None:
        return {"reference": ref, "name": VERSE_NAME.get(ref, ref),
                "text": DEMO_VERSES_PD.get(ref, ""), "translation": "public domain"}
    passage_id = _to_yv_ref(ref)
    r = requests.get(f"{api_base}/bibles/{bible_id}/passages/{passage_id}",
                     headers={"X-YVP-App-Key": api_key, "Accept": "application/json"},
                     timeout=10)
    r.raise_for_status()
    d = r.json()
    return {"reference": ref, "name": VERSE_NAME.get(ref, ref),
            "text": d.get("content", ""), "translation": translation}


# Gloo real endpoints (see proxy/src/worker.js — the reference implementation).
GLOO_TOKEN_URL = "https://platform.ai.gloo.com/oauth2/token"
GLOO_CHAT_URL = "https://platform.ai.gloo.com/ai/v2/chat/completions"


def _gloo_token(api_key, requests):
    """Exchange Gloo client-credentials for a short-lived bearer token.

    `api_key` may be either "CLIENT_ID:CLIENT_SECRET" (real OAuth2 flow) or an
    already-minted bearer token (returned as-is).
    """
    if ":" not in api_key:
        return api_key  # already a bearer token
    client_id, client_secret = api_key.split(":", 1)
    r = requests.post(GLOO_TOKEN_URL,
                      data={"grant_type": "client_credentials", "scope": "api/access"},
                      auth=(client_id, client_secret), timeout=15)
    r.raise_for_status()
    return r.json()["access_token"]


def personalize(moment, verse, name="Maya", *, live=False,
                api_key="", requests=None):
    """DEMO: pastoral template. LIVE: Gloo AI (faith-tuned, OpenAI-compatible).

    Live path mirrors proxy/src/worker.js:
      1) OAuth2 client-credentials token exchange at platform.ai.gloo.com/oauth2/token
         (grant_type=client_credentials&scope=api/access, HTTP Basic CLIENT_ID:CLIENT_SECRET)
      2) POST platform.ai.gloo.com/ai/v2/chat/completions with Authorization: Bearer <token>
         body {messages:[...]}; model is optional (auto-routed).
    NOTE: the deployed proxy (proxy/src/worker.js) is the reference implementation and
    is what the web demo calls. Gloo is currently gated by a billing decline, so the
    proxy runs an honest labeled simulation (source:"gloo-sim") — see docs/GLOO-STATUS.md.
    """
    if not live or requests is None:
        return DEMO_NOTES.get(moment, "Keep going — He's with you.")
    token = _gloo_token(api_key, requests)
    prompt = (f"In one short, warm sentence a runner can read at a glance during "
              f"'{moment.replace('_',' ')}', encourage {name} with this verse: "
              f"\"{verse['text']}\" ({verse['reference']}). Pastoral, no preamble.")
    r = requests.post(GLOO_CHAT_URL,
                      headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                      json={"messages":[{"role":"user","content":prompt}], "max_tokens":40}, timeout=15)
    r.raise_for_status()
    return r.json()["choices"][0]["message"]["content"].strip()


def deliver(snap: Snapshot, name="Maya", *, live=False, yv_key="", gloo_key="", requests=None):
    """The full loop, once per snapshot."""
    m = classify_moment(snap.hr_zone, snap.effort_pct, snap.activity_type, snap.session_minute)
    ref, theme = MOMENT_VERSE.get(m, ("PHI.4.13", "strength"))
    verse = get_verse(ref, snap.translation, snap.language, live=live, api_key=yv_key, requests=requests)
    note  = personalize(m, verse, name, live=live, api_key=gloo_key, requests=requests)
    fmt, mode = delivery_for(m)
    return {"moment": m, "theme": theme, "color": THEME_COLOR.get(theme, "#38e1c0,#14b8a6"),
            "reference": verse["reference"], "name": verse["name"], "verse": verse["text"],
            "note": note, "format": fmt, "mode": mode,
            "hr": snap.heart_rate, "minute": snap.session_minute}
