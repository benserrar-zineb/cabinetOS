-- TASK-039 (BUILD-003, EA-010) : RLS forcee + index d unicite partiels scopes par
-- organisation. Meme patron que Patient (migration 0005), meme limite d outillage
-- Drizzle (RLS et index partiels avec WHERE ne sont pas exprimables dans le schema
-- declaratif -- ADR-0006).
--
-- Trois index d unicite partiels demandes explicitement par le Gate (Passe 2) :
-- userId, inpe, numeroOrdre. Chacun WHERE ... IS NOT NULL -- jamais d unicite
-- globale (ADR-0018 pour inpe/numeroOrdre ; userId : un meme utilisateur ne peut
-- avoir qu une seule fiche medecins par organisation, evite les doublons
-- d identite pour un medecin-utilisateur).

ALTER TABLE "medecins" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "medecins" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "medecins_isolation" ON "medecins"
  USING (organization_id = NULLIF(current_setting('app.organization_id', true), '')::uuid);--> statement-breakpoint

DROP INDEX "medecins_user_id_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "medecins_user_id_unique_idx" ON "medecins" ("organization_id", "user_id") WHERE "user_id" IS NOT NULL;--> statement-breakpoint

DROP INDEX "medecins_inpe_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "medecins_inpe_unique_idx" ON "medecins" ("organization_id", "inpe") WHERE "inpe" IS NOT NULL;--> statement-breakpoint

DROP INDEX "medecins_numero_ordre_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "medecins_numero_ordre_unique_idx" ON "medecins" ("organization_id", "numero_ordre") WHERE "numero_ordre" IS NOT NULL;

-- DOWN (rollback documente, non execute automatiquement -- a appliquer avec le role
-- postgres / ADMIN_DATABASE_URL) :
--   DROP INDEX IF EXISTS medecins_numero_ordre_unique_idx;
--   CREATE INDEX medecins_numero_ordre_idx ON medecins (organization_id, numero_ordre);
--   DROP INDEX IF EXISTS medecins_inpe_unique_idx;
--   CREATE INDEX medecins_inpe_idx ON medecins (organization_id, inpe);
--   DROP INDEX IF EXISTS medecins_user_id_unique_idx;
--   CREATE INDEX medecins_user_id_idx ON medecins (organization_id, user_id);
--   DROP POLICY IF EXISTS medecins_isolation ON medecins;
--   ALTER TABLE medecins NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE medecins DISABLE ROW LEVEL SECURITY;