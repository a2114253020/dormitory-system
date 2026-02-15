FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm i --no-audit --no-fund

COPY prisma ./prisma
COPY src ./src
COPY tsconfig.json ./

RUN npx prisma generate
RUN npm run build

# MVP note: use `prisma db push` (no migration files needed) to keep first run simple.
EXPOSE 3000
CMD sh -c "npx prisma db push && node dist/seed.js && node dist/index.js"
