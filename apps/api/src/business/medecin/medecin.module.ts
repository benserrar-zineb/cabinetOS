import { Module } from '@nestjs/common';
import { SharedModule } from '../../modules/shared';
import { MedecinController } from './presentation/medecin.controller';

// TASK-045 : SharedModule importe explicitement (pas @Global()), meme necessite
// que PatientModule (TASK-025) -- DatabaseService doit etre injectable dans
// MedecinController.
//
// Enregistre pour l instant par chemin direct dans app.module.ts (pas encore via
// un index.ts, contrairement a Patient) -- TASK-047 introduira index.ts (surface
// publique du module, MedecinSummary/findMedecinSummaryById) et app.module.ts
// basculera alors sur cet import, comme pour Patient. Aucune regle
// check:architecture ne l impose plus tot (le Core Platform ne depend jamais de
// Business, mais app.module.ts n est ni Core ni Business -- rien ne l interdit).

@Module({
  imports: [SharedModule],
  controllers: [MedecinController],
})
export class MedecinModule {}
