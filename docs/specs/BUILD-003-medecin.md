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
existants de cet utilisateur _sont_ ses rattachements organisationnels. Le module
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

| Champ                                      | Type                           | Obligatoire | Note                                                                            |
| ------------------------------------------ | ------------------------------ | ----------- | ------------------------------------------------------------------------------- |
| `id`                                       | uuid (pk)                      | oui         |                                                                                 |
| `organizationId`                           | uuid (fk `organizations.id`)   | oui         | scope, comme `patients.organizationId`                                          |
| `userId`                                   | text (fk `users.id`, nullable) | non         | rempli = médecin-utilisateur ; vide = médecin externe                           |
| `firstName`                                | text                           | oui         |                                                                                 |
| `lastName`                                 | text                           | oui         |                                                                                 |
| `specialty`                                | text                           | non         | texte libre pour ce Build (voir F)                                              |
| `inpe`                                     | text                           | non         | 9 chiffres, validation non bloquante (voir C)                                   |
| `numeroOrdre`                              | text                           | non         | format non contraint pour ce Build (voir F)                                     |
| `description`                              | text                           | non         | présentation interne ; publication différée (voir périmètre reporté)            |
| `phoneCountryCode` / `phoneNationalNumber` | text                           | non         | même structure que Patient (ADR-0015)                                           |
| `email`                                    | text                           | non         |                                                                                 |
| `location`                                 | text                           | non         | **réservé**, sans logique — même traitement que `nationalHealthId` pour Patient |
| `createdAt` / `updatedAt` / `deletedAt`    | timestamp                      | —           |                                                                                 |

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

**Fin de la Passe 1.**

---

# DECISION GATE — validé

Sept décisions tranchées (F.1 à F.7) :

- **F.1** — INPE = pivot du réseau (9 chiffres). Numéro d'Ordre capturé en
  complément (couvre les médecins publics sans INPE). Les deux optionnels,
  unicité partielle scopée, jamais globale. Détail : ADR-0018.
- **F.2** — Aucun identifiant obligatoire : seuls nom et prénom requis. La
  vérification d'identité est reportée au futur module d'accès.
- **F.3** — Numéro d'Ordre : texte libre, sans validation de format (aucune
  référence fiable sur sa structure). Une validation souple pourra venir plus
  tard par ADR de révision.
- **F.4** — Spécialité 0 ou 1 (contrainte légale, article 16 de la loi
  131-13). Liste contrôlée simple pour ce Build. Référentiel versionné et
  compétences structurées → reportés (ADR-0017).
- **F.5** — Médecin externe : duplication entre organisations acceptée pour
  ce Build (cohérent avec Patient, transversal reporté). Partage/dédoublonnage
  reporté au hub, via l'INPE.
- **F.6** — Pas de distinction « parti » vs « jamais rattaché ». L'identité
  survit toujours au départ (trigger de détachement, ADR-0016). L'attribution
  historique viendra du futur module Consultation.
- **F.7** — Recherche par nom construite (tolérante). Ville promue en vrai
  champ, spécialité en liste contrôlée. Recherche par critères combinés
  reportée au référencement.

**Invariants confirmés, non rediscutés** : une seule table `medecins` scopée ;
rattachement par clé composée `(organizationId, userId)` → `memberships`,
détachement par trigger (pas par `ON DELETE SET NULL` natif, inviable — voir
spike ci-dessous) ; les trois gestes d'isolation obligatoires ; frontière
anti-DGI (aucune donnée commerciale/fiscale) ; messages de doublon génériques.

---

# PASSE 2 — Spécification & découpage

## Le spike clé composée — résolu

Le Gate demandait de vérifier la faisabilité réelle de la clé étrangère
composée `(organizationId, userId)` → `memberships(organizationId, userId)`
avec détachement automatique. **Testé directement en base, pas supposé :**

- `ON DELETE SET NULL` natif sur cette clé composée est **inviable** :
  PostgreSQL met **toutes** les colonnes de la clé composée à `NULL`
  simultanément — y compris `organizationId`, qui porte une contrainte
  `NOT NULL`. Résultat reproduit : `ERROR: null value in column
"organization_id" ... violates not-null constraint`.
- **Repli confirmé qui fonctionne** : la clé composée reste posée (sans action
  de suppression automatique — comportement par défaut, équivalent à
  `NO ACTION`), et un **trigger** `BEFORE DELETE` sur `memberships` met
  exclusivement `medecins.userId` à `NULL` pour les lignes correspondant à
  l'`(organizationId, userId)` supprimé, sans toucher `organizationId`. Testé :
  après suppression du membership, la fiche `medecins` survit, reste scopée à
  son organisation, et `userId` repasse à `NULL`.
- **Confirmé également** : un `userId` renseigné qui ne correspond à aucune
  adhésion réelle dans cette organisation est refusé par la clé composée elle-
  même (violation de contrainte) — l'intégrité référentielle fonctionne. Un
  médecin externe (`userId` vide) reste toujours accepté sans qu'aucune
  adhésion n'existe (comportement standard de PostgreSQL pour les clés
  composées : une valeur `NULL` dans la clé dispense entièrement du contrôle).

