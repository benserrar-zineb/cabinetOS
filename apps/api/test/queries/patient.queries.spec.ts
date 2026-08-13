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
  ResponsibleRecordOrganizationMismatchError,
} from '../../src/business/patient/infrastructure/patient.queries';
import { uuidv7 } from 'uuidv7';

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

  // TASK-021 : preuve du refus, pas seulement du succes (demande explicite de
  // l encadrant a la cloture d EA-008) -- un responsable d une AUTRE organisation
  // doit etre rejete, a la fois cote application et cote base.

  it('createPatient refuse (couche applicative) un responsable appartenant a une autre organisation', async () => {
    const responsibleInOrgB = await createPatient(databaseService, orgB.id, {
      firstName: 'Responsable',
      lastName: 'DansOrgB',
    });

    await expect(
      createPatient(databaseService, orgA.id, {
        firstName: 'Dependant',
        lastName: 'DansOrgA',
        responsiblePatientRecordId: responsibleInOrgB.record.id,
      }),
    ).rejects.toThrow(ResponsibleRecordOrganizationMismatchError);
  });

  it('un contournement de l application (insertion SQL brute avec cabinetos_app) est quand meme refuse par le trigger base', async () => {
    const responsibleInOrgB = await createPatient(databaseService, orgB.id, {
      firstName: 'Responsable2',
      lastName: 'DansOrgB',
    });
    const dependantIdentity = await databaseService.withOrganizationScope(orgA.id, (tx) =>
      tx
        .execute(
          sql`INSERT INTO patients (id, organization_id, first_name, last_name) VALUES (${uuidv7()}, ${orgA.id}, 'Contournement', 'Test') RETURNING id`,
        )
        .then((r) => (r.rows[0] as { id: string }).id),
    );

    // Insertion directe, SANS passer par createPatient (donc sans le controle
    // applicatif) -- seul le trigger de la migration 0006 peut encore refuser.
    await expect(
      databaseService.withOrganizationScope(orgA.id, (tx) =>
        tx.execute(sql`
          INSERT INTO patient_records (id, organization_id, patient_id, sequential_number, responsible_patient_record_id)
          VALUES (${uuidv7()}, ${orgA.id}, ${dependantIdentity}, 999, ${responsibleInOrgB.record.id})
        `),
      ),
    ).rejects.toMatchObject({
      cause: {
        code: 'P0001',
        message: expect.stringContaining('same organization'),
      },
    });
  });
});
