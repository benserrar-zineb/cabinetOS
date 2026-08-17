import { Module } from '@nestjs/common';
import { SharedModule } from '../../modules/shared';
import { PatientController } from './presentation/patient.controller';

// TASK-025 : SharedModule est importe explicitement (pas @Global()) pour que
// DatabaseService soit injectable dans PatientController -- meme necessite pour
// tout futur module Business consommant le Core Platform.

@Module({
  imports: [SharedModule],
  controllers: [PatientController],
})
export class PatientModule {}
