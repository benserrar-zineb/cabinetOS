# ADR-0004 — Architecture générale : monolithe modulaire en couches

**Statut** : Accepté

## Contexte

Le RFA posait quatre questions restées sans réponse dans la proposition initiale : le sens
des dépendances entre modules, l'organisation interne d'un module, la pertinence du DDD et
de la Clean Architecture, et le mécanisme garantissant que la modularité tienne dans le
temps plutôt que de s'éroder en un bloc monolithique. Le risque n°1 identifié pour le
projet est précisément cette érosion de la modularité (Section A de Passe 1).

## Décision

Le projet adopte un monolithe modulaire — une seule application déployable, découpée en
modules à quatre couches (`domain/`, `application/`, `infrastructure/`, `presentation/`),
avec des dépendances strictement unidirectionnelles : Core Platform → Business →
Integrations. Ni microservices, ni Kubernetes.

## Justification

- L'équipe est réduite et le produit jeune : le coût de coordination et d'infrastructure
  des microservices ne se justifie pas au regard de l'Article 4 de la Constitution
  (« la complexité doit être justifiée »).
- Les dépendances vont vers l'intérieur (`presentation → application → domain`),
  `infrastructure` implémentant des interfaces définies dans `application` ou `domain`,
  jamais l'inverse — un principe de ports et adaptateurs appliqué sans en adopter les
  patterns tactiques complets du DDD (agrégats, objets-valeurs, événements de domaine),
  jugés prématurés tant que BUILD-001 ne contient aucune logique métier réelle.
- `index.ts` est l'unique point d'entrée public de chaque module — aucun module externe
  ne peut importer les internes d'un autre. C'est cette règle qui rend l'extraction d'un
  module possible plus tard : si personne ne dépend de ses internes, il peut être déplacé.
- Le contrôle n'est pas laissé à la seule discipline : `eslint-plugin-boundaries` et
  `dependency-cruiser` (TASK-003, ADR-0010) font échouer la CI sur toute violation,
  installés avant le premier code métier.

## Conséquences

- En BUILD-001, seul le Core Platform existe réellement (Identity, Organization, Access
  Control, Audit, Notifications, Settings, Storage, Shared). Les emplacements `business/`
  et `integrations/` seront créés vides le jour où un premier module Business apparaîtra,
  avec les règles de dépendance déjà actives.
- Les patterns tactiques du DDD deviendront pertinents lorsque les modules Business
  arriveront et que la logique métier deviendra réellement complexe (typiquement Dossier
  médical, Prescription) — la structure en couches retenue aujourd'hui permet de les
  introduire module par module, sans refonte.
- TASK-009 a matérialisé cette règle : les fonctions d'accès aux données Core (`*.queries.ts`)
  vivent dans `infrastructure/`, jamais directement appelées depuis `presentation/` sans
  passer par la structure du module.

## Statut

Accepté. Confirmé le 28 juillet 2026, sans réserve.
