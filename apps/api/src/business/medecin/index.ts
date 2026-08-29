export { MedecinModule } from './medecin.module';
export { medecins, medecinSpecialtyEnum } from './infrastructure/schema';
export { findMedecinSummaryById, type MedecinSummary } from './infrastructure/medecin.queries';

// TASK-047 (BUILD-003, EA-012) : surface volontairement minimale -- destinee aux
// futurs modules Business (Consultation, Agenda, Prescription) pour referencer
// une fiche medecin sans dependre du modele interne complet. Aucune fonction
// d ecriture (create/update) n est exportee ici : create/update restent
// internes, accessibles uniquement via le controleur du module Medecin.
