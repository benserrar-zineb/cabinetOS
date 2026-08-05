# ADR-0007 — Authentification : Better-Auth, repli Keycloak

**Statut** : Accepté

## Contexte

L'authentification est le composant le plus sensible du socle, sur une librairie
nécessairement jeune : Lucia, l'alternative historique, est dépréciée depuis mars 2025 et
devenue une ressource pédagogique plutôt qu'une librairie active. La question n'est donc
plus « laquelle des deux librairies », mais « accepte-t-on une librairie jeune sur le
composant le plus sensible du socle, et avec quel repli ».

## Décision

Better-Auth 1.6.x, auto-hébergé, retenu pour l'authentification email/mot de passe.
Keycloak self-hosted est désigné comme repli explicite, avec l'obligation d'isoler
l'intégration Better-Auth derrière une interface applicative interne dès BUILD-001.

## Justification

- Auto-hébergé : pas de dépendance externe sur des données appelées à devenir sensibles
  (contrairement à Auth0/Clerk, écartés pour cette raison).
- Multi-organisation natif, correspondant exactement au modèle retenu (Membership
  many-to-many entre User et Organization).
- Plugins MFA disponibles sans réarchitecture — point d'extension préparé sans
  implémentation en BUILD-001 (Question 3 du Decision Gate).
- L'arrivée de l'équipe Auth.js dans le projet Better-Auth en septembre 2025 a renforcé sa
  crédibilité sur la durée.
- Une vulnérabilité (CVE-2025-61928, contournement d'authentification par clé d'API) a
  été identifiée et corrigée sur des versions antérieures à celle installée
  (1.6.25) ; elle concerne spécifiquement le plugin de clés API, non utilisé par
  BUILD-001 (authentification email/mot de passe uniquement) — sans impact sur ce socle,
  à surveiller au registre des risques pour tout usage futur de ce plugin.

## Mise en œuvre (TASK-013 à TASK-016)

- **TASK-013** : intégration Better-Auth au module Identity. Les vrais endpoints exposés
  suivent la convention propre de Better-Auth (`/sign-up/email`, `/sign-in/email`,
  `/sign-out`), montés via `toNodeHandler` directement sur l'instance Express sous-jacente
  (aucun adaptateur NestJS officiel n'existe pour Better-Auth à ce jour). Mot de passe
  haché conformément aux standards internes de la librairie.
- **TASK-014** : interface `AuthProvider` (`verifySession`, `revokeSession`), implémentée
  par un unique adaptateur (`BetterAuthProviderAdapter`). Deux règles `dependency-cruiser`
  garantissent qu'aucun autre fichier de l'application ne référence directement l'API
  Better-Auth ni le fichier d'instance — condition du repli Keycloak sans réécriture des
  modules consommateurs.
- **TASK-015** : le renouvellement automatique de session est un comportement **natif**
  de Better-Auth (option `updateAge`, activée par défaut) — vérifié empiriquement plutôt
  qu'implémenté. La révocation explicite passe par `AuthProvider.revokeSession()`,
  invalidant immédiatement la session sur la requête suivante, sans affecter les autres
  sessions du même utilisateur (révocation de masse explicitement hors périmètre).
- **TASK-016** : Guards NestJS (`PermissionsGuard`) appliqués globalement, fail-closed —
  un endpoint sans `@Public()` ni `@RequirePermission()` explicite est refusé par défaut.

## Conséquences

- Les tables Better-Auth (`users`, `sessions`, `accounts`, `verifications`) sont globales,
  sans `organizationId`, donc sans politique RLS — cohérent avec ADR-0005 : ce ne sont pas
  des « tables métier » au sens de la Section I du RFA.
- Le contexte d'organisation actif (« quel utilisateur, dans quelle organisation ») reste
  une résolution distincte de l'authentification elle-même, portée par l'en-tête
  `x-organization-id` et vérifiée par `PermissionsGuard` via la chaîne Membership → Role →
  Permission — point d'intégration identifié comme sensible dès la revue d'EA-003 et
  traité explicitement en TASK-016.
- Repli Keycloak : à activer si Better-Auth se révèle insuffisant sur la gestion des
  sessions ou la révocation, ou si son rythme de maintenance ralentit. L'interface
  `AuthProvider` rend ce remplacement possible à coût raisonnable — c'est la contrepartie
  du choix d'une librairie jeune.

## Statut

Accepté. Confirmé le 28 juillet 2026. Mis en œuvre intégralement en EA-004
(TASK-013 à TASK-016).
