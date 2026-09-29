from collections import Counter
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.session import Report
from app.models.scenario import Scenario
from app.auth.deps import require_teacher

router = APIRouter()


@router.post("/generate-scenario")
def gen(incident_type_code: str = "16", user: User = Depends(require_teacher)):
    from app.services.ai_stub import generate_scenario
    return generate_scenario(incident_type_code)


@router.get("/insights")
def insights(db: Session = Depends(get_db), _: User = Depends(require_teacher)):
    reports = db.query(Report).order_by(Report.id.desc()).limit(500).all()
    scenarios = {s.id: s for s in db.query(Scenario).all()}

    if not reports:
        return {
            "total_reports": 0,
            "avg_score": 0,
            "avg_timing_delta": 0,
            "top_errors": [],
            "worst_scenarios": [],
            "score_distribution": [],
        }

    total = len(reports)
    avg_score = round(sum(r.score for r in reports) / total, 2)

    timing_deltas = [r.timing_delta_sec for r in reports if r.timing_delta_sec is not None]
    avg_timing_delta = (
        round(sum(timing_deltas) / len(timing_deltas), 2) if timing_deltas else 0
    )

    errors = Counter()
    for r in reports:
        d = r.details or {}
        if not r.timing_ok:
            errors["Превышение тайминга"] += 1
        if not r.grammar_ok:
            errors["Грамматические ошибки"] += 1
        if (d.get("signs_ratio", 1) or 0) < 1:
            errors["Неверные признаки"] += 1
        if (d.get("services_ratio", 1) or 0) < 1:
            errors["Неверные службы"] += 1
        if (r.text_similarity or 0) < 70:
            errors["Неверный/неполный текст ответа"] += 1

    top_errors = [
        {"label": label, "count": count, "percent": round(count * 100 / total, 1)}
        for label, count in errors.most_common(5)
    ]

    by_scenario: dict[int, list[float]] = {}
    for r in reports:
        by_scenario.setdefault(r.scenario_id, []).append(r.score)

    worst = []
    for sid, scores in by_scenario.items():
        avg = sum(scores) / len(scores)
        worst.append(
            {
                "scenario_id": sid,
                "title": scenarios.get(sid).title if scenarios.get(sid) else f"#{sid}",
                "avg_score": round(avg, 2),
                "attempts": len(scores),
            }
        )
    worst.sort(key=lambda x: x["avg_score"])
    worst_scenarios = worst[:3]

    buckets = {"0–49": 0, "50–69": 0, "70–84": 0, "85–100": 0}
    for r in reports:
        s = r.score or 0
        if s < 50:
            buckets["0–49"] += 1
        elif s < 70:
            buckets["50–69"] += 1
        elif s < 85:
            buckets["70–84"] += 1
        else:
            buckets["85–100"] += 1

    score_distribution = [
        {"range": k, "count": v, "percent": round(v * 100 / total, 1)}
        for k, v in buckets.items()
    ]

    return {
        "total_reports": total,
        "avg_score": avg_score,
        "avg_timing_delta": avg_timing_delta,
        "top_errors": top_errors,
        "worst_scenarios": worst_scenarios,
        "score_distribution": score_distribution,
    }


@router.get("/heatmap")
def heatmap(db: Session = Depends(get_db), _: User = Depends(require_teacher)):
    """
    Тепловая карта ошибок: сценарии × типы ошибок.

    Для каждого сценария считаем % отчётов, в которых по каждому критерию
    была ошибка (0–100). Возвращаем:
    - columns: список типов ошибок (столбцы)
    - rows: по сценарию — название, число попыток и значения по столбцам
    """
    reports = db.query(Report).order_by(Report.id.desc()).limit(1000).all()
    scenarios = {s.id: s for s in db.query(Scenario).all()}

    if not reports:
        return {"columns": [], "rows": []}

    columns = [
        {"key": "timing", "label": "Тайминг"},
        {"key": "text", "label": "Текст"},
        {"key": "signs", "label": "Признаки"},
        {"key": "services", "label": "Службы"},
        {"key": "grammar", "label": "Грамматика"},
    ]

    # группируем отчёты по сценарию
    grouped: dict[int, list[Report]] = {}
    for r in reports:
        grouped.setdefault(r.scenario_id, []).append(r)

    rows = []
    for sid, reps in grouped.items():
        n = len(reps)

        def err_share(predicate):
            return round(sum(1 for x in reps if predicate(x)) * 100 / n, 1)

        row = {
            "scenario_id": sid,
            "title": scenarios.get(sid).title if scenarios.get(sid) else f"#{sid}",
            "attempts": n,
            "values": {
                "timing": err_share(lambda x: not x.timing_ok),
                "text": err_share(lambda x: (x.text_similarity or 0) < 70),
                "signs": err_share(
                    lambda x: ((x.details or {}).get("signs_ratio", 1) or 0) < 1
                ),
                "services": err_share(
                    lambda x: ((x.details or {}).get("services_ratio", 1) or 0) < 1
                ),
                "grammar": err_share(lambda x: not x.grammar_ok),
            },
        }
        rows.append(row)

    # сортируем по среднему % ошибок (сначала проблемные)
    def row_avg(row):
        vals = list(row["values"].values())
        return sum(vals) / len(vals) if vals else 0

    rows.sort(key=row_avg, reverse=True)

    return {"columns": columns, "rows": rows}