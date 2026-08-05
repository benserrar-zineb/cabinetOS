import { Controller, Get, Module } from '@nestjs/common';
import { RequirePermission } from '../../src/modules/shared/presentation/require-permission.decorator';

// Controleur jetable, reserve aux tests du Guard (TASK-016). Ne fait pas partie
// de l application reelle -- vit dans test/fixtures/, jamais dans src/.

@Controller('test-guard')
export class GuardTestController {
  @Get('protected')
  @RequirePermission('read', 'members')
  protectedRoute() {
    return { data: { ok: true } };
  }

  @Get('unprotected')
  unprotectedRoute() {
    return { data: { ok: true } };
  }
}

@Module({ controllers: [GuardTestController] })
export class GuardTestModule {}
