# ADR-0009 — Squelette Storage / FileObject dès BUILD-001

**Statut** : Accepté

## Contexte

Le module Storage figure au Core Platform (chapitre 8 de l'Onboarding), et plusieurs
modules futurs (Documents, Dossier médical) en dépendront. Le RFA posait la question
explicitement (Question 1 du Decision Gate) : préparer une structure vide dès maintenant,
ou reporter entièrement à un Build ultérieur ?

## Décision

Un squelette vide du module Storage est inclus dès BUILD-001 : structure de dossier en
quatre couches, interface minimale (upload, récupération, suppression logique), et
l'entité `FileObject` présente au schéma Drizzle — sans aucune logique réelle
d'implémentation.

## Justification

- Préparer l'emplacement maintenant évite une réorganisation d'arborescence ultérieure,
  sans ajouter de complexité puisque rien n'est implémenté — cohérent avec l'Article 4 de
  la Constitution.
- `FileObject` porte `organizationId` non nullable et indexé, avec suppression logique
  (`deletedAt`), au même titre que les autres entités scopées du Core — préparé pour
  recevoir sa politique RLS le jour où le module sera réellement implémenté.

## Conséquences

- La revue du jalon EA-003 a révélé que `file_objects` n'avait **pas** reçu sa politique
  RLS lors de TASK-010 (le module étant un squelette au moment de cette tâche) — corrigé
  en migration `0002` et désormais balayé par la suite de tests d'isolation (TASK-011),
  exactement pour qu'un oubli futur soit détecté automatiquement plutôt que découvert en
  revue.
- Aucune implémentation réelle de stockage (local ou compatible S3) n'existe en
  BUILD-001 — le contrôleur Storage retourne 501, comme les autres modules squelettes du
  Core.
- Le fournisseur de stockage objet reste une question reportée (Section B de Passe 1),
  sans objet tant que Storage reste hors périmètre fonctionnel.

## Statut

Accepté. Confirmé le 28 juillet 2026. Livré en structure (TASK-006), corrigé sur le volet
RLS lors de la revue d'EA-003.
