import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { sql } from 'drizzle-orm';
import { DatabaseService } from '../../src/modules/shared/database/database.service';
import { envValidationSchema } from '../../src/modules/shared/config/env.validation';
import { createOrganization } from '../../src/modules/organization/infrastructure/organization.queries';
import {
  createMedecin,
  findMedecinById,
  updateMedecin,
} from '../../src/business/medecin/infrastructure/medecin.queries';

// TASK-041 (BUILD-003, EA-010) : fonctions d acces de base, meme discipline que
// patient.queries.spec.ts (TASK-020) -- toutes les fonctions passent par
// withOrganizationScope, verifie ici par un controle d isolation direct.

describe('medecin.queries (TASK-041)', () => {
  let moduleRef: TestingModule;
  let databaseService: DatabaseService;
  let orgA: { id: string };
  let orgB: { id: string };

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, validationSchema: envValidationSchema })],
      providers: [DatabaseService],
    }).compile();
    databaseService = moduleRef.get(DatabaseService);

    orgA = await createOrganization(databaseService, {
      name: 'Medecin Queries Test Org A',
      slug: `medecin-queries-test-a-${Date.now()}`,
    });
    orgB = await createOrganization(databaseService, {
      name: 'Medecin Queries Test Org B',
      slug: `medecin-queries-test-b-${Date.now()}`,
    });
  });

  afterAll(async () => {
    await databaseService.withOrganizationScope(orgA.id, (tx) =>
      tx.execute(sql`DELETE FROM medecins WHERE organization_id = ${orgA.id}`),
    );
    await databaseService.withOrganizationScope(orgB.id, (tx) =>
      tx.execute(sql`DELETE FROM medecins WHERE organization_id = ${orgB.id}`),
    );
    await databaseService.db.execute(
      sql`DELETE FROM organizations WHERE id IN (${orgA.id}, ${orgB.id})`,
    );
    await databaseService.onModuleDestroy();
  });

  it('cree une fiche minimale (prenom + nom uniquement, F.2)', async () => {
    const medecin = await createMedecin(databaseService, orgA.id, {
      firstName: 'Yasmine',
      lastName: 'Alaoui',
    });
    expect(medecin.id).toBeDefined();
    expect(medecin.organizationId).toBe(orgA.id);
    expect(medecin.firstName).toBe('Yasmine');
    expect(medecin.specialty).toBeNull();
  });

  it('retrouve une fiche par id, scope a son organisation', async () => {
    const created = await createMedecin(databaseService, orgA.id, {
      firstName: 'Karim',
      lastName: 'Benjelloun',
      specialty: 'cardiologie',
    });
    const found = await findMedecinById(databaseService, orgA.id, created.id);
    expect(found?.firstName).toBe('Karim');
    expect(found?.specialty).toBe('cardiologie');
  });

  it('ne retrouve pas une fiche depuis une AUTRE organisation (isolation)', async () => {
    const created = await createMedecin(databaseService, orgA.id, {
      firstName: 'Nadia',
      lastName: 'Fassi',
    });
    const foundFromOtherOrg = await findMedecinById(databaseService, orgB.id, created.id);
    expect(foundFromOtherOrg).toBeUndefined();
  });

  it('modifie une fiche existante (mise a jour partielle)', async () => {
    const created = await createMedecin(databaseService, orgA.id, {
      firstName: 'Hicham',
      lastName: 'Tazi',
    });
    const updated = await updateMedecin(databaseService, orgA.id, created.id, {
      city: 'Rabat',
      specialty: 'pediatrie',
    });
    expect(updated?.city).toBe('Rabat');
    expect(updated?.specialty).toBe('pediatrie');
    expect(updated?.firstName).toBe('Hicham'); // inchange
  });
});
