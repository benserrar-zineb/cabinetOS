-- ADR-0015 (BUILD-002, revision de modele issue du maquettage des ecrans) : ajustement
-- additif du modele Patient -- n invalide ni EA-007 ni EA-008.
--
-- - city separee d address (address = rue/quartier, city = ville) ;
-- - telephone restructure : phone_country_code + phone_national_number remplacent
--   l ancienne colonne phone unique (le numero national est normalise sans le zero
--   initial, voir TASK-026 pour la logique de recherche) ;
-- - couverture sante : coverage_type (enum cnss/cnops/amo/mutuelle_privee/sans) +
--   coverage_number (numero d immatriculation au regime).
--
-- FRONTIERE NON NEGOCIABLE (Note de Vision) : aucun champ de montant, taux,
-- remboursement ou decompte n est ajoute ici, et ne doit jamais l etre dans ce
-- module -- c est une donnee de soin/identite (le fait d etre couvert, par quel
-- regime), pas une donnee commerciale/fiscale. Verifie ci-dessous : les deux
-- seules colonnes ajoutees pour la couverture sont coverage_type et coverage_number.

CREATE TYPE "public"."patient_coverage_type" AS ENUM('cnss', 'cnops', 'amo', 'mutuelle_privee', 'sans');--> statement-breakpoint
DROP INDEX "patients_phone_idx";--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "phone_country_code" text;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "phone_national_number" text;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "coverage_type" "patient_coverage_type";--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "coverage_number" text;--> statement-breakpoint
CREATE INDEX "patients_phone_idx" ON "patients" USING btree ("organization_id","phone_country_code","phone_national_number");--> statement-breakpoint
ALTER TABLE "patients" DROP COLUMN "phone";

-- DOWN (rollback documente, non execute automatiquement -- a appliquer manuellement
-- avec le role postgres / ADMIN_DATABASE_URL en cas de retour en arriere) :
--   ALTER TABLE patients ADD COLUMN phone text;
--   DROP INDEX patients_phone_idx;
--   CREATE INDEX patients_phone_idx ON patients (organization_id, phone);
--   ALTER TABLE patients DROP COLUMN coverage_number;
--   ALTER TABLE patients DROP COLUMN coverage_type;
--   ALTER TABLE patients DROP COLUMN city;
--   ALTER TABLE patients DROP COLUMN phone_national_number;
--   ALTER TABLE patients DROP COLUMN phone_country_code;
--   DROP TYPE patient_coverage_type;
-- Note : ce rollback perd les donnees des colonnes retirees (aucune donnee reelle
-- n existe encore dans ce Build -- a traiter avec precaution si ce n est plus le cas).