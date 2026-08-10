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

// BUILD-002 - Tache d ouverture : audit_events append-only au niveau base (dette
// ouverte a la cloture de BUILD-001, migration 0003_audit-events-append-only.sql).
// Le module Audit n exposait deja aucune fonction update/delete cote code -- ce test
// prouve la garantie au niveau base, avec le role applicatif reel (jamais un
// superutilisateur, qui contournerait toujours la restriction).
//
// Comme pour les tests d isolation de BUILD-001 : prouver que l operation interdite
// echoue, pas seulement que l operation autorisee reussit. Un test qui ne verifie que
// l INSERT ne prouve rien sur l append-only.

const ADMIN_DATABASE_URL = process.env.ADMIN_DATABASE_URL;

describe('audit_events - append-only au niveau base (BUILD-002)', () => {
  let moduleRef: TestingModule;
  let databaseService: DatabaseService;
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

    const org = await createOrganization(databaseService, {
      name: 'Audit Append Only Test Org',
      slug: `audit-append-only-test-${Date.now()}`,
    });
    orgId = org.id;
  });

  afterAll(async () => {
    // audit_events est append-only pour cabinetos_app : ce nettoyage de test necessite
    // le role admin, jamais withOrganizationScope (role applicatif).
    await adminPool.query('DELETE FROM audit_events WHERE organization_id = $1', [orgId]);
    await databaseService.db.execute(sql`DELETE FROM organizations WHERE id = ${orgId}`);
    await adminPool.end();
    await databaseService.onModuleDestroy();
  });

  it('INSERT reussit avec le role applicatif', async () => {
    const created = await createAuditEvent(databaseService, orgId, { action: 'test.insert' });
    expect(created.id).toBeDefined();
    expect(created.action).toBe('test.insert');
  });

  it('SELECT reussit avec le role applicatif', async () => {
    const events = await findAuditEventsByOrganization(databaseService, orgId);
    expect(events.some((e) => e.action === 'test.insert')).toBe(true);
  });

  it('UPDATE echoue avec le role applicatif (privilege insuffisant, pas une erreur RLS)', async () => {
    const created = await createAuditEvent(databaseService, orgId, { action: 'test.update' });

    await expect(
      databaseService.withOrganizationScope(orgId, (tx) =>
        tx.execute(sql`UPDATE audit_events SET action = 'modifie' WHERE id = ${created.id}`),
      ),
      // drizzle-orm enveloppe l erreur pg originale dans .cause (DrizzleQueryError) --
      // le code SQLSTATE 42501 (insufficient_privilege) y vit, pas au premier niveau.
    ).rejects.toMatchObject({ cause: { code: '42501' } });

    // Controle negatif : la ligne existe toujours, inchangee (privilege insuffisant a
    // bien empeche l ecriture, l operation n a pas simplement echoue autrement).
    const events = await findAuditEventsByOrganization(databaseService, orgId);
    const unchanged = events.find((e) => e.id === created.id);
    expect(unchanged?.action).toBe('test.update');
  });

  it('DELETE echoue avec le role applicatif (privilege insuffisant, pas une erreur RLS)', async () => {
    const created = await createAuditEvent(databaseService, orgId, { action: 'test.delete' });

    await expect(
      databaseService.withOrganizationScope(orgId, (tx) =>
        tx.execute(sql`DELETE FROM audit_events WHERE id = ${created.id}`),
      ),
    ).rejects.toMatchObject({ cause: { code: '42501' } });

    // Controle negatif : la ligne existe toujours (la suppression a bien echoue).
    const events = await findAuditEventsByOrganization(databaseService, orgId);
    expect(events.some((e) => e.id === created.id)).toBe(true);
  });
});
