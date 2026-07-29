FROM node:24

RUN npm install -g pnpm@11.17.0

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY packages/config/package.json ./packages/config/package.json
COPY packages/shared-types/package.json ./packages/shared-types/package.json

RUN pnpm install

COPY apps/api ./apps/api
COPY packages ./packages

EXPOSE 3000

CMD ["pnpm", "--filter", "@cabinetos/api", "run", "dev"]