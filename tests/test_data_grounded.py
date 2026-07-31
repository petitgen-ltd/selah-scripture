"""Test 3 — Data-grounded checks against the real competition CSVs.

`biometric movements.csv` is the provided session data; `verse movement mapping.csv`
is the provided verse mapping. We prove the engine is a faithful, complete superset
of what the demo data actually needs.
"""
import pytest


def test_every_data_moment_is_mapped(engine, biometric_rows):
    """Every moment_type that appears in the session data must have an engine mapping.
    If a data moment is genuinely unmapped, this documents it explicitly."""
    data_moments = {r["moment_type"] for r in biometric_rows if r.get("moment_type")}
    unmapped = sorted(data_moments - set(engine.MOMENT_VERSE))
    assert not unmapped, (
        f"session data uses moment_type(s) with no engine mapping: {unmapped}. "
        "Add them to MOMENT_VERSE or remove from the data."
    )


def test_mapping_csv_moments_are_mapped(engine, mapping_rows):
    data_moments = {r["moment_type"] for r in mapping_rows if r.get("moment_type")}
    unmapped = sorted(data_moments - set(engine.MOMENT_VERSE))
    assert not unmapped, f"verse mapping CSV uses unmapped moment_type(s): {unmapped}"


def test_referenced_verse_ids_have_demo_text(engine, biometric_rows):
    """Every verse id used in the data THAT THE ENGINE REFERENCES must have demo text.
    (The raw data may cite verses the engine deliberately doesn't ship; those are fine.)"""
    engine_refs = {ref for ref, _ in engine.MOMENT_VERSE.values()}
    data_refs = {r["assigned_verse_id"] for r in biometric_rows if r.get("assigned_verse_id")}
    referenced_by_engine = data_refs & engine_refs
    assert referenced_by_engine, "sanity: data and engine share at least one verse ref"
    missing = sorted(r for r in referenced_by_engine if not engine.DEMO_VERSES_PD.get(r, "").strip())
    assert not missing, f"engine-referenced verse ids without demo text: {missing}"


def test_engine_moments_are_superset_of_demo_need(engine, biometric_rows):
    """The engine's moment vocabulary covers everything the demo session drives."""
    data_moments = {r["moment_type"] for r in biometric_rows if r.get("moment_type")}
    assert data_moments <= set(engine.MOMENT_VERSE), (
        f"engine moments are not a superset of the data: "
        f"{sorted(data_moments - set(engine.MOMENT_VERSE))}"
    )


def test_csv_loads_with_pandas(biometric_rows):
    """The data is well-formed enough for the notebook's pandas pipeline."""
    pd = pytest.importorskip("pandas")
    from conftest import BIOMETRIC_CSV

    df = pd.read_csv(BIOMETRIC_CSV)
    assert len(df) == len(biometric_rows)
    for col in ("hr_zone", "effort_pct", "session_minute", "moment_type", "activity_type"):
        assert col in df.columns, f"missing expected column {col}"
    assert df["effort_pct"].between(0.0, 1.0).all(), "effort_pct out of [0,1]"


def test_data_verse_ids_have_names_when_engine_knows_them(engine, biometric_rows):
    engine_refs = set(engine.VERSE_NAME)
    data_refs = {r["assigned_verse_id"] for r in biometric_rows if r.get("assigned_verse_id")}
    for ref in data_refs & engine_refs:
        assert engine.VERSE_NAME[ref].strip(), f"{ref}: engine has no display name"
