-- BUILD-002 - Tache d ouverture : audit_events append-only au niveau base (dette ouverte
-- a la cloture de BUILD-001). Le code n exposait deja aucune fonction update/delete sur
-- audit_events (voir apps/api/src/modules/audit/infrastructure/audit-event.queries.ts),
-- mais rien, au niveau base, n empechait une modification ou une suppression directe.
--
-- Point de vigilance verifie avant d ecrire cette migration (propriete de la table) :
-- audit_events appartient au role postgres, qui execute toujours les migrations via
-- ADMIN_DATABASE_URL -- jamais cabinetos_app (voir README.md et
-- docs/adr/spike-drizzle-rls.md). cabinetos_app ne possede la table nulle part ; ses
-- privileges actuels (SELECT, INSERT, UPDATE, DELETE) proviennent d un GRANT explicite
-- accorde a la creation du role, sans WITH GRANT OPTION -- verifie via
-- information_schema.role_table_grants (is_grantable = NO pour cabinetos_app sur
-- audit_events). Un REVOKE sur ce role n est donc pas contournable par un re-GRANT :
-- cabinetos_app n a ni la propriete ni le droit de redonner les privileges retires.
--
-- RLS (politique audit_events_isolation, migration 0001) et ce REVOKE sont complementaires,
-- pas redondants : RLS filtre les LIGNES visibles, ce REVOKE interdit le TYPE d operation.
-- La politique RLS existante n est pas modifiee.

REVOKE UPDATE, DELETE ON audit_events FROM cabinetos_app;

-- DOWN (rollback documente, non execute automatiquement -- a appliquer manuellement avec
-- le role postgres / ADMIN_DATABASE_URL en cas de retour en arriere) :
--   GRANT UPDATE, DELETE ON audit_events TO cabinetos_app;