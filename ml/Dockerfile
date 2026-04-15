FROM python:3.11-slim

WORKDIR /app

# Системные зависимости
RUN apt-get update && apt-get install -y --no-install-recommends gcc && rm -rf /var/lib/apt/lists/*

# Зависимости Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Исходный код
COPY app.py .
COPY src/ src/

# Данные и модели (копируются отдельно для лучшего кэширования)
COPY data/ data/
COPY models/ models/

EXPOSE 8000

# Один воркер — 48 моделей занимают много памяти
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
