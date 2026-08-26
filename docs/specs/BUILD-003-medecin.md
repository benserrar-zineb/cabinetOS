# CabinetOS — BUILD-003 — Module Médecin

## RFA — Passe 1 (Sections A à F)

**Références lues avant rédaction** : Note de Vision (`docs/vision/CabinetOS-Vision-Donnees-modules-Business.md`),
module Patient (`docs/specs/BUILD-002-patient.md`, ADR-0012 à 0015), ADR socle
(`docs/adr/0001` à `0011`).

**Rappel de périmètre** : cette passe ne rediscute ni la stack, ni l'isolation, ni la
structure en couches. Aucun code, aucune migration, aucun découpage en TASK — cela
relève de la Passe 2, après le Decision Gate.

---

## A — Résumé exécutif

Le module Médecin porte une seule chose : **l'identité professionnelle du médecin**,
établie une fois, réutilisable par les modules futurs (Prescription, Orientation,
Référencement, Facturation).

**Modèle proposé** : une seule nouvelle table, `medecins` — l'identité professionnelle
(nom, prénom, spécialité, identifiant professionnel, description, contact,
localisation réservée), scopée par organisation, avec une colonne `userId` optionnelle
référençant `users.id`.

**Décision clé** : contrairement au module Patient, **aucune nouvelle table de
relation n'est créée**. Le rattachement à une organisation est intégralement porté
par la table `memberships` du socle (BUILD-001), déjà capable de représenter
« cet utilisateur appartient à cette organisation avec ce rôle ». `medecins` ne fait
que référencer optionnellement un `userId` — quand il est renseigné, les memberships
existants de cet utilisateur *sont* ses rattachements organisationnels. Le module
n'invente rien côté appartenance.

Cette table reste **scopée par organisation**, comme `patients` — un médecin présent
dans trois cabinets aurait trois fiches `medecins` (une par organisation). C'est le
même arbitrage que pour Patient (ADR-0012) : coûteux en duplication de nom/spécialité,
mais cohérent avec le choix déjà fait de ne pas construire d'identité transversale
avant que le besoin réel (le hub) ne soit lui-même construit.

**Risques** :
- Duplication de l'identité pour un médecin multi-organisations (accepté, comme pour
  Patient — le transversal reste reporté).
- L'identifiant professionnel (INPE et/ou n° Ordre) est un futur pivot d'appariement
  inter-organisations — même piège que la CIN : ne pas lui imposer une unicité globale
  qui présumerait un appariement non construit.
- Distinguer « médecin-utilisateur » de « simple membre avec le rôle Médecin » demande
  une clarification du Product Owner (section F).

---

## B — Modèle de données proposé

### Une seule table nouvelle : `medecins`

| Champ | Type | Obligatoire | Note |
|---|---|---|---|
| `id` | uuid (pk) | oui | |
| `organizationId` | uuid (fk `organizations.id`) | oui | scope, comme `patients.organizationId` |
| `userId` | text (fk `users.id`, nullable) | non | rempli = médecin-utilisateur ; vide = médecin externe |
| `firstName` | text | oui | |
| `lastName` | text | oui | |
| `specialty` | text | non | texte libre pour ce Build (voir F) |
| `inpe` | text | non | 9 chiffres, validation non bloquante (voir C) |
| `numeroOrdre` | text | non | format non contraint pour ce Build (voir F) |
| `description` | text | non | présentation interne ; publication différée (voir périmètre reporté) |
| `phoneCountryCode` / `phoneNationalNumber` | text | non | même structure que Patient (ADR-0015) |
| `email` | text | non | |
| `location` | text | non | **réservé**, sans logique — même traitement que `nationalHealthId` pour Patient |
| `createdAt` / `updatedAt` / `deletedAt` | timestamp | — | |

### La distinction identité / rattachement

```
medecins (identité professionnelle, scopée par organisation)
   │
   │ userId (nullable)
   ▼
users (socle, BUILD-001)
   │
   │ memberships (existant, inchangé)
   ▼
organizations + roles
```

- **Médecin-utilisateur** : `medecins.userId` renseigné. Son rattachement à
  l'organisation est le membership déjà existant (créé par le flux d'invitation du
  socle) — jamais dupliqué ici.
- **Médecin externe** : `medecins.userId` vide. La fiche existe seule, scopée par
  l'organisation qui la connaît (« ce cabinet référence tel confrère externe »),
  sans compte, sans membership.
- **Médecin multi-organisations** : plusieurs lignes `medecins`, une par
  organisation, potentiellement le même `userId` sur chacune si la personne a un
  compte dans chaque organisation.

Aucune modification du schéma `memberships` ou `users` — le module Médecin
**s'appuie** sur le socle, il ne le redéfinit pas.

### Champs obligatoires minimaux

Seuls `firstName`, `lastName` et `organizationId` sont obligatoires — même
philosophie que Patient (fiche minimale valide, complétion progressive).

---

## C — Décisions de conception

### C.1 — Identité scopée par organisation, pas globale

**Décision** : `medecins` reste scopée par `organizationId`, comme `patients`.

