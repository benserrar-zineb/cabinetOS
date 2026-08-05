# ADR-0005 — Stratégie multi-tenant : base partagée, RLS et scoping applicatif

**Statut** : Accepté

## Contexte

L'isolation entre organisations est le risque critique du socle (Section A de Passe 1) :
une erreur ici signifie qu'une organisation voit les données d'une autre — inacceptable
pour une plateforme appelée à traiter des données de santé. La proposition initiale
reposait sur le seul RLS PostgreSQL ; le chapitre 12 de l'Onboarding impose la défense en
profondeur : si une protection échoue, les autres continuent de protéger le système.

## Décision

Base PostgreSQL partagée, avec une colonne `organizationId` non nullable et indexée sur
chaque table portant des données scopées, protégée par **deux couches indépendantes** :

1. **Scoping applicatif** : `DatabaseService.withOrganizationScope()` positionne
   `SET LOCAL app.organization_id` (via `set_config`, paramétré — jamais concaténé) dans
   une transaction dédiée, avant toute requête sur une table Core.
2. **Row-Level Security PostgreSQL** : des politiques `CREATE POLICY` sur chaque table
   scopée, vérifiant `organization_id = nullif(current_setting('app.organization_id', true), '')::uuid`.

## Justification

- Une seule base à administrer, sauvegarder et migrer ; coût d'infrastructure faible,
  adapté à une équipe réduite.
- Les deux couches sont **indépendantes** : le contournement de l'une ne suffit pas à
  franchir l'autre. Le spike TASK-008B (voir `docs/adr/spike-drizzle-rls.md`) a validé ce
  principe concrètement, y compris sa limite la plus critique : **les rôles
  superutilisateurs PostgreSQL contournent toujours RLS, sans exception** — ce qui a
  conduit à la création d'un rôle applicatif dédié (`cabinetos_app`, `NOSUPERUSER
NOBYPASSRLS`), documenté et appliqué à toute connexion applicative.
- Alternatives écartées : schéma par organisation (migrations multipliées par le nombre
  d'organisations, difficile à tenir) ; base par organisation (coût opérationnel
  disqualifiant pour une équipe réduite).

## Conséquences

- Toute nouvelle table portant des données scopées par organisation doit recevoir sa
  politique RLS explicitement — ce n'est pas automatique et ne peut pas l'être avec
  Drizzle (voir ADR-0006). Un oubli s'est déjà produit une fois en pratique
  (`file_objects`, repéré en revue du jalon EA-003, corrigé en migration `0002`) : la
  suite de tests d'isolation (TASK-011) balaie désormais explicitement chaque table
  scopée pour qu'un oubli futur soit détecté automatiquement.
- Tests d'isolation obligatoires et bloquants en CI (TASK-011), couvrant lecture,
  écriture, suppression, contexte manquant et tentatives de contournement RLS —
  couverture ≥90% exigée et atteinte sur le code de scoping.
- Les sauvegardes doivent utiliser un compte superutilisateur distinct du rôle applicatif
  (`ADMIN_DATABASE_URL`), documenté dans `scripts/backup-restore.sh` et testé
  automatiquement (TASK-012) : un `pg_dump` lancé avec le rôle applicatif produirait une
  sauvegarde silencieusement incomplète.
- Repli retenu : schéma par organisation, si un client impose une isolation physique pour
  raisons réglementaires. Non anticipé à ce stade.

## Statut

Accepté. Confirmé le 28 juillet 2026. Mis en œuvre intégralement en EA-003
(TASK-008 à TASK-012), avec correction post-revue sur `file_objects`.
