import { pgTable, uuid, text, pgEnum, timestamp, index } from 'drizzle-orm/pg-core';
import { uuidv7 } from 'uuidv7';
import { organizations } from '../../../modules/organization';

// TASK-038 (BUILD-003, EA-010) : table d identite professionnelle (Passe 2,
// docs/specs/BUILD-003-medecin.md). Scopee par organisation (ADR-0016, meme
// principe que ADR-0012 pour Patient) -- le rattachement organisationnel n est PAS
// porte par une nouvelle table de relation ici : il est integralement porte par
// `memberships` (BUILD-001, existant). La cle etrangere composee
// (organizationId, userId) -> memberships(organizationId, userId), et le trigger
// de detachement qui va avec (spike resolu, voir ADR-0016), arrivent en TASK-040 --
// ce schema ne porte que les colonnes d identite.
//
// userId (nullable, text -- meme type que users.id, convention Better-Auth) :
// rempli = medecin-utilisateur ; vide = medecin externe ou rattachement retire
// (F.5, F.6). Aucune contrainte posee ici sur cette colonne, volontairement --
// TASK-040 l ajoute avec la cle composee.
//
// firstName, lastName, organizationId : seuls champs obligatoires (F.2). Tout le
// reste, y compris l identifiant professionnel, reste optionnel au niveau schema --
// toute exigence plus stricte serait une validation applicative (TASK-043), jamais
// une contrainte de colonne.
//
// inpe, numeroOrdre : jamais obligatoires (F.1, F.2, F.3). L unicite partielle
// scopee par organisation pour chacun (ADR-0018) vit dans une migration custom
// (TASK-039), pas dans ce schema -- meme limite d outillage que le RLS existant
// (ADR-0006), meme patron que le CIN chez Patient (ADR-0014).
//
// city, locationReference : city est un vrai champ structure (F.7), pas un texte
// libre depose sans intention -- contrairement a locationReference, qui reste
// reserve, sans logique, meme traitement que nationalHealthId chez Patient.
//
// FRONTIERE NON NEGOCIABLE (Note de Vision) : aucun champ de montant, honoraires,
// chiffre d affaires ou tarification ici -- l identite professionnelle est une
// donnee de soin/identite, jamais commerciale/fiscale. Tout calcul financier
// releve du futur module Facturation, hors de CabinetOS.

export const medecinSpecialtyEnum = pgEnum('medecin_specialty', [
  'cardiologie',
  'dermatologie',
  'endocrinologie_maladies_metaboliques',
  'gastro_enterologie',
  'gynecologie_obstetrique',
  'pediatrie',
  'pneumologie',
  'neurologie',
  'psychiatrie',
  'rhumatologie',
  'nephrologie',
  'urologie',
  'ophtalmologie',
  'orl',
  'chirurgie_generale',
  'chirurgie_orthopedique_traumatologie',
  'neurochirurgie',
  'chirurgie_cardiovasculaire_vasculaire',
  'chirurgie_plastique_reconstructrice_esthetique',
  'chirurgie_pediatrique',
  'anesthesie_reanimation',
  'oncologie_medicale',
  'radiotherapie_oncologie_radiotherapique',
  'hematologie',
  'medecine_interne',
  'maladies_infectieuses',
  'medecine_physique_readaptation',
  'medecine_travail',
  'medecine_legale',
  'radiologie_imagerie_medicale',
  'anatomie_pathologique',
  'biologie_medicale',
  'medecine_nucleaire',
  'geriatrie',
  'medecine_urgence',
  // Pas de code "medecine_generale" : l absence de specialite (NULL) signifie
  // generaliste (liste des specialites medicales, note d implementation --
  // fondement Article 16, loi 131-13 : un generaliste n est pas inscrit "comme
  // specialiste" au tableau de l Ordre).
]);

export const medecins = pgTable(
  'medecins',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    userId: text('user_id'), // TASK-040 : cle composee + trigger de detachement
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    specialty: medecinSpecialtyEnum('specialty'), // F.4 : 0 ou 1, jamais plusieurs
    inpe: text('inpe'), // F.1 : pivot du reseau, 9 chiffres, non obligatoire
    numeroOrdre: text('numero_ordre'), // F.1, F.3 : texte libre, aucune validation de format
    description: text('description'), // usage interne pour ce Build (F.4, competences reportees)
    phoneCountryCode: text('phone_country_code'),
    phoneNationalNumber: text('phone_national_number'),
    email: text('email'),
    city: text('city'), // F.7 : vrai champ structure, pas un texte libre
    locationReference: text('location_reference'), // reserve, sans logique
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => [
    index('medecins_organization_id_idx').on(table.organizationId),
    index('medecins_user_id_idx').on(table.organizationId, table.userId),
    index('medecins_inpe_idx').on(table.organizationId, table.inpe),
    index('medecins_numero_ordre_idx').on(table.organizationId, table.numeroOrdre),
  ],
);
