import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { sql } from 'drizzle-orm';
import { DatabaseService } from '../../src/modules/shared/database/database.service';
import { envValidationSchema } from '../../src/modules/shared/config/env.validation';
import { createOrganization } from '../../src/modules/organization/infrastructure/organization.queries';
import {
  createNotification,
  findNotificationsByUser,
  markNotificationRead,
} from '../../src/modules/notifications/infrastructure/notification.queries';

describe('notification.queries (TASK-009)', () => {
  let moduleRef: TestingModule;
  let databaseService: DatabaseService;
  let orgA: { id: string };
  let orgB: { id: string };
  const userAlice = `notification-test-alice-${Date.now()}`;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, validationSchema: envValidationSchema })],
      providers: [DatabaseService],
    }).compile();
    databaseService = moduleRef.get(DatabaseService);

    orgA = await createOrganization(databaseService, {
      name: 'Notification Test Org A',
      slug: `notification-test-org-a-${Date.now()}`,
    });
    orgB = await createOrganization(databaseService, {
      name: 'Notification Test Org B',
      slug: `notification-test-org-b-${Date.now()}`,
    });
    await databaseService.db.execute(
      sql`INSERT INTO users (id, name, email) VALUES (${userAlice}, 'Alice Test', ${userAlice + '@example.com'})`,
    );
  });

  beforeEach(async () => {
    await databaseService.withOrganizationScope(orgA.id, (tx) =>
      tx.execute(sql`DELETE FROM notifications WHERE organization_id = ${orgA.id}`),
    );
    await databaseService.withOrganizationScope(orgB.id, (tx) =>
      tx.execute(sql`DELETE FROM notifications WHERE organization_id = ${orgB.id}`),
    );
  });

  afterAll(async () => {
    await databaseService.withOrganizationScope(orgA.id, (tx) =>
      tx.execute(sql`DELETE FROM notifications WHERE organization_id = ${orgA.id}`),
    );
    await databaseService.withOrganizationScope(orgB.id, (tx) =>
      tx.execute(sql`DELETE FROM notifications WHERE organization_id = ${orgB.id}`),
    );
    await databaseService.db.execute(sql`DELETE FROM users WHERE id = ${userAlice}`);
    await databaseService.db.execute(
      sql`DELETE FROM organizations WHERE id IN (${orgA.id}, ${orgB.id})`,
    );
    await databaseService.onModuleDestroy();
  });

  it('cree et lit des notifications scopees par organisation', async () => {
    await createNotification(databaseService, orgA.id, {
      userId: userAlice,
      channel: 'in-app',
      title: 'Bienvenue',
    });

    const forAlice = await findNotificationsByUser(databaseService, orgA.id, userAlice);
    expect(forAlice).toHaveLength(1);
    expect(forAlice[0].title).toBe('Bienvenue');
  });

  it('rejette la lecture avec le mauvais organizationId (acces cross-organisation)', async () => {
    await createNotification(databaseService, orgA.id, {
      userId: userAlice,
      channel: 'in-app',
      title: 'Bienvenue',
    });
    const crossOrg = await findNotificationsByUser(databaseService, orgB.id, userAlice);
    expect(crossOrg).toHaveLength(0);
  });

  it('marque comme lu uniquement dans le bon contexte', async () => {
    const notif = await createNotification(databaseService, orgA.id, {
      userId: userAlice,
      channel: 'in-app',
      title: 'Bienvenue',
    });
    const updated = await markNotificationRead(databaseService, orgA.id, notif.id);
    expect(updated?.readAt).not.toBeNull();

    const wrongContext = await markNotificationRead(databaseService, orgB.id, notif.id);
    expect(wrongContext).toBeUndefined();
  });
});
