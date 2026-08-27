import { eq } from 'drizzle-orm';
import type { DatabaseService } from '../../../modules/shared/database/database.service';
import { medecins, medecinSpecialtyEnum } from './schema';
import { validateInpe } from '../presentation/inpe-validation';

// TASK-041 (BUILD-003, EA-010) : fonctions d acces, toutes via withOrganizationScope
// (ADR-0005) -- aucun acces direct a tx/db hors de ce garde-fou, meme discipline que
// pour Patient (TASK-020).
//
// Contrairement a Patient, une seule table -- pas de "record" separe, pas de
// compteur de numero de dossier (le rattachement organisationnel vit dans
// memberships, ADR-0016 ; aucun geste de numerotation propre a medecins).
//
// TASK-043 : l INPE est normalise ICI, au moment de l ecriture -- jamais la valeur
// brute saisie. Meme discipline que le CIN/telephone pour Patient (TASK-026) :
// c est cette valeur normalisee qui garantit que l unicite scopee (TASK-039)
// retrouve la meme fiche quelle que soit la faaon dont l INPE a ete saisi.
// Jamais bloquant -- un format invalide est stocke quand meme (F.1, F.2).

function normalizeMedecinInput<T extends { inpe?: string }>(data: T): T {
  const normalized = { ...data };
  if (normalized.inpe) {
    normalized.inpe = validateInpe(normalized.inpe).normalized;
  }
  return normalized;
}

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
    const normalized = normalizeMedecinInput(data);
    const [medecin] = await tx
      .insert(medecins)
      .values({ ...normalized, organizationId })
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
    const normalized = normalizeMedecinInput(data);
    const [updated] = await tx
      .update(medecins)
      .set({ ...normalized, updatedAt: new Date() })
      .where(eq(medecins.id, id))
      .returning();
    return updated;
  });
}
