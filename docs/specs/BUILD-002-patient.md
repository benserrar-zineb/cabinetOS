# RFA — Module Patient (BUILD-002)

**État** : Passe 1 soumise, en attente du Decision Gate.
**Réfère** : `docs/vision/CabinetOS-Vision-Donnees-modules-Business.md`, ADR-0005, ADR-0008,
docs/builds/BUILD-001-cloture.md (point de vigilance isolation).

---

## Section A — Résumé exécutif

Le module Patient distingue deux objets jusqu'ici confondus : **l'identité de la
personne** (qui elle est) et **la relation cabinet-patient** (le fait qu'elle soit
patiente de ce cabinet — numéro de dossier, statut). Cette séparation est la décision
structurante de ce RFA.

Décision clé proposée : pour ce Build, **les deux entités restent scopées par
organisation**, comme tout le reste du socle. L'identité n'est pas rendue globale
maintenant — le rattachement transversal entre organisations reste explicitement
reporté (Note de Vision, §3). Séparer les deux objets dès maintenant, même tous deux
scopés, prépare une migration additive vers un modèle transversal plus tard, sans
détricoter une table fusionnée.

Risques principaux identifiés :
- L'unicité prématurée du CIN à une échelle trop large (nommé explicitement par le RFA
  comme piège à éviter).
- La validation du format de CIN, si elle est trop stricte, peut rejeter des cas réels
  légitimes (voir question ouverte, Section F).
- Le patient sans identité autonome (dépendant) doit être modélisé sans dupliquer la
  logique ni créer un objet à part.

Rien dans cette proposition ne construit le rattachement transversal, le compte
patient, ni aucun des points listés « reporté » par le RFA — ils restent nommés, pas
anticipés.

---

## Section B — Modèle de données proposé

Deux tables, toutes deux scopées par organisation pour ce Build :

### `patients` — l'identité

| Champ | Type | Obligatoire | Notes |
|---|---|---|---|
| `id` | uuid | oui | `uuidv7()`, comme le reste du socle |
| `organizationId` | uuid | oui | scopé — voir Section C, décision 1 |
| `firstName` | text | **oui** | seul champ obligatoire avec `lastName` |
| `lastName` | text | **oui** | |
| `dateOfBirth` | date | non | voir question ouverte F.1 |
| `sex` | text | non | champ libre, non contraint en enum à ce stade |
| `cin` | text | non | jamais obligatoire ; format vérifié en Section C |
| `phone` | text | non | donnée de contact, pas un identifiant de connexion |
| `email` | text | non | idem |
| `address` | text | non | |
| `country` | text | non | |
| `language` | text | non | |
| `createdAt` / `updatedAt` / `deletedAt` | timestamp | auto | pattern déjà en place (`organizations`) |

### `patientRecords` — la relation cabinet-patient

| Champ | Type | Obligatoire | Notes |
|---|---|---|---|
| `id` | uuid | oui | |
| `organizationId` | uuid | oui | doit être identique à celui du `patient` référencé |
| `patientId` | uuid → `patients.id` | oui | |
| `internalNumber` | text | auto-généré | voir question ouverte F.6 |
| `status` | enum | auto (`active`) | valeurs exactes : question ouverte F.3 |
| `attachedAt` | timestamp | auto (`now()`) | date de rattachement |
| `responsiblePatientRecordId` | uuid → `patientRecords.id`, nullable | non | patient sans identité autonome, voir décision 5 |
| `createdAt` / `updatedAt` | timestamp | auto | |

**Schéma textuel :**

```
patients (identité)                    patientRecords (relation)
├─ id ─────────────────────────┐       ├─ id
├─ organizationId               │       ├─ organizationId (= celui du patient)
├─ firstName, lastName          └──────>├─ patientId
├─ dateOfBirth, sex, cin                ├─ internalNumber, status, attachedAt
├─ phone, email, address                ├─ responsiblePatientRecordId ──┐
└─ country, language                    └────────────────────────┬─────┘
                                                                    (self, même organisation)
```

**Le patient sans identité autonome** (nourrisson, personne dépendante) reçoit sa
propre ligne `patients` (prénom, nom, date de naissance si connue — CIN et contact non
requis) et sa propre ligne `patientRecords`, dont `responsiblePatientRecordId` pointe
vers le dossier du responsable, patient du même cabinet. Aucune table ni logique
séparée pour ce cas — c'est une variante du même modèle.

**Le CIN comme futur pivot** : capturé comme simple attribut de `patients`, sans usage
d'appariement à ce stade. Rien dans ce modèle n'empêche, plus tard, d'ajouter un
mécanisme d'appariement séparé — voir décision 4 (Section C) sur l'unicité.

**Ce que l'API expose comme ressource unique** (`/api/v1/patients`) correspond à une
vue combinant `patients` + `patientRecords` de l'organisation courante — la séparation
en deux tables est un détail d'implémentation, pas une exposition à l'appelant.

---

## Section C — Décisions de conception

### 1. Identité scopée par organisation, ou globale ?

- **Décision** : scopée par organisation, comme toute table Core (ADR-0005).
- **Justification** : le rattachement transversal est explicitement reporté (Note de
  Vision, §3, §6). Rendre l'identité globale maintenant introduirait une table sans
  RLS dans un système dont la garantie centrale est le RLS — un risque de sécurité pour
  un bénéfice qui n'existe pas encore. La cohérence avec le modèle déjà audité
  (spike-drizzle-rls, vigilance isolation de clôture BUILD-001) prime.
- **Alternative écartée** : identité globale, sans `organizationId`. Écartée car elle
  demanderait un mécanisme de contrôle d'accès parallèle au RLS existant, jamais
  éprouvé, pour anticiper une fonctionnalité (rattachement transversal) que la Vision
  reporte explicitement.
