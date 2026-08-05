# CabinetOS

Socle applicatif de CabinetOS — monolithe modulaire, isolation multi-tenant à deux
couches, authentification isolée derrière une interface. Ce dépôt correspond à
**BUILD-001 — Core Platform Foundation**. Voir `docs/builds/BUILD-001-report.md` pour
l'état exact du socle, et `docs/adr/` pour les décisions d'architecture.

## Stack

| Élément                | Choix                                              |
| ---------------------- | -------------------------------------------------- |
| Backend                | NestJS 11.1.x                                      |
| Frontend               | Next.js 16.2.x (App Router)                        |
| Base de données        | PostgreSQL 18.x                                    |
| Accès aux données      | Drizzle ORM                                        |
| Authentification       | Better-Auth 1.6.x                                  |
| Isolation multi-tenant | Scoping applicatif + Row-Level Security PostgreSQL |
| Dépôt                  | Monorepo pnpm workspaces                           |

## Prérequis

- Node.js 24.x
- pnpm 11.17.0
- Docker Desktop (avec Docker Compose)

## Démarrage local

```bash
git clone <url-du-depot>
cd cabinetos
pnpm install
```

Démarrer PostgreSQL, l'API et le frontend :

```bash
cd infra/docker
docker compose up --build
```

- API : http://localhost:3000/api/v1/health
- Documentation OpenAPI : http://localhost:3000/api/docs
- Frontend : http://localhost:3001

## Variables d'environnement

Copier le fichier d'exemple correspondant au contexte et ajuster les valeurs :

```bash
cp apps/api/.env.local.example apps/api/.env.local
```

Voir aussi `.env.test.example` et `.env.recette.example`. L'application refuse de
démarrer si une variable critique est absente (validation stricte au démarrage).

**Important** : `DATABASE_URL` doit toujours utiliser le rôle applicatif dédié
(`cabinetos_app`), jamais `postgres` (superutilisateur) — voir
`docs/adr/spike-drizzle-rls.md` pour la raison exacte. `ADMIN_DATABASE_URL` (superutilisateur)
est réservé aux migrations et aux sauvegardes.

## Tests

```bash
# Suite standard
pnpm --filter @cabinetos/api run test

# Suite d'isolation multi-tenant (bloquante, couverture >= 90% exigée)
pnpm run test:isolation

# Lint, format, frontières d'architecture
pnpm lint
pnpm run format:check
pnpm run check:architecture
```

## Arborescence

```
apps/
  api/          # NestJS — backend
  web/          # Next.js — frontend
packages/
  shared-types/ # Types partagés
  config/       # Configuration commune (ESLint, Prettier, TypeScript)
infra/
  docker/       # Dockerfiles, docker-compose.yml
db/
  migrations/   # Migrations drizzle-kit versionnées
docs/
  adr/          # Architecture Decision Records
  builds/       # Rapports de fin de Build
tests/
  isolation/    # Suite de tests d'isolation multi-tenant (racine, TASK-011)
scripts/
  backup-restore.sh
```

## Documentation complémentaire

- `docs/adr/` — les onze décisions d'architecture qui encadrent ce socle
- `docs/adr/spike-drizzle-rls.md` — validation technique Drizzle + Row-Level Security
- `docs/builds/BUILD-001-report.md` — état complet du socle à la clôture de ce Build
