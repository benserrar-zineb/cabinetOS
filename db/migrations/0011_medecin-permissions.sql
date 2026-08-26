-- TASK-044 (BUILD-003, EA-011) : declaration des permissions du module Medecin dans
-- le catalogue global (table permissions, globale, jamais scopee par organisation) --
-- meme patron que TASK-024 pour Patient. Le module Medecin ne redefinit rien de
-- l Access Control existant.
--
-- Deux permissions minimum (Passe 1, decision C.5) : manage (creer/modifier une
-- fiche medecin) et read (consulter/rechercher). Chaque cabinet reste libre
-- d attribuer ces permissions a ses roles comme il l entend -- cette migration ne
-- touche jamais role_permissions.

INSERT INTO permissions (id, action, resource)
VALUES (gen_random_uuid(), 'manage', 'medecins'), (gen_random_uuid(), 'read', 'medecins')
ON CONFLICT (action, resource) DO NOTHING;

-- DOWN (rollback documente, non execute automatiquement) :
--   DELETE FROM permissions WHERE resource = 'medecins';
-- Attention : si des roles ont deja recu ces permissions (role_permissions), ce
-- DELETE echouera sur la contrainte de cle etrangere -- retirer d abord les
-- attributions de roles concernees.