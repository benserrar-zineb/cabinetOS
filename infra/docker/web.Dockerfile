# syntax=docker/dockerfile:1
FROM node:24

RUN npm install -g pnpm@11.17.0

WORKDIR /app

COPY .npmrc ./
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY packages/config/package.json ./packages/config/package.json
COPY packages/shared-types/package.json ./packages/shared-types/package.json

RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    --mount=type=cache,target=/root/.cache/pnpm \
    pnpm install

COPY apps/web ./apps/web
COPY packages ./packages

EXPOSE 3001

CMD ["pnpm", "--filter", "@cabinetos/web", "exec", "next", "dev", "-p", "3001", "-H", "0.0.0.0", "--webpack"]