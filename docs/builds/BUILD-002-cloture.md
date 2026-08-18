# CabinetOS — Note de clôture BUILD-002

**Module Patient · Decision Gate final**
Date de clôture : 18 août 2026

Cette note acte la fin du développement back du module Patient, premier module métier de CabinetOS. Le détail technique vit dans les Engineering Assets (`docs/specs/BUILD-002-patient.md`), les ADR (`docs/adr/`) et la spécification de design (`docs/design/`). Elle répond à la question du chapitre 13 : **qu'est-ce qui est acquis, qu'est-ce qui reste, et que préparer pour la suite ?**

---

## Décision : le back du module Patient est clos

Les trois Engineering Assets sont livrés et validés sur le code réel, pas seulement sur rapport :

- **EA-007 (modèle)** — tables `patients` et `patient_records`, identité distinguée de la relation cabinet-patient (ADR-0012), isolation à deux couches vérifiée.
- **EA-008 (sécurité)** — trigger same-organization sur le responsable, prouvé qu'un contournement inter-organisation **échoue** au niveau base, validation CIN/date fidèle au Gate.
- **EA-009 (API & recherche)** — CRUD, permissions, recherche à trois chemins normalisés, révision de modèle ADR-0015 appliquée.

Ce qui a été vérifié directement dans le code : la frontière anti-DGI (couverture = régime + numéro, **jamais de montant**), la normalisation de recherche (sept formes de téléphone donnent le même résultat), le refus de contournement RLS non régressé. 124 tests standard + 23 d'isolation au vert.

---

## Ce qui est acquis

- **Le modèle identité / relation cabinet-patient** — la distinction fondatrice qui prépare, sans le construire, le futur patient transversal.
- **La règle de données appliquée** — la fiche patient est du soin/identité, stockée et isolée ; aucune donnée commerciale/fiscale n'y figure. La frontière est gravée dans le schéma, commentaire à l'appui.
- **Les décisions du Gate**, toutes implémentées : date de naissance obligatoire avec soupape « inconnue », CIN optionnelle non bloquante normalisée, statut à trois valeurs, recherche à trois chemins, numéro de dossier en habillage, champ `nationalHealthId` réservé.
- **Les trois écrans maquettés et spécifiés** (création, consultation, recherche), prêts à être implémentés.

---

## Ce qui est en dette — à tracer, non bloquant

Une seule dette technique, mesurée et comprise :

- **Performance de la recherche floue au-delà de ~20 000 patients par organisation.** À ce volume, la politique RLS empêche PostgreSQL d'utiliser l'index GIN de recherche trigram, faisant passer le temps de 8 ms à 85-100 ms. Cause isolée et prouvée (la même requête sans RLS retombe à 6,6 ms). Reste sous le seuil de gêne interactive (200-300 ms), donc **non bloquant aujourd'hui**. À surveiller si un cabinet approche ce volume. Objet d'une issue GitHub, priorité normale.

Aucune autre dette ouverte sur ce module.

---

## Le périmètre reporté — nommé, non oublié

Ce module a fait émerger une carte du produit futur. Chaque cible est nommée dans un ADR pour que la porte reste ouverte :

- **Compte patient** (connexion, MFA, préférences, documents chiffrés).
- **Appariement transversal** de l'identité entre organisations, et **vérification d'identité** (preuve de possession).
- **Gestion de RDV déléguée** (un patient gère les RDV d'un autre, façon Doctolib).
- **Responsable externe** (tuteur sans dossier au cabinet).
- **Orientations & recommandations** entre professionnels (médecin, labo, radio, officine) — le flux du réseau CabinetOS.
- **Espace admin / Settings** pour la personnalisation des listes (ville, langue, couverture).
- **Module Facturation** — où vivront les données commerciales/fiscales, hors de CabinetOS (modèle BYOS).

---

## Le point de vigilance qui se réveille à la suite

BUILD-002 a confirmé que **le module Patient sert surtout la secrétaire** (création, recherche). Le médecin, lui, n'obtient sa vraie valeur qu'avec les modules à venir : l'écran de consultation est aujourd'hui à 80 % des zones réservées, en attente de Consultation et Agenda.

Conséquence pour la suite : les prochains modules (Médecin, puis Consultation) sont ceux qui donneront au produit sa valeur perçue côté soignant. Le socle Patient est prêt à les recevoir — la fiche est conçue comme point d'ancrage, la surface publique (`findPatientSummaryById`) est exposée pour eux.

Le réflexe des **trois gestes d'isolation** (RLS, fonction scopée, test) reste obligatoire pour chaque nouvelle table métier — il a tenu sur les deux tables de ce module, il tiendra sur les suivantes.

---

## Prochaines étapes

1. **Tracer l'issue de dette** (performance recherche / RLS).
2. **Implémenter les interfaces** du module Patient, sur la base des maquettes validées — piloté par le Product Owner.
3. **Ouvrir le module suivant** de la séquence (Médecin), quand l'interface Patient est en place.
