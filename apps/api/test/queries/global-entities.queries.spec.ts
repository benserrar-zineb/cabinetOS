import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { sql } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { DatabaseService } from '../../src/modules/shared/database/database.service';
import { envValidationSchema } from '../../src/modules/shared/config/env.validation';
import { findUserById, updateUser } from '../../src/modules/identity/infrastructure/user.queries';
import {
  createOrganization,
  findOrganizationById,
  softDeleteOrganization,
} from '../../src/modules/organization/infrastructure/organization.queries';
import { findAllRoles } from '../../src/modules/access-control/infrastructure/role.queries';
import { findAllPermissions } from '../../src/modules/access-control/infrastructure/permission.queries';

describe('Entites globales - User, Organization, Role, Permission (TASK-009)', () => {
  let moduleRef: TestingModule;
  let databaseService: DatabaseService;
  const userAlice = `global-test-alice-${Date.now()}`;
  const roleName = `GlobalTestRole-${Date.now()}`;
  const permissionAction = `test-action-${Date.now()}`;
  let createdOrgId: string;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, validationSchema: envValidationSchema })],
      providers: [DatabaseService],
    }).compile();
    databaseService = moduleRef.get(DatabaseService);

    await databaseService.db.execute(
      sql`INSERT INTO users (id, name, email) VALUES (${userAlice}, 'Alice Test', ${userAlice + '@example.com'})`,
    );
    await databaseService.db.execute(
      sql`INSERT INTO roles (id, name) VALUES (${uuidv7()}, ${roleName})`,
    );
    await databaseService.db.execute(
      sql`INSERT INTO permissions (id, action, resource) VALUES (${uuidv7()}, ${permissionAction}, 'test-resource')`,
    );
  });

  afterAll(async () => {
    await databaseService.db.execute(sql`DELETE FROM users WHERE id = ${userAlice}`);
    await databaseService.db.execute(sql`DELETE FROM roles WHERE name = ${roleName}`);
    await databaseService.db.execute(
      sql`DELETE FROM permissions WHERE action = ${permissionAction}`,
    );
    if (createdOrgId) {
      await databaseService.db.execute(sql`DELETE FROM organizations WHERE id = ${createdOrgId}`);
    }
    await databaseService.onModuleDestroy();
  });

  it('User : lecture et mise a jour, sans notion de scoping', async () => {
    const alice = await findUserById(databaseService, userAlice);
    expect(alice?.email).toBe(`${userAlice}@example.com`);

    const updated = await updateUser(databaseService, userAlice, { name: 'Alice Martin' });
    expect(updated.name).toBe('Alice Martin');
  });

  it('Organization : cycle de vie complet (creation, lecture, suppression logique)', async () => {
    const created = await createOrganization(databaseService, {
      name: 'Cabinet Test',
      slug: `cabinet-test-${Date.now()}`,
    });
    createdOrgId = created.id;
    expect(created.id).toBeDefined();

    const found = await findOrganizationById(databaseService, created.id);
    expect(found?.name).toBe('Cabinet Test');

    const deleted = await softDeleteOrganization(databaseService, created.id);
    expect(deleted.deletedAt).not.toBeNull();
  });

  it('Role : le role cree pour ce test est bien accessible parmi tous les roles', async () => {
    const allRoles = await findAllRoles(databaseService);
    const names = allRoles.map((r) => r.name);
    expect(names).toContain(roleName);
  });

  it('Permission : structure action + ressource accessible', async () => {
    const allPermissions = await findAllPermissions(databaseService);
    const found = allPermissions.find((p) => p.action === permissionAction);
    expect(found).toBeDefined();
    expect(found).toHaveProperty('resource', 'test-resource');
  });
});
