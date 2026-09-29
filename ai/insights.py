from collections import Counter

def group_insights(reports: list[dict]) -> dict:
    """reports: список ReportOut.details + score."""
    errors = Counter()
    total = len(reports)
    for r in reports:
        d = r.get("details") or {}
        if d.get("signs_ratio", 1) < 1:
            errors["Неверные признаки"] += 1
        if d.get("services_ratio", 1) < 1:
            errors["Неверные службы"] += 1
        if not r.get("timing_ok"):
            errors["Превышение тайминга"] += 1
        if not r.get("grammar_ok"):
            errors["Грамматические ошибки"] += 1
    return {
        "total_reports": total,
        "top_errors": errors.most_common(5),
        "avg_score": sum(r["score"] for r in reports) / total if total else 0,
    }
