# Тренажёр оператора ДДС 112

Учебное ПО для подготовки операторов дежурно-диспетчерских служб города Москвы с использованием технологий искусственного интеллекта.

Разработано в интересах **ГБУ «Система 112»** (Департамент по делам гражданской обороны, чрезвычайным ситуациям и пожарной безопасности города Москвы).

## Возможности

-  **Эмуляция входящего звонка** — IP-телефония + транскрипт заявителя
-  **Карточка АРМ-112** — интерфейс, приближенный к реальному
-  **Пошаговые сценарии** — этапы с таймингом и эталонными ответами
-  **ИИ-оценка** — ИИ + rule-based fallback (не успели)
-  **Аналитика** — дашборды студента, преподавателя и руководителя
-  **Тепловая карта ошибок** — по сценариям и критериям
-  **Группы студентов** — массовое назначение сценариев
-  **Экспорт в CSV** — отчёты для внешних систем
-  **Тёмная тема** и **горячие клавиши** в АРМ
-  **Изолированный контур** — без доступа к внешним сетям

## Стек

| Слой | Технологии |
|---|---|
| Backend | Python 3.11+, FastAPI, SQLAlchemy 2, Pydantic v2 |
| БД | PostgreSQL 18 |
| Frontend | React 18, Vite, TypeScript, TailwindCSS v4 |
| AI | Ollama (`qwen2.5:3b`), `rapidfuzz` |
| Аутентификация | JWT (HS256), `passlib` + `bcrypt` |
| Инфраструктура | Docker Compose (опционально) |

## Роли

| Роль | Логин (по умолчанию) | Возможности |
|---|---|---|
| **Администратор** | `admin / admin123` | Управление пользователями, резервные копии, дашборд, экспорт CSV, статус LLM |
| **Преподаватель** | создаётся админом | Создание сценариев, назначение студентам и группам, аналитика группы, тепловая карта, экспорт отчётов |
| **Обучающийся** | создаётся админом | Прохождение сценариев, карточка АРМ-112, разбор ошибок, свой прогресс |

## Быстрый запуск (без Docker)

### 1. Требования

- Python 3.11+
- Node.js 20 LTS
- PostgreSQL 18
- Ollama (опционально, для ИИ-оценки)

### 2. PostgreSQL

Создайте пользователя и БД:

```sql
CREATE USER trener WITH PASSWORD 'trener_secret';
CREATE DATABASE trener112 OWNER trener;
```

Проверьте подключение:

```bash
psql -U trener -h localhost -d trener112 -c "SELECT 1;"
```

### 3. Backend

```bash
cd backend
python -m venv .venv
# Windows
.venv\Scripts\activate
# Linux/macOS
source .venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Проверьте: http://localhost:8000/docs

При первом запуске автоматически создаётся администратор:

```
Seeded admin / admin123
```

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

Откройте http://localhost:5173

### 5. Ollama (для ИИ-оценки)

```bash
# Установка: https://ollama.com/download/windows
ollama pull qwen2.5:3b
```

Проверьте статус в админ-панели: блок **«Локальная LLM (Ollama)»** должен показывать ✓ работает.

> Если Ollama недоступен — backend автоматически переключается на резервный алгоритм (`rapidfuzz`). Сервис продолжает работать.

## Быстрый запуск (Docker)

```bash
cp .env.example .env
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000/docs
- PostgreSQL: localhost:5432

## Структура проекта

```
trener-112/
├── backend/
│   ├── app/
│   │   ├── api/           # Роутеры: auth, admin, teacher, student, ai, dictionaries
│   │   ├── auth/          # JWT, RBAC, аудит
│   │   ├── models/        # SQLAlchemy: User, Scenario, Session, Group, AuditLog
│   │   ├── services/      # scoring, ai_stub, llm, backup, insights
│   │   ├── data/          # Справочники (типы, службы, признаки, округа) + audio
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── schemas.py
│   │   └── main.py
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── api/           # axios client + downloadFile
│   │   ├── components/    # Card112, Layout, LineChart, BarChart, Heatmap
│   │   ├── pages/         # Admin, Teacher, Student, Login, Help
│   │   ├── store/         # auth, theme (zustand)
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── package.json
│   └── vite.config.ts
├── ai/                    # Доп. модули грамматики и аналитики (опционально)
├── docs/                  # Архитектура, установка, API, руководство
├── docker-compose.yml
├── .env.example
└── README.md
```

## Основные эндпоинты API

