# RSM Hackathon
> **Принцип:** Streamlit MVP из `develop` — рабочий фундамент. Переносим его функциональность на стек Node.js + React, добавляя то, чего в Streamlit нет.

---

## 1. Принцип «MVP-first»

Streamlit MVP реально работает: 48 CatBoost-моделей, полный пайплайн инференса, данные. Задача — **точно воспроизвести** его функциональность в целевом стеке (Node.js + React + FastAPI), а затем **расширить** возможностями, которых в Streamlit нет: профили предприятий, история прогнозов, каталог угроз ФСТЭК, рекомендации из БД.

| Функция | Streamlit MVP | Целевой продукт |
|---|---|---|
| Выбор даты + горизонта | ✅ sidebar | ✅ форма на PredictionPage |
| Запуск 48 CatBoost-моделей | ✅ `predict_for_date()` | ✅ Python ML-сервис (FastAPI) |
| Top threat + вероятность | ✅ `st.metric` | ✅ карточка `RiskCard` |
| Bar chart всех угроз | ✅ `px.bar` | ✅ `ThreatPieChart` / `BarChart` (Recharts) |
| Markdown-отчёт + скачать | ✅ `st.download_button` | ✅ кнопка `/api/v1/predict/report` + Blob download |
| Профили предприятий | ❌ нет | ✅ `EnterpriseProfile` + seed |
| История прогнозов | ❌ нет | ✅ `PredictionLog` + Dashboard |
| Каталог угроз (227 ФСТЭК) | ❌ нет | ✅ `ThreatCatalog` page |
| Рекомендации из БД | только текст | ✅ `Recommendation` model |

---

## 2. Целевая архитектура

### 2.1. Общая схема (Docker Compose, 4 контейнера)

```
┌─────────────────────────────────────────────────────────────┐
│                     Docker Compose                          │
│                                                             │
│  ┌─────────────┐     ┌──────────────────┐   ┌───────────┐  │
│  │  React/Vite │────▶│  Node.js/Express │──▶│PostgreSQL │  │
│  │  порт 3000  │     │  порт 3001       │   │  порт 5432│  │
│  │  (frontend) │     │  Prisma ORM      │   └───────────┘  │
│  └─────────────┘     │  + predict.ts    │                   │
│                      │  + analytics.ts  │   ┌───────────┐  │
│                      │  + threats.ts    │──▶│  Python   │  │
│                      │  + enterprises.ts│   │  FastAPI  │  │
│                      └──────────────────┘   │  порт 8000│  │
│                                             │  (internal│  │
│                                             │   только) │  │
│                                             │48 CatBoost│  │
│                                             └───────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**Ключевые принципы:**

- **React** (порт 3000) — единственный публичный фронтенд. Обращается **только** к Node.js-бэкенду.
- **Node.js/Express** (порт 3001) — единственный публичный API. Работает с PostgreSQL через Prisma и с ML-сервисом через внутренний HTTP.
- **Python FastAPI** (порт 8000) — **внутренний** микросервис. Не доступен снаружи Docker-сети. Загружает 48 CatBoost-моделей при старте, выполняет инференс.
- **PostgreSQL** (порт 5432) — хранит профили предприятий, логи прогнозов, угрозы, рекомендации.

### 2.2. Поток запроса «Запустить прогноз»

```
Пользователь нажимает "Запустить прогноз" на PredictionPage
  ↓
React: POST /api/v1/predict { enterprise_code: "DEMO-01", date: "2024-06-01", horizon: "24h" }
  ↓
Node.js (predict.ts):
  1. Prisma: findUnique(EnterpriseProfile, { where: { enterprise_code } })
     → { type: "Финансовые и IT-компании", region: "Москва", host_count: 1500 }
  2. POST http://ml:8000/internal/predict {
       date: "2024-06-01",
       horizon: "24h",
       enterprise_type: "Финансовые и IT-компании",
       region: "Москва",
       host_count: 1500
     }
  3. ML-сервис (app.py):
     → get_artifacts() — 48 CatBoost-моделей уже в памяти
     → predict_for_date("2024-06-01", "24h", artifacts)
     → для каждой из 24 комбинаций (4 инфра-кластера × 6 угроз):
        prepare_features_for_prediction() → 34 признака
        model.predict_proba() → вероятность
     → агрегация: среднее по 4 инфра-кластерам для каждой угрозы
     → сортировка: top_threat + all_threats (6 записей)
     → generate_markdown_report()
     → return { top_threat, all_threats, report_md }
  4. Prisma: create(PredictionLog, { request_id, enterprise_code, probability, predicted_threat, horizon, report_md })
  5. res.json({ top_threat, all_threats, report_md, enterprise, request_id })
  ↓
React (PredictionPage):
  → RiskCard: показывает top_threat.threatname + probability
  → ThreatBarChart: бар-чарт по all_threats (6 угроз)
  → Markdown-рендер report_md
  → Кнопка "Скачать .md" → Blob download
```

---

## 3. Бэклог задач

---

### Фаза 0 — Критические баги (~1.5 часа)

> Задачи, которые блокируют запуск. Выполнять **первыми**, параллельно.

---

#### F0-01: Исправить `seed.ts` — separator и имя колонки

- **Файл:** `backend/prisma/seed.ts`
- **Что делать:**
  - Заменить `separator: ';'` → `separator: ','`
  - Заменить `row['Регион']` → `row['Регион размещения предприятия']`
- **Оценка:** 0.1ч
- **Зависимости:** нет

---

#### F0-02: Исправить `schema.prisma` — nullable `predicted_object` + добавить поля

- **Файл:** `backend/prisma/schema.prisma`
- **Что делать:**
  - `predicted_object String` → `predicted_object String?`
  - Добавить поле `horizon String?` в модель `PredictionLog`
  - Добавить поле `report_md String?` в модель `PredictionLog`
- **Оценка:** 0.1ч
- **Зависимости:** нет

---

#### F0-03: Исправить `inference.py` — 5 имён признаков

- **Файл:** `mvp/app/inference.py`, функция `prepare_features_for_prediction()`
- **Что делать:** Исправить 5 ошибок в именах ключей словаря `features`:
  - `laginc2d` → `lag_inc_2d`
  - `regioninc_7d_sum` → `region_inc_7d_sum`
  - `regioninc_30d_sum` → `region_inc_30d_sum`
  - `typeinc_7d_sum` → `type_inc_7d_sum`
  - `typeinc_30d_sum` → `type_inc_30d_sum`
- **Оценка:** 0.3ч
- **Зависимости:** нет

---

#### F0-04: Исправить `inference.py` — добавить категориальные признаки

- **Файл:** `mvp/app/inference.py`, функция `prepare_features_for_prediction()`
- **Что делать:** В словарь `features` (где формируется строка для предсказания) добавить 4 пропущенных признака. Вставить **перед** `return pd.DataFrame([features])`:

```python
# --- Категориальные признаки (отсутствовали) ---
features["Тип предприятия"] = (
    str(recent_data["Тип предприятия"].iloc[-1])
    if len(recent_data) > 0 and "Тип предприятия" in recent_data.columns
    else ""
)
features["Регион размещения предприятия"] = (
    str(recent_data["Регион размещения предприятия"].iloc[-1])
    if len(recent_data) > 0 and "Регион размещения предприятия" in recent_data.columns
    else ""
)
features["Размер инфраструктуры"] = (
    str(recent_data["Размер инфраструктуры"].iloc[-1])
    if len(recent_data) > 0 and "Размер инфраструктуры" in recent_data.columns
    else ""
)
features["Количество хостов"] = (
    float(recent_data["Количество хостов"].iloc[-1])
    if len(recent_data) > 0 and "Количество хостов" in recent_data.columns
    else 0.0
)
```

- **Оценка:** 0.3ч
- **Зависимости:** нет

---

#### F0-05: Удалить мёртвый `return` в `inference.py`

- **Файл:** `mvp/app/inference.py`, функция `load_artifacts()`
- **Что делать:** В конце функции `load_artifacts()` есть два `return artifacts`. Удалить **второй** (мёртвый) `return artifacts` — он никогда не выполняется.
- **Оценка:** 0.05ч
- **Зависимости:** нет

---

#### F0-06: Добавить CORS в Node.js backend

- **Файл:** `backend/src/index.ts`
- **Что делать:**
  1. Убедиться что `cors` установлен: `npm install cors @types/cors`
  2. Добавить в начало файла:
     ```typescript
     import cors from 'cors';
     ```
  3. Перед определением роутов добавить:
     ```typescript
     app.use(cors({
       origin: process.env.FRONTEND_URL || 'http://localhost:3000',
       credentials: true,
     }));
     ```
- **Оценка:** 0.1ч
- **Зависимости:** нет

---

### Фаза 1 — Python ML-микросервис (~2.6 часа)

> Превращаем `ml/app.py` из заглушки (`CyberModelSuiteMock`) в реальный сервис на базе `inference.py` из ветки `develop`.

---

#### F1-01: Скопировать ML-артефакты из `develop` в `ml/`

- **Что делать:**
  - Скопировать директорию `mvp/models/` (48 файлов `.cbm`) → `ml/models/`
    - Структура: `ml/models/24h/model_infra{1-4}_threat{1-6}.cbm` и `ml/models/7d/model_infra{1-4}_threat{1-6}.cbm`
  - Скопировать файлы данных из `mvp/data/` → `ml/data/`:
    - `incidents_data.csv` (26112 строк, 44 колонки)
    - `featureconfig.json`
    - `clusterinfo.json`
    - `threatdescriptions.json`
    - `model_registry.json`
  - Проверить пути в `model_registry.json`: ключ `model_path` должен быть относительно `ml/`, например `"models/24h/model_infra1_threat1.cbm"`
- **Оценка:** 0.5ч
- **Зависимости:** F0-03, F0-04, F0-05 (сначала исправить `inference.py`)

---

#### F1-02: Перенести `inference.py` и `reporting.py` в `ml/src/`

- **Что делать:**
  - Скопировать исправленный `mvp/app/inference.py` → `ml/src/inference.py`
  - Скопировать `mvp/app/reporting.py` → `ml/src/reporting.py` (без изменений)
  - Создать `ml/src/__init__.py` (пустой)
- **Оценка:** 0.2ч
- **Зависимости:** F1-01

---

#### F1-03: Создать `ml/src/loader.py` — singleton для артефактов

- **Файл:** `ml/src/loader.py` (новый)
- **Что делать:** Создать модуль, который загружает артефакты один раз и кеширует в памяти:

```python
"""Singleton-загрузчик ML-артефактов.

Вызывается один раз при старте FastAPI (on_event("startup")).
Последующие вызовы get_artifacts() возвращают кешированный объект.
"""
from pathlib import Path
from src.inference import load_artifacts

_artifacts = None


def get_artifacts():
    """Вернуть загруженные артефакты. Загрузить при первом вызове."""
    global _artifacts
    if _artifacts is None:
        project_root = Path(__file__).resolve().parents[1]  # ml/
        _artifacts = load_artifacts(str(project_root))
    return _artifacts
```

- **Оценка:** 0.3ч
- **Зависимости:** F1-02

---

#### F1-04: Реализовать `/internal/predict` в `ml/app.py`

- **Файл:** `ml/app.py` — **полностью переписать**, заменив `CyberModelSuiteMock`
- **Что делать:** Создать реальный эндпоинт инференса. Полный код:

```python
"""ML-микросервис для прогнозирования киберугроз.

Загружает 48 CatBoost-моделей при старте. Принимает запросы
на /internal/predict, возвращает top_threat + all_threats + report_md.
Доступен ТОЛЬКО внутри Docker-сети (не публичный).
"""
import logging
from datetime import datetime

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from src.loader import get_artifacts
from src.inference import predict_for_date
from src.reporting import generate_markdown_report

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="RSM ML Service",
    description="Внутренний ML-сервис для прогнозирования киберугроз",
    version="1.0.0",
)


class MLRequest(BaseModel):
    """Входные данные для прогноза."""
    date: str          # формат YYYY-MM-DD
    horizon: str       # "24h" | "7d"
    enterprise_type: str = ""
    region: str = ""
    host_count: int = 0


class ThreatResult(BaseModel):
    """Результат по одной угрозе."""
    infrastructure_cluster: str
    threat_cluster: int
    threatname: str
    probability: float
    description: str
    recommendation: str


class MLResponse(BaseModel):
    """Ответ ML-сервиса."""
    date: str
    horizon: str
    top_threat: dict
    all_threats: list
    report_md: str


@app.on_event("startup")
async def startup():
    """Прогрев: загрузить все 48 моделей + данные при старте."""
    logger.info("Загрузка ML-артефактов...")
    artifacts = get_artifacts()
    models_24h = len([k for k in artifacts.get("models", {}) if "24h" in str(k)])
    models_7d = len([k for k in artifacts.get("models", {}) if "7d" in str(k)])
    data_rows = len(artifacts.get("historical_data", []))
    logger.info(
        f"ML-сервис готов: моделей 24h={models_24h}, 7d={models_7d}, "
        f"строк данных={data_rows}"
    )


