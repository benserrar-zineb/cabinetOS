# CabinetOS — Note de Vision

## Données des professionnels & séquence des modules Business

*Quels modules, dans quel ordre, selon quelle règle de stockage.*

> **Niveau Vision — prime sur tout le reste.** Ce document prime sur les Builds, les Engineering Assets et les ADR. En cas de conflit, c'est la Vision qui fait foi. Il est cité par le RFA de chaque Build Business.

**Emplacement :** `docs/vision/CabinetOS-Vision-Donnees-modules-Business.md`

---

## 1. La phase qui s'ouvre

BUILD-001 est clos. Le socle porte l'authentification, l'isolation multi-tenant à deux couches, la structure modulaire et la CI. La phase Business commence : on construit les premiers modules métier sur ce socle.

Le cycle ne change pas. Chaque module suit l'enchaînement éprouvé sur BUILD-001 :

**RFA → Decision Gate → Passe 2 (ADR + spec) → découpage EA / TASK → développement → clôture**

Rien de la méthode n'est réinventé. Ce qui change, c'est que le code manipule désormais du vrai métier — et que l'isolation multi-tenant, jusqu'ici testée en vase clos, sera éprouvée par des données réelles.

## 2. La séquence des modules Business

L'ordre est décidé et ne se réordonne pas sans repasser par la Vision :

1. **Patient** → le centre de gravité : presque tout s'y rattache
2. **Médecin** → l'utilisateur central, émetteur des ordonnances
3. **Référentiel Médicaments** → catalogue partagé (donnée déjà disponible)
4. **Officine** → réception des ordonnances + gestion officine

La dépendance est unidirectionnelle, comme dans le socle (chapitre 8) : chaque module s'appuie sur les précédents, aucun ne dépend d'un suivant. On commence par Patient parce qu'il est la clé de voûte — le hub tourne autour du patient, et Médecin, Prescription, Officine viennent s'y rattacher.

**Ce que chaque module porte :**
- **Patient** — l'entité centrale : identité, dossier, historique. Fondation de tout le reste.
- **Médecin** — le professionnel émetteur, ses consultations, ses prescriptions.
- **Référentiel Médicaments** — le catalogue, exposé comme brique partagée que Prescription et Officine consommeront. Indépendant de tout.
- **Officine** — le pharmacien reçoit l'ordonnance (quel patient, quel médecin) et gère son activité. C'est l'aboutissement du flux, pas un module isolé.

Le fil qui les relie, c'est le **flux d'ordonnance** : le médecin prescrit → le patient transmet → l'officine reçoit. C'est l'incarnation de la Vision — le hub qui fait circuler l'information entre les entités autour du patient. L'officine y participe comme le feront plus tard la CNSS, le laboratoire, la radiologie : des nœuds greffés au socle, pas des logiciels séparés.

## 3. La règle de données — le principe fondateur

**CabinetOS stocke les données de soin et d'identité. Il ne stocke jamais les données commerciales et fiscales des professionnels.**

Cette frontière est un principe d'architecture permanent, pas une préférence :

| Nature de la donnée | Exemples | Stockage CabinetOS |
|---|---|---|
| **Soin & identité** | dossier patient, ordonnances, historique de traitement, comptes, connexions au réseau | **Oui** — dans la base, sur le socle existant |
| **Commercial & fiscal** | ventes, chiffre d'affaires, marges, stock valorisé, comptabilité de l'officine | **Jamais** — ne transite ni ne repose sur l'infrastructure CabinetOS |

**Pourquoi cette règle existe.** Le marché des officines est marqué par une perte de confiance : la solution dominante a donné accès aux données des pharmacies à l'administration fiscale. Notre positionnement inverse est un fait technique, pas une promesse juridique : on ne peut pas nous réquisitionner ce que nous n'avons jamais détenu. L'argument est le non-stockage par conception — « nous ne pouvons pas », et non « nous ne ferons pas ».

Cette distinction est capitale et doit guider chaque décision technique : le chiffrement ou l'effacement ne suffisent pas (une donnée qu'on peut déchiffrer, on peut la livrer). Seul le non-stockage tient. La donnée commerciale ne doit jamais arriver jusqu'à nos serveurs — pas en base, pas dans un log, pas dans un cache, pas dans une sauvegarde.

## 4. Le modèle de stockage commercial : BYOS

