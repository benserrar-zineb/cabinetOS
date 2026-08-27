import { eq } from 'drizzle-orm';
import type { DatabaseService } from '../../../modules/shared/database/database.service';
import { medecins, medecinSpecialtyEnum } from './schema';

// TASK-041 (BUILD-003, EA-010) : fonctions d acces, toutes via withOrganizationScope
// (ADR-0005) -- aucun acces direct a tx/db hors de ce garde-fou, meme discipline que
// pour Patient (TASK-020).
//
// Contrairement a Patient, une seule table -- pas de "record" separe, pas de
// compteur de numero de dossier (le rattachement organisationnel vit dans
// memberships, ADR-0016 ; aucun geste de numerotation propre a medecins).
//
// Hors perimetre ici (arrive en TASK-043) : la validation/normalisation du format
// INPE. Ces fonctions acceptent la valeur telle que fournie par l appelant -- la
// couche de validation s enfichera par-dessus, meme patron que
// normalizeIdentityInput pour Patient.

export type MedecinSpecialty = (typeof medecinSpecialtyEnum.enumValues)[number];

export interface CreateMedecinInput {
  firstName: string;
  lastName: string;
  userId?: string;
  specialty?: MedecinSpecialty;
  inpe?: string;
  numeroOrdre?: string;
  description?: string;
  phoneCountryCode?: string;
  phoneNationalNumber?: string;
  email?: string;
  city?: string;
  locationReference?: string;
}

export type UpdateMedecinInput = Partial<CreateMedecinInput>;

export async function createMedecin(
  databaseService: DatabaseService,
  organizationId: string,
  data: CreateMedecinInput,
) {
  return databaseService.withOrganizationScope(organizationId, async (tx) => {
    const [medecin] = await tx
      .insert(medecins)
      .values({ ...data, organizationId })
      .returning();
    return medecin;
  });
}

export async function findMedecinById(
  databaseService: DatabaseService,
  organizationId: string,
  id: string,
) {
  return databaseService.withOrganizationScope(organizationId, async (tx) => {
    const [medecin] = await tx.select().from(medecins).where(eq(medecins.id, id));
    return medecin;
  });
}

export async function updateMedecin(
  databaseService: DatabaseService,
  organizationId: string,
  id: string,
  data: UpdateMedecinInput,
) {
  return databaseService.withOrganizationScope(organizationId, async (tx) => {
    const [updated] = await tx
      .update(medecins)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(medecins.id, id))
      .returning();
    return updated;
  });
}
