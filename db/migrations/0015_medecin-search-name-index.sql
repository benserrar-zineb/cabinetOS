-- TASK-046 (BUILD-003, EA-012) : recherche floue sur nom+prenom pour medecins,
-- meme mecanisme que Patient (migrations 0009/0010, TASK-026) -- pg_trgm et
-- unaccent sont deja actives depuis TASK-026, aucune nouvelle extension ici,
-- seulement un nouvel index.
--
-- Reutilise patient_search_unaccent() tel quel plutot que de dupliquer une
-- fonction identique sous un nom different : son comportement (unaccent avec
-- enveloppe immutable) est generique, rien en elle n est specifique a Patient
-- malgre son nom -- coherent avec le principe "ne pas redefinir l existant"
-- (deja invoque pour ADR-0016). Le nom reste un artefact historique (Patient a
-- ete la premiere table a en avoir eu besoin) ; documente ici pour qu un futur
-- lecteur ne s y trompe pas et ne la duplique pas par erreur.
--
-- Point de vigilance signale par avance (Passe 2, issue #23) : au-dela d un
-- certain volume par organisation, la politique RLS empeche PostgreSQL
-- d utiliser cet index -- deja mesure pour Patient (~20 000 lignes, 8ms -> 85-100ms).
-- Mesure equivalente pour medecins : voir docs/builds (cloture EA-012).

CREATE INDEX medecins_name_trgm_idx ON medecins
  USING gin (patient_search_unaccent(lower(first_name || ' ' || last_name)) gin_trgm_ops);

-- DOWN (rollback documente, non execute automatiquement) :
--   DROP INDEX IF EXISTS medecins_name_trgm_idx;
