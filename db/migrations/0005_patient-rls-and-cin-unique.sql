-- TASK-019 (BUILD-002, EA-007) : les trois gestes d isolation pour les deux tables
-- Patient (patients, patient_records), point de vigilance de cloture BUILD-001 --
-- politique RLS ici, fonctions d acces via withOrganizationScope en TASK-020, tests
-- d isolation dedies en TASK-023. Meme modele que les cinq tables Core deja protegees
-- (voir docs/adr/spike-drizzle-rls.md).
--
-- Hors perimetre de cette migration (arrivent plus tard, volontairement pas ici) :
-- le trigger "meme organisation" sur responsible_patient_record_id (TASK-021), les
-- extensions de recherche floue pg_trgm/unaccent (TASK-026).

ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients FORCE ROW LEVEL SECURITY;
CREATE POLICY patients_isolation ON patients
  USING (organization_id = nullif(current_setting('app.organization_id', true), '')::uuid);

ALTER TABLE patient_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_records FORCE ROW LEVEL SECURITY;
CREATE POLICY patient_records_isolation ON patient_records
  USING (organization_id = nullif(current_setting('app.organization_id', true), '')::uuid);

-- Unicite du CIN, partielle (les CIN nuls ne comptent jamais comme doublons) et scopee
-- par organisation (ADR-0014, Q2/Q4 du Decision Gate) -- jamais d unicite globale, ce
-- serait un appariement transversal non voulu (piege nomme explicitement par le RFA).
CREATE UNIQUE INDEX patients_org_cin_unique
  ON patients (organization_id, cin) WHERE cin IS NOT NULL;

-- DOWN (rollback documente, non execute automatiquement -- a appliquer manuellement
-- avec le role postgres / ADMIN_DATABASE_URL en cas de retour en arriere) :
--   DROP INDEX IF EXISTS patients_org_cin_unique;
--   DROP POLICY IF EXISTS patient_records_isolation ON patient_records;
--   ALTER TABLE patient_records DISABLE ROW LEVEL SECURITY;
--   DROP POLICY IF EXISTS patients_isolation ON patients;
--   ALTER TABLE patients DISABLE ROW LEVEL SECURITY;