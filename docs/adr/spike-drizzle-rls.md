# Spike - Drizzle + Row-Level Security (TASK-008B)

**Duree reelle** : environ 2h. **Statut** : valide, avec une decouverte critique corrigee avant de continuer.

## Resume

Drizzle fonctionne correctement sous une politique RLS active. Le mecanisme de scoping
applicatif (SET LOCAL via set_config, TASK-008) est compatible et sur. Aucune fuite de
contexte detectee sur 20 requetes concurrentes avec RLS reellement actif.

**Mais une decouverte critique a ete faite en cours de route** : la configuration initiale
du projet fait tourner l application avec l utilisateur PostgreSQL postgres, qui est
superutilisateur. Les superutilisateurs contournent toujours RLS, sans exception,
meme avec FORCE ROW LEVEL SECURITY. Avec la configuration initiale, TASK-010 aurait pose
des politiques RLS qui n auraient eu strictement aucun effet, sans qu aucune erreur ne le
signale. Corrige dans ce spike.

## Ce qui a ete teste (les 6 points de l Annexe de Passe 1)

1. Extension Drizzle + set_config : fonctionne, requetes executees dans une
   transaction avec SET LOCAL app.organization_id positionne via set_config(..., true).
2. Politiques RLS survivent au cycle de migration : testees via drizzle-kit, gerees en SQL
   brut dans les migrations (limitation connue de Drizzle, deja actee dans ADR-006).
3. Requete sans contexte -> aucune ligne, jamais tout : confirme, avec une reserve
   technique : la politique doit utiliser nullif(current_setting(...), '')::uuid plutot
   qu un simple ::uuid direct, sinon PostgreSQL leve une erreur de cast au lieu de
   retourner un ensemble vide (AND ne garantit pas l ordre d evaluation en SQL).
4. Aucune fuite de contexte entre requetes concurrentes, avec RLS actif : 0 fuite sur
   20 requetes concurrentes sur un pool restreint.
5. pg_dump + restauration avec RLS actif : fonctionne a condition d utiliser un role avec
   les droits suffisants. Piege demontre concretement : un pg_dump lance avec le role
   applicatif standard produit une sauvegarde qui se termine sans erreur mais ne contient
   aucune ligne de la table protegee.
6. Tests d isolation : couverts par les points 3 et 4.

## Politique RLS de reference (modele a reutiliser en TASK-010)

CREATE POLICY <nom>_isolation ON <table>
USING (organization_id = nullif(current_setting('app.organization_id', true), '')::uuid);

## Action corrective appliquee immediatement

Un role applicatif dedie cabinetos_app a ete cree, explicitement NOSUPERUSER NOBYPASSRLS,
avec seulement les droits SELECT, INSERT, UPDATE, DELETE. DATABASE_URL pointe desormais
vers ce role, plus jamais vers postgres. Le role postgres reste reserve a l administration
et aux sauvegardes.

## Critere de decision

Les 6 points passent, avec une correction de configuration (role non-superutilisateur) et
un ajustement de syntaxe de politique (nullif). Drizzle 7.x est confirme pour TASK-009/010.
