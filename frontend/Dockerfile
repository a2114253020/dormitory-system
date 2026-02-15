FROM node:22-alpine
WORKDIR /app
ARG VITE_API_BASE
ENV VITE_API_BASE=$VITE_API_BASE
COPY package.json package-lock.json* ./
RUN npm i --no-audit --no-fund
COPY index.html vite.config.ts tsconfig.json ./
COPY src ./src
EXPOSE 5173
CMD ["npm","run","dev"]
