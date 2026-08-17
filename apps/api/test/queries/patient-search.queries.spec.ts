import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { DatabaseService } from '../../src/modules/shared/database/database.service';
import { envValidationSchema } from '../../src/modules/shared/config/env.validation';
import { createOrganization } from '../../src/modules/organization/infrastructure/organization.queries';
import { createPatient } from '../../src/business/patient/infrastructure/patient.queries';
import {
  searchPatientsByName,
  findPatientsByPhone,
  findPatientsByCin,
} from '../../src/business/patient/infrastructure/patient-search.queries';
import { sql } from 'drizzle-orm';

// TASK-026 (BUILD-002, EA-009) : comme pour l isolation, le test doit prouver qu on
// TROUVE malgre la variation de forme, pas seulement le cas exact -- chaque test ici
// saisit une forme differente de celle stockee et verifie que le meme patient est
// retrouve.

describe('patient-search.queries (TASK-026)', () => {
  let moduleRef: TestingModule;
  let databaseService: DatabaseService;
  let org: { id: string };

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, validationSchema: envValidationSchema })],
      providers: [DatabaseService],
    }).compile();
    databaseService = moduleRef.get(DatabaseService);

    org = await createOrganization(databaseService, {
      name: 'Patient Search Test Org',
      slug: `patient-search-test-${Date.now()}`,
    });
  });

  afterAll(async () => {
    await databaseService.withOrganizationScope(org.id, (tx) =>
      tx.execute(sql`DELETE FROM patient_records WHERE organization_id = ${org.id}`),
    );
    await databaseService.withOrganizationScope(org.id, (tx) =>
      tx.execute(sql`DELETE FROM patients WHERE organization_id = ${org.id}`),
    );
    await databaseService.db.execute(
      sql`DELETE FROM patient_record_counters WHERE organization_id = ${org.id}`,
    );
    await databaseService.db.execute(sql`DELETE FROM organizations WHERE id = ${org.id}`);
    await databaseService.onModuleDestroy();
  });

  describe('Recherche par nom (floue, Q4)', () => {
    it('une saisie "fatma" (accent omis) retrouve "Fatima" (accent present)', async () => {
      await createPatient(databaseService, org.id, { firstName: 'Fatima', lastName: 'Recherche1' });
      const results = await searchPatientsByName(databaseService, org.id, 'fatma recherche1');
      expect(results.some((r) => r.firstName === 'Fatima' && r.lastName === 'Recherche1')).toBe(
        true,
      );
    });

    it('une saisie avec une seule consonne ("Benani") retrouve "Bennani" (double consonne)', async () => {
      await createPatient(databaseService, org.id, { firstName: 'Rachid', lastName: 'Bennani' });
      const results = await searchPatientsByName(databaseService, org.id, 'rachid benani');
      expect(results.some((r) => r.lastName === 'Bennani')).toBe(true);
    });

    it('l ordre nom/prenom inverse retrouve tout de meme le patient', async () => {
      await createPatient(databaseService, org.id, { firstName: 'Karim', lastName: 'Alaoui' });
      const results = await searchPatientsByName(databaseService, org.id, 'alaoui karim');
      expect(results.some((r) => r.firstName === 'Karim' && r.lastName === 'Alaoui')).toBe(true);
    });
  });

  describe('Recherche par telephone (exact/prefixe, normalise)', () => {
    it('quatre formes de saisie differentes retrouvent le meme patient', async () => {
      const created = await createPatient(databaseService, org.id, {
        firstName: 'Telephone',
        lastName: 'Test',
        phoneNationalNumber: '0651234567',
      });

      const forms = ['0651234567', '651234567', '+212 651 234 567', '00212651234567'];
      for (const form of forms) {
        const results = await findPatientsByPhone(databaseService, org.id, form);
        expect(results.some((r) => r.id === created.id)).toBe(true);
      }
    });

    it('un prefixe retrouve le patient (recherche partielle acceptee, Q4)', async () => {
      const created = await createPatient(databaseService, org.id, {
        firstName: 'Prefixe',
        lastName: 'Test',
        phoneNationalNumber: '0699887766',
      });
      const results = await findPatientsByPhone(databaseService, org.id, '699');
      expect(results.some((r) => r.id === created.id)).toBe(true);
    });
  });

  describe('Recherche par CIN (exact, normalise)', () => {
    it('une saisie en minuscules avec espaces retrouve le meme patient qu un CIN stocke normalise', async () => {
      const created = await createPatient(databaseService, org.id, {
        firstName: 'Cin',
        lastName: 'Test',
        cin: 'AB123456',
      });

      const results = await findPatientsByCin(databaseService, org.id, 'ab 123 456');
      expect(results.some((r) => r.id === created.id)).toBe(true);
    });
  });
});
