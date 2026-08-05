# BUILD-001 — Build Success Report

**Projet** : CabinetOS — Core Platform Foundation
**Statut** : Clos
**Date de clôture** : 4 août 2026

Ce rapport suit le format du chapitre 13 de l'Onboarding et répond explicitement à ses
six questions (Section 0). Il permet à un tiers de comprendre l'état exact du socle sans
relire l'intégralité du code. Cette version reflète l'état **réellement clos** du Build :
test multi-organisation intégré, dette technique reclassée, six questions traitées.

---

## 0. Les six questions du chapitre 13

### (1) Qu'avons-nous construit ?

Le socle CabinetOS : monorepo pnpm, backend NestJS 11 et frontend Next.js 16 squelettes,
isolation multi-tenant à deux couches indépendantes (scoping applicatif + Row-Level
Security PostgreSQL), authentification Better-Auth isolée derrière une interface,
CI/CD complet, onze décisions d'architecture versionnées. Détail par EA en Section 1.

### (2) Quelles décisions avons-nous prises ?

Onze ADR définitifs (`docs/adr/0001-...md` à `0011-...md`), dont une révision explicite
(ADR-0006, accès aux données) qui documente pourquoi une dérive antérieure vers du SQL
brut généralisé a été rouverte et corrigée sans repasser en douce devant le Decision
Gate. Chaque ADR suit Contexte/Décision/Justification/Conséquences/Statut.

### (3) Quels problèmes avons-nous rencontrés ?

Six écarts identifiés et corrigés en cours de Build (détail en Section 3), dont le plus
significatif : **les rôles superutilisateurs PostgreSQL contournent toujours Row-Level
Security, sans exception** — découvert par le spike TASK-008B, alors que la
configuration initiale connectait l'application avec le rôle `postgres`. Corrigé par la
création d'un rôle applicatif dédié (`cabinetos_app`, `NOSUPERUSER NOBYPASSRLS`) avant
toute donnée réelle.

### (4) Quels compromis avons-nous acceptés ?

- Drizzle plutôt que Prisma : friction RLS plus faible, au prix de politiques RLS
  écrites en SQL brut dans des migrations dédiées (aucune représentation dans le schéma
  Drizzle) — voir ADR-0006.
- Better-Auth plutôt qu'une solution éprouvée type Keycloak dès le départ : librairie
  plus jeune, compensée par une interface d'abstraction (`AuthProvider`) rendant le repli
  Keycloak praticable à coût raisonnable — voir ADR-0007.
- `audit_events` append-only garanti au niveau code seulement pendant BUILD-001 : compromis
  accepté temporairement, désormais requalifié en dette prioritaire (Section 4) plutôt que
  laissé comme un simple constat.

### (5) Quels risques restent ouverts ?

