import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { sql } from 'drizzle-orm';
import { DatabaseService } from '../../src/modules/shared/database/database.service';
import { envValidationSchema } from '../../src/modules/shared/config/env.validation';
import { createOrganization } from '../../src/modules/organization/infrastructure/organization.queries';
import {
  createPatient,
  findPatientById,
  updatePatient,
  updatePatientRecordStatus,
} from '../../src/business/patient/infrastructure/patient.queries';

// TASK-020 : critere d acceptation explicite -- la generation du numero de dossier
// doit etre atomique (INSERT ... ON CONFLICT ... RETURNING), prouve ici par une
// creation concurrente qui ne doit jamais produire deux fois le meme numero.

describe('patient.queries (TASK-020)', () => {
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
      name: 'Patient Queries Test Org A',
      slug: `patient-queries-test-a-${Date.now()}`,
    });
    orgB = await createOrganization(databaseService, {
      name: 'Patient Queries Test Org B',
      slug: `patient-queries-test-b-${Date.now()}`,
    });
  });

  afterAll(async () => {
    await databaseService.withOrganizationScope(orgA.id, (tx) =>
      tx.execute(sql`DELETE FROM patient_records WHERE organization_id = ${orgA.id}`),
    );
    await databaseService.withOrganizationScope(orgB.id, (tx) =>
      tx.execute(sql`DELETE FROM patient_records WHERE organization_id = ${orgB.id}`),
    );
    await databaseService.withOrganizationScope(orgA.id, (tx) =>
      tx.execute(sql`DELETE FROM patients WHERE organization_id = ${orgA.id}`),
    );
    await databaseService.withOrganizationScope(orgB.id, (tx) =>
      tx.execute(sql`DELETE FROM patients WHERE organization_id = ${orgB.id}`),
    );
    await databaseService.db.execute(
      sql`DELETE FROM patient_record_counters WHERE organization_id IN (${orgA.id}, ${orgB.id})`,
    );
    await databaseService.db.execute(
      sql`DELETE FROM organizations WHERE id IN (${orgA.id}, ${orgB.id})`,
    );
    await databaseService.onModuleDestroy();
  });

  it('createPatient cree l identite et le dossier, avec le numero 1 pour le premier patient', async () => {
    const created = await createPatient(databaseService, orgA.id, {
      firstName: 'Fatima',
      lastName: 'Premiere',
    });
    expect(created.id).toBeDefined();
    expect(created.firstName).toBe('Fatima');
    expect(created.record.sequentialNumber).toBe(1);
    expect(created.record.status).toBe('active');
    expect(created.record.patientId).toBe(created.id);
  });

  it('findPatientById renvoie l identite et son dossier combines', async () => {
    const created = await createPatient(databaseService, orgA.id, {
      firstName: 'Karim',
      lastName: 'Deuxieme',
    });
    const found = await findPatientById(databaseService, orgA.id, created.id);
    expect(found?.firstName).toBe('Karim');
    expect(found?.record?.id).toBe(created.record.id);
  });

  it('findPatientById renvoie undefined pour un id absent (jamais une erreur)', async () => {
    const found = await findPatientById(
      databaseService,
      orgA.id,
      '00000000-0000-0000-0000-000000000000',
    );
    expect(found).toBeUndefined();
  });

  it('updatePatient modifie les champs d identite fournis', async () => {
    const created = await createPatient(databaseService, orgA.id, {
      firstName: 'Nadia',
      lastName: 'Avant',
    });
    const updated = await updatePatient(databaseService, orgA.id, created.id, {
      lastName: 'Apres',
    });
    expect(updated.lastName).toBe('Apres');
    expect(updated.firstName).toBe('Nadia');
  });

  it('updatePatientRecordStatus change le statut du dossier (Q3 du Decision Gate)', async () => {
    const created = await createPatient(databaseService, orgA.id, {
      firstName: 'Youssef',
      lastName: 'Statut',
    });
    const updated = await updatePatientRecordStatus(
      databaseService,
      orgA.id,
      created.record.id,
      'archived',
    );
    expect(updated.status).toBe('archived');
  });

  it('deux organisations differentes peuvent chacune commencer leur propre numerotation a 1', async () => {
    const inOrgA = await createPatient(databaseService, orgA.id, {
      firstName: 'IsolationA',
      lastName: 'Test',
    });
    const inOrgB = await createPatient(databaseService, orgB.id, {
      firstName: 'IsolationB',
      lastName: 'Test',
    });
    expect(inOrgB.record.sequentialNumber).toBe(1);
    expect(inOrgA.record.sequentialNumber).toBeGreaterThanOrEqual(1);
  });

  it('deux creations concurrentes dans la meme organisation ne recoivent jamais le meme numero', async () => {
    const concurrentCreations = 10;
    const results = await Promise.all(
      Array.from({ length: concurrentCreations }, (_, i) =>
        createPatient(databaseService, orgB.id, {
          firstName: `Concurrent${i}`,
          lastName: 'Test',
        }),
      ),
    );

    const sequentialNumbers = results.map((r) => r.record.sequentialNumber);
    const uniqueNumbers = new Set(sequentialNumbers);
    expect(uniqueNumbers.size).toBe(concurrentCreations);
  });
});
