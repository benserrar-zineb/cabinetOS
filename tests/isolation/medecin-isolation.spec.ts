import {
  Test,
  TestingModule,
  ConfigModule,
  DatabaseService,
  envValidationSchema,
  createOrganization,
  createMedecin,
  findMedecinById,
  updateMedecin,
  Pool,
  sql,
  uuidv7,
} from '../../apps/api/test/isolation-test-kit';

// TASK-042 (BUILD-003, EA-011) : suite d isolation dediee pour medecins, meme
// modele que patient-isolation.spec.ts (TASK-023). medecins avait deja rejoint la
// suite generique rls-policies.spec.ts (TASK-039) ; cette suite est le test dedie
// exige par les criteres d acceptation, au meme niveau de rigueur.
//
// Un cas supplementaire, propre a ce module (absent chez Patient) : le refus d un
// userId appartenant a une autre organisation, garanti par la cle composee vers
// memberships (ADR-0016, TASK-040) -- deja teste dans medecin-membership-fk.spec.ts
// au niveau unitaire ; repris ici au niveau isolation pour la cloture d EA-011,
// comme demande explicitement.
//
// Comme pour les autres suites d isolation : prouver que l acces refuse echoue
// reellement, pas seulement que l acces autorise reussit (controle positif inclus).

describe('Isolation multi-tenant - module Medecin', () => {
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
      name: 'Medecin Isolation Test Org A',
      slug: `medecin-isolation-test-a-${Date.now()}`,
    });
    orgB = await createOrganization(databaseService, {
      name: 'Medecin Isolation Test Org B',
      slug: `medecin-isolation-test-b-${Date.now()}`,
    });
  });

  afterAll(async () => {
    await databaseService.withOrganizationScope(orgA.id, (tx) =>
      tx.execute(sql`DELETE FROM medecins WHERE organization_id = ${orgA.id}`),
    );
    await databaseService.withOrganizationScope(orgB.id, (tx) =>
      tx.execute(sql`DELETE FROM medecins WHERE organization_id = ${orgB.id}`),
    );
    await databaseService.db.execute(
      sql`DELETE FROM organizations WHERE id IN (${orgA.id}, ${orgB.id})`,
    );
    await rawPool.end();
    await databaseService.onModuleDestroy();
  });

  describe('Lecture croisee entre organisations', () => {
    it('un medecin cree dans l organisation A n est jamais visible scope sur l organisation B', async () => {
      const created = await createMedecin(databaseService, orgA.id, {
        firstName: 'Isole',
        lastName: 'OrgA',
      });

      const seenFromA = await findMedecinById(databaseService, orgA.id, created.id);
      const seenFromB = await findMedecinById(databaseService, orgB.id, created.id);

      expect(seenFromA?.id).toBe(created.id);
      expect(seenFromB).toBeUndefined();
    });

    it('symetriquement, un medecin cree dans l organisation B n est jamais visible scope sur l organisation A', async () => {
      const created = await createMedecin(databaseService, orgB.id, {
        firstName: 'Isole',
        lastName: 'OrgB',
      });

      const seenFromB = await findMedecinById(databaseService, orgB.id, created.id);
      const seenFromA = await findMedecinById(databaseService, orgA.id, created.id);

      expect(seenFromB?.id).toBe(created.id);
      expect(seenFromA).toBeUndefined();
    });
  });

  describe('Ecriture scopee', () => {
    it('updateMedecin ne modifie que la fiche de sa propre organisation', async () => {
      const created = await createMedecin(databaseService, orgA.id, {
        firstName: 'Avant',
        lastName: 'Update',
      });
      const updated = await updateMedecin(databaseService, orgA.id, created.id, {
        city: 'Casablanca',
      });
      expect(updated?.city).toBe('Casablanca');

      const seenFromB = await findMedecinById(databaseService, orgB.id, created.id);
      expect(seenFromB).toBeUndefined();
    });

    it('refuse un userId appartenant a une AUTRE organisation (cle composee, ADR-0016, TASK-040)', async () => {
      const userId = `medecin-isolation-fk-${Date.now()}`;
      const roleId = uuidv7();
      await databaseService.db.execute(
        sql`INSERT INTO users (id, name, email) VALUES (${userId}, 'Isolation FK Test', ${userId + '@example.com'})`,
      );
      await databaseService.db.execute(
        sql`INSERT INTO roles (id, name) VALUES (${roleId}, ${'IsolationFkRole-' + roleId})`,
      );
      // Membership dans orgA uniquement.
      await databaseService.withOrganizationScope(orgA.id, (tx) =>
        tx.execute(
          sql`INSERT INTO memberships (id, user_id, organization_id, role_id) VALUES (${uuidv7()}, ${userId}, ${orgA.id}, ${roleId})`,
        ),
      );

      await expect(createMedecin(databaseService, orgB.id, { firstName: 'X', lastName: 'Y', userId })).rejects.toMatchObject(
        { cause: { code: '23503' } },
      );

      await databaseService.db.execute(sql`DELETE FROM memberships WHERE user_id = ${userId}`);
      await databaseService.db.execute(sql`DELETE FROM users WHERE id = ${userId}`);
      await databaseService.db.execute(sql`DELETE FROM roles WHERE id = ${roleId}`);
    });
  });

  describe('Contournement RLS brut (sans passer par l application)', () => {
    it('une requete SQL directe sur medecins, sans SET LOCAL, ne retourne aucune ligne (donnee pourtant presente)', async () => {
      await createMedecin(databaseService, orgA.id, {
        firstName: 'Brut',
        lastName: 'SansContexte',
      });

      const result = await rawPool.query('SELECT * FROM medecins WHERE organization_id = $1', [
        orgA.id,
      ]);
      expect(result.rows).toHaveLength(0);
    });

    it('confirme que la donnee existe reellement (controle positif, vu avec le contexte positionne)', async () => {
      const rows = await databaseService.withOrganizationScope(orgA.id, (tx) =>
        tx.execute(sql`SELECT * FROM medecins WHERE organization_id = ${orgA.id}`),
      );
      expect(rows.rows.length).toBeGreaterThan(0);
    });
  });
});
