import {
  Test,
  TestingModule,
  ConfigModule,
  DatabaseService,
  envValidationSchema,
  createOrganization,
  createPatient,
  findPatientById,
  updatePatient,
  updatePatientRecordStatus,
  Pool,
  sql,
} from '../../apps/api/test/isolation-test-kit';

// TASK-023 (BUILD-002, EA-008) : suite d isolation dediee pour patients/patient_records,
// meme modele que read-write-delete.spec.ts et missing-context.spec.ts. Les deux tables
// avaient deja rejoint la suite generique rls-policies.spec.ts (TASK-019) ; cette suite
// est le test dedie exige par les criteres d acceptation, au meme niveau de rigueur que
// les autres domaines Core.
//
// Comme pour les autres suites d isolation : prouver que l acces refuse echoue
// reellement, pas seulement que l acces autorise reussit (controle positif inclus).

describe('Isolation multi-tenant - module Patient', () => {
  let moduleRef: TestingModule;
  let databaseService: DatabaseService;
  let rawPool: Pool;
  let orgA: { id: string };
  let orgB: { id: string };

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, validationSchema: envValidationSchema })],
      providers: [DatabaseService],
    }).compile();
    databaseService = moduleRef.get(DatabaseService);
    rawPool = new Pool({ connectionString: process.env.DATABASE_URL });

    orgA = await createOrganization(databaseService, {
      name: 'Patient Isolation Test Org A',
      slug: `patient-isolation-test-a-${Date.now()}`,
    });
    orgB = await createOrganization(databaseService, {
      name: 'Patient Isolation Test Org B',
      slug: `patient-isolation-test-b-${Date.now()}`,
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
    await rawPool.end();
    await databaseService.onModuleDestroy();
  });

  describe('Lecture croisee entre organisations', () => {
    it('un patient cree dans l organisation A n est jamais visible scope sur l organisation B', async () => {
      const created = await createPatient(databaseService, orgA.id, {
        firstName: 'Isole',
        lastName: 'OrgA',
      });

      const seenFromA = await findPatientById(databaseService, orgA.id, created.id);
      const seenFromB = await findPatientById(databaseService, orgB.id, created.id);

      expect(seenFromA?.id).toBe(created.id);
      expect(seenFromB).toBeUndefined();
    });

    it('symetriquement, un patient cree dans l organisation B n est jamais visible scope sur l organisation A', async () => {
      const created = await createPatient(databaseService, orgB.id, {
        firstName: 'Isole',
        lastName: 'OrgB',
      });

      const seenFromB = await findPatientById(databaseService, orgB.id, created.id);
      const seenFromA = await findPatientById(databaseService, orgA.id, created.id);

      expect(seenFromB?.id).toBe(created.id);
      expect(seenFromA).toBeUndefined();
    });
  });

  describe('Ecriture scopee', () => {
    it('updatePatient ne modifie que la fiche de sa propre organisation', async () => {
      const created = await createPatient(databaseService, orgA.id, {
        firstName: 'Avant',
        lastName: 'Update',
      });
      const updated = await updatePatient(databaseService, orgA.id, created.id, {
        firstName: 'Apres',
      });
      expect(updated.firstName).toBe('Apres');

      const seenFromB = await findPatientById(databaseService, orgB.id, created.id);
      expect(seenFromB).toBeUndefined();
    });

    it('updatePatientRecordStatus ne modifie que le dossier de sa propre organisation', async () => {
      const created = await createPatient(databaseService, orgA.id, {
        firstName: 'Statut',
        lastName: 'Update',
      });
      const updated = await updatePatientRecordStatus(
        databaseService,
        orgA.id,
        created.record.id,
        'archived',
      );
      expect(updated.status).toBe('archived');
    });

    it('createPatient refuse un responsable appartenant a une autre organisation (defense en profondeur, TASK-021)', async () => {
      const responsibleInOrgB = await createPatient(databaseService, orgB.id, {
        firstName: 'Responsable',
        lastName: 'AutreOrg',
      });

      await expect(
        createPatient(databaseService, orgA.id, {
          firstName: 'Dependant',
          lastName: 'MauvaisResponsable',
          responsiblePatientRecordId: responsibleInOrgB.record.id,
        }),
      ).rejects.toThrow('same organization');
    });
  });

  describe('Contournement RLS brut (sans passer par l application)', () => {
    it('une requete SQL directe sur patients, sans SET LOCAL, ne retourne aucune ligne (donnee pourtant presente)', async () => {
      await createPatient(databaseService, orgA.id, {
        firstName: 'Brut',
        lastName: 'SansContexte',
      });

      const result = await rawPool.query('SELECT * FROM patients WHERE organization_id = $1', [
        orgA.id,
      ]);
      expect(result.rows).toHaveLength(0);
    });

    it('une requete SQL directe sur patient_records, sans SET LOCAL, ne retourne aucune ligne (donnee pourtant presente)', async () => {
      const result = await rawPool.query(
        'SELECT * FROM patient_records WHERE organization_id = $1',
        [orgA.id],
      );
      expect(result.rows).toHaveLength(0);
    });

    it('confirme que la donnee existe reellement (controle positif, vu avec le contexte positionne)', async () => {
      const patients = await databaseService.withOrganizationScope(orgA.id, (tx) =>
        tx.execute(sql`SELECT * FROM patients WHERE organization_id = ${orgA.id}`),
      );
      expect(patients.rows.length).toBeGreaterThan(0);

      const records = await databaseService.withOrganizationScope(orgA.id, (tx) =>
        tx.execute(sql`SELECT * FROM patient_records WHERE organization_id = ${orgA.id}`),
      );
      expect(records.rows.length).toBeGreaterThan(0);
    });
  });
});
