import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { sql } from 'drizzle-orm';
import { Pool } from 'pg';
import { DatabaseService } from '../../src/modules/shared/database/database.service';
import { envValidationSchema } from '../../src/modules/shared/config/env.validation';
import { createOrganization } from '../../src/modules/organization/infrastructure/organization.queries';
import * as auditEventQueries from '../../src/modules/audit/infrastructure/audit-event.queries';
import {
  createAuditEvent,
  findAuditEventsByOrganization,
} from '../../src/modules/audit/infrastructure/audit-event.queries';

const ADMIN_DATABASE_URL = process.env.ADMIN_DATABASE_URL;

describe('audit-event.queries (TASK-009)', () => {
  let moduleRef: TestingModule;
  let databaseService: DatabaseService;
  let adminPool: Pool;
  let orgA: { id: string };
  let orgB: { id: string };

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
    // audit_events est append-only pour cabinetos_app depuis BUILD-002 : ce nettoyage
    // de test necessite le role admin, jamais withOrganizationScope (role applicatif).
    await adminPool.query('DELETE FROM audit_events WHERE organization_id IN ($1, $2)', [
      orgA.id,
      orgB.id,
    ]);
    await databaseService.db.execute(
      sql`DELETE FROM organizations WHERE id IN (${orgA.id}, ${orgB.id})`,
    );
    await adminPool.end();
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
