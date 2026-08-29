import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseService, RequirePermission, CurrentOrganizationId } from '../../../modules/shared';
import { CreateMedecinDto } from './create-medecin.dto';
import { UpdateMedecinDto } from './update-medecin.dto';
import { validateInpe } from './inpe-validation';
import { createMedecin, findMedecinById, updateMedecin } from '../infrastructure/medecin.queries';

// TASK-045 (BUILD-003, EA-012) : premier controleur reel du module Medecin --
// memes conventions que Patient (TASK-025) : prefixe /api/v1/ deja applique
// globalement dans main.ts, enveloppe { data, meta } en succes, { error } via
// GlobalExceptionFilter en echec. Permissions : manage pour ecrire, read pour
// consulter (TASK-044).
//
// L INPE mal forme n est jamais rejete (F.1, F.2 -- meme discipline que le CIN
// cote Patient) -- l avertissement, s il y en a un, voyage dans meta.warnings,
// jamais dans une erreur 400.
//
// Un userId fourni doit correspondre a une adhesion (membership) reelle dans
// cette organisation -- garanti par la cle composee (organizationId, userId) ->
// memberships (TASK-040, ADR-0016, deja clos et valide -- non rouvert ici). Sans
// interception ici, une violation de cette contrainte remonterait en 500 brut :
// isInvalidMembershipReference() la detecte et le controleur la traduit en 400
// exploitable -- meme logique defensive que ResponsibleRecordOrganizationMismatchError
// cote Patient (TASK-021), mais appliquee ici a la sortie de la requete plutot que
// verifiee par avance (le controle proactif appartient a TASK-040/041, deja clos).
//
// Pas de delete : F.6 dit que l identite du medecin survit toujours au depart --
// le detachement du compte est gere par le trigger TASK-040, jamais une
// suppression manuelle de la fiche.
//
// Hors perimetre ici : recherche par nom (TASK-046), surface publique (TASK-047).
// Hors perimetre du module : design des ecrans (pilote separement, Product Owner).

function isInvalidMembershipReference(err: unknown): boolean {
  const cause = (err as { cause?: { code?: string; constraint?: string } } | undefined)?.cause;
  return (
    cause?.code === '23503' &&
    cause?.constraint === 'medecins_organization_id_user_id_membership_fk'
  );
}

@Controller('medecins')
export class MedecinController {
  constructor(private readonly databaseService: DatabaseService) {}

  @Post()
  @RequirePermission('manage', 'medecins')
  async create(@CurrentOrganizationId() organizationId: string, @Body() dto: CreateMedecinDto) {
    const warnings: string[] = [];
    if (dto.inpe && !validateInpe(dto.inpe).formatValid) {
      warnings.push(
        'Le format de l INPE ne correspond pas au format attendu (9 chiffres) -- enregistre tel quel.',
      );
    }

    try {
      const created = await createMedecin(this.databaseService, organizationId, dto);
      return { data: created, meta: warnings.length > 0 ? { warnings } : {} };
    } catch (err) {
      if (isInvalidMembershipReference(err)) {
        throw new BadRequestException(
          'userId doit correspondre a une adhesion (membership) reelle dans cette organisation.',
        );
      }
      throw err;
    }
  }

  @Get(':id')
  @RequirePermission('read', 'medecins')
  async findOne(@CurrentOrganizationId() organizationId: string, @Param('id') id: string) {
    const medecin = await findMedecinById(this.databaseService, organizationId, id);
    if (!medecin) {
      throw new NotFoundException('Medecin introuvable.');
    }
    return { data: medecin, meta: {} };
  }

  @Patch(':id')
  @RequirePermission('manage', 'medecins')
  async update(
    @CurrentOrganizationId() organizationId: string,
    @Param('id') id: string,
    @Body() dto: UpdateMedecinDto,
  ) {
    const warnings: string[] = [];
    if (dto.inpe && !validateInpe(dto.inpe).formatValid) {
      warnings.push(
        'Le format de l INPE ne correspond pas au format attendu (9 chiffres) -- enregistre tel quel.',
      );
    }

    let updated;
    try {
      updated = await updateMedecin(this.databaseService, organizationId, id, dto);
    } catch (err) {
      if (isInvalidMembershipReference(err)) {
        throw new BadRequestException(
          'userId doit correspondre a une adhesion (membership) reelle dans cette organisation.',
        );
      }
      throw err;
    }

    if (!updated) {
      throw new NotFoundException('Medecin introuvable.');
    }
    return { data: updated, meta: warnings.length > 0 ? { warnings } : {} };
  }
}
