import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { sql } from 'drizzle-orm';
import { DatabaseService } from '../../src/modules/shared/database/database.service';
import { envValidationSchema } from '../../src/modules/shared/config/env.validation';
import { createOrganization } from '../../src/modules/organization/infrastructure/organization.queries';
import * as auditEventQueries from '../../src/modules/audit/infrastructure/audit-event.queries';
import {
  createAuditEvent,
  findAuditEventsByOrganization,
} from '../../src/modules/audit/infrastructure/audit-event.queries';

describe('audit-event.queries (TASK-009)', () => {
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
      name: 'Audit Test Org A',
      slug: `audit-test-org-a-${Date.now()}`,
    });
    orgB = await createOrganization(databaseService, {
      name: 'Audit Test Org B',
      slug: `audit-test-org-b-${Date.now()}`,
    });
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

  it('cree un evenement visible uniquement dans son organisation (scoping)', async () => {
    await createAuditEvent(databaseService, orgA.id, { action: 'member.invited' });
    await createAuditEvent(databaseService, orgB.id, { action: 'settings.updated' });

    const eventsA = await findAuditEventsByOrganization(databaseService, orgA.id);
    const eventsB = await findAuditEventsByOrganization(databaseService, orgB.id);

    expect(eventsA.every((e) => e.organizationId === orgA.id)).toBe(true);
    expect(eventsB.every((e) => e.organizationId === orgB.id)).toBe(true);
    expect(eventsA.some((e) => e.action === 'settings.updated')).toBe(false);
  });

  it('n expose aucune fonction de modification ou de suppression (append-only)', () => {
    const queriesModule: Record<string, unknown> = auditEventQueries;
    expect(queriesModule.updateAuditEvent).toBeUndefined();
    expect(queriesModule.deleteAuditEvent).toBeUndefined();
  });
});