Les données commerciales suivent un modèle **BYOS — Bring Your Own Storage** : elles vivent dans le stockage cloud que le professionnel possède déjà (Google Drive, iCloud), sous son compte, jamais chez nous.

**Séparation identité / contenu — la clé du modèle :**
- **L'identité et la connexion au réseau** (compte, officine, plan, liens médecin/patient) → stockées chez nous, sur le socle. Ce ne sont pas des données fiscales. L'onboarding à distance opère sur cette couche : inscription en ligne, activation, connexion du compte Drive par OAuth.
- **Le contenu commercial** (ventes, stock, marges) → vit localement dans le navigateur du pharmacien (pour être requêtable et rapide), et se synchronise chiffré vers son Drive/iCloud personnel (pour la sauvegarde et le multi-poste). Nous ne le voyons jamais.

**Deux exigences non négociables du modèle :**
1. **Chiffrement côté client.** La donnée est chiffrée avant d'arriver sur le Drive, avec une clé que le professionnel contrôle — ni nous, ni Google, ni Apple ne peuvent la lire. Sinon on déplace le problème vers le fournisseur cloud au lieu de le supprimer.
2. **Le Drive est un coffre de synchronisation, pas une base.** La base requêtable est locale ; le Drive stocke des instantanés chiffrés qu'on pousse et récupère. La base n'est pas « sur le Drive » — elle est locale, le Drive la sauvegarde.

## 5. La réversibilité — garantie, décidée d'avance

Le BYOS est l'objectif, pas un pari sur lequel repose la sortie du module. Le stockage classique (dans la base CabinetOS) reste le chemin par défaut du socle — il sait déjà tout stocker avec isolation.

**Règle d'architecture :** le module Officine parle au stockage à travers une **interface abstraite** (même patron que `AuthProvider` dans BUILD-001, qui isole Better-Auth pour permettre un repli Keycloak). Derrière cette interface, on branche soit le BYOS, soit le stockage classique — sans réécrire le module.

**Conséquence :** le repli n'est pas une reprise, c'est un changement d'implémentation derrière une interface stable. Si le BYOS s'avère non fiable, on bascule sur le stockage classique : on perd l'argument souveraineté, on ne perd pas le module. Le pire scénario n'est pas « pas d'officine », c'est « officine sans l'argument anti-DGI ». Risque plafonné, acceptable.

## 6. Ce que le dev doit garder en tête dès maintenant

Même si l'Officine vient en dernier, ce principe contraint tous les modules :

- **Pour chaque table, se poser la question : soin/identité, ou commercial/fiscal ?** La réponse décide du stockage. C'est le même réflexe que l'isolation multi-tenant de BUILD-001 — une frontière à ne jamais franchir par accident.
- **Patient et Médecin doivent être conçus en sachant qu'ils alimenteront un flux d'ordonnance** vers une entité externe (l'officine). Pas besoin de le construire maintenant, mais le prévoir dans la modélisation évite d'y revenir.
- **Le point de vigilance isolation de la clôture BUILD-001 s'applique intégralement :** chaque nouvelle table métier scopée reçoit sa politique RLS, sa fonction scopée et son test d'isolation. Trois gestes, jamais un seul.

## 7. Condition à lever avant le module Officine

Le modèle BYOS ne se valide pas sur le papier. **Un spike est requis avant d'ouvrir le module Officine** — pas maintenant, puisqu'il vient en dernier. Il devra prouver quatre points :

1. Données locales requêtables et chiffrées dans le navigateur.
2. Synchronisation chiffrée vers le Drive/iCloud du professionnel (OAuth, push/pull d'instantanés).
3. Reprise sur un second poste depuis le Drive.
4. Résolution de conflits acceptable quand deux postes modifient en même temps — le point dur, à prouver en priorité.

**Règle de décision, écrite d'avance :** les quatre points passent → BYOS retenu, argument anti-DGI tenu. Le point 4 échoue → repli sur le stockage classique, sans rediscussion, l'Officine sort quand même. Le spike tranche ; la décision est déjà prise.

---

## Prochaine action

Ouvrir le RFA du module Patient, premier Build Business, en référençant cette note. La règle de données et la séquence y sont acquises ; le RFA porte sur ce qui est propre à Patient — modèle métier, workflows, endpoints.
