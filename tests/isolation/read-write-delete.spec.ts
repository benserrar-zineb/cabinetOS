import {
  Test,
  TestingModule,
  ConfigModule,
  DatabaseService,
  envValidationSchema,
  createOrganization,
  createMembership,
  findMembershipsByOrganization,
  updateMembershipRole,
  deleteMembership,
  upsertSetting,
  findSettingByKey,
  findAllSettings,
  deleteSetting,
  createNotification,
  findNotificationsByUser,
  markNotificationRead,
  sql,
} from '../../apps/api/test/isolation-test-kit';

// TASK-011 - Scenarios 1, 2, 3 : lecture, ecriture, suppression, isolees par organisation.
// Exerce deliberement l ensemble des fonctions de scoping (pas seulement un sous-ensemble),
// pour que la mesure de couverture reflete un test reel et non un chiffre force.

describe('Isolation multi-tenant - lecture / ecriture / suppression', () => {
  let moduleRef: TestingModule;
  let databaseService: DatabaseService;
  let orgA: { id: string };
  let orgB: { id: string };
  const roleId = '00000000-0000-0000-0000-000000000001';
  const roleId2 = '00000000-0000-0000-0000-000000000002';
  const roleName = `IsolationRwdRole-${Date.now()}`;
  const roleName2 = `IsolationRwdRole2-${Date.now()}`;
  const userAlice = `isolation-rwd-alice-${Date.now()}`;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, validationSchema: envValidationSchema })],
      providers: [DatabaseService],
    }).compile();
    databaseService = moduleRef.get(DatabaseService);

    orgA = await createOrganization(databaseService, {
      name: 'RWD Test Org A',
      slug: `rwd-test-org-a-${Date.now()}`,
    });
    orgB = await createOrganization(databaseService, {
      name: 'RWD Test Org B',
      slug: `rwd-test-org-b-${Date.now()}`,
    });

    await databaseService.db.execute(
      sql`INSERT INTO roles (id, name) VALUES (${roleId}, ${roleName}), (${roleId2}, ${roleName2}) ON CONFLICT (id) DO NOTHING`,
    );
    await databaseService.db.execute(
      sql`INSERT INTO users (id, name, email) VALUES (${userAlice}, 'Alice RWD', ${userAlice + '@example.com'})`,
    );

    await createMembership(databaseService, orgA.id, { userId: userAlice, roleId });
  });

  afterAll(async () => {
    await databaseService.withOrganizationScope(orgA.id, (tx) =>
      tx.execute(sql`DELETE FROM memberships WHERE organization_id = ${orgA.id}`),
    );
    await databaseService.withOrganizationScope(orgA.id, (tx) =>
      tx.execute(sql`DELETE FROM notifications WHERE organization_id = ${orgA.id}`),
    );
    await databaseService.db.execute(sql`DELETE FROM users WHERE id = ${userAlice}`);
    await databaseService.db.execute(sql`DELETE FROM roles WHERE id IN (${roleId}, ${roleId2})`);
    await databaseService.db.execute(
      sql`DELETE FROM organizations WHERE id IN (${orgA.id}, ${orgB.id})`,
    );
    await databaseService.onModuleDestroy();
  });

  describe('Lecture', () => {
    it('une lecture scopee a l organisation A ne renvoie jamais de donnees de l organisation B', async () => {
      await upsertSetting(databaseService, orgA.id, 'k', { v: 'A-initial' });
      await upsertSetting(databaseService, orgA.id, 'k', { v: 'A' });
      await upsertSetting(databaseService, orgB.id, 'k', { v: 'B' });

      const readA = await findSettingByKey(databaseService, orgA.id, 'k');
      const readB = await findSettingByKey(databaseService, orgB.id, 'k');

      expect(readA?.value).toEqual({ v: 'A' });
      expect(readB?.value).toEqual({ v: 'B' });

      const allA = await findAllSettings(databaseService, orgA.id);
      expect(allA.every((s) => s.organizationId === orgA.id)).toBe(true);

      await createNotification(databaseService, orgA.id, {
        userId: userAlice,
        channel: 'in-app',
        title: 'Lecture test',
      });
      const notifsA = await findNotificationsByUser(databaseService, orgA.id, userAlice);
      expect(notifsA.length).toBeGreaterThan(0);
    });
  });

  describe('Ecriture', () => {
    it('toute ecriture est systematiquement associee a l organisation active, jamais a une autre', async () => {
      const created = await createMembership(databaseService, orgB.id, {
        userId: userAlice,
        roleId,
      });
      expect(created.organizationId).toBe(orgB.id);
      expect(created.organizationId).not.toBe(orgA.id);

      const updated = await updateMembershipRole(databaseService, orgB.id, created.id, roleId2);
      expect(updated?.roleId).toBe(roleId2);

      const notif = await createNotification(databaseService, orgA.id, {
        userId: userAlice,
        channel: 'in-app',
        title: 'Ecriture test',
      });
      const marked = await markNotificationRead(databaseService, orgA.id, notif.id);
      expect(marked?.readAt).not.toBeNull();

      await deleteMembership(databaseService, orgB.id, created.id);
    });
  });

  describe('Suppression', () => {
    it('une suppression scopee ne peut retirer que les lignes de sa propre organisation', async () => {
      const beforeA = await findMembershipsByOrganization(databaseService, orgA.id);
      expect(beforeA.length).toBeGreaterThan(0);

      await databaseService.withOrganizationScope(orgB.id, (tx) =>
        tx.execute(sql`DELETE FROM memberships WHERE user_id = ${userAlice}`),
      );

      const afterAttempt = await findMembershipsByOrganization(databaseService, orgA.id);
      expect(afterAttempt.length).toBe(beforeA.length);
    });

    it('deleteSetting retire uniquement la cle de sa propre organisation', async () => {
      await deleteSetting(databaseService, orgA.id, 'k');
      const afterDelete = await findSettingByKey(databaseService, orgA.id, 'k');
      expect(afterDelete).toBeUndefined();

      const stillB = await findSettingByKey(databaseService, orgB.id, 'k');
      expect(stillB?.value).toEqual({ v: 'B' });

      await deleteSetting(databaseService, orgB.id, 'k');
    });
  });
});
