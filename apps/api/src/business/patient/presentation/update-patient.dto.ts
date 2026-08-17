import { IsString, IsOptional, IsBoolean, IsDateString, IsEnum } from 'class-validator';

// TASK-025 : mise a jour partielle -- tous les champs optionnels, y compris
// dateOfBirth (contrairement a la creation, pas de validation croisee ici : modifier
// un seul champ ne doit jamais exiger de fournir aussi les autres). status modifie le
// dossier (patientRecords), pas l identite -- le controleur les distingue.

export class UpdatePatientDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsBoolean()
  dateOfBirthUnknown?: boolean;

  @IsOptional()
  @IsString()
  sex?: string;

  @IsOptional()
  @IsString()
  cin?: string;

  @IsOptional()
  @IsString()
  nationalHealthId?: string;

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
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsEnum(['cnss', 'cnops', 'amo', 'mutuelle_privee', 'sans'])
  coverageType?: 'cnss' | 'cnops' | 'amo' | 'mutuelle_privee' | 'sans';

  @IsOptional()
  @IsString()
  coverageNumber?: string;

  @IsOptional()
  @IsEnum(['active', 'archived', 'deceased'])
  status?: 'active' | 'archived' | 'deceased';
}
