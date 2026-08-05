# ADR-0008 — Paradigme d'API : REST + OpenAPI

**Statut** : Accepté

## Contexte

Le socle expose des opérations essentiellement CRUD sur les entités du Core Platform
(organisations, memberships, rôles, permissions, événements d'audit, notifications,
paramètres). Le RFA demande une API simple à sécuriser, à documenter et à auditer, avec
une documentation générée automatiquement plutôt que maintenue à la main.

## Décision

REST, avec documentation OpenAPI 3.0 générée automatiquement via Swagger NestJS,
accessible sur `/api/docs`. Conventions fixées en Section J : préfixe `/api/v1/`,
ressources au pluriel en kebab-case, enveloppe `{ data, meta }` en succès et
`{ error: {...} }` en échec, pagination par curseur, horodatages ISO 8601 en UTC.

## Justification

- Simple à sécuriser (Guards NestJS, TASK-016), à documenter (génération automatique
  depuis les DTO et contrôleurs, TASK-007) et à auditer.
- Suffisant pour des opérations essentiellement CRUD — pas de besoin d'agrégation
  complexe côté frontend identifié à ce stade.
- Génération de client et de documentation automatisable, réduisant le risque de dérive
  entre le code et sa documentation.

## Conséquences

- `/api/docs` doit refléter tous les endpoints existants, y compris les contrôleurs
  squelettes du Core (retournant 501) — vérifié par un test e2e dédié (TASK-007).
- Note factuelle : `@nestjs/swagger` génère la spécification OpenAPI en version 3.0.0, pas
  3.1 — limitation de l'outillage, sans impact sur l'usage réel de la documentation.
- Repli retenu : GraphQL, si des besoins d'agrégation complexes émergent côté frontend à
  la phase Business. Non anticipé en BUILD-001.

## Statut

Accepté. Confirmé le 28 juillet 2026, sans réserve.
