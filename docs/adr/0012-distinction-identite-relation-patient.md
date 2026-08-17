# ADR-0012 — Distinction identité / relation cabinet-patient

**Statut** : Accepté (Decision Gate BUILD-002).

## Contexte

Le module Patient doit représenter à la fois « qui est cette personne » et « le fait
qu'elle soit patiente de ce cabinet ». La Note de Vision (§6) reporte le rattachement
transversal entre organisations, mais demande que le modèle le prépare sans le
construire. ADR-0005 impose que toute donnée scopée porte un `organizationId` protégé
par RLS.

## Décision

Deux tables : `patients` (identité — nom, prénom, date de naissance, CIN, contact,
adresse) et `patientRecords` (relation — numéro de dossier, statut, date de
rattachement, responsable éventuel). **Les deux restent scopées par `organizationId`
pour ce Build** — l'identité n'est pas rendue globale.

## Justification

- Cohérence avec ADR-0005 : aucune table scopée n'échappe au RLS sans raison
  documentée et validée ; le rattachement transversal, seul cas où l'identité globale
  aurait un sens, est explicitement hors périmètre.
- Séparer les deux objets même tous deux scopés isole deux cycles de vie différents et
  rend la future migration vers une identité partagée additive (on ajoute un mécanisme
  d'appariement) plutôt que destructive (on détricote une table fusionnée).
- Permet de représenter le patient sans identité autonome (dépendant) au niveau de la
  relation, sans dupliquer la logique d'identité.

## Conséquences

- Toute lecture combinée (API `GET /api/v1/patients/:id`) fait une jointure entre
  `patients` et `patientRecords` — l'appelant ne voit qu'une ressource `patients`
  unique ; la séparation en deux tables est un détail d'implémentation.
- Le jour où le rattachement transversal sera construit, cet ADR sera révisé
  explicitement (nouvel ADR de révision), pas contourné par un ajout silencieux de
  colonne.

**Alternative écartée** : table unique fusionnant identité et relation. Plus simple
immédiatement, mais capitalise une dette de migration certaine.