Ce résultat est documenté dans ADR-0016 et engage directement la migration de
TASK-030 (voir découpage EA/TASK).

## Modèle de données détaillé

### Table `medecins`

| Champ                                      | Type                     | Contrainte                      | Note                                                               |
| ------------------------------------------ | ------------------------ | ------------------------------- | ------------------------------------------------------------------ |
| `id`                                       | `uuid`                   | PK                              | `uuidv7()`, comme `patients.id`                                    |
| `organizationId`                           | `uuid`                   | NOT NULL, FK `organizations.id` | scope                                                              |
| `userId`                                   | `text`                   | nullable                        | FK composée, voir ci-dessous                                       |
| `firstName`                                | `text`                   | NOT NULL                        |                                                                    |
| `lastName`                                 | `text`                   | NOT NULL                        |                                                                    |
| `specialty`                                | `text` (enum applicatif) | nullable                        | liste contrôlée simple, F.4                                        |
| `inpe`                                     | `text`                   | nullable                        | 9 chiffres, validation non bloquante                               |
| `numeroOrdre`                              | `text`                   | nullable                        | texte libre, aucune validation (F.3)                               |
| `description`                              | `text`                   | nullable                        | usage interne pour ce Build                                        |
| `phoneCountryCode` / `phoneNationalNumber` | `text`                   | nullable                        | même structure que Patient (ADR-0015)                              |
| `email`                                    | `text`                   | nullable                        |                                                                    |
| `city`                                     | `text`                   | nullable                        | vrai champ structuré (F.7), pas un texte libre                     |
| `locationReference`                        | `text`                   | nullable                        | **réservé**, sans logique (même traitement que `nationalHealthId`) |
| `createdAt` / `updatedAt` / `deletedAt`    | `timestamp`              | —                               |                                                                    |

**Contraintes** :

- `FOREIGN KEY (organizationId, userId) REFERENCES memberships(organizationId, userId)`
  — sans action de suppression automatique (voir spike).
- `UNIQUE (organizationId, userId) WHERE userId IS NOT NULL` — empêche qu'un
  même utilisateur ait deux fiches `medecins` dans la même organisation
- `UNIQUE (organizationId, inpe) WHERE inpe IS NOT NULL`
- `UNIQUE (organizationId, numeroOrdre) WHERE numeroOrdre IS NOT NULL`
- `specialty` contraint à une liste fixe (enum PostgreSQL ou `CHECK`, à trancher
  en TASK) — valeurs de référence usuelles (médecine générale, pédiatrie,
  gynécologie, cardiologie, dermatologie, ORL, ophtalmologie, psychiatrie,
  radiologie, chirurgie générale — liste indicative, à valider avec le Product
  Owner avant la migration, hors périmètre de cette Passe).

**Champs obligatoires minimaux** : `firstName`, `lastName`, `organizationId`.
Tout le reste optionnel, y compris l'identifiant professionnel (F.2).

### Aucune modification de `memberships` ni `users`

Le module ne touche pas au socle — il le référence uniquement.

## Sécurité et isolation

**Une seule table à sécuriser.** Les trois gestes s'appliquent intégralement :

1. **Politique RLS forcée** sur `medecins`, même patron que
   `patients_isolation` : `organization_id = NULLIF(current_setting('app.organization_id', true), '')::uuid`.
2. **Fonction scopée** (`withOrganizationScope`) pour tout accès applicatif.
3. **Test d'isolation dédié** prouvant le refus (pas seulement le succès) : un
   médecin créé dans l'organisation A n'est jamais visible scopé sur
   l'organisation B ; un contournement RLS brut échoue ; un `userId` d'une
   autre organisation est refusé par la clé composée (contournement testé,
   comme pour `responsiblePatientRecordId` chez Patient).

**Aucune donnée commerciale/fiscale** dans le schéma — vérifié : aucun champ
d'honoraires, de chiffre d'affaires ou de tarification n'apparaît ci-dessus.

## API détaillée (conventions ADR-0008)

