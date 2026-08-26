# ADR-0017 — Périmètre reporté du module Médecin

**Statut** : Accepté (Decision Gate BUILD-003).

## Contexte

Comme pour Patient (ADR-0013), le RFA et le Decision Gate nomment explicitement
plusieurs capacités hors périmètre de ce Build. Nommer une porte plutôt que la
fermer par oubli est la règle du dépôt.

## Décision

Sont explicitement reportés, sans être construits ni anticipés dans ce Build :

1. La **dimension publique** de la fiche médecin et le **référencement patient**
   (recherche par spécialité/ville, géolocalisation) — F.4, F.7.
2. La **création d'ordonnance** (module Prescription) — consomme la fiche
   médecin, ne la construit pas.
3. Les **orientations/recommandations** entre confrères (le hub) — F.5, dépend
   du dossier médical et du consentement.
4. La **facturation** et la **tarification** des organisations liées (module
   Facturation).
5. Le **partage de dossier inter-organisations** (le vrai transversal) — F.1,
   F.5.
6. Le **référentiel `MedicalSpecialty`** complet et versionné (code, nom FR/AR,
   source officielle Ordre/ANAM, version) — F.4. Une liste contrôlée simple
   suffit pour ce Build.
7. Les **compétences / qualifications structurées** (0..n) — F.4. Exprimables
   librement dans `description` pour l'instant.
8. La **distinction « parti » vs « jamais rattaché »** — F.6. L'identité
   survit toujours au départ (trigger de détachement, ADR-0016) ; aucun statut
   visible sur la fiche.
9. La **vérification d'identité professionnelle** (preuve d'inscription à
   l'Ordre, vérification INPE via annuaire ANAM) — F.2. Appartient au futur
   module d'accès / inscription des comptes.
10. La **recherche par critères combinables** (spécialité + ville) — F.7.
    Suppose un annuaire peuplé ; appartient au référencement / orientation.
11. La **validation de format du numéro d'Ordre** — F.3. Aucune référence
    fiable sur sa structure aujourd'hui ; pourra venir par ADR de révision si
    un format se révèle sur le terrain.

## Justification

Chacun de ces points touche une brique non construite (module d'accès,
Prescription, Orientation, Facturation, Settings) ou une donnée dont la
structure réelle n'est pas encore connue (référentiel spécialités, format
Ordre). Les nommer maintenant évite qu'ils soient rediscutés dans un an comme
si personne n'y avait pensé.

## Conséquences

Toute reprise d'un des points ci-dessus ouvre un nouveau RFA de module ou un
ADR de révision — jamais un ajout silencieux.
