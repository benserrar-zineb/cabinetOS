# ADR-0013 — Périmètre reporté du module Patient

**Statut** : Accepté (Decision Gate BUILD-002). Enrichi par ADR-0015 (points 9-10 et
11-12 ajoutés lors de la révision de modèle issue du design des écrans).

## Contexte

Le RFA nomme explicitement plusieurs capacités hors périmètre de ce Build, et le Gate
en a ajouté deux (Q5 second cas, Q7). Nommer une porte plutôt que la fermer par oubli
est la règle du dépôt (`docs/ORGANISATION.md`, principe « une chose = un seul endroit »).

## Décision

Sont explicitement reportés, sans être construits ni anticipés dans ce Build :

1. Le compte patient (connexion, mot de passe, MFA).
2. Le paiement et la facturation côté patient.
3. Les préférences et paramètres de compte patient.
4. Les documents chiffrés côté patient.
5. La prise de RDV en ligne par le patient.
6. La gestion des proches en libre-service.
7. L'appariement transversal de l'identité entre organisations et le compte patient
   qui l'agrège.
8. La vérification d'identité (preuve de possession : SMS, etc.).
9. Le responsable externe non-patient d'un dépendant (tuteur/accompagnant sans
   dossier propre) — contournement en attendant : fiche minimale créée pour ce
   responsable, comme n'importe quel patient (Q5).
10. La gestion de RDV déléguée entre comptes patients, façon Doctolib (un patient
    gère les rendez-vous d'un autre) — dépend entièrement du futur module Compte
    Patient + Agenda (Q5).
11. La numérotation séquentielle « lisible » du dossier et la reprise d'une
    numérotation papier existante (Q6) — l'identifiant système reste la seule
    garantie ; l'habillage visuel choisi par le cabinet n'inclut ni l'un ni l'autre
    pour ce Build.
12. Tout usage ou validation du champ `nationalHealthId` (Q7) — le champ existe,
    réservé, sans logique.
13. Les listes configurables (ville, langue, couverture) via le module Settings —
    des listes par défaut codées suffisent pour ce module (ADR-0015, point 5).

## Justification

Chacun de ces points touche une brique non construite (compte patient, Agenda,
Settings) ou une fonctionnalité dont le besoin réel n'est pas prouvé (numérotation
papier spécifique). Les nommer maintenant évite qu'ils soient rediscutés dans un an
comme si personne n'y avait pensé (`docs/ORGANISATION.md`, règle d'or).

## Conséquences

- Le modèle d'identité (`patients`) ne doit rien anticiper de la relation
  « compte ↔ compte » du point 10 — mais ne doit rien non plus lui rendre impossible.
  Vérifié : aucune contrainte du modèle actuel ne bloque l'ajout futur d'un compte
  patient référençant un `patients.id`.
- Toute reprise d'un des points ci-dessus ouvre un nouveau RFA de module ou un ADR de
  révision — jamais un ajout silencieux.
