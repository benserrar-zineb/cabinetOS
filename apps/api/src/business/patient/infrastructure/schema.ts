import { pgTable, uuid, text, date, boolean, timestamp, index } from 'drizzle-orm/pg-core';
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
    phone: text('phone'),
    email: text('email'),
    address: text('address'),
    country: text('country'),
    language: text('language'),
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
    index('patients_phone_idx').on(table.organizationId, table.phone),
  ],
);
