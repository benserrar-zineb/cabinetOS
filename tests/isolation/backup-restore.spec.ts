import { execFileSync } from 'child_process';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir, platform } from 'os';
import {
  Test,
  TestingModule,
  ConfigModule,
  DatabaseService,
  envValidationSchema,
  createOrganization,
  createMembership,
  findMembershipsByOrganization,
  Pool,
  sql,
} from '../../apps/api/test/isolation-test-kit';

// TASK-012 : le cycle complet sauvegarde -> restauration ne doit ni casser ni
// contourner l isolation RLS. Utilise le script documente (scripts/backup-restore.sh),
// exactement comme le ferait un administrateur en situation reelle.

const SCRIPT_PATH = join(__dirname, '../../scripts/backup-restore.sh');
const ADMIN_DATABASE_URL = process.env.ADMIN_DATABASE_URL;

// Sur Windows, "bash" seul peut resoudre vers le lanceur WSL (souvent installe par
// Docker Desktop) plutot que Git Bash, ce qui echoue si WSL n est pas configure pour
// executer /bin/bash directement. On vise donc l executable Git Bash explicitement.
const BASH_EXECUTABLE =
  process.env.BASH_EXECUTABLE ??
  (platform() === 'win32' ? 'C:\\Program Files\\Git\\bin\\bash.exe' : 'bash');

// Git Bash a son propre environnement PATH, distinct de celui de PowerShell -- il ne
// retrouve pas toujours pg_dump/psql meme s ils fonctionnent depuis un terminal normal
// (l espace dans "Program Files" pose souvent probleme a la traduction de PATH de MSYS2).
// On fournit donc des chemins explicites en repli sur Windows.
const scriptEnv = {
  ...process.env,
  ...(platform() === 'win32'
    ? {
        PG_DUMP_BIN:
          process.env.PG_DUMP_BIN ?? 'C:\\Program Files\\PostgreSQL\\18\\bin\\pg_dump.exe',
        PSQL_BIN: process.env.PSQL_BIN ?? 'C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe',
      }
    : {}),
};

const PSQL_EXECUTABLE =
  process.env.PSQL_BIN ??
  (platform() === 'win32' ? 'C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe' : 'psql');

describe('Sauvegarde et restauration avec RLS actif (TASK-012)', () => {
  let moduleRef: TestingModule;
  let databaseService: DatabaseService;
  let rawPool: Pool;
  let orgId: string;
  let membershipId: string;
  const userId = `backup-restore-user-${Date.now()}`;
  const roleId = '00000000-0000-0000-0000-000000000009';
  const roleName = `BackupRestoreRole-${Date.now()}`;
  let tmpDir: string;
  let backupFile: string;

  beforeAll(() => {
    if (!ADMIN_DATABASE_URL) {
      throw new Error(
        'ADMIN_DATABASE_URL est requis pour ce test (compte superutilisateur, distinct du role applicatif).',
      );
    }
  });

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, validationSchema: envValidationSchema })],
      providers: [DatabaseService],
    }).compile();
    databaseService = moduleRef.get(DatabaseService);
    rawPool = new Pool({ connectionString: process.env.DATABASE_URL });

    tmpDir = mkdtempSync(join(tmpdir(), 'backup-restore-test-'));
    backupFile = join(tmpDir, 'backup.sql');

    const org = await createOrganization(databaseService, {
      name: 'Backup Restore Test Org',
      slug: `backup-restore-test-${Date.now()}`,
    });
    orgId = org.id;

    await databaseService.db.execute(
      sql`INSERT INTO roles (id, name) VALUES (${roleId}, ${roleName}) ON CONFLICT (id) DO NOTHING`,
    );
    await databaseService.db.execute(
      sql`INSERT INTO users (id, name, email) VALUES (${userId}, 'Backup Restore User', ${userId + '@example.com'})`,
    );

    const membership = await createMembership(databaseService, orgId, { userId, roleId });
    membershipId = membership.id;
  });

  afterEach(async () => {
    rmSync(tmpDir, { recursive: true, force: true });
    await databaseService.withOrganizationScope(orgId, (tx) =>
      tx.execute(sql`DELETE FROM memberships WHERE organization_id = ${orgId}`),
    );
    await databaseService.db.execute(sql`DELETE FROM users WHERE id = ${userId}`);
    await databaseService.db.execute(sql`DELETE FROM roles WHERE id = ${roleId}`);
    await databaseService.db.execute(sql`DELETE FROM organizations WHERE id = ${orgId}`);
    await rawPool.end();
    await databaseService.onModuleDestroy();
  });

  it('un cycle complet sauvegarde -> perte de donnees -> restauration preserve les donnees et l isolation RLS', async () => {
    execFileSync(
      BASH_EXECUTABLE,
      [
        SCRIPT_PATH,
        'backup',
        ADMIN_DATABASE_URL as string,
        backupFile,
        '--data-only',
        '--table=organizations',
        '--table=memberships',
      ],
      { env: scriptEnv },
    );

    execFileSync(PSQL_EXECUTABLE, [
      ADMIN_DATABASE_URL as string,
      '-c',
      'TRUNCATE organizations, memberships CASCADE;',
    ]);

    const afterWipe = await rawPool.query('SELECT * FROM organizations WHERE id = $1', [orgId]);
    expect(afterWipe.rows).toHaveLength(0);

    execFileSync(
      BASH_EXECUTABLE,
      [SCRIPT_PATH, 'restore', ADMIN_DATABASE_URL as string, backupFile],
      { env: scriptEnv },
    );

    const restored = await findMembershipsByOrganization(databaseService, orgId);
    expect(restored).toHaveLength(1);
    expect(restored[0].id).toBe(membershipId);

    const directQuery = await rawPool.query(
      'SELECT * FROM memberships WHERE organization_id = $1',
      [orgId],
    );
    expect(directQuery.rows).toHaveLength(0);
  });
});
