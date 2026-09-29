# API

Автодокументация доступна на `/docs` (Swagger UI) после запуска backend.

## Эндпоинты

| Метод | Путь | Роль | Описание |
|---|---|---|---|
| POST | /api/auth/login | — | Аутентификация |
| GET | /api/auth/me | any | Текущий пользователь |
| GET | /api/dictionaries/types | any | Типы происшествий |
| GET | /api/dictionaries/services | any | Службы |
| GET | /api/dictionaries/signs | any | Признаки |
| GET | /api/dictionaries/okrugs | any | Округа Москвы |
| POST | /api/admin/users | admin | Создать пользователя |
| POST | /api/admin/users/{id}/toggle | admin | Блок/разблок |
| GET | /api/admin/users | admin | Список пользователей |
| GET | /api/admin/logs | admin | Журнал аудита |
| POST | /api/admin/backup | admin | Резервная копия |
| GET | /api/teacher/scenarios | teacher | Список сценариев |
| POST | /api/teacher/scenarios | teacher | Создать сценарий |
| POST | /api/teacher/scenarios/generate | teacher | Генерация черновика |
| POST | /api/teacher/scenarios/{id}/publish | teacher | Публикация |
| POST | /api/teacher/assign | teacher | Назначить студенту |
| GET | /api/teacher/sessions | teacher | Все сессии |
| GET | /api/teacher/reports | teacher | Все отчёты |
| GET | /api/student/scenarios | student | Мои сценарии |
| POST | /api/student/sessions/start | student | Старт сессии |
| POST | /api/student/sessions/{id}/action | student | Действие |
| POST | /api/student/sessions/{id}/finish | student | Завершение |
| GET | /api/student/reports | student | Мои отчёты |
| GET | /api/ai/insights | teacher | Аналитика группы |

## Формат аутентификации

Заголовок `Authorization: Bearer <JWT>` для всех защищённых эндпоинтов.

JWT получается через `POST /api/auth/login` (form-data `username` и `password`).