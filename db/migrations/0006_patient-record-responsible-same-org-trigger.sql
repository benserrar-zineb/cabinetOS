-- TASK-021 (BUILD-002, EA-008) : defense en profondeur pour responsible_patient_record_id
-- (auto-reference sur patient_records, Q5 du Decision Gate -- patient sans identite
-- autonome). Une simple cle etrangere ne garantit pas que la ligne referencee partage
-- le meme organization_id -- point signale explicitement dans docs/specs/BUILD-002-patient.md
-- (Section D de la Passe 1) et jamais laisse implicite.
--
-- Cette migration porte la couche BASE (independante de RLS : le trigger s execute
-- BEFORE INSERT/UPDATE et compare organization_id directement, sans dependre du
-- filtrage RLS). La couche APPLICATIVE equivalente vit dans patient.queries.ts
-- (assertResponsibleSameOrganization, TASK-021) -- meme philosophie de defense en
-- profondeur qu ADR-0005 pour l isolation (deux couches independantes, pas redondantes
-- par hasard).
--
-- Preuve attendue (demande explicite de l encadrant a la cloture d EA-008) : le
-- contournement doit echouer, pas seulement le cas normal reussir. Teste dans
-- apps/api/test/queries/patient.queries.spec.ts -- a la fois le controle applicatif
-- ET une insertion SQL brute avec cabinetos_app qui court-circuite l application.

CREATE OR REPLACE FUNCTION check_responsible_same_organization()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.responsible_patient_record_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM patient_records
      WHERE id = NEW.responsible_patient_record_id
        AND organization_id = NEW.organization_id
    ) THEN
      RAISE EXCEPTION
        'responsible_patient_record_id must reference a patient_record in the same organization';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER patient_records_responsible_same_org
  BEFORE INSERT OR UPDATE ON patient_records
  FOR EACH ROW EXECUTE FUNCTION check_responsible_same_organization();

-- DOWN (rollback documente, non execute automatiquement -- a appliquer manuellement
-- avec le role postgres / ADMIN_DATABASE_URL en cas de retour en arriere) :
--   DROP TRIGGER IF EXISTS patient_records_responsible_same_org ON patient_records;
--   DROP FUNCTION IF EXISTS check_responsible_same_organization();