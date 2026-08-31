-- Correction demandee a la validation d'EA-012 (BUILD-003) : patient_search_unaccent()
-- est renommee en search_unaccent(), nom generique. Son comportement (wrapper
-- immutable autour de unaccent(), LANGUAGE plpgsql, cf. migration 0010) n a
-- jamais ete specifique a Patient -- mais son nom actuel cree un couplage
-- trompeur maintenant que le module Medecin la reutilise aussi (migration
-- 0015). La renommer maintenant, tant que seuls Patient et Medecin en
-- dependent, evite que ca durcisse quand d autres modules (Consultation,
-- Agenda) la reutiliseront a leur tour.
--
-- Pur renommage, aucun changement de comportement : ALTER FUNCTION RENAME ne
-- casse aucune dependance existante. PostgreSQL retrouve les objets dependants
-- (index patients_name_trgm_idx, medecins_name_trgm_idx) par OID, pas par nom
-- -- ils continuent de fonctionner sans etre recrees, et leur definition
-- affichee (\d, pg_get_indexdef) reflete automatiquement le nouveau nom.
--
-- Les migrations 0009, 0010 et 0015 ne sont pas modifiees : elles restent un
-- historique fidele de ce qui a ete execute a chaque etape (a ce moment de la
-- sequence, la fonction s appelait encore patient_search_unaccent).

ALTER FUNCTION patient_search_unaccent(text) RENAME TO search_unaccent;

-- DOWN (rollback documente, non execute automatiquement) :
--   ALTER FUNCTION search_unaccent(text) RENAME TO patient_search_unaccent;
