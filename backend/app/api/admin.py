import csv
import io
from collections import defaultdict
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, RoleEnum
from app.models.audit import AuditLog
from app.models.scenario import Scenario
from app.models.session import Report, TrainingSession
from app.auth.deps import require_admin
from app.auth.security import hash_password
from app.auth.audit import log
from app.services.backup import run_backup

router = APIRouter()


# ============ ПОЛЬЗОВАТЕЛИ ============
@router.get("/users")
def users(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    return [
        {
            "id": u.id,
            "username": u.username,
            "full_name": u.full_name,
            "role": u.role.value,
            "is_active": u.is_active,
        }
        for u in db.query(User).all()
    ]


@router.post("/users")
def create_user(
    username: str,
    full_name: str,
    password: str,
    role: RoleEnum,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    if db.query(User).filter(User.username == username).first():
        raise HTTPException(400, "Username exists")
    u = User(
        username=username,
        full_name=full_name,
        hashed_password=hash_password(password),
        role=role,
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    log(db, admin.id, "user.create", "user", u.id, payload={"role": role.value})
    return {"id": u.id}


@router.post("/users/{uid}/toggle")
def toggle(uid: int, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    u = db.query(User).get(uid)
    if not u:
        raise HTTPException(404)
    u.is_active = not u.is_active
    db.commit()
    log(db, admin.id, "user.toggle", "user", uid, payload={"active": u.is_active})
    return {"is_active": u.is_active}


# ============ АУДИТ ============
@router.get("/logs")
def logs(
    limit: int = 200,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return db.query(AuditLog).order_by(AuditLog.id.desc()).limit(limit).all()


# ============ РЕЗЕРВНОЕ КОПИРОВАНИЕ ============
@router.post("/backup")
def backup(_: User = Depends(require_admin)):
    path = run_backup()
    return {"backup_path": path}


# ============ ЭКСПОРТ ОТЧЁТОВ ============
@router.get("/reports/export")
def export_all_reports(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    reports = db.query(Report).order_by(Report.id.desc()).all()
    scenarios = {s.id: s for s in db.query(Scenario).all()}
    users = {u.id: u for u in db.query(User).all()}

    buf = io.StringIO()
    writer = csv.writer(buf, delimiter=";", quoting=csv.QUOTE_MINIMAL)

    writer.writerow(
        [
            "ID",
            "Дата",
            "Студент",
            "Логин",
            "Сценарий",
            "Тип",
            "Балл",
            "Тайминг OK",
            "Отклонение (сек)",
            "Совпадение текста (%)",
            "Признаки (%)",
            "Службы (%)",
            "Грамматика OK",
        ]
    )

    for r in reports:
        student = users.get(r.student_id)
        scenario = scenarios.get(r.scenario_id)
        details = r.details or {}
        writer.writerow(
            [
                r.id,
                r.created_at.strftime("%Y-%m-%d %H:%M") if r.created_at else "",
                student.full_name if student else f"#{r.student_id}",
                student.username if student else "",
                scenario.title if scenario else f"#{r.scenario_id}",
                scenario.incident_type_code if scenario else "",
                round(r.score or 0, 1),
                "Да" if r.timing_ok else "Нет",
                round(r.timing_delta_sec or 0, 1),
                round(r.text_similarity or 0, 1),
                round((details.get("signs_ratio") or 0) * 100, 1),
                round((details.get("services_ratio") or 0) * 100, 1),
                "Да" if r.grammar_ok else "Нет",
            ]
        )

    content = buf.getvalue().encode("utf-8-sig")
    filename = f"all_reports_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"

    log(db, admin.id, "reports.export_all", payload={"count": len(reports)})

    return StreamingResponse(
        iter([content]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ============ ДАШБОРД РУКОВОДИТЕЛЯ ============
@router.get("/dashboard")
def dashboard(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """
    Расширенная аналитика для руководителя:
    - total_*: сводные счётчики
    - top_students: лучшие по среднему баллу
    - struggling_students: худшие по среднему баллу
    - activity_by_day: активность за последние 14 дней
    - top_scenarios: популярные сценарии
    """
    users = db.query(User).all()
    scenarios = db.query(Scenario).all()
    reports = db.query(Report).all()
    sessions = db.query(TrainingSession).all()

    students = [u for u in users if u.role == RoleEnum.student]

    # ---- сводные ----
    total_users = len(users)
    total_students = len(students)
    total_scenarios = len(scenarios)
    total_reports = len(reports)
    total_sessions = len(sessions)
    avg_score = round(sum(r.score or 0 for r in reports) / total_reports, 1) if total_reports else 0

    # ---- по студентам ----
    by_student: dict[int, list[float]] = defaultdict(list)
    for r in reports:
        by_student[r.student_id].append(r.score or 0)

    student_stats = []
    for sid, scores in by_student.items():
        student = next((u for u in students if u.id == sid), None)
        if not student:
            continue
        student_stats.append(
            {
                "id": sid,
                "full_name": student.full_name,
                "username": student.username,
                "attempts": len(scores),
                "avg_score": round(sum(scores) / len(scores), 1),
            }
        )

    top_students = sorted(student_stats, key=lambda x: x["avg_score"], reverse=True)[:5]
    struggling_students = sorted(student_stats, key=lambda x: x["avg_score"])[:5]

    # ---- активность по дням (14 дней) ----
    today = datetime.utcnow().date()
    start = today - timedelta(days=13)
    by_day: dict[str, int] = {}
    day = start
    while day <= today:
        by_day[day.isoformat()] = 0
        day += timedelta(days=1)

    for r in reports:
        if not r.created_at:
            continue
        d = r.created_at.date().isoformat()
        if d in by_day:
            by_day[d] += 1

    activity_by_day = [{"date": k, "count": v} for k, v in by_day.items()]

    # ---- топ сценариев ----
    by_scenario: dict[int, int] = defaultdict(int)
    for r in reports:
        by_scenario[r.scenario_id] += 1

    top_scenarios = []
    for sid, count in sorted(by_scenario.items(), key=lambda x: x[1], reverse=True)[:5]:
        sc = next((s for s in scenarios if s.id == sid), None)
        top_scenarios.append(
            {
                "scenario_id": sid,
                "title": sc.title if sc else f"#{sid}",
                "attempts": count,
            }
        )

    return {
        "summary": {
            "total_users": total_users,
            "total_students": total_students,
            "total_scenarios": total_scenarios,
            "total_reports": total_reports,
            "total_sessions": total_sessions,
            "avg_score": avg_score,
        },
        "top_students": top_students,
        "struggling_students": struggling_students,
        "activity_by_day": activity_by_day,
        "top_scenarios": top_scenarios,
    }