import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { sql } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { DatabaseService } from '../../src/modules/shared/database/database.service';
import { envValidationSchema } from '../../src/modules/shared/config/env.validation';
import { createOrganization } from '../../src/modules/organization/infrastructure/organization.queries';

// TASK-039 (BUILD-003, EA-010) : les trois index d unicite partiels demandes par le
// Gate (userId, inpe, numeroOrdre) -- scopes par organisation, jamais globaux
// (ADR-0018 pour inpe/numeroOrdre). Meme rigueur que l unicite CIN chez Patient
// (migration 0005) : verifie avec de vraies donnees, pas seulement lu dans le schema.

describe('Unicite scopee sur medecins (TASK-039)', () => {
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
      name: 'Medecin Unique Test Org A',
      slug: `medecin-unique-test-a-${Date.now()}`,
    });
    orgB = await createOrganization(databaseService, {
      name: 'Medecin Unique Test Org B',
      slug: `medecin-unique-test-b-${Date.now()}`,
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

  it('refuse deux fiches avec le meme INPE dans la meme organisation', async () => {
    await databaseService.withOrganizationScope(orgA.id, (tx) =>
      tx.execute(
        sql`INSERT INTO medecins (id, organization_id, first_name, last_name, inpe) VALUES (${uuidv7()}, ${orgA.id}, 'Ahmed', 'Premier', '111111111')`,
      ),
    );
    await expect(
      databaseService.withOrganizationScope(orgA.id, (tx) =>
        tx.execute(
          sql`INSERT INTO medecins (id, organization_id, first_name, last_name, inpe) VALUES (${uuidv7()}, ${orgA.id}, 'Karim', 'Deuxieme', '111111111')`,
        ),
      ),
    ).rejects.toMatchObject({ cause: { code: '23505' } });
  });

  it('accepte le meme INPE dans une AUTRE organisation (unicite jamais globale, ADR-0018)', async () => {
    await expect(
      databaseService.withOrganizationScope(orgB.id, (tx) =>
        tx.execute(
          sql`INSERT INTO medecins (id, organization_id, first_name, last_name, inpe) VALUES (${uuidv7()}, ${orgB.id}, 'Ahmed', 'CopieAutreOrg', '111111111')`,
        ),
      ),
    ).resolves.toBeDefined();
  });

  it('accepte plusieurs fiches sans INPE dans la meme organisation (optionnel, F.2)', async () => {
    await databaseService.withOrganizationScope(orgA.id, (tx) =>
      tx.execute(
        sql`INSERT INTO medecins (id, organization_id, first_name, last_name) VALUES (${uuidv7()}, ${orgA.id}, 'SansInpe1', 'Test')`,
      ),
    );
    await expect(
      databaseService.withOrganizationScope(orgA.id, (tx) =>
        tx.execute(
          sql`INSERT INTO medecins (id, organization_id, first_name, last_name) VALUES (${uuidv7()}, ${orgA.id}, 'SansInpe2', 'Test')`,
        ),
      ),
    ).resolves.toBeDefined();
  });

  it('refuse deux fiches avec le meme numero d Ordre dans la meme organisation', async () => {
    await databaseService.withOrganizationScope(orgA.id, (tx) =>
      tx.execute(
        sql`INSERT INTO medecins (id, organization_id, first_name, last_name, numero_ordre) VALUES (${uuidv7()}, ${orgA.id}, 'Fatima', 'Premiere', 'ORDRE-42')`,
      ),
    );
    await expect(
      databaseService.withOrganizationScope(orgA.id, (tx) =>
        tx.execute(
          sql`INSERT INTO medecins (id, organization_id, first_name, last_name, numero_ordre) VALUES (${uuidv7()}, ${orgA.id}, 'Nadia', 'Deuxieme', 'ORDRE-42')`,
        ),
      ),
    ).rejects.toMatchObject({ cause: { code: '23505' } });
  });
});
