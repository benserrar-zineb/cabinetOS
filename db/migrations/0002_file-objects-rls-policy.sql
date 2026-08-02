-- Correction (revue de EA-003 par l encadrant) : file_objects portait organizationId
-- NOT NULL + indexe des TASK-006, mais n avait recu aucune politique RLS en TASK-010 --
-- un oubli, la table Storage etant un squelette au moment de TASK-010. Meme modele que
-- les 4 autres tables scopees (voir docs/adr/spike-drizzle-rls.md pour le detail du nullif).

ALTER TABLE file_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_objects FORCE ROW LEVEL SECURITY;
CREATE POLICY file_objects_isolation ON file_objects
  USING (organization_id = nullif(current_setting('app.organization_id', true), '')::uuid);