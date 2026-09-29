from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON, Float
from sqlalchemy.sql import func
from app.database import Base


class TrainingSession(Base):
    __tablename__ = "training_sessions"

    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("users.id"))
    teacher_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    status = Column(String(16), default="active")
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    finished_at = Column(DateTime(timezone=True), nullable=True)


class SessionAction(Base):
    __tablename__ = "session_actions"

    id = Column(Integer, primary_key=True)
    session_id = Column(Integer, ForeignKey("training_sessions.id", ondelete="CASCADE"))
    scenario_id = Column(Integer, ForeignKey("scenarios.id"))
    action_type = Column(String(32))
    payload = Column(JSON)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    finished_at = Column(DateTime(timezone=True), nullable=True)
    duration_sec = Column(Float, nullable=True)


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True)
    session_id = Column(Integer, ForeignKey("training_sessions.id", ondelete="CASCADE"))
    scenario_id = Column(Integer, ForeignKey("scenarios.id"))
    student_id = Column(Integer, ForeignKey("users.id"))
    score = Column(Float)
    timing_delta_sec = Column(Float)
    timing_ok = Column(Integer)
    grammar_ok = Column(Integer)
    text_similarity = Column(Float)
    details = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())