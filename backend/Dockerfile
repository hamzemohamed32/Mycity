FROM node:22-bookworm-slim

WORKDIR /workspace

COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json

RUN npm ci

COPY backend backend

EXPOSE 4000

CMD ["npm", "run", "backend:dev"]
