from sqlalchemy.orm import Session
from app.models.user import User, RoleEnum
from app.auth.security import hash_password

def seed_admin(db: Session):
    if db.query(User).filter(User.role == RoleEnum.admin).first():
        return
    db.add(User(
        username="admin",
        full_name="Администратор системы",
        hashed_password=hash_password("admin123"),
        role=RoleEnum.admin,
    ))
    db.commit()
    print("Seeded admin / admin123")