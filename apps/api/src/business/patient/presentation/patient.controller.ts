import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseService, RequirePermission, CurrentOrganizationId } from '../../../modules/shared';
import { CreatePatientDto } from './create-patient.dto';
import { UpdatePatientDto } from './update-patient.dto';
import { validateCin } from './cin-validation';
import {
  createPatient,
  findPatientById,
  updatePatient,
  updatePatientRecordStatus,
  ResponsibleRecordOrganizationMismatchError,
} from '../infrastructure/patient.queries';
import {
  searchPatientsByName,
  findPatientsByPhone,
  findPatientsByCin,
} from '../infrastructure/patient-search.queries';

// TASK-025 (BUILD-002, EA-009) : premier controleur reel du module Patient --
// conventions ADR-0008 (prefixe /api/v1/ deja applique globalement dans main.ts,
// enveloppe { data, meta } en succes, { error } via GlobalExceptionFilter en echec).
// Permissions : manage pour ecrire, read pour consulter/rechercher (TASK-024).
//
// Le CIN mal forme n est jamais rejete (Q2/ADR-0014) -- l avertissement, s il y en a
// un, voyage dans meta.warnings, jamais dans une erreur 400.
//
// Hors perimetre ici : design des ecrans (piloté separement, Product Owner).

@Controller('patients')
export class PatientController {
  constructor(private readonly databaseService: DatabaseService) {}

  @Post()
  @RequirePermission('manage', 'patients')
  async create(@CurrentOrganizationId() organizationId: string, @Body() dto: CreatePatientDto) {
    const warnings: string[] = [];
    if (dto.cin && !validateCin(dto.cin).formatValid) {
      warnings.push(
        'Le format du CIN ne correspond pas au format attendu (lettres puis chiffres) -- enregistre tel quel.',
      );
    }

    try {
      const created = await createPatient(this.databaseService, organizationId, dto);
      return { data: created, meta: warnings.length > 0 ? { warnings } : {} };
    } catch (err) {
      if (err instanceof ResponsibleRecordOrganizationMismatchError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }
  }

  @Get(':id')
  @RequirePermission('read', 'patients')
  async findOne(@CurrentOrganizationId() organizationId: string, @Param('id') id: string) {
    const patient = await findPatientById(this.databaseService, organizationId, id);
    if (!patient) {
      throw new NotFoundException('Patient introuvable.');
    }
    return { data: patient, meta: {} };
  }

  @Patch(':id')
  @RequirePermission('manage', 'patients')
  async update(
    @CurrentOrganizationId() organizationId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePatientDto,
  ) {
    const { status, ...identity } = dto;
    const warnings: string[] = [];
    if (identity.cin && !validateCin(identity.cin).formatValid) {
      warnings.push(
        'Le format du CIN ne correspond pas au format attendu (lettres puis chiffres) -- enregistre tel quel.',
      );
    }

    if (Object.keys(identity).length > 0) {
      const updated = await updatePatient(this.databaseService, organizationId, id, identity);
      if (!updated) {
        throw new NotFoundException('Patient introuvable.');
      }
    }

    const patient = await findPatientById(this.databaseService, organizationId, id);
    if (!patient) {
      throw new NotFoundException('Patient introuvable.');
    }

    let record = patient.record;
    if (status && record) {
      record = await updatePatientRecordStatus(
        this.databaseService,
        organizationId,
        record.id,
        status,
      );
    }

    return { data: { ...patient, record }, meta: warnings.length > 0 ? { warnings } : {} };
  }

  @Get()
  @RequirePermission('read', 'patients')
  async search(
    @CurrentOrganizationId() organizationId: string,
    @Query('q') q?: string,
    @Query('phone') phone?: string,
    @Query('cin') cin?: string,
  ) {
    if (phone) {
      const results = await findPatientsByPhone(this.databaseService, organizationId, phone);
      return { data: results, meta: {} };
    }
    if (cin) {
      const results = await findPatientsByCin(this.databaseService, organizationId, cin);
      return { data: results, meta: {} };
    }
    if (q) {
      const results = await searchPatientsByName(this.databaseService, organizationId, q);
      return { data: results, meta: {} };
    }
    return { data: [], meta: {} };
  }
}