@app.post("/internal/predict", response_model=MLResponse)
async def internal_predict(request: MLRequest):
    """Запустить прогноз для указанной даты и горизонта.

    Вызывает predict_for_date() из inference.py, который:
    1. Для каждой из 24 комбинаций (4 инфра × 6 угроз) строит 34 признака
    2. Запускает predict_proba по соответствующей модели
    3. Агрегирует вероятности (среднее по 4 инфра-кластерам)
    4. Сортирует и возвращает top_threat + all_threats
    """
    # Валидация горизонта
    if request.horizon not in ("24h", "7d"):
        raise HTTPException(
            status_code=400,
            detail=f"Неверный горизонт: {request.horizon}. Допустимые: 24h, 7d"
        )

    # Валидация даты
    try:
        datetime.strptime(request.date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Неверный формат даты: {request.date}. Ожидается YYYY-MM-DD"
        )

    artifacts = get_artifacts()
    if artifacts is None:
        raise HTTPException(status_code=503, detail="ML-артефакты не загружены")

    try:
        result = predict_for_date(request.date, request.horizon, artifacts)
    except Exception as e:
        logger.error(f"Ошибка инференса: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Ошибка инференса: {str(e)}")

    if result is None:
        raise HTTPException(
            status_code=503,
            detail="Нет доступных моделей для данной комбинации параметров"
        )

    # Генерация Markdown-отчёта
    report_md = generate_markdown_report(result)

    # Сериализация top_threat
    top_threat = result["topthreat"]
    top_threat_dict = {
        "infrastructure_cluster": str(top_threat.get("infrastructure_cluster", "")),
        "threat_cluster": int(top_threat.get("threat_cluster", 0)),
        "threatname": str(top_threat.get("threatname", "")),
        "probability": float(top_threat.get("probability", 0.0)),
        "description": str(top_threat.get("description", "")),
        "recommendation": str(top_threat.get("recommendation", "")),
    }

    # Сериализация all_threats
    all_threats_list = []
    for t in result.get("allthreats", []):
        all_threats_list.append({
            "infrastructure_cluster": str(t.get("infrastructure_cluster", "")),
            "threat_cluster": int(t.get("threat_cluster", 0)),
            "threatname": str(t.get("threatname", "")),
            "probability": float(t.get("probability", 0.0)),
            "description": str(t.get("description", "")),
            "recommendation": str(t.get("recommendation", "")),
        })

    return MLResponse(
        date=str(result["date"].date()) if hasattr(result["date"], "date") else str(result["date"]),
        horizon=result["horizon"],
        top_threat=top_threat_dict,
        all_threats=all_threats_list,
        report_md=report_md,
    )


@app.get("/health")
async def health():
    """Проверка состояния ML-сервиса + информация о загруженных моделях."""
    try:
        artifacts = get_artifacts()
        models = artifacts.get("models", {})
        models_24h = len([k for k in models if "24h" in str(k)])
        models_7d = len([k for k in models if "7d" in str(k)])
        historical_data = artifacts.get("historical_data", None)
        data_rows = len(historical_data) if historical_data is not None else 0
        return {
            "status": "ok",
            "models_24h": models_24h,
            "models_7d": models_7d,
            "total_models": models_24h + models_7d,
            "data_rows": data_rows,
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "models_24h": 0,
            "models_7d": 0,
            "total_models": 0,
            "data_rows": 0,
        }
```

- **Оценка:** 1ч
- **Зависимости:** F1-03

---

#### F1-05: Обновить `ml/requirements.txt`

- **Файл:** `ml/requirements.txt`
- **Что делать:** Привести к виду:

```
fastapi==0.109.0
uvicorn[standard]==0.27.0
catboost==1.2.7
pandas==2.1.4
numpy==1.26.3
scipy==1.11.4
shap==0.44.1
pydantic==2.5.3
```

- Убрать `joblib` (не используется — CatBoost загружается через `CatBoostClassifier().load_model()`)
- **Оценка:** 0.1ч
- **Зависимости:** нет

---

#### F1-06: Создать `Dockerfile` для `ml/`

- **Файл:** `ml/Dockerfile` (новый)

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Зависимости (кешируются отдельным слоем)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Код приложения
COPY . .

EXPOSE 8000

# Запуск FastAPI через uvicorn
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
```

> **Важно:** `--workers 1` — CatBoost-модели потребляют много памяти, один воркер достаточен для хакатона.

- **Оценка:** 0.2ч
- **Зависимости:** нет

---

#### F1-07: Добавить `/health` в `ml/app.py` с инфо о моделях

- **Файл:** `ml/app.py` (уже включён в F1-04)
- **Что делать:** Эндпоинт `GET /health` уже добавлен в полном коде F1-04. Возвращает:
  ```json
  {
    "status": "ok",
    "models_24h": 24,
    "models_7d": 24,
    "total_models": 48,
    "data_rows": 26112
  }
  ```
- **Оценка:** 0ч (входит в F1-04)
- **Зависимости:** F1-04

---

### Фаза 2 — Node.js Backend (~10.7 часа)

> Расширяем Node.js-бэкенд из `main`: исправляем баги, добавляем реальную интеграцию с ML-сервисом, новые роутеры для угроз, рекомендаций, предприятий.

---

#### F2-01: Расширить Prisma schema

- **Файл:** `backend/prisma/schema.prisma`
- **Что делать:** Привести к полной версии с 5 моделями. Финальная схема:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model EnterpriseProfile {
  id              Int              @id @default(autoincrement())
  enterprise_code String           @unique
  type            String
  host_count      Int
  region          String
  infra_cluster   Int?
  size            String?
  predictions     PredictionLog[]
  createdAt       DateTime         @default(now())
}

model Threat {
  id              Int              @id @default(autoincrement())
  code            String           @unique
  name            String
  description     String?
  object          String?
  source          String?
  cia_flags       String?
  threat_cluster  Int?
  recommendations Recommendation[]
}

model PredictionLog {
  id               String            @id @default(uuid())
  request_id       String            @unique
  enterprise_code  String
  enterprise       EnterpriseProfile @relation(fields: [enterprise_code], references: [enterprise_code])
  probability      Float
  predicted_threat String
  predicted_object String?
  season           String?
  day_of_week      Int?
  hour             Int?
  horizon          String?
  report_md        String?
  prediction_date  String?
  createdAt        DateTime          @default(now())
}

model Recommendation {
  id          Int    @id @default(autoincrement())
  rec_code    String @unique
  title       String
  description String
  priority    Int
  threatId    Int
  threat      Threat @relation(fields: [threatId], references: [id])
}

model Incident {
  id              Int      @id @default(autoincrement())
  enterprise_code String
  threat_cluster  Int
  infra_cluster   Int
  success         Boolean
  region          String
  incident_date   DateTime
  host_count      Int?
  enterprise_type String?
}
```

- **Оценка:** 0.5ч
- **Зависимости:** F0-02

---

#### F2-02: Исправить и расширить `seed.ts`

- **Файл:** `backend/prisma/seed.ts`
- **Что делать:**
  1. Исправить баги из F0-01 (separator, имя колонки)
  2. Добавить seed угроз из `clusterinfo.json` и `threatdescriptions.json`
  3. Добавить seed рекомендаций (3-5 на каждую угрозу)
  4. Добавить 3 demo-предприятия

Полный код `seed.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import csv from 'csv-parser';

const prisma = new PrismaClient();

// ─── Данные об угрозах из clusterinfo.json ───
const THREAT_CLUSTERS: Record<string, { code: string; name: string; description: string }> = {
  "1": {
    code: "TC-01",
    name: "Вредоносное ПО / Malware",
    description: "Программы, предназначенные для несанкционированного доступа, повреждения или нарушения работы систем.",
  },
  "2": {
    code: "TC-02",
    name: "Атаки типа DDoS",
    description: "Распределённые атаки на отказ в обслуживании, направленные на перегрузку инфраструктуры.",
  },
  "3": {
    code: "TC-03",
    name: "Brute Force / Подбор паролей",
    description: "Автоматизированный перебор учётных данных для получения несанкционированного доступа.",
  },
  "4": {
    code: "TC-04",
    name: "Социальная инженерия / Фишинг",
    description: "Манипуляция пользователями для получения конфиденциальной информации или доступа.",
  },
  "5": {
    code: "TC-05",
    name: "Эксплуатация уязвимостей",
    description: "Использование известных или неизвестных уязвимостей в ПО для проникновения в систему.",
  },
  "6": {
    code: "TC-06",
    name: "Инсайдерские угрозы",
    description: "Угрозы со стороны сотрудников или подрядчиков, имеющих легитимный доступ к ресурсам.",
  },
};

// ─── Рекомендации для каждой угрозы ───
const RECOMMENDATIONS: Record<string, Array<{ title: string; description: string; priority: number }>> = {
  "TC-01": [
    { title: "Обновление антивирусных баз", description: "Обеспечить ежедневное обновление сигнатур антивирусного ПО на всех хостах.", priority: 1 },
    { title: "Сегментация сети", description: "Изолировать критичные сегменты сети для ограничения распространения вредоносного ПО.", priority: 2 },
    { title: "Контроль запуска приложений", description: "Настроить белые списки разрешённых приложений (application whitelisting).", priority: 3 },
  ],
  "TC-02": [
    { title: "Настройка DDoS-защиты", description: "Подключить сервис защиты от DDoS-атак на уровне провайдера или CDN.", priority: 1 },
    { title: "Rate limiting", description: "Настроить ограничение частоты запросов на балансировщиках и WAF.", priority: 2 },
    { title: "Geo-фильтрация", description: "Ограничить доступ из регионов, не относящихся к бизнес-деятельности.", priority: 3 },
  ],
  "TC-03": [
    { title: "Многофакторная аутентификация", description: "Включить MFA для всех учётных записей с привилегированным доступом.", priority: 1 },
    { title: "Политика блокировки", description: "Настроить автоматическую блокировку после 5 неудачных попыток входа.", priority: 2 },
    { title: "Мониторинг аутентификации", description: "Настроить алерты на аномальное количество попыток входа.", priority: 3 },
  ],
  "TC-04": [
    { title: "Обучение сотрудников", description: "Провести тренинг по распознаванию фишинговых писем и социальной инженерии.", priority: 1 },
    { title: "Фильтрация email", description: "Настроить антиспам и антифишинг фильтры на почтовом шлюзе.", priority: 2 },
    { title: "Верификация запросов", description: "Внедрить процедуру верификации нестандартных запросов через второй канал связи.", priority: 3 },
  ],
  "TC-05": [
    { title: "Управление патчами", description: "Обеспечить установку критических обновлений безопасности в течение 72 часов.", priority: 1 },
    { title: "Сканирование уязвимостей", description: "Проводить еженедельное автоматическое сканирование инфраструктуры.", priority: 2 },
    { title: "WAF", description: "Развернуть Web Application Firewall для защиты публичных веб-сервисов.", priority: 3 },
  ],
  "TC-06": [
    { title: "Принцип минимальных привилегий", description: "Пересмотреть права доступа — каждый сотрудник получает минимально необходимые права.", priority: 1 },
    { title: "DLP-система", description: "Внедрить систему предотвращения утечек данных (Data Loss Prevention).", priority: 2 },
    { title: "Аудит действий", description: "Включить детальное логирование действий привилегированных пользователей.", priority: 3 },
  ],
};

// ─── Demo-предприятия ───
const DEMO_ENTERPRISES = [
  {
    enterprise_code: "DEMO-01",
    type: "Финансовые и IT-компании",
    host_count: 1500,
    region: "Москва",
    infra_cluster: 1,
    size: "Крупное",
  },
  {
    enterprise_code: "DEMO-02",
    type: "Промышленные предприятия",
    host_count: 800,
    region: "Екатеринбург",
    infra_cluster: 2,
    size: "Среднее",
  },
  {
    enterprise_code: "DEMO-03",
    type: "Медицинские учреждения",
    host_count: 200,
    region: "Новосибирск",
    infra_cluster: 3,
    size: "Малое",
  },
];

