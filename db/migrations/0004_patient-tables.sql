CREATE TYPE "public"."patient_record_status" AS ENUM('active', 'archived', 'deceased');--> statement-breakpoint
CREATE TABLE "patient_record_counters" (
	"organization_id" uuid PRIMARY KEY NOT NULL,
	"next_value" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patient_records" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"sequential_number" integer NOT NULL,
	"status" "patient_record_status" DEFAULT 'active' NOT NULL,
	"attached_at" timestamp DEFAULT now() NOT NULL,
	"responsible_patient_record_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "patient_records_org_sequential_unique" UNIQUE("organization_id","sequential_number")
);
--> statement-breakpoint
CREATE TABLE "patients" (
	"id" uuid PRIMARY KEY NOT NULL,
	"organization_id" uuid NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"date_of_birth" date,
	"date_of_birth_unknown" boolean DEFAULT false NOT NULL,
	"sex" text,
	"cin" text,
	"national_health_id" text,
	"phone" text,
	"email" text,
	"address" text,
	"country" text,
	"language" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "patient_record_counters" ADD CONSTRAINT "patient_record_counters_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_records" ADD CONSTRAINT "patient_records_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_records" ADD CONSTRAINT "patient_records_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "patient_records_organization_id_idx" ON "patient_records" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "patient_records_patient_id_idx" ON "patient_records" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "patients_organization_id_idx" ON "patients" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "patients_cin_idx" ON "patients" USING btree ("organization_id","cin");--> statement-breakpoint
CREATE INDEX "patients_phone_idx" ON "patients" USING btree ("organization_id","phone");