| Метод | Путь | Роль | Описание |
|---|---|---|---|
| POST | `/api/auth/login` | — | Вход |
| GET | `/api/auth/me` | auth | Текущий пользователь |
| GET | `/api/admin/users` | admin | Список пользователей |
| POST | `/api/admin/users` | admin | Создать пользователя |
| POST | `/api/admin/users/{id}/toggle` | admin | Блок/разблок |
| GET | `/api/admin/logs` | admin | Журнал аудита |
| GET | `/api/admin/dashboard` | admin | Дашборд руководителя |
| POST | `/api/admin/backup` | admin | Резервная копия |
| GET | `/api/admin/reports/export` | admin | Экспорт всех отчётов в CSV |
| GET | `/api/teacher/scenarios` | teacher | Сценарии |
| POST | `/api/teacher/scenarios` | teacher | Создать сценарий |
| POST | `/api/teacher/scenarios/generate` | teacher | Черновик от ИИ |
| POST | `/api/teacher/scenarios/{id}/publish` | teacher | Публикация |
| POST | `/api/teacher/assign` | teacher | Назначить студенту |
| POST | `/api/teacher/assign-group` | teacher | Назначить группе |
| GET | `/api/teacher/groups` | teacher | Группы |
| POST | `/api/teacher/groups` | teacher | Создать группу |
| GET | `/api/teacher/students` | teacher | Список студентов |
| GET | `/api/teacher/reports` | teacher | Все отчёты |
| GET | `/api/teacher/reports/export` | teacher | Экспорт отчётов в CSV |
| GET | `/api/student/scenarios` | student | Мои сценарии |
| GET | `/api/student/scenarios/{id}/steps` | student | Этапы сценария |
| POST | `/api/student/sessions/start` | student | Старт сессии |
| POST | `/api/student/sessions/{id}/action` | student | Действие |
| POST | `/api/student/sessions/{id}/finish` | student | Завершение |
| GET | `/api/student/reports` | student | Мои отчёты |
| GET | `/api/student/reports/{id}` | student | Детали отчёта |
| GET | `/api/student/progress` | student | Прогресс |
| GET | `/api/ai/insights` | teacher | Аналитика группы |
| GET | `/api/ai/heatmap` | teacher | Тепловая карта ошибок |
| GET | `/api/ai/llm-status` | admin | Статус Ollama |
| GET | `/api/dictionaries/types` | auth | Типы происшествий (43) |
| GET | `/api/dictionaries/services` | auth | Службы |
| GET | `/api/dictionaries/signs` | auth | Признаки |
| GET | `/api/dictionaries/okrugs` | auth | Округа Москвы |

## Оценка ответа

Итоговый балл складывается из:

| Критерий | Вес |
|---|---|
| Соблюдение тайминга | 30% |
| Совпадение текста (LLM или rapidfuzz) | 30% |
| Правильность признаков | 20% |
| Правильность служб | 15% |
| Грамматика | 5% |

Порог успеха — **70 баллов**.

## Горячие клавиши (в карточке АРМ-112)

| Комбинация | Действие |
|---|---|
| `Ctrl+S` | Сохранить |
| `Ctrl+Enter` | Сохранить (из textarea) |
| `Esc` | Отмена |
| `Ctrl+1…5` | Быстрая отметка первых 5 признаков как «Да» |

## Безопасность и изоляция

- Все сервисы работают в **локальном контуре** без доступа во внешние сети
- JWT-аутентификация + RBAC (admin / teacher / student)
- Аудит всех действий пользователей (`audit_logs`, хранение ≥ 6 мес.)
- Шифрование передаваемых данных (TLS/SSL внутри контура)
- Резервное копирование БД — ежедневно

## Соответствие НПА

- **ФЗ-149** от 27.07.2006 «Об информации, информационных технологиях и о защите информации»
- **ФЗ-152** от 27.07.2006 «О персональных данных»
- ГОСТ 34 (Комплекс стандартов на автоматизированные системы)

## Документация

- [Архитектура](docs/architecture.md)
- [Установка](docs/install.md)
- [API](docs/api.md)
- [Руководство пользователя](docs/user-guide.md)
- [Соответствие НПА](docs/compliance.md)

## Аккаунты


1. **Админ** (`admin / admin123`).
2. **Преподаватель** (`teacher1 / pass123`).
3. **Студент** (`student1 / pass123`).

## Лицензия

Проект разработан в учебных целях. Исходный код открыт, без обфускации.

## Команда

Разработано в рамках проекта «Лидеры цифровой трансформации» для ГБУ «Система 112».
