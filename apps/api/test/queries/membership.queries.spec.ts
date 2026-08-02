import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { sql } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { DatabaseService } from '../../src/modules/shared/database/database.service';
import { envValidationSchema } from '../../src/modules/shared/config/env.validation';
import { createOrganization } from '../../src/modules/organization/infrastructure/organization.queries';
import {
  createMembership,
  findMembershipsByOrganization,
  updateMembershipRole,
  deleteMembership,
} from '../../src/modules/organization/infrastructure/membership.queries';

describe('membership.queries (TASK-009)', () => {
  let moduleRef: TestingModule;
  let databaseService: DatabaseService;
  let orgA: { id: string };
  let orgB: { id: string };
  const roleAdminId = uuidv7();
  const roleMembreId = uuidv7();
  const userAlice = `membership-test-alice-${Date.now()}`;
  const userBob = `membership-test-bob-${Date.now()}`;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, validationSchema: envValidationSchema })],
      providers: [DatabaseService],
    }).compile();
    databaseService = moduleRef.get(DatabaseService);

    orgA = await createOrganization(databaseService, {
      name: 'Membership Test Org A',
      slug: `membership-test-org-a-${Date.now()}`,
    });
    orgB = await createOrganization(databaseService, {
      name: 'Membership Test Org B',
      slug: `membership-test-org-b-${Date.now()}`,
    });

    await databaseService.db.execute(
      sql`INSERT INTO users (id, name, email) VALUES (${userAlice}, 'Alice Test', ${userAlice + '@example.com'}), (${userBob}, 'Bob Test', ${userBob + '@example.com'})`,
    );
    await databaseService.db.execute(
      sql`INSERT INTO roles (id, name) VALUES (${roleAdminId}, ${'AdminTest-' + roleAdminId}), (${roleMembreId}, ${'MembreTest-' + roleMembreId})`,
    );

    await createMembership(databaseService, orgA.id, { userId: userAlice, roleId: roleAdminId });
    await createMembership(databaseService, orgB.id, { userId: userBob, roleId: roleMembreId });
  });

  afterAll(async () => {
    await databaseService.db.execute(sql`DELETE FROM users WHERE id IN (${userAlice}, ${userBob})`);
    await databaseService.db.execute(
      sql`DELETE FROM roles WHERE id IN (${roleAdminId}, ${roleMembreId})`,
    );
    await databaseService.db.execute(
      sql`DELETE FROM organizations WHERE id IN (${orgA.id}, ${orgB.id})`,
    );
    await databaseService.onModuleDestroy();
  });

  it('ne voit que les memberships de l organisation active (scoping)', async () => {
    const orgAMemberships = await findMembershipsByOrganization(databaseService, orgA.id);
    const orgBMemberships = await findMembershipsByOrganization(databaseService, orgB.id);

    expect(orgAMemberships).toHaveLength(1);
    expect(orgAMemberships[0].userId).toBe(userAlice);
    expect(orgBMemberships).toHaveLength(1);
    expect(orgBMemberships[0].userId).toBe(userBob);
  });

  it('rejette toute tentative de modifier un membership avec le mauvais organizationId (acces cross-organisation)', async () => {
    const [aliceMembership] = await findMembershipsByOrganization(databaseService, orgA.id);

    const result = await updateMembershipRole(
      databaseService,
      orgB.id,
      aliceMembership.id,
      roleMembreId,
    );

    expect(result).toBeUndefined();

    const stillOrgA = await findMembershipsByOrganization(databaseService, orgA.id);
    expect(stillOrgA[0].roleId).toBe(roleAdminId);
  });

  it('cree un membership uniquement dans le contexte demande', async () => {
    const created = await createMembership(databaseService, orgA.id, {
      userId: userBob,
      roleId: roleMembreId,
    });

    expect(created.organizationId).toBe(orgA.id);

    const orgAMemberships = await findMembershipsByOrganization(databaseService, orgA.id);
    expect(orgAMemberships).toHaveLength(2);

    await deleteMembership(databaseService, orgA.id, created.id);
    const afterDelete = await findMembershipsByOrganization(databaseService, orgA.id);
    expect(afterDelete).toHaveLength(1);
  });
});
