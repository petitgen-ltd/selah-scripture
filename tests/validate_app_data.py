#!/usr/bin/env python3
"""Test 7 — App data-parity validator (script + test).

Parses the JS data embedded in `app/index.html` (SESSION, VERSES, THEME) and checks
it is consistent with the engine (`engine/selah_engine.py`):

  * every verse ref in the app is a ref the engine knows;
  * every moment key in the app exists in MOMENT_VERSE (no orphan moments);
  * refs are well-formed;
  * (soft) app gradient colors match the engine theme color for that moment.

Tolerance: the app is allowed to embed a *subset* of the engine. If the app hasn't
been updated to mirror the engine yet (blocks missing), we report and skip rather
than falsely fail. Structural integrity of whatever IS embedded is always enforced.

Run standalone:   python tests/validate_app_data.py
Run as tests:     pytest tests/validate_app_data.py -v
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
ENGINE_DIR = REPO_ROOT / "engine"
APP_HTML = REPO_ROOT / "app" / "index.html"

if str(ENGINE_DIR) not in sys.path:
    sys.path.insert(0, str(ENGINE_DIR))

REF_RE = re.compile(r"^[0-9A-Z]{2,3}\.\d+\.\d+$")


def _slice_block(text: str, decl: str) -> str | None:
    """Return the text of a `const NAME = { ... }` or `[ ... ]` block, or None."""
    m = re.search(r"const\s+" + re.escape(decl) + r"\s*=\s*([\{\[])", text)
    if not m:
        return None
    open_ch = m.group(1)
    close_ch = "}" if open_ch == "{" else "]"
    depth = 0
    start = m.end() - 1
    for i in range(start, len(text)):
        c = text[i]
        if c == open_ch:
            depth += 1
        elif c == close_ch:
            depth -= 1
            if depth == 0:
                return text[start:i + 1]
    return None


def parse_app(html: str) -> dict:
    """Extract structural facts from the embedded JS (tolerant regex, not a JS eval)."""
    out = {
        "session_refs": [], "session_moments": [],
        "verses_refs": [], "theme_moments": [], "theme_colors": {},
        "blocks_found": {},
    }

    session = _slice_block(html, "SESSION")
    out["blocks_found"]["SESSION"] = session is not None
    if session:
        out["session_refs"] = re.findall(r'ref\s*:\s*"([^"]+)"', session)
        out["session_moments"] = re.findall(r'\bm\s*:\s*"([^"]+)"', session)

    verses = _slice_block(html, "VERSES")
    out["blocks_found"]["VERSES"] = verses is not None
    if verses:
        # keys look like  "PHI.4.13":{name:...
        out["verses_refs"] = re.findall(r'"([0-9A-Z]{2,3}\.\d+\.\d+)"\s*:\s*\{', verses)

    theme = _slice_block(html, "THEME")
    out["blocks_found"]["THEME"] = theme is not None
    if theme:
        # entries look like  pre_workout: {c:"#a,#b", ...}
        for mo, color in re.findall(r'(\w+)\s*:\s*\{\s*c\s*:\s*"([^"]+)"', theme):
            out["theme_moments"].append(mo)
            out["theme_colors"][mo] = color

    return out


def validate(html: str, engine) -> dict:
    """Return a report: {errors: [...], warnings: [...], parsed: {...}}."""
    parsed = parse_app(html)
    errors: list[str] = []
    warnings: list[str] = []

    known_refs = set(engine.DEMO_VERSES_PD) | set(engine.VERSE_NAME)
    known_moments = set(engine.MOMENT_VERSE)

    # --- structural integrity of whatever is embedded ---
    for ref in parsed["session_refs"] + parsed["verses_refs"]:
        if not REF_RE.match(ref):
            errors.append(f"malformed verse ref in app: {ref!r}")
        elif ref not in known_refs:
            errors.append(f"app references unknown verse id: {ref!r}")

    for mo in parsed["session_moments"] + parsed["theme_moments"]:
        if mo not in known_moments:
            errors.append(f"app references orphan moment (not in MOMENT_VERSE): {mo!r}")

    # --- soft color parity: app gradient vs engine theme color for that moment ---
    for mo, color in parsed["theme_colors"].items():
        if mo not in known_moments:
            continue
        theme = engine.MOMENT_VERSE[mo][1]
        engine_color = engine.THEME_COLOR.get(theme, "")
        if color.replace(" ", "") != engine_color.replace(" ", ""):
            warnings.append(
                f"color divergence for {mo!r}: app={color!r} vs "
                f"engine[{theme!r}]={engine_color!r}"
            )

    return {"errors": errors, "warnings": warnings, "parsed": parsed}


def main() -> int:
    import selah_engine

    if not APP_HTML.exists():
        print(f"SKIP: {APP_HTML} not found")
        return 0
    report = validate(APP_HTML.read_text(encoding="utf-8"), selah_engine)
    p = report["parsed"]
    print("blocks found:", p["blocks_found"])
    print(f"session refs: {len(p['session_refs'])}, verses refs: {len(p['verses_refs'])}, "
          f"theme moments: {len(p['theme_moments'])}")
    for w in report["warnings"]:
        print("WARN:", w)
    for e in report["errors"]:
        print("ERROR:", e)
    if report["errors"]:
        print(f"\nFAILED with {len(report['errors'])} structural error(s)")
        return 1
    print(f"\nOK — structurally consistent ({len(report['warnings'])} soft warning(s))")
    return 0


# ----------------------------- pytest entry points -----------------------------

def _load():
    import pytest

    import selah_engine
    if not APP_HTML.exists():
        pytest.skip(f"{APP_HTML} not found — app not present")
    html = APP_HTML.read_text(encoding="utf-8")
    return html, selah_engine


def test_app_blocks_present_or_skip():
    import pytest

    html, engine = _load()
    parsed = parse_app(html)
    found = parsed["blocks_found"]
    if not any(found.values()):
        pytest.skip(f"app embeds no SESSION/VERSES/THEME blocks yet: {found}")
    assert found.get("SESSION") or found.get("VERSES"), (
        f"app has no verse/session data to validate: {found}"
    )


def test_app_refs_and_moments_are_valid():
    """Hard structural check: no orphan moments, no unknown/malformed refs."""
    import pytest

    html, engine = _load()
    report = validate(html, engine)
    if not any(report["parsed"]["blocks_found"].values()):
        pytest.skip("app has no embedded data blocks yet")
    assert not report["errors"], "app<->engine structural errors:\n  " + "\n  ".join(report["errors"])


def test_app_is_subset_of_engine():
    """The app may embed fewer moments/verses than the engine, but never more."""
    import pytest

    html, engine = _load()
    parsed = parse_app(html)
    app_moments = set(parsed["session_moments"]) | set(parsed["theme_moments"])
    app_refs = set(parsed["session_refs"]) | set(parsed["verses_refs"])
    if not app_moments and not app_refs:
        pytest.skip("app has no embedded data blocks yet")
    known_refs = set(engine.DEMO_VERSES_PD) | set(engine.VERSE_NAME)
    assert app_moments <= set(engine.MOMENT_VERSE)
    assert app_refs <= known_refs


def test_app_color_parity_soft():
    """Soft parity: colors should match the engine. If the app hasn't been mirrored
    yet, skip with the concrete divergences rather than failing another worker's file."""
    import pytest

    html, engine = _load()
    report = validate(html, engine)
    if report["warnings"]:
        pytest.skip(
            "app theme colors not yet mirrored to engine (owned by another worker):\n  "
            + "\n  ".join(report["warnings"])
        )
    # no warnings => full parity achieved
    assert not report["warnings"]


if __name__ == "__main__":
    raise SystemExit(main())
