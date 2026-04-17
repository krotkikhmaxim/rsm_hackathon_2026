FROM node:20-slim

RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Зависимости (включая devDeps — нужны @types/* и ts-node-dev)
COPY package.json package-lock.json ./
RUN npm ci

# Prisma
COPY prisma/ prisma/
RUN npx prisma generate

# Исходный код
COPY src/ src/
COPY tsconfig.json .

# Данные для сида
COPY data/ data/

EXPOSE 3001

CMD ["sh", "-c", "npx prisma migrate reset --force && npx ts-node-dev --respawn --transpile-only src/index.ts"]
