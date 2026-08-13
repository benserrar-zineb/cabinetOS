import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { sql } from 'drizzle-orm';
import { Pool } from 'pg';
import { uuidv7 } from 'uuidv7';
import { DatabaseService } from '../../src/modules/shared/database/database.service';
import { envValidationSchema } from '../../src/modules/shared/config/env.validation';
import { createOrganization } from '../../src/modules/organization/infrastructure/organization.queries';
import { createMembership } from '../../src/modules/organization/infrastructure/membership.queries';
import { upsertSetting } from '../../src/modules/settings/infrastructure/setting.queries';
import { createAuditEvent } from '../../src/modules/audit/infrastructure/audit-event.queries';
import { createNotification } from '../../src/modules/notifications/infrastructure/notification.queries';

// TASK-019 (BUILD-002) : les deux tables Patient rejoignent cette suite -- meme
// exigence que file_objects en son temps (EA-003) : verifier la RLS directement,
// pas seulement dans le schema.

// TASK-010 : preuve directe que les politiques RLS bloquent une requete SQL brute,
// hors application, sans SET LOCAL - critere d acceptation exact de la tache.
// file_objects ajoutee apres revue de l encadrant (EA-003) : politique manquante corrigee.

const ADMIN_DATABASE_URL = process.env.ADMIN_DATABASE_URL;

describe('Politiques RLS PostgreSQL (TASK-010)', () => {
  let moduleRef: TestingModule;
  let databaseService: DatabaseService;
  let rawPool: Pool;
  let adminPool: Pool;
  let orgId: string;
  let patientId: string;
  const userId = `rls-test-user-${Date.now()}`;
  const roleId = uuidv7();

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
      name: 'RLS Policy Test Org',
      slug: `rls-policy-test-${Date.now()}`,
    });
    orgId = org.id;

    await databaseService.db.execute(
      sql`INSERT INTO users (id, name, email) VALUES (${userId}, 'RLS Test User', ${userId + '@example.com'})`,
    );
    await databaseService.db.execute(
      sql`INSERT INTO roles (id, name) VALUES (${roleId}, ${'RlsTestRole-' + roleId})`,
    );

    await createMembership(databaseService, orgId, { userId, roleId });
    await upsertSetting(databaseService, orgId, 'test-key', { value: 'test' });
    await createAuditEvent(databaseService, orgId, { action: 'test.action' });
    await createNotification(databaseService, orgId, {
      userId,
      channel: 'in-app',
      title: 'Test',
    });
    // file_objects : pas de fonctions de requete (Storage hors perimetre de TASK-009),
    // insertion directe pour verifier la politique RLS ajoutee apres la revue de l encadrant.
    await databaseService.withOrganizationScope(orgId, (tx) =>
      tx.execute(
        sql`INSERT INTO file_objects (id, organization_id, filename, mime_type, size_bytes, hash) VALUES (${uuidv7()}, ${orgId}, 'test.pdf', 'application/pdf', 1024, 'fake-hash')`,
      ),
    );
    // patients/patient_records : pas de fonctions de requete (TASK-020), insertion
    // directe pour verifier les politiques RLS ajoutees en TASK-019.
    patientId = uuidv7();
    await databaseService.withOrganizationScope(orgId, (tx) =>
      tx.execute(
        sql`INSERT INTO patients (id, organization_id, first_name, last_name) VALUES (${patientId}, ${orgId}, 'RLS', 'Test')`,
      ),
    );
    await databaseService.withOrganizationScope(orgId, (tx) =>
      tx.execute(
        sql`INSERT INTO patient_records (id, organization_id, patient_id, sequential_number) VALUES (${uuidv7()}, ${orgId}, ${patientId}, 1)`,
      ),
    );
  });

  afterAll(async () => {
    // patient_records avant patients : contrainte FK (patient_records.patient_id).
    await databaseService.withOrganizationScope(orgId, (tx) =>
      tx.execute(sql`DELETE FROM patient_records WHERE organization_id = ${orgId}`),
    );
    await databaseService.withOrganizationScope(orgId, (tx) =>
      Promise.all([
        tx.execute(sql`DELETE FROM memberships WHERE organization_id = ${orgId}`),
        tx.execute(sql`DELETE FROM settings WHERE organization_id = ${orgId}`),
        tx.execute(sql`DELETE FROM notifications WHERE organization_id = ${orgId}`),
        tx.execute(sql`DELETE FROM file_objects WHERE organization_id = ${orgId}`),
        tx.execute(sql`DELETE FROM patients WHERE organization_id = ${orgId}`),
      ]),
    );
    // audit_events est append-only pour cabinetos_app depuis BUILD-002 : sorti du
    // Promise.all ci-dessus, nettoye a part via le role admin.
    await adminPool.query('DELETE FROM audit_events WHERE organization_id = $1', [orgId]);
    await databaseService.db.execute(sql`DELETE FROM users WHERE id = ${userId}`);
    await databaseService.db.execute(sql`DELETE FROM roles WHERE id = ${roleId}`);
    await databaseService.db.execute(sql`DELETE FROM organizations WHERE id = ${orgId}`);
    await rawPool.end();
    await adminPool.end();
    await databaseService.onModuleDestroy();
  });

  it.each([
    ['memberships'],
    ['settings'],
    ['audit_events'],
    ['notifications'],
    ['file_objects'],
    ['patients'],
    ['patient_records'],
  ])(
    'une requete SQL directe sur %s, sans SET LOCAL, ne retourne aucune ligne (donnee pourtant presente)',
    async (table) => {
      const result = await rawPool.query(`SELECT * FROM ${table} WHERE organization_id = $1`, [
        orgId,
      ]);
      expect(result.rows).toHaveLength(0);
    },
  );

  it('confirme que la donnee existe reellement (controle negatif, vu avec le contexte positionne)', async () => {
    const memberships = await databaseService.withOrganizationScope(orgId, (tx) =>
      tx.execute(sql`SELECT * FROM memberships WHERE organization_id = ${orgId}`),
    );
    expect(memberships.rows.length).toBeGreaterThan(0);

    const fileObjects = await databaseService.withOrganizationScope(orgId, (tx) =>
      tx.execute(sql`SELECT * FROM file_objects WHERE organization_id = ${orgId}`),
    );
    expect(fileObjects.rows.length).toBeGreaterThan(0);

    const patientRows = await databaseService.withOrganizationScope(orgId, (tx) =>
      tx.execute(sql`SELECT * FROM patients WHERE organization_id = ${orgId}`),
    );
    expect(patientRows.rows.length).toBeGreaterThan(0);

    const patientRecordRows = await databaseService.withOrganizationScope(orgId, (tx) =>
      tx.execute(sql`SELECT * FROM patient_records WHERE organization_id = ${orgId}`),
    );
    expect(patientRecordRows.rows.length).toBeGreaterThan(0);
  });
});