async function main() {
  console.log("🔄 Начинаем seed...");

  // 1. Seed угроз
  console.log("  → Угрозы...");
  for (const [clusterId, threat] of Object.entries(THREAT_CLUSTERS)) {
    await prisma.threat.upsert({
      where: { code: threat.code },
      update: {
        name: threat.name,
        description: threat.description,
        threat_cluster: parseInt(clusterId),
      },
      create: {
        code: threat.code,
        name: threat.name,
        description: threat.description,
        threat_cluster: parseInt(clusterId),
      },
    });
  }

  // 2. Seed рекомендаций
  console.log("  → Рекомендации...");
  for (const [threatCode, recs] of Object.entries(RECOMMENDATIONS)) {
    const threat = await prisma.threat.findUnique({ where: { code: threatCode } });
    if (!threat) continue;

    for (let i = 0; i < recs.length; i++) {
      const rec = recs[i];
      const recCode = `${threatCode}-REC-${String(i + 1).padStart(2, "0")}`;
      await prisma.recommendation.upsert({
        where: { rec_code: recCode },
        update: {
          title: rec.title,
          description: rec.description,
          priority: rec.priority,
          threatId: threat.id,
        },
        create: {
          rec_code: recCode,
          title: rec.title,
          description: rec.description,
          priority: rec.priority,
          threatId: threat.id,
        },
      });
    }
  }

  // 3. Seed предприятий из CSV
  console.log("  → Предприятия из CSV...");
  const csvPath = path.resolve(__dirname, '../data/raw/incidents_2000.csv');
  if (fs.existsSync(csvPath)) {
    const enterprises = new Map<string, {
      type: string;
      host_count: number;
      region: string;
    }>();

    await new Promise<void>((resolve, reject) => {
      fs.createReadStream(csvPath)
        .pipe(csv({ separator: ',' }))  // ИСПРАВЛЕНО: было ';'
        .on('data', (row: Record<string, string>) => {
          const code = row['Код предприятия'];
          if (code && !enterprises.has(code)) {
            enterprises.set(code, {
              type: row['Тип предприятия'] || 'Не указан',
              host_count: parseInt(row['Количество хостов'] || '0', 10),
              region: row['Регион размещения предприятия'] || 'Не указан',  // ИСПРАВЛЕНО: было row['Регион']
            });
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });

    for (const [code, data] of enterprises) {
      await prisma.enterpriseProfile.upsert({
        where: { enterprise_code: code },
        update: {},
        create: {
          enterprise_code: code,
          type: data.type,
          host_count: data.host_count,
          region: data.region,
        },
      });
    }
    console.log(`    Загружено ${enterprises.size} предприятий из CSV`);
  } else {
    console.log(`    CSV не найден: ${csvPath}`);
  }

  // 4. Seed demo-предприятий
  console.log("  → Demo-предприятия...");
  for (const demo of DEMO_ENTERPRISES) {
    await prisma.enterpriseProfile.upsert({
      where: { enterprise_code: demo.enterprise_code },
      update: {
        type: demo.type,
        host_count: demo.host_count,
        region: demo.region,
        infra_cluster: demo.infra_cluster,
        size: demo.size,
      },
      create: demo,
    });
  }

  console.log("✅ Seed завершён!");
}

main()
  .catch((e) => {
    console.error("❌ Ошибка seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

- **Оценка:** 2ч
- **Зависимости:** F0-01, F2-01

---

#### F2-03: Переписать `predict.ts` — реальная интеграция с ML

- **Файл:** `backend/src/predict.ts`
- **Что делать:** Полностью переписать. Заменить обращение к `CyberModelSuiteMock` на реальный вызов ML-сервиса. Полный код:

```typescript
import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { randomUUID } from 'crypto';

const router = Router();
const prisma = new PrismaClient();

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://ml:8000';

interface PredictRequestBody {
  enterprise_code: string;
  date: string;       // YYYY-MM-DD
  horizon: '24h' | '7d';
}

interface ThreatResult {
  infrastructure_cluster: string;
  threat_cluster: number;
  threatname: string;
  probability: number;
  description: string;
  recommendation: string;
}

interface MLServiceResponse {
  date: string;
  horizon: string;
  top_threat: ThreatResult;
  all_threats: ThreatResult[];
  report_md: string;
}

/**
 * POST /api/v1/predict
 *
 * Основной эндпоинт прогнозирования.
 * 1. Ищет предприятие в БД по enterprise_code
 * 2. Отправляет запрос в ML-сервис
 * 3. Сохраняет результат в PredictionLog
 * 4. Возвращает полный ответ клиенту
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { enterprise_code, date, horizon } = req.body as PredictRequestBody;

    // Валидация входных данных
    if (!enterprise_code || !date || !horizon) {
      return res.status(400).json({
        error: 'Необходимы поля: enterprise_code, date, horizon',
      });
    }

    if (!['24h', '7d'].includes(horizon)) {
      return res.status(400).json({
        error: 'Горизонт должен быть "24h" или "7d"',
      });
    }

    // Шаг 1: Найти предприятие
    const enterprise = await prisma.enterpriseProfile.findUnique({
      where: { enterprise_code },
    });

    if (!enterprise) {
      return res.status(404).json({
        error: `Предприятие с кодом "${enterprise_code}" не найдено`,
      });
    }

    // Шаг 2: Запрос к ML-сервису
    let mlResult: MLServiceResponse;
    try {
      const mlResponse = await axios.post<MLServiceResponse>(
        `${ML_SERVICE_URL}/internal/predict`,
        {
          date,
          horizon,
          enterprise_type: enterprise.type,
          region: enterprise.region,
          host_count: enterprise.host_count,
        },
        { timeout: 30000 } // 30 секунд таймаут
      );
      mlResult = mlResponse.data;
    } catch (mlError: any) {
      console.error('ML-сервис недоступен:', mlError.message);
      return res.status(503).json({
        error: 'ML-сервис временно недоступен',
        detail: mlError.message,
      });
    }

    // Шаг 3: Сохранить в PredictionLog
    const requestId = randomUUID();
    await prisma.predictionLog.create({
      data: {
        request_id: requestId,
        enterprise_code,
        probability: mlResult.top_threat.probability,
        predicted_threat: mlResult.top_threat.threatname,
        predicted_object: mlResult.top_threat.infrastructure_cluster || null,
        horizon,
        report_md: mlResult.report_md,
        prediction_date: date,
      },
    });

    // Шаг 4: Вернуть ответ
    return res.json({
      request_id: requestId,
      top_threat: mlResult.top_threat,
      all_threats: mlResult.all_threats,
      report_md: mlResult.report_md,
      enterprise: {
        enterprise_code: enterprise.enterprise_code,
        type: enterprise.type,
        host_count: enterprise.host_count,
        region: enterprise.region,
      },
    });
  } catch (error: any) {
    console.error('Ошибка в /predict:', error);
    return res.status(500).json({
      error: 'Внутренняя ошибка сервера',
      detail: error.message,
    });
  }
});

/**
 * GET /api/v1/predict/report/:requestId
 *
 * Получить Markdown-отчёт по ID прогноза.
 */
router.get('/report/:requestId', async (req: Request, res: Response) => {
  try {
    const { requestId } = req.params;

    const log = await prisma.predictionLog.findUnique({
      where: { request_id: requestId },
    });

    if (!log) {
      return res.status(404).json({
        error: `Прогноз с request_id "${requestId}" не найден`,
      });
    }

    if (!log.report_md) {
      return res.status(404).json({
        error: 'Отчёт для данного прогноза не сохранён',
      });
    }

    // Отдаём как Markdown
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="report_${requestId}.md"`
    );
    return res.send(log.report_md);
  } catch (error: any) {
    console.error('Ошибка в /predict/report:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/v1/predict/history
 *
 * История прогнозов (последние 50).
 */
router.get('/history', async (_req: Request, res: Response) => {
  try {
    const logs = await prisma.predictionLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        enterprise: {
          select: {
            enterprise_code: true,
            type: true,
            region: true,
          },
        },
      },
    });

    return res.json({ predictions: logs });
  } catch (error: any) {
    console.error('Ошибка в /predict/history:', error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
```

- **Оценка:** 2ч
- **Зависимости:** F2-01, F1-04

---

#### F2-04: Добавить `GET /api/v1/predict/report/:requestId`

- **Файл:** `backend/src/predict.ts` (уже включён в F2-03)
- **Что делать:** Эндпоинт уже реализован в полном коде F2-03. Ищет `PredictionLog` по `request_id`, отдаёт `report_md` как Markdown-файл с заголовком `Content-Disposition: attachment`.
- **Оценка:** 0ч (входит в F2-03)
- **Зависимости:** F2-03

---

#### F2-05: Расширить `analytics.ts` — реальные агрегаты из БД

- **Файл:** `backend/src/analytics.ts`
- **Что делать:** Реализовать агрегатные запросы через Prisma:

```typescript
import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/v1/analytics
 *
 * Сводная аналитика: количество прогнозов, топ-угрозы, средняя вероятность,
 * распределение по регионам и типам предприятий.
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    // Общее количество прогнозов
    const totalPredictions = await prisma.predictionLog.count();

    // Средняя вероятность
    const avgResult = await prisma.predictionLog.aggregate({
      _avg: { probability: true },
    });
    const avgProbability = avgResult._avg.probability || 0;

    // Топ-угрозы (группировка по predicted_threat)
    const topThreats = await prisma.predictionLog.groupBy({
      by: ['predicted_threat'],
      _count: { predicted_threat: true },
      _avg: { probability: true },
      orderBy: { _count: { predicted_threat: 'desc' } },
      take: 6,
    });

    // Количество предприятий
    const totalEnterprises = await prisma.enterpriseProfile.count();

    // Распределение прогнозов по горизонтам
    const byHorizon = await prisma.predictionLog.groupBy({
      by: ['horizon'],
      _count: { horizon: true },
    });

    // Последние 10 прогнозов для timeline
    const recentPredictions = await prisma.predictionLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        request_id: true,
        enterprise_code: true,
        predicted_threat: true,
        probability: true,
        horizon: true,
        prediction_date: true,
        createdAt: true,
      },
    });

    return res.json({
      total_predictions: totalPredictions,
      avg_probability: Math.round(avgProbability * 10000) / 10000,
      total_enterprises: totalEnterprises,
      top_threats: topThreats.map((t) => ({
        threat_name: t.predicted_threat,
        count: t._count.predicted_threat,
        avg_probability: Math.round((t._avg.probability || 0) * 10000) / 10000,
      })),
      by_horizon: byHorizon.map((h) => ({
        horizon: h.horizon,
        count: h._count.horizon,
      })),
      recent_predictions: recentPredictions,
    });
  } catch (error: any) {
    console.error('Ошибка в /analytics:', error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
```

- **Оценка:** 1.5ч
- **Зависимости:** F2-02

---

#### F2-06: Создать `src/threats.ts` роутер

- **Файл:** `backend/src/threats.ts` (новый)

```typescript
import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/v1/threats
 *
 * Список угроз с пагинацией и поиском.
 * Query params: page (default 1), limit (default 20), search (по name/code)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = (req.query.search as string) || '';
    const skip = (page - 1) * limit;

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { code: { contains: search, mode: 'insensitive' as const } },
            { description: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [threats, total] = await Promise.all([
      prisma.threat.findMany({
        where,
        skip,
        take: limit,
        include: {
          recommendations: {
            orderBy: { priority: 'asc' },
          },
        },
        orderBy: { id: 'asc' },
      }),
      prisma.threat.count({ where }),
    ]);

    return res.json({
      threats,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Ошибка в /threats:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/v1/threats/:code
 *
 * Детали угрозы по коду (например, TC-01) с рекомендациями.
 */
router.get('/:code', async (req: Request, res: Response) => {
  try {
    const { code } = req.params;

    const threat = await prisma.threat.findUnique({
      where: { code },
      include: {
        recommendations: {
          orderBy: { priority: 'asc' },
        },
      },
    });

    if (!threat) {
      return res.status(404).json({
        error: `Угроза с кодом "${code}" не найдена`,
      });
    }

    return res.json(threat);
  } catch (error: any) {
    console.error('Ошибка в /threats/:code:', error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
```

- **Оценка:** 1ч
- **Зависимости:** F2-02

---

#### F2-07: Создать `src/recommendations.ts` роутер

- **Файл:** `backend/src/recommendations.ts` (новый)

```typescript
import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/v1/recommendations
 *
 * Список рекомендаций. Фильтрация по threatId (query param).
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const threatId = req.query.threatId
      ? parseInt(req.query.threatId as string)
      : undefined;

    const where = threatId ? { threatId } : {};

    const recommendations = await prisma.recommendation.findMany({
      where,
      include: {
        threat: {
          select: {
            code: true,
            name: true,
            threat_cluster: true,
          },
        },
      },
      orderBy: [{ threatId: 'asc' }, { priority: 'asc' }],
    });

    return res.json({ recommendations });
  } catch (error: any) {
    console.error('Ошибка в /recommendations:', error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
```

- **Оценка:** 0.5ч
- **Зависимости:** F2-02

---

#### F2-08: Создать `src/enterprises.ts` роутер

- **Файл:** `backend/src/enterprises.ts` (новый)

```typescript
import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/v1/enterprises
 *
 * Список предприятий (для dropdown на фронте).
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const enterprises = await prisma.enterpriseProfile.findMany({
      orderBy: { enterprise_code: 'asc' },
      select: {
        enterprise_code: true,
        type: true,
        host_count: true,
        region: true,
        infra_cluster: true,
        size: true,
      },
    });

    return res.json({ enterprises });
  } catch (error: any) {
    console.error('Ошибка в /enterprises:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/v1/enterprises/:code
 *
 * Профиль предприятия + последние 10 прогнозов.
 */
router.get('/:code', async (req: Request, res: Response) => {
  try {
    const { code } = req.params;

    const enterprise = await prisma.enterpriseProfile.findUnique({
      where: { enterprise_code: code },
      include: {
        predictions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            request_id: true,
            predicted_threat: true,
            probability: true,
            horizon: true,
            prediction_date: true,
            createdAt: true,
          },
        },
      },
    });

    if (!enterprise) {
      return res.status(404).json({
        error: `Предприятие "${code}" не найдено`,
      });
    }

    return res.json(enterprise);
  } catch (error: any) {
    console.error('Ошибка в /enterprises/:code:', error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
```

- **Оценка:** 0.5ч
- **Зависимости:** F2-02

---

#### F2-09: Обновить `/api/v1/health` — проверка ML-сервиса

- **Файл:** `backend/src/index.ts` (добавить эндпоинт)

```typescript
import axios from 'axios';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://ml:8000';

app.get('/api/v1/health', async (_req, res) => {
  let dbStatus = 'ok';
  let mlStatus: any = { status: 'unknown' };

  // Проверка БД
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    dbStatus = 'error';
  }

  // Проверка ML-сервиса
  try {
    const mlResponse = await axios.get(`${ML_SERVICE_URL}/health`, {
      timeout: 5000,
    });
    mlStatus = mlResponse.data;
  } catch (e: any) {
    mlStatus = { status: 'error', error: e.message };
  }

  const overallStatus = dbStatus === 'ok' && mlStatus.status === 'ok' ? 'ok' : 'degraded';

  res.json({
    status: overallStatus,
    db: dbStatus,
    ml: mlStatus,
    uptime: process.uptime(),
  });
});
```

- **Оценка:** 0.5ч
- **Зависимости:** F1-07

---

#### F2-10: Добавить типизацию TypeScript для всех роутеров

- **Файл:** `backend/src/types.ts` (новый)

```typescript
// ─── Запросы ───

export interface PredictRequest {
  enterprise_code: string;
  date: string;          // YYYY-MM-DD
  horizon: '24h' | '7d';
}

// ─── Ответы ML-сервиса ───

export interface ThreatResult {
  infrastructure_cluster: string;
  threat_cluster: number;
  threatname: string;
  probability: number;
  description: string;
  recommendation: string;
}

export interface MLServiceResponse {
  date: string;
  horizon: string;
  top_threat: ThreatResult;
  all_threats: ThreatResult[];
  report_md: string;
}

// ─── Ответы API ───

export interface PredictResponse {
  request_id: string;
  top_threat: ThreatResult;
  all_threats: ThreatResult[];
  report_md: string;
  enterprise: {
    enterprise_code: string;
    type: string;
    host_count: number;
    region: string;
  };
}

export interface AnalyticsSummary {
  total_predictions: number;
  avg_probability: number;
  total_enterprises: number;
  top_threats: Array<{
    threat_name: string;
    count: number;
    avg_probability: number;
  }>;
  by_horizon: Array<{
    horizon: string;
    count: number;
  }>;
  recent_predictions: Array<{
    request_id: string;
    enterprise_code: string;
    predicted_threat: string;
    probability: number;
    horizon: string | null;
    prediction_date: string | null;
    createdAt: Date;
  }>;
}

export interface ThreatItem {
  id: number;
  code: string;
  name: string;
  description: string | null;
  object: string | null;
  source: string | null;
  cia_flags: string | null;
  threat_cluster: number | null;
  recommendations: RecommendationItem[];
}

export interface RecommendationItem {
  id: number;
  rec_code: string;
  title: string;
  description: string;
  priority: number;
  threatId: number;
}

export interface EnterpriseItem {
  enterprise_code: string;
  type: string;
  host_count: number;
  region: string;
  infra_cluster: number | null;
  size: string | null;
}
```

- **Оценка:** 0.5ч
- **Зависимости:** F2-03

---

#### F2-11: Обновить `package.json` — зависимости и скрипты

- **Файл:** `backend/package.json`
- **Что делать:**
  1. Добавить зависимости (если отсутствуют):
     ```json
     "dependencies": {
       "@prisma/client": "^5.8.0",
       "axios": "^1.6.5",
       "cors": "^2.8.5",
       "csv-parser": "^3.0.0",
       "dotenv": "^16.3.1",
       "express": "^4.18.2"
     },
     "devDependencies": {
       "@types/cors": "^2.8.17",
       "@types/express": "^4.17.21",
       "@types/node": "^20.10.0",
       "prisma": "^5.8.0",
       "ts-node": "^10.9.2",
       "typescript": "^5.3.3"
     }
     ```
  2. Добавить скрипты:
     ```json
     "scripts": {
       "dev": "ts-node src/index.ts",
       "build": "tsc",
       "start": "node dist/index.js",
       "seed": "ts-node prisma/seed.ts",
       "migrate": "prisma migrate deploy",
       "generate": "prisma generate"
     }
     ```
  3. Добавить секцию prisma в `package.json`:
     ```json
     "prisma": {
       "seed": "ts-node prisma/seed.ts"
     }
     ```
- **Оценка:** 0.2ч
- **Зависимости:** нет

---

#### F2-12: Обновить `backend/src/index.ts` — подключить все роутеры

- **Файл:** `backend/src/index.ts`
- **Что делать:** Полная версия точки входа:

```typescript
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import { PrismaClient } from '@prisma/client';

import predictRouter from './predict';
import analyticsRouter from './analytics';
import threatsRouter from './threats';
import recommendationsRouter from './recommendations';
import enterprisesRouter from './enterprises';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://ml:8000';

// ─── Middleware ───
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

// ─── Роутеры ───
app.use('/api/v1/predict', predictRouter);
app.use('/api/v1/analytics', analyticsRouter);
app.use('/api/v1/threats', threatsRouter);
app.use('/api/v1/recommendations', recommendationsRouter);
app.use('/api/v1/enterprises', enterprisesRouter);

// ─── Health check ───
app.get('/api/v1/health', async (_req, res) => {
  let dbStatus = 'ok';
  let mlStatus: any = { status: 'unknown' };

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    dbStatus = 'error';
  }

  try {
    const mlResponse = await axios.get(`${ML_SERVICE_URL}/health`, {
      timeout: 5000,
    });
    mlStatus = mlResponse.data;
  } catch (e: any) {
    mlStatus = { status: 'error', error: e.message };
  }

  const overallStatus =
    dbStatus === 'ok' && mlStatus.status === 'ok' ? 'ok' : 'degraded';

  res.json({
    status: overallStatus,
    db: dbStatus,
    ml: mlStatus,
    uptime: process.uptime(),
  });
});

// ─── Запуск ───
app.listen(PORT, () => {
  console.log(`Backend запущен на порту ${PORT}`);
  console.log(`ML-сервис: ${ML_SERVICE_URL}`);
});

export default app;
```

- **Оценка:** 0.5ч
- **Зависимости:** F0-06, F2-03, F2-05, F2-06, F2-07, F2-08

---

### Фаза 3 — React Frontend (~21.5 часа)

> Реализуем то, что показывал Streamlit MVP, и обёртываем в полноценный UI с 5 страницами.

---

#### F3-01: Заполнить `types/`

- **Файлы:**
  - `frontend/src/types/api.ts`
  - `frontend/src/types/prediction.ts`
  - `frontend/src/types/analytics.ts`
  - `frontend/src/types/threat.ts`
  - `frontend/src/types/recommendation.ts`

```typescript
// ─── types/api.ts ───
export interface ApiResponse<T> {
  data: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// ─── types/prediction.ts ───
export interface ThreatResult {
  infrastructure_cluster: string;
  threat_cluster: number;
  threatname: string;
  probability: number;
  description: string;
  recommendation: string;
}

export interface PredictRequest {
  enterprise_code: string;
  date: string;          // YYYY-MM-DD
  horizon: '24h' | '7d';
}

export interface PredictResponse {
  request_id: string;
  top_threat: ThreatResult;
  all_threats: ThreatResult[];
  report_md: string;
  enterprise: {
    enterprise_code: string;
    type: string;
    host_count: number;
    region: string;
  };
}

export interface PredictionLogItem {
  request_id: string;
  enterprise_code: string;
  predicted_threat: string;
  probability: number;
  horizon: string | null;
  prediction_date: string | null;
  createdAt: string;
}

// ─── types/analytics.ts ───
export interface AnalyticsSummary {
  total_predictions: number;
  avg_probability: number;
  total_enterprises: number;
  top_threats: Array<{
    threat_name: string;
    count: number;
    avg_probability: number;
  }>;
  by_horizon: Array<{
    horizon: string;
    count: number;
  }>;
  recent_predictions: PredictionLogItem[];
}

// ─── types/threat.ts ───
export interface ThreatItem {
  id: number;
  code: string;
  name: string;
  description: string | null;
  object: string | null;
  source: string | null;
  cia_flags: string | null;
  threat_cluster: number | null;
  recommendations: RecommendationItem[];
}

// ─── types/recommendation.ts ───
export interface RecommendationItem {
  id: number;
  rec_code: string;
  title: string;
  description: string;
  priority: number;
  threatId: number;
  threat?: {
    code: string;
    name: string;
    threat_cluster: number | null;
  };
}
```

- **Оценка:** 1ч
- **Зависимости:** нет

---

#### F3-02: Заполнить `utils/`

- **Файлы:**
  - `frontend/src/utils/constants.ts`
  - `frontend/src/utils/formatters.ts`
  - `frontend/src/utils/riskColors.ts`

```typescript
// ─── utils/constants.ts ───
export const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const HORIZONS = ['24h', '7d'] as const;

export const RISK_THRESHOLDS = {
  HIGH: 0.7,
  MEDIUM: 0.4,
};

export const INFRA_CLUSTER_LABELS: Record<string, string> = {
  '1': 'Digital-Native (Высокотехнологичные)',
  '2': 'Industrial IoT (Промышленные)',
  '3': 'Data-Sensitive (Чувствительные данные)',
  '4': 'Service-Oriented (Сервисные)',
};

export const THREAT_CLUSTER_LABELS: Record<string, string> = {
  '1': 'Вредоносное ПО / Malware',
  '2': 'Атаки типа DDoS',
  '3': 'Brute Force / Подбор паролей',
  '4': 'Социальная инженерия / Фишинг',
  '5': 'Эксплуатация уязвимостей',
  '6': 'Инсайдерские угрозы',
};

// ─── utils/formatters.ts ───
export function formatPercent(p: number): string {
  return `${(p * 100).toFixed(1)}%`;
}

export function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function getRiskLabel(p: number): 'Высокий' | 'Средний' | 'Низкий' {
  if (p >= 0.7) return 'Высокий';
  if (p >= 0.4) return 'Средний';
  return 'Низкий';
}

export function formatHorizon(h: '24h' | '7d'): string {
  return h === '24h' ? '24 часа' : '7 дней';
}

// ─── utils/riskColors.ts ───
export function getRiskColor(probability: number): string {
  if (probability >= 0.7) return '#dc2626';   // красный — высокий риск
  if (probability >= 0.4) return '#f59e0b';   // жёлтый — средний
  return '#22c55e';                            // зелёный — низкий
}

export function getRiskBgColor(probability: number): string {
  if (probability >= 0.7) return '#fef2f2';
  if (probability >= 0.4) return '#fffbeb';
  return '#f0fdf4';
}
```

- **Оценка:** 1ч
- **Зависимости:** нет

---

#### F3-03: Заполнить `services/` (axios)

- **Файлы:**
  - `frontend/src/services/api.ts`
  - `frontend/src/services/predictApi.ts`
  - `frontend/src/services/analyticsApi.ts`
  - `frontend/src/services/threatsApi.ts`
  - `frontend/src/services/recommendationsApi.ts`
  - `frontend/src/services/scenariosApi.ts`

```typescript
// ─── services/api.ts ───
import axios from 'axios';
import { API_BASE_URL } from '../utils/constants';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// Перехватчик ошибок
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.error ||
      error.response?.data?.detail ||
      error.message ||
      'Неизвестная ошибка';
    console.error(`API Error: ${message}`);
    return Promise.reject(new Error(message));
  }
);

export default apiClient;

// ─── services/predictApi.ts ───
import apiClient from './api';
import type { PredictRequest, PredictResponse } from '../types/prediction';

export async function predict(data: PredictRequest): Promise<PredictResponse> {
  const response = await apiClient.post<PredictResponse>(
    '/api/v1/predict',
    data
  );
  return response.data;
}

export async function getReport(requestId: string): Promise<string> {
  const response = await apiClient.get<string>(
    `/api/v1/predict/report/${requestId}`,
    { responseType: 'text' as any }
  );
  return response.data;
}

export async function getPredictionHistory() {
  const response = await apiClient.get('/api/v1/predict/history');
  return response.data;
}

// ─── services/analyticsApi.ts ───
import apiClient from './api';
import type { AnalyticsSummary } from '../types/analytics';

export async function getSummary(): Promise<AnalyticsSummary> {
  const response = await apiClient.get<AnalyticsSummary>('/api/v1/analytics');
  return response.data;
}

// ─── services/threatsApi.ts ───
import apiClient from './api';
import type { ThreatItem } from '../types/threat';

interface ThreatsResponse {
  threats: ThreatItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export async function getThreats(params?: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<ThreatsResponse> {
  const response = await apiClient.get<ThreatsResponse>('/api/v1/threats', {
    params,
  });
  return response.data;
}

export async function getThreat(code: string): Promise<ThreatItem> {
  const response = await apiClient.get<ThreatItem>(`/api/v1/threats/${code}`);
  return response.data;
}

// ─── services/recommendationsApi.ts ───
import apiClient from './api';
import type { RecommendationItem } from '../types/recommendation';

interface RecommendationsResponse {
  recommendations: RecommendationItem[];
}

export async function getRecommendations(
  threatId?: number
): Promise<RecommendationItem[]> {
  const params = threatId ? { threatId } : {};
  const response = await apiClient.get<RecommendationsResponse>(
    '/api/v1/recommendations',
    { params }
  );
  return response.data.recommendations;
}

// ─── services/scenariosApi.ts ───
// Заглушка для будущей функциональности сценарного анализа
export async function getScenarios(): Promise<any[]> {
  // TODO: реализовать когда API будет готов
  return [];
}
```

- **Оценка:** 2ч
- **Зависимости:** F3-01

---

#### F3-04: Заполнить `hooks/`

- **Файлы:**
  - `frontend/src/hooks/usePrediction.ts`
  - `frontend/src/hooks/useAnalytics.ts`
  - `frontend/src/hooks/useDemo.ts`

```typescript
// ─── hooks/usePrediction.ts ───
import { useState, useCallback } from 'react';
import { predict } from '../services/predictApi';
import type { PredictRequest, PredictResponse } from '../types/prediction';

export function usePrediction() {
  const [form, setForm] = useState<PredictRequest>({
    enterprise_code: '',
    date: new Date().toISOString().slice(0, 10),
    horizon: '24h',
  });
  const [result, setResult] = useState<PredictResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateForm = useCallback(
    (field: keyof PredictRequest, value: string) => {
      setForm((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const runPrediction = useCallback(async () => {
    if (!form.enterprise_code || !form.date || !form.horizon) {
      setError('Заполните все поля');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await predict(form);
      setResult(response);
    } catch (err: any) {
      setError(err.message || 'Ошибка выполнения прогноза');
    } finally {
      setLoading(false);
    }
  }, [form]);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { form, updateForm, result, loading, error, runPrediction, reset };
}

// ─── hooks/useAnalytics.ts ───
import { useState, useEffect } from 'react';
import { getSummary } from '../services/analyticsApi';
import type { AnalyticsSummary } from '../types/analytics';

export function useAnalytics() {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        const summary = await getSummary();
        if (!cancelled) setData(summary);
      } catch (err: any) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, []);

  return { data, loading, error };
}

// ─── hooks/useDemo.ts ───
/**
 * Хардкод demo enterprise_code для быстрого тестирования.
 * Соответствуют seed-данным из F2-02.
 */
export function useDemo() {
  const demoEnterprises = [
    {
      enterprise_code: 'DEMO-01',
      label: 'DEMO-01 — Digital-Native, 1500 хостов, Москва',
    },
    {
      enterprise_code: 'DEMO-02',
      label: 'DEMO-02 — Industrial IoT, 800 хостов, Екатеринбург',
    },
    {
      enterprise_code: 'DEMO-03',
      label: 'DEMO-03 — Data-Sensitive, 200 хостов, Новосибирск',
    },
  ];

  return { demoEnterprises };
}
```

- **Оценка:** 2ч
- **Зависимости:** F3-03

---

#### F3-05: Реализовать common-компоненты

- **Файлы:**
  - `frontend/src/components/common/LoadingSpinner.tsx`
  - `frontend/src/components/common/ErrorMessage.tsx`
  - `frontend/src/components/common/EmptyState.tsx`
  - `frontend/src/components/common/Toast.tsx`

```tsx
// ─── LoadingSpinner.tsx ───
import React from 'react';

interface Props {
  text?: string;
}

export const LoadingSpinner: React.FC<Props> = ({ text = 'Загрузка...' }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem' }}>
    <div
      style={{
        width: 40, height: 40,
        border: '4px solid #e5e7eb',
        borderTop: '4px solid #01696f',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
      }}
    />
    <p style={{ marginTop: '0.5rem', color: '#6b7280' }}>{text}</p>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

// ─── ErrorMessage.tsx ───
import React from 'react';

interface Props {
  message: string;
  onRetry?: () => void;
}

export const ErrorMessage: React.FC<Props> = ({ message, onRetry }) => (
  <div
    style={{
      padding: '1rem 1.5rem',
      backgroundColor: '#fef2f2',
      border: '1px solid #fecaca',
      borderRadius: 8,
      color: '#991b1b',
    }}
  >
    <strong>Ошибка:</strong> {message}
    {onRetry && (
      <button
        onClick={onRetry}
        style={{
          marginLeft: '1rem', padding: '0.25rem 0.75rem',
          background: '#dc2626', color: '#fff', border: 'none',
          borderRadius: 4, cursor: 'pointer',
        }}
      >
        Повторить
      </button>
    )}
  </div>
);

// ─── EmptyState.tsx ───
import React from 'react';

interface Props {
  title: string;
  description?: string;
}

export const EmptyState: React.FC<Props> = ({ title, description }) => (
  <div
    style={{
      padding: '2rem',
      backgroundColor: '#f9fafb',
      border: '1px solid #e5e7eb',
      borderRadius: 8,
      textAlign: 'center',
      color: '#6b7280',
    }}
  >
    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{title}</h3>
    {description && <p style={{ marginTop: '0.5rem' }}>{description}</p>}
  </div>
);

// ─── Toast.tsx ───
import React, { useEffect } from 'react';

interface Props {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
  duration?: number;
}

const COLORS = {
  success: { bg: '#f0fdf4', border: '#86efac', text: '#166534' },
  error:   { bg: '#fef2f2', border: '#fecaca', text: '#991b1b' },
  info:    { bg: '#eff6ff', border: '#93c5fd', text: '#1e40af' },
};

export const Toast: React.FC<Props> = ({
  message, type = 'info', onClose, duration = 3000,
}) => {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const colors = COLORS[type];

  return (
    <div
      style={{
        position: 'fixed', top: 16, right: 16, zIndex: 1000,
        padding: '0.75rem 1.5rem',
        backgroundColor: colors.bg,
        border: `1px solid ${colors.border}`,
        borderRadius: 8,
        color: colors.text,
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      }}
    >
      {message}
      <button
        onClick={onClose}
        style={{
          marginLeft: '1rem', background: 'none', border: 'none',
          cursor: 'pointer', color: colors.text, fontWeight: 'bold',
        }}
      >
        x
      </button>
    </div>
  );
};
```

- **Оценка:** 1ч
- **Зависимости:** нет

---

#### F3-06: Реализовать layout-компоненты

- **Файлы:**
  - `frontend/src/components/layout/PageWrapper.tsx`
  - `frontend/src/components/layout/Header.tsx` (обновить)
  - `frontend/src/components/layout/Sidebar.tsx` (обновить)
- **Что делать:**
  - `PageWrapper`: flex-контейнер с `Header` сверху, `Sidebar` слева, `children` справа
  - `Header`: название приложения «Прогноз киберугроз», горизонтальная навигация
  - `Sidebar`: вертикальное меню (5 пунктов), активная ссылка выделена цветом `#01696f`
  - В `App.tsx` обернуть `<AppRouter />` в `<PageWrapper>`
- **Оценка:** 1ч
- **Зависимости:** F3-05

---

#### F3-07: Реализовать карточки (`cards/`)

- **Файлы:**
  - `frontend/src/components/cards/RiskCard.tsx`
  - `frontend/src/components/cards/KpiCard.tsx`
  - `frontend/src/components/cards/ThreatCard.tsx`
  - `frontend/src/components/cards/RecommendationCard.tsx`

```tsx
// ─── RiskCard.tsx ───
// Аналог st.metric в Streamlit: показывает главную угрозу + вероятность
import React from 'react';
import type { ThreatResult } from '../../types/prediction';
import { formatPercent, getRiskLabel } from '../../utils/formatters';
import { getRiskColor, getRiskBgColor } from '../../utils/riskColors';

interface Props {
  threat: ThreatResult;
}

export const RiskCard: React.FC<Props> = ({ threat }) => {
  const riskColor = getRiskColor(threat.probability);
  const bgColor = getRiskBgColor(threat.probability);
  const riskLabel = getRiskLabel(threat.probability);

  return (
    <div
      style={{
        padding: '1.5rem',
        border: `2px solid ${riskColor}`,
        borderRadius: 12,
        backgroundColor: bgColor,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#1f2937' }}>
            Главная угроза
          </h3>
          <p style={{ margin: '0.5rem 0', fontSize: '1.1rem', fontWeight: 600 }}>
            {threat.threatname}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: riskColor }}>
            {formatPercent(threat.probability)}
          </div>
          <div
            style={{
              display: 'inline-block',
              padding: '0.25rem 0.75rem',
              backgroundColor: riskColor,
              color: '#fff',
              borderRadius: 999,
              fontSize: '0.8rem',
              fontWeight: 600,
            }}
          >
            {riskLabel}
          </div>
        </div>
      </div>
      <p style={{ marginTop: '0.75rem', color: '#4b5563', fontSize: '0.9rem' }}>
        {threat.description}
      </p>
      <div
        style={{
          marginTop: '0.75rem',
          padding: '0.75rem',
          backgroundColor: 'rgba(255,255,255,0.7)',
          borderRadius: 8,
          fontSize: '0.9rem',
        }}
      >
        <strong>Рекомендация:</strong> {threat.recommendation}
      </div>
    </div>
  );
};

// ─── KpiCard.tsx ───
import React from 'react';

interface Props {
  title: string;
  value: string | number;
  subtitle?: string;
  color?: string;
}

export const KpiCard: React.FC<Props> = ({
  title, value, subtitle, color = '#01696f',
}) => (
  <div
    style={{
      padding: '1.25rem',
      backgroundColor: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: 8,
      borderLeft: `4px solid ${color}`,
    }}
  >
    <p style={{ margin: 0, fontSize: '0.8rem', color: '#6b7280', textTransform: 'uppercase' }}>
      {title}
    </p>
    <p style={{ margin: '0.25rem 0', fontSize: '1.75rem', fontWeight: 700, color: '#1f2937' }}>
      {value}
    </p>
    {subtitle && (
      <p style={{ margin: 0, fontSize: '0.85rem', color: '#6b7280' }}>{subtitle}</p>
    )}
  </div>
);

// ─── ThreatCard.tsx ───
import React from 'react';
import type { ThreatItem } from '../../types/threat';

interface Props {
  threat: ThreatItem;
  onClick?: () => void;
}

export const ThreatCard: React.FC<Props> = ({ threat, onClick }) => (
  <div
    onClick={onClick}
    style={{
      padding: '1rem',
      backgroundColor: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: 8,
      cursor: onClick ? 'pointer' : 'default',
      transition: 'box-shadow 0.2s',
    }}
    onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)')}
    onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span
        style={{
          fontSize: '0.75rem', fontWeight: 600,
          color: '#01696f', backgroundColor: '#ecfdf5',
          padding: '0.15rem 0.5rem', borderRadius: 4,
        }}
      >
        {threat.code}
      </span>
      {threat.threat_cluster && (
        <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
          Кластер {threat.threat_cluster}
        </span>
      )}
    </div>
    <h4 style={{ margin: '0.5rem 0 0.25rem', fontSize: '1rem' }}>{threat.name}</h4>
    {threat.description && (
      <p style={{ margin: 0, fontSize: '0.85rem', color: '#6b7280' }}>
        {threat.description}
      </p>
    )}
    {threat.recommendations.length > 0 && (
      <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', color: '#9ca3af' }}>
        Рекомендаций: {threat.recommendations.length}
      </p>
    )}
  </div>
);

// ─── RecommendationCard.tsx ───
import React from 'react';
import type { RecommendationItem } from '../../types/recommendation';

const PRIORITY_COLORS: Record<number, string> = {
  1: '#dc2626',
  2: '#f59e0b',
  3: '#22c55e',
};

interface Props {
  recommendation: RecommendationItem;
}

export const RecommendationCard: React.FC<Props> = ({ recommendation }) => (
  <div
    style={{
      padding: '1rem',
      backgroundColor: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: 8,
      borderLeft: `4px solid ${PRIORITY_COLORS[recommendation.priority] || '#6b7280'}`,
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <h4 style={{ margin: 0, fontSize: '0.95rem' }}>{recommendation.title}</h4>
      <span
        style={{
          fontSize: '0.7rem', fontWeight: 600,
          color: PRIORITY_COLORS[recommendation.priority] || '#6b7280',
        }}
      >
        Приоритет {recommendation.priority}
      </span>
    </div>
    <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', color: '#4b5563' }}>
      {recommendation.description}
    </p>
    {recommendation.threat && (
      <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', color: '#9ca3af' }}>
        Угроза: {recommendation.threat.name}
      </p>
    )}
  </div>
);
```

- **Оценка:** 2ч
- **Зависимости:** F3-02, F3-05

---

#### F3-08: Реализовать графики (`charts/`)

- **Файлы:**
  - `frontend/src/components/charts/ThreatPieChart.tsx`
  - `frontend/src/components/charts/IncidentTimeline.tsx`
  - `frontend/src/components/charts/RegionBarChart.tsx`
  - `frontend/src/components/charts/EnterpriseTypeChart.tsx`
  - `frontend/src/components/charts/ShapWaterfall.tsx`
- **Библиотека:** Recharts (`npm install recharts`)
- **Что делать:**

```tsx
// ─── ThreatPieChart.tsx ───
// Аналог px.bar в Streamlit: бар-чарт вероятностей по 6 угрозам
import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import type { ThreatResult } from '../../types/prediction';
import { getRiskColor } from '../../utils/riskColors';

interface Props {
  threats: ThreatResult[];
}

export const ThreatBarChart: React.FC<Props> = ({ threats }) => {
  const data = threats.map((t) => ({
    name: t.threatname.length > 25 ? t.threatname.slice(0, 25) + '...' : t.threatname,
    fullName: t.threatname,
    probability: Math.round(t.probability * 10000) / 100,
    rawProbability: t.probability,
  }));

  return (
    <div style={{ width: '100%', height: 300 }}>
      <h4 style={{ margin: '0 0 0.5rem', color: '#1f2937' }}>
        Вероятности угроз
      </h4>
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ left: 160, right: 20 }}>
          <XAxis type="number" domain={[0, 100]} unit="%" />
          <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 12 }} />
          <Tooltip
            formatter={(value: number) => [`${value}%`, 'Вероятность']}
            labelFormatter={(label: string) => {
              const item = data.find((d) => d.name === label);
              return item?.fullName || label;
            }}
          />
          <Bar dataKey="probability" radius={[0, 4, 4, 0]}>
            {data.map((entry, index) => (
              <Cell key={index} fill={getRiskColor(entry.rawProbability)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// ─── IncidentTimeline.tsx ───
import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import type { PredictionLogItem } from '../../types/prediction';

interface Props {
  predictions: PredictionLogItem[];
}

export const IncidentTimeline: React.FC<Props> = ({ predictions }) => {
  const data = predictions
    .slice()
    .reverse()
    .map((p) => ({
      date: p.prediction_date || p.createdAt.slice(0, 10),
      probability: Math.round(p.probability * 100),
      threat: p.predicted_threat,
    }));

  return (
    <div style={{ width: '100%', height: 250 }}>
      <h4 style={{ margin: '0 0 0.5rem', color: '#1f2937' }}>
        Динамика прогнозов
      </h4>
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis unit="%" domain={[0, 100]} />
          <Tooltip formatter={(v: number) => [`${v}%`, 'Вероятность']} />
          <Line type="monotone" dataKey="probability" stroke="#01696f" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

// ─── RegionBarChart.tsx ───
// Заглушка: данные будут из /api/v1/analytics (расширение)
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface Props {
  data: Array<{ region: string; count: number }>;
}

export const RegionBarChart: React.FC<Props> = ({ data }) => (
  <div style={{ width: '100%', height: 250 }}>
    <h4 style={{ margin: '0 0 0.5rem', color: '#1f2937' }}>По регионам</h4>
    <ResponsiveContainer>
      <BarChart data={data}>
        <XAxis dataKey="region" tick={{ fontSize: 11 }} />
        <YAxis />
        <Tooltip />
        <Bar dataKey="count" fill="#01696f" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  </div>
);

// ─── EnterpriseTypeChart.tsx ───
import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const COLORS = ['#20808D', '#A84B2F', '#1B474D', '#BCE2E7', '#944454', '#FFC553'];

interface Props {
  data: Array<{ type: string; count: number }>;
}

export const EnterpriseTypeChart: React.FC<Props> = ({ data }) => (
  <div style={{ width: '100%', height: 250 }}>
    <h4 style={{ margin: '0 0 0.5rem', color: '#1f2937' }}>По типам предприятий</h4>
    <ResponsiveContainer>
      <PieChart>
        <Pie data={data} dataKey="count" nameKey="type" cx="50%" cy="50%" outerRadius={80} label>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  </div>
);

// ─── ShapWaterfall.tsx ───
// Заглушка: SHAP-значения можно добавить если ML-сервис их возвращает
import React from 'react';

export const ShapWaterfall: React.FC = () => (
  <div
    style={{
      padding: '2rem', textAlign: 'center',
      backgroundColor: '#f9fafb', borderRadius: 8,
      border: '1px dashed #d1d5db', color: '#9ca3af',
    }}
  >
    SHAP Waterfall — будет реализовано при интеграции SHAP-значений из ML-сервиса
  </div>
);
```

- **Оценка:** 3ч
- **Зависимости:** F3-05

---

#### F3-09: Реализовать `PredictionForm`

- **Файл:** `frontend/src/components/forms/PredictionForm.tsx`
- **Что делать:** Форма с 3 полями: `enterprise_code` (select), `date` (date picker), `horizon` (radio). Загрузка списка предприятий из `/api/v1/enterprises`.

```tsx
import React, { useState, useEffect } from 'react';
import apiClient from '../../services/api';
import type { PredictRequest } from '../../types/prediction';

interface EnterpriseOption {
  enterprise_code: string;
  type: string;
  region: string;
  host_count: number;
}

interface Props {
  form: PredictRequest;
  onUpdateForm: (field: keyof PredictRequest, value: string) => void;
  onSubmit: () => void;
  loading: boolean;
}

export const PredictionForm: React.FC<Props> = ({
  form, onUpdateForm, onSubmit, loading,
}) => {
  const [enterprises, setEnterprises] = useState<EnterpriseOption[]>([]);

  useEffect(() => {
    apiClient.get('/api/v1/enterprises').then((res) => {
      setEnterprises(res.data.enterprises || []);
    }).catch(console.error);
  }, []);

  return (
    <div
      style={{
        padding: '1.5rem',
        backgroundColor: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: 8,
      }}
    >
      <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem' }}>Параметры прогноза</h3>

      {/* Предприятие */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>
          Предприятие
        </label>
        <select
          value={form.enterprise_code}
          onChange={(e) => onUpdateForm('enterprise_code', e.target.value)}
          style={{
            width: '100%', padding: '0.5rem',
            border: '1px solid #d1d5db', borderRadius: 4,
          }}
        >
          <option value="">Выберите предприятие</option>
          {enterprises.map((e) => (
            <option key={e.enterprise_code} value={e.enterprise_code}>
              {e.enterprise_code} — {e.type}, {e.region} ({e.host_count} хостов)
            </option>
          ))}
        </select>
      </div>

      {/* Дата */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>
          Дата прогноза
        </label>
        <input
          type="date"
          value={form.date}
          onChange={(e) => onUpdateForm('date', e.target.value)}
          style={{
            width: '100%', padding: '0.5rem',
            border: '1px solid #d1d5db', borderRadius: 4,
          }}
        />
      </div>

      {/* Горизонт */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>
          Горизонт прогноза
        </label>
        <div style={{ display: 'flex', gap: '1rem' }}>
          {(['24h', '7d'] as const).map((h) => (
            <label key={h} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
              <input
                type="radio"
                name="horizon"
                value={h}
                checked={form.horizon === h}
                onChange={(e) => onUpdateForm('horizon', e.target.value)}
              />
              {h === '24h' ? '24 часа' : '7 дней'}
            </label>
          ))}
        </div>
      </div>

      {/* Кнопка */}
      <button
        onClick={onSubmit}
        disabled={loading || !form.enterprise_code}
        style={{
          width: '100%', padding: '0.75rem',
          backgroundColor: loading ? '#9ca3af' : '#01696f',
          color: '#fff', border: 'none', borderRadius: 6,
          fontSize: '1rem', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? 'Выполняется прогноз...' : 'Запустить прогноз'}
      </button>
    </div>
  );
};
```

- **Оценка:** 1.5ч
- **Зависимости:** F3-04, F3-05

---

#### F3-10: Реализовать `PredictionPage` — ГЛАВНАЯ страница (аналог Streamlit)

- **Файл:** `frontend/src/pages/PredictionPage.tsx`
- **Что делать:** Точный аналог Streamlit: форма → RiskCard + BarChart + Markdown-отчёт + кнопка скачивания

```tsx
import React from 'react';
import ReactMarkdown from 'react-markdown';
import { usePrediction } from '../hooks/usePrediction';
import { PredictionForm } from '../components/forms/PredictionForm';
import { RiskCard } from '../components/cards/RiskCard';
import { ThreatBarChart } from '../components/charts/ThreatPieChart';
import { ErrorMessage } from '../components/common/ErrorMessage';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const PredictionPage: React.FC = () => {
  const { form, updateForm, result, loading, error, runPrediction } = usePrediction();

  // Скачивание Markdown-отчёта
  const handleDownload = () => {
    if (!result?.report_md) return;
    const blob = new Blob([result.report_md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report_${result.request_id}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      <h1 style={{ margin: '0 0 1.5rem', fontSize: '1.5rem', color: '#1f2937' }}>
        Прогноз киберугроз
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Левая панель: форма (аналог st.sidebar) */}
        <PredictionForm
          form={form}
          onUpdateForm={updateForm}
          onSubmit={runPrediction}
          loading={loading}
        />

        {/* Правая панель: результаты */}
        <div>
          {loading && <LoadingSpinner text="Выполняется прогноз по 48 моделям..." />}

          {error && <ErrorMessage message={error} onRetry={runPrediction} />}

          {result && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Информация о предприятии */}
              <div style={{
                padding: '0.75rem 1rem', backgroundColor: '#eff6ff',
                borderRadius: 8, fontSize: '0.9rem', color: '#1e40af',
              }}>
                Предприятие: <strong>{result.enterprise.enterprise_code}</strong> |
                Тип: {result.enterprise.type} |
                Регион: {result.enterprise.region} |
                Хосты: {result.enterprise.host_count}
              </div>

              {/* Top threat — аналог st.metric */}
              <RiskCard threat={result.top_threat} />

              {/* Bar chart — аналог px.bar */}
              <div style={{
                padding: '1.5rem', backgroundColor: '#fff',
                border: '1px solid #e5e7eb', borderRadius: 8,
              }}>
                <ThreatBarChart threats={result.all_threats} />
              </div>

              {/* Markdown-отчёт — аналог st.markdown + st.download_button */}
              <div style={{
                padding: '1.5rem', backgroundColor: '#fff',
                border: '1px solid #e5e7eb', borderRadius: 8,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Отчёт</h3>
                  <button
                    onClick={handleDownload}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: '#01696f', color: '#fff',
                      border: 'none', borderRadius: 6,
                      cursor: 'pointer', fontSize: '0.85rem',
                    }}
                  >
                    Скачать .md
                  </button>
                </div>
                <div style={{
                  padding: '1rem', backgroundColor: '#f9fafb',
                  borderRadius: 8, fontSize: '0.9rem', lineHeight: 1.6,
                }}>
                  <ReactMarkdown>{result.report_md}</ReactMarkdown>
                </div>
              </div>
            </div>
          )}

          {/* Пустое состояние */}
          {!loading && !error && !result && (
            <div style={{
              padding: '3rem', textAlign: 'center',
              color: '#9ca3af', backgroundColor: '#f9fafb',
              borderRadius: 8, border: '1px dashed #d1d5db',
            }}>
              <p style={{ fontSize: '1.1rem' }}>Выберите предприятие и нажмите «Запустить прогноз»</p>
              <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>
                Система использует 48 CatBoost-моделей для анализа 6 типов угроз
                по 4 инфраструктурным кластерам
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
```

- **Оценка:** 3ч
- **Зависимости:** F3-07, F3-08, F3-09

---

#### F3-11: Реализовать `DashboardPage`

- **Файл:** `frontend/src/pages/DashboardPage.tsx`
- **Что делать:** 4 KPI-карточки + графики из `/api/v1/analytics`

```tsx
import React from 'react';
import { useAnalytics } from '../hooks/useAnalytics';
import { KpiCard } from '../components/cards/KpiCard';
import { IncidentTimeline } from '../components/charts/IncidentTimeline';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorMessage } from '../components/common/ErrorMessage';
import { EmptyState } from '../components/common/EmptyState';
import { formatPercent } from '../utils/formatters';

export const DashboardPage: React.FC = () => {
  const { data, loading, error } = useAnalytics();

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;
  if (!data) return <EmptyState title="Нет данных" description="Запустите хотя бы один прогноз" />;

  const topThreatName = data.top_threats.length > 0
    ? data.top_threats[0].threat_name
    : 'Нет данных';

  return (
    <div style={{ padding: '1.5rem' }}>
      <h1 style={{ margin: '0 0 1.5rem', fontSize: '1.5rem', color: '#1f2937' }}>Дашборд</h1>

      {/* KPI-карточки */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        <KpiCard title="Прогнозов" value={data.total_predictions} subtitle="всего выполнено" />
        <KpiCard title="Главная угроза" value={topThreatName} color="#dc2626" />
        <KpiCard
          title="Средняя вероятность"
          value={formatPercent(data.avg_probability)}
          color="#f59e0b"
        />
        <KpiCard title="Предприятий" value={data.total_enterprises} subtitle="в базе" />
      </div>

      {/* Графики */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div style={{ padding: '1.5rem', backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 8 }}>
          <IncidentTimeline predictions={data.recent_predictions} />
        </div>
        <div style={{ padding: '1.5rem', backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 8 }}>
          <h4 style={{ margin: '0 0 1rem', color: '#1f2937' }}>Топ угроз</h4>
          {data.top_threats.map((t, i) => (
            <div
              key={i}
              style={{
                display: 'flex', justifyContent: 'space-between',
                padding: '0.5rem 0', borderBottom: '1px solid #f3f4f6',
              }}
            >
              <span>{t.threat_name}</span>
              <span style={{ fontWeight: 600 }}>
                {t.count} ({formatPercent(t.avg_probability)})
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
```

- **Оценка:** 2ч
- **Зависимости:** F3-04, F3-07, F3-08

---

#### F3-12: Реализовать `ThreatCatalogPage`

- **Файл:** `frontend/src/pages/ThreatCatalogPage.tsx`
- **Что делать:** Список угроз с поиском, пагинацией, детальным просмотром.

```tsx
import React, { useState, useEffect } from 'react';
import { getThreats } from '../services/threatsApi';
import { ThreatCard } from '../components/cards/ThreatCard';
import { RecommendationCard } from '../components/cards/RecommendationCard';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorMessage } from '../components/common/ErrorMessage';
import type { ThreatItem } from '../types/threat';

export const ThreatCatalogPage: React.FC = () => {
  const [threats, setThreats] = useState<ThreatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedThreat, setSelectedThreat] = useState<ThreatItem | null>(null);

  useEffect(() => {
    setLoading(true);
    getThreats({ search })
      .then((res) => {
        setThreats(res.threats);
        setError(null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [search]);

  return (
    <div style={{ padding: '1.5rem' }}>
      <h1 style={{ margin: '0 0 1.5rem', fontSize: '1.5rem', color: '#1f2937' }}>
        Каталог угроз
      </h1>

      {/* Поиск */}
      <input
        type="text"
        placeholder="Поиск по названию или коду..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          width: '100%', maxWidth: 400, padding: '0.5rem 1rem',
          border: '1px solid #d1d5db', borderRadius: 6,
          marginBottom: '1.5rem',
        }}
      />

      {loading && <LoadingSpinner />}
      {error && <ErrorMessage message={error} />}

      <div style={{ display: 'grid', gridTemplateColumns: selectedThreat ? '1fr 1fr' : '1fr', gap: '1.5rem' }}>
        {/* Список угроз */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {threats.map((t) => (
            <ThreatCard
              key={t.id}
              threat={t}
              onClick={() => setSelectedThreat(t)}
            />
          ))}
        </div>

        {/* Детали выбранной угрозы */}
        {selectedThreat && (
          <div style={{
            padding: '1.5rem', backgroundColor: '#fff',
            border: '1px solid #e5e7eb', borderRadius: 8,
            position: 'sticky', top: '1rem', alignSelf: 'start',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0 }}>{selectedThreat.name}</h3>
              <button
                onClick={() => setSelectedThreat(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                x
              </button>
            </div>
            <p style={{ color: '#01696f', fontSize: '0.85rem' }}>{selectedThreat.code}</p>
            <p style={{ color: '#4b5563' }}>{selectedThreat.description}</p>

            <h4 style={{ margin: '1.5rem 0 0.75rem' }}>Рекомендации</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {selectedThreat.recommendations.map((r) => (
                <RecommendationCard key={r.id} recommendation={r} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
```

- **Оценка:** 2ч
- **Зависимости:** F3-03, F3-07

---

#### F3-13: Реализовать `RecommendationsPage`

- **Файл:** `frontend/src/pages/RecommendationsPage.tsx`
- **Что делать:** Список всех рекомендаций с фильтром по угрозе.

```tsx
import React, { useState, useEffect } from 'react';
import { getRecommendations } from '../services/recommendationsApi';
import { getThreats } from '../services/threatsApi';
import { RecommendationCard } from '../components/cards/RecommendationCard';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import type { RecommendationItem } from '../types/recommendation';
import type { ThreatItem } from '../types/threat';

export const RecommendationsPage: React.FC = () => {
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [threats, setThreats] = useState<ThreatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterThreatId, setFilterThreatId] = useState<number | undefined>();

  useEffect(() => {
    getThreats().then((res) => setThreats(res.threats)).catch(console.error);
  }, []);

  useEffect(() => {
    setLoading(true);
    getRecommendations(filterThreatId)
      .then(setRecommendations)
      .finally(() => setLoading(false));
  }, [filterThreatId]);

  return (
    <div style={{ padding: '1.5rem' }}>
      <h1 style={{ margin: '0 0 1rem', fontSize: '1.5rem', color: '#1f2937' }}>Рекомендации</h1>

      {/* Фильтр по угрозе */}
      <select
        value={filterThreatId ?? ''}
        onChange={(e) => setFilterThreatId(e.target.value ? parseInt(e.target.value) : undefined)}
        style={{
          padding: '0.5rem', border: '1px solid #d1d5db',
          borderRadius: 4, marginBottom: '1.5rem',
        }}
      >
        <option value="">Все угрозы</option>
        {threats.map((t) => (
          <option key={t.id} value={t.id}>{t.code} — {t.name}</option>
        ))}
      </select>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {recommendations.map((r) => (
            <RecommendationCard key={r.id} recommendation={r} />
          ))}
        </div>
      )}
    </div>
  );
};
```

- **Оценка:** 1ч
- **Зависимости:** F3-03, F3-07

---

#### F3-14: Реализовать `VulnerabilityPage`

- **Файл:** `frontend/src/pages/VulnerabilityPage.tsx`
- **Что делать:** Страница с историей прогнозов.

```tsx
import React, { useState, useEffect } from 'react';
import { getPredictionHistory } from '../services/predictApi';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { formatPercent, formatDate, getRiskLabel } from '../utils/formatters';
import { getRiskColor } from '../utils/riskColors';

export const VulnerabilityPage: React.FC = () => {
  const [predictions, setPredictions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPredictionHistory()
      .then((res) => setPredictions(res.predictions || []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;
  if (!predictions.length) {
    return <EmptyState title="Нет данных" description="Запустите прогноз на странице «Прогноз»" />;
  }

  return (
    <div style={{ padding: '1.5rem' }}>
      <h1 style={{ margin: '0 0 1.5rem', fontSize: '1.5rem', color: '#1f2937' }}>
        История прогнозов
      </h1>
      <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff', borderRadius: 8 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
            <th style={{ padding: '0.75rem' }}>Дата</th>
            <th style={{ padding: '0.75rem' }}>Предприятие</th>
            <th style={{ padding: '0.75rem' }}>Угроза</th>
            <th style={{ padding: '0.75rem' }}>Вероятность</th>
            <th style={{ padding: '0.75rem' }}>Горизонт</th>
            <th style={{ padding: '0.75rem' }}>Риск</th>
          </tr>
        </thead>
        <tbody>
          {predictions.map((p: any) => (
            <tr key={p.request_id} style={{ borderBottom: '1px solid #f3f4f6' }}>
              <td style={{ padding: '0.75rem' }}>
                {p.prediction_date ? formatDate(p.prediction_date) : formatDate(p.createdAt)}
              </td>
              <td style={{ padding: '0.75rem' }}>{p.enterprise_code}</td>
              <td style={{ padding: '0.75rem' }}>{p.predicted_threat}</td>
              <td style={{ padding: '0.75rem', fontWeight: 600 }}>
                {formatPercent(p.probability)}
              </td>
              <td style={{ padding: '0.75rem' }}>{p.horizon || '—'}</td>
              <td style={{ padding: '0.75rem' }}>
                <span style={{
                  padding: '0.15rem 0.5rem', borderRadius: 999,
                  backgroundColor: getRiskColor(p.probability),
                  color: '#fff', fontSize: '0.8rem', fontWeight: 600,
                }}>
                  {getRiskLabel(p.probability)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

- **Оценка:** 1ч
- **Зависимости:** F3-04

---

### Фаза 4 — Docker и интеграция (~3.1 часа)

---

#### F4-01: Полный `docker-compose.yml` (4 сервиса)

- **Файл:** `docker-compose.yml` (корень репозитория)

```yaml
version: "3.8"

services:
  # ─── PostgreSQL ───
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-rsm}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-rsm_password}
      POSTGRES_DB: ${POSTGRES_DB:-rsm_db}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-rsm}"]
      interval: 5s
      timeout: 5s
      retries: 10

  # ─── Python ML-сервис (внутренний) ───
  ml:
    build:
      context: ./ml
      dockerfile: Dockerfile
    environment:
      MODEL_DIR: /app/models
      DATA_DIR: /app/data
    expose:
      - "8000"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 10s
      timeout: 10s
      retries: 5
      start_period: 60s  # CatBoost-модели загружаются ~30-60 сек

  # ─── Node.js Backend (публичный API) ───
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "3001:3001"
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER:-rsm}:${POSTGRES_PASSWORD:-rsm_password}@postgres:5432/${POSTGRES_DB:-rsm_db}
      ML_SERVICE_URL: http://ml:8000
      PORT: "3001"
      FRONTEND_URL: http://localhost:3000
      SEED: "true"
    depends_on:
      postgres:
        condition: service_healthy
      ml:
        condition: service_healthy

  # ─── React Frontend ───
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        VITE_API_URL: http://localhost:3001
    ports:
      - "3000:80"
    depends_on:
      - backend

volumes:
  postgres_data:
```

- **Оценка:** 1ч

---

#### F4-02: Dockerfile для frontend (React + nginx)

- **Файл:** `frontend/Dockerfile`

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS build
WORKDIR /app

ARG VITE_API_URL=http://localhost:3001
ENV VITE_API_URL=${VITE_API_URL}

COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Serve
FROM nginx:1.25-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

- **Оценка:** 0.3ч

---

#### F4-03: `nginx.conf` для SPA + API proxy

- **Файл:** `frontend/nginx.conf`

```nginx
server {
    listen 80;
    server_name localhost;

    root /usr/share/nginx/html;
    index index.html;

    # API proxy → Node.js backend
    location /api/ {
        proxy_pass http://backend:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Кеширование статики
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

- **Оценка:** 0.2ч

---

#### F4-04: `.env.example` и README

- **Файл:** `.env.example`

```bash
# PostgreSQL
POSTGRES_USER=rsm
POSTGRES_PASSWORD=rsm_password
POSTGRES_DB=rsm_db

# Backend
DATABASE_URL=postgresql://rsm:rsm_password@postgres:5432/rsm_db
ML_SERVICE_URL=http://ml:8000
PORT=3001
FRONTEND_URL=http://localhost:3000
SEED=true

# Frontend (build-time)
VITE_API_URL=http://localhost:3001
```

- **Оценка:** 0.3ч

---

#### F4-05: `entrypoint.sh` для backend

- **Файл:** `backend/entrypoint.sh`

```bash
#!/bin/sh
set -e

echo "⏳ Ожидание PostgreSQL..."
until pg_isready -h postgres -U ${POSTGRES_USER:-rsm} -q; do
  sleep 1
done
echo "✅ PostgreSQL готов"

echo "🔄 Миграция базы данных..."
npx prisma migrate deploy

if [ "$SEED" = "true" ]; then
  echo "🌱 Заполнение базы данных..."
  npx prisma db seed
fi

echo "🚀 Запуск бэкенда..."
exec node dist/index.js
```

- **Оценка:** 0.5ч

---

#### F4-06: Dockerfile для backend

- **Файл:** `backend/Dockerfile`

```dockerfile
FROM node:20-alpine

# pg_isready для healthcheck и entrypoint
RUN apk add --no-cache postgresql-client

WORKDIR /app

# Зависимости (кешируются)
COPY package*.json ./
RUN npm ci

# Prisma schema + generate
COPY prisma ./prisma
RUN npx prisma generate

# Исходный код + сборка
COPY tsconfig.json ./
COPY src ./src
RUN npx tsc

# Data для seed
COPY data ./data

# Entrypoint
COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh

EXPOSE 3001

ENTRYPOINT ["./entrypoint.sh"]
```

- **Оценка:** 0.3ч

---

#### F4-07: `frontend/package.json` + `vite.config.ts`

- **Файл:** `frontend/package.json`

```json
{
  "name": "rsm-frontend",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "axios": "^1.6.5",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-markdown": "^9.0.1",
    "react-router-dom": "^6.21.3",
    "recharts": "^2.10.3"
  },
  "devDependencies": {
    "@types/react": "^18.2.48",
    "@types/react-dom": "^18.2.18",
    "@vitejs/plugin-react": "^4.2.1",
    "typescript": "^5.3.3",
    "vite": "^5.0.12"
  }
}
```

- **Файл:** `frontend/vite.config.ts`

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
```

- **Оценка:** 0.5ч

---

### Фаза 5 — Демо-готовность (~3 часа)

---

#### F5-01: Seed — 3 demo-предприятия с известными кодами

- **Файл:** `backend/prisma/seed.ts` (уже включены в F2-02)
- **Что делать:** Уже реализовано в полном `seed.ts` (F2-02):
  - `DEMO-01` — Digital-Native, 1500 хостов, Москва
  - `DEMO-02` — Industrial IoT, 800 хостов, Екатеринбург
  - `DEMO-03` — Data-Sensitive, 200 хостов, Новосибирск
- **Оценка:** 0ч (входит в F2-02)
- **Зависимости:** F2-02

---

#### F5-02: Проверить `predict_for_date()` для дат вне диапазона данных

- **Что делать:**
  - `incidents_data.csv` содержит данные примерно до 2024-01-01
  - Для будущих дат lag-признаки будут 0 — это нормально
  - Убедиться что в `prepare_features_for_prediction()` нет `KeyError` или `IndexError` при пустых `recent_data`
  - Проверить fallback-значения: пустая строка для категориальных, 0 для числовых
  - При необходимости добавить проверку `if len(recent_data) == 0: ...` с дефолтными признаками
- **Оценка:** 0.5ч
- **Зависимости:** F0-03, F0-04

---

#### F5-03: E2E тест — `docker compose up` → curl → frontend

- **Что делать:** Ручной чеклист после `docker compose up --build`:

```bash
# 1. Проверить health
curl http://localhost:3001/api/v1/health
# Ожидается: {"status":"ok","db":"ok","ml":{"status":"ok","models_24h":24,"models_7d":24,...}}

# 2. Проверить предприятия (seed)
curl http://localhost:3001/api/v1/enterprises
# Ожидается: {"enterprises":[{"enterprise_code":"DEMO-01",...},...]}, 3+ записей

# 3. Запустить прогноз
curl -X POST http://localhost:3001/api/v1/predict \
  -H "Content-Type: application/json" \
  -d '{"enterprise_code":"DEMO-01","date":"2024-06-01","horizon":"24h"}'
# Ожидается: {"request_id":"...","top_threat":{"threatname":"...","probability":0.XX,...},"all_threats":[6 записей],"report_md":"# Отчёт...","enterprise":{...}}

# 4. Проверить угрозы
curl http://localhost:3001/api/v1/threats
# Ожидается: {"threats":[6 записей],"pagination":{...}}

# 5. Проверить рекомендации
curl http://localhost:3001/api/v1/recommendations
# Ожидается: {"recommendations":[18 записей]}

# 6. Проверить аналитику
curl http://localhost:3001/api/v1/analytics
# Ожидается: {"total_predictions":1,...}

# 7. Открыть http://localhost:3000 в браузере
# → Sidebar + 5 страниц + форма прогноза работает
```

- **Оценка:** 1ч
- **Зависимости:** F4-01

---

#### F5-04: Финальный README

- **Файл:** `README.md` (корень)

```markdown
# RSM — Прогнозирование киберугроз

Система прогнозирования киберугроз на основе 48 CatBoost-моделей.
Анализирует 6 типов угроз по 4 инфраструктурным кластерам с горизонтами 24 часа и 7 дней.

## Требования

- Docker + Docker Compose

## Быстрый старт

# Скопировать конфигурацию
cp .env.example .env

# Запустить все 4 контейнера
docker compose up --build

# Открыть в браузере
http://localhost:3000

## Сервисы

| Сервис   | Порт  | Описание                    |
|----------|-------|-----------------------------|
| frontend | 3000  | React UI                    |
| backend  | 3001  | Node.js API                 |
| ml       | 8000  | Python ML (только внутренний) |
| postgres | 5432  | PostgreSQL                  |

## API

- POST /api/v1/predict — запустить прогноз
- GET /api/v1/threats — каталог угроз
- GET /api/v1/analytics — аналитика
- GET /api/v1/health — состояние системы

## Остановка

docker compose down -v
```

- **Оценка:** 0.5ч

---

#### F5-05: Проверить seed угроз

- **Что делать:** После `prisma db seed` в таблице `threats` должно быть 6 записей:
  ```sql
  SELECT id, code, name, threat_cluster FROM "Threat" ORDER BY id;
  -- TC-01: Вредоносное ПО / Malware (кластер 1)
  -- TC-02: Атаки типа DDoS (кластер 2)
  -- TC-03: Brute Force / Подбор паролей (кластер 3)
  -- TC-04: Социальная инженерия / Фишинг (кластер 4)
  -- TC-05: Эксплуатация уязвимостей (кластер 5)
  -- TC-06: Инсайдерские угрозы (кластер 6)
  ```
- В таблице `recommendations` должно быть 18 записей (3 на каждую угрозу).
- **Оценка:** 0.5ч
- **Зависимости:** F2-02

---

## 4. Конкретные фиксы кода (точные diff-блоки)

### 4.1. `backend/prisma/seed.ts` — исправить separator и колонку

```diff
- .pipe(csv({ separator: ';' }))
+ .pipe(csv({ separator: ',' }))
```

```diff
- region: row['Регион'] || 'Не указан',
+ region: row['Регион размещения предприятия'] || 'Не указан',
```

### 4.2. `backend/prisma/schema.prisma` — nullable + новые поля

```diff
  model PredictionLog {
    id               String            @id @default(uuid())
    request_id       String            @unique
    enterprise_code  String
    enterprise       EnterpriseProfile @relation(fields: [enterprise_code], references: [enterprise_code])
    probability      Float
    predicted_threat String
-   predicted_object  String
-   season            String
-   day_of_week       Int
-   hour              Int
+   predicted_object  String?
+   season            String?
+   day_of_week       Int?
+   hour              Int?
+   horizon           String?
+   report_md         String?
+   prediction_date   String?
    createdAt        DateTime          @default(now())
  }
```

Добавить новую модель:

```diff
+ model Incident {
+   id              Int      @id @default(autoincrement())
+   enterprise_code String
+   threat_cluster  Int
+   infra_cluster   Int
+   success         Boolean
+   region          String
+   incident_date   DateTime
+   host_count      Int?
+   enterprise_type String?
+ }
```

Добавить поля в `EnterpriseProfile`:

```diff
  model EnterpriseProfile {
    id              Int      @id @default(autoincrement())
    enterprise_code String   @unique
    type            String
    host_count      Int
    region          String
+   infra_cluster   Int?
+   size            String?
    predictions     PredictionLog[]
+   createdAt       DateTime @default(now())
  }
```

Добавить поле в `Threat`:

```diff
  model Threat {
    id           Int      @id @default(autoincrement())
    code         String   @unique
    name         String
    description  String?
    object       String?
    source       String?
    cia_flags    String?
+   threat_cluster Int?
    recommendations Recommendation[]
  }
```

### 4.3. `mvp/app/inference.py` — исправить 5 имён признаков

В функции `prepare_features_for_prediction()`:

```diff
- "laginc2d": ...,
+ "lag_inc_2d": ...,
```

```diff
- "regioninc_7d_sum": ...,
+ "region_inc_7d_sum": ...,
```

```diff
- "regioninc_30d_sum": ...,
+ "region_inc_30d_sum": ...,
```

```diff
- "typeinc_7d_sum": ...,
+ "type_inc_7d_sum": ...,
```

```diff
- "typeinc_30d_sum": ...,
+ "type_inc_30d_sum": ...,
```

### 4.4. `mvp/app/inference.py` — добавить категориальные признаки

В функции `prepare_features_for_prediction()`, **перед** строкой `return pd.DataFrame([features])` добавить:

```python
    # --- Категориальные признаки (были пропущены) ---
    features["Тип предприятия"] = (
        str(recent_data["Тип предприятия"].iloc[-1])
        if len(recent_data) > 0 and "Тип предприятия" in recent_data.columns
        else ""
    )
    features["Регион размещения предприятия"] = (
        str(recent_data["Регион размещения предприятия"].iloc[-1])
        if len(recent_data) > 0 and "Регион размещения предприятия" in recent_data.columns
        else ""
    )
    features["Размер инфраструктуры"] = (
        str(recent_data["Размер инфраструктуры"].iloc[-1])
        if len(recent_data) > 0 and "Размер инфраструктуры" in recent_data.columns
        else ""
    )
    features["Количество хостов"] = (
        float(recent_data["Количество хостов"].iloc[-1])
        if len(recent_data) > 0 and "Количество хостов" in recent_data.columns
        else 0.0
    )
```

### 4.5. `mvp/app/inference.py` — удалить мёртвый return

В функции `load_artifacts()`:

```diff
    # ... загрузка моделей, данных, конфигов ...
    return artifacts
-   return artifacts   # ← мёртвый код, удалить
```

### 4.6. `backend/src/predict.ts` — полный код

См. задачу F2-03 — полный переписанный файл приведён выше.

### 4.7. `ml/app.py` — полный код

См. задачу F1-04 — полный переписанный файл приведён выше.

### 4.8. `docker-compose.yml` — полная версия

См. задачу F4-01 — полная конфигурация приведена выше.

### 4.9. `backend/src/index.ts` — полный код

См. задачу F2-12 — полная версия с CORS, dotenv, всеми роутерами приведена выше.

---

## 5. TypeScript-контракты (типы для фронтенда)

Полные интерфейсы (зеркало бэкенд-ответов):

```typescript
// ─── Результат прогноза по одной угрозе ───
interface ThreatResult {
  infrastructure_cluster: string;   // "Digital-Native (Высокотехнологичные)"
  threat_cluster: number;           // 1-6
  threatname: string;               // "Вредоносное ПО / Malware"
  probability: number;              // 0.0 - 1.0
  description: string;              // из threatdescriptions.json
  recommendation: string;           // из threatdescriptions.json
}

// ─── Запрос прогноза ───
interface PredictRequest {
  enterprise_code: string;          // "DEMO-01"
  date: string;                     // "2024-06-01" (YYYY-MM-DD)
  horizon: '24h' | '7d';
}

// ─── Ответ прогноза ───
interface PredictResponse {
  request_id: string;               // UUID
  top_threat: ThreatResult;         // главная угроза (max probability)
  all_threats: ThreatResult[];      // все 6 угроз, отсортированы по убыванию
  report_md: string;                // Markdown-отчёт
  enterprise: {
    enterprise_code: string;
    type: string;
    host_count: number;
    region: string;
  };
}

// ─── Сводная аналитика ───
interface AnalyticsSummary {
  total_predictions: number;
  avg_probability: number;
  total_enterprises: number;
  top_threats: Array<{
    threat_name: string;
    count: number;
    avg_probability: number;
  }>;
  by_horizon: Array<{
    horizon: string;
    count: number;
  }>;
  recent_predictions: PredictionLogItem[];
}

// ─── Элемент истории прогнозов ───
interface PredictionLogItem {
  request_id: string;
  enterprise_code: string;
  predicted_threat: string;
  probability: number;
  horizon: string | null;
  prediction_date: string | null;
  createdAt: string;
}

// ─── Угроза из каталога ───
interface ThreatItem {
  id: number;
  code: string;                     // "TC-01"
  name: string;                     // "Вредоносное ПО / Malware"
  description: string | null;
  object: string | null;
  source: string | null;
  cia_flags: string | null;
  threat_cluster: number | null;    // 1-6
  recommendations: RecommendationItem[];
}

// ─── Рекомендация ───
interface RecommendationItem {
  id: number;
  rec_code: string;                 // "TC-01-REC-01"
  title: string;
  description: string;
  priority: number;                 // 1 = highest
  threatId: number;
  threat?: {
    code: string;
    name: string;
    threat_cluster: number | null;
  };
}

// ─── Предприятие ───
interface EnterpriseItem {
  enterprise_code: string;
  type: string;
  host_count: number;
  region: string;
  infra_cluster: number | null;
  size: string | null;
}
```

---

## 6. Итоговая структура репозитория

```
rsm-hackathon/
├── docker-compose.yml                    [новый]
├── .env.example                          [новый]
├── README.md                             [новый]
│
├── ml/                                   [из develop → новая структура]
│   ├── Dockerfile                        [новый]
│   ├── requirements.txt                  [исправить]
│   ├── app.py                            [переписать — из заглушки в реальный]
│   ├── src/
│   │   ├── __init__.py                   [новый]
│   │   ├── inference.py                  [из develop, исправить баги]
│   │   ├── reporting.py                  [из develop, без изменений]
│   │   └── loader.py                     [новый — singleton]
│   ├── models/
│   │   ├── 24h/
│   │   │   ├── model_infra1_threat1.cbm  [из develop, 24 файла]
│   │   │   └── ...
│   │   └── 7d/
│   │       ├── model_infra1_threat1.cbm  [из develop, 24 файла]
│   │       └── ...
│   └── data/
│       ├── incidents_data.csv            [из develop]
│       ├── featureconfig.json            [из develop]
│       ├── clusterinfo.json              [из develop]
│       ├── threatdescriptions.json       [из develop]
│       └── model_registry.json           [из develop]
│
├── backend/                              [из main]
│   ├── Dockerfile                        [новый]
│   ├── entrypoint.sh                     [новый]
│   ├── package.json                      [исправить]
│   ├── tsconfig.json                     [из main]
│   ├── prisma/
│   │   ├── schema.prisma                 [исправить + расширить]
│   │   ├── seed.ts                       [исправить + расширить]
│   │   └── migrations/                   [сгенерировать]
│   ├── data/
│   │   └── raw/
│   │       └── incidents_2000.csv        [из main]
│   └── src/
│       ├── index.ts                      [исправить — CORS, роутеры]
│       ├── predict.ts                    [переписать — реальная интеграция]
│       ├── analytics.ts                  [переписать — реальные агрегаты]
│       ├── threats.ts                    [новый]
│       ├── recommendations.ts            [новый]
│       ├── enterprises.ts                [новый]
│       └── types.ts                      [новый]
│
└── frontend/                             [из MIPT]
    ├── Dockerfile                        [новый]
    ├── nginx.conf                        [новый]
    ├── package.json                      [заполнить — был пустой]
    ├── vite.config.ts                    [новый]
    ├── tsconfig.json                     [из MIPT]
    ├── index.html                        [из MIPT]
    └── src/
        ├── main.tsx                      [из MIPT]
        ├── App.tsx                       [из MIPT]
        ├── app/
        │   ├── router.tsx                [из MIPT]
        │   └── providers.tsx             [заполнить]
        ├── types/
        │   ├── api.ts                    [заполнить]
        │   ├── prediction.ts             [заполнить]
        │   ├── analytics.ts              [заполнить]
        │   ├── threat.ts                 [заполнить]
        │   └── recommendation.ts         [заполнить]
        ├── utils/
        │   ├── constants.ts              [заполнить]
        │   ├── formatters.ts             [заполнить]
        │   └── riskColors.ts             [заполнить]
        ├── services/
        │   ├── api.ts                    [заполнить]
        │   ├── predictApi.ts             [заполнить]
        │   ├── analyticsApi.ts           [заполнить]
        │   ├── threatsApi.ts             [заполнить]
        │   ├── recommendationsApi.ts     [заполнить]
        │   └── scenariosApi.ts           [заглушка]
        ├── hooks/
        │   ├── usePrediction.ts          [заполнить]
        │   ├── useAnalytics.ts           [заполнить]
        │   └── useDemo.ts               [заполнить]
        ├── components/
        │   ├── common/
        │   │   ├── LoadingSpinner.tsx     [заполнить]
        │   │   ├── ErrorMessage.tsx       [заполнить]
        │   │   ├── EmptyState.tsx         [заполнить]
        │   │   └── Toast.tsx             [заполнить]
        │   ├── layout/
        │   │   ├── Header.tsx            [обновить]
        │   │   ├── Sidebar.tsx           [обновить]
        │   │   └── PageWrapper.tsx       [заполнить]
        │   ├── cards/
        │   │   ├── RiskCard.tsx           [заполнить]
        │   │   ├── KpiCard.tsx            [заполнить]
        │   │   ├── ThreatCard.tsx         [заполнить]
        │   │   └── RecommendationCard.tsx [заполнить]
        │   ├── charts/
        │   │   ├── ThreatPieChart.tsx     [заполнить — BarChart]
        │   │   ├── IncidentTimeline.tsx   [заполнить]
        │   │   ├── RegionBarChart.tsx     [заполнить]
        │   │   ├── EnterpriseTypeChart.tsx [заполнить]
        │   │   └── ShapWaterfall.tsx      [заглушка]
        │   └── forms/
        │       ├── PredictionForm.tsx     [заполнить]
        │       └── FilterPanel.tsx       [заглушка]
        └── pages/
            ├── DashboardPage.tsx          [заполнить]
            ├── PredictionPage.tsx         [заполнить — главная]
            ├── VulnerabilityPage.tsx      [заполнить]
            ├── RecommendationsPage.tsx    [заполнить]
            └── ThreatCatalogPage.tsx      [заполнить]
```

---

## 7. Чеклист готовности к демо (12 пунктов)

```bash
# ── Подготовка ──
docker compose up --build -d
# Ждём ~60 секунд пока ML-сервис загрузит 48 моделей

# ── 1. Health check ──
curl -s http://localhost:3001/api/v1/health | jq .
# ✅ status: "ok", db: "ok", ml.status: "ok", ml.total_models: 48

# ── 2. Предприятия загружены ──
curl -s http://localhost:3001/api/v1/enterprises | jq '.enterprises | length'
# ✅ >= 3 (DEMO-01, DEMO-02, DEMO-03 + из CSV)

# ── 3. Угрозы загружены ──
curl -s http://localhost:3001/api/v1/threats | jq '.threats | length'
# ✅ 6

# ── 4. Рекомендации загружены ──
curl -s http://localhost:3001/api/v1/recommendations | jq '.recommendations | length'
# ✅ 18

# ── 5. Прогноз работает (24h) ──
curl -s -X POST http://localhost:3001/api/v1/predict \
  -H "Content-Type: application/json" \
  -d '{"enterprise_code":"DEMO-01","date":"2024-06-01","horizon":"24h"}' | jq .
# ✅ top_threat.threatname не пустой, probability > 0, all_threats: 6 записей

# ── 6. Прогноз работает (7d) ──
curl -s -X POST http://localhost:3001/api/v1/predict \
  -H "Content-Type: application/json" \
  -d '{"enterprise_code":"DEMO-02","date":"2024-06-01","horizon":"7d"}' | jq .
# ✅ аналогично

# ── 7. Отчёт скачивается ──
REQUEST_ID=$(curl -s -X POST http://localhost:3001/api/v1/predict \
  -H "Content-Type: application/json" \
  -d '{"enterprise_code":"DEMO-03","date":"2024-06-01","horizon":"24h"}' | jq -r '.request_id')
curl -s "http://localhost:3001/api/v1/predict/report/$REQUEST_ID" | head -5
# ✅ начинается с "# Отчёт" (Markdown)

# ── 8. Аналитика после прогнозов ──
curl -s http://localhost:3001/api/v1/analytics | jq .
# ✅ total_predictions >= 3

# ── 9. История прогнозов ──
curl -s http://localhost:3001/api/v1/predict/history | jq '.predictions | length'
# ✅ >= 3

# ── 10. Frontend доступен ──
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
# ✅ 200

# ── 11. Frontend проксирует API ──
curl -s http://localhost:3000/api/v1/health | jq .status
# ✅ "ok" (через nginx proxy)

# ── 12. Полный E2E через UI ──
# Открыть http://localhost:3000/prediction
# → Выбрать DEMO-01 → дата 2024-06-01 → 24h → "Запустить прогноз"
# → ✅ RiskCard с угрозой + бар-чарт + отчёт + кнопка "Скачать .md"
```

---

## Итоговая таблица оценок

| Фаза | Задач | Часов |
|---|---|---|
| F0 — Критические баги | 6 | ~1.0 |
| F1 — Python ML-сервис | 7 | ~2.6 |
| F2 — Node.js Backend | 12 | ~10.7 |
| F3 — React Frontend | 14 | ~21.5 |
| F4 — Docker + интеграция | 7 | ~3.1 |
| F5 — Демо-готовность | 5 | ~2.5 |
| **Итого** | **51** | **~41.4 ч** |

### Критический путь

```
F0-03/04/05 → F1-01 → F1-02 → F1-03 → F1-04 (ML-сервис готов)
                                                    ↓
F0-01/02 → F2-01 → F2-02 → F2-03 ──────────────────┘ (Backend готов)
                                                    ↓
F3-01/02 → F3-03 → F3-04 → F3-09 → F3-10 (Frontend MVP готов)
                                                    ↓
F4-01 → F4-02/03/05/06 → F5-03 (Docker + E2E тест)
```

**Параллелизация:** F0 (все 6 задач), F3-01/02/05 (типы, утилиты, common-компоненты), F1-05/06 (requirements, Dockerfile) — могут выполняться одновременно.
