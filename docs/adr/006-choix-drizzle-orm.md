# ADR-006 - Choix de Drizzle ORM (plutot que Prisma)

**Statut** : Accepte
**Date** : Passe 2 (decision initiale) - confirme et enrichi apres le spike TASK-008B

## Contexte

Le projet a besoin d un ORM type-safe pour PostgreSQL, capable de cohabiter proprement
avec deux mecanismes critiques pour l isolation multi-tenant :

1. Un scoping applicatif par transaction (SET LOCAL app.organization_id), positionne
   avant chaque requete sur une table Core.
2. Des politiques Row-Level Security (RLS) PostgreSQL natives, comme deuxieme couche de
   protection independante de la couche applicative.

Deux candidats ont ete evalues : Prisma et Drizzle.

## Decision

Drizzle ORM est retenu, pour trois raisons principales :

1. Controle direct du cycle de transaction. Drizzle expose db.transaction() avec un
   acces direct a la connexion sous-jacente, permettant d executer SET LOCAL (via
   set_config, parametre) avant toute requete metier, dans la meme transaction. Prisma,
   a la date de la decision, ne garantissait pas ce niveau de controle sans contournement
   fragile (middleware + $transaction avec des limitations connues sur l execution de
   SQL brut dans le meme contexte transactionnel).
2. Legerete et requetes SQL lisibles. Le query builder de Drizzle genere du SQL proche
   du SQL reellement execute, ce qui facilite l audit de securite - un point important
   pour un projet ou l isolation des donnees est la contrainte n1.
3. Migrations en SQL brut versionnable. drizzle-kit generate produit des fichiers
   .sql lisibles et modifiables a la main, y compris via drizzle-kit generate --custom
   pour des migrations qui ne derivent pas du schema (exactement le cas des politiques
   RLS, que Drizzle ne sait pas exprimer dans son DSL de schema).

## Limitation actee des la decision initiale

Drizzle ne fournit aucune primitive pour definir des politiques RLS dans son schema
TypeScript (schema.ts). Les politiques (CREATE POLICY, ENABLE ROW LEVEL SECURITY,
FORCE ROW LEVEL SECURITY) sont donc ecrites en SQL brut, dans des migrations
personnalisees (drizzle-kit generate --custom), separees des migrations de schema
generees automatiquement. C est un ecart mineur face a Prisma qui, a date, ne gere pas
nativement RLS non plus - aucun des deux candidats n eliminait ce besoin de SQL manuel.

## Decouverte du spike TASK-008B - le contournement RLS par le role superutilisateur

Le spike mene avant TASK-009/010 a revele un point critique, independant du choix
Drizzle/Prisma mais determinant pour la suite du Build :

PostgreSQL fait toujours contourner RLS aux roles superutilisateurs, sans exception,
meme avec FORCE ROW LEVEL SECURITY. La configuration initiale du projet faisait
tourner l application avec le role postgres (superutilisateur, utilise pour Docker
Compose et les migrations). Teste tel quel, RLS ne filtrait strictement rien - chaque
organisation voyait les donnees de toutes les autres, sans erreur, sans avertissement.

Correction appliquee : creation d un role applicatif dedie cabinetos_app, explicitement
NOSUPERUSER NOBYPASSRLS, avec uniquement les droits SELECT, INSERT, UPDATE, DELETE
necessaires. DATABASE_URL (utilise par l application) pointe desormais vers ce role ;
postgres reste reserve a l administration, aux migrations et aux sauvegardes
(scripts/backup-restore.sh, TASK-012).

Piege demontre concretement (voir docs/adr/spike-drizzle-rls.md pour le detail) :
un pg_dump lance avec le role applicatif standard produit une sauvegarde qui se termine
sans erreur mais ne contient aucune ligne des tables protegees par RLS - un risque
operationnel silencieux, independant de l ORM utilise, mais decouvert grace au travail de
validation entrepris pour cet ADR.

## Modele de politique retenu

CREATE POLICY <nom>_isolation ON <table>
USING (organization_id = nullif(current_setting('app.organization_id', true), '')::uuid);

Le nullif(..., '') est necessaire : sans lui, une requete executee sans contexte positionne
leve une erreur de cast PostgreSQL (invalid input syntax for type uuid: "") au lieu de
retourner un ensemble vide - l operateur AND ne garantissant pas l ordre d evaluation en
SQL, une ecriture naive avec un simple ::uuid direct echoue de facon inattendue.

## Consequences

- Toute nouvelle table scopee par organisation doit recevoir sa politique RLS dans une
  migration personnalisee dediee - ce n est pas automatique et ne peut pas l etre avec
  Drizzle. Un oubli est possible et s est deja produit une fois (file_objects,
  repere lors de la revue du jalon EA-003, corrige en migration 0002). La suite de
  tests d isolation (TASK-011, tests/isolation/ et apps/api/test/isolation/rls-policies.spec.ts)
  balaie desormais explicitement chaque table scopee pour qu un oubli futur soit detecte
  automatiquement plutot que decouvert en revue.
- Toute connexion applicative doit systematiquement utiliser un role non-superutilisateur.
  Ce point est documente ici et dans docs/adr/spike-drizzle-rls.md, et verifie par un
  test dedie (tests/isolation/rls-bypass-attempts.spec.ts et
  apps/api/test/isolation/rls-policies.spec.ts).
- Les sauvegardes/restaurations doivent explicitement utiliser un compte superutilisateur
  distinct (ADMIN_DATABASE_URL), jamais le role applicatif - documente dans
  scripts/backup-restore.sh et teste automatiquement (TASK-012).

## Alternatives non retenues

- Prisma : ecarte pour le controle transactionnel plus rigide vis-a-vis de SET LOCAL,
  et l absence de gain sur la gestion de RLS (meme limitation que Drizzle sur ce point
  precis, sans compenser par un meilleur controle transactionnel).
- SQL brut sans ORM : ecarte des Passe 1 pour la perte de securite de typage et la
  charge de maintenance des requetes, jugee disproportionnee face au gain de controle
  deja obtenu avec Drizzle.
