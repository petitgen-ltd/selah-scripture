"""Test 6 — Live-mode wiring (no network).

We inject a fake `requests` object that records the call instead of hitting the
network, then assert the engine talks to the right YouVersion / Gloo endpoints with
the correct auth and request shape. This proves the live integration is wired
correctly (mirroring proxy/src/worker.js) without needing real API keys.
"""
import pytest


class _FakeResponse:
    def __init__(self, payload):
        self._payload = payload
        self.raised = False

    def raise_for_status(self):
        self.raised = True

    def json(self):
        return self._payload


class _FakeRequests:
    """Records the last GET/POST and returns a canned response."""
    def __init__(self, get_payload=None, post_payload=None):
        self._get_payload = get_payload or {}
        self._post_payload = post_payload or {}
        self.get_calls = []
        self.post_calls = []

    def get(self, url, headers=None, params=None, timeout=None):
        self.get_calls.append(dict(url=url, headers=headers or {},
                                   params=params or {}, timeout=timeout))
        return _FakeResponse(self._get_payload)

    def post(self, url, headers=None, json=None, data=None, auth=None, timeout=None):
        self.post_calls.append(dict(url=url, headers=headers or {},
                                    json=json or {}, data=data, auth=auth,
                                    timeout=timeout))
        return _FakeResponse(self._post_payload)


def test_get_verse_live_calls_youversion(engine):
    # verse text lives in the response `.content` field (YouVersion Platform API)
    fake = _FakeRequests(get_payload={"content": "traducción en vivo"})
    v = engine.get_verse("PHI.4.13", translation="RVR1960", language="es",
                          live=True, api_key="YV_SECRET", requests=fake)

    assert len(fake.get_calls) == 1, "expected exactly one YouVersion GET"
    call = fake.get_calls[0]
    # correct endpoint: /bibles/{bibleId}/passages/{passageId}; PHI → USFM PHP
    assert call["url"] == "https://api.youversion.com/v1/bibles/3034/passages/PHP.4.13"
    # app-key header, NOT Authorization: Bearer
    assert call["headers"]["X-YVP-App-Key"] == "YV_SECRET"
    assert "Authorization" not in call["headers"]
    assert call["headers"]["Accept"] == "application/json"
    assert call["timeout"] == 10
    # response `.content` is mapped through, NOT the demo text
    assert v["text"] == "traducción en vivo"
    assert v["translation"] == "RVR1960"
    assert v["reference"] == "PHI.4.13"


def test_get_verse_live_honors_custom_api_base_and_bible_id(engine):
    fake = _FakeRequests(get_payload={"content": "x"})
    engine.get_verse("PSA.23.4", live=True, api_key="k", requests=fake,
                     api_base="https://staging.example.com/v9", bible_id=111)
    assert fake.get_calls[0]["url"] == "https://staging.example.com/v9/bibles/111/passages/PSA.23.4"


def test_personalize_live_calls_gloo(engine):
    # api_key without a colon is treated as an already-minted bearer token → no token exchange
    fake = _FakeRequests(post_payload={
        "choices": [{"message": {"content": "  Keep going, Maya.  "}}]
    })
    verse = {"reference": "PHI.4.13", "text": "I can do all things through Christ, who strengthens me."}
    note = engine.personalize("breakthrough_wall", verse, name="Maya",
                              live=True, api_key="GLOO_TOKEN", requests=fake)

    assert len(fake.post_calls) == 1, "expected exactly one Gloo chat POST"
    call = fake.post_calls[0]
    assert call["url"] == "https://platform.ai.gloo.com/ai/v2/chat/completions"
    assert call["headers"]["Authorization"] == "Bearer GLOO_TOKEN"
    assert call["headers"]["Content-Type"] == "application/json"
    body = call["json"]
    assert body["messages"][0]["role"] == "user"
    # the prompt carries the verse + reference + humanized moment
    prompt = body["messages"][0]["content"]
    assert "breakthrough wall" in prompt
    assert "PHI.4.13" in prompt
    assert "Maya" in prompt
    assert "max_tokens" in body
    assert call["timeout"] == 15
    # content is extracted and stripped
    assert note == "Keep going, Maya."


def test_deliver_live_uses_both_apis(engine):
    """The full loop in live mode drives YouVersion (verse) then Gloo (note)."""
    fake = _FakeRequests(
        get_payload={"content": "live verse text"},
        post_payload={"choices": [{"message": {"content": "live note"}}]},
    )
    snap = engine.Snapshot(heart_rate=174, hr_zone=5, effort_pct=0.91,
                           activity_type="running", session_minute=10,
                           translation="ESV", language="en")
    out = engine.deliver(snap, name="Maya", live=True,
                         yv_key="YV", gloo_key="GLOO", requests=fake)
    assert len(fake.get_calls) == 1 and len(fake.post_calls) == 1
    # YouVersion got the yv_key (app-key header), Gloo got the gloo_key (bearer)
    assert fake.get_calls[0]["headers"]["X-YVP-App-Key"] == "YV"
    assert fake.post_calls[0]["headers"]["Authorization"] == "Bearer GLOO"
    assert out["verse"] == "live verse text"
    assert out["note"] == "live note"


def test_personalize_live_exchanges_client_credentials(engine):
    """CLIENT_ID:CLIENT_SECRET triggers the OAuth2 token exchange, then chat."""
    fake = _FakeRequests(post_payload={
        # first POST = token exchange, second POST = chat completion
        "access_token": "MINTED_TOKEN",
        "choices": [{"message": {"content": "onward"}}],
    })
    verse = {"reference": "PHI.4.13", "text": "..."}
    engine.personalize("breakthrough_wall", verse, name="Maya",
                       live=True, api_key="CID:CSECRET", requests=fake)

    assert len(fake.post_calls) == 2, "expected token exchange + chat POST"
    token_call, chat_call = fake.post_calls
    assert token_call["url"] == "https://platform.ai.gloo.com/oauth2/token"
    assert token_call["data"] == {"grant_type": "client_credentials", "scope": "api/access"}
    assert token_call["auth"] == ("CID", "CSECRET")  # HTTP Basic
    assert chat_call["url"] == "https://platform.ai.gloo.com/ai/v2/chat/completions"
    assert chat_call["headers"]["Authorization"] == "Bearer MINTED_TOKEN"


def test_live_falls_back_to_demo_without_requests(engine):
    """live=True but no requests object => safe demo behavior, no crash."""
    v = engine.get_verse("PHI.4.13", live=True, api_key="k", requests=None)
    assert v["text"].strip()
    assert "public domain" in v["translation"].lower()
