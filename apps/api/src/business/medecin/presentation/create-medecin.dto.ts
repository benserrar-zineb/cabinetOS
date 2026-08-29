import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { medecinSpecialtyEnum } from '../infrastructure/schema';

// TASK-045 (BUILD-003, EA-012) : meme discipline que CreatePatientDto (TASK-022) --
// l INPE n a pas de decorateur de validation ici : son format n est jamais bloquant
// (F.1, F.2 ; voir inpe-validation.ts), donc son avertissement est gere separement
// par le controleur, pas par class-validator (qui ne fait que rejeter/accepter).
//
// numeroOrdre : IsString simple, aucun format connu a valider (F.3 -- ADR de
// revision si un format emerge sur le terrain).
//
// specialty : optionnelle (F.4 -- absence = generaliste), une seule valeur possible
// parmi les 35 specialites du schema (medecinSpecialtyEnum) -- import direct de
// l enum du schema plutot qu une liste dupliquee a la main, pour eviter tout
// risque de derive entre les deux au fil du temps.
//
// userId : optionnel -- si renseigne, doit correspondre a une adhesion (membership)
// reelle dans cette organisation (cle composee, TASK-040, ADR-0016). Le controleur
// traduit une violation de cette contrainte en 400 exploitable (voir
// medecin.controller.ts) -- rien a valider ici cote DTO, c est une contrainte base.

export class CreateMedecinDto {
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsEnum(medecinSpecialtyEnum.enumValues)
  specialty?: (typeof medecinSpecialtyEnum.enumValues)[number];

  @IsOptional()
  @IsString()
  inpe?: string;

  @IsOptional()
  @IsString()
  numeroOrdre?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  phoneCountryCode?: string;

  @IsOptional()
  @IsString()
  phoneNationalNumber?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  locationReference?: string;
}
