import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { sql } from 'drizzle-orm';
import { DatabaseService } from '../../src/modules/shared/database/database.service';
import { envValidationSchema } from '../../src/modules/shared/config/env.validation';
import { createOrganization } from '../../src/modules/organization/infrastructure/organization.queries';
import { createMedecin } from '../../src/business/medecin/infrastructure/medecin.queries';
import { searchMedecinsByName } from '../../src/business/medecin/infrastructure/medecin-search.queries';

// TASK-046 (BUILD-003, EA-012) : meme discipline que patient-search.queries.spec.ts
// (TASK-026) -- le test doit prouver qu on TROUVE malgre la variation de forme, pas
// seulement le cas exact.

describe('medecin-search.queries (TASK-046)', () => {
  let moduleRef: TestingModule;
  let databaseService: DatabaseService;
  let org: { id: string };

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, validationSchema: envValidationSchema })],
      providers: [DatabaseService],
    }).compile();
    databaseService = moduleRef.get(DatabaseService);

    org = await createOrganization(databaseService, {
      name: 'Medecin Search Test Org',
      slug: `medecin-search-test-${Date.now()}`,
    });
  });

  afterAll(async () => {
    await databaseService.withOrganizationScope(org.id, (tx) =>
      tx.execute(sql`DELETE FROM medecins WHERE organization_id = ${org.id}`),
    );
    await databaseService.db.execute(sql`DELETE FROM organizations WHERE id = ${org.id}`);
    await databaseService.onModuleDestroy();
  });

  it('une saisie "fatma" (accent omis) retrouve "Fatima" (accent present)', async () => {
    await createMedecin(databaseService, org.id, { firstName: 'Fatima', lastName: 'Recherche1' });
    const results = await searchMedecinsByName(databaseService, org.id, 'fatma recherche1');
    expect(results.some((r) => r.firstName === 'Fatima' && r.lastName === 'Recherche1')).toBe(true);
  });

  it('une saisie avec une seule consonne ("Benani") retrouve "Bennani" (double consonne)', async () => {
    await createMedecin(databaseService, org.id, { firstName: 'Rachid', lastName: 'Bennani' });
    const results = await searchMedecinsByName(databaseService, org.id, 'rachid benani');
    expect(results.some((r) => r.lastName === 'Bennani')).toBe(true);
  });

  it('l ordre nom/prenom inverse retrouve tout de meme le medecin', async () => {
    await createMedecin(databaseService, org.id, { firstName: 'Karim', lastName: 'Alaoui' });
    const results = await searchMedecinsByName(databaseService, org.id, 'alaoui karim');
    expect(results.some((r) => r.firstName === 'Karim' && r.lastName === 'Alaoui')).toBe(true);
  });

  it('la recherche est scopee par organisation -- un medecin d une autre organisation n est jamais retrouve', async () => {
    const orgB = await createOrganization(databaseService, {
      name: 'Medecin Search Test Org B',
      slug: `medecin-search-test-b-${Date.now()}`,
    });
    await createMedecin(databaseService, orgB.id, { firstName: 'Autre', lastName: 'Organisation' });

    const results = await searchMedecinsByName(databaseService, org.id, 'autre organisation');
    expect(results).toHaveLength(0);

    await databaseService.withOrganizationScope(orgB.id, (tx) =>
      tx.execute(sql`DELETE FROM medecins WHERE organization_id = ${orgB.id}`),
    );
    await databaseService.db.execute(sql`DELETE FROM organizations WHERE id = ${orgB.id}`);
  });
});
