import json
from pathlib import Path

DATA = Path(__file__).parent

def load(name):
    return json.loads((DATA / name).read_text(encoding="utf-8"))

def check_unique(items, key):
    seen = set()
    for it in items:
        assert it[key] not in seen, f"Duplicate {key}={it[key]}"
        seen.add(it[key])

if __name__ == "__main__":
    it = load("incident_types.json")["incident_types"]
    sv = load("services.json")["services"]
    ok = load("regions.json")["okrugs"]
    sg = load("feature_signs.json")["signs"]

    check_unique(it, "code")
    check_unique(sv, "code")
    check_unique(ok, "code")
    check_unique(sg, "code")

    assert len(it) == 43, f"Ожидалось 43 типа, получено {len(it)}"
    print(f"OK: types={len(it)}, services={len(sv)}, okrugs={len(ok)}, signs={len(sg)}")