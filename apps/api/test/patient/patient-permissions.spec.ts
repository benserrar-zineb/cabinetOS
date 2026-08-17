import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { DatabaseService } from '../../src/modules/shared/database/database.service';
import { envValidationSchema } from '../../src/modules/shared/config/env.validation';
import { findAllPermissions } from '../../src/modules/access-control';

// TASK-024 (BUILD-002, EA-009) : les permissions sont declarees par une migration
// de donnees (0008_patient-permissions.sql), pas par du code applicatif -- ce test
// verifie que la declaration a bien pris effet dans le catalogue global, via la
// fonction de lecture publique du module access-control (aucun acces direct a sa
// table depuis l exterieur).

describe('Permissions du module Patient (TASK-024)', () => {
  let moduleRef: TestingModule;
  let databaseService: DatabaseService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, validationSchema: envValidationSchema })],
      providers: [DatabaseService],
    }).compile();
    databaseService = moduleRef.get(DatabaseService);
  });

  afterAll(async () => {
    await databaseService.onModuleDestroy();
  });

  it('declare la permission manage sur la ressource patients', async () => {
    const all = await findAllPermissions(databaseService);
    expect(all.some((p) => p.action === 'manage' && p.resource === 'patients')).toBe(true);
  });

  it('declare la permission read sur la ressource patients', async () => {
    const all = await findAllPermissions(databaseService);
    expect(all.some((p) => p.action === 'read' && p.resource === 'patients')).toBe(true);
  });

  it('ne declare rien de plus que ces deux permissions pour la ressource patients (minimal, Passe 1 decision C.7)', async () => {
    const all = await findAllPermissions(databaseService);
    const patientPermissions = all.filter((p) => p.resource === 'patients');
    expect(patientPermissions).toHaveLength(2);
  });
});
