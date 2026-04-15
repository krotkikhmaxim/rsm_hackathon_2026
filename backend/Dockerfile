FROM node:20-slim

WORKDIR /app

# Зависимости
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Prisma
COPY prisma/ prisma/
RUN npx prisma generate

# Исходный код
COPY src/ src/
COPY tsconfig.json .

# Данные для сида
COPY data/ data/

EXPOSE 3001

# Запуск через ts-node-dev (для хакатона; для прода — собрать в JS)
CMD ["npx", "ts-node-dev", "--respawn", "src/index.ts"]
