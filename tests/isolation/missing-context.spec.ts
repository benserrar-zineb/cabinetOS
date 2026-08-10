import {
  Test,
  TestingModule,
  ConfigModule,
  DatabaseService,
  envValidationSchema,
  createOrganization,
  createAuditEvent,
  Pool,
  sql,
} from '../../apps/api/test/isolation-test-kit';

// TASK-011 - Scenario 4 : contexte d organisation manquant, a deux niveaux differents.
// (1) niveau applicatif : withOrganizationScope refuse explicitement (TASK-008).
// (2) niveau base de donnees : une requete directe sans contexte ne voit rien (TASK-010).

const ADMIN_DATABASE_URL = process.env.ADMIN_DATABASE_URL;

describe('Isolation multi-tenant - contexte manquant', () => {
  let moduleRef: TestingModule;
  let databaseService: DatabaseService;
  let rawPool: Pool;
  let adminPool: Pool;
  let orgId: string;

  beforeAll(async () => {
    if (!ADMIN_DATABASE_URL) {
      throw new Error(
        'ADMIN_DATABASE_URL est requis pour ce test (nettoyage de audit_events, append-only pour le role applicatif depuis BUILD-002).',
      );
    }
    adminPool = new Pool({ connectionString: ADMIN_DATABASE_URL });

    moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, validationSchema: envValidationSchema })],
      providers: [DatabaseService],
    }).compile();
    databaseService = moduleRef.get(DatabaseService);
    rawPool = new Pool({ connectionString: process.env.DATABASE_URL });

    const org = await createOrganization(databaseService, {
      name: 'Missing Context Test Org',
      slug: `missing-context-test-${Date.now()}`,
    });
    orgId = org.id;
    await createAuditEvent(databaseService, orgId, { action: 'test.setup' });
  });

  afterAll(async () => {
    // audit_events est append-only pour cabinetos_app depuis BUILD-002 : ce nettoyage
    // de test necessite le role admin, jamais rawPool (connecte en cabinetos_app).
    await adminPool.query('DELETE FROM audit_events WHERE organization_id = $1', [orgId]);
    await databaseService.db.execute(sql`DELETE FROM organizations WHERE id = ${orgId}`);
    await rawPool.end();
    await adminPool.end();
    await databaseService.onModuleDestroy();
  });

  it('niveau applicatif : withOrganizationScope refuse tout appel sans organizationId', async () => {
    await expect(
      databaseService.withOrganizationScope('', async (tx) => tx.execute(sql`SELECT 1`)),
    ).rejects.toThrow(/organizationId est requis/);
  });

  it('niveau base de donnees : une requete directe sans SET LOCAL ne voit aucune ligne, malgre des donnees existantes', async () => {
    const result = await rawPool.query('SELECT * FROM audit_events WHERE organization_id = $1', [
      orgId,
    ]);
    expect(result.rows).toHaveLength(0);
  });

  it('le contexte manquant n est jamais silencieusement remplace par un contexte par defaut', async () => {
    const nonExistentOrgId = '00000000-0000-0000-0000-000000000000';
    const rows = await databaseService.withOrganizationScope(nonExistentOrgId, (tx) =>
      tx.execute(sql`SELECT * FROM audit_events`),
    );
    expect(rows.rows).toHaveLength(0);
  });
});
