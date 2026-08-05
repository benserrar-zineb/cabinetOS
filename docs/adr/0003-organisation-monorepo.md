# ADR-0003 — Organisation en monorepo (pnpm workspaces)

**Statut** : Accepté

## Contexte

Le projet comporte un backend NestJS et un frontend Next.js, tous deux en TypeScript, avec
un besoin de partager des types (notamment ceux inférés depuis les schémas Drizzle) et de
maintenir une seule CI cohérente pour l'ensemble du socle. L'équipe est réduite.

## Décision

Le dépôt est organisé en monorepo, avec pnpm workspaces comme gestionnaire de paquets et
d'espaces de travail.

## Justification

- Le partage de types entre `apps/api` et `apps/web` est direct via `packages/shared-types`,
  sans publication de paquet intermédiaire ni synchronisation manuelle de versions.
- Les changements transverses (par exemple une évolution de schéma affectant à la fois le
  backend et les types partagés) sont réalisés en un seul commit, dans un seul dépôt.
- Une seule pipeline CI (TASK-018) couvre l'ensemble du socle : lint, tests, build,
  contrôle des frontières — sans duplication de configuration entre plusieurs dépôts.
- pnpm workspaces offre une installation de dépendances efficace (déduplication via le
  store `.pnpm`) et un mécanisme de filtrage (`pnpm --filter`) directement exploité tout au
  long de BUILD-001 pour cibler `apps/api` ou `apps/web` indépendamment.

## Conséquences

- L'arborescence du dépôt suit strictement la Section O du RFA : `apps/`, `packages/`,
  `infra/`, `db/`, `docs/`, `tests/`, `scripts/` — posée dès TASK-001, avant tout code
  métier.
- Toute nouvelle application ou tout nouveau paquet partagé s'ajoute comme un workspace
  supplémentaire, sans réorganisation du dépôt existant.
- Repli retenu : passage à un modèle multi-dépôts, si l'équipe grandit fortement et se
  scinde par périmètres indépendants. Aucune bascule n'est anticipée à court terme.

## Statut

Accepté. Confirmé le 28 juillet 2026, sans réserve.
