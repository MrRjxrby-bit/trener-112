from rapidfuzz import fuzz
from typing import Optional


def score_action(scenario, submitted: dict, duration_sec: Optional[float]) -> dict:
    expected = scenario.payload or {}
    time_limit = scenario.time_limit_sec or 30

    duration = float(duration_sec or 0)
    timing_delta = duration - time_limit
    timing_ok = timing_delta <= 0

    exp_text = (expected.get("expected_text") or "").strip().lower()
    got_text = (submitted.get("text") or "").strip().lower()
    text_similarity = fuzz.token_sort_ratio(exp_text, got_text) if exp_text else 0.0

    exp_signs = expected.get("expected_signs") or {}
    got_signs = submitted.get("signs") or {}
    signs_total = max(len(exp_signs), 1)
    signs_match = sum(1 for k, v in exp_signs.items() if got_signs.get(k) == v)
    signs_ratio = signs_match / signs_total

    exp_srv = set(expected.get("expected_services") or [])
    got_srv = set(submitted.get("services") or [])
    services_ratio = len(exp_srv & got_srv) / len(exp_srv) if exp_srv else 1.0

    grammar_ok = bool(got_text) and "  " not in got_text

    score = (
        (100 if timing_ok else max(0, 100 - timing_delta * 2)) * 0.30 +
        text_similarity * 0.30 +
        signs_ratio * 100 * 0.20 +
        services_ratio * 100 * 0.15 +
        (100 if grammar_ok else 0) * 0.05
    )

    return {
        "score": round(score, 2),
        "timing_delta_sec": round(timing_delta, 2),
        "timing_ok": timing_ok,
        "grammar_ok": grammar_ok,
        "text_similarity": round(text_similarity, 2),
        "details": {
            "signs_ratio": round(signs_ratio, 3),
            "services_ratio": round(services_ratio, 3),
            "expected_signs": exp_signs,
            "got_signs": got_signs,
            "expected_services": list(exp_srv),
            "got_services": list(got_srv),
        },
    }