# ADR-0015 — Révision du modèle Patient (suite au design des écrans)

**Statut** : Accepté. Additif — n'invalide ni EA-007 ni EA-008.

## Contexte

Le design des trois écrans du module Patient (création, consultation, recherche),
piloté par le Product Owner, a fait émerger cinq ajustements du modèle de données
spécifié en Passe 2. Ces ajustements sont additifs — ils ajoutent des champs et des
règles sans casser le modèle existant (EA-007) ni son isolation (EA-008).
Conformément à la règle de continuité, ils ne sont pas appliqués en silence : ils font
l'objet de la présente révision, intégrée au démarrage d'EA-009 (API & permissions) —
le moment où ces champs prennent leur sens.

## Décision

Cinq ajustements sont intégrés au modèle Patient :

1. **Ville séparée de l'adresse.** Colonne `city` distincte d'`address`. `address`
   conserve la rue / le quartier ; `city` porte la ville, destinée à une sélection
   dans une liste. Motif : la ville est une donnée structurée et réutilisable
   (filtres, statistiques, secteur), pas du texte libre.

2. **Téléphone structuré.** Le téléphone est stocké sous forme structurée : indicatif
   pays + numéro national. Le zéro national initial est retiré à la saisie
   (l'indicatif porte le pays). Deux colonnes (`phoneCountryCode`, `phoneNumber`) ou
   une convention normalisée équivalente, au choix du développeur — l'exigence est
   que la donnée soit normalisée, pas sa représentation exacte. *Implémenté avec
   `phoneCountryCode` / `phoneNationalNumber`.*

3. **Couverture / prise en charge.** `coverageType` (enum : `cnss` / `cnops` / `amo` /
   `mutuelle_privee` / `sans`) et `coverageNumber` (optionnel, texte).
   **Frontière stricte** — protège l'argument anti-DGI (Note de Vision) : le régime
   et le numéro d'immatriculation sont des données d'identité (qui prend en charge le
   patient) → stockés. Tout montant, taux, remboursement ou décompte est une donnée
   commerciale/fiscale → jamais stocké dans CabinetOS, relève du futur module
   Facturation. Aucun champ de ce type ne doit apparaître dans le modèle Patient.

4. **Normalisation de recherche sur les trois chemins.** La recherche compare des
   formes normalisées, identiques côté saisie et côté stockage :
   - Nom : insensible aux accents et à la casse, partiel (`unaccent` / trigram,
     Passe 2).
   - Téléphone : comparaison sans indicatif ni zéro national, des deux côtés — une
     saisie `0651…`, `651…`, `+212 651…` ou `00212 651…` doit trouver le même patient.
   - CIN : comparaison en majuscules sans espaces, des deux côtés (cohérent avec la
     normalisation au stockage décidée en ADR-0014).

   Ce point complète la décision Q4 : « recherche par téléphone / CIN » suppose une
   normalisation non triviale, révélée lors du maquettage. Sans elle, la recherche
   échoue sur des formes de saisie légitimes.

5. **Listes configurables — cible reportée nommée.** Les listes ville, langue et
   couverture ont vocation à devenir personnalisables par le cabinet, via le module
   Settings (futur espace admin). Aucune contrainte technique immédiate : des listes
   par défaut codées suffisent pour ce module. Rejoint la liste des cibles reportées
   (ADR-0013).

## Conséquences

- Migrations additives sur le schéma Patient (`city`, structure téléphone,
  `coverageType`, `coverageNumber`). Le point de vigilance isolation reste entier :
  ces colonnes s'ajoutent à des tables déjà scopées, aucune nouvelle table n'est créée.
- Validation serveur : les règles de format (téléphone, e-mail, CIN) et de
  normalisation de recherche sont implémentées et testées côté serveur,
  indépendamment de ce que montrent les maquettes.
- API (EA-009) : les endpoints de création / lecture / recherche intègrent ces champs
  et ces règles de normalisation.
- Aucun impact sur EA-007 (modèle de base) ni EA-008 (isolation, sécurité) déjà
  validés — ajustements strictement additifs.

## Alternatives écartées

- **Appliquer ces changements immédiatement (pendant EA-008)** : écarté — modifier le
  schéma pendant que l'isolation est sécurisée crée de la confusion et des reprises.
  On attend un modèle stable.
- **Coder la personnalisation des listes maintenant (point 5)** : écarté — alourdit le
  module pour un besoin non immédiat. Reporté à Settings.
- **Stocker la couverture avec ses montants** : écarté formellement — violerait la
  règle de non-stockage du commercial/fiscal (Note de Vision).
