# ADR-0006 — Accès aux données : Drizzle ORM

**Statut** : Accepté — **ADR de révision**

Cet ADR révise une décision antérieure qui avait basculé vers du SQL 100% brut sans
repasser par le Decision Gate, en contournant la règle de continuité du RFA. La décision
ci-dessous a été rouverte et tranchée formellement le 28 juillet 2026.

## Contexte

Prisma présentait une friction réelle avec le RLS PostgreSQL (les politiques n'ont aucune
représentation dans son schéma) et une instabilité de trajectoire (Prisma 7 recommandé pour
la production sur un horizon de 12 mois seulement, avec une réécriture complète en accès
anticipé). Le repli prévu en Passe 1 pour ce cas précis était Drizzle. Une version
intermédiaire du projet avait écarté ce repli au profit de SQL brut généralisé, sans
comparaison formelle ni repassage devant le Gate — un écart de méthode corrigé ici.

| Critère             | Prisma (écarté) | SQL brut (écarté) | Drizzle (retenu)        |
| ------------------- | --------------- | ----------------- | ----------------------- |
| Friction RLS        | Réelle          | Nulle             | Faible — proche du SQL  |
| Sécurité injections | Automatique     | Manuelle          | Automatique (typée)     |
| Types               | Générés         | Écrits à la main  | Générés/inférés         |
| Migrations          | Intégrées       | Externes          | Intégrées (drizzle-kit) |
| Refactoring         | Sûr             | Non protégé       | Typé de bout en bout    |

## Décision

Accès aux données via Drizzle ORM (`drizzle-orm` + `drizzle-kit` pour les migrations),
avec le driver `pg` comme couche de connexion sous-jacente.

## Justification

- **Contrôle direct du cycle de transaction** : `db.transaction()` expose un accès direct
  à la connexion, permettant d'exécuter `SET LOCAL` (via `set_config`, paramétré) avant
  toute requête métier, dans la même transaction — validé concrètement par le spike
  TASK-008B.
- **Légèreté et requêtes SQL lisibles** : le query builder génère du SQL proche du SQL
  réellement exécuté, facilitant l'audit de sécurité — décisif pour un projet où
  l'isolation des données est la contrainte n°1.
- **Migrations en SQL brut versionnable** : `drizzle-kit generate` produit des fichiers
  `.sql` lisibles et modifiables à la main, y compris via `drizzle-kit generate --custom`
  pour des migrations qui ne dérivent pas du schéma — exactement le cas des politiques RLS.
- Le SQL brut supprimait la friction ponctuelle du démarrage au prix de deux coûts
  permanents (sécurité manuelle contre les injections, absence de typage) sur toute la
  durée du projet — un compromis disproportionné pour un socle censé durer.

## Découverte critique du spike TASK-008B

Indépendante du choix Drizzle/Prisma mais déterminante : **PostgreSQL fait toujours
contourner RLS aux rôles superutilisateurs, sans exception, même avec `FORCE ROW LEVEL
SECURITY`.** La configuration initiale faisait tourner l'application avec le rôle
`postgres` — RLS ne filtrait alors strictement rien. Corrigé par la création d'un rôle
applicatif dédié `cabinetos_app` (`NOSUPERUSER NOBYPASSRLS`). Détail complet et piège de
sauvegarde associé : `docs/adr/spike-drizzle-rls.md`.

## Conséquences

- Drizzle ne fournit aucune primitive pour définir des politiques RLS dans son schéma
  TypeScript — écrites en SQL brut, dans des migrations personnalisées, séparées des
  migrations de schéma générées automatiquement.
- Toute connexion applicative doit systématiquement utiliser un rôle non-superutilisateur
  — vérifié par un test dédié (TASK-011, TASK-010).
- Les sauvegardes/restaurations doivent explicitement utiliser un compte superutilisateur
  distinct, jamais le rôle applicatif — testé automatiquement (TASK-012).
- Repli en cas de blocage réel : SQL brut ciblé module par module, jamais généralisé sans
  nouvel ADR de révision — précisément la leçon de cet ADR.

## Alternatives non retenues

- **Prisma** : écarté pour le contrôle transactionnel plus rigide vis-à-vis de `SET
LOCAL`, sans compenser par un meilleur contrôle sur la gestion de RLS (même limitation
  que Drizzle sur ce point précis).
- **SQL brut sans ORM** : écarté pour la perte de sécurité de typage et la charge de
  maintenance des requêtes, disproportionnée face au gain de contrôle déjà obtenu avec
  Drizzle.

## Statut

Accepté. Révise et remplace la version SQL-brut antérieure de cet ADR. Mis en œuvre
intégralement en EA-003 (TASK-008B à TASK-012).
