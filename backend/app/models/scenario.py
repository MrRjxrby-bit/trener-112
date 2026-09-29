from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.sql import func
from app.database import Base


class Scenario(Base):
    __tablename__ = "scenarios"

    id = Column(Integer, primary_key=True)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    incident_type_code = Column(String(16), nullable=False)
    difficulty = Column(Integer, default=1)
    time_limit_sec = Column(Integer, default=30)
    payload = Column(JSON, nullable=False)
    is_published = Column(Boolean, default=False)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ScenarioAssignment(Base):
    __tablename__ = "scenario_assignments"

    id = Column(Integer, primary_key=True)
    scenario_id = Column(Integer, ForeignKey("scenarios.id", ondelete="CASCADE"))
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    assigned_by = Column(Integer, ForeignKey("users.id"))
    assigned_at = Column(DateTime(timezone=True), server_default=func.now())

class ScenarioStep(Base):
    __tablename__ = "scenario_steps"

    id = Column(Integer, primary_key=True)
    scenario_id = Column(Integer, ForeignKey("scenarios.id", ondelete="CASCADE"))
    order_index = Column(Integer, nullable=False, default=0)
    title = Column(String(255), nullable=False)
    hint = Column(Text)
    expected_text = Column(Text)
    time_limit_sec = Column(Integer, default=15)