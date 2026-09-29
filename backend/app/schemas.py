from pydantic import BaseModel, Field
from typing import Optional, List


class StepIn(BaseModel):
    title: str
    hint: Optional[str] = None
    expected_text: Optional[str] = None
    time_limit_sec: int = 15


class ScenarioIn(BaseModel):
    title: str
    description: Optional[str] = None
    incident_type_code: str
    difficulty: int = Field(1, ge=1, le=5)
    time_limit_sec: int = Field(30, ge=5, le=600)
    payload: dict
    steps: List[StepIn] = []
    is_published: bool = False


class ScenarioOut(ScenarioIn):
    id: int

    class Config:
        from_attributes = True


class SessionStartIn(BaseModel):
    scenario_ids: Optional[List[int]] = None


class ActionIn(BaseModel):
    scenario_id: int
    action_type: str
    payload: dict
    duration_sec: Optional[float] = None


class ReportOut(BaseModel):
    id: int
    score: float
    timing_ok: int
    grammar_ok: int
    text_similarity: float
    timing_delta_sec: float
    details: dict

    class Config:
        from_attributes = True


class GroupIn(BaseModel):
    name: str
    description: Optional[str] = None


class GroupOut(BaseModel):
    id: int
    name: str
    description: Optional[str] = None

    class Config:
        from_attributes = True