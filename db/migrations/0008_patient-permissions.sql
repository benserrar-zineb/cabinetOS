-- TASK-024 (BUILD-002, EA-009) : declaration des permissions du module Patient dans
-- le catalogue global (table permissions, ADR access-control -- role/permission
-- globaux, jamais scopes par organisation). Le module Patient ne redefinit rien de
-- l Access Control existant (pas de fonction d ecriture exposee par ce module, voir
-- access-control/index.ts) -- il declare simplement son entree, comme une donnee de
-- migration, au meme titre qu un ADR declare une decision.
--
-- Deux permissions minimum (Passe 1, decision C.7) : manage (creer/modifier une
-- fiche) et read (consulter). Convention action/resource deja en place
-- (ex. RequirePermission('read', 'members')). Chaque cabinet reste libre d attribuer
-- ces permissions a ses roles comme il l entend -- cette migration ne touche jamais
-- role_permissions.

INSERT INTO permissions (id, action, resource)
VALUES (gen_random_uuid(), 'manage', 'patients'), (gen_random_uuid(), 'read', 'patients')
ON CONFLICT (action, resource) DO NOTHING;

-- DOWN (rollback documente, non execute automatiquement) :
--   DELETE FROM permissions WHERE resource = 'patients';
-- Attention : si des roles ont deja recu ces permissions (role_permissions), ce
-- DELETE echouera sur la contrainte de cle etrangere -- retirer d abord les
-- attributions de roles concernees.