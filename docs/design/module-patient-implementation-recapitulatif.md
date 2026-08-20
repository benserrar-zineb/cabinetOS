# Module Patient — Implémentation des interfaces

**Récapitulatif du cycle front — les trois écrans**

Complète `module-patient-spec.md` et les maquettes (`maquettes/`) : ce document
enregistre ce qui a été réellement implémenté, testé et validé, écran par écran.

---

## Résumé

Les trois écrans du module Patient sont implémentés, testés et mergés sur `main`.

| Écran | Pull Request | Tests de comportement |
|---|---|---|
| 1. Création d'une fiche patient | PR #24 | 5 |
| 2. Consultation (vue médecin) | PR #26 | 6 |
| 3. Recherche / liste des patients | PR #27 | 6 |

Correctif technique associé : compatibilité PostgreSQL 18 (PR #25).

**Total : 17 tests de comportement, tous verts.**

---

## Écran 1 — Création (PR #24)

Noyau minimal visible (prénom, nom, date de naissance, téléphone) ; reste replié sous
« Ajouter plus d'informations ». Date obligatoire avec soupape « date inconnue ».
CIN/e-mail/téléphone en validation **non bloquante** (avertissement doux, jamais de
refus). Indicatif téléphonique séparé, zéro national retiré automatiquement à la
saisie. Refus de création uniquement si prénom/nom/date manquants. Branché sur l'API
réelle (`POST /api/v1/patients`), pas de données en dur.

**Tests de comportement (5)**, dont les deux cités explicitement dans le brief :

- refuse la création sans date de naissance **ni** case « inconnue »
- un CIN mal formé **n'est jamais bloquant**

---

## Écran 2 — Consultation, vue médecin (PR #26)

Bandeau d'identité compact (nom, âge, statut, téléphone, couverture, numéro de
dossier) sans répétition. Détail complet replié derrière « Fiche complète ». Un seul
écran, bascule Modifier/Enregistrer sans navigation séparée. Les 4 zones médicales
(motif de visite, historique, ordonnances, orientations) sont marquées « à venir »,
réservées aux futurs modules Agenda/Consultation/Prescription.

**Tests de comportement (6)** : affichage des données réelles, bascule du détail,
bascule édition/lecture, requête PATCH avec les champs modifiés, note du bouton
« Démarrer la consultation » (module pas encore construit, ne bloque jamais), badges
« à venir » sur les 4 zones.

---

## Écran 3 — Recherche / liste des patients (PR #27)

Barre unique, détection automatique du type de saisie (nom flou / téléphone / CIN).
Résultats affichant la date de naissance, alerte homonyme quand plusieurs patients
partagent le même nom de famille.

**Tests de comportement (6)**, dont celui cité explicitement dans le brief :

- la recherche par téléphone trouve le patient quelle que soit la forme saisie
  (vérifié avec les 4 formes : `0651…` / `651…` / `+212 651…` / `00212 651…`)

Vérifié aussi avec de vraies données : la recherche « bennani » retrouve à la fois
« Bennani » et « Benani » (variante de translittération, Q4).

---

## Sortie CI et consommation de l'API réelle

17 tests de comportement au total, tous verts, sur les 3 PR mergées. Chaque écran
consomme réellement l'API (appels HTTP réels via la passerelle Next.js → NestJS,
aucune donnée en dur) — vérifié à la fois par les tests automatisés et par un test
manuel complet sur environnement local (création, consultation, recherche d'un vrai
patient de bout en bout, avec une vraie session et un vrai cabinet).

Rendu validé par le Product Owner sur capture d'écran.

---

## Deux manques signalés en cours de route, devenus cibles reportées

Conformément à la consigne du brief (« si tu découvres qu'un écran a besoin d'un
champ ou d'un endpoint absent, ne l'improvise pas — signale-le ») :

1. **Écran de connexion / parcours d'accès** (login, sélection d'organisation, rôles)
   — absent du frontend, hors périmètre de ce brief. Reporté, à traiter après le
   module Médecin.
2. **Zone « patients récents »** sur l'écran de recherche — aucune fonction de l'API
   ne permet de lister des patients sans critère de recherche. Reporté, dépend du
   parcours d'accès et du module Consultation (adaptation au rôle : créations pour
   la secrétaire, consultations pour le médecin).

Les deux sont tracés en issues GitHub (périmètre reporté), pas oubliés.

---

## Autre

Un bug réel de compatibilité PostgreSQL 18 a été trouvé et corrigé au passage
(PR #25) : la fonction de recherche floue (migration 0009) échouait à l'exécution
sur l'image `postgres:18` utilisée par `docker-compose.yml`, alors qu'elle
fonctionnait sur la version utilisée en développement. Corrigé, testé, documenté
dans la migration (0010).
