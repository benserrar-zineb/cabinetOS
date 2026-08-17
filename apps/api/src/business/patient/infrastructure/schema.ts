import { relations } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  date,
  boolean,
  integer,
  pgEnum,
  timestamp,
  index,
  unique,
} from 'drizzle-orm/pg-core';
import { uuidv7 } from 'uuidv7';
import { organizations } from '../../../modules/organization';

// TASK-017 : table d identite (Passe 2, docs/specs/BUILD-002-patient.md). Scopee par
// organisation pour ce Build (ADR-0012) -- la table de relation cabinet-patient
// (patientRecords) et sa politique RLS arrivent en TASK-018/TASK-019, jamais mergees
// sans les trois gestes du point de vigilance de cloture BUILD-001.
//
// dateOfBirth + dateOfBirthUnknown : les deux colonnes sont nullable/optionnelle au
// niveau base (Q1 du Decision Gate) -- la regle "l un des deux obligatoire" est une
// validation applicative (TASK-022), jamais une contrainte de schema ici.
//
// cin, nationalHealthId : jamais obligatoires. L unicite partielle du CIN (scopee par
// organisation, Q2/ADR-0014) vit dans une migration custom (TASK-019), pas dans ce
// schema -- meme limite d outillage que le RLS existant (ADR-0006).
//
// ADR-0015 (revision de modele issue du maquettage, additive -- ne remet en cause ni
// EA-007 ni EA-008) :
// - city separee d address (address = rue/quartier, city = ville) ;
// - telephone structure : phoneCountryCode + phoneNationalNumber (zero national
//   retiré a la saisie, normalisation appliquee cote presentation/recherche,
//   TASK-026) -- remplace l ancienne colonne phone unique ;
// - couverture sante : coverageType (enum) + coverageNumber (numero d immatriculation
//   au regime). FRONTIERE NON NEGOCIABLE (Note de Vision) : jamais de montant, taux,
//   remboursement ou decompte ici -- c est une donnee de soin/identite (le fait
//   d etre couvert et par quel regime), pas une donnee commerciale/fiscale. Tout
//   calcul ou montant releve du futur module Facturation, hors de CabinetOS.

export const coverageTypeEnum = pgEnum('patient_coverage_type', [
  'cnss',
  'cnops',
  'amo',
  'mutuelle_privee',
  'sans',
]);

export const patients = pgTable(
  'patients',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    dateOfBirth: date('date_of_birth'),
    dateOfBirthUnknown: boolean('date_of_birth_unknown').notNull().default(false),
    sex: text('sex'),
    cin: text('cin'),
    nationalHealthId: text('national_health_id'), // Q7 : reserve, sans validation, sans usage
    phoneCountryCode: text('phone_country_code'), // ADR-0015 -- ex. '212'
    phoneNationalNumber: text('phone_national_number'), // ADR-0015 -- normalise, sans le 0 initial
    email: text('email'),
    address: text('address'), // ADR-0015 -- rue/quartier uniquement, city separee ci-dessous
    city: text('city'), // ADR-0015
    country: text('country'),
    language: text('language'),
    coverageType: coverageTypeEnum('coverage_type'), // ADR-0015 -- regime, jamais de montant
    coverageNumber: text('coverage_number'), // ADR-0015 -- numero d immatriculation au regime
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => [
    index('patients_organization_id_idx').on(table.organizationId),
    index('patients_cin_idx').on(table.organizationId, table.cin),
    index('patients_phone_idx').on(
      table.organizationId,
      table.phoneCountryCode,
      table.phoneNationalNumber,
    ),
  ],
);

// TASK-018 : table de relation cabinet-patient (ADR-0012) + compteur de numero de
// dossier par organisation. Statut a trois valeurs actees au Decision Gate (Q3) --
// un patient "deceased" ne doit jamais recevoir de rappel automatique (contrainte
// pour les futurs modules, ex. Agenda -- note du Gate, pas applique ici).
//
// patientRecordCounters : une SEQUENCE Postgres est globale et ne se remet jamais a
// zero par organisation -- ce compteur dedie permet un numero sequentiel propre a
// chaque organisation. La generation atomique (UPDATE ... RETURNING) arrive en
// TASK-020 ; ce schema ne fait que definir la table.
//
// responsiblePatientRecordId : auto-reference nullable (patient sans identite
// autonome, Q5). La garantie que le responsable partage le meme organizationId
// n est PAS portee par cette seule cle etrangere (Postgres ne le permet pas nativement
// entre deux colonnes d une meme table sans trigger) -- defense en profondeur prevue
// en TASK-021 (controle applicatif + trigger base), jamais laissee implicite.

export const patientRecordStatusEnum = pgEnum('patient_record_status', [
  'active',
  'archived',
  'deceased',
]);

export const patientRecordCounters = pgTable('patient_record_counters', {
  organizationId: uuid('organization_id')
    .primaryKey()
    .references(() => organizations.id),
  nextValue: integer('next_value').notNull().default(1),
});

export const patientRecords = pgTable(
  'patient_records',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    patientId: uuid('patient_id')
      .notNull()
      .references(() => patients.id),
    sequentialNumber: integer('sequential_number').notNull(),
    status: patientRecordStatusEnum('status').notNull().default('active'),
    attachedAt: timestamp('attached_at').defaultNow().notNull(),
    responsiblePatientRecordId: uuid('responsible_patient_record_id'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index('patient_records_organization_id_idx').on(table.organizationId),
    index('patient_records_patient_id_idx').on(table.patientId),
    unique('patient_records_org_sequential_unique').on(
      table.organizationId,
      table.sequentialNumber,
    ),
  ],
);

export const patientsRelations = relations(patients, ({ many }) => ({
  records: many(patientRecords),
}));

export const patientRecordsRelations = relations(patientRecords, ({ one }) => ({
  patient: one(patients, { fields: [patientRecords.patientId], references: [patients.id] }),
  responsible: one(patientRecords, {
    fields: [patientRecords.responsiblePatientRecordId],
    references: [patientRecords.id],
  }),
}));
