# ADR-0014 — Unicité et validation du CIN

**Statut** : Accepté (Decision Gate BUILD-002).

## Contexte

Le CIN est un futur pivot d'appariement transversal (Note de Vision, §3) mais n'est
exploité comme tel dans aucun Build actuel. Le RFA nomme explicitement le piège de
l'unicité prématurée.

## Décision

- **Validation** : format `^[A-Za-z]{1,2}[0-9]+$`, vérifié à la saisie, **non
  bloquant** (avertissement affiché, jamais de rejet). Normalisation systématique en
  majuscules, sans espaces, avant stockage et avant tout contrôle d'unicité. Aucune
  validation de la longueur des chiffres, aucune liste de lettres régionales valides.
- **Unicité** : contrainte partielle scopée par organisation —
  `UNIQUE (organization_id, cin) WHERE cin IS NOT NULL`. Jamais d'unicité globale.

## Justification

Une unicité globale imposerait de facto un appariement transversal non voulu
maintenant : deux organisations ne pourraient jamais avoir chacune un patient portant
le même CIN réel, alors que ce sont deux identités distinctes tant que le
rattachement transversal n'existe pas (ADR-0012). La validation non bloquante évite de
rejeter des CIN réels mais atypiques (formats hérités, préfixes rares) — un CIN mal
formé reste une donnée acceptée, avec un avertissement, jamais un blocage de la
création de fiche.

## Conséquences

- Le message d'erreur en cas de doublon dans une même organisation reste générique
  (« CIN déjà utilisé dans cette organisation ») — jamais de détail qui laisserait
  deviner l'existence d'un CIN dans une *autre* organisation.
- Quand le CIN deviendra le pivot transversal, l'unicité sera réévaluée à l'échelle
  globale par un nouvel ADR de révision — jamais par une migration silencieuse.
