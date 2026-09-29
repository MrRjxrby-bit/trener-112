from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from app.database import get_db
from app.models.user import User
from app.models.scenario import Scenario, ScenarioAssignment, ScenarioStep
from app.models.session import TrainingSession, SessionAction, Report
from app.auth.deps import require_student
from app.auth.audit import log
from app.schemas import ActionIn, ReportOut
from app.services.scoring import score_action

router = APIRouter()


# ============ СЦЕНАРИИ ============
@router.get("/scenarios")
def my_scenarios(
    db: Session = Depends(get_db),
    user: User = Depends(require_student),
):
    q = (
        db.query(Scenario)
        .join(ScenarioAssignment, ScenarioAssignment.scenario_id == Scenario.id)
        .filter(
            ScenarioAssignment.student_id == user.id,
            Scenario.is_published == True,
        )
    )
    return q.all()


@router.get("/scenarios/{scenario_id}/steps")
def get_steps(
    scenario_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_student),
):
    steps = (
        db.query(ScenarioStep)
        .filter(ScenarioStep.scenario_id == scenario_id)
        .order_by(ScenarioStep.order_index)
        .all()
    )
    return [
        {
            "id": s.id,
            "order_index": s.order_index,
            "title": s.title,
            "hint": s.hint,
            "expected_text": s.expected_text,
            "time_limit_sec": s.time_limit_sec,
        }
        for s in steps
    ]


# ============ СЕССИИ ============
@router.post("/sessions/start")
def start_session(
    db: Session = Depends(get_db),
    user: User = Depends(require_student),
):
    s = TrainingSession(student_id=user.id, status="active")
    db.add(s)
    db.commit()
    db.refresh(s)
    log(db, user.id, "session.start", "session", s.id)
    return {"session_id": s.id, "started_at": s.started_at}


@router.post("/sessions/{sid}/action")
def add_action(
    sid: int,
    data: ActionIn,
    db: Session = Depends(get_db),
    user: User = Depends(require_student),
):
    s = db.query(TrainingSession).get(sid)
    if not s or s.student_id != user.id or s.status != "active":
        raise HTTPException(400, "Session invalid")
    a = SessionAction(
        session_id=sid,
        scenario_id=data.scenario_id,
        action_type=data.action_type,
        payload=data.payload,
        duration_sec=data.duration_sec,
        finished_at=datetime.utcnow(),
    )
    db.add(a)
    db.commit()
    db.refresh(a)
    log(db, user.id, "session.action", "session", sid, payload={"type": data.action_type})
    return {"action_id": a.id}


@router.post("/sessions/{sid}/finish")
def finish_session(
    sid: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_student),
):
    s = db.query(TrainingSession).get(sid)
    if not s or s.student_id != user.id:
        raise HTTPException(404, "Session not found")
    s.status = "finished"
    s.finished_at = datetime.utcnow()
    db.commit()

    actions = db.query(SessionAction).filter(SessionAction.session_id == sid).all()
    reports = []
    for a in actions:
        if a.action_type != "save":
            continue
        sc = db.query(Scenario).get(a.scenario_id)
        result = score_action(sc, a.payload, a.duration_sec)
        r = Report(
            session_id=sid,
            scenario_id=a.scenario_id,
            student_id=user.id,
            score=result["score"],
            timing_delta_sec=result["timing_delta_sec"],
            timing_ok=int(result["timing_ok"]),
            grammar_ok=int(result["grammar_ok"]),
            text_similarity=result["text_similarity"],
            details=result["details"],
        )
        db.add(r)
        db.commit()
        db.refresh(r)
        reports.append(r.id)
    log(db, user.id, "session.finish", "session", sid)
    return {"ok": True, "report_ids": reports}


# ============ ОТЧЁТЫ ============
@router.get("/reports", response_model=List[ReportOut])
def my_reports(
    db: Session = Depends(get_db),
    user: User = Depends(require_student),
):
    return (
        db.query(Report)
        .filter(Report.student_id == user.id)
        .order_by(Report.id.desc())
        .all()
    )


@router.get("/reports/{report_id}")
def report_detail(
    report_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_student),
):
    r = db.query(Report).get(report_id)
    if not r or r.student_id != user.id:
        raise HTTPException(404, "Report not found")
    scenario = db.query(Scenario).get(r.scenario_id)
    return {
        "id": r.id,
        "scenario_id": r.scenario_id,
        "scenario_title": scenario.title if scenario else "",
        "score": r.score,
        "timing_ok": bool(r.timing_ok),
        "grammar_ok": bool(r.grammar_ok),
        "text_similarity": r.text_similarity,
        "timing_delta_sec": r.timing_delta_sec,
        "details": r.details,
        "created_at": r.created_at,
    }


# ============ ПРОГРЕСС СТУДЕНТА ============
@router.get("/progress")
def progress(
    db: Session = Depends(get_db),
    user: User = Depends(require_student),
):
    reports = (
        db.query(Report)
        .filter(Report.student_id == user.id)
        .order_by(Report.created_at.asc())
        .all()
    )

    if not reports:
        return {
            "timeline": [],
            "criteria": [],
            "summary": {
                "total_sessions": 0,
                "avg_score": 0,
                "best_score": 0,
                "avg_duration": 0,
            },
        }

    timeline = [
        {
            "date": r.created_at.isoformat() if r.created_at else None,
            "score": round(r.score or 0, 1),
            "scenario_id": r.scenario_id,
        }
        for r in reports[-20:]
    ]

    def avg(seq):
        seq = [x for x in seq if x is not None]
        return round(sum(seq) / len(seq), 1) if seq else 0

    avg_timing_score = avg(
        [
            (100 if r.timing_ok else max(0, 100 + (r.timing_delta_sec or 0) * 2))
            for r in reports
        ]
    )
    avg_text = avg([r.text_similarity for r in reports])
    avg_signs = avg(
        [((r.details or {}).get("signs_ratio", 0) or 0) * 100 for r in reports]
    )
    avg_services = avg(
        [((r.details or {}).get("services_ratio", 0) or 0) * 100 for r in reports]
    )
    avg_grammar = avg([100 if r.grammar_ok else 0 for r in reports])

    criteria = [
        {"label": "Тайминг", "value": avg_timing_score},
        {"label": "Текст", "value": avg_text},
        {"label": "Признаки", "value": avg_signs},
        {"label": "Службы", "value": avg_services},
        {"label": "Грамматика", "value": avg_grammar},
    ]

    scores = [r.score or 0 for r in reports]
    durations = [r.timing_delta_sec for r in reports if r.timing_delta_sec is not None]
    summary = {
        "total_sessions": len(reports),
        "avg_score": round(sum(scores) / len(reports), 1),
        "best_score": round(max(scores), 1),
        "avg_duration": round(sum(durations) / len(durations), 1) if durations else 0,
    }

    return {"timeline": timeline, "criteria": criteria, "summary": summary}