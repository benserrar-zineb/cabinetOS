# ADR-0002 — Framework frontend : Next.js 16, App Router

**Statut** : Accepté

## Contexte

Le brief exige un frontend en français par défaut, avec l'arabe et le support RTL préparés
(mais non implémentés) dès BUILD-001. Le RFA impose par ailleurs la cohérence TypeScript
avec le backend et un écosystème mature pour l'internationalisation.

La proposition initiale (Passe 1, version non corrigée) recommandait Next.js 14 — une
erreur factuelle : Next.js 14 est en fin de vie depuis le 26 octobre 2025 et ne reçoit plus
aucun correctif de sécurité, ce qui est inacceptable pour une plateforme appelée à traiter
des données de santé. Next.js 15 reste en support de maintenance jusqu'au 21 octobre 2026.

## Décision

Next.js 16.2.x (App Router) est retenu comme framework frontend, avec next-intl pour
l'internationalisation fr/ar et le support RTL.

## Justification

- Seule branche recevant activement les correctifs de sécurité au moment de la décision.
- Écosystème i18n/RTL mature (next-intl), directement aligné avec l'exigence du brief.
- Cohérence TypeScript de bout en bout avec le backend NestJS.
- Écosystème le plus large parmi les alternatives comparées (Angular, Vue/Nuxt), ce qui
  facilite la génération de code assistée par Claude et le recrutement futur.
- Angular a été écarté pour sa rigidité et son écosystème i18n moins souple. Vue/Nuxt a
  été écarté pour une communauté plus réduite, offrant moins de ressources tant pour
  Claude que pour le recrutement.

## Conséquences

- Le projet doit suivre le cycle de support actif de Next.js et ne jamais rester sur une
  branche en fin de vie — c'est précisément l'erreur que cette décision corrige par
  rapport à la proposition initiale.
- Un retour vers la 15 n'aurait de sens qu'en cas d'incompatibilité bloquante d'une
  dépendance, auquel cas c'est la dépendance elle-même qu'il faudrait remettre en cause,
  pas le choix de Next.js.
- TASK-007B a livré le squelette Next.js avec routing fr/ar fonctionnel et inversion RTL
  correcte de la mise en page ; la traduction complète du contenu reste hors périmètre de
  BUILD-001.

## Statut

Accepté. La mention « Active LTS » de la version initiale a été retirée lors de la
confirmation du 28 juillet 2026 : Next.js ne suit pas de canal LTS formalisé au sens
strict — formulation corrigée, décision inchangée.
