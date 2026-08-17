import { eq, and, like } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import type { DatabaseService } from '../../../modules/shared/database/database.service';
import { patients } from './schema';
import { validateCin } from '../presentation/cin-validation';
import { normalizePhone } from '../presentation/phone-normalization';

// TASK-026 (BUILD-002, EA-009) : trois chemins de recherche distincts (Q4 du Decision
// Gate), chacun normalise cote saisie de la meme facon que cote stockage
// (patient.queries.ts) -- la comparaison se fait toujours sur des formes identiques.
//
// - Nom+prenom : chemin principal, floue (accents, casse, ordre, translitteration).
// - Telephone : exact/prefixe, apres normalisation (indicatif + numero national).
// - CIN : exact, sur la valeur normalisee (majuscules, sans espaces).

export interface PatientSearchResult {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
}

export async function searchPatientsByName(
  databaseService: DatabaseService,
  organizationId: string,
  query: string,
  limit = 20,
): Promise<PatientSearchResult[]> {
  return databaseService.withOrganizationScope(organizationId, async (tx) => {
    const result = await tx.execute(sql`
      SELECT id, first_name AS "firstName", last_name AS "lastName", date_of_birth AS "dateOfBirth",
        similarity(patient_search_unaccent(lower(first_name || ' ' || last_name)), patient_search_unaccent(lower(${query}))) AS score
      FROM patients
      WHERE organization_id = ${organizationId}
        AND patient_search_unaccent(lower(first_name || ' ' || last_name)) % patient_search_unaccent(lower(${query}))
      ORDER BY score DESC
      LIMIT ${limit}
    `);
    return result.rows as unknown as PatientSearchResult[];
  });
}

export async function findPatientsByPhone(
  databaseService: DatabaseService,
  organizationId: string,
  rawPhone: string,
) {
  const { countryCode, nationalNumber } = normalizePhone(rawPhone);
  return databaseService.withOrganizationScope(organizationId, (tx) =>
    tx
      .select()
      .from(patients)
      .where(
        and(
          eq(patients.organizationId, organizationId),
          eq(patients.phoneCountryCode, countryCode),
          like(patients.phoneNationalNumber, `${nationalNumber}%`),
        ),
      ),
  );
}

export async function findPatientsByCin(
  databaseService: DatabaseService,
  organizationId: string,
  rawCin: string,
) {
  const { normalized } = validateCin(rawCin);
  return databaseService.withOrganizationScope(organizationId, (tx) =>
    tx
      .select()
      .from(patients)
      .where(and(eq(patients.organizationId, organizationId), eq(patients.cin, normalized))),
  );
}
