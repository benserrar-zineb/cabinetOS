CREATE TYPE "public"."medecin_specialty" AS ENUM('cardiologie', 'dermatologie', 'endocrinologie_maladies_metaboliques', 'gastro_enterologie', 'gynecologie_obstetrique', 'pediatrie', 'pneumologie', 'neurologie', 'psychiatrie', 'rhumatologie', 'nephrologie', 'urologie', 'ophtalmologie', 'orl', 'chirurgie_generale', 'chirurgie_orthopedique_traumatologie', 'neurochirurgie', 'chirurgie_cardiovasculaire_vasculaire', 'chirurgie_plastique_reconstructrice_esthetique', 'chirurgie_pediatrique', 'anesthesie_reanimation', 'oncologie_medicale', 'radiotherapie_oncologie_radiotherapique', 'hematologie', 'medecine_interne', 'maladies_infectieuses', 'medecine_physique_readaptation', 'medecine_travail', 'medecine_legale', 'radiologie_imagerie_medicale', 'anatomie_pathologique', 'biologie_medicale', 'medecine_nucleaire', 'geriatrie', 'medecine_urgence');--> statement-breakpoint
CREATE TABLE "medecins" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" text,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"specialty" "medecin_specialty",
	"inpe" text,
	"numero_ordre" text,
	"description" text,
	"phone_country_code" text,
	"phone_national_number" text,
	"email" text,
	"city" text,
	"location_reference" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "medecins" ADD CONSTRAINT "medecins_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "medecins_organization_id_idx" ON "medecins" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "medecins_user_id_idx" ON "medecins" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE INDEX "medecins_inpe_idx" ON "medecins" USING btree ("organization_id","inpe");--> statement-breakpoint
CREATE INDEX "medecins_numero_ordre_idx" ON "medecins" USING btree ("organization_id","numero_ordre");