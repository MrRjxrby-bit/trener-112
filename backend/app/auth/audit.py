from sqlalchemy.orm import Session
from app.models.audit import AuditLog

def log(db: Session, user_id: int | None, action: str, entity: str = None,
        entity_id: int = None, payload: dict = None, ip: str = None):
    db.add(AuditLog(
        user_id=user_id, action=action, entity=entity,
        entity_id=entity_id, payload=payload, ip=ip,
    ))
    db.commit()