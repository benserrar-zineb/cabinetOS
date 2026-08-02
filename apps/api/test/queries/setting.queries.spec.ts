import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { sql } from 'drizzle-orm';
import { DatabaseService } from '../../src/modules/shared/database/database.service';
import { envValidationSchema } from '../../src/modules/shared/config/env.validation';
import { createOrganization } from '../../src/modules/organization/infrastructure/organization.queries';
import {
  upsertSetting,
  findSettingByKey,
  findAllSettings,
  deleteSetting,
} from '../../src/modules/settings/infrastructure/setting.queries';

describe('setting.queries (TASK-009)', () => {
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
      name: 'Setting Test Org A',
      slug: `setting-test-org-a-${Date.now()}`,
    });
    orgB = await createOrganization(databaseService, {
      name: 'Setting Test Org B',
      slug: `setting-test-org-b-${Date.now()}`,
    });
  });

  afterAll(async () => {
    await databaseService.db.execute(
      sql`DELETE FROM organizations WHERE id IN (${orgA.id}, ${orgB.id})`,
    );
    await databaseService.onModuleDestroy();
  });

  it('cree et lit une valeur dans le contexte de son organisation', async () => {
    await upsertSetting(databaseService, orgA.id, 'theme', { color: 'blue' });
    const setting = await findSettingByKey(databaseService, orgA.id, 'theme');
    expect(setting?.value).toEqual({ color: 'blue' });
  });

  it('ne voit jamais le parametre d une autre organisation (scoping)', async () => {
    await upsertSetting(databaseService, orgB.id, 'theme', { color: 'red' });

    const seenFromA = await findSettingByKey(databaseService, orgA.id, 'theme');
    const seenFromB = await findSettingByKey(databaseService, orgB.id, 'theme');

    expect(seenFromA?.value).toEqual({ color: 'blue' });
    expect(seenFromB?.value).toEqual({ color: 'red' });
  });

  it('upsert met a jour et non duplique', async () => {
    await upsertSetting(databaseService, orgA.id, 'theme', { color: 'green' });
    const all = await findAllSettings(databaseService, orgA.id);
    const themeEntries = all.filter((s) => s.key === 'theme');
    expect(themeEntries).toHaveLength(1);
    expect(themeEntries[0].value).toEqual({ color: 'green' });
  });

  it('supprime uniquement dans son propre contexte', async () => {
    await deleteSetting(databaseService, orgA.id, 'theme');
    const afterDeleteA = await findSettingByKey(databaseService, orgA.id, 'theme');
    const stillB = await findSettingByKey(databaseService, orgB.id, 'theme');
    expect(afterDeleteA).toBeUndefined();
    expect(stillB?.value).toEqual({ color: 'red' });

    await deleteSetting(databaseService, orgB.id, 'theme');
  });
});
