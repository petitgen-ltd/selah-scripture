"""Test 6 — Live-mode wiring (no network).

We inject a fake `requests` object that records the call instead of hitting the
network, then assert the engine talks to the right YouVersion / Gloo endpoints with
Bearer auth and the correct request shape. This proves the live integration is wired
correctly without needing real API keys.
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

    def post(self, url, headers=None, json=None, timeout=None):
        self.post_calls.append(dict(url=url, headers=headers or {},
                                    json=json or {}, timeout=timeout))
        return _FakeResponse(self._post_payload)


def test_get_verse_live_calls_youversion(engine):
    fake = _FakeRequests(get_payload={"text": "traducción en vivo"})
    v = engine.get_verse("PHI.4.13", translation="RVR1960", language="es",
                          live=True, api_key="YV_SECRET", requests=fake)

    assert len(fake.get_calls) == 1, "expected exactly one YouVersion GET"
    call = fake.get_calls[0]
    # correct endpoint
    assert call["url"] == "https://api.youversion.com/v1/verses/PHI.4.13"
    # Bearer auth
    assert call["headers"]["Authorization"] == "Bearer YV_SECRET"
    assert call["headers"]["Accept"] == "application/json"
    # translation + language forwarded as params
    assert call["params"] == {"translation": "RVR1960", "language": "es"}
    assert call["timeout"] == 10
    # response is mapped through, NOT the demo text
    assert v["text"] == "traducción en vivo"
    assert v["translation"] == "RVR1960"
    assert v["reference"] == "PHI.4.13"


def test_get_verse_live_honors_custom_api_base(engine):
    fake = _FakeRequests(get_payload={"text": "x"})
    engine.get_verse("PSA.23.4", live=True, api_key="k", requests=fake,
                     api_base="https://staging.example.com/v9")
    assert fake.get_calls[0]["url"] == "https://staging.example.com/v9/verses/PSA.23.4"


def test_personalize_live_calls_gloo(engine):
    fake = _FakeRequests(post_payload={
        "choices": [{"message": {"content": "  Keep going, Maya.  "}}]
    })
    verse = {"reference": "PHI.4.13", "text": "I can do all things through Christ, who strengthens me."}
    note = engine.personalize("breakthrough_wall", verse, name="Maya",
                              live=True, api_key="GLOO_SECRET", requests=fake)

    assert len(fake.post_calls) == 1, "expected exactly one Gloo POST"
    call = fake.post_calls[0]
    assert call["url"] == "https://api.gloo.ai/studio/v1/chat/completions"
    assert call["headers"]["Authorization"] == "Bearer GLOO_SECRET"
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
        get_payload={"text": "live verse text"},
        post_payload={"choices": [{"message": {"content": "live note"}}]},
    )
    snap = engine.Snapshot(heart_rate=174, hr_zone=5, effort_pct=0.91,
                           activity_type="running", session_minute=10,
                           translation="ESV", language="en")
    out = engine.deliver(snap, name="Maya", live=True,
                         yv_key="YV", gloo_key="GLOO", requests=fake)
    assert len(fake.get_calls) == 1 and len(fake.post_calls) == 1
    # YouVersion got the yv_key, Gloo got the gloo_key
    assert fake.get_calls[0]["headers"]["Authorization"] == "Bearer YV"
    assert fake.post_calls[0]["headers"]["Authorization"] == "Bearer GLOO"
    assert out["verse"] == "live verse text"
    assert out["note"] == "live note"


def test_live_falls_back_to_demo_without_requests(engine):
    """live=True but no requests object => safe demo behavior, no crash."""
    v = engine.get_verse("PHI.4.13", live=True, api_key="k", requests=None)
    assert v["text"].strip()
    assert "public domain" in v["translation"].lower()