Registre complet en Section 5. Le risque le plus significatif restant ouvert à la
clôture : `audit_events` ne porte aucune garantie d'immutabilité au niveau base — une
trace d'audit reste modifiable par une requête directe tant que le `REVOKE UPDATE,
DELETE` recommandé n'est pas appliqué. Tracé en issue prioritaire (Section 6).

### (6) Que préparer pour le Build suivant ?

BUILD-001 est un socle Core Platform, sans aucun module Business. Avant la première
écriture métier du Build suivant :

- Appliquer le `REVOKE UPDATE, DELETE` sur `audit_events` — **en toute première tâche**,
  avant tout code métier (issue prioritaire, Section 6).
- Surveiller la réexportation des schémas Drizzle via `index.ts` dès qu'un premier module
  Business lit une table du Core directement (dette non prioritaire, mais à ne pas
  oublier au moment où elle deviendrait dangereuse).
- Le Core Platform expose désormais un contexte d'organisation vérifié
  (`x-organization-id` + `hasPermission` joignant appartenance et permission
  simultanément) et une identité authentifiée (`AuthProvider`) — les modules Business
  peuvent s'appuyer sur ces deux briques sans les redéfinir.
- Les emplacements `business/` et `integrations/` sont prêts dans l'arborescence, avec
  les règles de dépendance déjà actives (Core → Business → Integrations, jamais l'inverse).

---

## 1. Périmètre livré

### EA-001 — Repository & outillage

Monorepo pnpm workspaces conforme à la Section O du RFA. ESLint, Prettier, TypeScript
strict partagés. Contrôles de frontières de modules actifs avant tout code métier.

### EA-002 — Socle backend modulaire & squelette frontend

Application NestJS 11 démarrable, huit modules Core Platform structurés en quatre
couches. Documentation OpenAPI accessible sur `/api/docs`. Application Next.js 16
démarrable, internationalisation fr/ar avec inversion RTL fonctionnelle.

### EA-003 — Multi-tenant & isolation

Double couche d'isolation (scoping applicatif + RLS). Fonctions d'accès Drizzle
type-safe pour les huit entités du Core. Suite de tests d'isolation dédiée, bloquante en
CI. Sauvegarde/restauration testée automatiquement avec RLS actif.

### EA-004 — Authentification & sessions

Intégration Better-Auth (email/mot de passe), isolée derrière `AuthProvider`.
Renouvellement automatique de session (natif Better-Auth) et révocation explicite
vérifiés. Guards d'autorisation Role/Permission, fail-closed par défaut, y compris le
scénario multi-organisation (un utilisateur ne peut jamais accéder à une organisation
dont il n'est pas membre, même en falsifiant l'en-tête de contexte).

### EA-005 — CI/CD & environnements

Docker Compose démarrant en une commande. Pipeline GitHub Actions bloquant sur toute
pull request non conforme. Validation stricte des variables d'environnement.

### EA-006 — Documentation & qualité

Onze ADR définitifs, ce rapport.

---

## 2. État des tests

### Suite standard (`apps/api/test`)

| Métrique | Valeur        |
| -------- | ------------- |
| Suites   | 17            |
| Tests    | 61            |
| Statut   | Tous passants |

Inclut le test ajouté en clôture : un utilisateur membre de l'organisation A (avec la
permission requise) envoie un en-tête `x-organization-id` falsifié vers l'organisation
B, dont il n'est membre nulle part — doit recevoir 403. `hasPermission` joint
`memberships` sur `user_id` **et** `organization_id` simultanément ; l'appartenance est
vérifiée en même temps que la permission, jamais l'une sans l'autre.

### Suite d'isolation dédiée (`tests/isolation`)

| Métrique                     | Valeur                                                       |
| ---------------------------- | ------------------------------------------------------------ |
| Suites                       | 4                                                            |
| Tests                        | 11                                                           |
| Couverture (code de scoping) | 100% statements, 97.22% branches, 100% functions, 100% lines |
| Seuil exigé                  | ≥90% — atteint sur les quatre métriques                      |
| Statut                       | Tous passants, bloquants en CI                               |

### Couverture — code d'authentification et d'autorisation (EA-004)

| Fichier                           | % Stmts | % Branch | % Funcs | % Lines |
| --------------------------------- | ------- | -------- | ------- | ------- |
| `permissions.guard.ts`            | 100     | 88.23    | 100     | 100     |
| `permission-check.queries.ts`     | 100     | 100      | 100     | 100     |
| `better-auth-provider.adapter.ts` | 100     | 100      | 100     | 100     |

Le taux de 88.23% sur `permissions.guard.ts` correspond à une seule branche : le code
d'aide généré automatiquement par TypeScript pour les décorateurs de paramètres
(`@Inject`) dans le constructeur — un artefact de compilation déjà identifié et
documenté pendant EA-003 (même nature que celui rencontré sur `database.service.ts`),
pas un chemin de logique métier non testé. Les six scénarios de contrôle d'accès
(public, fail-closed, session absente, permission manquante, permission présente,
organisation étrangère) sont tous couverts par au moins un test.

### Pipeline CI

Toutes les étapes vertes sur le dernier push sur `main`, test multi-organisation inclus.

---

## 3. Écarts et corrections notables

- **Rôles superutilisateurs PostgreSQL contournent toujours RLS** : découvert par le
  spike TASK-008B. Corrigé par la création du rôle applicatif dédié `cabinetos_app`
  avant toute donnée réelle.
- **Politique RLS manquante sur `file_objects`** : repérée en revue du jalon EA-003,
  corrigée en migration `0002`, désormais balayée automatiquement par la suite
  d'isolation.
- **`.env.local.example` utilisait le rôle superutilisateur** au lieu du rôle
  applicatif — corrigé.
- **CI n'appliquait pas systématiquement les nouvelles migrations** — corrigé.
- **Décalage de version `pg_dump`/serveur PostgreSQL en CI** (runners GitHub Actions en
  v16, serveur du projet en v18) — corrigé par l'installation explicite des outils
  clients PostgreSQL 18.
- **Ordre d'import Node.js critique** (`main.ts`) et **Jest ne transformait pas les
  paquets ESM purs** de Better-Auth — les deux corrigés et documentés dans le code
  source.
- **Test manquant sur le scénario multi-organisation** : signalé en revue de clôture
  d'EA-004, ajouté avant la fermeture du Build (Section 2).

---

## 4. Dette technique identifiée

Classée par priorité — `audit_events` en tête, comme requis avant toute écriture
métier du Build suivant.

| Priorité  | Point                                               | Nature                                                                                                                                                          | Recommandation                                                                                                                                      |
| --------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Haute** | `audit_events` append-only au niveau code seulement | Aucune contrainte base n'empêche un `UPDATE`/`DELETE` direct — la valeur probante de l'audit est douteuse rétroactivement tant que ce n'est pas garanti en base | **À traiter avant toute écriture métier du Build suivant** — `REVOKE UPDATE, DELETE` sur le rôle applicatif + test dédié (issue ouverte, Section 6) |
| Normale   | Schémas Drizzle réexportés via `index.ts`           | Permet à un module de lire la table d'un autre en direct, hors des fonctions scopées                                                                            | À surveiller à l'arrivée des modules Business (issue ouverte)                                                                                       |
| Normale   | MFA                                                 | Point d'extension préparé, non implémenté                                                                                                                       | À activer au moment opportun (issue ouverte)                                                                                                        |
| Normale   | Adaptateur Keycloak                                 | Interface prête, aucune implémentation concrète                                                                                                                 | À construire si le repli devient nécessaire (issue ouverte)                                                                                         |
| Normale   | Migration NestJS v12                                | Annoncée pour début T3 2026                                                                                                                                     | À planifier explicitement (issue ouverte)                                                                                                           |
| —         | Module Storage                                      | Structure minimale, hors périmètre                                                                                                                              | Build dédié futur, pas une dette                                                                                                                    |
| —         | Traduction arabe complète                           | Structure technique seule                                                                                                                                       | Avec les modules Business, pas une dette                                                                                                            |

---

## 5. Registre des risques — état de clôture

| Risque                                      | État à la clôture                                                                              |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Fuite de données entre organisations        | Double couche active, ≥90% atteints, `file_objects` corrigé, scénario multi-organisation testé |
| Contournement RLS par rôle superutilisateur | Découvert, corrigé (`cabinetos_app`), vérifié par test dédié                                   |
| Trace d'audit modifiable en base            | **Ouvert** — garantie code seulement, `REVOKE` non encore appliqué, issue prioritaire ouverte  |
| Friction Drizzle / RLS en pratique          | Vérifiée dès TASK-008B, aucune bascule vers SQL brut nécessaire                                |
| Better-Auth insuffisant à terme             | Interface d'abstraction en place, repli Keycloak praticable                                    |
| Érosion de la modularité                    | Contrôles automatiques actifs et étendus                                                       |
| Sauvegarde incomplète (RLS)                 | Test de restauration automatisé et passant                                                     |

---

## 6. Traçabilité de la dette — issues GitHub

Cinq issues ouvertes sur le dépôt, label `dette-technique` :

| Titre                                                                           | Label priorité   |
| ------------------------------------------------------------------------------- | ---------------- |
| `audit_events: enforce append-only at DB level (REVOKE UPDATE, DELETE)`         | `priorité-haute` |
| `Réexport des schémas Drizzle via index.ts — à surveiller aux modules Business` | —                |
| `MFA — activer le point d'extension Better-Auth`                                | —                |
| `Adaptateur Keycloak — implémentation concrète du repli`                        | —                |
| `Migration NestJS v12`                                                          | —                |

---

## 7. Ce qui reste hors périmètre de BUILD-001

Aucune donnée médicale réelle, aucune API externe, MFA non implémentée, SSO non
implémenté, Keycloak non actif, modules Business et Integrations vides (emplacements et
règles de dépendance prêts), stratégie de montée en charge non étudiée, fournisseur de
stockage objet non choisi.

---

## 8. Conclusion

Le socle CabinetOS est fonctionnel, testé, et documenté. L'isolation multi-tenant est
démontrée à deux couches indépendantes, avec deux découvertes opérationnelles majeures
(contournement RLS par superutilisateur, scénario multi-organisation) identifiées et
verrouillées par des tests avant toute donnée réelle. L'authentification est isolée
derrière une interface. La dette connue est priorisée et tracée en issues, pas laissée
à la découverte. Le projet est prêt à recevoir les premiers modules Business.
