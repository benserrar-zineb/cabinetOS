# CabinetOS — Note de clôture BUILD-001

**Core Platform Foundation · Decision Gate final**

## Statut

BUILD-001 est clos, sans réserve ouverte. État figé par le tag `build-001-closed`.
Dette tracée, convention d'organisation en place. Le socle est prêt à porter le
premier Build Business.

**Clôture** : 2 août 2026 — vit dans le dépôt (`docs/builds/`)

## Décision : BUILD-001 est clos

Le Gate final est franchi, sans réserve ouverte. Le socle est validé sur le fond, son
état exact est figé par le tag `build-001-closed`, sa dette est tracée et priorisée en
issues rattachées au milestone du Build Business, et sa convention d'organisation
(`docs/ORGANISATION.md`) est entrée dans le dépôt par le processus qu'elle décrit.

Ce qui a été vérifié sur le code, pas seulement sur le rapport : l'isolation à deux
couches (scoping applicatif + RLS) tient réellement, l'authentification s'intègre sans
trouer l'isolation, les frontières de modules sont verrouillées par l'outillage, et le
scénario d'accès inter-organisations est refusé — test à l'appui.

## Ce qui est acquis et ne se rediscute pas

Ces fondations sont posées. Le Build Business s'appuie dessus sans les rouvrir :

- La stack : NestJS 11, Next.js 16, PostgreSQL 18, Drizzle, Better-Auth. Onze ADR
  tracent chaque choix.
- L'isolation multi-tenant : base partagée, `organizationId`, double couche scoping +
  RLS, tests bloquants en CI.
- La structure en couches et les frontières de modules, contrôlées automatiquement.
- La chaîne de méthode : Vision → Build → Engineering Asset → TASK, et la convention
  d'organisation du dépôt.

## Ce qui est en dette, à traiter avant le code métier

Une seule dette est bloquante pour la suite, et elle doit être la première tâche du
Build Business, avant toute écriture métier :

**`audit_events` append-only au niveau base** (issue priorité haute). Aujourd'hui la
garantie n'existe qu'en l'absence de fonctions d'écriture côté code ; rien n'empêche un
`UPDATE`/`DELETE` direct. Une table d'audit doit être inaltérable au niveau base
(`REVOKE UPDATE, DELETE`) avant de contenir des données réelles — sinon sa valeur
probante est douteuse rétroactivement.

Les autres dettes (réexport des schémas Drizzle, MFA, Keycloak, migration NestJS v12)
sont tracées en issues, sans urgence, à traiter au fil des Builds.

## Le point de vigilance qui se réveille au Build Business

BUILD-001 a testé l'isolation ; le Build Business va l'éprouver pour de vrai. C'est la
différence essentielle à garder en tête.

Jusqu'ici, l'isolation était vérifiée par des tests qui posaient eux-mêmes le contexte
d'organisation. À partir des premiers modules métier — Patient, Dossier médical — c'est
du vrai code applicatif qui devra respecter le scoping sur chaque nouvelle table.
Chaque table métier portant un `organizationId` devra recevoir sa politique RLS et son
test d'isolation, au même standard que le Core. L'omission qu'on a rattrapée sur
`file_objects` (table scopée sans politique RLS) est exactement le type d'erreur qui se
reproduira si le réflexe n'est pas systématique.

Concrètement, pour chaque nouvelle table métier scopée : politique RLS dans la
migration, fonction d'accès passant par `withOrganizationScope`, et test d'isolation
ajouté à la suite bloquante. **Trois gestes, jamais un seul.**

## Prochaine étape

Ouvrir le premier Build Business selon le cycle éprouvé : RFA → Decision Gate → Passe 2
→ découpage en Engineering Assets et TASK. Le socle est prêt à le porter.
