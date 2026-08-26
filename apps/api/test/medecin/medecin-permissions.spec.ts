import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { DatabaseService } from '../../src/modules/shared/database/database.service';
import { envValidationSchema } from '../../src/modules/shared/config/env.validation';
import { findAllPermissions } from '../../src/modules/access-control';

// TASK-044 (BUILD-003, EA-011) : les permissions sont declarees par une migration
// de donnees (0011_medecin-permissions.sql), pas par du code applicatif -- meme
// patron que TASK-024 pour Patient. Ce test verifie que la declaration a bien pris
// effet dans le catalogue global, via la fonction de lecture publique du module
// access-control.

describe('Permissions du module Medecin (TASK-044)', () => {
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

  it('declare la permission manage sur la ressource medecins', async () => {
    const all = await findAllPermissions(databaseService);
    expect(all.some((p) => p.action === 'manage' && p.resource === 'medecins')).toBe(true);
  });

  it('declare la permission read sur la ressource medecins', async () => {
    const all = await findAllPermissions(databaseService);
    expect(all.some((p) => p.action === 'read' && p.resource === 'medecins')).toBe(true);
  });

  it('ne declare rien de plus que ces deux permissions pour la ressource medecins (minimal, Passe 1 decision C.5)', async () => {
    const all = await findAllPermissions(databaseService);
    const medecinPermissions = all.filter((p) => p.resource === 'medecins');
    expect(medecinPermissions).toHaveLength(2);
  });
});