**Justification** : cohérence avec ADR-0012 et le point de vigilance isolation
(BUILD-001) — toute table scopée échappant au RLS doit être une exception
documentée et validée, pas un défaut. Le transversal (une identité médecin unique
à travers toutes les organisations) est exactement le type d'entité que le Gate
Patient avait déjà écarté pour les mêmes raisons.

**Alternative écartée** : identité globale (une ligne `medecins` par personne,
indépendamment des organisations). Écartée : introduit une entité sans RLS, alors
que rien dans ce Build n'exploite réellement le transversal (pas de hub, pas de
recherche inter-organisations). Le médecin externe et le multi-organisations, cités
dans le RFA comme arguments pour le global, sont en réalité déjà couverts par le
modèle scopé (une fiche par organisation qui le connaît).

**Condition de réexamen** : quand le hub (orientations entre confrères,
Note de Vision §2) sera construit, l'appariement transversal par INPE redeviendra
une question active — à trancher par un nouvel ADR de révision, pas en silence.

### C.2 — Le rattachement réutilise les memberships du socle, sans nouvelle table

**Décision** : pas de table `medecin_records` ou équivalente. `medecins.userId`
référence directement `users.id` ; le rattachement organisationnel est lu depuis
`memberships`.

**Justification** : le RFA demande explicitement d'articuler l'identité pro avec
l'appartenance existante « sans la redéfinir ». Une table de relation parallèle
dupliquerait ce que `memberships` fait déjà (utilisateur + organisation + rôle),
créant deux mécanismes concurrents pour la même notion.

**Alternative écartée** : une table `medecin_records` mirroir de `patientRecords`
(avec son propre statut, sa propre date de rattachement). Écartée : le patient
n'a pas de compte et n'est jamais « membre » d'une organisation au sens Access
Control — d'où la nécessité de `patientRecords` pour porter cette relation. Le
médecin-utilisateur, lui, EST potentiellement déjà membre via le socle — construire
une seconde relation à côté serait redondant.

**Condition de réexamen** : si un besoin de statut de rattachement spécifique au
médecin apparaît (ex. « en congé », « suspendu par l'Ordre ») sans équivalent dans
`memberships`, réexaminer si ce statut doit vivre sur `medecins` ou justifier une
extension du socle.

### C.3 — Identifiant professionnel : INPE et n° Ordre, tous deux capturés, tous deux non bloquants

**Décision** : capturer les deux champs (`inpe`, `numeroOrdre`), tous deux optionnels.
Validation de **format** uniquement pour l'INPE (9 chiffres), non bloquante — même
philosophie que le CIN (ADR-0014). Unicité **scopée par organisation** pour l'INPE
quand renseigné (`UNIQUE(organizationId, inpe) WHERE inpe IS NOT NULL`), jamais
globale.

**Justification** : l'INPE est décrit par la Vision comme le pivot naturel des
futurs nœuds du hub (il identifie tous les acteurs de santé, pas seulement les
médecins) — c'est donc lui le candidat pivot, pas le n° Ordre (spécifique aux
médecins). Mais imposer une unicité globale présumerait un appariement
transversal non construit — piège explicitement nommé par le RFA, identique à
celui déjà évité pour la CIN.

**Alternative écartée** : n° Ordre comme pivot unique, INPE ignoré. Écartée : la
Vision désigne explicitement l'INPE comme l'identifiant transversal du futur
réseau (laboratoires, officines compris) — l'ignorer maintenant coûterait cher à
rattraper plus tard.

**Condition de réexamen** : quand l'appariement transversal (hub) sera construit,
réévaluer si l'unicité de l'INPE doit devenir globale à ce moment-là — par un ADR
de révision, pas silencieusement.

### C.4 — Représentation du médecin externe

**Décision** : une fiche `medecins` avec `userId` vide, scopée par l'organisation
qui la crée (« ce cabinet référence tel confrère externe »).

**Justification** : réutilise directement le modèle existant, sans distinction de
schéma entre médecin-utilisateur et médecin externe — seule la présence de
`userId` change. Pas de table ni de champ supplémentaire nécessaire.

**Alternative écartée** : une table séparée pour les « références externes ».
Écartée : dupliquerait exactement les mêmes champs (nom, spécialité, INPE) que
`medecins`, pour une distinction que `userId IS NULL` capture déjà nativement.

### C.5 — Permissions

**Décision** : deux permissions déclarées sur la ressource `medecins` — `manage`
(créer/modifier) et `read` (consulter/rechercher) — même minimalisme que Patient
(Passe 1, décision C.7 de BUILD-002).

**Justification** : cohérent avec l'Access Control existant, aucune permission
supplémentaire nécessaire à ce stade (pas de distinction fine par rôle demandée
par le RFA pour cette Passe).

### C.6 — Surface publique pour les modules futurs

**Décision** : exposer un type `MedecinSummary` (id, nom affichable, spécialité)
et une fonction de lecture minimale, sur le modèle de `PatientSummary` /
`findPatientSummaryById` (TASK-027, BUILD-002). Aucune fonction d'écriture
exposée hors du module.

