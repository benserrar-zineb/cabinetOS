import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { sql } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { DatabaseService } from '../../src/modules/shared/database/database.service';
import { envValidationSchema } from '../../src/modules/shared/config/env.validation';
import { createOrganization } from '../../src/modules/organization/infrastructure/organization.queries';
import { createMembership } from '../../src/modules/organization/infrastructure/membership.queries';

// TASK-040 (BUILD-003, EA-010) : les trois cas exacts du spike (ADR-0016,
// docs/specs/BUILD-003-medecin.md), demandes explicitement par l encadrant pour la
// cloture d EA-010 -- testes ici avec de vraies donnees, pas seulement verifies
// manuellement.
//
// Repli du spike applique : la cle composee (organizationId, userId) ->
// memberships(organizationId, userId) ne porte AUCUNE action de suppression
// automatique (ON DELETE SET NULL natif est inviable sur une cle composee -- il
// mettrait organizationId a NULL en meme temps que userId, violant sa contrainte
// NOT NULL). Le detachement passe par un trigger BEFORE DELETE sur memberships qui
// ne touche que userId.

describe('Cle composee medecins -> memberships et trigger de detachement (TASK-040)', () => {
  let moduleRef: TestingModule;
  let databaseService: DatabaseService;
  let orgA: { id: string };
  let orgB: { id: string };
  const userId = `task040-user-${Date.now()}`;
  const roleId = uuidv7();

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, validationSchema: envValidationSchema })],
      providers: [DatabaseService],
    }).compile();
    databaseService = moduleRef.get(DatabaseService);

    orgA = await createOrganization(databaseService, {
      name: 'Medecin FK Test Org A',
      slug: `medecin-fk-test-a-${Date.now()}`,
    });
    orgB = await createOrganization(databaseService, {
      name: 'Medecin FK Test Org B',
      slug: `medecin-fk-test-b-${Date.now()}`,
    });

    await databaseService.db.execute(
      sql`INSERT INTO users (id, name, email) VALUES (${userId}, 'Task040 User', ${userId + '@example.com'})`,
    );
    await databaseService.db.execute(
      sql`INSERT INTO roles (id, name) VALUES (${roleId}, ${'Task040Role-' + roleId})`,
    );
  });

  afterAll(async () => {
    await databaseService.withOrganizationScope(orgA.id, (tx) =>
      tx.execute(sql`DELETE FROM medecins WHERE organization_id = ${orgA.id}`),
    );
    await databaseService.withOrganizationScope(orgB.id, (tx) =>
      tx.execute(sql`DELETE FROM medecins WHERE organization_id = ${orgB.id}`),
    );
    await databaseService.db.execute(sql`DELETE FROM memberships WHERE user_id = ${userId}`);
    await databaseService.db.execute(sql`DELETE FROM users WHERE id = ${userId}`);
    await databaseService.db.execute(sql`DELETE FROM roles WHERE id = ${roleId}`);
    await databaseService.db.execute(
      sql`DELETE FROM organizations WHERE id IN (${orgA.id}, ${orgB.id})`,
    );
    await databaseService.onModuleDestroy();
  });

  it('CAS 1 -- un medecin qui part : l identite survit, reste scopee a son organisation, userId repasse a NULL', async () => {
    await createMembership(databaseService, orgA.id, { userId, roleId });

    const medecinId = uuidv7();
    await databaseService.withOrganizationScope(orgA.id, (tx) =>
      tx.execute(
        sql`INSERT INTO medecins (id, organization_id, first_name, last_name, user_id) VALUES (${medecinId}, ${orgA.id}, 'Rattache', 'AvantDepart', ${userId})`,
      ),
    );

    const before = await databaseService.withOrganizationScope(orgA.id, (tx) =>
      tx.execute(sql`SELECT organization_id, user_id FROM medecins WHERE id = ${medecinId}`),
    );
    expect((before.rows[0] as { user_id: string }).user_id).toBe(userId);

    // Le medecin quitte l organisation : suppression du membership (role admin,
    // comme un vrai flux de depart le ferait). Doit passer par withOrganizationScope
    // -- memberships est elle-meme protegee par RLS (BUILD-001) : sans le contexte
    // d organisation positionne, la suppression filtrerait silencieusement a zero
    // ligne plutot que d echouer bruyamment.
    await databaseService.withOrganizationScope(orgA.id, (tx) =>
      tx.execute(
        sql`DELETE FROM memberships WHERE user_id = ${userId} AND organization_id = ${orgA.id}`,
      ),
    );

    const after = await databaseService.withOrganizationScope(orgA.id, (tx) =>
      tx.execute(sql`SELECT organization_id, user_id FROM medecins WHERE id = ${medecinId}`),
    );
    expect(after.rows).toHaveLength(1); // l identite survit (jamais de suppression)
    expect((after.rows[0] as { organization_id: string }).organization_id).toBe(orgA.id); // reste scopee
    expect((after.rows[0] as { user_id: string | null }).user_id).toBeNull(); // detache
  });

  it("CAS 2 -- un userId d'une autre organisation est refuse par la cle composee", async () => {
    // userId est membre de orgA (recree ici, le CAS 1 l a detache), jamais de orgB.
    await createMembership(databaseService, orgA.id, { userId, roleId });

    await expect(
      databaseService.withOrganizationScope(orgB.id, (tx) =>
        tx.execute(
          sql`INSERT INTO medecins (id, organization_id, first_name, last_name, user_id) VALUES (${uuidv7()}, ${orgB.id}, 'Mauvais', 'Rattachement', ${userId})`,
        ),
      ),
    ).rejects.toMatchObject({ cause: { code: '23503' } }); // foreign_key_violation
  });

  it('CAS 3 -- un medecin externe (userId NULL) est accepte sans aucun membership', async () => {
    await expect(
      databaseService.withOrganizationScope(orgB.id, (tx) =>
        tx.execute(
          sql`INSERT INTO medecins (id, organization_id, first_name, last_name, user_id) VALUES (${uuidv7()}, ${orgB.id}, 'Externe', 'SansCompte', NULL)`,
        ),
      ),
    ).resolves.toBeDefined();
  });
});
