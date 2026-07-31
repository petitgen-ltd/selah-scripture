"""Tests 4 & 5 — get_verse / personalize / deliver in demo mode, IP-safety, and the
full end-to-end loop on real snapshots.
"""
import pytest

# The copyrighted NIV wording of Philippians 4:13 — demo mode must NEVER emit this.
NIV_PHIL_413 = "I can do all this through him who gives me strength."
# The public-domain WEB wording the engine is supposed to use.
WEB_PHIL_413_FRAGMENT = "through Christ, who strengthens me"


def test_get_verse_demo_shape(engine):
    v = engine.get_verse("PHI.4.13")
    assert set(v) == {"reference", "name", "text", "translation"}
    assert v["reference"] == "PHI.4.13"
    assert v["name"] == "Philippians 4:13"
    assert v["text"].strip(), "demo verse text must be non-empty"
    assert "public domain" in v["translation"].lower()


def test_get_verse_unknown_ref_is_safe(engine):
    v = engine.get_verse("XYZ.9.9")
    assert v["reference"] == "XYZ.9.9"
    assert v["text"] == ""  # graceful empty, no crash


def test_demo_verse_is_public_domain_not_niv(engine):
    """IP-safety (Rules §3.14): demo mode ships World English Bible text, NOT the
    copyrighted NIV translation."""
    v = engine.get_verse("PHI.4.13")
    assert v["text"] != NIV_PHIL_413, "demo mode leaked the copyrighted NIV text!"
    assert WEB_PHIL_413_FRAGMENT in v["text"], f"expected WEB wording, got: {v['text']!r}"


def test_no_demo_verse_matches_known_niv_string(engine):
    """Belt-and-suspenders: the exact NIV Phil 4:13 string must not appear anywhere
    in the shipped public-domain corpus."""
    for ref, text in engine.DEMO_VERSES_PD.items():
        assert text != NIV_PHIL_413, f"{ref} carries copyrighted NIV text"


def test_personalize_demo_shape(engine):
    note = engine.personalize("breakthrough_wall", engine.get_verse("PHI.4.13"))
    assert isinstance(note, str) and note.strip()


def test_personalize_falls_back_for_unmapped_moment(engine):
    note = engine.personalize("some_unknown_moment", engine.get_verse("PHI.4.13"))
    assert isinstance(note, str) and note.strip()


def test_deliver_demo_shape(engine):
    snap = engine.Snapshot(heart_rate=174, hr_zone=5, effort_pct=0.91,
                           activity_type="running", session_minute=10)
    out = engine.deliver(snap)
    expected_keys = {"moment", "theme", "color", "reference", "name", "verse",
                     "note", "format", "mode", "hr", "minute"}
    assert expected_keys <= set(out)
    assert out["moment"] == "peak_effort"
    assert out["verse"].strip(), "delivered verse text must be non-empty"
    assert out["mode"] in {"interrupt", "ambient"}
    # mode must agree with DELIVERY for the classified moment
    assert out["mode"] == engine.DELIVERY[out["moment"]][1]
    assert out["format"] == engine.DELIVERY[out["moment"]][0]
    # color must match the theme's gradient
    assert out["color"] == engine.THEME_COLOR[out["theme"]]


def _real_snapshots(engine, biometric_rows, limit=12):
    snaps = []
    for r in biometric_rows[:limit]:
        snaps.append(engine.Snapshot(
            heart_rate=int(r["heart_rate"]),
            hr_zone=int(r["hr_zone"]),
            effort_pct=float(r["effort_pct"]),
            recovery_score=int(r.get("recovery_score") or 70),
            stress_index=float(r.get("stress_index") or 2.0),
            activity_type=r.get("activity_type", "running"),
            session_minute=int(r["session_minute"]),
            translation=r.get("translation", "WEB"),
        ))
    return snaps


def test_deliver_end_to_end_on_real_snapshots(engine, biometric_rows):
    """Test 5 — run the full loop on real rows from the CSV."""
    snaps = _real_snapshots(engine, biometric_rows)
    assert snaps, "no snapshots built from data"
    for snap in snaps:
        out = engine.deliver(snap)
        assert out["moment"] in engine.MOMENT_VERSE
        assert out["reference"] in engine.DEMO_VERSES_PD
        assert out["verse"].strip(), f"empty verse for moment {out['moment']}"
        assert out["note"].strip()
        assert out["format"].strip()
        assert out["mode"] == engine.DELIVERY[out["moment"]][1]
        assert out["color"] == engine.THEME_COLOR[out["theme"]]
        assert "," in out["color"]  # two-stop gradient
