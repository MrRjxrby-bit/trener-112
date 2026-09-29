import csv
import io
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.user import User, RoleEnum
from app.models.scenario import Scenario, ScenarioAssignment, ScenarioStep
from app.models.session import TrainingSession, Report
from app.models.group import Group, group_members
from app.auth.deps import require_teacher
from app.auth.audit import log
from app.schemas import ScenarioIn, ScenarioOut, GroupIn, GroupOut
from app.services.ai_stub import generate_scenario

router = APIRouter()


# ============ СПРАВОЧНИК СТУДЕНТОВ ============
@router.get("/students")
def list_students(
    db: Session = Depends(get_db),
    user: User = Depends(require_teacher),
):
    students = (
        db.query(User)
        .filter(User.role == RoleEnum.student, User.is_active == True)
        .order_by(User.full_name)
        .all()
    )
    return [
        {
            "id": s.id,
            "username": s.username,
            "full_name": s.full_name,
            "role": s.role.value,
        }
        for s in students
    ]


# ============ СЦЕНАРИИ ============
@router.get("/scenarios", response_model=List[ScenarioOut])
def list_scenarios(
    db: Session = Depends(get_db),
    user: User = Depends(require_teacher),
):
    return db.query(Scenario).order_by(Scenario.id.desc()).all()


@router.post("/scenarios", response_model=ScenarioOut)
def create_scenario(
    data: ScenarioIn,
    db: Session = Depends(get_db),
    user: User = Depends(require_teacher),
):
    payload_dict = data.model_dump(exclude={"steps"})
    sc = Scenario(**payload_dict, created_by=user.id)
    db.add(sc)
    db.flush()

    for i, step in enumerate(data.steps):
        db.add(
            ScenarioStep(
                scenario_id=sc.id,
                order_index=i,
                title=step.title,
                hint=step.hint,
                expected_text=step.expected_text,
                time_limit_sec=step.time_limit_sec,
            )
        )

    db.commit()
    db.refresh(sc)
    log(db, user.id, "scenario.create", "scenario", sc.id)
    return sc


@router.post("/scenarios/generate")
def generate(
    incident_type_code: str = "16",
    db: Session = Depends(get_db),
    user: User = Depends(require_teacher),
):
    draft = generate_scenario(incident_type_code)
    log(db, user.id, "scenario.generate", payload=draft)
    return draft


@router.post("/scenarios/{sc_id}/publish")
def publish(
    sc_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_teacher),
):
    sc = db.query(Scenario).get(sc_id)
    if not sc:
        raise HTTPException(404, "Scenario not found")
    sc.is_published = True
    db.commit()
    log(db, user.id, "scenario.publish", "scenario", sc_id)
    return {"ok": True}


@router.delete("/scenarios/{sc_id}")
def delete_scenario(
    sc_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_teacher),
):
    sc = db.query(Scenario).get(sc_id)
    if not sc:
        raise HTTPException(404, "Scenario not found")
    db.delete(sc)
    db.commit()
    log(db, user.id, "scenario.delete", "scenario", sc_id)
    return {"ok": True}


# ============ НАЗНАЧЕНИЕ ============
@router.post("/assign")
def assign(
    scenario_id: int,
    student_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_teacher),
):
    exists = (
        db.query(ScenarioAssignment)
        .filter(
            ScenarioAssignment.scenario_id == scenario_id,
            ScenarioAssignment.student_id == student_id,
        )
        .first()
    )
    if exists:
        return {"ok": True, "message": "Уже назначено"}

    db.add(
        ScenarioAssignment(
            scenario_id=scenario_id,
            student_id=student_id,
            assigned_by=user.id,
        )
    )
    db.commit()
    log(
        db,
        user.id,
        "scenario.assign",
        "scenario",
        scenario_id,
        payload={"student_id": student_id},
    )
    return {"ok": True}


@router.get("/assignments")
def list_assignments(
    db: Session = Depends(get_db),
    user: User = Depends(require_teacher),
):
    rows = db.query(ScenarioAssignment).all()
    return [
        {
            "id": r.id,
            "scenario_id": r.scenario_id,
            "student_id": r.student_id,
            "assigned_at": r.assigned_at,
        }
        for r in rows
    ]


