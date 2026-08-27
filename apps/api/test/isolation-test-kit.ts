// Kit partage pour les tests d isolation vivant dans /tests/isolation (racine du monorepo).
// Centralise ici pour que les imports 'nus' (drizzle-orm, pg, @nestjs/*) se resolvent
// via node_modules d apps/api, tout en gardant les fichiers de test au bon endroit
// dans l arborescence documentee (Section O / TASK-011).

export { Test } from '@nestjs/testing';
export type { TestingModule } from '@nestjs/testing';
export { ConfigModule } from '@nestjs/config';
export { sql } from 'drizzle-orm';
export { Pool } from 'pg';
export { uuidv7 } from 'uuidv7';

export { DatabaseService } from '../src/modules/shared/database/database.service';
export { envValidationSchema } from '../src/modules/shared/config/env.validation';

export { createOrganization } from '../src/modules/organization/infrastructure/organization.queries';
export {
  createMembership,
  findMembershipsByOrganization,
  updateMembershipRole,
  deleteMembership,
} from '../src/modules/organization/infrastructure/membership.queries';
export {
  upsertSetting,
  findSettingByKey,
  findAllSettings,
  deleteSetting,
} from '../src/modules/settings/infrastructure/setting.queries';
export {
  createAuditEvent,
  findAuditEventsByOrganization,
} from '../src/modules/audit/infrastructure/audit-event.queries';
export {
  createNotification,
  findNotificationsByUser,
  markNotificationRead,
} from '../src/modules/notifications/infrastructure/notification.queries';
export {
  createPatient,
  findPatientById,
  updatePatient,
  updatePatientRecordStatus,
} from '../src/business/patient/infrastructure/patient.queries';
export {
  createMedecin,
  findMedecinById,
  updateMedecin,
} from '../src/business/medecin/infrastructure/medecin.queries';
