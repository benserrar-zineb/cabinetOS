# ADR-0010 — Contrôle automatique des frontières de modules

**Statut** : Accepté

## Contexte

Le risque n°1 identifié pour le projet est l'érosion de la modularité : un monolithe
modulaire devient un bloc monolithique si rien ne l'en empêche activement. Un principe
écrit dans un document ne protège rien par lui-même.

## Décision

Trois contrôles automatiques, actifs dès la première TASK du projet, avant tout code
métier :

| Contrôle                                         | Outil                      | Effet                           |
| ------------------------------------------------ | -------------------------- | ------------------------------- |
| Règles d'import entre couches et modules         | `eslint-plugin-boundaries` | Échec du lint sur violation     |
| Interdiction d'importer les internes d'un module | `dependency-cruiser`       | Force le passage par `index.ts` |
| Absence de dépendance circulaire                 | `dependency-cruiser`       | Échec de la CI                  |

## Justification

- Ces contrôles sont installés en TASK-003, avant tout autre code — c'est le seul moment
  où c'est gratuit. Les imposer rétroactivement sur du code existant serait bien plus
  coûteux.
- Chaque règle est validée dans les deux sens : une dépendance interdite introduite
  volontairement doit faire échouer le lint et `dependency-cruiser` — vérifié
  concrètement en CI (TASK-018) par un cas de test délibérément invalide.
- Le même mécanisme a été réutilisé au-delà des frontières Core/Business/Integrations
  initialement prévues : TASK-014 y ajoute une règle spécifique interdisant tout import
  direct de l'API Better-Auth en dehors de son unique adaptateur, démontrant que
  l'outillage posé ici reste extensible à de nouvelles contraintes architecturales
  découvertes en cours de Build.

## Conséquences

- Toute nouvelle règle de frontière (comme celle ajoutée en TASK-014 pour Better-Auth)
  suit le même schéma : une règle dans `.dependency-cruiser.cjs`, validée par une
  violation volontaire introduite puis retirée, avant d'être considérée comme un test de
  frontières fiable.
- La CI bloque toute pull request violant ces règles — pas de fusion possible tant que
  les frontières ne sont pas respectées.

## Statut

Accepté. Confirmé le 28 juillet 2026. Mis en œuvre en TASK-003, étendu en TASK-014.
