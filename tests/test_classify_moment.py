"""Test 2 — classify_moment behavior.

The classifier is the tiny on-device model. These lock its documented behavior and
prove it never emits a moment the engine can't act on.
"""
import pytest


def test_warmup_at_minute_zero(engine):
    assert engine.classify_moment(1, 0.10, "running", minute=0, session_len=30) == "warmup"
    # minute 0 wins regardless of effort/activity
    assert engine.classify_moment(5, 0.99, "hiit", minute=0, session_len=30) == "warmup"


def test_post_workout_at_last_minute(engine):
    assert engine.classify_moment(2, 0.20, "running", minute=29, session_len=30) == "post_workout"
    assert engine.classify_moment(4, 0.80, "weightlifting", minute=29, session_len=30) == "post_workout"


def test_peak_effort_for_running(engine):
    assert engine.classify_moment(5, 0.90, "running", minute=10, session_len=30) == "peak_effort"
    assert engine.classify_moment(4, 0.88, "running", minute=10, session_len=30) == "peak_effort"
    # high zone alone triggers peak_effort
    assert engine.classify_moment(5, 0.60, "cycling", minute=10, session_len=30) == "peak_effort"


def test_breakthrough_wall_for_running(engine):
    assert engine.classify_moment(4, 0.78, "running", minute=10, session_len=30) == "breakthrough_wall"


def test_final_rep_for_weightlifting(engine):
    assert engine.classify_moment(4, 0.85, "weightlifting", minute=10, session_len=30) == "final_rep"


def test_working_set_and_rest_for_weightlifting(engine):
    assert engine.classify_moment(3, 0.60, "weightlifting", minute=10, session_len=30) == "working_set"
    assert engine.classify_moment(1, 0.20, "weightlifting", minute=10, session_len=30) == "rest_set"


def test_redline_for_hiit(engine):
    assert engine.classify_moment(5, 0.95, "hiit", minute=10, session_len=30) == "redline"
    assert engine.classify_moment(5, 0.60, "hiit", minute=10, session_len=30) == "redline"  # zone>=5


def test_active_recovery_for_hiit_low_effort(engine):
    assert engine.classify_moment(2, 0.30, "hiit", minute=10, session_len=30) == "active_recovery"


def test_recovery_at_low_effort_running(engine):
    assert engine.classify_moment(1, 0.10, "running", minute=10, session_len=30) == "recovery_window"


@pytest.mark.parametrize("activity", ["running", "cycling", "weightlifting", "hiit"])
def test_always_returns_known_moment(engine, activity):
    """Fuzz the input space — every result must be a key of MOMENT_VERSE."""
    for zone in range(1, 6):
        for eff10 in range(0, 11):
            eff = eff10 / 10.0
            for minute in (0, 1, 5, 15, 29, 30):
                m = engine.classify_moment(zone, eff, activity, minute=minute, session_len=30)
                assert m in engine.MOMENT_VERSE, f"{activity} z{zone} e{eff} m{minute} -> {m!r}"


def test_monotonic_intensity_for_running(engine):
    """Higher effort => a moment at least as intense (running, mid-session)."""
    rank = {
        "recovery_window": 0,
        "early_push": 1,
        "steady_state": 2,
        "breakthrough_wall": 3,
        "peak_effort": 4,
    }
    prev = -1
    for eff10 in range(0, 11):
        eff = eff10 / 10.0
        m = engine.classify_moment(3, eff, "running", minute=10, session_len=30)
        assert m in rank, f"unexpected running moment {m!r} at effort {eff}"
        assert rank[m] >= prev, f"non-monotonic at effort {eff}: {m} ranked below previous"
        prev = rank[m]
