import { sql } from 'drizzle-orm';
import type { DatabaseService } from '../../../modules/shared/database/database.service';

// TASK-046 (BUILD-003, EA-012) : recherche floue sur nom+prenom (F.7), meme
// mecanisme que searchPatientsByName (TASK-026) -- insensible a la casse et aux
// accents, tolerante aux variantes de translitteration (pg_trgm + unaccent, deja
// actives, index dedie en migration 0015). search_unaccent() est reutilisee
// telle quelle (fonction generique, partagee avec Patient depuis TASK-026,
// renommee de patient_search_unaccent() a la validation d'EA-012 -- migration
// 0016 -- pour ne plus laisser croire qu elle serait specifique a Patient).
//
// F.7 : recherche par criteres combines (INPE, numeroOrdre) reportee au futur
// referencement -- seule la recherche par nom est dans le perimetre de ce Build.

export interface MedecinSearchResult {
  id: string;
  firstName: string;
  lastName: string;
  specialty: string | null;
}

export async function searchMedecinsByName(
  databaseService: DatabaseService,
  organizationId: string,
  query: string,
  limit = 20,
): Promise<MedecinSearchResult[]> {
  return databaseService.withOrganizationScope(organizationId, async (tx) => {
    const result = await tx.execute(sql`
      SELECT id, first_name AS "firstName", last_name AS "lastName", specialty,
        similarity(search_unaccent(lower(first_name || ' ' || last_name)), search_unaccent(lower(${query}))) AS score
      FROM medecins
      WHERE organization_id = ${organizationId}
        AND search_unaccent(lower(first_name || ' ' || last_name)) % search_unaccent(lower(${query}))
      ORDER BY score DESC
      LIMIT ${limit}
    `);
    return result.rows as unknown as MedecinSearchResult[];
  });
}
