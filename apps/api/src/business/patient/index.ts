export { PatientModule } from './patient.module';
export {
  patients,
  patientRecords,
  patientRecordCounters,
  patientRecordStatusEnum,
  coverageTypeEnum,
  patientsRelations,
  patientRecordsRelations,
} from './infrastructure/schema';
export { findPatientSummaryById, type PatientSummary } from './infrastructure/patient.queries';

// TASK-027 : surface volontairement minimale -- destinee aux futurs modules
// Business (Agenda, Consultation, Prescription) pour referencer une fiche patient
// sans dependre du modele interne complet. Aucune fonction d ecriture (create/update)
// n est exportee ici : create/update restent internes, accessibles uniquement via le
// controleur du module Patient (dependency-cruiser bloquerait de toute facon un import
// direct des fichiers internes depuis un autre module -- seul index.ts est public).
