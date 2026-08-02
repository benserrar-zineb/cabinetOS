-- TASK-010 : politiques RLS sur les tables Core scopees par organisation.
-- Modele valide par le spike TASK-008B (nullif pour eviter une erreur de cast
-- au lieu d un ensemble vide quand aucun contexte n est positionne).
-- ATTENTION : ces politiques n ont aucun effet si la connexion utilise un
-- role superutilisateur (ex: postgres) -- voir docs/adr/spike-drizzle-rls.md.

ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships FORCE ROW LEVEL SECURITY;
CREATE POLICY memberships_isolation ON memberships
  USING (organization_id = nullif(current_setting('app.organization_id', true), '')::uuid);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings FORCE ROW LEVEL SECURITY;
CREATE POLICY settings_isolation ON settings
  USING (organization_id = nullif(current_setting('app.organization_id', true), '')::uuid);

ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events FORCE ROW LEVEL SECURITY;
CREATE POLICY audit_events_isolation ON audit_events
  USING (organization_id = nullif(current_setting('app.organization_id', true), '')::uuid);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications FORCE ROW LEVEL SECURITY;
CREATE POLICY notifications_isolation ON notifications
  USING (organization_id = nullif(current_setting('app.organization_id', true), '')::uuid);