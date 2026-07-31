"""Test 1 — Engine internal consistency (no dangling references).

Every moment in MOMENT_VERSE must have:
  (a) a verse ref present in both DEMO_VERSES_PD and VERSE_NAME, and
  (b) a DELIVERY entry with a valid mode in {interrupt, ambient}.
Every THEME used in MOMENT_VERSE must exist in THEME_COLOR.
"""
import pytest

VALID_MODES = {"interrupt", "ambient"}


def test_every_moment_has_demo_text(engine):
    for moment, (ref, theme) in engine.MOMENT_VERSE.items():
        assert ref in engine.DEMO_VERSES_PD, f"{moment}: ref {ref} missing demo text"
        assert engine.DEMO_VERSES_PD[ref].strip(), f"{ref}: demo text is empty"


def test_every_moment_has_verse_name(engine):
    for moment, (ref, theme) in engine.MOMENT_VERSE.items():
        assert ref in engine.VERSE_NAME, f"{moment}: ref {ref} missing VERSE_NAME"
        assert engine.VERSE_NAME[ref].strip(), f"{ref}: verse name is empty"


def test_every_moment_has_valid_delivery(engine):
    for moment in engine.MOMENT_VERSE:
        assert moment in engine.DELIVERY, f"{moment}: no DELIVERY entry"
        fmt, mode = engine.DELIVERY[moment]
        assert fmt.strip(), f"{moment}: empty delivery format"
        assert mode in VALID_MODES, f"{moment}: invalid mode {mode!r}"


def test_every_theme_has_color(engine):
    for moment, (ref, theme) in engine.MOMENT_VERSE.items():
        assert theme in engine.THEME_COLOR, f"{moment}: theme {theme!r} not in THEME_COLOR"


def test_theme_colors_are_two_hex_gradients(engine):
    for theme, color in engine.THEME_COLOR.items():
        parts = color.split(",")
        assert len(parts) == 2, f"{theme}: expected 'hexA,hexB', got {color!r}"
        for p in parts:
            p = p.strip()
            assert p.startswith("#") and len(p) == 7, f"{theme}: bad hex {p!r}"
            int(p[1:], 16)  # raises if not hex


def test_delivery_keys_are_subset_of_moments(engine):
    """DELIVERY should not reference moments the mapping doesn't know."""
    extra = set(engine.DELIVERY) - set(engine.MOMENT_VERSE)
    assert not extra, f"DELIVERY has moments absent from MOMENT_VERSE: {extra}"


def test_verse_name_keys_cover_demo_verses(engine):
    """Every demo verse must be nameable (no anonymous refs surface to a user)."""
    missing = set(engine.DEMO_VERSES_PD) - set(engine.VERSE_NAME)
    assert not missing, f"DEMO_VERSES_PD refs without a VERSE_NAME: {missing}"


def test_demo_notes_moments_are_known(engine):
    """DEMO_NOTES may cover a subset of moments, but never an unknown moment."""
    unknown = set(engine.DEMO_NOTES) - set(engine.MOMENT_VERSE)
    assert not unknown, f"DEMO_NOTES references unknown moments: {unknown}"
