import { IsString, IsOptional, IsEnum } from 'class-validator';
import { medecinSpecialtyEnum } from '../infrastructure/schema';

// TASK-045 : mise a jour partielle -- tous les champs optionnels, meme patron que
// UpdatePatientDto (TASK-025). Pas de champ "status" ici (contrairement a Patient) :
// medecins n a pas de dossier separe -- F.6 dit que l identite du medecin survit
// toujours au depart, rien a archiver/desactiver explicitement au niveau de ce
// Build.

export class UpdateMedecinDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

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