**Justification** : Prescription, Orientation et Référencement doivent pouvoir
référencer une fiche médecin sans dépendre du modèle interne — exactement le
patron déjà établi pour Patient.

---

## D — Isolation & sécurité

**Une seule table scopée** : `medecins`. Contrairement à Patient (deux tables,
`patients` + `patientRecords`), ce module n'introduit qu'une seule table à
sécuriser — conséquence directe de la décision C.2 (réutilisation des memberships
existants plutôt qu'une nouvelle table de relation).

Les **trois gestes** s'appliquent intégralement, comme pour toute table scopée
(point de vigilance BUILD-001, rappelé par la Vision §6) :

1. **Politique RLS forcée** sur `medecins` — même patron que `patients_isolation`
   (`organization_id = NULLIF(current_setting('app.organization_id', true), '')::uuid`).
2. **Fonction scopée** (`withOrganizationScope`) pour tout accès applicatif —
   aucun accès direct à `medecins` hors de ce garde-fou.
3. **Test d'isolation dédié** — un médecin créé dans l'organisation A n'est jamais
   visible scopé sur l'organisation B ; un contournement RLS brut échoue (même
   modèle que `patient-isolation.spec.ts`, TASK-023).

**Index d'unicité partiel** sur `(organizationId, inpe) WHERE inpe IS NOT NULL` —
même mécanique que l'unicité CIN (migration 0005, BUILD-002).

**Aucun geste supplémentaire requis sur `memberships`** — la table existe déjà,
sécurisée depuis BUILD-001 ; ce module ne la modifie pas.

---

## E — ADR à venir

Trois ADR seront rédigés après le Gate, sur le même modèle que ceux de Patient :

1. **ADR — Distinction identité professionnelle / rattachement médecin.**
   Documente la décision C.2 : réutilisation des memberships du socle, aucune
   nouvelle table de relation. Différence notable avec ADR-0012 (Patient), à
   expliciter dans l'ADR.
2. **ADR — Périmètre reporté du module Médecin.** Nomme explicitement : dimension
   publique/référencement, création d'ordonnance, orientations entre confrères
   (le hub), facturation/tarification, partage de dossier inter-organisations.
3. **ADR — Identifiant professionnel médecin (INPE / n° Ordre).** Documente la
   décision C.3 : capture des deux, validation de format non bloquante pour
   l'INPE, unicité scopée par organisation, jamais globale.

---

## F — Questions ouvertes (Decision Gate)

Ces six questions demandent un arbitrage du Product Owner — aucune réponse
métier n'a été présumée.

**Q1 — Statut de la fiche médecin.** Patient a un statut à trois valeurs
(actif/archivé/décédé, Q3 de son Gate). Un médecin qui quitte une organisation
garde-t-il sa fiche `medecins` (historique), ou faut-il un statut équivalent
(ex. actif/parti) ? Si oui, doit-il suivre le départ du membership (le socle a-t-il
déjà une notion de fin de membership ?), ou vivre indépendamment sur `medecins` ?

**Q2 — Distinguer « est médecin » de « a le rôle Médecin ».** Un utilisateur peut
avoir le rôle « Médecin » dans l'Access Control sans qu'une fiche `medecins`
n'existe pour lui (ex. onboarding en deux temps). Faut-il imposer qu'une fiche
`medecins` existe systématiquement pour tout membre ayant ce rôle, ou les deux
notions restent-elles indépendantes (le rôle gère les permissions, `medecins`
gère l'identité pro, sans contrainte croisée) ?

**Q3 — Qui peut créer une fiche « médecin externe ».** N'importe quel membre
ayant la permission `manage` sur `medecins`, ou une restriction supplémentaire
(par exemple, seul un médecin peut référencer un confrère) ?

**Q4 — Spécialité : texte libre ou liste.** Pour ce Build, texte libre (comme
proposé en section B) ou liste fermée dès maintenant ? Si liste, où vit-elle —
même question que les listes ville/langue/couverture de Patient, réservée à un
futur Settings (ADR-0015, point 5) ?

**Q5 — Validation de l'INPE : format seul, ou vérification d'existence.** Le CIN
n'est validé qu'en format (ADR-0014). L'INPE, lié à l'AMO, doit-il rester au même
niveau (format seul, 9 chiffres, non bloquant), ou une vérification contre un
registre externe (ANAM) est-elle attendue à terme — même si hors périmètre de ce
Build, la réponse oriente la conception du champ (simple texte vs futur appel
externe) ?

**Q6 — Le numéro d'Ordre : capturé sans validation, ou réservé comme
`nationalHealthId`.** Le RFA ne tranche pas explicitement s'il faut valider son
format (contrairement à l'INPE, dont le format 9 chiffres est connu). Faut-il le
traiter comme un champ pleinement capturé (texte libre, sans validation, comme
proposé en section B), ou comme un champ réservé au même titre que `location`
(capturé, sans aucune logique, en attendant de connaître son format réel) ?

---

**Fin de la Passe 1.** Le Decision Gate tranche ces six questions et valide les
décisions C.1 à C.6 avant l'ouverture de la Passe 2.
