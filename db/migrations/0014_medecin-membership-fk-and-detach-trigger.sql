-- TASK-040 (BUILD-003, EA-010) : rattachement organisationnel du medecin, sans
-- nouvelle table de relation -- porte par memberships (BUILD-001), pas redefini
-- (ADR-0016). Reprise exacte du spike deja verifie en Passe 2 :
--
--   ON DELETE SET NULL natif sur une cle composee est INVIABLE ici -- PostgreSQL
--   mettrait organization_id ET user_id a NULL simultanement, alors que
--   organization_id porte NOT NULL. Confirme par test direct (erreur PostgreSQL
--   reproduite pendant le spike). D ou le repli ci-dessous : cle composee SANS
--   action de suppression automatique (comportement par defaut, NO ACTION), plus
--   un trigger BEFORE DELETE sur memberships qui detache exclusivement user_id.
--
-- La cle composee elle-meme sert aussi de garde-fou d integrite : elle refuse tout
-- user_id qui ne correspond pas a une adhesion reelle dans CETTE organisation --
-- verifie pendant le spike, reverifie par TASK-040 (voir tests).

ALTER TABLE "medecins" ADD CONSTRAINT "medecins_organization_id_user_id_membership_fk"
  FOREIGN KEY ("organization_id", "user_id") REFERENCES "public"."memberships"("organization_id", "user_id");--> statement-breakpoint

CREATE OR REPLACE FUNCTION detach_medecin_on_membership_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Detache uniquement user_id -- organization_id n est jamais touche, la fiche
  -- reste scopee a son organisation (F.6 : l identite survit toujours au depart).
  UPDATE medecins
  SET user_id = NULL
  WHERE organization_id = OLD.organization_id AND user_id = OLD.user_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint

CREATE TRIGGER medecins_detach_on_membership_delete
  BEFORE DELETE ON memberships
  FOR EACH ROW EXECUTE FUNCTION detach_medecin_on_membership_delete();

-- DOWN (rollback documente, non execute automatiquement) :
--   DROP TRIGGER IF EXISTS medecins_detach_on_membership_delete ON memberships;
--   DROP FUNCTION IF EXISTS detach_medecin_on_membership_delete();
--   ALTER TABLE medecins DROP CONSTRAINT IF EXISTS medecins_organization_id_user_id_membership_fk;