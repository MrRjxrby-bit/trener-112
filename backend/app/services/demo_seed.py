from sqlalchemy.orm import Session
from app.models.user import User, RoleEnum
from app.models.scenario import Scenario, ScenarioAssignment
from app.auth.security import hash_password

def seed_demo(db: Session):
    if db.query(User).filter(User.username == "teacher1").first():
        return
    t = User(username="teacher1", full_name="Преподаватель Иванов",
             hashed_password=hash_password("pass123"), role=RoleEnum.teacher)
    s1 = User(username="student1", full_name="Обучающийся Петров",
              hashed_password=hash_password("pass123"), role=RoleEnum.student)
    s2 = User(username="student2", full_name="Обучающаяся Сидорова",
              hashed_password=hash_password("pass123"), role=RoleEnum.student)
    db.add_all([t, s1, s2]); db.commit()

    sc = Scenario(
        title="ДТП на Ленинградском проспекте",
        incident_type_code="16", difficulty=2, time_limit_sec=30,
        payload={
            "address": "Ленинградский пр-т, д. 25",
            "okrug": "sao", "district": "Аэропорт",
            "expected_text": "Сообщение принято, дежурная бригада направлена на место.",
            "expected_signs": {"people_threat": "Да", "offense": "Нет"},
            "expected_services": ["102", "103"],
        },
        is_published=True, created_by=t.id,
    )
    db.add(sc); db.commit(); db.refresh(sc)
    db.add(ScenarioAssignment(scenario_id=sc.id, student_id=s1.id, assigned_by=t.id))
    db.add(ScenarioAssignment(scenario_id=sc.id, student_id=s2.id, assigned_by=t.id))
    db.commit()
    print("Demo seeded: teacher1/pass123, student1/pass123, student2/pass123")