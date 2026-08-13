import { eq, sql } from 'drizzle-orm';
import type { DatabaseService } from '../../../modules/shared/database/database.service';
import { patients, patientRecords } from './schema';

// TASK-020 : fonctions d acces, toutes via withOrganizationScope (ADR-0005) -- aucun
// acces direct a tx/db hors de ce garde-fou, point de vigilance de cloture BUILD-001.
//
// La generation du numero de dossier (sequentialNumber) est une seule requete atomique
// (INSERT ... ON CONFLICT ... RETURNING), jamais un SELECT suivi d un UPDATE separe --
// deux creations concurrentes dans la meme organisation ne peuvent jamais recevoir le
// meme numero (teste explicitement, voir patient.queries.spec.ts).
//
// Hors perimetre ici (arrivent plus tard) : validation CIN/date de naissance
// (TASK-022).

export class ResponsibleRecordOrganizationMismatchError extends Error {
  constructor() {
    super('responsiblePatientRecordId must reference a patient record in the same organization');
    this.name = 'ResponsibleRecordOrganizationMismatchError';
  }
}

export interface CreatePatientInput {
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  dateOfBirthUnknown?: boolean;
  sex?: string;
  cin?: string;
  nationalHealthId?: string;
  phone?: string;
  email?: string;
  address?: string;
  country?: string;
  language?: string;
  responsiblePatientRecordId?: string;
}

export type UpdatePatientInput = Partial<Omit<CreatePatientInput, 'responsiblePatientRecordId'>>;

export async function createPatient(
  databaseService: DatabaseService,
  organizationId: string,
  data: CreatePatientInput,
) {
  return databaseService.withOrganizationScope(organizationId, async (tx) => {
    const { responsiblePatientRecordId, ...identity } = data;

    // TASK-021, couche applicative : verifie AVANT d ecrire, pour un message d erreur
    // exploitable (400 propre en TASK-025) -- le trigger base (0006) est la garantie
    // independante qui s applique meme si ce controle est court-circuite. Comme la
    // lecture se fait via withOrganizationScope, une ligne d une autre organisation
    // est deja invisible par RLS : "introuvable" ici signifie soit qu elle n existe
    // pas, soit qu elle appartient a une autre organisation -- les deux cas sont a
    // rejeter identiquement.
    if (responsiblePatientRecordId) {
      const [responsible] = await tx
        .select({ id: patientRecords.id })
        .from(patientRecords)
        .where(eq(patientRecords.id, responsiblePatientRecordId));
      if (!responsible) {
        throw new ResponsibleRecordOrganizationMismatchError();
      }
    }

    const [patient] = await tx
      .insert(patients)
      .values({ ...identity, organizationId })
      .returning();

    const counterResult = await tx.execute(sql`
      INSERT INTO patient_record_counters (organization_id, next_value)
      VALUES (${organizationId}, 2)
      ON CONFLICT (organization_id)
      DO UPDATE SET next_value = patient_record_counters.next_value + 1
      RETURNING next_value - 1 AS assigned
    `);
    const sequentialNumber = Number((counterResult.rows[0] as { assigned: number }).assigned);

    const [record] = await tx
      .insert(patientRecords)
      .values({
        organizationId,
        patientId: patient.id,
        sequentialNumber,
        responsiblePatientRecordId: responsiblePatientRecordId ?? null,
      })
      .returning();

    return { ...patient, record };
  });
}

export async function findPatientById(
  databaseService: DatabaseService,
  organizationId: string,
  id: string,
) {
  return databaseService.withOrganizationScope(organizationId, async (tx) => {
    const [patient] = await tx.select().from(patients).where(eq(patients.id, id));
    if (!patient) {
      return undefined;
    }
    const [record] = await tx.select().from(patientRecords).where(eq(patientRecords.patientId, id));
    return { ...patient, record };
  });
}

export async function updatePatient(
  databaseService: DatabaseService,
  organizationId: string,
  id: string,
  data: UpdatePatientInput,
) {
  return databaseService.withOrganizationScope(organizationId, async (tx) => {
    const [updated] = await tx
      .update(patients)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(patients.id, id))
      .returning();
    return updated;
  });
}

export async function updatePatientRecordStatus(
  databaseService: DatabaseService,
  organizationId: string,
  patientRecordId: string,
  status: 'active' | 'archived' | 'deceased',
) {
  return databaseService.withOrganizationScope(organizationId, async (tx) => {
    const [updated] = await tx
      .update(patientRecords)
      .set({ status, updatedAt: new Date() })
      .where(eq(patientRecords.id, patientRecordId))
      .returning();
    return updated;
  });
}
