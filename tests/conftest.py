"""Shared fixtures + path wiring for the Selah test-suite.

Makes `engine/selah_engine.py` importable and exposes the repo root and the two
competition CSVs to every test.
"""
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
ENGINE_DIR = REPO_ROOT / "engine"

# Make `import selah_engine` work from anywhere.
if str(ENGINE_DIR) not in sys.path:
    sys.path.insert(0, str(ENGINE_DIR))

BIOMETRIC_CSV = REPO_ROOT / "biometric movements.csv"
MAPPING_CSV = REPO_ROOT / "verse movement mapping.csv"
APP_HTML = REPO_ROOT / "app" / "index.html"


@pytest.fixture(scope="session")
def repo_root() -> Path:
    return REPO_ROOT


@pytest.fixture(scope="session")
def engine():
    import selah_engine

    return selah_engine


@pytest.fixture(scope="session")
def biometric_rows():
    """Rows of `biometric movements.csv` as a list of dicts (csv stdlib — no hard
    pandas dependency for the core assertions)."""
    import csv

    if not BIOMETRIC_CSV.exists():
        pytest.skip(f"missing data file: {BIOMETRIC_CSV}")
    with BIOMETRIC_CSV.open(newline="") as fh:
        return list(csv.DictReader(fh))


@pytest.fixture(scope="session")
def mapping_rows():
    import csv

    if not MAPPING_CSV.exists():
        pytest.skip(f"missing data file: {MAPPING_CSV}")
    with MAPPING_CSV.open(newline="") as fh:
        return list(csv.DictReader(fh))
