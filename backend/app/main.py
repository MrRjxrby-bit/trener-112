from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import Base, engine, SessionLocal
from app.services.seed import seed_admin
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from app import models  # noqa
from app.api import auth, admin, teacher, student, ai, dictionaries


Base.metadata.create_all(bind=engine)

with SessionLocal() as db:
    seed_admin(db)

app = FastAPI(title="Тренажёр ДДС 112", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(teacher.router, prefix="/api/teacher", tags=["teacher"])
app.include_router(student.router, prefix="/api/student", tags=["student"])
app.include_router(ai.router, prefix="/api/ai", tags=["ai"])
app.include_router(dictionaries.router, prefix="/api/dictionaries", tags=["dictionaries"])

AUDIO_DIR = Path(__file__).parent / "data" / "audio"
AUDIO_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/audio", StaticFiles(directory=str(AUDIO_DIR)), name="audio")


@app.get("/api/health")
def health():
    return {"status": "ok"}