# CabinetOS — Note de clôture BUILD-003

**Module Médecin · Decision Gate final**
Date de clôture : 30 août 2026

Cette note acte la fin du développement back du module Médecin, deuxième module métier de CabinetOS. Le détail technique vit dans les Engineering Assets (`docs/specs/BUILD-003-medecin.md`), les ADR (`docs/adr/0016` à `0018`) et la Note de Vision (`docs/vision/`). Elle répond à la même question que pour BUILD-002 : **qu'est-ce qui est acquis, qu'est-ce qui reste, et que préparer pour la suite ?**

---

## Décision : le back du module Médecin est clos

Les trois Engineering Assets sont livrés et validés sur le code réel, pas seulement sur rapport :

- **EA-010 (modèle)** — table unique `medecins` (35 spécialités), rattachement organisationnel porté par `memberships` (existant depuis BUILD-001, ADR-0016) plutôt que par une table de relation dédiée. Clé étrangère composée `(organizationId, userId)` → `memberships`, spike testé en base avant de choisir le repli (trigger de détachement, `ON DELETE SET NULL` natif confirmé inviable).
- **EA-011 (isolation, validation, permissions)** — suite d'isolation dédiée prouvant le **refus**, pas seulement le scope qui fonctionne (une requête brute sans contexte d'organisation retourne zéro ligne alors que la donnée existe ; lecture croisée vérifiée dans les deux sens). Validation INPE non bloquante, testée sur 6 cas.
- **EA-012 (API, recherche, surface publique)** — contrôleur CRUD, recherche par nom mesurée sur volume réaliste (pas supposée réglée), surface publique minimale. Une correction mineure post-validation (renommage `patient_search_unaccent` → `search_unaccent`, pur `ALTER FUNCTION`, aucun changement de comportement).

Ce qui a été vérifié directement dans le code, pas seulement documenté : le refus RLS prouvé par une tentative de contournement en SQL brut, la limite de performance recherche/RLS mesurée à un volume réaliste plutôt qu'anticipée par analogie, l'absence de régression à chaque étape. 171 tests standard + 29 d'isolation au vert (couverture 92,9 %).

---

## Ce qui est acquis

- **Le modèle allégé par réutilisation** — une seule table à sécuriser (contre deux pour Patient), parce que le médecin, contrairement au patient, peut avoir un compte : `memberships` porte déjà l'appartenance utilisateur/organisation/rôle, `medecins` n'a pas besoin de la redupliquer (ADR-0016). Bénéfice direct du principe *« ne pas redéfinir l'existant »*.
- **Les identifiants professionnels du Gate**, tous implémentés (ADR-0018) : INPE (pivot transversal désigné par la Vision, 9 chiffres, format non bloquant — avertissement seulement) et numéro d'Ordre (texte libre, aucune validation de format imposée), tous deux optionnels, unicité partielle par organisation, jamais d'unicité globale.
- **Le contrôleur CRUD** (create/findOne/update), permissions `manage`/`read`, aucun endpoint de suppression — l'identité d'un médecin survit toujours à son départ (F.6), le détachement est géré par un trigger, jamais par une suppression de fiche.
- **La recherche par nom**, tolérante à la casse, aux accents et aux variantes de translittération — même mécanisme que Patient, mesurée (pas supposée) sur 20 001 fiches.
- **La surface publique minimale** (`findMedecinSummaryById`, `MedecinSummary`) — aucune fonction d'écriture exposée, prête pour les futurs modules qui s'y rattacheront (Prescription en premier lieu, selon la Vision).
- **Une fonction utilitaire généralisée** (`search_unaccent`) — partagée proprement entre Patient et Médecin dès aujourd'hui, plutôt que dupliquée sous un nom scopé.

---

## Ce qui est en dette — à tracer, non bloquant

Une seule dette technique, mesurée et comprise — la même cause que pour Patient, désormais confirmée sur une deuxième table :

- **Performance de la recherche floue au-delà de ~20 000 médecins par organisation.** À ce volume, la politique RLS empêche PostgreSQL d'utiliser l'index GIN de recherche trigram, faisant passer le temps de 3,3 ms à 65-91 ms selon la variante recherchée. Cause isolée et prouvée (la même requête sans RLS retombe sous la milliseconde). Reste sous le seuil de gêne interactive (200-300 ms), donc **non bloquant aujourd'hui**. Même mitigation que Patient : à surveiller si un cabinet approche ce volume, objet d'une issue GitHub, priorité normale.

Aucune autre dette ouverte sur ce module.

---

## Le périmètre reporté — nommé, non oublié

Comme pour Patient (ADR-0013), chaque cible hors périmètre est nommée dans un ADR (0017) pour que la porte reste ouverte :

- **Dimension publique de la fiche et référencement patient** (recherche par spécialité/ville, géolocalisation).
- **Référentiel `MedicalSpecialty`** complet et versionné (code, nom FR/AR, source Ordre/ANAM) — une liste contrôlée simple suffit pour ce Build.
- **Compétences/qualifications structurées** — exprimables librement dans `description` pour l'instant.
- **Vérification d'identité professionnelle** (preuve d'inscription à l'Ordre, INPE via annuaire ANAM) — appartient au futur module d'accès/inscription des comptes.
- **Recherche par critères combinables** (spécialité + ville) — suppose un annuaire peuplé, appartient au référencement.
- **Validation de format du numéro d'Ordre** — aucune référence fiable sur sa structure aujourd'hui ; ADR de révision si un format se confirme sur le terrain.
- **Orientations/recommandations entre confrères**, **création d'ordonnance** (Prescription), **facturation**, **partage de dossier inter-organisations** — chacun appartient à une brique non encore construite.

---

## Le point de vigilance qui se réveille à la suite

BUILD-003 confirme, comme BUILD-002 l'avait fait pour Patient, que **ce module ne prend toute sa valeur qu'au travers des modules suivants**. Contrairement à Patient (trois écrans maquettés), Médecin n'a **aucun écran dans ce Build** — le design est piloté séparément par le Product Owner. Ce module vit aujourd'hui entièrement comme une brique d'API et de données : sa vraie valeur perçue viendra quand Prescription s'y rattachera (le médecin prescrit → le patient transmet → l'officine reçoit, le flux central de la Vision).

Le réflexe des **trois gestes d'isolation** (RLS, fonction scopée, test dédié) a de nouveau tenu, sur une table dont le rattachement est structurellement différent de Patient (composée vers `memberships`, pas une table de relation dédiée) — preuve que le réflexe généralise, pas seulement qu'il se répète.

La correction post-validation (renommage de `patient_search_unaccent`) confirme aussi une discipline utile : réutiliser plutôt que dupliquer est resté le bon choix, seul le nom devait suivre — signe que le principe *« ne pas redéfinir l'existant »* tient, à condition de rester vigilant sur ce qu'un nom laisse penser une fois partagé entre modules.

---

## Prochaines étapes

1. **Tracer l'issue de dette** (performance recherche/RLS sur `medecins`, même cause que Patient).
2. **Poursuivre le design des écrans** du module Médecin, piloté séparément par le Product Owner — hors périmètre de ce Build back.
3. **Ouvrir le module suivant de la séquence** (Référentiel Médicaments, selon la Note de Vision — catalogue partagé, indépendant de tout, consommé ensuite par Prescription et Officine).