| Méthode | Route                  | Permission | Note                                                                                                                                                                           |
| ------- | ---------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `POST`  | `/api/v1/medecins`     | `manage`   | création ; avertissement doux si INPE mal formé, jamais de rejet                                                                                                               |
| `GET`   | `/api/v1/medecins/:id` | `read`     | lecture unique                                                                                                                                                                 |
| `PATCH` | `/api/v1/medecins/:id` | `manage`   | modification partielle                                                                                                                                                         |
| `GET`   | `/api/v1/medecins?q=`  | `read`     | recherche par nom (floue, réutilise l'index trigram déjà activé par Patient — migration 0009 — aucune nouvelle extension nécessaire, seulement un nouvel index sur `medecins`) |

Enveloppe `{ data, meta }` en succès, `{ error }` en échec — identique à
Patient. `meta.warnings` porte l'avertissement INPE mal formé, jamais un rejet.

## Surface publique (`index.ts`)

- `medecins` (schéma, pour les FK futures de Prescription/Orientation).
- `findMedecinSummaryById(databaseService, organizationId, id)` — lecture
  minimale.
- Type `MedecinSummary` : `{ id, displayName, specialty, identifiantAffiche }`
  — `identifiantAffiche` résout l'INPE si présent, sinon le numéro d'Ordre,
  sinon vide (ordre de préférence cohérent avec F.1 : INPE = pivot).
- **Aucune fonction d'écriture exportée** — même règle que Patient.

## Découpage en Engineering Assets et TASK

### EA-010 — Modèle de données Médecin

- **TASK-038** — Schéma Drizzle `medecins` (colonnes d'identité, hors clé
  composée). Dépend de : rien (module neuf). Tests : nullabilité des colonnes
  (seuls firstName/lastName/organizationId requis).
- **TASK-039** — Migration réelle : `CREATE TABLE medecins` + RLS forcée +
  index d'unicité partiels (`userId`, INPE, numéro d'Ordre). Dépend de :
  TASK-038.
  Critère d'acceptation : `\d+ medecins` confirme `FORCE ROW LEVEL SECURITY`.
- **TASK-040** — Clé composée vers `memberships` + trigger de détachement
  (le repli du spike, ADR-0016). Dépend de : TASK-039. Tests : détachement
  confirmé (organizationId survit, userId repasse à NULL) ; refus d'un userId
  n'appartenant pas à l'organisation. Hors périmètre : toute UI de gestion du
  rattachement.
- **TASK-041** — Fonctions d'accès (`createMedecin`, `findMedecinById`,
  `updateMedecin`) via `withOrganizationScope`. Dépend de : TASK-040.

### EA-011 — Isolation, validation, permissions

- **TASK-042** — Tests d'isolation dédiés (`medecin-isolation.spec.ts`),
  même modèle que `patient-isolation.spec.ts` (TASK-023). Dépend de :
  TASK-041.
- **TASK-043** — Validation INPE (format 9 chiffres, non bloquante,
  normalisation) — même patron que `cin-validation.ts`. Dépend de : TASK-038.
  Hors périmètre : validation de format du numéro d'Ordre (F.3, aucune règle
  n'existe).
- **TASK-044** — Permissions `manage`/`read` sur la ressource `medecins`
  (migration de données, même patron que TASK-024). Dépend de : rien
  (indépendant du reste).

### EA-012 — API, recherche, surface publique

- **TASK-045** — Contrôleur CRUD (`create`/`findOne`/`update`). Dépend de :
  TASK-041, TASK-043, TASK-044.
- **TASK-046** — Recherche par nom (index trigram sur `medecins`, réutilise
  l'extension `unaccent`/`pg_trgm` déjà activée — migration dédiée pour le
  seul index, pas de nouvelle extension). Dépend de : TASK-041. Point de
  vigilance signalé par avance : mesurer sur volume réaliste, comme TASK-026
  pour Patient — probable même limite RLS/index GIN déjà documentée (issue
  #23), à vérifier plutôt qu'à supposer résolue par avance.
- **TASK-047** — Surface publique `index.ts` (`MedecinSummary`,
  `findMedecinSummaryById`). Dépend de : TASK-041.

## Registre des risques

| Risque                                                                  | Impact                                                           | Mitigation                                                                                     |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Duplication d'identité pour un médecin multi-organisations              | Coût de maintenance (mettre à jour le nom dans plusieurs fiches) | Accepté explicitement (ADR-0017), même arbitrage que Patient                                   |
| Format du numéro d'Ordre inconnu                                        | Impossible de valider même en avertissement                      | Accepté (F.3) ; ADR de révision si un format émerge sur le terrain                             |
| Mécanisme clé composée + trigger moins courant qu'une simple FK         | Risque de mauvaise compréhension par un futur développeur        | Documenté en détail dans ADR-0016 et dans le code (commentaires), spike reproductible conservé |
| Recherche floue sur `medecins` à volume réaliste                        | Même limite RLS/index GIN déjà connue pour Patient (issue #23)   | Mesurer dès TASK-046, ne pas supposer réglé                                                    |
| Liste contrôlée des spécialités non encore validée par le Product Owner | Retravail si la liste proposée est incomplète/incorrecte         | Signaler explicitement avant la migration (TASK-039), ne pas la figer sans validation          |

## Recommandation finale

Ordre de développement conseillé : **EA-010 → EA-011 → EA-012**, dans cet
ordre — chaque EA dépend structurellement de la précédente (le modèle avant la
sécurité, la sécurité avant l'API). Au sein d'EA-010, TASK-038 à TASK-041 sont
strictement séquentielles (chacune dépend de la précédente). EA-011 et EA-012
peuvent partiellement se chevaucher (TASK-044, les permissions, ne dépend de
rien et peut démarrer en parallèle dès l'ouverture d'EA-010, comme cela avait
été fait pour Patient).

Aucun blocage identifié empêchant de démarrer le développement dès validation
de ce document.

---

**Fin de la Passe 2.** Cette spécification est soumise à validation avant
l'ouverture du développement TASK par TASK.
