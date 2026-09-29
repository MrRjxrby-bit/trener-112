from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from app.database import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(64), nullable=False)
    entity = Column(String(64))
    entity_id = Column(Integer)
    payload = Column(JSON)
    ip = Column(String(45))
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)