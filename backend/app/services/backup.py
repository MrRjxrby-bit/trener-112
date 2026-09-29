import os
import subprocess
import shutil
from datetime import datetime
from app.config import settings

# Ищем pg_dump: сначала в PATH, потом в стандартной папке PostgreSQL 18
PG_DUMP = shutil.which("pg_dump") or r"C:\Program Files\PostgreSQL\18\bin\pg_dump.exe"


def run_backup() -> str:
    os.makedirs(settings.BACKUP_DIR, exist_ok=True)
    ts = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    path = os.path.join(settings.BACKUP_DIR, f"trener112_{ts}.sql")
    env = os.environ.copy()
    env["PGPASSWORD"] = settings.POSTGRES_PASSWORD
    cmd = [
        PG_DUMP,
        "-h", settings.POSTGRES_HOST,
        "-U", settings.POSTGRES_USER,
        "-d", settings.POSTGRES_DB,
        "-f", path,
    ]
    result = subprocess.run(cmd, env=env, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"pg_dump failed: {result.stderr}")
    return path