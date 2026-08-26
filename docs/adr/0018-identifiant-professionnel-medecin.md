# ADR-0018 — Identifiant professionnel médecin (INPE / numéro d'Ordre)

**Statut** : Accepté (Decision Gate BUILD-003).

## Contexte

Comme la CIN pour Patient (ADR-0014), l'identifiant professionnel du médecin
est un futur pivot d'appariement transversal (Note de Vision — le hub, tous les
acteurs de santé). Deux identifiants coexistent au Maroc : l'INPE (ANAM,
9 chiffres, tous les acteurs de santé) et le numéro d'inscription à l'Ordre des
médecins.

## Décision

- Capturer les **deux champs** (`inpe`, `numeroOrdre`), tous deux optionnels
  (F.2).
- **INPE** : validation de **format** (9 chiffres), **non bloquante** —
  avertissement seulement, jamais de rejet. Normalisé avant stockage. Un seul
  INPE par fiche.
- **`numeroOrdre`** : texte libre, **aucune validation de format** pour ce
  Build (F.3) — aucune référence fiable sur sa structure. Une validation
  souple pourra être ajoutée par ADR de révision si un format constant est
  établi sur le terrain.
- **Unicité partielle scopée par organisation** pour chacun des deux champs
  quand renseignés (`UNIQUE(organizationId, inpe) WHERE inpe IS NOT NULL`, et
  de même pour `numeroOrdre`), **jamais d'unicité globale**.

## Justification

L'INPE est désigné par la Vision comme le pivot naturel du futur hub (il
identifie tous les acteurs de santé, pas seulement les médecins) — c'est donc
lui le candidat pivot, le numéro d'Ordre restant capturé en complément (utile
notamment pour les médecins publics sans INPE). Imposer une unicité globale
présumerait un appariement transversal non construit — piège identique à celui
déjà évité pour la CIN.

**Alternative écartée** : numéro d'Ordre comme pivot unique, INPE ignoré.
Écartée : la Vision désigne explicitement l'INPE comme identifiant transversal
du futur réseau (labos, officines compris) — l'ignorer coûterait cher à
rattraper.

## Conséquences

Le message d'erreur en cas de doublon dans une même organisation reste
générique (« déjà utilisé dans cette organisation »), jamais un détail
révélant l'existence de l'identifiant dans une autre organisation. Quand le
hub sera construit, l'unicité de l'INPE sera réévaluée à l'échelle globale par
un nouvel ADR de révision.
