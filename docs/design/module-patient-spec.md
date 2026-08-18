# Spécification de design — Module Patient (création, consultation, recherche)

**Piloté par** : Product Owner. Décrit les intentions des trois écrans et accompagne
les maquettes HTML jointes (`mockups/`). Le développeur implémente et re-valide côté
serveur — les maquettes montrent le comportement voulu, pas du code à réutiliser.

## Principe transversal : deux utilisateurs, deux besoins opposés

La fiche patient sert deux usages contradictoires sur la même donnée :

- **La secrétaire saisit** — elle veut créer une fiche en quelques secondes, sans se
  battre avec le formulaire.
- **Le médecin lit** — il veut voir l'essentiel immédiatement, sans chercher.

Les trois écrans résolvent cette tension : l'écran de création optimise la saisie
rapide, l'écran de consultation optimise la lecture immédiate, l'écran de recherche
optimise le retrouver vite.

## Écran 1 — Création d'une fiche patient

**Utilisateur** : secrétaire. **Objectif** : créer une fiche exploitable en quelques
secondes.

Le noyau minimal, immédiatement visible : prénom, nom, date de naissance, téléphone.
Le curseur est placé d'emblée dans le premier champ. Tout le reste est replié.

La complétion est progressive — une fiche incomplète est valide. Les champs non
essentiels (e-mail, CIN, sexe, couverture, adresse, ville, pays, langue) sont
accessibles sous « Ajouter plus d'informations », repliés par défaut.

Les validations aident, elles ne bloquent jamais (sauf le minimum requis) :

- **Date de naissance** : requise, sauf si « date inconnue » est coché explicitement
  (Decision Gate Q1). Jamais de fiche sans date par simple oubli, jamais de fausse
  date de contournement.
- **CIN** : validation de format non bloquante (avertissement doux), normalisée en
  majuscules. Toujours optionnelle.
- **Téléphone** : sélecteur d'indicatif séparé (+212 par défaut), le zéro national
  initial est retiré automatiquement à la saisie. Avertissement doux si aberrant,
  jamais de blocage.
- **E-mail** : avertissement doux si la structure est manifestement incorrecte,
  jamais de blocage.
- **Couverture** : régime (CNSS / CNOPS / AMO / mutuelle privée / sans) ; le numéro
  d'immatriculation n'apparaît que si un régime est choisi.

La validation à la création ne refuse que si un champ vraiment requis manque :
prénom, nom, et une réponse sur la date de naissance (une date ou « inconnue »).

## Écran 2 — Consultation d'une fiche patient

**Utilisateur** : médecin. **Objectif** : voir l'essentiel immédiatement, démarrer la
consultation.

L'identité est réduite à un bandeau résumé, affiché une seule fois : nom, âge,
statut, téléphone, couverture, numéro de dossier — sur une ligne. Le détail identitaire
complet (naissance, sexe, CIN, e-mail, adresse, ville, pays, langue) est replié
derrière « Fiche complète », consulté rarement.

L'espace principal est donné à l'activité médicale, dimensionnée à sa vraie
importance — même si son contenu viendra des modules futurs. Zones présentes,
marquées « à venir » : Motif de la visite & contexte (la plus grande, en tête) ;
Dernière consultation & historique ; Ordonnances & rendez-vous ; Orientations &
recommandations.

Un seul écran, lecture par défaut, bascule modification via un bouton « Modifier ».

**Insight pour la roadmap** : cet écran est à ce stade majoritairement composé de
zones réservées. C'est assumé — il montre au médecin la structure de son futur poste
de travail, mais la valeur perçue par le médecin ne viendra qu'avec les modules
Consultation et Agenda. Le module Patient seul sert surtout la secrétaire.

## Écran 3 — Recherche & liste des patients

**Utilisateurs** : secrétaire et médecin. **Objectif** : retrouver un patient
instantanément.

Une barre unique, trois chemins détectés automatiquement (Decision Gate Q4) :

- **Nom / prénom** — tolérante : insensible à la casse et aux accents, partielle,
  ordre des mots indifférent. Absorbe les variantes de translittération
  (Fatma/Fatima, Benani/Bennani).
- **Téléphone** — exact ou par préfixe, sur forme normalisée (ADR-0015).
- **CIN** — exact, sur forme normalisée (majuscules, sans espaces).

Écran hybride : au repos, la liste des patients récents (jamais un écran vide) ; dès
qu'on tape, les résultats de recherche.

**Départage des homonymes** : chaque résultat affiche la date de naissance. Quand
plusieurs patients portent le même nom, une alerte invite à vérifier la date de
naissance pour choisir le bon.

## Ce qui relève du développeur, pas du design

- Toute validation montrée dans les maquettes doit être ré-implémentée côté serveur.
- La recherche tolérante et sa performance à l'échelle réelle sont un point de
  vigilance connu (TASK-026), mesuré sur volume réaliste.
- Les ajustements de modèle de données induits par ces écrans sont détaillés dans
  ADR-0015.
