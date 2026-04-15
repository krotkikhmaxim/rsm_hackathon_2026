# Система прогнозирования киберугроз — RSM Hackathon 2026

## Архитектура

4 сервиса в Docker Compose:
- **Frontend** (React/Vite, порт 3000) — SPA, обращается только к бэкенду
- **Backend** (Express/Prisma, порт 3001) — публичный API, работает с PostgreSQL и ML-сервисом
- **ML Service** (FastAPI, порт 8000) — внутренний, загружает 48 CatBoost-моделей при старте
- **PostgreSQL** (порт 5432) — БД `cyber_db`, пользователь `sunmoon`

## Как запустить

```bash
# БД
docker-compose up -d

# Backend
cd backend && npm install && npx prisma migrate deploy && npx prisma db seed && npm run dev

# ML сервис
cd ml && pip install -r requirements.txt && uvicorn app:app --host 0.0.0.0 --port 8000

# Frontend
cd frontend && npm install && npm run dev
```

## Переменные окружения

Backend (.env):
```
DATABASE_URL=postgresql://sunmoon:gdjskDF73672_)@localhost:5432/cyber_db
ML_SERVICE_URL=http://localhost:8000
PORT=3001
FRONTEND_URL=http://localhost:3000
```

## Ключевые эндпоинты

- `POST /api/v1/predict` — запрос прогноза (body: `{ enterprise_code, date, horizon }`)
- `GET /api/v1/analytics` — KPI и статистика
- `GET /api/v1/threats` — каталог угроз ФСТЭК
- `GET /api/v1/enterprises` — список предприятий
- `GET /api/v1/recommendations` — рекомендации
- `GET /api/v1/health` — healthcheck

## API-контракт

Общие типы определены в `backend/src/types.ts`. Фронтенд-типы в `frontend/src/types/`.

## Команда

- Софья — бэкенд (Express + Prisma + FastAPI)
- Егор — фронтенд (React)

## ML-модели

48 CatBoost-моделей: 4 инфраструктурных кластера x 6 типов угроз x 2 горизонта (24ч, 7д).
Файлы: `ml/models/24h/model_infra{1-4}_threat{1-6}.cbm` и аналогично для `7d/`.
Данные: `ml/data/incidents_data.csv`, конфигурация в `ml/data/*.json`.

## Стиль кода

- Backend: TypeScript, Express 5, Prisma ORM
- ML: Python 3.11, FastAPI, CatBoost
- Frontend: React + TypeScript, Vite, axios, recharts, react-markdown
- Коммиты и комментарии: на русском

## Важно

- НЕ использовать типы с ветки develop — там старая схема API
- `predict.service.ts` — мёртвый код, не использовать
- Express 5 — учитывать отличия от Express 4
