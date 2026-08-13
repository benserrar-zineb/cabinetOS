import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsUUID,
  ValidateIf,
} from 'class-validator';

// TASK-022 (BUILD-002, EA-008) : premier DTO reel du depot -- tous les controleurs
// Core Platform sont encore des squelettes (NotImplementedException), aucune
// convention n existait avant ce fichier.
//
// Q1 du Decision Gate : dateOfBirth est requise a la creation, SAUF case explicite
// "date inconnue" cochee. Jamais de fiche avec date vide par simple omission, jamais
// de fausse date de contournement -- @ValidateIf desactive completement la validation
// de dateOfBirth quand dateOfBirthUnknown vaut strictement true ; sinon, dateOfBirth
// doit etre une date ISO valide (donc presente).
//
// La validation du CIN (Q2, format + normalisation) n est PAS ici : elle n est jamais
// bloquante (voir cin-validation.ts), donc elle ne peut pas etre un simple validateur
// class-validator (qui ne fait que rejeter/accepter) -- elle est appliquee separement
// par la couche appelante (TASK-025), qui decide quoi faire de l avertissement.

export class CreatePatientDto {
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @ValidateIf((dto: CreatePatientDto) => dto.dateOfBirthUnknown !== true)
  @IsDateString(
    {},
    { message: 'dateOfBirth is required unless dateOfBirthUnknown is explicitly true' },
  )
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
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsUUID()
  responsiblePatientRecordId?: string;
}
