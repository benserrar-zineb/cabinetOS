-- BUG trouve en test local (PostgreSQL 18, comme en production/CI) : la fonction
-- d origine (migration 0009), en LANGUAGE sql, echoue a l inlining avec
-- "function unaccent(text) does not exist" -- alors meme qu un appel direct
-- (SELECT unaccent('texte')) fonctionne parfaitement en dehors de toute fonction.
-- Plusieurs corrections intermediaires (cast explicite, dictionnaire qualifie par
-- son schema, forme a un seul argument) ont chacune ete testees et ont chacune
-- echoue de facon differente -- toutes en LANGUAGE sql, donc toutes soumises au
-- meme risque d inlining.
--
-- Correctif final, robuste par construction : LANGUAGE plpgsql (jamais inlinee
-- par le planificateur, contrairement a LANGUAGE sql) et search_path fixe
-- explicitement sur la fonction elle-meme (SET search_path = public, pg_catalog)
-- -- la resolution de unaccent() ne depend alors plus jamais du contexte
-- d appel ni d une eventuelle subtilite d inlining.

DROP INDEX IF EXISTS patients_name_trgm_idx;
DROP FUNCTION IF EXISTS patient_search_unaccent(text);

CREATE FUNCTION patient_search_unaccent(text) RETURNS text AS $$
BEGIN
  RETURN unaccent($1);
END;
$$ LANGUAGE plpgsql IMMUTABLE PARALLEL SAFE STRICT SET search_path = public, pg_catalog;

CREATE INDEX patients_name_trgm_idx ON patients
  USING gin (patient_search_unaccent(lower(first_name || ' ' || last_name)) gin_trgm_ops);

-- DOWN (rollback documente, non execute automatiquement) :
--   DROP INDEX IF EXISTS patients_name_trgm_idx;
--   DROP FUNCTION IF EXISTS patient_search_unaccent(text);
--   CREATE FUNCTION patient_search_unaccent(text) RETURNS text AS $$
--     SELECT unaccent('unaccent', $1)
--   $$ LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT;
--   CREATE INDEX patients_name_trgm_idx ON patients
--     USING gin (patient_search_unaccent(lower(first_name || ' ' || last_name)) gin_trgm_ops);