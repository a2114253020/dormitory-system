FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm i --no-audit --no-fund
COPY prisma ./prisma
COPY src ./src
COPY tsconfig.json ./
RUN npx prisma generate
# Run migrations + seed on container start (safe for MVP)
EXPOSE 3000
CMD sh -c "npx prisma migrate deploy && node --loader ts-node/esm src/seed.ts && node --loader ts-node/esm src/index.ts"