# ============ ГРУППЫ ============
@router.get("/groups")
def list_groups(
    db: Session = Depends(get_db),
    user: User = Depends(require_teacher),
):
    groups = db.query(Group).order_by(Group.id.desc()).all()
    result = []
    for g in groups:
        members = (
            db.query(User)
            .join(group_members, group_members.c.user_id == User.id)
            .filter(group_members.c.group_id == g.id)
            .all()
        )
        result.append(
            {
                "id": g.id,
                "name": g.name,
                "description": g.description,
                "members": [
                    {
                        "id": m.id,
                        "username": m.username,
                        "full_name": m.full_name,
                    }
                    for m in members
                ],
            }
        )
    return result


@router.post("/groups", response_model=GroupOut)
def create_group(
    data: GroupIn,
    db: Session = Depends(get_db),
    user: User = Depends(require_teacher),
):
    g = Group(name=data.name, description=data.description, created_by=user.id)
    db.add(g)
    db.commit()
    db.refresh(g)
    log(db, user.id, "group.create", "group", g.id, payload={"name": g.name})
    return g


@router.delete("/groups/{gid}")
def delete_group(
    gid: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_teacher),
):
    g = db.query(Group).get(gid)
    if not g:
        raise HTTPException(404, "Group not found")
    db.delete(g)
    db.commit()
    log(db, user.id, "group.delete", "group", gid)
    return {"ok": True}


@router.post("/groups/{gid}/members")
def add_member(
    gid: int,
    student_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_teacher),
):
    g = db.query(Group).get(gid)
    if not g:
        raise HTTPException(404, "Group not found")
    s = db.query(User).get(student_id)
    if not s or s.role != RoleEnum.student:
        raise HTTPException(400, "Student not found")
    exists = db.execute(
        group_members.select().where(
            (group_members.c.group_id == gid)
            & (group_members.c.user_id == student_id)
        )
    ).first()
    if exists:
        return {"ok": True, "message": "Уже в группе"}
    db.execute(
        group_members.insert().values(group_id=gid, user_id=student_id)
    )
    db.commit()
    log(
        db,
        user.id,
        "group.add_member",
        "group",
        gid,
        payload={"student_id": student_id},
    )
    return {"ok": True}


@router.delete("/groups/{gid}/members/{student_id}")
def remove_member(
    gid: int,
    student_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_teacher),
):
    db.execute(
        group_members.delete().where(
            (group_members.c.group_id == gid)
            & (group_members.c.user_id == student_id)
        )
    )
    db.commit()
    log(
        db,
        user.id,
        "group.remove_member",
        "group",
        gid,
        payload={"student_id": student_id},
    )
    return {"ok": True}


@router.post("/assign-group")
def assign_to_group(
    scenario_id: int,
    group_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_teacher),
):
    g = db.query(Group).get(group_id)
    if not g:
        raise HTTPException(404, "Group not found")

    members = (
        db.query(User)
        .join(group_members, group_members.c.user_id == User.id)
        .filter(group_members.c.group_id == group_id)
        .all()
    )

    added = 0
    skipped = 0
    for m in members:
        exists = (
            db.query(ScenarioAssignment)
            .filter(
                ScenarioAssignment.scenario_id == scenario_id,
                ScenarioAssignment.student_id == m.id,
            )
            .first()
        )
        if exists:
            skipped += 1
            continue
        db.add(
            ScenarioAssignment(
                scenario_id=scenario_id,
                student_id=m.id,
                assigned_by=user.id,
            )
        )
        added += 1

    db.commit()
    log(
        db,
        user.id,
        "scenario.assign_group",
        "scenario",
        scenario_id,
        payload={"group_id": group_id, "added": added, "skipped": skipped},
    )
    return {"ok": True, "added": added, "skipped": skipped}


# ============ СЕССИИ И ОТЧЁТЫ ============
@router.get("/sessions")
def all_sessions(
    db: Session = Depends(get_db),
    user: User = Depends(require_teacher),
):
    return (
        db.query(TrainingSession)
        .order_by(TrainingSession.id.desc())
        .limit(100)
        .all()
    )


@router.get("/reports")
def all_reports(
    db: Session = Depends(get_db),
    user: User = Depends(require_teacher),
):
    return db.query(Report).order_by(Report.id.desc()).limit(200).all()


# ============ ЭКСПОРТ ОТЧЁТОВ В CSV ============
@router.get("/reports/export")
def export_reports_csv(
    db: Session = Depends(get_db),
    user: User = Depends(require_teacher),
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
                r.created_at.strftime("%Y-%m-%d %H:%M")
                if r.created_at
                else "",
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
    filename = f"reports_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"

    log(db, user.id, "reports.export", payload={"count": len(reports)})

    return StreamingResponse(
        iter([content]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )