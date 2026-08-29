import { Module } from '@nestjs/common';
import { SharedModule } from '../../modules/shared';
import { MedecinController } from './presentation/medecin.controller';

// TASK-045 : SharedModule importe explicitement (pas @Global()), meme necessite
// que PatientModule (TASK-025) -- DatabaseService doit etre injectable dans
// MedecinController.
//
// TASK-047 : enregistre desormais via index.ts (comme Patient) -- app.module.ts
// importe ce module par la surface publique, pas par un chemin direct.

@Module({
  imports: [SharedModule],
  controllers: [MedecinController],
})
export class MedecinModule {}
