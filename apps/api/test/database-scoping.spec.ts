import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { sql } from 'drizzle-orm';
import { DatabaseService } from '../src/modules/shared/database/database.service';
import { envValidationSchema } from '../src/modules/shared/config/env.validation';

describe('DatabaseService - scoping applicatif (TASK-008)', () => {
  let moduleRef: TestingModule;
  let databaseService: DatabaseService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, validationSchema: envValidationSchema })],
      providers: [DatabaseService],
    }).compile();

    databaseService = moduleRef.get(DatabaseService);
  });

  afterAll(async () => {
    await databaseService.onModuleDestroy();
  });

  it('positionne app.organization_id et le propage a toutes les requetes de la transaction', async () => {
    const observed = await databaseService.withOrganizationScope('org-abc', async (tx) => {
      const result = await tx.execute(
        sql`SELECT current_setting(\'app.organization_id\', true) AS org`,
      );
      return (result.rows[0] as { org: string }).org;
    });

    expect(observed).toBe('org-abc');
  });

  it('refuse toute requete sans organizationId explicite', async () => {
    await expect(
      databaseService.withOrganizationScope('', async (tx) => {
        return tx.execute(sql`SELECT 1`);
      }),
    ).rejects.toThrow(/organizationId est requis/);
  });

  it('ne laisse fuir aucun contexte entre deux transactions concurrentes sur le pool', async () => {
    const runs = Array.from({ length: 10 }, (_, i) => `org-${i}`);

    const results = await Promise.all(
      runs.map((orgId) =>
        databaseService.withOrganizationScope(orgId, async (tx) => {
          await new Promise((resolve) => setTimeout(resolve, Math.random() * 20));
          const result = await tx.execute(
            sql`SELECT current_setting(\'app.organization_id\', true) AS org`,
          );
          return { expected: orgId, observed: (result.rows[0] as { org: string }).org };
        }),
      ),
    );

    for (const r of results) {
      expect(r.observed).toBe(r.expected);
    }
  });
});
