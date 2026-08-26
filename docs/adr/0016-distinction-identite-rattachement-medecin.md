# ADR-0016 — Distinction identité professionnelle / rattachement (module Médecin)

**Statut** : Accepté (Decision Gate BUILD-003).

## Contexte

Le module Médecin doit représenter à la fois « qui est ce médecin » (identité
professionnelle stable) et « où il exerce » (rattachement organisationnel).
Contrairement au patient, le médecin peut être un **utilisateur** du système
(compte, connexion) — le socle (BUILD-001) modélise déjà cette appartenance via
`memberships` (`userId` + `organizationId` + `roleId`).

## Décision

Une seule nouvelle table, `medecins` (identité professionnelle, scopée par
organisation — même principe que ADR-0012). Le rattachement organisationnel
**n'est pas porté par une nouvelle table de relation** (contrairement à
`patientRecords` pour Patient) — il est intégralement porté par `memberships`,
existant depuis BUILD-001.

`medecins.userId` (nullable, `text`, référence `users.id`) indique si la fiche
correspond à un médecin-utilisateur (rempli) ou à un médecin externe / un
rattachement retiré (vide). Une **clé étrangère composée**
`(organizationId, userId)` → `memberships(organizationId, userId)` garantit
qu'un `userId` renseigné correspond bien à une adhésion réelle dans cette même
organisation — vérifié par spike (voir Passe 2, section « clé composée »).

## Justification

- Cohérence avec le principe « ne pas redéfinir l'existant », rappelé
  explicitement par le RFA : `memberships` modélise déjà utilisateur +
  organisation + rôle ; dupliquer cette notion créerait deux mécanismes
  concurrents pour la même chose.
- Le médecin, contrairement au patient, **peut** avoir un compte — c'est
  précisément ce qui permet de s'appuyer sur le socle au lieu de réinventer une
  relation.
- Une seule table à sécuriser (au lieu de deux pour Patient) — conséquence
  directe et bénéfice mesurable de ce choix.

## Différence avec ADR-0012 (Patient)

Patient nécessitait `patientRecords` car le patient n'a jamais de compte, jamais
de membership — la relation cabinet-patient n'a aucun équivalent dans le socle.
Le médecin-utilisateur, lui, a potentiellement déjà un membership : pas besoin
de le recréer.

## Conséquences

- Le spike demandé par le Gate a été réalisé (testé directement en base, pas
  supposé) : `ON DELETE SET NULL` natif sur la clé composée est **inviable** —
  il met `organizationId` à `NULL` en même temps que `userId`, violant sa
  contrainte `NOT NULL` (confirmé : erreur PostgreSQL reproduite). Repli : clé
  composée **sans action de suppression automatique** (comportement par défaut,
  équivalent à `NO ACTION`), plus un trigger sur `memberships` (`BEFORE DELETE`)
  qui met exclusivement `medecins.userId` à `NULL` pour les lignes
  correspondantes, sans toucher `organizationId` — même patron de défense que
  `responsiblePatientRecordId` chez Patient (TASK-021, ADR implicite dans ce
  TASK) : contrainte + trigger plutôt qu'une action de cascade native
  insuffisante.
- Un médecin multi-organisations a autant de lignes `medecins` que
  d'organisations où il exerce (voir ADR-0017, duplication acceptée).

**Alternative écartée** : une table `medecinRecords` mirroir de
`patientRecords`. Écartée : dupliquerait exactement ce que `memberships` fait
déjà pour tout utilisateur ayant un compte.
