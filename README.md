# Система прогнозирования киберугроз

Интеллектуальная платформа для прогнозирования кибератак на предприятия. Использует 48 предобученных CatBoost-моделей для оценки вероятности 6 типов угроз по 4 инфраструктурным кластерам с горизонтами 24 часа и 7 дней.

> Проект RSM Hackathon 2026. Миграция с [Streamlit MVP](https://mvp-solution.streamlit.app/) на продовую архитектуру.

---

## Архитектура

```
┌─────────────┐     ┌──────────────────┐     ┌───────────┐
│  React/Vite │────▶│  Node.js/Express │────▶│PostgreSQL │
│  порт 3000  │     │  порт 3001       │     │  порт 5432│
│  (frontend) │     │  Prisma ORM      │     └───────────┘
└─────────────┘     └────────┬─────────┘
                             │
                             ▼
                    ┌────────────────┐
                    │  Python/FastAPI │
                    │  порт 8000     │
                    │  48 CatBoost   │
                    │  (internal)    │
                    └────────────────┘
```

- **Frontend** (React + Vite) — SPA, обращается только к бэкенду
- **Backend** (Express 5 + Prisma) — публичный API, проксирует ML-сервис
- **ML Service** (FastAPI) — внутренний, загружает 48 моделей при старте
- **PostgreSQL 15** — хранит предприятия, прогнозы, угрозы, рекомендации

## Технологический стек

| Компонент | Технологии |
|-----------|------------|
| **Frontend** | React 19, TypeScript, Vite, Recharts, React Markdown |
| **Backend** | Express 5, TypeScript, Prisma ORM, Axios |
| **ML Service** | FastAPI, CatBoost, Pandas, NumPy |
| **База данных** | PostgreSQL 15 |
| **Инфраструктура** | Docker, Docker Compose, Nginx |

## Быстрый старт

### Вариант 1: Docker Compose (рекомендуется)

```bash
# Поднять все 4 сервиса
docker-compose up --build

# В отдельном терминале — миграция и сид БД
cd backend
npx prisma migrate deploy
npx prisma db seed
```

Доступ: http://localhost:3000

### Вариант 2: Локальная разработка

```bash
# 1. База данных
docker-compose up -d postgres

# 2. Backend (терминал 1)
cd backend
cp .env.example .env          # настроить при необходимости
npm install
npx prisma migrate deploy
npx prisma db seed
npm run dev                    # http://localhost:3001

# 3. ML Service (терминал 2)
cd ml
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8000   # загрузка ~30-60 сек

# 4. Frontend (терминал 3)
cd frontend
npm install
npm run dev                    # http://localhost:3000
```

### Вариант 3: Только фронтенд (с моками)

```bash
cd frontend
npm install
echo "VITE_MOCK_API=true" > .env
npm run dev
```

Все страницы работают с моковыми данными без запуска бэкенда и ML.

---

## API-эндпоинты

| Метод | Путь | Описание |
|-------|------|----------|
| `POST` | `/api/v1/predict` | Запрос прогноза: `{ enterprise_code, date, horizon }` |
| `GET` | `/api/v1/predict/history` | История прогнозов (последние 50) |
| `GET` | `/api/v1/predict/report/:requestId` | Markdown-отчёт по прогнозу |
| `GET` | `/api/v1/analytics` | KPI и статистика |
| `GET` | `/api/v1/threats` | Каталог угроз (пагинация, поиск) |
| `GET` | `/api/v1/threats/:code` | Детали угрозы + рекомендации |
| `GET` | `/api/v1/enterprises` | Список предприятий |
| `GET` | `/api/v1/enterprises/:code` | Предприятие + история прогнозов |
| `GET` | `/api/v1/recommendations` | Рекомендации (фильтр `?threatId=`) |
| `GET` | `/api/v1/health` | Healthcheck (backend + ML status) |

### Пример запроса прогноза

```bash
curl -X POST http://localhost:3001/api/v1/predict \
  -H "Content-Type: application/json" \
  -d '{"enterprise_code": "DEMO-01", "date": "2024-06-01", "horizon": "7d"}'
```

Ответ содержит: `top_threat`, `all_threats` (6 угроз), `report_md` (Markdown-отчёт), `enterprise` (профиль).

---

## ML-модели

48 CatBoost-классификаторов = 4 инфраструктурных кластера × 6 типов угроз × 2 горизонта.

**Инфраструктурные кластеры:**
1. Digital-Native (высокотехнологичные)
2. Industrial IoT (промышленные)
3. Data-Sensitive (чувствительные данные)
4. Service-Oriented (сервисные)

**Типы угроз:**
1. Вредоносное ПО (Malware)
2. Атаки типа DDoS
3. Brute Force / Подбор паролей
4. Социальная инженерия / Фишинг
5. Эксплуатация уязвимостей
6. Инсайдерские угрозы

**Признаки:** 34 фичи — временные (день недели, сезон), лаговые (инциденты за 1-3 дня), скользящие (суммы за 3/7/30 дней), категориальные (тип предприятия, регион, размер инфраструктуры).

**Файлы моделей:** `ml/models/24h/model_infra{1-4}_threat{1-6}.cbm`, аналогично для `7d/`.

---

## Структура проекта

```
rsm_hackathon_2026/
├── docker-compose.yml              # 4 сервиса: postgres, ml, backend, frontend
├── CLAUDE.md                       # Контекст для AI-ассистентов
├── README.md                       # Этот файл
│
├── backend/                        # Node.js + Express 5 + Prisma
│   ├── Dockerfile
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json
│   ├── prisma/
│   │   ├── schema.prisma           # 4 модели: Enterprise, Threat, PredictionLog, Recommendation
│   │   ├── seed.ts                 # 6 угроз + 18 рекомендаций + 3 DEMO-предприятия
│   │   └── migrations/
│   ├── src/
│   │   ├── index.ts                # Точка входа, CORS, 5 роутеров
│   │   ├── types.ts                # Общий API-контракт (TypeScript-интерфейсы)
│   │   ├── predict.ts              # POST /predict, GET /history, GET /report/:id
│   │   ├── analytics.ts            # GET /analytics — KPI и агрегации
│   │   ├── threats.ts              # GET /threats — каталог с поиском
│   │   ├── enterprises.ts          # GET /enterprises — профили предприятий
│   │   └── recommendations.ts      # GET /recommendations — рекомендации
│   └── data/
│       └── incidents_2000.csv      # Данные инцидентов для ML
│
├── ml/                             # Python + FastAPI + CatBoost
│   ├── Dockerfile
│   ├── app.py                      # FastAPI: /internal/predict, /health
│   ├── requirements.txt
│   ├── src/
│   │   ├── inference.py            # 48-модельный inference pipeline (34 фичи)
│   │   ├── reporting.py            # Markdown-генератор отчётов
│   │   └── loader.py               # Singleton-загрузчик артефактов
│   ├── models/
│   │   ├── 24h/                    # 24 модели (*.cbm)
│   │   └── 7d/                     # 24 модели (*.cbm)
│   └── data/
│       ├── incidents_data.csv      # 26K+ строк исторических данных
│       ├── featureconfig.json      # Конфигурация 34 признаков
│       ├── model_registry.json     # Реестр 48 моделей
│       ├── threatdescriptions.json # Описания 6 типов угроз
│       └── clusterinfo.json        # 4 инфраструктурных кластера
│
└── frontend/                       # React 19 + TypeScript + Vite
    ├── Dockerfile
    ├── nginx.conf                  # SPA fallback + /api proxy
    ├── package.json
    ├── vite.config.ts              # Proxy на :3001 в dev-режиме
    ├── index.html
    └── src/
        ├── main.tsx                # Точка входа
        ├── App.tsx                 # Router с 5 маршрутами
        ├── index.css               # CSS-переменные, цвета
        ├── components/
        │   ├── Layout.tsx          # Sidebar + main area
        │   ├── LoadingSpinner.tsx
        │   └── ErrorMessage.tsx
        ├── pages/
        │   ├── PredictionPage.tsx  # Главная: форма → RiskCard + BarChart + Markdown
        │   ├── DashboardPage.tsx   # 4 KPI + график топ-угроз
        │   ├── ThreatCatalogPage.tsx   # Каталог угроз с поиском
        │   ├── RecommendationsPage.tsx # Рекомендации по угрозам
        │   └── VulnerabilityPage.tsx   # Таблица истории прогнозов
        ├── services/
        │   ├── api.ts              # Axios-клиент
        │   ├── predictApi.ts       # POST /predict + моки
        │   ├── analyticsApi.ts     # GET /analytics + моки
        │   ├── enterprisesApi.ts   # GET /enterprises + моки
        │   ├── threatsApi.ts       # GET /threats + моки
        │   └── recommendationsApi.ts
        ├── types/                  # Зеркало backend/src/types.ts
        └── utils/
            └── constants.ts        # Цвета, уровни риска, форматирование
```

---

## Переменные окружения

### Backend (`backend/.env`)

```env
DATABASE_URL=postgresql://sunmoon:gdjskDF73672_)@localhost:5432/cyber_db
ML_SERVICE_URL=http://localhost:8000
PORT=3001
FRONTEND_URL=http://localhost:3000
```

### Frontend (`frontend/.env`)

```env
# Включить моковый режим (без бэкенда)
VITE_MOCK_API=true
```

---

## Демо-сценарии

| Предприятие | Тип | Хосты | Регион | Ожидаемый риск |
|-------------|-----|-------|--------|---------------|
| DEMO-01 | Финансовые и IT-компании | 1500 | Москва | Высокий |
| DEMO-02 | Промышленные предприятия | 800 | Санкт-Петербург | Средний |
| DEMO-03 | Государственные учреждения | 200 | Новосибирск | Низкий |

---

## Команда

- **Софья** — бэкенд (Express + Prisma + FastAPI)
- **Егор** — фронтенд (React + TypeScript)
