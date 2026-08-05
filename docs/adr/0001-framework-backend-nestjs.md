# ADR-0001 — Framework backend : NestJS 11

**Statut** : Accepté

## Contexte

BUILD-001 pose le socle d'une plateforme destinée à porter, à terme, des données de santé.
Le RFA impose un monolithe modulaire avec des frontières de modules vérifiées
automatiquement (chapitre 8 de l'Onboarding), une équipe réduite produisant une large
part du code avec Claude, et un besoin de modularité qui protège la testabilité et la
réversibilité sans complexité excessive (Article 4 de la Constitution).

Deux alternatives ont été comparées sur les critères décisifs : adéquation au monolithe
modulaire, productivité pour une petite équipe, facilité de génération et de revue de code
avec Claude, maturité et pérennité, recrutement, sécurité — ASP.NET Core et Spring Boot.

## Décision

NestJS 11.1.x est retenu comme framework backend.

## Justification

- La modularité et l'injection de dépendances sont imposées par le framework lui-même,
  pas seulement recommandées — ce qui aligne directement le code sur l'architecture par
  domaines exigée par l'Onboarding, sans dépendre de la seule discipline des contributeurs.
- TypeScript est partagé avec le frontend (Next.js), réduisant la charge cognitive et
  permettant le partage de types via le monorepo.
- Les patterns NestJS (modules, providers, decorators) sont très standardisés, ce qui
  facilite une génération de code fiable et une revue rapide avec Claude — un critère
  explicitement décisif pour ce projet.
- ASP.NET Core (C#) est robuste mais introduit un second langage à maintenir, mal aligné
  avec une équipe réduite en développement assisté. Spring Boot (Java) est mature mais
  verbeux et lourd à démarrer pour ce contexte.

## Conséquences

- Toute évolution du socle doit respecter la structure en couches imposée par NestJS
  (modules, controllers, providers) et la Section C.3 du RFA (domain/application/
  infrastructure/presentation).
- NestJS v12 est annoncée pour début T3 2026, avec des changements d'outillage
  substantiels (ESM, Vitest en remplacement de Jest, Rspack en remplacement de Webpack).
  Cette migration est à planifier explicitement après BUILD-001, jamais à subir : on ne
  bâtit pas des fondations sur une préversion.
- Repli retenu : ASP.NET Core, si l'équipe recrutée s'avère dominée par une expertise C#.
  Aucune bascule n'est anticipée à ce stade.

## Statut

Accepté. Confirmé le 28 juillet 2026, avec vérification factuelle directe de la version
NestJS 11.1.x.
