# Установка

## Требования

- Docker 24+, Docker Compose 2.20+
- 4 CPU, 8 ГБ RAM, 50 ГБ диск

## Шаги

```bash
git clone <repo> trener-112
cd trener-112
cp .env.example .env
# при необходимости отредактировать .env
docker compose up --build -d
docker compose exec backend python -c "from app.database import Base, engine; Base.metadata.create_all(engine)"
```

## Доступ

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000/docs
- Учётка по умолчанию: `admin / admin123` (сменить после первого входа)

## Восстановление из бэкапа

```bash
docker compose exec -T db psql -U trener -d trener112 < backups/trener112_YYYYMMDD_HHMMSS.sql
```