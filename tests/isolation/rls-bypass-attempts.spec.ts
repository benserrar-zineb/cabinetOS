import {
  Test,
  TestingModule,
  ConfigModule,
  DatabaseService,
  envValidationSchema,
  createOrganization,
  createAuditEvent,
  findAuditEventsByOrganization,
  Pool,
  sql,
} from '../../apps/api/test/isolation-test-kit';

// TASK-011 - Scenario 5 : tentatives de contournement de RLS.

describe('Isolation multi-tenant - tentatives de contournement RLS', () => {
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
      name: 'Bypass Test Org A',
      slug: `bypass-test-org-a-${Date.now()}`,
    });
    orgB = await createOrganization(databaseService, {
      name: 'Bypass Test Org B',
      slug: `bypass-test-org-b-${Date.now()}`,
    });
    await createAuditEvent(databaseService, orgA.id, { action: 'secret.a' });
    await createAuditEvent(databaseService, orgB.id, { action: 'secret.b' });
  });

  afterAll(async () => {
    await databaseService.withOrganizationScope(orgA.id, (tx) =>
      tx.execute(sql`DELETE FROM audit_events WHERE organization_id = ${orgA.id}`),
    );
    await databaseService.withOrganizationScope(orgB.id, (tx) =>
      tx.execute(sql`DELETE FROM audit_events WHERE organization_id = ${orgB.id}`),
    );
    await databaseService.db.execute(
      sql`DELETE FROM organizations WHERE id IN (${orgA.id}, ${orgB.id})`,
    );
    await databaseService.onModuleDestroy();
  });

  it('une valeur non-UUID injectee comme organizationId echoue proprement, sans executer de SQL arbitraire', async () => {
    const maliciousValue = "' OR '1'='1";

    await expect(
      databaseService.withOrganizationScope(maliciousValue, (tx) =>
        tx.execute(sql`SELECT * FROM audit_events`),
      ),
    ).rejects.toThrow();

    const eventsA = await findAuditEventsByOrganization(databaseService, orgA.id);
    expect(eventsA.some((e) => e.action === 'secret.a')).toBe(true);
  });

  it('une connexion issue du pool ne conserve jamais un contexte positionne par une requete precedente', async () => {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });

    const client1 = await pool.connect();
    await client1.query('BEGIN');
    await client1.query("SELECT set_config('app.organization_id', $1, true)", [orgA.id]);
    await client1.query('COMMIT');
    client1.release();

    const client2 = await pool.connect();
    const result = await client2.query(
      "SELECT current_setting('app.organization_id', true) AS org",
    );
    client2.release();

    expect(result.rows[0].org).toBe('');
    await pool.end();
  });

  it('changer explicitement de contexte d une organisation a l autre isole correctement chaque appel (pas de fuite residuelle)', async () => {
    const seenA = await databaseService.withOrganizationScope(orgA.id, (tx) =>
      tx.execute(sql`SELECT action FROM audit_events`),
    );
    const seenB = await databaseService.withOrganizationScope(orgB.id, (tx) =>
      tx.execute(sql`SELECT action FROM audit_events`),
    );

    expect(seenA.rows.every((r: { action: string }) => r.action === 'secret.a')).toBe(true);
    expect(seenB.rows.every((r: { action: string }) => r.action === 'secret.b')).toBe(true);
  });
});