- **Condition de réexamen** : quand le rattachement transversal sera mis au chantier,
  un ADR de révision tranchera — jamais une migration silencieuse.

### 2. Séparer identité et relation, même si les deux sont scopées

- **Décision** : oui, deux tables distinctes dès ce Build.
- **Justification** : (a) deux cycles de vie différents — l'identité d'une personne ne
  change pas quand son statut de patiente change ; (b) le patient sans identité
  autonome référence un responsable au niveau de la *relation*, sans dupliquer la
  logique d'identité ; (c) une future migration vers une identité partagée entre
  organisations devient additive (on ajoute un mécanisme d'appariement) plutôt que
  destructive (on détricote une table fusionnée qui contient aussi des données de
  dossier local).
- **Alternative écartée** : table unique `patients` avec tous les champs. Plus simple
  aujourd'hui, mais capitalise une dette de migration certaine dès que le rattachement
  transversal sera construit.
- **Condition de réexamen** : si la Passe 2 révèle un coût de jointure disproportionné
  pour les usages réels (recherche, affichage) — à mesurer, pas à supposer.

### 3. Validation du format du CIN

- **Décision** : contrôle de format à la saisie, non strictement bloquant (avertissement
  plutôt que rejet pour les formats hérités non reconnus) — le CIN reste dans tous les
  cas optionnel.
- **Justification** : un rejet strict risquerait d'empêcher la création d'une fiche pour
  un CIN réel mais atypique (anciens formats, préfixes régionaux).
- **Alternative écartée** : validation stricte bloquante sans marge.
- **Point non tranché ici** : le format exact à vérifier — voir question ouverte F.2, je
  n'ai pas de référence fiable à appliquer sans risquer de me tromper sur une règle
  administrative que je ne maîtrise pas avec certitude.

### 4. Unicité du CIN

- **Décision** : contrainte d'unicité **partielle et scopée par organisation**
  (`unique (organizationId, cin) WHERE cin IS NOT NULL`), jamais globale.
- **Justification** : une unicité globale imposerait de facto un appariement
  transversal non voulu maintenant — deux organisations ne pourraient jamais avoir
  chacune un patient portant le même CIN réel, alors que ce sont deux identités
  distinctes tant que le transversal n'existe pas. C'est exactement le piège que le
  RFA nomme (« attention au piège de l'unicité prématurée »).
- **Alternative écartée** : unicité globale sur `cin`.
- **Condition de réexamen** : quand le CIN devient le pivot transversal, l'unicité sera
  réévaluée à l'échelle globale, via un nouvel ADR — sciemment, pas par effet de bord.

### 5. Représentation du patient sans identité autonome

- **Décision** : ligne `patients` propre (prénom, nom, date de naissance si connue) +
  ligne `patientRecords` propre, avec `responsiblePatientRecordId` vers le dossier du
  responsable — voir Section B.
- **Justification** : pas de logique dupliquée, pas d'« identité vide » à modéliser à
  part ; le responsable est déjà représenté puisqu'il est lui-même patient du cabinet.
- **Alternative écartée** : table séparée « dépendants ». Écartée — duplique le modèle
  pour une variante du même objet.
- **Condition de réexamen** : si un dépendant doit être rattaché à un responsable qui
  n'est *pas* lui-même patient du cabinet (tuteur externe sans dossier) — non couvert
  ici, voir question ouverte F.5.

### 6. Champs obligatoires au minimum

- **Décision** : `firstName` + `lastName` à la création. Rien d'autre requis côté
  relation (numéro auto-généré, statut par défaut, date de rattachement = maintenant).
  Tout le reste complétable plus tard.
- **Justification** : répond directement à l'exigence de saisie rapide par la
  secrétaire (RFA, « L'ergonomie comme exigence de premier plan »).
- **Point non tranché ici** : rendre la date de naissance obligatoire aurait une
  portée médicale/légale que je ne dois pas trancher seule — voir question ouverte F.1.

### 7. Permissions déclarées

- **Décision** : deux permissions minimum sur la ressource `patients`, selon la
  convention action/resource déjà en place dans l'Access Control —
  `RequirePermission('manage', 'patients')` et `RequirePermission('read', 'patients')`,
  au même modèle que l'exemple existant (`RequirePermission('read', 'members')`).
- **Justification** : couvre directement les deux profils d'usage nommés par le RFA
  (celui qui saisit, celui qui lit), sans redéfinir l'Access Control existant.
- **Alternative écartée** : granularité plus fine (permission séparée pour la
  recherche, par exemple). Écartée pour rester minimal jusqu'à preuve d'un besoin réel.

### 8. Surface publique du module (`index.ts`)

- **Décision** : exposer le schéma (`patients`, `patientRecords` + relations, pour
  permettre les FK depuis d'autres modules, comme c'est déjà le cas pour
  `organizations`/`users`), une fonction de lecture par id et une par organisation, et
  un type minimal `PatientSummary` (id, nom affichable, numéro de dossier) destiné aux
  futurs modules Agenda / Consultation / Prescription pour référencer une fiche sans
  dépendre du modèle interne complet.
- **Justification** : répond au point « ancrages futurs » du RFA sans anticiper ces
  modules — ils consommeront une surface stable et minimale.
- **Aucune fonction d'écriture n'est exposée hors du module** : création/modification
  restent internes, accessibles seulement via le contrôleur du module Patient.

### 9. API (aperçu — le détail relève de la Passe 2)

Endpoints envisagés, dans les conventions déjà fixées par ADR-0008 (préfixe
`/api/v1/`, ressource plurielle en kebab-case, enveloppe `{ data, meta }` /
`{ error }`, pagination par curseur) :

- `POST /api/v1/patients` — création
- `GET /api/v1/patients/:id` — lecture (vue combinée identité + relation)
- `PATCH /api/v1/patients/:id` — modification
- `GET /api/v1/patients?search=...&cursor=...` — recherche/liste, geste le plus
  fréquent du médecin selon le RFA — champs de recherche exacts : voir question
  ouverte F.4.

---

## Section D — Isolation & sécurité

Deux tables scopées par organisation : `patients`, `patientRecords`. Chacune reçoit
les trois gestes du point de vigilance de clôture BUILD-001 :

1. **Politique RLS dans la migration** — même patron que les cinq tables déjà
   protégées (`memberships`, `settings`, `audit_events`, `notifications`,
   `file_objects`) :
   ```sql
   ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
   ALTER TABLE patients FORCE ROW LEVEL SECURITY;
   CREATE POLICY patients_isolation ON patients
     USING (organization_id = nullif(current_setting('app.organization_id', true), '')::uuid);
   -- meme politique, nommee patient_records_isolation, sur patientRecords
   ```
2. **Fonction d'accès via `withOrganizationScope`** — toute requête sur `patients` ou
   `patientRecords` passe par `DatabaseService.withOrganizationScope`, au même modèle
   que `audit-event.queries.ts` / `organization.queries.ts`. Aucun accès direct au
   `db` en dehors du module (frontière déjà imposée par `dependency-cruiser`).
3. **Test d'isolation dans la suite bloquante** — au minimum : un patient créé dans
   l'organisation A n'est jamais visible scopé sur l'organisation B (lecture), et un
   test de contournement RLS brut (sans passer par l'application), au même modèle que
   `tests/isolation/rls-bypass-attempts.spec.ts` et `missing-context.spec.ts`.

**Points d'attention spécifiques à ce module** (au-delà des trois gestes) :

- L'index d'unicité partiel sur `(organizationId, cin)` (décision C.4) doit renvoyer un
  message d'erreur générique (« CIN déjà utilisé dans cette organisation ») — jamais
  de détail qui laisserait deviner l'existence d'un CIN dans une *autre* organisation.
- `responsiblePatientRecordId` référence `patientRecords.id` sans garantie native que
  la ligne référencée partage le même `organizationId` — une simple clé étrangère ne
  l'impose pas. À traiter explicitement en Passe 2 (contrainte applicative ou
  contrainte de base), pas laissé implicite.

---

## Section E — ADR à venir (après le Gate)

- **ADR — Distinction identité / relation cabinet-patient**, référençant les décisions
  C.1 et C.2 de ce RFA.
- **ADR — Périmètre reporté du module Patient**, nommant explicitement : compte
  patient (connexion, mot de passe, MFA), paiement et facturation côté patient,
  préférences de compte, documents chiffrés côté patient, prise de RDV en ligne,
  gestion des proches en libre-service, appariement transversal de l'identité entre
  organisations et le compte patient qui l'agrège, vérification d'identité (SMS, etc.).
- **ADR — Unicité et validation du CIN**, référençant les décisions C.3 et C.4.

---

## Section F — Questions ouvertes (décision du Product Owner requise)

Aucune réponse métier n'a été supposée ci-dessus pour ces points :

1. **Date de naissance obligatoire ou non ?** Elle a une portée médicale/légale que je
   ne dois pas trancher seule. Rester optionnelle (comme les autres attributs
   secondaires), ou l'imposer dès la création ?

2. **Format exact du CIN marocain à valider.** Je n'ai pas de référence officielle
   fiable pour fixer une règle (lettres/chiffres, longueur, variantes historiques)
   sans risquer de rejeter des CIN légitimes. Qui peut fournir la règle exacte, ou une
   source à laquelle m'aligner ?

3. **Valeurs exactes du statut de la relation cabinet-patient** (`active` / `archivé` /
   autre chose ?), et qui peut faire la transition — la permission `manage` suffit-elle,
   ou faut-il une permission dédiée pour changer un statut ?

4. **Champs de recherche prioritaires pour le médecin** : nom, CIN, numéro de dossier,
   téléphone — dans quel ordre de priorité ? Ça conditionne les index à créer et les
   filtres exposés par l'API de recherche (même si l'écran lui-même reste hors
   périmètre de ce RFA).

5. **Le dépendant peut-il être rattaché à un responsable qui n'est pas lui-même
   patient du cabinet** (tuteur externe, sans dossier propre) ? Le RFA ne le précise
   pas explicitement.

6. **Le numéro de dossier interne doit-il suivre un format imposé** (certains cabinets
   ont déjà une numérotation papier existante à respecter), ou un simple identifiant
   auto-généré suffit-il pour ce Build ?

---

*Fin de la Passe 1. La Passe 2 (ADR rédigés, schéma Drizzle détaillé, migrations RLS,
API détaillée, découpage EA/TASK) est bloquée jusqu'au Decision Gate sur les points
ci-dessus, et sur le modèle de données (Sections B et C.1/C.2 en particulier).*

---

## Decision Gate — décisions actées

Validées par l'encadrant, tranchant les sept questions ouvertes de la Passe 1. Ces
décisions font foi ; toute évolution ultérieure passe par un ADR de révision, jamais en
silence (règle de continuité, `docs/ORGANISATION.md`).

| # | Décision actée |
|---|---|
| Q1 | `dateOfBirth` requise à la création, sauf case explicite « date inconnue » cochée. Nullable en base, mais validation applicative exigeant l'un ou l'autre — jamais les deux vides. |
| Q2 | Format CIN : `^[A-Za-z]{1,2}[0-9]+$`. Non bloquant (avertissement seulement). Normalisation en majuscules avant stockage et avant tout contrôle d'unicité. Pas de validation de longueur ni de liste régionale. |
| Q3 | Statut de la relation : `active` (défaut) / `archived` / `deceased`. Transition couverte par la permission `manage` existante, pas de permission dédiée. Un patient `deceased` ne doit jamais recevoir de rappel automatique (contrainte pour les futurs modules, ex. Agenda). |
| Q4 | Recherche à trois chemins : nom+prénom (principal, floue, insensible casse/accents, ordre indifférent), téléphone (exact/préfixe), CIN (exact, sur valeur normalisée). Résultats affichant la date de naissance pour départager les homonymes. |
| Q5 | Deux cas distincts : dépendant médical → responsable = patient du même cabinet (déjà modélisé, Passe 1). Responsable externe (tuteur non patient) → reporté, contournement par fiche minimale en attendant. Gestion de RDV déléguée entre comptes patients → entièrement reportée au futur module Compte Patient + Agenda, nommée dans l'ADR de périmètre reporté. |
| Q6 | Numéro de dossier : identifiant unique généré par le système (pas de compteur métier construit ici), habillé selon un format choisi par le cabinet parmi quelques options prédéfinies. Numérotation séquentielle « lisible » et reprise de numérotation papier reportées. Unicité garantie dans tous les cas. |
| Q7 | Champ `nationalHealthId` réservé sur `patients` : nullable, optionnel, distinct du CIN, sans validation ni logique. Documenté comme place réservée dans l'ADR de périmètre reporté. |

---

# PASSE 2 — Spécification & découpage

## Rappel de la décision validée

Le modèle retenu (Passe 1, confirmé sans réserve au Gate) : deux tables scopées par
organisation — `patients` (identité) et `patientRecords` (relation cabinet-patient) —,
séparées dès ce Build pour préparer une migration additive vers un modèle transversal
futur, sans en construire aucune pièce maintenant. Les sept clarifications du Gate
(tableau ci-dessus) affinent ce modèle sans le remettre en cause.

> **Correction (constatée à l'ouverture du développement, TASK-017)** : les chemins de
> fichiers ci-dessous indiquaient initialement `apps/api/src/modules/patient/`. Erreur
> corrigée : ADR-0004 réserve `src/modules/` au Core Platform ; le module Patient, premier
> module Business, vit dans `apps/api/src/business/patient/` — l'emplacement que
> l'ADR annonçait « créé vide le jour où un premier module Business apparaîtra ».
> Correction de forme, aucune décision de fond ne change.

## ADR rédigés

### ADR-0012 — Distinction identité / relation cabinet-patient

**Statut** : Accepté (Decision Gate BUILD-002).

**Contexte**

Le module Patient doit représenter à la fois « qui est cette personne » et « le fait
qu'elle soit patiente de ce cabinet ». La Note de Vision (§6) reporte le rattachement
transversal entre organisations, mais demande que le modèle le prépare sans le
construire. ADR-0005 impose que toute donnée scopée porte un `organizationId` protégé
par RLS.

**Décision**

Deux tables : `patients` (identité — nom, prénom, date de naissance, CIN, contact,
adresse) et `patientRecords` (relation — numéro de dossier, statut, date de
rattachement, responsable éventuel). **Les deux restent scopées par `organizationId`
pour ce Build** — l'identité n'est pas rendue globale.

**Justification**

- Cohérence avec ADR-0005 : aucune table scopée n'échappe au RLS sans raison
  documentée et validée ; le rattachement transversal, seul cas où l'identité globale
  aurait un sens, est explicitement hors périmètre.
- Séparer les deux objets même tous deux scopés isole deux cycles de vie différents et
  rend la future migration vers une identité partagée additive (on ajoute un mécanisme
  d'appariement) plutôt que destructive (on détricote une table fusionnée).
- Permet de représenter le patient sans identité autonome (dépendant) au niveau de la
  relation, sans dupliquer la logique d'identité.

**Conséquences**

- Toute lecture combinée (API `GET /api/v1/patients/:id`) fait une jointure entre
  `patients` et `patientRecords` — l'appelant ne voit qu'une ressource `patients`
  unique ; la séparation en deux tables est un détail d'implémentation.
- Le jour où le rattachement transversal sera construit, cet ADR sera révisé
  explicitement (nouvel ADR de révision), pas contourné par un ajout silencieux de
  colonne.

**Alternative écartée** : table unique fusionnant identité et relation. Plus simple
immédiatement, mais capitalise une dette de migration certaine.

---

### ADR-0013 — Périmètre reporté du module Patient

**Statut** : Accepté (Decision Gate BUILD-002).

**Contexte**

Le RFA nomme explicitement plusieurs capacités hors périmètre de ce Build, et le Gate
en a ajouté deux (Q5 second cas, Q7). Nommer une porte plutôt que la fermer par oubli
est la règle du dépôt (`docs/ORGANISATION.md`, principe « une chose = un seul endroit »).

**Décision**

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

**Justification**

Chacun de ces points touche une brique non construite (compte patient, Agenda) ou une
fonctionnalité dont le besoin réel n'est pas prouvé (numérotation papier spécifique).
Les nommer maintenant évite qu'ils soient rediscutés dans un an comme si personne n'y
avait pensé (`docs/ORGANISATION.md`, règle d'or).

**Conséquences**

- Le modèle d'identité (`patients`) ne doit rien anticiper de la relation
  « compte ↔ compte » du point 10 — mais ne doit rien non plus lui rendre impossible.
  Vérifié : aucune contrainte du modèle actuel ne bloque l'ajout futur d'un compte
  patient référençant un `patients.id`.
- Toute reprise d'un des douze points ci-dessus ouvre un nouveau RFA de module ou un
  ADR de révision — jamais un ajout silencieux.

---

### ADR-0014 — Unicité et validation du CIN

**Statut** : Accepté (Decision Gate BUILD-002).

**Contexte**

Le CIN est un futur pivot d'appariement transversal (Note de Vision, §3) mais n'est
exploité comme tel dans aucun Build actuel. Le RFA nomme explicitement le piège de
l'unicité prématurée.

**Décision**

- **Validation** : format `^[A-Za-z]{1,2}[0-9]+$`, vérifié à la saisie, **non
  bloquant** (avertissement affiché, jamais de rejet). Normalisation systématique en
  majuscules avant stockage et avant tout contrôle d'unicité. Aucune validation de la
  longueur des chiffres, aucune liste de lettres régionales valides.
- **Unicité** : contrainte partielle scopée par organisation —
  `UNIQUE (organization_id, cin) WHERE cin IS NOT NULL`. Jamais d'unicité globale.

**Justification**

Une unicité globale imposerait de facto un appariement transversal non voulu
maintenant : deux organisations ne pourraient jamais avoir chacune un patient portant
le même CIN réel, alors que ce sont deux identités distinctes tant que le
rattachement transversal n'existe pas (ADR-0012). La validation non bloquante évite de
rejeter des CIN réels mais atypiques (formats hérités, préfixes rares) — un CIN mal
formé reste une donnée acceptée, avec un avertissement, jamais un blocage de la
création de fiche.

**Conséquences**

- Le message d'erreur en cas de doublon dans une même organisation reste générique
  (« CIN déjà utilisé dans cette organisation ») — jamais de détail qui laisserait
  deviner l'existence d'un CIN dans une *autre* organisation (Section D, Passe 1).
- Quand le CIN deviendra le pivot transversal, l'unicité sera réévaluée à l'échelle
  globale par un nouvel ADR de révision — jamais par une migration silencieuse.

---

## Modèle de données détaillé

### Schéma Drizzle — `patients`

```typescript
// apps/api/src/business/patient/infrastructure/schema.ts
import { relations } from 'drizzle-orm';
import { pgTable, uuid, text, date, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { uuidv7 } from 'uuidv7';
import { organizations } from '../../organization';

export const patients = pgTable(
  'patients',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    dateOfBirth: date('date_of_birth'),
    dateOfBirthUnknown: boolean('date_of_birth_unknown').notNull().default(false),
    sex: text('sex'),
    cin: text('cin'),
    nationalHealthId: text('national_health_id'), // Q7 : reserve, sans validation, sans usage
    phone: text('phone'),
    email: text('email'),
    address: text('address'),
    country: text('country'),
    language: text('language'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => [
    index('patients_organization_id_idx').on(table.organizationId),
    index('patients_cin_idx').on(table.organizationId, table.cin),
    index('patients_phone_idx').on(table.organizationId, table.phone),
  ],
);
```

**Note d'outillage** (même limite déjà documentée par ADR-0006 pour le RLS) :
l'index d'unicité partielle sur le CIN (`WHERE cin IS NOT NULL`) n'est pas exprimable
dans le DSL Drizzle — il vit dans une migration custom (`drizzle-kit generate
--custom`), comme les politiques RLS existantes.

### Schéma Drizzle — `patientRecords`

```typescript
import { relations } from 'drizzle-orm';
import { pgTable, uuid, integer, pgEnum, timestamp, index, unique } from 'drizzle-orm/pg-core';
import { uuidv7 } from 'uuidv7';
import { organizations } from '../../organization';
import { patients } from './schema';

export const patientRecordStatusEnum = pgEnum('patient_record_status', [
  'active',
  'archived',
  'deceased',
]);

// Compteur par organisation : garantit un numero sequentiel sans SEQUENCE globale
// (une SEQUENCE Postgres ne se remet jamais a zero par organisation).
export const patientRecordCounters = pgTable('patient_record_counters', {
  organizationId: uuid('organization_id')
    .primaryKey()
    .references(() => organizations.id),
  nextValue: integer('next_value').notNull().default(1),
});

export const patientRecords = pgTable(
  'patient_records',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    patientId: uuid('patient_id')
      .notNull()
      .references(() => patients.id),
    sequentialNumber: integer('sequential_number').notNull(),
    status: patientRecordStatusEnum('status').notNull().default('active'),
    attachedAt: timestamp('attached_at').defaultNow().notNull(),
    responsiblePatientRecordId: uuid('responsible_patient_record_id'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index('patient_records_organization_id_idx').on(table.organizationId),
    index('patient_records_patient_id_idx').on(table.patientId),
    unique('patient_records_org_sequential_unique').on(
      table.organizationId,
      table.sequentialNumber,
    ),
  ],
);

export const patientsRelations = relations(patients, ({ many }) => ({
  records: many(patientRecords),
}));

export const patientRecordsRelations = relations(patientRecords, ({ one }) => ({
  patient: one(patients, { fields: [patientRecords.patientId], references: [patients.id] }),
  responsible: one(patientRecords, {
    fields: [patientRecords.responsiblePatientRecordId],
    references: [patientRecords.id],
  }),
}));
```

**Génération du numéro** : dans la même transaction `withOrganizationScope` que la
création du dossier, `UPDATE patient_record_counters SET next_value = next_value + 1
WHERE organization_id = $1 RETURNING next_value - 1` — atomique, sans course possible
entre deux créations concurrentes dans la même organisation.

**Format d'affichage (Q6)** : préférence stockée via le module `settings` déjà
existant (clé `patient.internalNumberFormat`, valeurs prédéfinies : `simple` /
`prefixed` / `year-based`) — pas de nouvelle colonne ni de nouvelle table pour ce
réglage, réutilisation de l'`index.ts` public de Settings (`upsertSetting`,
`findSettingByKey`), jamais d'accès direct à sa table depuis le module Patient.

### Migrations RLS (custom, même patron que l'existant)

```sql
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients FORCE ROW LEVEL SECURITY;
CREATE POLICY patients_isolation ON patients
  USING (organization_id = nullif(current_setting('app.organization_id', true), '')::uuid);

ALTER TABLE patient_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_records FORCE ROW LEVEL SECURITY;
CREATE POLICY patient_records_isolation ON patient_records
  USING (organization_id = nullif(current_setting('app.organization_id', true), '')::uuid);

-- Unicite partielle du CIN, scopee par organisation (decision ADR-0014)
CREATE UNIQUE INDEX patients_org_cin_unique
  ON patients (organization_id, cin) WHERE cin IS NOT NULL;

-- Contrainte "meme organisation" pour le responsable (defense en profondeur, cote base --
-- la clef etrangere seule ne garantit pas que responsible_patient_record_id partage le
-- meme organization_id que la ligne qui le reference)
CREATE OR REPLACE FUNCTION check_responsible_same_organization()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.responsible_patient_record_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM patient_records
      WHERE id = NEW.responsible_patient_record_id
        AND organization_id = NEW.organization_id
    ) THEN
      RAISE EXCEPTION
        'responsible_patient_record_id must reference a patient_record in the same organization';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER patient_records_responsible_same_org
  BEFORE INSERT OR UPDATE ON patient_records
  FOR EACH ROW EXECUTE FUNCTION check_responsible_same_organization();

-- Extensions pour la recherche floue nom/prenom (Q4)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE INDEX patients_name_trgm_idx ON patients
  USING gin (unaccent(lower(first_name || ' ' || last_name)) gin_trgm_ops);
```

Cette contrainte de trigger est **une deuxième couche**, indépendante du contrôle
applicatif prévu côté service (qui doit rejeter la même situation *avant* d'atteindre
la base, pour un message d'erreur exploitable) — même philosophie de défense en
profondeur qu'ADR-0005 pour l'isolation.

## API détaillée

Conventions ADR-0008 (`/api/v1/`, kebab-case pluriel, `{ data, meta }` / `{ error }`,
pagination par curseur, ISO 8601 UTC).

| Méthode | Route | Permission | Description |
|---|---|---|---|
| `POST` | `/api/v1/patients` | `manage` | Crée l'identité + le dossier |
| `GET` | `/api/v1/patients/:id` | `read` | Vue combinée identité + dossier |
| `PATCH` | `/api/v1/patients/:id` | `manage` | Modifie identité et/ou statut |
| `GET` | `/api/v1/patients?q=` | `read` | Recherche floue nom+prénom (Q4) |
| `GET` | `/api/v1/patients?phone=` | `read` | Recherche exacte/préfixe téléphone (Q4) |
| `GET` | `/api/v1/patients?cin=` | `read` | Recherche exacte CIN normalisé (Q4) |

*Les trois routes de recherche acceptent aussi `&cursor=` (pagination par curseur,
ADR-0008).*

**Réponse `GET /api/v1/patients/:id`** (forme, pas le DTO final — détail en TASK) :

```json
{
  "data": {
    "id": "...",
    "firstName": "Fatima",
    "lastName": "...",
    "dateOfBirth": "1990-01-01",
    "dateOfBirthUnknown": false,
    "cin": "AB123456",
    "nationalHealthId": null,
    "record": {
      "id": "...",
      "displayNumber": "2026-014",
      "status": "active",
      "attachedAt": "2026-08-12T10:00:00Z",
      "responsiblePatientRecordId": null
    }
  },
  "meta": {}
}
```

**Erreurs nommées** :
- `409` — CIN déjà utilisé dans cette organisation (message générique, Section D
  Passe 1).
- `400` — validation échouée (ex. ni `dateOfBirth` ni `dateOfBirthUnknown`, ou
  `responsiblePatientRecordId` d'une autre organisation détecté côté application avant
  la base).
- Résultats de recherche incluant systématiquement `dateOfBirth` pour départager les
  homonymes (Q4).

## Sécurité

- Les trois gestes du point de vigilance BUILD-001, pour `patients` et
  `patientRecords` : politique RLS (ci-dessus), fonctions d'accès exclusivement via
  `withOrganizationScope`, tests d'isolation dédiés (liste en TASK-023).
- Défense en profondeur sur `responsiblePatientRecordId` : contrôle applicatif +
  trigger base (ci-dessus) — deux couches indépendantes, comme le RLS et le scoping
  applicatif.
- CIN : normalisation majuscule avant toute comparaison ou stockage ; message
  d'erreur de doublon générique, jamais révélateur d'une autre organisation.
- Recherche : les extensions `pg_trgm`/`unaccent` opèrent sur des données déjà filtrées
  par RLS — aucune fuite possible entre organisations via la recherche floue.

## Découpage en Engineering Assets et TASK

*C'est le livrable central de cette Passe — chaque TASK suit le format imposé par le
RFA : identifiant, EA parent, objectif, dépendances, livrable, critères d'acceptation,
tests, hors périmètre.*

### EA-007 — Modèle de données Patient

#### TASK-017 — Schéma Drizzle `patients`

- **EA parent** : EA-007
- **Objectif** : définir la table d'identité, avec ses index (organisation, CIN,
  téléphone).
- **Dépendances** : aucune.
- **Livrable** : `apps/api/src/business/patient/infrastructure/schema.ts` (partie
  `patients`).
- **Critères d'acceptation** : `pnpm run db:check` passe ; `firstName`/`lastName` non
  nullables, tous les autres champs métier nullables ; index présents sur
  `organizationId`, `(organizationId, cin)`, `(organizationId, phone)`.
- **Tests** : `apps/api/test/queries/patient.schema.spec.ts` — vérifie la nullabilité
  exacte de chaque colonne.
- **Hors périmètre** : la contrainte d'unicité partielle sur le CIN (TASK-019), la
  validation applicative du format (TASK-022).

#### TASK-018 — Schéma Drizzle `patientRecords` + compteur

- **EA parent** : EA-007
- **Objectif** : définir la table de relation, l'enum de statut, et la table de
  compteur par organisation.
- **Dépendances** : TASK-017 (référence `patients.id`).
- **Livrable** : `schema.ts` (partie `patientRecords`, `patientRecordCounters`,
  `patientRecordStatusEnum`) + relations Drizzle.
- **Critères d'acceptation** : `sequentialNumber` unique par `(organizationId,
  sequentialNumber)` ; `status` par défaut `active` ; `responsiblePatientRecordId`
  nullable, auto-référence.
- **Tests** : `patient.schema.spec.ts` (même fichier que TASK-017, étendu).
- **Hors périmètre** : la génération atomique du numéro (TASK-020), le format
  d'affichage (TASK-020 également, via Settings).

#### TASK-019 — Migration RLS + contraintes

- **EA parent** : EA-007
- **Objectif** : appliquer les deux politiques RLS, l'index d'unicité partielle du
  CIN, et enregistrer la migration via `drizzle-kit generate --custom`.
- **Dépendances** : TASK-017, TASK-018.
- **Livrable** : `db/migrations/000X_patient-rls-and-constraints.sql` (up + down
  documenté, même patron que `0003_audit-events-append-only.sql`).
- **Critères d'acceptation** : `patients` et `patient_records` avec
  `FORCE ROW LEVEL SECURITY` ; index `patients_org_cin_unique` présent ; migration
  réversible.
- **Tests** : vérification manuelle en base (`\d+ patients`, `\d+ patient_records`),
  comme fait pour `audit_events` (`\dp`).
- **Hors périmètre** : le trigger `responsiblePatientRecordId` (TASK-021), les
  extensions de recherche (TASK-026).

#### TASK-020 — Fonctions d'accès (queries)

- **EA parent** : EA-007
- **Objectif** : `createPatient` (transaction identité + dossier + génération
  atomique du numéro), `findPatientById`, `updatePatient`, toutes via
  `withOrganizationScope`.
- **Dépendances** : TASK-019.
- **Livrable** : `apps/api/src/business/patient/infrastructure/patient.queries.ts`.
- **Critères d'acceptation** : aucune fonction n'accède à `tx`/`db` hors
  `withOrganizationScope` ; la génération du numéro utilise
  `UPDATE ... RETURNING` atomique (pas de lecture puis écriture séparée).
- **Tests** : `apps/api/test/queries/patient.queries.spec.ts` — dont un test de
  création concurrente (deux créations simultanées dans la même organisation ne
  produisent jamais le même `sequentialNumber`).
- **Hors périmètre** : validation CIN/date de naissance (TASK-022), recherche
  (TASK-026).

### EA-008 — Isolation, sécurité & validation

#### TASK-021 — Contrainte same-org sur `responsiblePatientRecordId`

- **EA parent** : EA-008
- **Objectif** : trigger base + contrôle applicatif équivalent, comme documenté
  ci-dessus.
- **Dépendances** : TASK-018, TASK-020.
- **Livrable** : fonction + trigger SQL (ajoutés à la migration TASK-019 ou une
  migration dédiée), fonction applicative `assertResponsibleSameOrganization`.
- **Critères d'acceptation** : une tentative de lier un dossier à un responsable
  d'une autre organisation échoue **à la fois** côté application (400 propre) et,
  si on la contourne, côté base (le trigger lève une exception).
- **Tests** : deux tests distincts — un qui appelle la fonction applicative
  directement, un qui insère en SQL brut avec le rôle `cabinetos_app` en
  contournant l'application (même esprit que
  `tests/isolation/rls-bypass-attempts.spec.ts`).
- **Hors périmètre** : la logique métier de qui *peut* être responsable (âge,
  lien de parenté) — non demandée par le RFA.

#### TASK-022 — Validation CIN et date de naissance

- **EA parent** : EA-008
- **Objectif** : `validateCin` (regex Q2, normalisation majuscule, non bloquant),
  validation croisée `dateOfBirth`/`dateOfBirthUnknown` (Q1, l'un des deux
  obligatoire).
- **Dépendances** : TASK-017.
- **Livrable** : validateurs dans la couche présentation (DTO) du module Patient.
- **Critères d'acceptation** : un CIN mal formé est accepté avec un avertissement
  dans la réponse (jamais un `400`) ; une création sans `dateOfBirth` ni
  `dateOfBirthUnknown: true` est rejetée en `400`.
- **Tests** : cas limites — CIN sans lettre, CIN minuscule (doit être normalisé),
  CIN avec longueur inhabituelle (doit passer, seule la forme lettres+chiffres
  compte).
- **Hors périmètre** : liste de préfixes régionaux valides (explicitement exclue
  par Q2).

#### TASK-023 — Tests d'isolation dédiés

- **EA parent** : EA-008
- **Objectif** : suite bloquante prouvant l'isolation des deux tables, au même
  modèle que la suite existante.
- **Dépendances** : TASK-019, TASK-020.
- **Livrable** : `tests/isolation/patient-isolation.spec.ts`.
- **Critères d'acceptation** : couverture ≥ 90 % (seuil déjà en place,
  `jest.isolation.config.cjs`) ; au minimum, un patient créé dans l'organisation A
  n'est jamais visible scopé sur l'organisation B ; un contournement RLS brut
  (sans passer par l'application) échoue.
- **Tests** : le fichier lui-même est le livrable de test.
- **Hors périmètre** : les tests fonctionnels de validation métier (couverts en
  TASK-022).

### EA-009 — API & permissions

#### TASK-024 — Permissions `patients`

- **EA parent** : EA-009
- **Objectif** : déclarer `manage`/`read` sur la ressource `patients` dans
  l'Access Control existant (seed), sans redéfinir son fonctionnement.
- **Dépendances** : aucune (peut démarrer en parallèle d'EA-007).
- **Livrable** : entrée de seed/migration pour la table `permissions` existante.
- **Critères d'acceptation** : les deux permissions apparaissent dans
  `findAllPermissions()` ; aucune modification du schéma `access-control`.
- **Tests** : test existant `permission.queries.spec.ts` étendu, ou test dédié
  minimal.
- **Hors périmètre** : attribution de ces permissions à des rôles précis — décision
  de configuration laissée à chaque cabinet (Passe 1, décision C.7).

#### TASK-025 — Endpoints CRUD

- **EA parent** : EA-009
- **Objectif** : `POST`/`GET`/`PATCH /api/v1/patients(/:id)`, gardés par
  `RequirePermission`.
- **Dépendances** : TASK-020, TASK-022, TASK-024.
- **Livrable** : contrôleur + DTO du module Patient.
- **Critères d'acceptation** : enveloppe `{ data, meta }`/`{ error }` conforme
  ADR-0008 ; documentation OpenAPI générée sur `/api/docs` ; erreurs `409`/`400`
  telles que spécifiées ci-dessus.
- **Tests** : `apps/api/test/*.e2e-spec.ts` couvrant création, lecture, échec de
  permission (`403`), échec de validation (`400`), doublon CIN (`409`).
- **Hors périmètre** : recherche (TASK-026).

#### TASK-026 — Endpoint de recherche

- **EA parent** : EA-009
- **Objectif** : les trois chemins de recherche (Q4) — nom/prénom flou, téléphone,
  CIN — avec les extensions Postgres nécessaires.
- **Dépendances** : TASK-020, TASK-025.
- **Livrable** : extension de migration (`pg_trgm`, `unaccent`, index GIN),
  logique de recherche dans le contrôleur/queries.
- **Critères d'acceptation** : une recherche « fatma » retrouve « Fatima » ;
  une recherche « ali martin » retrouve « Martin Ali » (ordre indifférent) ;
  recherche téléphone par préfixe ; recherche CIN exacte sur valeur normalisée.
- **Tests** : jeu de cas concrets (accents, ordre inversé, préfixe téléphonique),
  mesuré sur un volume de données réaliste avant validation finale.
- **Hors périmètre** : tri par pertinence avancé au-delà de la similarité trigram
  de base.

#### TASK-027 — Surface publique du module (`index.ts`)

- **EA parent** : EA-009
- **Objectif** : exposer `patients`/`patientRecords` (schéma, pour les FK futures),
  `findPatientRecordById`, `findPatientRecordsByOrganization`, et le type
  `PatientSummary` (id, nom affichable, numéro affiché) pour les futurs modules
  Agenda/Consultation/Prescription.
- **Dépendances** : TASK-018, TASK-020.
- **Livrable** : `apps/api/src/business/patient/index.ts`.
- **Critères d'acceptation** : `dependency-cruiser` ne signale aucune violation ;
  aucune fonction d'écriture exportée hors du module.
- **Tests** : test de frontière (`check:architecture`) déjà bloquant en CI.
- **Hors périmètre** : consommation réelle par un futur module Agenda — pas
  construit dans ce Build.

### Ordre de dépendance résumé

```
TASK-017 -> TASK-018 -> TASK-019 -> TASK-020 -> TASK-021
                                              -> TASK-023
                                              -> TASK-025 -> TASK-026
TASK-024 -------------------------------------> TASK-025
TASK-018, TASK-020 --------------------------> TASK-027
TASK-022 ------------------------------------> TASK-025
```

Les tâches d'interface (écrans de saisie/consultation) ne sont pas découpées ici,
conformément à la note du RFA — elles relèvent du Product Owner, en aval de ce modèle.

## Registre des risques

| # | Risque | Sévérité | Mitigation |
|---|---|---|---|
| 1 | Pertinence/performance de la recherche floue à l'échelle réelle non mesurée | Moyenne | Mesurer sur un volume réaliste avant validation finale (TASK-026) ; trigram + GIN comme point de départ, pas une garantie définitive |
| 2 | Trigger base pour `responsiblePatientRecordId` ajoute de la complexité aux migrations | Faible | Test dédié au contournement direct (TASK-021), documentation du trigger dans la migration |
| 3 | Couplage inter-module vers `settings` pour le format d'affichage du numéro | Faible | Toujours via l'`index.ts` public de Settings, jamais d'accès direct à sa table (frontière déjà imposée par `dependency-cruiser`) |
| 4 | CIN non bloquant : un format erroné peut être enregistré tel quel | Faible, assumé | Décision actée au Gate (Q2), aucune mitigation supplémentaire attendue |
| 5 | Compteur séquentiel par organisation : contention possible en cas de créations concurrentes massives | Faible pour le volume attendu (cabinet médical) | `UPDATE ... RETURNING` atomique ; à réévaluer seulement si le volume réel le justifie |

## Recommandation finale

Le découpage ci-dessus (EA-007 à EA-009, onze TASK) est proposé comme périmètre de
développement pour ce Build. Ordre recommandé : EA-007 en premier (le modèle
conditionne tout le reste, comme souligné par l'encadrant), EA-008 immédiatement après
(sécurité avant toute écriture métier réelle, même logique que la dette
`audit_events`), EA-009 en dernier. TASK-024 (permissions) peut démarrer en parallèle
dès le début, n'ayant aucune dépendance.

Aucune ligne de code ni migration n'a été appliquée à ce stade — ce document est la
spécification à valider avant l'ouverture du développement, TASK par TASK.
